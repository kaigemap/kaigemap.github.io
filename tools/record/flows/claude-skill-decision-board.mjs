import { url as boardUrl, init as stub, before as build } from './_board.mjs'
export const url = boardUrl
export const init = stub
export const before = build
// answer both questions, copy the answers, then the page is reset to where it started
export default async (s) => {
  const home = { x: 1100, y: 300 }
  await s.moveTo(home, 10)
  await s.sleep(900)
  await s.click('label:has(#q-band-a)', { ms: 800 })
  await s.sleep(400)
  await s.eval(`[...document.querySelectorAll('#q-band button')].find((b) => b.textContent === '答える').dataset.rec = 'a1'`)
  await s.click('[data-rec=a1]', { ms: 600 })
  await s.sleep(1300)
  await s.click('label:has(#q-corner-a)', { ms: 700 })
  await s.sleep(400)
  await s.eval(`[...document.querySelectorAll('#q-corner button')].find((b) => b.textContent === '答える').dataset.rec = 'a2'`)
  await s.click('[data-rec=a2]', { ms: 600 })
  await s.sleep(1200)
  await s.click('#copy-btn', { ms: 700 })
  await s.sleep(1600)
  await s.eval('__resetBoard(); scrollTo(0, 0)')
  await s.moveTo(home, 700)
  await s.sleep(700)
}
