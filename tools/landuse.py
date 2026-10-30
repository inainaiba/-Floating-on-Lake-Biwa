"""田・畑・森の場所（data/landuse.json）を国土地理院のベクトルタイルの地図記号から作る。

  python3 tools/landuse.py [タイルを置くフォルダ]

- 地理院タイル「ベクトルタイル（experimental_bvmap）」のズーム14の地図記号（symbol）のうち、植生の記号を、岸から4km以内で集める
  6311 田・6312 畑・6321 広葉樹林・6322 針葉樹林・6323 竹林（種類の番号 0〜4）
- 1点5バイト（種類 uint8、x/10・y/10 は int16。作品の座標の実寸m）を base64 で書き出す
- 田は田の区画を置く場所に、森の記号はいちばん近い記号で木の種類を決めるのに使う（23-paddies.js・26-forests.js）
"""
import base64, concurrent.futures as cf, json, math, struct, sys, urllib.request
from pathlib import Path

import mapbox_vector_tile as mvt
from shapely import contains_xy
from shapely.geometry import Polygon

r = Path(__file__).resolve().parent.parent
LAT0, LON0 = 35.25, 136.08
KX, KY = 111320 * math.cos(math.radians(LAT0)), 110540
Z, BAND = 14, 4000
CODES = {6311: 0, 6312: 1, 6321: 2, 6322: 3, 6323: 4}


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
    for f in mvt.decode(fn.read_bytes(), default_options={'y_coord_down': True}).get('symbol', {}).get('features', []):
        k = CODES.get(f['properties'].get('ftCode'))
        if k is None or f['geometry']['type'] != 'Point':
            continue
        px, py = f['geometry']['coordinates']
        if not (0 <= px < 4096 and 0 <= py < 4096):
            continue  # 隣のタイルと重なる縁の記号は、そちらで拾う
        lon = (x + px / 4096) / 2**Z * 360 - 180
        lat = math.degrees(math.atan(math.sinh(math.pi - 2 * math.pi * (y + py / 4096) / 2**Z)))
        out.append((k, (lon - LON0) * KX, (LAT0 - lat) * KY))
    return out


def main():
    cache = Path(sys.argv[1] if len(sys.argv) > 1 else r / 'tools/.bv_cache')
    cache.mkdir(parents=True, exist_ok=True)
    L = json.loads((r / 'data/lake.json').read_text())
    lake = Polygon(L['outer']).buffer(0)  # 座標を整数に丸めた湖岸線は、所々で自分と交わることがあるので直す
    band = lake.buffer(BAND).difference(lake)
    minx, miny, maxx, maxy = band.bounds
    (x0, y0), (x1, y1) = tile_xy(LON0 + minx / KX, LAT0 - miny / KY), tile_xy(LON0 + maxx / KX, LAT0 - maxy / KY)
    jobs = [(x, y) for x in range(int(x0), int(x1) + 1) for y in range(int(y0), int(y1) + 1)]
    with cf.ThreadPoolExecutor(8) as ex:
        pts = [p for t in ex.map(lambda q: fetch(cache, *q), jobs) for p in t]
    pts = [p for p in pts if contains_xy(band, p[1], p[2])]
    b = b''.join(struct.pack('<Bhh', k, round(x / 10), round(y / 10)) for k, x, y in pts)
    (r / 'data/landuse.json').write_text(json.dumps({'n': len(pts), 'd': base64.b64encode(b).decode()}, separators=(',', ':')))
    names = ['田', '畑', '広葉樹林', '針葉樹林', '竹林']
    print('data/landuse.json  ' + '・'.join(f'{names[k]} {sum(1 for p in pts if p[0] == k)}' for k in range(5)) + f'  {(r / "data/landuse.json").stat().st_size // 1024}KB')


if __name__ == '__main__':
    main()
