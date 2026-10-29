/* ---------- 湖の形 ---------- */
// 多景島（約1.4ha）：湖岸線のデータは2haより小さい島を省いているので、地理院の水涯線（ベクトルタイル）から足す
const TAKEI = [[9008, -5236], [8953, -5182], [8922, -5183], [8916, -5199], [8896, -5201], [8861, -5156], [8832, -5081], [8928, -5091], [8947, -5131], [8994, -5157], [9027, -5195], [9019, -5231], [9008, -5236]];
const outer = LAKE.outer,
  islands = [...LAKE.islands, TAKEI];
function inPoly(x, y, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
