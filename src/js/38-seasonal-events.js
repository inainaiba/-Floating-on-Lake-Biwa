G.EV = (() => {
  const g = new THREE.Group();
  scene.add(g);
  const smokeTx = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d"),
      gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,.7)");
    gr.addColorStop(0.5, "rgba(255,255,255,.25)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = gr;
    x.fillRect(0, 0, 64, 64);
    const tx = new THREE.CanvasTexture(c);
    tx.generateMipmaps = false;
    tx.minFilter = THREE.LinearFilter;
    return tx;
  })();
  const R = rnd(2718);
  const sites = [];
  for (let k = 0; k < 6 && reedPts.length; k++) {
    const p = reedPts[Math.floor(R() * reedPts.length)];
    sites.push([p[0] * S, p[1] * S]);
  }
  const smoke = [];
  for (let i = 0; i < 90; i++) {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: smokeTx,
        color: 0xb9b4aa,
        transparent: true,
        depthWrite: false,
        opacity: 0,
      }),
    );
    s.visible = false;
    s.userData = { a: -1 };
    g.add(s);
    smoke.push(s);
  }
  const fires = sites.map(([x, z]) => {
    const l = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: smokeTx,
        color: 0xff8a30,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0,
      }),
    );
    l.position.set(x, 1.2, z);
    l.scale.set(9, 4, 1);
    l.visible = false;
    g.add(l);
    return l;
  });
  let si = 0,
    spT = 0;
  // 飛ぶ鳥の形：細い胴と、先へ細くなり少し後ろへ反る翼（羽ばたきは翼端の上下で表す）
  const wing = (() => {
    const p = [];
    const prof = [
      [0, 0, 0.22, -0.12],
      [0.25, 0.04, 0.2, -0.12],
      [0.5, 0.1, 0.14, -0.1],
      [0.75, 0.18, 0.06, -0.12],
      [0.95, 0.24, -0.02, -0.14],
    ];
    for (const s of [-1, 1])
      for (let i = 0; i < prof.length - 1; i++) {
        const [x0, y0, f0, b0] = prof[i],
          [x1, y1, f1, b1] = prof[i + 1];
        // x：横（翼幅）、y：上下、z：前後（前縁 f・後縁 b、翼端ほど後ろへ）
        const A = [s * x0, y0, f0 - x0 * 0.25],
          B = [s * x0, y0, b0 - x0 * 0.25],
          C = [s * x1, y1, f1 - x1 * 0.25],
          D = [s * x1, y1, b1 - x1 * 0.25];
        p.push(...A, ...B, ...C, ...B, ...D, ...C);
      }
    // 胴と頭・尾
    p.push(0, 0.02, 0.45, 0.05, 0, 0, -0.05, 0, 0, 0.05, 0, 0, -0.05, 0, 0, 0, 0.02, -0.35, -0.1, 0, -0.35, 0.1, 0, -0.35, 0, 0.02, -0.2);
    const gg = new THREE.BufferGeometry();
    gg.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    gg.computeVertexNormals();
    return gg;
  })();
  const NB = 90,
    birds = new THREE.InstancedMesh(
      wing,
      new THREE.MeshLambertMaterial({ color: 0x5a5c62, side: THREE.DoubleSide }),
      NB,
    );
  birds.frustumCulled = false;
  birds.visible = false;
  g.add(birds);
  const fl = [0, 1, 2].map((i) => ({ ph: i * 2.1, off: [] }));
  for (const f of fl)
    for (let k = 0; k < 30; k++) {
      const u = Math.random(),
        v = Math.random();
      f.off.push([
        (u - 0.5) * 46 * (0.6 + 0.4 * Math.random()),
        (Math.random() - 0.5) * 5 + Math.sin(u * 6) * 2,
        (v - 0.5) * 14 * (1 - Math.abs(u - 0.5)),
      ]);
    }
  const NF = 260,
    fpos = new Float32Array(NF * 3),
    fgeo = new THREE.BufferGeometry();
  fgeo.setAttribute("position", new THREE.BufferAttribute(fpos, 3));
  const fmat = new THREE.PointsMaterial({
    color: 0xd8ff8a,
    map: G.dotTex,
    alphaTest: 0.02,
    size: 1.3,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0,
    fog: false,
  });
  const ffl = new THREE.Points(fgeo, fmat);
  ffl.visible = false;
  ffl.frustumCulled = false;
  g.add(ffl);
  let fAt = null;
  const fph = Float32Array.from({ length: NF }, () => Math.random() * 6.28);
  const fcol = new Float32Array(NF * 3);
  fgeo.setAttribute("color", new THREE.BufferAttribute(fcol, 3));
  fmat.vertexColors = true;
  const M = new THREE.Matrix4(),
    Qt = new THREE.Quaternion(),
    V = new THREE.Vector3(),
    Sc = new THREE.Vector3();
  function update(dt, c, day, t, W) {
    const mo = c.month,
      ph = c.phase,
      cx = camera.position.x,
      cz = camera.position.z;
    const burn = mo === 2 && ph > 0.3 && ph < 0.62 ? Math.min(1, (ph - 0.3) / 0.03, (0.62 - ph) / 0.03) : 0;
    fires.forEach((f) => {
      f.visible = burn > 0;
      f.material.opacity = burn * (0.35 + 0.25 * Math.sin(t * 9 + f.position.x));
    });
    if (burn > 0) {
      spT -= dt;
      if (spT < 0) {
        spT = 0.12;
        const [x, z] = sites[si++ % sites.length];
        const s = smoke[si % smoke.length];
        s.position.set(x + (Math.random() - 0.5) * 10, 1, z + (Math.random() - 0.5) * 10);
        s.userData.a = 0;
        s.visible = true;
      }
    }
    for (const s of smoke) {
      const u = s.userData;
      if (u.a < 0) continue;
      u.a += dt / 22;
      if (u.a >= 1) {
        u.a = -1;
        s.visible = false;
        continue;
      }
      s.position.y += dt * (4 + u.a * 2);
      s.position.x += W.x * dt * 0.8;
      s.position.z += W.y * dt * 0.8;
      const sc = 10 + u.a * 60;
      s.scale.set(sc, sc, 1);
      s.material.opacity =
        Math.min(1, u.a * 8) *
        (1 - u.a) *
        0.42 *
        Math.max(0, 1 - Math.hypot(s.position.x - cx, s.position.z - cz) / 1400);
    }
    const win = false; // 飛ぶ鳥の群れは出さない
    birds.visible = win;
    if (win) {
      let n = 0;
      for (const f of fl) {
        const ang = f.ph + t * 0.004,
          cxf = cx + Math.cos(ang) * 260,
          czf = cz + Math.sin(ang) * 260,
          dir = ang + Math.PI / 2,
          hy = 22 + 10 * Math.sin(t * 0.05 + f.ph);
        Qt.setFromAxisAngle(V.set(0, 1, 0), -dir);
        for (const [a, b, cc] of f.off) {
          if (n >= NB) break;
          const ca = Math.cos(-dir),
            sa = Math.sin(-dir);
          const x = cxf + a * ca - cc * sa,
            z = czf + a * sa + cc * ca;
          // ゆったり羽ばたき、ときどき滑空する
          const fp = Math.sin(t * (3.2 + (n % 5) * 0.3) + n * 1.3),
            glide = Math.sin(t * 0.3 + n) > 0.4 ? 0.25 : 1;
          Sc.set(1.5, 1.5 * fp * glide + (glide < 1 ? 0.3 : 0), 1.5);
          M.compose(V.set(x, hy + b - fp * 0.08 * glide, z), Qt, Sc);
          birds.setMatrixAt(n++, M);
        }
      }
      birds.count = n;
      birds.instanceMatrix.needsUpdate = true;
    }
    const ff = mo === 5 && day < 0.05;
    ffl.visible = ff;
    if (ff) {
      if (!fAt || Math.hypot(fAt[0] - cx, fAt[1] - cz) > 250) {
        fAt = [cx, cz];
        const near = reedPts.filter(([x, y]) => Math.hypot(x * S - cx, y * S - cz) < 350);
        for (let i = 0; i < NF; i++) {
          const p = near.length ? near[Math.floor(Math.random() * near.length)] : [cx / S, cz / S];
          fpos[i * 3] = p[0] * S + (Math.random() - 0.5) * 14;
          fpos[i * 3 + 1] = 0.8 + Math.random() * 2.5;
          fpos[i * 3 + 2] = p[1] * S + (Math.random() - 0.5) * 14;
        }
      }
      for (let i = 0; i < NF; i++) {
        const k = Math.max(0, Math.sin(t * 1.7 + fph[i] * 3) * Math.sin(t * 0.9 + fph[i]));
        fcol[i * 3] = 0.85 * k;
        fcol[i * 3 + 1] = k;
        fcol[i * 3 + 2] = 0.5 * k;
        fpos[i * 3 + 1] += Math.sin(t + fph[i]) * dt * 0.15;
      }
      fgeo.attributes.position.needsUpdate = fgeo.attributes.color.needsUpdate = true;
      fmat.opacity = 1;
    }
  }
  const sak = [];
  for (let i = 0; i < outer.length - 1; i++) {
    const [x1, y1] = outer[i],
      [x2, y2] = outer[i + 1];
    const lo = 136.08 + x1 / (111320 * Math.cos((35.25 * Math.PI) / 180)),
      la = 35.25 - y1 / 110540;
    if (!(lo > 136.07 && lo < 136.13 && la > 35.46 && la < 35.51)) continue;
    const L = Math.hypot(x2 - x1, y2 - y1);
    for (let s = 0; s < L; s += 14) {
      const u = s / L,
        bx = x1 + (x2 - x1) * u,
        by = y1 + (y2 - y1) * u;
      for (const r of [22, 40]) {
        const a = Math.random() * 6.28,
          px = bx + Math.cos(a) * r,
          py = by + Math.sin(a) * r;
        if (!inLake(px, py)) {
          sak.push([px, py]);
          break;
        }
      }
    }
  }
  const NL = 4,
    sakI = new THREE.InstancedMesh(
      lumpy(1, rnd(77), 2, 0.3),
      new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
      Math.max(1, sak.length * NL),
    );
  sakI.visible = false;
  const trI = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.12, 0.22, 1, 6).translate(0, 0.5, 0),
    new THREE.MeshLambertMaterial({ color: 0x3e3430 }),
    Math.max(1, sak.length * 3),
  );
  trI.visible = false;
  {
    const c = new THREE.Color(),
      E = new THREE.Euler();
    sak.forEach(([x, y], i) => {
      const gy = 0.6 + terrainAt(x, y) * S * VEX,
        H = 3.2 + Math.random() * 1.4,
        lean = (Math.random() - 0.5) * 0.3;
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * 6.28 + Math.random(),
          tl = k ? H * 0.55 : H * 0.85;
        Qt.setFromEuler(E.set(k ? Math.cos(a) * 0.6 : lean, 0, k ? Math.sin(a) * 0.6 : lean * 0.5));
        M.compose(V.set(x * S, k ? gy + H * 0.35 : gy, y * S), Qt, Sc.set(1, tl, 1));
        trI.setMatrixAt(i * 3 + k, M);
      }
      for (let k = 0; k < NL; k++) {
        const a = (k / NL) * 6.28 + Math.random(),
          r = k ? 1.6 + Math.random() * 0.8 : 0,
          s = k ? 1.6 + Math.random() * 0.7 : 2.1;
        M.compose(
          V.set(
            x * S + Math.cos(a) * r,
            gy + H + (k ? -0.3 + Math.random() * 0.6 : 0.4),
            y * S + Math.sin(a) * r,
          ),
          Qt.identity(),
          Sc.set(s * 1.25, s * 0.7, s * 1.25),
        );
        sakI.setMatrixAt(i * NL + k, M);
        sakI.setColorAt(i * NL + k, c.setHSL(0.955 + Math.random() * 0.03, 0.8, 0.7 + Math.random() * 0.07));
      }
    });
  }
  g.add(sakI, trI);
  // 水に浮かぶ鴨の形：低い胴、上がった尾、首と頭（色は一羽ずつ少し違う）
  const duckGeo = (() => {
    const body = new THREE.SphereGeometry(1, 12, 8);
    {
      const p = body.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let x = p.getX(i),
          y = p.getY(i),
          z = p.getZ(i);
        if (y < 0) y *= 0.35; // 水に沈む腹は平たく
        if (x < -0.3) y += (-x - 0.3) * 0.5 * Math.max(0, y + 0.3); // 尾が上がる
        p.setXYZ(i, x * 0.3, y * 0.13 + 0.02, z * 0.14);
      }
    }
    const neck = new THREE.CylinderGeometry(0.035, 0.05, 0.14, 6).translate(0.2, 0.12, 0);
    const head = new THREE.SphereGeometry(0.055, 8, 6).scale(1.3, 1, 1).translate(0.23, 0.2, 0);
    const bill = new THREE.ConeGeometry(0.022, 0.07, 5).rotateZ(-Math.PI / 2).translate(0.3, 0.19, 0);
    const parts = [body, neck, head, bill].map((g) => g.toNonIndexed());
    const pos = [];
    for (const g of parts) pos.push(...g.attributes.position.array);
    const gg = new THREE.BufferGeometry();
    gg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    gg.computeVertexNormals();
    return gg;
  })();
  const ND = 320,
    duck = new THREE.InstancedMesh(duckGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), ND);
  {
    const cc = new THREE.Color();
    for (let i = 0; i < ND; i++) duck.setColorAt(i, cc.setHSL(0.07 + Math.random() * 0.04, 0.12 + Math.random() * 0.1, 0.32 + Math.random() * 0.14));
  }
  duck.visible = false;
  duck.frustumCulled = false;
  g.add(duck);
  // 泳ぐ鴨の後ろに残るV字の小さな波（3羽に1羽）
  const vGeo = (() => {
    const p = [],
      L = 2.6,
      w = 0.07,
      sp = 0.42;
    for (const s of [-1, 1]) {
      const ex = -L * Math.cos(sp),
        ez = s * L * Math.sin(sp),
        nx = -ez / L,
        nz = ex / L;
      p.push(0, 0, 0, ex, 0, ez, ex + nx * w, 0, ez + nz * w, 0, 0, 0, ex + nx * w, 0, ez + nz * w, nx * w, 0, nz * w);
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    return gg;
  })();
  const vw = new THREE.InstancedMesh(vGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }), Math.ceil(ND / 3));
  vw.visible = false;
  vw.frustumCulled = false;
  g.add(vw);
  let dAt = null;
  const dp = [];
  const up0 = update;
  function update2(dt, c, day, t, W) {
    up0(dt, c, day, t, W);
    sakI.visible = trI.visible = c.month === 3;
    const dk = false; // 水面の鴨は出さない
    duck.visible = vw.visible = dk;
    if (dk) {
      const cx = camera.position.x,
        cz = camera.position.z;
      if (!dAt || Math.hypot(dAt[0] - cx, dAt[1] - cz) > 300) {
        dAt = [cx, cz];
        dp.length = 0;
        const near = reedPts.filter(([x, y]) => Math.hypot(x * S - cx, y * S - cz) < 400);
        for (let r = 0; r < 4; r++) {
          const p = near.length ? near[Math.floor(Math.random() * near.length)] : [cx / S + 300, cz / S];
          for (let i = 0; i < 35; i++) {
            let x = p[0] * S + (Math.random() - 0.5) * 40,
              z = p[1] * S + (Math.random() - 0.5) * 40;
            dp.push([x, z, Math.random() * 6.28]);
          }
        }
        for (let r = 0; r < 3; r++) {
          const a = Math.random() * 6.28,
            d = 150 + Math.random() * 250,
            ox = cx + Math.cos(a) * d,
            oz = cz + Math.sin(a) * d;
          for (let i = 0; i < 60 && dp.length < ND; i++) {
            const u = Math.random(),
              v = Math.random();
            dp.push([ox + (u - 0.5) * 140, oz + (v - 0.5) * 50, Math.random() * 6.28]);
          }
        }
      }
      dp.forEach(([x, z, ph], i) => {
        if (!inLake(x / S, z / S)) {
          M.makeScale(0, 0, 0);
          duck.setMatrixAt(i, M);
          return;
        }
        const xx = x + Math.sin(t * 0.05 + ph) * 3,
          zz = z + Math.cos(t * 0.04 + ph) * 3,
          hd = Math.atan2(-Math.sin(t * 0.04 + ph) * 0.12, Math.cos(t * 0.05 + ph) * 0.15);
        Qt.setFromAxisAngle(V.set(0, 1, 0), -hd);
        const wy = waveH(xx, zz, t);
        M.compose(V.set(xx, wy + 0.02, zz), Qt, Sc.set(1, 1, 1));
        duck.setMatrixAt(i, M);
        if (i % 3 === 0) {
          M.compose(V.set(xx, wy + 0.03, zz), Qt, Sc.set(1, 1, 1));
          vw.setMatrixAt(i / 3, M);
        }
      });
      duck.instanceMatrix.needsUpdate = vw.instanceMatrix.needsUpdate = true;
    }
  }
  return { update: update2, sites };
})();
