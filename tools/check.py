"""見た目の確認：決まった場面を撮影し、前回の基準と並べて比べる。

使い方（リポジトリの直下で）
  python3 tools/check.py            全場面（18）を撮る
  python3 tools/check.py --quick    代表の4場面だけ撮る
  python3 tools/check.py --accept   今回の撮影を新しい基準にする
  python3 tools/check.py --start    開始地点の検査だけ（10回開始して、陸や島に埋まらないか）
  （撮影のあとには、画面のボタンが別の部品に覆われていないかも、パソコンとスマートフォンの大きさで調べる）

結果
  check/now/NN.png        今回の撮影
  check/base/NN.png       基準（--accept で更新）
  check/sheet.png         基準（左）と今回（右）を並べた比較画像
  ページのエラーが出たら、一覧を表示して終了コード1で止まる。

共有時計（風・天気）は止めて撮るが、波・雪・粒子は毎回少し違うので、差の数値は目安。大きく変わった場面に「!」が付く。
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
    # 季節の出来事と画面（6つ目の要素：時計 t や操作 act）
    ('大津の花火',         'month=7&phase=0.86&wx=0', [135.875, 35.04, 0, 0, 3.14, -0.05, 70], 0, {}),
    ('ヨシ焼き（3月）',    'month=2&phase=0.45&wx=0', [135.9295, 35.124, 500, 0, 1.57, 0.05, 70], 0, {}),
    ('蛍（6月の夜）',      'month=5&phase=0.95&wx=0', [135.9295, 35.124, 300, 0, 1.57, 0.1, 60], 0, {}),
    ('虹（雨上がりの午後）', 'month=6&phase=0.64&wx=0', [136.03, 35.22, 0, 0, 0.7, -0.25, 80], 0, {'t': 1001416}),
    ('全体地図',           'month=6&phase=0.45&wx=0', [136.05537, 35.4446699, 120, 0, 1.57, 0.2, 60], 0, {'act': 'map'}),
    ('建物の選択画面',     'month=6&phase=0.45&wx=0', [136.03, 35.22, 0, 0, 0.7, 0.2, 60], 0, {'act': 'select'}),
    # 湖岸の景物と遠景
    ('沖島の集落',         'month=4&phase=0.45&wx=0', [136.06, 35.196, 0, 0, 0.0, 0.05, 70], 0),
    ('えりの夕方',         'month=7&phase=0.735&wx=0', [135.9388, 35.089, 0, 0, 3.14, 0.05, 60], 0),
    ('近江舞子の松',       'month=5&phase=0.42&wx=0', [135.975, 35.255, 0, 0, 1.2, 0.1, 70], 0),
    ('遠景の山影',         'month=4&phase=0.45&wx=0', [136.03, 35.22, 0, 0, 2.4, 0.0, 80], 0),
    ('冬のヨシ原',         'month=0&phase=0.45&wx=0', [135.9295, 35.124, 320, 0, 1.57, 0.25, 60], 0),
    ('夜の庵の灯り',       'month=5&phase=0.9&wx=0', [136.03, 35.22, 0, 0, 0.7, 0.12, 60], 8),
    # 名所・鳥・鉄道・田（2026年10月の追加）
    ('竹生島の社寺とカワウ', 'month=5&phase=0.3&wx=0', [136.08, 35.25, 6051, -18778, 1.0, 0.1, 30], 0),
    ('彦根城の夜',         'month=5&phase=0.9&wx=0', [136.08, 35.25, 14718, -3548, -2.165, 0.1, 40], 0),
    ('夜の対岸の町と電車', 'month=5&phase=0.9&wx=0', [136.06, 35.30, -3000, 0, 1.57, 0.12, 120], 0, {'t': 1000060}),
    ('白鬚のトンネル',     'month=6&phase=0.45&wx=0', [136.012, 35.271, 0, 0, 1.256, 0.12, 40], 0),
    ('田の水鏡（5月）',    'month=4&phase=0.45&wx=0', [136.08, 35.25, 2005, 4894, 3.14, 0.5, 400], 0),
    ('冬の水鳥',           'month=0&phase=0.45&wx=0', [136.06, 35.30, -3000, 0, 1.57, 0.35, 90], 0),
]
QUICK = [0, 1, 2, 3, 16, 24]
# 場面を切り替えてから、描画を何回進めて撮るか。場面ごとに状態を初期化しているので少なくてよい
FRAMES = 3


def snap(pg, path):
    """描画を FRAMES 回進めてから止めて撮る。
    この環境（ソフトウェア描画）は1回の描画に数秒かかり、描画を動かしたままだと撮影が描画の切れ目を
    何度も待つため、1場面に40秒ほどかかっていた。止めて撮ると数秒で済む。"""
    pg.evaluate(f'()=>__frames({FRAMES})')
    pg.evaluate('()=>__pause(true)')
    try:
        pg.screenshot(path=str(path), timeout=180000)
    finally:
        pg.evaluate('()=>__pause(false)')  # 代表4場面と全体地図


def serve():
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    h = functools.partial(Q, directory=str(R))
    s = http.server.ThreadingHTTPServer(('127.0.0.1', 0), h)
    threading.Thread(target=s.serve_forever, daemon=True).start()
    return s


def gl_error(m, errs):
    """ブラウザのコンソールから、シェーダーや WebGL の誤りを拾う（画面が黒くなるだけでページのエラーにならないため）。"""
    t = m.text
    if m.type == 'error' or 'Shader Error' in t or 'WebGL: INVALID' in t or 'GL_INVALID' in t or 'WebGLProgram' in t:
        if 'favicon' in t or 'Failed to load resource' in t:
            return
        errs.append('コンソール：' + t.split('\n')[0][:200])


def shoot(idx):
    OUT.mkdir(parents=True, exist_ok=True)
    srv = serve()
    port = srv.server_address[1]
    three = R / 'node_modules/three/build/three.module.min.js'
    errs = []
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=swiftshader'])
        pg = b.new_page(viewport={'width': 640, 'height': 400})
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: gl_error(m, errs))
        if three.exists():
            pg.route('**/three.module.min.js', lambda r: r.fulfill(path=str(three)))
        loaded = False
        for i in idx:
            name, q, v, bnum = SCENES[i][:4]
            ex = SCENES[i][4] if len(SCENES[i]) > 4 else {}
            if not loaded:
                pg.goto(f'http://127.0.0.1:{port}/docs/index.html?debug&b={bnum}&{q}')
                pg.evaluate("()=>{try{localStorage.setItem('floating.hint2','1')}catch(e){}}")
                pg.wait_for_timeout(900)
                pg.evaluate("()=>document.getElementById('title').click()")
                pg.wait_for_timeout(1500)
                sel = [k for k in idx if len(SCENES[k]) > 4 and SCENES[k][4].get('act') == 'select']
                if sel:   # 選択画面は湖に出る前にしか撮れないので、最初に撮る
                    # 実際の時計で空が変わらないよう、その場面の月・時刻・天気と時計を固定してから撮る
                    q2 = dict(kv.split('=') for kv in SCENES[sel[0]][1].split('&'))
                    pg.evaluate('a=>__scene(a)', {'month': int(q2['month']), 'phase': float(q2['phase']), 'wx': int(q2['wx']), 'b': SCENES[sel[0]][3], 't': 1000000})
                    snap(pg, OUT / f'{sel[0]:02d}.png')
                    print(f'  {sel[0]:02d} {SCENES[sel[0]][0]}')
                pg.evaluate("()=>document.getElementById('go').click()")
                loaded = True
            if ex.get('act') == 'select':
                continue
            sc = dict(kv.split('=') for kv in q.split('&'))
            try:
                pg.evaluate('a=>{__scene(a[0]);__set(...a[1])}', [{'month': int(sc['month']), 'phase': float(sc['phase']), 'wx': int(sc['wx']), 'b': bnum, 't': ex.get('t', 1000000)}, v])
            except Exception:
                errs.append('視点を動かせませんでした（読み込み時のエラーの可能性）')
                break
            if ex.get('act') == 'map':
                pg.evaluate("()=>document.getElementById('view').click()")
                pg.wait_for_timeout(2500)  # 地図は少しずつ現れる（画面の切り替えの動き）
            snap(pg, OUT / f'{i:02d}.png')
            if ex.get('act') == 'map':
                pg.evaluate("()=>document.getElementById('view').click()")
            print(f'  {i:02d} {name}')
        b.close()
    srv.shutdown()
    return errs


def start_check(n=10):
    """開始を n 回くり返し、カメラが陸や島に埋まっていないか・建物が湖の上にあるかを調べる。"""
    srv = serve()
    port = srv.server_address[1]
    three = R / 'node_modules/three/build/three.module.min.js'
    bad, errs = [], []
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=swiftshader'])
        pg = b.new_page(viewport={'width': 320, 'height': 200})
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: gl_error(m, errs))
        if three.exists():
            pg.route('**/three.module.min.js', lambda r: r.fulfill(path=str(three)))
        for k in range(n):
            pg.goto(f'http://127.0.0.1:{port}/docs/index.html?debug&start={k * 7919 + 13}')
            pg.evaluate("()=>{try{localStorage.setItem('floating.hint2','1')}catch(e){}}")
            pg.wait_for_timeout(700)
            pg.evaluate("()=>document.getElementById('title').click()")
            pg.wait_for_timeout(900)
            pg.evaluate("()=>document.getElementById('go').click()")
            pg.wait_for_timeout(1500)
            r = pg.evaluate("""()=>{const G=__floating,c=G.camera.position,S=G.S;
              let worst=1e9;for(let a=0;a<8;a++){const x=c.x+Math.cos(a*.785)*12,z=c.z+Math.sin(a*.785)*12;worst=Math.min(worst,c.y-G.groundH(x/S,z/S));}
              return {clear:Math.min(worst,c.y-G.groundH(c.x/S,c.z/S)),x:c.x/S,y:c.z/S}}""")
            if r['clear'] < 1:
                bad.append(r)
        b.close()
    srv.shutdown()
    print(f'開始地点の検査：{n} 回中 {len(bad)} 回が陸や島に近すぎ')
    for r in bad:
        print('   ', r)
    return bad, errs


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
            base = Image.open(bp).convert('RGB').resize(now.size)
            diff = sum(ImageChops.difference(base, now).convert('L').histogram()[40:]) / (now.width * now.height)
            img.paste(base.resize((W, H)), (0, y + 20))
        img.paste(now.resize((W, H)), (W + 12, y + 20))
        mark = '' if diff is None else (' !' if diff > 0.08 else '')
        label = f'{i:02d} {SCENES[i][0]}' + ('' if diff is None else f'  差 {diff:.3f}{mark}')
        d.text((4, y + 2), label, fill=(0, 0, 0), font=font)
        report.append(label)
    img.save(R / 'check/sheet.png')
    return report


# 押せるかの検査：パソコンとスマートフォンの大きさで、画面のボタンの真ん中に別の部品が重なっていないかを調べる
# （選ぶ画面の板が矢印を覆って「01しか選べない」ことがあった。撮影は内部の命令で操作するので、これでは見つからない）
TAP_SELECT = ['prev', 'next', 'go', 'bright', 'ab']
TAP_LAKE = ['view', 'snd', 'save', 'rec']


def tap_check():
    srv = serve()
    port = srv.server_address[1]
    three = R / 'node_modules/three/build/three.module.min.js'
    bad = []
    js = '''ids => ids.map(id => { const el = document.getElementById(id);
      if (!el || getComputedStyle(el).display === 'none' || el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return null;
      const r = el.getBoundingClientRect(); if (!r.width) return null;
      const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return t && (t === el || el.contains(t)) ? null : id + '（上に ' + (t ? (t.id || t.className || t.tagName) : 'なし') + '）'; }).filter(Boolean)'''
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=swiftshader'])
        for name, vw, vh, mob in [('パソコン', 1280, 720, False), ('スマートフォン', 390, 844, True), ('小さいスマートフォン', 360, 640, True)]:
            pg = b.new_page(viewport={'width': vw, 'height': vh}, is_mobile=mob, has_touch=mob)
            if three.exists():
                pg.route('**/three.module.min.js', lambda r: r.fulfill(path=str(three)))
            pg.goto(f'http://127.0.0.1:{port}/docs/index.html?debug', timeout=300000)
            pg.evaluate("()=>{try{localStorage.setItem('floating.hint2','1')}catch(e){}}")
            pg.wait_for_timeout(800)
            pg.evaluate("()=>document.getElementById('title').click()")
            pg.wait_for_timeout(1500)
            bad += [f'{name}・選ぶ画面：{x}' for x in pg.evaluate(js, TAP_SELECT)]
            pg.evaluate("()=>document.getElementById('go').click()")
            pg.wait_for_timeout(1500)
            bad += [f'{name}・湖：{x}' for x in pg.evaluate(js, TAP_LAKE)]
            pg.close()
        b.close()
    srv.shutdown()
    print(f'押せるかの検査：{"すべて押せる" if not bad else "覆われたボタン " + str(len(bad))}')
    return bad


def main():
    a = sys.argv[1:]
    if '--start' in a:
        import subprocess
        subprocess.run([sys.executable, str(R / 'build.py')], cwd=R, check=True)
        bad, errs = start_check()
        sys.exit(1 if bad or errs else 0)
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
    # 場面は1枚のページで順に撮る。並べて同時に撮ると、前の場面の状態（雨上がりの澄んだ空気など）が
    # 場面ごとに変わって比較がぶれるうえ、この環境（2コア）ではかえって遅かった
    errs = shoot(idx)
    for line in sheet(idx):
        print(line)
    print('比較画像：check/sheet.png')
    if True:
        bad, e2 = start_check(3 if '--quick' in a else 6)
        errs += e2 + [f'開始地点が陸や島に近すぎ：{r}' for r in bad]
        errs += [f'ボタンが覆われて押せない：{x}' for x in tap_check()]
    if errs:
        print('ページのエラー：')
        for e in sorted(set(errs)):
            print('  ', e)
        sys.exit(1)


if __name__ == '__main__':
    main()
