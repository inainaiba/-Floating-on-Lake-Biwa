"""島の高さ（data/isles.json）を国土地理院の標高タイルから作る。

  python3 tools/isles.py [タイルを置くフォルダ]

- 島（data/lake.json の島と、src/js/05-lake.js の多景島）ごとに、輪郭のまわり100mまでを20m間隔の格子にする
- 地理院タイル「標高タイル（dem_png）」のズーム14（約10m）を補間して拾い、琵琶湖の水面（84.371m）からの高さにする
- 1マス1バイト：h = TOP·v/255（約0.6m刻み）。水面より低い所は0
"""
import base64, json, math, re, sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import dem as D  # 同じタイルの読み方を使う（Z だけ変える）

r = Path(__file__).resolve().parent.parent
STEP, Z, TOP, PAD = 20, 14, 160, 100


def main():
    cache = Path(sys.argv[1] if len(sys.argv) > 1 else r / 'tools/.dem_cache')
    cache.mkdir(parents=True, exist_ok=True)
    D.Z = Z
    isl = json.loads((r / 'data/lake.json').read_text())['islands']
    tk = re.search(r'const TAKEI = (\[\[.*?\]\]);', (r / 'src/js/05-lake.js').read_text())
    if tk:
        isl = isl + [json.loads(tk.group(1))]
    tiles, out = {}, []
    for poly in isl:
        xs, ys = [p[0] for p in poly], [p[1] for p in poly]
        x0, y0 = min(xs) - PAD, min(ys) - PAD
        w, h = int((max(xs) + PAD - x0) / STEP) + 1, int((max(ys) + PAD - y0) / STEP) + 1
        H = np.zeros((h, w))
        for j in range(h):
            for i in range(w):
                lon = D.LON0 + (x0 + i * STEP) / D.KX
                lat = D.LAT0 - (y0 + j * STEP) / D.KY
                tx, ty = D.tile_xy(lon, lat)
                key = (int(tx), int(ty))
                if key not in tiles:
                    tiles[key] = D.fetch(cache, *key)
                t = tiles[key]
                if t is None:
                    continue
                u, v = (tx % 1) * 256 - 0.5, (ty % 1) * 256 - 0.5
                a, b = min(254, max(0, int(u))), min(254, max(0, int(v)))
                f, g = min(1, max(0, u - a)), min(1, max(0, v - b))
                H[j, i] = (t[b, a] * (1 - f) + t[b, a + 1] * f) * (1 - g) + (t[b + 1, a] * (1 - f) + t[b + 1, a + 1] * f) * g
        rel = np.clip(H - D.LAKE, 0, TOP)
        q = np.round(255 * rel / TOP).astype(np.uint8)
        out.append({'x0': round(x0), 'y0': round(y0), 'step': STEP, 'w': w, 'h': h, 'top': TOP, 'd': base64.b64encode(q.tobytes()).decode()})
        print(f'  島 {len(out)}：{w}×{h}マス  最高 {rel.max():.0f}m（水面から）')
    (r / 'data/isles.json').write_text(json.dumps(out, separators=(',', ':')))
    print(f'data/isles.json  島 {len(out)}  {(r / "data/isles.json").stat().st_size // 1024}KB')


if __name__ == '__main__':
    main()
