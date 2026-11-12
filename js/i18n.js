// Words that only screen readers hear (aria-label), plus the language menu. The visible UI has almost no text.
export const LANGS = [
  { code: 'ja', label: 'JA', native: '日本語' },
  { code: 'en', label: 'EN', native: 'English' },
  { code: 'es', label: 'ES', native: 'Español' },
  { code: 'ko', label: 'KO', native: '한국어' },
]

export const STRINGS = {
  ja: {
    openShort: '開く',
    open: (name) => `${name} を開く`,
    code: 'ソースコード',
    language: '言語',
    toWall: '一覧で見る',
    toDial: 'ダイヤルで見る',
    dial: '作ったもの',
    phoneMissing: 'スマホの表示は未対応',
    play: '再生',
    pause: '一時停止',
  },
  en: {
    openShort: 'Open',
    open: (name) => `Open ${name}`,
    code: 'Source code',
    language: 'Language',
    toWall: 'Show as a list',
    toDial: 'Show on the dial',
    dial: 'Things I made',
    phoneMissing: 'No phone layout yet',
    play: 'Play',
    pause: 'Pause',
  },
  es: {
    openShort: 'Abrir',
    open: (name) => `Abrir ${name}`,
    code: 'Código fuente',
    language: 'Idioma',
    toWall: 'Ver como lista',
    toDial: 'Ver en el dial',
    dial: 'Cosas que hice',
    phoneMissing: 'Todavía sin diseño para móvil',
    play: 'Reproducir',
    pause: 'Pausar',
  },
  ko: {
    openShort: '열기',
    open: (name) => `${name} 열기`,
    code: '소스 코드',
    language: '언어',
    toWall: '목록으로 보기',
    toDial: '다이얼로 보기',
    dial: '만든 것들',
    phoneMissing: '아직 모바일 화면이 없음',
    play: '재생',
    pause: '일시 정지',
  },
}

export const store = {
  get(key) { try { return localStorage.getItem(key) } catch { return null } },
  set(key, value) { try { localStorage.setItem(key, value) } catch {} },
}

/** ?lang= first, then what the visitor chose before, then the browser's languages, then English. */
export function pickLang() {
  const known = (code) => LANGS.some((l) => l.code === code)
  const fromUrl = new URLSearchParams(location.search).get('lang')
  if (fromUrl && known(fromUrl)) return fromUrl
  const saved = store.get('lang')
  if (saved && known(saved)) return saved
  for (const tag of navigator.languages || [navigator.language || '']) {
    const primary = String(tag).toLowerCase().split('-')[0]
    if (known(primary)) return primary
  }
  return 'en'
}
