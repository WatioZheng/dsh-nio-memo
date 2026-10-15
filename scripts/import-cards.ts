/**
 * import-cards.ts — 把 .nio-memory/记忆卡片 下的**手记卡**全量导入 nio-memo。
 *
 * 规则（用户 2026-10-15）：
 *   • 只导手记卡（各层「手记卡」目录下的 .md），不碰角色卡/技能卡
 *   • 全部为**自定义**（origin=custom），落「备忘」区
 *   • 新建两个标签：`通用`（核心通用/PI通用 层）·  `dsh`（DSH通用 层）；本机层不带标签
 *   • 已存在的同名卡：若是此前的样板默认卡 → 转为自定义并补标签；否则跳过（显式列出）
 *
 * 幂等：重复跑只补未导入的卡；先备份库文件。
 * 跑法：cd /path/to/dsh-checkout && node --import tsx/esm /path/to/nio-memo/scripts/import-cards.ts
 */
import * as nodeFs from "node:fs";
import * as nodeOs from "node:os";
import * as nodePath from "node:path";
import { fileURLToPath } from "node:url";
import type { DatabaseSync } from "node:sqlite";

import { openMemoDb, createCard, createTag, listTags, setCardTags, listCards } from "../src/db";

/** 备份保留策略：同一库只留最近 5 份 .bak-*，避免无限增长 */
function pruneBackups(dbFile: string, keep = 5): void {
  const dir = nodePath.dirname(dbFile);
  const base = nodePath.basename(dbFile) + ".bak-";
  const olds = nodeFs.readdirSync(dir)
    .filter((f) => f.startsWith(base))
    .sort()
    .slice(0, -keep);
  for (const f of olds) {
    try { nodeFs.unlinkSync(nodePath.join(dir, f)); console.log(`  （清理旧备份 ${f}）`); } catch { /* 忽略 */ }
  }
}


const CARDS_ROOT = "/path/to/workspace/.nio-memory/记忆卡片";

/** 目录 → 标签（null = 不带标签） */
const SOURCES: Array<{ dir: string; tag: string | null }> = [
  { dir: "通用/核心通用/手记卡", tag: "通用" },
  { dir: "通用/PI通用/手记卡", tag: "通用" },
  { dir: "通用/DSH通用/手记卡", tag: "dsh" },
  { dir: "本机/手记卡", tag: null },
];

/**
 * 内容/来源覆盖（幂等重跑也生效）：
 * - 用户 2026-10-15：把「DSH重启方式」通用化（去掉主机专属细节），并把「是否同意重启」摘出为权限卡
 * - 来源改为「默认」：官方维护的通用卡
 */
const SCRIPT_DIR = nodePath.dirname(fileURLToPath(import.meta.url));
const CARD_CONTENT_OVERRIDES: Record<string, string> = {
  DSH重启方式: nodePath.join(SCRIPT_DIR, "../content/cards/DSH重启方式.md"),
};
const CARD_ORIGIN_OVERRIDES: Record<string, "default" | "custom"> = {
  DSH重启方式: "default",
};

/** 关键词派生：卡名 +「场景」行里的标签词 + 首标题（去重，最多 6 个） */
function deriveKeywords(name: string, content: string): string[] {
  const out: string[] = [name];
  const m = content.match(/^>\s*场景[：:](.*)$/m);
  if (m) {
    for (const seg of m[1].split(/[、，,；;]/)) {
      let t = seg.replace(/\*\*/g, "").trim();
      t = t.replace(/^(涉及|当|遇到|在)/, "").replace(/(时命中本卡|时使用|时|等)。?$/, "").trim();
      if (t && t.length <= 18) out.push(t);
    }
  }
  const h = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (h && h !== name) out.push(h);
  return [...new Set(out.map((s) => s.trim()).filter(Boolean))].slice(0, 6);
}

const dir = process.env.NIO_MEMO_DIR?.trim()
  || nodePath.join(process.env.DSH_HOME?.trim() || nodePath.join(nodeOs.homedir(), ".dsh"), "nio-memo");
const dbFile = nodePath.join(dir, "memo.db");
if (!nodeFs.existsSync(dbFile)) { console.error(`✗ 库不存在：${dbFile}`); process.exit(1); }
const bak = `${dbFile}.bak-${Math.floor(Date.now() / 1000)}`;
nodeFs.copyFileSync(dbFile, bak);
console.log(`已备份 → ${bak}`);
pruneBackups(dbFile);

