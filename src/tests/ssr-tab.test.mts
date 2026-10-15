/**
 * 整页 SSR 回归：把「手记」Tab 用假数据渲染一遍。
 * 目的：抓「删了字段/变量但模板里还引用」这类**运行时白屏**（阶段17 真发生过：data.permissions 残留）。
 */
import * as React from "react";
import { renderToString } from "react-dom/server";
import * as nodeFs from "node:fs";
import { fileURLToPath } from "node:url";
import { HandnoteTabView } from "../../client/index.tsx";

// T6：CSS 只在运行时注入（SSR 输出里没有 <style>），故 tab 栏口径从**源码**断言
const clientSrc = nodeFs.readFileSync(fileURLToPath(new URL("../../client/index.tsx", import.meta.url)), "utf8");
const tabsRule = clientSrc.match(/\.nm2-tabs\{[^}]*\}/)?.[0] ?? "";
const tabsBtnRule = clientSrc.match(/\.nm2-tabs button\{[^}]*\}/)?.[0] ?? "";

const permBits = (enabled: boolean, cur: string | null) => ({
  permEnabled: enabled,
  permLevels: [
    { id: 11, name: "禁止", content: "不允许", color: "red", pos: 0 },
    { id: 12, name: "允许", content: "允许", color: "blue", pos: 1 },
  ],
  permCurrentLevelId: cur === "禁止" ? 11 : cur === "允许" ? 12 : null,
  permCurrentLevelName: cur ?? "（无档位）",
});

const data: any = {
  ok: true,
  iron: [{ id: 10, title: "手记卡片维护", path: "规矩/铁律/手记卡片维护.md", content: "# 正文", origin: "default", ...permBits(true, "禁止") }],
  rules: [
    { id: 6, name: "禁止静默兜底", keywords: ["兜底"], path: "规矩/动态/禁止静默兜底.md", state: "rule", enabled: true, origin: "default", content: "x", deletedAt: null, tags: [], ...permBits(false, null) },
  ],
  memos: [
    { id: 37, name: "DSH重启方式", keywords: ["重启"], path: "备忘/DSH重启方式.md", state: "memo", enabled: true, origin: "default", content: "y", deletedAt: null, tags: [], ...permBits(true, "禁止") },
    { id: 38, name: "普通备忘卡", keywords: ["k"], path: "备忘/普通备忘卡.md", state: "memo", enabled: false, origin: "custom", content: "z", deletedAt: null, tags: [], ...permBits(false, null) },
  ],
  // T4：角色 / 经验卡 + 三级开关
  roles: [
    { id: 61, name: "主理角色", keywords: ["角色"], path: "角色/主理角色.md", state: "role", enabled: true, origin: "custom", content: "# 角色正文", deletedAt: null, tags: [], updatedAt: "2026-10-15T10:00:00.000Z", ...permBits(false, null) },
  ],
  exps: [
    { id: 62, name: "经验甲", keywords: ["甲"], path: "经验/经验甲.md", state: "exp", enabled: true, origin: "custom", content: "经验正文", deletedAt: null, tags: [], ...permBits(false, null) },
  ],
  switches: { roleEnabled: true, expEnabled: true, expEffective: true },
  tags: [{ id: 1, name: "默认", system: true, count: 2 }, { id: 3, name: "通用", system: false, count: 1 }],
  trashCount: 1,
};

/** 角色功能关闭 + 经验卡原设定仍为开（真值表第二/三态） */
const dataRoleOff: any = { ...data, switches: { roleEnabled: false, expEnabled: true, expEffective: false } };

const render = (props: any): string => {
  try { return renderToString(React.createElement(HandnoteTabView as any, props)); }
  catch (e) {
    console.error("✗ 渲染抛错（会表现为白屏）：", (e as Error)?.message);
    console.error((e as Error)?.stack?.split("\n").slice(0, 5).join("\n"));
    process.exit(1);
  }
};

let html = "";
html = render({ __testData: data, __testSub: "rules" });
html += render({ __testData: data, __testSub: "memo" });
html += render({ __testData: data, __testSub: "settings" });
// 轻提示（切档后「下一轮生效」）必须在面板里渲染出来（曾经用 position:fixed 会被祖先定位带偏 ⇒ 看不见）
html += render({ __testData: data, __testSub: "memo", __testToast: "已切到「禁止」 · 下一轮生效（agent 本轮看不到）" });

// ── T4：角色 / 经验卡 / 三级开关 的界面渲染 ──
const htmlRoles = render({ __testData: data, __testSub: "roles" });
const htmlCreate = render({ __testData: data, __testSub: "settings", __testPane: "create" });
const htmlAdvanced = render({ __testData: data, __testSub: "settings", __testPane: "advanced" });
const htmlAdvancedRoleOff = render({ __testData: dataRoleOff, __testSub: "settings", __testPane: "advanced" });
const htmlExp = render({ __testData: data, __testSub: "settings", __testPane: "exp" });
const htmlRoleDetail = render({
  __testData: data, __testSub: "roles",
  __testDetail: { kind: "card", item: data.roles[0] },
  __testSlot: [
    { id: 62, name: "经验甲", path: "经验/经验甲.md", enabled: true, deleted: false },
    { id: 99, name: "（已不存在 #99）", path: "", enabled: false, deleted: true },
  ],
});
const htmlRoleOff = render({ __testData: dataRoleOff, __testSub: "roles" });
const htmlExpOff = render({ __testData: dataRoleOff, __testSub: "settings", __testPane: "exp" });
// ⚠ 回归：**首帧 data 为 null**（真实路径要等 fetch 回来）——曾经这里抛 TypeError 导致整个 Tab 白屏，
//    而当时所有 SSR 断言都传了 __testData，所以一路绿。这条就是补那个盲区。
const htmlNoData = render({});
// ⚠ 回归：老数据没有 switches/roles/exps 字段（升级后第一次打开）⇒ 必须兜底为默认、不得抛错
const legacyData: any = { ok: true, iron: data.iron, rules: data.rules, memos: data.memos, tags: data.tags, trashCount: 0 };
const htmlLegacy = render({ __testData: legacyData, __testSub: "settings", __testPane: "advanced" });
const htmlLegacyRoles = render({ __testData: legacyData, __testSub: "rules" });

