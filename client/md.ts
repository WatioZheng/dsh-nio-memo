/**
 * md.ts — 极简 Markdown 块解析（纯函数，零依赖，可单测）。
 *
 * 支持：标题(#~####) / 段落 / 列表(- * 1.) / 引用(>) / 代码围栏(```) / 分隔线(---) / 表格(| |)
 * 设计纪律：**任何输入都必须推进 i**（空转＝页面卡死→正文空白），故段落收集为空时也强制消费一行。
 */
export type MdBlock =
  | { type: "h"; level: number; text: string }
  | { type: "p"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string }
  | { type: "code"; text: string }
  | { type: "hr" }
  | { type: "table"; head: string[]; rows: string[][] };

/** 行内标记：粗体 / 行内码 / 链接 */
export type InlineToken =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "code"; text: string }
  | { type: "link"; text: string; href: string };

const LIST_RE = /^\s*([-*]|\d+\.)\s+/;
const HEAD_RE = /^(#{1,4})\s+(.*)$/;
/** 「块起始」判据——与上面各分支必须严格一致，否则会空转 */
function isBlockStart(line: string): boolean {
  return HEAD_RE.test(line)
    || /^```/.test(line)
    || /^---+\s*$/.test(line)
    || /^>\s?/.test(line)
    || /^\s*\|/.test(line)
    || LIST_RE.test(line);
}

export function inlineTokens(text: string): InlineToken[] {
  const out: InlineToken[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
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

function splitRow(line: string): string[] {
  const t = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return t.split("|").map((s) => s.trim());
}

const TABLE_SEP_RE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

export function parseMd(src: string): MdBlock[] {
  const lines = String(src ?? "").replace(/\r\n?/g, "\n").split("\n");
  const blocks: MdBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // 代码围栏
    if (/^```/.test(line)) {
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i += 1; }
      if (i < lines.length) i += 1; // 消费收尾围栏
      blocks.push({ type: "code", text: buf.join("\n") });
      continue;
    }

    // 标题
    const h = HEAD_RE.exec(line);
    if (h) {
      blocks.push({ type: "h", level: h[1].length, text: h[2] });
      i += 1;
      continue;
    }

    // 分隔线
    if (/^---+\s*$/.test(line)) { blocks.push({ type: "hr" }); i += 1; continue; }

    // 表格（当前行含 |，且下一行是分隔行）
    if (/^\s*\|/.test(line) && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1])) {
      const head = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(splitRow(lines[i])); i += 1; }
      blocks.push({ type: "table", head, rows });
      continue;
    }

    // 引用
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, "")); i += 1; }
      blocks.push({ type: "quote", text: buf.join(" ") });
      continue;
    }

    // 列表
    if (LIST_RE.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && LIST_RE.test(lines[i])) {
        items.push(lines[i].replace(LIST_RE, ""));
        i += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    // 空行
    if (!line.trim()) { i += 1; continue; }

    // 段落：收集到下一个块起始为止；**空收集时强制消费一行**（防空转＝防正文空白）
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) { buf.push(lines[i]); i += 1; }
    if (!buf.length) { buf.push(lines[i]); i += 1; }
    blocks.push({ type: "p", text: buf.join(" ") });
  }
  return blocks;
}

/** 供测试/校验：把块拍平成纯文本（含表格），用于「内容有没有被吞」的对比 */
export function blocksToText(blocks: MdBlock[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.type === "h" || b.type === "p" || b.type === "quote" || b.type === "code") out.push(b.text);
    else if (b.type === "list") out.push(...b.items);
    else if (b.type === "table") out.push(b.head.join(" "), ...b.rows.map((r) => r.join(" ")));
  }
  return out.join("\n");
}
