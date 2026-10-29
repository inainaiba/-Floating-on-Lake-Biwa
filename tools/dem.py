"""周囲の地形（data/dem.json）を国土地理院の標高タイルから作る。

  python3 tools/dem.py [タイルを置くフォルダ]

- 地理院タイル「標高タイル（dem_png）」のズーム12（約30m）を取り寄せ、作品の座標（北緯35.25°・東経136.08°が原点、
  x 東・y 南の実寸m）の200m間隔の格子に並べ直す。格子の範囲は湖の外形の外側26km（16-terrain.js の TM）まで
- 高さは琵琶湖の水面（基準水位 84.371m）からの高さ。水面より低い所（京都盆地の一部・敦賀湾の海など）は0にする
- 1マス1バイト：v = round(255·√(h/TOP))。低い土地ほど細かく（10mで約0.5m刻み）、山の上は粗く（1000mで約6m刻み）
- タイルが無い所（海）は0
"""
import base64, concurrent.futures as cf, io, json, math, os, sys, urllib.request
from pathlib import Path

import numpy as np
from PIL import Image

r = Path(__file__).resolve().parent.parent
LAT0, LON0 = 35.25, 136.08
KX, KY = 111320 * math.cos(math.radians(LAT0)), 110540
TM, STEP, Z, LAKE, TOP = 26000, 200, 12, 84.371, 1500


def tile_xy(lon, lat):
    s = math.radians(lat)
    return (lon + 180) / 360 * 2**Z, (1 - math.log(math.tan(s) + 1 / math.cos(s)) / math.pi) / 2 * 2**Z


def fetch(cache, x, y):
    fn = cache / f'{Z}_{x}_{y}.png'
    if not fn.exists():
        try:
            fn.write_bytes(urllib.request.urlopen(f'https://cyberjapandata.gsi.go.jp/xyz/dem_png/{Z}/{x}/{y}.png', timeout=30).read())
        except urllib.error.HTTPError as e:
            if e.code != 404:
                raise
            return None  # 海などでタイルが無い
    a = np.asarray(Image.open(fn).convert('RGB')).astype(np.int64)
    v = (a[..., 0] << 16) + (a[..., 1] << 8) + a[..., 2]
    h = np.where(v < 2**23, v, v - 2**24) * 0.01
    return np.where(v == 2**23, 0.0, h)  # 無効値（海）は0m


def main():
    cache = Path(sys.argv[1] if len(sys.argv) > 1 else r / 'tools/.dem_cache')
    cache.mkdir(parents=True, exist_ok=True)
    outer = json.loads((r / 'data/lake.json').read_text())['outer']
    xs, ys = [p[0] for p in outer], [p[1] for p in outer]
    x0, y0 = min(xs) - TM - STEP, min(ys) - TM - STEP
    w, h = int((max(xs) + TM - x0) / STEP) + 2, int((max(ys) + TM - y0) / STEP) + 2
    lon = LON0 + (x0 + np.arange(w) * STEP) / KX
    lat = LAT0 - (y0 + np.arange(h) * STEP) / KY
    (ta, tb), (tc, td) = tile_xy(lon[0], lat[0]), tile_xy(lon[-1], lat[-1])
    TX0, TX1, TY0, TY1 = int(ta) - 1, int(tc) + 1, int(tb) - 1, int(td) + 1
    mos = np.zeros(((TY1 - TY0 + 1) * 256, (TX1 - TX0 + 1) * 256))
    jobs = [(x, y) for x in range(TX0, TX1 + 1) for y in range(TY0, TY1 + 1)]
    with cf.ThreadPoolExecutor(8) as ex:
        for (x, y), t in zip(jobs, ex.map(lambda p: fetch(cache, *p), jobs)):
            if t is not None:
                mos[(y - TY0) * 256:(y - TY0 + 1) * 256, (x - TX0) * 256:(x - TX0 + 1) * 256] = t
    # 200mのマスにならす：30mの画素を7×7で平均してから、マスの中心で補間して拾う
    k = 7
    c = np.cumsum(np.cumsum(np.pad(mos, ((k // 2 + 1, k // 2), (k // 2 + 1, k // 2)), mode='edge'), 0), 1)
    box = (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)
    px = np.array([tile_xy(a, lat[0])[0] for a in lon]) - TX0
    py = np.array([tile_xy(lon[0], b)[1] for b in lat]) - TY0
    u, v = px * 256 - 0.5, py * 256 - 0.5
    i, j = np.floor(u).astype(int), np.floor(v).astype(int)
    f, g = (u - i)[None, :], (v - j)[:, None]
    I, J = i[None, :], j[:, None]
    H = (box[J, I] * (1 - f) * (1 - g) + box[J, I + 1] * f * (1 - g)
         + box[J + 1, I] * (1 - f) * g + box[J + 1, I + 1] * f * g)
    rel = np.clip(H - LAKE, 0, TOP)
    q = np.round(255 * np.sqrt(rel / TOP)).astype(np.uint8)
    out = {'x0': round(x0), 'y0': round(y0), 'step': STEP, 'w': w, 'h': h, 'top': TOP,
           'd': base64.b64encode(q.tobytes()).decode()}
    (r / 'data/dem.json').write_text(json.dumps(out, separators=(',', ':')))
    print(f'data/dem.json  {w}×{h}マス（{STEP}m）  最高 {rel.max():.0f}m（水面から）  {len(out["d"]) // 1024}KB')


if __name__ == '__main__':
    main()
