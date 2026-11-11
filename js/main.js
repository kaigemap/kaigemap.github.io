import { APPS } from './apps.js'
import { LANGS, STRINGS, pickLang, store } from './i18n.js'

const $ = (id) => document.getElementById(id)
const N = APPS.length
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)')
const canHover = matchMedia('(hover: hover) and (pointer: fine)')
const params = new URLSearchParams(location.search)
const num = (v, lo, hi, fallback) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback)

// Arc shape. curve: radius as a multiple of the card width (smaller = rounder).
// dir: 1 bulges up like a rainbow, -1 sags like a bowl. Both can be tried with ?curve=&dir=.
const ARC = {
  curve: num(parseFloat(params.get('curve')), 1.2, 12, 2.4),
  dir: params.get('dir') === '-1' ? -1 : 1,
  spacing: 0.92,
}

const stage = $('stage')
const track = $('track')
const caption = { name: $('caption-name'), desc: $('caption-desc'), open: $('caption-open'), code: $('caption-code') }

const state = {
  lang: pickLang(),
  view: params.get('view') === 'grid' || (params.get('view') !== 'arc' && store.get('view') === 'grid') ? 'grid' : 'arc',
  pos: 0,
  vel: 0,
  target: 0,
  active: -1,
  dragging: false,
  wheel: null,
  userPaused: reduceMotion.matches,
}
const startIndex = APPS.findIndex((a) => a.id === decodeURIComponent(location.hash.slice(1)))
if (startIndex > 0) state.pos = state.target = startIndex

const mod = (a, n) => ((a % n) + n) % n
/** Signed distance from position p to card i, the short way round. */
const delta = (i, p) => {
  let d = mod(i - p, N)
  if (d > N / 2) d -= N
  return d
}
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// ---------- cards ----------

// How each card shows an app: 'both' = PC screen and phone screen side by side,
// 'phone' = phone screens only. By default wide screens get 'both' and phones get 'phone';
// ?device=both or ?device=phone fixes it.
const DEVICE_PARAM = ['both', 'phone'].includes(params.get('device')) ? params.get('device') : 'auto'
let device = 'both'
const pickDevice = () => (DEVICE_PARAM !== 'auto' ? DEVICE_PARAM : document.documentElement.clientWidth < 700 ? 'phone' : 'both')

function makeVideo(src, onPlaying) {
  const v = document.createElement('video')
  v.muted = true
  v.loop = true
  v.playsInline = true
  v.preload = 'none'
  v.setAttribute('muted', '')
  v.setAttribute('playsinline', '')
  v.setAttribute('aria-hidden', 'true')
  v.dataset.src = src
  v.addEventListener('playing', onPlaying)
  return v
}

const cards = APPS.map((app, i) => {
  const el = $('card-template').content.firstElementChild.cloneNode(true)
  el.dataset.index = String(i)
  el.style.viewTransitionName = `card-${i}`
  el.setAttribute('aria-roledescription', 'slide')
  const c = { el, app, i, pc: null, ph: null, hover: false, shades: [], play: el.querySelector('.play') }

  // PC screen
  const frame = el.querySelector('.frame')
  const img = frame.querySelector('.poster')
  img.src = app.poster
  img.draggable = false
  if (app.video) {
    c.pc = makeVideo(app.video, () => frame.classList.add('ready'))
    frame.querySelector('.media').append(c.pc)
  }
  c.shades.push(frame.querySelector('.shade'))

  // phone screen, in front of the PC one
  if (app.phonePoster) {
    el.classList.add('has-phone')
    const phone = el.querySelector('.phone')
    phone.hidden = false
    const pimg = phone.querySelector('.poster')
    pimg.src = app.phonePoster
    pimg.draggable = false
    if (app.phoneVideo) {
      c.ph = makeVideo(app.phoneVideo, () => phone.classList.add('ready'))
      phone.querySelector('.media').append(c.ph)
    }
    c.shades.push(phone.querySelector('.shade'))
  }
  if (c.pc || c.ph) {
    c.play.addEventListener('click', () => {
      state.userPaused = !state.userPaused
      syncMedia()
    })
    el.addEventListener('pointerenter', (e) => {
      if (state.view === 'grid' && e.pointerType === 'mouse') { c.hover = true; syncMedia() }
    })
    el.addEventListener('pointerleave', () => {
      if (c.hover) { c.hover = false; syncMedia() }
    })
  }
  el.querySelector('.card-name').textContent = app.name
  el.querySelector('.card-open').href = app.url
  el.querySelector('.card-code').href = app.repo
  el.querySelector('.screens').addEventListener('click', (e) => {
    if (state.view !== 'grid' || e.target.closest('button')) return
    setView('arc', i)
  })
  track.append(el)
  return c
})

