export const url = 'https://kaigemap.github.io/discord-streamkit-layer/'
export const prepare = (s) => s.eval(`document.querySelectorAll('.theme-card').forEach((e, i) => { e.dataset.rec = 'theme' + i })`)
// cycle through the presets and come back to the first one
export default async (s) => {
  const home = await s.point('[data-rec=theme0]', { scroll: false })
  await s.moveTo({ x: home.x + 40, y: home.y + 80 }, 10)
  await s.sleep(900)
  for (const i of [1, 2, 3, 0]) {
    await s.click(`[data-rec=theme${i}]`, { ms: 650 })
    await s.sleep(1500)
  }
  await s.moveTo({ x: home.x + 40, y: home.y + 80 }, 600)
  await s.sleep(600)
}
