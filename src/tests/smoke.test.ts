/**
 * smoke.test.ts — 宿主端逻辑冒烟（不依赖 DSH 宿主）。
 *
 * 跑法（tsx 需在 DSH 检出 cwd 下解析）：
 *   cd <DSH 检出> && node --import tsx/esm <插件目录>/src/tests/smoke.test.ts
 *
 * 覆盖：播种 / 默认-自定义来源 / 注入矩阵 / 启停 / 升降 / 创建·编辑·复制 / 幂等 / 路径读取
 */
import * as assert from "node:assert/strict";
import * as nodeFs from "node:fs";
import * as nodeOs from "node:os";
import * as nodePath from "node:path";

import {
  openMemoDb, seedIfNeeded, listIron, listCards, getCardByPath, setCardEnabled, setCardState,
  readIndexNote, createCard, updateCard, copyCard, getCardById, listTrash, deleteCard, restoreCard,
  purgeCard, listTags, createTag, renameTag, deleteTag, setCardTags, cardsWithTag,
  setCardsState, setCardsEnabled, deleteCards,
  listPermissions, setPermissionLevel, setPermissionEnabled, addPermissionLevel,
  updatePermissionLevel, deletePermissionLevel, deletePermission, restorePermission,
  touchCard, updateCard,
  setPermEnabled, setPermCurrentLevel, addPermLevel, updatePermLevel, deletePermLevel, getPermState,
  getSwitches, setSwitch, listRoleExps, setRoleExps, listRolesOfExp,
} from "../db";
import { parseMd, blocksToText } from "../../client/md";
import { buildInjectText, buildRoleReadText } from "../inject";

