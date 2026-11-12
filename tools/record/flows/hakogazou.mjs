import { BOX } from './_fx.mjs'
export const url = 'https://kaigemap.github.io/hakogazou/'
// start with the box already built, then lay it down and stand it up again
export const prepare = async (s) => {
  await s.files('#bulk-upload', BOX)
  await s.eval(`new Promise((r) => { const t = Date.now(); const f = () => { const toast = [...document.querySelectorAll('body *')].find((e) => e.children.length === 0 && /割り当て/.test(e.textContent) && e.getClientRects().length); if (!toast || Date.now() - t > 9000) r(); else setTimeout(f, 200) }; setTimeout(f, 800) })`)
  await s.sleep(600)
}
export default async (s) => {
  const home = { x: 560, y: 780 }
  await s.moveTo(home, 10)
  await s.sleep(1600)
  await s.click('.segmented-option[data-value=lay]', { ms: 800 })
  await s.sleep(2800)
  await s.click('.segmented-option[data-value=stand]', { ms: 700 })
  await s.sleep(2200)
  await s.moveTo(home, 800)
  await s.sleep(900)
}
