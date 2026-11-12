// node tools/preview/why.mjs <out-dir> [id]  -> the reason closed and opened, on a PC and a phone
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { launch } from '../record/cdp.mjs'
const [out, id = 'BrowserSenkou'] = process.argv.slice(2)
const s = await launch({ width: 1440, height: 900, scale: 1, cursor: false })
let n = 0
for (const [name, w, h, mobile] of [['pc', 1440, 900, false], ['phone', 390, 844, true]]) {
  await s.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile })
  await s.open(`http://localhost:8123/?lang=ja&view=dial&_=${++n}#${id}`, 4200)
  let { data } = await s.send('Page.captureScreenshot', { format: 'jpeg', quality: 80 })
  writeFileSync(join(out, `why-${name}-1.jpg`), Buffer.from(data, 'base64'))
  await s.eval(`document.querySelector('#why').click()`)
  await s.sleep(700)
  ;({ data } = await s.send('Page.captureScreenshot', { format: 'jpeg', quality: 80 }))
  writeFileSync(join(out, `why-${name}-2.jpg`), Buffer.from(data, 'base64'))
}
await s.close()
