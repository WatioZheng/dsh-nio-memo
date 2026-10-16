/**
 * import-roles-exps.ts — 把旧「记忆卡片」（已退役、只读归档）里的
 * **角色卡 → 角色（state=role）**、**技能卡 → 经验卡（state=exp）** 迁移到 nio-memo。
 *
 * 规则（用户 2026-10-15，见工单 nio-memo/T8）：
 *   • 角色卡 9 张（核心通用 5 + 本机 4）→ state='role'
 *   • 技能卡 5 张（核心通用 4 + 本机 1）→ state='exp'；**跳过 `技能卡/README.md`**（那是目录说明）
 *   • 全部 origin=custom；层 → 标签：核心通用 → `通用`；本机 → 不打标签（沿用既有导入口径）
 *   • **自动补绑**：只按「角色正文逐字出现某张经验卡的卡名」绑定（不臆造）
 *   • **路径修正**：正文里的旧路径 `[角色/]技能卡/X.md`、`.nio-memory/记忆卡片/技能卡/X.md`
 *     一律改写为 `经验/X.md`（只改路径引用，不改正文措辞）
 *
 * 幂等：同名卡已存在则跳过创建（并如实报出"已存在"），绑定为**并入式**（不覆盖已有绑定）。
 * 预演：`--dry` 只打印将要做什么，不写库、不备份。
 * 跑法：cd <DSH 检出> && NIO_MEMO_IMPORT_CARDS=<旧记忆卡片目录> node --import tsx/esm <插件目录>/scripts/import-roles-exps.ts [--dry]
 */
import * as nodeFs from "node:fs";
import * as nodeOs from "node:os";
import * as nodePath from "node:path";
import { fileURLToPath } from "node:url";
import type { DatabaseSync } from "node:sqlite";

import { openMemoDb, createCard, createTag, listTags, setCardTags, listCards, setRoleExps, listRoleExps } from "../src/db";

const CARDS_ROOT = process.env.NIO_MEMO_IMPORT_CARDS?.trim();
if (!CARDS_ROOT) {
  console.error("✗ 请用 NIO_MEMO_IMPORT_CARDS=<旧「记忆卡片」目录> 指定迁移源（该体系已退役，需指向归档解包目录）。");
  process.exit(1);
}
const DRY = process.argv.includes("--dry");

interface Src { dir: string; tag: string | null; state: "role" | "exp"; label: string }
const SOURCES: Src[] = [
  { dir: "通用/核心通用/角色卡", tag: "通用", state: "role", label: "角色 · 核心通用" },
  { dir: "本机/角色卡", tag: null, state: "role", label: "角色 · 本机" },
  { dir: "通用/核心通用/技能卡", tag: "通用", state: "exp", label: "经验卡 · 核心通用" },
  { dir: "本机/技能卡", tag: null, state: "exp", label: "经验卡 · 本机" },
];
/** 不是卡片的文件（目录说明等），一律排除 */
const SKIP_FILES = new Set(["README.md"]);

