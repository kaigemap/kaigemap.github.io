// node tools/record/make-fixtures.mjs -> fixtures/*.png, *.csv used by the flows (original demo art)
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { launch } from './cdp.mjs'

const out = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')
mkdirSync(out, { recursive: true })

const page = (w, h, body) => `<!doctype html><meta charset=utf-8><style>
*{box-sizing:border-box;margin:0}html,body{width:${w}px;height:${h}px;overflow:hidden}
body{font-family:"Hiragino Sans","Hiragino Kaku Gothic ProN",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
</style><body>${body}</body>`

// Box art: an imaginary game "Lantern Loop"
const boxFront = page(1000, 1000, `<div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 38%,#ffcf6b 0 9%,#ff8a3d 9.2% 15%,transparent 15.2%),radial-gradient(circle at 50% 38%,rgba(255,180,80,.35),transparent 46%),linear-gradient(160deg,#173b52,#0d2233 60%,#081622)"></div>
<div style="position:absolute;left:0;right:0;top:560px;text-align:center;color:#ffe6b3;font-weight:800;font-size:112px;letter-spacing:.04em">ランタン<br>ループ</div>
<div style="position:absolute;left:0;right:0;bottom:56px;text-align:center;color:#8fb5c9;font-size:34px;letter-spacing:.3em">2–4人・30分</div>
${[...Array(9)].map((_, i) => `<div style="position:absolute;width:${26 + (i % 3) * 10}px;height:${26 + (i % 3) * 10}px;border-radius:50%;background:#ffcf6b;opacity:${0.25 + (i % 4) * 0.15};left:${80 + i * 100}px;top:${120 + ((i * 137) % 260)}px"></div>`).join('')}`)
const boxBack = page(1000, 1000, `<div style="position:absolute;inset:0;background:#0d2233"></div>
<div style="position:absolute;left:70px;top:70px;color:#ffe6b3;font-weight:800;font-size:64px">ランタンループ</div>
<div style="position:absolute;left:70px;top:170px;width:860px;color:#8fb5c9;font-size:30px;line-height:1.7">夜の川にランタンを流して、ぐるりと一周させよう。いちばん明るい輪をつくった人の勝ち。</div>
${[...Array(6)].map((_, i) => `<div style="position:absolute;left:${70 + (i % 3) * 290}px;top:${400 + Math.floor(i / 3) * 280}px;width:250px;height:240px;border-radius:24px;background:${['#1f4d66', '#24566f', '#2a6079'][i % 3]};display:grid;place-items:center"><div style="width:110px;height:110px;border-radius:50%;background:${['#ffcf6b', '#ff8a3d', '#ffb37a'][i % 3]}"></div></div>`).join('')}`)
const side = (w, h, vertical) => page(w, h, `<div style="position:absolute;inset:0;background:linear-gradient(${vertical ? '90deg' : '0deg'},#0d2233,#173b52);display:grid;place-items:center"><div style="color:#ffe6b3;font-weight:800;font-size:${vertical ? 120 : 120}px;letter-spacing:.08em;${vertical ? 'writing-mode:vertical-rl' : ''}">ランタンループ</div></div>`)

// Cards for udocards
const COLORS = [['#ff6b6b', '#fff1f1'], ['#4dabf7', '#eef7ff'], ['#51cf66', '#effbf1'], ['#fcc419', '#fff9e6'], ['#9775fa', '#f4f0ff'], ['#ff922b', '#fff4ea']]
const SHAPES = ['50%', '18%', '50% 50% 0 50%', '0', '50% 0', '30% 70%']
const card = (i) => page(630, 880, `<div style="position:absolute;inset:0;background:${COLORS[i][1]};border:22px solid ${COLORS[i][0]};border-radius:40px"></div>
<div style="position:absolute;left:60px;top:54px;font-size:84px;font-weight:800;color:${COLORS[i][0]}">${i + 1}</div>
<div style="position:absolute;left:165px;top:250px;width:300px;height:300px;border-radius:${SHAPES[i]};background:${COLORS[i][0]}"></div>
<div style="position:absolute;left:0;right:0;bottom:110px;text-align:center;font-size:56px;font-weight:700;color:#333">${['ほのお', 'しずく', 'わかば', 'ひかり', 'よぞら', 'ゆうひ'][i]}</div>`)
const back = page(630, 880, `<div style="position:absolute;inset:0;border-radius:40px;background:repeating-linear-gradient(45deg,#2b2f3a 0 28px,#353a47 28px 56px);border:22px solid #1c1f27"></div>
<div style="position:absolute;left:215px;top:340px;width:200px;height:200px;border-radius:50%;border:16px solid #fcc419"></div>`)

const jobs = [
  ['box-front.png', 1000, 1000, boxFront], ['box-back.png', 1000, 1000, boxBack],
  ['box-top.png', 1000, 260, side(1000, 260, false)], ['box-bottom.png', 1000, 260, side(1000, 260, false)],
  ['box-left.png', 260, 1000, side(260, 1000, true)], ['box-right.png', 260, 1000, side(260, 1000, true)],
  ...COLORS.map((_, i) => [`card-${i + 1}.png`, 630, 880, card(i)]),
  ['card-back.png', 630, 880, back],
]

const s = await launch({ width: 1000, height: 1000, scale: 1, cursor: false })
for (const [name, w, h, html] of jobs) {
  await s.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false })
  await s.open('data:text/html;base64,' + Buffer.from(html).toString('base64'), 300)
  const { data } = await s.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: w, height: h, scale: 1 } })
  writeFileSync(join(out, name), Buffer.from(data, 'base64'))
}
await s.close()

writeFileSync(join(out, 'cards.csv'), `タイトル,本文
たき火,全員がカードを1枚引く。
にわか雨,次の手番まで場のランタンを裏にする。
流れ星,好きなカードを1枚選んで手札に加える。
渡し舟,となりの人とカードを1枚交換する。
月見,このラウンドの得点を2倍にする。
朝霧,捨て札の山から1枚拾う。
`)
console.log('fixtures:', jobs.length + 1)
