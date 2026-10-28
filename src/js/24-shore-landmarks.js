// 防波堤
const brk = new THREE.InstancedMesh(
  new THREE.BoxGeometry(22, 1.6, 2.2),
  new THREE.MeshLambertMaterial({ color: 0x9a988f }),
  breaks.length,
);
{
  const M = new THREE.Matrix4();
  breaks.forEach((b, i) => {
    M.compose(
      new THREE.Vector3(b.x * S, 0.4, b.y * S),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -b.rot, 0)),
      new THREE.Vector3(1, 1, 1),
    );
    brk.setMatrixAt(i, M);
  });
}
scene.add(brk);

// 湖西線の高架（西岸の集落の背後を走る）
{
  const L = [
    [135.905, 35.075],
    [135.925, 35.12],
    [135.95, 35.16],
    [135.975, 35.21],
    [135.99, 35.25],
    [136.015, 35.29],
    [136.04, 35.33],
    [136.06, 35.37],
    [136.04, 35.42],
    [136.07, 35.47],
  ].map((p) => ll(...p));
  const deck = [],
    piers = [];
  for (let i = 0; i < L.length - 1; i++) {
    const [a, b] = [L[i], L[i + 1]],
      len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let s = 0; s < len; s += 250) {
      const u = s / len;
      let x = a[0] + (b[0] - a[0]) * u,
        y = a[1] + (b[1] - a[1]) * u;
      if (inLake(x, y)) continue;
      const h = terrainAt(x, y);
      deck.push([x, y, Math.atan2(b[1] - a[1], b[0] - a[0]), h]);
    }
  }
  const D = new THREE.InstancedMesh(
      new THREE.BoxGeometry(25.5, 0.9, 4),
      new THREE.MeshLambertMaterial({ color: 0xa9aaa5 }),
      deck.length,
    ),
    Pm = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1.4, 1, 2.6).translate(0, 0.5, 0),
      new THREE.MeshLambertMaterial({ color: 0xb0b0aa }),
      deck.length,
    );
  const M = new THREE.Matrix4();
  deck.forEach(([x, y, r, h], i) => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -r, 0)),
      gy = 0.6 + h * S * VEX;
    M.compose(new THREE.Vector3(x * S, gy + 9, y * S), q, new THREE.Vector3(1, 1, 1));
    D.setMatrixAt(i, M);
    M.compose(new THREE.Vector3(x * S, gy, y * S), q, new THREE.Vector3(1, 9, 1));
    Pm.setMatrixAt(i, M);
  });
  scene.add(D, Pm);
}
// 岸の松並木と砂浜
{
  const tr = [],
    sand = [];
  const R = rnd(55);
  for (let i = 0; i < outer.length - 1; i++) {
    const a = outer[i],
      b = outer[i + 1],
      L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    let nx = -(b[1] - a[1]) / L,
      ny = (b[0] - a[0]) / L;
    if (inLake(a[0] + nx * 60, a[1] + ny * 60)) {
      nx = -nx;
      ny = -ny;
    }
    for (let s = 0; s < L; s += 90) {
      const x = a[0] + ((b[0] - a[0]) * s) / L,
        y = a[1] + ((b[1] - a[1]) * s) / L;
      if (inReeds(x, y)) continue;
      if (R() < 0.5) sand.push([x + nx * 12, y + ny * 12, Math.atan2(b[1] - a[1], b[0] - a[0])]);
      if (R() < 0.35) {
        const q = 40 + R() * 30,
          px = x + nx * q,
          py = y + ny * q;
        if (!inLake(px, py) && distShore(px, py) > 25) tr.push([px, py, 0.7 + R() * 0.6]);
      }
    }
  }
  cardForest(
    "pine",
    tr.map(([x, y, s], i) => [x, y, landY(x, y), s * 1.1, i * 0.71]),
    10,
    13,
    QUALITY.nearTrees[0],
    QUALITY.nearTrees[1],
    QUALITY.treeShadow,
  );
  const M = new THREE.Matrix4();
  const sandTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    g.fillStyle = "#cdbf9e";
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 2500; i++) {
      const v = 150 + Math.random() * 80;
      g.fillStyle = `rgb(${v},${(v * 0.93) | 0},${(v * 0.78) | 0})`;
      g.fillRect(Math.random() * 128, Math.random() * 128, 1, 1);
    }
    const gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, "rgba(90,80,60,.45)");
    gr.addColorStop(0.35, "rgba(0,0,0,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    const tx = new THREE.CanvasTexture(c);
    tx.colorSpace = THREE.SRGBColorSpace;
    return tx;
  })(); // 波打ち際は濡れて暗い
  const Sd = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(11, 4.5).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ map: sandTex }),
    sand.length,
  );
  const stones = [];
  sand.forEach(([x, y, r], i) => {
    const steep =
      terrainAt(x + Math.cos(r + 1.57) * 400, y + Math.sin(r + 1.57) * 400) > 80 ||
      terrainAt(x - Math.cos(r + 1.57) * 400, y - Math.sin(r + 1.57) * 400) > 80;
    if (!steep && R() < 0.3)
      for (let k = 0; k < 3; k++) stones.push([x + (R() - 0.5) * 80, y + (R() - 0.5) * 20]);
    if (steep) {
      M.makeScale(0, 0, 0);
      Sd.setMatrixAt(i, M);
      for (let k = 0; k < 14; k++) stones.push([x + (R() - 0.5) * 100, y + (R() - 0.5) * 35]);
      return;
    }
    M.makeScale(0, 0, 0);
    Sd.setMatrixAt(i, M);
  });
  scene.add(Sd);
  const St = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.35, 0),
      new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
      stones.length,
    ),
    cc = new THREE.Color(); // 西岸の山際は石浜
  stones.forEach(([x, y], i) => {
    const s = 0.4 + R() * 1.2;
    M.compose(
      new THREE.Vector3(x * S, 0.55, y * S),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * 3, R() * 3, 0)),
      new THREE.Vector3(s, s * 0.6, s),
    );
    St.setMatrixAt(i, M);
    St.setColorAt(i, cc.setHSL(0.08, 0.08, 0.35 + R() * 0.3));
  });
  scene.add(St);
}
// 浮御堂（堅田）：湖に張り出した宝形造の小堂と橋
{
  const [x, y] = ll(135.917, 35.115),
    g = new THREE.Group(),
    dk = new THREE.MeshLambertMaterial({ color: 0x5a5650 }),
    wd = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
  for (const [px, pz] of [
    [-2.5, -2.5],
    [2.5, -2.5],
    [-2.5, 2.5],
    [2.5, 2.5],
  ]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 3), wd);
    p.position.set(px, 1, pz);
    g.add(p);
  }
  const fl = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.4, 6.5), wd);
  fl.position.y = 2.4;
  g.add(fl);
  const w = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.4, 4.5), wd);
  w.position.y = 3.8;
  g.add(w);
  const r = new THREE.Mesh(new THREE.ConeGeometry(5.6, 3, 4).rotateY(Math.PI / 4), dk);
  r.position.y = 6.5;
  g.add(r);
  const br = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 14), wd);
  br.position.set(0, 2.2, 10);
  g.add(br);
  let ang = 0,
    bd = -1;
  for (let t = 0; t < 6.28; t += 0.3) {
    const d = depth(x + Math.cos(t) * 200, y + Math.sin(t) * 200);
    if (d > bd) {
      bd = d;
      ang = t;
    }
  }
  g.position.set((x + Math.cos(ang) * 30) * S, 0, (y + Math.sin(ang) * 30) * S);
  g.rotation.y = -ang - Math.PI / 2;
  scene.add(g);
}

