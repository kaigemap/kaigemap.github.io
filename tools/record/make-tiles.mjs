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
Object.assign(TILES, {
  'sticker-sheet-simulator': () => page('#F0DDD8', `<div style="position:absolute;left:50%;top:50%;width:132px;height:176px;transform:translate(-50%,-50%) rotate(-3deg);background:#fff;border-radius:4px;filter:${shadow};padding:14px 12px;display:grid;grid-template-columns:1fr 1fr;gap:10px;place-items:center">
${['hare', 'ame', 'kaze', 'yuki', 'rai', 'kiri'].map((k) => `<img src="${uri(`sticker-${k}.png`)}" style="width:46px;height:46px;filter:drop-shadow(0 1px 1px rgba(0,0,0,.18))">`).join('')}</div>`),
  fuchimoji: () => page('#DDE8E2', `<div class="mi" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-52%);font-size:132px;font-weight:600;line-height:1;color:${C.paper};-webkit-text-stroke:0;text-shadow:${[...Array(24)].map((_, i) => { const a = (i / 24) * Math.PI * 2; return `${(Math.cos(a) * 9).toFixed(1)}px ${(Math.sin(a) * 9).toFixed(1)}px 0 ${C.ink}` }).join(',')},${[...Array(32)].map((_, i) => { const a = (i / 32) * Math.PI * 2; return `${(Math.cos(a) * 15).toFixed(1)}px ${(Math.sin(a) * 15).toFixed(1)}px 0 ${C.paper}` }).join(',')};filter:${shadow}">空</div>`),
  'sticker-split': () => page('#EDE6C9', [[0, 0, 'hare'], [1, 0, 'ame'], [0, 1, 'kaze'], [1, 1, 'rai']].map(([x, y, k]) => `<div style="position:absolute;left:${74 + x * 76}px;top:${74 + y * 76}px;width:66px;height:66px;background:#fff;border-radius:3px;filter:${shadow};display:grid;place-items:center;transform:rotate(${(x - 0.5) * 3 + (y - 0.5) * 2}deg)"><img src="${uri(`sticker-${k}.png`)}" style="width:54px;height:54px"></div>`).join('')),
  ocbox: () => page('#D9E2EE', `<div style="position:absolute;left:50%;top:50%;width:132px;height:172px;transform:translate(-50%,-50%) rotate(2deg);background:#FBFAF6;border-radius:6px;filter:${shadow};padding:14px">
  <div style="display:flex;gap:10px;align-items:center"><div style="width:38px;height:38px;border-radius:50%;background:${C.sage};box-shadow:inset 0 0 0 3px #fff, 0 0 0 1px rgba(0,0,0,.1)"></div><div><div class="mi" style="font-size:12px;font-weight:600;color:${C.ink};white-space:nowrap">辻津満 泡瀬</div><div style="font-size:8px;color:#888;margin-top:2px">放浪者</div></div></div>
  ${[['SAN', 50], ['HP', 10], ['MP', 10]].map(([k, v], i) => `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:${i ? 6 : 16}px;border-bottom:1px solid #e3e0d8;padding-bottom:4px"><span class="fu" style="font-size:9px;letter-spacing:.12em;color:#888">${k}</span><span class="fu" style="font-size:16px;font-weight:700;color:${C.ink}">${v}</span></div>`).join('')}
</div>`),
  'oshinagaki-generator': () => page('#F0E2D2', `<div style="position:absolute;left:50%;top:50%;width:150px;height:118px;transform:translate(-50%,-50%) rotate(-4deg);background:#fff;border-radius:6px;filter:${shadow};overflow:hidden">
  <div style="height:26px;background:${C.red};color:#fff;font-size:10px;font-weight:700;display:grid;place-items:center;letter-spacing:.1em">ゲームマーケット</div>
  <div style="display:flex;gap:10px;padding:12px;align-items:center"><img src="${uri('box-front.png')}" style="width:52px;height:52px;border-radius:2px;box-shadow:0 2px 4px rgba(0,0,0,.2)"><div><div class="mi" style="font-size:14px;font-weight:600;color:${C.ink}">空もよう</div><div class="fu" style="font-size:20px;font-weight:700;color:${C.red};margin-top:2px">¥2,500</div></div></div>
</div>`),
  'claude-skill-decision-board': () => page('#E4E1DA', `<div style="position:absolute;left:50%;top:50%;width:156px;transform:translate(-50%,-50%);background:#FBFAF6;border-radius:8px;filter:${shadow};padding:14px">
  <div style="font-size:10px;font-weight:700;color:${C.ink};line-height:1.4">箱の帯の色はどちらにしますか</div>
  <div style="display:flex;gap:8px;margin-top:10px">${[[C.ink, '紺', true], [C.red, '朱', false]].map(([c, t, on]) => `<div style="flex:1;border-radius:6px;padding:6px;background:#fff;box-shadow:${on ? `0 0 0 2px ${C.ink}` : '0 0 0 1px #ddd'}"><div style="height:34px;border-radius:3px;background:linear-gradient(90deg, ${c} 34%, ${C.paper} 34%)"></div><div style="font-size:9px;font-weight:700;margin-top:5px;color:${C.ink};display:flex;gap:4px;align-items:center"><span style="width:8px;height:8px;border-radius:50%;box-shadow:inset 0 0 0 ${on ? 3 : 1}px ${C.ink}"></span>${t}</div></div>`).join('')}</div>
</div>`),
  'claude-skill-speak-notify': () => page('#E0E4DD', `<div style="position:absolute;left:50%;top:50%;width:132px;height:132px;transform:translate(-50%,-50%);border-radius:30px;padding:1.5px;background:linear-gradient(145deg,#F6F4EF,#B4B0A7 28%,#ECE9E2 52%,#8F8B83 100%);filter:${shadow}">
  <div style="width:100%;height:100%;border-radius:28.5px;background:linear-gradient(160deg,#EDEBE6,#CFCCC5 45%,#E4E1DB);display:grid;place-items:center">
  <div style="width:92px;height:92px;border-radius:50%;background:radial-gradient(circle,#2A2926 2.2px,transparent 2.6px) 0 0/9px 9px;-webkit-mask:radial-gradient(circle,#000 64%,transparent 66%)"></div></div>
</div>`),
})

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
