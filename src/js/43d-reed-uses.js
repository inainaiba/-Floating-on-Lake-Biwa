/* ---------- 暮らしの中のヨシ（2026年11月）：人の姿は出さず、ヨシが使われている様子だけを見せる ----------
   ・ヨシ簀（よしず）：ヨシ原に近い集落の家の正面に、夏（5〜9月）だけ立てかける
   ・ヨシ垣：ヨシ原のそばの岸沿いに、ヨシを編んだ低い垣根
   ・干したヨシの束：冬（12〜3月）、浜に円錐形に立てて干す（刈ったヨシ。43-moments.js の小さな束より大きい）
   どれもヨシ原（REED_SITES）から実寸2.5km以内だけ */
{
  const NEAR_REED = 2500,
    nearReed = (x, y) => REED_SITES.some(([cx, cy, r]) => Math.hypot(x - cx, y - cy) < r + NEAR_REED);
  const R = rndFor("reed-uses");
  // ヨシの縦縞の模様（簀・垣・束に共通）
  const reedTx = cvTex(64, 64, (g, w, h) => {
    g.fillStyle = "#c4a46a";
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 2) {
      g.fillStyle = `rgba(${90 + Math.random() * 60},${70 + Math.random() * 40},30,${(0.15 + Math.random() * 0.25).toFixed(2)})`;
      g.fillRect(x, 0, 1, h);
    }
    g.fillStyle = "rgba(60,40,20,.45)"; // 編み糸
    for (const y of [h * 0.22, h * 0.55, h * 0.85]) g.fillRect(0, y, w, 1.5);
  });
  reedTx.wrapS = reedTx.wrapT = THREE.RepeatWrapping;
  const mat = new THREE.MeshLambertMaterial({ map: reedTx, color: 0xffffff, emissive: 0x15110a, side: THREE.DoubleSide });
  const M = new THREE.Matrix4(),
    Q = new THREE.Quaternion(),
    E = new THREE.Euler(),
    V = new THREE.Vector3(),
    Sc = new THREE.Vector3();
  // ヨシ簀：家の正面に、少し傾けて立てかける板（幅2m・高さ2.4m）
  const sudare = [];
  for (const h of houses) {
    if (h.kind && h.kind !== "house") continue;
    if (bHash(h.x + 3, h.y + 11) > 0.35 || !nearReed(h.x, h.y)) continue;
    sudare.push(h);
  }
  const sI = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2.4).translate(0, 1.2, 0), mat, Math.max(1, sudare.length));
  sudare.forEach((h, i) => {
    const fx = -Math.sin(h.rot),
      fz = Math.cos(h.rot),
      o = (bHash(h.x, h.y + 7) - 0.5) * h.w * 0.5;
    V.set(h.x * S + Math.cos(h.rot) * o + fx * (h.d * 0.51 + 0.45), 0.6 + h.ground * S * VEX, h.y * S + Math.sin(h.rot) * o + fz * (h.d * 0.51 + 0.45));
    Q.setFromEuler(E.set(-0.2, -h.rot, 0, "YXZ"));
    M.compose(V, Q, Sc.set(0.8 + bHash(h.x, h.y) * 0.5, 1, 1));
    sI.setMatrixAt(i, M);
  });
  sI.count = sudare.length;
  scene.add(sI);
  // ヨシ垣と干したヨシの束：ヨシ原のそばの岸（陸側）に沿って
  const fence = [],
    stack = [];
  for (let i = 0; i < outer.length - 1; i++) {
    const [x1, y1] = outer[i],
      [x2, y2] = outer[i + 1];
    if (!nearReed(x1, y1)) continue;
    const L = Math.hypot(x2 - x1, y2 - y1);
    if (L < 1) continue;
    const nx = -(y2 - y1) / L,
      ny = (x2 - x1) / L,
      sg = inLake(x1 + nx * 30, y1 + ny * 30) ? -1 : 1; // 陸の向き
    for (let s = 0; s < L; s += 90) {
      const u = s / L,
        bx = x1 + (x2 - x1) * u,
        by = y1 + (y2 - y1) * u,
        rr = R();
      if (rr < 0.1) {
        const off = 14 + R() * 10,
          x = bx + nx * sg * off,
          y = by + ny * sg * off;
        if (!inLake(x, y) && !inRiver(x, y) && distShore(x, y) < 40) fence.push([x, y, Math.atan2(y2 - y1, x2 - x1), 14 + R() * 16]);
      } else if (rr < 0.16) {
        for (let k = 0; k < 2 + Math.floor(R() * 3); k++) {
          const off = 10 + R() * 18,
            t = (R() - 0.5) * 22,
            x = bx + nx * sg * off + (x2 - x1) / L * t,
            y = by + ny * sg * off + (y2 - y1) / L * t;
          if (!inLake(x, y) && !inRiver(x, y)) stack.push([x, y]);
        }
      }
    }
  }
  placeLog("ヨシ垣", "land", fence.map(([x, y]) => [x, y]));
  placeLog("干したヨシの束", "land", stack);
  const fI = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1.3).translate(0, 0.65, 0), mat, Math.max(1, fence.length));
  fence.forEach(([x, y, a, len], i) => {
    M.compose(V.set(x * S, landY(x, y), y * S), Q.setFromEuler(E.set(0, -a, 0)), Sc.set(len * S * 5, 1, 1));
    fI.setMatrixAt(i, M);
  });
  fI.count = fence.length;
  scene.add(fI);
  // 束：細い円錐（高さ2.6m）。上を縛った形に、少しずつ傾けて
  const stG = new THREE.ConeGeometry(0.75, 2.6, 7, 1, true).translate(0, 1.3, 0);
  {
    const uv = stG.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 6, uv.getY(i) * 1.5);
  }
  const kI = new THREE.InstancedMesh(stG, mat, Math.max(1, stack.length));
  stack.forEach(([x, y], i) => {
    M.compose(V.set(x * S, landY(x, y) - 0.1, y * S), Q.setFromEuler(E.set((R() - 0.5) * 0.12, R() * 6.28, (R() - 0.5) * 0.12)), Sc.setScalar(0.85 + R() * 0.35));
    kI.setMatrixAt(i, M);
  });
  kI.count = stack.length;
  scene.add(kI);
  for (const m of [sI, fI, kI]) {
    m.castShadow = QUALITY.treeShadow;
    m.receiveShadow = true;
  }
  onFrame(131, (f) => {
    const mo = f.c.month;
    sI.visible = mo >= 4 && mo <= 8; // ヨシ簀は夏だけ
    kI.visible = mo >= 11 || mo <= 2; // 干した束は冬から3月のはじめまで
  });
}
