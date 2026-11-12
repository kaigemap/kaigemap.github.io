import { fx, setValue } from './_fx.mjs'
export const url = 'https://kaigemap.github.io/zatsucard/'
export const prepare = async (s) => {
  await s.files('#csvInput', [fx('cards.csv')])
  await s.sleep(1200)
  await setValue(s, '#borderColor', '#1d2740')
  await setValue(s, '#bgColor', '#f1ebdd')
  await setValue(s, '#titleColor', '#e2512b')
  await setValue(s, '#textColor', '#1d2740')
  await s.sleep(600)
  const y = await s.eval(`(() => { const e = [...document.querySelectorAll('canvas, img')].find(e => e.getBoundingClientRect().width > 100); return e ? e.getBoundingClientRect().top + scrollY - 90 : 900 })()`)
  await s.eval(`scrollTo(0, 0)`)
  s.cardsY = y
}
export default async (s) => {
  await s.sleep(800)
  await s.scrollBy(Math.round(s.cardsY), 420)
  await s.sleep(2200)
  await s.scrollBy(-Math.round(s.cardsY), 420)
  await s.sleep(900)
}
