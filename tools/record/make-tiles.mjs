// node tools/record/make-tiles.mjs [id ...] -> media/tiles/<id>.webp (288x288)
// Each tile shows what the app makes, drawn as one object on a pale square (docs/DESIGN.md §3.2).
// Needs the fixtures (node tools/record/make-fixtures.mjs).
import { writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { launch } from './cdp.mjs'
import { C, KINDS, pat } from './art.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, '../../media/tiles')
mkdirSync(out, { recursive: true })
const uri = (name) => pathToFileURL(join(here, 'fixtures', name)).href
const S = 288
const shadow = 'drop-shadow(3px 6px 6px rgba(40,30,20,.28)) drop-shadow(1px 2px 1.5px rgba(40,30,20,.18))'

const page = (bg, body) => `<!doctype html><meta charset=utf-8><style>*{box-sizing:border-box;margin:0}html,body{width:${S}px;height:${S}px;overflow:hidden;background:${bg}}
body{position:relative;-webkit-font-smoothing:antialiased;font-family:"Hiragino Sans",sans-serif}.mi{font-family:"Hiragino Mincho ProN",serif}.fu{font-family:Futura,sans-serif}</style><body>${body}</body>`
const svgPat = (id, s, style = '') => `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" style="${style}">${pat[id](s)}</svg>`

const TILES = {
  hakogazou: () => page('#DCE3EA', `<div style="position:absolute;left:50%;top:50%;width:124px;height:124px;transform-style:preserve-3d;transform:translate(-50%,-50%) perspective(520px) rotateX(-16deg) rotateY(-40deg);filter:${shadow}">
  <img src="${uri('box-front.png')}" style="position:absolute;inset:0;width:124px;height:124px;transform:translateZ(21px)">
  <img src="${uri('box-right.png')}" style="position:absolute;left:41px;top:0;width:42px;height:124px;transform:rotateY(90deg) translateZ(62px);filter:brightness(.82)">
  <img src="${uri('box-top.png')}" style="position:absolute;left:0;top:41px;width:124px;height:42px;transform:rotateX(90deg) translateZ(62px);filter:brightness(1.08)">
</div>`),
  zatsucard: () => page('#EFE3CF', `<div style="position:absolute;left:50%;top:50%;width:118px;height:177px;transform:translate(-50%,-50%) rotate(-6deg);background:${C.paper};border:4px solid ${C.ink};border-radius:4px;filter:${shadow};padding:12px 10px">
  <div class="mi" style="font-size:20px;font-weight:600;color:${C.red};text-align:center">晴れ</div>
  <div style="margin-top:10px;font-size:11px;font-weight:600;line-height:1.6;color:${C.ink}">となりに雨がなければ2点。</div>
</div>`),
  'discord-streamkit-layer': () => page('#24252C', `<div style="position:absolute;left:50%;top:50%;display:flex;gap:12px;transform:translate(-50%,-50%)">${[['#5865F2', 0, false], ['#3BA55C', -6, true], ['#E3A927', 0, false]].map(([c, y, ring]) =>
    `<div style="width:46px;height:46px;border-radius:50%;background:${c};transform:translateY(${y}px);box-shadow:${ring ? '0 0 0 3px #24252C, 0 0 0 6px #3BA55C,' : ''} 0 6px 10px rgba(0,0,0,.4);display:grid;place-items:center"><div style="width:18px;height:14px;background:rgba(255,255,255,.9);clip-path:polygon(50% 0,100% 100%,0 100%)"></div></div>`).join('')}</div>`),
  udocards: () => page('#E3DCEC', [[-16, 'card-03.png', -40], [0, 'card-01.png', 0], [16, 'card-05.png', 40]].map(([deg, f, x]) =>
    `<img src="${uri(f)}" style="position:absolute;left:50%;top:52%;width:94px;transform:translate(calc(-50% + ${x}px),-50%) rotate(${deg}deg);transform-origin:50% 120%;filter:${shadow}">`).join('')),
  'GameMarket-Blog-HTML-Utility': () => page('#E6E9DC', `<div style="position:absolute;left:62px;top:70px;width:200px;height:150px;border:1.5px dashed rgba(29,39,64,.45);border-radius:3px"></div>
<div style="position:absolute;left:52px;top:60px;width:150px;height:166px;background:#fff;border-radius:6px;box-shadow:0 0 0 1px rgba(0,0,0,.08);filter:${shadow};padding:14px">
  <div style="height:6px;width:70%;background:${C.ink};border-radius:3px;opacity:.85"></div>
  <div style="margin-top:7px;height:4px;width:90%;background:${C.ink};border-radius:2px;opacity:.25"></div>
  <img src="${uri('soramoyo-box.png')}" style="display:block;margin-top:10px;width:100%;border-radius:2px">
</div>`),
  BrowserSenkou: () => page('#2A1830', `<div style="position:absolute;left:50%;top:206px;width:132px;height:30px;border-radius:50%;background:#7F7A8D;transform:translateX(-50%);box-shadow:0 8px 14px rgba(0,0,0,.4)"></div>
<div style="position:absolute;left:142px;top:88px;width:4px;height:128px;border-radius:2px;background:#26554C"></div>
<div style="position:absolute;left:138px;top:82px;width:12px;height:12px;border-radius:50%;background:radial-gradient(rgba(246,102,57,.9),rgba(246,102,57,0) 70%)"></div>
<svg width="288" height="288" style="position:absolute;inset:0"><path d="M144 82 C 136 64, 156 52, 146 34 S 150 14, 142 2" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="2" stroke-linecap="round"/></svg>`),
}

const wanted = process.argv.slice(2)
const ids = wanted.length ? wanted : Object.keys(TILES)
const s = await launch({ width: S, height: S, scale: 1, cursor: false })
await s.send('Emulation.setDeviceMetricsOverride', { width: S, height: S, deviceScaleFactor: 1, mobile: false })
const tmp = mkdtempSync(join(tmpdir(), 'tiles-'))
for (const id of ids) {
  const file = join(tmp, `${id}.html`)
  writeFileSync(file, TILES[id]())
  await s.open(pathToFileURL(file).href, 500)
  const { data } = await s.send('Page.captureScreenshot', { format: 'webp', quality: 82 })
  writeFileSync(join(out, `${id}.webp`), Buffer.from(data, 'base64'))
}
await s.close()
rmSync(tmp, { recursive: true, force: true })
console.log('tiles:', ids.join(', '))
