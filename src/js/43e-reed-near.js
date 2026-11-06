/* ---------- ヨシ原を近くで（2026年11月） ----------
   ・すぐ近くのヨシ：建物のまわり（実寸約600m）のヨシ原には、細い茎と穂を1本ずつ足す。遠くは板のヨシ（16-terrain-4-reeds.js）のまま
   ・ヨシ原のそばの水：ヨシが水をきれいにするので、わずかに澄んで明るい青緑に見える（14-water.js の uReedC）
   ・小魚の波紋：ヨシ際の水面に、小さな輪がときどき広がって消える（ヨシ原は生き物のゆりかご）。朝夕に多い
   どれも言葉では説明しない */
{
  // ヨシ原の近さの地図（湖の深さの地図と同じ200m升）。近いほど1
  {
    const A = new Uint8Array(GW * GH * 4);
    for (const [x, y] of reedPts) {
      const ci = Math.round((x - minX) / CELL),
        cj = Math.round((y - minY) / CELL);
      for (let b = -2; b <= 2; b++)
        for (let a = -2; a <= 2; a++) {
          const i = ci + a,
            j = cj + b;
          if (i < 0 || j < 0 || i >= GW || j >= GH) continue;
          const v = Math.round(255 * Math.max(0, 1 - Math.hypot(a, b) / 2.6)),
            k = (j * GW + i) * 4;
          if (v > A[k]) A[k] = v;
          A[k + 3] = 255;
        }
    }
    const T = new THREE.DataTexture(A, GW, GH);
    T.magFilter = T.minFilter = THREE.LinearFilter;
    T.needsUpdate = true;
    waterU.uReedC.value = T;
  }
  // 近くのヨシ：細い茎（太さ約4cm）と、秋冬は穂。建物のまわりのヨシ原の点から選び、建物が動いたら置き直す
  const NS = MOBILE ? 600 : 1200,
    stemG = new THREE.CylinderGeometry(0.018, 0.03, 1, 3, 1, true).translate(0, 0.5, 0),
    plumeG = new THREE.ConeGeometry(0.09, 0.45, 4).rotateX(Math.PI).translate(0, 1.03, 0),
    sway = (m) => {
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uT = reedU.uT;
        sh.uniforms.uW = reedU.uW;
        sh.vertexShader = sh.vertexShader
          .replace("#include <common>", "#include <common>\nuniform float uT;uniform vec2 uW;")
          .replace(
            "#include <project_vertex>",
            // 板のヨシと同じなびき方（高い所ほど大きく、風の帯で大きく揺れる）
            "vec4 wp=modelMatrix*instanceMatrix*vec4(transformed,1.);float hh=clamp(transformed.y,0.,1.1);vec2 wd_=normalize(uW+1e-4);float gb=smoothstep(.45,1.,sin(dot(wp.xz,wd_)*.045-uT*1.25+sin(wp.x*.013+wp.z*.011)*2.));float sw=(.35+.65*sin(uT*1.6+wp.x*.35+wp.z*.27)+gb*1.4)*hh*hh;wp.xz+=uW*sw*1.3;vec4 mvPosition=viewMatrix*wp;gl_Position=projectionMatrix*mvPosition;",
          );
      };
      return m;
    },
    stemM = sway(new THREE.MeshLambertMaterial({ color: 0xffffff })),
    plumeM = sway(new THREE.MeshLambertMaterial({ color: 0xffffff })),
    stems = new THREE.InstancedMesh(stemG, stemM, NS),
    plumes = new THREE.InstancedMesh(plumeG, plumeM, NS);
  for (const m of [stems, plumes]) {
    m.userData.noChunk = true;
    m.userData.noRefl = true;
    m.frustumCulled = false;
    m.count = 0;
    scene.add(m);
  }
  // 小魚の波紋：水面に寝かせた輪。広がりながら薄れる
  const NR = 24,
    ringM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, opacity: 0.35 }),
    rings = new THREE.InstancedMesh(new THREE.RingGeometry(0.85, 1, 24).rotateX(-Math.PI / 2), ringM, NR),
    rs = Array.from({ length: NR }, () => ({ a: -1, x: 0, z: 0 }));
  rings.userData.noChunk = true;
  rings.userData.noRefl = true;
  rings.frustumCulled = false;
  rings.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NR * 3), 3);
  scene.add(rings);
  const M = new THREE.Matrix4(),
    Q = new THREE.Quaternion(),
    E = new THREE.Euler(),
    V = new THREE.Vector3(),
    Sc = new THREE.Vector3(),
    c = new THREE.Color(),
    STEM = { summer: 0x58733d, spring: 0x86a85a, autumn: 0xa58c56, winter: 0xc8a96c, cut: 0x9c8a66, burnt: 0x5a4c3e },
    PLUME = { summer: 0x7a6a50, autumn: 0x8f6e55, winter: 0xe2d2ac };
  // ヨシの先から落ちたしずくの輪（43f-fragments.js から）
  G.dropRing = (x, z) => {
    const r = rs.find((q) => q.a < 0);
    if (r) (r.x = x), (r.z = z), (r.a = 0.25);
  };
  // 大きくゆっくり広がる一つの輪（日暮れの鐘の余韻：43g-prayer.js から）
  G.wideRing = (x, z) => {
    const r = rs.find((q) => q.a < 0);
    if (r) (r.x = x), (r.z = z), (r.a = 0), (r.k = 3.2), (r.sp = 11);
  };
  let at = null,
    kindNow = "",
    near = [],
    nextFish = 0;
  onFrame(133, (f) => {
    const mo = f.c.month,
      kind = REED_MONTH[mo],
      tall = kind !== "cut" && kind !== "burnt" && REED_CUT[mo] === 0,
      cx = camera.position.x,
      cz = camera.position.z;
    const show = tall && !isFar;
    stems.visible = plumes.visible = show;
    // 置き直す：建物のまわり（作品の単位で120）のヨシの点から
    if (show && (!at || Math.hypot(at[0] - cx, at[1] - cz) > 30 || kind !== kindNow)) {
      at = [cx, cz];
      kindNow = kind;
      near = reedPts.filter(([x, y]) => Math.abs(x * S - cx) < 120 && Math.abs(y * S - cz) < 120);
      let n = 0;
      const R = rnd(Math.floor(cx) * 7 + Math.floor(cz)),
        hk = kind === "spring" ? 0.5 : 1,
        wy = water.position.y;
      if (near.length)
        for (let i = 0; i < NS; i++) {
          const p = near[Math.floor(R() * near.length)],
            x = p[0] * S + (R() - 0.5) * 9,
            z = p[1] * S + (R() - 0.5) * 9;
          const h = (3.2 + R() * 1.2) * hk;
          M.compose(V.set(x, wy - 0.3, z), Q.setFromEuler(E.set((R() - 0.5) * 0.12, R() * 6.28, (R() - 0.5) * 0.12)), Sc.set(1, h, 1));
          stems.setMatrixAt(n, M);
          plumes.setMatrixAt(n, M);
          const k = 0.85 + R() * 0.3;
          stems.setColorAt(n, c.setHex(STEM[kind] || STEM.summer).multiplyScalar(k));
          plumes.setColorAt(n, c.setHex(PLUME[kind] || PLUME.summer).multiplyScalar(k));
          n++;
        }
      stems.count = n;
      plumes.count = kind === "autumn" || kind === "winter" || kind === "summer" ? n : 0;
      for (const m of [stems, plumes]) {
        m.instanceMatrix.needsUpdate = true;
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      }
    }
    // 明るさ：日暮れと夜は暗く（板のヨシと同じ）
    const br = 0.12 + 0.88 * Math.min(1, f.day * 2.5);
    stemM.color.setScalar(br);
    plumeM.color.setScalar(br);
    // 小魚の波紋：ヨシの近くの水面に。朝夕に多く、真夜中や雨の日は少ない
    const h = f.c.phase * 24,
      rate = (0.55 + 1.3 * Math.max(0, 1 - Math.abs(h - 6.5) / 2.5) + 1.2 * Math.max(0, 1 - Math.abs(h - 18) / 2.5)) * (f.wxNow.rain > 0.3 ? 0.3 : 1) * (h < 4 || h > 22 ? 0.2 : 1);
    if (!isFar && near.length && f.t > nextFish && mo >= 3 && mo <= 10) {
      nextFish = f.t + (1.5 + Math.random() * 4) / rate / (mo === 4 || mo === 5 ? 2.5 : 1); // 5〜6月は産卵で浅瀬の波紋が増える
      const r = rs.find((q) => q.a < 0);
      if (r) {
        const p = near[Math.floor(Math.random() * near.length)],
          a = Math.random() * 6.28,
          d = 6 + Math.random() * 10; // ヨシの縁の少し沖
        r.x = p[0] * S + Math.cos(a) * d;
        r.z = p[1] * S + Math.sin(a) * d;
        if (inLake(r.x / S, r.z / S)) r.a = 0;
      }
    }
    let n = 0;
    for (const r of rs) {
      if (r.a < 0) continue;
      r.a += f.dt / (r.sp || 3.6); // 波紋はゆっくり広がって消える
      if (r.a >= 1) {
        r.a = -1;
        r.k = r.sp = 0;
        continue;
      }
      const s = (0.25 + r.a * 1.6) * (r.k || 1);
      M.compose(V.set(r.x, water.position.y + 0.06, r.z), Q.identity(), Sc.set(s, 1, s));
      rings.setMatrixAt(n, M);
      rings.setColorAt(n++, c.setScalar((1 - r.a) * (r.k ? 0.55 * Math.sin(Math.PI * Math.min(1, r.a * 4)) ** 0.5 : 1) * (0.25 + 0.75 * Math.min(1, f.day * 2.5))));
    }
    rings.count = n;
    rings.instanceMatrix.needsUpdate = true;
    rings.instanceColor.needsUpdate = true;
  });
}

