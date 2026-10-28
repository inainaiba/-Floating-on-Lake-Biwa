G.city = (() => {
  const KX_ = 111320 * Math.cos((35.25 * Math.PI) / 180),
    R = rnd(5150),
    bl = [];
  for (let i = 0; i < outer.length - 1; i++) {
    const [x1, y1] = outer[i],
      [x2, y2] = outer[i + 1];
    const lo = 136.08 + x1 / KX_,
      la = 35.25 - y1 / 110540;
    if (!(la < 35.035 && lo > 135.85 && lo < 135.99)) continue;
    const L = Math.hypot(x2 - x1, y2 - y1);
    if (L < 1) continue;
    let nx = -(y2 - y1) / L,
      ny = (x2 - x1) / L;
    if (inLake(x1 + nx * 60, y1 + ny * 60)) {
      nx = -nx;
      ny = -ny;
    }
    for (let s = 0; s < L; s += 55) {
      const u = s / L;
      for (let k = 0; k < 3; k++) {
        const off = 60 + k * 90 + R() * 60,
          x = x1 + (x2 - x1) * u + nx * off + (R() - 0.5) * 30,
          y = y1 + (y2 - y1) * u + ny * off + (R() - 0.5) * 30;
        const bw = 14 + R() * 14,
          bd = 10 + R() * 12;
        // 建物の角まで陸に収まるように：岸からの距離が建物の半分の対角より大きい所だけ
        if (inLake(x, y) || inInner(x, y) || distShore(x, y) * S < Math.hypot(bw, bd) * 0.5 + 3 || bl.some((b) => Math.hypot(b[0] - x, b[1] - y) < 38)) continue;
        bl.push([
          x,
          y,
          bw,
          bd,
          10 + R() * 26 * (k ? 1 : 0.6),
          Math.atan2(y2 - y1, x2 - x1),
        ]);
      }
    }
  }
  const I = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.8,
      map: cvTex(64, 128, (g, w, h) => {
        g.fillStyle = "#e8e4dc";
        g.fillRect(0, 0, w, h);
        for (let y = 6; y < h - 4; y += 11)
          for (let x = 5; x < w - 4; x += 10) {
            g.fillStyle = Math.random() < 0.85 ? "#7c8894" : "#5a6470";
            g.fillRect(x, y, 6, 6);
          }
      }),
    }),
    Math.max(1, bl.length),
  );
  const M = new THREE.Matrix4(),
    Qq = new THREE.Quaternion(),
    E = new THREE.Euler(),
    c = new THREE.Color();
  bl.forEach(([x, y, w, d, h, r], i) => {
    M.compose(
      new THREE.Vector3(x * S, 0.6 + terrainAt(x, y) * S * VEX, y * S),
      Qq.setFromEuler(E.set(0, -r, 0)),
      new THREE.Vector3(w, h, d),
    );
    I.setMatrixAt(i, M);
    I.setColorAt(i, c.setHSL(0.08 + R() * 0.06, 0.08 + R() * 0.08, 0.78 + R() * 0.14));
  });
  I.castShadow = false;
  I.receiveShadow = false;
  I.material.emissive = new THREE.Color(0x3a3834);
  scene.add(I);
  return I;
})();
