/* ---------- 湖岸の暮らし：家々の灯りの点滅、えり ---------- */
G.shore = (() => {
  const R = rnd(9595);
  // 家々の灯り：日暮れから一軒ずつ灯り、夜更けに一軒ずつ消える
  const wN = winGeo.attributes.color.count,
    wBase = winGeo.attributes.color.array.slice(),
    wOn = new Float32Array(wN),
    wOff = new Float32Array(wN),
    wMorn = new Float32Array(wN);
  {
  const R = rndFor("windows");
  for (let i = 0; i < wN; i++) {
    wOn[i] = 0.7 + R() * 0.1;
    wOff[i] = 0.9 + R() * 0.2;
    wMorn[i] = R() < 0.25 ? 0.19 + R() * 0.06 : 9;
  }
  }
  let wT = 0;
  // えり：浅い沖に竹竿を一列に立て、先を矢じりの形に囲う湖の定置網
  if (LOOK.show.eri) {
    const R = rndFor("eri");
    const P = [];
    const cand = [];
    for (let i = 0; i < outer.length - 1; i += 3) cand.push(i);
    for (let n = 0; n < cand.length && P.length < 30 * 90; n++) {
      if (R() > 0.12) continue;
      const i = cand[n],
        [ax, ay] = outer[i],
        [bx, by] = outer[i + 1],
        L = Math.hypot(bx - ax, by - ay) || 1;
      // 岸から沖へ向かう向き（湖の内側へ）
      let nx = -(by - ay) / L,
        ny = (bx - ax) / L;
      if (!inLake(ax + nx * 40, ay + ny * 40)) (nx = -nx), (ny = -ny);
      if (!inLake(ax + nx * 40, ay + ny * 40)) continue;
      const len = 150 + R() * 250,
        tx = -ny,
        ty = nx;
      const pts = [];
      for (let d = 20; d < len; d += 4) pts.push([ax + nx * d, ay + ny * d]);
      // 先の矢じり：左右に開いて戻る
      const ex = ax + nx * len,
        ey = ay + ny * len;
      for (const s of [-1, 1])
        for (let k = 0; k < 14; k++) {
          const u = k / 13,
            w = Math.sin(u * Math.PI) * 30;
          pts.push([ex + nx * u * 60 + tx * s * w, ey + ny * u * 60 + ty * s * w]);
        }
      if (pts.every(([x, y]) => inLake(x, y) && depth(x, y) < 5)) for (const p of pts) P.push(p);
    }
    const eri = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.05, 1, 5).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: 0x3a3630 }), Math.max(1, P.length)),
      M2 = new THREE.Matrix4(),
      Q2 = new THREE.Quaternion(),
      E2 = new THREE.Euler();
    P.forEach(([x, y], i) => {
      const h = 3 + R() * 2.5;
      Q2.setFromEuler(E2.set((R() - 0.5) * 0.12, 0, (R() - 0.5) * 0.12));
      M2.compose(new THREE.Vector3(x * S, -1.2, y * S), Q2, new THREE.Vector3(1, h + 1.2, 1));
      eri.setMatrixAt(i, M2);
    });
    eri.castShadow = false;
    scene.add(eri);
    G.eri = P; // 全体地図に点で描く
    placeLog("えり", "water", P);
  }
  function update(dt, t, c, day, wxNow) {
    const cx = camera.position.x,
      cz = camera.position.z;
    wT -= dt;
    if (LOOK.show.windowFlicker && wT <= 0) {
      wT = 0.5;
      const p = c.phase,
        ar = winGeo.attributes.color.array;
      for (let i = 0; i < wN; i++) {
        const on = p >= wOn[i] ? p < wOff[i] : p + 1 < wOff[i] || (p >= wMorn[i] && p < 0.3);
        const k = on ? 1 : 0;
        ar[i * 3] = wBase[i * 3] * k;
        ar[i * 3 + 1] = wBase[i * 3 + 1] * k;
        ar[i * 3 + 2] = wBase[i * 3 + 2] * k;
      }
      winGeo.attributes.color.needsUpdate = true;
    }
  }
  return { update };
})();
