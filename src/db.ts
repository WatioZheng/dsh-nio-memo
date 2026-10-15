/**
 * db.ts — 微型库（node:sqlite，零依赖）。
 *
 * 表：
 *   iron_clauses  铁律条例（锁死：无编辑、无开关，全部每轮注入）
 *   cards         卡片：state = 'memo' | 'rule'；enabled 启停；origin 默认/自定义；deleted_at 软删除
 *   tags          标签（system=1 ＝ 系统自带「默认 / 自定义」，不可改名/删除）
 *   card_tags     卡片×标签
 *   meta          播种版本/索引说明等
 *
 * origin（默认/自定义）：
 *   'default' = 官方维护（提公共库只提取这部分）；'custom' = 使用者自建。功能一致，只用于排序/着色/抽取。
 *
 * 遍历式列迁移：老库自动补 origin / deleted_at，并一次性回填（meta.origin_v2）。
 */
import * as nodeFs from "node:fs";
import * as nodePath from "node:path";
import { DatabaseSync } from "node:sqlite";

import { memoDir, memoDbFile } from "./types";
import type { CardOrigin, CardState, CardTag, IronClause, MemoCard, Tag } from "./types";
import { INDEX_NOTE, IRON_CLAUSES, SAMPLE_CARDS, SEED_RULES } from "./seed";

const SEED_VERSION = "3";
const SYSTEM_TAGS = ["默认", "自定义"];

/** 打开（必要时初始化）全局手记库。失败显式抛错，不静默降级。 */
export function openMemoDb(dir?: string): DatabaseSync {
  const file = dir ? nodePath.join(dir, "memo.db") : memoDbFile();
  if (!dir) nodeFs.mkdirSync(memoDir(), { recursive: true });
  else nodeFs.mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
  ensureSchema(db);
  migrateColumns(db);
  seedIfNeeded(db);
  backfillOrigin(db);
  ensureSystemTags(db);
  migratePermissionsIntoEntities(db);
  return db;
}

function ensureSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS iron_clauses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grp TEXT NOT NULL,
      title TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      pos INTEGER NOT NULL DEFAULT 0,
      origin TEXT NOT NULL DEFAULT 'default',
      perm_enabled INTEGER NOT NULL DEFAULT 0,
      perm_current INTEGER
    );
    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      keywords TEXT NOT NULL DEFAULT '[]',
      path TEXT NOT NULL UNIQUE,
      state TEXT NOT NULL DEFAULT 'memo',
      enabled INTEGER NOT NULL DEFAULT 1,
      content TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      origin TEXT NOT NULL DEFAULT 'custom',
      deleted_at TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      perm_enabled INTEGER NOT NULL DEFAULT 0,
      perm_current INTEGER
    );
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      system INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS card_tags (
      card_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (card_id, tag_id)
    );
    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      origin TEXT NOT NULL DEFAULT 'custom',
      enabled INTEGER NOT NULL DEFAULT 1,
      current_level INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      version INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS permission_levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      permission_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      pos INTEGER NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT 'gray'
    );
    CREATE TABLE IF NOT EXISTS perm_tags (
      permission_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (permission_id, tag_id)
    );
    -- 权限并入实体（2026-10-15 用户口径）：档位挂在「卡片」或「铁条例」上
    CREATE TABLE IF NOT EXISTS perm_levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_kind TEXT NOT NULL,
      owner_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT 'gray',
      pos INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