let passed = 0;
function ok(label: string, fn: () => void): void {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${label}`);
  } catch (e) {
    console.error(`  ✗ ${label}\n    ${String((e as Error)?.message || e)}`);
    process.exitCode = 1;
  }
}

function getPermissionByIdProbe(db: any, id: number): unknown {
  return (db.prepare("SELECT id FROM permissions WHERE id = ?").get(id) as any) ?? null;
}

const dir = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "nio-memo-smoke-"));
const db = openMemoDb(dir);

console.log("播种与来源");
ok("铁律共 2 条：手记卡片维护 + 卡片内容过时需告知修改，均 default", () => {
  const iron = listIron(db);
  assert.equal(iron.length, 2);
  assert.equal(iron[0].title, "手记卡片维护");
  assert.equal(iron[0].origin, "default");
  // 2026-10-16 用户指令：由动态规矩升为铁律并固化进 seed（origin 必须是 default，UI 不得显示「自定义」）
  assert.equal(iron[1].title, "卡片内容过时需告知修改");
  assert.equal(iron[1].origin, "default");
  assert.ok(iron[1].content.includes("告知用户") && iron[1].content.includes("准许"));
});
ok("发布集只含默认：动态规矩 5 条 + 备忘 3 张，全部 default，自定义 0（另加本轮测试卡）", () => {
  const cards = listCards(db);
  const rules = cards.filter((c) => c.state === "rule");
  const memos = cards.filter((c) => c.state === "memo");
  // 测试前已建过 1 张自定义卡（排序口径测试），故这里只断言默认集部分
  const defRules = rules.filter((c) => c.origin === "default");
  assert.equal(defRules.length, 5);
  assert.deepEqual(defRules.map((c) => c.name).sort(), [
    "禁止静默兜底（v2.4.5）", "失败显式化", "改动前备份",
    "凡需用户反馈/决策的，一律走交互性决策（v2.11 · 2026-10-14）",
    "语言规范",
  ].sort());
  assert.equal(memos.filter((c) => c.origin === "default").length, 3);
  assert.ok(rules.every((c) => c.keywords.length > 0), "每条动态规矩都应有关键词");
  assert.ok(memos.every((c) => c.keywords.length > 0), "备忘卡都应有关键词");
  assert.ok(memos.some((c) => c.name === "DSH重启方式"), "默认集应含带权限板块的 DSH重启方式");
});
ok("默认排在前（排序口径）", () => {
  const custom = createCard(db, { name: "排序测试卡", keywords: ["x"], content: "c" });
  assert.equal(custom.origin, "custom");
  const memos = listCards(db, "memo");
  assert.equal(memos[memos.length - 1].id, custom.id, "自定义卡应排在默认卡之后");
});
ok("「手记卡片维护」已改写为手记口径（含多触发点）", () => {
  const c = listIron(db)[0];
  assert.ok(c.content.includes("手记"));
  assert.ok(c.content.includes("触发点"), "应写明多种触发点");
  assert.ok(c.content.includes("nio-memo") || c.content.includes("memo.db"));
  assert.ok(!c.content.includes("偏好.md"));
});
ok("播种幂等（重跑不重复、不覆盖）", () => {
  assert.equal(seedIfNeeded(db), false);
  assert.equal(listIron(db).length, 2);
  assert.equal(listCards(db).length, 9); // 5 默认规矩（含 语言规范）+ 3 默认备忘 + 1 排序测试卡
});
ok("索引说明已落库（非兜底）", () => {
  const n = readIndexNote(db);
  assert.equal(n.fallback, false);
  assert.ok(n.text.includes("nio_memo"));
});
// ── 出厂默认（2026-10-15 用户拍板）：呈现极简，高级功能默认不启用 ──
ok("出厂默认：角色 / 经验卡开关均为关（缺 meta 行 = 关）", () => {
  const sw = getSwitches(db);
  assert.deepEqual([sw.roleEnabled, sw.expEnabled, sw.expEffective], [false, false, false]);
});

console.log("注入矩阵");
ok("铁律全文无条件注入", () => {
  const t = buildInjectText(db);
  assert.ok(t.includes("📌 手记 · 规矩（铁律"));
  assert.ok(t.includes("手记卡片维护"));
});
ok("4 条默认动态规矩全文注入", () => {
  const t = buildInjectText(db);
  const seg = t.slice(t.indexOf("📌 手记 · 动态规矩"));
  for (const name of ["禁止静默兜底", "失败显式化", "改动前备份", "交互性决策"]) {
    assert.ok(seg.includes(name), `动态规矩区应含 ${name}`);
  }
  assert.ok(seg.includes("绝不默默切换"), "条例正文随动态规矩全文注入");
});
ok("备忘卡只进清单，正文不进注入", () => {
  const t = buildInjectText(db);
  assert.ok(t.includes("- 本机主机 ｜ 关键词：本机、主机、硬件"));
  assert.ok(!t.includes("# 本机主机（示例）"), "备忘卡正文不进注入，只进索引清单");
});

console.log("创建 / 编辑 / 复制");
ok("创建 → 自定义卡，落备忘区", () => {
  const c = createCard(db, { name: "我的测试卡", keywords: ["a", "b"], content: "# 内容\n正文" });
  assert.equal(c.origin, "custom");
  assert.equal(c.state, "memo");
  assert.equal(c.enabled, true);
  assert.equal(c.path, "备忘/我的测试卡.md");
  assert.deepEqual(c.keywords, ["a", "b"]);
});
ok("重名拒绝（显式报错）", () => {
  assert.throws(() => createCard(db, { name: "我的测试卡", keywords: [], content: "x" }), /已存在同名卡片/);
});
ok("编辑：改内容/关键词/标题（改名同步路径）", () => {
  const before = listCards(db, "memo").find((c) => c.name === "我的测试卡")!;
  const after = updateCard(db, before.id, { name: "我的测试卡2", keywords: ["c"], content: "改了" });
  assert.equal(after.name, "我的测试卡2");
  assert.equal(after.path, "备忘/我的测试卡2.md");
  assert.equal(after.content, "改了");
  assert.deepEqual(after.keywords, ["c"]);
  assert.equal(after.origin, "custom", "编辑不应改变来源");
});
ok("版本号：新卡 v1，编辑 +1，启停不 +1", () => {
  const c = createCard(db, { name: "版本号测试卡", keywords: [], content: "v1" });
  assert.equal(c.version, 1);
  const c2 = updateCard(db, c.id, { content: "v2" });
  assert.equal(c2.version, 2);
  const c3 = updateCard(db, c.id, { content: "v3" });
  assert.equal(c3.version, 3);
  const c4 = setCardEnabled(db, c.id, false)!;
  assert.equal(c4.version, 3, "启停不应改内容版本");
  const c5 = setCardState(db, c.id, "rule")!;
  assert.equal(c5.version, 3, "升降区不应改内容版本");
  assert.notEqual(c4.updatedAt, "", "应有修改时间");
  purgeCard(db, c.id);
});
ok("编辑默认卡：内容变、来源仍为 default", () => {
  const def = listCards(db, "memo").find((c) => c.name === "本机主机")!;
  const after = updateCard(db, def.id, { content: "自定义改过的内容" });
  assert.equal(after.origin, "default");
  assert.equal(after.content, "自定义改过的内容");
});
ok("复制 → 新的自定义卡（含「_副本」去重）", () => {
  const src = listCards(db, "rule")[0];
  const copy1 = copyCard(db, src.id);
  const copy2 = copyCard(db, src.id);
  assert.equal(copy1.origin, "custom");
  assert.equal(copy1.state, "memo");
  assert.equal(copy1.content, src.content);
  assert.equal(copy1.name, `${src.name}_副本`);
  assert.equal(copy2.name, `${src.name}_副本2`);
});
ok("未知 id 的编辑/复制显式报错", () => {
  assert.throws(() => updateCard(db, 999999, { content: "x" }), /未找到卡片/);
  assert.throws(() => copyCard(db, 999999), /未找到卡片/);
});

console.log("启停与升降");
const memo = listCards(db).find((c) => c.name === "本机主机")!;
ok("关闭备忘卡 → 移出索引清单，并显式报停用数", () => {
  setCardEnabled(db, memo.id, false);
  const t = buildInjectText(db);
  assert.ok(!t.includes("- 本机主机 ｜"));
  assert.ok(/另有 \d+ 张卡片已停用/.test(t));
});
ok("停用卡读取可判停（nio_memo 拒绝的依据）", () => {
  assert.equal(getCardByPath(db, memo.path)!.enabled, false);
});
ok("重新启用 → 回到清单", () => {
  setCardEnabled(db, memo.id, true);
  assert.ok(buildInjectText(db).includes("- 本机主机 ｜"));
});
ok("立为规矩 → 全文进注入、清单里消失；路径不变", () => {
  const p0 = getCardById(db, memo.id)!.path;
  const up = setCardState(db, memo.id, "rule")!;
  assert.equal(up.state, "rule");
  assert.equal(up.path, p0);
  const t = buildInjectText(db);
  assert.ok(!t.includes("- 本机主机 ｜"));
  assert.ok(t.includes("### 本机主机"));
});
ok("关闭动态规矩 → 全文不再注入", () => {
  setCardEnabled(db, memo.id, false);
  assert.ok(!buildInjectText(db).includes("### 本机主机"));
  setCardEnabled(db, memo.id, true);
});
ok("降为备忘 → 回到清单注入模式", () => {
  const down = setCardState(db, memo.id, "memo")!;
  assert.equal(down.state, "memo");
  const t = buildInjectText(db);
  assert.ok(t.includes("- 本机主机 ｜"));
  assert.ok(!t.includes("### 本机主机"));
});

console.log("权限板块（并入实体）");
ok("默认挂载：铁律「手记卡片维护」自动获得 禁止/允许，当前=禁止", () => {
  const iron = listIron(db)[0];
  assert.equal(iron.permEnabled, true);
  assert.deepEqual(iron.permLevels.map((l) => l.name), ["禁止", "允许"]);
  assert.equal(iron.permLevels[0].color, "red");
  assert.equal(iron.permLevels[1].color, "blue");
  assert.equal(iron.permCurrentLevelName, "禁止", "默认从严");
});
ok("铁律注入带「当前档位」行；切档后随之改变", () => {
  const iron = listIron(db)[0];
  let t = buildInjectText(db);
  assert.ok(t.includes(`当前档位：禁止`));
  const allow = iron.permLevels.find((l) => l.name === "允许")!;
  setPermCurrentLevel(db, "iron", iron.id, allow.id);
  t = buildInjectText(db);
  assert.ok(t.includes(`当前档位：允许`));
  const deny = iron.permLevels.find((l) => l.name === "禁止")!;
  setPermCurrentLevel(db, "iron", iron.id, deny.id);
});
ok("备忘卡开权限 → 全文注入（含档位）；关掉 → 回到清单行", () => {
  const c = createCard(db, { name: "权限板块测试卡", keywords: ["pk"], content: "卡片正文_UNIQUE_MARK" });
  assert.ok(!buildInjectText(db).includes("卡片正文_UNIQUE_MARK"), "未开权限时备忘卡只进清单");
  const st = setPermEnabled(db, "card", c.id, true);
  assert.equal(st.enabled, true);
  assert.deepEqual(st.levels.map((l) => l.name), ["禁止", "允许"], "开启时自动建默认档位");
  let t = buildInjectText(db);
  assert.ok(t.includes("卡片正文_UNIQUE_MARK"), "开权限后应全文注入");
  assert.ok(t.includes("已开启权限"));
  setPermEnabled(db, "card", c.id, false);
  t = buildInjectText(db);
  assert.ok(!t.includes("卡片正文_UNIQUE_MARK"), "关掉后回到清单行");
  purgeCard(db, c.id);
});
ok("档位增改删（至少保留一个）+ 颜色可改", () => {
  const c = createCard(db, { name: "档位CRUD测试卡", keywords: [], content: "x" });
  setPermEnabled(db, "card", c.id, true);
  let st = addPermLevel(db, "card", c.id, "仅限本会话", "只在当前会话允许", "orange");
  assert.equal(st.levels.length, 3);
  const mid = st.levels.find((l) => l.name === "仅限本会话")!;
  st = updatePermLevel(db, mid.id, { name: "本会话", color: "purple" });
  assert.ok(st.levels.some((l) => l.name === "本会话" && l.color === "purple"));
  st = deletePermLevel(db, mid.id);
  assert.equal(st.levels.length, 2);
  const first = st.levels[0].id;
  deletePermLevel(db, st.levels[1].id);
  assert.throws(() => deletePermLevel(db, first), /至少要保留一个档位/);
  purgeCard(db, c.id);
});
ok("档位校验：不属于该实体的档位 / 未知实体 一律显式报错", () => {
  const a = createCard(db, { name: "档位校验A", keywords: [], content: "a" });
  const b = createCard(db, { name: "档位校验B", keywords: [], content: "b" });
  setPermEnabled(db, "card", a.id, true);
  setPermEnabled(db, "card", b.id, true);
  const bLevel = getPermState(db, "card", b.id).levels[0].id;
  assert.throws(() => setPermCurrentLevel(db, "card", a.id, bLevel), /不属于该实体/);
  assert.throws(() => setPermEnabled(db, "card", 999999, true), /未找到/);
  purgeCard(db, a.id); purgeCard(db, b.id);
});

ok("updateCard 真的写 origin（防止静默忽略字段）", () => {
  const c = createCard(db, { name: "来源改写测试卡", keywords: [], content: "x" });
  assert.equal(c.origin, "custom");
  const d = updateCard(db, c.id, { origin: "default", name: "来源改写测试卡" });
  assert.equal(d.origin, "default", "传了 origin 就必须落库");
  assert.equal(listCards(db).find((x) => x.id === c.id)!.origin, "default", "库里也应已变更");
  purgeCard(db, c.id);
});

ok("注入排序稳定：编辑/更新时间不改变注入顺序（界面排序仍按改动时间）", () => {
  const mk = (n: string) => createCard(db, { name: n, keywords: ["注入序"], content: "x" });
  const a = mk("注入序测试A"), b = mk("注入序测试B"), c = mk("注入序测试C");
  const order1 = buildInjectText(db).split("\n").filter((l) => l.includes("注入序测试")).map((l) => l.trim().slice(0, 12));
  touchCard(db, a.id);              // 只改时间（相当于点「更新」）
  updateCard(db, b.id, { content: "改过了" });  // 改内容也会动 updated_at
  const order2 = buildInjectText(db).split("\n").filter((l) => l.includes("注入序测试")).map((l) => l.trim().slice(0, 12));
  assert.deepEqual(order2, order1, "注入顺序必须与更新时间无关");
  const uiOrder = listCards(db).filter((x) => x.name.startsWith("注入序测试")).map((x) => x.name);
  assert.ok(uiOrder.length === 3);
  for (const x of [a, b, c]) purgeCard(db, x.id);
});

console.log("Markdown 解析");
ok("标题/列表/引用/表格/代码块/分隔线全支持", () => {
  const md = "# 标题\n\n段落文字\n\n- a\n- b\n\n> 引用\n\n| 列1 | 列2 |\n|---|---|\n| x | y |\n\n```js\ncode\n```\n\n---\n";
  const b = parseMd(md);
  for (const t of ["h", "p", "list", "quote", "table", "code", "hr"]) {
    assert.ok(b.some((x) => x.type === t), `缺少块类型 ${t}`);
  }
});
ok("长内容不截断（末行仍在）", () => {
  const lines = Array.from({ length: 400 }, (_, i) => `第 ${i} 行 内容 abcdefg`);
  const src = `# 头\n\n${lines.join("\n")}\n\n## 尾\n\n最后一行 END_MARK`;
  assert.ok(blocksToText(parseMd(src)).includes("END_MARK"));
});
ok("不空转：以块起始符开头的怪行也能推进", () => {
  const src = "#### \n\n##### 五级标题\n\n| 单行表 |\n\n文本";
  const b = parseMd(src);
  assert.ok(b.length > 0);
  assert.ok(blocksToText(b).includes("文本"));
});

