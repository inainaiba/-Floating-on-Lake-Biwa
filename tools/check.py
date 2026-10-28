"""見た目の確認：決まった場面を撮影し、前回の基準と並べて比べる。

使い方（リポジトリの直下で）
  python3 tools/check.py            全場面（12）を撮る
  python3 tools/check.py --quick    代表の4場面だけ撮る
  python3 tools/check.py --accept   今回の撮影を新しい基準にする

結果
  check/now/NN.png        今回の撮影
  check/base/NN.png       基準（--accept で更新）
  check/sheet.png         基準（左）と今回（右）を並べた比較画像
  ページのエラーが出たら、一覧を表示して終了コード1で止まる。

波・雪・粒子は毎回少し違うので、差の数値は目安。大きく変わった場面に「!」が付く。
"""
import sys, shutil, pathlib, http.server, threading, functools
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops, ImageDraw, ImageFont
import glob

R = pathlib.Path(__file__).resolve().parent.parent
OUT, BASE = R / 'check/now', R / 'check/base'

# 場面：名前、URLの条件、視点 [経度, 緯度, 東へm, 南へm, 向き, 見上げ, 距離]、建物番号
SCENES = [
    ('海津・夏の昼',       'month=6&phase=0.45&wx=0', [136.072254, 35.46257, 600, 600, 0.6, 0.1, 90], 0),
    ('湖上・夏の夕方',     'month=8&phase=0.745&wx=0', [136.03, 35.22, 0, 0, 0.7, -0.05, 80], 0),
    ('湖上・初夏の夜',     'month=5&phase=0.95&wx=0', [136.03, 35.22, 0, 0, 0.7, 0.2, 60], 0),
    ('海津・冬の雪',       'month=0&phase=0.35&wx=6', [136.072254, 35.46257, 600, 600, 0.6, 0.1, 90], 0),
    ('白鬚神社・春の朝',   'month=4&phase=0.27&wx=0', [136.0115, 35.2735, 1500, 0, 1.57, 0.05, 80], 3),
    ('南湖の街・夏',       'month=6&phase=0.45&wx=0', [135.9, 35.05, 0, 0, 3.4, 0.02, 90], 5),
    ('湖上・秋の紅葉',     'month=10&phase=0.45&wx=0', [136.03, 35.22, 0, 0, 0.7, 0.3, 60], 8),
    ('湖上・大雨',         'month=5&phase=0.4&wx=4', [136.03, 35.22, 0, 0, 0.7, 0.3, 60], 6),
    ('比良八荒の強風',     'month=2&phase=0.6&wx=5', [136.03, 35.22, 0, 0, 0.7, 0.12, 90], 2),
    ('浜知内のブイ',       'month=5&phase=0.4&wx=0', [136.05537, 35.4446699, 120, 0, 1.57, 0.2, 60], 0),
    ('海津大崎の桜',       'month=3&phase=0.4&wx=0', [136.072254, 35.46257, 600, 600, 0.6, 0.1, 90], 1),
    ('近づいた建物',       'month=6&phase=0.45&wx=0', [136.03, 35.22, 0, 0, 0.7, 0.25, 60], 4),
]
QUICK = [0, 1, 2, 3]


def serve():
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    h = functools.partial(Q, directory=str(R))
    s = http.server.ThreadingHTTPServer(('127.0.0.1', 0), h)
    threading.Thread(target=s.serve_forever, daemon=True).start()
    return s


def shoot(idx):
    OUT.mkdir(parents=True, exist_ok=True)
    srv = serve()
    port = srv.server_address[1]
    three = R / 'node_modules/three/build/three.module.js'
    errs = []
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=swiftshader'])
        pg = b.new_page(viewport={'width': 800, 'height': 500})
        pg.on('pageerror', lambda e: errs.append(str(e)))
        if three.exists():
            pg.route('**/three.module.js', lambda r: r.fulfill(path=str(three)))
        for i in idx:
            name, q, v, bnum = SCENES[i]
            pg.goto(f'http://127.0.0.1:{port}/docs/index.html?debug&b={bnum}&{q}')
            pg.evaluate("()=>{try{localStorage.setItem('floating.hint2','1')}catch(e){}}")
            pg.wait_for_timeout(1500)
            pg.evaluate("()=>document.getElementById('title').click()")
            pg.wait_for_timeout(400)
            pg.evaluate("()=>document.getElementById('go').click()")
            try:
                pg.evaluate('v=>__set(...v)', v)
            except Exception:
                errs.append('視点を動かせませんでした（読み込み時のエラーの可能性）')
                break
            pg.wait_for_timeout(2500)
            pg.screenshot(path=str(OUT / f'{i:02d}.png'), timeout=180000)
            print(f'  {i:02d} {name}')
        b.close()
    srv.shutdown()
    return errs


def sheet(idx):
    idx = [i for i in idx if (OUT / f'{i:02d}.png').exists()]
    W, H = 400, 250
    img = Image.new('RGB', (W * 2 + 12, (H + 22) * len(idx)), 'white')
    d = ImageDraw.Draw(img)
    fs = sorted(glob.glob('/usr/share/fonts/**/NotoSansCJK-Regular.ttc', recursive=True) + glob.glob('/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc'))
    font = ImageFont.truetype(fs[0], 13) if fs else None
    report = []
    for row, i in enumerate(idx):
        now = Image.open(OUT / f'{i:02d}.png').convert('RGB')
        bp = BASE / f'{i:02d}.png'
        y = row * (H + 22)
        diff = None
        if bp.exists():
            base = Image.open(bp).convert('RGB')
            diff = sum(ImageChops.difference(base, now).convert('L').histogram()[40:]) / (now.width * now.height)
            img.paste(base.resize((W, H)), (0, y + 20))
        img.paste(now.resize((W, H)), (W + 12, y + 20))
        mark = '' if diff is None else (' !' if diff > 0.08 else '')
        label = f'{i:02d} {SCENES[i][0]}' + ('' if diff is None else f'  差 {diff:.3f}{mark}')
        d.text((4, y + 2), label, fill=(0, 0, 0), font=font)
        report.append(label)
    img.save(R / 'check/sheet.png')
    return report


def main():
    a = sys.argv[1:]
    if '--accept' in a:
        BASE.mkdir(parents=True, exist_ok=True)
        for f in OUT.glob('*.png'):
            shutil.copy(f, BASE / f.name)
        print('基準を更新しました：', len(list(OUT.glob('*.png'))), '場面')
        return
    import subprocess
    subprocess.run([sys.executable, str(R / 'build.py')], cwd=R, check=True)
    idx = QUICK if '--quick' in a else list(range(len(SCENES)))
    print('撮影中…')
    errs = shoot(idx)
    for line in sheet(idx):
        print(line)
    print('比較画像：check/sheet.png')
    if errs:
        print('ページのエラー：')
        for e in sorted(set(errs)):
            print('  ', e)
        sys.exit(1)


if __name__ == '__main__':
    main()
