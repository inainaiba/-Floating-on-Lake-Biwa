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
  // 浜分沼は湖岸線のデータ（data/lake.json）に本湖とつながった水面として含まれているので、ここには置かない
  ["貫川内湖", 136.0395, 35.4293, 130, 115, 0.4, [136.0407, 35.4308]], // 位置と大きさは地理院の水涯線（ベクトルタイル）から
];
const innerPolys = [],
  innerChan = [];
INNER.forEach(([n, lo, la, rx, ry, r, end], i) => {
  const p = blob(lo, la, rx, ry, r, (rndFor("inner:" + n)() * 1e9) | 0); // 内湖ごとの形（ほかの内湖を足し引きしても変わらない）
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
// 本湖の中か。07-depth.js で作る升の表（LAKE_MASK）があれば、岸から離れた所はそれで答え、岸の近くだけ多角形で調べる
let LAKE_MASK = null;
const inMainPoly = (x, y) => inPoly(x, y, outer) && !islands.some((h) => inPoly(x, y, h));
const inMain = (x, y) => {
  if (LAKE_MASK) {
    const M = LAKE_MASK,
      i = Math.floor((x - M.x0) / M.c),
      j = Math.floor((y - M.y0) / M.c);
    if (i < 0 || j < 0 || i >= M.w || j >= M.h) return false; // 湖の外形の外
    const v = M.a[j * M.w + i];
    if (v < 2) return v === 1;
  }
  return inMainPoly(x, y);
};
const inLake = (x, y) => inMain(x, y) || inInner(x, y);
// 陸の川と池（tools/rivers.py → data/rivers.json）：内湖と重なるものは除く。家・田・木を川の上に置かないための判定
const RIVERS = (__RIVERS__ || []).filter((p) => !p[0].some(([x, y]) => inInner(x, y)));
const RIV_CELL = 1000,
  rivIdx = new Map();
RIVERS.forEach((p, i) => {
  let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
  for (const [x, y] of p[0]) (a = Math.min(a, x)), (b = Math.min(b, y)), (c = Math.max(c, x)), (d = Math.max(d, y));
  for (let u = Math.floor(a / RIV_CELL); u <= Math.floor(c / RIV_CELL); u++)
    for (let v = Math.floor(b / RIV_CELL); v <= Math.floor(d / RIV_CELL); v++) {
      const k = u + "," + v;
      if (!rivIdx.has(k)) rivIdx.set(k, []);
      rivIdx.get(k).push(i);
    }
});
const inRiver = (x, y) =>
  (rivIdx.get(Math.floor(x / RIV_CELL) + "," + Math.floor(y / RIV_CELL)) || []).some(
    (i) => inPoly(x, y, RIVERS[i][0]) && !RIVERS[i].slice(1).some((h) => inPoly(x, y, h)),
  );
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
