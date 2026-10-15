/**
 * dsh-nio-memo — 浏览器端「手记」Tab
 *
 * 版式：顶部「手记 + 横向子 Tab（规矩 | 备忘 | 设置）」+ 细分割线，下方内容区（上下排版）。
 *   规矩 = 铁律（锁死） + 动态规矩（默认/自定义；启停/升降/编辑/复制/打标/删除）
 *   备忘 = 卡片（默认/自定义；同上）
 *   设置 = 创建 / 回收站 / 标签（标签页可批量转移·启停·删除）
 * 默认＝官方维护（将来提公共库只提取默认部分），自定义＝使用者自建；系统标签「默认/自定义」不可改删。
 * 卡片删除＝进回收站（软删除，可恢复/彻底清除，回收站内不可编辑）。
 */
import * as React from 'react'
import { useCallback, useEffect, useState } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'

import { parseMd, inlineTokens } from './md'
import type { MdBlock } from './md'

export const name = 'dsh-nio-memo'
export const inject = ['slots']

type Origin = 'default' | 'custom'

/** 档位可选颜色（用户口径：黑/白/灰/赤/橙/黄/绿/青/蓝/紫；允许不同档位同色） */
const LEVEL_COLORS: Array<{ key: string; label: string; hex: string }> = [
  { key: 'black', label: '黑', hex: '#111827' },
  { key: 'white', label: '白', hex: '#ffffff' },
  { key: 'gray', label: '灰', hex: '#8b8d98' },
  { key: 'red', label: '赤', hex: '#dc2626' },
  { key: 'orange', label: '橙', hex: '#ea580c' },
  { key: 'yellow', label: '黄', hex: '#eab308' },
  { key: 'green', label: '绿', hex: '#16a34a' },
  { key: 'cyan', label: '青', hex: '#0891b2' },
  { key: 'blue', label: '蓝', hex: '#2563eb' },
  { key: 'purple', label: '紫', hex: '#7c3aed' },
]
const colorHex = (key: string) => LEVEL_COLORS.find((c) => c.key === key)?.hex ?? '#8b8d98'
function Dot({ color }: { color: string }) {
  return <span className="nm2-dot" style={{ background: colorHex(color) }} />
}
function Swatches({ value, onPick }: { value: string; onPick: (k: string) => void }) {
  return (
    <div className="nm2-swatches">
      {LEVEL_COLORS.map((c) => (
        <span key={c.key} className={`nm2-swatch${value === c.key ? ' on' : ''}`} style={{ background: c.hex }}
          title={c.label} onClick={() => onPick(c.key)} />
      ))}
    </div>
  )
}
interface CardTag { id: number; name: string; system: boolean }
interface Tag extends CardTag { count: number }
interface PermLevel { id: number; name: string; content: string; color: string; pos: number }
interface PermBits {
  permEnabled: boolean; permLevels: PermLevel[]
  permCurrentLevelId: number | null; permCurrentLevelName: string
}
interface IronClause extends PermBits { id: number; title: string; path: string; content: string; origin: Origin }
/** 卡片形态（T4）：备忘 / 动态规矩 / 角色 / 经验卡 */
type CardState = 'memo' | 'rule' | 'role' | 'exp'
/** 形态中文名（UI 显示；与宿主 STATE_LABEL 同口径） */
const STATE_LABEL: Record<CardState, string> = { memo: '备忘', rule: '动态规矩', role: '角色', exp: '经验卡' }
/** 索引型：不参与「升为规矩 / 降为备忘」互迁（T4） */
const isIndexOnly = (s: CardState) => s === 'role' || s === 'exp'

/** 功能开关（T4）：角色功能 / 经验卡；expEffective = 角色开 && 经验卡开 */
interface Switches { roleEnabled: boolean; expEnabled: boolean; expEffective: boolean }
/** 与宿主同口径：**出厂默认关**（缺行=关）——呈现极简，高级功能由用户自行探索开启。
 *  旧数据没有 switches 字段时按此兜底（不得悄悄回到「默认开」）。 */
const DEFAULT_SWITCHES: Switches = { roleEnabled: false, expEnabled: false, expEffective: false }

/** 角色经验槽里的一项 */
interface RoleExpRef { id: number; name: string; path: string; enabled: boolean; deleted: boolean }

interface MemoCard extends PermBits {
  id: number; name: string; keywords: string[]; path: string
  state: CardState; enabled: boolean; origin: Origin; content: string
  /** F12（T9）：列表接口不下发正文时置 true ⇒ 内页打开时用 /api/card 按需取全文 */
  contentOmitted?: boolean
  deletedAt: string | null; tags: CardTag[]; updatedAt?: string; version?: number
}
interface AllData {
  ok: boolean; error?: string
  iron: IronClause[]; rules: MemoCard[]; memos: MemoCard[]
  /** T4：角色卡 / 经验卡（经验卡无独立 tab，只在「设置 → 经验卡」与其反查里出现） */
  roles?: MemoCard[]; exps?: MemoCard[]
  tags: Tag[]; trashCount: number
  switches?: Switches
}