/** The clips a card shows in the current layout. Phone-only falls back to the PC screen when there is no phone one. */
const videosOf = (c) => (device === 'phone' ? (c.app.phonePoster ? [c.ph] : [c.pc]) : [c.pc, c.ph]).filter(Boolean)

// ---------- geometry & drawing ----------

let geo = { W: 600, H: 375, R: 1440, step: 0.38, px: 552 }

function measure() {
  const vw = document.documentElement.clientWidth
  const vh = stage.clientHeight
  const header = 64
  const below = 196 // caption block under the card
  device = pickDevice()
  document.body.dataset.device = device
  const maxH = Math.max(150, vh - header - below - 40)
  let W, H, R, spacing
  if (device === 'phone') {
    H = Math.round(Math.min(maxH, 640, vw < 700 ? vw * 0.62 * (844 / 390) : 9999))
    W = Math.round(H * (390 / 844))
    R = H * 1.6 * 0.62 * ARC.curve
    spacing = 1.14
  } else {
    // PC screen (16:10) and phone screen (390:844) side by side: height is 47.53% of the pair's width
    const PAIR = 0.4753
    W = Math.round(Math.min(vw < 700 ? vw * 0.9 : vw * 0.64, 1000, maxH / PAIR))
    H = Math.round(W * PAIR)
    R = W * 0.8 * ARC.curve
    spacing = 1.06
  }
  const cy = Math.round(header + Math.max(12, (vh - header - H - below) * 0.42) + H / 2)
  geo = { W, H, R, step: (W * spacing) / R, px: W * spacing, cy }

  stage.style.setProperty('--w', `${W}px`)
  stage.style.setProperty('--h', `${H}px`)
  stage.style.setProperty('--cy', `${cy}px`)
}

