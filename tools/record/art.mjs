// Demo content shown inside the recordings: an imaginary board game, 「空もよう」 (SORAMOYO).
// Everything is drawn with HTML/CSS/SVG and rendered by headless Chrome (make-fixtures.mjs).
// Two-colour print look: paper + navy + one accent per piece. Design: docs/DESIGN.md §9.
// Fonts are macOS system fonts used only to draw these images (not shipped with the site).

export const C = { paper: '#F1EBDD', ink: '#1D2740', red: '#E2512B', blue: '#8DBBD8', sage: '#93AD8E', lilac: '#BDB2CF', mustard: '#E3A927', fog: '#C9C5BA' }

const grain = `<filter id="g" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .22 -.06"/></filter>`

export const pat = {
  hare: (s) => `<rect width="${s}" height="${s}" fill="${C.paper}"/><circle cx="${s * 0.5}" cy="${s * 0.5}" r="${s * 0.31}" fill="${C.red}"/><circle cx="${s * 0.5}" cy="${s * 0.5}" r="${s * 0.41}" fill="none" stroke="${C.red}" stroke-width="${s * 0.012}"/>`,
  ame: (s) => `<rect width="${s}" height="${s}" fill="${C.blue}"/>` + [...Array(7)].map((_, i) => `<line x1="${s * (0.08 + i * 0.15)}" y1="${-s * 0.1}" x2="${s * (0.08 + i * 0.15) - s * 0.36}" y2="${s * 1.1}" stroke="${C.ink}" stroke-width="${s * 0.022}" stroke-dasharray="${s * 0.16} ${s * 0.09}" stroke-dashoffset="${i * s * 0.07}" stroke-linecap="round"/>`).join(''),
  kaze: (s) => `<rect width="${s}" height="${s}" fill="${C.sage}"/>` + [...Array(5)].map((_, i) => { const y = s * (0.2 + i * 0.15); return `<path d="M${-s * 0.05} ${y} C ${s * 0.2} ${y - s * 0.14}, ${s * 0.35} ${y + s * 0.14}, ${s * 0.55} ${y} S ${s * 0.9} ${y - s * 0.14}, ${s * 1.05} ${y}" fill="none" stroke="${C.paper}" stroke-width="${s * 0.03}" stroke-linecap="round"/>` }).join(''),
  yuki: (s) => `<rect width="${s}" height="${s}" fill="${C.lilac}"/>` + [...Array(25)].map((_, i) => { const r = Math.floor(i / 5), c = i % 5; return `<circle cx="${s * (0.14 + c * 0.18 + (r % 2) * 0.09 - 0.045)}" cy="${s * (0.14 + r * 0.18)}" r="${s * (r % 2 ? 0.03 : 0.045)}" fill="${C.paper}"/>` }).join(''),
  rai: (s) => `<rect width="${s}" height="${s}" fill="${C.ink}"/><path d="M${s * 0.6} ${-s * 0.02} L${s * 0.3} ${s * 0.46} L${s * 0.52} ${s * 0.46} L${s * 0.36} ${s * 1.02} L${s * 0.74} ${s * 0.38} L${s * 0.52} ${s * 0.38} L${s * 0.72} ${-s * 0.02}Z" fill="${C.mustard}"/>`,
  kiri: (s) => `<rect width="${s}" height="${s}" fill="${C.fog}"/>` + [...Array(7)].map((_, i) => `<rect x="${s * [0.1, 0.3, 0.05, 0.22, 0.4, 0.12, 0.28][i]}" y="${s * (0.12 + i * 0.118)}" width="${s * [0.6, 0.62, 0.5, 0.7, 0.5, 0.66, 0.45][i]}" height="${s * 0.05}" rx="${s * 0.025}" fill="${C.paper}" opacity="${[0.95, 0.7, 0.9, 0.6, 0.85, 0.7, 0.9][i]}"/>`).join(''),
}

export const KINDS = [['hare', '晴れ', 'HARE'], ['ame', '雨', 'AME'], ['kaze', '風', 'KAZE'], ['yuki', '雪', 'YUKI'], ['rai', '雷', 'KAMINARI'], ['kiri', '霧', 'KIRI']]
// 12 cards: kind index and number
export const DECK = [[0, 3], [1, 5], [2, 2], [3, 7], [4, 9], [5, 4], [0, 8], [1, 1], [2, 6], [3, 3], [4, 5], [5, 8]]

const css = `*{box-sizing:border-box;margin:0}body{-webkit-font-smoothing:antialiased;font-family:"Hiragino Sans",sans-serif;position:relative;overflow:hidden}.fu{font-family:Futura,"Avenir Next",sans-serif}.mi{font-family:"Hiragino Mincho ProN",serif}`
const svgPat = (id, s, style = '') => `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" style="${style}">${pat[id](s)}</svg>`

