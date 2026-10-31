"""湖西線と、対岸の琵琶湖線（東海道本線・北陸本線）の線路と駅（data/rail.json）を国土地理院のベクトルタイルから作る。

  python3 tools/rail.py [タイルを置くフォルダ]

- 地理院タイル「ベクトルタイル（experimental_bvmap）」のズーム13の鉄道（railway）から、路線コードで取り出す
  ・湖西線（40201000069）：大津の西の山（山科へのトンネル、東経135.845°）からマキノの北（35.475°）まで
  ・琵琶湖線：東海道本線（40201000126）の大津の西の山（逢坂山トンネル）から米原までと、北陸本線（40201000171。一部は 40201800001）の米原から近江塩津まで
    （新幹線は別の路線コードなので入らない）
- タイルの境目で切れた断片を南からつなぎ、25mより細かい曲がりは省いて、経度・緯度の列として書き出す
- トンネルの区間（railState 100）は経度・緯度の列の列として別に書き出す（高架と電車を描かず、地図では破線にする）
- 駅（staCode のある区間）は、ホームの中ほどの経度・緯度と、ズーム14の注記の「〜駅」の名前（電車が止まり、ホームの灯りを置く）
- 書き出すもの：kosei・tunnels・stations（湖西線）、biwako・biwakoTunnels・biwakoStations（琵琶湖線）
- 使うには Python の mapbox-vector-tile と shapely が要る
"""
import concurrent.futures as cf, heapq, json, math, sys, urllib.request
from pathlib import Path

import mapbox_vector_tile as mvt
from shapely.geometry import LineString, MultiLineString, Point
from shapely.ops import linemerge

r = Path(__file__).resolve().parent.parent
LAT0, LON0 = 35.25, 136.08
KX, KY = 111320 * math.cos(math.radians(LAT0)), 110540
Z, CODE, LON_W, LAT_N = 13, '40201000069', 135.845, 35.475  # 西の端：大津の西の山（山科へのトンネル）の手前
BIWAKO_TOKAIDO, BIWAKO_HOKURIKU = '40201000126', {'40201000171', '40201800001'}  # 北陸本線は虎姫〜高月のあたりだけ別の路線コード


def tile_xy(lon, lat):
    s = math.radians(lat)
    return (lon + 180) / 360 * 2**Z, (1 - math.log(math.tan(s) + 1 / math.cos(s)) / math.pi) / 2 * 2**Z


def tile(cache, z, x, y):
    fn = cache / f'{z}_{x}_{y}.pbf'
    if not fn.exists():
        try:
            fn.write_bytes(urllib.request.urlopen(f'https://cyberjapandata.gsi.go.jp/xyz/experimental_bvmap/{z}/{x}/{y}.pbf', timeout=30).read())
        except urllib.error.HTTPError as e:
            if e.code != 404:
                raise
            return {}
    return mvt.decode(fn.read_bytes(), default_options={'y_coord_down': True})


def to_xy(z, x, y, px, py):
    lon = (x + px / 4096) / 2**z * 360 - 180
    lat = math.degrees(math.atan(math.sinh(math.pi - 2 * math.pi * (y + py / 4096) / 2**z)))
    return (lon - LON0) * KX, (LAT0 - lat) * KY  # 作品の座標（x 東・y 南の実寸m）


def fetch(cache, x, y):
    """鉄道の断片：(路線コード, トンネルか, 駅コード, 点の列)"""
    out = []
    for f in tile(cache, Z, x, y).get('railway', {}).get('features', []):
        p, g = f['properties'], f['geometry']
        for c in g['coordinates'] if g['type'] == 'MultiLineString' else [g['coordinates']] if g['type'] == 'LineString' else []:
            pts = [to_xy(Z, x, y, px, py) for px, py in c]
            if len(pts) > 1:
                out.append((p.get('rtCode1'), p.get('railState') == 100, str(p.get('staCode', '0')), pts))
    return out


def station_name(cache, sx, sy):
    """駅のまわりのズーム14の注記から、いちばん近い「〜駅」（700m以内）"""
    lon, lat = LON0 + sx / KX, LAT0 - sy / KY
    s = math.radians(lat)
    tx, ty = int((lon + 180) / 360 * 2**14), int((1 - math.log(math.tan(s) + 1 / math.cos(s)) / math.pi) / 2 * 2**14)
    best = (700, '')
    for x in (tx - 1, tx, tx + 1):
        for y in (ty - 1, ty, ty + 1):
            for f in tile(cache, 14, x, y).get('label', {}).get('features', []):
                n = str(f['properties'].get('knj', ''))
                if n.endswith('駅') and f['geometry']['type'] == 'Point':
                    qx, qy = to_xy(14, x, y, *f['geometry']['coordinates'])
                    d = math.hypot(qx - sx, qy - sy)
                    if d < best[0]:
                        best = (d, n)
    return best[1]


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


