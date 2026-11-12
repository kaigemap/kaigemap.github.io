import { BLOG, fx } from './_fx.mjs'
export const url = 'https://kaigemap.github.io/GameMarket-Blog-HTML-Utility/'
export const prepare = async (s) => {
  await s.intercept({ 'https://example.com/soramoyo-box.png': fx('soramoyo-box.png'), 'https://example.com/soramoyo-cards.png': fx('soramoyo-cards.png') })
  await s.eval(`(() => { const t = document.querySelector('#htmlInput'); t.value = ${JSON.stringify(BLOG)}; document.querySelector('button').click(); document.activeElement?.blur() })()`)
  await s.sleep(1500)
  await s.eval('scrollTo(0, 0)')
  await s.sleep(300)
}
// the post's HTML is already fixed; scroll down through the result and back, then fix it once more
export default async (s) => {
  const home = { x: 1000, y: 260 }
  await s.moveTo(home, 10)
  await s.sleep(1000)
  await s.wheel({ x: 720, y: 600 }, 760, 34)
  await s.sleep(2000)
  await s.wheel({ x: 720, y: 600 }, -760, 34)
  await s.sleep(600)
  await s.click('button', { ms: 800 })
  await s.sleep(1400)
  await s.moveTo(home, 800)
  await s.sleep(500)
}
