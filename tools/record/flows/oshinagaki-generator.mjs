import { OSHI, setup, clickText } from './_oshinagaki.mjs'
export const url = OSHI
export const prepare = async (s) => {
  await setup(s)
  await s.sleep(800)
}
// change the band colour and the shape of the menu, then put them back
export default async (s) => {
  const home = { x: 1040, y: 160 }
  await s.moveTo(home, 10)
  await s.sleep(900)
  await s.wheel({ x: 1040, y: 500 }, 640, 34)
  await s.sleep(500)
  for (const c of ['#3d4fa8', '#2f8f5b']) {
    await s.click(`button[aria-label="${c}"]`, { ms: 650 })
    await s.sleep(900)
  }
  for (const t of ['正方形', '横長']) {
    await s.eval(`[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === '${t}').dataset.rec = 'shape-${t}'`)
    await s.click(`[data-rec="shape-${t}"]`, { ms: 650 })
    await s.sleep(1200)
  }
  await s.eval(`[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === '縦長').dataset.rec = 'shape-tall'`)
  await s.click('[data-rec="shape-tall"]', { ms: 650 })
  await s.sleep(600)
  await s.click('button[aria-label="#e8532b"]', { ms: 650 })
  await s.sleep(700)
  await s.wheel({ x: 1040, y: 500 }, -640, 34)
  await s.moveTo(home, 700)
  await s.sleep(500)
}
