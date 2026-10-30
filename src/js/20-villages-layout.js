/* ---------- 湖岸集落：黒い瓦屋根の家並み、岸沿いの道、背後の田んぼ、港の防波堤（位置は概略。家は実物大、集落の広がりは縮尺どおり） ---------- */
const VILLAGES = [
  [136.075, 35.342],
  [136.03, 35.41],
  [136.075, 35.478],
  [136.06, 35.458],
  [136.13, 35.5],
  [136.165, 35.47],
  [136.17, 35.518],
  [136.222, 35.462],
  [136.21, 35.432],
  [136.262, 35.38],
  [136.275, 35.33],
  [136.245, 35.28],
  [136.205, 35.228],
  [136.1166, 35.2108], // 栗見出在家（岸から5km離れていた点を、湖岸の集落へ）
  [136.065, 35.2],
  [136.06, 35.16],
  [136.01, 35.11],
  [135.97, 35.09],
  [135.942, 35.06],
  [135.875, 35.01],
  [135.872, 35.065],
  [135.897, 35.09],
  [135.92, 35.115],
  [135.935, 35.165],
  [135.96, 35.23],
  [136.005, 35.265],
  [136.06, 35.31],
];
// 地面の高さの窓口（実寸の x, y → 作品内の高さ y）。陸・島・湖の振り分けはここだけで行う
//   landY   ：陸の地面（湖の外の地形）
//   groundH ：どこでも使える地面。島なら島の丘、湖なら水面(0)、陸なら landY
function landY(x, y) {
  return 0.6 + terrainAt(x, y) * S * VEX;
}
function groundH(x, y) {
  const ih = isleH(x, y);
  if (ih !== null) return ih;
  return inLake(x, y) ? 0 : landY(x, y);
}
function terrainAt(x, y) {
  const nh = nearAt(x, y); // 岸近くは細かい地形（16-terrain.js）
  if (nh !== null) return Math.max(0, nh);
  const i = (x - tx0) / tdx,
    j = (y - ty0) / tdy,
    i0 = Math.floor(i),
    j0 = Math.floor(j);
  if (i0 < 0 || j0 < 0 || i0 >= TW - 1 || j0 >= TH - 1) return 0;
  const u = i - i0,
    v = j - j0,
    g = (a, b) => Math.max(0, terrH[b * TW + a]);
  return (
    g(i0, j0) * (1 - u) * (1 - v) +
    g(i0 + 1, j0) * u * (1 - v) +
    g(i0, j0 + 1) * (1 - u) * v +
    g(i0 + 1, j0 + 1) * u * v
  );
}
const isLand = (x, y) => !inLake(x, y);
const houses = [],
  paddies = [],
  roads = [],
  breaks = [],
  streets = []; // 実際の道（地理院のベクトルタイル）：{ w: 幅の段, p: [[x, y], …] }。描くのは 22-village-lights-roads.js
// 田・畑・森の地図記号（tools/landuse.py → data/landuse.json）：種類 0 田・1 畑・2 広葉樹林・3 針葉樹林・4 竹林。500m四方の升で引く
const LANDUSE = __LANDUSE__;
const luPts = [],
  luIdx = new Map();
