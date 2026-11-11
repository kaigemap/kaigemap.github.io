export const url = 'https://kaigemap.github.io/GameMarket-Blog-HTML-Utility/'
export const options = { width: 760, height: 475 }
export const poster = 0.36
export default async (s) => {
  await s.sleep(400)
  await s.click('#htmlInput', { ms: 600 })
  await s.type('<h2>新作のお知らせ</h2>\n<img src="https://avatars.githubusercontent.com/u/12152903?v=4" width="1600" height="1600">', 34)
  await s.sleep(500)
  await s.click('button', { ms: 600 })
  await s.sleep(1200)
  await s.wheel({ x: 380, y: 300 }, 360, 20)
  await s.sleep(1800)
  await s.wheel({ x: 380, y: 300 }, -360, 20)
  await s.sleep(800)
}
