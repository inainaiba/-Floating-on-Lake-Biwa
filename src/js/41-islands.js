G.isl = (() => {
  const R = rnd(3131),
    rk = [],
    tr = [];
  for (const poly of islands) {
    for (let i = 0; i < poly.length - 1; i++) {
      const [x1, y1] = poly[i],
        [x2, y2] = poly[i + 1];
      const L = Math.hypot(x2 - x1, y2 - y1);
      for (let s = 0; s < L; s += 14) {
        const u = s / L,
          x = x1 + (x2 - x1) * u,
          y = y1 + (y2 - y1) * u;
        for (let k = 0; k < 2; k++) {
          const a = R() * 6.28,
            r = R() * 10;
          if (!okiZone(x, y)) rk.push([x + Math.cos(a) * r, y + Math.sin(a) * r, 1.2 + R() * 2.2]);
        }
      }
    }
    let cx = 0,
      cy = 0;
    for (const p of poly) {
      cx += p[0];
      cy += p[1];
    }
    cx /= poly.length;
    cy /= poly.length;
    let area = 0;
    for (let i = 0; i < poly.length - 1; i++) area += poly[i][0] * poly[i + 1][1] - poly[i + 1][0] * poly[i][1];
    const NT = Math.min(MOBILE ? 1500 : 4500, Math.max(300, Math.abs(area) / 2 / 220));
    for (let k = 0; k < NT; k++) {
      const p = poly[Math.floor(R() * poly.length)],
        u = Math.sqrt(R()) * 0.92,
        x = cx + (p[0] - cx) * u,
        y = cy + (p[1] - cy) * u;
      if (inLake(x, y)) continue;
      const gy = isleH(x, y);
      if (gy === null) continue;
      tr.push([x, y, gy - 0.3, 0.8 + R() * 0.6, R()]);
    }
  }
  const I = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(1, 0),
    new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
    Math.max(1, rk.length),
  );
  const M = new THREE.Matrix4(),
    Qq = new THREE.Quaternion(),
    E = new THREE.Euler(),
    c = new THREE.Color();
  rk.forEach(([x, y, s], i) => {
    M.compose(
      new THREE.Vector3(x * S, s * 0.25, y * S),
      Qq.setFromEuler(E.set(R() * 3, R() * 3, R() * 3)),
      new THREE.Vector3(s, s * 1.4, s),
    );
    I.setMatrixAt(i, M);
    I.setColorAt(i, c.setRGB(0.6 + R() * 0.12, 0.58 + R() * 0.1, 0.52 + R() * 0.1));
  });
  scene.add(I);
  if (tr.length) {
    cardForest(
      "pine",
      tr.filter((_, i) => i % 2),
      9,
      6,
      40,
      2500,
      false,
    );
    cardForest(
      "broad",
      tr.filter((_, i) => !(i % 2)),
      8,
      7,
      40,
      2500,
      false,
    );
  }
  return I;
})();

