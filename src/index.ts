/**
 * dsh-nio-memo — 全局「手记」插件（宿主端入口）
 *
 * 极简三件：
 *   ① systemPrompt.context（尾部动态快照）：每轮注入 铁条例全文 + 启用中的动态规矩全文 + 启用中的备忘索引清单
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
import { buildInjectText, buildRoleReadText } from "./inject";
import { installApi } from "./api";
import { memoDbFile, STATE_LABEL } from "./types";

export const name = "dsh-nio-memo";
export const inject = ["systemPrompt", "tools"];

export function apply(ctx: Context): void {
  let db: DatabaseSync | null = null;
  const getDb = (): DatabaseSync => {
    if (!db) db = openMemoDb();
    return db;
  };

  // ① 每轮注入（全局，不绑项目）
  //
  // ⚠️ 注入口径（2026-10-15 改，缓存放首位）：
  //   默认走 **systemPrompt.context（尾部动态快照）**——DSH 把它附在「保留历史之后」，
  //   所以改一张卡片只会让尾部这一小段失效，**不会重写稳定的系统提示词缓存前缀**；
  //   快照内容不变时 DSH 什么都不加（`project()` 里逐字比较），旧快照会被替换、不累积。
  //   旧实现走 systemPrompt.section＝系统提示词最前面（约 2K token 处）：改一次卡片＝
  //   从该点往后全部失效＝**整个会话上下文全价重算一次**（实测每次约 25~30 万 token）。
  //   逃生门：环境变量 NIO_MEMO_INJECT=section 可退回旧口径（对比/回滚用）。
  const injectText = (): string => {
    try {
      return buildInjectText(getDb());
    } catch (e) {
      // 禁静默兜底：注入失败必须显式进入提示词，而不是悄悄没有
      const msg = String((e as Error)?.message || e).slice(0, 200);
      console.error(`[dsh-nio-memo] 注入失败：${msg}（库：${memoDbFile()}）`);
      return `\n⚠️ 手记注入失败（显式告警 · 非静默兜底）：${msg}\n（库文件：${memoDbFile()}）\n`;
    }
  };
  if ((process.env.NIO_MEMO_INJECT ?? "").trim() === "section") {
    // 旧口径：系统提示词最前面（缓存不友好，仅供对比/回滚）
    ctx.systemPrompt.section({ name: "nio-memo", order: 122, text: injectText });
  } else {
    // 新口径：尾部动态快照（跟在保留历史之后）
    ctx.systemPrompt.context({ name: "nio-memo", order: 125, text: injectText });
  }

  // ② 卡片读取工具
  ctx.tools.register(defineTool({
    name: "nio_memo",
    description:
      "读取「手记」卡片全文。传索引里给的逻辑路径（如 备忘/本机主机102.md、角色/主理.md）。" +
      "备忘卡命中关键词时用它取全文；铁律条例与动态规矩已每轮注入、一般无需调用。" +
      "读**角色**时会一并带出其「经验槽」内经验卡的**索引行**（经验卡正文需再按路径读一次）。" +
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
      const zone = STATE_LABEL[card.state] ?? "备忘";
      // 角色（T4）：正文 + **经验槽**（经验卡不参与每轮注入，只有读角色时才带出其索引行）
      if (card.state === "role") return buildRoleReadText(getDb(), card, zone);
      return `# ${card.name}（${zone}）\n路径：${card.path}\n关键词：${card.keywords.join("、") || "（无）"}\n\n${card.content}`;
    },
  }));

  // ③ Web 数据面（无 web 表面的环境自动跳过）
  ctx.inject(["webServer"], (webCtx: any) => {
    installApi(webCtx, { getDb });
  });
}
