/* ---------- 湖の深さ（国土地理院の等深線から。data/depth.json） ---------- */
const CELL = 200, // 深さのデータ（data/depth.json）と同じ200m間隔
  GW = Math.ceil((maxX - minX) / CELL) + 1,
  GH = Math.ceil((maxY - minY) / CELL) + 1;
const depthG = new Float32Array(GW * GH);
const segs = [];
for (const poly of [outer, ...islands])
  for (let i = 0; i < poly.length - 1; i++) segs.push(poly[i], poly[i + 1]);
// 岸の線分を1km四方の升に分けておき、近い升から順に調べる（全部の線分を毎回調べると、何十万回も呼ぶ所で重いため）
const SEG_CELL = 1000,
  segIdx = new Map();
for (let i = 0; i < segs.length; i += 2) {
  const a = segs[i],
    b = segs[i + 1];
  for (let u = Math.floor(Math.min(a[0], b[0]) / SEG_CELL); u <= Math.floor(Math.max(a[0], b[0]) / SEG_CELL); u++)
    for (let v = Math.floor(Math.min(a[1], b[1]) / SEG_CELL); v <= Math.floor(Math.max(a[1], b[1]) / SEG_CELL); v++) {
      const k = u * 4096 + v;
      if (!segIdx.has(k)) segIdx.set(k, []);
      segIdx.get(k).push(i);
    }
}
function segD2(i, x, y) {
  const a = segs[i],
    b = segs[i + 1],
    dx = b[0] - a[0],
    dy = b[1] - a[1];
  let t = ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const ex = a[0] + t * dx - x,
    ey = a[1] + t * dy - y;
  return ex * ex + ey * ey;
}
// cap：それより遠いかどうかだけ分かればよいときの上限（遠ければ cap を返す。地形のように遠くで値が変わらない所で使う）
function distShore(x, y, cap = Infinity) {
  const cu = Math.floor(x / SEG_CELL),
    cv = Math.floor(y / SEG_CELL),
    kMax = Math.min(8, Math.ceil(cap / SEG_CELL) + 1);
  let m = 1e12;
  // 輪の幅 k の升まで調べて、見つかった距離が k 升分より近ければ、それより外にもっと近い線分はない
  for (let k = 0; k <= kMax; k++) {
    for (let u = cu - k; u <= cu + k; u++)
      for (let v = cv - k; v <= cv + k; v++) {
        if (Math.max(Math.abs(u - cu), Math.abs(v - cv)) !== k) continue;
        const l = segIdx.get(u * 4096 + v);
        if (l) for (const i of l) m = Math.min(m, segD2(i, x, y));
      }
    if (m < (k * SEG_CELL) ** 2) return Math.sqrt(m);
  }
  if (cap < Infinity) return Math.min(cap, Math.sqrt(m));
  return distShoreAll(x, y); // 岸から8km以上離れた所は、すべての線分を調べる
}
function distShoreAll(x, y) {
  let m = 1e12;
  for (let i = 0; i < segs.length; i += 2) {
    const a = segs[i],
      b = segs[i + 1],
      dx = b[0] - a[0],
      dy = b[1] - a[1];
    let t = ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = a[0] + t * dx - x,
      ey = a[1] + t * dy - y,
      d = ex * ex + ey * ey;
    if (d < m) m = d;
  }
  return Math.sqrt(m);
}
// 本湖の升の表（200m四方）：升の中心が岸から升の対角の半分より遠ければ、升全体が湖か陸のどちらか（0 陸・1 湖・2 岸にかかる）
{
  const c = 200,
    x0 = minX - c,
    y0 = minY - c,
    w = Math.ceil((maxX - minX) / c) + 3,
    h = Math.ceil((maxY - minY) / c) + 3,
    a = new Uint8Array(w * h);
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const x = x0 + (i + 0.5) * c,
        y = y0 + (j + 0.5) * c;
      a[j * w + i] = distShore(x, y, c) > c * 0.75 ? (inMainPoly(x, y) ? 1 : 0) : 2;
    }
  LAKE_MASK = { x0, y0, c, w, h, a };
}
// いちばん近い岸の点（湖岸・島の輪郭の上）
function shoreSnap(x, y) {
  let m = 1e12,
    best = [x, y];
  for (let i = 0; i < segs.length; i += 2) {
    const a = segs[i],
      b = segs[i + 1],
      dx = b[0] - a[0],
      dy = b[1] - a[1];
    let t = ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = a[0] + t * dx,
      py = a[1] + t * dy,
      d = (px - x) ** 2 + (py - y) ** 2;
    if (d < m) (m = d), (best = [px, py]);
  }
  return best;
}
// 湖の深さの格子（tools/depth.py）：地理院のベクトルタイルの等深線から補間した、200m間隔の実際の深さ。1マス1バイトで d = top·(v/255)²
const DEPTH = DATA.depth;
{
  const D = Uint8Array.from(atob(DEPTH.d || ""), (c) => c.charCodeAt(0)),
    q = (i, j) => (D[Math.min(DEPTH.h - 1, Math.max(0, j)) * DEPTH.w + Math.min(DEPTH.w - 1, Math.max(0, i))] / 255) ** 2 * DEPTH.top;
  for (let j = 0; j < GH; j++)
    for (let i = 0; i < GW; i++) {
      const x = minX + i * CELL,
        y = minY + j * CELL;
      if (!inLake(x, y)) continue;
      if (!inMain(x, y)) {
        depthG[j * GW + i] = 1.4; // 内湖
        continue;
      }
      const u = (x - DEPTH.x0) / DEPTH.step,
        v = (y - DEPTH.y0) / DEPTH.step,
        i0 = Math.floor(u),
        j0 = Math.floor(v),
        f = u - i0,
        g = v - j0;
      depthG[j * GW + i] =
        (q(i0, j0) * (1 - f) + q(i0 + 1, j0) * f) * (1 - g) + (q(i0, j0 + 1) * (1 - f) + q(i0 + 1, j0 + 1) * f) * g;
    }
}
function depth(x, y) {
  if (!inMain(x, y) && inInner(x, y)) return 1.4;
  const fx = (x - minX) / CELL,
    fy = (y - minY) / CELL,
    i = Math.floor(fx),
    j = Math.floor(fy);
  if (i < 0 || j < 0 || i >= GW - 1 || j >= GH - 1) return 0;
  const u = fx - i,
    v = fy - j,
    g = (a, b) => depthG[b * GW + a];
  return (
    g(i, j) * (1 - u) * (1 - v) +
    g(i + 1, j) * u * (1 - v) +
    g(i, j + 1) * (1 - u) * v +
    g(i + 1, j + 1) * u * v
  );
}
