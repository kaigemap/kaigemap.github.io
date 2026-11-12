import { BOX } from './_fx.mjs'
export const url = 'https://kaigemap.github.io/hakogazou/'
export const prepare = async (s) => {
  await s.files('#bulk-upload', BOX)
  await s.eval(`new Promise((r) => { const t = Date.now(); const f = () => { const toast = [...document.querySelectorAll('body *')].find((e) => e.children.length === 0 && /割り当て/.test(e.textContent) && e.getClientRects().length); if (!toast || Date.now() - t > 9000) r(); else setTimeout(f, 200) }; setTimeout(f, 800) })`)
  await s.sleep(600)
}
export default async (s) => {
  await s.sleep(2400)
  await s.scrollBy(420)
  await s.sleep(1500)
  await s.scrollBy(-420)
  await s.sleep(2600)
}