/** 老库补列（SQLite 无 IF NOT EXISTS 列语法，先查 pragma） */
function migrateColumns(db: DatabaseSync): void {
  const cols = (t: string) => (db.prepare(`PRAGMA table_info(${t})`).all() as any[]).map((r) => String(r.name));
  for (const [table, dflt] of [["iron_clauses", "default"], ["cards", "custom"]] as const) {
    if (!cols(table).includes("origin")) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN origin TEXT NOT NULL DEFAULT '${dflt}'`);
    }
  }
  if (!cols("cards").includes("deleted_at")) {
    db.exec(`ALTER TABLE cards ADD COLUMN deleted_at TEXT`);
  }
  if (!cols("cards").includes("version")) {
    db.exec(`ALTER TABLE cards ADD COLUMN version INTEGER NOT NULL DEFAULT 1`);
  }
  for (const t of ["cards", "iron_clauses"]) {
    const c = cols(t);
    if (!c.includes("perm_enabled")) db.exec(`ALTER TABLE ${t} ADD COLUMN perm_enabled INTEGER NOT NULL DEFAULT 0`);
    if (!c.includes("perm_current")) db.exec(`ALTER TABLE ${t} ADD COLUMN perm_current INTEGER`);
  }
  const lvlCols = (db.prepare(`PRAGMA table_info(permission_levels)`).all() as any[]).map((r) => String(r.name));
  if (!lvlCols.includes("color")) {
    db.exec(`ALTER TABLE permission_levels ADD COLUMN color TEXT NOT NULL DEFAULT 'gray'`);
    db.prepare(`UPDATE permission_levels SET color = 'red' WHERE name = '禁止'`).run();
    db.prepare(`UPDATE permission_levels SET color = 'blue' WHERE name = '允许'`).run();
  }
}

/** 系统标签「默认 / 自定义」——始终存在，且不可改名/删除 */
export function ensureSystemTags(db: DatabaseSync): void {
  const ins = db.prepare(`INSERT OR IGNORE INTO tags (name, system, created_at) VALUES (?, 1, ?)`);
  const now = new Date().toISOString();
  for (const n of SYSTEM_TAGS) ins.run(n, now);
}

/** 一次性回填来源（seed 名单里的条目按其 seed 归属标记） */
function backfillOrigin(db: DatabaseSync): void {
  const done = db.prepare(`SELECT value FROM meta WHERE key = 'origin_v2'`).get() as any;
  if (done) return;
  db.exec("BEGIN");
  try {
    const setIron = db.prepare(`UPDATE iron_clauses SET origin = 'default' WHERE title = ?`);
    for (const c of IRON_CLAUSES) setIron.run(c.title);
    const setCard = db.prepare(`UPDATE cards SET origin = ? WHERE name = ?`);
    for (const c of SEED_RULES) setCard.run(c.origin === "custom" ? "custom" : "default", c.name);
    for (const c of SAMPLE_CARDS) setCard.run("default", c.name);
    db.prepare(`INSERT INTO meta (key, value) VALUES ('origin_v2', '1')`).run();
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

/** 空库播种；已有数据则跳过（幂等，不覆盖用户内容） */
export function seedIfNeeded(db: DatabaseSync): boolean {
  const done = db.prepare(`SELECT value FROM meta WHERE key = 'seed_version'`).get() as any;
  if (done) return false;
  const now = new Date().toISOString();
  const insClause = db.prepare(
    `INSERT INTO iron_clauses (grp, title, path, content, pos, origin) VALUES (?, ?, ?, ?, ?, 'default')`,
  );
  const insCard = db.prepare(
    `INSERT INTO cards (name, keywords, path, state, enabled, content, created_at, updated_at, origin)
     VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)`,
  );
  db.exec("BEGIN");
  try {
    IRON_CLAUSES.forEach((c, i) => insClause.run(c.group, c.title, c.path, c.content, i));
    for (const s of SEED_RULES) {
      insCard.run(s.name, JSON.stringify(s.keywords), s.path, "rule", s.content, now, now, s.origin ?? "default");
    }
    for (const s of SAMPLE_CARDS) {
      insCard.run(s.name, JSON.stringify(s.keywords), s.path, "memo", s.content, now, now, "default");
      // 默认卡片可自带权限板块（档位）
      const perm = (s as any).perm as { levels: Array<{ name: string; content: string; color: string }>; current: number } | undefined;
      if (perm?.levels?.length) {
        const cardId = Number((db.prepare(`SELECT id FROM cards WHERE name = ?`).get(s.name) as any).id);
        const insLvl = db.prepare(
          `INSERT INTO perm_levels (owner_kind, owner_id, name, content, color, pos) VALUES ('card', ?, ?, ?, ?, ?)`,
        );
        perm.levels.forEach((l, i) => insLvl.run(cardId, l.name, l.content, l.color, i));
        const lvls = listPermLevels(db, "card", cardId);
        const cur = lvls[Math.max(0, Math.min(lvls.length - 1, Number(perm.current) || 0))];
        db.prepare(`UPDATE cards SET perm_enabled = 1, perm_current = ? WHERE id = ?`).run(cur ? cur.id : null, cardId);
      }
    }
    db.prepare(`INSERT INTO meta (key, value) VALUES ('seed_version', ?)`).run(SEED_VERSION);
    db.prepare(`INSERT INTO meta (key, value) VALUES ('index_note', ?)`).run(INDEX_NOTE);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  return true;
}

/** 索引说明（播种时落库，便于日后可编辑；缺失回退内置常量并显式告警） */
export function readIndexNote(db: DatabaseSync): { text: string; fallback: boolean } {
  const row = db.prepare(`SELECT value FROM meta WHERE key = 'index_note'`).get() as any;
  if (row?.value) return { text: String(row.value), fallback: false };
  return { text: INDEX_NOTE, fallback: true };
}

function parseKeywords(raw: unknown): string[] {
  try {
    const a = JSON.parse(String(raw ?? "[]"));
    return Array.isArray(a) ? a.map(String) : [];
  } catch {
    return [];
  }
}

const asOrigin = (v: unknown): CardOrigin => (v === "default" ? "default" : "custom");

/** 卡片标签（一次取全表映射，避免 N+1） */
function tagMap(db: DatabaseSync): Map<number, CardTag[]> {
  const rows = db.prepare(
    `SELECT ct.card_id, t.id, t.name, t.system FROM card_tags ct JOIN tags t ON t.id = ct.tag_id ORDER BY t.system DESC, t.id`,
  ).all() as any[];
  const m = new Map<number, CardTag[]>();
  for (const r of rows) {
    const arr = m.get(Number(r.card_id)) ?? [];
    arr.push({ id: Number(r.id), name: String(r.name), system: Number(r.system) === 1 });
    m.set(Number(r.card_id), arr);
  }
  return m;
}

function toCard(db: DatabaseSync, row: any, tags: CardTag[]): MemoCard {
  const ps = getPermState(db, "card", Number(row.id));
  return {
    id: Number(row.id),
    name: String(row.name),
    keywords: parseKeywords(row.keywords),
    path: String(row.path),
    state: (row.state === "rule" ? "rule" : "memo") as CardState,
    enabled: Number(row.enabled) === 1,
    origin: asOrigin(row.origin),
    content: String(row.content ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
    version: Number(row.version ?? 1),
    tags,
    permEnabled: ps.enabled,
    permLevels: ps.levels,
    permCurrentLevelId: ps.currentLevelId,
    permCurrentLevelName: ps.currentLevelName,
  };
}

export function listIron(db: DatabaseSync): IronClause[] {
  const rows = db.prepare(`SELECT * FROM iron_clauses ORDER BY pos, id`).all() as any[];
  return rows.map((r) => ({
    id: Number(r.id),
    group: String(r.grp),
    title: String(r.title),
    path: String(r.path),
    content: String(r.content),
    origin: asOrigin(r.origin),
    permEnabled: getPermState(db, "iron", Number(r.id)).enabled,
    permLevels: getPermState(db, "iron", Number(r.id)).levels,
    permCurrentLevelId: getPermState(db, "iron", Number(r.id)).currentLevelId,
    permCurrentLevelName: getPermState(db, "iron", Number(r.id)).currentLevelName,
  }));
}

/** 分组内排序：默认在前 → 启用在前 → 更新时间倒序（停用的自然沉到下面） */
const ORDER_SQL = `ORDER BY CASE origin WHEN 'default' THEN 0 ELSE 1 END, enabled DESC, updated_at DESC, id`;

export interface ListOpts { deleted?: boolean }

export function listCards(db: DatabaseSync, state?: CardState, opts: ListOpts = {}): MemoCard[] {
  const where: string[] = [];
  const args: any[] = [];
  if (state) { where.push("state = ?"); args.push(state); }
  if (!opts.deleted) where.push("deleted_at IS NULL");
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const rows = db.prepare(`SELECT * FROM cards ${whereSql} ${ORDER_SQL}`).all(...args) as any[];
  const tm = tagMap(db);
  return rows.map((r) => toCard(db, r, tm.get(Number(r.id)) ?? []));
}

/** 回收站（按删除时间倒序） */
export function listTrash(db: DatabaseSync): MemoCard[] {
  const rows = db.prepare(`SELECT * FROM cards WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`).all() as any[];
  const tm = tagMap(db);
  return rows.map((r) => toCard(db, r, tm.get(Number(r.id)) ?? []));
}

function rowById(db: DatabaseSync, id: number): MemoCard | null {
  const row = db.prepare(`SELECT * FROM cards WHERE id = ?`).get(id) as any;
  if (!row) return null;
  return toCard(db, row, tagMap(db).get(id) ?? []);
}

export function getCardByPath(db: DatabaseSync, path: string): MemoCard | null {
  const row = db.prepare(`SELECT * FROM cards WHERE path = ?`).get(path) as any;
  if (!row) return null;
  return toCard(db, row, tagMap(db).get(Number(row.id)) ?? []);
}

export const getCardById = rowById;

/** 启停（备忘与动态规矩通用） */
export function setCardEnabled(db: DatabaseSync, id: number, enabled: boolean): MemoCard | null {
  if (!rowById(db, id)) return null;
  db.prepare(`UPDATE cards SET enabled = ?, updated_at = ? WHERE id = ?`)
    .run(enabled ? 1 : 0, new Date().toISOString(), id);
  return rowById(db, id);
}

/** 升/降：只改 state；路径不随升降变化 */
export function setCardState(db: DatabaseSync, id: number, state: CardState): MemoCard | null {
  if (!rowById(db, id)) return null;
  db.prepare(`UPDATE cards SET state = ?, updated_at = ? WHERE id = ?`)
    .run(state, new Date().toISOString(), id);
  return rowById(db, id);
}

/** 路径由「区 + 卡名」派生（改名会跟随更新路径） */
function pathFor(state: CardState, name: string): string {
  return state === "rule" ? `规矩/动态/${name}.md` : `备忘/${name}.md`;
}

export interface CardDraft {
  name: string;
  keywords: string[];
  content: string;
  tagIds?: number[];
  /** 版本号（整数）；不传则新建为 1、编辑自动 +1 */
  version?: number;
}

/** 编辑时的版本号：显式给就用给的，否则旧版本 +1 */
function lazyPatchVersion(patch: { version?: number }, cur: number): number {
  const v = Number(patch?.version);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : cur + 1;
}

/** 打标（替换式） */
export function setCardTags(db: DatabaseSync, cardId: number, tagIds: number[]): void {
  db.prepare(`DELETE FROM card_tags WHERE card_id = ?`).run(cardId);
  const ins = db.prepare(`INSERT OR IGNORE INTO card_tags (card_id, tag_id) VALUES (?, ?)`);
  for (const t of tagIds) {
    const exists = db.prepare(`SELECT id FROM tags WHERE id = ?`).get(t);
    if (exists) ins.run(cardId, t);
  }
}

/** 新建卡片：一律 origin=custom（手动或 agent 创建都一样；默认卡只从 seed/公共库来） */
export function createCard(db: DatabaseSync, draft: CardDraft, state: CardState = "memo"): MemoCard {
  const name = draft.name.trim();
  if (!name) throw new Error("标题不能为空");
  const p = pathFor(state, name);
  if (db.prepare(`SELECT id FROM cards WHERE name = ?`).get(name)) throw new Error(`已存在同名卡片：${name}`);
  if (db.prepare(`SELECT id FROM cards WHERE path = ?`).get(p)) throw new Error(`路径已被占用：${p}`);
  const now = new Date().toISOString();
  const ver = Number.isFinite(Number(draft.version)) && Number(draft.version) > 0 ? Math.floor(Number(draft.version)) : 1;
  db.prepare(
    `INSERT INTO cards (name, keywords, path, state, enabled, content, created_at, updated_at, origin, version)
     VALUES (?, ?, ?, ?, 1, ?, ?, ?, 'custom', ?)`,
  ).run(name, JSON.stringify(draft.keywords ?? []), p, state, draft.content ?? "", now, now, ver);
  const id = Number((db.prepare(`SELECT id FROM cards WHERE name = ?`).get(name) as any).id);
  if (draft.tagIds?.length) setCardTags(db, id, draft.tagIds);
  return rowById(db, id)!;
}

/** 编辑卡片（铁律不在 cards 表，天然不可编辑）。改名会同步更新路径。 */
export function updateCard(db: DatabaseSync, id: number, patch: Partial<CardDraft>): MemoCard {
  const cur = rowById(db, id);
  if (!cur) throw new Error(`未找到卡片 id=${id}`);
  const name = patch.name === undefined ? cur.name : String(patch.name).trim();
  if (!name) throw new Error("标题不能为空");
  if (name !== cur.name && db.prepare(`SELECT id FROM cards WHERE name = ?`).get(name)) {
    throw new Error(`已存在同名卡片：${name}`);
  }
  const p = name === cur.name ? cur.path : pathFor(cur.state, name);
  if (p !== cur.path && db.prepare(`SELECT id FROM cards WHERE path = ?`).get(p)) {
    throw new Error(`路径已被占用：${p}`);
  }
  const ver = lazyPatchVersion(patch as any, cur.version);
  db.prepare(
    `UPDATE cards SET name = ?, keywords = ?, path = ?, content = ?, version = ?, updated_at = ? WHERE id = ?`,
  ).run(
    name,
    JSON.stringify(patch.keywords === undefined ? cur.keywords : patch.keywords),
    p,
    patch.content === undefined ? cur.content : String(patch.content),
    ver,
    new Date().toISOString(),
    id,
  );
  if (patch.tagIds !== undefined) setCardTags(db, id, patch.tagIds);
  return rowById(db, id)!;
}

/** 复制卡片 → 新的自定义卡（落「备忘」区；名字自动「（副本）」去重；带原标签） */
export function copyCard(db: DatabaseSync, id: number): MemoCard {
  const src = rowById(db, id);
  if (!src) throw new Error(`未找到卡片 id=${id}`);
  let name = `${src.name}_副本`;
  let n = 2;
  while (db.prepare(`SELECT id FROM cards WHERE name = ?`).get(name)) name = `${src.name}_副本${n++}`;
  return createCard(db, { name, keywords: src.keywords, content: src.content, tagIds: src.tags.map((t) => t.id) }, "memo");
}

/** 「更新」：把修改时间刷新为当前（内容与版本号都不动） */
export function touchCard(db: DatabaseSync, id: number): MemoCard {
  if (!rowById(db, id)) throw new Error(`未找到卡片 id=${id}`);
  db.prepare(`UPDATE cards SET updated_at = ? WHERE id = ?`).run(new Date().toISOString(), id);
  return rowById(db, id)!;
}

// ── 回收站 ───────────────────────────────────────────────
/** 软删除 → 进回收站 */
export function deleteCard(db: DatabaseSync, id: number): MemoCard {
  if (!rowById(db, id)) throw new Error(`未找到卡片 id=${id}`);
  db.prepare(`UPDATE cards SET deleted_at = ?, updated_at = ? WHERE id = ?`)
    .run(new Date().toISOString(), new Date().toISOString(), id);
  return rowById(db, id)!;
}

export function restoreCard(db: DatabaseSync, id: number): MemoCard {
  if (!rowById(db, id)) throw new Error(`未找到卡片 id=${id}`);
  db.prepare(`UPDATE cards SET deleted_at = NULL, updated_at = ? WHERE id = ?`).run(new Date().toISOString(), id);
  return rowById(db, id)!;
}

/** 彻底清除（不可恢复） */
export function purgeCard(db: DatabaseSync, id: number): void {
  if (!rowById(db, id)) throw new Error(`未找到卡片 id=${id}`);
  db.prepare(`DELETE FROM card_tags WHERE card_id = ?`).run(id);
  db.prepare(`DELETE FROM cards WHERE id = ?`).run(id);
}

// ── 标签 ────────────────────────────────────────────────
export function listTags(db: DatabaseSync): Tag[] {
  // 系统标签（默认 / 自定义）不是挂在 card_tags 上，而是由卡片 origin 决定 ——
  // 所以它们的计数必须按 origin 算，否则永远是 0。
  const rows = db.prepare(
    `SELECT t.id, t.name, t.system,
            CASE
              WHEN t.name = '默认' THEN (SELECT COUNT(*) FROM cards WHERE origin = 'default' AND deleted_at IS NULL)
              WHEN t.name = '自定义' THEN (SELECT COUNT(*) FROM cards WHERE origin = 'custom' AND deleted_at IS NULL)
              ELSE (SELECT COUNT(*) FROM card_tags ct JOIN cards c ON c.id = ct.card_id
                     WHERE ct.tag_id = t.id AND c.deleted_at IS NULL)
            END AS cnt
     FROM tags t ORDER BY t.system DESC, t.id`,
  ).all() as any[];
  return rows.map((r) => ({ id: Number(r.id), name: String(r.name), system: Number(r.system) === 1, count: Number(r.cnt) }));
}

export function createTag(db: DatabaseSync, name: string): Tag {
  const n = String(name ?? "").trim();
  if (!n) throw new Error("标签名不能为空");
  if (db.prepare(`SELECT id FROM tags WHERE name = ?`).get(n)) throw new Error(`标签已存在：${n}`);
  db.prepare(`INSERT INTO tags (name, system, created_at) VALUES (?, 0, ?)`).run(n, new Date().toISOString());
  const row = db.prepare(`SELECT * FROM tags WHERE name = ?`).get(n) as any;
  return { id: Number(row.id), name: String(row.name), system: false, count: 0 };
}

export function renameTag(db: DatabaseSync, id: number, name: string): Tag {
  const cur = db.prepare(`SELECT * FROM tags WHERE id = ?`).get(id) as any;
  if (!cur) throw new Error(`未找到标签 id=${id}`);
  if (Number(cur.system) === 1) throw new Error(`系统标签「${cur.name}」不可修改（默认 / 自定义由系统维护）`);
  const n = String(name ?? "").trim();
  if (!n) throw new Error("标签名不能为空");
  if (db.prepare(`SELECT id FROM tags WHERE name = ? AND id <> ?`).get(n, id)) throw new Error(`标签已存在：${n}`);
  db.prepare(`UPDATE tags SET name = ? WHERE id = ?`).run(n, id);
  return { id, name: n, system: false, count: 0 };
}

export function deleteTag(db: DatabaseSync, id: number): void {
  const cur = db.prepare(`SELECT * FROM tags WHERE id = ?`).get(id) as any;
  if (!cur) throw new Error(`未找到标签 id=${id}`);
  if (Number(cur.system) === 1) throw new Error(`系统标签「${cur.name}」不可删除`);
  db.exec("BEGIN");
  try {
    db.prepare(`DELETE FROM card_tags WHERE tag_id = ?`).run(id);
    db.prepare(`DELETE FROM tags WHERE id = ?`).run(id);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

/** 某标签下（未删除）的卡片 */
export function cardsWithTag(db: DatabaseSync, tagId: number): MemoCard[] {
  const rows = db.prepare(
    `SELECT c.* FROM cards c JOIN card_tags ct ON ct.card_id = c.id
     WHERE ct.tag_id = ? AND c.deleted_at IS NULL
     ORDER BY CASE c.origin WHEN 'default' THEN 0 ELSE 1 END, c.id`,
  ).all(tagId) as any[];
  const tm = tagMap(db);
  return rows.map((r) => toCard(db, r, tm.get(Number(r.id)) ?? []));
}

// ── 批量 ────────────────────────────────────────────────
export function setCardsState(db: DatabaseSync, ids: number[], state: CardState): number {
  const st = db.prepare(`UPDATE cards SET state = ?, updated_at = ? WHERE id = ?`);
  const now = new Date().toISOString();
  let n = 0;
  db.exec("BEGIN");
  try {
    for (const id of ids) n += Number(st.run(state, now, id).changes);
    db.exec("COMMIT");
  } catch (e) { db.exec("ROLLBACK"); throw e; }
  return n;
}

export function setCardsEnabled(db: DatabaseSync, ids: number[], enabled: boolean): number {
  const st = db.prepare(`UPDATE cards SET enabled = ?, updated_at = ? WHERE id = ?`);
  const now = new Date().toISOString();
  let n = 0;
  db.exec("BEGIN");
  try {
    for (const id of ids) n += Number(st.run(enabled ? 1 : 0, now, id).changes);
    db.exec("COMMIT");
  } catch (e) { db.exec("ROLLBACK"); throw e; }
  return n;
}

/** 批量软删除（进回收站） */
export function deleteCards(db: DatabaseSync, ids: number[]): number {
  const st = db.prepare(`UPDATE cards SET deleted_at = ?, updated_at = ? WHERE id = ?`);
  const now = new Date().toISOString();
  let n = 0;
  db.exec("BEGIN");
  try {
    for (const id of ids) n += Number(st.run(now, now, id).changes);
    db.exec("COMMIT");
  } catch (e) { db.exec("ROLLBACK"); throw e; }
  return n;
}

// ── 权限（已并入实体：档位挂在「卡片」或「铁条例」上；注入只带当前档位）──────
export type PermOwnerKind = "card" | "iron";
export interface PermLevel { id: number; name: string; content: string; color: string; pos: number }
export interface PermState {
  enabled: boolean;
  currentLevelId: number | null;
  currentLevelName: string;
  levels: PermLevel[];
}

/** 缺省档位（用户口径）：禁止=赤、允许=蓝；默认当前=禁止（从严） */
const DEFAULT_LEVELS = [
  { name: "禁止", content: "", color: "red" },
  { name: "允许", content: "", color: "blue" },
];

/** 旧「权限卡」→ 现在挂到哪个实体（一次性迁移用） */
const LEGACY_PERM_MAP: Array<{ permName: string; kind: PermOwnerKind; ownerName: string }> = [
  { permName: "是否允许 agent 自行添加手记卡片", kind: "iron", ownerName: "手记卡片维护" },
  { permName: "是否允许 agent 自行重启 DSH", kind: "card", ownerName: "DSH重启方式" },
];

function ownerExists(db: DatabaseSync, kind: PermOwnerKind, ownerId: number): boolean {
  return !!db.prepare(`SELECT id FROM ${kind === "card" ? "cards" : "iron_clauses"} WHERE id = ?`).get(ownerId);
}

export function listPermLevels(db: DatabaseSync, kind: PermOwnerKind, ownerId: number): PermLevel[] {
  const rows = db.prepare(
    `SELECT * FROM perm_levels WHERE owner_kind = ? AND owner_id = ? ORDER BY pos, id`,
  ).all(kind, ownerId) as any[];
  return rows.map((r) => ({
    id: Number(r.id), name: String(r.name), content: String(r.content ?? ""),
    color: String(r.color ?? "gray"), pos: Number(r.pos ?? 0),
  }));
}

export function getPermState(db: DatabaseSync, kind: PermOwnerKind, ownerId: number): PermState {
  const tbl = kind === "card" ? "cards" : "iron_clauses";
  const row = db.prepare(`SELECT perm_enabled, perm_current FROM ${tbl} WHERE id = ?`).get(ownerId) as any;
  const levels = listPermLevels(db, kind, ownerId);
  const cur = levels.find((l) => l.id === Number(row?.perm_current)) ?? levels[0] ?? null;
  return {
    enabled: Number(row?.perm_enabled) === 1,
    currentLevelId: cur ? cur.id : null,
    currentLevelName: cur ? cur.name : "（无档位）",
    levels,
  };
}

function refreshPerm(db: DatabaseSync, kind: PermOwnerKind, ownerId: number): PermState {
  return getPermState(db, kind, ownerId);
}

/** 开关权限板块；开启时若一个档位都没有，自动建「禁止 / 允许」并选中第一个 */
export function setPermEnabled(db: DatabaseSync, kind: PermOwnerKind, ownerId: number, enabled: boolean): PermState {
  if (!ownerExists(db, kind, ownerId)) throw new Error(`未找到${kind === "card" ? "卡片" : "铁条例"} id=${ownerId}`);
  const tbl = kind === "card" ? "cards" : "iron_clauses";
  if (enabled && listPermLevels(db, kind, ownerId).length === 0) {
    addPermLevel(db, kind, ownerId, DEFAULT_LEVELS[0].name, DEFAULT_LEVELS[0].content, DEFAULT_LEVELS[0].color);
    addPermLevel(db, kind, ownerId, DEFAULT_LEVELS[1].name, DEFAULT_LEVELS[1].content, DEFAULT_LEVELS[1].color);
  }
  db.prepare(`UPDATE ${tbl} SET perm_enabled = ?${kind === "card" ? ", updated_at = ?" : ""} WHERE id = ?`)
    .run(...(kind === "card" ? [enabled ? 1 : 0, new Date().toISOString(), ownerId] : [enabled ? 1 : 0, ownerId]));
  const st = getPermState(db, kind, ownerId);
  if (st.enabled && st.currentLevelId == null && st.levels.length) {
    db.prepare(`UPDATE ${tbl} SET perm_current = ? WHERE id = ?`).run(st.levels[0].id, ownerId);
  }
  return refreshPerm(db, kind, ownerId);
}

export function setPermCurrentLevel(db: DatabaseSync, kind: PermOwnerKind, ownerId: number, levelId: number): PermState {
  if (!ownerExists(db, kind, ownerId)) throw new Error(`未找到${kind === "card" ? "卡片" : "铁条例"} id=${ownerId}`);
  if (!listPermLevels(db, kind, ownerId).some((l) => l.id === levelId)) throw new Error(`档位 ${levelId} 不属于该实体`);
  const tbl = kind === "card" ? "cards" : "iron_clauses";
  db.prepare(`UPDATE ${tbl} SET perm_current = ?${kind === "card" ? ", updated_at = ?" : ""} WHERE id = ?`)
    .run(...(kind === "card" ? [levelId, new Date().toISOString(), ownerId] : [levelId, ownerId]));
  return refreshPerm(db, kind, ownerId);
}

export function addPermLevel(db: DatabaseSync, kind: PermOwnerKind, ownerId: number, name: string, content = "", color = "gray"): PermState {
  if (!ownerExists(db, kind, ownerId)) throw new Error(`未找到${kind === "card" ? "卡片" : "铁条例"} id=${ownerId}`);
  const n = String(name ?? "").trim();
  if (!n) throw new Error("档位名不能为空");
  const pos = Number((db.prepare(
    `SELECT COALESCE(MAX(pos), -1) + 1 AS p FROM perm_levels WHERE owner_kind = ? AND owner_id = ?`,
  ).get(kind, ownerId) as any).p);
  db.prepare(`INSERT INTO perm_levels (owner_kind, owner_id, name, content, color, pos) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(kind, ownerId, n, String(content ?? ""), String(color || "gray"), pos);
  // 第一个档位自动成为当前档
  const before = db.prepare(
    `SELECT perm_current FROM ${kind === "card" ? "cards" : "iron_clauses"} WHERE id = ?`,
  ).get(ownerId) as any;
  if (before?.perm_current == null) {
    const first = listPermLevels(db, kind, ownerId)[0];
    if (first) setPermCurrentLevel(db, kind, ownerId, first.id);
  }
  return refreshPerm(db, kind, ownerId);
}

