import { fileURLToPath } from 'node:url'
const fx = (n) => fileURLToPath(new URL('../fixtures/' + n, import.meta.url))
export const url = 'https://kaigemap.github.io/udocards/'
export const poster = 0.75
export default async (s) => {
  await s.sleep(500)
  await s.eval(`(() => { const i = document.querySelector('#inputFront'); let z = i.parentElement; while (z && z.getBoundingClientRect().height < 40) z = z.parentElement; z.dataset.rec = 'front' })()`)
  const d = await s.point('#deckName', { scroll: false })
  await s.tap({ x: d.x - d.w / 2 + 50, y: d.y }, { ms: 600 })
  await s.type('ランタンループ', 9)
  await s.sleep(500)
  await s.scrollBy(260)
  await s.tap('[data-rec=front]', { ms: 500 })
  await s.sleep(300)
  await s.files('#inputFront', [1, 2, 3, 4, 5, 6].map((i) => fx(`card-${i}.png`)))
  await s.sleep(1000)
  await s.scrollBy(420)
  await s.sleep(2200)
}