def route(fr, a, b):
    """断片の点を網目の節（10mに丸めた位置）にして、a から b へのいちばん短い道筋（タイルの境目などで切れた端どうしは200mまで跳ぶ）"""
    key = lambda p: (round(p[0] / 10), round(p[1] / 10))
    G, pos = {}, {}
    edge = lambda u, v, w: (G.setdefault(u, {}).__setitem__(v, w), G.setdefault(v, {}).__setitem__(u, w))
    for f in fr:
        for p, q in zip(f, f[1:]):
            u, v = key(p), key(q)
            pos[u], pos[v] = p, q
            if u != v:
                edge(u, v, math.hypot(q[0] - p[0], q[1] - p[1]))
    ends = [n for n in G if len(G[n]) == 1]
    for i, u in enumerate(ends):
        for v in ends[i + 1 :]:
            d = math.hypot(pos[u][0] - pos[v][0], pos[u][1] - pos[v][1])
            if d < 200:
                edge(u, v, d * 3)  # 跳ぶ所は遠回りに数えて、つながった線路を先に選ぶ
    near = lambda p: min(G, key=lambda n: math.hypot(pos[n][0] - p[0], pos[n][1] - p[1]))
    s, t = near(a), near(b)
    dist, prev, hq = {s: 0}, {}, [(0, s)]
    while hq:
        d, u = heapq.heappop(hq)
        if u == t:
            break
        if d > dist[u]:
            continue
        for v, w in G[u].items():
            if d + w < dist.get(v, 1e18):
                dist[v], prev[v] = d + w, u
                heapq.heappush(hq, (d + w, v))
    out = [t]
    while out[-1] != s:
        out.append(prev[out[-1]])
    return [pos[n] for n in out[::-1]]


def line(cache, fr, codes, path):
    """つないだ道筋 path に、その路線のトンネルと駅を合わせて返す"""
    ln = LineString(path).simplify(25)
    near = ln.buffer(60)
    D = [f for f in fr if f[0] in codes and near.intersects(LineString(f[3]))]
    tn = linemerge(MultiLineString([f[3] for f in D if f[1]]))
    tn = [g.simplify(10) for g in getattr(tn, 'geoms', [tn]) if g.length > 30]
    st = {}
    for f in D:
        if f[2] not in ('0', 'None', ''):
            st.setdefault(f[2], []).extend(f[3])
    sts = []
    for ps in st.values():
        m = Point(sum(p[0] for p in ps) / len(ps), sum(p[1] for p in ps) / len(ps))
        c = ln.interpolate(ln.project(m))
        # 道筋の端より外の駅は入れない。上下線で駅コードが分かれている所は1つに
        if m.distance(c) > 300 or any(math.hypot(c.x - q[0], c.y - q[1]) < 400 for q in sts):
            continue
        sts.append((c.x, c.y, station_name(cache, c.x, c.y)))
    sts.sort(key=lambda q: ln.project(Point(q[0], q[1])))
    return ln, tn, sts


def main():
    cache = Path(sys.argv[1] if len(sys.argv) > 1 else r / 'tools/.bv_cache')
    cache.mkdir(parents=True, exist_ok=True)
    (x0, y0), (x1, y1) = tile_xy(135.82, 35.58), tile_xy(136.32, 34.97)
    jobs = [(x, y) for x in range(int(x0), int(x1) + 1) for y in range(int(y0), int(y1) + 1)]
    with cf.ThreadPoolExecutor(8) as ex:
        fr = [s for t in ex.map(lambda p: fetch(cache, *p), jobs) for s in t]
    Y = lambda lat: (LAT0 - lat) * KY
    X = lambda lon: (lon - LON0) * KX
    LL = lambda c: [[round(LON0 + x / KX, 5), round(LAT0 - y / KY, 5)] for x, y in c]
    ST = lambda sts: [[round(LON0 + x / KX, 5), round(LAT0 - y / KY, 5), n] for x, y, n in sts]
    frag = lambda codes: [f[3] for f in fr if f[0] in codes]
    # 湖西線：全部の断片をつないでから、範囲を残す（どちらの線も山科で合わさるが、そこは作品の外の山の中）
    k, kt, ks = line(cache, fr, {CODE}, [p for p in chain(frag({CODE})) if Y(LAT_N) <= p[1] and p[0] >= X(LON_W)])
    # 琵琶湖線：複線・複々線で断片が入り組むので、断片を網目にして膳所から米原を通って近江塩津までの最短の道筋をたどる
    b_path = route(frag({BIWAKO_TOKAIDO}), (X(LON_W), Y(34.996)), (X(136.2906), Y(35.3145))) + route(
        frag(BIWAKO_HOKURIKU), (X(136.2906), Y(35.3145)), (X(136.1656), Y(35.5244)))[1:]
    b, bt, bs = line(cache, fr, {BIWAKO_TOKAIDO, *BIWAKO_HOKURIKU}, b_path)
    out = {'kosei': LL(k.coords), 'tunnels': [LL(g.coords) for g in kt], 'stations': ST(ks),
           'biwako': LL(b.coords), 'biwakoTunnels': [LL(g.coords) for g in bt], 'biwakoStations': ST(bs)}
    (r / 'data/rail.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
    for nm, ln, tn, st in (('湖西線', k, kt, ks), ('琵琶湖線', b, bt, bs)):
        print(f'{nm} {len(ln.coords)}点・{ln.length / 1000:.1f}km、トンネル {len(tn)}か所・{sum(g.length for g in tn) / 1000:.1f}km、駅 {len(st)}：{"・".join(n or "？" for *_, n in st)}')


if __name__ == '__main__':
    main()
