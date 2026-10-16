/**
 * export-cards.ts — 把本地手记库（memo.db）按标签**单向导出**为卡片内容仓。
 *
 * 真源永远是本地库；本脚本只读库、只写 <out> 目录，仓库只是产物。
 *
 * 路由口径（fail-closed，优先级从上到下）：
 *   ① 带标签「本机」            → 不导出（最高优先，显式排除）
 *   ② origin=default           → public 与 internal 都导出
 *   ③ 带标签「通用」或「dsh」   → 只导出到 internal
 *   ④ 其余（自定义且无标签）    → 不导出（fail-closed，未分类就不外发）
 * 停用卡（enabled=0）不导出，但会显式报出被跳过的张数（禁止静默）。
 *
 * 跑法：
 *   cd <DSH 检出> && node --import tsx/esm <插件>/scripts/export-cards.ts --target public   --out <目录>
 *   cd <DSH 检出> && node --import tsx/esm <插件>/scripts/export-cards.ts --target internal --out <目录>
 */
import * as nodeFs from "node:fs";
import * as nodePath from "node:path";
import { DatabaseSync } from "node:sqlite";

const TARGETS = ["public", "internal"] as const;
type Target = (typeof TARGETS)[number];

const TAG_BENJI = "本机";
const TAG_COMMON = "通用";
const TAG_DSH = "dsh";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const target = (arg("target") ?? "") as Target;
const out = arg("out");
if (!TARGETS.includes(target)) {
  console.error(`✗ --target 必填，且只能是 ${TARGETS.join(" / ")}`);
  process.exit(1);
}
if (!out) {
  console.error("✗ --out 必填（导出目录）");
  process.exit(1);
}

const DB_DIR = process.env.NIO_MEMO_DIR?.trim() || nodePath.join(process.env.HOME || "/root", ".dsh/nio-memo");
const dbFile = nodePath.join(DB_DIR, "memo.db");
if (!nodeFs.existsSync(dbFile)) {
  console.error(`✗ 手记库不存在：${dbFile}（可用 NIO_MEMO_DIR 覆盖）`);
  process.exit(1);
}
const db = new DatabaseSync(dbFile, { readOnly: true });

interface Row {
  id: number; name: string; keywords: string; path: string; state: string;
  enabled: number; origin: string; content: string; version: number; updated_at: string;
}

const rows = db.prepare(
  `SELECT id,name,keywords,path,state,enabled,origin,content,version,updated_at
   FROM cards WHERE deleted_at IS NULL ORDER BY state, name`,
).all() as unknown as Row[];

const tagsOf = new Map<number, string[]>();
for (const r of db.prepare(
  `SELECT ct.card_id id, t.name name FROM card_tags ct JOIN tags t ON t.id=ct.tag_id`,
).all() as unknown as Array<{ id: number; name: string }>) {
  const arr = tagsOf.get(r.id) ?? [];
  arr.push(r.name);
  tagsOf.set(r.id, arr);
}

type Verdict = { keep: boolean; why: string };
function route(c: Row, tags: string[]): Verdict {
  if (tags.includes(TAG_BENJI)) return { keep: false, why: `标签「${TAG_BENJI}」→ 不外发` };
  const isDefault = c.origin === "default";
  const isShared = tags.includes(TAG_COMMON) || tags.includes(TAG_DSH);
  if (isDefault) return { keep: true, why: "默认卡 → public + internal" };
  if (isShared) return { keep: target === "internal", why: `标签「${tags.filter((t) => t === TAG_COMMON || t === TAG_DSH).join("/")}」→ 仅 internal` };
  return { keep: false, why: "自定义且无标签 → 未分类，不外发（fail-closed）" };
}

