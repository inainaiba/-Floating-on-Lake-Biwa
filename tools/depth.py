"""湖の深さ（data/depth.json）を国土地理院のベクトルタイルの等深線から作る。

  python3 tools/depth.py [タイルを置くフォルダ]

- 地理院タイル「ベクトルタイル（experimental_bvmap）」のズーム14の等深線（contour の ftCode 7371・7372、depth の値）を集める
- 湖岸線と島の輪郭（data/lake.json）を深さ0として加え、その間を三角形でつないで補間する（scipy の griddata）
- 作品の座標（北緯35.25°・東経136.08°が原点、x 東・y 南の実寸m）の200m間隔の格子に並べ、湖の外は0
- 1マス1バイト：v = round(255·√(d/TOP))。浅い所ほど細かく刻む（1mで約0.2m刻み、50mで約1.5m刻み）
- 使うには Python の mapbox-vector-tile・shapely・scipy が要る
"""
import base64, concurrent.futures as cf, json, math, sys, urllib.request
from pathlib import Path

import mapbox_vector_tile as mvt
import numpy as np
from scipy.interpolate import griddata
from shapely import contains_xy
from shapely.geometry import Polygon

r = Path(__file__).resolve().parent.parent
LAT0, LON0 = 35.25, 136.08
KX, KY = 111320 * math.cos(math.radians(LAT0)), 110540
Z, STEP, TOP = 14, 200, 110


def tile_xy(lon, lat):
    s = math.radians(lat)
    return (lon + 180) / 360 * 2**Z, (1 - math.log(math.tan(s) + 1 / math.cos(s)) / math.pi) / 2 * 2**Z


def to_xy(x, y, px, py):
    lon = (x + px / 4096) / 2**Z * 360 - 180
    lat = math.degrees(math.atan(math.sinh(math.pi - 2 * math.pi * (y + py / 4096) / 2**Z)))
    return (lon - LON0) * KX, (LAT0 - lat) * KY


def fetch(cache, x, y):
    fn = cache / f'{Z}_{x}_{y}.pbf'
    if not fn.exists():
        try:
            fn.write_bytes(urllib.request.urlopen(f'https://cyberjapandata.gsi.go.jp/xyz/experimental_bvmap/{Z}/{x}/{y}.pbf', timeout=30).read())
        except urllib.error.HTTPError as e:
            if e.code != 404:
                raise
            return []
    out = []
    for f in mvt.decode(fn.read_bytes(), default_options={'y_coord_down': True}).get('contour', {}).get('features', []):
        p = f['properties']
        if p.get('ftCode') not in (7371, 7372) or 'depth' not in p:
            continue
        g = f['geometry']
        for c in g['coordinates'] if g['type'] == 'MultiLineString' else [g['coordinates']] if g['type'] == 'LineString' else []:
            out += [(*to_xy(x, y, px, py), float(p['depth'])) for px, py in c]
    return out


def main():
    cache = Path(sys.argv[1] if len(sys.argv) > 1 else r / 'tools/.bv_cache')
    cache.mkdir(parents=True, exist_ok=True)
    L = json.loads((r / 'data/lake.json').read_text())
    lake = Polygon(L['outer'], L['islands']).buffer(0)
    minx, miny, maxx, maxy = lake.bounds
    (x0, y0), (x1, y1) = tile_xy(LON0 + minx / KX, LAT0 - miny / KY), tile_xy(LON0 + maxx / KX, LAT0 - maxy / KY)
    jobs = [(x, y) for x in range(int(x0), int(x1) + 1) for y in range(int(y0), int(y1) + 1)]
    with cf.ThreadPoolExecutor(8) as ex:
        pts = [p for t in ex.map(lambda q: fetch(cache, *q), jobs) for p in t]
    pts = [p for p in pts if contains_xy(lake, p[0], p[1])]
    # 岸（深さ0）：湖岸線と島の輪郭を50mごとに
    shore = []
    for ring in [L['outer'], *L['islands']]:
        for (ax, ay), (bx, by) in zip(ring, ring[1:]):
            n = max(1, int(math.hypot(bx - ax, by - ay) / 50))
            shore += [(ax + (bx - ax) * k / n, ay + (by - ay) * k / n, 0.0) for k in range(n)]
    P = np.array(pts + shore)
    gx0, gy0 = math.floor(minx / STEP) * STEP, math.floor(miny / STEP) * STEP
    w, h = int((maxx - gx0) / STEP) + 2, int((maxy - gy0) / STEP) + 2
    GX, GY = np.meshgrid(gx0 + np.arange(w) * STEP, gy0 + np.arange(h) * STEP)
    D = griddata(P[:, :2], P[:, 2], (GX, GY), method='linear')
    D = np.where(contains_xy(lake, GX, GY), np.nan_to_num(D), 0)
    q = np.round(255 * np.sqrt(np.clip(D, 0, TOP) / TOP)).astype(np.uint8)
    out = {'x0': gx0, 'y0': gy0, 'step': STEP, 'w': w, 'h': h, 'top': TOP, 'd': base64.b64encode(q.tobytes()).decode()}
    (r / 'data/depth.json').write_text(json.dumps(out, separators=(',', ':')))
    print(f'data/depth.json  {w}×{h}マス（{STEP}m）  等深線の点 {len(pts)}  最深 {D.max():.0f}m  {len(out["d"]) // 1024}KB')


if __name__ == '__main__':
    main()
