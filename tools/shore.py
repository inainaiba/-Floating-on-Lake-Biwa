"""湖岸線と島（data/lake.json の outer・islands）を国土地理院のベクトルタイルの水域から作り直す。

  python3 tools/shore.py [タイルを置くフォルダ]

- 地理院タイル「ベクトルタイル（experimental_bvmap）」のズーム14の水域（waterarea）を、湖のまわりで集めてつなぐ
- 幅60mより細い水路は切り（内湖が本湖とつながらないように）、いちばん大きな水面を琵琶湖とする
- 島は琵琶湖の中の穴で、1ha以上のもの（多景島も入る）
- 15mより細かい曲がりは省く。港・橋・川・灯台など（OpenStreetMap から作ったもの）はそのまま残す
- 河口（mouths：濁りの出る所）だけは、新しい湖岸線のいちばん近い所から40m沖へ寄せる（古い湖岸線のままだと陸に出てしまう）
- このあと tools/data.py で、湖岸線を使うデータ（島の高さ・岸近くの地形・川・家並み・深さ）を作り直す
"""
import concurrent.futures as cf, json, math, sys, urllib.request
from pathlib import Path

import mapbox_vector_tile as mvt
from shapely.geometry import Point, Polygon, box
from shapely.ops import nearest_points, unary_union

r = Path(__file__).resolve().parent.parent
LAT0, LON0 = 35.25, 136.08
KX, KY = 111320 * math.cos(math.radians(LAT0)), 110540
Z, CUT, SIMPLIFY, ISLE_MIN = 14, 30, 15, 10000


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
    (ax, ay), (bx, by) = P(-8, 4104), P(4104, -8)
    clip = box(min(ax, bx), min(ay, by), max(ax, bx), max(ay, by))
    out = []
    for f in mvt.decode(fn.read_bytes(), default_options={'y_coord_down': True}).get('waterarea', {}).get('features', []):
        g = f['geometry']
        for poly in g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']] if g['type'] == 'Polygon' else []:
            try:
                q = Polygon([P(*c) for c in poly[0]], [[P(*c) for c in h] for h in poly[1:]]).buffer(0)
            except Exception:
                continue
            if not q.is_empty:
                out.append(q.simplify(3).intersection(clip))  # 先に3mで粗くしてから集める（つなぐ計算を軽く）
    return out


def snap_mouths(L):
    lake = Polygon(L['outer'], L['islands']).buffer(0)
    inner = lake.buffer(-40)
    L['mouths'] = [[round(q.x), round(q.y)] for q in (nearest_points(inner, Point(x, y))[0] for x, y in L['mouths'])]


def main():
    cache = Path(sys.argv[1] if len(sys.argv) > 1 else r / 'tools/.bv_cache')
    cache.mkdir(parents=True, exist_ok=True)
    L = json.loads((r / 'data/lake.json').read_text())
    old = Polygon(L['outer'])
    minx, miny, maxx, maxy = old.buffer(1500).bounds
    (x0, y0), (x1, y1) = tile_xy(LON0 + minx / KX, LAT0 - miny / KY), tile_xy(LON0 + maxx / KX, LAT0 - maxy / KY)
    jobs = [(x, y) for x in range(int(x0), int(x1) + 1) for y in range(int(y0), int(y1) + 1)]
    with cf.ThreadPoolExecutor(8) as ex:
        polys = [p for t in ex.map(lambda q: fetch(cache, *q), jobs) for p in t]
    # 古い湖岸線の近く（外へ1.5km）の水域だけをつなぐ（遠くの池まで含めると、つなぐ計算がとても重い）
    near = old.buffer(1500)
    polys = [p for p in polys if p.intersects(near)]
    water = unary_union(polys)
    # 細い水路を切ってから、古い湖岸線といちばん重なる水面を琵琶湖とする
    opened = water.buffer(-CUT).buffer(CUT)
    parts = list(getattr(opened, 'geoms', [opened]))
    lake = max(parts, key=lambda g: g.intersection(old).area)
    lake = lake.simplify(SIMPLIFY)
    outer = [[round(x), round(y)] for x, y in lake.exterior.coords]
    isl = [[[round(x), round(y)] for x, y in h.coords] for h in lake.interiors if Polygon(h).area >= ISLE_MIN]
    print(f'湖岸線 {len(L["outer"])}点 → {len(outer)}点、島 {len(L["islands"])} → {len(isl)}（面積 {old.area / 1e6:.1f} → {Polygon(outer).area / 1e6:.1f}km²）')
    L['outer'], L['islands'] = outer, isl
    snap_mouths(L)
    (r / 'data/lake.json').write_text(json.dumps(L, ensure_ascii=False, separators=(',', ':')))


if __name__ == '__main__':
    main()
