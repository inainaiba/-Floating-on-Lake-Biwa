window.__isl = (() => {
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
          rk.push([x + Math.cos(a) * r, y + Math.sin(a) * r, 1.2 + R() * 2.2]);
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
    for (let k = 0; k < 600; k++) {
      const p = poly[Math.floor(R() * poly.length)],
        u = Math.sqrt(R()) * 0.92,
        x = cx + (p[0] - cx) * u,
        y = cy + (p[1] - cy) * u;
      if (inLake(x, y)) continue;
      tr.push([x, y, 0.6 + terrainAt(x, y) * S * VEX, 0.8 + R() * 0.6, R()]);
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