/** 旧路径 → 新路径（只动路径引用） */
function rewritePaths(s: string): string {
  return s.replace(/(?:\.nio-memory\/记忆卡片\/|角色\/)?技能卡\//g, "经验/");
}

/** 关键词派生：卡名 +「> 一句话/场景」行 + 首标题（去重，最多 6 个） */
function deriveKeywords(name: string, content: string): string[] {
  const out: string[] = [name];
  const m = content.match(/^>\s*(?:场景|一句话)[：:](.*)$/m);
  if (m) {
    for (const seg of m[1].split(/[、，,；;]/)) {
      let t = seg.replace(/\*\*/g, "").replace(/^[^*]{0,20}?：/, "").trim();
      t = t.replace(/[（(].*?[)）]/g, "").trim();
      if (t && t.length <= 18) out.push(t);
    }
  }
  const h = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (h && h !== name) out.push(h);
  return [...new Set(out.map((x) => x.trim()).filter(Boolean))].slice(0, 6);
}

function pruneBackups(dbFile: string, keep = 5): void {
  const dir = nodePath.dirname(dbFile);
  const base = nodePath.basename(dbFile) + ".bak-";
  const olds = nodeFs.readdirSync(dir).filter((f) => f.startsWith(base)).sort().slice(0, -keep);
  for (const f of olds) {
    try { nodeFs.unlinkSync(nodePath.join(dir, f)); } catch { /* 忽略 */ }
  }
}

const dir = process.env.NIO_MEMO_DIR?.trim()
  || nodePath.join(process.env.DSH_HOME?.trim() || nodePath.join(nodeOs.homedir(), ".dsh"), "nio-memo");
const dbFile = nodePath.join(dir, "memo.db");
if (!nodeFs.existsSync(dbFile)) { console.error(`✗ 库不存在：${dbFile}`); process.exit(1); }

if (!DRY) {
  const bak = `${dbFile}.bak-${Math.floor(Date.now() / 1000)}`;
  nodeFs.copyFileSync(dbFile, bak);
  pruneBackups(dbFile);
  console.log(`已备份 → ${bak}`);
} else {
  console.log("【预演模式 --dry】不写库、不备份");
}

const db: DatabaseSync = openMemoDb();
const tagIdOf = new Map<string, number>();
if (!DRY) {
  for (const name of ["通用"]) {
    let t = listTags(db).find((x) => x.name === name);
    if (!t) t = createTag(db, name);
    tagIdOf.set(name, t.id);
  }
} else {
  const t = listTags(db).find((x) => x.name === "通用");
  if (t) tagIdOf.set("通用", t.id);
}

const before = listCards(db);
console.log(`迁移前：共 ${before.length} 张（备忘 ${before.filter((c) => c.state === "memo").length} · 规矩 ${before.filter((c) => c.state === "rule").length} · 角色 ${before.filter((c) => c.state === "role").length} · 经验 ${before.filter((c) => c.state === "exp").length}）`);

const addedRole: string[] = [];
const addedExp: string[] = [];
const existed: string[] = [];
const rewrites: string[] = [];
const danglingReadme: string[] = [];
/** 预演用：只存在于源文件、尚未入库的卡 */
const pending: Array<{ name: string; state: "role" | "exp"; content: string }> = [];

for (const src of SOURCES) {
  const abs = nodePath.join(CARDS_ROOT, src.dir);
  if (!nodeFs.existsSync(abs)) { console.log(`（跳过不存在的目录：${src.dir}）`); continue; }
  const names = nodeFs.readdirSync(abs).filter((f) => f.endsWith(".md")).sort();
  for (const f of names) {
    if (SKIP_FILES.has(f)) { console.log(`（按规则排除：${src.dir}/${f}）`); continue; }
    const name = f.replace(/\.md$/, "");
    const raw = nodeFs.readFileSync(nodePath.join(abs, f), "utf8").trim();
    const content = rewritePaths(raw);
    const changed = content !== raw;
    if (changed) {
      rewrites.push(`${name}（${src.label}）`);
      if (raw.includes("技能卡/README.md")) danglingReadme.push(name);
    }
    const existing = listCards(db, undefined, { deleted: true }).find((c) => c.name === name);
    if (existing) {
      existed.push(`${name}（已存在，state=${existing.state}${existing.state !== src.state ? ` ⚠ 与目标 ${src.state} 不同，未改动` : ""}）`);
      continue;
    }
    if (DRY) {
      pending.push({ name, state: src.state, content });
      (src.state === "role" ? addedRole : addedExp).push(`${name}${src.tag ? `[${src.tag}]` : ""}（预演）`);
      continue;
    }
    const keywords = deriveKeywords(name, content);
    const tagIds = src.tag ? [tagIdOf.get(src.tag)!] : [];
    createCard(db, { name, keywords, content, tagIds }, src.state);
    (src.state === "role" ? addedRole : addedExp).push(`${name}${src.tag ? `[${src.tag}]` : ""}`);
    if (changed) {
      // 记一笔改写量，便于交付核对
      void 0;
    }
  }
}

// ── 自动补绑：只按「角色正文逐字出现经验卡名」 ──
// 预演模式用**源文件**预测（卡还没入库，读库读不到）
const all = DRY ? [] : listCards(db);
const roles = DRY
  ? pending.filter((p) => p.state === "role").map((p) => ({ name: p.name, id: -1, content: p.content }))
  : all.filter((c) => c.state === "role");
const exps = DRY
  ? pending.filter((p) => p.state === "exp").map((p) => ({ name: p.name, id: -1 }))
  : all.filter((c) => c.state === "exp");
const bindings: Array<{ role: string; matched: string[]; total: number }> = [];
for (const r of roles) {
  const matched = exps.filter((e) => r.content.includes(e.name)).map((e) => e.id);
  const cur = DRY ? [] : listRoleExps(db, r.id).map((x) => x.id);
  const union = [...new Set([...cur, ...matched])];
  if (matched.length) {
    if (!DRY) setRoleExps(db, r.id, union);
    // 预演模式 id 全为 -1，union 会被 Set 去重 ⇒ 计数改用 matched/cur 长度
    bindings.push({ role: r.name, matched: exps.filter((e) => r.content.includes(e.name)).map((e) => e.name), total: DRY ? cur.length + matched.length : union.length });
  }
}

const after = listCards(db);
console.log(`\n新增：角色 ${addedRole.length} 张 · 经验卡 ${addedExp.length} 张 · 已存在跳过 ${existed.length} 张`);
console.log(`  角色：${addedRole.join("、") || "（无）"}`);
console.log(`  经验：${addedExp.join("、") || "（无）"}`);
if (existed.length) console.log(`已存在：\n  ${existed.join("\n  ")}`);
console.log(`\n自动补绑（按"角色正文逐字出现经验卡名"）：`);
for (const b of bindings) console.log(`  ${b.role} → ${b.matched.join("、")}（槽内共 ${b.total} 张）`);
const unbound = DRY
  ? roles.filter((r) => !bindings.some((b) => b.role === r.name)).map((r) => r.name)
  : roles.filter((r) => !listRoleExps(db, r.id).length).map((r) => r.name);
console.log(`  未绑定任何经验卡的角色：${unbound.join("、") || "（无）"}`);
console.log(`\n路径改写（旧 `+"`[角色/]技能卡/X.md`"+` → `+"`经验/X.md`"+`）共 ${rewrites.length} 张：${rewrites.join("、") || "（无）"}`);
if (danglingReadme.length) console.log(`  ⚠ 其中 ${danglingReadme.join("、")} 还引用了 `+"`技能卡/README.md`"+`（未迁移）⇒ 改写后仍为**悬空引用**`);
console.log(`\n迁移后：共 ${after.length} 张（备忘 ${after.filter((c) => c.state === "memo").length} · 规矩 ${after.filter((c) => c.state === "rule").length} · 角色 ${after.filter((c) => c.state === "role").length} · 经验 ${after.filter((c) => c.state === "exp").length}）`);
void fileURLToPath;
