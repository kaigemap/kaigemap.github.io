// Paths to the demo files made by make-fixtures.mjs
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
export const fx = (n) => fileURLToPath(new URL('../fixtures/' + n, import.meta.url))
export const BOX = ['front', 'back', 'left', 'right', 'top', 'bottom'].map((f) => fx(`box-${f}.png`))
export const CARDS = [...Array(12)].map((_, i) => fx(`card-${String(i + 1).padStart(2, '0')}.png`))
export const BLOG = readFileSync(fx('blog.html'), 'utf8').trim()
export const setValue = (s, sel, v) => s.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })) })()`)
