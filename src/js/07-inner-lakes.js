/* ---------- 内湖：現存する内湖は田舟だけが入れる浅い水面。干拓された内湖は遠景に点線で残す（位置と形は概略） ---------- */
function blob(lon, lat, rx, ry, rot, seed) {
  const [cx, cy] = ll(lon, lat),
    R = rnd(seed),
    n = 28,
    pts = [];
  const ph = [R() * 6, R() * 6];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * 6.2832,
      k = 1 + 0.12 * Math.sin(3 * a + ph[0]) + 0.08 * Math.sin(5 * a + ph[1]);
    const x = Math.cos(a) * rx * k,
      y = Math.sin(a) * ry * k;
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  pts[n] = pts[0];
  return pts;
}
function channel(a, b, w) {
  const [x1, y1] = ll(...a),
    [x2, y2] = ll(...b),
    L = Math.hypot(x2 - x1, y2 - y1),
    nx = ((-(y2 - y1) / L) * w) / 2,
    ny = (((x2 - x1) / L) * w) / 2;
  return [
    [x1 + nx, y1 + ny],
    [x2 + nx, y2 + ny],
    [x2 - nx, y2 - ny],
    [x1 - nx, y1 - ny],
    [x1 + nx, y1 + ny],
  ];
}
const INNER = [
  // [名前, 中心lon,lat, 半径x,y(m), 回転, 湖へつなぐ水路の端lon,lat]
  ["西の湖", 136.112, 35.15, 1500, 800, 0.5, [136.072, 35.163]],
  ["伊庭内湖", 136.166, 35.117, 450, 300, 0, [136.15, 35.15]],
  ["曽根沼", 136.214, 35.228, 550, 280, 0.3, [136.207, 35.238]],
  ["野田沼", 136.232, 35.262, 250, 180, 0, [136.226, 35.268]],
  ["平湖・柳平湖", 135.946, 35.04, 450, 250, 0.6, [135.935, 35.048]],
  ["浜分沼", 136.045, 35.405, 300, 180, 1.2, [136.036, 35.405]],
  ["貫川内湖", 136.04, 35.432, 200, 140, 1, [136.033, 35.43]],
];
const innerPolys = [],
  innerChan = [];
INNER.forEach(([n, lo, la, rx, ry, r, end], i) => {
  const p = blob(lo, la, rx, ry, r, 40 + i);
  innerPolys.push(p);
  innerChan.push(channel([lo, la], end, 70));
});
const RECLAIMED = [
  [136.14, 35.16, 2200, 1500, 0.4],
  [136.15, 35.13, 1100, 700, 0.2],
  [136.075, 35.12, 500, 350, 0],
  [136.098, 35.105, 450, 700, 0.3],
  [136.276, 35.335, 900, 1300, 0.2],
  [136.255, 35.295, 350, 500, 0.4],
  [136.205, 35.432, 300, 700, 0.5],
].map((a, i) => blob(a[0], a[1], a[2], a[3], a[4], 90 + i));
const inInner = (x, y) => innerPolys.some((p) => inPoly(x, y, p)) || innerChan.some((p) => inPoly(x, y, p));
const inMain = (x, y) => inPoly(x, y, outer) && !islands.some((h) => inPoly(x, y, h));
const inLake = (x, y) => inMain(x, y) || inInner(x, y);
let minX = 1e9,
  minY = 1e9,
  maxX = -1e9,
  maxY = -1e9;
for (const [x, y] of outer) {
  minX = Math.min(minX, x);
  maxX = Math.max(maxX, x);
  minY = Math.min(minY, y);
  maxY = Math.max(maxY, y);
}
const bridgeY = (() => {
  const b = LAKE.bridges.filter((b) => b.name.includes("琵琶湖大橋")).flatMap((b) => b.pts);
  return b.reduce((s, p) => s + p[1], 0) / b.length;
})();
