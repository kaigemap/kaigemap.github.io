// おしながきジェネレーター in "this device only" mode: add three works of the imaginary game, then a menu.
import { fx } from './_fx.mjs'
export const OSHI = 'https://oshinagaki-generator.pages.dev/'
const clickText = (s, re) => s.eval(`(() => { const e = [...document.querySelectorAll('a, button, [role=button], label')].find((x) => ${re}.test((x.textContent || x.getAttribute('aria-label') || '').trim()) && x.getClientRects().length); if (e) e.click(); return !!e })()`)
/** Type into a field like a person would (the app ignores values set from script). */
async function fill(s, sel, v) {
  const ok = await s.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.focus(); e.select?.(); return true })()`)
  if (!ok) return false
  if (v) await s.send('Input.insertText', { text: v })
  else await s.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 })
  await s.eval(`document.activeElement?.blur()`)
  return true
}
const WORKS = [
  { title: '空もよう', image: 'box-front.png', price: '2500', catch: '天気のカードを並べて予報を当てる', players: '2〜4人', time: '20分', age: '8歳〜', label: 'ボードゲーム' },
  { title: 'カードスリーブ', image: 'card-back.png', price: '500', catch: '空もようのカードに合う大きさ', players: '', time: '', age: '', label: 'グッズ' },
  { title: 'ステッカー', image: 'sticker-hare.png', price: '300', catch: '天気の模様 6種', players: '', time: '', age: '', label: 'グッズ' },
]
export async function setup(s) {
  await clickText(s, /この端末だけに保存/)
  await s.sleep(600)
  for (const w of WORKS) {
    await clickText(s, /^足す$/)
    await s.sleep(900)
    await fill(s, '#w-title', w.title)
    await s.files('input[type=file]', [fx(w.image)])
    await s.sleep(900)
    await fill(s, '#w-price', w.price)
    await fill(s, '#w-catch', w.catch)
    await fill(s, '#w-players', w.players)
    await fill(s, '#w-time', w.time)
    await fill(s, '#w-age', w.age)
    await fill(s, '#w-label', w.label)
    await s.sleep(400)
    await clickText(s, /一覧に戻る/)
    await s.sleep(900)
  }
  await clickText(s, /新しく作る/)
  await s.sleep(1000)
  await fill(s, '#o-event', 'ゲームマーケット')
  await fill(s, '#o-day', '土曜日')
  await fill(s, '#o-space', 'H26')
  for (const title of ['空もよう', 'カードスリーブ', 'ステッカー']) {
    await clickText(s, /並べる/)
    await s.sleep(800)
    // the sheet titled 作品を並べる lists the works that are not on the menu yet
    await s.eval(`(() => { const head = [...document.querySelectorAll('body *')].find((x) => x.children.length === 0 && x.textContent.trim() === '作品を並べる' && x.getClientRects().length); let box = head; while (box && !box.querySelector('button')) box = box.parentElement; const b = box && [...box.querySelectorAll('button, [role=button], li')].find((x) => x.textContent.trim() === ${'${JSON.stringify(title)}'}); b?.click() })()`.replace('${JSON.stringify(title)}', JSON.stringify(title)))
    await s.sleep(900)
  }
  await s.eval(`scrollTo(0, 0)`)
  await s.sleep(1200)
}
export { clickText }
