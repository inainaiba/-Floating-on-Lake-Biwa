G.kaizu = (() => {
  const g = new THREE.Group();
  scene.add(g);
  const KX_ = 111320 * Math.cos((35.25 * Math.PI) / 180);
  const tx = cvTex(256, 128, (c, w, h) => {
    c.fillStyle = "#8f8a80";
    c.fillRect(0, 0, w, h);
    let y = 0;
    while (y < h) {
      const rh = 14 + Math.random() * 16;
      let x = -Math.random() * 20;
      while (x < w) {
        const rw = 18 + Math.random() * 34,
          v = 150 + Math.random() * 60;
        c.fillStyle = `rgb(${v},${(v - 4) | 0},${(v - 12) | 0})`;
        c.beginPath();
        c.moveTo(x + 2, y + 2 + Math.random() * 2);
        c.lineTo(x + rw - 2, y + 1 + Math.random() * 3);
        c.lineTo(x + rw - 1, y + rh - 2);
        c.lineTo(x + 1, y + rh - 1 - Math.random() * 3);
        c.closePath();
        c.fill();
        c.fillStyle = "rgba(0,0,0,.18)";
        c.fillRect(x + 1, y + rh - 4, rw - 2, 2);
        x += rw;
      }
      y += rh;
    }
  });
  tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
  const wm = new THREE.MeshLambertMaterial({ map: tx }),
    cap = new THREE.MeshLambertMaterial({ color: 0x8a857a });
  const R = rnd(4242),
    rocks = [];
  for (let i = 0; i < outer.length - 1; i++) {
    const [x1, y1] = outer[i],
      [x2, y2] = outer[i + 1];
    const lo = 136.08 + x1 / KX_,
      la = 35.25 - y1 / 110540;
    if (!(lo > 136.058 && lo < 136.084 && la > 35.454 && la < 35.47)) continue;
    const L = Math.hypot(x2 - x1, y2 - y1);
    if (L < 1) continue;
    let nx = -(y2 - y1) / L,
      ny = (x2 - x1) / L;
    const mx = (x1 + x2) / 2,
      my = (y1 + y2) / 2;
    if (inLake(mx + nx * 20, my + ny * 20)) {
      nx = -nx;
      ny = -ny;
    }
    const step = 30;
    for (let s = 0; s < L; s += step) {
      const u = s / L,
        l = Math.min(step, L - s),
        bx = x1 + (x2 - x1) * (u + l / L / 2) + nx * 9,
        by = y1 + (y2 - y1) * (u + l / L / 2) + ny * 9;
      const gy = landY(bx, by);
      const w = new THREE.Mesh(new THREE.BoxGeometry(l * S + 0.3, 3.6, 0.9), wm);
      w.geometry.attributes.uv.array.forEach((v, k, a) => {
        if (k % 2 === 0) a[k] = (v * (l * S)) / 6;
      });
      w.position.set(bx * S, gy + 0.9, by * S);
      w.rotation.y = -Math.atan2(y2 - y1, x2 - x1);
      g.add(w);
      const cp = new THREE.Mesh(new THREE.BoxGeometry(l * S + 0.3, 0.25, 1.1), cap);
      cp.position.set(bx * S, gy + 2.75, by * S);
      cp.rotation.y = w.rotation.y;
      g.add(cp);
      for (let k = 0; k < 5; k++) {
        const f = R() * l,
          o = 1 + R() * 8;
        const rx = x1 + (x2 - x1) * ((s + f) / L) + nx * (9 - o),
          ry = y1 + (y2 - y1) * ((s + f) / L) + ny * (9 - o);
        rocks.push([rx, ry, 0.2 + R() * 0.5]);
      }
    }
  }
  const ri = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(1, 0),
    new THREE.MeshLambertMaterial({ color: 0xffffff }),
    Math.max(1, rocks.length),
  );
  const M = new THREE.Matrix4(),
    Qq = new THREE.Quaternion(),
    E = new THREE.Euler(),
    c = new THREE.Color();
  rocks.forEach(([x, y, s], i) => {
    const gy = inLake(x, y) ? -0.3 : landY(x, y) - 0.2;
    M.compose(
      new THREE.Vector3(x * S, gy, y * S),
      Qq.setFromEuler(E.set(R() * 3, R() * 3, R() * 3)),
      new THREE.Vector3(s * 1.3, s * 0.8, s),
    );
    ri.setMatrixAt(i, M);
    ri.setColorAt(i, c.setRGB(0.42 + R() * 0.14, 0.41 + R() * 0.13, 0.39 + R() * 0.11));
  });
  g.add(ri);
  return { g, n: rocks.length };
})();
