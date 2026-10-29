"""湖岸の家並みと道（data/towns.json）を国土地理院のベクトルタイルの建物・道路から作る。

  python3 tools/towns.py [タイルを置くフォルダ]

- 地理院タイル「ベクトルタイル（experimental_bvmap）」のズーム15の建物（building）と道路（road）を、岸から陸へ900mの帯で集める
- 作品では位置を1/5に縮めて家を実物大で描くので、実際の建物をすべて置くと重なる。岸に近い順に、ほかの家から
  62m（作品の中で約12m）以上離れた建物だけを選ぶ（集落の場所・広がり・家の向きは実際のまま）
- 家は 位置・幅・奥行き・向き・種類（実寸m。幅・奥行きは実際の建物の外接長方形）。種類 0 普通の建物、1 堅ろうな建物
- 道は道路の線を、幹線（幅5.5m以上）は選んだ家の300m以内、細い道（幅3m以上）は100m以内だけ残す
  （[幅の段, x1, y1, x2, y2, …]。座標は5m単位の整数。幅の段は地理院の rnkWidth）
- 南湖の街並み（47-city.js が描く、大津〜草津の岸）と島は除く
- 使うには Python の mapbox-vector-tile と shapely が要る
"""
import base64, concurrent.futures as cf, json, math, struct, sys, urllib.request
from pathlib import Path

import mapbox_vector_tile as mvt
from shapely import STRtree
from shapely.geometry import LineString, Point, Polygon, box

r = Path(__file__).resolve().parent.parent
LAT0, LON0 = 35.25, 136.08
KX, KY = 111320 * math.cos(math.radians(LAT0)), 110540
Z, BAND, NEAR, GAP, ROAD_NEAR = 15, 900, 60, 62, 300


def tile_xy(lon, lat):
    s = math.radians(lat)
    return (lon + 180) / 360 * 2**Z, (1 - math.log(math.tan(s) + 1 / math.cos(s)) / math.pi) / 2 * 2**Z


def to_xy(tx, ty):
    lon = tx / 2**Z * 360 - 180
    lat = math.degrees(math.atan(math.sinh(math.pi - 2 * math.pi * ty / 2**Z)))
    return (lon - LON0) * KX, (LAT0 - lat) * KY


def ll_box(lo0, la0, lo1, la1):
    (xa, ya), (xb, yb) = ((lo0 - LON0) * KX, (LAT0 - la1) * KY), ((lo1 - LON0) * KX, (LAT0 - la0) * KY)
    return box(min(xa, xb), min(ya, yb), max(xa, xb), max(ya, yb))


def fetch(cache, x, y):
    fn = cache / f'{Z}_{x}_{y}.pbf'
    if not fn.exists():
        try:
            fn.write_bytes(urllib.request.urlopen(f'https://cyberjapandata.gsi.go.jp/xyz/experimental_bvmap/{Z}/{x}/{y}.pbf', timeout=30).read())
        except urllib.error.HTTPError as e:
            if e.code != 404:
                raise
            return [], []
    d = mvt.decode(fn.read_bytes(), default_options={'y_coord_down': True})
    P = lambda px, py: to_xy(x + px / 4096, y + py / 4096)
    bl, rd = [], []
    for f in d.get('building', {}).get('features', []):
        g = f['geometry']
        for poly in g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']] if g['type'] == 'Polygon' else []:
            if len(poly[0]) >= 4:
                bl.append((Polygon([P(*c) for c in poly[0]]), f['properties'].get('ftCode')))
    for f in d.get('road', {}).get('features', []):
        p = f['properties']
        if p.get('rnkWidth', 0) < 1 or p.get('ftCode') not in (2701, 2703, 2704):
            continue
        g = f['geometry']
        for c in g['coordinates'] if g['type'] == 'MultiLineString' else [g['coordinates']] if g['type'] == 'LineString' else []:
            if len(c) > 1:
                rd.append((LineString([P(*q) for q in c]), p.get('rnkWidth', 1)))
    return bl, rd


