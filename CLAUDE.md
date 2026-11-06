# Floating — 作業の決まり（Claude 用）

琵琶湖の三次元作品（three.js 0.160）。返答は日本語。人が読む説明は README.md、部品どうしのつながりは src/DEPENDENCIES.md（自動生成）。

## 作品の雰囲気
- 漂い・はかなさ・俳句のような静けさ。人の姿は出さず、置かれた物・灯り・音などの気配で見せる
- ヨシの価値を伝える
- 効果は「ほんの少し」の強さで（色・光・動き・音とも控えめに）

## 進め方（変更のたび）
1. 変更する（`src/`・`data/`。`docs/` の出力は手で直さない）
2. `python3 build.py`
3. `python3 tools/test.py`
4. `python3 tools/local.py --accept`（全体の確認、約15分）。出力が長いので、ファイルに書き出して終わりの「まとめ」だけ読む
5. 作業ブランチにコミットしてプッシュ（`git push -u origin <ブランチ>`）

初めての環境では先に `npm install --no-save esbuild@0.24.2 three@0.160.0` と `pip install playwright==1.63.0`（ブラウザは入っているものを使う。`playwright install` はしない）。

## 「反映して」と言われたら（公開）
1. main への取り込み：PR を作ってマージする
2. claude.ai の公開ページ https://claude.ai/artifact/1jku4UraQEbLNZVetyzKD9 を更新する。`docs/index.html` を本体にして、`docs/c-*.js` と `docs/d-*.json` を一緒に載せる（`.lz` は載せられない）
3. GitHub の自動確認（`.github/workflows/check.yml`）の結果を1回だけ確かめる

## 作りの決まり
- コードとデータは `docs/` に分けて出力する（`c-<hash>.js`・`d-<hash>.json`）。ページ本体 `docs/index.html` は読み込み役だけ
- 確認用の窓口は `?debug`（`G` が `window.__floating` に見える）、遅れたコマの記録は `?debug&perf`
- 部品 `src/js/NN-*.js` は名前の順につながって1つのモジュールになる。部品をまたぐ値は `G`（00-head.js）に。`G.xxx` を2つの部品で書き換えるとビルドが止まる
- 読み込みの間の乱数は決まった種から出る（00-head.js）。部品の順番や乱数を使う順番を変えると、配置が変わる
- 見た目の調整値・要素の入切は、まず `src/js/02-season.js` の `LOOK`・`PALETTE` で
- 水上建築は `44c-halls-0-common.js`（共通の道具 `HALL`）・`44c-halls-1〜7`（建物ごと）・`44c-halls-8-frame.js`（毎コマの更新・音）

## トークンを節約する読み方
- 大きな部品（16-terrain.js・18-buildings.js・44c-halls-0-common.js など）は全部を読まない。まず `grep -n` で見出し（`// ----------`・`function`・`const`）を探し、要る行だけ読む
- src/DEPENDENCIES.md は、要る部品の見出しだけを検索して読む
- `docs/` の出力（c-*.js・d-*.json・index.html）、`data/*.json`、`check/base/*.png` は読まない（要るときは件数・大きさ・一部だけ）
- 1つの部品が 30KB を超えそうなら、意味のまとまりで分ける
