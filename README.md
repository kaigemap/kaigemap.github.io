# kaigelab

kaigemap が公開しているミニアプリを、動いている様子の短い動画で紹介するサイトです。
円弧に並んだカルーセルと、一覧（グリッド）ビューを切り替えられます。日本語・英語・スペイン語・韓国語に対応しています。

GitHub Pages でそのまま公開できる、ビルド不要の静的サイトです（main の `/`）。

## ファイル

- `index.html` … 骨組み。CSP は `<meta>` で入れています（GitHub Pages ではヘッダーを付けられないため）
- `css/site.css` … 見た目。明暗は OS の設定に合わせます
- `js/apps.js` … 載せるアプリの一覧（名前・URL・動画・4言語の説明）
- `js/i18n.js` … 画面の文言と、言語の選び方（`?lang=` → 前に選んだ言語 → ブラウザの言語 → 英語）
- `js/main.js` … カルーセル（ばねの動き、ドラッグ・ホイール・キー）、一覧ビュー、言語の切り替え
- `media/` … 各アプリの動画（mp4）と静止画（jpg）

URL の `#<アプリのid>` で、そのアプリから表示します。`?view=grid` で一覧から開きます。
円弧の形は `?curve=`（小さいほど丸い。既定 2.4）と `?dir=-1`（お椀型）で試せます。

## アプリを足す

1. `js/apps.js` に1件足す
2. `tools/record/flows/<id>.mjs` に、そのアプリを操作する手順を書く（ほかの flow が手本）
3. 録る

```sh
node tools/record/make-fixtures.mjs   # 録画で使う絵と CSV を作る（初回だけ）
node tools/record/run.mjs <id>        # media/<id>.mp4 と media/<id>.jpg ができる
```

録画はヘッドレスの Google Chrome と ffmpeg を使います。Node 22 以上。

## 確認

```sh
python3 -m http.server 8123
node ~/.claude/skills/web-tool-safety/check.mjs . test/safety.flow.mjs
```
