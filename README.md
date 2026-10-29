# Floating — 琵琶湖を漂う建築

琵琶湖（1/5縮尺）に水上建築を放ち、漂わせて眺めるWeb作品。three.js 0.160、1つのHTMLファイルで動く1人用の作品で、サーバーは使わない。

- `data/lake.json` … 湖岸線・島・港・橋・川（国土数値情報／OpenStreetMapから作成）
- `data/buoys.xlsx` … ブイ一覧（集落名・集落形態・北緯・東経・YouTubeリンク）。編集後に `python3 build.py`
- `data/dem.json` … 周囲の地形（国土地理院の標高タイルから作成。作り直しは `python3 tools/dem.py`）
- `data/rail.json` … 湖西線の道筋（国土地理院のベクトルタイルから作成。作り直しは `python3 tools/rail.py`）
- `data/depth.json` … 湖の深さ（国土地理院のベクトルタイルの等深線から作成。作り直しは `python3 tools/depth.py`）
- `docs/index.html` … 組み立て後の公開用ファイル
- `tools/` … データ準備（prep.py・dem.py・rail.py・depth.py）と、Playwrightによる確認用の撮影スクリプト

## ファイルの構成

- `src/shell.html` … HTML・CSS・画面の部品。`__SCRIPT__` の位置に描画のコードが入る
- `src/js/NN-*.js` … 描画のコード。番号順につなげて1つのモジュールとして動く
  - `00-head.js` … 共有の箱 `G` と、シェーダーで共有する雑音の関数 `GLSL_NOISE`
  - `02-season.js` … **季節の表** `SEASON`、**色の表** `PALETTE`、**景観の調整値** `LOOK`（雲の影の濃さ・かすみの距離・灯りの明るさ・各要素の出る月など）と、**要素の出す／出さない** `LOOK.show`（竹林・ススキ・松並木・舟・えり・沖島の集落など）。見た目の強さや要素の入切はまずここで調整する
  - `12-renderer.js` … 描画の準備と**画質の表** `QUALITY_TABLE`（高・中・低）
  - `13-sky-dome.js` … 空（`SKY_FS_*`）　／　`14-water.js` … 水面（`W_FS_*`）。どちらもシェーダーを処理の順の部品に区切ってある
  - `16-terrain.js` … 山並み（`data/dem.json` の標高）・島・ヨシ（島の高さ `isleH`、山肌の色のシェーダーは `TERR_FS_*`）　／　`18-buildings.js` … 水上建築10種類
  - `20-villages-layout.js` … 集落の配置と**地面の高さの窓口** `groundH`（島・湖・陸を振り分ける）・`landY`（陸の地面）
  - `21〜27` … 集落・田・湖岸の目印・港・森　／　`30-audio.js` … 音　／　`31-ui.js` … 画面の部品
  - `35〜43` … 鳥居・花火・ブイ・季節の出来事・海津・湖岸の石・島と沖島の集落・暮らしの気配・湖の詩情
  - `44-life.js` … 竹林・山肌の雲・ススキ・水辺の林・松並木　／　`45-boats.js` … 田舟・航跡・遊覧船・シジミ舟　／　`46-shore-life.js` … 家々の灯り・えり
  - `47-city.js` … 南湖の街並み
  - `48〜53` … 毎フレームの更新（移動・空と光・浮かび方・カメラ・描画・本体）
- `src/DEPENDENCIES.md` … 部品どうしのつながり（どの部品が何を作り、何を使うか）。組み立て時に自動で更新。部品をまたぐ共有の値は `G`（00-head.js）に集めてある。`G.xxx` を2つの部品で書き換えるとビルドが止まる（意図した共有は `tools/deps.py` の `G_SHARED` に書く）
- `docs/index.html` … 組み立て後の公開用ファイル（GitHub Pages）
- `docs/vendor/three.module.js` … three.js 0.160.0（MIT）。外部のサイトに頼らず、公開ページと同じ場所から読み込む

組み立て：`python3 build.py`　（`src/` と `data/` から `docs/index.html` を作る）

## よく出てくる名前

`c` 共有時計（月・時刻）／`W` 風（向き・強さ、`W.wx` が天気）／`wxNow` その時点の天気／`B` 建物の状態（位置・向き・軌跡）／`S` 湖の縮尺（1/5）／`G` 部品をまたぐ共有の値／`SEASON`・`PALETTE`・`LOOK`・`QUALITY` 季節・色・景観の調整値・画質の表／`groundH(x, y)` 地面の高さ（実寸の座標 → 作品内の高さ）／`rndFor("名前")` 要素ごとの乱数（要素を足し引きしても他の配置がずれない）

## 更新の流れ

