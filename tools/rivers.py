"""陸の川と池（data/rivers.json）を国土地理院のベクトルタイルの水域から作る。

  python3 tools/rivers.py [タイルを置くフォルダ]

- 地理院タイル「ベクトルタイル（experimental_bvmap）」のズーム13の水域（waterarea）を、湖のまわり約15kmまで集める
- タイルの境で切れた水域をつなぎ、琵琶湖（湖岸線の外へ20m広げたもの）を除いて、陸の川・池・内湖の水面だけを残す
- 湖から12km以内。平均の幅が15mより細い流れ（作品の縮尺では見えない）と5000㎡より小さい池は省き、海（若狭湾）も除く
- 20mより細かい曲がりは省く。作品の座標（x 東・y 南の実寸m）の多角形（外周と穴）の列
- 使うには Python の mapbox-vector-tile と shapely が要る
"""
import concurrent.futures as cf, json, math, sys, urllib.request
from pathlib import Path

import mapbox_vector_tile as mvt
from shapely.geometry import Polygon, box
from shapely.ops import unary_union

r = Path(__file__).resolve().parent.parent
LAT0, LON0 = 35.25, 136.08
KX, KY = 111320 * math.cos(math.radians(LAT0)), 110540
Z, MIN_AREA, SIMPLIFY, MIN_W, NEAR = 13, 5000, 20, 15, 12000


def tile_xy(lon, lat):
    s = math.radians(lat)
    return (lon + 180) / 360 * 2**Z, (1 - math.log(math.tan(s) + 1 / math.cos(s)) / math.pi) / 2 * 2**Z


def fetch(cache, x, y):
    fn = cache / f'{Z}_{x}_{y}.pbf'
    if not fn.exists():
        try:
            fn.write_bytes(urllib.request.urlopen(f'https://cyberjapandata.gsi.go.jp/xyz/experimental_bvmap/{Z}/{x}/{y}.pbf', timeout=30).read())
        except urllib.error.HTTPError as e:
            if e.code != 404:
                raise
            return []
    def P(px, py):
        lon = (x + px / 4096) / 2**Z * 360 - 180
        lat = math.degrees(math.atan(math.sinh(math.pi - 2 * math.pi * (y + py / 4096) / 2**Z)))
        return (lon - LON0) * KX, (LAT0 - lat) * KY
    out = []
    for f in mvt.decode(fn.read_bytes(), default_options={'y_coord_down': True}).get('waterarea', {}).get('features', []):
        g = f['geometry']
        for poly in g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']] if g['type'] == 'Polygon' else []:
            try:
                q = Polygon([P(*c) for c in poly[0]], [[P(*c) for c in h] for h in poly[1:]]).buffer(0)
            except Exception:
                continue
            if not q.is_empty:
                # タイルの外へはみ出した縁を切る（隣のタイルとつなぐため、少しだけ重ねて残す）
                (ax, ay), (bx, by) = P(-8, 4104), P(4104, -8)
                out.append(q.intersection(box(min(ax, bx), min(ay, by), max(ax, bx), max(ay, by))))
    return out


def _ll_box(lo0, la0, lo1, la1):
    xa, ya, xb, yb = (lo0 - LON0) * KX, (LAT0 - la1) * KY, (lo1 - LON0) * KX, (LAT0 - la0) * KY
    return min(xa, xb), min(ya, yb), max(xa, xb), max(ya, yb)


def main():
    cache = Path(sys.argv[1] if len(sys.argv) > 1 else r / 'tools/.bv_cache')
    cache.mkdir(parents=True, exist_ok=True)
    L = json.loads((r / 'data/lake.json').read_text())
    lake = Polygon(L['outer']).buffer(20)
    (x0, y0), (x1, y1) = tile_xy(135.75, 35.62), tile_xy(136.45, 34.88)
    jobs = [(x, y) for x in range(int(x0), int(x1) + 1) for y in range(int(y0), int(y1) + 1)]
    with cf.ThreadPoolExecutor(8) as ex:
        polys = [p for t in ex.map(lambda q: fetch(cache, *q), jobs) for p in t]
    # 細い流れを先に除く：幅の半分（7.5m）だけ縮めて消える所を落とし、戻す（太い川・池・内湖が残る）
    water = unary_union([p.buffer(3) for p in polys]).buffer(-3 - MIN_W / 2).buffer(MIN_W / 2)
    water = water.difference(lake).intersection(Polygon(L['outer']).buffer(NEAR))
    sea = box(*_ll_box(135.6, 35.52, 136.0, 35.75))  # 若狭湾（小浜・敦賀の海）
    water = water.difference(sea)
    keep = []
    for g in getattr(water, 'geoms', [water]):
        if g.geom_type != 'Polygon' or g.area < MIN_AREA:
            continue
        s = g.simplify(SIMPLIFY)
        for part in getattr(s, 'geoms', [s]):
            if part.geom_type == 'Polygon' and part.area >= MIN_AREA:
                keep.append([[[round(x), round(y)] for x, y in part.exterior.coords]]
                            + [[[round(x), round(y)] for x, y in h.coords] for h in part.interiors if Polygon(h).area > 2000])
    keep.sort(key=lambda p: -Polygon(p[0]).area)
    (r / 'data/rivers.json').write_text(json.dumps(keep, separators=(',', ':')))
    area = sum(Polygon(p[0]).area for p in keep) / 1e6
    print(f'data/rivers.json  水域 {len(keep)}  計 {area:.1f}km²  {(r / "data/rivers.json").stat().st_size // 1024}KB')


if __name__ == '__main__':
    main()