console.log("回收站");
ok("删除 → 移出正常列表、进回收站；注入也不再用它", () => {
  const c = createCard(db, { name: "回收站测试卡", keywords: ["rr"], content: "待删" });
  deleteCard(db, c.id);
  assert.ok(!listCards(db).some((x) => x.id === c.id), "正常列表不应再见到它");
  assert.ok(listTrash(db).some((x) => x.id === c.id), "回收站应见到它");
  assert.ok(!buildInjectText(db).includes("回收站测试卡"));
});
ok("恢复 → 回到正常列表", () => {
  const c = listTrash(db).find((x) => x.name === "回收站测试卡")!;
  restoreCard(db, c.id);
  assert.ok(listCards(db).some((x) => x.id === c.id));
  assert.ok(!listTrash(db).some((x) => x.id === c.id));
});
ok("彻底清除 → 连回收站都没了", () => {
  const c = listCards(db).find((x) => x.name === "回收站测试卡")!;
  purgeCard(db, c.id);
  assert.equal(getCardById(db, c.id), null);
});

console.log("标签与批量");
ok("系统标签「默认 / 自定义」存在且不可改删", () => {
  const tags = listTags(db);
  for (const n of ["默认", "自定义"]) {
    const t = tags.find((x) => x.name === n)!;
    assert.ok(t && t.system, `${n} 应为系统标签`);
    assert.throws(() => renameTag(db, t.id, "改名试试"), /系统标签/);
    assert.throws(() => deleteTag(db, t.id), /系统标签/);
  }
});
ok("系统标签计数按来源统计（不再恒为 0）", () => {
  const tags = listTags(db);
  const d = tags.find((t) => t.name === "默认")!;
  const c = tags.find((t) => t.name === "自定义")!;
  const active = listCards(db);
  assert.equal(d.count, active.filter((x) => x.origin === "default").length);
  assert.equal(c.count, active.filter((x) => x.origin === "custom").length);
  assert.ok(d.count > 0, "默认卡计数应 > 0");
});
ok("新建 / 改名 / 删除自定义标签", () => {
  const t = createTag(db, "测试标签");
  assert.equal(t.system, false);
  assert.throws(() => createTag(db, "测试标签"), /标签已存在/);
  const r = renameTag(db, t.id, "测试标签2");
  assert.equal(r.name, "测试标签2");
  deleteTag(db, t.id);
  assert.ok(!listTags(db).some((x) => x.id === t.id));
});
ok("打标 / 取标签 / 某标签下卡片", () => {
  const t = createTag(db, "打标测试");
  const c = createCard(db, { name: "标签卡A", keywords: [], content: "x", tagIds: [t.id] });
  assert.deepEqual(getCardById(db, c.id)!.tags.map((x) => x.name), ["打标测试"]);
  assert.equal(cardsWithTag(db, t.id).length, 1);
  setCardTags(db, c.id, []);
  assert.equal(cardsWithTag(db, t.id).length, 0);
  deleteTag(db, t.id);
});
ok("批量：转区 / 启停 / 删除", () => {
  const t = createTag(db, "批量测试");
  const a = createCard(db, { name: "批量A", keywords: [], content: "a", tagIds: [t.id] });
  const b = createCard(db, { name: "批量B", keywords: [], content: "b", tagIds: [t.id] });
  const ids = cardsWithTag(db, t.id).map((x) => x.id);
  assert.equal(ids.length, 2);
  assert.equal(setCardsState(db, ids, "rule"), 2);
  assert.ok(ids.every((id) => getCardById(db, id)!.state === "rule"));
  assert.equal(setCardsEnabled(db, ids, false), 2);
  assert.ok(ids.every((id) => getCardById(db, id)!.enabled === false));
  assert.equal(deleteCards(db, ids), 2);
  assert.equal(cardsWithTag(db, t.id).length, 0);
  for (const id of [a.id, b.id]) purgeCard(db, id);
  deleteTag(db, t.id);
});

