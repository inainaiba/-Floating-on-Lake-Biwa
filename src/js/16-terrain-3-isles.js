// 島：竹生島・沖島・多景島などを丘として立てる（島の輪郭の中で、岸からの距離に応じて高くする）
const ISLE_H = [
  [136.145, 35.42, 197],
  [136.065, 35.205, 220],
  [136.178, 35.297, 40], // 多景島
].map(([a, b, h]) => [...ll(a, b), h]);
const ISLES = [];
// 沖島の南西側の集落：岸から約100mは低く平らな土地にして、その奥から山になる
const OKI = ll(136.065, 35.205);
let OKI_BOX = null;
const okiZone = (x, y) => {
  if (!OKI_BOX) return false;
  const [a, b, c, d] = OKI_BOX;
  return x > a - 300 && x < a + (c - a) * 0.58 && y > (b + d) / 2 - (d - b) * 0.05 && y < d + 300;
};
// 島の標高の格子（tools/isles.py → data/isles.json）：20m間隔、湖面からの高さ。小さすぎて標高データに出ない島（多景島）は作り話の丘のまま
const ISLE_DEM = DATA.isles;
function isleGrid(I, x, y) {
  const g = I.g,
    u = Math.max(0, Math.min(g.w - 1.001, (x - g.x0) / g.step)),
    v = Math.max(0, Math.min(g.h - 1.001, (y - g.y0) / g.step)),
    i = Math.floor(u),
    j = Math.floor(v),
    f = u - i,
    e = v - j,
    q = (a, b) => g.d[b * g.w + a];
  return ((q(i, j) * (1 - f) + q(i + 1, j) * f) * (1 - e) + (q(i, j + 1) * (1 - f) + q(i + 1, j + 1) * f) * e) * (g.top / 255);
}
function isleShape(I, x, y, dd) {
  let h = I.g ? 0.6 + isleGrid(I, x, y) * S * VEX * Math.min(1, 0.25 + dd / 40) : 0.6 + I.top * S * VEX * Math.pow(dd / I.md, 0.6);
  const [a, b, c, d] = I.box;
  if (Math.hypot((a + c) / 2 - OKI[0], (b + d) / 2 - OKI[1]) < 2500) OKI_BOX = I.box;
  if (OKI_BOX === I.box && okiZone(x, y)) {
    const flat = 1.3 + Math.max(0, dd - 30) * 0.004;
    h = Math.min(h, flat + Math.max(0, h - flat) * Math.min(1, Math.max(0, (dd - 110) / 120)) ** 1.5);
  }
  return h;
}
for (const h of islands) {
  let a = 1e9,
    b = 1e9,
    c = -1e9,
    d = -1e9;
  for (const [x, y] of h) {
    a = Math.min(a, x);
    b = Math.min(b, y);
    c = Math.max(c, x);
    d = Math.max(d, y);
  }
  const cx = (a + c) / 2,
    cy = (b + d) / 2,
    top = (ISLE_H.find(([x, y]) => Math.hypot(x - cx, y - cy) < 2500) || [
      0,
      0,
      Math.min(60, Math.sqrt((c - a) * (d - b)) * 0.08),
    ])[2];
  const n = 110,
    geo = new THREE.PlaneGeometry((c - a) * S, (d - b) * S, n, n).rotateX(-Math.PI / 2),
    pos = geo.attributes.position;
  const segI = [];
  for (let i = 0; i < h.length - 1; i++) segI.push(h[i], h[i + 1]);
  let md = 1;
  const ds = [];
  for (let k = 0; k < pos.count; k++) {
    const x = cx + pos.getX(k) / S,
      y = cy + pos.getZ(k) / S;
    let dd = -1;
    if (inPoly(x, y, h)) {
      dd = 1e12;
      for (let i = 0; i < segI.length; i += 2) {
        const p = segI[i],
          q = segI[i + 1],
          dx = q[0] - p[0],
          dy = q[1] - p[1];
        let u = ((x - p[0]) * dx + (y - p[1]) * dy) / (dx * dx + dy * dy || 1);
        u = Math.max(0, Math.min(1, u));
        dd = Math.min(dd, Math.hypot(p[0] + u * dx - x, p[1] + u * dy - y));
      }
      md = Math.max(md, dd);
    }
    ds.push(dd);
  }
  // 標高の格子：島の中心を含むもの。湖面から3m以上の高さが出ないもの（小さすぎる島）は使わない
  let g = (ISLE_DEM || []).find((q) => cx > q.x0 && cx < q.x0 + q.w * q.step && cy > q.y0 && cy < q.y0 + q.h * q.step);
  if (g) {
    const dd_ = Uint8Array.from(atob(g.d), (ch) => ch.charCodeAt(0));
    g = dd_.reduce((m, v) => Math.max(m, v), 0) * (g.top / 255) >= 3 ? { ...g, d: dd_ } : null;
  }
  ISLES.push({ h, top, md, box: [a, b, c, d], g });
  for (let k = 0; k < pos.count; k++)
    pos.setY(k, ds[k] < 0 ? -3 : isleShape(ISLES[ISLES.length - 1], cx + pos.getX(k) / S, cy + pos.getZ(k) / S, ds[k]));
  geo.computeVertexNormals();
  // 地形と同じ材質で描く（岩肌・森・山ひだ・霞・夜の山並みが島にも付く）。色は地形の頂点色と同じ決め方
  {
    const col = new Float32Array(pos.count * 3),
      C = new THREE.Color();
    for (let k = 0; k < pos.count; k++) {
      const hh = (pos.getY(k) - 0.6) / (S * VEX);
      if (hh < 60) C.set(0x6b7a52);
      else C.set(0x4c5f3c).lerp(new THREE.Color(0x3b4c33), Math.min(1, (hh - 60) / 340));
      col.set([C.r, C.g, C.b], k * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.setAttribute("aCv", new THREE.BufferAttribute(new Float32Array(pos.count), 1));
    geo.setAttribute("aNear", new THREE.BufferAttribute(new Float32Array(pos.count).fill(2), 1));
  }
  const m = new THREE.Mesh(geo, terrMat);
  m.receiveShadow = true;
  m.position.set(cx * S, 0, cy * S);
  scene.add(m);
}

// 島の地面の高さ（作品内の高さ。島の外は null）
function isleH(x, y) {
  for (const I of ISLES) {
    const [a, b, c, d] = I.box;
    if (x < a || x > c || y < b || y > d || !inPoly(x, y, I.h)) continue;
    let dd = 1e12;
    for (let i = 0; i < I.h.length - 1; i++) {
      const p = I.h[i],
        q = I.h[i + 1],
        dx = q[0] - p[0],
        dy = q[1] - p[1];
      let u = ((x - p[0]) * dx + (y - p[1]) * dy) / (dx * dx + dy * dy || 1);
      u = Math.max(0, Math.min(1, u));
      dd = Math.min(dd, Math.hypot(p[0] + u * dx - x, p[1] + u * dy - y));
    }
    return isleShape(I, x, y, dd);
  }
  return null;
}
