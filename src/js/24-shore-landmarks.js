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
  // 線路の道筋：地理院のベクトルタイルの湖西線（tools/rail.py → data/rail.json）
  const L = (RAIL.kosei || []).map((p) => ll(...p));
  // 線路を約120mごとの点にする。湖岸線の簡略化で湖の上に出た点は、西（陸の側）へ押して岸から少し内に置く
  // （点を捨てると、前後の点が湖を横切る長い桁でつながってしまう）
  const onLand = (x, y) => !inLake(x, y) && distShore(x, y) > 100;
  const toLand = (x, y) => {
    for (let d = 0; d <= 8000; d += 30) if (onLand(x - d, y)) return [x - d, y];
    return [x, y];
  };
  const nearLand = (x, y) => {
    for (let r = 0; r <= 1500; r += 30)
      for (let k = 0; k < (r ? 24 : 1); k++) {
        const q = (k / 24) * Math.PI * 2;
        if (onLand(x + Math.cos(q) * r, y + Math.sin(q) * r)) return [x + Math.cos(q) * r, y + Math.sin(q) * r];
      }
    return toLand(x, y);
  };
  let pts = [];
  for (let i = 0, s = 0; i < L.length - 1; i++) {
    const [a, b] = [L[i], L[i + 1]],
      len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (; s < len; s += 120) pts.push(toLand(a[0] + ((b[0] - a[0]) * s) / len, a[1] + ((b[1] - a[1]) * s) / len));
    s -= len; // 次の区間へ、120mの刻みを持ち越す
  }
  if (L.length) pts.push(toLand(...L[L.length - 1]));
  // 押した点どうしの桁が入江を横切るときは、間に点を足して岸に沿わせる（川を渡る所は湖ではないのでそのまま）
  for (let pass = 0; pass < 12; pass++) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [a, b] = [pts[i - 1], pts[i]],
        n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 20);
      let wet = false;
      for (let k = 1; k < n && !wet; k++) wet = inLake(a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n);
      if (wet) out.push(nearLand((a[0] + b[0]) / 2, (a[1] + b[1]) / 2));
      out.push(b);
    }
    pts = out;
  }
  // 高さ：地面の高さ＋約9。前後でならして、なめらかに上り下りする
  const gh = pts.map(([x, y]) => landY(x, y));
  const top = gh.map((_, i) => {
    let m = -1e9;
    for (let k = -3; k <= 3; k++) m = Math.max(m, gh[Math.min(gh.length - 1, Math.max(0, i + k))]);
    return m + 9;
  });
  const ht = top.map((_, i) => {
    let s = 0,
      n = 0;
    for (let k = -4; k <= 4; k++) {
      const j = Math.min(top.length - 1, Math.max(0, i + k));
      s += top[j];
      n++;
    }
    return Math.max(s / n, gh[i] + 6);
  });
  // 橋桁：隣り合う点どうしを、すき間なくつなぐ（向きと傾きを合わせる）
  const D = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 0.9, 4),
      new THREE.MeshLambertMaterial({ color: 0xa9aaa5 }),
      Math.max(1, pts.length - 1),
    ),
    Pm = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1.4, 1, 2.6).translate(0, 0.5, 0),
      new THREE.MeshLambertMaterial({ color: 0xb0b0aa }),
      Math.max(1, pts.length),
    );
  const M = new THREE.Matrix4(),
    A = new THREE.Vector3(),
    Bv = new THREE.Vector3(),
    Q = new THREE.Quaternion(),
    X = new THREE.Vector3(1, 0, 0);
  let nd = 0,
    np = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    A.set(pts[i][0] * S, ht[i], pts[i][1] * S);
    Bv.set(pts[i + 1][0] * S, ht[i + 1], pts[i + 1][1] * S);
    const len = A.distanceTo(Bv);
    if (len < 0.01) continue; // 湖を避けて寄せた点が重なった所（水の上を渡る所も、そのまま橋桁でつなぐ）
    Q.setFromUnitVectors(X, Bv.clone().sub(A).normalize());
    M.compose(A.clone().add(Bv).multiplyScalar(0.5), Q, new THREE.Vector3(len + 0.3, 1, 1));
    D.setMatrixAt(nd++, M);
  }
  // 橋脚：陸の上だけ、地面から桁の下まで
  pts.forEach(([x, y], i) => {
    if (inLake(x, y) || i % 2) return;
    const yaw = i < pts.length - 1 ? Math.atan2(pts[i + 1][1] - y, pts[i + 1][0] - x) : 0;
    M.compose(new THREE.Vector3(x * S, gh[i] - 0.5, y * S), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -yaw, 0)), new THREE.Vector3(1, ht[i] - gh[i], 1));
    Pm.setMatrixAt(np++, M);
  });
  D.count = nd;
  Pm.count = np;
  scene.add(D, Pm);
  G.kosei = { pts, ht, gh }; // 確認用（高架のつながりの検査）
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
        if (!inLake(px, py) && !inRiver(px, py) && distShore(px, py) > 25) tr.push([px, py, 0.7 + R() * 0.6]);
      }
    }
  }
  placeLog("岸の松", "land", tr);
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
      new THREE.Vector3(x * S, inLake(x, y) ? 0 : terrainAt(x, y) * S * VEX + 0.05, y * S), // 浜の高さに据える（湖の中は水際に半分沈む）
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
  const [x, y] = shoreSnap(...ll(135.9216, 35.1099)), // 堅田の岸の点（浮御堂の位置は地理院の注記から）
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
  // 岸から沖へ、水の上に出てさらに30m（実寸）の所に建てる（橋で岸とつながる）
  let off = 30;
  while (off < 600 && !inLake(x + Math.cos(ang) * off, y + Math.sin(ang) * off)) off += 10;
  off += 30;
  g.position.set((x + Math.cos(ang) * off) * S, 0, (y + Math.sin(ang) * off) * S);
  placeLog("浮御堂", "water", [[x + Math.cos(ang) * off, y + Math.sin(ang) * off]]);
  g.rotation.y = -ang - Math.PI / 2;
  scene.add(g);
}

