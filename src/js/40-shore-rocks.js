G.rocks = (() => {
  const R = rnd(9191),
    pts = [];
  for (let i = 0; i < outer.length - 1; i++) {
    const [x1, y1] = outer[i],
      [x2, y2] = outer[i + 1];
    const L = Math.hypot(x2 - x1, y2 - y1);
    for (let s = 0; s < L; s += 30) {
      const u = s / L,
        x = x1 + (x2 - x1) * u,
        y = y1 + (y2 - y1) * u;
      if (vnoise(x / 1400, y / 1400) < 0.58 || reedMask.has(Math.floor(x / 120) + "," + Math.floor(y / 120)))
        continue;
      for (let k = 0; k < 2; k++) {
        const a = R() * 6.28,
          r = R() * 14;
        pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r, 0.25 + R() * 0.7]);
      }
      if (pts.length > 6000) break;
    }
    if (pts.length > 6000) break;
  }
  const I = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(1, 0),
    new THREE.MeshLambertMaterial({ color: 0xffffff }),
    Math.max(1, pts.length),
  );
  const M = new THREE.Matrix4(),
    Qq = new THREE.Quaternion(),
    E = new THREE.Euler(),
    c = new THREE.Color();
  pts.forEach(([x, y, s], i) => {
    const gy = inLake(x, y) ? -0.35 : landY(x, y) - 0.25;
    M.compose(
      new THREE.Vector3(x * S, gy, y * S),
      Qq.setFromEuler(E.set(R() * 3, R() * 3, R() * 3)),
      new THREE.Vector3(s * 1.3, s * 0.75, s),
    );
    I.setMatrixAt(i, M);
    I.setColorAt(i, c.setRGB(0.4 + R() * 0.15, 0.39 + R() * 0.14, 0.37 + R() * 0.12));
  });
  scene.add(I);
  return I;
})();