export function updatePermLevel(db: DatabaseSync, levelId: number, patch: { name?: string; content?: string; color?: string }): PermState {
  const row = db.prepare(`SELECT * FROM perm_levels WHERE id = ?`).get(levelId) as any;
  if (!row) throw new Error(`未找到档位 id=${levelId}`);
  const name = patch.name === undefined ? String(row.name) : String(patch.name).trim();
  if (!name) throw new Error("档位名不能为空");
  db.prepare(`UPDATE perm_levels SET name = ?, content = ?, color = ? WHERE id = ?`).run(
    name,
    patch.content === undefined ? String(row.content ?? "") : String(patch.content),
    patch.color === undefined ? String(row.color ?? "gray") : String(patch.color || "gray"),
    levelId,
  );
  return refreshPerm(db, String(row.owner_kind) as PermOwnerKind, Number(row.owner_id));
}

export function deletePermLevel(db: DatabaseSync, levelId: number): PermState {
  const row = db.prepare(`SELECT * FROM perm_levels WHERE id = ?`).get(levelId) as any;
  if (!row) throw new Error(`未找到档位 id=${levelId}`);
  const kind = String(row.owner_kind) as PermOwnerKind;
  const ownerId = Number(row.owner_id);
  if (listPermLevels(db, kind, ownerId).length <= 1) throw new Error("至少要保留一个档位");
  db.exec("BEGIN");
  try {
    db.prepare(`DELETE FROM perm_levels WHERE id = ?`).run(levelId);
    const tbl = kind === "card" ? "cards" : "iron_clauses";
    const cur = db.prepare(`SELECT perm_current FROM ${tbl} WHERE id = ?`).get(ownerId) as any;
    if (Number(cur?.perm_current) === levelId) {
      const first = listPermLevels(db, kind, ownerId)[0];
      if (first) db.prepare(`UPDATE ${tbl} SET perm_current = ? WHERE id = ?`).run(first.id, ownerId);
    }
    db.exec("COMMIT");
  } catch (e) { db.exec("ROLLBACK"); throw e; }
  return refreshPerm(db, kind, ownerId);
}

