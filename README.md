# Floating — 琵琶湖を漂う建築

琵琶湖（1/5縮尺）に水上建築を放ち、漂わせて眺めるWeb作品。three.js 0.160、1つのHTMLファイルで動く1人用の作品で、サーバーは使わない。

- `data/lake.json` … 湖岸線・島・港・橋・川（国土数値情報／OpenStreetMapから作成）
- `data/buoys.xlsx` … ブイ一覧（集落名・集落形態・北緯・東経・YouTubeリンク）。編集後に `python3 build.py`
- `data/relief.json` … 周囲の地形（地理院タイルの陰影起伏図から作成）
- `docs/index.html` … 組み立て後の公開用ファイル
- `tools/` … データ準備（prep.py）と、Playwrightによる確認用の撮影スクリプト

## ファイルの構成

- `src/shell.html` … HTML・CSS・画面の部品。`__SCRIPT__` の位置に描画のコードが入る
- `src/js/NN-*.js` … 描画のコード。番号順につなげて1つのモジュールとして動く
  - `03-season.js` … **季節の表**。雪・紅葉・新緑・雲・霞・太陽の高さ・田の色など、月ごとの景色はここで調整する
  - `13-renderer-water-sky.js` … 描画の準備、水面と空
  - `14-terrain.js` … 山並みとヨシ　／　`15-buildings.js` … 水上建築10種類
  - `17〜22` … 集落・田・湖岸の目印・港・森　／　`26-audio.js` … 音
  - `31〜38` … 白鬚神社の鳥居、花火、ブイ、季節の出来事、海津の石積み、湖岸の石、小島、南湖の街並み
  - `39-frame.js` … 毎フレームの更新と、色の仕上げ
- `docs/index.html` … 組み立て後の公開用ファイル（GitHub Pages）

組み立て：`python3 build.py`　（`src/` と `data/` から `docs/index.html` を作る）

確認：URLに `?debug` を付けると、`tools/` の撮影スクリプトから視点を動かせる。

URLの調整値：`?q=hq|mid|low`（画質）、`?scale=5`（縮尺）、`?month=0-11&phase=0-1&wx=0-6`（月・時刻・天気の固定）

## 公開（GitHub Pages）
Settings → Pages → Source を「Deploy from a branch」、Branch を `main` / `/docs` にして保存。
公開URL：https://inainaiba.github.io/-Floating-on-Lake-Biwa/
共有カードの画像は `docs/og.jpg`（`tools/og_image.js` で撮り直せる）。
