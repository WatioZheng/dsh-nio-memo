/**
 * api.test.ts — HTTP 数据面（src/api.ts）覆盖（F3 · T9）。
 *
 * 为什么单开一套：此前 create/switch/role-exps/perm/batch 这些**HTTP 层**零覆盖——
 * 之前那次「首帧 data=null 白屏」正是盲区型缺陷。本套用临时库**直调 handler**，
 * 不依赖 DSH 宿主（与 smoke.test.ts 同风格）。
 *
 * 跑法（tsx 需在 DSH 检出 cwd 下解析）：
 *   cd /path/to/dsh-checkout && node --import tsx/esm /path/to/nio-memo/src/tests/api.test.ts
 *
 * 覆盖：all 瘦身与按需取全文 / create 开关守卫 / perm 对索引型拒绝 / switch /
 *       role-exps / exp-roles / update·toggle·delete·restore·purge / tags / batch / 未知端点
 */
import * as assert from "node:assert/strict";
import * as nodeFs from "node:fs";
import * as nodeOs from "node:os";
import * as nodePath from "node:path";
import { Readable } from "node:stream";

import {
  openMemoDb, setSwitch, getSwitches, listCards, getCardById,
} from "../db";
import { installApi } from "../api";

let passed = 0;
async function ok(label: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${label}`);
  } catch (e) {
    console.error(`  ✗ ${label}\n    ${String((e as Error)?.message || e)}`);
    process.exitCode = 1;
  }
}

const dir = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "nio-memo-api-"));
const db = openMemoDb(dir);

/** 捕获 installApi 注册的 handler（不启真服务） */
let handler: ((req: any, res: any) => Promise<void>) | null = null;
const ctx = {
  webServer: {
    register(cfg: any) { handler = cfg.handler; return () => { /* dispose */ }; },
  },
};
installApi(ctx, { getDb: () => db });
assert.ok(handler, "installApi 应同步注册 prefix handler");

function mockReq(method: string, url: string, body?: unknown) {
  const r: any = Readable.from(body === undefined ? [] : [JSON.stringify(body)]);
  r.method = method;
  r.url = url;
  return r;
}
function mockRes() {
  const out: any = { code: 0, body: "" };
  out.writeHead = (c: number) => { out.code = c; };
  out.end = (s: string) => { out.body = s ?? ""; };
  return out;
}
async function call(method: string, url: string, body?: unknown): Promise<{ code: number; json: any }> {
  const rq = mockReq(method, url, body);
  const rs = mockRes();
  await handler!(rq, rs);
  return { code: rs.code, json: rs.body ? JSON.parse(rs.body) : null };
}

// ─────────────────────────────────────────────────────────────
console.log("F12（/api/all 瘦身 + /api/card 按需取全文）");
await ok("/api/all：列表卡**不带正文**，且标记 contentOmitted", async () => {
  const { code, json } = await call("GET", "/nio-memo/api/all");
  assert.equal(code, 200);
  assert.equal(json.ok, true);
  assert.ok(Array.isArray(json.memos) && json.memos.length > 0, "默认备忘卡应在列表里");
  for (const c of [...json.memos, ...json.rules]) {
    assert.equal(c.content, "", `列表卡 ${c.name} 不应带正文`);
    assert.equal(c.contentOmitted, true, `列表卡 ${c.name} 应标记 contentOmitted`);
  }
  assert.ok(json.switches && typeof json.switches.roleEnabled === "boolean", "应带开关状态");
  // 出厂默认（2026-10-15 用户拍板）：呈现极简 ⇒ 角色 / 经验卡默认关（本临时库从未显式设过）
  assert.deepEqual(
    [json.switches.roleEnabled, json.switches.expEnabled, json.switches.expEffective],
    [false, false, false],
    "空库应走「缺行=关」的出厂默认",
  );
});
await ok("/api/card?id=：能取回单卡全文（列表里被省略的那份）", async () => {
  const all = (await call("GET", "/nio-memo/api/all")).json;
  const first = all.memos[0];
  const { json } = await call("GET", `/nio-memo/api/card?id=${first.id}`);
  assert.equal(json.ok, true);
  assert.equal(json.card.id, first.id);
  assert.ok(json.card.content.length > 0, "全文应非空");
  assert.equal(json.card.contentOmitted, undefined, "单卡接口不标省略");
});
await ok("/api/card：缺 id / 未知 id 一律显式报错", async () => {
  const bad = await call("GET", "/nio-memo/api/card");
  assert.equal(bad.json.ok, false);
  assert.match(bad.json.error, /缺少合法 id/);
  const miss = await call("GET", "/nio-memo/api/card?id=999999");
  assert.equal(miss.json.ok, false);
  assert.match(miss.json.error, /未找到卡片/);
});

// ─────────────────────────────────────────────────────────────
console.log("F4（/api/create 受功能开关约束）");
await ok("开关全开：可建 备忘 / 角色 / 经验卡", async () => {
  setSwitch(db, "role", true); setSwitch(db, "exp", true);   // 出厂默认关 ⇒ 本用例自己开
  const m = await call("POST", "/nio-memo/api/create", { name: "API备忘A", keywords: "a,b", content: "正文A_UNIQUE" });
  assert.equal(m.json.ok, true);
  assert.equal(m.json.card.state, "memo");
  const r = await call("POST", "/nio-memo/api/create", { name: "API角色A", keywords: ["试"], content: "角色正文" , state: "role" });
  assert.equal(r.json.ok, true);
  assert.equal(r.json.card.state, "role");
  const e = await call("POST", "/nio-memo/api/create", { name: "API经验A", keywords: ["剑法"], content: "经验正文", state: "exp" });
  assert.equal(e.json.ok, true);
  assert.equal(e.json.card.state, "exp");
});
await ok("经验卡开关关：建 exp 被拒（可读原因），建 memo 照常", async () => {
  setSwitch(db, "exp", false);
  const e = await call("POST", "/nio-memo/api/create", { name: "API经验被拒", content: "x", state: "exp" });
  assert.equal(e.json.ok, false);
  assert.match(e.json.error, /经验卡功能当前未生效/);
  const m = await call("POST", "/nio-memo/api/create", { name: "API开关下备忘", content: "x" });
  assert.equal(m.json.ok, true);
  setSwitch(db, "exp", true);
});
await ok("角色功能关：建 role 与 exp 都被拒，建 memo 照常", async () => {
  setSwitch(db, "role", false);
  const r = await call("POST", "/nio-memo/api/create", { name: "API角色被拒", content: "x", state: "role" });
  assert.equal(r.json.ok, false);
  assert.match(r.json.error, /角色功能当前已关闭/);
  const e = await call("POST", "/nio-memo/api/create", { name: "API经验被拒2", content: "x", state: "exp" });
  assert.equal(e.json.ok, false);
  const m = await call("POST", "/nio-memo/api/create", { name: "API角色关下备忘", content: "x" });
  assert.equal(m.json.ok, true);
  setSwitch(db, "role", true);
  assert.deepEqual(getSwitches(db), { roleEnabled: true, expEnabled: true, expEffective: true });
});

// ─────────────────────────────────────────────────────────────
console.log("F1（权限板块：索引型实体一律拒绝）");
await ok("对 角色 / 经验卡 写权限板块 ⇒ 显式报错（含「索引型」）", async () => {
  const role = listCards(db, "role").find((c) => c.name === "API角色A")!;
  const exp = listCards(db, "exp").find((c) => c.name === "API经验A")!;
  for (const [kindName, c] of [["角色", role], ["经验卡", exp]] as const) {
    const r = await call("POST", "/nio-memo/api/perm/enable", { kind: "card", id: c.id, enabled: true });
    assert.equal(r.json.ok, false, `${kindName}开权限应被拒`);
    assert.match(r.json.error, /索引型/);
    const a = await call("POST", "/nio-memo/api/perm/level/add", { kind: "card", id: c.id, name: "x" });
    assert.equal(a.json.ok, false, `${kindName}加档位应被拒`);
  }
});
await ok("对 备忘卡 写权限板块：照常放行（对照，证明拒绝不是一刀切）", async () => {
  const memo = listCards(db, "memo").find((c) => c.name === "API备忘A")!;
  const r = await call("POST", "/nio-memo/api/perm/enable", { kind: "card", id: memo.id, enabled: true });
  assert.equal(r.json.ok, true);
  assert.deepEqual(r.json.perm.levels.map((l: any) => l.name), ["禁止", "允许"]);
  await call("POST", "/nio-memo/api/perm/enable", { kind: "card", id: memo.id, enabled: false });
});
await ok("缺 kind/id、未知 id：显式报错", async () => {
  const bad = await call("POST", "/nio-memo/api/perm/enable", { kind: "card" });
  assert.equal(bad.json.ok, false);
  assert.match(bad.json.error, /缺少合法 kind \/ id/);
  const miss = await call("POST", "/nio-memo/api/perm/enable", { kind: "card", id: 999999 });
  assert.equal(miss.json.ok, false);
  assert.match(miss.json.error, /未找到卡片/);
});

// ─────────────────────────────────────────────────────────────
console.log("开关 / 经验槽 / 反查");
await ok("/api/switch：非法 key 报错；角色关时开 exp 报错（硬规则）", async () => {
  const bad = await call("POST", "/nio-memo/api/switch", { key: "wat", enabled: true });
  assert.equal(bad.json.ok, false);
  assert.match(bad.json.error, /未知开关/);
  setSwitch(db, "role", false);
  const hard = await call("POST", "/nio-memo/api/switch", { key: "exp", enabled: true });
  assert.equal(hard.json.ok, false);
  assert.match(hard.json.error, /角色功能未启用/);
  assert.equal(getSwitches(db).expEnabled, true, "被拒时不得静默改写原设定");
  setSwitch(db, "role", true);
});
await ok("/api/role/exps：绑定 → 读回；非角色 / 未知 id 报错", async () => {
  const role = listCards(db, "role").find((c) => c.name === "API角色A")!;
  const exp = listCards(db, "exp").find((c) => c.name === "API经验A")!;
  const w = await call("POST", "/nio-memo/api/role/exps", { roleId: role.id, expIds: [exp.id] });
  assert.equal(w.json.ok, true);
  assert.equal(w.json.exps.length, 1);
  const g = await call("GET", `/nio-memo/api/role/exps?roleId=${role.id}`);
  assert.equal(g.json.ok, true);
  assert.equal(g.json.exps[0].id, exp.id);
  const notRole = await call("POST", "/nio-memo/api/role/exps", { roleId: exp.id, expIds: [] });
  assert.equal(notRole.json.ok, false);
  assert.match(notRole.json.error, /不是角色卡/);
  const miss = await call("GET", "/nio-memo/api/role/exps?roleId=999999");
  assert.equal(miss.json.ok, true, "未知角色读槽返回空数组（读接口不抛）");
  assert.deepEqual(miss.json.exps, []);
  const bad = await call("GET", "/nio-memo/api/role/exps?roleId=abc");
  assert.equal(bad.json.ok, false);
  assert.match(bad.json.error, /缺少合法 roleId/);
});
await ok("/api/exp/roles：反查该经验卡被哪些角色绑定", async () => {
  const exp = listCards(db, "exp").find((c) => c.name === "API经验A")!;
  const r = await call("GET", `/nio-memo/api/exp/roles?id=${exp.id}`);
  assert.equal(r.json.ok, true);
  assert.deepEqual(r.json.roles.map((x: any) => x.name), ["API角色A"]);
  const bad = await call("GET", "/nio-memo/api/exp/roles?id=x");
  assert.equal(bad.json.ok, false);
  assert.match(bad.json.error, /缺少合法 id/);
});

// ─────────────────────────────────────────────────────────────
console.log("增删改 / 回收站 / 标签 / 批量 / 兜底");
await ok("/api/update：改名并同步路径；缺 id 报错", async () => {
  const memo = listCards(db, "memo").find((c) => c.name === "API备忘A")!;
  const u = await call("POST", "/nio-memo/api/update", { id: memo.id, name: "API备忘A改", content: "正文A2" });
  assert.equal(u.json.ok, true);
  assert.equal(u.json.card.name, "API备忘A改");
  assert.equal(u.json.card.path, "备忘/API备忘A改.md");
  const bad = await call("POST", "/nio-memo/api/update", { name: "x" });
  assert.equal(bad.json.ok, false);
});
await ok("/api/toggle / delete / restore / purge 全链路", async () => {
  const memo = listCards(db, "memo").find((c) => c.name === "API备忘A改")!;
  const off = await call("POST", "/nio-memo/api/toggle", { id: memo.id });
  assert.equal(off.json.ok, true);
  assert.equal(off.json.card.enabled, false);
  await call("POST", "/nio-memo/api/toggle", { id: memo.id });
  const del = await call("POST", "/nio-memo/api/delete", { id: memo.id });
  assert.equal(del.json.ok, true);
  const trash = await call("GET", "/nio-memo/api/trash");
  assert.ok(trash.json.cards.some((c: any) => c.id === memo.id));
  const back = await call("POST", "/nio-memo/api/restore", { id: memo.id });
  assert.equal(back.json.ok, true);
  assert.equal(back.json.card.deletedAt, null);
  const purge = await call("POST", "/nio-memo/api/purge", { id: memo.id });
  assert.equal(purge.json.ok, true);
  assert.equal(getCardById(db, memo.id), null);
});
await ok("/api/tags/create → rename → delete；系统标签与重名报错", async () => {
  const c = await call("POST", "/nio-memo/api/tags/create", { name: "API标签" });
  assert.equal(c.json.ok, true);
  const dup = await call("POST", "/nio-memo/api/tags/create", { name: "API标签" });
  assert.equal(dup.json.ok, false);
  assert.match(dup.json.error, /已存在/);
  const rn = await call("POST", "/nio-memo/api/tags/rename", { id: c.json.tag.id, name: "API标签2" });
  assert.equal(rn.json.ok, true);
  const del = await call("POST", "/nio-memo/api/tags/delete", { id: c.json.tag.id });
  assert.equal(del.json.ok, true);
  const sys = (await call("GET", "/nio-memo/api/all")).json.tags.find((t: any) => t.name === "默认");
  const badSys = await call("POST", "/nio-memo/api/tags/delete", { id: sys.id });
  assert.equal(badSys.json.ok, false);
  assert.match(badSys.json.error, /系统标签/);
});
await ok("/api/card/tags：打标（替换式）", async () => {
  const t = (await call("POST", "/nio-memo/api/tags/create", { name: "API打标" })).json.tag;
  const memo = (await call("POST", "/nio-memo/api/create", { name: "API打标卡", content: "x" })).json.card;
  const r = await call("POST", "/nio-memo/api/card/tags", { id: memo.id, tagIds: [t.id] });
  assert.equal(r.json.ok, true);
  assert.deepEqual(r.json.card.tags.map((x: any) => x.name), ["API打标"]);
  await call("POST", "/nio-memo/api/tags/delete", { id: t.id });
});
await ok("/api/batch：转区跳过索引型（changed 如实计数）、非法 op/state 报错、空选报错", async () => {
  const t = (await call("POST", "/nio-memo/api/tags/create", { name: "API批量" })).json.tag;
  const a = (await call("POST", "/nio-memo/api/create", { name: "API批量A", content: "a", tagIds: [t.id] })).json.card;
  const b = (await call("POST", "/nio-memo/api/create", { name: "API批量B", content: "b", tagIds: [t.id] })).json.card;
  const role = listCards(db, "role").find((c) => c.name === "API角色A")!;
  await call("POST", "/nio-memo/api/card/tags", { id: role.id, tagIds: [t.id] });
  const r = await call("POST", "/nio-memo/api/batch", { ids: [a.id, b.id, role.id], op: "state", state: "rule" });
  assert.equal(r.json.ok, true);
  assert.equal(r.json.changed, 2, "索引型应被跳过：3 张里只有 2 张真转区");
  assert.equal(getCardById(db, role.id)!.state, "role", "角色不得被转成规矩");
  const badOp = await call("POST", "/nio-memo/api/batch", { ids: [a.id], op: "wat" });
  assert.equal(badOp.json.ok, false);
  assert.match(badOp.json.error, /未知批量操作/);
  const badSt = await call("POST", "/nio-memo/api/batch", { ids: [a.id], op: "state", state: "role" });
  assert.equal(badSt.json.ok, false);
  assert.match(badSt.json.error, /非法目标区/);
  const empty = await call("POST", "/nio-memo/api/batch", { ids: [], op: "delete" });
  assert.equal(empty.json.ok, false);
  assert.match(empty.json.error, /没有选中任何卡片/);
  await call("POST", "/nio-memo/api/batch", { ids: [a.id, b.id, role.id], op: "delete" });
});
await ok("未知端点 → 404 且带可读 error", async () => {
  const r = await call("GET", "/nio-memo/api/nope");
  assert.equal(r.code, 404);
  assert.equal(r.json.ok, false);
  assert.match(r.json.error, /未知端点/);
});
await ok("GET 打 POST 端点 → 落 404（不错配）", async () => {
  const r = await call("GET", "/nio-memo/api/create");
  assert.equal(r.code, 404);
});

console.log(`\n${process.exitCode ? "FAIL" : "PASS"} · ${passed} 项通过`);
db.close();
nodeFs.rmSync(dir, { recursive: true, force: true });
