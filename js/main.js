// kaigelab: a dial of tiles at the edge of the screen. Scrolling the page turns it and swaps the PC and phone
// screens beside it: the page is a stack of invisible sections (one per item, snapping), the stage stays fixed.
// Design: docs/DESIGN.md. Changed since: the page's own scroll drives the dial (wheel, trackpad, flick),
// no tick marks or needle, icon buttons with tooltips, no serial numbers.
import { APPS } from './apps.js'
import { LANGS, STRINGS, pickLang, store } from './i18n.js'

const $ = (id) => document.getElementById(id)
const N = APPS.length
const params = new URLSearchParams(location.search)
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)')
let reduced = reduceMQ.matches
const clamp = (x, a, b) => Math.min(b, Math.max(a, x))
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
const tpl = (id) => $(id).content.firstElementChild.cloneNode(true)
/** What the address bar shows: the whole address on a wide screen, the short part on a phone. */
const shownUrl = (url, short) => {
  const u = new URL(url)
  const path = u.pathname.replace(/\/$/, '')
  if (!short) return u.host + path
  return u.host === 'kaigemap.github.io' || u.host === 'github.com' ? path.replace(/^\/kaigemap(?=\/)/, '') : u.host
}

// ---------- springs: m = 1, semi-implicit Euler in 1/120 s steps ----------

class Spring {
  constructor(k, c, x = 0) { this.k = k; this.c = c; this.x = x; this.v = 0; this.to = x }
  step(dt) {
    let t = dt
    while (t > 1e-6) {
      const h = Math.min(t, 1 / 120)
      this.v += (-this.k * (this.x - this.to) - this.c * this.v) * h
      this.x += this.v * h
      t -= h
    }
  }
  done(eps = 4e-4, veps = 2e-3) { return Math.abs(this.x - this.to) < eps && Math.abs(this.v) < veps }
  snap() { this.x = this.to; this.v = 0 }
}

const startIndex = Math.max(0, APPS.findIndex((a) => a.id === decodeURIComponent(location.hash.slice(1))))
const ps = new Spring(120, 19, startIndex) // PC screen layer follows the scroll a little late
const pp = new Spring(90, 15, startIndex) // phone screen layer follows later still
const stretch = new Spring(300, 20, 0)
const introPc = new Spring(140, 20, 1)
// when the scroll stops between two items, this spring carries the page to one of them (slight overshoot)
const glide = new Spring(170, 18, 0)
const introPh = new Spring(140, 20, 1)

const state = {
  lang: pickLang(),
  view: params.get('view') === 'wall' || params.get('view') === 'grid' ? 'wall' : params.get('view') === 'dial' ? 'dial' : store.get('view') === 'wall' ? 'wall' : 'dial',
  p: startIndex, // where the scroll is, in items
  v: 0, // how fast, in items per second
  lastScroll: 0,
  scrollFrom: null, // where this scroll gesture started, in items
  gliding: false,
  touching: false,
  active: -1,
  userPaused: reduced,
  settledAt: 0,
}
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

// ---------- building the page ----------

const stage = $('stage')
const slotsEl = $('slots')
const pairsEl = $('pairs')
const caption = $('caption')
const scroller = $('scroller')
for (let i = 0; i < N; i++) {
  const s = document.createElement('div')
  s.className = 'snap'
  scroller.append(s)
}

const mediaPath = (app, kind, small) => `media/${app.id}${kind === 'phone' ? '-phone' : small ? '-s' : ''}`

function makeScreen(screen, app, kind) {
  const img = screen.querySelector('.poster')
  img.draggable = false
  const mark = document.createElement('span')
  mark.className = 'play-mark'
  mark.setAttribute('aria-hidden', 'true')
  screen.append(mark)
  const s = { screen, img, video: null, kind, app, small: null }
  if (app[kind] === 'video' || app[kind] === 'speaker') {
    const v = document.createElement('video')
    v.muted = true
    v.loop = true
    v.playsInline = true
    v.preload = 'none'
    v.setAttribute('muted', '')
    v.setAttribute('playsinline', '')
    v.setAttribute('aria-hidden', 'true')
    v.addEventListener('playing', () => { screen.classList.add('playing'); screen.classList.remove('leaving') })
    screen.insertBefore(v, mark)
    screen.classList.add('has-video')
    s.video = v
  }
  return s
}
/** Point a screen at the right file size. Called on layout. */
function sizeScreen(s, small) {
  if (s.small === small) return
  s.small = small
  s.img.src = `${mediaPath(s.app, s.kind, small)}.jpg`
  if (s.video && s.video.getAttribute('src')) {
    s.video.src = `${mediaPath(s.app, s.kind, small)}.mp4`
    s.screen.classList.remove('playing')
  }
}
function loadVideo(s) {
  if (!s.video || s.video.getAttribute('src')) return
  s.video.preload = 'auto'
  s.video.src = `${mediaPath(s.app, s.kind, s.small)}.mp4`
}

