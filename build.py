"""Floating の組み立て：src/ の部品と data/ を1つのHTML（docs/index.html）にまとめる。

  src/shell.html  … HTML・CSS・画面の部品（__SCRIPT__ の位置に描画のコードが入る）
  src/js/NN-*.js  … 描画のコード。ファイル名の番号順につなげる（1つのモジュールとして動く）
  data/lake.json, data/dem.json, data/depth.json, data/isles.json, data/rivers.json, data/towns.json, data/near.json, data/landuse.json, data/rail.json, data/buoys.xlsx … 湖・地形・深さ・線路・ブイのデータ

読み込む量を減らすため（見た目は変えない）：
  ・大きな2進のデータ（base64 の文字列）は、算術符号で詰めて埋め込み（tools/acpack.py。小さなものは並べ方を変えてから deflate：pack）、
    作品の中で元の文字列に戻す（src/js/00a-data.js）。詰めた結果は tools/.ac_cache/ に取っておく（同じデータなら詰め直さない）
  ・three.js（使う部分だけ）と作品のコードを1つにまとめて縮める（esbuild：npm install --no-save esbuild@0.24.2 three@0.160.0）
"""
import base64, hashlib, pathlib, json, re, sys, zlib
from openpyxl import load_workbook

r = pathlib.Path(__file__).parent


LAT_RANGE, LON_RANGE = (34.85, 35.6), (135.8, 136.35)   # 琵琶湖とその周り
YT = re.compile(r'^https?://(?:www\.|m\.)?(?:youtube\.com/(?:watch\?v=|shorts/|live/)|youtu\.be/)([\w-]{11})')


def buoys():
    """ブイ一覧を読み、入力を確かめる。作品に出せない行は飛ばし、気になる点は知らせる。"""
    ws = load_workbook(r / 'data/buoys.xlsx', data_only=True)['ブイ一覧']
    out, notes = [], []
    seen_pos, seen_vid = {}, {}
    for row in ws.iter_rows(min_row=5, values_only=True):
        no, name, form, lat, lon, url, show = row[:7]
        if lat is None and lon is None and not url:
            continue
        tag = f'No.{no}' + (f'（{name}）' if name else '')
        if show == '×':
            continue
        if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
            notes.append(f'{tag}：北緯・東経が数値でないため飛ばしました'); continue
        if LON_RANGE[0] <= lat <= LON_RANGE[1] and LAT_RANGE[0] <= lon <= LAT_RANGE[1]:
            notes.append(f'{tag}：北緯と東経が逆のようです（入れ替えて使いました）'); lat, lon = lon, lat
        if not (LAT_RANGE[0] <= lat <= LAT_RANGE[1] and LON_RANGE[0] <= lon <= LON_RANGE[1]):
            notes.append(f'{tag}：琵琶湖の範囲外の座標（{lat}, {lon}）のため飛ばしました'); continue
        if not url:
            notes.append(f'{tag}：リンクがないため飛ばしました'); continue
        url = str(url).strip()
        m = YT.match(url)
        if not m:
            notes.append(f'{tag}：YouTubeのリンクではないようです（そのまま使いました）：{url}')
        else:
            vid = m.group(1)
            if vid in seen_vid:
                notes.append(f'{tag}：{seen_vid[vid]} と同じ動画です')
            seen_vid[vid] = tag
        key = (round(lat, 4), round(lon, 4))   # 約10mの精度で同じ場所
        if key in seen_pos:
            notes.append(f'{tag}：{seen_pos[key]} とほぼ同じ場所です（約10m以内）')
        seen_pos[key] = tag
        if not name:
            notes.append(f'{tag}：集落名が空です')
        out.append({'no': no, 'name': name or '', 'form': form or '', 'lat': lat, 'lon': lon, 'url': url})
    for n in notes:
        print('ブイ一覧：', n)
    return out


# ---- データを詰める（src/js/00a-data.js で元に戻す）----
def _delta(b):
    o, p = bytearray(len(b)), 0
    for i, v in enumerate(b):
        o[i] = (v - p) & 255
        p = v
    return bytes(o)


def _planes(b, k, d=False):
    n = len(b) // k
    return b''.join(_delta(b[j::k][:n]) if d else bytes(b[j::k][:n]) for j in range(k)) + b[n * k:]


