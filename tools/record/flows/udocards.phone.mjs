import { CARDS, fx } from './_fx.mjs'
export const url = 'https://kaigemap.github.io/udocards/'
export const prepare = async (s) => {
  await s.files('#inputFront', CARDS)
  await s.sleep(800)
  if (await s.eval(`!!document.querySelector('#inputBack')`)) await s.files('#inputBack', [fx('card-back.png')])
  await s.eval(`(() => { const e = document.querySelector('#deckName'); e.value = '空もよう'; e.dispatchEvent(new Event('input', { bubbles: true })) })()`)
  await s.sleep(3500)
  const y = await s.eval(`(() => { const e = document.querySelector('#inputFront'); let z = e.parentElement; while (z && z.getBoundingClientRect().height < 40) z = z.parentElement; return Math.max(0, z.getBoundingClientRect().bottom + scrollY - 120) })()`)
  await s.eval('document.activeElement?.blur(); scrollTo(0, 0)')
  await s.sleep(400)
  s.gridY = y
}
export default async (s) => {
  await s.sleep(900)
  await s.scrollBy(Math.round(s.gridY), 480)
  await s.sleep(1600)
  await s.scrollBy(520, 480)
  await s.sleep(1600)
  await s.scrollBy(-Math.round(s.gridY) - 520, 520)
  await s.sleep(900)
}