function makePc(app) {
  const el = tpl('t-pc')
  return { el, url: el.querySelector('.url'), screen: makeScreen(el.querySelector('.pc-screen'), app, 'pc') }
}
function makePhone(app) {
  const el = tpl('t-phone')
  if (app.phone === 'missing') {
    el.classList.add('missing')
    return { el, screen: null }
  }
  if (app.phone === 'speaker') el.classList.add('speaker')
  return { el, screen: makeScreen(el.querySelector('.phone-screen'), app, 'phone') }
}

const pairs = APPS.map((app, i) => {
  const wrap = document.createElement('div')
  wrap.className = 'pair'
  const pc = makePc(app)
  const phone = makePhone(app)
  const title = tpl('t-title')
  title.querySelector('.year').textContent = String(app.year)
  title.querySelector('.name').textContent = app.name
  wrap.append(pc.el, phone.el, title)
  pairsEl.append(wrap)
  for (const s of [pc.screen, phone.screen]) if (s) s.screen.addEventListener('click', () => { if (state.active === i) togglePause() })
  return { app, i, wrap, pc, phone, title, name: title.querySelector('.name'), on: false, playing: false }
})

// one floating tooltip for the tiles (they turn with the dial, so a CSS tooltip would turn too)
const tileTip = document.createElement('div')
tileTip.className = 'tile-tip'
tileTip.setAttribute('aria-hidden', 'true')
document.body.append(tileTip)
function showTileTip(t, i) {
  const b = t.tile.getBoundingClientRect()
  tileTip.textContent = APPS[i].name
  tileTip.classList.add('on')
  const w = tileTip.offsetWidth
  const h = tileTip.offsetHeight
  const x = geo.wide ? b.right + 12 : clamp(b.left + b.width / 2 - w / 2, 8, innerWidth - w - 8)
  const y = geo.wide ? b.top + b.height / 2 - h / 2 : b.top - h - 10
  tileTip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`
}
const hideTileTip = () => tileTip.classList.remove('on')

const slots = APPS.map((app, i) => {
  const el = tpl('t-tile')
  const tile = el.querySelector('.tile')
  const face = el.querySelector('.tile-face')
  face.textContent = app.name.slice(0, 1)
  const img = new Image()
  img.alt = ''
  img.decoding = 'async'
  img.draggable = false
  img.onload = () => face.replaceChildren(img)
  img.src = `media/tiles/${app.id}.webp`
  tile.addEventListener('click', () => { if (!reel.suppress) goTo(i) })
  const t = { el, pos: el.querySelector('.tile-pos'), tile, light: el.querySelector('.tile-light'), hover: new Spring(320, 22, 1), over: false, lx: 0, ly: 0, tlx: 0, tly: 0 }
  tile.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { t.over = true; t.hover.to = 1.07; showTileTip(t, i); kick() } })
  tile.addEventListener('pointerleave', () => { t.over = false; t.hover.to = 1; t.tlx = t.tly = 0; hideTileTip(); kick() })
  tile.addEventListener('pointerdown', () => { t.hover.to = 0.94; kick() })
  tile.addEventListener('pointerup', () => { t.hover.to = t.over ? 1.07 : 1; kick() })
  tile.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || reduced) return
    const b = tile.getBoundingClientRect()
    t.tlx = ((e.clientX - b.left) / b.width - 0.5) * 12
    t.tly = ((e.clientY - b.top) / b.height - 0.5) * 12
    kick()
  })
  slotsEl.append(el)
  return t
})

// ---------- layout ----------

let geo = null
let stepPx = innerHeight
const probe = document.createElement('div')
probe.style.cssText = 'position:fixed;visibility:hidden;padding-bottom:env(safe-area-inset-bottom)'
document.body.append(probe)

function measure() {
  const W = document.documentElement.clientWidth
  const H = stage.clientHeight || innerHeight
  const wide = W >= 900 && W / H >= 1.2
  const v = {}
  let g
  if (wide) {
    const Wc = Math.min(W, 1680)
    const Hc = Math.min(H, 1050)
    const m = Wc >= 1400 ? 40 : 32
    const R = 1100
    const rim = Math.round(Wc * 0.122)
    const x0 = Math.round(Wc * 0.2)
    const ground = Math.round(Hc * 0.845)
    const phH = Math.round(Hc * 0.69)
    const phOW = Math.round(phH * 390 / 844 + 13)
    const phL = Wc - m - phOW
    const gap = Math.round(Wc * 0.028)
    const pcW = phL - gap - x0
    const bar = Math.round(pcW * 0.036)
    const pcH = Math.round(pcW * 0.625 + bar)
    const ns = Math.round(Hc * 0.08)
    const nameTop = ground - pcH - ns * 1.42
    g = { wide, W, H, m, R, cx: rim - R, cy: Hc / 2, tile: 72, rt: R - 62, spacing: 98, sink: [3.2, 4.8], ns, nsMin: 40, titleW: pcW }
    Object.assign(v, {
      pcL: x0, pcT: ground - pcH, pcW, pcH, bar,
      phL, phT: ground - phH - 13, phW: phOW, phOH: phH + 13, phR: Math.round((phOW - 13) * 0.15), bezel: 5,
      tL: x0, tT: nameTop - 22, tW: pcW,
      dL: x0, dT: ground + 22, dW: Math.round(pcW * 0.42 - 24),
      wL: Math.round(x0 + pcW * 0.42), wT: ground + 20, wW: Math.round(pcW * 0.58),
    })
    g.whyLines = H < 640 ? 0 : 3
    g.small = pcW < 500
  } else {
    const cw = Math.min(W, 520)
    const ox = (W - cw) / 2
    const sab = parseFloat(getComputedStyle(probe).paddingBottom) || 0
    const pcW = cw - 32
    const pcH = Math.round(pcW * 0.625 + 13)
    const rowTop = 58 + pcH + 14
    const rim = H - 104 - sab
    const phH = Math.max(120, Math.min(330, rim - 24 - rowTop - 9))
    const phOW = Math.round(phH * 390 / 844 + 9)
    const R = 620
    const colW = cw - 32 - phOW - 16
    g = { wide, W, H, m: 16, R, cx: W / 2, cy: rim + R, tile: 52, rt: R - 44, spacing: 68, sink: [1.8, 2.9], ns: 32, nsMin: 22, titleW: colW, rowTop, phBottom: rowTop + phH + 9, colL: ox + 16 }
    Object.assign(v, {
      pcL: ox + 16, pcT: 58, pcW, pcH, bar: 13,
      phL: ox + cw - 16 - phOW, phT: rowTop, phW: phOW, phOH: phH + 9, phR: Math.round((phOW - 9) * 0.15), bezel: 3,
      tL: ox + 16, tT: rowTop + 4, tW: colW,
      dL: ox + 16, dT: rowTop + 24 + 32 + 12, dW: colW,
      wL: ox + 16, wT: 0, wW: colW,
    })
    g.small = true
  }
  g.step = g.spacing / g.rt
  g.loupe = Math.round(g.tile * 1.3 + 10)
  geo = g
  stage.dataset.shape = wide ? 'wide' : 'tall'
  document.documentElement.style.setProperty('--m', `${g.m}px`)
  const st = stage.style
  for (const [k, val] of Object.entries(v)) st.setProperty(`--${k}`, `${val}px`)
  st.setProperty('--cx', `${g.cx}px`)
  st.setProperty('--cy', `${g.cy}px`)
  st.setProperty('--R', `${g.R}px`)
  st.setProperty('--tile', `${g.tile}px`)
  st.setProperty('--rt', `${g.rt}px`)
  st.setProperty('--loupe', `${g.loupe}px`)
  st.setProperty('--ns', `${g.ns}px`)
  st.setProperty('--whyLines', String(g.whyLines ?? 3))
  for (const p of pairs) {
    p.pc.el.style.transformOrigin = wide ? '0 50%' : '50% 50%'
    sizeScreen(p.pc.screen, g.small)
    if (p.phone.screen) sizeScreen(p.phone.screen, false)
  }
  stepPx = scroller.firstElementChild?.offsetHeight || innerHeight
  fitNames()
  placeCaption()
}

/** Long names must never run into the phone frame. Wide: one line down to 40px. Phone: one line down to 24px, then two lines. */
function fitNames() {
  const max = geo.titleW
  for (const p of pairs) {
    const n = p.name
    let size = geo.ns
    const set = () => { n.style.fontSize = `${size}px` }
    n.style.whiteSpace = 'nowrap'
    set()
    const floor = geo.wide ? geo.nsMin : 24
    while (size > floor && n.scrollWidth > max + 0.5) { size -= 1; set() }
    if (n.scrollWidth <= max + 0.5 || geo.wide) continue
    n.style.whiteSpace = 'normal'
    size = geo.ns - 2
    set()
    while (size > 18 && (n.scrollWidth > max + 0.5 || n.getBoundingClientRect().height > size * 2.2)) { size -= 1; set() }
  }
}

// ---------- drawing: the dial and the screens follow the scroll position ----------

const ease = (d) => d + 0.11 * Math.sin((Math.PI / 2) * clamp(d, -1, 1))

function draw() {
  const g = geo
  const p = state.p
  const pDial = reduced ? p : p - 0.03 * Math.sin(2 * Math.PI * p) // a light notch at each item
  const base = g.wide ? 0 : -Math.PI / 2
  const inner = g.wide ? 0 : Math.PI / 2
  const e = reduced ? 0 : stretch.x
  for (let i = 0; i < N; i++) {
    const t = slots[i]
    const d = i - pDial
    const a = Math.abs(d)
    const th = base + ease(d) * g.step
    const mag = a < 1 ? 1 + 0.3 * Math.cos((a * Math.PI) / 2) ** 2 : 1
    const squeeze = a < 1 ? 1 - 0.1 * Math.sin(Math.PI * a) ** 2 : 1
    const sink = smooth(g.sink[0], g.sink[1], a)
    const h = t.hover.x
    t.el.style.transform = `rotate(${th.toFixed(5)}rad)`
    t.el.style.visibility = sink >= 1 ? 'hidden' : ''
    t.pos.style.transform = `scale(${(mag * (1 - e / 2) * h).toFixed(4)}, ${(mag * squeeze * (1 - 0.35 * sink) * (1 + e) * h).toFixed(4)})`
    t.pos.style.opacity = (1 - sink).toFixed(3)
    t.lx += (t.tlx - t.lx) * 0.2
    t.ly += (t.tly - t.ly) * 0.2
    t.light.style.transform = `rotate(${(-(th + inner)).toFixed(5)}rad) translate(${t.lx.toFixed(2)}px, ${t.ly.toFixed(2)}px)`
    t.tile.style.setProperty('--lift', clamp((h - 1) / 0.07, 0, 1).toFixed(3))
  }
  const along = (px) => (g.wide ? `translate3d(0, ${px.toFixed(2)}px, 0)` : `translate3d(${px.toFixed(2)}px, 0, 0)`)
  for (const p of pairs) {
    const ds = p.i - ps.x
    const dp = p.i - pp.x
    const on = Math.abs(ds) < 1 || Math.abs(dp) < 1
    if (on !== p.on) { p.on = on; p.wrap.classList.toggle('on', on) }
    if (!on) continue
    const a = Math.min(Math.abs(ds), 1)
    const b = Math.min(Math.abs(dp), 1)
    const lift = (1 - introPc.x) * 20
    const liftP = (1 - introPh.x) * 20
    p.pc.el.style.transform = `${along(ds * 56)} translateY(${lift.toFixed(2)}px) scale(${1 - 0.03 * a})${g.wide ? ` rotate(${(ds * 1.2).toFixed(3)}deg)` : ''}`
    p.pc.el.style.opacity = ((1 - smooth(0.25, 0.75, Math.abs(ds))) * clamp(introPc.x, 0, 1)).toFixed(3)
    p.phone.el.style.transform = `${along(dp * 84)} translateY(${liftP.toFixed(2)}px) scale(${1 - 0.03 * b})`
    p.phone.el.style.opacity = ((1 - smooth(0.25, 0.75, Math.abs(dp))) * clamp(introPh.x, 0, 1)).toFixed(3)
    p.title.style.transform = along(ds * 28)
    p.title.style.opacity = ((1 - smooth(0.15, 0.5, Math.abs(ds))) * clamp(introPc.x, 0, 1)).toFixed(3)
  }
  leaveCheck()
}

// ---------- the loop: runs while the page scrolls or anything is still moving ----------

let raf = 0
let last = 0
let introDelay = 0
function kick() {
  if (raf || state.view !== 'dial') return
  last = performance.now()
  raf = requestAnimationFrame(tick)
}
function tick(now) {
  const dt = Math.min(1 / 20, (now - last) / 1000)
  last = now
  if (state.gliding) {
    if (reduced) glide.snap()
    else glide.step(dt)
    scrollTo(0, Math.round(clamp(glide.x, 0, N - 1) * stepPx))
    if (glide.done()) { state.gliding = false; scrollTo(0, Math.round(glide.to * stepPx)) }
  }
  const before = state.p
  state.p = clamp(scrollY / stepPx, 0, N - 1)
  const v = dt > 0 ? (state.p - before) / dt : 0
  state.v += (v - state.v) * 0.35
  ps.to = pp.to = state.p
  if (reduced) {
    ps.snap(); pp.snap(); stretch.snap(); introPc.snap(); introPh.snap()
    for (const t of slots) t.hover.snap()
  } else {
    ps.step(dt)
    pp.step(dt)
    stretch.to = Math.min(Math.abs(state.v) * 0.012, 0.1)
    stretch.step(dt)
    introPc.step(dt)
    if (introDelay > 0) introDelay -= dt
    else introPh.step(dt)
    for (const t of slots) t.hover.step(dt)
  }
  draw()
  const scrolling = now - state.lastScroll < 140
  // the hand has let go and the page stopped between two items: glide to one, leaning the way it was going
  if (!scrolling && !state.gliding && !state.touching && Math.abs(state.p - Math.round(state.p)) > 0.002) {
    const moved = state.scrollFrom == null ? 0 : state.p - state.scrollFrom
    const to = Math.abs(moved) >= 0.06 ? (moved > 0 ? Math.ceil(state.p - 0.02) : Math.floor(state.p + 0.02)) : Math.round(state.p)
    startGlide(to)
  }
  if (!scrolling && !state.gliding) state.scrollFrom = null
  const moving = scrolling || state.gliding || Math.abs(state.p - Math.round(state.p)) > 0.004
  caption.classList.toggle('moving', moving)
  if (moving) { caption.classList.remove('shown'); state.settledAt = 0; closeWhy(); hideTileTip() }
  else if (!state.settledAt) { state.settledAt = now; onSettle() }
  if (!moving) state.v = 0
  const busy = moving || !ps.done() || !pp.done() || !stretch.done(1e-3) || !introPc.done() || !introPh.done() ||
    slots.some((t) => !t.hover.done(1e-3) || Math.abs(t.tlx - t.lx) > 0.05 || Math.abs(t.tly - t.ly) > 0.05)
  if (busy) raf = requestAnimationFrame(tick)
  else { raf = 0; draw() }
}
function startGlide(to) {
  glide.x = state.p
  glide.v = state.gliding ? glide.v : 0
  glide.to = clamp(to, 0, N - 1)
  state.gliding = true
  kick()
}
addEventListener('scroll', () => {
  if (state.view !== 'dial') return
  if (!state.gliding) {
    if (state.scrollFrom == null) state.scrollFrom = clamp(scrollY / stepPx, 0, N - 1)
    state.lastScroll = performance.now()
  }
  kick()
}, { passive: true })
// a new gesture takes over from a glide
const takeOver = () => { if (state.gliding) { state.gliding = false; state.scrollFrom = state.p } }
addEventListener('wheel', takeOver, { passive: true })
addEventListener('touchstart', () => { takeOver(); state.touching = true }, { passive: true })
addEventListener('touchend', () => { state.touching = false; state.lastScroll = performance.now(); kick() }, { passive: true })
addEventListener('touchcancel', () => { state.touching = false; kick() }, { passive: true })

// ---------- when the scroll comes to rest on an item: caption, video, address ----------

let settleTimer = 0
let nextTimer = 0
function onSettle() {
  clearTimeout(settleTimer)
  clearTimeout(nextTimer)
  settleTimer = setTimeout(() => {
    const i = clamp(Math.round(state.p), 0, N - 1)
    setActive(i)
    caption.classList.add('shown')
    syncVideos()
    nextTimer = setTimeout(() => {
      for (const n of [pairs[i + 1], pairs[i - 1]]) if (n) for (const s of [n.pc.screen, n.phone.screen]) if (s) loadVideo(s)
    }, 600)
  }, 120)
}

function setActive(i) {
  const changed = state.active !== i
  state.active = i
  slots.forEach((t, k) => {
    if (k === i) t.tile.setAttribute('aria-current', 'true')
    else t.tile.removeAttribute('aria-current')
  })
  fillCaption()
  if (changed) history.replaceState(null, '', `${location.pathname}${location.search}#${encodeURIComponent(APPS[i].id)}`)
}

