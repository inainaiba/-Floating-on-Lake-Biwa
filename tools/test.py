"""速いテスト：画面を描かずに、計算だけの部分を数秒で確かめる（GitHub の自動確認でも、撮影の前に走らせる）。

  python3 tools/test.py

- データの詰め方（tools/acpack.py）と読み戻し（src/js/00a-data.js）：詰め方ごとに、作ったでたらめなデータを詰めて戻し、元と同じか
  （CRC32 で照らし合わせる）。わざと壊したものは見つけられるか
- 点が多角形の中かの判定（src/js/05-lake.js）：tools/test.mjs
- シェーダーの角ばった区画：湖面や地面の色を、世界の座標を大きな区画（1区画 2 以上）に切った乱数で
  そのまま変えていないか。区画の境目がくっきりした直線になり、高い視点で三角形や平行四辺形の模様に見える
  （2026年11月、湖面の風の筋がこれで角ばっていた）。意図した区画（畑など）は /*区画OK：理由*/ を付ける
使うのは Python の標準の部品と node だけ
"""
import base64, json, random, re, struct, subprocess, sys, tempfile, zlib
from pathlib import Path

r = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(r / 'tools'))
import acpack

R = random.Random(20261101)


def node_check(data):
    with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f:
        json.dump(data, f)
    res = subprocess.run(['node', str(r / 'tools/datacheck.mjs'), f.name], capture_output=True, text=True)
    Path(f.name).unlink()
    return res.returncode == 0, (res.stdout + res.stderr).strip()


def node_(m, b, z, **kw):
    return {'$a': base64.b64encode(z).decode(), 'm': m, 'n': len(b), 'c32': acpack.crc(b), **kw}


def main():
    D = {}
    # 格子（標高のようになめらかな面に、でこぼこと段差）
    w, h = 61, 47
    g = bytes(max(0, min(255, int(120 + 60 * __import__('math').sin(i / 9) * __import__('math').cos(j / 7) + R.randint(-6, 6) + (40 if i > 40 else 0)))) for j in range(h) for i in range(w))
    D['g'] = node_('g', g, acpack.enc_g(g, w), w=w)
    # 岸近くの細かい地形（4ビット、32×32 の区画を3つ）
    n4 = bytes(R.randint(0, 255) if R.random() < 0.3 else 0x77 for _ in range(3 * 512))
    D['n4'] = node_('n4', n4, acpack.enc_n4(n4, 32), bs=32)
    # 道の線
    st = b''
    for _ in range(40):
        k = R.randint(1, 30)
        x, y = R.randint(-9000, 9000), R.randint(-9000, 9000)
        pts = []
        for _ in range(k):
            x += R.randint(-30, 30)
            y += R.randint(-30, 30)
            pts += [x, y]
        st += struct.pack('<BB', R.randint(0, 4), k) + struct.pack('<%dh' % (2 * k), *pts)
    z, c = acpack.enc_st(st)
    D['st'] = {**node_('st', st, z), 'c': c}
    # 家（並べ替えたもの）
    tw = b''.join(struct.pack('<hhBBbB', R.randint(-23000, 23000), R.randint(-23000, 23000), R.randint(4, 255), R.randint(4, 120), R.randint(-126, 126), R.randint(0, 1)) for _ in range(300))
    D['tw2'] = node_('tw2', tw, acpack.enc_tw2(tw))
    # 家（種類が先。種類 2 は陸の奥の家：位置だけ）
    tw3 = b''
    for k in range(400):
        x, y = R.randint(-23000, 23000), R.randint(-23000, 23000)
        if k > 250:
            x, y, w_, d_, r_ = acpack.tw3_inland(x, y)
            tw3 += struct.pack('<hhBBbB', x, y, w_, d_, r_, 2)
        else:
            tw3 += struct.pack('<hhBBbB', x, y, R.randint(4, 255), R.randint(4, 120), R.randint(-126, 126), R.randint(0, 1))
    D['tw3'] = node_('tw3', tw3, acpack.enc_tw3(tw3))
    # 地図記号（並べ替えたもの）
    pts = acpack.lu_order((R.randint(0, 4), R.randint(-2400, 2200), R.randint(-3300, 3300)) for _ in range(500))
    lu = b''.join(struct.pack('<Bhh', *q) for q in pts)
    D['lu'] = node_('lu', lu, acpack.enc_lu(lu))
    # 多角形の列（大きな値・負の値・点が1つの輪も）
    polys = [[[[R.randint(-90000, 90000), R.randint(-90000, 90000)] for _ in range(R.randint(1, 40))] for _ in range(R.randint(1, 3))] for _ in range(12)]
    D['pl'] = {'$j': base64.b64encode(acpack.enc_pl(polys)).decode(), 'c32': zlib.crc32(json.dumps(polys, separators=(',', ':')).encode()) & 0xFFFFFFFF}
    ok, out = node_check(D)
    print('詰め方ごとの読み戻し：', out)
    if not ok:
        sys.exit(1)
    # わざと壊したものは見つけられるか
    for k in D:
        bad = json.loads(json.dumps(D))
        bad[k]['c32'] ^= 1
        ok, _ = node_check({k: bad[k]})
        if ok:
            print('壊したデータを見つけられませんでした：', k)
            sys.exit(1)
    print('壊したデータ：', len(D), '通りとも見つけた')
    res = subprocess.run(['node', str(r / 'tools/test.mjs')], capture_output=True, text=True)
    print(res.stdout.strip() or res.stderr.strip())
    if res.returncode:
        sys.exit(1)
    bc = blocky_cells()
    print('シェーダーの角ばった区画：' + ('なし' if not bc else f'{len(bc)} か所'))
    for b in bc:
        print('  ', b)
    if bc:
        sys.exit(1)


def blocky_cells():
    """シェーダーの floor(世界の座標*k) で、k < 0.5（1区画が2以上）のものを探す。/*区画OK…*/ が付いたものは除く"""
    bad = []
    for f in sorted((r / 'src/js').glob('*.js')):
        for i, line in enumerate(f.read_text().splitlines(), 1):
            for m in re.finditer(r'floor\(', line):
                j, d = m.end(), 0
                while j < len(line):
                    if line[j] == '(':
                        d += 1
                    elif line[j] == ')':
                        if d == 0:
                            break
                        d -= 1
                    j += 1
                inner = line[m.end():j]
                if '区画OK' in inner or not re.search(r'\b(vP0?|vXZ|vWp|wp)\b', inner):
                    continue
                ks = [float(x) for x in re.findall(r'\*\s*(\d*\.\d+|\d+)(?![\d.])', inner)]
                if ks and min(ks) < 0.5:
                    bad.append(f'{f.name}:{i}  floor({inner[:60]})')
    return bad


if __name__ == '__main__':
    main()