// 細長い桟橋（港から沖へ）と、集落に混じる大きめの建物（集合住宅・工場）
{
  const M = new THREE.Matrix4(),
    js = [];
  for (const p of [...Object.values(PORT), ...LAKE.ports.map((q) => [q[0], q[1]])]) {
    let a = 0,
      bd = -1;
    for (let k = 0; k < 6.28; k += 0.2) {
      const d = depth(p[0] + Math.cos(k) * 250, p[1] + Math.sin(k) * 250);
      if (d > bd) {
        bd = d;
        a = k;
      }
    }
    js.push([p[0], p[1], a]);
  }
  const J = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 0.5, 2.2).translate(0.5, 0, 0),
    new THREE.MeshLambertMaterial({ color: 0x8a8478 }),
    js.length,
  );
  js.forEach(([x, y, a], i) => {
    M.compose(
      new THREE.Vector3(x * S, 0.9, y * S),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a, 0)),
      new THREE.Vector3(40, 1, 1),
    );
    J.setMatrixAt(i, M);
  });
  scene.add(J);
  const big = houses.filter((h, i) => i % 41 === 0 && distShore(h.x, h.y) > 300),
    BG = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
      new THREE.MeshLambertMaterial({
        color: 0xd8d4cc,
        map: cvTex(64, 64, (g, w, h) => {
          g.fillStyle = "#fff";
          g.fillRect(0, 0, w, h);
          g.fillStyle = "#5a6470";
          for (let y = 6; y < h; y += 14) for (let x = 4; x < w; x += 12) g.fillRect(x, y, 7, 6);
        }),
      }),
      big.length,
    ),
    c = new THREE.Color();
  {
    const BR = new THREE.InstancedMesh(roofHip, roofM, big.length);
    big.forEach((h, i) => {
      const tall = i % 3 === 0;
      M.compose(
        new THREE.Vector3(h.x * S + 6, 0.6 + h.ground * S * VEX + (tall ? 9 : 5), h.y * S + 6),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -h.rot, 0)),
        new THREE.Vector3(tall ? 16 : 18, tall ? 2.5 : 3, tall ? 7 : 11),
      );
      BR.setMatrixAt(i, M);
      BR.setColorAt(i, new THREE.Color(ROOF_COLS[i % 4]));
    });
    scene.add(BR);
  }
  big.forEach((h, i) => {
    const tall = i % 3 === 0;
    M.compose(
      new THREE.Vector3(h.x * S + 6, 0.6 + h.ground * S * VEX, h.y * S + 6),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -h.rot, 0)),
      new THREE.Vector3(tall ? 16 : 18, tall ? 9 : 5, tall ? 7 : 11),
    );
    BG.setMatrixAt(i, M);
    BG.setColorAt(i, c.set(tall ? 0xc8c4ba : [0xb8bcc0, 0xcfc6b6, 0xbdb6a8][i % 3]));
  });
  scene.add(BG);
}


