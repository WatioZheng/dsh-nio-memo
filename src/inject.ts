/**
 * inject.ts — 每轮注入文本生成（纯函数，便于单测）。
 *
 * 注入矩阵：
 *   铁律条例   → 全文，无条件（锁死）
 *   动态规矩   → state='rule' 且 enabled=1 的卡片全文
 *   备忘       → state='memo' 且 enabled=1 的卡片，仅清单行（名/关键词/路径）
 *   权限（并入实体）→ 实体开启权限板块时，随其内容追加「当前档位 + 档位内容」；备忘卡开权限＝改全文注入
 *   权限       → enabled=1 的权限卡，只注入「当前档位」那一段（禁静默：停用则整体不注入）
 * 停用卡不注入；为避免"静默消失"，末尾显式报出停用数量。
 */
import type { DatabaseSync } from "node:sqlite";

import { listCards, listIron, readIndexNote, permForInject } from "./db";

export const INJECT_TAG = "nio-memo";

export function buildInjectText(db: DatabaseSync): string {
  const iron = listIron(db);
  const cards = listCards(db);
  const rules = cards.filter((c) => c.state === "rule" && c.enabled);
  const memos = cards.filter((c) => c.state === "memo" && c.enabled);
  const offCount = cards.filter((c) => !c.enabled).length;

  const parts: string[] = ["", `<${INJECT_TAG}>`];

  if (iron.length) {
    parts.push("📌 手记 · 规矩（铁律 · 锁死，每轮必读）");
    for (const c of iron) {
      parts.push(c.content.trim());
      if (c.permEnabled) {
        const p = permForInject(db, "iron", c.id);
        if (p) parts.push(`**⇢ 当前档位：${p.levelName}**
${p.content || "（档位内容为空）"}`);
      }
    }
  } else {
    parts.push("⚠️ 手记 · 规矩（铁律）为空——当前库无任何铁律条例（非正常状态，请核对库内容）。");
  }

  if (rules.length) {
    parts.push("", "📌 手记 · 动态规矩（启用中 · 每轮全文注入）");
    for (const c of rules) {
      parts.push(`### ${c.name}\n${c.content.trim()}`);
      if (c.permEnabled) {
        const p = permForInject(db, "card", c.id);
        if (p) parts.push(`**⇢ 当前档位：${p.levelName}**\n${p.content || "（档位内容为空）"}`);
      }
    }
  }

  const note = readIndexNote(db);
  parts.push("", "📌 手记 · 备忘索引（命中关键词 → 用 nio_memo(路径) 取全文）");
  parts.push(note.text.trim());
  if (note.fallback) parts.push("⚠️ 索引说明未落库，本次使用内置兜底文本（禁静默兜底：此为显式提示）。");
  const permMemos = memos.filter((c) => c.permEnabled);
  const plainMemos = memos.filter((c) => !c.permEnabled);
  if (permMemos.length) {
    parts.push("", "📌 手记 · 备忘（已开启权限 · 全文注入：卡内容 + 当前档位）");
    for (const c of permMemos) {
      const p = permForInject(db, "card", c.id);
      parts.push(`### ${c.name}${p ? ` ｜ 当前档位：${p.levelName}` : ""}`);
      parts.push(c.content.trim() || "（卡片内容为空）");
      if (p) parts.push(`**⇢ 当前档位内容：**\n${p.content || "（档位内容为空）"}`);
    }
  }
  if (plainMemos.length) {
    for (const c of plainMemos) {
      const kw = c.keywords.length ? c.keywords.join("、") : "（无）";
      parts.push(`- ${c.name} ｜ 关键词：${kw} ｜ 路径：${c.path}`);
    }
  } else if (!permMemos.length) {
    parts.push("- （暂无启用中的备忘卡）");
  }
  if (offCount > 0) parts.push(`（另有 ${offCount} 张卡片已停用，未注入）`);

  parts.push(`</${INJECT_TAG}>`, "");
  return parts.join("\n");
}
