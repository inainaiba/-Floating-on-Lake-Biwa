"""岸近くの細かい地形（data/near.json）を国土地理院の標高タイルから作る。

  python3 tools/near.py [タイルを置くフォルダ]

- 周囲の地形（data/dem.json）は200m間隔。岸から陸へ約2kmの帯だけ、30m間隔の細かい高さを足す
- 地理院タイル「標高タイル（dem_png）」のズーム14（約10m）を5×5の画素でならしてから拾い、200mの地形との差を持つ
- 差は4ビット：0の近くは細かく、大きな差は粗く刻む16段（LEVELS。-48〜+64m）。帯を960m四方の区画（32×32マス）に分け、帯にかかる区画だけを書き出す
- 作品の中では、カメラのまわりの地形だけをこの細かさで描き、家や木もこの高さに置く（16-terrain.js）
"""
import base64, json, math, struct, sys
from pathlib import Path

import numpy as np
from shapely.geometry import Polygon, box

sys.path.insert(0, str(Path(__file__).resolve().parent))
import dem as D

r = Path(__file__).resolve().parent.parent
STEP, BS, BAND, Z = 30, 32, 2200, 14
LEVELS = np.array([-48, -32, -21, -13, -8, -4, -2, 0, 2, 4, 8, 13, 21, 32, 48, 64])  # 16-terrain.js の NEAR_LV と同じ


def coarse(dm, x, y):
    """data/dem.json の高さ（16-terrain.js の landH と同じ補間）"""
    u = np.clip((x - dm['x0']) / dm['step'], 0, dm['w'] - 1.001)
    v = np.clip((y - dm['y0']) / dm['step'], 0, dm['h'] - 1.001)
    i, j = np.floor(u).astype(int), np.floor(v).astype(int)
    f, g = u - i, v - j
    q = lambda a, b: (dm['a'][b, a] / 255) ** 2
    return dm['top'] * ((q(i, j) * (1 - f) + q(i + 1, j) * f) * (1 - g) + (q(i, j + 1) * (1 - f) + q(i + 1, j + 1) * f) * g)


def main():
    cache = Path(sys.argv[1] if len(sys.argv) > 1 else r / 'tools/.dem_cache')
    cache.mkdir(parents=True, exist_ok=True)
    D.Z = Z
    dm = json.loads((r / 'data/dem.json').read_text())
    dm['a'] = np.frombuffer(base64.b64decode(dm['d']), np.uint8).reshape(dm['h'], dm['w']).astype(float)
    L = json.loads((r / 'data/lake.json').read_text())
    lake = Polygon(L['outer'])
    band = lake.buffer(BAND).difference(lake.buffer(-50))
    bw = STEP * BS
    x0 = math.floor(band.bounds[0] / bw) * bw
    y0 = math.floor(band.bounds[1] / bw) * bw
    nbx = int((band.bounds[2] - x0) / bw) + 1
    nby = int((band.bounds[3] - y0) / bw) + 1
    tiles, idx, data = {}, [], []

    def fine(xs, ys):
        out = np.zeros(xs.shape)
        for k, (x, y) in enumerate(zip(xs.ravel(), ys.ravel())):
            tx, ty = D.tile_xy(D.LON0 + x / D.KX, D.LAT0 - y / D.KY)
            key = (int(tx), int(ty))
            if key not in tiles:
                t = D.fetch(cache, *key)
                if t is not None:  # 5×5の画素でならす（約50m。30m間隔で拾うときの細かすぎるちらつきを防ぐ）
                    c = np.cumsum(np.cumsum(np.pad(t, ((3, 2), (3, 2)), mode='edge'), 0), 1)
                    t = (c[5:, 5:] - c[:-5, 5:] - c[5:, :-5] + c[:-5, :-5]) / 25
                tiles[key] = t
            t = tiles[key]
            if t is None:
                continue
            u, v = min(254.999, max(0, (tx % 1) * 256 - 0.5)), min(254.999, max(0, (ty % 1) * 256 - 0.5))
            a, b = int(u), int(v)
            f, g = u - a, v - b
            out.flat[k] = (t[b, a] * (1 - f) + t[b, a + 1] * f) * (1 - g) + (t[b + 1, a] * (1 - f) + t[b + 1, a + 1] * f) * g
        return np.clip(out - D.LAKE, 0, None)

    for bj in range(nby):
        for bi in range(nbx):
            bx0, by0 = x0 + bi * bw, y0 + bj * bw
            if not band.intersects(box(bx0, by0, bx0 + bw, by0 + bw)):
                continue
            xs, ys = np.meshgrid(bx0 + np.arange(BS) * STEP, by0 + np.arange(BS) * STEP)
            res = fine(xs, ys) - coarse(dm, xs, ys)
            q = np.abs(res[..., None] - LEVELS).argmin(-1).astype(np.uint8)  # いちばん近い段の番号（0〜15）
            if not (q != 7).any():  # 差がない（段の7＝0m）区画は省く
                continue
            idx.append((bi, bj))
            flat = q.ravel()
            data.append(bytes((flat[0::2] << 4) | flat[1::2]))
    out = {'lv': LEVELS.tolist(), 'x0': x0, 'y0': y0, 'step': STEP, 'bs': BS, 'nbx': nbx, 'nby': nby,
           'idx': base64.b64encode(b''.join(struct.pack('<HH', i, j) for i, j in idx)).decode(),
           'd': base64.b64encode(b''.join(data)).decode()}
    (r / 'data/near.json').write_text(json.dumps(out, separators=(',', ':')))
    print(f'data/near.json  区画 {len(idx)}（{STEP}m間隔・{BS}×{BS}マス）  {(r / "data/near.json").stat().st_size // 1024}KB')


if __name__ == '__main__':
    main()