// 内湖のまわりの木（ヤナギとメタセコイア。秋に色づく）
const shoreTrees = [];
{
  const R = rnd(919);
  innerPolys.forEach((p) => {
    for (let i = 0; i < p.length - 1; i += 2) {
      const a = p[i];
      if (R() < 0.5) {
        const px = a[0] + (R() - 0.5) * 80,
          py = a[1] + (R() - 0.5) * 80;
        if (!inLake(px, py) && !inInner(px, py)) shoreTrees.push([px, py, R() < 0.5]);
      }
    }
  });
}
const treeM = treeFade(new THREE.MeshLambertMaterial({ vertexColors: true }), 260, 420),
  treeI = new THREE.InstancedMesh(treeGeom("broad"), treeM, shoreTrees.length);
{
  const M = new THREE.Matrix4();
  shoreTrees.forEach(([x, y, c], i) => {
    const s = c ? 1 : 0.8;
    M.compose(
      new THREE.Vector3(x * S, landY(x, y), y * S),
      new THREE.Quaternion(),
      new THREE.Vector3(c ? 0.8 : 1.4 * s, s, c ? 0.8 : 1.4 * s),
    );
    treeI.setMatrixAt(i, M);
  });
  scene.add(treeI);
}
function treeSeason(m) {
  const g = new THREE.Color(0x4e7a3a),
    AU = [0xd8641e, 0xe2a224, 0xc8381c, 0xd88a2a, 0xb8b04a, 0xe6c254].map((x) => new THREE.Color(x)),
    bare = new THREE.Color(0x7a6a58);
  shoreTrees.forEach(([, , c], i) => {
    const col =
      m >= 9 && m <= 10
        ? m === 9 && i % 3 === 0
          ? g.clone().lerp(AU[1], 0.5)
          : AU[(i * 7 + (c ? 1 : 0)) % AU.length]
        : m === 11 || m <= 1
          ? bare
          : m === 2
            ? bare.clone().lerp(g, 0.5)
            : g;
    treeI.setColorAt(i, col);
  });
  treeI.instanceColor.needsUpdate = true;
}
