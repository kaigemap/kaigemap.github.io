import { fileURLToPath } from 'node:url'
const fx = (n) => fileURLToPath(new URL('../fixtures/' + n, import.meta.url))
export const url = 'https://kaigemap.github.io/zatsucard/'
export const poster = 0.7
export const prepare = (s) => s.eval(`(() => { const e = document.querySelector('[class*=preview-grid], #cardGrid, #previewGrid, .card-grid, .cards'); if (e) e.dataset.rec = 'cards' })()`)
export default async (s) => {
  await s.sleep(500)
  await s.tap('#csvInput', { ms: 600 })
  await s.sleep(300)
  await s.files('#csvInput', [fx('cards.csv')])
  await s.sleep(1200)
  const y = await s.eval(`(() => { const all = [...document.querySelectorAll('canvas, img')].filter(e => e.getBoundingClientRect().width > 100); const e = all[0]; return e ? e.getBoundingClientRect().top + scrollY : 1200 })()`)
  await s.scrollBy(Math.max(300, y - 140), 560)
  await s.sleep(1600)
  await s.scrollBy(520)
  await s.sleep(1600)
}
