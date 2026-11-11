import { fileURLToPath } from 'node:url'
const fx = (n) => fileURLToPath(new URL('../fixtures/' + n, import.meta.url))
export const url = 'https://kaigemap.github.io/hakogazou/'
export const poster = 0.45
export default async (s) => {
  await s.sleep(500)
  await s.eval(`(() => { const i = document.querySelector('#bulk-upload'); i.closest('label, .upload-area, .drop-zone, div').dataset.rec = 'bulk' })()`)
  await s.tap('[data-rec=bulk]', { ms: 600 })
  await s.sleep(300)
  await s.files('#bulk-upload', ['front', 'back', 'left', 'right', 'top', 'bottom'].map((f) => fx('box-' + f + '.png')))
  await s.sleep(3600)
  await s.scrollBy(380)
  await s.sleep(1400)
  await s.scrollBy(-380)
  await s.sleep(2200)
}
