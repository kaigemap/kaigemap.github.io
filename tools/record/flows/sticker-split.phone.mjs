import { byText, swipeRange, fraction } from './_fx.mjs'
export const url = 'https://sticker-split.pages.dev/'
export const prepare = async (s) => {
  await s.eval(`document.querySelector('#sample').click()`)
  await s.sleep(2500)
}
export default async (s) => {
  await s.sleep(900)
  const tab = await byText(s, 'button', /切り方|Cut/, 'tab')
  if (tab) { await s.tap(tab, { ms: 300 }); await s.sleep(700) }
  const g = await fraction(s, '#gap')
  if (await s.eval(`!!document.querySelector('#gap')?.getClientRects().length`)) {
    await swipeRange(s, '#gap', g, Math.min(1, g + 0.7), 1000)
    await s.sleep(1200)
    await swipeRange(s, '#gap', Math.min(1, g + 0.7), g, 900)
  }
  await s.sleep(800)
  if (tab) { await s.tap(tab, { ms: 300 }); await s.sleep(800) }
}
