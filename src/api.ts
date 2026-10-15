/**
 * api.ts — Web 数据面（host 侧），挂 `/nio-memo` 前缀。
 *
 *   GET  /api/all            → { iron, rules, roles, exps, memos, tags, trashCount, switches }
 *   GET  /api/trash          → { cards }（回收站）
 *   POST /api/create         { name, keywords, content, tagIds?, state? }（state: memo|rule|role|exp，默认 memo）
 *   POST /api/update         { id, name?, keywords?, content?, tagIds? }
 *   POST /api/copy           { id }
 *   POST /api/toggle         { id }            启/停
 *   POST /api/promote|demote { id }            立为规矩 / 降为备忘（角色/经验卡不可互迁，显式报错）
 *   POST /api/delete         { id }            软删除（进回收站）
 *   POST /api/restore        { id }            从回收站恢复
 *   POST /api/purge          { id }            彻底清除（不可恢复）
 *   POST /api/card/tags      { id, tagIds }    打标（替换式）
 *   POST /api/tags/create    { name }
 *   POST /api/tags/rename    { id, name }
 *   POST /api/tags/delete    { id }
 *   POST /api/batch          { ids, op: state|enable|disable|delete, state? }
 *   POST /api/switch         { key: role|exp, enabled }   开关（T4；角色关时经验卡不可启用）
 *   POST /api/role/exps      { roleId, expIds }           角色经验槽（替换式）
 *   GET  /api/exp/roles?id=  → { roles }                  反查：该经验卡被哪些角色绑定
 *
 * 全局部署：所有路由与 session/cwd 无关。所有失败都带可读 error，不静默。
 */
import type { DatabaseSync } from "node:sqlite";
import * as nodeFs from "node:fs";
import * as nodePath from "node:path";

import {
  listCards, listIron, listTags, listTrash, setCardEnabled, setCardState,
  createCard, updateCard, copyCard, deleteCard, restoreCard, purgeCard,
  setCardTags, createTag, renameTag, deleteTag, setCardsState, setCardsEnabled, deleteCards,
  touchCard, getSwitches, setSwitch, listRoleExps, setRoleExps, listRolesOfExp,
  setPermEnabled, setPermCurrentLevel, addPermLevel, updatePermLevel, deletePermLevel, permOwnerOfLevel, getPermState, getCardById, listIron,
} from "./db";
import type { CardState } from "./types";
import { memoDbFile } from "./types";

const STATES: CardState[] = ["memo", "rule", "role", "exp"];

/** 入参 state 归一：非法值显式报错交给调用方处理（这里只做白名单收口） */
function normState(raw: unknown, dflt: CardState = "memo"): CardState {
  const s = String(raw ?? "").trim() as CardState;
  return STATES.includes(s) ? s : dflt;
}

export interface ApiDeps {
  /** 取全局库句柄（懒打开；抛错即显式失败） */
  getDb: () => DatabaseSync;
}

/** 关键词入参：数组或「逗号/顿号/空格」分隔的字符串都接受 */
function normKeywords(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
  if (typeof raw === "string") return raw.split(/[,，、\s]+/).map((s) => s.trim()).filter(Boolean);
  return [];
}

function normIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => Number(x)).filter((n) => Number.isInteger(n));
}

function json(res: any, code: number, body: unknown): void {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8", "cache-control": "no-cache" });
  res.end(JSON.stringify(body));
}

function readBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c: any) => { data += c; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export function installApi(ctx: any, deps: ApiDeps): () => void {
  return ctx.webServer.register({
    kind: "prefix",
    path: "/nio-memo",
    handler: async (req: any, res: any) => {
      const urlPath = (req.url ?? "").split("?")[0] ?? "";
      let db: DatabaseSync;
      try {
        db = deps.getDb();
      } catch (e) {
        json(res, 200, { ok: false, error: `手记库打开失败：${String((e as Error)?.message || e).slice(0, 200)}` });
        return;
      }
      try {
        const isPost = req.method === "POST";
        /**
         * 写操作审计（2026-10-15）：任何一次改动都落一行 JSONL，便于事后与「缓存整段失效」对账。
         * 背景：卡片改动在会话日志里**没有任何事件**，导致此前的归因只能靠猜（实测改动后 10~20 秒即出现整段全灭）。
         * 开关：设 NIO_MEMO_WRITE_LOG=off 可关闭；默认写在库文件同目录的 writes.jsonl。
         */
        const auditWrite = (path: string, payload: unknown) => {
          try {
            if ((process.env.NIO_MEMO_WRITE_LOG ?? "").trim() === "off") return;
            const file = process.env.NIO_MEMO_WRITE_LOG?.trim()
              || nodePath.join(nodePath.dirname(memoDbFile()), "writes.jsonl");
            const line = JSON.stringify({ ts: new Date().toISOString(), path, payload });
            nodeFs.appendFileSync(file, line + "\n");
          } catch { /* 审计失败绝不影响主流程 */ }
        };
        const body = async () => {
          const parsed = JSON.parse((await readBody(req)) || "{}");
          auditWrite(urlPath, parsed);   // 只记尝试；成功与否由响应体体现
          return parsed;
        };

        if (req.method === "GET" && urlPath.endsWith("/api/all")) {
          // 不带层级标签（核心/本机/DSH）——本项目已脱离旧记忆卡片分层体系
          const cards = listCards(db);
          json(res, 200, {
            ok: true,
            iron: listIron(db).map(({ group, permEnabled, permLevels, permCurrentLevelId, permCurrentLevelName, ...rest }) => ({
              ...rest, permEnabled, permLevels, permCurrentLevelId, permCurrentLevelName,
            })),
            rules: cards.filter((c) => c.state === "rule"),
            roles: cards.filter((c) => c.state === "role"),
            exps: cards.filter((c) => c.state === "exp"),
            memos: cards.filter((c) => c.state === "memo"),
            tags: listTags(db),
            trashCount: listTrash(db).length,
            switches: getSwitches(db),
          });
          return;
        }

        if (req.method === "GET" && urlPath.endsWith("/api/trash")) {
          json(res, 200, { ok: true, cards: listTrash(db) });
          return;
        }

        if (isPost && urlPath.endsWith("/api/create")) {
          const b = await body();
          const card = createCard(db, {
            name: String(b?.name ?? ""),
            keywords: normKeywords(b?.keywords),
            content: String(b?.content ?? ""),
            tagIds: normIds(b?.tagIds),
            version: b?.version === undefined || b?.version === "" ? undefined : Number(b.version),
          }, normState(b?.state));
          json(res, 200, { ok: true, card });
          return;
        }

        if (isPost && urlPath.endsWith("/api/update")) {
          const b = await body();
          const id = Number(b?.id);
          if (!Number.isInteger(id)) { json(res, 200, { ok: false, error: "缺少合法 id" }); return; }
          const patch: { name?: string; keywords?: string[]; content?: string; tagIds?: number[]; version?: number } = {};
          if (b?.version !== undefined && b?.version !== "") patch.version = Number(b.version);
          if (b?.name !== undefined) patch.name = String(b.name);
          if (b?.keywords !== undefined) patch.keywords = normKeywords(b.keywords);
          if (b?.content !== undefined) patch.content = String(b.content);
          if (b?.tagIds !== undefined) patch.tagIds = normIds(b.tagIds);
          json(res, 200, { ok: true, card: updateCard(db, id, patch) });
          return;
        }

        if (isPost && urlPath.endsWith("/api/copy")) {
          const b = await body();
          const id = Number(b?.id);
          if (!Number.isInteger(id)) { json(res, 200, { ok: false, error: "缺少合法 id" }); return; }
          json(res, 200, { ok: true, card: copyCard(db, id) });
          return;
        }

        if (isPost && urlPath.endsWith("/api/toggle")) {
          const b = await body();
          const id = Number(b?.id);
          if (!Number.isInteger(id)) { json(res, 200, { ok: false, error: "缺少合法 id" }); return; }
          const cur = listCards(db, undefined, { deleted: true }).find((c) => c.id === id);
          if (!cur) { json(res, 200, { ok: false, error: `未找到卡片 id=${id}` }); return; }
          json(res, 200, { ok: true, card: setCardEnabled(db, id, !cur.enabled) });
          return;
        }

        if (isPost && (urlPath.endsWith("/api/promote") || urlPath.endsWith("/api/demote"))) {
          const b = await body();
          const id = Number(b?.id);
          if (!Number.isInteger(id)) { json(res, 200, { ok: false, error: "缺少合法 id" }); return; }
          const target: CardState = urlPath.endsWith("/api/promote") ? "rule" : "memo";
          const card = setCardState(db, id, target);
          if (!card) { json(res, 200, { ok: false, error: `未找到卡片 id=${id}` }); return; }
          json(res, 200, { ok: true, card });
          return;
        }

        // 「更新」：只刷新修改时间为当前
        if (isPost && urlPath.endsWith("/api/touch")) {
          const b = await body();
          const id = Number(b?.id);
          if (!Number.isInteger(id)) { json(res, 200, { ok: false, error: "缺少合法 id" }); return; }
          json(res, 200, { ok: true, card: touchCard(db, id) });
          return;
        }

        if (isPost && urlPath.endsWith("/api/delete")) {
          const b = await body();
          const id = Number(b?.id);
          if (!Number.isInteger(id)) { json(res, 200, { ok: false, error: "缺少合法 id" }); return; }
          json(res, 200, { ok: true, card: deleteCard(db, id) });
          return;
        }

        if (isPost && urlPath.endsWith("/api/restore")) {
          const b = await body();
          const id = Number(b?.id);
          if (!Number.isInteger(id)) { json(res, 200, { ok: false, error: "缺少合法 id" }); return; }
          json(res, 200, { ok: true, card: restoreCard(db, id) });
          return;
        }

        if (isPost && urlPath.endsWith("/api/purge")) {
          const b = await body();
          const id = Number(b?.id);
          if (!Number.isInteger(id)) { json(res, 200, { ok: false, error: "缺少合法 id" }); return; }
          purgeCard(db, id);
          json(res, 200, { ok: true });
          return;
        }

        if (isPost && urlPath.endsWith("/api/card/tags")) {
          const b = await body();
          const id = Number(b?.id);
          if (!Number.isInteger(id)) { json(res, 200, { ok: false, error: "缺少合法 id" }); return; }
          setCardTags(db, id, normIds(b?.tagIds));
          const card = listCards(db, undefined, { deleted: true }).find((c) => c.id === id) ?? null;
          json(res, 200, { ok: true, card });
          return;
        }

        if (isPost && urlPath.endsWith("/api/tags/create")) {
          const b = await body();
          json(res, 200, { ok: true, tag: createTag(db, String(b?.name ?? "")) });
          return;
        }

        if (isPost && urlPath.endsWith("/api/tags/rename")) {
          const b = await body();
          const id = Number(b?.id);
          if (!Number.isInteger(id)) { json(res, 200, { ok: false, error: "缺少合法 id" }); return; }
          json(res, 200, { ok: true, tag: renameTag(db, id, String(b?.name ?? "")) });
          return;
        }

        if (isPost && urlPath.endsWith("/api/tags/delete")) {
          const b = await body();
          const id = Number(b?.id);
          if (!Number.isInteger(id)) { json(res, 200, { ok: false, error: "缺少合法 id" }); return; }
          deleteTag(db, id);
          json(res, 200, { ok: true });
          return;
        }

        // ── T4：功能开关（角色功能 / 经验卡） ──
        if (isPost && urlPath.endsWith("/api/switch")) {
          const b = await body();
          const key = String(b?.key ?? "");
          if (key !== "role" && key !== "exp") { json(res, 200, { ok: false, error: `未知开关：${key}` }); return; }
          // 硬规则：角色未启用时经验卡不可启用（db 层显式抛错，这里如实回传）
          json(res, 200, { ok: true, switches: setSwitch(db, key, !!b?.enabled) });
          return;
        }

        // ── T4：角色「经验槽」（POST 替换式绑定；GET 读当前槽） ──
        if (urlPath.endsWith("/api/role/exps")) {
          if (req.method === "GET") {
            const q = new URL(req.url ?? "", "http://localhost").searchParams;
            const roleId = Number(q.get("roleId"));
            if (!Number.isInteger(roleId)) { json(res, 200, { ok: false, error: "缺少合法 roleId" }); return; }
            json(res, 200, { ok: true, exps: listRoleExps(db, roleId) });
            return;
          }
          const b = await body();
          const roleId = Number(b?.roleId);
          if (!Number.isInteger(roleId)) { json(res, 200, { ok: false, error: "缺少合法 roleId" }); return; }
          const r = setRoleExps(db, roleId, normIds(b?.expIds));
          json(res, 200, { ok: true, ...r, exps: listRoleExps(db, roleId) });
          return;
        }

        // ── T4：反查——该经验卡被哪些角色绑定 ──
        if (req.method === "GET" && urlPath.endsWith("/api/exp/roles")) {
          const q = new URL(req.url ?? "", "http://localhost").searchParams;
          const id = Number(q.get("id"));
          if (!Number.isInteger(id)) { json(res, 200, { ok: false, error: "缺少合法 id" }); return; }
          json(res, 200, { ok: true, roles: listRolesOfExp(db, id) });
          return;
        }

        // ── 权限板块（并入实体：卡片 / 铁条例 都有） ──
        const permOwner = async () => {
          const b = await body();
          const kind = b?.kind === "iron" ? "iron" : "card";
          const id = Number(b?.id);
          if (!Number.isInteger(id)) return null;
          return { b, kind: kind as "card" | "iron", id };
        };
        const withOwner = (kind: "card" | "iron", id: number, perm: unknown) => ({
          ok: true, kind, id, perm,
          ...(kind === "card" ? { card: getCardById(db, id) } : { clause: listIron(db).find((c) => c.id === id) ?? null }),
        });

        if (isPost && urlPath.endsWith("/api/perm/enable")) {
          const o = await permOwner();
          if (!o) { json(res, 200, { ok: false, error: "缺少合法 kind / id" }); return; }
          const st = setPermEnabled(db, o.kind, o.id, !!o.b?.enabled);
          json(res, 200, withOwner(o.kind, o.id, st));
          return;
        }

        if (isPost && urlPath.endsWith("/api/perm/current")) {
          const o = await permOwner();
          if (!o) { json(res, 200, { ok: false, error: "缺少合法 kind / id" }); return; }
          const levelId = Number(o.b?.levelId);
          if (!Number.isInteger(levelId)) { json(res, 200, { ok: false, error: "缺少合法 levelId" }); return; }
          const st = setPermCurrentLevel(db, o.kind, o.id, levelId);
          json(res, 200, withOwner(o.kind, o.id, st));
          return;
        }

        if (isPost && urlPath.endsWith("/api/perm/level/add")) {
          const o = await permOwner();
          if (!o) { json(res, 200, { ok: false, error: "缺少合法 kind / id" }); return; }
          const st = addPermLevel(db, o.kind, o.id, String(o.b?.name ?? ""), String(o.b?.content ?? ""), String(o.b?.color ?? "gray"));
          json(res, 200, withOwner(o.kind, o.id, st));
          return;
        }

        if (isPost && urlPath.endsWith("/api/perm/level/update")) {
          const b = await body();
          const levelId = Number(b?.levelId);
          if (!Number.isInteger(levelId)) { json(res, 200, { ok: false, error: "缺少合法 levelId" }); return; }
          const patch: { name?: string; content?: string; color?: string } = {};
          if (b?.name !== undefined) patch.name = String(b.name);
          if (b?.content !== undefined) patch.content = String(b.content);
          if (b?.color !== undefined) patch.color = String(b.color);
          const st = updatePermLevel(db, levelId, patch);
          const owner = permOwnerOfLevel(db, levelId);
          json(res, 200, owner ? withOwner(owner.kind, owner.ownerId, st) : { ok: true, perm: st });
          return;
        }

        if (isPost && urlPath.endsWith("/api/perm/level/delete")) {
          const b = await body();
          const levelId = Number(b?.levelId);
          if (!Number.isInteger(levelId)) { json(res, 200, { ok: false, error: "缺少合法 levelId" }); return; }
          const owner0 = permOwnerOfLevel(db, levelId);
          const st = deletePermLevel(db, levelId);
          json(res, 200, owner0 ? withOwner(owner0.kind, owner0.ownerId, st) : { ok: true, perm: st });
          return;
        }

        if (isPost && urlPath.endsWith("/api/batch")) {
          const b = await body();
          const ids = normIds(b?.ids);
          if (!ids.length) { json(res, 200, { ok: false, error: "没有选中任何卡片" }); return; }
          const op = String(b?.op ?? "");
          let n = 0;
          if (op === "state") {
            const st = String(b?.state ?? "");
            if (st !== "memo" && st !== "rule") { json(res, 200, { ok: false, error: `非法目标区：${st}` }); return; }
            n = setCardsState(db, ids, st);
          } else if (op === "enable") n = setCardsEnabled(db, ids, true);
          else if (op === "disable") n = setCardsEnabled(db, ids, false);
          else if (op === "delete") n = deleteCards(db, ids);
          else { json(res, 200, { ok: false, error: `未知批量操作：${op}` }); return; }
          json(res, 200, { ok: true, changed: n });
          return;
        }

        json(res, 404, { ok: false, error: `未知端点：${req.method} ${urlPath}` });
      } catch (e) {
        json(res, 200, { ok: false, error: `处理失败：${String((e as Error)?.message || e).slice(0, 200)}` });
      }
    },
  });
}
