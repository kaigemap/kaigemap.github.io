import { BLOG, fx } from './_fx.mjs'
export const url = 'https://kaigemap.github.io/GameMarket-Blog-HTML-Utility/'
export const prepare = async (s) => {
  await s.intercept({ 'https://example.com/soramoyo-box.png': fx('soramoyo-box.png'), 'https://example.com/soramoyo-cards.png': fx('soramoyo-cards.png') })
  await s.eval(`(() => { const t = document.querySelector('#htmlInput'); t.value = ${JSON.stringify(BLOG)}; document.querySelector('button').click(); document.activeElement?.blur() })()`)
  await s.sleep(1500)
  await s.eval('scrollTo(0, 0)')
  await s.sleep(300)
}
export default async (s) => {
  await s.sleep(900)
  await s.scrollBy(560, 520)
  await s.sleep(2000)
  await s.scrollBy(-560, 520)
  await s.sleep(500)
  await s.tap('button', { ms: 400 })
  await s.sleep(1400)
}
