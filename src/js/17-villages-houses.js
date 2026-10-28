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
  [136.17, 35.18],
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
function terrainAt(x, y) {
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
  breaks = [];
{
  const R = rnd(314);
  for (const [lo, la] of VILLAGES) {
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
    const n = 110 + Math.floor(R() * 90);
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
      if (houses.some((h) => Math.hypot(h.x - x, h.y - y) < 62)) continue; // 家どうしの間隔（実寸で約95m＝作品内で約9.5m）
      if (R() < 0.07) continue;
      const north = (y - minY) / (maxY - minY) < 0.45,
        south = (y - minY) / (maxY - minY) > 0.75;
      houses.push({
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
      });
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
            isLand(x, y) &&
            !inInner(x, y) &&
            terrainAt(x, y) < 25 &&
            !houses.some((h) => Math.hypot(h.x - x, h.y - y) < 120)
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
window.__roofTex = roofTex;
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
// 窓の並びを4種類：腰窓3つ、腰窓2つと小窓、掃き出しの格子戸、高窓と格子
function wallVar(g, ox, k, upper) {
  const w = 128,
    h = 128;
  g.save();
  g.translate(ox, 0);
  g.fillStyle = "#e6e0d4";
  g.fillRect(0, 0, w, h);
  if (!upper) {
    g.fillStyle = "#6b5a48";
    g.fillRect(0, h * 0.82, w, h * 0.18);
  }
  if (k % 2) {
    g.fillStyle = "#5a4a3a";
    g.fillRect(0, h * 0.45, w, h * 0.37);
    for (let x = 0; x < w; x += 6) {
      g.fillStyle = "rgba(0,0,0,.25)";
      g.fillRect(x, h * 0.45, 1, h * 0.37);
    }
  }
  g.fillStyle = "rgba(0,0,0,.18)";
  g.fillRect(0, 0, w, 5);
  g.fillStyle = "rgba(0,0,0,.18)";
  g.fillRect(0, h * 0.2, w, 2);
  const win = (x, y, ww, hh, lat) => {
    g.fillStyle = "#4a5560";
    g.fillRect(x, y, ww, hh);
    g.fillStyle = "rgba(200,215,225,.25)";
    g.fillRect(x, y, ww, hh * 0.3);
    g.strokeStyle = "#cfc8b8";
    g.lineWidth = 2.5;
    g.strokeRect(x, y, ww, hh);
    g.beginPath();
    g.moveTo(x + ww / 2, y);
    g.lineTo(x + ww / 2, y + hh);
    g.stroke();
    if (lat) {
      g.strokeStyle = "#5a4634";
      g.lineWidth = 1.6;
      for (let i = x + 3; i < x + ww; i += 4) {
        g.beginPath();
        g.moveTo(i, y);
        g.lineTo(i, y + hh);
        g.stroke();
      }
    }
  };
  if (k === 0) {
    for (let i = 0; i < 3; i++) win(10 + i * 40, h * 0.28, 26, h * 0.34);
  } else if (k === 1) {
    win(12, h * 0.28, 34, h * 0.34);
    win(58, h * 0.28, 34, h * 0.34);
    win(104, h * 0.3, 14, h * 0.16);
  } else if (k === 2) {
    if (upper) {
      win(16, h * 0.3, 40, h * 0.3);
      win(72, h * 0.3, 40, h * 0.3);
    } else {
      win(8, h * 0.24, 50, h * 0.58, true);
      win(70, h * 0.24, 50, h * 0.58);
    }
  } else {
    win(14, h * 0.26, 30, h * 0.14);
    win(84, h * 0.26, 30, h * 0.14);
    win(50, h * 0.42, 28, h * 0.4, true);
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
  g.restore();
}
const wallAt = cvTex(512, 128, (g) => {
  for (let k = 0; k < 4; k++) wallVar(g, k * 128, k, false);
});
const wallAt2 = cvTex(512, 256, (g) => {
  for (let k = 0; k < 4; k++) {
    g.save();
    g.translate(0, 0);
    g.scale(1, 1);
    wallVar(g, k * 128, k, true);
    g.restore();
    g.save();
    g.translate(0, 128);
    wallVar(g, k * 128, (k + 1) % 4, false);
    g.restore();
  }
});
function atlasMat(tx) {
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff, map: tx });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aVar;")
      .replace("#include <uv_vertex>", "#include <uv_vertex>\nvMapUv.x=(fract(vMapUv.x*.9999)+aVar)*.25;");
  };
  return m;
}
const wallM2 = atlasMat(wallAt2);
const wallGA = wallG.clone(),
  wallGB = wallG.clone();
{
  const v = new Float32Array(houses.length);
  houses.forEach((h, i) => (v[i] = Math.floor((h.roof * 13 + h.w * 0.37) % 4)));
  wallGA.setAttribute("aVar", new THREE.InstancedBufferAttribute(v, 1));
  wallGB.setAttribute("aVar", new THREE.InstancedBufferAttribute(v.slice(), 1));
}
const walls = new THREE.InstancedMesh(wallGA, atlasMat(wallAt), houses.length),
  walls2 = new THREE.InstancedMesh(wallGB, wallM2, houses.length),
  roofs = new THREE.InstancedMesh(roofHip, roofM, houses.length),
  roofs2 = new THREE.InstancedMesh(roofGab, roofM, houses.length),
  skirt = new THREE.InstancedMesh(roofHip, roofM, houses.length);
{
  const M = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    e = new THREE.Euler(),
    c = new THREE.Color();
  houses.forEach((h, i) => {
    const gy = 0.6 + h.ground * S * VEX;
    q.setFromEuler(e.set(0, -h.rot, 0));
    M.compose(new THREE.Vector3(h.x * S, gy, h.y * S), q, new THREE.Vector3(h.w, h.h, h.d));
    {
      const two = h.h > 5;
      (two ? walls2 : walls).setMatrixAt(i, M);
      (two ? walls : walls2).setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
    }
    {
      const wc =
        h.roof < 0.22
          ? 0x3a322b
          : h.roof < 0.3
            ? 0x6a5a48
            : h.roof < 0.42
              ? 0xece6da
              : h.roof < 0.7
                ? 0xbfb6a6
                : 0x8a7f70;
      walls2.setColorAt(i, new THREE.Color(wc));
      walls.setColorAt(i, c.set(wc));
    }
    M.compose(new THREE.Vector3(h.x * S, gy + h.h, h.y * S), q, new THREE.Vector3(h.d, h.w * 0.75, h.w));
    // 屋根は棟を長手方向に。ExtrudeはZ方向に伸びるので、幅dで回転を合わせる
    const hip = (h.roof * 7) % 1 < 0.5;
    M.compose(new THREE.Vector3(h.x * S, gy + h.h, h.y * S), q, new THREE.Vector3(h.w, h.d * 0.95, h.d));
    (hip ? roofs : roofs2).setMatrixAt(i, M);
    const Z = new THREE.Matrix4().makeScale(0, 0, 0);
    (hip ? roofs2 : roofs).setMatrixAt(i, Z);
    if (h.h > 5) {
      M.compose(
        new THREE.Vector3(h.x * S, gy + 3, h.y * S),
        q,
        new THREE.Vector3(h.w * 1.02, h.d * 0.35, h.d * 1.04),
      );
      skirt.setMatrixAt(i, M);
    } else skirt.setMatrixAt(i, Z);
    roofs.setColorAt(
      i,
      c
        .set(
          h.north
            ? h.roof < 0.85
              ? [0x2c2f34, 0x35383d, 0x3f4247][Math.floor(h.roof * 3.5) % 3]
              : 0x6b4a3a
            : h.south
              ? ROOF_COLS[Math.floor(h.roof * 8) % 8]
              : h.roof < 0.82
                ? ROOF_COLS[Math.floor(h.roof * 5)]
                : ROOF_COLS[5 + (Math.floor((h.roof - 0.82) / 0.06) % 3)],
        )
        .offsetHSL(0, 0, (((h.w * 13) % 10) - 5) * 0.006),
    );
  });
}
for (let i = 0; i < houses.length; i++) {
  const cc = new THREE.Color();
  roofs.getColorAt(i, cc);
  roofs2.setColorAt(i, cc);
  skirt.setColorAt(i, cc.clone().multiplyScalar(0.85));
}
for (const m of [walls, walls2, roofs, roofs2, skirt]) {
  m.castShadow = HQ;
  m.receiveShadow = HQ;
}
scene.add(walls, walls2, roofs, roofs2, skirt);
for (const o of [walls, walls2, roofs, roofs2, skirt]) {
  o.castShadow = true;
  o.receiveShadow = true;
}
{
  const gp = [];
  for (const sx of [-1, 1]) {
    const A = [sx * 0.5, 0, -0.5],
      B = [sx * 0.5, 0, 0.5],
      Rr = [sx * 0.5, ((0.97 * 0.42) / 0.95) * 0 + 0.42, 0];
    if (sx > 0) gp.push(...A, ...Rr, ...B);
    else gp.push(...A, ...B, ...Rr);
  }
  const gg = new THREE.BufferGeometry();
  gg.setAttribute("position", new THREE.Float32BufferAttribute(gp, 3));
  gg.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 0.5, 1, 1, 0, 0, 0, 1, 0, 0.5, 1], 2));
  gg.computeVertexNormals();
  const GW = new THREE.InstancedMesh(
      gg,
      new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
      houses.length,
    ),
    M = new THREE.Matrix4(),
    c = new THREE.Color();
  houses.forEach((h, i) => {
    const hip = (h.roof * 7) % 1 < 0.5;
    if (hip) {
      M.makeScale(0, 0, 0);
    } else
      M.compose(
        new THREE.Vector3(h.x * S, 0.6 + h.ground * S * VEX + h.h, h.y * S),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -h.rot, 0)),
        new THREE.Vector3(h.w, h.d * 0.95, h.d),
      );
    GW.setMatrixAt(i, M);
    walls.getColorAt(i, c);
    GW.setColorAt(i, c.clone().multiplyScalar(0.92));
  });
  scene.add(GW);
}
{
  const eb = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 0.25, 1),
      new THREE.MeshLambertMaterial({ color: 0x2a2622 }),
      houses.length,
    ),
    M = new THREE.Matrix4();
  houses.forEach((h, i) => {
    M.compose(
      new THREE.Vector3(h.x * S, 0.6 + h.ground * S * VEX + h.h - 0.12, h.y * S),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -h.rot, 0)),
      new THREE.Vector3(h.w * 1.04, 1, h.d * 1.04),
    );
    eb.setMatrixAt(i, M);
  });
  scene.add(eb);
}
{
  const dr = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1.6, 2.1, 0.08).translate(0, 1.05, 0),
      new THREE.MeshLambertMaterial({ color: 0x4a3a2c }),
      houses.length,
    ),
    M = new THREE.Matrix4();
  houses.forEach((h, i) => {
    const fx = -Math.sin(h.rot),
      fz = Math.cos(h.rot);
    M.compose(
      new THREE.Vector3(
        h.x * S + fx * h.d * 0.505 + Math.cos(h.rot) * h.w * 0.35,
        0.6 + h.ground * S * VEX,
        h.y * S + fz * h.d * 0.505 + Math.sin(h.rot) * h.w * 0.35,
      ),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -h.rot, 0)),
      new THREE.Vector3(1, 1, 1),
    );
    dr.setMatrixAt(i, M);
  });
  scene.add(dr);
}
{
  const ac = houses.filter((_, i) => i % 3 === 1),
    I = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.8, 0.6, 0.35),
      new THREE.MeshLambertMaterial({ color: 0xd8d8d2 }),
      ac.length,
    ),
    M = new THREE.Matrix4();
  ac.forEach((h, i) => {
    const fx = -Math.sin(h.rot),
      fz = Math.cos(h.rot);
    M.compose(
      new THREE.Vector3(
        h.x * S - fx * (h.d * 0.5 + 0.3),
        0.6 + h.ground * S * VEX + 0.4,
        h.y * S - fz * (h.d * 0.5 + 0.3),
      ),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -h.rot, 0)),
      new THREE.Vector3(1, 1, 1),
    );
    I.setMatrixAt(i, M);
  });
  scene.add(I);
}
{
  const rg = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 0.35, 0.45),
      new THREE.MeshLambertMaterial({ color: 0x1f2124 }),
      houses.length,
    ),
    M = new THREE.Matrix4();
  houses.forEach((h, i) => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -h.rot + Math.PI / 2, 0));
    M.compose(
      new THREE.Vector3(h.x * S, 0.6 + h.ground * S * VEX + h.h + h.d * 0.9 * 0.42, h.y * S),
      q,
      new THREE.Vector3(h.w * 1.08, 1, 1),
    );
    const hip = (h.roof * 7) % 1 < 0.5;
    M.compose(
      new THREE.Vector3(h.x * S, 0.6 + h.ground * S * VEX + h.h + h.d * 0.95 * 0.42, h.y * S),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -h.rot, 0)),
      new THREE.Vector3(hip ? h.w * 0.52 : h.w * 1.16, 1, 1),
    );
    rg.setMatrixAt(i, M);
  });
  scene.add(rg);
}
{
  const sh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }),
      houses.length,
    ),
    M = new THREE.Matrix4();
  houses.forEach((h, i) => {
    M.compose(
      new THREE.Vector3(h.x * S + 0.8, 0.62 + h.ground * S * VEX, h.y * S + 0.8),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -h.rot, 0)),
      new THREE.Vector3(h.w * 1.4, 1, h.d * 1.4),
    );
    sh.setMatrixAt(i, M);
  });
  scene.add(sh);
}
{
  const gt = houses.filter((_, i) => i % 3 === 0);
  cardForest(
    "broad",
    gt.map((h, i) => {
      const x = h.x + (Math.cos(h.rot + 1.6) * 7) / S,
        y = h.y + (Math.sin(h.rot + 1.6) * 7) / S;
      return [x, y, 0.6 + terrainAt(x, y) * S * VEX, 0.55 + ((i * 37) % 10) / 22, i * 0.37];
    }),
    9,
    9,
    HQ ? 500 : 300,
    HQ ? 800 : 480,
    HQ,
  );
}
{
  const hd = [];
  for (const [x1, y1, x2, y2] of roads) {
    if (inLake(x1, y1) || inLake(x2, y2)) continue;
    const L = Math.hypot(x2 - x1, y2 - y1);
    for (let s = 0; s < L; s += 40) {
      const x = x1 + ((x2 - x1) * s) / L,
        y = y1 + ((y2 - y1) * s) / L,
        nx = -(y2 - y1) / L,
        ny = (x2 - x1) / L;
      hd.push([x + nx * 30, y + ny * 30, Math.atan2(y2 - y1, x2 - x1)]);
    }
  }
  const H = new THREE.InstancedMesh(
    lumpy(1, rnd(12), 2, 0.12).scale(1.8, 0.6, 0.7).translate(0, 0.5, 0),
    NEAR_TREE_MAT(),
    hd.length,
  );
  H.material.vertexColors = false;
  H.material.color.set(0x5a7a46);
  const M = new THREE.Matrix4();
  hd.forEach(([x, y, r], i) => {
    if (inLake(x, y) || distShore(x, y) < 25) {
      M.makeScale(0, 0, 0);
    } else
      M.compose(
        new THREE.Vector3(x * S, 0.6 + terrainAt(x, y) * S * VEX, y * S),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -r, 0)),
        new THREE.Vector3(1, 1, 1),
      );
    H.setMatrixAt(i, M);
  });
  scene.add(H);
}
{
  const pl = [];
  roads.forEach(([x1, y1, x2, y2], i) => {
    if (i % 2 || inLake(x1, y1)) return;
    const L = Math.hypot(x2 - x1, y2 - y1) || 1;
    pl.push([x1 - ((y2 - y1) / L) * 28, y1 + ((x2 - x1) / L) * 28]);
  });
  {
    const sg = new THREE.BufferGeometry();
    sg.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        pl.flatMap(([x, y]) => [x * S, 0.6 + terrainAt(x, y) * S * VEX + 6.2, y * S]),
        3,
      ),
    );
    window.__street = new THREE.Points(
      sg,
      new THREE.PointsMaterial({
        color: 0xfff0d0,
        size: 2.4,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    scene.add(window.__street);
  }
  const P = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.08, 0.1, 6.5, 5).translate(0, 3.25, 0).toNonIndexed(),
      new THREE.MeshLambertMaterial({ color: 0x8a857c }),
      pl.length,
    ),
    M = new THREE.Matrix4();
  pl.forEach(([x, y], i) => {
    if (inLake(x, y) || distShore(x, y) < 20) {
      M.makeScale(0, 0, 0);
      P.setMatrixAt(i, M);
      return;
    }
    M.makeTranslation(x * S, 0.6 + terrainAt(x, y) * S * VEX, y * S);
    P.setMatrixAt(i, M);
  });
  scene.add(P);
}
{
  const R2 = rnd(71),
    gs = [];
  for (let i = 0; i < outer.length - 1 && gs.length < 6000; i++) {
    const a = outer[i],
      b = outer[i + 1],
      L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    let nx = -(b[1] - a[1]) / L,
      ny = (b[0] - a[0]) / L;
    if (inLake(a[0] + nx * 60, a[1] + ny * 60)) {
      nx = -nx;
      ny = -ny;
    }
    for (let s = 0; s < L; s += 30) {
      const q = 25 + R2() * 120,
        x = a[0] + ((b[0] - a[0]) * s) / L + nx * q,
        y = a[1] + ((b[1] - a[1]) * s) / L + ny * q;
      if (!inLake(x, y) && !inReeds(x, y)) gs.push([x, y, R2()]);
    }
  }
  const grassTex = cvTex(64, 64, (g, w, h) => {
    for (let i = 0; i < 40; i++) {
      const x = 4 + Math.random() * 56;
      g.strokeStyle = `rgba(${(110 + Math.random() * 40) | 0},${(135 + Math.random() * 35) | 0},70,1)`;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(x, 64);
      g.quadraticCurveTo(
        x + (Math.random() - 0.5) * 10,
        40,
        x + (Math.random() - 0.5) * 18,
        10 + Math.random() * 30,
      );
      g.stroke();
    }
  });
  const gGeo = (() => {
    const a = new THREE.PlaneGeometry(1.4, 1).translate(0, 0.5, 0),
      b = a.clone().rotateY(Math.PI / 2);
    const m = new THREE.BufferGeometry();
    const pa = [...a.attributes.position.array, ...b.attributes.position.array],
      ua = [...a.attributes.uv.array, ...b.attributes.uv.array];
    m.setAttribute("position", new THREE.Float32BufferAttribute(pa, 3));
    m.setAttribute("uv", new THREE.Float32BufferAttribute(ua, 2));
    m.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(
        new Array(pa.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)),
        3,
      ),
    );
    m.setIndex([...a.index.array, ...[...b.index.array].map((i) => i + 4)]);
    return m;
  })();
  const G = (window.__grass = new THREE.InstancedMesh(
      gGeo,
      treeFade(
        new THREE.MeshLambertMaterial({
          color: 0xffffff,
          map: grassTex,
          alphaTest: 0.5,
          side: THREE.DoubleSide,
        }),
        140,
        220,
      ),
      gs.length,
    )),
    M = new THREE.Matrix4(),
    cc = new THREE.Color();
  gs.forEach(([x, y, r], i) => {
    M.compose(
      new THREE.Vector3(x * S, 0.6 + terrainAt(x, y) * S * VEX, y * S),
      new THREE.Quaternion(),
      new THREE.Vector3(1 + r, 0.6 + r, 1 + r),
    );
    G.setMatrixAt(i, M);
    G.setColorAt(i, cc.setHSL(0.22 + r * 0.06, 0.35, 0.32 + r * 0.12));
  });
  scene.add(G);
}
{
  const sd = houses.filter((_, i) => i % 5 === 2),
    I = new THREE.InstancedMesh(
      new THREE.BoxGeometry(3, 2.2, 2.6).translate(0, 1.1, 0),
      new THREE.MeshLambertMaterial({ color: 0x7d7468 }),
      sd.length,
    ),
    M = new THREE.Matrix4();
  sd.forEach((h, i) => {
    const bx = -Math.sin(h.rot) * (h.d * 0.5 + 3),
      bz = Math.cos(h.rot) * (h.d * 0.5 + 3);
    M.compose(
      new THREE.Vector3(h.x * S - bx, 0.6 + h.ground * S * VEX, h.y * S - bz),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -h.rot, 0)),
      new THREE.Vector3(1, 1, 1),
    );
    I.setMatrixAt(i, M);
  });
  scene.add(I);
}
{
  const sw = [];
  for (const [x1, y1, x2, y2] of roads) {
    const L = Math.hypot(x2 - x1, y2 - y1) || 1;
    let nx = -(y2 - y1) / L,
      ny = (x2 - x1) / L;
    if (!inLake(x1 + nx * 80, y1 + ny * 80)) {
      nx = -nx;
      ny = -ny;
    }
    const mx = (x1 + x2) / 2 + nx * 45,
      my = (y1 + y2) / 2 + ny * 45;
    if (!inLake(mx, my) && !inReeds(mx, my)) sw.push([mx, my, Math.atan2(y2 - y1, x2 - x1), L]);
  }
  const I = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1.1, 0.8).translate(0, -0.2, 0),
      new THREE.MeshLambertMaterial({
        color: 0x8d8a80,
        map: cvTex(64, 32, (g, w, h) => {
          g.fillStyle = "#fff";
          g.fillRect(0, 0, w, h);
          for (let y = 0; y < h; y += 8)
            for (let x = ((y / 8) % 2) * 6; x < w; x += 12) {
              g.strokeStyle = "rgba(0,0,0,.35)";
              g.strokeRect(x, y, 12, 8);
            }
        }),
      }),
      sw.length,
    ),
    M = new THREE.Matrix4();
  sw.forEach(([x, y, r, L], i) => {
    if (inLake(x, y) || distShore(x, y) < 20) {
      M.makeScale(0, 0, 0);
      I.setMatrixAt(i, M);
      return;
    }
    M.compose(
      new THREE.Vector3(x * S, 0.6 + terrainAt(x, y) * S * VEX, y * S),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -r, 0)),
      new THREE.Vector3(L * S * 1.05, 1, 1),
    );
    I.setMatrixAt(i, M);
  });
  scene.add(I);
}
