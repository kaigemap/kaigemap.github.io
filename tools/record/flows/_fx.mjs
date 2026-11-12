// Paths to the demo files made by make-fixtures.mjs
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
export const fx = (n) => fileURLToPath(new URL('../fixtures/' + n, import.meta.url))
export const BOX = ['front', 'back', 'left', 'right', 'top', 'bottom'].map((f) => fx(`box-${f}.png`))
export const CARDS = [...Array(12)].map((_, i) => fx(`card-${String(i + 1).padStart(2, '0')}.png`))
export const BLOG = readFileSync(fx('blog.html'), 'utf8').trim()
export const setValue = (s, sel, v) => s.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })) })()`)
export const STICKERS = ['hare', 'ame', 'kaze', 'yuki', 'rai', 'kiri'].map((k) => fx(`sticker-${k}.png`))
/** Drag a range input's thumb from fraction a to fraction b of its width. */
export async function slide(s, sel, a, b, ms = 800) {
  const r = await s.point(sel)
  const x = (f) => r.x - r.w / 2 + 8 + (r.w - 16) * f
  await s.drag({ x: x(a), y: r.y }, { x: x(b), y: r.y }, ms)
}
export const fraction = (s, sel) => s.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); return (e.value - e.min) / ((e.max - e.min) || 1) })()`)
/** Tag the first visible element whose text matches, so it can be tapped: returns the selector or null. */
export async function byText(s, sel, re, tag) {
  const ok = await s.eval(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(sel)})].find((x) => ${re}.test((x.textContent || x.getAttribute('aria-label') || '').trim()) && x.getClientRects().length); if (e) e.dataset.rec = ${JSON.stringify(tag)}; return !!e })()`)
  return ok ? `[data-rec="${tag}"]` : null
}
/** Finger-drag a visible range input from fraction a to b. */
export async function swipeRange(s, sel, a, b, ms = 700) {
  const r = await s.point(sel)
  const x = (f) => r.x - r.w / 2 + 10 + (r.w - 20) * f
  await s.swipe({ x: x(a), y: r.y }, { x: x(b), y: r.y }, ms)
}