function fillCaption() {
  const i = state.active
  if (i < 0) return
  const app = APPS[i]
  const t = STRINGS[state.lang]
  $('desc').textContent = app.desc[state.lang]
  const open = $('open')
  open.href = app.url
  open.setAttribute('aria-label', t.open(app.name))
  open.dataset.tip = t.openShort
  const why = app.why[state.lang] || ''
  closeWhy()
  whyEl.textContent = why
  whyEl.hidden = !why || geo.whyLines === 0
  placeCaption()
  requestAnimationFrame(markLongWhy)
}

/** On a phone the reason goes right under the description, as many lines as fit beside the phone. */
function placeCaption() {
  if (!geo || geo.wide) return
  const name = pairs[Math.max(0, state.active)]?.name
  const nameH = name ? name.getBoundingClientRect().height || geo.ns : geo.ns
  const dT = geo.rowTop + 24 + nameH + 12
  stage.style.setProperty('--dT', `${dT}px`)
  const descH = $('desc').parentElement.getBoundingClientRect().height || 21
  const wT = dT + descH + 16
  stage.style.setProperty('--wT', `${wT}px`)
  stage.style.setProperty('--whyLines', String(Math.max(0, Math.floor((geo.phBottom - wT) / (12 * 1.85)))))
}

// ---------- the reason: only the first lines fit; a tap opens the whole text in place ----------

