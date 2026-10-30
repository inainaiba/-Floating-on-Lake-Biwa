"""港の点（data/lake.json の ports）を、地理院の湖岸線と注記に合わせて整える。

  python3 tools/ports.py [タイルを置くフォルダ]

- 地理院タイル「ベクトルタイル（experimental_bvmap）」のズーム14の注記（label）のうち、港の名前（annoCtg 431）を湖のまわりで集める
  （地理院の注記にある港は、彦根港・大津港・竹生島港・長浜港などの大きな港だけ）
- OpenStreetMap から作った港（tools/prep.py）は、湖岸線（tools/shore.py。地理院の水涯線）から400mより離れたもの（内陸の寺や内湖の舟着き場など）を除く
- 地理院の注記の港は、その位置を使う（同じ港が OpenStreetMap にあれば1つにまとめ、名前は地理院のもの）
- どの港も、湖岸線のいちばん近い所から15m湖の側へ寄せる（地図の点と、船の出入りする所）
"""
import concurrent.futures as cf, json, math, sys, urllib.request
from pathlib import Path

import mapbox_vector_tile as mvt
from shapely.geometry import Point, Polygon
from shapely.ops import nearest_points

r = Path(__file__).resolve().parent.parent
LAT0, LON0 = 35.25, 136.08
KX, KY = 111320 * math.cos(math.radians(LAT0)), 110540
Z, NEAR, MERGE, IN = 14, 400, 800, 15


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
    out = []
    for f in mvt.decode(fn.read_bytes(), default_options={'y_coord_down': True}).get('label', {}).get('features', []):
        p = f['properties']
        if p.get('annoCtg') != 431 or f['geometry']['type'] != 'Point':
            continue
        px, py = f['geometry']['coordinates']
        lon = (x + px / 4096) / 2**Z * 360 - 180
        lat = math.degrees(math.atan(math.sinh(math.pi - 2 * math.pi * (y + py / 4096) / 2**Z)))
        out.append((str(p.get('knj', '')), (lon - LON0) * KX, (LAT0 - lat) * KY))
    return out


def main():
    cache = Path(sys.argv[1] if len(sys.argv) > 1 else r / 'tools/.bv_cache')
    cache.mkdir(parents=True, exist_ok=True)
    L = json.loads((r / 'data/lake.json').read_text())
    lake = Polygon(L['outer'], L['islands']).buffer(0)
    minx, miny, maxx, maxy = lake.buffer(NEAR).bounds
    (x0, y0), (x1, y1) = tile_xy(LON0 + minx / KX, LAT0 - miny / KY), tile_xy(LON0 + maxx / KX, LAT0 - maxy / KY)
    jobs = [(x, y) for x in range(int(x0), int(x1) + 1) for y in range(int(y0), int(y1) + 1)]
    with cf.ThreadPoolExecutor(8) as ex:
        gsi = {n: (x, y) for t in ex.map(lambda q: fetch(cache, *q), jobs) for n, x, y in t}
    gsi = {n: p for n, p in gsi.items() if lake.boundary.distance(Point(p)) < NEAR}
    old = [p for p in L['ports'] if lake.boundary.distance(Point(p[0], p[1])) < NEAR]
    dropped = [p[2] or '（名前なし）' for p in L['ports'] if p not in old]
    ports = [[x, y, n] for n, (x, y) in gsi.items()]
    for x, y, n in old:
        if not any(math.hypot(x - q[0], y - q[1]) < MERGE for q in ports):
            ports.append([x, y, n])
    inner = lake.buffer(-IN)
    snap = lambda x, y: nearest_points(inner, Point(x, y))[0]
    L['ports'] = [[round(q.x), round(q.y), n] for x, y, n in ports for q in [snap(x, y)]]
    (r / 'data/lake.json').write_text(json.dumps(L, ensure_ascii=False, separators=(',', ':')))
    print(f'港 {len(L["ports"])}（地理院の注記 {len(gsi)}：{"・".join(gsi)}）。除いたもの：{"・".join(dropped) or "なし"}')


if __name__ == '__main__':
    main()
