export const LANGS = [
  { code: 'ja', label: 'JA', native: '日本語' },
  { code: 'en', label: 'EN', native: 'English' },
  { code: 'es', label: 'ES', native: 'Español' },
  { code: 'ko', label: 'KO', native: '한국어' },
]

export const STRINGS = {
  ja: {
    tagline: 'つくった小さな道具',
    open: '開く',
    code: 'コード',
    prev: '前へ',
    next: '次へ',
    viewArc: '円弧で見る',
    viewGrid: '一覧で見る',
    language: '言語',
    play: '再生',
    pause: '一時停止',
    slide: (n, total) => `${total}件中${n}件目`,
  },
  en: {
    tagline: 'Small tools I made',
    open: 'Open',
    code: 'Code',
    prev: 'Previous',
    next: 'Next',
    viewArc: 'Arc view',
    viewGrid: 'Grid view',
    language: 'Language',
    play: 'Play',
    pause: 'Pause',
    slide: (n, total) => `${n} of ${total}`,
  },
  es: {
    tagline: 'Pequeñas herramientas que hice',
    open: 'Abrir',
    code: 'Código',
    prev: 'Anterior',
    next: 'Siguiente',
    viewArc: 'Vista en arco',
    viewGrid: 'Vista en cuadrícula',
    language: 'Idioma',
    play: 'Reproducir',
    pause: 'Pausar',
    slide: (n, total) => `${n} de ${total}`,
  },
  ko: {
    tagline: '직접 만든 작은 도구들',
    open: '열기',
    code: '코드',
    prev: '이전',
    next: '다음',
    viewArc: '원호로 보기',
    viewGrid: '목록으로 보기',
    language: '언어',
    play: '재생',
    pause: '일시 정지',
    slide: (n, total) => `${total}개 중 ${n}번째`,
  },
}

const store = {
  get(key) { try { return localStorage.getItem(key) } catch { return null } },
  set(key, value) { try { localStorage.setItem(key, value) } catch {} },
}
export { store }

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