const whyEl = $('why')
function markLongWhy() {
  const long = !whyEl.hidden && whyEl.scrollHeight > whyEl.clientHeight + 1
  whyEl.classList.toggle('more', long)
  if (long) { whyEl.setAttribute('role', 'button'); whyEl.tabIndex = 0; whyEl.setAttribute('aria-expanded', 'false') }
  else { whyEl.removeAttribute('role'); whyEl.removeAttribute('tabindex'); whyEl.removeAttribute('aria-expanded') }
}
function openWhy() {
  if (!whyEl.classList.contains('more') || whyEl.classList.contains('open')) return
  const b = whyEl.getBoundingClientRect()
  const H = stage.clientHeight
  // grows upwards from where the short version sits; padding is offset by negative margins so the text stays put
  whyEl.style.top = 'auto'
  whyEl.style.bottom = `${Math.max(8, H - b.bottom)}px`
  if (!geo.wide) {
    const cw = Math.min(stage.clientWidth, 520)
    whyEl.style.left = `${(stage.clientWidth - cw) / 2 + 38}px`
    whyEl.style.width = `${cw - 76}px`
  }
  whyEl.classList.add('open')
  whyEl.setAttribute('aria-expanded', 'true')
}
function closeWhy() {
  if (!whyEl.classList.contains('open')) return
  whyEl.classList.remove('open')
  for (const k of ['top', 'bottom', 'left', 'width']) whyEl.style[k] = ''
  whyEl.setAttribute('aria-expanded', 'false')
}
whyEl.addEventListener('click', () => (whyEl.classList.contains('open') ? closeWhy() : openWhy()))
whyEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); whyEl.classList.contains('open') ? closeWhy() : openWhy() }
})
document.addEventListener('pointerdown', (e) => { if (!e.target.closest('.why')) closeWhy() })
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeWhy() })

