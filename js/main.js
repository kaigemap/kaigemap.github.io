// kaigelab: a dial of tiles at the edge of the screen; turning it swaps the PC and phone screens beside it.
// Design and every number below: docs/DESIGN.md (section numbers in comments).
import { APPS } from './apps.js'
import { LANGS, STRINGS, pickLang, store } from './i18n.js'

const $ = (id) => document.getElementById(id)
const N = APPS.length
const params = new URLSearchParams(location.search)
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)')
let reduced = reduceMQ.matches
const clamp = (x, a, b) => Math.min(b, Math.max(a, x))
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
const pad2 = (n) => String(n).padStart(2, '0')
const tpl = (id) => $(id).content.firstElementChild.cloneNode(true)

// ---------- springs (§6.2): m = 1, semi-implicit Euler in 1/120 s steps ----------

class Spring {
  constructor(k, c, x = 0) { this.k = k; this.c = c; this.x = x; this.v = 0; this.to = x }
  set(k, c) { this.k = k; this.c = c }
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
const SETTLE = [170, 18]
const WHEEL = [260, 32]

const startIndex = Math.max(0, APPS.findIndex((a) => a.id === decodeURIComponent(location.hash.slice(1))))
const pos = new Spring(...SETTLE, startIndex) // the dial position, in items
const ps = new Spring(120, 19, startIndex) // PC screen layer follows a little late
const pp = new Spring(90, 15, startIndex) // phone screen layer follows later still
const stretch = new Spring(300, 20, 0)
const needle = new Spring(900, 24, 0)
const introPc = new Spring(140, 20, 1)
const introPh = new Spring(140, 20, 1)

const state = {
  lang: pickLang(),
  view: params.get('view') === 'wall' || params.get('view') === 'grid' ? 'wall' : params.get('view') === 'dial' ? 'dial' : store.get('view') === 'wall' ? 'wall' : 'dial',
  active: -1,
  dragging: false,
  wheel: null,
  userPaused: reduced,
  settledAt: 0,
  lastNotch: 0,
  needleCell: null,
}

// ---------- building the page ----------

const stage = $('stage')
const slotsEl = $('slots')
const pairsEl = $('pairs')
const caption = $('caption')

const mediaPath = (app, kind, small) => `media/${app.id}${kind === 'phone' ? '-phone' : small ? '-s' : ''}`

function makeScreen(screen, app, kind) {
  const img = screen.querySelector('.poster')
  img.draggable = false
  const mark = document.createElement('span')
  mark.className = 'play-mark'
  mark.setAttribute('aria-hidden', 'true')
  screen.append(mark)
  const s = { screen, img, video: null, kind, app, small: null }
  if (app[kind] === 'video') {
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
  const url = el.querySelector('.url')
  url.href = app.url
  return { el, url, screen: makeScreen(el.querySelector('.pc-screen'), app, 'pc') }
}
function makePhone(app) {
  const el = tpl('t-phone')
  if (app.phone === 'missing') {
    el.classList.add('missing')
    return { el, screen: null }
  }
  return { el, screen: makeScreen(el.querySelector('.phone-screen'), app, 'phone') }
}

const pairs = APPS.map((app, i) => {
  const wrap = document.createElement('div')
  wrap.className = 'pair'
  const pc = makePc(app)
  const phone = makePhone(app)
  const title = tpl('t-title')
  title.querySelector('.num').textContent = `${pad2(i + 1)} / ${pad2(N)}`
  title.querySelector('.year').textContent = String(app.year)
  title.querySelector('.name').textContent = app.name
  wrap.append(pc.el, phone.el, title)
  pairsEl.append(wrap)
  for (const s of [pc.screen, phone.screen]) {
    if (!s) continue
    s.screen.addEventListener('click', () => { if (!drag.suppress && state.active === i) togglePause() })
  }
  return { app, i, wrap, pc, phone, title, name: title.querySelector('.name'), on: false, playing: false }
})

const slots = APPS.map((app, i) => {
  const el = tpl('t-tile')
  el.querySelector('.tick-num').textContent = pad2(i + 1)
  const pos_ = el.querySelector('.tile-pos')
  const tile = el.querySelector('.tile')
  const face = el.querySelector('.tile-face')
  const light = el.querySelector('.tile-light')
  face.textContent = app.name.slice(0, 1)
  const img = new Image()
  img.alt = ''
  img.decoding = 'async'
  img.draggable = false
  img.onload = () => face.replaceChildren(img)
  img.src = `media/tiles/${app.id}.webp`
  tile.addEventListener('click', () => { if (!drag.suppress) goTo(i) })
  const t = { el, pos: pos_, tile, light, hover: new Spring(320, 22, 1), over: false, lx: 0, ly: 0, tlx: 0, tly: 0 }
  tile.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { t.over = true; t.hover.to = 1.07; kick() } })
  tile.addEventListener('pointerleave', () => { t.over = false; t.hover.to = 1; t.tlx = t.tly = 0; kick() })
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

// ---------- layout (§2) ----------

let geo = null
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
  st.setProperty('--step', `${g.step}rad`)
  st.setProperty('--ns', `${g.ns}px`)
  st.setProperty('--whyLines', String(g.whyLines ?? 3))
  for (const p of pairs) {
    p.pc.el.style.transformOrigin = wide ? '0 50%' : '50% 50%'
    sizeScreen(p.pc.screen, g.small)
    if (p.phone.screen) sizeScreen(p.phone.screen, false)
  }
  fitNames()
  placeCaption()
}

/** Long names shrink until they fit (§2.2, §2.3). */
function fitNames() {
  for (const p of pairs) {
    p.name.style.fontSize = ''
    const need = p.name.scrollWidth
    if (need > geo.titleW) p.name.style.fontSize = `${Math.max(geo.nsMin, Math.floor(geo.ns * geo.titleW / need))}px`
  }
}

// ---------- the dial and the screens, drawn every frame (§3.3, §6.4, §6.5) ----------

const rubber = (p) => {
  if (p < 0) return -1.2 * (1 - 1 / ((-p * 0.55) / 1.2 + 1))
  if (p > N - 1) return N - 1 + 1.2 * (1 - 1 / (((p - (N - 1)) * 0.55) / 1.2 + 1))
  return p
}
const ease = (d) => d + 0.11 * Math.sin((Math.PI / 2) * clamp(d, -1, 1))

function draw() {
  const g = geo
  const pd = rubber(pos.x)
  const pDial = reduced ? pd : pd - 0.045 * Math.sin(2 * Math.PI * pd) // notches (§6.2)
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
  // the needle flicks each time a notch passes under it (§6.4)
  const cell = Math.floor(pDial + 0.5)
  if (state.needleCell !== null && cell !== state.needleCell && !reduced) needle.v += -Math.sign(pos.v || 1) * 220 * Math.min(1, Math.abs(pos.v) / 4)
  state.needleCell = cell
  stage.querySelector('.needle').style.transform = `rotate(${needle.x.toFixed(3)}deg)`

  // screens (§6.5)
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

// ---------- the loop ----------

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
  if (reduced) {
    if (!state.dragging) pos.snap()
    ps.to = pp.to = clamp(pos.x, 0, N - 1)
    ps.snap(); pp.snap(); stretch.snap(); needle.snap(); introPc.snap(); introPh.snap()
    for (const t of slots) t.hover.snap()
  } else {
    if (!state.dragging) pos.step(dt)
    ps.to = pp.to = clamp(pos.x, 0, N - 1)
    ps.step(dt)
    pp.step(dt)
    stretch.to = Math.min(Math.abs(pos.v) * 0.012, 0.1)
    stretch.step(dt)
    needle.step(dt)
    introPc.step(dt)
    if (introDelay > 0) introDelay -= dt
    else introPh.step(dt)
    for (const t of slots) t.hover.step(dt)
  }
  draw()
  const moving = state.dragging || state.wheel || !pos.done() || Math.abs(pos.v) > 0.05
  caption.classList.toggle('moving', moving)
  if (moving) { caption.classList.remove('shown'); state.settledAt = 0 }
  else if (!state.settledAt) { state.settledAt = now; onSettle() }
  const busy = moving || !ps.done() || !pp.done() || !stretch.done(1e-3) || !needle.done(0.01, 0.05) || !introPc.done() || !introPh.done() ||
    slots.some((t) => !t.hover.done(1e-3) || Math.abs(t.tlx - t.lx) > 0.05 || Math.abs(t.tly - t.ly) > 0.05)
  if (busy) raf = requestAnimationFrame(tick)
  else { raf = 0; pos.snap(); draw() }
}

// ---------- when the dial comes to rest: caption, video, address (§6.5, §6.6) ----------

let settleTimer = 0
let nextTimer = 0
function onSettle() {
  clearTimeout(settleTimer)
  clearTimeout(nextTimer)
  settleTimer = setTimeout(() => {
    const i = clamp(Math.round(pos.x), 0, N - 1)
    setActive(i)
    caption.classList.add('shown')
    syncVideos()
    nextTimer = setTimeout(() => {
      const n = pairs[i + 1]
      if (n) for (const s of [n.pc.screen, n.phone.screen]) if (s) loadVideo(s)
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
  const code = $('code')
  code.hidden = !app.repo
  if (app.repo) code.href = app.repo
  code.setAttribute('aria-label', t.code)
  const why = app.why[state.lang] || ''
  $('why').textContent = why
  $('why').hidden = !why || geo.whyLines === 0
  placeCaption()
}

/** On a phone the reason goes right under the description, as many lines as fit beside the phone (§2.3). */
function placeCaption() {
  if (!geo || geo.wide) return
  const name = pairs[Math.max(0, state.active)]?.name
  const nameH = name ? name.getBoundingClientRect().height || geo.ns : geo.ns
  const dT = geo.rowTop + 24 + nameH + 12
  stage.style.setProperty('--dT', `${dT}px`)
  const descH = $('desc').getBoundingClientRect().height || 21
  const wT = dT + descH + 16
  stage.style.setProperty('--wT', `${wT}px`)
  stage.style.setProperty('--whyLines', String(Math.max(0, Math.floor((geo.phBottom - wT) / (12 * 1.85)))))
}

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
  for (const p of pairs) for (const s of [p.pc.screen, p.phone.screen]) if (s) s.screen.setAttribute('aria-label', state.userPaused ? STRINGS[state.lang].play : STRINGS[state.lang].pause)
}
function togglePause() {
  state.userPaused = !state.userPaused
  for (const p of pairs) p.playing = false
  syncVideos()
}
// screens leave as soon as they are half way out (§6.6)
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

// ---------- input (§6.2, §6.3) ----------

function goTo(i) {
  pos.set(...SETTLE)
  pos.to = clamp(i, 0, N - 1)
  state.wheel = null
  kick()
}
const stepBy = (n) => goTo(Math.round(pos.to) + n)

const drag = { id: null, start: 0, p0: 0, moved: false, per: 98, samples: [], suppress: false }
stage.addEventListener('pointerdown', (e) => {
  if (state.view !== 'dial' || (e.pointerType === 'mouse' && e.button !== 0)) return
  drag.suppress = false
  if (e.target.closest('a, .lang, .lang-menu')) return
  const onDial = !!e.target.closest('.wheel, .tile')
  drag.id = e.pointerId
  drag.per = onDial ? geo.spacing : 220
  drag.start = geo.wide ? e.clientY : e.clientX
  drag.p0 = pos.x
  drag.moved = false
  drag.samples = [[e.timeStamp, drag.start]]
})
stage.addEventListener('pointermove', (e) => {
  if (e.pointerId !== drag.id) return
  const at = geo.wide ? e.clientY : e.clientX
  if (!drag.moved) {
    if (Math.abs(at - drag.start) < 6) return
    drag.moved = true
    state.dragging = true
    state.wheel = null
    stage.setPointerCapture(e.pointerId)
    drag.start = at
    drag.p0 = pos.x
  }
  pos.x = drag.p0 - (at - drag.start) / drag.per
  drag.samples.push([e.timeStamp, at])
  while (drag.samples.length > 2 && e.timeStamp - drag.samples[0][0] > 80) drag.samples.shift()
  const [t0, x0] = drag.samples[0]
  pos.v = e.timeStamp > t0 ? clamp((-(at - x0) / (e.timeStamp - t0)) * 1000 / drag.per, -14, 14) : 0
  kick()
})
function endDrag(e) {
  if (e.pointerId !== drag.id) return
  drag.id = null
  if (!drag.moved) return
  drag.suppress = true
  state.dragging = false
  const from = Math.round(drag.p0)
  pos.set(...SETTLE)
  pos.to = clamp(Math.round(pos.x + pos.v * 0.18), Math.max(0, from - 3), Math.min(N - 1, from + 3))
  kick()
}
stage.addEventListener('pointerup', endDrag)
stage.addEventListener('pointercancel', endDrag)

stage.addEventListener('wheel', (e) => {
  if (state.view !== 'dial' || e.ctrlKey) return
  const both = !geo.wide
  const raw = both && Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
  if (!raw) return
  e.preventDefault()
  const notched = e.deltaMode === 1 || Math.abs(raw) >= 50
  if (notched) {
    if (e.timeStamp - state.lastNotch < 90) return
    state.lastNotch = e.timeStamp
    stepBy(Math.sign(raw))
    return
  }
  if (!state.wheel) state.wheel = { from: pos.x, to: pos.x, timer: 0 }
  const w = state.wheel
  w.to = clamp(w.to + raw / 160, 0, N - 1)
  pos.set(...WHEEL)
  pos.to = w.to
  clearTimeout(w.timer)
  w.timer = setTimeout(() => {
    if (state.wheel !== w) return
    const moved = w.to - w.from
    state.wheel = null
    pos.set(...SETTLE)
    pos.to = clamp(Math.abs(moved) >= 0.15 ? (moved > 0 ? Math.ceil(pos.x - 1e-3) : Math.floor(pos.x + 1e-3)) : Math.round(pos.x), 0, N - 1)
    kick()
  }, 130)
  kick()
}, { passive: false })

document.addEventListener('keydown', (e) => {
  if (state.view !== 'dial' || e.altKey || e.metaKey || e.ctrlKey) return
  if (e.target.closest?.('input, textarea, select, .lang-menu')) return
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') stepBy(1)
  else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') stepBy(-1)
  else if (e.key === 'Home') goTo(0)
  else if (e.key === 'End') goTo(N - 1)
  else return
  e.preventDefault()
})

// ---------- the wall (§7.1) ----------

const wall = $('wall')
let wallItems = null
let wallIO = null
const wallVisible = new Set()

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
    const num = document.createElement('span')
    num.textContent = pad2(i + 1)
    const year = document.createElement('span')
    year.textContent = String(app.year)
    meta.append(num, year)
    const name = document.createElement('h2')
    name.className = 'name'
    const nameText = document.createElement('span')
    nameText.textContent = app.name
    name.append(nameText)
    const code = $('code').cloneNode(true)
    code.removeAttribute('id')
    code.hidden = !app.repo
    if (app.repo) code.href = app.repo
    name.append(code)
    const desc = document.createElement('p')
    desc.className = 'w-desc'
    const why = document.createElement('p')
    why.className = 'w-why'
    item.append(pairEl, meta, name, desc, why)
    item.addEventListener('click', (e) => { if (!e.target.closest('a')) setView('dial', i) })
    item.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { w.hover = true; wallPlay() } })
    item.addEventListener('pointerleave', () => { w.hover = false; wallPlay() })
    wall.append(item)
    const w = { app, i, item, pc, phone, desc, why, code, hover: false }
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
    w.code.setAttribute('aria-label', t.code)
    w.pc.url.querySelector('.url-text').textContent = `/${w.app.id}`
    w.pc.url.setAttribute('aria-label', t.open(w.app.name))
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

// ---------- switching views (§7.1) ----------

function setView(view, focus, instant = false) {
  if (view === state.view) return
  const from = state.view
  const apply = () => {
    state.view = view
    document.body.dataset.view = view
    wall.hidden = view !== 'wall'
    $('view-btn').setAttribute('aria-label', view === 'dial' ? STRINGS[state.lang].toWall : STRINGS[state.lang].toDial)
    if (view === 'wall') {
      if (!wallItems) buildWall()
      layoutWall()
      for (const p of pairs) for (const s of [p.pc.screen, p.phone.screen]) if (s?.video && !s.video.paused) s.video.pause()
      const w = wallItems[Math.max(0, state.active)]
      w.item.scrollIntoView({ block: 'center' })
      requestAnimationFrame(wallPlay)
    } else {
      scrollTo(0, 0)
      if (focus != null) { pos.to = pos.x = ps.x = ps.to = pp.x = pp.to = focus; pos.v = 0 }
      for (const w of wallItems || []) for (const s of [w.pc.screen, w.phone.screen]) if (s?.video && !s.video.paused) s.video.pause()
      measure()
      draw()
      state.settledAt = 0
      for (const p of pairs) p.playing = false
      kick()
    }
    nameTransition(view, focus)
  }
  store.set('view', view)
  const i = focus ?? state.active
  if (document.startViewTransition && !reduced && !instant) {
    nameTransition(from, i)
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
$('view-btn').addEventListener('click', () => setView(state.view === 'dial' ? 'wall' : 'dial', state.view === 'wall' ? Math.max(0, state.active) : undefined))

// ---------- language (§4.3) ----------

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
function openLang() { langMenu.hidden = false; langBtn.setAttribute('aria-expanded', 'true'); langItems.find((b) => b.getAttribute('aria-checked') === 'true')?.focus() }
function closeLang() { langMenu.hidden = true; langBtn.setAttribute('aria-expanded', 'false') }
langBtn.addEventListener('click', () => (langMenu.hidden ? openLang() : closeLang()))
document.addEventListener('pointerdown', (e) => { if (!langMenu.hidden && !e.target.closest('.lang')) closeLang() })
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !langMenu.hidden) { closeLang(); langBtn.focus() } })

function setLang(code, chosen = false) {
  state.lang = code
  const t = STRINGS[code]
  document.documentElement.lang = code
  $('lang-code').textContent = LANGS.find((l) => l.code === code).label
  langBtn.setAttribute('aria-label', t.language)
  langMenu.setAttribute('aria-label', t.language)
  langItems.forEach((b, k) => b.setAttribute('aria-checked', String(LANGS[k].code === code)))
  $('view-btn').setAttribute('aria-label', state.view === 'dial' ? t.toWall : t.toDial)
  slotsEl.setAttribute('aria-label', t.dial)
  slots.forEach((s, i) => s.tile.setAttribute('aria-label', APPS[i].name))
  for (const p of pairs) {
    const u = p.pc.url
    u.querySelector('.url-text').textContent = geo && !geo.wide ? `/${p.app.id}` : `kaigemap.github.io/${p.app.id}`
    u.setAttribute('aria-label', t.open(p.app.name))
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
    measure()
    setLang(state.lang)
    if (state.view === 'dial') draw()
    else { layoutWall(); wallPlay() }
  })
})
document.body.classList.toggle('reduced', reduced)
measure()
setLang(state.lang)
document.fonts?.ready.then(() => { fitNames(); placeCaption() })
const firstView = state.view
state.view = 'dial'
document.body.dataset.view = 'dial'
if (firstView === 'wall') {
  state.active = startIndex
  setView('wall', undefined, true)
} else {
  if (!reduced) {
    // the dial rolls in from just before the first item; the screens rise into place (§6.7)
    pos.x = ps.x = pp.x = startIndex - 1.2
    pos.to = startIndex
    introPc.x = introPh.x = 0
    introPc.to = introPh.to = 1
    introDelay = 0.07
  }
  draw()
  kick()
}
requestAnimationFrame(() => document.body.classList.add('ready'))
