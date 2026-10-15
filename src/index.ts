/**
 * dsh-nio-memo — 全局「手记」插件（宿主端入口）
 *
 * 极简三件：
 *   ① systemPrompt.section：每轮注入 铁条例全文 + 启用中的动态规矩全文 + 启用中的备忘索引清单
 *   ② 工具 nio_memo(path)：按逻辑路径取卡全文（停用卡显式拒绝）
 *   ③ Web API `/nio-memo/*`：手记 Tab 的数据面（只读 + 启停/升降三个写操作）
 *
 * 全局部署：与项目 cwd 无关，数据在 `$DSH_HOME/nio-memo/memo.db`（NIO_MEMO_DIR 可覆盖）。
 * 零依赖：node:sqlite + node:fs，无 LLM、无 worker。
 */
import type { Context } from "@deepseek-ai/cordis";
import { defineTool } from "@deepseek-ai/dsh-tools";
import type { DatabaseSync } from "node:sqlite";

import { openMemoDb, getCardByPath } from "./db";
import { buildInjectText } from "./inject";
import { installApi } from "./api";
import { memoDbFile } from "./types";

export const name = "dsh-nio-memo";
export const inject = ["systemPrompt", "tools"];

export function apply(ctx: Context): void {
  let db: DatabaseSync | null = null;
  const getDb = (): DatabaseSync => {
    if (!db) db = openMemoDb();
    return db;
  };

  // ① 每轮注入（全局，不绑项目）
  ctx.systemPrompt.section({
    name: "nio-memo",
    order: 122,
    text: () => {
      try {
        return buildInjectText(getDb());
      } catch (e) {
        // 禁静默兜底：注入失败必须显式进入提示词，而不是悄悄没有
        const msg = String((e as Error)?.message || e).slice(0, 200);
        console.error(`[dsh-nio-memo] 注入失败：${msg}（库：${memoDbFile()}）`);
        return `\n⚠️ 手记注入失败（显式告警 · 非静默兜底）：${msg}\n（库文件：${memoDbFile()}）\n`;
      }
    },
  });

  // ② 卡片读取工具
  ctx.tools.register(defineTool({
    name: "nio_memo",
    description:
      "读取「手记」卡片全文。传索引里给的逻辑路径（如 备忘/本机主机102.md）。" +
      "备忘卡命中关键词时用它取全文；铁律条例与动态规矩已每轮注入、一般无需调用。" +
      "停用卡片会被显式拒绝（不返回空内容）。",
    parameters: {
      path: { type: "string", description: "卡片逻辑路径（来自手记索引清单的「路径」字段）", },
    },
    output: {
      schema: { type: "string" },
      render: (_args: any, value: string) => [{ type: "text", text: value }],
    },
    async execute(args: any) {
      const p = String(args?.path || "").trim();
      if (!p) return "未提供 path。用法：nio_memo(path=\"备忘/卡名.md\")";
      let card;
      try {
        card = getCardByPath(getDb(), p);
      } catch (e) {
        return `手记库不可用：${String((e as Error)?.message || e).slice(0, 200)}`;
      }
      if (!card) return `未找到手记卡片：「${p}」。请使用手记索引清单里给出的路径原文。`;
      if (card.deletedAt) {
        return `该手记卡片已在回收站（${card.deletedAt}），不在注入索引中，故不返回内容：「${card.name}」。需要的话请在「手记」Tab 的回收站里恢复。`;
      }
      if (!card.enabled) {
        return `该手记卡片已停用（不在注入索引中，故不返回内容）：「${card.name}」（路径 ${card.path}）。如确需，请在「手记」Tab 中启用。`;
      }
      const zone = card.state === "rule" ? "动态规矩" : "备忘";
      return `# ${card.name}（${zone}）\n路径：${card.path}\n关键词：${card.keywords.join("、") || "（无）"}\n\n${card.content}`;
    },
  }));

  // ③ Web 数据面（无 web 表面的环境自动跳过）
  ctx.inject(["webServer"], (webCtx: any) => {
    installApi(webCtx, { getDb });
  });
}
