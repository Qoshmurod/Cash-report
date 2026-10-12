// Verifies that every translation key used in the app exists in every locale file,
// and that all locale files have the same key set.  Usage: node scripts/check-i18n.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const locales = ['uz', 'ru']
const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) => (v && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`]))
const files = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? files(p) : /\.(vue|ts)$/.test(f) ? [p] : []
  })

const used = new Set()
const KEY = /['`]((?:app|nav|common|table|auth|password|profile|person|avatar|validation|errors|errorPage|realtime|export|enums|weekdays|weekdaysShort|dashboard|reports|patients|visits|staff|doctor|doctors|departments|services|queues|payments|receipt|registrar|checkout|doctorCabinet|kiosk|display|voice|loginHistory|audit|settings|toast)\.[A-Za-z0-9_.]+)['`]/g
for (const f of files(join(root, 'app'))) {
  for (const m of readFileSync(f, 'utf8').matchAll(KEY)) used.add(m[1])
}
let failed = false
const sets = {}
for (const l of locales) {
  sets[l] = new Set(flatten(JSON.parse(readFileSync(join(root, 'i18n/locales', `${l}.json`), 'utf8'))))
  const missing = [...used].filter((k) => !sets[l].has(k) && ![...sets[l]].some((s) => s.startsWith(`${k}.`)))
  if (missing.length) {
    failed = true
    console.error(`[${l}] missing ${missing.length} keys:\n  ${missing.join('\n  ')}`)
  }
}
const [a, b] = locales
const diffA = [...sets[a]].filter((k) => !sets[b].has(k))
const diffB = [...sets[b]].filter((k) => !sets[a].has(k))
if (diffA.length || diffB.length) {
  failed = true
  console.error(`only in ${a}: ${diffA.join(', ')}\nonly in ${b}: ${diffB.join(', ')}`)
}
console.log(failed ? 'i18n check FAILED' : `i18n check OK (${used.size} keys used, ${sets[a].size} defined)`)
process.exit(failed ? 1 : 0)
