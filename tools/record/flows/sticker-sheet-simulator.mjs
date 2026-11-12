import { STICKERS } from './_fx.mjs'
export const url = 'https://sticker-sheet-simulator.pages.dev/'
// the six weather stickers are already on the sheet; add more of two of them, then pack tighter
export const prepare = async (s) => {
  await s.files('#file-input', STICKERS)
  await s.sleep(2500)
}
export default async (s) => {
  const home = { x: 760, y: 820 }
  await s.moveTo(home, 10)
  await s.sleep(1000)
  const plus = await s.eval(`(() => { const b = [...document.querySelectorAll('button')].filter((e) => /を 1 枚増やす|1 more/.test(e.getAttribute('aria-label') || '') && e.getClientRects().length); return b.slice(-6).map((e, i) => { e.dataset.rec = 'plus' + i; return i }) })()`)
  for (const i of [0, 0, 3, 3]) { await s.click(`[data-rec=plus${i}]`, { ms: 600 }); await s.sleep(500) }
  await s.sleep(800)
  await s.click('#pack-more', { ms: 800 })
  await s.sleep(2200)
  await s.moveTo(home, 800)
  await s.sleep(400)
}