const checks: Array<[string, boolean]> = [
  ["顶部标题", html.includes("手记")],
  ["三个主 Tab", html.includes("规矩") && html.includes("备忘") && html.includes("设置")],
  ["铁律条目标题", html.includes("手记卡片维护")],
  ["动态规矩卡", html.includes("禁止静默兜底")],
  ["备忘卡", html.includes("DSH重启方式")],
  ["档位按钮（开权限卡显示当前档位名）", html.includes("禁止")],
  ["停用态卡片", html.includes("已停用")],
  ["切档轻提示可渲染", html.includes("nm2-toast") && html.includes("下一轮生效")],
  // T5：日期 + 操作按钮必须**在卡片内部底部**，且卡外底行彻底退役
  ["卡内底行已渲染（卡片/铁律各一次）", (html.match(/nm2-card-actions/g) ?? []).length >= 4],
  ["卡外底行已退役（无 nm2-entry-foot）", !html.includes("nm2-entry-foot")],
  ["底行确为卡片末子元素（在卡内底部）", /nm2-card-actions[\s\S]{0,900}?<\/div><\/div>/.test(html)],
  ["卡盒升到 with-acts 高度档", html.includes("nm2-card with-acts")],
  // ── T4：角色 / 经验卡 / 三级开关 ──
  ["T4 角色 tab 可见（角色功能开）", htmlRoles.includes("角色") && htmlRoles.includes("主理角色")],
  ["T4 角色页说明含「索引型 / 不参与互迁」", htmlRoles.includes("索引型") && htmlRoles.includes("不参与")],
  ["T4 创建页有类型下拉（默认备忘）", htmlCreate.includes("<select") && htmlCreate.includes('value="memo"') && htmlCreate.includes("规矩（动态）")],
  ["T4 创建下拉含角色/经验卡选项", htmlCreate.includes('value="role"') && htmlCreate.includes('value="exp"')],
  ["T4 高级页只放两个开关", htmlAdvanced.includes("高级") && htmlAdvanced.includes("角色功能") && htmlAdvanced.includes("经验卡")],
  ["T4 经验卡管理区可见", htmlExp.includes("经验卡") && htmlExp.includes("经验甲")],
  ["T4 角色功能关 ⇒ 角色 tab 隐藏（页面回落规矩页）", !htmlRoleOff.includes("主理角色")],
  ["T4 角色功能关 ⇒ 高级页提示经验卡不可启用", htmlAdvancedRoleOff.includes("不可启用")],
  ["T4 经验卡关 ⇒ 管理区显示未生效提示", htmlExpOff.includes("未生效")],
  // 角色内页「经验槽」
  ["T4 角色内页有「经验槽」板块", htmlRoleDetail.includes("经验槽")],
  ["T4 经验槽列出已绑经验卡（仅索引）", htmlRoleDetail.includes("经验甲") && htmlRoleDetail.includes("经验/经验甲.md")],
  ["T4 经验槽对已删经验卡显示空引用", htmlRoleDetail.includes("空引用")],
  ["T4 经验槽有可绑定挑选区", htmlRoleDetail.includes("可绑定的经验卡")],
  ["T4 角色内页不出现「升/降」按钮", !htmlRoleDetail.includes("立为规矩") && !htmlRoleDetail.includes("降为备忘")],
  // ── 回归：白屏 / 老数据 两条盲区 ──
  ["首帧无数据不白屏（data=null 守卫）", htmlNoData.includes("加载中")],
  ["老数据无 switches 字段 ⇒ 兜底默认（不抛错）", htmlLegacy.includes("角色功能") && htmlLegacy.includes("经验卡")],
  ["老数据无 roles/exps ⇒ 规矩页正常渲染", htmlLegacyRoles.includes("手记卡片维护") && !htmlLegacyRoles.includes("主理角色")],
  // ── T6：tab 栏不换行 + 横向滚动（修中文被压成竖排） ──
  ["T6 按钮不压缩（flex:0 0 auto）", tabsBtnRule.includes("flex:0 0 auto")],
  ["T6 按钮文字不换行（white-space:nowrap）", tabsBtnRule.includes("white-space:nowrap")],
  ["T6 tab 栏不折行 + 可横滑", tabsRule.includes("flex-wrap:nowrap") && tabsRule.includes("overflow-x:auto")],
];
let bad = 0;
for (const [k, v] of checks) { console.log(`${v ? "✓" : "✗"} ${k}`); if (!v) bad++; }
console.log(`SSR 长度 ${html.length}`);
console.log(bad ? "FAIL" : "PASS · 手记 Tab 整页渲染正常");
process.exitCode = bad ? 1 : 0;