const db: DatabaseSync = openMemoDb();
const tagIdOf = new Map<string, number>();
for (const name of ["通用", "dsh"]) {
  let t = listTags(db).find((x) => x.name === name);
  if (!t) t = createTag(db, name);
  tagIdOf.set(name, t.id);
}
console.log(`标签就绪：通用=${tagIdOf.get("通用")} · dsh=${tagIdOf.get("dsh")}`);

const added: string[] = [];
const converted: string[] = [];
const skipped: string[] = [];
const untagged: string[] = [];
let files = 0;

for (const src of SOURCES) {
  const abs = nodePath.join(CARDS_ROOT, src.dir);
  if (!nodeFs.existsSync(abs)) { console.log(`（跳过不存在的目录：${src.dir}）`); continue; }
  const names = nodeFs.readdirSync(abs).filter((f) => f.endsWith(".md")).sort();
  for (const f of names) {
    files += 1;
    const name = f.replace(/\.md$/, "");
    const content = nodeFs.readFileSync(nodePath.join(abs, f), "utf8").trim();
    const keywords = deriveKeywords(name, content);
    const ovFile = CARD_CONTENT_OVERRIDES[name];
    const finalContent = ovFile ? nodeFs.readFileSync(ovFile, "utf8").trim() : content;
    const forcedOrigin = CARD_ORIGIN_OVERRIDES[name];
    // 重名检查必须覆盖**回收站**里的卡（UNIQUE 作用于全部行），否则会撞约束中断整轮导入
    const anyRow = db.prepare(`SELECT id, deleted_at FROM cards WHERE name = ?`).get(name) as any;
    if (anyRow && anyRow.deleted_at) {
      skipped.push(`${name}（同名卡在回收站，跳过；需要的话先恢复或彻底清除）`);
      continue;
    }
    const existing = listCards(db).find((c) => c.name === name);
    const tagIds = src.tag ? [tagIdOf.get(src.tag)!] : [];

    if (existing) {
      if (ovFile || forcedOrigin) {
        const contentChanged = ovFile ? existing.content !== finalContent : false;
        const originChanged = forcedOrigin ? existing.origin !== forcedOrigin : false;
        if (contentChanged || originChanged) {
          db.prepare(`UPDATE cards SET content = ?, origin = ?, updated_at = ?, version = version + 1 WHERE id = ?`)
            .run(finalContent, forcedOrigin ?? existing.origin, new Date().toISOString(), existing.id);
        }
        if (tagIds.length) setCardTags(db, existing.id, [...new Set([...existing.tags.map((t) => t.id), ...tagIds])]);
        converted.push(`${name}（覆盖检查：内容${contentChanged ? "已更新" : "无变化"}${originChanged ? " / 来源→" + (forcedOrigin ?? "") : ""}）`);
        continue;
      }
      if (existing.origin === "default") {
        // 此前的样板默认卡 → 按本次口径转为自定义并补标签
        db.prepare(`UPDATE cards SET origin = 'custom', updated_at = ? WHERE id = ?`).run(new Date().toISOString(), existing.id);
        if (tagIds.length) setCardTags(db, existing.id, [...new Set([...existing.tags.map((t) => t.id), ...tagIds])]);
        converted.push(`${name}（默认→自定义${src.tag ? " +" + src.tag : ""}）`);
      } else {
        // 已是自定义 → 只补标签
        if (tagIds.length) {
          const merged = [...new Set([...existing.tags.map((t) => t.id), ...tagIds])];
          setCardTags(db, existing.id, merged);
          skipped.push(`${name}（已存在，补标签 ${src.tag}）`);
        } else {
          skipped.push(`${name}（已存在，跳过）`);
        }
      }
      continue;
    }

    createCard(db, { name, keywords, content: finalContent, tagIds });
    if (src.tag) added.push(`${name}[${src.tag}]`);
    else { added.push(`${name}`); untagged.push(name); }
  }
}

const all = listCards(db);
console.log(`\n扫描手记卡 ${files} 张`);
console.log(`新增 ${added.length} 张 · 转换为自定义 ${converted.length} 张 · 已存在处理 ${skipped.length} 张`);
console.log(`库现状：共 ${all.length} 张（默认 ${all.filter((c) => c.origin === "default").length} · 自定义 ${all.filter((c) => c.origin === "custom").length}）`);
console.log(`无标签（本机层）：${untagged.length} 张`);
if (converted.length) console.log(`\n转换：\n  ${converted.join("\n  ")}`);
if (skipped.length) console.log(`\n已存在：\n  ${skipped.join("\n  ")}`);
