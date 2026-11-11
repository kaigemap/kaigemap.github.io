// node tools/record/run.mjs [slug ...]   -> media/<slug>.mp4 + media/<slug>.jpg
// Each flows/<slug>.mjs exports: url, default async (s) => { ... } and optional
// `options` ({ width, height }) and `poster` (0..1, where in the clip to take the poster).
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { launch } from './cdp.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const media = resolve(here, '../../media')
const wanted = process.argv.slice(2)
const slugs = wanted.length ? wanted : readdirSync(join(here, 'flows')).filter((f) => f.endsWith('.mjs')).map((f) => f.slice(0, -4))

for (const slug of slugs) {
  const flow = await import(join(here, 'flows', `${slug}.mjs`))
  const phone = slug.endsWith('.phone')
  const s = await launch(phone ? { width: 390, height: 844, scale: 2, touch: true, ...flow.options } : flow.options)
  try {
    await s.open(flow.url, flow.settle ?? 1200)
    if (flow.prepare) await flow.prepare(s)
    await s.startRecording()
    await flow.default(s)
    const name = phone ? slug.replace(/\.phone$/, '-phone') : slug
    const r = await s.stopRecording(join(media, name), { poster: flow.poster ?? 0.6, ...(phone ? { outWidth: 540, crf: 27 } : {}) })
    console.log(`${slug}: ${r.frames} frames, ${r.seconds.toFixed(1)}s`)
  } catch (e) {
    console.error(`${slug}: ${e.message}`)
    process.exitCode = 1
  } finally {
    await s.close()
  }
}