// ── 19. T4：角色 / 经验卡（索引型实体 + 多对多绑定 + 三级开关真值表） ──
const t4expA = createCard(db, { name: "T4经验A", keywords: ["剑法"], content: "经验A正文" }, "exp");
const t4expB = createCard(db, { name: "T4经验B", keywords: ["身法"], content: "经验B正文" }, "exp");
const t4role = createCard(db, { name: "T4角色", keywords: ["试"], content: "角色正文" }, "role");
const t4role2 = createCard(db, { name: "T4角色二", keywords: ["试"], content: "角色二正文" }, "role");

ok("T4 路径派生：角色/ 与 经验/", () => {
  assert.equal(t4role.path, "角色/T4角色.md");
  assert.equal(t4expA.path, "经验/T4经验A.md");
  assert.equal(getCardByPath(db, "角色/T4角色.md")!.id, t4role.id);
  assert.equal(getCardByPath(db, "经验/T4经验A.md")!.id, t4expA.id);
});

ok("T4 绑定：角色绑多张 + 一张经验卡可被多角色绑（多对多）", () => {
  const r = setRoleExps(db, t4role.id, [t4expA.id, t4expB.id]);
  assert.equal(r.linked.length, 2);
  assert.equal(r.ignored.length, 0);
  assert.equal(listRoleExps(db, t4role.id).length, 2);
  setRoleExps(db, t4role2.id, [t4expA.id]);
  assert.equal(listRolesOfExp(db, t4expA.id).length, 2);
});