async function getJson<T>(path: string): Promise<T> {
  const resp = await fetch(path, { cache: 'no-store' })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json() as Promise<T>
}
async function postJson<T>(path: string, body: unknown): Promise<T> {
  const resp = await fetch(path, {
    method: 'POST', cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return resp.json() as Promise<T>
}

const css = `
.nm2-panel{display:flex;flex-direction:column;flex:1;min-height:0;height:100%;box-sizing:border-box;overflow:hidden;font-family:var(--dsw-font-family,system-ui,sans-serif);color:var(--dsw-alias-label-primary,inherit)}
.nm2-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 16px 10px;border-bottom:1px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.18));box-sizing:border-box;flex-shrink:0}
.nm2-head-title{font-size:15px;font-weight:700;letter-spacing:.06em}
/* Tab 栏：**不换行 + 横向滚动**（T6）
   原先按钮无 nowrap 且默认可压缩 ⇒ 行宽不够时按钮被压扁、中文逐字竖排（"规/矩 1/2"）。
   现在：按钮不压缩（flex:0 0 auto）、文字不换行（nowrap），放不下就让**整个 tab 栏横滑**。
   padding-bottom 给「选中态」的 box-shadow 留出不被 overflow 裁掉的余量；滚动条做细。 */
.nm2-tabs{display:flex;gap:8px;flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;padding-bottom:6px;scrollbar-width:thin;-webkit-overflow-scrolling:touch}
.nm2-tabs::-webkit-scrollbar{height:6px}
.nm2-tabs::-webkit-scrollbar-thumb{background:rgba(128,128,128,.35);border-radius:3px}
.nm2-tabs::-webkit-scrollbar-track{background:transparent}
.nm2-tabs button{display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:999px;border:1px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.22));background:transparent;color:var(--dsw-alias-label-secondary,#6b6f76);font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:background .12s,color .12s,border-color .12s;white-space:nowrap;flex:0 0 auto}
.nm2-tabs button:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.12))}
.nm2-tabs button.on{background:var(--dsw-alias-state-business-primary,#2563eb);border-color:transparent;color:#fff;box-shadow:0 2px 8px rgba(37,99,235,.28)}
.nm2-tabs button b{font-size:11px;font-weight:600;opacity:.75}
/* 内容区：自身滚动（面板级，长卡也不被裁） */
.nm2-main{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;padding:14px 16px;display:flex;flex-direction:column;gap:10px;box-sizing:border-box}
.nm2-help{font-size:12px;line-height:1.65;color:var(--dsw-alias-label-secondary,#6b6f76);background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.08));border-radius:8px;padding:8px 12px;flex-shrink:0}
.nm2-help b{color:var(--dsw-alias-label-primary,inherit)}
.nm2-sec{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#6b6f76);margin-top:4px;flex-shrink:0;display:flex;align-items:center;gap:6px}
.nm2-sec small{font-weight:400;color:var(--dsw-alias-label-tertiary,#8b8d98);margin-left:6px}
.nm2-sec i{width:8px;height:8px;border-radius:2px;display:inline-block}
/* 卡片网格：按**容器可用宽度**自适应（不再用 @media 认视口宽度）
   - auto-fill + minmax(190px,1fr)：够宽就多放、变窄自动减列，卡片永不被压扁
   - max-width 990px ≈ 5×(190+8)：宽屏下**最多 5 列**（沿用用户口径），再宽也不硬拉 */
.nm2-grid{display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));max-width:990px}
.nm2-card{border:1px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.22));background:var(--dsw-alias-bg-secondary,transparent);border-radius:10px;padding:10px 12px;font-size:12px;display:flex;flex-direction:column;gap:6px;box-sizing:border-box;cursor:pointer;transition:border-color .12s ease,box-shadow .12s ease,transform .12s ease;flex:0 0 auto;height:112px;overflow:hidden}
/* T5：内底行的卡需要更高盒子（112 塞不下「内容 3 行 + 日期行 + 按钮行」） */
.nm2-card.with-acts{height:148px}
.nm2-card:hover{border-color:var(--dsw-alias-state-business-primary,#2563eb);box-shadow:0 3px 12px rgba(0,0,0,.10);transform:translateY(-1px)}
.nm2-card.off{opacity:.55}
.nm2-card.dflt{border-left:3px solid rgba(37,99,235,.45)}
.nm2-card.cstm{border-left:3px solid rgba(22,163,74,.5)}
.nm2-card-head{display:flex;align-items:flex-start;gap:6px;flex-wrap:wrap}
/* 标题永远独占整行：flex-basis:100% 保证不被右侧标签挤成竖排一字一行 */
.nm2-card-name.one-line{white-space:nowrap;text-overflow:ellipsis;overflow:hidden;display:block;height:16px}
.nm2-card-name{font-weight:600;flex:0 0 auto;min-width:0;font-size:12px;line-height:16px;max-height:32px;overflow-wrap:break-word;word-break:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.nm2-card-foot{display:flex;flex-wrap:nowrap;gap:4px;align-items:center;height:18px;overflow:hidden;white-space:nowrap}
.nm2-kw{font-size:11px;color:var(--dsw-alias-label-secondary,#6b6f76);display:flex;gap:4px;flex-wrap:wrap;max-height:32px;line-height:14px;overflow:hidden;align-content:flex-start;flex:0 0 auto}
.nm2-kw span{line-height:14px}
.nm2-kw span{padding:1px 6px;border-radius:4px;background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.12))}
.nm2-path{font-size:10.5px;color:var(--dsw-alias-label-tertiary,#8b8d98);font-family:ui-monospace,monospace;word-break:break-all;line-height:15px;height:30px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.nm2-acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:auto;padding-top:2px}
/* 内页/设置/标签详情里的按钮行：不贴底、不推挤后面的内容 */
.nm2-detail-acts{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
/* 卡片外容器：盒子内已含底部信息行（T5 起），容器仅负责网格定位 */
.nm2-entry{display:flex;flex-direction:column;gap:4px;min-width:0;height:100%}
/* 卡内底部行（T5）：日期 + 按钮，**纵向堆叠**（与原先卡外排布同款，只是收进盒内）
   为何不并排：最窄列 190px 时可用仅 162px，而「3 按钮 125px + 完整日期 60px」= 191px ⇒ 日期必被省略号截断（实测缺口 29px）。
   纵排则任何宽度都不截断、按钮不被压扁；卡高 112→148 与原先「卡 112 + 卡外 36」的总占用持平，不额外占版面。 */
.nm2-card-actions{display:flex;flex-direction:column;align-items:flex-start;gap:3px;margin-top:auto;padding-top:5px;border-top:1px dashed var(--dsw-alias-border-subtle,rgba(128,128,128,.28));min-width:0;box-sizing:border-box}
.nm2-meta{font-size:10px;line-height:1.3;color:var(--dsw-alias-label-tertiary,#8b8d98);font-family:ui-monospace,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nm2-foot-acts{display:flex;gap:4px;flex-shrink:0}
.nm2-btn.small{height:20px;padding:0 8px;font-size:10.5px}
/* 「更多」悬浮菜单（多行选项） */
.nm2-toast{order:99;flex:0 0 auto;background:rgba(24,24,27,.94);color:#fff;font-size:12px;line-height:1.6;padding:8px 14px;border-radius:9px;margin-top:2px;box-shadow:0 6px 20px rgba(0,0,0,.22);text-align:center;border:1px solid rgba(255,255,255,.12)}
.nm2-tip{background:rgba(234,88,12,.13);border:1px solid rgba(234,88,12,.35);border-left-width:3px;border-radius:8px;padding:8px 12px;font-size:12px;line-height:1.7;color:var(--dsw-alias-label-primary,#3f4149)}
.nm2-permsec{display:flex;flex-direction:column;gap:8px;margin-top:8px;padding-top:10px;border-top:1px dashed var(--dsw-alias-border-subtle,rgba(128,128,128,.35))}
.nm2-menu-mask{position:fixed;inset:0;z-index:9998;background:transparent}
.nm2-menu{position:fixed;z-index:9999;min-width:132px;background:var(--dsw-alias-bg-base,#fff);border:1px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.28));border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.18);padding:4px;display:flex;flex-direction:column;gap:2px}
.nm2-menu button{text-align:left;border:none;background:transparent;padding:7px 10px;border-radius:6px;font:inherit;font-size:12px;color:var(--dsw-alias-label-primary,inherit);cursor:pointer;white-space:nowrap}
.nm2-menu button:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.14))}
.nm2-menu button.danger{color:var(--dsw-static-red-11,#c62a2f)}
/* 档位颜色点 + 调色板 */
.nm2-dot{width:10px;height:10px;border-radius:50%;display:inline-block;border:1px solid rgba(0,0,0,.18);flex-shrink:0;vertical-align:middle}
.nm2-swatches{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.nm2-swatch{width:18px;height:18px;border-radius:50%;cursor:pointer;border:2px solid transparent;box-sizing:border-box}
.nm2-swatch.on{border-color:var(--dsw-alias-state-business-primary,#2563eb)}
/* 系统标签卡：灰色、不可点 */
.nm2-card.sys{opacity:.6;cursor:default}
.nm2-card.sys:hover{border-color:var(--dsw-alias-border-subtle,rgba(128,128,128,.22));box-shadow:none;transform:none}
.nm2-btn{height:24px;padding:0 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.22));background:transparent;color:var(--dsw-alias-label-secondary,#6b6f76);font:inherit;font-size:11px;cursor:pointer;white-space:nowrap}
.nm2-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.12))}
.nm2-btn.primary{color:var(--dsw-alias-state-business-primary,#2563eb);border-color:currentColor}
.nm2-btn.danger{color:var(--dsw-static-red-11,#c62a2f);border-color:currentColor}
.nm2-btn:disabled{opacity:.5;cursor:default}
.nm2-tag{font-size:10px;padding:1px 6px;border-radius:999px;background:rgba(128,128,128,.14);color:var(--dsw-alias-label-tertiary,#8b8d98);flex-shrink:0;white-space:nowrap}
.nm2-tag.lock{background:rgba(198,42,47,.12);color:var(--dsw-static-red-11,#c62a2f)}
.nm2-tag.rule{background:rgba(37,99,235,.12);color:var(--dsw-alias-state-business-primary,#2563eb)}
.nm2-tag.role{background:rgba(124,58,237,.14);color:#6d28d9}
.nm2-tag.exp{background:rgba(8,145,178,.14);color:#0e7490}
.nm2-tag.origin-default{background:rgba(37,99,235,.10);color:var(--dsw-alias-state-business-primary,#2563eb)}
.nm2-tag.origin-custom{background:rgba(22,163,74,.14);color:#15803d}
.nm2-beta{font-size:9px;font-weight:600;margin-left:4px;padding:0 4px;border-radius:4px;background:rgba(234,88,12,.16);color:#c2410c;vertical-align:1px}
.nm2-tag.user{background:rgba(16,185,129,.14);color:#0f8a63}
.nm2-err{font-size:12px;color:var(--dsw-static-red-11,#c62a2f)}
.nm2-warn{font-size:11.5px;line-height:1.6;color:#a06000;background:rgba(255,176,32,.12);border-radius:8px;padding:7px 10px}
.nm2-empty{font-size:12px;color:var(--dsw-alias-label-tertiary,#8b8d98);padding:8px 2px}
.nm2-back{align-self:flex-start;height:28px;padding:0 12px;border-radius:8px;border:1px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.22));background:transparent;color:var(--dsw-alias-label-secondary,#6b6f76);font:inherit;font-size:12px;cursor:pointer}
.nm2-doc-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.nm2-doc-head h3{margin:0;font-size:15px;overflow-wrap:anywhere}
.nm2-doc{border:1px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.22));border-radius:10px;padding:14px 18px;font-size:13px;line-height:1.7;overflow-wrap:anywhere}
.nm2-doc h1{font-size:16px;margin:10px 0 8px}
.nm2-doc h2{font-size:14px;margin:10px 0 6px}
.nm2-doc h3{font-size:13px;margin:8px 0 6px}
.nm2-doc p{margin:6px 0}
.nm2-doc ul,.nm2-doc ol{margin:6px 0;padding-left:22px}
.nm2-doc li{margin:3px 0}
.nm2-doc blockquote{margin:6px 0;padding:4px 10px;border-left:3px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.35));color:var(--dsw-alias-label-secondary,#6b6f76)}
.nm2-doc code{font-family:ui-monospace,monospace;font-size:12px;background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.12));padding:1px 4px;border-radius:4px}
.nm2-doc pre{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.1));padding:8px 10px;border-radius:8px;overflow:auto;margin:8px 0}
.nm2-doc pre code{background:transparent;padding:0}
.nm2-doc hr{border:none;border-top:1px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.22));margin:10px 0}
.nm2-doc table{border-collapse:collapse;margin:8px 0;font-size:12.5px}
.nm2-doc th,.nm2-doc td{border:1px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.28));padding:4px 8px;text-align:left;vertical-align:top}
.nm2-doc th{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.1))}
.nm2-form{display:flex;flex-direction:column;gap:8px;max-width:760px}
.nm2-label{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#6b6f76)}
.nm2-input,.nm2-textarea,.nm2-select{width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.28));border-radius:8px;background:var(--dsw-alias-bg-base,transparent);color:var(--dsw-alias-label-primary,inherit);font:inherit;font-size:13px;outline:none}
.nm2-input:focus,.nm2-textarea:focus{border-color:var(--dsw-alias-state-business-primary,#2563eb)}
.nm2-textarea{min-height:180px;line-height:1.6;resize:vertical;font-family:ui-monospace,monospace;font-size:12.5px}
.nm2-form-acts{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
/* 弹窗（打标） */
.nm2-mask{position:fixed;inset:0;background:rgba(0,0,0,.42);z-index:9999;display:flex;align-items:center;justify-content:center}
.nm2-modal{background:var(--dsw-alias-bg-base,#fff);border:1px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.22));border-radius:12px;width:min(440px,92vw);max-height:80vh;display:flex;flex-direction:column;box-shadow:0 8px 40px rgba(0,0,0,.25)}
.nm2-modal-head{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.12))}
.nm2-modal-head b{flex:1;font-size:14px}
.nm2-modal-body{padding:12px 16px;overflow:auto;display:flex;flex-direction:column;gap:8px}
.nm2-modal-foot{display:flex;gap:8px;padding:10px 16px;border-top:1px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.12))}
.nm2-check{display:flex;align-items:center;gap:8px;font-size:13px}
`

let cssInjected = false
function injectCss(): void {
  if (cssInjected || typeof document === 'undefined') return
  cssInjected = true
  const st = document.createElement('style')
  st.textContent = css
  document.head.appendChild(st)
}

function Inline({ text, k }: { text: string; k: string }): React.ReactNode {
  return (
    <>
      {inlineTokens(text).map((t, i) => {
        const key = `${k}-${i}`
        if (t.type === 'bold') return <strong key={key}>{t.text}</strong>
        if (t.type === 'code') return <code key={key}>{t.text}</code>
        if (t.type === 'link') return <a key={key} href={t.href} target="_blank" rel="noreferrer">{t.text}</a>
        return <span key={key}>{t.text}</span>
      })}
    </>
  )
}

function renderMd(src: string): React.ReactNode {
  const blocks: MdBlock[] = parseMd(src)
  return (
    <div className="nm2-doc">
      {blocks.map((b, i) => {
        const k = `b${i}`
        if (b.type === 'h') {
          const inner = <Inline text={b.text} k={k} />
          return b.level <= 1 ? <h1 key={k}>{inner}</h1> : b.level === 2 ? <h2 key={k}>{inner}</h2> : <h3 key={k}>{inner}</h3>
        }
        if (b.type === 'p') return <p key={k}><Inline text={b.text} k={k} /></p>
        if (b.type === 'quote') return <blockquote key={k}><Inline text={b.text} k={k} /></blockquote>
        if (b.type === 'code') return <pre key={k}><code>{b.text}</code></pre>
        if (b.type === 'hr') return <hr key={k} />
        if (b.type === 'list') {
          const kids = b.items.map((it, j) => <li key={`${k}-${j}`}><Inline text={it} k={`${k}-${j}`} /></li>)
          return b.ordered ? <ol key={k}>{kids}</ol> : <ul key={k}>{kids}</ul>
        }
        if (b.type === 'table') {
          return (
            <table key={k}>
              <thead><tr>{b.head.map((h, j) => <th key={j}><Inline text={h} k={`${k}h${j}`} /></th>)}</tr></thead>
              <tbody>
                {b.rows.map((r, ri) => (
                  <tr key={ri}>{r.map((c, ci) => <td key={ci}><Inline text={c} k={`${k}r${ri}c${ci}`} /></td>)}</tr>
                ))}
              </tbody>
            </table>
          )
        }
        return null
      })}
    </div>
  )
}

type Detail =
  | { kind: 'iron'; item: IronClause }
  | { kind: 'card'; item: MemoCard }
  | { kind: 'tag'; item: Tag }

function OriginTag({ origin }: { origin: Origin }) {
  return origin === 'default'
    ? <span className="nm2-tag origin-default">默认</span>
    : <span className="nm2-tag origin-custom">自定义</span>
}

function TagsRow({ tags }: { tags: CardTag[] }) {
  if (!tags.length) return null
  return <div className="nm2-kw">{tags.map((t) => <span key={t.id} className="nm2-tag user">{t.name}</span>)}</div>
}

function fmtDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 版本号显示：无版本号者按 v1.0 */
function fmtVersion(v: number | undefined): string {
  return `v${v && v > 0 ? v : 1}.0`
}

function fmtTime(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function Card({ card, onOpen, onToggle, onMenu, onLevel, busy }: {
  card: MemoCard; onOpen: () => void; onToggle: () => void
  onMenu: (el: HTMLElement) => void; onLevel: (el: HTMLElement) => void; busy: boolean
}) {
  return (
    <div className="nm2-entry">
      {/* 卡片盒子：内容 + **卡内底部**（日期 / 按钮）—— T5 起不再外挂盒子外 */}
      <div className={`nm2-card with-acts ${card.origin === 'default' ? 'dflt' : 'cstm'}${card.enabled ? '' : ' off'}`} onClick={onOpen}>
        <div className="nm2-card-name one-line">{card.name}</div>
        <div className="nm2-kw">
          {card.keywords.length ? card.keywords.map((w) => <span key={w}>{w}</span>) : <span>（无关键词）</span>}
        </div>
        <div className="nm2-card-foot">
          <OriginTag origin={card.origin} />
          {card.state === 'rule' ? <span className="nm2-tag rule">动态规矩</span> : null}
          {card.state === 'role' ? <span className="nm2-tag role">角色</span> : null}
          {card.state === 'exp' ? <span className="nm2-tag exp">经验卡</span> : null}
          {card.enabled ? null : <span className="nm2-tag">已停用</span>}
          {card.tags.map((t) => <span key={t.id} className="nm2-tag user">{t.name}</span>)}
        </div>
        {/* 卡内底部：极小字修改日期 + 操作按钮（改到卡内后**必须** stopPropagation，否则点按钮会连带打开详情） */}
        <div className="nm2-card-actions">
          <span className="nm2-meta" title={`修改于 ${fmtTime(card.updatedAt)}`}>{fmtDate(card.updatedAt)}</span>
          <span className="nm2-foot-acts">
            <button className="nm2-btn small" disabled={busy} onClick={(e) => { e.stopPropagation(); onToggle() }}>{card.enabled ? '停用' : '启用'}</button>
            {card.permEnabled && !isIndexOnly(card.state) && card.permCurrentLevelId ? (
              <button className="nm2-btn small" disabled={busy}
                style={{ color: colorHex(card.permLevels.find((l) => l.id === card.permCurrentLevelId)?.color ?? 'gray') }}
                onClick={(e) => { e.stopPropagation(); onLevel(e.currentTarget) }}>
                {card.permCurrentLevelName}
              </button>
            ) : null}
            <button className="nm2-btn small" disabled={busy}
              onClick={(e) => { e.stopPropagation(); onMenu(e.currentTarget) }}>更多</button>
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * 权限板块（并入实体）：卡片与铁条例通用。
 * 默认关闭（灰色）；开启后「当前档位」随实体内容一起注入。铁条例正文锁死，但档位可编辑。
 */
function CardGroup({ cards, title, hint, busy, onOpen, onToggle, onMenu, onLevel }: {
  cards: MemoCard[]; title: string; hint?: string; busy: boolean
  onOpen: (c: MemoCard) => void; onToggle: (c: MemoCard) => void
  onMenu: (c: MemoCard, el: HTMLElement) => void
  onLevel: (c: MemoCard, el: HTMLElement) => void
}) {
  if (!cards.length) return null
  return (
    <>
      <div className="nm2-sec">
        <i style={{ background: title.includes('默认') ? 'rgba(37,99,235,.5)' : 'rgba(22,163,74,.5)' }} />
        {title}<small>{cards.length} 张{hint ? ` · ${hint}` : ''}</small>
      </div>
      <div className="nm2-grid">
        {cards.map((c) => (
          <Card key={c.id} card={c} busy={busy}
            onOpen={() => onOpen(c)} onToggle={() => onToggle(c)}
            onMenu={(el) => onMenu(c, el)}
            onLevel={(el) => onLevel(c, el)} />
        ))}
      </div>
    </>
  )
}

export function PermBoard({ kind, id, permEnabled, levels, currentLevelId, currentLevelName, lockedNote, busy, act, onOpenLevelMenu, onFlash, __testExpanded }: {
  kind: 'card' | 'iron'; id: number
  permEnabled: boolean; levels: PermLevel[]; currentLevelId: number | null; currentLevelName: string
  lockedNote?: string; busy: boolean
  act: (path: string, body: unknown, okMsg?: string) => Promise<any>
  onOpenLevelMenu: (el: HTMLElement) => void
  /** 轻提示回调（切档后说明生效时机） */
  onFlash?: (msg: string) => void
  /** 仅测试用：强制展开（生产不传 → 默认收起） */
  __testExpanded?: boolean
}): React.ReactNode {
  const [draft, setDraft] = useState<Record<number, { name: string; content: string; color: string }>>({})
  const [nv, setNv] = useState({ name: '', content: '', color: 'gray' })
  const [expanded, setExpanded] = useState(!!__testExpanded)   // 默认收起：不干扰内页正文
  const d = (l: PermLevel) => draft[l.id] ?? { name: l.name, content: l.content, color: l.color }
  return (
    <div className="nm2-permsec">
      {/* 一行状态（始终可见，极简） */}
      <div className="nm2-form-acts">
        <span className="nm2-label">权限板块<small className="nm2-beta">内测</small></span>
        <span className="nm2-meta">软约束：写进提示词，不保证 agent 一定遵守</span>
        <button className={`nm2-btn ${permEnabled ? 'primary' : ''}`} disabled={busy}
          onClick={() => void act('/nio-memo/api/perm/enable', { kind, id, enabled: !permEnabled },
            permEnabled ? '权限板块已关闭' : '权限板块已开启（默认档：禁止）')}>
          {permEnabled ? '已开启' : '已关闭'}
        </button>
        {permEnabled && currentLevelId ? (
          <button className="nm2-btn" disabled={busy} onClick={(e) => onOpenLevelMenu(e.currentTarget)}>
            <Dot color={levels.find((l) => l.id === currentLevelId)?.color ?? 'gray'} /> {currentLevelName}
          </button>
        ) : null}
        <button className="nm2-btn" disabled={busy} onClick={() => setExpanded(!expanded)}>{expanded ? '收起' : '展开'}</button>
        {lockedNote ? <span className="nm2-meta">{lockedNote}</span> : null}
      </div>

      {expanded ? (
        permEnabled ? (
          <>
            {levels.map((l) => (
              <div className="nm2-form" key={l.id}>
                <div className="nm2-form-acts">
                  <Dot color={d(l).color} />
                  <input className="nm2-input" style={{ maxWidth: 240 }} value={d(l).name}
                    onChange={(e) => setDraft({ ...draft, [l.id]: { ...d(l), name: e.target.value } })} />
                  {l.id === currentLevelId ? <span className="nm2-tag rule">当前档位</span> : (
                    <button className="nm2-btn primary" disabled={busy}
                      onClick={() => void act('/nio-memo/api/perm/current', { kind, id, levelId: l.id })
                      .then((r) => { if (r) onFlash?.(`已切到「${l.name}」 · 下一轮生效（agent 本轮看不到）`) })}>设为当前</button>
                  )}
                  <button className="nm2-btn" disabled={busy}
                    onClick={() => void act('/nio-memo/api/perm/level/update', { levelId: l.id, name: d(l).name, content: d(l).content, color: d(l).color }, '档位已保存')}>保存档位</button>
                  <button className="nm2-btn danger" disabled={busy}
                    onClick={() => { if (!window.confirm(`删除档位「${l.name}」？`)) return; void act('/nio-memo/api/perm/level/delete', { levelId: l.id }, '档位已删除') }}>删除档位</button>
                </div>
                <Swatches value={d(l).color} onPick={(k) => setDraft({ ...draft, [l.id]: { ...d(l), color: k } })} />
                <textarea className="nm2-textarea" style={{ minHeight: 80 }} value={d(l).content}
                  onChange={(e) => setDraft({ ...draft, [l.id]: { ...d(l), content: e.target.value } })} />
              </div>
            ))}
            <div className="nm2-form">
              <div className="nm2-label">新增档位</div>
              <input className="nm2-input" style={{ maxWidth: 240 }} placeholder="档位名，如：仅限本会话"
                value={nv.name} onChange={(e) => setNv({ ...nv, name: e.target.value })} />
              <Swatches value={nv.color} onPick={(k) => setNv({ ...nv, color: k })} />
              <textarea className="nm2-textarea" style={{ minHeight: 70 }} placeholder="该档位的说明"
                value={nv.content} onChange={(e) => setNv({ ...nv, content: e.target.value })} />
              <div className="nm2-form-acts">
                <button className="nm2-btn primary" disabled={busy || !nv.name.trim()}
                  onClick={async () => {
                    const ok = await act('/nio-memo/api/perm/level/add', { kind, id, name: nv.name, content: nv.content, color: nv.color }, '档位已新增')
                    if (ok) setNv({ name: '', content: '', color: 'gray' })
                  }}>新增档位</button>
              </div>
            </div>
          </>
        ) : (
          <div className="nm2-help">权限板块当前<b>关闭</b>：该实体按原规则注入。点上面的「已关闭」即可开启（首次开启会自动建「禁止 / 允许」两个档位，默认停在该实体的第一个档位）。</div>
        )
      ) : null}
    </div>
  )
}

export function HandnoteTabView(props: ConvViewProps & {
  __testData?: AllData; __testSub?: 'rules' | 'roles' | 'memo' | 'settings'; __testToast?: string
  /** 仅测试用：直接指定设置页子页 / 打开某个内页 / 预置某角色的经验槽（避免 SSR 断言依赖交互） */
  __testPane?: 'create' | 'tags' | 'trash' | 'exp' | 'advanced'
  __testDetail?: Detail
  __testSlot?: RoleExpRef[]
}) {
  const [data, setData] = useState<AllData | null>(props.__testData ?? null)
  const [err, setErr] = useState('')
  const [sub, setSub] = useState<'rules' | 'roles' | 'memo' | 'settings'>(props.__testSub ?? 'rules')
  const [pane, setPane] = useState<'create' | 'tags' | 'trash' | 'exp' | 'advanced'>(props.__testPane ?? 'create')
  const [detail, setDetail] = useState<Detail | null>(props.__testDetail ?? null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ name: '', keywords: '', tagIds: [] as number[], content: '', version: 1 })
  const [form, setForm] = useState({ type: 'memo' as CardState, name: '', keywords: '', tagIds: [] as number[], content: '', version: 1 })
  const [trash, setTrash] = useState<MemoCard[]>([])
  /** T4：当前打开的角色卡的「经验槽」（null=非角色/未加载） */
  const [slot, setSlot] = useState<RoleExpRef[] | null>(props.__testSlot ?? null)
  /** F2（T9）：经验槽读取失败的原因——非空时显式告警，且**不再**显示「尚未绑定」这种假信息 */
  const [slotErr, setSlotErr] = useState('')
  const [tagModal, setTagModal] = useState<{ card: MemoCard; selected: number[] } | null>(null)
  const [tagDraft, setTagDraft] = useState({ name: '', renameId: 0, renameName: '' })
  /** 悬浮菜单单例（父级持有 → 不可能同时开两个）；坐标按屏幕空间现算 */
  const [menu, setMenu] = useState<
    | { type: 'card'; x: number; y: number; card: MemoCard }
    | { type: 'level'; x: number; y: number; kind: 'card' | 'iron'; id: number; levels: PermLevel[]; currentId: number | null }
    | null
  >(null)

  const load = useCallback(async () => {
    try {
      const d = await getJson<AllData>('/nio-memo/api/all')
      if (!d.ok) { setErr(d.error || '读取失败'); return }
      // 防御：字段缺失时给空数组，避免 schema 漂移把整页打崩
      setErr(''); setData({
        ...d,
        iron: d.iron ?? [], rules: d.rules ?? [], memos: d.memos ?? [],
        roles: d.roles ?? [], exps: d.exps ?? [],
        tags: d.tags ?? [],
        switches: d.switches ?? DEFAULT_SWITCHES,
      })
      if (sub === 'settings' && paneEff === 'trash') {
        const t = await getJson<{ ok: boolean; cards: MemoCard[] }>('/nio-memo/api/trash')
        setTrash(t.cards ?? [])
      }
    } catch (e) {
      setErr(String((e as Error)?.message || e))
    }
  }, [sub, pane])

  useEffect(() => { injectCss(); void load() }, [load])

  const act = useCallback(async (path: string, body: unknown, okMsg = ''): Promise<any> => {
    setBusy(true); setNote('')
    try {
      const r = await postJson<{ ok: boolean; error?: string; card?: MemoCard; clause?: IronClause }>(path, body)
      if (!r.ok) { setNote(`✗ ${r.error || '操作失败'}`); return null }
      await load()
      if (okMsg) setNote(okMsg)
      const updated: any = r.card ?? r.clause ?? null
      if (updated) {
        // 内页同步：否则启停/切档/打标后内页显示的还是旧值（state 过期）
        setDetail((prev) => {
          if (!prev) return prev
          if (prev.kind === 'card' && updated.path !== undefined && updated.id === (prev.item as MemoCard).id) {
            return { kind: 'card', item: updated as MemoCard }
          }
          if (prev.kind === 'iron' && updated.title !== undefined && updated.id === prev.item.id) {
            return { kind: 'iron', item: updated as IronClause }
          }
          return prev
        })
      }
      return updated ?? r
    } catch (e) {
      setNote(`✗ ${String((e as Error)?.message || e)}`)
      return null
    } finally { setBusy(false) }
  }, [load])

  /**
   * F12（T9）：列表接口只下发轻字段，正文按需取。
   * 打开内页时若 contentOmitted=true，用 /api/card 取全文；失败**显式报错**，不假装是空卡。
   */
  const loadFullCard = async (id: number) => {
    try {
      const r = await getJson<{ ok: boolean; card?: MemoCard; error?: string }>(`/nio-memo/api/card?id=${id}`)
      if (!r.ok || !r.card) { setNote(`✗ ${r.error || '读取卡片正文失败'}`); return }
      const full = r.card
      setDetail((prev) => (prev && prev.kind === 'card' && prev.item.id === id ? { kind: 'card', item: full } : prev))
    } catch (e) {
      setNote(`✗ 读取卡片正文失败：${String((e as Error)?.message || e)}`)
    }
  }

  const openDetail = (d: Detail) => {
    setDetail(d); setEditing(false); setNote(''); setMenu(null); setSlotErr('')
    if (d.kind === 'card' && d.item.contentOmitted) void loadFullCard(d.item.id)
    // T4：打开角色卡 ⇒ 加载其经验槽（非角色卡则清空）
    if (d.kind === 'card' && d.item.state === 'role') void loadSlot(d.item.id)
    else setSlot(null)
  }

  /** T4：读某角色的经验槽（F2：失败显式告警，不再静默显示「尚未绑定」） */
  const loadSlot = async (roleId: number) => {
    setSlotErr('')
    try {
      const r = await getJson<{ ok: boolean; exps?: RoleExpRef[]; error?: string }>(`/nio-memo/api/role/exps?roleId=${roleId}`)
      if (!r.ok) { setSlot([]); setSlotErr(r.error || '经验槽读取失败'); return }
      setSlot(r.exps ?? [])
    } catch (e) {
      setSlot([]); setSlotErr(String((e as Error)?.message || e))
    }
  }

  /** T4：替换式写某角色的经验槽 */
  const bindExps = async (roleId: number, expIds: number[]) => {
    const r = await act('/nio-memo/api/role/exps', { roleId, expIds }, '经验槽已更新')
    if (r?.exps) setSlot(r.exps as RoleExpRef[])
    else void loadSlot(roleId)
  }

  /** 菜单定位：默认右下；右边不够→左下；下面不够→上方 */
  const openMenu = (card: MemoCard, el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    const W = 150, H = 152, M = 8
    const placeLeft = r.left + W > window.innerWidth - M
    const placeTop = r.bottom + H > window.innerHeight - M
    const x = placeLeft ? Math.max(M, r.right - W) : Math.min(r.left, window.innerWidth - W - M)
    const y = placeTop ? Math.max(M, r.top - H - 4) : r.bottom + 4
    setMenu({ type: 'card', card, x, y })
  }

  /** 轻提示（toast）：切档等"下一轮才生效"的动作，用一条小提示讲清生效时机 */
  const [toast, setToast] = useState<string>(props.__testToast ?? '')   // __testToast 仅测试用
  const flash = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast((cur) => (cur === msg ? '' : cur)), 4200)
  }, [])

  /** 档位菜单：以实体为单位（卡片/铁条例通用） */
  const openLevelMenu = (kind: 'card' | 'iron', id: number, levels: PermLevel[], currentId: number | null, el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    const W = 170, H = 40 + levels.length * 34, M = 8
    const placeLeft = r.left + W > window.innerWidth - M
    const placeTop = r.bottom + H > window.innerHeight - M
    const x = placeLeft ? Math.max(M, r.right - W) : Math.min(r.left, window.innerWidth - W - M)
    const y = placeTop ? Math.max(M, r.top - H - 4) : r.bottom + 4
    setMenu({ type: 'level', kind, id, levels, currentId, x, y })
  }

  // 菜单开着时：点外部/滚动/缩放/Esc 一律收起（避免多个菜单并存）
  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [menu])
  const startEdit = (c: MemoCard) => {
    // F12（T9）：正文尚未按需取回时**不进编辑**——否则会拿空正文覆盖原卡
    if (c.contentOmitted) {
      void loadFullCard(c.id)
      setNote('正文加载中…稍候再点「编辑」')
      return
    }
    setDraft({ name: c.name, keywords: c.keywords.join('、'), tagIds: c.tags.map((t) => t.id), content: c.content, version: c.version })
    setEditing(true); setNote('')
  }
  const saveEdit = async (c: MemoCard) => {
    const up = await act('/nio-memo/api/update', {
      id: c.id, name: draft.name, keywords: draft.keywords, content: draft.content, tagIds: draft.tagIds, version: draft.version,
    }, '已保存')
    if (up) { setEditing(false); setDetail({ kind: 'card', item: up }) }
  }
  const submitCreate = async () => {
    const t = form.type
    const created = await act('/nio-memo/api/create', form, `已创建（自定义 · ${STATE_LABEL[t]}）`)
    if (created) {
      setForm({ type: t, name: '', keywords: '', tagIds: [], content: '', version: 1 })
      if (t === 'role') setSub('roles')
      else if (t === 'exp') { setSub('settings'); setPane('exp') }
      else setSub(t === 'rule' ? 'rules' : 'memo')
      setDetail({ kind: 'card', item: created })
    }
  }
  const userTags = (data?.tags ?? []).filter((t) => !t.system)

  /** 某标签下的卡片：系统标签（默认/自定义）按 origin 过滤，其余按打标过滤。
   *  T4：角色 / 经验卡同样可打标，故一并纳入（批量「转区」只对备忘↔规矩生效）。 */
  const tagCards = (tag: Tag): MemoCard[] => {
    const all = [...(data?.memos ?? []), ...(data?.rules ?? []), ...(data?.roles ?? []), ...(data?.exps ?? [])]
    if (tag.system) {
      const origin: Origin = tag.name === '默认' ? 'default' : 'custom'
      return all.filter((c) => c.origin === origin)
    }
    return all.filter((c) => c.tags.some((t) => t.id === tag.id))
  }

  // T4：开关 + 角色/经验卡派生列表（老数据/测试数据可能没带 switches ⇒ 兜底为默认开）
  // ⚠ 必须定义在 head / 内页之前：内页「经验槽」与 tab 显隐都要用
  // ⚠⚠ **首帧 data 可能是 null**（真实路径要等 fetch 回来，本文件后面才做 null 守卫）——
  //     这里一律用 `data?.`；否则首帧就抛 TypeError → React 整树崩 → **整个 Tab 白屏**。
  //     （SSR 测试一直传 __testData，这个坑曾一路绿；已补「不传数据」的回归断言。）
  const sw: Switches = data?.switches ?? DEFAULT_SWITCHES
  const roles = data?.roles ?? []
  const exps = data?.exps ?? []
  const defRoles = roles.filter((c) => c.origin === 'default')
  const cstmRoles = roles.filter((c) => c.origin === 'custom')
  const defExps = exps.filter((c) => c.origin === 'default')
  const cstmExps = exps.filter((c) => c.origin === 'custom')

  const head = (
    <div className="nm2-head">
      <div className="nm2-head-title">手记</div>
      <div className="nm2-tabs">
        <button className={sub === 'rules' ? 'on' : ''} onClick={() => { setSub('rules'); setDetail(null) }}>
          <span>规矩</span><b>{data ? data.iron.length + data.rules.length : ''}</b>
        </button>
        {sw.roleEnabled ? (
          <button className={sub === 'roles' ? 'on' : ''} onClick={() => { setSub('roles'); setDetail(null) }}>
            <span>角色</span><b>{data ? roles.length : ''}</b>
          </button>
        ) : null}
        <button className={sub === 'memo' ? 'on' : ''} onClick={() => { setSub('memo'); setDetail(null) }}>
          <span>备忘</span><b>{data ? data.memos.length : ''}</b>
        </button>
        <button className={sub === 'settings' ? 'on' : ''} onClick={() => { setSub('settings'); setDetail(null) }}>
          <span>设置</span>{data?.trashCount ? <b>🗑{data.trashCount}</b> : null}
        </button>
      </div>
    </div>
  )

  if (err) return <div className="nm2-panel">{toast ? <div className="nm2-toast">{toast}</div> : null}{head}<div className="nm2-main"><div className="nm2-err">手记读取失败：{err}</div></div></div>
  if (!data) return <div className="nm2-panel">{toast ? <div className="nm2-toast">{toast}</div> : null}{head}<div className="nm2-main"><div className="nm2-empty">加载中…</div></div></div>

  const tagPicker = (selected: number[], onToggle: (id: number) => void) => (
    <div className="nm2-modal-body">
      {userTags.length === 0 ? <div className="nm2-empty">还没有自定义标签——可在「设置 → 标签」里新建。</div> : null}
      {userTags.map((t) => (
        <label className="nm2-check" key={t.id}>
          <input type="checkbox" checked={selected.includes(t.id)} onChange={() => onToggle(t.id)} />
          <span>{t.name}</span>
        </label>
      ))}
      <div className="nm2-help">「默认 / 自定义」是系统标签，由卡片来源自动决定，不在这里手工勾选。</div>
    </div>
  )

  // ── 内页 ──
  if (detail) {
    return (
      <div className="nm2-panel">{toast ? <div className="nm2-toast">{toast}</div> : null}
        {head}
        <div className="nm2-main">
          <button className="nm2-back" onClick={() => { setDetail(null); setEditing(false); setNote('') }}>← 返回</button>

          {detail.kind === 'iron' ? (
            <>
              <div className="nm2-doc-head">
                <h3>{detail.item.title}</h3>
                <OriginTag origin={detail.item.origin} />
                <span className="nm2-tag lock">铁律 · 锁死（不可编辑）</span>
              </div>
              <div className="nm2-path">{detail.item.path}</div>
              {renderMd(detail.item.content)}
              <PermBoard
                kind="iron" id={detail.item.id}
                permEnabled={detail.item.permEnabled} levels={detail.item.permLevels}
                currentLevelId={detail.item.permCurrentLevelId} currentLevelName={detail.item.permCurrentLevelName}
                lockedNote="（铁律正文锁死，档位可编辑）"
                busy={busy} act={act} onFlash={flash}
                onOpenLevelMenu={(el) => openLevelMenu('iron', detail.item.id, detail.item.permLevels, detail.item.permCurrentLevelId, el)} />
            </>
          ) : detail.kind === 'card' ? (
            <>
              <div className="nm2-doc-head">
                <h3>{detail.item.name}</h3>
                <OriginTag origin={detail.item.origin} />
                <span className={`nm2-tag ${detail.item.state === 'rule' ? 'rule' : ''}`}>{detail.item.state === 'rule' ? '动态规矩' : '备忘'}</span>
                {detail.item.enabled ? null : <span className="nm2-tag">已停用</span>}
                {detail.item.deletedAt ? <span className="nm2-tag lock">在回收站</span> : null}
              </div>
              <TagsRow tags={detail.item.tags} />
              <div className="nm2-kw">
                <span className="nm2-tag">关键词</span>
                {detail.item.keywords.length ? detail.item.keywords.map((w) => <span key={w}>{w}</span>) : <span>（无关键词）</span>}
              </div>
              <div className="nm2-path">{detail.item.path}</div>
              <div className="nm2-meta">{fmtVersion(detail.item.version)} · 改于 {fmtTime(detail.item.updatedAt)}</div>
              {note ? <div className={note.startsWith('✗') ? 'nm2-err' : 'nm2-help'}>{note}</div> : null}

              {detail.item.deletedAt ? (
                <>
                  <div className="nm2-warn">该卡片在<b>回收站</b>中（回收站内不可编辑）。可以恢复，或彻底清除。</div>
                  <div className="nm2-detail-acts">
                    <button className="nm2-btn primary" disabled={busy}
                      onClick={async () => { const c = await act('/nio-memo/api/restore', { id: detail.item.id }, '已恢复'); if (c) setDetail({ kind: 'card', item: c }) }}>恢复到原区</button>
                    <button className="nm2-btn danger" disabled={busy}
                      onClick={async () => {
                        if (!window.confirm(`彻底清除「${detail.item.name}」？此操作不可恢复。`)) return
                        const r = await act('/nio-memo/api/purge', { id: detail.item.id }, '已彻底清除')
                        if (r) setDetail(null)
                      }}>彻底清除</button>
                  </div>
                  {renderMd(detail.item.content)}
                </>
              ) : editing ? (
                <div className="nm2-form">
                  {detail.item.origin === 'default'
                    ? <div className="nm2-warn">这是<b>默认卡</b>（官方维护）：不建议直接编辑——改动会与源头分叉，将来同步/抽取时容易冲突。更稳的做法是：<b>关闭</b>它，或用「复制」新建一张自定义卡来改。</div>
                    : null}
                  <div className="nm2-label">标题</div>
                  <input className="nm2-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                  <div className="nm2-label">关键词（顿号 / 逗号分隔）</div>
                  <input className="nm2-input" value={draft.keywords} onChange={(e) => setDraft({ ...draft, keywords: e.target.value })} />
                  <div className="nm2-label">版本号（显示为 v{Number(draft.version) || 1}.0）</div>
                  <input className="nm2-input" style={{ maxWidth: 140 }} type="number" min={1}
                    value={draft.version} onChange={(e) => setDraft({ ...draft, version: Number(e.target.value) || 1 })} />
                  <div className="nm2-label">标签</div>
                  <div className="nm2-kw">
                    {userTags.length === 0 ? <span>（暂无自定义标签）</span> : userTags.map((t) => (
                      <span key={t.id} className={draft.tagIds.includes(t.id) ? 'nm2-tag user' : ''}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setDraft({ ...draft, tagIds: draft.tagIds.includes(t.id) ? draft.tagIds.filter((x) => x !== t.id) : [...draft.tagIds, t.id] })}>
                        {draft.tagIds.includes(t.id) ? '✓ ' : ''}{t.name}
                      </span>
                    ))}
                  </div>
                  <div className="nm2-label">内容（Markdown）</div>
                  <textarea className="nm2-textarea" value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} />
                  <div className="nm2-form-acts">
                    <button className="nm2-btn primary" disabled={busy || !draft.name.trim()} onClick={() => void saveEdit(detail.item as MemoCard)}>保存</button>
                    <button className="nm2-btn" disabled={busy} onClick={() => setEditing(false)}>取消</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="nm2-detail-acts">
                    <button className="nm2-btn" disabled={busy} onClick={() => void act('/nio-memo/api/toggle', { id: detail.item.id })}>{detail.item.enabled ? '停用' : '启用'}</button>
                    {!isIndexOnly(detail.item.state) ? (
                      <button className="nm2-btn primary" disabled={busy}
                        onClick={() => void act(detail.item.state === 'rule' ? '/nio-memo/api/demote' : '/nio-memo/api/promote', { id: detail.item.id })}>
                        {detail.item.state === 'rule' ? '降为备忘' : '立为规矩'}
                      </button>
                    ) : (
                      <span className="nm2-tag">{STATE_LABEL[detail.item.state]} · 索引型（不参与互迁）</span>
                    )}
                    <button className="nm2-btn" disabled={busy} onClick={() => startEdit(detail.item as MemoCard)}>编辑</button>
                    <button className="nm2-btn" disabled={busy}
                      onClick={async () => { const c = await act('/nio-memo/api/copy', { id: detail.item.id }, '已复制为自定义卡'); if (c) setDetail({ kind: 'card', item: c }) }}>复制</button>
                    <button className="nm2-btn" disabled={busy}
                      onClick={() => setTagModal({ card: detail.item as MemoCard, selected: (detail.item as MemoCard).tags.map((t) => t.id).filter((id) => userTags.some((t) => t.id === id)) })}>打标</button>
                    <button className="nm2-btn danger" disabled={busy}
                      onClick={async () => { const c = await act('/nio-memo/api/delete', { id: detail.item.id }, '已移入回收站'); if (c) setDetail(null) }}>删除</button>
                  </div>
                  {detail.item.contentOmitted
                    ? <div className="nm2-help">正文加载中…</div>
                    : renderMd(detail.item.content)}
                  {/* F5（T9）：经验卡在功能未生效时给显式说明（数据没丢，只是不会被带出） */}
                  {detail.item.state === 'exp' && !sw.expEffective ? (
                    <div className="nm2-permsec">
                      <div className="nm2-tip">
                        ⚠ 经验卡功能当前<b>未生效</b>（{sw.roleEnabled ? '经验卡开关已关' : '角色功能已关'}）⇒ 本卡<b>仍在库中、数据不丢</b>，
                        但不会被任何角色带出。在「设置 → 高级」里重新打开即恢复。
                      </div>
                    </div>
                  ) : null}
                  {detail.item.state === 'role' ? (
                    <div className="nm2-permsec">
                      <div className="nm2-sec">经验槽<small>绑定经验卡（T4）· 仅索引随角色被读取时触发</small></div>
                      {!sw.expEffective ? (
                        <div className="nm2-tip">
                          ⚠ 经验卡功能当前<b>未生效</b>（{sw.roleEnabled ? '经验卡开关已关' : '角色功能已关'}）⇒ <b>本板块整块停用</b>。
                          卡片与绑定<b>都还在</b>，在「设置 → 高级」里重新打开即恢复。
                        </div>
                      ) : (
                        <>
                          {slotErr ? (
                            <div className="nm2-err">✗ 经验槽读取失败：{slotErr}（下面的清单可能不完整，请重开本页再试）</div>
                          ) : null}
                          <div className="nm2-help">
                            绑定后：agent 读取本角色时，会一并带出这些经验卡的<b>索引行</b>（正文需再按路径读一次）。一张经验卡可被<b>多个角色</b>绑定。
                          </div>
                          {slotErr ? null : (slot ?? []).length === 0 ? <div className="nm2-empty">尚未绑定任何经验卡。</div> : (
                            <div className="nm2-grid">
                              {(slot ?? []).map((e) => {
                                const live = exps.find((x) => x.id === e.id)
                                return (
                                  <div className="nm2-card" key={e.id} style={{ height: 'auto' }}>
                                    <div className="nm2-card-name one-line">{e.name}</div>
                                    <div className="nm2-meta" title={e.path || undefined}>{e.path || '（无路径）'}</div>
                                    <div className="nm2-kw">
                                      {e.deleted ? <span>（空引用：经验卡已在回收站/被清除）</span> : (e.enabled ? <span>启用中</span> : <span>（已停用）</span>)}
                                    </div>
                                    <div className="nm2-detail-acts">
                                      {live ? <button className="nm2-btn" disabled={busy} onClick={() => openDetail({ kind: 'card', item: live })}>打开编辑</button> : null}
                                      <button className="nm2-btn danger" disabled={busy}
                                        onClick={() => void bindExps(detail.item.id, (slot ?? []).filter((x) => x.id !== e.id).map((x) => x.id))}>解绑</button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          <div className="nm2-label">可绑定的经验卡（点一下即绑定）</div>
                          <div className="nm2-kw">
                            {exps.filter((c) => c.enabled && !c.deletedAt && !(slot ?? []).some((s) => s.id === c.id)).length === 0
                              ? <span>（没有可绑的经验卡；先去「新建」把类型选为「经验卡」，或到「设置 → 经验卡」里启用已有的）</span>
                              : exps.filter((c) => c.enabled && !c.deletedAt && !(slot ?? []).some((s) => s.id === c.id)).map((c) => (
                                <span key={c.id} className="nm2-tag user" style={{ cursor: 'pointer' }}
                                  onClick={() => void bindExps(detail.item.id, [...(slot ?? []).map((x) => x.id), c.id])}>+ {c.name}</span>
                              ))}
                          </div>
                        </>
                      )}
                    </div>
                  ) : null}
                  {/* F1（T9）：角色 / 经验卡是索引型实体，按 T4 已批准边界**不挂权限板块** */}
                  {!isIndexOnly(detail.item.state) ? (
                    <PermBoard
                      kind="card" id={detail.item.id}
                      permEnabled={detail.item.permEnabled} levels={detail.item.permLevels}
                      currentLevelId={detail.item.permCurrentLevelId} currentLevelName={detail.item.permCurrentLevelName}
                      busy={busy} act={act} onFlash={flash}
                      onOpenLevelMenu={(el) => openLevelMenu('card', detail.item.id, detail.item.permLevels, detail.item.permCurrentLevelId, el)} />
                  ) : null}
                </>
              )}
            </>
          ) : (
            // 标签详情：**只列该标签下的卡片**（系统标签按来源过滤）+ 批量操作
            <TagDetail tag={detail.item} cards={tagCards(detail.item)} busy={busy}
              onOpen={(c) => openDetail({ kind: 'card', item: c })}
              onBatch={async (op, state) => {
                const ids = tagCards(detail.item).map((c) => c.id)
                if (!ids.length) { setNote('✗ 该标签下暂无卡片'); return }
                if (op === 'delete' && !window.confirm(`把该标签下的 ${ids.length} 张卡移入回收站？`)) return
                const r = await act('/nio-memo/api/batch', { ids, op, state })
                if (r) setNote(`批量操作完成：实际生效 ${r.changed ?? 0} 张（选中 ${ids.length} 张；角色 / 经验卡不参与「转区」）`)
              }} />
          )}
        </div>
      </div>
    )
  }

  const defRules = data.rules.filter((c) => c.origin === 'default')
  const cstmRules = data.rules.filter((c) => c.origin === 'custom')
  const defMemos = data.memos.filter((c) => c.origin === 'default')
  const cstmMemos = data.memos.filter((c) => c.origin === 'custom')
  // 角色功能关闭 ⇒ 角色 tab 隐藏、角色页不参与渲染（数据仍在，重开即回来）
  const subEff: 'rules' | 'roles' | 'memo' | 'settings' = (sub === 'roles' && !sw.roleEnabled) ? 'rules' : sub
  // T7：经验卡不生效时「经验卡」子页签整块隐藏 ⇒ 若此刻正停在它上面，回落到「创建」（不空屏）
  const paneEff: 'create' | 'tags' | 'trash' | 'exp' | 'advanced' = (pane === 'exp' && !sw.expEffective) ? 'create' : pane

  return (
    <div className="nm2-panel">{toast ? <div className="nm2-toast">{toast}</div> : null}
      {head}
      <div className="nm2-main">
        {note ? <div className={note.startsWith('✗') ? 'nm2-err' : 'nm2-help'}>{note}</div> : null}

        {subEff === 'rules' ? (
          <>
            <div className="nm2-help">
              <b>规矩</b>＝必须遵守的规则，<b>默认注入系统提示词</b>。「铁律」锁死——不可编辑、不可关闭，每轮无条件全文注入；
              「动态规矩」启用时每轮全文注入，可随时关闭、降为备忘。<b>默认</b>＝官方维护（提公共库只抽默认），<b>自定义</b>＝自己建的。
            </div>
            <div className="nm2-sec">铁律（锁死 · 每轮无条件全文注入）<small>{data.iron.length} 条</small></div>
            <div className="nm2-grid">
              {data.iron.map((c) => (
                <div className="nm2-entry" key={`i${c.id}`}>
                  {/* 盒子：内容 + **卡内底部**（档位按钮）—— T5 起搬进卡内 */}
                  <div className={`nm2-card with-acts ${c.origin === 'default' ? 'dflt' : 'cstm'}`} onClick={() => openDetail({ kind: 'iron', item: c })}>
                    <div className="nm2-card-name one-line">{c.title}</div>
                    <div className="nm2-card-foot">
                      <OriginTag origin={c.origin} />
                      <span className="nm2-tag lock">锁死</span>
                    </div>
                    {/* 铁律卡无 updated_at、且不可停用 ⇒ 内底行只有档位按钮（无档位时不渲染该行） */}
                    {c.permEnabled && c.permCurrentLevelId ? (
                      <div className="nm2-card-actions">
                        <span className="nm2-meta">档位</span>
                        <span className="nm2-foot-acts">
                          <button className="nm2-btn small" disabled={busy}
                            style={{ color: colorHex(c.permLevels.find((l) => l.id === c.permCurrentLevelId)?.color ?? 'gray') }}
                            onClick={(e) => { e.stopPropagation(); openLevelMenu('iron', c.id, c.permLevels, c.permCurrentLevelId, e.currentTarget) }}>
                            {c.permCurrentLevelName}
                          </button>
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <div className="nm2-sec" style={{ marginTop: 8 }}>动态规矩（启用中 · 每轮全文注入）<small>{data.rules.length} 张</small></div>
            {data.rules.length === 0 ? <div className="nm2-empty">暂无动态规矩。</div> : null}
            <CardGroup cards={defRules} title="动态规矩 · 默认" busy={busy}
              onOpen={(c) => openDetail({ kind: 'card', item: c })}
              onToggle={(c) => void act('/nio-memo/api/toggle', { id: c.id })}
              onMenu={(c, el) => openMenu(c, el)}
              onLevel={(c, el) => openLevelMenu('card', c.id, c.permLevels, c.permCurrentLevelId, el)} />
            <CardGroup cards={cstmRules} title="动态规矩 · 自定义" busy={busy}
              onOpen={(c) => openDetail({ kind: 'card', item: c })}
              onToggle={(c) => void act('/nio-memo/api/toggle', { id: c.id })}
              onMenu={(c, el) => openMenu(c, el)}
              onLevel={(c, el) => openLevelMenu('card', c.id, c.permLevels, c.permCurrentLevelId, el)} />
          </>
        ) : subEff === 'roles' ? (
          <>
            <div className="nm2-help">
              <b>角色</b>＝索引型实体，<b>不参与「升为规矩 / 降为备忘」互迁</b>：启用中的角色每轮只注入<b>一行索引</b>（名 / 关键词 / 路径），
              agent 命中时用 <code>nio_memo(路径)</code> 读取；读取时**只**会一并带出其<b>经验槽</b>内经验卡的索引行（正文需再读一次）。
              用不到角色时，可在「设置 → 高级」整体关闭（停注入 + 隐藏本 tab，数据与绑定都保留）。
            </div>
            {roles.length === 0 ? <div className="nm2-empty">暂无角色卡。可在「设置 → 创建」把类型选为「角色」来新建。</div> : null}
            <CardGroup cards={defRoles} title="角色 · 默认" busy={busy}
              onOpen={(c) => openDetail({ kind: 'card', item: c })}
              onToggle={(c) => void act('/nio-memo/api/toggle', { id: c.id })}
              onMenu={(c, el) => openMenu(c, el)}
              onLevel={(c, el) => openLevelMenu('card', c.id, c.permLevels, c.permCurrentLevelId, el)} />
            <CardGroup cards={cstmRoles} title="角色 · 自定义" busy={busy}
              onOpen={(c) => openDetail({ kind: 'card', item: c })}
              onToggle={(c) => void act('/nio-memo/api/toggle', { id: c.id })}
              onMenu={(c, el) => openMenu(c, el)}
              onLevel={(c, el) => openLevelMenu('card', c.id, c.permLevels, c.permCurrentLevelId, el)} />
          </>
        ) : subEff === 'memo' ? (
          <>
            <div className="nm2-help">
              <b>备忘</b>＝按需查阅的卡片，<b>平时不占上下文</b>：默认只注入「卡片名 / 关键词 / 路径」，命中关键词时 agent 用 <code>nio_memo(路径)</code> 取全文；
              可关闭（不进索引）、可「立为规矩」升级为每轮全文注入。<b>默认</b>＝官方维护，<b>自定义</b>＝自己建的。
            </div>
            {data.memos.length === 0 ? <div className="nm2-empty">暂无备忘卡。</div> : null}
            <CardGroup cards={defMemos} title="备忘 · 默认" busy={busy}
              onOpen={(c) => openDetail({ kind: 'card', item: c })}
              onToggle={(c) => void act('/nio-memo/api/toggle', { id: c.id })}
              onMenu={(c, el) => openMenu(c, el)}
              onLevel={(c, el) => openLevelMenu('card', c.id, c.permLevels, c.permCurrentLevelId, el)} />
            <CardGroup cards={cstmMemos} title="备忘 · 自定义" busy={busy}
              onOpen={(c) => openDetail({ kind: 'card', item: c })}
              onToggle={(c) => void act('/nio-memo/api/toggle', { id: c.id })}
              onMenu={(c, el) => openMenu(c, el)}
              onLevel={(c, el) => openLevelMenu('card', c.id, c.permLevels, c.permCurrentLevelId, el)} />
          </>
        ) : (
          <>
            <div className="nm2-tabs" style={{ marginBottom: 4 }}>
              <button className={paneEff === 'create' ? 'on' : ''} onClick={() => setPane('create')}>创建</button>
              <button className={paneEff === 'tags' ? 'on' : ''} onClick={() => setPane('tags')}>标签</button>
              {/* T7：经验卡不生效（角色关「连带」或经验卡开关关）时，**本子页签整体隐藏**
                  —— 用户口径：关掉就该消失，而不是留一个「· 已停用」的入口。
                  数据不受影响（卡片与绑定都还在），重新开启即恢复。 */}
              {sw.expEffective ? (
                <button className={paneEff === 'exp' ? 'on' : ''} onClick={() => setPane('exp')}>
                  经验卡{exps.length ? `（${exps.length}）` : ''}
                </button>
              ) : null}
              <button className={paneEff === 'advanced' ? 'on' : ''} onClick={() => setPane('advanced')}>高级</button>
              <button className={paneEff === 'trash' ? 'on' : ''} onClick={() => { setPane('trash'); void load() }}>回收站{data.trashCount ? `（${data.trashCount}）` : ''}</button>
            </div>

            {paneEff === 'create' ? (
              <>
                <div className="nm2-help">
                  手写一张 <b>自定义</b> 卡。先在上面选<b>要创建的类型</b>：备忘 / 规矩 / 角色 / 经验卡——
                  备忘与规矩之间可互迁；<b>角色与经验卡是索引型，不参与互迁</b>。
                </div>
                <div className="nm2-tip">
                  💡 <b>交给 agent 创建往往更方便有效</b>——你说一句「记住这个」，它会把关键词、正文格式与标签一次写到位。
                </div>
                <div className="nm2-form">
                  <div className="nm2-label">卡片类型（决定落在哪个区 / 如何被使用）</div>
                  <select className="nm2-input" style={{ maxWidth: 320 }} value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as CardState })}>
                    <option value="memo">备忘卡 —— 索引按需查阅（默认）</option>
                    <option value="rule">规矩（动态）—— 每轮全文注入</option>
                    {sw.roleEnabled ? <option value="role">角色 —— 每轮注入一行索引；可绑经验卡</option> : null}
                    {sw.expEffective ? <option value="exp">经验卡 —— 不注入；靠角色经验槽绑定触发</option> : null}
                  </select>
                  {!sw.roleEnabled ? <div className="nm2-help">角色功能当前已关闭（在「高级」里开），故不提供「角色 / 经验卡」选项。</div> : null}
                  {sw.roleEnabled && !sw.expEffective ? <div className="nm2-help">经验卡当前已关闭（在「高级」里开），故不提供「经验卡」选项。</div> : null}
                  <div className="nm2-label">标题（唯一，路径按它生成）</div>
                  <input className="nm2-input" placeholder="例如：我的部署小抄" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <div className="nm2-label">关键词（顿号 / 逗号分隔，命中关键词时 agent 会来读它）</div>
                  <input className="nm2-input" placeholder="例如：部署、回滚、端口" value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} />
                  <div className="nm2-label">版本号（默认 1，显示为 v1.0）</div>
                  <input className="nm2-input" style={{ maxWidth: 140 }} type="number" min={1}
                    value={form.version} onChange={(e) => setForm({ ...form, version: Number(e.target.value) || 1 })} />
                  <div className="nm2-label">标签（可选）</div>
                  <div className="nm2-kw">
                    {userTags.length === 0 ? <span>（暂无自定义标签，可在「标签」页新建）</span> : userTags.map((t) => (
                      <span key={t.id} className={form.tagIds.includes(t.id) ? 'nm2-tag user' : ''} style={{ cursor: 'pointer' }}
                        onClick={() => setForm({ ...form, tagIds: form.tagIds.includes(t.id) ? form.tagIds.filter((x) => x !== t.id) : [...form.tagIds, t.id] })}>
                        {form.tagIds.includes(t.id) ? '✓ ' : ''}{t.name}
                      </span>
                    ))}
                  </div>
                  <div className="nm2-label">内容（Markdown）</div>
                  <textarea className="nm2-textarea" placeholder={'# 标题\n\n正文…'} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
                  <div className="nm2-form-acts">
                    <button className="nm2-btn primary" disabled={busy || !form.name.trim()} onClick={() => void submitCreate()}>创建{STATE_LABEL[form.type]}</button>
                    <button className="nm2-btn" disabled={busy} onClick={() => setForm({ type: form.type, name: '', keywords: '', tagIds: [], content: '', version: 1 })}>清空</button>
                  </div>
                </div>
              </>
            ) : paneEff === 'exp' ? (
              <>
                <div className="nm2-help">
                  <b>经验卡</b>：<b>不进每轮注入</b>，也没有独立 tab。它的索引只挂在<b>角色的经验槽</b>里 ——
                  只有该角色被 agent 读取时，才会跟着带出它的索引行（正文需再按路径读一次）。一张经验卡可被<b>多个角色</b>绑定。
                </div>
                {!sw.expEffective ? (
                  <div className="nm2-tip">
                    ⚠ 经验卡功能当前<b>未生效</b>（{sw.roleEnabled ? '经验卡开关已关' : '角色功能已关'}）⇒
                    角色内页的「经验槽」<b>整块停用</b>、读角色<b>不再带出</b>经验卡索引。
                    卡片与绑定<b>都还在</b>，在「高级」里重新打开即恢复，无需二次操作。
                  </div>
                ) : null}
                {exps.length === 0 ? <div className="nm2-empty">暂无经验卡。可在「创建」里把类型选为「经验卡」来新建。</div> : null}
                <CardGroup cards={defExps} title="经验卡 · 默认" busy={busy}
                  onOpen={(c) => openDetail({ kind: 'card', item: c })}
                  onToggle={(c) => void act('/nio-memo/api/toggle', { id: c.id })}
                  onMenu={(c, el) => openMenu(c, el)}
                  onLevel={(c, el) => openLevelMenu('card', c.id, c.permLevels, c.permCurrentLevelId, el)} />
                <CardGroup cards={cstmExps} title="经验卡 · 自定义" busy={busy}
                  onOpen={(c) => openDetail({ kind: 'card', item: c })}
                  onToggle={(c) => void act('/nio-memo/api/toggle', { id: c.id })}
                  onMenu={(c, el) => openMenu(c, el)}
                  onLevel={(c, el) => openLevelMenu('card', c.id, c.permLevels, c.permCurrentLevelId, el)} />
              </>
            ) : paneEff === 'advanced' ? (
              <>
                <div className="nm2-help">
                  <b>高级</b>：本页<b>只放功能开关</b>。关闭不会删除任何数据 —— 卡片、绑定、设定全部保留，重新打开即恢复。
                </div>
                <div className="nm2-form">
                  <label className="nm2-check">
                    <input type="checkbox" checked={sw.roleEnabled} disabled={busy}
                      onChange={() => void act('/nio-memo/api/switch', { key: 'role', enabled: !sw.roleEnabled },
                        sw.roleEnabled ? '角色功能已关闭（停注入 + 隐藏 tab；数据保留）' : '角色功能已启用')} />
                    <span><b>角色功能</b> —— 关闭后：角色索引<b>不再注入</b>，「角色」tab <b>隐藏</b>；数据与绑定保留。</span>
                  </label>
                  <label className="nm2-check" style={{ opacity: sw.roleEnabled ? 1 : 0.5 }}>
                    <input type="checkbox" checked={sw.expEnabled} disabled={busy || !sw.roleEnabled}
                      onChange={() => void act('/nio-memo/api/switch', { key: 'exp', enabled: !sw.expEnabled },
                        sw.expEnabled ? '经验卡已关闭（经验槽停用；绑定保留）' : '经验卡已启用')} />
                    <span><b>经验卡</b> —— 关闭后：角色内页的「经验槽」<b>整块停用</b>，读角色不再带出经验卡索引；绑定<b>全部保留</b>。</span>
                  </label>
                  {!sw.roleEnabled ? (
                    <div className="nm2-help">
                      ⚠ 角色功能未启用 ⇒ <b>经验卡不可启用</b>（该开关置灰不可点）；它的原设定值<b>已保留</b>，重开角色即恢复。
                    </div>
                  ) : null}
                  <div className="nm2-help">
                    当前状态：角色功能=<b>{sw.roleEnabled ? '开' : '关'}</b> · 经验卡开关=<b>{sw.expEnabled ? '开' : '关'}</b>（原设定） · 经验卡实际生效=<b>{sw.expEffective ? '是' : '否'}</b>
                  </div>
                </div>
              </>
            ) : paneEff === 'trash' ? (
              <>
                <div className="nm2-help">
                  <b>回收站</b>：删除的卡片暂放这里，可<b>恢复</b>到原区，或<b>彻底清除</b>（不可恢复）。回收站内不可编辑。
                </div>
                {trash.length === 0 ? <div className="nm2-empty">回收站是空的。</div> : (
                  <div className="nm2-grid">
                    {trash.map((c) => (
                      <div className="nm2-card off" key={c.id}>
                        <div className="nm2-card-head">
                          <div className="nm2-card-name">{c.name}</div>
                          <OriginTag origin={c.origin} />
                          <span className="nm2-tag">{STATE_LABEL[c.state] ?? '备忘'}</span>
                        </div>
                        <div className="nm2-path">{c.path}</div>
                        <div className="nm2-detail-acts">
                          <button className="nm2-btn primary" disabled={busy} onClick={() => void act('/nio-memo/api/restore', { id: c.id }, '已恢复')}>恢复</button>
                          <button className="nm2-btn" disabled={busy} onClick={() => openDetail({ kind: 'card', item: c })}>查看</button>
                          <button className="nm2-btn danger" disabled={busy} onClick={() => {
                            if (!window.confirm(`彻底清除「${c.name}」？此操作不可恢复。`)) return
                            void act('/nio-memo/api/purge', { id: c.id }, '已彻底清除')
                          }}>彻底清除</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="nm2-help">
                  <b>标签</b>用于区分与批量操作：点标签卡片可看它下面的卡片，并<b>批量转移（规矩/备忘）、批量启用/关闭、批量删除</b>。
                  「默认 / 自定义」是<b>系统标签</b>（由卡片来源自动决定，不可改名/删除）；自定义标签可增改删。
                </div>
                <div className="nm2-form" style={{ marginBottom: 6 }}>
                  <div className="nm2-label">新建标签</div>
                  <div className="nm2-form-acts">
                    <input className="nm2-input" style={{ maxWidth: 240 }} placeholder="标签名" value={tagDraft.name} onChange={(e) => setTagDraft({ ...tagDraft, name: e.target.value })} />
                    <button className="nm2-btn primary" disabled={busy || !tagDraft.name.trim()}
                      onClick={async () => { const r = await act('/nio-memo/api/tags/create', { name: tagDraft.name }, '标签已创建'); if (r) setTagDraft({ ...tagDraft, name: '' }) }}>新建</button>
                  </div>
                </div>
                <div className="nm2-grid">
                  {data.tags.map((t) => (
                    <div className={`nm2-card ${t.system ? 'dflt sys' : 'cstm'}`} key={t.id}
                      onClick={t.system ? undefined : () => openDetail({ kind: 'tag', item: t })}>
                      <div className="nm2-card-head">
                        <div className="nm2-card-name">{t.name}</div>
                        {t.system ? <span className="nm2-tag origin-default">系统</span> : <span className="nm2-tag user">自定义</span>}
                      </div>
                      <div className="nm2-path">使用中 {t.count} 张{t.system ? '（按卡片来源统计）' : ''}</div>
                      {t.system ? null : (
                        <div className="nm2-detail-acts">
                          <button className="nm2-btn" disabled={busy} onClick={(e) => { e.stopPropagation(); setTagDraft({ ...tagDraft, renameId: t.id, renameName: t.name }) }}>改名</button>
                          <button className="nm2-btn danger" disabled={busy} onClick={(e) => {
                            e.stopPropagation()
                            if (!window.confirm(`删除标签「${t.name}」？（卡片本身不删，只解除该标签）`)) return
                            void act('/nio-memo/api/tags/delete', { id: t.id }, '标签已删除')
                          }}>删除</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {tagDraft.renameId ? (
                  <div className="nm2-form">
                    <div className="nm2-label">改标签名</div>
                    <div className="nm2-form-acts">
                      <input className="nm2-input" style={{ maxWidth: 240 }} value={tagDraft.renameName} onChange={(e) => setTagDraft({ ...tagDraft, renameName: e.target.value })} />
                      <button className="nm2-btn primary" disabled={busy || !tagDraft.renameName.trim()}
                        onClick={async () => {
                          const r = await act('/nio-memo/api/tags/rename', { id: tagDraft.renameId, name: tagDraft.renameName }, '标签已改名')
                          if (r) setTagDraft({ name: '', renameId: 0, renameName: '' })
                        }}>保存</button>
                      <button className="nm2-btn" disabled={busy} onClick={() => setTagDraft({ ...tagDraft, renameId: 0, renameName: '' })}>取消</button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </>
        )}
      </div>

      {menu ? (
        <>
          <div className="nm2-menu-mask" onClick={() => setMenu(null)} />
          <div className="nm2-menu" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
            {menu.type === 'card' ? (
              <>
                <button onClick={() => { const c = menu.card; setMenu(null); openDetail({ kind: 'card', item: c }) }}>打开</button>
                {/* T4：角色 / 经验卡是索引型，不提供「升为规矩 / 降为备忘」 */}
                {!isIndexOnly(menu.card.state) ? (
                  <button onClick={() => {
                    const c = menu.card; setMenu(null)
                    void act(c.state === 'rule' ? '/nio-memo/api/demote' : '/nio-memo/api/promote', { id: c.id })
                  }}>{menu.card.state === 'rule' ? '降为备忘' : '立为规矩'}</button>
                ) : null}
                <button onClick={() => {
                  const c = menu.card; setMenu(null)
                  setTagModal({ card: c, selected: c.tags.map((t) => t.id).filter((id) => userTags.some((t) => t.id === id)) })
                }}>打标</button>
                <button onClick={() => { const c = menu.card; setMenu(null); void act('/nio-memo/api/touch', { id: c.id }, '已更新修改时间') }}>更新</button>
                <button onClick={() => { const c = menu.card; setMenu(null); void act('/nio-memo/api/copy', { id: c.id }, '已复制') }}>复制</button>
                <button className="danger" onClick={() => { const c = menu.card; setMenu(null); void act('/nio-memo/api/delete', { id: c.id }, '已移入回收站') }}>删除</button>
              </>
            ) : (
              menu.levels.map((l) => (
                <button key={l.id} onClick={() => {
                  const m = menu; setMenu(null)
                  void act('/nio-memo/api/perm/current', { kind: m.kind, id: m.id, levelId: l.id }).then((r) => {
                    if (r) flash(`已切到「${l.name}」 · 下一轮生效（agent 本轮看不到）`)
                  })
                }}>
                  {l.id === menu.currentId ? '✓ ' : ''}<Dot color={l.color} /> {l.name}
                </button>
              ))
            )}
          </div>
        </>
      ) : null}

      {tagModal ? (
        <div className="nm2-mask" onClick={() => setTagModal(null)}>
          <div className="nm2-modal" onClick={(e) => e.stopPropagation()}>
            <div className="nm2-modal-head"><b>给「{tagModal.card.name}」打标</b></div>
            {tagPicker(tagModal.selected, (id) => setTagModal({
              ...tagModal,
              selected: tagModal.selected.includes(id) ? tagModal.selected.filter((x) => x !== id) : [...tagModal.selected, id],
            }))}
            <div className="nm2-modal-foot">
              <button className="nm2-btn primary" disabled={busy}
                onClick={async () => { const r = await act('/nio-memo/api/card/tags', { id: tagModal.card.id, tagIds: tagModal.selected }, '标签已更新'); if (r) setTagModal(null) }}>保存</button>
              <button className="nm2-btn" onClick={() => setTagModal(null)}>取消</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** 标签详情：该标签下的卡片（可点开）+ 批量操作条 */
function TagDetail({ tag, cards, busy, onBatch, onOpen }: {
  tag: Tag; cards: MemoCard[]; busy: boolean
  onBatch: (op: string, state?: 'memo' | 'rule') => Promise<void>
  onOpen: (c: MemoCard) => void
}) {
  return (
    <>
      <div className="nm2-doc-head">
        <h3>{tag.name}</h3>
        {tag.system ? <span className="nm2-tag origin-default">系统标签 · 不可改删</span> : <span className="nm2-tag user">自定义标签</span>}
      </div>
      <div className="nm2-help">
        下面列出该标签下的卡片（当前 {cards.length} 张：点卡片可看内页）。批量操作只作用于这些卡片。
      </div>
      {/* F10（T9）：索引型（角色 / 经验卡）不参与「转区」，这里说清哪些操作会跳过它们 */}
      {cards.some((c) => isIndexOnly(c.state)) ? (
        <div className="nm2-help">
          其中 <b>{cards.filter((c) => isIndexOnly(c.state)).length}</b> 张是角色 / 经验卡：<b>「批量转为动态规矩 / 备忘」对它们不生效</b>（索引型不参与互迁，会被跳过）；
          「批量启用 / 停用 / 删除」照常生效。
        </div>
      ) : null}
      <div className="nm2-detail-acts">
        <button className="nm2-btn" disabled={busy} onClick={() => void onBatch('state', 'rule')}>批量转为动态规矩</button>
        <button className="nm2-btn" disabled={busy} onClick={() => void onBatch('state', 'memo')}>批量转为备忘</button>
        <button className="nm2-btn" disabled={busy} onClick={() => void onBatch('enable')}>批量启用</button>
        <button className="nm2-btn" disabled={busy} onClick={() => void onBatch('disable')}>批量停用</button>
        <button className="nm2-btn danger" disabled={busy} onClick={() => void onBatch('delete')}>批量删除</button>
      </div>
      {cards.length === 0 ? <div className="nm2-empty">该标签下暂无卡片。</div> : (
        <div className="nm2-grid">
          {cards.map((c) => (
            <div className={`nm2-card ${c.origin === 'default' ? 'dflt' : 'cstm'}${c.enabled ? '' : ' off'}`} key={c.id}
              onClick={() => onOpen(c)}>
              <div className="nm2-card-name">{c.name}</div>
              <div className="nm2-path">{c.path}</div>
              <div className="nm2-card-foot">
                <OriginTag origin={c.origin} />
                <span className="nm2-tag">{STATE_LABEL[c.state] ?? '备忘'}</span>
                {c.enabled ? null : <span className="nm2-tag">已停用</span>}
                {c.tags.map((t) => <span key={t.id} className="nm2-tag user">{t.name}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export function apply(ctx: Context): void {
  injectCss()
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'nio-memo',
    order: 61,
    label: () => '手记',
  }, HandnoteTabView))
}