GitHub に記録するたびに、GitHub の側で自動確認（`.github/workflows/check.yml`）が走る：組み立て、公開ファイルが最新かの確認、簡易確認（代表の場面・開始地点・シェーダーの誤り）、全体点検（はみ出し・置き場所）。結果は GitHub の Actions に出て、比較画像も残る。

1. `src/` や `data/` を直す（季節の値は `src/js/03-season.js`、ブイは `data/buoys.xlsx`）
2. `python3 tools/release.py "変更の説明"`
   - 組み立て（`build.py`）→ 代表4場面と全体地図の撮影・比較、開始地点の検査3回（`tools/check.py --quick`）→ GitHubへ記録
   - ページのエラーが出たら記録せずに止まる。比較画像は `check/sheet.png`
   - 数分で GitHub Pages に反映される
3. 全体の点検は `python3 tools/audit.py`：集落・街並み・沖島の家が水にはみ出していないか、湖西線の高架の桁が地面にめり込んだり本湖の上を渡ったりしていないか、木（森・集落・岸・島・竹林）・桜・ヨシの束などが決まった側（陸・湖の上・岸の近く）にあるかを数で調べ、代表の場面ごとの処理時間の内訳と描画の回数・三角形の数を出す
4. 見た目を意図して変えたときは、`python3 tools/check.py` で全24場面を撮り、あわせて開始地点を10回試して陸や島に埋まらないかを調べる（シェーダーや WebGL の誤り、three.js のシェーダー改造で置き換えの目印が見つからない場合も、ブラウザのコンソールから拾って失敗にする）。問題なければ `python3 tools/check.py --accept` で基準を更新して記録する

準備（初回だけ）：`npm install`（確認用に three.js を手元に置く）、Python の `playwright`・`Pillow`・`openpyxl`

確認用の視点操作は、URLに `?debug` を付けたときだけ有効。確認はページを1回だけ読み込み、月・時刻・天気・建物を切り替えながら撮る（全18場面で約10分）。風は実時間で揺らぐため、差の数値は0.05程度までは自然な揺れ。

URLの調整値：`?q=hq|mid|low`（画質）、`?scale=5`（縮尺）、`?month=0-11&phase=0-1&wx=0-6`（月・時刻・天気の固定）

## 公開（GitHub Pages）
Settings → Pages → Source を「Deploy from a branch」、Branch を `main` / `/docs` にして保存。
公開URL：https://inainaiba.github.io/-Floating-on-Lake-Biwa/
共有カードの画像は `docs/og.jpg`（`tools/og_image.js` で撮り直せる）。

## データの作り方

- `data/lake.json` … OpenStreetMap のデータ（2026年10月に Overpass で書き出した GeoJSON）から `tools/prep.py` で作成
  - 湖岸線と島：琵琶湖の水面（relation/63499）。40m単位で簡略化し、20,000㎡未満の島は省く
  - 港・桟橋・橋・川・灯台：同じ範囲の港（harbour）、フェリー乗り場、漁港、橋、河川、灯台のデータ
  - 座標は北緯35.25°・東経136.08°を原点とする実寸のメートル（x 東、y 南）
- `data/dem.json` … 国土地理院 地理院タイル「標高タイル」（ズーム12、約30m）から `tools/dem.py` で作成
  - 作品の座標で200m間隔に並べ直した、琵琶湖の水面（84.371m）からの高さ。湖の外形の外側26kmまで
  - 1マス1バイト（低い土地ほど細かく刻む）。水面より低い土地と海は0
  - 取り寄せたタイルは `tools/.dem_cache/` に置く（記録しない）
- `data/rail.json` … 国土地理院 地理院タイル「ベクトルタイル」（ズーム13）の鉄道から `tools/rail.py` で作成
  - 湖西線（路線コード 40201000069）の断片をつなぎ、比叡山坂本の北からマキノの北まで（25mより細かい曲がりは省く）
  - 高架は、湖岸線の簡略化で湖に出た所だけ陸の側へ寄せる。取り寄せたタイルは `tools/.bv_cache/` に置く（記録しない）
  - 作り直しには Python の `mapbox-vector-tile`・`shapely` が要る
- `data/depth.json` … 国土地理院 地理院タイル「ベクトルタイル」（ズーム14）の等深線（湖の深さの線）から `tools/depth.py` で作成
  - 湖岸線と島の輪郭を深さ0として加え、三角形でつないで補間した200m間隔の格子（最深は約98m。実際の最深部は約104m）
  - ヨシ原（4mより浅い所）・えり（5mより浅い所）・舟の通れる所・水の色（浅瀬・沖）がこの深さで決まる
  - 作り直しには Python の `mapbox-vector-tile`・`shapely`・`scipy` が要る
- `data/buoys.xlsx` … ブイ一覧（集落名・集落形態・北緯・東経・YouTubeリンク・表示）。チームで編集する

© OpenStreetMap contributors（ODbL）／国土地理院
