import { fileURLToPath } from 'node:url'
const fx = (n) => fileURLToPath(new URL('../fixtures/' + n, import.meta.url))
export const url = 'https://kaigemap.github.io/zatsucard/'
export const poster = 0.75
const setColor = (s, sel, v) => s.eval(`(() => { const e = document.querySelector('${sel}'); e.value = '${v}'; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })) })()`)
export default async (s) => {
  await s.sleep(500)
  await s.moveTo('#csvInput', 800)
  await s.sleep(250)
  await s.files('#csvInput', [fx('cards.csv')])
  await s.sleep(1800)
  await s.moveTo('#bgColor', 700)
  await setColor(s, '#bgColor', '#fff3d6')
  await s.sleep(700)
  await s.moveTo('#borderColor', 500)
  await setColor(s, '#borderColor', '#e8590c')
  await s.sleep(700)
  await s.moveTo('#titleColor', 500)
  await setColor(s, '#titleColor', '#c2410c')
  await s.sleep(800)
  const t = await s.point('#titleSize')
  await s.drag({ x: t.x - t.w * 0.05, y: t.y }, { x: t.x + t.w * 0.3, y: t.y }, 900)
  await s.sleep(1600)
}
