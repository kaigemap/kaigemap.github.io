import { fx, byText, swipeRange, fraction } from './_fx.mjs'
export const url = 'https://fuchimoji.pages.dev/'
export const prepare = async (s) => {
  await s.files('#file-input', [fx('sticker-hare.png')])
  await s.sleep(1200)
  await s.eval(`(() => { const t = document.querySelector('#t-text'); t.value = '空もよう'; t.dispatchEvent(new Event('input', { bubbles: true })); const c = document.querySelector('#t-color'); c.value = '#1d2740'; c.dispatchEvent(new Event('input', { bubbles: true })); c.dispatchEvent(new Event('change', { bubbles: true })) })()`)
  await s.sleep(1200)
}
// open the layout sheet and widen the outline with a finger, then narrow it again
export default async (s) => {
  await s.sleep(900)
  const tab = await byText(s, 'button', /配置|Layout/, 'tab')
  if (tab) { await s.tap(tab, { ms: 300 }); await s.sleep(700) }
  const g = await fraction(s, '#t-gap')
  if (await s.eval(`!!document.querySelector('#t-gap')?.getClientRects().length`)) {
    await swipeRange(s, '#t-gap', g, Math.min(1, g + 0.5), 900)
    await s.sleep(1000)
    await swipeRange(s, '#t-gap', Math.min(1, g + 0.5), g, 800)
  }
  await s.sleep(800)
  if (tab) { await s.tap(tab, { ms: 300 }); await s.sleep(800) }
}