/** 一次性：把旧「权限卡」实体并入实体（挂到指定卡片/铁条例），旧表保留留档 */
export function migratePermissionsIntoEntities(db: DatabaseSync): void {
  const done = db.prepare(`SELECT value FROM meta WHERE key = 'perm_merged_v1'`).get() as any;
  if (done) return;
  let legacy: any[] = [];
  try {
    legacy = db.prepare(`SELECT id, name, origin, enabled, current_level FROM permissions WHERE deleted_at IS NULL`).all() as any[];
  } catch { legacy = []; } // 旧表不存在（全新库）→ 跳过
  db.exec("BEGIN");
  try {
    for (const p of legacy) {
      const map = LEGACY_PERM_MAP.find((m) => m.permName === String(p.name));
      if (!map) continue;
      const tbl = map.kind === "card" ? "cards" : "iron_clauses";
      const col = map.kind === "card" ? "name" : "title";
      const owner = db.prepare(`SELECT id FROM ${tbl} WHERE ${col} = ?`).get(map.ownerName) as any;
      if (!owner) continue;
      const ownerId = Number(owner.id);
      if (listPermLevels(db, map.kind, ownerId).length) continue; // 已有档位 → 不重复并入
      const lvls = db.prepare(`SELECT * FROM permission_levels WHERE permission_id = ? ORDER BY pos, id`).all(Number(p.id)) as any[];
      let currentId: number | null = null;
      for (const l of lvls) {
        const st = addPermLevel(db, map.kind, ownerId, String(l.name), String(l.content ?? ""), String(l.color ?? "gray"));
        if (Number(p.current_level) === Number(l.id)) currentId = st.levels[st.levels.length - 1].id;
      }
      if (currentId == null) {
        const first = listPermLevels(db, map.kind, ownerId)[0];
        currentId = first ? first.id : null;
      }
      db.prepare(`UPDATE ${tbl} SET perm_enabled = 1, perm_current = ? WHERE id = ?`).run(currentId, ownerId);
    }
    // 全新库 / 未被映射到的情况：确保两个默认权限挂到位（幂等）
    for (const m of LEGACY_PERM_MAP) {
      const tbl = m.kind === "card" ? "cards" : "iron_clauses";
      const col = m.kind === "card" ? "name" : "title";
      const owner = db.prepare(`SELECT id FROM ${tbl} WHERE ${col} = ?`).get(m.ownerName) as any;
      if (!owner) continue;
      const ownerId = Number(owner.id);
      if (listPermLevels(db, m.kind, ownerId).length) continue;
      db.prepare(`UPDATE ${tbl} SET perm_enabled = 1 WHERE id = ?`).run(ownerId);
      setPermEnabled(db, m.kind, ownerId, true);
    }
    db.prepare(`INSERT INTO meta (key, value) VALUES ('perm_merged_v1', '1')`).run();
    db.exec("COMMIT");
  } catch (e) { db.exec("ROLLBACK"); throw e; }
}

/** 档位 → 所属实体（API 用：只给 levelId 时回写实体） */
export function permOwnerOfLevel(db: DatabaseSync, levelId: number): { kind: PermOwnerKind; ownerId: number } | null {
  const row = db.prepare(`SELECT owner_kind, owner_id FROM perm_levels WHERE id = ?`).get(levelId) as any;
  if (!row) return null;
  return { kind: String(row.owner_kind) as PermOwnerKind, ownerId: Number(row.owner_id) };
}

/** 注入用：某实体的当前档位（未开启返回 null） */
export function permForInject(db: DatabaseSync, kind: PermOwnerKind, ownerId: number): { levelName: string; content: string } | null {
  const st = getPermState(db, kind, ownerId);
  if (!st.enabled || !st.currentLevelId) return null;
  const cur = st.levels.find((l) => l.id === st.currentLevelId);
  return { levelName: st.currentLevelName, content: (cur?.content ?? "").trim() };
}
