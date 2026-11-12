import { STICKERS } from './_fx.mjs'
export const url = 'https://sticker-sheet-simulator.pages.dev/'
export const prepare = async (s) => {
  await s.files('#file-input', STICKERS)
  await s.sleep(2500)
}
export default async (s) => {
  await s.sleep(800)
  await s.eval(`(() => { const b = [...document.querySelectorAll('button')].filter((e) => /を 1 枚増やす|1 more/.test(e.getAttribute('aria-label') || '') && e.getClientRects().length); b.slice(-6).forEach((e, i) => { e.dataset.rec = 'plus' + i }) })()`)
  const ok = await s.eval(`!!document.querySelector('[data-rec=plus0]')`)
  if (ok) for (const i of [0, 0, 3]) { await s.tap(`[data-rec=plus${i}]`, { ms: 450 }); await s.sleep(600) }
  await s.sleep(1500)
  await s.scrollBy(-200)
  await s.sleep(1500)
}
