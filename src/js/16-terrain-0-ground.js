/* ---------- 山並み：国土地理院の標高タイルから作った実際の地形（標高は実寸。表示は縮尺Sに合わせ、高さを2.2倍に強調） ---------- */
const VEX = 2.2,
  VFAR = 1.0;
// 主な山頂（全体地図の山の印）
const PEAKS = [
  [135.8858, 35.2096, 1174, 3000], // 蓬莱山（比良山地。山頂の位置は地理院の注記から）
  [136.4061, 35.4193, 1377, 3500], // 伊吹山
  [136.42, 35.02, 1212, 3000], // 御在所岳（鈴鹿山脈）
  [135.834, 35.067, 848, 2200], // 比叡山
];
function vnoise(x, y) {
  const h = (i, j) => {
    const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const i = Math.floor(x),
    j = Math.floor(y),
    u = x - i,
    v = y - j,
    f = (t) => t * t * (3 - 2 * t);
  return (
    (h(i, j) * (1 - f(u)) + h(i + 1, j) * f(u)) * (1 - f(v)) +
    (h(i, j + 1) * (1 - f(u)) + h(i + 1, j + 1) * f(u)) * f(v)
  );
}
const PK = PEAKS.map(([a, b, h, w]) => [...ll(a, b), h, w]);
// 標高の格子（tools/dem.py）：作品の座標で200m間隔、湖面からの高さ。1マス1バイトで h = top·(v/255)²
const DEM = DATA.dem;
const DEM_D = Uint8Array.from(atob(DEM.d || ""), (c) => c.charCodeAt(0));
function landH(x, y) {
  const u = Math.max(0, Math.min(DEM.w - 1.001, (x - DEM.x0) / DEM.step)),
    v = Math.max(0, Math.min(DEM.h - 1.001, (y - DEM.y0) / DEM.step)),
    i = Math.floor(u),
    j = Math.floor(v),
    f = u - i,
    g = v - j,
    W = DEM.w,
    q = (k) => (DEM_D[k] / 255) ** 2;
  return (
    DEM.top *
    ((q(j * W + i) * (1 - f) + q(j * W + i + 1) * f) * (1 - g) +
      (q((j + 1) * W + i) * (1 - f) + q((j + 1) * W + i + 1) * f) * g)
  );
}
const TM = 26000,
  TW = QUALITY.terrain[0],
  TH = QUALITY.terrain[1],
  tx0 = minX - TM,
  ty0 = minY - TM,
  tdx = (maxX - minX + 2 * TM) / (TW - 1),
  tdy = (maxY - minY + 2 * TM) / (TH - 1);
// 地面の高さ（実寸m、湖面から）：標高 lh に、岸の形を重ねる。岸はなだらかに：陸は水際で低く（浜）、内へゆっくり上がる。
// 湖は岸から少しずつ深くなる。岸から3kmより遠くでは値が変わらないので、岸までの距離はそこで打ち切る
// 高さ＝岸の形 A ＋ 標高 × 岸からの効き B（B は水際で小さく、岸から800mで1）。B は細かい地形（下の NEAR）にも使う
let terrShapeB = 0;
function terrShape(x, y, lh) {
  const d = distShore(x, y, 3000),
    sm = Math.min(1, d / 300),
    rise = sm * sm * (3 - 2 * sm);
  if (inLake(x, y)) {
    terrShapeB = 0;
    return -Math.min(14, 1 + d * 0.06);
  }
  terrShapeB = Math.min(1, 0.15 * rise + d / 800);
  return 1.6 + 2.4 * rise + 6 * (1 - Math.exp(-d / 450)) + lh * terrShapeB;
}
const terrH = new Float32Array(TW * TH),
  terrB = new Float32Array(TW * TH);
for (let j = 0; j < TH; j++)
  for (let i = 0; i < TW; i++) {
    const x = tx0 + i * tdx,
      y = ty0 + j * tdy;
    terrH[j * TW + i] = terrShape(x, y, landH(x, y));
    terrB[j * TW + i] = terrShapeB;
  }
for (let pass = 0; pass < 3; pass++) {
  const tmp = terrH.slice();
  for (let j = 1; j < TH - 1; j++)
    for (let i = 1; i < TW - 1; i++) {
      const k = j * TW + i;
      if (tmp[k] < 40) continue;
      let s = 0,
        w = 0;
      for (let b = -1; b <= 1; b++)
        for (let a = -1; a <= 1; a++) {
          const v = tmp[k + b * TW + a];
          if (v < 0) continue;
          const ww = a || b ? 1 : 2;
          s += v * ww;
          w += ww;
        }
      terrH[k] = s / w;
    }
}
// 岸近くの細かい地形（tools/near.py → data/near.json）：30m間隔で、200mの標高との差を4ビットで持つ。
// 高さは「粗い地形の高さ＋差×岸からの効き」。家や木の置き場所（terrainAt）と、カメラのまわりの細かい網目（下の nearPatch）で使う
const NEAR = DATA.near;
const nearBlk = new Map();
{
  if (NEAR && NEAR.idx) {
    const ix = Uint8Array.from(atob(NEAR.idx), (c) => c.charCodeAt(0)),
      dv = new DataView(ix.buffer),
      d = Uint8Array.from(atob(NEAR.d), (c) => c.charCodeAt(0)),
      per = (NEAR.bs * NEAR.bs) / 2;
    for (let k = 0; k < ix.length / 4; k++) nearBlk.set(dv.getUint16(k * 4, true) * 65536 + dv.getUint16(k * 4 + 2, true), d.subarray(k * per, (k + 1) * per));
  }
}
// 細かい網目の点 (gi, gj) の差（m）。区画がない所は null
function nearRes(gi, gj) {
  const bs = NEAR.bs,
    b = nearBlk.get(Math.floor(gi / bs) * 65536 + Math.floor(gj / bs));
  if (!b) return null;
  const k = (gj % bs) * bs + (gi % bs),
    v = k & 1 ? b[k >> 1] & 15 : b[k >> 1] >> 4;
  return NEAR.lv[v];
}
// 粗い地形の高さ（実寸m、湖は負）と、岸からの効き B の補間
function terrGrid(x, y, arr = terrH) {
  const i = Math.max(0, Math.min(TW - 1.001, (x - tx0) / tdx)),
    j = Math.max(0, Math.min(TH - 1.001, (y - ty0) / tdy)),
    i0 = Math.floor(i),
    j0 = Math.floor(j),
    u = i - i0,
    v = j - j0,
    g = (a, b) => arr[b * TW + a];
  return (g(i0, j0) * (1 - u) + g(i0 + 1, j0) * u) * (1 - v) + (g(i0, j0 + 1) * (1 - u) + g(i0 + 1, j0 + 1) * u) * v;
}
// 細かい地形の高さ（実寸m）。細かい区画の外は null
function nearAt(x, y) {
  if (!nearBlk.size) return null;
  const u = (x - NEAR.x0) / NEAR.step,
    v = (y - NEAR.y0) / NEAR.step,
    i = Math.floor(u),
    j = Math.floor(v),
    a = nearRes(i, j),
    b = nearRes(i + 1, j),
    c = nearRes(i, j + 1),
    e = nearRes(i + 1, j + 1);
  if (a === null || b === null || c === null || e === null) return null;
  const f = u - i,
    g = v - j,
    res = (a * (1 - f) + b * f) * (1 - g) + (c * (1 - f) + e * f) * g;
  return terrGrid(x, y) + res * terrGrid(x, y, terrB);
}
const terrGeo_ = 0;
// 地形の頂点の色（高さ h は実寸m）
const terrColor = (h) =>
  h < 0
    ? new THREE.Color(0x3d4a35)
    : h < 60
      ? new THREE.Color(0x6b7a52)
      : h < 400
        ? new THREE.Color(0x4c5f3c).lerp(new THREE.Color(0x3b4c33), (h - 60) / 340)
        : new THREE.Color(0x3b4c33).lerp(new THREE.Color(0x6a6a5e), Math.min(1, (h - 400) / 900));
// 描く粗い地形の高さ：細かい地形のある所では、そのまわり（格子1マス分）の細かい地形の平均の高さに合わせる。
// 家や木は細かい地形の高さに建つので、粗い地形のまま描くと、急な斜面（菅浦など）で家や木が宙に浮いて見えた。
// 家や木の置き場所（nearAt）は元の粗い地形を基準のまま。カメラのまわりの細かい網目の縁も、この高さにつなぐ
const terrHD = terrH.slice();
if (nearBlk.size)
  for (let j = 0; j < TH; j++)
    for (let i = 0; i < TW; i++) {
      const x0 = tx0 + i * tdx,
        y0 = ty0 + j * tdy;
      // 細かい地形の区画が近くにない頂点は、すぐ飛ばす（読み込みを遅くしない）
      const bw = NEAR.step * NEAR.bs,
        bi = Math.floor((x0 - NEAR.x0) / bw),
        bj = Math.floor((y0 - NEAR.y0) / bw);
      if (!nearBlk.has(bi * 65536 + bj) && !nearBlk.has((bi + 1) * 65536 + bj) && !nearBlk.has((bi - 1) * 65536 + bj) && !nearBlk.has(bi * 65536 + bj + 1) && !nearBlk.has(bi * 65536 + bj - 1)) continue;
      let s = 0,
        n = 0;
      for (let b = -2; b <= 2; b++)
        for (let a = -2; a <= 2; a++) {
          const h = nearAt(x0 + (a * tdx) / 4, y0 + (b * tdy) / 4);
          if (h !== null) (s += h), n++;
        }
      if (n >= 13) terrHD[j * TW + i] = Math.max(terrH[j * TW + i] < 0 ? -Infinity : 0, s / n);
    }
const terrGeo = new THREE.PlaneGeometry((TW - 1) * tdx * S, (TH - 1) * tdy * S, TW - 1, TH - 1).rotateX(
  -Math.PI / 2,
);
{
  const pos = terrGeo.attributes.position,
    col = new Float32Array(pos.count * 3);
  for (let k = 0; k < pos.count; k++) {
    const i = k % TW,
      j = Math.floor(k / TW),
      h = terrHD[j * TW + i];
    pos.setY(k, h * S * VEX);
    const c = terrColor(h);
    col.set([c.r, c.g, c.b], k * 3);
  }
  terrGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  // 尾根と谷：まわりより高い所（尾根）は明るく、低い所（谷）は暗く。2つの広さで見て、大きな山ひだと小さな沢の両方を拾う
  const cv = new Float32Array(pos.count),
    at = (i, j) => Math.max(0, terrH[Math.min(TH - 1, Math.max(0, j)) * TW + Math.min(TW - 1, Math.max(0, i))]);
  for (let k = 0; k < pos.count; k++) {
    const i = k % TW,
      j = Math.floor(k / TW),
      h = at(i, j);
    if (h <= 0) continue;
    let v = 0;
    for (const r of [1, 3]) v += (h - (at(i - r, j) + at(i + r, j) + at(i, j - r) + at(i, j + r)) / 4) / (r === 1 ? 5 : 15);
    cv[k] = Math.max(-1, Math.min(1, v));
  }
  terrGeo.setAttribute("aCv", new THREE.BufferAttribute(cv, 1));
  terrGeo.computeVertexNormals();
}
/* 山肌の色（地形のフラグメントに差し込む）：処理の順に区切った部品。上から順につながる。 */