def _pred2d(b, w):
    o = bytearray(len(b))
    for i in range(len(b)):
        a = b[i - 1] if i % w else 0
        c = b[i - w] if i >= w else 0
        d = b[i - w - 1] if i >= w and i % w else 0
        o[i] = (b[i] - (a + c - d)) & 255
    return bytes(o)


def _med(b, w):
    """左・上・左上から、角を見分けて予測する（MED）。滑らかな面は 2d と同じ、段差では段差に沿って予測する"""
    o = bytearray(len(b))
    for i in range(len(b)):
        a = b[i - 1] if i % w else 0
        c = b[i - w] if i >= w else 0
        d = b[i - w - 1] if i >= w and i % w else 0
        p = min(a, c) if d >= max(a, c) else max(a, c) if d <= min(a, c) else a + c - d
        o[i] = (b[i] - p) & 255
    return bytes(o)


def pack(s, t, w=0):
    """base64 の文字列 s を、並べ方 t で並べ替えて圧縮した形にする（どの並べ方が効くかは、データごとに試して決めた）"""
    b = base64.b64decode(s)
    x = b if t == 'raw' else _delta(b) if t == 'delta' else _pred2d(b, w) if t == '2d' else _med(b, w) if t == 'med' else _planes(b, int(t[2:] if t[1] == 'd' else t[1:]), t[1] == 'd')
    c = zlib.compressobj(9, zlib.DEFLATED, -15)
    out = {'$p': base64.b64encode(c.compress(x) + c.flush()).decode(), 't': t}
    if t in ('2d', 'med'):
        out['w'] = w
    return out


def ac(m, s, **kw):
    """base64 の文字列 s を算術符号で詰める（tools/acpack.py。m は詰め方）。結果は取っておき、同じ入力なら使い回す"""
    sys.path.insert(0, str(r / 'tools'))
    import acpack
    b = base64.b64decode(s)
    key = hashlib.sha1((m + json.dumps(kw, sort_keys=True)).encode() + b + (r / 'tools/acpack.py').read_bytes()).hexdigest()
    fn = r / 'tools/.ac_cache' / f'{key}.json'
    if fn.exists():
        return json.loads(fn.read_text())
    out = {'m': m, 'n': len(b), 'c32': acpack.crc(b), **kw}
    if m == 'g':
        z = acpack.enc_g(b, kw['w'])
    elif m == 'n4':
        z = acpack.enc_n4(b, kw['bs'])
    elif m == 'st':
        z, out['c'] = acpack.enc_st(b)
    elif m == 'tw':
        z = acpack.enc_tw(b)
    elif m == 'lu':
        z = acpack.enc_lu(b)
    out['$a'] = base64.b64encode(z).decode()
    fn.parent.mkdir(exist_ok=True)
    fn.write_text(json.dumps(out))
    return out


def data():
    """作品のコードが DATA として読むデータ（00a-data.js）"""
    sys.path.insert(0, str(r / 'tools'))
    import acpack, struct
    L = lambda n: json.loads((r / f'data/{n}.json').read_text())
    dem, depth, near, towns, lu, isles = L('dem'), L('depth'), L('near'), L('towns'), L('landuse'), L('isles')
    dem['d'] = ac('g', dem['d'], w=dem['w'])
    depth['d'] = ac('g', depth['d'], w=depth['w'])
    near['d'], near['idx'] = ac('n4', near['d'], bs=near['bs']), pack(near['idx'], 'raw')
    towns['b'], towns['r'] = ac('tw', towns['b']), ac('st', towns['r'])
    # 地図記号は、種類ごと・帯ごとに並べ替えてから詰める（近い点どうしが並んで差が小さくなる。読む側は並び順に頼らない）
    b = base64.b64decode(lu['d'])
    pts = acpack.lu_order(struct.unpack_from('<Bhh', b, i * 5) for i in range(lu['n']))
    lu['d'] = ac('lu', base64.b64encode(b''.join(struct.pack('<Bhh', *q) for q in pts)).decode())
    for q in isles:
        q['d'] = pack(q['d'], 'delta')
    return {'dem': dem, 'depth': depth, 'near': near, 'towns': towns, 'landuse': lu, 'isles': isles}


GLSL_HINT = re.compile(r'gl_|vec[234]|uniform |varying |#include|void main')


