window.__ModuleLoader__.load({ id: "dsh-nio-memo", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// client/index.tsx
var index_exports = {};
__export(index_exports, {
  HandnoteTabView: () => HandnoteTabView,
  PermBoard: () => PermBoard,
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);
var import_react = require("react");

// client/md.ts
var LIST_RE = /^\s*([-*]|\d+\.)\s+/;
var HEAD_RE = /^(#{1,4})\s+(.*)$/;
function isBlockStart(line) {
  return HEAD_RE.test(line) || /^```/.test(line) || /^---+\s*$/.test(line) || /^>\s?/.test(line) || /^\s*\|/.test(line) || LIST_RE.test(line);
}
function inlineTokens(text) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m;
  while (m = re.exec(text)) {
    if (m.index > last) out.push({ type: "text", text: text.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith("**")) out.push({ type: "bold", text: tok.slice(2, -2) });
    else if (tok.startsWith("`")) out.push({ type: "code", text: tok.slice(1, -1) });
    else {
      const mm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok);
      if (mm) out.push({ type: "link", text: mm[1], href: mm[2] });
      else out.push({ type: "text", text: tok });
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out;
}
function splitRow(line) {
  const t = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return t.split("|").map((s) => s.trim());
}
var TABLE_SEP_RE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
function parseMd(src) {
  const lines = String(src ?? "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const buf2 = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf2.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ type: "code", text: buf2.join("\n") });
      continue;
    }
    const h = HEAD_RE.exec(line);
    if (h) {
      blocks.push({ type: "h", level: h[1].length, text: h[2] });
      i += 1;
      continue;
    }
    if (/^---+\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }
    if (/^\s*\|/.test(line) && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1])) {
      const head = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: "table", head, rows });
      continue;
    }
    if (/^>\s?/.test(line)) {
      const buf2 = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf2.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "quote", text: buf2.join(" ") });
      continue;
    }
    if (LIST_RE.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items = [];
      while (i < lines.length && LIST_RE.test(lines[i])) {
        items.push(lines[i].replace(LIST_RE, ""));
        i += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }
    if (!line.trim()) {
      i += 1;
      continue;
    }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      buf.push(lines[i]);
      i += 1;
    }
    if (!buf.length) {
      buf.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: "p", text: buf.join(" ") });
  }
  return blocks;
}

// client/index.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var name = "dsh-nio-memo";
var inject = ["slots"];
var LEVEL_COLORS = [
  { key: "black", label: "\u9ED1", hex: "#111827" },
  { key: "white", label: "\u767D", hex: "#ffffff" },
  { key: "gray", label: "\u7070", hex: "#8b8d98" },
  { key: "red", label: "\u8D64", hex: "#dc2626" },
  { key: "orange", label: "\u6A59", hex: "#ea580c" },
  { key: "yellow", label: "\u9EC4", hex: "#eab308" },
  { key: "green", label: "\u7EFF", hex: "#16a34a" },
  { key: "cyan", label: "\u9752", hex: "#0891b2" },
  { key: "blue", label: "\u84DD", hex: "#2563eb" },
  { key: "purple", label: "\u7D2B", hex: "#7c3aed" }
];
var colorHex = (key) => LEVEL_COLORS.find((c) => c.key === key)?.hex ?? "#8b8d98";
function Dot({ color }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nm2-dot", style: { background: colorHex(color) } });
}
function Swatches({ value, onPick }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-swatches", children: LEVEL_COLORS.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "span",
    {
      className: `nm2-swatch${value === c.key ? " on" : ""}`,
      style: { background: c.hex },
      title: c.label,
      onClick: () => onPick(c.key)
    },
    c.key
  )) });
}
var STATE_LABEL = { memo: "\u5907\u5FD8", rule: "\u52A8\u6001\u89C4\u77E9", role: "\u89D2\u8272", exp: "\u7ECF\u9A8C\u5361" };
var isIndexOnly = (s) => s === "role" || s === "exp";
var DEFAULT_SWITCHES = { roleEnabled: true, expEnabled: true, expEffective: true };
async function getJson(path) {
  const resp = await fetch(path, { cache: "no-store" });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}
