import { slide, fraction } from './_fx.mjs'
export const url = 'https://sticker-split.pages.dev/'
// the sample sheet is cut into pieces; pull the pieces apart and back together
export const prepare = async (s) => {
  await s.eval(`document.querySelector('#sample').click()`)
  await s.sleep(2500)
}
export default async (s) => {
  const home = { x: 700, y: 820 }
  await s.moveTo(home, 10)
  await s.sleep(900)
  const g = await fraction(s, '#gap')
  await slide(s, '#gap', g, Math.min(1, g + 0.6), 1200)
  await s.sleep(1400)
  await slide(s, '#gap', Math.min(1, g + 0.6), g, 1000)
  await s.sleep(1200)
  await s.moveTo(home, 700)
  await s.sleep(300)
}
