import { OCBOX, init as initScript, before as serve, connect } from './_ocbox.mjs'
export const url = OCBOX + '#/'
export const init = initScript
export const before = serve
export const prepare = async (s) => {
  await connect(s)
  await s.sleep(3200)
  await s.eval(`[...document.querySelectorAll('a[href="#/c/e2e-tsujitsuma"]')].find((a) => /放浪者/.test(a.textContent)).dataset.rec = 'row'`)
}
export default async (s) => {
  await s.sleep(900)
  await s.tap('[data-rec=row]', { ms: 400 })
  await s.sleep(1600)
  await s.scrollBy(460, 520)
  await s.sleep(1500)
  await s.scrollBy(-460, 520)
  await s.sleep(400)
  const back = await s.eval(`(() => { const e = [...document.querySelectorAll('a, button')].find((x) => /戻る|back/i.test(x.getAttribute('aria-label') || '') && x.getClientRects().length); if (e) e.dataset.rec = 'back'; return !!e })()`)
  if (back) await s.tap('[data-rec=back]', { ms: 400 })
  else await s.eval('history.back()')
  await s.sleep(1400)
}