def main():
    cache = Path(sys.argv[1] if len(sys.argv) > 1 else r / 'tools/.bv_cache')
    cache.mkdir(parents=True, exist_ok=True)
    L = json.loads((r / 'data/lake.json').read_text())
    lake = Polygon(L['outer'])
    city = ll_box(135.85, 34.95, 135.99, 35.035)  # 南湖の街並み（47-city.js）
    band = lake.buffer(BAND).difference(lake.buffer(NEAR)).difference(city)
    minx, miny, maxx, maxy = band.bounds
    (x0, y0), (x1, y1) = tile_xy(LON0 + minx / KX, LAT0 - miny / KY), tile_xy(LON0 + maxx / KX, LAT0 - maxy / KY)
    jobs = []
    for x in range(int(min(x0, x1)), int(max(x0, x1)) + 1):
        for y in range(int(min(y0, y1)), int(max(y0, y1)) + 1):
            (ax, ay), (bx, by) = to_xy(x, y), to_xy(x + 1, y + 1)
            if band.intersects(box(min(ax, bx), min(ay, by), max(ax, bx), max(ay, by))):
                jobs.append((x, y))
    with cf.ThreadPoolExecutor(8) as ex:
        res = list(ex.map(lambda q: fetch(cache, *q), jobs))
    blds = [b for bl, _ in res for b in bl]
    roads = [g for _, rd in res for g in rd]
    shore = lake.exterior
    # 岸に近い順に、間隔 GAP を保って選ぶ（同じ建物がタイルの境で二つに切れていても、近すぎるので一つになる）
    cand = []
    for poly, ft in blds:
        c = poly.centroid
        if not band.contains(c):
            continue
        cand.append((shore.distance(c), c.x, c.y, poly, ft))
    cand.sort(key=lambda t: t[0])
    cell, grid, keep = GAP, {}, []
    for dist, x, y, poly, ft in cand:
        i, j = int(x // cell), int(y // cell)
        if any(math.hypot(q[0] - x, q[1] - y) < GAP for a in (-1, 0, 1) for b in (-1, 0, 1) for q in grid.get((i + a, j + b), [])):
            continue
        rr = poly.minimum_rotated_rectangle
        cs = list(rr.exterior.coords) if rr.geom_type == 'Polygon' else [(x, y)] * 5
        e1, e2 = math.hypot(cs[1][0] - cs[0][0], cs[1][1] - cs[0][1]), math.hypot(cs[2][0] - cs[1][0], cs[2][1] - cs[1][1])
        rot = math.atan2(cs[1][1] - cs[0][1], cs[1][0] - cs[0][0])
        if e2 > e1:
            e1, e2, rot = e2, e1, rot + math.pi / 2
        rot = (rot + math.pi / 2) % math.pi - math.pi / 2
        keep.append([round(x), round(y), round(max(4, e1)), round(max(4, e2)), round(rot * 100), 1 if ft == 3102 else 0])
        grid.setdefault((i, j), []).append((x, y))
    # 道：選んだ家の近く（ROAD_NEAR m 以内）の部分だけ
    pts = STRtree([Point(b[0], b[1]) for b in keep])
    near = band.intersection(Polygon(L['outer']).buffer(BAND))
    out_r = []
    for g, rank in roads:
        g = g.intersection(near)
        for part in getattr(g, 'geoms', [g]):
            if part.geom_type != 'LineString' or part.length < 30:
                continue
            if not len(pts.query(part, predicate='dwithin', distance=ROAD_NEAR if rank >= 2 else 100)):
                continue
            s = part.simplify(10)
            out_r.append([rank] + [v for q in s.coords for v in (round(q[0] / 5), round(q[1] / 5))])
    # 書き出し：大きくなるので詰めた形（base64）にする。読み方は 20-villages-layout.js
    #   家 b：1軒8バイト（x/2, y/2 は int16、幅・奥行き m は uint8、向きは int8 で1/40ラジアン、種類 uint8）
    #   道 r：1本ごとに 幅の段 uint8・点の数 uint8、続けて点（5m単位の int16 の x, y）
    hb = b''.join(struct.pack('<hhBBbB', round(x / 2), round(y / 2), min(255, w), min(255, d), max(-127, min(127, round(rt / 100 * 40))), t) for x, y, w, d, rt, t in keep)
    rb = b''
    for rr in out_r:
        pts_ = rr[1:]
        for k in range(0, len(pts_) // 2 - 1, 250):  # 点が多い道は分ける（点の数は1バイト）
            seg = pts_[k * 2:(k + 251) * 2]
            rb += struct.pack('<BB', rr[0], len(seg) // 2) + struct.pack('<%dh' % len(seg), *seg)
    data = {'n': len(keep), 'b': base64.b64encode(hb).decode(), 'r': base64.b64encode(rb).decode()}
    (r / 'data/towns.json').write_text(json.dumps(data, separators=(',', ':')))
    print(f'data/towns.json  建物 {len(blds)} から家 {len(keep)}（堅ろう {sum(b[5] for b in keep)}）・道 {len(out_r)}本  {(r / "data/towns.json").stat().st_size // 1024}KB')


if __name__ == '__main__':
    main()