ok("T4 绑定：非经验卡 id 被忽略并回报（不静默吞）", () => {
  const r = setRoleExps(db, t4role.id, [t4expA.id, t4role2.id, 999999]);
  assert.equal(r.linked.length, 1);
  assert.deepEqual([...r.ignored].sort((a, b) => a - b), [t4role2.id, 999999].sort((a, b) => a - b));
  assert.equal(setRoleExps(db, t4role.id, [t4expA.id, t4expB.id]).linked.length, 2);   // 复原
});

ok("T4 索引型不参与升/降（显式报错）", () => {
  assert.throws(() => setCardState(db, t4role.id, "memo"), /不参与/);
  assert.throws(() => setCardState(db, t4expA.id, "rule"), /不参与/);
  assert.throws(() => setRoleExps(db, t4expA.id, [t4expB.id]), /不是角色卡/);
});

ok("T4 注入：角色进索引；经验卡名与正文**永不**进注入", () => {
  setSwitch(db, "role", true); setSwitch(db, "exp", true);   // 出厂默认关 ⇒ 本用例自己开
  const txt = buildInjectText(db);
  assert.ok(txt.includes("手记 · 角色"), "应含角色段");
  assert.ok(txt.includes("角色/T4角色.md"), "应含角色路径");
  assert.ok(!txt.includes("T4经验A"), "经验卡名不进注入");
  assert.ok(!txt.includes("经验A正文"), "经验卡正文不进注入");
});

