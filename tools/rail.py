"""湖西線の線路（data/rail.json）を国土地理院のベクトルタイルから作る。

  python3 tools/rail.py [タイルを置くフォルダ]

- 地理院タイル「ベクトルタイル（experimental_bvmap）」のズーム13の鉄道（railway）から、湖西線（路線コード 40201000069）を取り出す
- タイルの境目で切れた断片を南から北へつなぎ、比叡山坂本の北（北緯35.07°）からマキノの北（35.475°）までを残す
- 25mより細かい曲がりは省いて、経度・緯度の列として書き出す
- トンネルの区間（railState 100）は tunnels に、経度・緯度の列の列として別に書き出す（高架と電車を描かず、地図では破線にする）
- 使うには Python の mapbox-vector-tile と shapely が要る
"""
import concurrent.futures as cf, json, math, sys, urllib.request
from pathlib import Path

import mapbox_vector_tile as mvt
from shapely.geometry import LineString, MultiLineString
from shapely.ops import linemerge

r = Path(__file__).resolve().parent.parent
LAT0, LON0 = 35.25, 136.08
KX, KY = 111320 * math.cos(math.radians(LAT0)), 110540
Z, CODE, LAT_S, LAT_N = 13, '40201000069', 35.07, 35.475


def tile_xy(lon, lat):
    s = math.radians(lat)
    return (lon + 180) / 360 * 2**Z, (1 - math.log(math.tan(s) + 1 / math.cos(s)) / math.pi) / 2 * 2**Z


def fetch(cache, x, y, tunnel=False):
    fn = cache / f'{Z}_{x}_{y}.pbf'
    if not fn.exists():
        try:
            fn.write_bytes(urllib.request.urlopen(f'https://cyberjapandata.gsi.go.jp/xyz/experimental_bvmap/{Z}/{x}/{y}.pbf', timeout=30).read())
        except urllib.error.HTTPError as e:
            if e.code != 404:
                raise
            return []
    out = []
    for f in mvt.decode(fn.read_bytes(), default_options={'y_coord_down': True}).get('railway', {}).get('features', []):
        if f['properties'].get('rtCode1') != CODE or tunnel and f['properties'].get('railState') != 100:
            continue
        g = f['geometry']
        for c in g['coordinates'] if g['type'] == 'MultiLineString' else [g['coordinates']] if g['type'] == 'LineString' else []:
            pts = []
            for px, py in c:
                lon = (x + px / 4096) / 2**Z * 360 - 180
                n = math.pi - 2 * math.pi * (y + py / 4096) / 2**Z
                lat = math.degrees(math.atan(math.sinh(n)))
                pts.append(((lon - LON0) * KX, (LAT0 - lat) * KY))  # 作品の座標（x 東・y 南の実寸m）
            if len(pts) > 1:
                out.append(pts)
    return out


def chain(fr):
    """断片を南（y が大きい側）から順につなぐ。並行する側線（すでに通った所へ戻る断片）は飛ばす"""
    D = lambda a, b: math.hypot(a[0] - b[0], a[1] - b[1])
    i0 = max(range(len(fr)), key=lambda i: max(p[1] for p in fr[i]))
    f = fr[i0]
    path, used = list(f if f[0][1] > f[-1][1] else f[::-1]), {i0}
    while True:
        e, best = path[-1], None
        for i, g in enumerate(fr):
            if i in used:
                continue
            for gg in (g, g[::-1]):
                d = D(e, gg[0])
                if d < 1500 and (best is None or d < best[0]):
                    best = (d, i, gg)
        if not best:
            return path
        used.add(best[1])
        if min(D(best[2][-1], p) for p in path[-200:]) < 30:
            continue
        path += best[2] if best[0] > 1 else best[2][1:]


def main():
    cache = Path(sys.argv[1] if len(sys.argv) > 1 else r / 'tools/.bv_cache')
    cache.mkdir(parents=True, exist_ok=True)
    (x0, y0), (x1, y1) = tile_xy(135.82, 35.58), tile_xy(136.25, 34.98)
    jobs = [(x, y) for x in range(int(x0), int(x1) + 1) for y in range(int(y0), int(y1) + 1)]
    with cf.ThreadPoolExecutor(8) as ex:
        fr = [s for t in ex.map(lambda p: fetch(cache, *p), jobs) for s in t]
    path = chain(fr)
    ys, yn = (LAT0 - LAT_S) * KY, (LAT0 - LAT_N) * KY
    path = [p for p in path if yn <= p[1] <= ys]
    line = LineString(path).simplify(25)
    LL = lambda c: [[round(LON0 + x / KX, 5), round(LAT0 - y / KY, 5)] for x, y in c]
    with cf.ThreadPoolExecutor(8) as ex:
        tn = [s for t in ex.map(lambda p: fetch(cache, *p, tunnel=True), jobs) for s in t]
    tn = linemerge(MultiLineString(tn))
    tn = [g.simplify(10) for g in getattr(tn, 'geoms', [tn]) if g.length > 30 and any(yn <= y <= ys for x, y in g.coords)]
    out = {'kosei': LL(line.coords), 'tunnels': [LL(g.coords) for g in tn]}
    (r / 'data/rail.json').write_text(json.dumps(out, separators=(',', ':')))
    print(f'data/rail.json  湖西線 {len(out["kosei"])}点・{line.length / 1000:.1f}km、トンネル {len(tn)}か所・{sum(g.length for g in tn) / 1000:.1f}km')


if __name__ == '__main__':
    main()
