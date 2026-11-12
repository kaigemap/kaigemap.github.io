// node tools/preview/tour.mjs <out-base> [url] [WxH]  -> <out-base>.mp4: wheel and drag the dial, open the wall, come back
import { launch } from '../record/cdp.mjs'
const [out, url = 'http://localhost:8123/?lang=ja&view=dial&_=tour#hakogazou', size = '1440x900'] = process.argv.slice(2)
const [width, height] = size.split('x').map(Number)
const s = await launch({ width, height, scale: 1 })
s.captureWidth = width
await s.open(url, 300)
await s.startRecording()
await s.moveTo({ x: 120, y: height / 2 + 60 }, 10)
await s.sleep(2600)
for (let i = 0; i < 3; i++) { await s.wheel({ x: 120, y: height / 2 }, 160, 14); await s.sleep(1700) }
await s.drag({ x: 110, y: height / 2 + 120 }, { x: 110, y: height / 2 - 200 }, 380)
await s.sleep(2400)
await s.click('.slot:nth-child(2) .tile', { ms: 800 })
await s.sleep(2600)
await s.click('#view-btn', { ms: 900 })
await s.sleep(2600)
await s.wheel({ x: width / 2, y: height / 2 }, 600, 30)
await s.sleep(1500)
await s.click('.w-item:nth-child(5) .w-pair', { ms: 800 })
await s.sleep(3200)
await s.stopRecording(out, { outputs: [{ suffix: '', width, crf: 24 }], loop: 0 })
await s.close()
