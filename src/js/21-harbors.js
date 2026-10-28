// 港の囲い：L字の防波堤で小さな船だまりをつくり、小舟を並べる
{
  const walls_ = [],
    boats_ = [],
    R = rnd(612);
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
    const ux = Math.cos(a),
      uy = Math.sin(a),
      vx = -uy,
      vy = ux,
      W = 300 + R() * 200,
      D = 250 + R() * 150,
      o = [p[0], p[1]];
    walls_.push([
      o[0] + (vx * W) / 2,
      o[1] + (vy * W) / 2,
      o[0] + (vx * W) / 2 + ux * D,
      o[1] + (vy * W) / 2 + uy * D,
    ]);
    walls_.push([
      o[0] + (vx * W) / 2 + ux * D,
      o[1] + (vy * W) / 2 + uy * D,
      o[0] - vx * W * 0.15 + ux * D,
      o[1] - vy * W * 0.15 + uy * D,
    ]);
    walls_.push([
      o[0] - (vx * W) / 2,
      o[1] - (vy * W) / 2,
      o[0] - (vx * W) / 2 + ux * D * 0.55,
      o[1] - (vy * W) / 2 + uy * D * 0.55,
    ]);
    for (let k = 0; k < 6 + Math.floor(R() * 8); k++)
      boats_.push([
        o[0] + vx * (R() - 0.5) * W * 0.8 + ux * (30 + R() * D * 0.6),
        o[1] + vy * (R() - 0.5) * W * 0.8 + uy * (30 + R() * D * 0.6),
        a + (R() < 0.5 ? 0 : Math.PI),
      ]);
  }
  const M = new THREE.Matrix4(),
    WI = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1.6, 2.4),
      new THREE.MeshLambertMaterial({ color: 0x8f8d86 }),
      walls_.length,
    );
  walls_.forEach(([x1, y1, x2, y2], i) => {
    const L = Math.hypot(x2 - x1, y2 - y1) * S;
    M.compose(
      new THREE.Vector3(((x1 + x2) / 2) * S, 0.5, ((y1 + y2) / 2) * S),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.atan2(y2 - y1, x2 - x1), 0)),
      new THREE.Vector3(L, 1, 1),
    );
    WI.setMatrixAt(i, M);
  });
  scene.add(WI);
  const BI = new THREE.InstancedMesh(
      new THREE.BoxGeometry(5, 0.9, 1.8),
      new THREE.MeshLambertMaterial({ color: 0xffffff }),
      boats_.length,
    ),
    c = new THREE.Color();
  boats_.forEach(([x, y, r], i) => {
    if (!inLake(x, y)) {
      M.makeScale(0, 0, 0);
    } else
      M.compose(
        new THREE.Vector3(x * S, 0.3, y * S),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -r, 0)),
        new THREE.Vector3(1, 1, 1),
      );
    BI.setMatrixAt(i, M);
    BI.setColorAt(i, c.set([0xf2f2ee, 0xe8eef2, 0x9fc3d6, 0xd9e2d0][i % 4]));
  });
  scene.add(BI);
  // 堤の先の消波ブロック、岸の舟小屋（錆びたトタンの波板屋根）、船を上げる門形の鉄骨
  {
    const tet = [],
      shed = [],
      crane = [];
    walls_.forEach(([x1, y1, x2, y2], i) => {
      if (i % 3 !== 2) tet.push([x2, y2]);
    });
    for (let i = 0; i < walls_.length; i += 3) {
      const [x1, y1] = walls_[i],
        [, , ,] = walls_[i];
      const ox = (walls_[i][0] + walls_[i + 2][0]) / 2,
        oy = (walls_[i][1] + walls_[i + 2][1]) / 2,
        a = Math.atan2(walls_[i][3] - walls_[i][1], walls_[i][2] - walls_[i][0]);
      for (let k = 0; k < 3; k++)
        shed.push([
          ox - Math.cos(a) * (40 + k * 18) + Math.cos(a + 1.57) * (k - 1) * 90,
          oy - Math.sin(a) * (40 + k * 18) + Math.sin(a + 1.57) * (k - 1) * 90,
          a,
        ]);
      crane.push([ox - Math.cos(a) * 15, oy - Math.sin(a) * 15, a]);
    }
    const T = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(1.4, 0),
      new THREE.MeshLambertMaterial({ color: 0x8a8880, flatShading: true }),
      tet.length * 6,
    );
    let n = 0;
    tet.forEach(([x, y]) => {
      for (let k = 0; k < 6; k++) {
        M.compose(
          new THREE.Vector3(x * S + (R() - 0.5) * 4, 0.3 + R() * 0.6, y * S + (R() - 0.5) * 4),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * 3, R() * 3, R() * 3)),
          new THREE.Vector3(1, 1, 1),
        );
        T.setMatrixAt(n++, M);
      }
    });
    scene.add(T);
    const SH = new THREE.InstancedMesh(
        new THREE.BoxGeometry(14, 3, 7).translate(0, 1.5, 0),
        new THREE.MeshLambertMaterial({ color: 0xd8d4cc }),
        shed.length,
      ),
      RF = new THREE.InstancedMesh(
        new THREE.BoxGeometry(14.6, 0.4, 7.6),
        new THREE.MeshLambertMaterial({ color: 0x7a4a36 }),
        shed.length,
      );
    shed.forEach(([x, y, a], i) => {
      if (inLake(x, y)) {
        M.makeScale(0, 0, 0);
        SH.setMatrixAt(i, M);
        RF.setMatrixAt(i, M);
        return;
      }
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a, 0));
      M.compose(new THREE.Vector3(x * S, 0.6, y * S), q, new THREE.Vector3(1, 1, 1));
      SH.setMatrixAt(i, M);
      M.compose(new THREE.Vector3(x * S, 3.8, y * S), q, new THREE.Vector3(1, 1, 1));
      RF.setMatrixAt(i, M);
    });
    scene.add(SH, RF);
    const cg = new THREE.Group();
    crane.forEach(([x, y, a]) => {
      const g = new THREE.Group(),
        m = new THREE.MeshLambertMaterial({ color: 0x6b3e2a });
      for (const s of [-2.5, 2.5]) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7, 0.4), m);
        p.position.set(0, 3.5, s);
        g.add(p);
      }
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 6), m);
      b.position.y = 7;
      g.add(b);
      g.position.set(x * S, 0.6, y * S);
      g.rotation.y = -a;
      cg.add(g);
    });
    scene.add(cg);
  }
  window.__harb = walls_;
}

