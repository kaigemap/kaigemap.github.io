// Everything the site shows. Add one entry here and it appears on the dial and in the wall.
//
// id      file names: media/<id>.mp4 (PC 1600x1000), media/<id>-s.mp4 (PC 960x600),
//         media/<id>-phone.mp4 (phone 600x1298), the same names .jpg for posters, media/tiles/<id>.webp
// url     what "open" goes to. repo: source code link, or '' when the repository is private
// pc / phone   'video' (clip + poster), 'still' (poster only), 'missing' (empty dashed frame), 'speaker'
// year    the year it was first made public
// desc    one plain line: what it does (yomiyasu skill: no pretentious wording)
// why     why it was made, in the owner's own words (70 Japanese characters at most). Empty = nothing shown.
const empty = { ja: '', en: '', es: '', ko: '' }

export const APPS = [
  {
    id: 'hakogazou',
    name: 'hakogazou',
    url: 'https://kaigemap.github.io/hakogazou/',
    repo: 'https://github.com/kaigemap/hakogazou',
    pc: 'video',
    phone: 'video',
    year: 2025,
    desc: {
      ja: 'ボードゲームの箱の画像を作るツール',
      en: 'A tool that makes images of board game boxes',
      es: 'Herramienta para crear imágenes de cajas de juegos de mesa',
      ko: '보드게임 상자 이미지를 만드는 도구',
    },
    why: empty,
  },
  {
    id: 'zatsucard',
    name: 'zatsucard',
    url: 'https://kaigemap.github.io/zatsucard/',
    repo: 'https://github.com/kaigemap/zatsucard',
    pc: 'video',
    phone: 'video',
    year: 2025,
    desc: {
      ja: 'CSV からテストプレイ用のカード画像を作るツール',
      en: 'A tool that makes playtest card images from a CSV file',
      es: 'Herramienta para crear imágenes de cartas de prueba a partir de un CSV',
      ko: 'CSV로 테스트 플레이용 카드 이미지를 만드는 도구',
    },
    why: empty,
  },
  {
    id: 'discord-streamkit-layer',
    name: 'DiscordPyoko',
    url: 'https://kaigemap.github.io/discord-streamkit-layer/',
    repo: 'https://github.com/kaigemap/discord-streamkit-layer',
    pc: 'video',
    phone: 'missing',
    year: 2023,
    desc: {
      ja: 'OBS に載せる Discord StreamKit オーバーレイの見た目を変えるツール',
      en: 'A tool that changes how the Discord StreamKit overlay looks in OBS',
      es: 'Herramienta para cambiar el aspecto del overlay de Discord StreamKit en OBS',
      ko: 'OBS에 올리는 Discord StreamKit 오버레이의 모양을 바꾸는 도구',
    },
    why: empty,
  },
  {
    id: 'udocards',
    name: 'udocards',
    url: 'https://kaigemap.github.io/udocards/',
    repo: 'https://github.com/kaigemap/udocards',
    pc: 'video',
    phone: 'video',
    year: 2026,
    desc: {
      ja: '画像からユドナリウム用の山札を作るツール',
      en: 'A tool that makes card decks for Udonarium from images',
      es: 'Herramienta para crear mazos de cartas para Udonarium a partir de imágenes',
      ko: '이미지로 유도나리움용 카드 덱을 만드는 도구',
    },
    why: empty,
  },
  {
    id: 'GameMarket-Blog-HTML-Utility',
    name: 'Auto Max Width',
    url: 'https://kaigemap.github.io/GameMarket-Blog-HTML-Utility/',
    repo: 'https://github.com/kaigemap/GameMarket-Blog-HTML-Utility',
    pc: 'video',
    phone: 'video',
    year: 2024,
    desc: {
      ja: 'ゲームマーケットのブログ用 HTML で、画像のはみ出しを直すツール',
      en: 'A tool that fixes overflowing images in HTML for the Game Market blog',
      es: 'Herramienta que corrige las imágenes que se desbordan en el HTML del blog de Game Market',
      ko: '게임마켓 블로그용 HTML에서 넘치는 이미지를 고치는 도구',
    },
    why: empty,
  },
  {
    id: 'BrowserSenkou',
    name: 'BrowserSenkou',
    url: 'https://kaigemap.github.io/BrowserSenkou/',
    repo: 'https://github.com/kaigemap/BrowserSenkou',
    pc: 'still',
    phone: 'still',
    year: 2023,
    desc: {
      ja: '線香が1本立っているページ',
      en: 'A page with one incense stick',
      es: 'Una página con una varilla de incienso',
      ko: '향 한 대가 서 있는 페이지',
    },
    why: empty,
  },
]
