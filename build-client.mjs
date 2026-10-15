/**
 * Build the dsh-nio-memo client bundle.
 *
 * Produces lib/client.js in the exact wire format the DSH web shell expects:
 * a CJS factory handed to window.__ModuleLoader__.load({ id, factory }), with
 * platform modules resolved through the injected require and everything else
 * inlined. CSS imported as text and injected by the entry's apply().
 *
 * esbuild is resolved from the DSH source checkout.
 */
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync, readFileSync, readdirSync } from 'node:fs'

const ROOT = dirname(fileURLToPath(import.meta.url))
/** DSH source checkout root; override with $DSH_SOURCE when not the default. */
const CHECKOUT = process.env.DSH_SOURCE ?? '/path/to/dsh-checkout'

/** Loader entry name — must equal the patch row `name` EXACTLY (package.json name). */
const MANIFEST = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const PLUGIN_ID = MANIFEST.name

/** Platform module table (must stay aligned with packages/client/web/src/platform.ts + the runtime exemption). */
const EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  'cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-schema-form',
  '@deepseek-ai/dsh-client-runtime/client',
]

/**
 * esbuild 的解析顺序（align-188/T9 · D3-8，与 build-host.mjs 同款）：
 *   ① node 自己的模块解析 —— 两平台同一条路，且与「装在哪儿」无关；
 *   ② $DSH_SOURCE 指定的检出（显式覆盖，保留）；
 *   ③ 历史默认值 /path/to/dsh-checkout（只作兜底，不再首选）。
 * 上面的 CHECKOUT 常量保留给使用者作默认提示，不再直接拿来解析。
 */
function resolveEsbuild() {
  const selfRequire = createRequire(import.meta.url)
  try {
    return selfRequire.resolve('esbuild')
  } catch { /* 落到检出路径 */ }
  const checkout = process.env.DSH_SOURCE ?? '/path/to/dsh-checkout'
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

const banner = [
  `window.__ModuleLoader__.load({ id: ${JSON.stringify(PLUGIN_ID)}, factory: (require) => {`,
  'var module = { exports: {} }; var exports = module.exports;',
].join('\n')
const footer = 'return module.exports; } });'

await esbuild.build({
  entryPoints: [join(ROOT, 'client/index.tsx')],
  outfile: join(ROOT, 'lib/client.js'),
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  external: EXTERNALS,
  define: {
    'process.env.NODE_ENV': '"production"',
    'import.meta.env.MODE': '"production"',
    'import.meta.env': '{"MODE":"production"}',
  },
  loader: { '.css': 'text' },
  jsx: 'automatic',
  jsxImportSource: 'react',
  banner: { js: banner },
  footer: { js: footer },
})

console.log('lib/client.js built (id=' + PLUGIN_ID + ')')