function lumpy(r, R, det, amp = 0.22) {
  const g = new THREE.IcosahedronGeometry(r, det);
  g.userData.keepN = 1;
  const p = g.attributes.position,
    o = [R() * 9, R() * 9, R() * 9];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i),
      l = Math.hypot(x, y, z),
      n =
        Math.sin(x * 2.3 + o[0]) * Math.sin(y * 2.7 + o[1]) * Math.sin(z * 2.1 + o[2]) * 0.5 +
        Math.sin(x * 5.1 + o[1]) * Math.sin(z * 4.7 + o[2]) * 0.25;
    const k =
      1 +
      n * amp +
      Math.sin(x * 9 + o[2]) * Math.sin(z * 9 + o[0]) * amp * 0.35 -
      (y < 0 ? 0.18 * (-y / l) : 0);
    p.setXYZ(i, x * k, y * k, z * k);
  }
  {
    const nn = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i),
        l = Math.hypot(x, y, z) || 1;
      nn.setXYZ(i, x / l, y / l + 0.15, z / l);
    }
  }
  return g;
}

function treeGeom(kind, det = 1) {
  const parts = [];
  const R = rnd(kind === "pine" ? 3 : kind === "cedar" ? 5 : 7);
  const trunk = new THREE.CylinderGeometry(0.14, 0.24, kind === "cedar" ? 5 : 3.4, 5)
    .translate(0, kind === "cedar" ? 2.5 : 1.5, 0)
    .rotateZ(kind === "pine" ? 0.18 : 0)
    .toNonIndexed();
  parts.push([trunk, new THREE.Color(0x4a3a2a)]);
  if (kind !== "cedar")
    for (let b = 0; b < 3; b++) {
      const a = b * 2.1 + R(),
        br = new THREE.CylinderGeometry(0.05, 0.1, 2, 4)
          .translate(0, 1, 0)
          .rotateZ(0.9)
          .rotateY(a)
          .translate(0, 2.2 + b * 0.3, 0)
          .toNonIndexed();
      parts.push([br, new THREE.Color(0x4a3a2a)]);
    }
  if (kind === "cedar") {
    for (let k = 0; k < 5; k++)
      parts.push([
        (() => {
          const g = new THREE.ConeGeometry(2.3 - k * 0.4, 3, 10, 2)
              .translate(0, 3.8 + k * 1.6, 0)
              .toNonIndexed(),
            p = g.attributes.position;
          for (let i = 0; i < p.count; i++) {
            const x = p.getX(i),
              z = p.getZ(i),
              a = Math.atan2(z, x),
              j = 1 + 0.18 * Math.sin(a * 5 + k) + 0.1 * Math.sin(a * 11);
            p.setX(i, x * j);
            p.setZ(i, z * j);
          }
          g.computeVertexNormals();
          return g;
        })(),
        new THREE.Color(0x29442f).offsetHSL(0, 0, k * 0.025),
      ]);
  } else
    for (let k = 0; k < (kind === "pine" ? (det > 1 ? 9 : 6) : det > 1 ? 11 : 6); k++) {
      const r = kind === "pine" ? 1.0 + R() * 0.5 : 1.1 + R() * 1.0,
        a = R() * 6.28,
        q = k ? 1.2 + R() * 1.5 : 0;
      parts.push([
        lumpy(r, R, det, kind === "pine" ? 0.42 : 0.24)
          .scale(1 + R() * 0.35, kind === "pine" ? 0.45 + R() * 0.15 : 0.9, 1 + R() * 0.35)
          .translate(
            Math.cos(a) * q,
            (kind === "pine" ? 2.9 : 3.2) + R() * 2.4 - (q > 2 ? 0.6 : 0),
            Math.sin(a) * q,
          )
          .toNonIndexed(),
        new THREE.Color(kind === "pine" ? 0x56784a : 0x5f8a44).offsetHSL(0, 0, (R() - 0.5) * 0.08),
      ]);
    }
  const pos = [],
    col = [],
    nrm = [],
    uvs = [];
  for (let [g, c] of parts) {
    if (g.index) {
      g = g.toNonIndexed();
    } else if (!g.userData.keepN) g.computeVertexNormals();
    const p = g.attributes.position.array,
      n = g.attributes.normal.array;
    for (let i = 0; i < p.length; i += 3) {
      pos.push(p[i], p[i + 1], p[i + 2]);
      nrm.push(n[i], n[i + 1], n[i + 2]);
      {
        const isLeaf = c.g > c.r * 1.2;
        uvs.push(
          isLeaf ? Math.atan2(p[i + 2], p[i]) * 1.2 + p[i + 1] * 0.2 : 0,
          isLeaf ? p[i + 1] * 0.9 + p[i] * 0.3 : 0,
        );
      }
      const sh = 0.6 + 0.55 * Math.min(1, Math.max(0, p[i + 1] / 7));
      const tip = Math.max(0, p[i + 1] - 5) * 0.03;
      const ln =
        0.8 +
        0.4 *
          (Math.sin(p[i] * 4.1 + p[i + 1] * 3.7) * Math.sin(p[i + 2] * 4.3 - p[i + 1] * 2.9) * 0.5 + 0.5) *
          (0.85 + 0.3 * Math.abs(Math.sin(p[i] * 17 + p[i + 2] * 13)));
      const ao = Math.min(1, 0.55 + 0.25 * Math.hypot(p[i], p[i + 2]));
      col.push((c.r * sh + tip * 0.3) * ln * ao, (c.g * sh + tip * 0.4) * ln * ao, c.b * sh * ln * ao);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  return g;
}
const TREE_MAT = new THREE.MeshLambertMaterial({ vertexColors: true });
NEAR_TREE_MAT();
TREE_MAT.map = LEAFTX;