ok("T4 真值表[角色开·经验卡开]：读角色带出经验卡索引行（非正文）", () => {
  setSwitch(db, "role", true); setSwitch(db, "exp", true);
  const sw = getSwitches(db);
  assert.deepEqual([sw.roleEnabled, sw.expEnabled, sw.expEffective], [true, true, true]);
  const t = buildRoleReadText(db, getCardById(db, t4role.id)!);
  assert.ok(t.includes("## 经验槽"));
  assert.ok(t.includes("T4经验A") && t.includes("经验/T4经验A.md"));
  assert.ok(t.includes("T4经验B"));
  assert.ok(!t.includes("经验A正文"), "只给索引行，不给正文（两步读取是有意设计）");
});

ok("T4 真值表[角色开·经验卡关]：角色索引仍在；经验槽整块停用且显式说明", () => {
  setSwitch(db, "exp", false);
  const sw = getSwitches(db);
  assert.deepEqual([sw.roleEnabled, sw.expEnabled, sw.expEffective], [true, false, false]);
  assert.ok(buildInjectText(db).includes("角色/T4角色.md"), "角色索引不受经验卡开关影响");
  const t = buildRoleReadText(db, getCardById(db, t4role.id)!);
  assert.ok(!t.includes("T4经验A"), "未生效 ⇒ 不带出经验卡索引");
  assert.ok(t.includes("未生效"), "必须显式写明原因（禁静默兜底）");
});

