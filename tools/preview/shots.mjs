// node tools/preview/shots.mjs <out-dir> [query]  -> dial at 1440x900, 1280x800, 390x844 and the wall at 1440x900
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { launch } from '../record/cdp.mjs'
const [out, q = 'lang=ja#udocards'] = process.argv.slice(2)
const base = 'http://localhost:8123/?'
const s = await launch({ width: 1440, height: 900, scale: 1, cursor: false })
const errors = []
s.send('Runtime.enable')
let n = 0
const shot = async (name, w, h, mobile, url, wait = 2600) => {
  await s.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile })
  const [path, hash = ''] = url.split('#')
  await s.open(`${path}&_=${++n}${hash ? '#' + hash : ''}`, wait) // a new query each time, so the page really reloads
  const err = await s.eval(`(window.__errs || []).join('\\n')`)
  if (err) errors.push(name + ': ' + err)
  const { data } = await s.send('Page.captureScreenshot', { format: 'jpeg', quality: 82 })
  writeFileSync(join(out, name), Buffer.from(data, 'base64'))
}
await s.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__errs = []; addEventListener('error', (e) => __errs.push(e.message)); addEventListener('unhandledrejection', (e) => __errs.push(String(e.reason)))` })
await shot('01-dial-1440.jpg', 1440, 900, false, base + q)
await shot('02-dial-1280.jpg', 1280, 800, false, base + q.replace(/#.*/, '') + '#hakogazou')
await shot('03-dial-390.jpg', 390, 844, true, base + q)
await shot('04-wall-1440.jpg', 1440, 900, false, base + q.replace(/#.*/, '') + '&view=wall', 2000)
await s.close()
console.log(errors.length ? errors.join('\n') : 'no script errors')
