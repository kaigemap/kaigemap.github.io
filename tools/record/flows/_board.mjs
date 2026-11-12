// The decision-board skill, recorded from its own template with two questions about the imaginary game.
// Answers are kept in memory: window.claude is replaced by a small stand-in before the page runs.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { fx } from './_fx.mjs'
const dir = fx('decision-board')
export const url = pathToFileURL(join(dir, 'index.html')).href
export const init = `(() => {
  const store = new Map(); const subs = []
  const snap = () => ({ docs: [...store].map(([id, d]) => ({ id, exists: true, data: () => d })) })
  const db = { collection: () => ({ doc: (id) => ({ set: async (d) => { await new Promise((r) => setTimeout(r, 250)); store.set(id, d); subs.forEach((f) => f(snap())) } }), onSnapshot: (f) => { subs.push(f); f(snap()); return () => {} } }) }
  window.__resetBoard = () => { store.clear(); subs.forEach((f) => f(snap())) }
  window.claude = { use: async (n) => (n === 'db' ? db : null) }
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => {}, readText: async () => '' } })
})()`
export function before() {
  mkdirSync(dir, { recursive: true })
  copyFileSync(fx('box-front.png'), join(dir, 'box-navy.png'))
  copyFileSync(fx('box-front-red.png'), join(dir, 'box-red.png'))
  const tpl = readFileSync(join(homedir(), 'dev/claude-skill-decision-board/template.html'), 'utf8')
  const qs = `const QUESTIONS = [
  { id: 'q-band', topic: '箱', title: '箱の帯の色はどちらにしますか', context: '', images: [{ src: 'box-navy.png', cap: '紺' }, { src: 'box-red.png', cap: '朱' }], options: [{ key: 'a', label: '紺', desc: '' }, { key: 'b', label: '朱', desc: '' }] },
  { id: 'q-corner', topic: 'カード', title: 'カードの角は丸めますか', context: '', images: [], options: [{ key: 'a', label: '丸める', desc: '' }, { key: 'b', label: '丸めない', desc: '' }] },
]`
  const html = tpl.replaceAll('{{PROJECT}}', '空もよう').replace(/const QUESTIONS = \[[\s\S]*?\n\]/, qs)
  writeFileSync(join(dir, 'index.html'), html)
}