async function postJson(path, body) {
  const resp = await fetch(path, {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}
var css = `
.nm2-panel{display:flex;flex-direction:column;flex:1;min-height:0;height:100%;box-sizing:border-box;overflow:hidden;font-family:var(--dsw-font-family,system-ui,sans-serif);color:var(--dsw-alias-label-primary,inherit)}
.nm2-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 16px 10px;border-bottom:1px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.18));box-sizing:border-box;flex-shrink:0}
.nm2-head-title{font-size:15px;font-weight:700;letter-spacing:.06em}
/* Tab \u680F\uFF1A**\u4E0D\u6362\u884C + \u6A2A\u5411\u6EDA\u52A8**\uFF08T6\uFF09
   \u539F\u5148\u6309\u94AE\u65E0 nowrap \u4E14\u9ED8\u8BA4\u53EF\u538B\u7F29 \u21D2 \u884C\u5BBD\u4E0D\u591F\u65F6\u6309\u94AE\u88AB\u538B\u6241\u3001\u4E2D\u6587\u9010\u5B57\u7AD6\u6392\uFF08"\u89C4/\u77E9 1/2"\uFF09\u3002
   \u73B0\u5728\uFF1A\u6309\u94AE\u4E0D\u538B\u7F29\uFF08flex:0 0 auto\uFF09\u3001\u6587\u5B57\u4E0D\u6362\u884C\uFF08nowrap\uFF09\uFF0C\u653E\u4E0D\u4E0B\u5C31\u8BA9**\u6574\u4E2A tab \u680F\u6A2A\u6ED1**\u3002
   padding-bottom \u7ED9\u300C\u9009\u4E2D\u6001\u300D\u7684 box-shadow \u7559\u51FA\u4E0D\u88AB overflow \u88C1\u6389\u7684\u4F59\u91CF\uFF1B\u6EDA\u52A8\u6761\u505A\u7EC6\u3002 */
.nm2-tabs{display:flex;gap:8px;flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;padding-bottom:6px;scrollbar-width:thin;-webkit-overflow-scrolling:touch}
.nm2-tabs::-webkit-scrollbar{height:6px}
.nm2-tabs::-webkit-scrollbar-thumb{background:rgba(128,128,128,.35);border-radius:3px}
.nm2-tabs::-webkit-scrollbar-track{background:transparent}
.nm2-tabs button{display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:999px;border:1px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.22));background:transparent;color:var(--dsw-alias-label-secondary,#6b6f76);font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:background .12s,color .12s,border-color .12s;white-space:nowrap;flex:0 0 auto}
.nm2-tabs button:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.12))}
.nm2-tabs button.on{background:var(--dsw-alias-state-business-primary,#2563eb);border-color:transparent;color:#fff;box-shadow:0 2px 8px rgba(37,99,235,.28)}
.nm2-tabs button b{font-size:11px;font-weight:600;opacity:.75}
/* \u5185\u5BB9\u533A\uFF1A\u81EA\u8EAB\u6EDA\u52A8\uFF08\u9762\u677F\u7EA7\uFF0C\u957F\u5361\u4E5F\u4E0D\u88AB\u88C1\uFF09 */
.nm2-main{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;padding:14px 16px;display:flex;flex-direction:column;gap:10px;box-sizing:border-box}
.nm2-help{font-size:12px;line-height:1.65;color:var(--dsw-alias-label-secondary,#6b6f76);background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.08));border-radius:8px;padding:8px 12px;flex-shrink:0}
.nm2-help b{color:var(--dsw-alias-label-primary,inherit)}
.nm2-sec{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#6b6f76);margin-top:4px;flex-shrink:0;display:flex;align-items:center;gap:6px}
.nm2-sec small{font-weight:400;color:var(--dsw-alias-label-tertiary,#8b8d98);margin-left:6px}
.nm2-sec i{width:8px;height:8px;border-radius:2px;display:inline-block}
/* \u5361\u7247\u7F51\u683C\uFF1A\u6309**\u5BB9\u5668\u53EF\u7528\u5BBD\u5EA6**\u81EA\u9002\u5E94\uFF08\u4E0D\u518D\u7528 @media \u8BA4\u89C6\u53E3\u5BBD\u5EA6\uFF09
   - auto-fill + minmax(190px,1fr)\uFF1A\u591F\u5BBD\u5C31\u591A\u653E\u3001\u53D8\u7A84\u81EA\u52A8\u51CF\u5217\uFF0C\u5361\u7247\u6C38\u4E0D\u88AB\u538B\u6241
   - max-width 990px \u2248 5\xD7(190+8)\uFF1A\u5BBD\u5C4F\u4E0B**\u6700\u591A 5 \u5217**\uFF08\u6CBF\u7528\u7528\u6237\u53E3\u5F84\uFF09\uFF0C\u518D\u5BBD\u4E5F\u4E0D\u786C\u62C9 */
.nm2-grid{display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));max-width:990px}
.nm2-card{border:1px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.22));background:var(--dsw-alias-bg-secondary,transparent);border-radius:10px;padding:10px 12px;font-size:12px;display:flex;flex-direction:column;gap:6px;box-sizing:border-box;cursor:pointer;transition:border-color .12s ease,box-shadow .12s ease,transform .12s ease;flex:0 0 auto;height:112px;overflow:hidden}
/* T5\uFF1A\u5185\u5E95\u884C\u7684\u5361\u9700\u8981\u66F4\u9AD8\u76D2\u5B50\uFF08112 \u585E\u4E0D\u4E0B\u300C\u5185\u5BB9 3 \u884C + \u65E5\u671F\u884C + \u6309\u94AE\u884C\u300D\uFF09 */
.nm2-card.with-acts{height:148px}
.nm2-card:hover{border-color:var(--dsw-alias-state-business-primary,#2563eb);box-shadow:0 3px 12px rgba(0,0,0,.10);transform:translateY(-1px)}
.nm2-card.off{opacity:.55}
.nm2-card.dflt{border-left:3px solid rgba(37,99,235,.45)}
.nm2-card.cstm{border-left:3px solid rgba(22,163,74,.5)}
.nm2-card-head{display:flex;align-items:flex-start;gap:6px;flex-wrap:wrap}
/* \u6807\u9898\u6C38\u8FDC\u72EC\u5360\u6574\u884C\uFF1Aflex-basis:100% \u4FDD\u8BC1\u4E0D\u88AB\u53F3\u4FA7\u6807\u7B7E\u6324\u6210\u7AD6\u6392\u4E00\u5B57\u4E00\u884C */
.nm2-card-name.one-line{white-space:nowrap;text-overflow:ellipsis;overflow:hidden;display:block;height:16px}
.nm2-card-name{font-weight:600;flex:0 0 auto;min-width:0;font-size:12px;line-height:16px;max-height:32px;overflow-wrap:break-word;word-break:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.nm2-card-foot{display:flex;flex-wrap:nowrap;gap:4px;align-items:center;height:18px;overflow:hidden;white-space:nowrap}
.nm2-kw{font-size:11px;color:var(--dsw-alias-label-secondary,#6b6f76);display:flex;gap:4px;flex-wrap:wrap;max-height:32px;line-height:14px;overflow:hidden;align-content:flex-start;flex:0 0 auto}
.nm2-kw span{line-height:14px}
.nm2-kw span{padding:1px 6px;border-radius:4px;background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.12))}
.nm2-path{font-size:10.5px;color:var(--dsw-alias-label-tertiary,#8b8d98);font-family:ui-monospace,monospace;word-break:break-all;line-height:15px;height:30px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.nm2-acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:auto;padding-top:2px}
/* \u5185\u9875/\u8BBE\u7F6E/\u6807\u7B7E\u8BE6\u60C5\u91CC\u7684\u6309\u94AE\u884C\uFF1A\u4E0D\u8D34\u5E95\u3001\u4E0D\u63A8\u6324\u540E\u9762\u7684\u5185\u5BB9 */
.nm2-detail-acts{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
/* \u5361\u7247\u5916\u5BB9\u5668\uFF1A\u76D2\u5B50\u5185\u5DF2\u542B\u5E95\u90E8\u4FE1\u606F\u884C\uFF08T5 \u8D77\uFF09\uFF0C\u5BB9\u5668\u4EC5\u8D1F\u8D23\u7F51\u683C\u5B9A\u4F4D */
.nm2-entry{display:flex;flex-direction:column;gap:4px;min-width:0;height:100%}
/* \u5361\u5185\u5E95\u90E8\u884C\uFF08T5\uFF09\uFF1A\u65E5\u671F + \u6309\u94AE\uFF0C**\u7EB5\u5411\u5806\u53E0**\uFF08\u4E0E\u539F\u5148\u5361\u5916\u6392\u5E03\u540C\u6B3E\uFF0C\u53EA\u662F\u6536\u8FDB\u76D2\u5185\uFF09
   \u4E3A\u4F55\u4E0D\u5E76\u6392\uFF1A\u6700\u7A84\u5217 190px \u65F6\u53EF\u7528\u4EC5 162px\uFF0C\u800C\u300C3 \u6309\u94AE 125px + \u5B8C\u6574\u65E5\u671F 60px\u300D= 191px \u21D2 \u65E5\u671F\u5FC5\u88AB\u7701\u7565\u53F7\u622A\u65AD\uFF08\u5B9E\u6D4B\u7F3A\u53E3 29px\uFF09\u3002
   \u7EB5\u6392\u5219\u4EFB\u4F55\u5BBD\u5EA6\u90FD\u4E0D\u622A\u65AD\u3001\u6309\u94AE\u4E0D\u88AB\u538B\u6241\uFF1B\u5361\u9AD8 112\u2192148 \u4E0E\u539F\u5148\u300C\u5361 112 + \u5361\u5916 36\u300D\u7684\u603B\u5360\u7528\u6301\u5E73\uFF0C\u4E0D\u989D\u5916\u5360\u7248\u9762\u3002 */
.nm2-card-actions{display:flex;flex-direction:column;align-items:flex-start;gap:3px;margin-top:auto;padding-top:5px;border-top:1px dashed var(--dsw-alias-border-subtle,rgba(128,128,128,.28));min-width:0;box-sizing:border-box}
.nm2-meta{font-size:10px;line-height:1.3;color:var(--dsw-alias-label-tertiary,#8b8d98);font-family:ui-monospace,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nm2-foot-acts{display:flex;gap:4px;flex-shrink:0}
.nm2-btn.small{height:20px;padding:0 8px;font-size:10.5px}
/* \u300C\u66F4\u591A\u300D\u60AC\u6D6E\u83DC\u5355\uFF08\u591A\u884C\u9009\u9879\uFF09 */
.nm2-toast{order:99;flex:0 0 auto;background:rgba(24,24,27,.94);color:#fff;font-size:12px;line-height:1.6;padding:8px 14px;border-radius:9px;margin-top:2px;box-shadow:0 6px 20px rgba(0,0,0,.22);text-align:center;border:1px solid rgba(255,255,255,.12)}
.nm2-tip{background:rgba(234,88,12,.13);border:1px solid rgba(234,88,12,.35);border-left-width:3px;border-radius:8px;padding:8px 12px;font-size:12px;line-height:1.7;color:var(--dsw-alias-label-primary,#3f4149)}
.nm2-permsec{display:flex;flex-direction:column;gap:8px;margin-top:8px;padding-top:10px;border-top:1px dashed var(--dsw-alias-border-subtle,rgba(128,128,128,.35))}
.nm2-menu-mask{position:fixed;inset:0;z-index:9998;background:transparent}
.nm2-menu{position:fixed;z-index:9999;min-width:132px;background:var(--dsw-alias-bg-base,#fff);border:1px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.28));border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.18);padding:4px;display:flex;flex-direction:column;gap:2px}
.nm2-menu button{text-align:left;border:none;background:transparent;padding:7px 10px;border-radius:6px;font:inherit;font-size:12px;color:var(--dsw-alias-label-primary,inherit);cursor:pointer;white-space:nowrap}
.nm2-menu button:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.14))}
.nm2-menu button.danger{color:var(--dsw-static-red-11,#c62a2f)}
/* \u6863\u4F4D\u989C\u8272\u70B9 + \u8C03\u8272\u677F */
.nm2-dot{width:10px;height:10px;border-radius:50%;display:inline-block;border:1px solid rgba(0,0,0,.18);flex-shrink:0;vertical-align:middle}
.nm2-swatches{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.nm2-swatch{width:18px;height:18px;border-radius:50%;cursor:pointer;border:2px solid transparent;box-sizing:border-box}
.nm2-swatch.on{border-color:var(--dsw-alias-state-business-primary,#2563eb)}
/* \u7CFB\u7EDF\u6807\u7B7E\u5361\uFF1A\u7070\u8272\u3001\u4E0D\u53EF\u70B9 */
.nm2-card.sys{opacity:.6;cursor:default}
.nm2-card.sys:hover{border-color:var(--dsw-alias-border-subtle,rgba(128,128,128,.22));box-shadow:none;transform:none}
.nm2-btn{height:24px;padding:0 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.22));background:transparent;color:var(--dsw-alias-label-secondary,#6b6f76);font:inherit;font-size:11px;cursor:pointer;white-space:nowrap}
.nm2-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.12))}
.nm2-btn.primary{color:var(--dsw-alias-state-business-primary,#2563eb);border-color:currentColor}
.nm2-btn.danger{color:var(--dsw-static-red-11,#c62a2f);border-color:currentColor}
.nm2-btn:disabled{opacity:.5;cursor:default}
.nm2-tag{font-size:10px;padding:1px 6px;border-radius:999px;background:rgba(128,128,128,.14);color:var(--dsw-alias-label-tertiary,#8b8d98);flex-shrink:0;white-space:nowrap}
.nm2-tag.lock{background:rgba(198,42,47,.12);color:var(--dsw-static-red-11,#c62a2f)}
.nm2-tag.rule{background:rgba(37,99,235,.12);color:var(--dsw-alias-state-business-primary,#2563eb)}
.nm2-tag.role{background:rgba(124,58,237,.14);color:#6d28d9}
.nm2-tag.exp{background:rgba(8,145,178,.14);color:#0e7490}
.nm2-tag.origin-default{background:rgba(37,99,235,.10);color:var(--dsw-alias-state-business-primary,#2563eb)}
.nm2-tag.origin-custom{background:rgba(22,163,74,.14);color:#15803d}
.nm2-beta{font-size:9px;font-weight:600;margin-left:4px;padding:0 4px;border-radius:4px;background:rgba(234,88,12,.16);color:#c2410c;vertical-align:1px}
.nm2-tag.user{background:rgba(16,185,129,.14);color:#0f8a63}
.nm2-err{font-size:12px;color:var(--dsw-static-red-11,#c62a2f)}
.nm2-warn{font-size:11.5px;line-height:1.6;color:#a06000;background:rgba(255,176,32,.12);border-radius:8px;padding:7px 10px}
.nm2-empty{font-size:12px;color:var(--dsw-alias-label-tertiary,#8b8d98);padding:8px 2px}
.nm2-back{align-self:flex-start;height:28px;padding:0 12px;border-radius:8px;border:1px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.22));background:transparent;color:var(--dsw-alias-label-secondary,#6b6f76);font:inherit;font-size:12px;cursor:pointer}
.nm2-doc-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.nm2-doc-head h3{margin:0;font-size:15px;overflow-wrap:anywhere}
.nm2-doc{border:1px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.22));border-radius:10px;padding:14px 18px;font-size:13px;line-height:1.7;overflow-wrap:anywhere}
.nm2-doc h1{font-size:16px;margin:10px 0 8px}
.nm2-doc h2{font-size:14px;margin:10px 0 6px}
.nm2-doc h3{font-size:13px;margin:8px 0 6px}
.nm2-doc p{margin:6px 0}
.nm2-doc ul,.nm2-doc ol{margin:6px 0;padding-left:22px}
.nm2-doc li{margin:3px 0}
.nm2-doc blockquote{margin:6px 0;padding:4px 10px;border-left:3px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.35));color:var(--dsw-alias-label-secondary,#6b6f76)}
.nm2-doc code{font-family:ui-monospace,monospace;font-size:12px;background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.12));padding:1px 4px;border-radius:4px}
.nm2-doc pre{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.1));padding:8px 10px;border-radius:8px;overflow:auto;margin:8px 0}
.nm2-doc pre code{background:transparent;padding:0}
.nm2-doc hr{border:none;border-top:1px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.22));margin:10px 0}
.nm2-doc table{border-collapse:collapse;margin:8px 0;font-size:12.5px}
.nm2-doc th,.nm2-doc td{border:1px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.28));padding:4px 8px;text-align:left;vertical-align:top}
.nm2-doc th{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.1))}
.nm2-form{display:flex;flex-direction:column;gap:8px;max-width:760px}
.nm2-label{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#6b6f76)}
.nm2-input,.nm2-textarea,.nm2-select{width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.28));border-radius:8px;background:var(--dsw-alias-bg-base,transparent);color:var(--dsw-alias-label-primary,inherit);font:inherit;font-size:13px;outline:none}
.nm2-input:focus,.nm2-textarea:focus{border-color:var(--dsw-alias-state-business-primary,#2563eb)}
.nm2-textarea{min-height:180px;line-height:1.6;resize:vertical;font-family:ui-monospace,monospace;font-size:12.5px}
.nm2-form-acts{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
/* \u5F39\u7A97\uFF08\u6253\u6807\uFF09 */
.nm2-mask{position:fixed;inset:0;background:rgba(0,0,0,.42);z-index:9999;display:flex;align-items:center;justify-content:center}
.nm2-modal{background:var(--dsw-alias-bg-base,#fff);border:1px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.22));border-radius:12px;width:min(440px,92vw);max-height:80vh;display:flex;flex-direction:column;box-shadow:0 8px 40px rgba(0,0,0,.25)}
.nm2-modal-head{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.12))}
.nm2-modal-head b{flex:1;font-size:14px}
.nm2-modal-body{padding:12px 16px;overflow:auto;display:flex;flex-direction:column;gap:8px}
.nm2-modal-foot{display:flex;gap:8px;padding:10px 16px;border-top:1px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.12))}
.nm2-check{display:flex;align-items:center;gap:8px;font-size:13px}
`;
var cssInjected = false;
function injectCss() {
  if (cssInjected || typeof document === "undefined") return;
  cssInjected = true;
  const st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);
}
function Inline({ text, k }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: inlineTokens(text).map((t, i) => {
    const key = `${k}-${i}`;
    if (t.type === "bold") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: t.text }, key);
    if (t.type === "code") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: t.text }, key);
    if (t.type === "link") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { href: t.href, target: "_blank", rel: "noreferrer", children: t.text }, key);
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t.text }, key);
  }) });
}
function renderMd(src) {
  const blocks = parseMd(src);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-doc", children: blocks.map((b, i) => {
    const k = `b${i}`;
    if (b.type === "h") {
      const inner = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inline, { text: b.text, k });
      return b.level <= 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: inner }, k) : b.level === 2 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: inner }, k) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: inner }, k);
    }
    if (b.type === "p") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inline, { text: b.text, k }) }, k);
    if (b.type === "quote") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("blockquote", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inline, { text: b.text, k }) }, k);
    if (b.type === "code") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: b.text }) }, k);
    if (b.type === "hr") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("hr", {}, k);
    if (b.type === "list") {
      const kids = b.items.map((it, j) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inline, { text: it, k: `${k}-${j}` }) }, `${k}-${j}`));
      return b.ordered ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", { children: kids }, k) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: kids }, k);
    }
    if (b.type === "table") {
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: b.head.map((h, j) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inline, { text: h, k: `${k}h${j}` }) }, j)) }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: b.rows.map((r, ri) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: r.map((c, ci) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inline, { text: c, k: `${k}r${ri}c${ci}` }) }, ci)) }, ri)) })
      ] }, k);
    }
    return null;
  }) });
}
function OriginTag({ origin }) {
  return origin === "default" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nm2-tag origin-default", children: "\u9ED8\u8BA4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nm2-tag origin-custom", children: "\u81EA\u5B9A\u4E49" });
}
function TagsRow({ tags }) {
  if (!tags.length) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-kw", children: tags.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nm2-tag user", children: t.name }, t.id)) });
}
function fmtDate(iso) {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function fmtVersion(v) {
  return `v${v && v > 0 ? v : 1}.0`;
}
function fmtTime(iso) {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function Card({ card, onOpen, onToggle, onMenu, onLevel, busy }) {
  const isRule = card.state === "rule";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-entry", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `nm2-card with-acts ${card.origin === "default" ? "dflt" : "cstm"}${card.enabled ? "" : " off"}`, onClick: onOpen, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-card-name one-line", children: card.name }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-kw", children: card.keywords.length ? card.keywords.map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: w }, w)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\uFF08\u65E0\u5173\u952E\u8BCD\uFF09" }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-card-foot", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OriginTag, { origin: card.origin }),
      card.state === "rule" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nm2-tag rule", children: "\u52A8\u6001\u89C4\u77E9" }) : null,
      card.state === "role" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nm2-tag role", children: "\u89D2\u8272" }) : null,
      card.state === "exp" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nm2-tag exp", children: "\u7ECF\u9A8C\u5361" }) : null,
      card.enabled ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nm2-tag", children: "\u5DF2\u505C\u7528" }),
      card.tags.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nm2-tag user", children: t.name }, t.id))
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-card-actions", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nm2-meta", title: `\u4FEE\u6539\u4E8E ${fmtTime(card.updatedAt)}`, children: fmtDate(card.updatedAt) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "nm2-foot-acts", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "nm2-btn small", disabled: busy, onClick: (e) => {
          e.stopPropagation();
          onToggle();
        }, children: card.enabled ? "\u505C\u7528" : "\u542F\u7528" }),
        card.permEnabled && card.permCurrentLevelId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            className: "nm2-btn small",
            disabled: busy,
            style: { color: colorHex(card.permLevels.find((l) => l.id === card.permCurrentLevelId)?.color ?? "gray") },
            onClick: (e) => {
              e.stopPropagation();
              onLevel(e.currentTarget);
            },
            children: card.permCurrentLevelName
          }
        ) : null,
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            className: "nm2-btn small",
            disabled: busy,
            onClick: (e) => {
              e.stopPropagation();
              onMenu(e.currentTarget);
            },
            children: "\u66F4\u591A"
          }
        )
      ] })
    ] })
  ] }) });
}
function CardGroup({ cards, title, hint, busy, onOpen, onToggle, onMenu, onLevel }) {
  if (!cards.length) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-sec", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { style: { background: title.includes("\u9ED8\u8BA4") ? "rgba(37,99,235,.5)" : "rgba(22,163,74,.5)" } }),
      title,
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
        cards.length,
        " \u5F20",
        hint ? ` \xB7 ${hint}` : ""
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-grid", children: cards.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      Card,
      {
        card: c,
        busy,
        onOpen: () => onOpen(c),
        onToggle: () => onToggle(c),
        onMenu: (el) => onMenu(c, el),
        onLevel: (el) => onLevel(c, el)
      },
      c.id
    )) })
  ] });
}
function PermBoard({ kind, id, permEnabled, levels, currentLevelId, currentLevelName, lockedNote, busy, act, onOpenLevelMenu, onFlash, __testExpanded }) {
  const [draft, setDraft] = (0, import_react.useState)({});
  const [nv, setNv] = (0, import_react.useState)({ name: "", content: "", color: "gray" });
  const [expanded, setExpanded] = (0, import_react.useState)(!!__testExpanded);
  const d = (l) => draft[l.id] ?? { name: l.name, content: l.content, color: l.color };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-permsec", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-form-acts", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "nm2-label", children: [
        "\u6743\u9650\u677F\u5757",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { className: "nm2-beta", children: "\u5185\u6D4B" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nm2-meta", children: "\u8F6F\u7EA6\u675F\uFF1A\u5199\u8FDB\u63D0\u793A\u8BCD\uFF0C\u4E0D\u4FDD\u8BC1 agent \u4E00\u5B9A\u9075\u5B88" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          className: `nm2-btn ${permEnabled ? "primary" : ""}`,
          disabled: busy,
          onClick: () => void act(
            "/nio-memo/api/perm/enable",
            { kind, id, enabled: !permEnabled },
            permEnabled ? "\u6743\u9650\u677F\u5757\u5DF2\u5173\u95ED" : "\u6743\u9650\u677F\u5757\u5DF2\u5F00\u542F\uFF08\u9ED8\u8BA4\u6863\uFF1A\u7981\u6B62\uFF09"
          ),
          children: permEnabled ? "\u5DF2\u5F00\u542F" : "\u5DF2\u5173\u95ED"
        }
      ),
      permEnabled && currentLevelId ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "nm2-btn", disabled: busy, onClick: (e) => onOpenLevelMenu(e.currentTarget), children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dot, { color: levels.find((l) => l.id === currentLevelId)?.color ?? "gray" }),
        " ",
        currentLevelName
      ] }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "nm2-btn", disabled: busy, onClick: () => setExpanded(!expanded), children: expanded ? "\u6536\u8D77" : "\u5C55\u5F00" }),
      lockedNote ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nm2-meta", children: lockedNote }) : null
    ] }),
    expanded ? permEnabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      levels.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-form", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-form-acts", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dot, { color: d(l).color }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              className: "nm2-input",
              style: { maxWidth: 240 },
              value: d(l).name,
              onChange: (e) => setDraft({ ...draft, [l.id]: { ...d(l), name: e.target.value } })
            }
          ),
          l.id === currentLevelId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nm2-tag rule", children: "\u5F53\u524D\u6863\u4F4D" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              className: "nm2-btn primary",
              disabled: busy,
              onClick: () => void act("/nio-memo/api/perm/current", { kind, id, levelId: l.id }).then((r) => {
                if (r) onFlash?.(`\u5DF2\u5207\u5230\u300C${l.name}\u300D \xB7 \u4E0B\u4E00\u8F6E\u751F\u6548\uFF08agent \u672C\u8F6E\u770B\u4E0D\u5230\uFF09`);
              }),
              children: "\u8BBE\u4E3A\u5F53\u524D"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              className: "nm2-btn",
              disabled: busy,
              onClick: () => void act("/nio-memo/api/perm/level/update", { levelId: l.id, name: d(l).name, content: d(l).content, color: d(l).color }, "\u6863\u4F4D\u5DF2\u4FDD\u5B58"),
              children: "\u4FDD\u5B58\u6863\u4F4D"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              className: "nm2-btn danger",
              disabled: busy,
              onClick: () => {
                if (!window.confirm(`\u5220\u9664\u6863\u4F4D\u300C${l.name}\u300D\uFF1F`)) return;
                void act("/nio-memo/api/perm/level/delete", { levelId: l.id }, "\u6863\u4F4D\u5DF2\u5220\u9664");
              },
              children: "\u5220\u9664\u6863\u4F4D"
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Swatches, { value: d(l).color, onPick: (k) => setDraft({ ...draft, [l.id]: { ...d(l), color: k } }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "textarea",
          {
            className: "nm2-textarea",
            style: { minHeight: 80 },
            value: d(l).content,
            onChange: (e) => setDraft({ ...draft, [l.id]: { ...d(l), content: e.target.value } })
          }
        )
      ] }, l.id)),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-form", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-label", children: "\u65B0\u589E\u6863\u4F4D" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            className: "nm2-input",
            style: { maxWidth: 240 },
            placeholder: "\u6863\u4F4D\u540D\uFF0C\u5982\uFF1A\u4EC5\u9650\u672C\u4F1A\u8BDD",
            value: nv.name,
            onChange: (e) => setNv({ ...nv, name: e.target.value })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Swatches, { value: nv.color, onPick: (k) => setNv({ ...nv, color: k }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "textarea",
          {
            className: "nm2-textarea",
            style: { minHeight: 70 },
            placeholder: "\u8BE5\u6863\u4F4D\u7684\u8BF4\u660E",
            value: nv.content,
            onChange: (e) => setNv({ ...nv, content: e.target.value })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-form-acts", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            className: "nm2-btn primary",
            disabled: busy || !nv.name.trim(),
            onClick: async () => {
              const ok = await act("/nio-memo/api/perm/level/add", { kind, id, name: nv.name, content: nv.content, color: nv.color }, "\u6863\u4F4D\u5DF2\u65B0\u589E");
              if (ok) setNv({ name: "", content: "", color: "gray" });
            },
            children: "\u65B0\u589E\u6863\u4F4D"
          }
        ) })
      ] })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-help", children: [
      "\u6743\u9650\u677F\u5757\u5F53\u524D",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u5173\u95ED" }),
      "\uFF1A\u8BE5\u5B9E\u4F53\u6309\u539F\u89C4\u5219\u6CE8\u5165\u3002\u70B9\u4E0A\u9762\u7684\u300C\u5DF2\u5173\u95ED\u300D\u5373\u53EF\u5F00\u542F\uFF08\u9996\u6B21\u5F00\u542F\u4F1A\u81EA\u52A8\u5EFA\u300C\u7981\u6B62 / \u5141\u8BB8\u300D\u4E24\u4E2A\u6863\u4F4D\uFF0C\u9ED8\u8BA4\u505C\u5728\u8BE5\u5B9E\u4F53\u7684\u7B2C\u4E00\u4E2A\u6863\u4F4D\uFF09\u3002"
    ] }) : null
  ] });
}
function HandnoteTabView(props) {
  const [data, setData] = (0, import_react.useState)(props.__testData ?? null);
  const [err, setErr] = (0, import_react.useState)("");
  const [sub, setSub] = (0, import_react.useState)(props.__testSub ?? "rules");
  const [pane, setPane] = (0, import_react.useState)(props.__testPane ?? "create");
  const [detail, setDetail] = (0, import_react.useState)(props.__testDetail ?? null);
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [note, setNote] = (0, import_react.useState)("");
  const [editing, setEditing] = (0, import_react.useState)(false);
  const [draft, setDraft] = (0, import_react.useState)({ name: "", keywords: "", tagIds: [], content: "", version: 1 });
  const [form, setForm] = (0, import_react.useState)({ type: "memo", name: "", keywords: "", tagIds: [], content: "", version: 1 });
  const [trash, setTrash] = (0, import_react.useState)([]);
  const [slot, setSlot] = (0, import_react.useState)(props.__testSlot ?? null);
  const [tagModal, setTagModal] = (0, import_react.useState)(null);
  const [tagDraft, setTagDraft] = (0, import_react.useState)({ name: "", renameId: 0, renameName: "" });
  const [menu, setMenu] = (0, import_react.useState)(null);
  const load = (0, import_react.useCallback)(async () => {
    try {
      const d = await getJson("/nio-memo/api/all");
      if (!d.ok) {
        setErr(d.error || "\u8BFB\u53D6\u5931\u8D25");
        return;
      }
      setErr("");
      setData({
        ...d,
        iron: d.iron ?? [],
        rules: d.rules ?? [],
        memos: d.memos ?? [],
        roles: d.roles ?? [],
        exps: d.exps ?? [],
        tags: d.tags ?? [],
        switches: d.switches ?? DEFAULT_SWITCHES
      });
      if (sub === "settings" && pane === "trash") {
        const t = await getJson("/nio-memo/api/trash");
        setTrash(t.cards ?? []);
      }
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }, [sub, pane]);
  (0, import_react.useEffect)(() => {
    injectCss();
    void load();
  }, [load]);
  const act = (0, import_react.useCallback)(async (path, body, okMsg = "") => {
    setBusy(true);
    setNote("");
    try {
      const r = await postJson(path, body);
      if (!r.ok) {
        setNote(`\u2717 ${r.error || "\u64CD\u4F5C\u5931\u8D25"}`);
        return null;
      }
      await load();
      if (okMsg) setNote(okMsg);
      const updated = r.card ?? r.clause ?? null;
      if (updated) {
        setDetail((prev) => {
          if (!prev) return prev;
          if (prev.kind === "card" && updated.path !== void 0 && updated.id === prev.item.id) {
            return { kind: "card", item: updated };
          }
          if (prev.kind === "iron" && updated.title !== void 0 && updated.id === prev.item.id) {
            return { kind: "iron", item: updated };
          }
          return prev;
        });
      }
      return updated ?? r;
    } catch (e) {
      setNote(`\u2717 ${String(e?.message || e)}`);
      return null;
    } finally {
      setBusy(false);
    }
  }, [load]);
  const openDetail = (d) => {
    setDetail(d);
    setEditing(false);
    setNote("");
    setMenu(null);
    if (d.kind === "card" && d.item.state === "role") void loadSlot(d.item.id);
    else setSlot(null);
  };
  const loadSlot = async (roleId) => {
    try {
      const r = await getJson(`/nio-memo/api/role/exps?roleId=${roleId}`);
      setSlot(r.exps ?? []);
    } catch {
      setSlot([]);
    }
  };
  const bindExps = async (roleId, expIds) => {
    const r = await act("/nio-memo/api/role/exps", { roleId, expIds }, "\u7ECF\u9A8C\u69FD\u5DF2\u66F4\u65B0");
    if (r?.exps) setSlot(r.exps);
    else void loadSlot(roleId);
  };
  const openMenu = (card, el) => {
    const r = el.getBoundingClientRect();
    const W = 150, H = 152, M = 8;
    const placeLeft = r.left + W > window.innerWidth - M;
    const placeTop = r.bottom + H > window.innerHeight - M;
    const x = placeLeft ? Math.max(M, r.right - W) : Math.min(r.left, window.innerWidth - W - M);
    const y = placeTop ? Math.max(M, r.top - H - 4) : r.bottom + 4;
    setMenu({ type: "card", card, x, y });
  };
  const [toast, setToast] = (0, import_react.useState)(props.__testToast ?? "");
  const flash = (0, import_react.useCallback)((msg) => {
    setToast(msg);
    window.setTimeout(() => setToast((cur) => cur === msg ? "" : cur), 4200);
  }, []);
  const openLevelMenu = (kind, id, levels, currentId, el) => {
    const r = el.getBoundingClientRect();
    const W = 170, H = 40 + levels.length * 34, M = 8;
    const placeLeft = r.left + W > window.innerWidth - M;
    const placeTop = r.bottom + H > window.innerHeight - M;
    const x = placeLeft ? Math.max(M, r.right - W) : Math.min(r.left, window.innerWidth - W - M);
    const y = placeTop ? Math.max(M, r.top - H - 4) : r.bottom + 4;
    setMenu({ type: "level", kind, id, levels, currentId, x, y });
  };
  (0, import_react.useEffect)(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);
  const startEdit = (c) => {
    setDraft({ name: c.name, keywords: c.keywords.join("\u3001"), tagIds: c.tags.map((t) => t.id), content: c.content, version: c.version });
    setEditing(true);
    setNote("");
  };
  const saveEdit = async (c) => {
    const up = await act("/nio-memo/api/update", {
      id: c.id,
      name: draft.name,
      keywords: draft.keywords,
      content: draft.content,
      tagIds: draft.tagIds,
      version: draft.version
    }, "\u5DF2\u4FDD\u5B58");
    if (up) {
      setEditing(false);
      setDetail({ kind: "card", item: up });
    }
  };
  const submitCreate = async () => {
    const t = form.type;
    const created = await act("/nio-memo/api/create", form, `\u5DF2\u521B\u5EFA\uFF08\u81EA\u5B9A\u4E49 \xB7 ${STATE_LABEL[t]}\uFF09`);
    if (created) {
      setForm({ type: t, name: "", keywords: "", tagIds: [], content: "", version: 1 });
      if (t === "role") setSub("roles");
      else if (t === "exp") {
        setSub("settings");
        setPane("exp");
      } else setSub(t === "rule" ? "rules" : "memo");
      setDetail({ kind: "card", item: created });
    }
  };
  const userTags = (data?.tags ?? []).filter((t) => !t.system);
  const tagCards = (tag) => {
    const all = [...data?.memos ?? [], ...data?.rules ?? [], ...data?.roles ?? [], ...data?.exps ?? []];
    if (tag.system) {
      const origin = tag.name === "\u9ED8\u8BA4" ? "default" : "custom";
      return all.filter((c) => c.origin === origin);
    }
    return all.filter((c) => c.tags.some((t) => t.id === tag.id));
  };
  const sw = data?.switches ?? DEFAULT_SWITCHES;
  const roles = data?.roles ?? [];
  const exps = data?.exps ?? [];
  const defRoles = roles.filter((c) => c.origin === "default");
  const cstmRoles = roles.filter((c) => c.origin === "custom");
  const defExps = exps.filter((c) => c.origin === "default");
  const cstmExps = exps.filter((c) => c.origin === "custom");
  const head = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-head", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-head-title", children: "\u624B\u8BB0" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-tabs", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: sub === "rules" ? "on" : "", onClick: () => {
        setSub("rules");
        setDetail(null);
      }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u89C4\u77E9" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: data ? data.iron.length + data.rules.length : "" })
      ] }),
      sw.roleEnabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: sub === "roles" ? "on" : "", onClick: () => {
        setSub("roles");
        setDetail(null);
      }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u89D2\u8272" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: data ? roles.length : "" })
      ] }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: sub === "memo" ? "on" : "", onClick: () => {
        setSub("memo");
        setDetail(null);
      }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u5907\u5FD8" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: data ? data.memos.length : "" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: sub === "settings" ? "on" : "", onClick: () => {
        setSub("settings");
        setDetail(null);
      }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u8BBE\u7F6E" }),
        data?.trashCount ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [
          "\u{1F5D1}",
          data.trashCount
        ] }) : null
      ] })
    ] })
  ] });
  if (err) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-panel", children: [
    toast ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-toast", children: toast }) : null,
    head,
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-main", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-err", children: [
      "\u624B\u8BB0\u8BFB\u53D6\u5931\u8D25\uFF1A",
      err
    ] }) })
  ] });
  if (!data) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-panel", children: [
    toast ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-toast", children: toast }) : null,
    head,
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-main", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-empty", children: "\u52A0\u8F7D\u4E2D\u2026" }) })
  ] });
  const tagPicker = (selected, onToggle) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-modal-body", children: [
    userTags.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-empty", children: "\u8FD8\u6CA1\u6709\u81EA\u5B9A\u4E49\u6807\u7B7E\u2014\u2014\u53EF\u5728\u300C\u8BBE\u7F6E \u2192 \u6807\u7B7E\u300D\u91CC\u65B0\u5EFA\u3002" }) : null,
    userTags.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "nm2-check", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: selected.includes(t.id), onChange: () => onToggle(t.id) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t.name })
    ] }, t.id)),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-help", children: "\u300C\u9ED8\u8BA4 / \u81EA\u5B9A\u4E49\u300D\u662F\u7CFB\u7EDF\u6807\u7B7E\uFF0C\u7531\u5361\u7247\u6765\u6E90\u81EA\u52A8\u51B3\u5B9A\uFF0C\u4E0D\u5728\u8FD9\u91CC\u624B\u5DE5\u52FE\u9009\u3002" })
  ] });
  if (detail) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-panel", children: [
      toast ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-toast", children: toast }) : null,
      head,
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-main", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "nm2-back", onClick: () => {
          setDetail(null);
          setEditing(false);
          setNote("");
        }, children: "\u2190 \u8FD4\u56DE" }),
        detail.kind === "iron" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-doc-head", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: detail.item.title }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OriginTag, { origin: detail.item.origin }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nm2-tag lock", children: "\u94C1\u5F8B \xB7 \u9501\u6B7B\uFF08\u4E0D\u53EF\u7F16\u8F91\uFF09" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-path", children: detail.item.path }),
          renderMd(detail.item.content),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            PermBoard,
            {
              kind: "iron",
              id: detail.item.id,
              permEnabled: detail.item.permEnabled,
              levels: detail.item.permLevels,
              currentLevelId: detail.item.permCurrentLevelId,
              currentLevelName: detail.item.permCurrentLevelName,
              lockedNote: "\uFF08\u94C1\u5F8B\u6B63\u6587\u9501\u6B7B\uFF0C\u6863\u4F4D\u53EF\u7F16\u8F91\uFF09",
              busy,
              act,
              onFlash: flash,
              onOpenLevelMenu: (el) => openLevelMenu("iron", detail.item.id, detail.item.permLevels, detail.item.permCurrentLevelId, el)
            }
          )
        ] }) : detail.kind === "card" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-doc-head", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: detail.item.name }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OriginTag, { origin: detail.item.origin }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `nm2-tag ${detail.item.state === "rule" ? "rule" : ""}`, children: detail.item.state === "rule" ? "\u52A8\u6001\u89C4\u77E9" : "\u5907\u5FD8" }),
            detail.item.enabled ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nm2-tag", children: "\u5DF2\u505C\u7528" }),
            detail.item.deletedAt ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nm2-tag lock", children: "\u5728\u56DE\u6536\u7AD9" }) : null
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TagsRow, { tags: detail.item.tags }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-kw", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nm2-tag", children: "\u5173\u952E\u8BCD" }),
            detail.item.keywords.length ? detail.item.keywords.map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: w }, w)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\uFF08\u65E0\u5173\u952E\u8BCD\uFF09" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-path", children: detail.item.path }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-meta", children: [
            fmtVersion(detail.item.version),
            " \xB7 \u6539\u4E8E ",
            fmtTime(detail.item.updatedAt)
          ] }),
          note ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: note.startsWith("\u2717") ? "nm2-err" : "nm2-help", children: note }) : null,
          detail.item.deletedAt ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-warn", children: [
              "\u8BE5\u5361\u7247\u5728",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u56DE\u6536\u7AD9" }),
              "\u4E2D\uFF08\u56DE\u6536\u7AD9\u5185\u4E0D\u53EF\u7F16\u8F91\uFF09\u3002\u53EF\u4EE5\u6062\u590D\uFF0C\u6216\u5F7B\u5E95\u6E05\u9664\u3002"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-detail-acts", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  className: "nm2-btn primary",
                  disabled: busy,
                  onClick: async () => {
                    const c = await act("/nio-memo/api/restore", { id: detail.item.id }, "\u5DF2\u6062\u590D");
                    if (c) setDetail({ kind: "card", item: c });
                  },
                  children: "\u6062\u590D\u5230\u539F\u533A"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  className: "nm2-btn danger",
                  disabled: busy,
                  onClick: async () => {
                    if (!window.confirm(`\u5F7B\u5E95\u6E05\u9664\u300C${detail.item.name}\u300D\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u6062\u590D\u3002`)) return;
                    const r = await act("/nio-memo/api/purge", { id: detail.item.id }, "\u5DF2\u5F7B\u5E95\u6E05\u9664");
                    if (r) setDetail(null);
                  },
                  children: "\u5F7B\u5E95\u6E05\u9664"
                }
              )
            ] }),
            renderMd(detail.item.content)
          ] }) : editing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-form", children: [
            detail.item.origin === "default" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-warn", children: [
              "\u8FD9\u662F",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u9ED8\u8BA4\u5361" }),
              "\uFF08\u5B98\u65B9\u7EF4\u62A4\uFF09\uFF1A\u4E0D\u5EFA\u8BAE\u76F4\u63A5\u7F16\u8F91\u2014\u2014\u6539\u52A8\u4F1A\u4E0E\u6E90\u5934\u5206\u53C9\uFF0C\u5C06\u6765\u540C\u6B65/\u62BD\u53D6\u65F6\u5BB9\u6613\u51B2\u7A81\u3002\u66F4\u7A33\u7684\u505A\u6CD5\u662F\uFF1A",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u5173\u95ED" }),
              "\u5B83\uFF0C\u6216\u7528\u300C\u590D\u5236\u300D\u65B0\u5EFA\u4E00\u5F20\u81EA\u5B9A\u4E49\u5361\u6765\u6539\u3002"
            ] }) : null,
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-label", children: "\u6807\u9898" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: "nm2-input", value: draft.name, onChange: (e) => setDraft({ ...draft, name: e.target.value }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-label", children: "\u5173\u952E\u8BCD\uFF08\u987F\u53F7 / \u9017\u53F7\u5206\u9694\uFF09" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: "nm2-input", value: draft.keywords, onChange: (e) => setDraft({ ...draft, keywords: e.target.value }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-label", children: [
              "\u7248\u672C\u53F7\uFF08\u663E\u793A\u4E3A v",
              Number(draft.version) || 1,
              ".0\uFF09"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                className: "nm2-input",
                style: { maxWidth: 140 },
                type: "number",
                min: 1,
                value: draft.version,
                onChange: (e) => setDraft({ ...draft, version: Number(e.target.value) || 1 })
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-label", children: "\u6807\u7B7E" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-kw", children: userTags.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\uFF08\u6682\u65E0\u81EA\u5B9A\u4E49\u6807\u7B7E\uFF09" }) : userTags.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "span",
              {
                className: draft.tagIds.includes(t.id) ? "nm2-tag user" : "",
                style: { cursor: "pointer" },
                onClick: () => setDraft({ ...draft, tagIds: draft.tagIds.includes(t.id) ? draft.tagIds.filter((x) => x !== t.id) : [...draft.tagIds, t.id] }),
                children: [
                  draft.tagIds.includes(t.id) ? "\u2713 " : "",
                  t.name
                ]
              },
              t.id
            )) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-label", children: "\u5185\u5BB9\uFF08Markdown\uFF09" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { className: "nm2-textarea", value: draft.content, onChange: (e) => setDraft({ ...draft, content: e.target.value }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-form-acts", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "nm2-btn primary", disabled: busy || !draft.name.trim(), onClick: () => void saveEdit(detail.item), children: "\u4FDD\u5B58" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "nm2-btn", disabled: busy, onClick: () => setEditing(false), children: "\u53D6\u6D88" })
            ] })
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-detail-acts", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "nm2-btn", disabled: busy, onClick: () => void act("/nio-memo/api/toggle", { id: detail.item.id }), children: detail.item.enabled ? "\u505C\u7528" : "\u542F\u7528" }),
              !isIndexOnly(detail.item.state) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  className: "nm2-btn primary",
                  disabled: busy,
                  onClick: () => void act(detail.item.state === "rule" ? "/nio-memo/api/demote" : "/nio-memo/api/promote", { id: detail.item.id }),
                  children: detail.item.state === "rule" ? "\u964D\u4E3A\u5907\u5FD8" : "\u7ACB\u4E3A\u89C4\u77E9"
                }
              ) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "nm2-tag", children: [
                STATE_LABEL[detail.item.state],
                " \xB7 \u7D22\u5F15\u578B\uFF08\u4E0D\u53C2\u4E0E\u4E92\u8FC1\uFF09"
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "nm2-btn", disabled: busy, onClick: () => startEdit(detail.item), children: "\u7F16\u8F91" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  className: "nm2-btn",
                  disabled: busy,
                  onClick: async () => {
                    const c = await act("/nio-memo/api/copy", { id: detail.item.id }, "\u5DF2\u590D\u5236\u4E3A\u81EA\u5B9A\u4E49\u5361");
                    if (c) setDetail({ kind: "card", item: c });
                  },
                  children: "\u590D\u5236"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  className: "nm2-btn",
                  disabled: busy,
                  onClick: () => setTagModal({ card: detail.item, selected: detail.item.tags.map((t) => t.id).filter((id) => userTags.some((t) => t.id === id)) }),
                  children: "\u6253\u6807"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  className: "nm2-btn danger",
                  disabled: busy,
                  onClick: async () => {
                    const c = await act("/nio-memo/api/delete", { id: detail.item.id }, "\u5DF2\u79FB\u5165\u56DE\u6536\u7AD9");
                    if (c) setDetail(null);
                  },
                  children: "\u5220\u9664"
                }
              )
            ] }),
            renderMd(detail.item.content),
            detail.item.state === "role" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-permsec", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-sec", children: [
                "\u7ECF\u9A8C\u69FD",
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "\u7ED1\u5B9A\u7ECF\u9A8C\u5361\uFF08T4\uFF09\xB7 \u4EC5\u7D22\u5F15\u968F\u89D2\u8272\u88AB\u8BFB\u53D6\u65F6\u89E6\u53D1" })
              ] }),
              !sw.expEffective ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-tip", children: [
                "\u26A0 \u7ECF\u9A8C\u5361\u529F\u80FD\u5F53\u524D",
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u672A\u751F\u6548" }),
                "\uFF08",
                sw.roleEnabled ? "\u7ECF\u9A8C\u5361\u5F00\u5173\u5DF2\u5173" : "\u89D2\u8272\u529F\u80FD\u5DF2\u5173",
                "\uFF09\u21D2 ",
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u672C\u677F\u5757\u6574\u5757\u505C\u7528" }),
                "\u3002 \u5361\u7247\u4E0E\u7ED1\u5B9A",
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u90FD\u8FD8\u5728" }),
                "\uFF0C\u5728\u300C\u8BBE\u7F6E \u2192 \u9AD8\u7EA7\u300D\u91CC\u91CD\u65B0\u6253\u5F00\u5373\u6062\u590D\u3002"
              ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-help", children: [
                  "\u7ED1\u5B9A\u540E\uFF1Aagent \u8BFB\u53D6\u672C\u89D2\u8272\u65F6\uFF0C\u4F1A\u4E00\u5E76\u5E26\u51FA\u8FD9\u4E9B\u7ECF\u9A8C\u5361\u7684",
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u7D22\u5F15\u884C" }),
                  "\uFF08\u6B63\u6587\u9700\u518D\u6309\u8DEF\u5F84\u8BFB\u4E00\u6B21\uFF09\u3002\u4E00\u5F20\u7ECF\u9A8C\u5361\u53EF\u88AB",
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u591A\u4E2A\u89D2\u8272" }),
                  "\u7ED1\u5B9A\u3002"
                ] }),
                (slot ?? []).length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-empty", children: "\u5C1A\u672A\u7ED1\u5B9A\u4EFB\u4F55\u7ECF\u9A8C\u5361\u3002" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-grid", children: (slot ?? []).map((e) => {
                  const live = exps.find((x) => x.id === e.id);
                  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-card", style: { height: "auto" }, children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-card-name one-line", children: e.name }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-meta", title: e.path || void 0, children: e.path || "\uFF08\u65E0\u8DEF\u5F84\uFF09" }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-kw", children: e.deleted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\uFF08\u7A7A\u5F15\u7528\uFF1A\u7ECF\u9A8C\u5361\u5DF2\u5728\u56DE\u6536\u7AD9/\u88AB\u6E05\u9664\uFF09" }) : e.enabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u542F\u7528\u4E2D" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\uFF08\u5DF2\u505C\u7528\uFF09" }) }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-detail-acts", children: [
                      live ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "nm2-btn", disabled: busy, onClick: () => openDetail({ kind: "card", item: live }), children: "\u6253\u5F00\u7F16\u8F91" }) : null,
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        "button",
                        {
                          className: "nm2-btn danger",
                          disabled: busy,
                          onClick: () => void bindExps(detail.item.id, (slot ?? []).filter((x) => x.id !== e.id).map((x) => x.id)),
                          children: "\u89E3\u7ED1"
                        }
                      )
                    ] })
                  ] }, e.id);
                }) }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-label", children: "\u53EF\u7ED1\u5B9A\u7684\u7ECF\u9A8C\u5361\uFF08\u70B9\u4E00\u4E0B\u5373\u7ED1\u5B9A\uFF09" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-kw", children: exps.filter((c) => c.enabled && !c.deletedAt && !(slot ?? []).some((s) => s.id === c.id)).length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\uFF08\u6CA1\u6709\u53EF\u7ED1\u7684\u7ECF\u9A8C\u5361\uFF1B\u5148\u53BB\u300C\u65B0\u5EFA\u300D\u628A\u7C7B\u578B\u9009\u4E3A\u300C\u7ECF\u9A8C\u5361\u300D\uFF0C\u6216\u5230\u300C\u8BBE\u7F6E \u2192 \u7ECF\u9A8C\u5361\u300D\u91CC\u542F\u7528\u5DF2\u6709\u7684\uFF09" }) : exps.filter((c) => c.enabled && !c.deletedAt && !(slot ?? []).some((s) => s.id === c.id)).map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                  "span",
                  {
                    className: "nm2-tag user",
                    style: { cursor: "pointer" },
                    onClick: () => void bindExps(detail.item.id, [...(slot ?? []).map((x) => x.id), c.id]),
                    children: [
                      "+ ",
                      c.name
                    ]
                  },
                  c.id
                )) })
              ] })
            ] }) : null,
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              PermBoard,
              {
                kind: "card",
                id: detail.item.id,
                permEnabled: detail.item.permEnabled,
                levels: detail.item.permLevels,
                currentLevelId: detail.item.permCurrentLevelId,
                currentLevelName: detail.item.permCurrentLevelName,
                busy,
                act,
                onFlash: flash,
                onOpenLevelMenu: (el) => openLevelMenu("card", detail.item.id, detail.item.permLevels, detail.item.permCurrentLevelId, el)
              }
            )
          ] })
        ] }) : (
          // 标签详情：**只列该标签下的卡片**（系统标签按来源过滤）+ 批量操作
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            TagDetail,
            {
              tag: detail.item,
              cards: tagCards(detail.item),
              busy,
              onOpen: (c) => openDetail({ kind: "card", item: c }),
              onBatch: async (op, state) => {
                const ids = tagCards(detail.item).map((c) => c.id);
                if (!ids.length) {
                  setNote("\u2717 \u8BE5\u6807\u7B7E\u4E0B\u6682\u65E0\u5361\u7247");
                  return;
                }
                if (op === "delete" && !window.confirm(`\u628A\u8BE5\u6807\u7B7E\u4E0B\u7684 ${ids.length} \u5F20\u5361\u79FB\u5165\u56DE\u6536\u7AD9\uFF1F`)) return;
                const r = await act("/nio-memo/api/batch", { ids, op, state });
                if (r) setNote(`\u6279\u91CF\u64CD\u4F5C\u5B8C\u6210\uFF1A\u5B9E\u9645\u751F\u6548 ${r.changed ?? 0} \u5F20\uFF08\u9009\u4E2D ${ids.length} \u5F20\uFF1B\u89D2\u8272 / \u7ECF\u9A8C\u5361\u4E0D\u53C2\u4E0E\u300C\u8F6C\u533A\u300D\uFF09`);
              }
            }
          )
        )
      ] })
    ] });
  }
  const defRules = data.rules.filter((c) => c.origin === "default");
  const cstmRules = data.rules.filter((c) => c.origin === "custom");
  const defMemos = data.memos.filter((c) => c.origin === "default");
  const cstmMemos = data.memos.filter((c) => c.origin === "custom");
  const subEff = sub === "roles" && !sw.roleEnabled ? "rules" : sub;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-panel", children: [
    toast ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-toast", children: toast }) : null,
    head,
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-main", children: [
      note ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: note.startsWith("\u2717") ? "nm2-err" : "nm2-help", children: note }) : null,
      subEff === "rules" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-help", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u89C4\u77E9" }),
          "\uFF1D\u5FC5\u987B\u9075\u5B88\u7684\u89C4\u5219\uFF0C",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u9ED8\u8BA4\u6CE8\u5165\u7CFB\u7EDF\u63D0\u793A\u8BCD" }),
          "\u3002\u300C\u94C1\u5F8B\u300D\u9501\u6B7B\u2014\u2014\u4E0D\u53EF\u7F16\u8F91\u3001\u4E0D\u53EF\u5173\u95ED\uFF0C\u6BCF\u8F6E\u65E0\u6761\u4EF6\u5168\u6587\u6CE8\u5165\uFF1B \u300C\u52A8\u6001\u89C4\u77E9\u300D\u542F\u7528\u65F6\u6BCF\u8F6E\u5168\u6587\u6CE8\u5165\uFF0C\u53EF\u968F\u65F6\u5173\u95ED\u3001\u964D\u4E3A\u5907\u5FD8\u3002",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u9ED8\u8BA4" }),
          "\uFF1D\u5B98\u65B9\u7EF4\u62A4\uFF08\u63D0\u516C\u5171\u5E93\u53EA\u62BD\u9ED8\u8BA4\uFF09\uFF0C",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u81EA\u5B9A\u4E49" }),
          "\uFF1D\u81EA\u5DF1\u5EFA\u7684\u3002"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-sec", children: [
          "\u94C1\u5F8B\uFF08\u9501\u6B7B \xB7 \u6BCF\u8F6E\u65E0\u6761\u4EF6\u5168\u6587\u6CE8\u5165\uFF09",
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
            data.iron.length,
            " \u6761"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-grid", children: data.iron.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-entry", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `nm2-card with-acts ${c.origin === "default" ? "dflt" : "cstm"}`, onClick: () => openDetail({ kind: "iron", item: c }), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-card-name one-line", children: c.title }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-card-foot", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OriginTag, { origin: c.origin }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nm2-tag lock", children: "\u9501\u6B7B" })
          ] }),
          c.permEnabled && c.permCurrentLevelId ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-card-actions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nm2-meta", children: "\u6863\u4F4D" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nm2-foot-acts", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                className: "nm2-btn small",
                disabled: busy,
                style: { color: colorHex(c.permLevels.find((l) => l.id === c.permCurrentLevelId)?.color ?? "gray") },
                onClick: (e) => {
                  e.stopPropagation();
                  openLevelMenu("iron", c.id, c.permLevels, c.permCurrentLevelId, e.currentTarget);
                },
                children: c.permCurrentLevelName
              }
            ) })
          ] }) : null
        ] }) }, `i${c.id}`)) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-sec", style: { marginTop: 8 }, children: [
          "\u52A8\u6001\u89C4\u77E9\uFF08\u542F\u7528\u4E2D \xB7 \u6BCF\u8F6E\u5168\u6587\u6CE8\u5165\uFF09",
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("small", { children: [
            data.rules.length,
            " \u5F20"
          ] })
        ] }),
        data.rules.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-empty", children: "\u6682\u65E0\u52A8\u6001\u89C4\u77E9\u3002" }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          CardGroup,
          {
            cards: defRules,
            title: "\u52A8\u6001\u89C4\u77E9 \xB7 \u9ED8\u8BA4",
            busy,
            onOpen: (c) => openDetail({ kind: "card", item: c }),
            onToggle: (c) => void act("/nio-memo/api/toggle", { id: c.id }),
            onMenu: (c, el) => openMenu(c, el),
            onLevel: (c, el) => openLevelMenu("card", c.id, c.permLevels, c.permCurrentLevelId, el)
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          CardGroup,
          {
            cards: cstmRules,
            title: "\u52A8\u6001\u89C4\u77E9 \xB7 \u81EA\u5B9A\u4E49",
            busy,
            onOpen: (c) => openDetail({ kind: "card", item: c }),
            onToggle: (c) => void act("/nio-memo/api/toggle", { id: c.id }),
            onMenu: (c, el) => openMenu(c, el),
            onLevel: (c, el) => openLevelMenu("card", c.id, c.permLevels, c.permCurrentLevelId, el)
          }
        )
      ] }) : subEff === "roles" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-help", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u89D2\u8272" }),
          "\uFF1D\u7D22\u5F15\u578B\u5B9E\u4F53\uFF0C",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u4E0D\u53C2\u4E0E\u300C\u5347\u4E3A\u89C4\u77E9 / \u964D\u4E3A\u5907\u5FD8\u300D\u4E92\u8FC1" }),
          "\uFF1A\u542F\u7528\u4E2D\u7684\u89D2\u8272\u6BCF\u8F6E\u53EA\u6CE8\u5165",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u4E00\u884C\u7D22\u5F15" }),
          "\uFF08\u540D / \u5173\u952E\u8BCD / \u8DEF\u5F84\uFF09\uFF0C agent \u547D\u4E2D\u65F6\u7528 ",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "nio_memo(\u8DEF\u5F84)" }),
          " \u8BFB\u53D6\uFF1B\u8BFB\u53D6\u65F6**\u53EA**\u4F1A\u4E00\u5E76\u5E26\u51FA\u5176",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u7ECF\u9A8C\u69FD" }),
          "\u5185\u7ECF\u9A8C\u5361\u7684\u7D22\u5F15\u884C\uFF08\u6B63\u6587\u9700\u518D\u8BFB\u4E00\u6B21\uFF09\u3002 \u7528\u4E0D\u5230\u89D2\u8272\u65F6\uFF0C\u53EF\u5728\u300C\u8BBE\u7F6E \u2192 \u9AD8\u7EA7\u300D\u6574\u4F53\u5173\u95ED\uFF08\u505C\u6CE8\u5165 + \u9690\u85CF\u672C tab\uFF0C\u6570\u636E\u4E0E\u7ED1\u5B9A\u90FD\u4FDD\u7559\uFF09\u3002"
        ] }),
        roles.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-empty", children: "\u6682\u65E0\u89D2\u8272\u5361\u3002\u53EF\u5728\u300C\u8BBE\u7F6E \u2192 \u521B\u5EFA\u300D\u628A\u7C7B\u578B\u9009\u4E3A\u300C\u89D2\u8272\u300D\u6765\u65B0\u5EFA\u3002" }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          CardGroup,
          {
            cards: defRoles,
            title: "\u89D2\u8272 \xB7 \u9ED8\u8BA4",
            busy,
            onOpen: (c) => openDetail({ kind: "card", item: c }),
            onToggle: (c) => void act("/nio-memo/api/toggle", { id: c.id }),
            onMenu: (c, el) => openMenu(c, el),
            onLevel: (c, el) => openLevelMenu("card", c.id, c.permLevels, c.permCurrentLevelId, el)
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          CardGroup,
          {
            cards: cstmRoles,
            title: "\u89D2\u8272 \xB7 \u81EA\u5B9A\u4E49",
            busy,
            onOpen: (c) => openDetail({ kind: "card", item: c }),
            onToggle: (c) => void act("/nio-memo/api/toggle", { id: c.id }),
            onMenu: (c, el) => openMenu(c, el),
            onLevel: (c, el) => openLevelMenu("card", c.id, c.permLevels, c.permCurrentLevelId, el)
          }
        )
      ] }) : subEff === "memo" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-help", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u5907\u5FD8" }),
          "\uFF1D\u6309\u9700\u67E5\u9605\u7684\u5361\u7247\uFF0C",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u5E73\u65F6\u4E0D\u5360\u4E0A\u4E0B\u6587" }),
          "\uFF1A\u9ED8\u8BA4\u53EA\u6CE8\u5165\u300C\u5361\u7247\u540D / \u5173\u952E\u8BCD / \u8DEF\u5F84\u300D\uFF0C\u547D\u4E2D\u5173\u952E\u8BCD\u65F6 agent \u7528 ",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "nio_memo(\u8DEF\u5F84)" }),
          " \u53D6\u5168\u6587\uFF1B \u53EF\u5173\u95ED\uFF08\u4E0D\u8FDB\u7D22\u5F15\uFF09\u3001\u53EF\u300C\u7ACB\u4E3A\u89C4\u77E9\u300D\u5347\u7EA7\u4E3A\u6BCF\u8F6E\u5168\u6587\u6CE8\u5165\u3002",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u9ED8\u8BA4" }),
          "\uFF1D\u5B98\u65B9\u7EF4\u62A4\uFF0C",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u81EA\u5B9A\u4E49" }),
          "\uFF1D\u81EA\u5DF1\u5EFA\u7684\u3002"
        ] }),
        data.memos.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-empty", children: "\u6682\u65E0\u5907\u5FD8\u5361\u3002" }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          CardGroup,
          {
            cards: defMemos,
            title: "\u5907\u5FD8 \xB7 \u9ED8\u8BA4",
            busy,
            onOpen: (c) => openDetail({ kind: "card", item: c }),
            onToggle: (c) => void act("/nio-memo/api/toggle", { id: c.id }),
            onMenu: (c, el) => openMenu(c, el),
            onLevel: (c, el) => openLevelMenu("card", c.id, c.permLevels, c.permCurrentLevelId, el)
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          CardGroup,
          {
            cards: cstmMemos,
            title: "\u5907\u5FD8 \xB7 \u81EA\u5B9A\u4E49",
            busy,
            onOpen: (c) => openDetail({ kind: "card", item: c }),
            onToggle: (c) => void act("/nio-memo/api/toggle", { id: c.id }),
            onMenu: (c, el) => openMenu(c, el),
            onLevel: (c, el) => openLevelMenu("card", c.id, c.permLevels, c.permCurrentLevelId, el)
          }
        )
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-tabs", style: { marginBottom: 4 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: pane === "create" ? "on" : "", onClick: () => setPane("create"), children: "\u521B\u5EFA" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: pane === "tags" ? "on" : "", onClick: () => setPane("tags"), children: "\u6807\u7B7E" }),
          sw.roleEnabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: pane === "exp" ? "on" : "", onClick: () => setPane("exp"), children: [
            "\u7ECF\u9A8C\u5361",
            exps.length ? `\uFF08${exps.length}\uFF09` : "",
            sw.expEffective ? "" : " \xB7 \u5DF2\u505C\u7528"
          ] }) : null,
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: pane === "advanced" ? "on" : "", onClick: () => setPane("advanced"), children: "\u9AD8\u7EA7" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: pane === "trash" ? "on" : "", onClick: () => {
            setPane("trash");
            void load();
          }, children: [
            "\u56DE\u6536\u7AD9",
            data.trashCount ? `\uFF08${data.trashCount}\uFF09` : ""
          ] })
        ] }),
        pane === "create" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-help", children: [
            "\u624B\u5199\u4E00\u5F20 ",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u81EA\u5B9A\u4E49" }),
            " \u5361\u3002\u5148\u5728\u4E0A\u9762\u9009",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u8981\u521B\u5EFA\u7684\u7C7B\u578B" }),
            "\uFF1A\u5907\u5FD8 / \u89C4\u77E9 / \u89D2\u8272 / \u7ECF\u9A8C\u5361\u2014\u2014 \u5907\u5FD8\u4E0E\u89C4\u77E9\u4E4B\u95F4\u53EF\u4E92\u8FC1\uFF1B",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u89D2\u8272\u4E0E\u7ECF\u9A8C\u5361\u662F\u7D22\u5F15\u578B\uFF0C\u4E0D\u53C2\u4E0E\u4E92\u8FC1" }),
            "\u3002"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-tip", children: [
            "\u{1F4A1} ",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u4EA4\u7ED9 agent \u521B\u5EFA\u5F80\u5F80\u66F4\u65B9\u4FBF\u6709\u6548" }),
            "\u2014\u2014\u4F60\u8BF4\u4E00\u53E5\u300C\u8BB0\u4F4F\u8FD9\u4E2A\u300D\uFF0C\u5B83\u4F1A\u628A\u5173\u952E\u8BCD\u3001\u6B63\u6587\u683C\u5F0F\u4E0E\u6807\u7B7E\u4E00\u6B21\u5199\u5230\u4F4D\u3002"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-form", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-label", children: "\u5361\u7247\u7C7B\u578B\uFF08\u51B3\u5B9A\u843D\u5728\u54EA\u4E2A\u533A / \u5982\u4F55\u88AB\u4F7F\u7528\uFF09" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "select",
              {
                className: "nm2-input",
                style: { maxWidth: 320 },
                value: form.type,
                onChange: (e) => setForm({ ...form, type: e.target.value }),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "memo", children: "\u5907\u5FD8\u5361 \u2014\u2014 \u7D22\u5F15\u6309\u9700\u67E5\u9605\uFF08\u9ED8\u8BA4\uFF09" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "rule", children: "\u89C4\u77E9\uFF08\u52A8\u6001\uFF09\u2014\u2014 \u6BCF\u8F6E\u5168\u6587\u6CE8\u5165" }),
                  sw.roleEnabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "role", children: "\u89D2\u8272 \u2014\u2014 \u6BCF\u8F6E\u6CE8\u5165\u4E00\u884C\u7D22\u5F15\uFF1B\u53EF\u7ED1\u7ECF\u9A8C\u5361" }) : null,
                  sw.expEffective ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "exp", children: "\u7ECF\u9A8C\u5361 \u2014\u2014 \u4E0D\u6CE8\u5165\uFF1B\u9760\u89D2\u8272\u7ECF\u9A8C\u69FD\u7ED1\u5B9A\u89E6\u53D1" }) : null
                ]
              }
            ),
            !sw.roleEnabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-help", children: "\u89D2\u8272\u529F\u80FD\u5F53\u524D\u5DF2\u5173\u95ED\uFF08\u5728\u300C\u9AD8\u7EA7\u300D\u91CC\u5F00\uFF09\uFF0C\u6545\u4E0D\u63D0\u4F9B\u300C\u89D2\u8272 / \u7ECF\u9A8C\u5361\u300D\u9009\u9879\u3002" }) : null,
            sw.roleEnabled && !sw.expEffective ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-help", children: "\u7ECF\u9A8C\u5361\u5F53\u524D\u5DF2\u5173\u95ED\uFF08\u5728\u300C\u9AD8\u7EA7\u300D\u91CC\u5F00\uFF09\uFF0C\u6545\u4E0D\u63D0\u4F9B\u300C\u7ECF\u9A8C\u5361\u300D\u9009\u9879\u3002" }) : null,
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-label", children: "\u6807\u9898\uFF08\u552F\u4E00\uFF0C\u8DEF\u5F84\u6309\u5B83\u751F\u6210\uFF09" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: "nm2-input", placeholder: "\u4F8B\u5982\uFF1A\u6211\u7684\u90E8\u7F72\u5C0F\u6284", value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-label", children: "\u5173\u952E\u8BCD\uFF08\u987F\u53F7 / \u9017\u53F7\u5206\u9694\uFF0C\u547D\u4E2D\u5173\u952E\u8BCD\u65F6 agent \u4F1A\u6765\u8BFB\u5B83\uFF09" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: "nm2-input", placeholder: "\u4F8B\u5982\uFF1A\u90E8\u7F72\u3001\u56DE\u6EDA\u3001\u7AEF\u53E3", value: form.keywords, onChange: (e) => setForm({ ...form, keywords: e.target.value }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-label", children: "\u7248\u672C\u53F7\uFF08\u9ED8\u8BA4 1\uFF0C\u663E\u793A\u4E3A v1.0\uFF09" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                className: "nm2-input",
                style: { maxWidth: 140 },
                type: "number",
                min: 1,
                value: form.version,
                onChange: (e) => setForm({ ...form, version: Number(e.target.value) || 1 })
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-label", children: "\u6807\u7B7E\uFF08\u53EF\u9009\uFF09" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-kw", children: userTags.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\uFF08\u6682\u65E0\u81EA\u5B9A\u4E49\u6807\u7B7E\uFF0C\u53EF\u5728\u300C\u6807\u7B7E\u300D\u9875\u65B0\u5EFA\uFF09" }) : userTags.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "span",
              {
                className: form.tagIds.includes(t.id) ? "nm2-tag user" : "",
                style: { cursor: "pointer" },
                onClick: () => setForm({ ...form, tagIds: form.tagIds.includes(t.id) ? form.tagIds.filter((x) => x !== t.id) : [...form.tagIds, t.id] }),
                children: [
                  form.tagIds.includes(t.id) ? "\u2713 " : "",
                  t.name
                ]
              },
              t.id
            )) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-label", children: "\u5185\u5BB9\uFF08Markdown\uFF09" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { className: "nm2-textarea", placeholder: "# \u6807\u9898\n\n\u6B63\u6587\u2026", value: form.content, onChange: (e) => setForm({ ...form, content: e.target.value }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-form-acts", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "nm2-btn primary", disabled: busy || !form.name.trim(), onClick: () => void submitCreate(), children: [
                "\u521B\u5EFA",
                STATE_LABEL[form.type]
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "nm2-btn", disabled: busy, onClick: () => setForm({ type: form.type, name: "", keywords: "", tagIds: [], content: "", version: 1 }), children: "\u6E05\u7A7A" })
            ] })
          ] })
        ] }) : pane === "exp" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-help", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u7ECF\u9A8C\u5361" }),
            "\uFF1A",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u4E0D\u8FDB\u6BCF\u8F6E\u6CE8\u5165" }),
            "\uFF0C\u4E5F\u6CA1\u6709\u72EC\u7ACB tab\u3002\u5B83\u7684\u7D22\u5F15\u53EA\u6302\u5728",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u89D2\u8272\u7684\u7ECF\u9A8C\u69FD" }),
            "\u91CC \u2014\u2014 \u53EA\u6709\u8BE5\u89D2\u8272\u88AB agent \u8BFB\u53D6\u65F6\uFF0C\u624D\u4F1A\u8DDF\u7740\u5E26\u51FA\u5B83\u7684\u7D22\u5F15\u884C\uFF08\u6B63\u6587\u9700\u518D\u6309\u8DEF\u5F84\u8BFB\u4E00\u6B21\uFF09\u3002\u4E00\u5F20\u7ECF\u9A8C\u5361\u53EF\u88AB",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u591A\u4E2A\u89D2\u8272" }),
            "\u7ED1\u5B9A\u3002"
          ] }),
          !sw.expEffective ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-tip", children: [
            "\u26A0 \u7ECF\u9A8C\u5361\u529F\u80FD\u5F53\u524D",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u672A\u751F\u6548" }),
            "\uFF08",
            sw.roleEnabled ? "\u7ECF\u9A8C\u5361\u5F00\u5173\u5DF2\u5173" : "\u89D2\u8272\u529F\u80FD\u5DF2\u5173",
            "\uFF09\u21D2 \u89D2\u8272\u5185\u9875\u7684\u300C\u7ECF\u9A8C\u69FD\u300D",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u6574\u5757\u505C\u7528" }),
            "\u3001\u8BFB\u89D2\u8272",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u4E0D\u518D\u5E26\u51FA" }),
            "\u7ECF\u9A8C\u5361\u7D22\u5F15\u3002 \u5361\u7247\u4E0E\u7ED1\u5B9A",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u90FD\u8FD8\u5728" }),
            "\uFF0C\u5728\u300C\u9AD8\u7EA7\u300D\u91CC\u91CD\u65B0\u6253\u5F00\u5373\u6062\u590D\uFF0C\u65E0\u9700\u4E8C\u6B21\u64CD\u4F5C\u3002"
          ] }) : null,
          exps.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-empty", children: "\u6682\u65E0\u7ECF\u9A8C\u5361\u3002\u53EF\u5728\u300C\u521B\u5EFA\u300D\u91CC\u628A\u7C7B\u578B\u9009\u4E3A\u300C\u7ECF\u9A8C\u5361\u300D\u6765\u65B0\u5EFA\u3002" }) : null,
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            CardGroup,
            {
              cards: defExps,
              title: "\u7ECF\u9A8C\u5361 \xB7 \u9ED8\u8BA4",
              busy,
              onOpen: (c) => openDetail({ kind: "card", item: c }),
              onToggle: (c) => void act("/nio-memo/api/toggle", { id: c.id }),
              onMenu: (c, el) => openMenu(c, el),
              onLevel: (c, el) => openLevelMenu("card", c.id, c.permLevels, c.permCurrentLevelId, el)
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            CardGroup,
            {
              cards: cstmExps,
              title: "\u7ECF\u9A8C\u5361 \xB7 \u81EA\u5B9A\u4E49",
              busy,
              onOpen: (c) => openDetail({ kind: "card", item: c }),
              onToggle: (c) => void act("/nio-memo/api/toggle", { id: c.id }),
              onMenu: (c, el) => openMenu(c, el),
              onLevel: (c, el) => openLevelMenu("card", c.id, c.permLevels, c.permCurrentLevelId, el)
            }
          )
        ] }) : pane === "advanced" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-help", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u9AD8\u7EA7" }),
            "\uFF1A\u672C\u9875",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u53EA\u653E\u529F\u80FD\u5F00\u5173" }),
            "\u3002\u5173\u95ED\u4E0D\u4F1A\u5220\u9664\u4EFB\u4F55\u6570\u636E \u2014\u2014 \u5361\u7247\u3001\u7ED1\u5B9A\u3001\u8BBE\u5B9A\u5168\u90E8\u4FDD\u7559\uFF0C\u91CD\u65B0\u6253\u5F00\u5373\u6062\u590D\u3002"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-form", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "nm2-check", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "input",
                {
                  type: "checkbox",
                  checked: sw.roleEnabled,
                  disabled: busy,
                  onChange: () => void act(
                    "/nio-memo/api/switch",
                    { key: "role", enabled: !sw.roleEnabled },
                    sw.roleEnabled ? "\u89D2\u8272\u529F\u80FD\u5DF2\u5173\u95ED\uFF08\u505C\u6CE8\u5165 + \u9690\u85CF tab\uFF1B\u6570\u636E\u4FDD\u7559\uFF09" : "\u89D2\u8272\u529F\u80FD\u5DF2\u542F\u7528"
                  )
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u89D2\u8272\u529F\u80FD" }),
                " \u2014\u2014 \u5173\u95ED\u540E\uFF1A\u89D2\u8272\u7D22\u5F15",
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u4E0D\u518D\u6CE8\u5165" }),
                "\uFF0C\u300C\u89D2\u8272\u300Dtab ",
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u9690\u85CF" }),
                "\uFF1B\u6570\u636E\u4E0E\u7ED1\u5B9A\u4FDD\u7559\u3002"
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "nm2-check", style: { opacity: sw.roleEnabled ? 1 : 0.5 }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "input",
                {
                  type: "checkbox",
                  checked: sw.expEnabled,
                  disabled: busy || !sw.roleEnabled,
                  onChange: () => void act(
                    "/nio-memo/api/switch",
                    { key: "exp", enabled: !sw.expEnabled },
                    sw.expEnabled ? "\u7ECF\u9A8C\u5361\u5DF2\u5173\u95ED\uFF08\u7ECF\u9A8C\u69FD\u505C\u7528\uFF1B\u7ED1\u5B9A\u4FDD\u7559\uFF09" : "\u7ECF\u9A8C\u5361\u5DF2\u542F\u7528"
                  )
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u7ECF\u9A8C\u5361" }),
                " \u2014\u2014 \u5173\u95ED\u540E\uFF1A\u89D2\u8272\u5185\u9875\u7684\u300C\u7ECF\u9A8C\u69FD\u300D",
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u6574\u5757\u505C\u7528" }),
                "\uFF0C\u8BFB\u89D2\u8272\u4E0D\u518D\u5E26\u51FA\u7ECF\u9A8C\u5361\u7D22\u5F15\uFF1B\u7ED1\u5B9A",
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u5168\u90E8\u4FDD\u7559" }),
                "\u3002"
              ] })
            ] }),
            !sw.roleEnabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-help", children: [
              "\u26A0 \u89D2\u8272\u529F\u80FD\u672A\u542F\u7528 \u21D2 ",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u7ECF\u9A8C\u5361\u4E0D\u53EF\u542F\u7528" }),
              "\uFF08\u8BE5\u5F00\u5173\u7F6E\u7070\u4E0D\u53EF\u70B9\uFF09\uFF1B\u5B83\u7684\u539F\u8BBE\u5B9A\u503C",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u5DF2\u4FDD\u7559" }),
              "\uFF0C\u91CD\u5F00\u89D2\u8272\u5373\u6062\u590D\u3002"
            ] }) : null,
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-help", children: [
              "\u5F53\u524D\u72B6\u6001\uFF1A\u89D2\u8272\u529F\u80FD=",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: sw.roleEnabled ? "\u5F00" : "\u5173" }),
              " \xB7 \u7ECF\u9A8C\u5361\u5F00\u5173=",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: sw.expEnabled ? "\u5F00" : "\u5173" }),
              "\uFF08\u539F\u8BBE\u5B9A\uFF09 \xB7 \u7ECF\u9A8C\u5361\u5B9E\u9645\u751F\u6548=",
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: sw.expEffective ? "\u662F" : "\u5426" })
            ] })
          ] })
        ] }) : pane === "trash" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-help", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u56DE\u6536\u7AD9" }),
            "\uFF1A\u5220\u9664\u7684\u5361\u7247\u6682\u653E\u8FD9\u91CC\uFF0C\u53EF",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u6062\u590D" }),
            "\u5230\u539F\u533A\uFF0C\u6216",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u5F7B\u5E95\u6E05\u9664" }),
            "\uFF08\u4E0D\u53EF\u6062\u590D\uFF09\u3002\u56DE\u6536\u7AD9\u5185\u4E0D\u53EF\u7F16\u8F91\u3002"
          ] }),
          trash.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-empty", children: "\u56DE\u6536\u7AD9\u662F\u7A7A\u7684\u3002" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-grid", children: trash.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-card off", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-card-head", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-card-name", children: c.name }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OriginTag, { origin: c.origin }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nm2-tag", children: STATE_LABEL[c.state] ?? "\u5907\u5FD8" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-path", children: c.path }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-detail-acts", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "nm2-btn primary", disabled: busy, onClick: () => void act("/nio-memo/api/restore", { id: c.id }, "\u5DF2\u6062\u590D"), children: "\u6062\u590D" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "nm2-btn", disabled: busy, onClick: () => openDetail({ kind: "card", item: c }), children: "\u67E5\u770B" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "nm2-btn danger", disabled: busy, onClick: () => {
                if (!window.confirm(`\u5F7B\u5E95\u6E05\u9664\u300C${c.name}\u300D\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u6062\u590D\u3002`)) return;
                void act("/nio-memo/api/purge", { id: c.id }, "\u5DF2\u5F7B\u5E95\u6E05\u9664");
              }, children: "\u5F7B\u5E95\u6E05\u9664" })
            ] })
          ] }, c.id)) })
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-help", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u6807\u7B7E" }),
            "\u7528\u4E8E\u533A\u5206\u4E0E\u6279\u91CF\u64CD\u4F5C\uFF1A\u70B9\u6807\u7B7E\u5361\u7247\u53EF\u770B\u5B83\u4E0B\u9762\u7684\u5361\u7247\uFF0C\u5E76",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u6279\u91CF\u8F6C\u79FB\uFF08\u89C4\u77E9/\u5907\u5FD8\uFF09\u3001\u6279\u91CF\u542F\u7528/\u5173\u95ED\u3001\u6279\u91CF\u5220\u9664" }),
            "\u3002 \u300C\u9ED8\u8BA4 / \u81EA\u5B9A\u4E49\u300D\u662F",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "\u7CFB\u7EDF\u6807\u7B7E" }),
            "\uFF08\u7531\u5361\u7247\u6765\u6E90\u81EA\u52A8\u51B3\u5B9A\uFF0C\u4E0D\u53EF\u6539\u540D/\u5220\u9664\uFF09\uFF1B\u81EA\u5B9A\u4E49\u6807\u7B7E\u53EF\u589E\u6539\u5220\u3002"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-form", style: { marginBottom: 6 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-label", children: "\u65B0\u5EFA\u6807\u7B7E" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-form-acts", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: "nm2-input", style: { maxWidth: 240 }, placeholder: "\u6807\u7B7E\u540D", value: tagDraft.name, onChange: (e) => setTagDraft({ ...tagDraft, name: e.target.value }) }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  className: "nm2-btn primary",
                  disabled: busy || !tagDraft.name.trim(),
                  onClick: async () => {
                    const r = await act("/nio-memo/api/tags/create", { name: tagDraft.name }, "\u6807\u7B7E\u5DF2\u521B\u5EFA");
                    if (r) setTagDraft({ ...tagDraft, name: "" });
                  },
                  children: "\u65B0\u5EFA"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-grid", children: data.tags.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "div",
            {
              className: `nm2-card ${t.system ? "dflt sys" : "cstm"}`,
              onClick: t.system ? void 0 : () => openDetail({ kind: "tag", item: t }),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-card-head", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-card-name", children: t.name }),
                  t.system ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nm2-tag origin-default", children: "\u7CFB\u7EDF" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nm2-tag user", children: "\u81EA\u5B9A\u4E49" })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-path", children: [
                  "\u4F7F\u7528\u4E2D ",
                  t.count,
                  " \u5F20",
                  t.system ? "\uFF08\u6309\u5361\u7247\u6765\u6E90\u7EDF\u8BA1\uFF09" : ""
                ] }),
                t.system ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-detail-acts", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "nm2-btn", disabled: busy, onClick: (e) => {
                    e.stopPropagation();
                    setTagDraft({ ...tagDraft, renameId: t.id, renameName: t.name });
                  }, children: "\u6539\u540D" }),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "nm2-btn danger", disabled: busy, onClick: (e) => {
                    e.stopPropagation();
                    if (!window.confirm(`\u5220\u9664\u6807\u7B7E\u300C${t.name}\u300D\uFF1F\uFF08\u5361\u7247\u672C\u8EAB\u4E0D\u5220\uFF0C\u53EA\u89E3\u9664\u8BE5\u6807\u7B7E\uFF09`)) return;
                    void act("/nio-memo/api/tags/delete", { id: t.id }, "\u6807\u7B7E\u5DF2\u5220\u9664");
                  }, children: "\u5220\u9664" })
                ] })
              ]
            },
            t.id
          )) }),
          tagDraft.renameId ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-form", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-label", children: "\u6539\u6807\u7B7E\u540D" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-form-acts", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: "nm2-input", style: { maxWidth: 240 }, value: tagDraft.renameName, onChange: (e) => setTagDraft({ ...tagDraft, renameName: e.target.value }) }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  className: "nm2-btn primary",
                  disabled: busy || !tagDraft.renameName.trim(),
                  onClick: async () => {
                    const r = await act("/nio-memo/api/tags/rename", { id: tagDraft.renameId, name: tagDraft.renameName }, "\u6807\u7B7E\u5DF2\u6539\u540D");
                    if (r) setTagDraft({ name: "", renameId: 0, renameName: "" });
                  },
                  children: "\u4FDD\u5B58"
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "nm2-btn", disabled: busy, onClick: () => setTagDraft({ ...tagDraft, renameId: 0, renameName: "" }), children: "\u53D6\u6D88" })
            ] })
          ] }) : null
        ] })
      ] })
    ] }),
    menu ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-menu-mask", onClick: () => setMenu(null) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-menu", style: { left: menu.x, top: menu.y }, onClick: (e) => e.stopPropagation(), children: menu.type === "card" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => {
          const c = menu.card;
          setMenu(null);
          openDetail({ kind: "card", item: c });
        }, children: "\u6253\u5F00" }),
        !isIndexOnly(menu.card.state) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => {
          const c = menu.card;
          setMenu(null);
          void act(c.state === "rule" ? "/nio-memo/api/demote" : "/nio-memo/api/promote", { id: c.id });
        }, children: menu.card.state === "rule" ? "\u964D\u4E3A\u5907\u5FD8" : "\u7ACB\u4E3A\u89C4\u77E9" }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => {
          const c = menu.card;
          setMenu(null);
          setTagModal({ card: c, selected: c.tags.map((t) => t.id).filter((id) => userTags.some((t) => t.id === id)) });
        }, children: "\u6253\u6807" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => {
          const c = menu.card;
          setMenu(null);
          void act("/nio-memo/api/touch", { id: c.id }, "\u5DF2\u66F4\u65B0\u4FEE\u6539\u65F6\u95F4");
        }, children: "\u66F4\u65B0" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => {
          const c = menu.card;
          setMenu(null);
          void act("/nio-memo/api/copy", { id: c.id }, "\u5DF2\u590D\u5236");
        }, children: "\u590D\u5236" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "danger", onClick: () => {
          const c = menu.card;
          setMenu(null);
          void act("/nio-memo/api/delete", { id: c.id }, "\u5DF2\u79FB\u5165\u56DE\u6536\u7AD9");
        }, children: "\u5220\u9664" })
      ] }) : menu.levels.map((l) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { onClick: () => {
        const m = menu;
        setMenu(null);
        void act("/nio-memo/api/perm/current", { kind: m.kind, id: m.id, levelId: l.id }).then((r) => {
          if (r) flash(`\u5DF2\u5207\u5230\u300C${l.name}\u300D \xB7 \u4E0B\u4E00\u8F6E\u751F\u6548\uFF08agent \u672C\u8F6E\u770B\u4E0D\u5230\uFF09`);
        });
      }, children: [
        l.id === menu.currentId ? "\u2713 " : "",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dot, { color: l.color }),
        " ",
        l.name
      ] }, l.id)) })
    ] }) : null,
    tagModal ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-mask", onClick: () => setTagModal(null), children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-modal", onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-modal-head", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("b", { children: [
        "\u7ED9\u300C",
        tagModal.card.name,
        "\u300D\u6253\u6807"
      ] }) }),
      tagPicker(tagModal.selected, (id) => setTagModal({
        ...tagModal,
        selected: tagModal.selected.includes(id) ? tagModal.selected.filter((x) => x !== id) : [...tagModal.selected, id]
      })),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-modal-foot", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            className: "nm2-btn primary",
            disabled: busy,
            onClick: async () => {
              const r = await act("/nio-memo/api/card/tags", { id: tagModal.card.id, tagIds: tagModal.selected }, "\u6807\u7B7E\u5DF2\u66F4\u65B0");
              if (r) setTagModal(null);
            },
            children: "\u4FDD\u5B58"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "nm2-btn", onClick: () => setTagModal(null), children: "\u53D6\u6D88" })
      ] })
    ] }) }) : null
  ] });
}
function TagDetail({ tag, cards, busy, onBatch, onOpen }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-doc-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: tag.name }),
      tag.system ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nm2-tag origin-default", children: "\u7CFB\u7EDF\u6807\u7B7E \xB7 \u4E0D\u53EF\u6539\u5220" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nm2-tag user", children: "\u81EA\u5B9A\u4E49\u6807\u7B7E" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-help", children: [
      "\u4E0B\u9762\u5217\u51FA\u8BE5\u6807\u7B7E\u4E0B\u7684\u5361\u7247\uFF08\u5F53\u524D ",
      cards.length,
      " \u5F20\uFF1A\u70B9\u5361\u7247\u53EF\u770B\u5185\u9875\uFF09\u3002\u6279\u91CF\u64CD\u4F5C\u53EA\u4F5C\u7528\u4E8E\u8FD9\u4E9B\u5361\u7247\u3002"
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-detail-acts", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "nm2-btn", disabled: busy, onClick: () => void onBatch("state", "rule"), children: "\u6279\u91CF\u8F6C\u4E3A\u52A8\u6001\u89C4\u77E9" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "nm2-btn", disabled: busy, onClick: () => void onBatch("state", "memo"), children: "\u6279\u91CF\u8F6C\u4E3A\u5907\u5FD8" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "nm2-btn", disabled: busy, onClick: () => void onBatch("enable"), children: "\u6279\u91CF\u542F\u7528" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "nm2-btn", disabled: busy, onClick: () => void onBatch("disable"), children: "\u6279\u91CF\u505C\u7528" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "nm2-btn danger", disabled: busy, onClick: () => void onBatch("delete"), children: "\u6279\u91CF\u5220\u9664" })
    ] }),
    cards.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-empty", children: "\u8BE5\u6807\u7B7E\u4E0B\u6682\u65E0\u5361\u7247\u3002" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-grid", children: cards.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        className: `nm2-card ${c.origin === "default" ? "dflt" : "cstm"}${c.enabled ? "" : " off"}`,
        onClick: () => onOpen(c),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-card-name", children: c.name }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "nm2-path", children: c.path }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "nm2-card-foot", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OriginTag, { origin: c.origin }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nm2-tag", children: STATE_LABEL[c.state] ?? "\u5907\u5FD8" }),
            c.enabled ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nm2-tag", children: "\u5DF2\u505C\u7528" }),
            c.tags.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "nm2-tag user", children: t.name }, t.id))
          ] })
        ]
      },
      c.id
    )) })
  ] });
}
function apply(ctx) {
  injectCss();
  ctx.slots.inject("conversation.view", () => ctx.slots.register({
    name: "conversation.view",
    id: "nio-memo",
    order: 61,
    label: () => "\u624B\u8BB0"
  }, HandnoteTabView));
}
return module.exports; } });
