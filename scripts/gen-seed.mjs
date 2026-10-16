/**
 * gen-seed.mjs — 从现行生效铁律真源抽取「条例」，生成 src/seed.ts。
 *
 * 真源（本机 .nio-memory 现行注入面；目录由环境变量 NIO_MEMO_SEED_CARDS 指定）：
 *   ① 通用/核心通用/核心通用.md   → 「# 通用铁律（核心）」段
 *   ② 本机/本机.md               → 「# 本机铁律」段
 *   ③ 通用/DSH通用/DSH通用.md     → 「# 通用铁律（DSH 专属）」段
 * 每段按 `## ` 切条；标题即条题，正文含该条全文（含 8.0/8.1 之类子节）。
 *
 * 默认卡片 4 张（官方默认集；正文在仓库内 content/cards/，已脱敏 / 去内部标注）：
 *   - content/cards/本机主机.md                        （备忘）
 *   - content/cards/语言规范.md                        （动态规矩）
 *   - content/cards/不擅自增加功能（最小改动原则）.md   （备忘）
 *   - content/cards/DSH重启方式.md                     （备忘，自带权限板块）
 * ⚠️ 示例卡正文**只能来自本仓库**：不得再引用任何本机 / 个人真源目录，
 *    否则会把私人数据带进公共发布集（2026-10-16 泄漏事故的根因，勿回退）。
 *
 * 用法：node scripts/gen-seed.mjs   （在插件根目录跑；只读真源、只写 src/seed.ts）
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
/**
 * 旧「记忆卡片」真源目录。
 * ⚠️ 2026-10-15 起该体系已退役并 chattr +i 冻结（手记备忘「旧记忆卡片已退役」）：
 *    本脚本只在**需要从旧真源重建 src/seed.ts** 时才用，日常不跑。
 * F9（T9）：目录不在时**显式报错退出**（不再抛裸 ENOENT）；可用 NIO_MEMO_SEED_CARDS
 *    指向解包后的归档目录（如从 记忆卡片.冻结前备份-*.tar.gz 解出的目录）。
 */
const CARDS = process.env.NIO_MEMO_SEED_CARDS?.trim()
if (!CARDS || !existsSync(CARDS)) {
  console.error(`✗ 未指定（或不存在）旧「记忆卡片」真源目录：${CARDS ?? '(未设置 NIO_MEMO_SEED_CARDS)'}
  该体系已退役（2026-10-15「旧记忆卡片已冻结」）；本脚本仅用于从旧真源重建 src/seed.ts。
  请显式指定目录重跑：NIO_MEMO_SEED_CARDS=<解包目录> node scripts/gen-seed.mjs
  （目录需含 通用/核心通用/核心通用.md、本机/本机.md、通用/DSH通用/DSH通用.md）
  ⚠ 默认示例卡不走这条路：其正文固定取自仓库内 content/cards/。`)
  process.exit(1)
}

/** 从一段文本里切出 [startHeading, endHeading) 区间 */
function section(text, startHeading, endHeading) {
  const s = text.indexOf(startHeading)
  if (s < 0) throw new Error(`找不到起始标题：${startHeading}`)
  const e = text.indexOf(endHeading, s + startHeading.length)
  if (e < 0) throw new Error(`找不到结束标题：${endHeading}`)
  return text.slice(s, e).trim()
}