// 細長い桟橋（港から沖へ）と、集落に混じる大きめの建物（集合住宅・工場）
{
  const M = new THREE.Matrix4(),
    js = [];
  for (const p of PORT_SITES) {
    let a = 0,
      bd = -1;
    for (let k = 0; k < 6.28; k += 0.2) {
      const d = inLake(p[0] + Math.cos(k) * 80, p[1] + Math.sin(k) * 80) ? depth(p[0] + Math.cos(k) * 250, p[1] + Math.sin(k) * 250) : -1; // すぐ前が水で、沖が深い向き
      if (d > bd) {
        bd = d;
        a = k;
      }
    }
    // 長さ：先が水の上に収まる長さまで縮める（狭い入江で向こう岸に届かないように）
    let len = 40;
    while (len > 8 && !inLake(p[0] + (Math.cos(a) * len) / S, p[1] + (Math.sin(a) * len) / S)) len -= 4;
    js.push([p[0], p[1], a, len]);
    placeLog("桟橋の根元", "shore", [[p[0], p[1]]]);
    placeLog("桟橋の先", "water", [[p[0] + (Math.cos(a) * len) / S, p[1] + (Math.sin(a) * len) / S]]);
  }
  const J = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 0.5, 2.2).translate(0.5, 0, 0),
    new THREE.MeshLambertMaterial({ color: 0x8a8478 }),
    js.length,
  );
  js.forEach(([x, y, a, len], i) => {
    M.compose(
      new THREE.Vector3(x * S, 0.9, y * S),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a, 0)),
      new THREE.Vector3(len, 1, 1),
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
placeLog("内湖のまわりの木", "land", shoreTrees);
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
