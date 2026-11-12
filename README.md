# kaigelab

kaigemap が公開しているミニアプリと Claude Code のスキルを、PC とスマホで動いている様子の短い動画で紹介するサイトです。
画面の端のダイヤル（サムネイルの円弧）を回すと、横の PC とスマホの画面が入れ替わります。一覧にも切り替えられます。
日本語・英語・スペイン語・韓国語に対応しています。見た目と動きの決まりは `docs/DESIGN.md` にあります。

GitHub Pages でそのまま公開できる、ビルド不要の静的サイトです（main の `/`）。

## ファイル

- `index.html` … 骨組み。CSP は `<meta>` で入れています（GitHub Pages ではヘッダーを付けられないため）
- `css/site.css` … 見た目。明暗は OS の設定に合わせます
- `fonts/` … Young Serif（名前）と Roboto Mono の英数字だけ（番号・URL）。どちらも OFL で、ライセンスは同じフォルダ
- `js/apps.js` … 載せるものの一覧（名前・URL・年・4言語の一言説明・作った理由）。1件足すとダイヤルと一覧の両方に出る
- `js/i18n.js` … 画面の文言と、言語の選び方（`?lang=` → 前に選んだ言語 → ブラウザの言語 → 英語）
- `js/main.js` … ダイヤル（ばねの動き、ドラッグ・ホイール・キー）、画面の入れ替え、一覧、言語の切り替え
- `media/` … PC の動画（`<id>.mp4` 1600 幅、`<id>-s.mp4` 960 幅）、スマホの動画（`<id>-phone.mp4`）、それぞれの静止画、`tiles/`（ダイヤルのタイル）

URL の `#<id>` で、そのアプリから表示します。`?view=wall` で一覧から開きます。

## アプリを足す

1. `js/apps.js` に1件足す
2. `tools/record/flows/<id>.mjs` に、そのアプリを操作する手順を書く（ほかの flow が手本）
3. 録る

```sh
node tools/record/make-fixtures.mjs   # 録画で使う見本（架空のゲーム「空もよう」の絵と CSV）を作る
node tools/record/run.mjs <id>        # PC の録画（flows/<id>.mjs）
node tools/record/run.mjs <id>.phone  # スマホの録画（flows/<id>.phone.mjs）
node tools/record/make-tiles.mjs <id> # ダイヤルのタイル
```

録画はヘッドレスの Google Chrome と ffmpeg を使います。Node 22 以上。
OCBOX は `~/dev/ocbox` で `npx vite --port 5192` を立ててから録ります（e2e の偽物の保存先を使い、Dropbox には触りません）。

## 確認

```sh
python3 -m http.server 8123
node tools/preview/shots.mjs <出力先> 'lang=ja#hakogazou'   # 1440・1280・390 幅と一覧のスクショ
node ~/.claude/skills/web-tool-safety/check.mjs . test/safety.flow.mjs
```
