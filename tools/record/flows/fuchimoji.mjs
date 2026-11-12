import { fx, slide, fraction } from './_fx.mjs'
export const url = 'https://fuchimoji.pages.dev/'
// the title of the game with a thick outline; make the outline thicker and the text bigger, then back
export const prepare = async (s) => {
  await s.files('#file-input', [fx('sticker-hare.png')])
  await s.sleep(1200)
  await s.eval(`(() => { const t = document.querySelector('#t-text'); t.value = '空もよう'; t.dispatchEvent(new Event('input', { bubbles: true })); const c = document.querySelector('#t-color'); c.value = '#1d2740'; c.dispatchEvent(new Event('input', { bubbles: true })); c.dispatchEvent(new Event('change', { bubbles: true })) })()`)
  await s.sleep(1200)
}
export default async (s) => {
  const home = { x: 700, y: 820 }
  await s.moveTo(home, 10)
  await s.sleep(900)
  const g = await fraction(s, '#t-gap')
  await slide(s, '#t-gap', g, Math.min(1, g + 0.45), 1000)
  await s.sleep(1000)
  const z = await fraction(s, '#t-size')
  await slide(s, '#t-size', z, Math.min(1, z + 0.35), 900)
  await s.sleep(1200)
  await slide(s, '#t-size', Math.min(1, z + 0.35), z, 700)
  await s.sleep(300)
  await slide(s, '#t-gap', Math.min(1, g + 0.45), g, 800)
  await s.sleep(900)
  await s.moveTo(home, 700)
  await s.sleep(300)
}
