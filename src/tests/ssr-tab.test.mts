/**
 * 整页 SSR 回归：把「手记」Tab 用假数据渲染一遍。
 * 目的：抓「删了字段/变量但模板里还引用」这类**运行时白屏**（阶段17 真发生过：data.permissions 残留）。
 */
import * as React from "react";
import { renderToString } from "react-dom/server";
import { HandnoteTabView } from "../../client/index.tsx";

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
  tags: [{ id: 1, name: "默认", system: true, count: 2 }, { id: 3, name: "通用", system: false, count: 1 }],
  trashCount: 1,
};

let html = "";
try {
  html = renderToString(React.createElement(HandnoteTabView as any, { __testData: data, __testSub: "rules" }));
  html += renderToString(React.createElement(HandnoteTabView as any, { __testData: data, __testSub: "memo" }));
  html += renderToString(React.createElement(HandnoteTabView as any, { __testData: data, __testSub: "settings" }));
} catch (e) {
  console.error("✗ 渲染抛错（会表现为白屏）：", (e as Error)?.message);
  console.error((e as Error)?.stack?.split("\n").slice(0, 5).join("\n"));
  process.exit(1);
}

const checks: Array<[string, boolean]> = [
  ["顶部标题", html.includes("手记")],
  ["三个主 Tab", html.includes("规矩") && html.includes("备忘") && html.includes("设置")],
  ["铁律条目标题", html.includes("手记卡片维护")],
  ["动态规矩卡", html.includes("禁止静默兜底")],
  ["备忘卡", html.includes("DSH重启方式")],
  ["档位按钮（开权限卡显示当前档位名）", html.includes("禁止")],
  ["停用态卡片", html.includes("已停用")],
];
let bad = 0;
for (const [k, v] of checks) { console.log(`${v ? "✓" : "✗"} ${k}`); if (!v) bad++; }
console.log(`SSR 长度 ${html.length}`);
console.log(bad ? "FAIL" : "PASS · 手记 Tab 整页渲染正常");
process.exitCode = bad ? 1 : 0;
