// Small Chrome DevTools Protocol driver for recording demo clips.
// No dependencies: Node 22+ (global WebSocket) and Google Chrome.
//
//   const s = await launch({ width: 1120, height: 700 })
//   await s.open(url)
//   await s.startRecording()
//   await s.click('#button')            // moves a visible cursor, then clicks
//   await s.stopRecording('out/name')   // -> name.mp4 + name.jpg (poster)
//   await s.close()

import { spawn, execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, existsSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Fake cursor drawn into the page; it follows real mouse events, so hover states show too.
const CURSOR_SCRIPT = `(() => {
  const NS = 'http://www.w3.org/2000/svg'
  const mount = () => {
    if (document.getElementById('__rec_cursor') || !document.body) return
    const svg = document.createElementNS(NS, 'svg')
    svg.id = '__rec_cursor'
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.setAttribute('width', '26'); svg.setAttribute('height', '26')
    svg.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.35));'
    const p = document.createElementNS(NS, 'path')
    p.setAttribute('d', 'M4 2.5 L4 19.5 L8.6 15.3 L11.6 22 L14.6 20.7 L11.7 14.1 L18 14.1 Z')
    p.setAttribute('fill', '#111'); p.setAttribute('stroke', '#fff'); p.setAttribute('stroke-width', '1.4'); p.setAttribute('stroke-linejoin', 'round')
    svg.append(p)
    document.body.append(svg)
    window.addEventListener('mousemove', (e) => { svg.style.transform = 'translate(' + (e.clientX - 4) + 'px,' + (e.clientY - 2) + 'px)' }, true)
    window.addEventListener('mousedown', (e) => {
      const r = document.createElement('div')
      r.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;background:rgba(80,140,255,.35);left:' + e.clientX + 'px;top:' + e.clientY + 'px;transform:scale(.3);opacity:1;transition:transform .45s cubic-bezier(.2,.8,.2,1),opacity .45s ease-out'
      document.body.append(r)
      requestAnimationFrame(() => requestAnimationFrame(() => { r.style.transform = 'scale(1.4)'; r.style.opacity = '0' }))
      setTimeout(() => r.remove(), 600)
    }, true)
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount()
})()`

// Finger dot for phone recordings: shows only while a touch is down.
const TOUCH_SCRIPT = `(() => {
  const mount = () => {
    if (document.getElementById('__rec_touch') || !document.body) return
    const d = document.createElement('div')
    d.id = '__rec_touch'
    d.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(40,40,46,.28);border:2px solid rgba(255,255,255,.9);box-shadow:0 2px 10px rgba(0,0,0,.25);opacity:0;transform:translate(-100px,-100px) scale(.6);transition:opacity .18s ease-out'
    document.body.append(d)
    let x = -100, y = -100, down = false
    const place = () => { d.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + (down ? 1 : 0.6) + ')' }
    const at = (e) => { const t = e.touches && e.touches[0]; if (t) { x = t.clientX; y = t.clientY } }
    window.addEventListener('touchstart', (e) => { at(e); down = true; d.style.transition = 'opacity .12s ease-out, transform .12s ease-out'; place(); d.style.opacity = '1' }, { capture: true, passive: true })
    window.addEventListener('touchmove', (e) => { at(e); d.style.transition = 'opacity .12s ease-out'; place() }, { capture: true, passive: true })
    const up = () => { down = false; d.style.transition = 'opacity .35s ease-out, transform .35s ease-out'; place(); d.style.opacity = '0' }
    window.addEventListener('touchend', up, { capture: true, passive: true })
    window.addEventListener('touchcancel', up, { capture: true, passive: true })
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount()
})()`

export async function launch({ width = 1120, height = 700, scale = 2, cursor = true, touch = false } = {}) {
  const profile = mkdtempSync(join(tmpdir(), 'rec-chrome-'))
  const proc = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--hide-scrollbars', '--mute-audio', '--no-first-run', '--no-default-browser-check',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    `--window-size=${width},${height}`, 'about:blank',
  ], { stdio: 'ignore' })
  const portFile = join(profile, 'DevToolsActivePort')
  for (let i = 0; i < 100 && !existsSync(portFile); i++) await sleep(100)
  const port = readFileSync(portFile, 'utf8').split('\n')[0]
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const page = targets.find((t) => t.type === 'page')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j })

  let id = 0
  const pending = new Map()
  const listeners = new Map()
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
    } else if (msg.method) {
      for (const fn of listeners.get(msg.method) || []) fn(msg.params)
    }
  }
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id
    pending.set(n, { resolve, reject })
    ws.send(JSON.stringify({ id: n, method, params }))
  })
  const on = (method, fn) => listeners.set(method, [...(listeners.get(method) || []), fn])
  const once = (method) => new Promise((r) => {
    const fn = (p) => { listeners.set(method, listeners.get(method).filter((f) => f !== fn)); r(p) }
    on(method, fn)
  })

  await send('Page.enable')
  await send('Runtime.enable')
  await send('DOM.enable')
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: touch })
  if (touch) {
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
    await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' })
  }
  if (cursor) await send('Page.addScriptToEvaluateOnNewDocument', { source: touch ? TOUCH_SCRIPT : CURSOR_SCRIPT })
  await send('Page.bringToFront')
  await send('Emulation.setFocusEmulationEnabled', { enabled: true })

  let mouse = { x: width * 0.62, y: height * 0.72 }
  let frames = null

  const s = {
    send, width, height,
    sleep,
    async open(url, settle = 800) {
      const loaded = once('Page.loadEventFired')
      await send('Page.navigate', { url })
      await loaded
      await sleep(settle)
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: mouse.x, y: mouse.y })
    },
    async eval(expression) {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text)
      return r.result.value
    },
    /** Center of the first element matching selector, in CSS px. Scrolls it into view first. */
    async point(selector, { dx = 0, dy = 0, scroll = true } = {}) {
      const r = await s.eval(`(() => {
        const e = document.querySelector(${JSON.stringify(selector)})
        if (!e) return null
        ${scroll ? "e.scrollIntoView({ block: 'nearest', inline: 'nearest' })" : ''}
        const b = e.getBoundingClientRect()
        return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height }
      })()`)
      if (!r) throw new Error(`not found: ${selector}`)
      return { x: r.x + dx, y: r.y + dy, w: r.w, h: r.h }
    },
    /** Glide the cursor with an ease-in-out curve and a slight arc. */
    async moveTo(target, ms = 650, buttons = 0) {
      const p = typeof target === 'string' ? await s.point(target) : target
      if (touch && !buttons) { mouse = { x: p.x, y: p.y }; await sleep(Math.min(ms, 400)); return }
      const from = { ...mouse }
      const steps = Math.max(2, Math.round(ms / 16))
      const bend = (Math.hypot(p.x - from.x, p.y - from.y)) * 0.08
      for (let i = 1; i <= steps; i++) {
        const t = i / steps
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        const arc = Math.sin(Math.PI * e) * bend
        mouse = { x: from.x + (p.x - from.x) * e, y: from.y + (p.y - from.y) * e - arc }
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: mouse.x, y: mouse.y, buttons, button: buttons ? 'left' : 'none' })
        await sleep(16)
      }
      mouse = { x: p.x, y: p.y }
    },
    async click(target, { ms = 650, pause = 120 } = {}) {
      if (touch) return s.tap(target, { ms })
      await s.moveTo(target, ms)
      await sleep(pause)
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: mouse.x, y: mouse.y, button: 'left', buttons: 1, clickCount: 1 })
      await sleep(70)
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: mouse.x, y: mouse.y, button: 'left', buttons: 0, clickCount: 1 })
    },
    /** Finger tap (touch mode). */
    async tap(target, { ms = 450, dx = 0, dy = 0, scroll = true } = {}) {
      const p = typeof target === 'string' ? await s.point(target, { dx, dy, scroll }) : target
      await sleep(ms)
      mouse = { x: p.x, y: p.y }
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y }] })
      await sleep(110)
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    },
    /** Finger swipe from -> to (touch mode); a fast swipe scrolls with momentum. */
    async swipe(from, to, ms = 380) {
      const steps = Math.max(2, Math.round(ms / 16))
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y }] })
      for (let i = 1; i <= steps; i++) {
        const t = i / steps
        const e = 1 - Math.pow(1 - t, 2)
        await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e }] })
        await sleep(16)
      }
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      mouse = { x: to.x, y: to.y }
    },
    /** Scroll the page by dy CSS px with a finger (positive = content moves up). */
    async scrollBy(dy, ms = 520) {
      const x = width * 0.62
      const y0 = dy > 0 ? height * 0.78 : height * 0.3
      const span = Math.min(Math.abs(dy), height * 0.5) * Math.sign(dy)
      let left = dy
      while (Math.abs(left) > 1) {
        const part = Math.abs(left) > Math.abs(span) ? span : left
        await s.swipe({ x, y: y0 }, { x, y: y0 - part }, ms)
        left -= part
        await sleep(120)
      }
    },
    async drag(from, to, ms = 900) {
      if (touch) return s.swipe(typeof from === 'string' ? await s.point(from) : from, typeof to === 'string' ? await s.point(to) : to, ms)
      await s.moveTo(from)
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: mouse.x, y: mouse.y, button: 'left', buttons: 1, clickCount: 1 })
      await s.moveTo(to, ms, 1)
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: mouse.x, y: mouse.y, button: 'left', buttons: 0, clickCount: 1 })
    },
    async type(text, cps = 18) {
      for (const ch of text) {
        if (ch === '\n') {
          await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' })
          await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
        } else {
          await send('Input.insertText', { text: ch })
        }
        await sleep(1000 / cps)
      }
    },
    async files(selector, paths) {
      const { root } = await send('DOM.getDocument', { depth: -1, pierce: true })
      const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector })
      if (!nodeId) throw new Error(`not found: ${selector}`)
      await send('DOM.setFileInputFiles', { nodeId, files: paths })
    },
    async wheel(target, deltaY, steps = 12) {
      const p = typeof target === 'string' ? await s.point(target, { scroll: false }) : target
      await s.moveTo(p, 400)
      for (let i = 0; i < steps; i++) {
        await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: mouse.x, y: mouse.y, deltaX: 0, deltaY: deltaY / steps })
        await sleep(16)
      }
    },
    async startRecording() {
      frames = []
      on('Page.screencastFrame', async (p) => {
        if (frames) frames.push({ data: p.data, ts: p.metadata.timestamp })
        send('Page.screencastFrameAck', { sessionId: p.sessionId }).catch(() => {})
      })
      await send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: width * scale, maxHeight: height * scale, everyNthFrame: 1 })
      s.recordStart = Date.now() / 1000
    },
    /** Writes <out>.mp4 and <out>.jpg. poster: seconds into the clip for the poster frame. */
    async stopRecording(out, { poster = 0.5, fps = 30, outWidth = 1280, crf = 26 } = {}) {
      const end = Date.now() / 1000
      await send('Page.stopScreencast')
      const list = frames
      frames = null
      if (!list.length) throw new Error('no frames captured')
      const dir = mkdtempSync(join(tmpdir(), 'rec-frames-'))
      let concat = ''
      list.forEach((f, i) => {
        const file = join(dir, `${String(i).padStart(5, '0')}.jpg`)
        writeFileSync(file, Buffer.from(f.data, 'base64'))
        const next = i + 1 < list.length ? list[i + 1].ts : end
        concat += `file '${file}'\nduration ${Math.max(0.001, next - f.ts).toFixed(4)}\n`
      })
      // concat demuxer quirk: repeat the last file so its duration counts
      concat += `file '${join(dir, `${String(list.length - 1).padStart(5, '0')}.jpg`)}'\n`
      writeFileSync(join(dir, 'list.txt'), concat)
      mkdirSync(dirname(out), { recursive: true })
      const total = end - list[0].ts
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(dir, 'list.txt'),
        '-vf', `fps=${fps},scale=${outWidth}:-2:flags=lanczos,format=yuv420p`,
        '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-profile:v', 'high', '-tune', 'animation',
        '-movflags', '+faststart', '-an', `${out}.mp4`])
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', (total * poster).toFixed(2), '-i', `${out}.mp4`,
        '-frames:v', '1', '-q:v', '4', `${out}.jpg`])
      rmSync(dir, { recursive: true, force: true })
      return { frames: list.length, seconds: total }
    },
    async close() {
      try { await send('Browser.close') } catch {}
      ws.close()
      proc.kill()
      await new Promise((r) => (proc.exitCode !== null ? r() : proc.once('exit', r)))
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
    },
  }
  return s
}
