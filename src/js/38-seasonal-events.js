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
    const ff = LOOK.show.fireflies && mo === LOOK.months.fireflies && day < 0.05;
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
  placeLog("海津大崎の桜", "land", sak);
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
      const gy = landY(x, y),
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
  const up0 = update;
  function update2(dt, c, day, t, W) {
    up0(dt, c, day, t, W);
    sakI.visible = trI.visible = c.month === 3;
  }
  return { update: update2, sites };
})();