// 柿の木：集落の家の脇に、秋（10〜12月）は葉の落ちた枝に橙の実が残る。誰も採らない実が、暮らしの気配になる
{
  const R = rndFor("kaki"),
    P = [];
  for (const h of houses) {
    if (h.kind && h.kind !== "house") continue;
    if (bHash(h.x - 9, h.y + 4) > 0.06) continue;
    const a = R() * 6.28,
      d = Math.max(h.w, h.d) * 0.7 + 3,
      x = h.x + (Math.cos(a) * d) / S,
      y = h.y + (Math.sin(a) * d) / S;
    if (inLake(x, y) || inRiver(x, y)) continue;
    P.push([x, y]);
  }
  placeLog("柿の木", "land", P);
  // 枝：幹と、斜めに張った枝（4本）。実：小さな橙の玉を枝先に
  const trunkG = new THREE.CylinderGeometry(0.12, 0.2, 2.6, 5).translate(0, 1.3, 0),
    branchG = new THREE.CylinderGeometry(0.04, 0.08, 2.2, 4).translate(0, 1.1, 0),
    fruitG = new THREE.SphereGeometry(0.11, 6, 4),
    bm = new THREE.MeshLambertMaterial({ color: 0x4a3a2e }),
    fm = new THREE.MeshLambertMaterial({ color: 0xe8701e, emissive: 0x2a1004 }),
    NB = 4,
    NF = 14,
    tr = new THREE.InstancedMesh(trunkG, bm, Math.max(1, P.length)),
    br = new THREE.InstancedMesh(branchG, bm, Math.max(1, P.length * NB)),
    fr = new THREE.InstancedMesh(fruitG, fm, Math.max(1, P.length * NF)),
    M = new THREE.Matrix4(),
    Q = new THREE.Quaternion(),
    E = new THREE.Euler(),
    V = new THREE.Vector3(),
    Sc = new THREE.Vector3(1, 1, 1);
  P.forEach(([x, y], i) => {
    const gy = landY(x, y),
      px = x * S,
      pz = y * S;
    M.compose(V.set(px, gy, pz), Q.identity(), Sc.set(1, 1, 1));
    tr.setMatrixAt(i, M);
    for (let k = 0; k < NB; k++) {
      const a = (k / NB) * 6.28 + R(),
        tilt = 0.6 + R() * 0.4;
      Q.setFromEuler(E.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt));
      M.compose(V.set(px, gy + 2.3, pz), Q, Sc.set(1, 0.9 + R() * 0.4, 1));
      br.setMatrixAt(i * NB + k, M);
      for (let j = 0; j < NF / NB; j++) {
        const u = 0.45 + R() * 0.55,
          tip = new THREE.Vector3(0, 2.2 * u, 0).applyQuaternion(Q);
        M.compose(V.set(px + tip.x + (R() - 0.5) * 0.3, gy + 2.3 + tip.y - 0.12, pz + tip.z + (R() - 0.5) * 0.3), Q.identity(), Sc.setScalar(0.85 + R() * 0.3));
        fr.setMatrixAt(Math.min(P.length * NF - 1, i * NF + k * Math.floor(NF / NB) + j), M);
      }
    }
  });
  for (const m of [tr, br, fr]) {
    m.count = m === tr ? P.length : m === br ? P.length * NB : P.length * NF;
    m.castShadow = QUALITY.treeShadow;
    scene.add(m);
  }
  onFrame(134, (f) => {
    const mo = f.c.month;
    tr.visible = br.visible = true;
    fr.visible = mo >= 9 && mo <= 11; // 実は秋から冬のはじめ
    // 春〜夏は葉が茂る季節なので枝だけでは寂しい：その間は木ごと隠す（ほかの木が茂っている）
    tr.visible = br.visible = mo >= 9 || mo <= 2;
  });
}
