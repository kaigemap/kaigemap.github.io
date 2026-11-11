// node tools/preview/arc-samples.mjs <out-dir>  -> one JPEG per arc shape, taken mid-swipe
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { launch } from '../record/cdp.mjs'
const out = process.argv[2]
const SHAPES = [['arc-gentle', 'curve=4.5'], ['arc-normal', 'curve=2.4'], ['arc-strong', 'curve=1.6'], ['arc-bowl', 'curve=2.4&dir=-1']]
const s = await launch({ width: 1280, height: 800, scale: 1.5, cursor: false })
for (const [name, q] of SHAPES) {
  await s.open(`http://localhost:8123/?lang=ja&view=arc&${q}#zatsucard`, 2600)
  const cx = 640, cy = 300
  await s.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', buttons: 1, clickCount: 1 })
  for (let i = 1; i <= 12; i++) {
    await s.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx - i * 14, y: cy, buttons: 1, button: 'left' })
    await s.sleep(16)
  }
  await s.sleep(250)
  const { data } = await s.send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(join(out, `${name}.png`), Buffer.from(data, 'base64'))
  await s.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx - 168, y: cy, button: 'left', buttons: 0, clickCount: 1 })
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', join(out, `${name}.png`), '--out', join(out, `${name}.jpg`)], { stdio: 'ignore' })
}
await s.close()
