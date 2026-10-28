// 夜の窓の灯り
const winGeo = new THREE.BufferGeometry(),
  wp = [];
/*窓は家の正面に*/ for (const h of houses)
  if ((((h.x * 7 + h.y * 3) % 10) + 10) % 10 < 8) {
    const fx = -Math.sin(h.rot),
      fz = Math.cos(h.rot);
    for (const o of [-0.25, 0.2])
      wp.push(
        h.x * S + Math.cos(h.rot) * h.w * o + fx * h.d * 0.51,
        0.6 + h.ground * S * VEX + 1.6 + (h.h > 5 ? 2.6 * ((h.x | 0) % 2) : 0),
        h.y * S + Math.sin(h.rot) * h.w * o + fz * h.d * 0.51,
      );
  }
winGeo.setAttribute("position", new THREE.Float32BufferAttribute(wp, 3));
{
  const n = wp.length / 3,
    cl = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = Math.random(),
      k = r < 0.22 ? 0 : 0.55 + Math.random() * 0.45;
    const w = Math.random();
    cl[i * 3] = k;
    cl[i * 3 + 1] = k * (w < 0.2 ? 0.95 : 0.72 + Math.random() * 0.1);
    cl[i * 3 + 2] = k * (w < 0.2 ? 0.85 : 0.4 + Math.random() * 0.15);
  }
  winGeo.setAttribute("color", new THREE.Float32BufferAttribute(cl, 3));
}
const windows = new THREE.Points(
  winGeo,
  new THREE.PointsMaterial({
    vertexColors: true,
    color: 0xffffff,
    size: 3.4,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
  }),
);
scene.add(windows);
// 岸沿いの道
{
  const pos = [];
  for (let [x1, y1, x2, y2] of roads) {
    {
      let bad = false;
      const L0 = Math.hypot(x2 - x1, y2 - y1) || 1,
        nx0 = (-(y2 - y1) / L0) * 30,
        ny0 = ((x2 - x1) / L0) * 30;
      for (let u = 0; u <= 1 && !bad; u += 0.125)
        for (const s of [-1, 1]) {
          const x = x1 + (x2 - x1) * u + nx0 * s,
            y = y1 + (y2 - y1) * u + ny0 * s;
          if (inLake(x, y) || distShore(x, y) < 15) {
            bad = true;
            break;
          }
        }
      if (bad) continue;
    }
    {
      const ex = (x2 - x1) * 0.12,
        ey = (y2 - y1) * 0.12;
      x1 -= ex;
      y1 -= ey;
      x2 += ex;
      y2 += ey;
    }
    const dx = x2 - x1,
      dy = y2 - y1,
      L = Math.hypot(dx, dy) || 1,
      nx = (-dy / L) * 22,
      ny = (dx / L) * 22;
    pos.push(
      x1 + nx,
      y1 + ny,
      x2 + nx,
      y2 + ny,
      x2 - nx,
      y2 - ny,
      x1 + nx,
      y1 + ny,
      x2 - nx,
      y2 - ny,
      x1 - nx,
      y1 - ny,
    );
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      pos.flatMap((v, i) =>
        i % 2 ? [] : [pos[i] * S, landY(pos[i], pos[i + 1]) + 0.06, pos[i + 1] * S],
      ),
      3,
    ),
  );
  g.computeVertexNormals();
  const rdM = new THREE.Mesh(
    g,
    new THREE.MeshLambertMaterial({
      color: 0x66655f,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  scene.add(rdM);
}
