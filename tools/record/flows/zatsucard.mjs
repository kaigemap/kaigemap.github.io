import { fx, setValue } from './_fx.mjs'
export const url = 'https://kaigemap.github.io/zatsucard/'
export const prepare = async (s) => {
  await s.files('#csvInput', [fx('cards.csv')])
  await s.sleep(1500)
  await s.eval(`scrollTo(0, 0)`)
}
// recolour the cards in the game's two-colour scheme: navy frame, paper ground, vermilion title
export default async (s) => {
  const home = await s.point('#titleSize', { scroll: false })
  await s.moveTo({ x: home.x, y: home.y + 40 }, 10)
  await s.sleep(900)
  await s.moveTo('#borderColor', 800)
  await s.sleep(150)
  await setValue(s, '#borderColor', '#1d2740')
  await s.sleep(900)
  await s.moveTo('#bgColor', 600)
  await s.sleep(150)
  await setValue(s, '#bgColor', '#f1ebdd')
  await s.sleep(900)
  await s.moveTo('#titleColor', 600)
  await s.sleep(150)
  await setValue(s, '#titleColor', '#e2512b')
  await s.sleep(900)
  await s.moveTo('#textColor', 600)
  await s.sleep(150)
  await setValue(s, '#textColor', '#1d2740')
  await s.sleep(1500)
  await s.moveTo({ x: home.x, y: home.y + 40 }, 800)
  await s.sleep(900)
}