// ---------- video ----------

function syncVideos() {
  for (const p of pairs) {
    const active = state.view === 'dial' && p.i === state.active
    for (const s of [p.pc.screen, p.phone.screen]) {
      if (!s || !s.video) continue
      if (active && !state.userPaused) {
        loadVideo(s)
        if (!p.playing) s.video.currentTime = 0
        s.video.play().catch(() => {})
      } else if (!s.video.paused) {
        s.screen.classList.add('leaving')
        s.screen.classList.remove('playing')
        const v = s.video
        setTimeout(() => v.pause(), 160)
      }
    }
    p.playing = active && !state.userPaused
  }
  const label = state.userPaused ? STRINGS[state.lang].play : STRINGS[state.lang].pause
  for (const p of pairs) for (const s of [p.pc.screen, p.phone.screen]) if (s) s.screen.setAttribute('aria-label', label)
}
function togglePause() {
  state.userPaused = !state.userPaused
  for (const p of pairs) p.playing = false
  syncVideos()
}
// screens stop as soon as they are half way out
function leaveCheck() {
  for (const p of pairs) {
    if (!p.playing || Math.abs(p.i - ps.x) <= 0.5) continue
    p.playing = false
    for (const s of [p.pc.screen, p.phone.screen]) {
      if (!s || !s.video) continue
      s.screen.classList.add('leaving')
      s.screen.classList.remove('playing')
      const v = s.video
      setTimeout(() => v.pause(), 160)
    }
  }
}

