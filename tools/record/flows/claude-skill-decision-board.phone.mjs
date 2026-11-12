import { url as boardUrl, init as stub, before as build } from './_board.mjs'
export const url = boardUrl
export const init = stub
export const before = build
export default async (s) => {
  await s.sleep(900)
  await s.scrollBy(300, 480)
  await s.tap('label:has(#q-band-a)', { ms: 400 })
  await s.sleep(300)
  await s.eval(`[...document.querySelectorAll('#q-band button')].find((b) => b.textContent === '答える').dataset.rec = 'a1'`)
  await s.tap('[data-rec=a1]', { ms: 400 })
  await s.sleep(1200)
  await s.tap('label:has(#q-corner-a)', { ms: 400 })
  await s.sleep(300)
  await s.eval(`[...document.querySelectorAll('#q-corner button')].find((b) => b.textContent === '答える').dataset.rec = 'a2'`)
  await s.tap('[data-rec=a2]', { ms: 400 })
  await s.sleep(1100)
  await s.eval('scrollTo({ top: 0, behavior: "smooth" })')
  await s.sleep(900)
  if (await s.eval(`!!document.querySelector('#copy-btn')?.getClientRects().length`)) await s.tap('#copy-btn', { ms: 400 })
  await s.sleep(1400)
  await s.eval('__resetBoard(); scrollTo(0, 0)')
  await s.sleep(800)
}