def glsl_comments(src):
    """シェーダー（GLSL）の文字の中のコメント（// …）を除く。作品のシェーダーには説明の日本語が多く、そのまま埋め込むと重い。
    テンプレート文字列（`…`）のうち GLSL らしいものだけを対象にし、${…} を含む行や URL（://）には触れない"""
    def fix(m):
        t = m.group(0)
        if not GLSL_HINT.search(t):
            return t
        out = []
        for line in t.split('\n'):
            k = line.find('//')
            if k >= 0 and line[k - 1:k] != ':' and '${' not in line[k:] and '`' not in line[k:]:
                line = line[:k].rstrip()
                if not line.strip():
                    continue
            out.append(line)
        return '\n'.join(out)
    return re.sub(r'`[^`]*`', fix, src)


def bundle(script):
    """three.js（使う部分だけ）と作品のコードを1つにまとめて縮める（esbuild。名前を短くし、コメントと空白を除く）。
    手元の src のコードはそのまま。道具がない環境では止める（公開ファイルが環境で変わらないように）"""
    import subprocess
    exe = r / 'node_modules/.bin/esbuild'
    if not exe.exists() or not (r / 'node_modules/three/package.json').exists():
        raise SystemExit('組み立てに esbuild と three.js が要ります：npm install --no-save esbuild@0.24.2 three@0.160.0')
    src = r / 'tools/.bundle-in.mjs'
    src.write_text(script)
    try:
        res = subprocess.run([str(exe), str(src), '--bundle', '--format=esm', '--minify', '--target=es2022', '--charset=utf8',
                              '--legal-comments=inline', '--log-level=error'], capture_output=True, text=True)
    finally:
        src.unlink()
    if res.returncode:
        print(res.stderr[-1500:])
        raise SystemExit('コードをまとめる手順（esbuild）で誤りがありました')
    # まとめたコードの中で改行があるのはテンプレート文字列（主にシェーダー）の中だけ。行頭の字下げは要らないので除く
    #（GLSL の # で始まる指示は行頭にあればよく、three.js のシェーダーの部品の結合・置き換えも字下げに頼らない）
    return re.sub(r'\n[ \t]+', '\n', res.stdout)


def build():
    import sys
    sys.path.insert(0, str(r / 'tools'))
    import deps
    errs = deps.write()
    if errs:
        for e in errs:
            print('エラー：', e)
        raise SystemExit('部品の名前が重なっています（src/DEPENDENCIES.md 参照）')
    parts = sorted((r / 'src/js').glob('*.js'))
    script = bundle('\n'.join(glsl_comments(p.read_text()) for p in parts))
    html = (r / 'src/shell.html').read_text().replace('__SCRIPT__', script)
    B = buoys()
    # 湖岸線などのうち、作品で使わないもの（OpenStreetMap の川の線・灯台）は埋め込まない
    lake = json.loads((r / 'data/lake.json').read_text())
    for k in ('rivers', 'lights'):
        lake.pop(k, None)
    html = (html.replace('__LAKE__', json.dumps(lake, ensure_ascii=False, separators=(',', ':')))
                .replace('__RAIL__', (r / 'data/rail.json').read_text())
                .replace('__RIVERS__', (r / 'data/rivers.json').read_text())
                .replace('__DATA__', json.dumps(data(), separators=(',', ':')))
                .replace('__BUOYS__', json.dumps(B, ensure_ascii=False)))
    # 文法の確認：node があれば、組み立てたコードを読み込めるか確かめる（壊れたまま公開しないため）
    import subprocess, shutil, tempfile
    if shutil.which('node'):
        with tempfile.NamedTemporaryFile('w', suffix='.mjs', delete=False) as f:
            f.write(script.replace('__LAKE__', '{}').replace('__RAIL__', '{}').replace('__RIVERS__', '[]').replace('__DATA__', '{}').replace('__BUOYS__', '[]'))
        res = subprocess.run(['node', '--check', f.name], capture_output=True, text=True)
        if res.returncode:
            print(res.stderr.split('SyntaxError')[0][-400:] + 'SyntaxError' + res.stderr.split('SyntaxError')[-1][:200])
            raise SystemExit('コードに文法の誤りがあるため、組み立てを中止しました')
    (r / 'docs/index.html').write_text(html)
    print(f'built docs/index.html  部品 {len(parts)} 個 / ブイ {len(B)} 個')


if __name__ == '__main__':
    build()
