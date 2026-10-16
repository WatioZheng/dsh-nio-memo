/**
 * Build the dsh-nio-memo host bundle.
 *
 * Produces lib/index.js — the cross-platform ESM entry the DSH loader imports
 * (package.json "main"). Externalizes @deepseek-ai/* (resolved from the DSH
 * profile/checkout at runtime) and node:* builtins.
 *
 * esbuild is resolved from the DSH source checkout (same as build-client.mjs);
 * override the checkout with $DSH_SOURCE.
 */
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, readdirSync } from 'node:fs'

const ROOT = dirname(fileURLToPath(import.meta.url))

/**
 * esbuild 的解析顺序（align-188/T9 · D3-8）：
 *   ① node 自己的模块解析 —— 两平台同一条路，而且与「装在哪儿」无关（原来缺的正是这一级）；
 *   ② $DSH_SOURCE 指定的检出（显式覆盖，保留）；
 *   ③ 默认值「插件同级目录下的 deepseek-harness」—— ⚠ 只在检出恰在该位置时成立。
 *      留作兜底以免破坏 127/102 的既有习惯，但**不再首选**：原实现把它写死成默认值，
 *      于是 188（全局 npm 安装、没有该目录）上 `node build-host.mjs` 开箱即失败。
 */
function resolveEsbuild() {
  const selfRequire = createRequire(import.meta.url)
  try {
    return selfRequire.resolve('esbuild')
  } catch { /* 落到检出路径 */ }
  const checkout = process.env.DSH_SOURCE ?? join(ROOT, '..', 'deepseek-harness')
  const store = join(checkout, 'node_modules/.pnpm')
  if (existsSync(store)) {
    const entries = readdirSync(store).filter((name) => name.startsWith('esbuild@')).sort()
    for (let i = entries.length - 1; i >= 0; i -= 1) {
      const candidate = join(store, entries[i], 'node_modules/esbuild/package.json')
      if (existsSync(candidate)) return candidate
    }
  }
  const hoisted = join(checkout, 'node_modules/esbuild/package.json')
  if (existsSync(hoisted)) return hoisted
  throw new Error(
    `esbuild not found: tried node module resolution, then $DSH_SOURCE / ${checkout}`
    + ' (point DSH_SOURCE at a checkout that has esbuild, or make esbuild resolvable by node)',
  )
}

const require = createRequire(resolveEsbuild())
const esbuild = require('esbuild')

await esbuild.build({
  entryPoints: [join(ROOT, 'src/index.ts')],
  outfile: join(ROOT, 'lib/index.js'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  external: ['@deepseek-ai/*', 'node:*'],
  loader: { '.ts': 'ts' },
})

console.log('lib/index.js built (host, cross-platform ESM)')
