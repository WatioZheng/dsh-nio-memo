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
interface MemoCard extends PermBits {
  id: number; name: string; keywords: string[]; path: string
  state: 'memo' | 'rule'; enabled: boolean; origin: Origin; content: string
  deletedAt: string | null; tags: CardTag[]
}
interface AllData {
  ok: boolean; error?: string
  iron: IronClause[]; rules: MemoCard[]; memos: MemoCard[]
  tags: Tag[]; trashCount: number
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
.nm2-tabs{display:flex;gap:8px}
.nm2-tabs button{display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:999px;border:1px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.22));background:transparent;color:var(--dsw-alias-label-secondary,#6b6f76);font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:background .12s,color .12s,border-color .12s}
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
.nm2-grid{display:grid;gap:8px;grid-template-columns:repeat(2,minmax(0,1fr))}
@media(min-width:600px){.nm2-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(min-width:1024px){.nm2-grid{grid-template-columns:repeat(5,minmax(0,1fr))}}
.nm2-card{border:1px solid var(--dsw-alias-border-subtle,rgba(128,128,128,.22));background:var(--dsw-alias-bg-secondary,transparent);border-radius:10px;padding:10px 12px;font-size:12px;display:flex;flex-direction:column;gap:6px;box-sizing:border-box;cursor:pointer;transition:border-color .12s ease,box-shadow .12s ease,transform .12s ease;flex:0 0 auto;height:112px;overflow:hidden}
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
/* 卡片外容器：盒子只放内容，底部信息/按钮在盒子之外 */
.nm2-entry{display:flex;flex-direction:column;gap:4px;min-width:0;height:100%}
.nm2-entry-foot{display:flex;flex-direction:column;align-items:flex-start;gap:3px;padding:0 2px;min-width:0}
.nm2-meta{font-size:10px;line-height:1.3;color:var(--dsw-alias-label-tertiary,#8b8d98);font-family:ui-monospace,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nm2-foot-acts{display:flex;gap:4px;flex-shrink:0}
.nm2-btn.small{height:20px;padding:0 8px;font-size:10.5px}
/* 「更多」悬浮菜单（多行选项） */
.nm2-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:26px;z-index:70;max-width:min(560px,86vw);background:rgba(24,24,27,.94);color:#fff;font-size:12px;line-height:1.6;padding:9px 15px;border-radius:9px;box-shadow:0 8px 28px rgba(0,0,0,.3);text-align:center;pointer-events:none}
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
  const isRule = card.state === 'rule'
  return (
    <div className="nm2-entry">
      {/* 卡片盒子：只放内容（标题独占整行，标签在盒内底部） */}
      <div className={`nm2-card ${card.origin === 'default' ? 'dflt' : 'cstm'}${card.enabled ? '' : ' off'}`} onClick={onOpen}>
        <div className="nm2-card-name one-line">{card.name}</div>
        <div className="nm2-kw">
          {card.keywords.length ? card.keywords.map((w) => <span key={w}>{w}</span>) : <span>（无关键词）</span>}
        </div>
        <div className="nm2-card-foot">
          <OriginTag origin={card.origin} />
          {isRule ? <span className="nm2-tag rule">动态</span> : null}
          {card.enabled ? null : <span className="nm2-tag">已停用</span>}
          {card.tags.map((t) => <span key={t.id} className="nm2-tag user">{t.name}</span>)}
        </div>
      </div>
      {/* 盒子外底部：极小字的版本号 + 修改时间，以及按钮 */}
      <div className="nm2-entry-foot">
        <span className="nm2-meta" title={`修改于 ${fmtTime(card.updatedAt)}`}>{fmtDate(card.updatedAt)}</span>
        <span className="nm2-foot-acts">
          <button className="nm2-btn small" disabled={busy} onClick={onToggle}>{card.enabled ? '停用' : '启用'}</button>
          {card.permEnabled && card.permCurrentLevelId ? (
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

export function HandnoteTabView(props: ConvViewProps & { __testData?: AllData; __testSub?: 'rules' | 'memo' | 'settings' }) {
  const [data, setData] = useState<AllData | null>(props.__testData ?? null)
  const [err, setErr] = useState('')
  const [sub, setSub] = useState<'rules' | 'memo' | 'settings'>(props.__testSub ?? 'rules')
  const [pane, setPane] = useState<'create' | 'trash' | 'tags'>('create')
  const [detail, setDetail] = useState<Detail | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ name: '', keywords: '', tagIds: [] as number[], content: '', version: 1 })
  const [form, setForm] = useState({ name: '', keywords: '', tagIds: [] as number[], content: '', version: 1 })
  const [trash, setTrash] = useState<MemoCard[]>([])
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
        tags: d.tags ?? [],
      })
      if (sub === 'settings' && pane === 'trash') {
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

  const openDetail = (d: Detail) => {
    setDetail(d); setEditing(false); setNote(''); setMenu(null)
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
  const [toast, setToast] = useState<string>('')
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
    const created = await act('/nio-memo/api/create', form, '已创建（自定义 · 备忘区）')
    if (created) { setForm({ name: '', keywords: '', tagIds: [], content: '', version: 1 }); setSub('memo'); setDetail({ kind: 'card', item: created }) }
  }
  const userTags = (data?.tags ?? []).filter((t) => !t.system)

  /** 某标签下的卡片：系统标签（默认/自定义）按 origin 过滤，其余按打标过滤 */
  const tagCards = (tag: Tag): MemoCard[] => {
    if (tag.system) {
      const origin: Origin = tag.name === '默认' ? 'default' : 'custom'
      return data.memos.concat(data.rules).filter((c) => c.origin === origin)
    }
    return data.memos.concat(data.rules).filter((c) => c.tags.some((t) => t.id === tag.id))
  }

  const head = (
    <div className="nm2-head">
      <div className="nm2-head-title">手记</div>
      <div className="nm2-tabs">
        <button className={sub === 'rules' ? 'on' : ''} onClick={() => { setSub('rules'); setDetail(null) }}>
          <span>规矩</span><b>{data ? data.iron.length + data.rules.length : ''}</b>
        </button>
        <button className={sub === 'memo' ? 'on' : ''} onClick={() => { setSub('memo'); setDetail(null) }}>
          <span>备忘</span><b>{data ? data.memos.length : ''}</b>
        </button>
        <button className={sub === 'settings' ? 'on' : ''} onClick={() => { setSub('settings'); setDetail(null) }}>
          <span>设置</span>{data?.trashCount ? <b>🗑{data.trashCount}</b> : null}
        </button>
      </div>
    </div>
  )

  if (err) return <div className="nm2-panel">{head}<div className="nm2-main"><div className="nm2-err">手记读取失败：{err}</div></div></div>
  if (!data) return <div className="nm2-panel">{head}<div className="nm2-main"><div className="nm2-empty">加载中…</div></div></div>

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
      <div className="nm2-panel">
        {toast ? <div className="nm2-toast">{toast}</div> : null}
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
                    <button className="nm2-btn primary" disabled={busy}
                      onClick={() => void act(detail.item.state === 'rule' ? '/nio-memo/api/demote' : '/nio-memo/api/promote', { id: detail.item.id })}>
                      {detail.item.state === 'rule' ? '降为备忘' : '立为规矩'}
                    </button>
                    <button className="nm2-btn" disabled={busy} onClick={() => startEdit(detail.item as MemoCard)}>编辑</button>
                    <button className="nm2-btn" disabled={busy}
                      onClick={async () => { const c = await act('/nio-memo/api/copy', { id: detail.item.id }, '已复制为自定义卡'); if (c) setDetail({ kind: 'card', item: c }) }}>复制</button>
                    <button className="nm2-btn" disabled={busy}
                      onClick={() => setTagModal({ card: detail.item as MemoCard, selected: (detail.item as MemoCard).tags.map((t) => t.id).filter((id) => userTags.some((t) => t.id === id)) })}>打标</button>
                    <button className="nm2-btn danger" disabled={busy}
                      onClick={async () => { const c = await act('/nio-memo/api/delete', { id: detail.item.id }, '已移入回收站'); if (c) setDetail(null) }}>删除</button>
                  </div>
                  {renderMd(detail.item.content)}
                  <PermBoard
                    kind="card" id={detail.item.id}
                    permEnabled={detail.item.permEnabled} levels={detail.item.permLevels}
                    currentLevelId={detail.item.permCurrentLevelId} currentLevelName={detail.item.permCurrentLevelName}
                    busy={busy} act={act} onFlash={flash}
                    onOpenLevelMenu={(el) => openLevelMenu('card', detail.item.id, detail.item.permLevels, detail.item.permCurrentLevelId, el)} />
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
                await act('/nio-memo/api/batch', { ids, op, state }, `批量操作完成（${ids.length} 张）`)
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

  return (
    <div className="nm2-panel">
      {head}
      <div className="nm2-main">
        {note ? <div className={note.startsWith('✗') ? 'nm2-err' : 'nm2-help'}>{note}</div> : null}

        {sub === 'rules' ? (
          <>
            <div className="nm2-help">
              <b>规矩</b>＝必须遵守的规则，<b>默认注入系统提示词</b>。「铁律」锁死——不可编辑、不可关闭，每轮无条件全文注入；
              「动态规矩」启用时每轮全文注入，可随时关闭、降为备忘。<b>默认</b>＝官方维护（提公共库只抽默认），<b>自定义</b>＝自己建的。
            </div>
            <div className="nm2-sec">铁律（锁死 · 每轮无条件全文注入）<small>{data.iron.length} 条</small></div>
            <div className="nm2-grid">
              {data.iron.map((c) => (
                <div className="nm2-entry" key={`i${c.id}`}>
                  {/* 盒子：只放内容 */}
                  <div className={`nm2-card ${c.origin === 'default' ? 'dflt' : 'cstm'}`} onClick={() => openDetail({ kind: 'iron', item: c })}>
                    <div className="nm2-card-name one-line">{c.title}</div>
                    <div className="nm2-card-foot">
                      <OriginTag origin={c.origin} />
                      <span className="nm2-tag lock">锁死</span>
                    </div>
                  </div>
                  {/* 盒子外底部：档位按钮（与「DSH重启方式」等卡片同一位置口径） */}
                  {c.permEnabled && c.permCurrentLevelId ? (
                    <div className="nm2-entry-foot">
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
        ) : sub === 'memo' ? (
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
              <button className={pane === 'create' ? 'on' : ''} onClick={() => setPane('create')}>创建</button>
              <button className={pane === 'tags' ? 'on' : ''} onClick={() => setPane('tags')}>标签</button>
              <button className={pane === 'trash' ? 'on' : ''} onClick={() => { setPane('trash'); void load() }}>回收站{data.trashCount ? `（${data.trashCount}）` : ''}</button>
            </div>

            {pane === 'create' ? (
              <>
                <div className="nm2-help">
                  手写一张 <b>自定义</b> 卡（落「备忘」区，之后可「立为规矩」）。
                </div>
                <div className="nm2-tip">
                  💡 <b>交给 agent 创建往往更方便有效</b>——你说一句「记住这个」，它会把关键词、正文格式与标签一次写到位。
                </div>
                <div className="nm2-form">
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
                    <button className="nm2-btn primary" disabled={busy || !form.name.trim()} onClick={() => void submitCreate()}>创建</button>
                    <button className="nm2-btn" disabled={busy} onClick={() => setForm({ name: '', keywords: '', tagIds: [], content: '', version: 1 })}>清空</button>
                  </div>
                </div>
              </>
            ) : pane === 'trash' ? (
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
                          <span className="nm2-tag">{c.state === 'rule' ? '动态规矩' : '备忘'}</span>
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
                <button onClick={() => {
                  const c = menu.card; setMenu(null)
                  void act(c.state === 'rule' ? '/nio-memo/api/demote' : '/nio-memo/api/promote', { id: c.id })
                }}>{menu.card.state === 'rule' ? '降为备忘' : '立为规矩'}</button>
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
                <span className="nm2-tag">{c.state === 'rule' ? '动态规矩' : '备忘'}</span>
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
