import { fileURLToPath } from 'node:url'
const fx = (n) => fileURLToPath(new URL('../fixtures/' + n, import.meta.url))
export const url = 'https://kaigemap.github.io/hakogazou/'
export const poster = 0.7
export default async (s) => {
  await s.sleep(500)
  await s.eval(`(() => { const i = document.querySelector('#bulk-upload'); const z = i.closest('label, .upload-area, .drop-zone, div'); z.dataset.rec = 'bulk'; return true })()`)
  await s.moveTo('[data-rec=bulk]', 800)
  await s.sleep(250)
  await s.files('#bulk-upload', ['front', 'back', 'left', 'right', 'top', 'bottom'].map((f) => fx('box-' + f + '.png')))
  await s.sleep(3200)
  await s.click('.segmented-option[data-value=lay]', { ms: 800 })
  await s.sleep(3000)
  await s.click('.segmented-option[data-value=stand]', { ms: 600 })
  await s.sleep(1800)
}