// ---------- moving to an item: the page scrolls there ----------

function goTo(i, instant = false) {
  if (instant || reduced) {
    state.gliding = false
    scrollTo(0, Math.round(clamp(i, 0, N - 1) * stepPx))
    kick()
    return
  }
  startGlide(i)
}
document.addEventListener('keydown', (e) => {
  if (state.view !== 'dial' || e.altKey || e.metaKey || e.ctrlKey) return
  if (e.target.closest?.('input, textarea, select, .lang-menu, .why')) return
  const here = state.gliding ? glide.to : Math.round(state.p)
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown') goTo(here + 1)
  else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') goTo(here - 1)
  else if (e.key === 'Home') goTo(0)
  else if (e.key === 'End') goTo(N - 1)
  else return
  e.preventDefault()
})

// ---------- the reel can be dragged and flicked: sideways on a phone, up and down on a PC ----------

const reel = { id: null, x0: 0, y0: 0, p0: 0, start: 0, per: 98, axis: null, moved: false, samples: [], suppress: false }
stage.addEventListener('pointerdown', (e) => {
  reel.suppress = false
  if (state.view !== 'dial' || (e.pointerType === 'mouse' && e.button !== 0) || !e.target.closest('.wheel, .tile')) return
  takeOver()
  Object.assign(reel, { id: e.pointerId, x0: e.clientX, y0: e.clientY, p0: state.p, moved: false, axis: null, samples: [] })
})
stage.addEventListener('pointermove', (e) => {
  if (e.pointerId !== reel.id) return
  const dx = e.clientX - reel.x0
  const dy = e.clientY - reel.y0
  if (!reel.moved) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 6) return
    reel.moved = true
    state.touching = true
    // along the reel: sideways on a phone (an up-down swipe there scrolls like the page), up and down on a PC
    reel.axis = geo.wide ? 'y' : Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y'
    reel.per = geo.wide || reel.axis === 'x' ? geo.spacing : stepPx
    reel.start = reel.axis === 'x' ? e.clientX : e.clientY
    reel.p0 = state.p
    stage.setPointerCapture(e.pointerId)
    stage.classList.add('grabbing')
    hideTileTip()
  }
  const at = reel.axis === 'x' ? e.clientX : e.clientY
  const p = clamp(reel.p0 - (at - reel.start) / reel.per, 0, N - 1)
  scrollTo(0, Math.round(p * stepPx))
  reel.samples.push([e.timeStamp, p])
  while (reel.samples.length > 2 && e.timeStamp - reel.samples[0][0] > 80) reel.samples.shift()
  kick()
})
function letGo(e) {
  if (e.pointerId !== reel.id) return
  reel.id = null
  state.touching = false
  stage.classList.remove('grabbing')
  if (!reel.moved) return
  reel.suppress = true
  const [t0, p0] = reel.samples[0] || [0, state.p]
  const [t1, p1] = reel.samples[reel.samples.length - 1] || [0, state.p]
  const v = t1 > t0 ? clamp(((p1 - p0) / (t1 - t0)) * 1000, -14, 14) : 0 // items per second
  const from = Math.round(reel.p0)
  const to = clamp(Math.round(state.p + v * 0.18), Math.max(0, from - 3), Math.min(N - 1, from + 3))
  // the flick carries on with the speed it had, then settles on an item
  glide.x = state.p
  glide.v = reduced ? 0 : v
  glide.to = to
  state.gliding = true
  kick()
}
stage.addEventListener('pointerup', letGo)
stage.addEventListener('pointercancel', letGo)

// ---------- the wall ----------

