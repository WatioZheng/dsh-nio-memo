/**
 * types.ts — 路径常量与全局目录解析。
 *
 * 全局部署：数据不绑项目 cwd，统一放 `$DSH_HOME/nio-memo/`（默认 `~/.dsh/nio-memo/`）。
 * 环境变量 `NIO_MEMO_DIR` 可整体覆盖（测试用）。
 */
import * as nodeOs from "node:os";
import * as nodePath from "node:path";

/** 全局手记目录 */
export function memoDir(): string {
  const override = process.env.NIO_MEMO_DIR?.trim();
  if (override) return override;
  const dshHome = process.env.DSH_HOME?.trim();
  return nodePath.join(dshHome || nodePath.join(nodeOs.homedir(), ".dsh"), "nio-memo");
}

/** 微型库文件 */
export function memoDbFile(): string {
  return nodePath.join(memoDir(), "memo.db");
}

/** 卡片形态：备忘 / 动态规矩 */
export type CardState = "memo" | "rule";

export type PermOwnerKind = "card" | "iron";
export interface PermLevel { id: number; name: string; content: string; color: string; pos: number }
export interface PermState {
  enabled: boolean;
  currentLevelId: number | null;
  currentLevelName: string;
  levels: PermLevel[];
}

export interface IronClause {
  id: number;
  group: string;
  title: string;
  path: string;
  content: string;
  origin: CardOrigin;
  permEnabled: boolean;
  permLevels: PermLevel[];
  permCurrentLevelId: number | null;
  permCurrentLevelName: string;
}

export interface MemoCard {
  id: number;
  name: string;
  keywords: string[];
  path: string;
  state: CardState;
  enabled: boolean;
  origin: CardOrigin;
  content: string;
  createdAt: string;
  updatedAt: string;
  /** 软删除时刻（非空＝在回收站里） */
  deletedAt: string | null;
  /** 内容版本号（每次编辑 +1；启停/升降不改版本） */
  version: number;
  /** 已打标签 */
  tags: CardTag[];
  /** 权限板块（并入实体）：开启后随卡内容一起全文注入当前档位 */
  permEnabled: boolean;
  permLevels: PermLevel[];
  permCurrentLevelId: number | null;
  permCurrentLevelName: string;
}

/** 标签。system=1 的是系统自带（默认 / 自定义），不可改名、不可删除 */
export interface CardTag {
  id: number;
  name: string;
  system: boolean;
}

export interface Tag extends CardTag {
  /** 使用中（未删除）的卡片数 */
  count: number;
}
