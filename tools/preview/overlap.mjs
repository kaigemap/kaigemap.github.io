// node tools/preview/overlap.mjs <out-dir>  -> checks every item at 390 and 360 wide for text running into the frames; saves 390 screenshots
import { writeFileSync } from 'node:fs'
import { launch } from '../record/cdp.mjs'
import { APPS } from '../../js/apps.js'
const out = process.argv[2]
const s = await launch({ width: 390, height: 844, scale: 1, cursor: false })
let n = 0
const report = []
for (const [w, h] of [[390, 760], [360, 664]]) {
  await s.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true })
  for (const a of APPS) {
    await s.open(`http://localhost:8123/?lang=ja&view=dial&_=${++n}#${a.id}`, 1800)
    // find text boxes that overlap each other or the frames
    const hits = await s.eval(`(() => {
      // text is measured by its glyphs (a Range), except the reason, whose extra lines are clipped and hidden
      const r = (e) => (['H2', 'SPAN', 'P'].includes(e.tagName) && e.id !== 'why' ? (() => { const rg = document.createRange(); rg.selectNodeContents(e); return rg.getBoundingClientRect() })() : e.getBoundingClientRect())
      const pair = [...document.querySelectorAll('.pair.on')].find((p) => +getComputedStyle(p.querySelector('.title')).opacity > 0.9)
      const textBox = (e) => { const rg = document.createRange(); rg.selectNodeContents(e); return rg }
      const els = { name: pair?.querySelector('.name'), meta: pair?.querySelector('.meta'), desc: document.querySelector('#desc'), why: document.querySelector('#why'), phone: pair?.querySelector('.phone'), pc: pair?.querySelector('.pc'), wheel: document.querySelector('.wheel') }
      const out = []
      const keys = Object.keys(els).filter((k) => els[k] && els[k].getClientRects().length)
      for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
        const a = r(els[keys[i]]), b = r(els[keys[j]])
        if (keys[i] === 'wheel' || keys[j] === 'wheel') { const t = keys[i] === 'wheel' ? b : a; const wh = keys[i] === 'wheel' ? a : b; if (['name','desc','meta','why'].includes(keys[i] === 'wheel' ? keys[j] : keys[i]) && t.bottom > wh.top + 30) out.push((keys[i] === 'wheel' ? keys[j] : keys[i]) + ' under dial') ; continue }
        const ov = Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
        if (ov) out.push(keys[i] + '×' + keys[j])
      }
      const nm = els.name; if (nm && nm.scrollWidth > nm.clientWidth + 1) out.push('name overflows ' + nm.scrollWidth + '>' + nm.clientWidth)
      return out
    })()`)
    if (hits.length) report.push(`${w} ${a.id}: ${hits.join(', ')}`)
    if (w === 390) { const { data } = await s.send('Page.captureScreenshot', { format: 'jpeg', quality: 60 }); writeFileSync(`${out}/${String(n).padStart(2, '0')}.jpg`, Buffer.from(data, 'base64')) }
  }
}
await s.close()
console.log(report.join('\n') || 'no overlaps found')
