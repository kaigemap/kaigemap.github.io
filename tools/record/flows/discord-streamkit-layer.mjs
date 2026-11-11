export const url = 'https://kaigemap.github.io/discord-streamkit-layer/'
export const poster = 0.4
export const prepare = (s) => s.eval(`document.querySelectorAll('.theme-card').forEach((e, i) => { e.dataset.rec = 'theme' + i })`)
export default async (s) => {
  await s.sleep(700)
  await s.click('[data-rec=theme1]')
  await s.sleep(1000)
  await s.click('[data-rec=theme2]')
  await s.sleep(1000)
  await s.click('[data-rec=theme3]')
  await s.sleep(1100)
  const a = await s.point('#avatar-size-slider')
  const x0 = a.x - a.w / 2 + 6
  await s.drag({ x: x0 + a.w * 0.08, y: a.y }, { x: x0 + a.w * 0.22, y: a.y }, 900)
  await s.sleep(1200)
  await s.click('[data-rec=theme0]')
  await s.sleep(800)
  await s.drag({ x: x0 + a.w * 0.22, y: a.y }, { x: x0 + a.w * 0.08, y: a.y }, 700)
  await s.sleep(1000)
}