function render() {
  for (const c of cards) {
    const d = delta(c.i, state.pos)
    const a = Math.abs(d)
    const th = d * geo.step
    const x = geo.R * Math.sin(th)
    const y = ARC.dir * geo.R * (1 - Math.cos(th))
    const s = 1 - 0.08 * Math.min(a, 3)
    const visible = a < 2.6
    const st = c.el.style
    st.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${(ARC.dir * th).toFixed(4)}rad) scale(${s.toFixed(4)})`
    st.opacity = visible ? (1 - smoothstep(1.6, 2.6, a)).toFixed(3) : '0'
    st.visibility = visible ? '' : 'hidden'
    st.zIndex = String(100 - Math.round(a * 10))
    const shade = (Math.min(a, 1) * 0.55).toFixed(3)
    for (const sh of c.shades) sh.style.opacity = shade
  }
}

function clearArcStyles() {
  for (const c of cards) {
    for (const p of ['transform', 'opacity', 'visibility', 'zIndex']) c.el.style[p] = ''
    for (const sh of c.shades) sh.style.opacity = ''
  }
}

// ---------- motion: one spring, interruptible by drag, wheel and keys ----------

let raf = 0
let last = 0
const kick = () => {
  if (raf || state.view !== 'arc') return
  last = performance.now()
  raf = requestAnimationFrame(tick)
}

function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  if (reduceMotion.matches && !state.dragging) {
    state.pos = state.target
    state.vel = 0
  } else if (state.wheel) {
    // ease toward where the wheel has pushed us; smooth for both trackpads and notched wheels
    const k = 1 - Math.exp(-dt * 22)
    const before = state.pos
    state.pos += (state.wheel.to - state.pos) * k
    state.vel = (state.pos - before) / Math.max(dt, 1e-3)
  } else if (!state.dragging) {
    const stiffness = 190
    const damping = 2 * Math.sqrt(stiffness) * 0.86
    let t = dt
    while (t > 0) {
      const h = Math.min(t, 1 / 240)
      state.vel += (-stiffness * (state.pos - state.target) - damping * state.vel) * h
      state.pos += state.vel * h
      t -= h
    }
  }
  render()
  updateActive()
  const settled = !state.dragging && !state.wheel && Math.abs(state.pos - state.target) < 4e-4 && Math.abs(state.vel) < 2e-3
  if (settled) {
    state.pos = state.target
    state.vel = 0
    render()
    raf = 0
    return
  }
  raf = requestAnimationFrame(tick)
}

const step = (n) => {
  state.target = Math.round(state.target) + n
  kick()
}
const goTo = (i) => {
  state.target = Math.round(state.target + delta(i, state.target))
  kick()
}

// drag (mouse, pen, touch). touch-action: pan-y keeps vertical page scroll on phones.
let drag = null
stage.addEventListener('pointerdown', (e) => {
  if (state.view !== 'arc' || (e.pointerType === 'mouse' && e.button !== 0)) return
  if (e.target.closest('a, button')) return
  drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, p0: state.pos, moved: false, down: e.target, samples: [[e.timeStamp, e.clientX]] }
})
stage.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return
  const dx = e.clientX - drag.x0
  if (!drag.moved) {
    if (Math.abs(dx) < 6) return
    if (Math.abs(e.clientY - drag.y0) > Math.abs(dx)) { drag = null; return } // a vertical swipe: let the page scroll
    drag.moved = true
    state.dragging = true
    state.wheel = null
    stage.setPointerCapture(e.pointerId)
    stage.classList.add('grabbing')
    drag.x0 = e.clientX
    drag.p0 = state.pos
  }
  state.pos = drag.p0 - (e.clientX - drag.x0) / geo.px
  drag.samples.push([e.timeStamp, e.clientX])
  while (drag.samples.length > 2 && e.timeStamp - drag.samples[0][0] > 90) drag.samples.shift()
  kick()
})
const endDrag = (e) => {
  if (!drag || e.pointerId !== drag.id) return
  const d = drag
  drag = null
  stage.classList.remove('grabbing')
  if (!d.moved) {
    if (e.type === 'pointerup') tap(d.down)
    return
  }
  state.dragging = false
  const [t0, x0] = d.samples[0]
  const [t1, x1] = d.samples[d.samples.length - 1]
  const v = t1 > t0 ? -((x1 - x0) / (t1 - t0)) * 1000 / geo.px : 0 // cards per second
  state.vel = Math.max(-12, Math.min(12, v))
  const projected = state.pos + state.vel * 0.22
  state.target = Math.round(Math.max(state.pos - 3, Math.min(state.pos + 3, projected)))
  kick()
}
stage.addEventListener('pointerup', endDrag)
stage.addEventListener('pointercancel', endDrag)

function tap(target) {
  const card = target.closest?.('.card')
  if (!card) return
  const i = Number(card.dataset.index)
  if (i !== state.active) goTo(i)
  else if (videosOf(cards[i]).length) {
    state.userPaused = !state.userPaused
    syncMedia()
  }
}

stage.addEventListener('wheel', (e) => {
  if (state.view !== 'arc' || e.ctrlKey) return
  const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY)
  const raw = horizontal ? e.deltaX : e.deltaY
  if (!raw) return
  e.preventDefault()
  const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? stage.clientHeight : 1
  if (!state.wheel) state.wheel = { from: state.pos, to: state.pos, timer: 0 }
  const w = state.wheel
  w.to += (raw * unit) / (geo.px * 1.15)
  w.to = Math.max(w.from - 4, Math.min(w.from + 4, w.to))
  clearTimeout(w.timer)
  w.timer = setTimeout(() => {
    const moved = w.to - w.from
    state.wheel = null
    // any deliberate push moves at least one card, in the direction it was pushed
    state.target = Math.abs(moved) < 0.05 ? Math.round(w.from) : moved > 0 ? Math.ceil(w.to - 0.02) : Math.floor(w.to + 0.02)
    kick()
  }, 120)
  kick()
}, { passive: false })

document.addEventListener('keydown', (e) => {
  if (state.view !== 'arc' || e.altKey || e.metaKey || e.ctrlKey) return
  if (e.target.closest?.('input, textarea, select')) return
  if (e.key === 'ArrowRight') step(1)
  else if (e.key === 'ArrowLeft') step(-1)
  else if (e.key === 'Home') goTo(0)
  else if (e.key === 'End') goTo(N - 1)
  else return
  e.preventDefault()
})
$('prev').addEventListener('click', () => step(-1))
$('next').addEventListener('click', () => step(1))

// ---------- active card, caption, media ----------

const dots = APPS.map((app, i) => {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'dot'
  b.addEventListener('click', () => goTo(i))
  $('dots').append(b)
  return b
})

function updateActive(force = false) {
  const i = mod(Math.round(state.pos), N)
  if (i === state.active && !force) return
  const first = state.active === -1
  state.active = i
  const app = APPS[i]
  fillCaption(!first && !force)
  dots.forEach((d, k) => d.setAttribute('aria-current', k === i ? 'true' : 'false'))
  cards.forEach((c) => {
    const isActive = c.i === i
    c.el.classList.toggle('active', isActive)
    if (state.view === 'arc') c.el.setAttribute('aria-hidden', isActive ? 'false' : 'true')
    if (isActive && !first) for (const v of videosOf(c)) v.currentTime = 0
  })
  if (!first) history.replaceState(null, '', `${location.pathname}${location.search}#${encodeURIComponent(app.id)}`)
  syncMedia()
}