const wall = $('wall')
let wallItems = null
let wallIO = null
const wallVisible = new Set()

function openLink() {
  const a = $('open').cloneNode(true)
  a.removeAttribute('id')
  return a
}

function buildWall() {
  wallItems = APPS.map((app, i) => {
    const item = document.createElement('article')
    item.className = 'w-item'
    const pairEl = document.createElement('div')
    pairEl.className = 'w-pair'
    const pc = makePc(app)
    const phone = makePhone(app)
    sizeScreen(pc.screen, true)
    if (phone.screen) sizeScreen(phone.screen, false)
    pairEl.append(pc.el, phone.el)
    const meta = document.createElement('p')
    meta.className = 'meta'
    const year = document.createElement('span')
    year.textContent = String(app.year)
    meta.append(year)
    const name = document.createElement('h2')
    name.className = 'name'
    const nameText = document.createElement('span')
    nameText.textContent = app.name
    const open = openLink()
    open.href = app.url
    name.append(nameText, open)
    const desc = document.createElement('p')
    desc.className = 'w-desc'
    const why = document.createElement('p')
    why.className = 'w-why'
    item.append(pairEl, meta, name, desc, why)
    item.addEventListener('click', (e) => { if (!e.target.closest('a')) setView('dial', i) })
    const w = { app, i, item, pc, phone, desc, why, open, hover: false }
    item.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { w.hover = true; wallPlay() } })
    item.addEventListener('pointerleave', () => { w.hover = false; wallPlay() })
    wall.append(item)
    return w
  })
  wallIO = new IntersectionObserver((entries) => {
    for (const en of entries) {
      const i = Number(en.target.dataset.i)
      if (en.isIntersecting) wallVisible.add(i)
      else wallVisible.delete(i)
    }
    wallPlay()
  })
  wallItems.forEach((w) => { w.item.dataset.i = String(w.i); wallIO.observe(w.item) })
  addEventListener('scroll', () => { if (state.view === 'wall') requestAnimationFrame(wallPlay) }, { passive: true })
  fillWall()
}
function fillWall() {
  if (!wallItems) return
  const t = STRINGS[state.lang]
  for (const w of wallItems) {
    w.desc.textContent = w.app.desc[state.lang]
    w.why.textContent = w.app.why[state.lang] || ''
    w.why.hidden = !w.why.textContent
    w.open.setAttribute('aria-label', t.open(w.app.name))
    w.open.dataset.tip = t.openShort
    w.pc.url.querySelector('.url-text').textContent = shownUrl(w.app.url, true)
  }
}
function layoutWall() {
  const W = document.documentElement.clientWidth
  const cols = W >= 1200 ? 3 : W >= 900 ? 2 : 1
  wall.style.setProperty('--cols', String(cols))
  wall.style.setProperty('--rowgap', `${W >= 1400 ? 72 : W >= 900 ? 64 : 48}px`)
  wall.style.paddingTop = `${W >= 1400 ? 96 : W >= 900 ? 88 : 72}px`
}
/** Only the few pairs nearest the middle of the screen play (3 on a wide screen, 1 on a phone). */
function wallPlay() {
  if (!wallItems || state.view !== 'wall') return
  const k = geo && geo.wide ? 3 : 1
  const mid = innerHeight / 2
  const near = [...wallVisible].map((i) => {
    const b = wallItems[i].item.getBoundingClientRect()
    return [i, Math.abs(b.top + b.height / 2 - mid)]
  }).sort((a, b) => a[1] - b[1]).slice(0, k).map(([i]) => i)
  for (const w of wallItems) {
    const on = !reduced && !state.userPaused && (near.includes(w.i) || w.hover)
    for (const s of [w.pc.screen, w.phone.screen]) {
      if (!s || !s.video) continue
      if (on) { loadVideo(s); s.video.play().catch(() => {}) } else if (!s.video.paused) { s.video.pause(); s.screen.classList.remove('playing') }
    }
  }
}

// ---------- switching views ----------