/* ---------- 沖島の南側：山を背に、湖に面して家が密に並ぶ漁村（石積みの護岸、舫われた白い漁船、電柱） ---------- */
G.okishima = (() => {
  if (!LOOK.show.okishima) return null;
  const R = rnd(5151),
    [ox, oy] = ll(136.065, 35.205);
  const I = ISLES.find((I) => Math.hypot((I.box[0] + I.box[2]) / 2 - ox, (I.box[1] + I.box[3]) / 2 - oy) < 2500);
  if (!I) return null;
  const poly = I.h,
    [a, , c] = I.box;
  // 村の岸：南向きで、島の西寄りの岸
  const segs = [];
  for (let i = 0; i < poly.length - 1; i++) {
    const [x1, y1] = poly[i],
      [x2, y2] = poly[i + 1],
      L = Math.hypot(x2 - x1, y2 - y1);
    if (L < 1) continue;
    let nx = -(y2 - y1) / L,
      ny = (x2 - x1) / L;
    const mx = (x1 + x2) / 2,
      my = (y1 + y2) / 2;
    if (inPoly(mx + nx * 5, my + ny * 5, poly)) (nx = -nx), (ny = -ny); // 外向き（湖側）
    if (ny > 0.2 && mx < a + (c - a) * 0.55) segs.push({ x1, y1, x2, y2, L, nx, ny });
  }
  const g = new THREE.Group();
  scene.add(g);
  const roofM = new THREE.MeshStandardMaterial({ color: 0x5c6066, roughness: 0.7, map: G.roofTex || null }),
    stoneM = new THREE.MeshStandardMaterial({ color: 0x8a8478, roughness: 0.95 }),
    baseM = new THREE.MeshStandardMaterial({ color: 0x77736a, roughness: 1 }),
    WALLS = [0x6e5440, 0x5a4636, 0x8a6a4e, 0xd8d0c0, 0xc8b8a0, 0x9fb2c0, 0xd0a8a8, 0xe8e4da, 0x7a6a5a],
    wallMs = WALLS.map((col) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.9 })),
    winM = new THREE.MeshStandardMaterial({ color: 0x2a3036, roughness: 0.3 }),
    whiteM = new THREE.MeshStandardMaterial({ color: 0xf0f0ec, roughness: 0.5 }),
    tireM = new THREE.MeshStandardMaterial({ color: 0x1e1e20, roughness: 0.9 }),
    poleM = new THREE.MeshStandardMaterial({ color: 0x8a8880, roughness: 0.8 });

  const add = (o, x, y, z, ry = 0) => {
    o.position.set(x, y, z);
    o.rotation.y = ry;
    o.castShadow = o.receiveShadow = QUALITY.treeShadow;
    g.add(o);
    return o;
  };
  let houses = 0;
  const foot = []; // 家の足元（確認用：中心・幅・奥行き・向き、作品内の座標）
  for (const s of segs) {
    const tx = (s.x2 - s.x1) / s.L,
      ty = (s.y2 - s.y1) / s.L,
      rot = -Math.atan2(ty, tx);
    const Lw = s.L * S;
    // 石積みの護岸：水際に沿って
    {
      const mx = ((s.x1 + s.x2) / 2) * S - s.nx * 0.8,
        mz = ((s.y1 + s.y2) / 2) * S - s.ny * 0.8;
      add(new THREE.Mesh(new THREE.BoxGeometry(Lw + 0.4, 2.6, 2.4), stoneM), mx, -0.5, mz, rot);
      add(new THREE.Mesh(new THREE.BoxGeometry(Lw + 0.4, 0.25, 2.6), baseM), mx, 0.85, mz, rot);
    }
    // 家並み：岸から3列、山の斜面に重なるように
    for (let row = 0; row < 3; row++)
      for (let u = 0; u < Lw; u += 7.5 + R() * 2.5) {
        if (R() < 0.12) continue;
        const off = 3.2 + row * 7 + R() * 1.2,
          wx = s.x1 * S + tx * u + -s.nx * off,
          wz = s.y1 * S + ty * u + -s.ny * off,
          gy = isleH(wx / S, wz / S);
        if (gy === null) continue;
        const w = 6 + R() * 3,
          d = 5 + R() * 2.5,
          floors = R() < 0.75 ? 2 : 1,
          h = floors * 2.9,
          wm = wallMs[Math.floor(R() * wallMs.length)];
        // 家の四隅まで島の上に収まるときだけ建てる
        if ([[-1, -1], [1, -1], [1, 1], [-1, 1]].some(([u, v]) => isleH((wx + (u * w * 0.5 * Math.cos(rot) - v * d * 0.5 * Math.sin(rot)) * 1.05) / S, (wz + (-u * w * 0.5 * Math.sin(rot) - v * d * 0.5 * Math.cos(rot)) * 1.05) / S) === null)) continue;
        // 斜面に建つので、石の基礎で地面まで下ろす
        add(new THREE.Mesh(new THREE.BoxGeometry(w, 4, d), baseM), wx, gy - 2, wz, rot);
        add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wm), wx, gy + h / 2, wz, rot);
        // 窓：湖側の面に横長の窓を各階に
        for (let f = 0; f < floors; f++)
          add(new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 0.9, 0.1), winM), wx + s.nx * (d / 2 + 0.03), gy + 1.4 + f * 2.9, wz + s.ny * (d / 2 + 0.03), rot);
        // 一階の庇
        add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, 1.1), roofM), wx + s.nx * (d / 2 + 0.5), gy + 2.6, wz + s.ny * (d / 2 + 0.5), rot);
        // 瓦屋根（切妻、棟は岸と平行）
        add(gable(w + 0.9, d + 1.2, 1.7 + R() * 0.5, roofM), wx, gy + h, wz, rot);
        foot.push([wx, wz, w, d, rot]);
        houses++;
      }
    // 電柱：道に沿って
    for (let u = R() * 10; u < Lw; u += 18) {
      const wx = s.x1 * S + tx * u - s.nx * 1.2,
        wz = s.y1 * S + ty * u - s.ny * 1.2;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 10, 6), poleM), wx, 5.8, wz);
      add(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.1), poleM), wx, 10, wz, rot);
    }
    // 舫われた白い漁船：護岸に横付け、舷側に古タイヤ
    for (let u = 3 + R() * 6; u < Lw - 3; u += 9 + R() * 6) {
      if (R() < 0.3) continue;
      const wx = s.x1 * S + tx * u + s.nx * 1.8,
        wz = s.y1 * S + ty * u + s.ny * 1.8,
        bg = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(7.5, 1.1, 2.1), whiteM);
      hull.position.y = 0.35;
      bg.add(hull);
      const bow = new THREE.Mesh(new THREE.ConeGeometry(1.05, 2, 4).rotateZ(-Math.PI / 2).rotateX(Math.PI / 4), whiteM);
      bow.scale.set(1, 0.55, 1);
      bow.position.set(4.6, 0.4, 0);
      bg.add(bow);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 1.6), whiteM);
      cab.position.set(-0.8 + R() * 1.6, 1.6, 0);
      bg.add(cab);
      const cw = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.5, 1.65), winM);
      cw.position.set(cab.position.x, 1.9, 0);
      bg.add(cw);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.5), poleM);
      mast.position.set(cab.position.x, 3.5, 0);
      bg.add(mast);
      for (let k = -2; k <= 2; k++) {
        const t = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.11, 6, 12), tireM);
        t.position.set(k * 1.4, 0.45, 1.08);
        bg.add(t);
      }
      bg.position.set(wx, 0, wz);
      placeLog("沖島の漁船", "water", [[wx / S, wz / S]]);
      bg.rotation.y = rot + (R() < 0.5 ? 0 : Math.PI);
      bg.userData.ph = R() * 6.28;
      g.add(bg);
    }
  }
  // 漁港の防波堤：村の西端の沖に、岸と平行な長い堤
  if (segs.length) {
    const s = segs[0],
      tx = (s.x2 - s.x1) / s.L,
      ty = (s.y2 - s.y1) / s.L;
    const bx = s.x1 * S + s.nx * 22 + tx * 20,
      bz = s.y1 * S + s.ny * 22 + ty * 20;
    add(new THREE.Mesh(new THREE.BoxGeometry(60, 2.2, 3), baseM), bx, 0.1, bz, -Math.atan2(ty, tx));
  }
  mergeStatic(g); // 家並み・護岸・漁船・電柱を材質ごとに束ねる
  return { g, houses, foot };
})();
