import { OCBOX, init as initScript, before as serve, connect } from './_ocbox.mjs'
export const url = OCBOX + '#/'
export const init = initScript
export const before = serve
export const prepare = async (s) => {
  await connect(s)
  await s.sleep(3200) // let the "loaded" toast go away
  await s.eval(`[...document.querySelectorAll('a[href="#/c/e2e-tsujitsuma"]')].find((a) => /放浪者/.test(a.textContent)).dataset.rec = 'row'`)
}
// open the character from the list, look down the sheet, go back
export default async (s) => {
  const home = { x: 1000, y: 700 }
  await s.moveTo(home, 10)
  await s.sleep(1000)
  await s.click('[data-rec=row]', { ms: 800 })
  await s.sleep(1800)
  await s.wheel({ x: 720, y: 600 }, 520, 30)
  await s.sleep(1600)
  await s.wheel({ x: 720, y: 600 }, -520, 30)
  await s.sleep(500)
  const back = await s.eval(`(() => { const e = [...document.querySelectorAll('a, button')].find((x) => /戻る|back/i.test(x.getAttribute('aria-label') || '') && x.getClientRects().length); if (e) e.dataset.rec = 'back'; return !!e })()`)
  if (back) await s.click('[data-rec=back]', { ms: 800 })
  else await s.eval('history.back()')
  await s.sleep(1400)
  await s.moveTo(home, 700)
  await s.sleep(400)
}
