import { CARDS, fx } from './_fx.mjs'
export const url = 'https://kaigemap.github.io/udocards/'
// start with the deck already made (twelve faces, a back, a name), then look through it
export const prepare = async (s) => {
  await s.files('#inputFront', CARDS)
  await s.sleep(800)
  if (await s.eval(`!!document.querySelector('#inputBack')`)) await s.files('#inputBack', [fx('card-back.png')])
  await s.eval(`(() => { const e = document.querySelector('#deckName'); e.value = '空もよう'; e.dispatchEvent(new Event('input', { bubbles: true })) })()`)
  await s.sleep(3500)
  await s.eval('document.activeElement?.blur(); scrollTo(0, 0)')
  await s.sleep(400)
}
export default async (s) => {
  const home = { x: 1000, y: 560 }
  await s.moveTo(home, 10)
  await s.sleep(1200)
  await s.wheel(home, 520, 30)
  await s.sleep(2200)
  await s.wheel(home, 520, 30)
  await s.sleep(1800)
  await s.wheel(home, -1040, 40)
  await s.sleep(1400)
}
