/* ---------- 湖の形 ---------- */
const outer = LAKE.outer,
  islands = LAKE.islands; // 島は地理院の水涯線から（tools/shore.py。多景島も入る）
// 点が多角形の中か（偶奇の規則）。大きな多角形（湖岸線など）は、辺を横の帯に振り分けた索引を一度だけ作り、
// その点の高さの帯にかかる辺だけを調べる（答えは全部の辺を調べたときと同じ。読み込みの時間を縮めるため）
const POLY_IDX = new WeakMap();
function polyIndex(poly) {
  let ix = POLY_IDX.get(poly);
  if (ix) return ix;
  let y0 = Infinity,
    y1 = -Infinity;
  for (const p of poly) (y0 = Math.min(y0, p[1])), (y1 = Math.max(y1, p[1]));
  const nb = Math.max(1, Math.floor(poly.length / 4)),
    bs = (y1 - y0) / nb || 1,
    bands = Array.from({ length: nb }, () => []);
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const lo = Math.min(poly[i][1], poly[j][1]),
      hi = Math.max(poly[i][1], poly[j][1]);
    for (let k = Math.max(0, Math.floor((lo - y0) / bs)); k <= Math.min(nb - 1, Math.floor((hi - y0) / bs)); k++) bands[k].push(i, j);
  }
  ix = { y0, y1, bs, nb, bands };
  POLY_IDX.set(poly, ix);
  return ix;
}
function inPoly(x, y, poly) {
  let c = false;
  if (poly.length < 24) {
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i],
        b = poly[j];
      if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }
  const ix = polyIndex(poly);
  if (!(y >= ix.y0 && y < ix.y1)) return false; // 帯の外：どの辺もまたがない
  const e = ix.bands[Math.min(ix.nb - 1, Math.floor((y - ix.y0) / ix.bs))];
  for (let k = 0; k < e.length; k += 2) {
    const a = poly[e[k]],
      b = poly[e[k + 1]];
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
