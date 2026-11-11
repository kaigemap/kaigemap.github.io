// node tools/preview/device-samples.mjs <out-dir>  -> PC+phone and phone-only layouts, on a PC and a phone
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { launch } from '../record/cdp.mjs'
const out = process.argv[2]
const s = await launch({ width: 1280, height: 800, scale: 1.5, cursor: false })
const shot = async (name) => { const { data } = await s.send('Page.captureScreenshot', { format: 'jpeg', quality: 84 }); writeFileSync(join(out, name), Buffer.from(data, 'base64')) }
for (const device of ['both', 'phone']) {
  await s.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1.5, mobile: false })
  await s.open(`http://localhost:8123/?lang=ja&view=arc&device=${device}#zatsucard`, 5200)
  await shot(`device-${device}-pc.jpg`)
  await s.open(`http://localhost:8123/?lang=ja&view=grid&device=${device}`, 2200)
  await shot(`device-${device}-grid.jpg`)
  await s.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await s.open(`http://localhost:8123/?lang=ja&view=arc&device=${device}#zatsucard`, 5200)
  await shot(`device-${device}-phone.jpg`)
}
await s.close()