if (LANDUSE && LANDUSE.n) {
  const B = Uint8Array.from(atob(LANDUSE.d), (ch) => ch.charCodeAt(0)),
    dv = new DataView(B.buffer);
  for (let i = 0; i < LANDUSE.n; i++) {
    const p = [B[i * 5], dv.getInt16(i * 5 + 1, true) * 10, dv.getInt16(i * 5 + 3, true) * 10];
    luPts.push(p);
    const k = Math.floor(p[1] / 500) * 65536 + Math.floor(p[2] / 500);
    if (!luIdx.has(k)) luIdx.set(k, []);
    luIdx.get(k).push(p);
  }
}
// (x, y) からいちばん近い記号（kinds の種類だけ）。r より遠ければ null
function luNearest(x, y, r, kinds) {
  const n = Math.ceil(r / 500),
    cu = Math.floor(x / 500),
    cv = Math.floor(y / 500);
  let best = null,
    bd = r * r;
  for (let u = cu - n; u <= cu + n; u++)
    for (let v = cv - n; v <= cv + n; v++)
      for (const p of luIdx.get(u * 65536 + v) || []) {
        if (!kinds.includes(p[0])) continue;
        const d = (p[1] - x) ** 2 + (p[2] - y) ** 2;
        if (d < bd) (bd = d), (best = p);
      }
  return best;
}
// 実際の家並み（tools/towns.py → data/towns.json）：岸に近い順に並んでいる。1軒8バイト（x/2, y/2, 幅, 奥行き, 向き×40, 種類）
const TOWNS = __TOWNS__;
// 家の位置の升（120m四方）：近くに家があるかを、全部の家を調べずに確かめる（森・田の置き場所で何十万回も使う）
const houseGrid = new Map();
function addHouse(hs) {
  if (meishoClear(hs.x, hs.y)) return; // 名所の建物の上には建てない（03b-meisho-sites.js）
  houses.push(hs);
  const k = Math.floor(hs.x / 120) * 65536 + Math.floor(hs.y / 120);
  if (!houseGrid.has(k)) houseGrid.set(k, []);
  houseGrid.get(k).push(hs);
}
// (x, y) から r 以内に家があるか。box が真なら縦横それぞれ r 以内（四角）で調べる
function houseNear(x, y, r, box = false) {
  const n = Math.ceil(r / 120),
    cu = Math.floor(x / 120),
    cv = Math.floor(y / 120);
  for (let u = cu - n; u <= cu + n; u++)
    for (let v = cv - n; v <= cv + n; v++) {
      const l = houseGrid.get(u * 65536 + v);
      if (l) for (const h of l) if (box ? Math.abs(h.x - x) < r && Math.abs(h.y - y) < r : Math.hypot(h.x - x, h.y - y) < r) return true;
    }
  return false;
}
// 家を建ててよいか：陸の上で、内湖・川・急な斜面でなく、四隅が湖に出ず、敷地に川が通らない
function houseOk(hs) {
  const { x, y } = hs;
  if (!isLand(x, y) || inInner(x, y) || distShore(x, y) < 55) return false;
  const th = terrainAt(x, y);
  if (th > 60) return false;
  for (let k = 0; k < 8; k++) {
    const q = (k / 8) * 6.283;
    if (terrainAt(x + Math.cos(q) * 350, y + Math.sin(q) * 350) > th + 70) return false;
  }
  const c = Math.cos(hs.rot),
    sn = Math.sin(hs.rot),
    hw = (hs.w / 2 + 1) / S,
    hd = (hs.d / 2 + 1) / S;
  if ([[-1, -1], [1, -1], [1, 1], [-1, 1]].some(([u, v]) => inLake(x + u * hw * c - v * hd * sn, y + u * hw * sn + v * hd * c))) return false;
  // 陸の川は細いので、四隅の間を抜けることがある：敷地の中を7×7の点で調べる
  for (let i = 0; i < 7; i++)
    for (let j = 0; j < 7; j++) {
      const u = i / 3 - 1,
        v = j / 3 - 1;
      if (inRiver(x + u * hw * c - v * hd * sn, y + u * hw * sn + v * hd * c)) return false;
    }
  hs.ground = th;
  return true;
}
if (TOWNS && TOWNS.n) {
  const R = rndFor("towns"),
    B = Uint8Array.from(atob(TOWNS.b), (ch) => ch.charCodeAt(0)),
    dv = new DataView(B.buffer),
    cap = QUALITY.towns;
  for (let i = 0; i < TOWNS.n && houses.length < cap; i++) {
    const o = i * 8,
      x = dv.getInt16(o, true) * 2,
      y = dv.getInt16(o + 2, true) * 2,
      sturdy = B[o + 7] === 1,
      north = (y - minY) / (maxY - minY) < 0.45,
      south = (y - minY) / (maxY - minY) > 0.75;
    // 大きさは実際の建物の外接長方形から（作品の中では実物大）。とても大きな建物（工場など）は家並みに合う大きさまで
    const hs = {
      x,
      y,
      north,
      south,
      rot: dv.getInt8(o + 6) / 40 + (R() - 0.5) * 0.04, // 作品の座標（x 東・y 南）での向き
      w: Math.min(19, Math.max(6.5, B[o + 4])),
      d: Math.min(13, Math.max(5.5, B[o + 5])),
      h: sturdy ? 6.5 + R() * 3 : 3.1 + (R() < (south ? 0.65 : north ? 0.25 : 0.4) ? 2.7 : 0) + R() * 0.5,
      roof: R(),
      ground: 0,
    };
    if (houseOk(hs)) addHouse(hs);
  }
  const rb = Uint8Array.from(atob(TOWNS.r), (ch) => ch.charCodeAt(0)),
    rv = new DataView(rb.buffer);
  for (let o = 0; o < rb.length; ) {
    const w = rb[o],
      n = rb[o + 1],
      p = [];
    o += 2;
    for (let k = 0; k < n; k++, o += 4) p.push([rv.getInt16(o, true) * 5, rv.getInt16(o + 2, true) * 5]);
    streets.push({ w, p });
  }
}
{
  for (const [lo, la] of VILLAGES) {
    const R = rndFor("village:" + lo + "," + la); // 集落ごとの乱数（ほかの集落を足し引き・移動しても、この集落の家・道・田は変わらない）
    const [vx, vy] = ll(lo, la);
    // 岸の一番近い点と、陸へ向かう向き
    let best = null,
      bd = 1e12;
    for (const poly of [outer, ...islands])
      for (let i = 0; i < poly.length - 1; i++) {
        const p = poly[i],
          d = (p[0] - vx) ** 2 + (p[1] - vy) ** 2;
        if (d < bd) {
          bd = d;
          best = [poly, i];
        }
      }
    const [poly, i0] = best;
    const n = TOWNS && TOWNS.n ? 0 : 110 + Math.floor(R() * 90); // 実際の家並みがあるときは、作り話の家を建てない
    for (let k = 0; k < n * 3 && houses.length < 7000; k++) {
      const i =
          (i0 + Math.floor((R() - 0.5) * Math.min(26, poly.length / 3)) + poly.length * 4) %
          (poly.length - 1),
        a = poly[i],
        b = poly[i + 1],
        L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1,
        u = R();
      let nx = -(b[1] - a[1]) / L,
        ny = (b[0] - a[0]) / L;
      const px = a[0] + (b[0] - a[0]) * u,
        py = a[1] + (b[1] - a[1]) * u;
      if (!isLand(px + nx * 80, py + ny * 80)) {
        nx = -nx;
        ny = -ny;
      }
      const back = (R() < 0.45 ? 65 : 120) + Math.pow(R(), 1.5) * 400,
        x = px + nx * back,
        y = py + ny * back;
      if (!isLand(x, y) || inInner(x, y) || distShore(x, y) < 55) continue;
      const th = terrainAt(x, y);
      if (th > 45) continue;
      {
        let steep = false;
        for (let k = 0; k < 8 && !steep; k++) {
          const q = (k / 8) * 6.283;
          if (terrainAt(x + Math.cos(q) * 350, y + Math.sin(q) * 350) > th + 70) steep = true;
        }
        if (steep) continue;
      }
      if (houseNear(x, y, 62)) continue; // 家どうしの間隔（実寸で約95m＝作品内で約9.5m）
      if (R() < 0.07) continue;
      const north = (y - minY) / (maxY - minY) < 0.45,
        south = (y - minY) / (maxY - minY) > 0.75;
      const hs = {
        x,
        y,
        north,
        south,
        rot: Math.atan2(b[1] - a[1], b[0] - a[0]) + (R() < 0.7 ? 0 : Math.PI / 2) + (R() - 0.5) * 0.06,
        w: 7 + R() * 6 + (R() < 0.15 ? 6 : 0) + (south ? 2 : 0),
        d: 6 + R() * 3.5 + (north ? 0.8 : 0),
        h: 3.1 + (R() < (south ? 0.65 : north ? 0.25 : 0.4) ? 2.7 : 0) + R() * 0.5,
        roof: R(),
        ground: th,
      };
      // 家の四隅（と少しの余白）まで陸に収まるときだけ建てる（内湖や湖にはみ出さない）
      {
        const c = Math.cos(hs.rot),
          sn = Math.sin(hs.rot),
          hw = (hs.w / 2 + 1) / S,
          hd = (hs.d / 2 + 1) / S;
        if ([[-1, -1], [1, -1], [1, 1], [-1, 1]].some(([u, v]) => inLake(x + u * hw * c - v * hd * sn, y + u * hw * sn + v * hd * c))) continue;
        // 陸の川は細いので、四隅の間を抜けることがある：敷地の中を7×7の点で調べる
        let wet = false;
        for (let i = 0; i < 7 && !wet; i++)
          for (let j = 0; j < 7 && !wet; j++) {
            const u = i / 3 - 1,
              v = j / 3 - 1;
            wet = inRiver(x + u * hw * c - v * hd * sn, y + u * hw * sn + v * hd * c);
          }
        if (wet) continue;
      }
      addHouse(hs);
    }
    // 岸沿いの道
    for (let k = -8; k < 8; k++) {
      const i = (i0 + k + poly.length * 4) % (poly.length - 1),
        a = poly[i],
        b = poly[i + 1],
        L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      let nx = -(b[1] - a[1]) / L,
        ny = (b[0] - a[0]) / L;
      if (!isLand(a[0] + nx * 80, a[1] + ny * 80)) {
        nx = -nx;
        ny = -ny;
      }
      roads.push([a[0] + nx * 35, a[1] + ny * 35, b[0] + nx * 35, b[1] + ny * 35]);
    }
    // 背後の田んぼ
    {
      const a = poly[i0],
        b = poly[(i0 + 1) % (poly.length - 1)],
        L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      let nx = -(b[1] - a[1]) / L,
        ny = (b[0] - a[0]) / L,
        tx = (b[0] - a[0]) / L,
        ty = (b[1] - a[1]) / L;
      if (!isLand(a[0] + nx * 80, a[1] + ny * 80)) {
        nx = -nx;
        ny = -ny;
      }
      for (let r = 0; r < 4; r++)
        for (let c = -5; c <= 5; c++) {
          const x = a[0] + nx * (560 + r * 170) + tx * c * 190,
            y = a[1] + ny * (560 + r * 170) + ty * c * 190;
          if (
            !luPts.length && // 地図記号の田があるときは、そちらから置く（下）
            isLand(x, y) &&
            !inInner(x, y) &&
            !inRiver(x, y) &&
            terrainAt(x, y) < 25 &&
            !houseNear(x, y, 120)
          )
            paddies.push({ x, y, rot: Math.atan2(ty, tx), v: R() });
        }
    }
  }
  // 港の防波堤
  for (const p of Object.values(PORT)) {
    let a = 0,
      bd2 = 1e12;
    for (let t = 0; t < 6.28; t += 0.2) {
      const d = depth(p[0] + Math.cos(t) * 300, p[1] + Math.sin(t) * 300);
      if (d > 0 && d < bd2) {
      }
      if (
        inLake(p[0] + Math.cos(t) * 300, p[1] + Math.sin(t) * 300) &&
        depth(p[0] + Math.cos(t) * 300, p[1] + Math.sin(t) * 300) > (breaks.a || 0)
      ) {
        a = t;
      }
    }
    breaks.push({ x: p[0] + Math.cos(a) * 120, y: p[1] + Math.sin(a) * 120, rot: a + Math.PI / 2 });
    placeLog("防波堤", "water", [[breaks.at(-1).x, breaks.at(-1).y]]);
  }
}
// 実際の田：地図記号の田（と畑）のまわりを、区画（80×45m）の格子で隙間なく埋める。格子の向きは2km四方ごとにそろえる（条里の田のように）
if (luPts.length) {
  const R = rndFor("paddies"),
    PW = 81,
    PD = 46,
    cells = new Set();
  for (const [k, px, py] of luPts) if (k <= 1) cells.add(Math.floor(px / 2000) * 65536 + Math.floor(py / 2000));
  for (const key of [...cells].sort((a, b) => a - b)) {
    const cu = Math.floor(key / 65536),
      cv = key - cu * 65536,
      rot = Math.round(Math.sin(cu * 12.9 + cv * 78.2) * 3) * 0.15,
      c = Math.cos(rot),
      s = Math.sin(rot),
      mx = (cu + 0.5) * 2000,
      my = (cv + 0.5) * 2000;
    for (let a = -1500; a <= 1500; a += PW)
      for (let b = -1500; b <= 1500; b += PD) {
        const x = mx + a * c - b * s,
          y = my + a * s + b * c;
        if (Math.floor(x / 2000) !== cu || Math.floor(y / 2000) !== cv) continue; // 隣の升の格子と重ねない
        const p = luNearest(x, y, 75, [0, 1]);
        if (!p || !isLand(x, y) || inInner(x, y) || inRiver(x, y) || distShore(x, y) < 60 || terrainAt(x, y) > 40 || houseNear(x, y, 45)) continue;
        const v = R();
        paddies.push({ x, y, rot, v: p[0] === 1 ? 0.15 * v : v, field: p[0] === 1 });
      }
  }
}
const ROOF_COLS = [0x3c4046, 0x474b51, 0x707479, 0x969ba0, 0x51606e, 0x7a4038, 0x4f7ea8, 0x5a9590];
const wallG = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const roofShape = new THREE.Shape([
  new THREE.Vector2(-0.66, -0.04),
  new THREE.Vector2(0.66, -0.04),
  new THREE.Vector2(0.66, 0),
  new THREE.Vector2(0, 0.42),
  new THREE.Vector2(-0.66, 0),
]);
const roofG = new THREE.ExtrudeGeometry(roofShape, { depth: 1.1, bevelEnabled: false }).translate(
  0,
  0,
  -0.55,
);
function roofGeom(hip) {
  const ex = 0.6,
    ez = 0.7,
    rh = hip ? 0.36 : 0.33,
    rx = hip ? 0.26 : ex,
    N = 6,
    pos = [];
  const P = (x, y, z) => [x, y, z];
  const sag = (u) => -0.03 * Math.sin(Math.PI * u); // 屋根面のわずかな反り
  for (const sz of [-1, 1]) {
    for (let i = 0; i < N; i++) {
      const u0 = i / N,
        u1 = (i + 1) / N;
      const row = (u) => {
        const z = sz * ez * (1 - u),
          y = rh * u + sag(u),
          x = ex + (rx - ex) * u;
        return [
          [-x, y, z],
          [x, y, z],
        ];
      };
      const [a0, b0] = row(u0),
        [a1, b1] = row(u1);
      if (sz < 0) pos.push(...a0, ...b0, ...b1, ...a0, ...b1, ...a1);
      else pos.push(...a0, ...b1, ...b0, ...a0, ...a1, ...b1);
    }
  }
  if (hip) {
    for (const sx of [-1, 1]) {
      const A = [sx * ex, 0, -ez],
        B = [sx * ex, 0, ez],
        Rr = [sx * rx, rh, 0];
      if (sx > 0) pos.push(...A, ...Rr, ...B);
      else pos.push(...A, ...B, ...Rr);
    }
  }

  // 軒裏（下面）
  pos.push(
    -ex,
    -0.001,
    -ez,
    ex,
    -0.001,
    ez,
    ex,
    -0.001,
    -ez,
    -ex,
    -0.001,
    -ez,
    -ex,
    -0.001,
    ez,
    ex,
    -0.001,
    ez,
  );
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const uv = [];
  for (let i = 0; i < pos.length; i += 3) uv.push(pos[i] * 2, pos[i + 2] * 2 + pos[i + 1] * 2);
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
const roofHip = roofGeom(true),
  roofGab = roofGeom(false);
function cvTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const tx = new THREE.CanvasTexture(c);
  tx.colorSpace = THREE.SRGBColorSpace;
  tx.anisotropy = 4;
  return tx;
}
const wallTex = cvTex(128, 128, (g, w, h) => {
  g.fillStyle = "#e6e0d4";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#6b5a48";
  g.fillRect(0, h * 0.82, w, h * 0.18); // 腰板
  g.fillStyle = "rgba(0,0,0,.18)";
  g.fillRect(0, h * 0.2, w, 2);
  for (let i = 0; i < 3; i++) {
    g.fillStyle = "#4a5560";
    g.fillRect(10 + i * 40, h * 0.28, 26, h * 0.34);
    g.fillStyle = "rgba(200,215,225,.25)";
    g.fillRect(10 + i * 40, h * 0.28, 26, h * 0.1);
    g.strokeStyle = "#cfc8b8";
    g.lineWidth = 2.5;
    g.strokeRect(10 + i * 40, h * 0.28, 26, h * 0.34);
    g.beginPath();
    g.moveTo(23 + i * 40, h * 0.28);
    g.lineTo(23 + i * 40, h * 0.62);
    g.stroke();
  }
  g.fillStyle = "rgba(0,0,0,.06)";
  for (let i = 0; i < w; i += 6) g.fillRect(i, 0, 1, h);
  const gr = g.createLinearGradient(0, h * 0.6, 0, h);
  gr.addColorStop(0, "rgba(60,50,40,0)");
  gr.addColorStop(1, "rgba(60,50,40,.25)");
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
  g.fillStyle = "rgba(0,0,0,.35)";
  g.fillRect(0, 0, w, 5);
});
const roofTex = cvTex(128, 128, (g, w, h) => {
  g.fillStyle = "#fff";
  g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 16) {
    const gr = g.createLinearGradient(0, y, 0, y + 16);
    gr.addColorStop(0, "rgba(0,0,0,.42)");
    gr.addColorStop(0.25, "rgba(255,255,255,.1)");
    gr.addColorStop(1, "rgba(0,0,0,.05)");
    g.fillStyle = gr;
    g.fillRect(0, y, w, 16);
    for (let x = ((y / 16) % 2) * 8; x < w; x += 16) {
      g.fillStyle = "rgba(0,0,0,.22)";
      g.fillRect(x, y, 1.5, 16);
    }
  }
});
roofTex.wrapS = roofTex.wrapT = THREE.RepeatWrapping;
roofTex.repeat.set(1.5, 1.5);
roofTex.anisotropy = 8;
G.roofTex = roofTex;
if (typeof buildHouse === "function") buildHouse();
const wallM = new THREE.MeshLambertMaterial({ color: 0xffffff, map: wallTex }),
  roofM = new THREE.MeshLambertMaterial({ color: 0xffffff, map: roofTex, side: THREE.DoubleSide });
const roofSnowU = { value: 0 };
roofM.onBeforeCompile = (sh) => {
  sh.uniforms.uRS = roofSnowU;
  sh.vertexShader = sh.vertexShader
    .replace("#include <common>", "#include <common>\nvarying float vUp;")
    .replace(
      "#include <beginnormal_vertex>",
      "#include <beginnormal_vertex>\nvUp=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*objectNormal).y;",
    );
  sh.fragmentShader = sh.fragmentShader
    .replace("#include <common>", "#include <common>\nvarying float vUp;uniform float uRS;")
    .replace(
      "#include <map_fragment>",
      "#include <map_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.93,.95,.97),uRS*smoothstep(-.2,.3,vUp));",
    );
};