/** 把「# 段标题」下的正文按 `## ` 切条 */
function clauses(segment, group) {
  const out = []
  const parts = segment.split(/\n(?=## )/)
  for (const p of parts) {
    const t = p.trim()
    if (!t.startsWith('## ')) continue // 段标题行本身跳过
    const nl = t.indexOf('\n')
    const title = (nl < 0 ? t.slice(3) : t.slice(3, nl)).trim()
    const content = t
    out.push({ group, title, path: `规矩/铁律/${title}.md`, content })
  }
  return out
}

const core = readFileSync(join(CARDS, '通用/核心通用/核心通用.md'), 'utf8')
const local = readFileSync(join(CARDS, '本机/本机.md'), 'utf8')
const dsh = readFileSync(join(CARDS, '通用/DSH通用/DSH通用.md'), 'utf8')

const rawIron = [
  ...clauses(section(core, '# 通用铁律（核心）', '# 手记索引'), '核心'),
  ...clauses(section(local, '# 本机铁律', '# 手记索引'), '本机'),
  ...clauses(section(dsh, '# 通用铁律（DSH 专属）', '# 手记索引'), 'DSH'),
]

/**
 * 入库裁决（用户 2026-10-15 拍板）：
 *   ①「记忆卡片维护」改写为手记（nio-Memo）口径——本机库为真源、备忘卡/动态规矩/铁律三档
 *   ② 下列三条从「铁律」改入「动态规矩」（仍每轮全文注入，但可启停、可降为备忘）
 */
const OVERRIDES = {
  '记忆卡片维护': [
    '## 手记卡片维护（手记 · nio-Memo）',
    '',
    '**触发点（任一命中即写卡）**：',
    '- 用户强调「**记住这个 / 记下来 / 以后都用**」→ 写入「手记」库为**备忘卡**（卡片名 / 关键词 / 逻辑路径 / 正文），并**告知已写入**（不悄悄记）。',
    '- 用户明确说「**这是铁律 / 这是规矩**」→ 写入**规矩**区：铁律条例（锁死 · 每轮必注入）或**动态规矩**（可启停），并告知已写入；不降级塞进备忘卡。',
    '- 用户**明确纠正**了我的做法，且该纠正属通用口径（换台机器/换个任务也成立）→ 落成卡片。',
    '- 会话中确认了**可复用的新事实**：新设备 / 新路径 / 新账号 / 新流程 / 新坑与绕法 → 落成卡片（尤其"下次还会用到"的）。',
    '- 同一问题**第二次**出现（上次靠临时判断解决）→ 落成卡片，别再临时判断第三次。',
    '- 用户对某类事的**偏好/口径**（输出格式、语言、粒度、先问还是先做）→ 落成卡片或动态规矩。',
    '',
    '**落位口径（默认从严）**：',
    '- **除非用户明确强调「这是规矩 / 铁律」，否则新卡片通常只能落入「备忘」区**——即默认按「按需查阅」处理，不主动升级为每轮注入，免得悄悄吃掉上下文。',
    '- 要升级，须有用户的明确表述（「这是规矩」「以后每轮都要遵守」），或用户事后在「手记」Tab 里手动点「立为规矩」。',
    '- 必须遵守、要每轮生效 → 规矩区；按需查阅、平时别占上下文 → 备忘卡。',
    '- 拿不准时**先落备忘**，并说明「已记为备忘卡，如需每轮遵守请说一声，我立为规矩」。',
    '',
    '**维护口径**：库为唯一真源 `~/.dsh/nio-memo/memo.db`（全局库，不绑项目）；卡片路径由区+卡名派生；停用卡不进注入索引；',
    '默认卡（官方维护）尽量别改——需要改就**复制**成自定义卡或先**关闭**；删除进回收站，可恢复。',
    '条例/卡片更新需明确版本与日期。',
  ].join('\n'),
}
/** 只有这一条留在「铁律」（锁死区）；其余全部转为「动态规矩」 */
const KEEP_IN_IRON = ['记忆卡片维护']
const DEMOTE_TO_RULES = rawIron.filter((c) => !KEEP_IN_IRON.includes(c.title)).map((c) => c.title)

/**
 * 动态规矩的来源与关键词（用户 2026-10-15 拍板）：
 *   默认动态规矩（官方维护，提公共库只抽默认）= 禁止静默兜底 / 失败显式化 / 改动前备份 / 交互性决策
 *   其余 = 自定义
 */
const DEFAULT_RULES = [
  '禁止静默兜底（v2.4.5）',
  '失败显式化',
  '改动前备份',
  '凡需用户反馈/决策的，一律走交互性决策（v2.11 · 2026-10-14）',
]
const RULE_KEYWORDS = {
  '禁止静默兜底（v2.4.5）': ['静默兜底', '降级', '兜底', '失败报错'],
  '失败显式化': ['失败', '降级', '可追溯', '路径'],
  '改动前备份': ['备份', '迁移', '事务', '回滚', '运行时数据'],
  '禁止只发编号；自造代号就地说明（v3.0 · 2026-10-14）': ['编号', '代号', '缩写', '命名'],
  '最小动作原则：先答后查，不擅自发挥（v2.9.1 · 2026-10-08）': ['最小动作', '克制', '先答后查', '擅自扩大'],
  '凡需用户反馈/决策的，一律走交互性决策（v2.11 · 2026-10-14）': ['交互性决策', '拍板', '选择题', '用户反馈'],
  '通用卡片只许「整理」时新增（v5.0 · 2026-10-14）': ['通用卡', '整理', '分发', '本机卡'],
  'forge 身份全程显式（v2.7 · 2026-09-11）': ['forge', '身份', '--as', '哨', '租约'],
  '改动需 reload 生效': ['reload', '重启', '插件', '生效'],
}

const seedRules = DEMOTE_TO_RULES.filter((t) => DEFAULT_RULES.includes(t)).map((t) => {
  const c = rawIron.find((x) => x.title === t)
  if (!c) throw new Error(`降级条例未找到：${t}`)
  return {
    name: t,
    keywords: RULE_KEYWORDS[t] ?? [],
    path: `规矩/动态/${t}.md`,
    content: c.content,
    origin: DEFAULT_RULES.includes(t) ? 'default' : 'custom',
  }
})
/** 条题改名（2026-10-15 用户：记忆卡片维护 → 手记卡片维护） */
const TITLE_OVERRIDES = { '记忆卡片维护': '手记卡片维护' }

const iron = rawIron
  .filter((c) => !DEMOTE_TO_RULES.includes(c.title))
  .map((c) => {
    const title = TITLE_OVERRIDES[c.title] ?? c.title
    return {
      ...c,
      title,
      path: `规矩/铁律/${title}.md`,
      content: OVERRIDES[c.title] ?? c.content,
    }
  })

/** 默认卡片：正文一律取自本仓库 content/cards/，显式标 origin='default'（进公共发布集）。
 *  state 决定播种到哪个区：缺省 memo（备忘）；'rule' = 动态规矩（每轮全文注入）。 */
const SAMPLE_DIR = join(ROOT, 'content/cards')

const samples = [
  {
    name: '本机主机',
    keywords: ['本机', '主机', '硬件'],
    path: '备忘/本机主机.md',
    content: readFileSync(join(SAMPLE_DIR, '本机主机.md'), 'utf8').trim(),
    origin: 'default',
  },
  {
    // 动态规矩（state=rule）：每轮全文注入，可启停 / 可降为备忘
    name: '语言规范',
    keywords: ['语言规范', '默认中文'],
    path: '规矩/动态/语言规范.md',
    content: readFileSync(join(SAMPLE_DIR, '语言规范.md'), 'utf8').trim(),
    origin: 'default',
    state: 'rule',
  },
  {
    name: '不擅自增加功能（最小改动原则）',
    keywords: ['擅自增加', '未经同意', '功能膨胀', '最小改动', '先问再做'],
    path: '备忘/不擅自增加功能（最小改动原则）.md',
    content: readFileSync(join(SAMPLE_DIR, '不擅自增加功能（最小改动原则）.md'), 'utf8').trim(),
    origin: 'default',
  },
  {
    // 默认卡片 + 权限板块（档位 禁止/允许，默认停「禁止」）
    name: 'DSH重启方式',
    keywords: ['重启', 'dsh.service', 'systemd', 'hard-refresh'],
    path: '备忘/DSH重启方式.md',
    content: readFileSync(join(SAMPLE_DIR, 'DSH重启方式.md'), 'utf8').trim(),
    origin: 'default',
    perm: {
      levels: [
        { name: '禁止', content: '不允许。任何 dsh.service 重启（立即或延迟排程）都必须先取得用户明确授权；改完只能汇报「需要重启才生效」，然后停手等用户发话。', color: 'red' },
        { name: '允许', content: '允许 agent 在改动完成后自行排程重启（用延迟方式，避免打断正在发送的回复），并在留痕里写明重启原因与排程编号。', color: 'blue' },
      ],
      current: 0,
    },
  },
]

const INDEX_NOTE = `# 手记 · 备忘索引

> 命中关键词 → 用 \`nio_memo(路径)\` 取卡全文（路径终生不变）。
> 备忘卡：默认只注入清单（卡片名 / 关键词 / 路径），命中才取全文。
> 动态规矩：见「规矩」区，启用中的卡片**全文**每轮注入。
> 铁律条例：锁死，每轮无条件全文注入。`

const body = `/**
 * seed.ts — 由 scripts/gen-seed.mjs 生成，勿手改（改真源后重跑）。
 * 真源：铁律三份（本机 .nio-memory 现行注入面）+ content/cards/ 三张默认卡片。
 */
export interface SeedClause { group: string; title: string; path: string; content: string }
export interface SeedCard {
  name: string; keywords: string[]; path: string; content: string; origin?: 'default' | 'custom'
  /** 播种到哪个区：缺省 memo（备忘）；'rule' = 动态规矩（每轮全文注入） */
  state?: 'memo' | 'rule'
  /** 默认权限板块（可选）：档位 名/内容/颜色 + 默认当前档序号 */
  perm?: { levels: Array<{ name: string; content: string; color: string }>; current: number }
}

export const INDEX_NOTE = ${JSON.stringify(INDEX_NOTE)};

export const IRON_CLAUSES: SeedClause[] = ${JSON.stringify(iron, null, 2)};

export const SEED_RULES: SeedCard[] = ${JSON.stringify(seedRules, null, 2)};

export const SAMPLE_CARDS: SeedCard[] = ${JSON.stringify(samples, null, 2)};
`

writeFileSync(join(ROOT, 'src/seed.ts'), body)
console.log(`seed.ts written: ${iron.length} clauses, ${seedRules.length} dynamic rules, ${samples.length} memo cards`)
