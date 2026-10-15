/**
 * inject.ts — 每轮注入文本生成（纯函数，便于单测）。
 *
 * 注入矩阵：
 *   铁律条例   → 全文，无条件（锁死）
 *   动态规矩   → state='rule' 且 enabled=1 的卡片全文
 *   角色       → state='role' 且 enabled=1 的卡片，**仅清单行**（名/关键词/路径）；
 *                受「角色功能开关」整段压制（关闭 ⇒ 本段完全不出现）
 *   备忘       → state='memo' 且 enabled=1 的卡片，仅清单行（名/关键词/路径）
 *   经验卡     → **永不注入**（state='exp'）：它的索引只挂在「角色的经验槽」里，
 *                只有该角色被 `nio_memo` 读取时才跟着带出（T4 · 用户口径）
 *   权限（并入实体）→ 实体开启权限板块时，随其内容追加「当前档位 + 档位内容」；备忘卡开权限＝改全文注入
 * 停用卡不注入；为避免"静默消失"，末尾显式报出停用数量（只统计参与注入的形态）。
 */
import type { DatabaseSync } from "node:sqlite";

import { listCardsForInject, listIron, readIndexNote, permForInject, getSwitches, listRoleExps } from "./db";

export const INJECT_TAG = "nio-memo";

export function buildInjectText(db: DatabaseSync): string {
  const iron = listIron(db);
  const cards = listCardsForInject(db);   // 稳定排序：避免编辑/更新时间造成注入文本重排
  const sw = getSwitches(db);
  const rules = cards.filter((c) => c.state === "rule" && c.enabled);
  const memos = cards.filter((c) => c.state === "memo" && c.enabled);
  // 角色：功能开关关闭 ⇒ 整段不注入（用户口径：停注入 + 隐藏 tab）
  const roles = sw.roleEnabled ? cards.filter((c) => c.state === "role" && c.enabled) : [];
  // 停用计数只统计参与注入的形态（经验卡按设计从不注入，不该被算进"已停用"）
  const offCount = cards.filter((c) => !c.enabled && c.state !== "exp").length;

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

  // 角色索引段（T4）：只列清单行；其绑定的经验卡索引**不在这里**，读角色时才带出
  if (sw.roleEnabled && roles.length) {
    parts.push("", "📌 手记 · 角色（索引 · 命中则用 nio_memo(路径) 读取；读取时会一并带出其经验槽内经验卡的索引行）");
    for (const c of roles) {
      const kw = c.keywords.length ? c.keywords.join("、") : "（无）";
      parts.push(`- ${c.name} ｜ 关键词：${kw} ｜ 路径：${c.path}`);
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

/**
 * 读「角色」时的返回文本（T4）——**经验卡的唯一触发口**：
 *   角色正文 + 「经验槽」内所绑经验卡的**索引行**（名称/状态/路径），**不含经验卡正文**
 *   （两步读取是**有意设计**：经验卡不参与每轮注入，只在读角色时带出索引，正文用路径再读一次）。
 * 经验卡功能未生效（角色关 或 经验卡关）时，**不带出**索引行，并显式写明原因（禁静默兜底）。
 */
export function buildRoleReadText(
  db: DatabaseSync,
  card: { id: number; name: string; path: string; keywords: string[]; content: string },
  zoneLabel = "角色",
): string {
  const sw = getSwitches(db);
  const exps = listRoleExps(db, card.id);
  const out: string[] = [
    `# ${card.name}（${zoneLabel}）`,
    `路径：${card.path}`,
    `关键词：${card.keywords.join("、") || "（无）"}`,
    "",
    card.content,
    "",
    "## 经验槽（绑定的经验卡 · 仅索引行；需要正文再用 nio_memo 读其路径）",
  ];
  if (!sw.expEffective) {
    out.push(`- ⚠️ 经验卡功能当前**未生效**（角色功能=${sw.roleEnabled ? "开" : "关"} · 经验卡开关=${sw.expEnabled ? "开" : "关"}）⇒ 本次**未带出**经验卡索引。`);
  } else if (!exps.length) {
    out.push("- （该角色未绑定任何经验卡）");
  } else {
    for (const e of exps) {
      const flag = e.deleted ? "已在回收站" : (!e.enabled ? "已停用" : "");
      out.push(`- ${e.name}${flag ? `（${flag}）` : ""}${e.path ? ` ｜ 路径：${e.path}` : ""}`);
    }
  }
  return out.join("\n");
}
