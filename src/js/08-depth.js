/* ---------- 水深の簡易モデル（作品用・測量成果ではない） ---------- */
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
const pockets = [
  [...ll(136.1, 35.38), 9000, 22],
  [...ll(136.0, 35.24), 6000, 10],
];
for (let j = 0; j < GH; j++)
  for (let i = 0; i < GW; i++) {
    const x = minX + i * CELL,
      y = minY + j * CELL;
    if (!inLake(x, y)) continue;
    if (!inMain(x, y)) {
      depthG[j * GW + i] = 1.4;
      continue;
    }
    const d = distShore(x, y);
    let z;
    if (y > bridgeY) {
      z = 6 * (1 - Math.exp(-d / 700));
    } else {
      z = 82 * (1 - Math.exp(-d / 2600));
      for (const [px, py, r, a] of pockets)
        z += a * Math.exp(-((x - px) ** 2 + (y - py) ** 2) / (r * r)) * (1 - Math.exp(-d / 1500));
      const blend = Math.min(1, (bridgeY - y) / 4000);
      z = z * blend + 6 * (1 - Math.exp(-d / 700)) * (1 - blend);
    }
    depthG[j * GW + i] = Math.min(104, z);
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