/** YAML 标量：一律加引号并转义，避免卡名里的中文括号 / 冒号破坏解析 */
const y = (s: string) => `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
const yArr = (a: string[]) => `[${a.map(y).join(", ")}]`;

/**
 * 剥掉卡尾的「分发标注」块（`📦 通用记忆…` / `来源：…` / `⚠ 本卡含原主机举例…` 及其前置 `---`）。
 * 这些标注在本地库里有意义（标明由 tongyong-jiyi 分发、本机勿改），但**不该出现在发布产物**里；
 * 本地库保持原样，只在导出时归一化。
 */
function stripFooter(md: string): { text: string; stripped: boolean } {
  const lines = md.replace(/\s+$/, "").split("\n");
  const isFooter = (l: string) => /^>\s*(📦|来源：|⚠\s*本卡含)/.test(l.trim());
  let n = 0;
  while (lines.length) {
    const last = lines[lines.length - 1].trim();
    if (last === "---" || isFooter(last)) { lines.pop(); n += 1; } else break;
  }
  return { text: lines.join("\n").replace(/\s+$/, "") + "\n", stripped: n > 0 };
}

const picked: Array<{ c: Row; tags: string[] }> = [];
const skipped: Array<{ c: Row; why: string }> = [];
let disabledSkipped = 0;

for (const c of rows) {
  const tags = tagsOf.get(c.id) ?? [];
  const v = route(c, tags);
  if (!v.keep) { skipped.push({ c, why: v.why }); continue; }
  if (Number(c.enabled) !== 1) { disabledSkipped += 1; continue; }
  picked.push({ c, tags });
}

const cardsDir = nodePath.join(out, "cards");
nodeFs.rmSync(cardsDir, { recursive: true, force: true });
nodeFs.mkdirSync(cardsDir, { recursive: true });

let strippedCount = 0;
for (const { c, tags } of picked) {
  const { text, stripped } = stripFooter(c.content);
  if (stripped) strippedCount += 1;
  const fm = [
    "---",
    `name: ${y(c.name)}`,
    `state: ${y(c.state)}`,
    `origin: ${y(c.origin)}`,
    `tags: ${yArr([...tags].sort())}`,
    `keywords: ${yArr(JSON.parse(c.keywords || "[]"))}`,
    `version: ${c.version}`,
    `updated: ${y(c.updated_at)}`,
    `source_path: ${y(c.path)}`,
    "---",
    "",
  ].join("\n");
  nodeFs.writeFileSync(nodePath.join(cardsDir, `${c.name}.md`), fm + text, "utf8");
}

const now = new Date().toISOString();
const index = [
  `# 卡片内容仓（${target}）`,
  "",
  `> 本目录由 \`scripts/export-cards.ts\` 从本地手记库**单向导出**生成，请勿手改——改了下次导出会覆盖。`,
  `> 导出时间：${now}　｜　卡片数：**${picked.length}**`,
  "",
  "## 路由口径（fail-closed，自上而下）",
  "",
  "1. 标签「本机」→ **不导出**",
  "2. `origin=default` → public 与 internal 都导出",
  "3. 标签「通用」或「dsh」→ 只导出到 internal",
  "4. 其余（自定义且无标签）→ **不导出**（未分类不外发）",
  "",
  "## 包含的卡片",
  "",
  "| 卡名 | 区 | 来源 | 标签 |",
  "|---|---|---|---|",
  ...[...picked].map(({ c, tags }) => `| ${c.name} | ${c.state} | ${c.origin} | ${tags.filter((t) => !["默认", "自定义"].includes(t)).join("、") || "—"} |`),
  "",
];
nodeFs.writeFileSync(nodePath.join(out, "README.md"), index.join("\n"), "utf8");

console.log(`✓ target=${target} → ${out}`);
console.log(`  导出 ${picked.length} 张；停用跳过 ${disabledSkipped} 张；未导出 ${skipped.length} 张；剥离内部来源标注 ${strippedCount} 张`);
for (const { c, why } of skipped) console.log(`    · 不导出：${c.name}（${why}）`);
