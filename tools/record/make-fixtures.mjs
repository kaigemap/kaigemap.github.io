// node tools/record/make-fixtures.mjs -> tools/record/fixtures/* (demo content used by the flows)
// The art itself lives in art.mjs (an imaginary game 「空もよう」).
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { launch } from './cdp.mjs'
import * as A from './art.mjs'

const out = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')
mkdirSync(out, { recursive: true })

const jobs = [
  ['box-front.png', 1000, 1000, A.boxFront()],
  ['box-front-red.png', 1000, 1000, A.boxFront(A.C.red)],
  ['box-back.png', 1000, 1000, A.boxBack],
  ['box-left.png', 260, 1000, A.boxSideV],
  ['box-right.png', 260, 1000, A.boxSideV],
  ['box-top.png', 1000, 260, A.boxSideH],
  ['box-bottom.png', 1000, 260, A.boxSideH],
  ['card-back.png', 630, 880, A.back],
  ...A.DECK.map(([k, n], i) => [`card-${String(i + 1).padStart(2, '0')}.png`, 630, 880, A.card(k, n)]),
  ['soramoyo-box.png', 1000, 1000, A.boxFront()],
  ['soramoyo-cards.png', 2400, 1200, A.cardsRow],
  ...A.KINDS.map(([id], k) => [`sticker-${id}.png`, 600, 600, A.sticker(k)]),
]

const s = await launch({ width: 1000, height: 1000, scale: 1, cursor: false })
for (const [name, w, h, html] of jobs) {
  await s.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false })
  await s.open('data:text/html;base64,' + Buffer.from(html).toString('base64'), 300)
  const transparent = name.startsWith('card') || name.startsWith('sticker')
  if (transparent) await s.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } })
  const { data } = await s.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: w, height: h, scale: 1 } })
  if (transparent) await s.send('Emulation.setDefaultBackgroundColorOverride', {})
  writeFileSync(join(out, name), Buffer.from(data, 'base64'))
}
await s.close()
writeFileSync(join(out, 'cards.csv'), A.CSV)
writeFileSync(join(out, 'blog.html'), A.BLOG_HTML)
console.log('fixtures:', jobs.length + 2)
