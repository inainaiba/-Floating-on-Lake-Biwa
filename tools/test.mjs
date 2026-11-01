// 速いテスト（node）：計算だけの部分を、画面を描かずに確かめる。tools/test.py から呼ぶ
//  ・点が多角形の中かの判定（05-lake.js の inPoly）：速い索引を使った答えが、全部の辺を調べた答えと同じか
import fs from "fs";
const src = fs.readFileSync(new URL("../src/js/05-lake.js", import.meta.url), "utf8");
const a = src.indexOf("const POLY_IDX"),
  b = src.indexOf("\n}\n", src.indexOf("function inPoly")) + 3;
const inPoly = new Function(src.slice(a, b) + "return inPoly;")();
const brute = (x, y, poly) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const p = poly[i],
      q = poly[j];
    if (p[1] > y !== q[1] > y && x < ((q[0] - p[0]) * (y - p[1])) / (q[1] - p[1]) + p[0]) c = !c;
  }
  return c;
};
// 乱数は種から（毎回同じテスト）
let s = 12345;
const R = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const lake = JSON.parse(fs.readFileSync(new URL("../data/lake.json", import.meta.url)));
const polys = [lake.outer, ...lake.islands];
// 星形やぎざぎざの多角形も（頂点と同じ高さの点・水平な辺を含む）
for (let k = 0; k < 20; k++) {
  const n = 24 + Math.floor(R() * 200),
    p = [];
  for (let i = 0; i < n; i++) {
    const a_ = (i / n) * 6.283,
      r = 100 + R() * 900;
    p.push([Math.round(Math.cos(a_) * r), Math.round(Math.sin(a_) * r)]);
    if (R() < 0.2) p.push([p[p.length - 1][0] + 50, p[p.length - 1][1]]);
  }
  polys.push(p);
}
let n = 0,
  bad = 0;
for (const p of polys) {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const [x, y] of p) (x0 = Math.min(x0, x)), (x1 = Math.max(x1, x)), (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y));
  for (let k = 0; k < 3000; k++) {
    const x = x0 - 30 + R() * (x1 - x0 + 60),
      y = R() < 0.2 ? p[k % p.length][1] : y0 - 30 + R() * (y1 - y0 + 60);
    n++;
    if (inPoly(x, y, p) !== brute(x, y, p)) bad++;
  }
}
if (bad) {
  console.log(`多角形の判定：${n} 点のうち ${bad} 点で答えが違います`);
  process.exit(1);
}
console.log(`多角形の判定：${n} 点とも同じ`);