ok("T4 真值表[角色关]：角色段整段不注入；经验卡原设定被压制但**保留**", () => {
  setSwitch(db, "role", true); setSwitch(db, "exp", true); setSwitch(db, "role", false);
  const sw = getSwitches(db);
  assert.equal(sw.roleEnabled, false);
  assert.equal(sw.expEnabled, true, "原设定必须保留（不清零）");
  assert.equal(sw.expEffective, false);
  const txt = buildInjectText(db);
  assert.ok(!txt.includes("手记 · 角色") && !txt.includes("角色/T4角色.md"), "角色段整段不注入");
});

ok("T4 硬规则：角色未启用时经验卡不可启用（显式报错，不静默改写）", () => {
  assert.throws(() => setSwitch(db, "exp", true), /角色功能未启用/);
});

ok("T4 恢复：重开角色 ⇒ 经验卡立即恢复生效（无需二次操作）", () => {
  setSwitch(db, "role", true);
  const sw = getSwitches(db);
  assert.deepEqual([sw.roleEnabled, sw.expEnabled, sw.expEffective], [true, true, true]);
  assert.ok(buildRoleReadText(db, getCardById(db, t4role.id)!).includes("T4经验A"), "重开后绑定立即回来");
});

ok("T4 关开关不毁数据：卡片与绑定都在", () => {
  setSwitch(db, "role", false); setSwitch(db, "role", true);
  assert.equal(listRoleExps(db, t4role.id).length, 2);
  assert.equal(listCards(db, "exp").length, 2);
  assert.equal(listCards(db, "role").length, 2);
});

ok("T4 经验卡进回收站 ⇒ 槽内留空引用（绑定不删），恢复即回来", () => {
  deleteCard(db, t4expB.id);
  const b = listRoleExps(db, t4role.id).find((x) => x.id === t4expB.id)!;
  assert.ok(b && b.deleted === true, "应标记为已删除");
  restoreCard(db, t4expB.id);
  assert.equal(listRoleExps(db, t4role.id).find((x) => x.id === t4expB.id)!.deleted, false);
});

ok("T4 彻底清除 ⇒ 绑定残留一并清理", () => {
  purgeCard(db, t4expB.id);
  assert.equal(listRoleExps(db, t4role.id).some((x) => x.id === t4expB.id), false);
});

// ── 20. T9/F13：keywords 坏数据必须显式告警（此前静默返回 []） ──
ok("F13 坏 keywords：不抛错、按空处理、且显式 warn", () => {
  const c = createCard(db, { name: "坏关键词卡T9", keywords: [], content: "x" });
  db.prepare(`UPDATE cards SET keywords = ? WHERE id = ?`).run("{不是 JSON", c.id);
  const warns: string[] = [];
  const orig = console.warn;
  console.warn = (...a: unknown[]) => { warns.push(a.map(String).join(" ")); };
  let back: ReturnType<typeof getCardById> = null;
  try { back = getCardById(db, c.id); } finally { console.warn = orig; }
  assert.deepEqual(back!.keywords, []);
  assert.ok(warns.some((w) => w.includes("keywords")), "坏数据必须显式告警（禁静默兜底）");
  purgeCard(db, c.id);
});

// 清理 T4 样本
for (const id of [t4role.id, t4role2.id, t4expA.id]) purgeCard(db, id);

console.log(`\n${process.exitCode ? "FAIL" : "PASS"} · ${passed} 项通过`);
nodeFs.rmSync(dir, { recursive: true, force: true });