function setView(view, focus, instant = false) {
  if (view === state.view) return
  const apply = () => {
    state.view = view
    document.body.dataset.view = view
    document.documentElement.dataset.view = view
    wall.hidden = view !== 'wall'
    const t = STRINGS[state.lang]
    const vb = $('view-btn')
    vb.setAttribute('aria-label', view === 'dial' ? t.toWall : t.toDial)
    vb.dataset.tip = view === 'dial' ? t.toWall : t.toDial
    hideTileTip()
    if (view === 'wall') {
      if (!wallItems) buildWall()
      layoutWall()
      for (const p of pairs) for (const s of [p.pc.screen, p.phone.screen]) if (s?.video && !s.video.paused) s.video.pause()
      wallItems[Math.max(0, state.active)].item.scrollIntoView({ block: 'center' })
      requestAnimationFrame(wallPlay)
    } else {
      for (const w of wallItems || []) for (const s of [w.pc.screen, w.phone.screen]) if (s?.video && !s.video.paused) s.video.pause()
      measure()
      const i = focus ?? Math.max(0, state.active)
      state.p = ps.x = ps.to = pp.x = pp.to = i
      goTo(i, true)
      draw()
      state.settledAt = 0
      for (const p of pairs) p.playing = false
      kick()
    }
    nameTransition(view, focus ?? state.active)
  }
  store.set('view', view)
  if (document.startViewTransition && !reduced && !instant) {
    nameTransition(state.view, focus ?? state.active)
    document.startViewTransition(apply)
  } else apply()
}
/** The selected pair keeps its identity across the switch, so it glides from one place to the other. */
function nameTransition(view, i) {
  for (const p of pairs) { p.pc.el.style.viewTransitionName = ''; p.phone.el.style.viewTransitionName = '' }
  for (const w of wallItems || []) { w.pc.el.style.viewTransitionName = ''; w.phone.el.style.viewTransitionName = '' }
  if (i == null || i < 0) return
  if (view === 'dial') { pairs[i].pc.el.style.viewTransitionName = 'sel-pc'; pairs[i].phone.el.style.viewTransitionName = 'sel-phone' }
  else if (wallItems) { wallItems[i].pc.el.style.viewTransitionName = 'sel-pc'; wallItems[i].phone.el.style.viewTransitionName = 'sel-phone' }
}
$('view-btn').addEventListener('click', () => setView(state.view === 'dial' ? 'wall' : 'dial'))

// ---------- language ----------

const langMenu = $('lang-menu')
const langBtn = $('lang-btn')
const langItems = LANGS.map((l) => {
  const b = document.createElement('button')
  b.type = 'button'
  b.setAttribute('role', 'menuitemradio')
  b.lang = l.code
  b.textContent = l.native
  b.addEventListener('click', () => { setLang(l.code, true); closeLang() })
  langMenu.append(b)
  return b
})
function openLang() { langMenu.hidden = false; langBtn.setAttribute('aria-expanded', 'true'); langBtn.classList.add('menu-open'); langItems.find((b) => b.getAttribute('aria-checked') === 'true')?.focus() }
function closeLang() { langMenu.hidden = true; langBtn.setAttribute('aria-expanded', 'false'); langBtn.classList.remove('menu-open') }
langBtn.addEventListener('click', () => (langMenu.hidden ? openLang() : closeLang()))
document.addEventListener('pointerdown', (e) => { if (!langMenu.hidden && !e.target.closest('.lang')) closeLang() })
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !langMenu.hidden) { closeLang(); langBtn.focus() } })

function setLang(code, chosen = false) {
  state.lang = code
  const t = STRINGS[code]
  document.documentElement.lang = code
  langBtn.setAttribute('aria-label', t.language)
  langBtn.dataset.tip = t.language
  langMenu.setAttribute('aria-label', t.language)
  langItems.forEach((b, k) => b.setAttribute('aria-checked', String(LANGS[k].code === code)))
  const vb = $('view-btn')
  vb.setAttribute('aria-label', state.view === 'dial' ? t.toWall : t.toDial)
  vb.dataset.tip = state.view === 'dial' ? t.toWall : t.toDial
  slotsEl.setAttribute('aria-label', t.dial)
  slots.forEach((s, i) => s.tile.setAttribute('aria-label', APPS[i].name))
  for (const p of pairs) {
    p.pc.url.querySelector('.url-text').textContent = shownUrl(p.app.url, geo && !geo.wide)
    if (p.app.phone === 'missing') p.phone.el.setAttribute('aria-label', t.phoneMissing)
  }
  fillCaption()
  fillWall()
  syncVideos()
  if (chosen) {
    store.set('lang', code)
    const url = new URL(location.href)
    url.searchParams.set('lang', code)
    history.replaceState(null, '', url)
  }
}

// ---------- start ----------

reduceMQ.addEventListener('change', () => {
  reduced = reduceMQ.matches
  document.body.classList.toggle('reduced', reduced)
  state.userPaused = reduced
  for (const p of pairs) p.playing = false
  syncVideos()
})
let resizeQueued = false
addEventListener('resize', () => {
  if (resizeQueued) return
  resizeQueued = true
  requestAnimationFrame(() => {
    resizeQueued = false
    const keep = Math.round(state.p)
    measure()
    setLang(state.lang)
    if (state.view === 'dial') { goTo(keep, true); state.p = keep; draw() } else { layoutWall(); wallPlay() }
  })
})

document.body.classList.toggle('reduced', reduced)
measure()
setLang(state.lang)
// names are measured again once Young Serif has really loaded (until then a fallback face is measured)
document.fonts?.load('400 32px "Young Serif"').then(() => { fitNames(); placeCaption() }).catch(() => {})
const firstView = state.view
state.view = 'dial'
document.body.dataset.view = 'dial'
document.documentElement.dataset.view = 'dial'
if (firstView === 'wall') {
  state.active = startIndex
  setView('wall', undefined, true)
} else {
  goTo(startIndex, true)
  state.p = startIndex
  if (!reduced) {
    // the screens rise into place once
    introPc.x = introPh.x = 0
    introPc.to = introPh.to = 1
    introDelay = 0.07
  }
  draw()
  kick()
}
requestAnimationFrame(() => document.body.classList.add('ready'))
