export const url = 'https://kaigemap.github.io/GameMarket-Blog-HTML-Utility/'
export const poster = 0.5
export default async (s) => {
  await s.sleep(400)
  await s.tap('#htmlInput', { ms: 500 })
  await s.type('<h2>新作のお知らせ</h2>\n<img src="https://avatars.githubusercontent.com/u/12152903?v=4" width="1600" height="1600">', 34)
  await s.sleep(400)
  await s.tap('button', { ms: 500 })
  await s.sleep(1000)
  await s.scrollBy(420)
  await s.sleep(1800)
}
