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
  // ヨシ焼き（3月の昼）：各ヨシ原の決まった所に火を入れ、火の輪がヨシの中をゆっくり広がる。
  // 焼けた所は黒い株が残り（16-terrain-4-reeds.js の uBurn）、白い煙の柱が高く立って風下へたなびく。近くではパチパチと音がする
  const RF = 110, // 燃え広がる半径の上限（作品の単位。実寸約550m）
    BS = [];
  for (const [cx, cy] of REED_SITES) {
    let best = null,
      bd = 1e18;
    for (const p of reedPts) {
      const d = (p[0] - cx) ** 2 + (p[1] - cy) ** 2;
      if (d < bd) (bd = d), (best = p);
    }
    if (!best) continue;
    const ix = best[0] * S,
      iz = best[1] * S,
      pts = [];
    for (const p of reedPts) {
      const d = Math.hypot(p[0] * S - ix, p[1] * S - iz);
      if (d < RF) pts.push([p[0] * S, p[1] * S, d]);
    }
    pts.sort((u, v) => u[2] - v[2]);
    BS.push({ x: ix, z: iz, pts, maxD: pts.length ? pts[pts.length - 1][2] : 0, r: 0, w: 0 });
  }
  const lowIdx = (arr, d) => {
    let lo = 0,
      hi = arr.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (arr[m][2] < d) lo = m + 1;
      else hi = m;
    }
    return lo;
  };
  const smoke = [];
  for (let i = 0; i < 160; i++) {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: smokeTx,
        color: 0xe2ddd4,
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
  const fires = Array.from({ length: 60 }, () => {
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
    l.visible = false;
    g.add(l);
    return l;
  });
  const spawnSmoke = (x, z, big) => {
    const s = smoke[si++ % smoke.length];
    s.position.set(x + (Math.random() - 0.5) * 4, 1.5, z + (Math.random() - 0.5) * 4);
    s.userData.a = 0;
    s.userData.big = big;
    s.visible = true;
  };
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
  // すぐ近くの蛍が、ぼやけた大きな玉にならないように：画面の上の大きさに上限を設け、近すぎるものは薄くする
  fmat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace("#include <fog_vertex>", "#include <fog_vertex>\ngl_PointSize=min(gl_PointSize,9.);vNearF=smoothstep(4.,14.,-mvPosition.z);").replace("void main() {", "varying float vNearF;\nvoid main() {");
    sh.fragmentShader = sh.fragmentShader.replace("void main() {", "varying float vNearF;\nvoid main() {").replace("#include <premultiplied_alpha_fragment>", "gl_FragColor.rgb*=vNearF;\n#include <premultiplied_alpha_fragment>");
  };
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
    // 火を入れるのは10時ごろ、燃え広がって15時ごろに鎮まる（3月の一日）
    const P0 = 0.42,
      P1 = 0.6,
      on = mo === 2;
    for (const b of BS) {
      const u = on ? Math.min(1, Math.max(0, (ph - P0) / (P1 - P0))) : 0;
      b.r = on && ph > P0 ? Math.min(b.maxD + 4, RF * (u * u * (3 - 2 * u))) : 0;
      b.w = on && ph > P0 && ph < P1 + 0.02 && b.r < b.maxD + 3 ? 1 : 0;
      b.dc = Math.hypot(b.x - cx, b.z - cz);
    }
    const near = [...BS].sort((p, q) => p.dc - q.dc);
    near.slice(0, 8).forEach((b, i) => reedU.uBurn.value[i].set(b.x, b.z, b.r, b.w));
    for (let i = near.length; i < 8; i++) reedU.uBurn.value[i].set(0, 0, 0, 0);
    // 炎：いちばん近い3か所の、燃えている縁のヨシの上に
    let nf = 0,
      crackle = 1e9;
    for (const b of near.slice(0, 3)) {
      if (!b.w || b.dc > 900) continue;
      const i0 = lowIdx(b.pts, b.r - 3.5),
        i1 = lowIdx(b.pts, b.r + 3.5),
        n = i1 - i0,
        step = Math.max(1, Math.floor(n / 24));
      for (let k = i0; k < i1 && nf < fires.length; k += step) {
        const [x, z] = b.pts[k],
          f = fires[nf++];
        f.visible = true;
        f.position.set(x, 1.3 + Math.sin(t * 7 + k) * 0.15, z);
        const fl = 0.75 + 0.25 * Math.sin(t * 11 + k * 1.7) * Math.sin(t * 6.3 + k);
        f.scale.set(4.5 + (k % 3) * 1.5, (4 + (k % 4) * 0.8) * fl, 1);
        f.material.opacity = 0.85 * fl;
        crackle = Math.min(crackle, Math.hypot(x - cx, z - cz));
      }
    }
    for (let k = nf; k < fires.length; k++) fires[k].visible = false;
    // 煙：近くの燃えている縁からは盛んに、遠くのヨシ原からは柱が見える程度に
    spT -= dt;
    if (spT < 0) {
      spT = 0.05;
      for (const b of near) {
        if (!b.w) continue;
        const i0 = lowIdx(b.pts, b.r - 3),
          i1 = Math.max(i0 + 1, lowIdx(b.pts, b.r + 3));
        const pk = b.pts[Math.min(b.pts.length - 1, i0 + Math.floor(Math.random() * (i1 - i0)))];
        if (!pk) continue;
        if (b.dc < 900 || Math.random() < 0.3) spawnSmoke(pk[0], pk[1], b.dc > 900);
      }
    }
    // パチパチと燃える音（近いときだけ）
    if (crackle < 260 && SND.ctx && SND.on && Math.random() < dt * 14)
      nburst(5000 + Math.random() * 3000, 1400, 0.04 + Math.random() * 0.05, 0.05 * (1 - crackle / 260), (Math.random() - 0.5) * 0.8, 0.8, 0.2);
    for (const s of smoke) {
      const u = s.userData;
      if (u.a < 0) continue;
      u.a += dt / 40; // 煙は長く、ゆっくり崩れて消える
      if (u.a >= 1) {
        u.a = -1;
        s.visible = false;
        continue;
      }
      s.position.y += dt * (4.5 + u.a * 3.5) * (1 - Math.min(0.5, W.s / 14)); // 風が強いほど低く横へ
      s.position.x += W.x * dt * (0.4 + u.a * 1.2);
      s.position.z += W.y * dt * (0.4 + u.a * 1.2);
      const sc = (8 + u.a * 70) * (u.big ? 1.6 : 1);
      s.scale.set(sc, sc, 1);
      s.material.opacity =
        Math.min(1, u.a * 8) *
        (1 - u.a) *
        0.6 *
        Math.max(0, 1 - Math.hypot(s.position.x - cx, s.position.z - cz) / 2400);
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
  return { update: update2, sites: BS.map((b) => [b.x, b.z]) }; // ヨシ焼きの火を入れる所（確認用）
})();
onFrame(40, (f) => G.EV.update(f.dt, f.c, f.day, f.t, f.W)); // 毎フレームの更新（季節の出来事。順番は 00-head.js の onFrame）
