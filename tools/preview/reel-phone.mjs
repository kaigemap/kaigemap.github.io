// node tools/preview/reel-phone.mjs <out-base> [url]  -> <out-base>.mp4: flicking the reel on a phone (390x844, touch)
import { launch } from '../record/cdp.mjs'
const [out, url = 'http://localhost:8123/?lang=ja&view=dial&_=reel#hakogazou'] = process.argv.slice(2)
const s = await launch({ width: 390, height: 844, scale: 2, touch: true })
s.captureWidth = 780
await s.open(url, 2600)
await s.startRecording()
const y = 844 - 50
await s.sleep(1200)
await s.swipe({ x: 300, y }, { x: 170, y }, 150)
await s.sleep(2200)
await s.swipe({ x: 300, y }, { x: 200, y }, 420)
await s.sleep(2000)
await s.swipe({ x: 100, y }, { x: 320, y }, 160)
await s.sleep(2200)
await s.swipe({ x: 200, y: 600 }, { x: 200, y: 300 }, 200)
await s.sleep(2400)
await s.stopRecording(out, { outputs: [{ suffix: '', width: 780, crf: 24 }], loop: 0 })
await s.close()
