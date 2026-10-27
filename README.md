# Floating — 琵琶湖を漂う建築

琵琶湖（1/5縮尺）に水上建築を放ち、漂わせて眺めるWeb作品。three.js 0.160、1つのHTMLファイルで動く1人用の作品で、サーバーは使わない。

- `template.html` … 本体のソース（`__LAKE__` と `__RELIEF__` にデータが入る）
- `data/lake.json` … 湖岸線・島・港・橋・川（国土数値情報／OpenStreetMapから作成）
- `data/buoys.xlsx` … ブイ一覧（集落名・集落形態・北緯・東経・YouTubeリンク）。編集後に `python3 build.py`
- `data/relief.json` … 周囲の地形（地理院タイルの陰影起伏図から作成）
- `docs/index.html` … 組み立て後の公開用ファイル
- `tools/` … データ準備（prep.py）と、Playwrightによる確認用の撮影スクリプト

組み立て：`python3 build.py`

URLの調整値：`?q=hq|mid|low`（画質）、`?scale=5`（縮尺）、`?month=0-11&phase=0-1&wx=0-6`（月・時刻・天気の固定）
