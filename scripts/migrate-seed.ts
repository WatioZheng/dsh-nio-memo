/**
 * migrate-seed.ts — 把已存在的全局库对齐到当前 seed（幂等，可反复跑）。
 *
 * 做四件事（全部以 src/seed.ts 为唯一依据，不手抄文本）：
 *   ① 铁条例：按 title 更新正文（含「记忆卡片维护」改写）、缺失则补
 *   ② 动态规矩（SEED_RULES）：按 name 落为 state='rule'（存在则保状态、只更新正文）
 *   ③ 已被降级为动态规矩的旧条例：从 iron_clauses 移除（两者不再重复注入）
 *   ④ meta.seed_version 对齐
 *
 * 先备份，再事务内执行；失败回滚。
 * 跑法：cd /path/to/dsh-checkout && node --import tsx/esm /path/to/nio-memo/scripts/migrate-seed.ts
 */
import * as nodeFs from "node:fs";
import * as nodeOs from "node:os";
import * as nodePath from "node:path";
import { DatabaseSync } from "node:sqlite";

import { INDEX_NOTE, IRON_CLAUSES, SEED_RULES } from "../src/seed";

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


const dir = process.env.NIO_MEMO_DIR?.trim()
  || nodePath.join(process.env.DSH_HOME?.trim() || nodePath.join(nodeOs.homedir(), ".dsh"), "nio-memo");
const file = nodePath.join(dir, "memo.db");
if (!nodeFs.existsSync(file)) {
  console.error(`✗ 库不存在：${file}`);
  process.exit(1);
}

// ① 备份（改动前备份纪律）
const bak = `${file}.bak-${Math.floor(Date.now() / 1000)}`;
nodeFs.copyFileSync(file, bak);
console.log(`已备份 → ${bak}`);
pruneBackups(file);

const db = new DatabaseSync(file);
db.exec("PRAGMA busy_timeout = 5000;");

const now = new Date().toISOString();
const summary: string[] = [];
db.exec("BEGIN");
try {
  // ② 铁条例（支持条题改名：新题名找不到时按 legacy 映射就地改名，不新增一条）
  const LEGACY_TITLES: Record<string, string> = { '手记卡片维护': '记忆卡片维护' }
  for (const c of IRON_CLAUSES) {
    let cur = db.prepare(`SELECT id, title, content, path FROM iron_clauses WHERE title = ?`).get(c.title) as any;
    if (!cur && LEGACY_TITLES[c.title]) {
      const old = db.prepare(`SELECT id, title, content, path FROM iron_clauses WHERE title = ?`).get(LEGACY_TITLES[c.title]) as any;
      if (old) {
        db.prepare(`UPDATE iron_clauses SET title = ?, path = ?, content = ?, grp = ?, pos = ? WHERE id = ?`)
          .run(c.title, c.path, c.content, c.group, 0, old.id);
        summary.push(`✎ 条题改名：${old.title} → ${c.title}`);
        cur = { id: old.id, content: c.content };
      }
    }
    if (!cur) {
      db.prepare(`INSERT INTO iron_clauses (grp, title, path, content, pos) VALUES (?, ?, ?, ?, ?)`)
        .run(c.group, c.title, c.path, c.content, 999);
      summary.push(`+ 铁条例补入：${c.title}`);
    } else if (String(cur.content) !== c.content) {
      db.prepare(`UPDATE iron_clauses SET content = ?, grp = ?, path = ? WHERE id = ?`)
        .run(c.content, c.group, c.path, cur.id);
      summary.push(`~ 铁条例更新：${c.title}`);
    }
  }
  // ③ 动态规矩（内容/关键词/来源三件都对齐 seed）
  for (const r of SEED_RULES) {
    const origin = r.origin ?? "default";
    const cur = db.prepare(`SELECT id, content, keywords, state, origin FROM cards WHERE name = ?`).get(r.name) as any;
    if (!cur) {
      db.prepare(
        `INSERT INTO cards (name, keywords, path, state, enabled, content, created_at, updated_at, origin)
         VALUES (?, ?, ?, 'rule', 1, ?, ?, ?, ?)`,
      ).run(r.name, JSON.stringify(r.keywords), r.path, r.content, now, now, origin);
      summary.push(`+ 动态规矩立入（${origin}）：${r.name}`);
    } else {
      if (String(cur.content) !== r.content) {
        db.prepare(`UPDATE cards SET content = ?, updated_at = ? WHERE id = ?`).run(r.content, now, cur.id);
        summary.push(`~ 动态规矩内容更新：${r.name}`);
      }
      // 关键词为空才补（不覆盖使用者自己改过的关键词）
      const curKw = String(cur.keywords ?? "[]");
      if ((curKw === "[]" || curKw === "" || curKw === "null") && r.keywords?.length) {
        db.prepare(`UPDATE cards SET keywords = ?, updated_at = ? WHERE id = ?`).run(JSON.stringify(r.keywords), now, cur.id);
        summary.push(`+ 关键词补全：${r.name}`);
      }
      if (String(cur.origin) !== origin) {
        db.prepare(`UPDATE cards SET origin = ?, updated_at = ? WHERE id = ?`).run(origin, now, cur.id);
        summary.push(`± 来源调整 → ${origin}：${r.name}`);
      }
    }
  }
  // ④ 旧条例出库（已降级者不再重复注入）
  for (const r of SEED_RULES) {
    const n = db.prepare(`DELETE FROM iron_clauses WHERE title = ?`).run(r.name);
    if (Number(n.changes) > 0) summary.push(`- 铁条例移除（已降为动态规矩）：${r.name}`);
  }
  // ⑤ 索引说明与版本
  db.prepare(`INSERT INTO meta (key, value) VALUES ('index_note', ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(INDEX_NOTE);
  db.prepare(`INSERT INTO meta (key, value) VALUES ('seed_version', '2')
              ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run();
  db.exec("COMMIT");
} catch (e) {
  db.exec("ROLLBACK");
  console.error(`✗ 迁移失败已回滚：${String((e as Error)?.message || e)}`);
  process.exit(1);
}

const iron = db.prepare(`SELECT COUNT(*) AS n FROM iron_clauses`).get() as any;
const rules = db.prepare(`SELECT COUNT(*) AS n FROM cards WHERE state='rule'`).get() as any;
const memos = db.prepare(`SELECT COUNT(*) AS n FROM cards WHERE state='memo'`).get() as any;
console.log(summary.length ? summary.map((s) => `  ${s}`).join("\n") : "  （库已是最新，无变更）");
console.log(`库现状：铁条例 ${iron.n} · 动态规矩 ${rules.n} · 备忘卡 ${memos.n}（${file}）`);
