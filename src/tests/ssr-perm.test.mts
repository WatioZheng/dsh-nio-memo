/** SSR 冒烟：权限内页组件必须真的渲染出内容（防「点进去空白」类回归） */
import * as React from "react";
import { renderToString } from "react-dom/server";
import { PermBoard } from "../../client/index.tsx";

const levels: any[] = [
  { id: 11, name: "禁止", content: "不允许。需用户同意。", pos: 0, color: "red" },
  { id: 12, name: "允许", content: "可自行添加。", pos: 1, color: "blue" },
];

const html = renderToString(
  React.createElement(PermBoard as any, {
    kind: "card", id: 1,
    permEnabled: true, levels, currentLevelId: 11, currentLevelName: "禁止",
    busy: false,
    act: async () => null,
    onOpenLevelMenu: () => {},
    __testExpanded: true,   // 默认收起；测试强制展开以覆盖档位编辑区
  }),
);

const checks: Array<[string, boolean]> = [
  ["含权限板块标题", html.includes("权限板块")],
  ["含软约束提示", html.includes("软约束")],
  ["含调色板", html.includes("nm2-swatch")],
  ["含两档位名", html.includes("禁止") && html.includes("允许")],
  ["含档位输入框", html.includes("nm2-input")],
  ["含内测标识", html.includes("内测")],
];
let bad = 0;
for (const [k, v] of checks) { console.log(`${v ? "✓" : "✗"} ${k}`); if (!v) bad++; }
console.log(`SSR 长度 ${html.length}`);
process.exitCode = bad ? 1 : 0;
console.log(bad ? "FAIL" : "PASS · 权限板块 SSR 渲染正常");