/** A full page of w x h with paper grain multiplied on top. bg: background behind rounded pieces. */
export const page = (w, h, body, bg = 'transparent') => `<!doctype html><meta charset=utf-8><style>${css}html,body{width:${w}px;height:${h}px;background:${bg}}</style><body>${body}<svg width="${w}" height="${h}" style="position:absolute;inset:0;mix-blend-mode:multiply;pointer-events:none">${grain}<rect width="100%" height="100%" filter="url(#g)"/></svg></body>`

/** Card face markup at 630x880, positioned at the origin (reused for small copies via scale). */
const cardFace = (k, n) => {
  const [id, ja, en] = KINDS[k]
  return `<div style="position:absolute;inset:0;background:${C.paper};border-radius:38px"></div>
${svgPat(id, 518, 'position:absolute;left:56px;top:150px;border-radius:6px')}
<div class="fu" style="position:absolute;left:56px;top:36px;font-size:92px;font-weight:700;color:${C.ink};letter-spacing:-.02em;line-height:1">${n}</div>
<div class="fu" style="position:absolute;right:58px;top:84px;font-size:20px;font-weight:500;letter-spacing:.24em;color:${C.ink}">${en}</div>
<div class="mi" style="position:absolute;left:56px;bottom:66px;font-size:84px;font-weight:600;color:${C.ink};line-height:1">${ja}</div>
<div class="fu" style="position:absolute;right:58px;bottom:72px;font-size:20px;font-weight:500;letter-spacing:.24em;color:${C.ink};opacity:.55">SORAMOYO</div>`
}
/** A card drawn at width w (scaled from 630), rotated, with a soft shadow. */
const miniCard = (k, n, w, x, y, deg) => `<div style="position:absolute;left:${x}px;top:${y}px;width:630px;height:880px;transform-origin:0 0;transform:scale(${w / 630}) rotate(${deg}deg);box-shadow:0 18px 40px rgba(0,0,0,.28);border-radius:38px">${cardFace(k, n)}</div>`

export const card = (k, n) => page(630, 880, cardFace(k, n))

export const back = page(630, 880, `<div style="position:absolute;inset:0;background:${C.ink};border-radius:38px"></div><svg width="630" height="880" style="position:absolute;inset:0">${[...Array(9)].map((_, i) => `<ellipse cx="${250 + i * 14}" cy="${400 + i * 10}" rx="${60 + i * 62}" ry="${44 + i * 50}" fill="none" stroke="${C.paper}" stroke-opacity="${i ? 0.5 : 1}" stroke-width="${i ? 2.5 : 5}" transform="rotate(-18 ${250 + i * 14} ${400 + i * 10})"/>`).join('')}</svg><div class="fu" style="position:absolute;left:225px;top:388px;font-size:30px;font-weight:700;color:${C.paper}">L</div><div style="position:absolute;inset:26px;border:2.5px solid ${C.paper};border-radius:20px;opacity:.9"></div>`)

/** band: the colour of the title band (navy, or vermilion for the decision-board sample). */
export const boxFront = (band = C.ink) => page(1000, 1000, `<div style="position:absolute;inset:0;background:${C.paper}"></div>
<svg width="1000" height="1000" style="position:absolute;inset:0">${KINDS.map(([id], i) => `<svg x="${360 + (i % 2) * 320}" y="${Math.floor(i / 2) * 320 + 20}" width="300" height="300" viewBox="0 0 300 300">${pat[id](300)}</svg>`).join('')}</svg>
<div style="position:absolute;left:0;top:0;width:340px;height:1000px;background:${band}"></div>
<div class="mi" style="position:absolute;left:92px;top:70px;writing-mode:vertical-rl;font-size:156px;font-weight:600;color:${C.paper};letter-spacing:.04em;line-height:1">空もよう</div>
<div class="fu" style="position:absolute;left:70px;bottom:150px;font-size:22px;font-weight:500;letter-spacing:.3em;color:${C.paper}">SORAMOYO</div>
<div style="position:absolute;left:70px;bottom:66px;font-size:21px;font-weight:600;letter-spacing:.1em;color:${C.paper};line-height:1.7;opacity:.8">2–4人 ・ 20分<br>8歳から</div>
<div style="position:absolute;left:258px;top:66px;width:44px;height:44px;border-radius:50%;background:${band === C.ink ? C.red : C.ink}"></div>`)