function fillCaption(animate) {
  const app = APPS[state.active]
  if (!app) return
  const t = STRINGS[state.lang]
  caption.name.textContent = app.name
  caption.desc.textContent = app.desc[state.lang]
  caption.open.href = app.url
  caption.code.href = app.repo
  caption.open.textContent = t.open
  caption.code.textContent = t.code
  if (animate && !reduceMotion.matches) {
    const kf = [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }]
    caption.name.animate(kf, { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' })
    caption.desc.animate(kf, { duration: 380, delay: 30, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' })
  }
}

function syncMedia() {
  const t = STRINGS[state.lang]
  for (const c of cards) {
    const shown = videosOf(c)
    c.play.hidden = !shown.length
    for (const v of [c.pc, c.ph]) if (v && !shown.includes(v) && !v.paused) v.pause()
    if (!shown.length) continue
    const near = state.view === 'arc' && Math.abs(delta(c.i, state.active)) <= 1
    const want = state.view === 'arc' ? c.i === state.active && !state.userPaused : c.hover
    for (const v of shown) {
      if ((near || want) && !v.getAttribute('src')) {
        v.preload = 'auto'
        v.src = v.dataset.src
      }
      if (want) v.play().catch(() => {})
      else if (!v.paused) v.pause()
    }
    c.el.classList.toggle('paused', state.userPaused)
    c.play.setAttribute('aria-label', state.userPaused ? t.play : t.pause)
  }
}

// ---------- view switch (arc <-> grid) ----------

function setView(view, focusIndex) {
  const apply = () => {
    state.view = view
    document.body.dataset.view = view
    for (const b of document.querySelectorAll('#views [data-view]')) b.setAttribute('aria-pressed', String(b.dataset.view === view))
    if (view === 'grid') {
      cancelAnimationFrame(raf)
      raf = 0
      state.dragging = false
      state.wheel = null
      clearArcStyles()
      cards.forEach((c) => c.el.removeAttribute('aria-hidden'))
    } else {
      window.scrollTo(0, 0)
      if (focusIndex != null) {
        state.pos = state.target = Math.round(state.target + delta(focusIndex, state.target))
        state.vel = 0
      }
      cards.forEach((c) => (c.hover = false))
      measure()
      render()
      updateActive(true)
    }
    syncMedia()
  }
  if (view === state.view) return
  store.set('view', view)
  if (document.startViewTransition && !reduceMotion.matches) document.startViewTransition(apply)
  else apply()
}
for (const b of document.querySelectorAll('#views [data-view]')) b.addEventListener('click', () => setView(b.dataset.view))

// ---------- language ----------

const langButtons = LANGS.map((l) => {
  const b = document.createElement('button')
  b.type = 'button'
  b.textContent = l.label
  b.lang = l.code
  b.title = l.native
  b.setAttribute('aria-label', l.native)
  b.addEventListener('click', () => setLang(l.code, true))
  $('langs').append(b)
  return b
})

function setLang(code, chosen = false) {
  state.lang = code
  const t = STRINGS[code]
  document.documentElement.lang = code
  document.title = `kaigelab — ${t.tagline}`
  $('tagline').textContent = t.tagline
  $('langs').setAttribute('aria-label', t.language)
  langButtons.forEach((b, k) => b.setAttribute('aria-pressed', String(LANGS[k].code === code)))
  $('views').setAttribute('aria-label', `${t.viewArc} / ${t.viewGrid}`)
  document.querySelector('#views [data-view=arc]').setAttribute('aria-label', t.viewArc)
  document.querySelector('#views [data-view=grid]').setAttribute('aria-label', t.viewGrid)
  $('prev').setAttribute('aria-label', t.prev)
  $('next').setAttribute('aria-label', t.next)
  dots.forEach((d, i) => d.setAttribute('aria-label', APPS[i].name))
  cards.forEach((c) => {
    c.el.setAttribute('aria-label', `${c.app.name} (${t.slide(c.i + 1, N)})`)
    c.el.querySelector('.card-desc').textContent = c.app.desc[code]
    c.el.querySelector('.card-open').textContent = t.open
    c.el.querySelector('.card-code').textContent = t.code
  })
  fillCaption(false)
  syncMedia()
  if (chosen) {
    store.set('lang', code)
    const url = new URL(location.href)
    url.searchParams.set('lang', code)
    history.replaceState(null, '', url)
  }
}

// ---------- start ----------

let resizeQueued = false
addEventListener('resize', () => {
  if (resizeQueued) return
  resizeQueued = true
  requestAnimationFrame(() => {
    resizeQueued = false
    const before = device
    measure()
    if (state.view === 'arc') render()
    if (device !== before) syncMedia()
  })
})
reduceMotion.addEventListener('change', () => { state.userPaused = reduceMotion.matches; syncMedia() })
canHover.addEventListener('change', syncMedia)

document.body.dataset.view = state.view
for (const b of document.querySelectorAll('#views [data-view]')) b.setAttribute('aria-pressed', String(b.dataset.view === state.view))
measure()
if (state.view === 'arc') render()
else clearArcStyles()
updateActive(true)
setLang(state.lang)
requestAnimationFrame(() => document.body.classList.add('ready'))
