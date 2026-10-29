/* ---------- 湖の深さ（国土地理院の等深線から。data/depth.json） ---------- */
const CELL = 400,
  GW = Math.ceil((maxX - minX) / CELL) + 1,
  GH = Math.ceil((maxY - minY) / CELL) + 1;
const depthG = new Float32Array(GW * GH);
const segs = [];
for (const poly of [outer, ...islands])
  for (let i = 0; i < poly.length - 1; i++) segs.push(poly[i], poly[i + 1]);
function distShore(x, y) {
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
const DEPTH = __DEPTH__;
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