export const boxBack = page(1000, 1000, `<div style="position:absolute;inset:0;background:${C.ink}"></div>
<div class="mi" style="position:absolute;left:70px;top:70px;font-size:64px;font-weight:600;color:${C.paper};line-height:1">空もよう</div>
<div style="position:absolute;left:70px;top:172px;width:560px;font-size:26px;font-weight:300;line-height:1.8;color:${C.paper};opacity:.85">天気のカードを並べて、一週間の予報を当てるゲームです。晴れの隣に雨を置くと、点数が変わります。</div>
${miniCard(2, 2, 200, 640, 120, -8)}${miniCard(0, 3, 200, 700, 96, 2)}${miniCard(4, 9, 200, 770, 110, 11)}
<div style="position:absolute;left:0;right:0;bottom:0;height:334px;background:${C.paper}"></div>
<div style="position:absolute;left:70px;bottom:200px;font-size:24px;font-weight:600;color:${C.ink};line-height:1.8">カード 54枚<br>説明書 1冊</div>
<div style="position:absolute;left:70px;bottom:70px;font-size:22px;font-weight:600;color:${C.ink};letter-spacing:.08em;opacity:.8">2–4人 ・ 20分 ・ 8歳から</div>
<div style="position:absolute;right:150px;bottom:92px;display:flex;align-items:flex-end;gap:4px;height:120px">${[...Array(30)].map((_, i) => `<div style="width:${[2, 4, 2, 6, 2, 3][i % 6]}px;height:${100 - (i % 7 === 0 ? 0 : 10)}px;background:${C.ink}"></div>`).join('')}</div>
<div class="fu" style="position:absolute;right:150px;bottom:58px;font-size:18px;letter-spacing:.2em;color:${C.ink}">0 000000 000000</div>
<div class="mi" style="position:absolute;right:36px;bottom:36px;width:92px;height:92px;border-radius:50%;background:${C.red};color:${C.paper};font-size:28px;font-weight:600;display:grid;place-items:center">見本</div>`)

const strip = (vertical) => KINDS.map(([id], i) => svgPat(id, 120, `position:absolute;${vertical ? `left:70px;top:${520 + i * 132}px` : `top:70px;left:${520 + i * 132}px`};border-radius:4px`)).join('')
export const boxSideV = page(260, 1000, `<div style="position:absolute;inset:0;background:${C.ink}"></div>
<div class="mi" style="position:absolute;left:82px;top:56px;writing-mode:vertical-rl;font-size:96px;font-weight:600;color:${C.paper};line-height:1;letter-spacing:.04em">空もよう</div>
${KINDS.slice(0, 3).map(([id], i) => svgPat(id, 120, `position:absolute;left:70px;top:${520 + i * 140}px;border-radius:4px`)).join('')}`)
export const boxSideH = page(1000, 260, `<div style="position:absolute;inset:0;background:${C.ink}"></div>
<div class="mi" style="position:absolute;left:56px;top:82px;font-size:96px;font-weight:600;color:${C.paper};line-height:1;letter-spacing:.04em">空もよう</div>
${KINDS.map(([id], i) => svgPat(id, 80, `position:absolute;top:90px;left:${468 + i * 88}px;border-radius:4px`)).join('')}`)

/** Six cards in a row on paper, for the blog post demo (2400 x 1200). */
export const cardsRow = page(2400, 1200, `<div style="position:absolute;inset:0;background:${C.paper}"></div>${[0, 1, 2, 3, 4, 5].map((k, i) => miniCard(k, DECK[k][1], 330, 90 + i * 380, 240 + (i % 2) * 30, [-4, 3, -2, 5, -3, 2][i])).join('')}`)

/** Weather stickers: each pattern as a circle with a white die-cut border (for sticker apps). */
export const sticker = (k, size = 600) => page(size, size, `<div style="position:absolute;inset:${size * 0.04}px;border-radius:50%;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.04)"></div>${svgPat(KINDS[k][0], size * 0.84, `position:absolute;left:${size * 0.08}px;top:${size * 0.08}px;border-radius:50%`)}`)

export const CSV = `タイトル,本文
晴れ,となりに雨がなければ2点。
雨,となりの晴れを1枚裏返す。
風,このカードの左右を入れ替える。
雪,次の人は山札から引けない。
雷,場のカードを1枚選んで捨て札にする。
霧,このカードは裏向きで置く。
虹,雨のすぐ右に置くと3点。
台風,場の風をすべて持ち主の手札に戻す。
快晴,晴れが3枚並んだら5点。
通り雨,置いたあと山札から1枚引く。
初雪,最初に置かれた雪だけ2点。
予報士,山札の上から3枚を見て好きな順に戻す。
`

export const BLOG_HTML = `<h2>新作「空もよう」のお知らせ</h2>
<p>天気のカードを並べて、一週間の予報を当てるゲームです。</p>
<img src="https://example.com/soramoyo-box.png" width="1600" height="1600">
<img src="https://example.com/soramoyo-cards.png" width="2400" height="1200">`
