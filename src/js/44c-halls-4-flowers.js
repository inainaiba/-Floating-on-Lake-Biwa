/* ---------- 湖に浮かぶ建築 4. 水上の花屋（道具は 44c-halls-0-common.js の HALL） ---------- */
{
  const { R, villageSites, lam, box, add, M, glowMat, moor, STAY, MOVE, setCur } = HALL;
  // ---------- 4. 水上の花屋 ----------
  // 甲板に花桶をひな壇に並べた平舟に、縞の日よけ。花は季節で替わり（桜・菖蒲・向日葵・秋桜・椿）、岸に着くと色を持ち込む。
  // 離れたあとの岸には、淡い花びらがしばらく水面に残って流れる。南湖の集落を巡る
  // 南湖の岸（ほかの水上建築と重ならない所）：坂本・唐崎・膳所・矢橋・草津
  const floSites = villageSites([[135.875, 35.07], [135.86, 35.05], [135.89, 35.0], [135.93, 35.03], [135.94, 35.06]], 100);
  HALL.floSites = floSites;
  setCur("flo");
  let floH = null,
    floHeads = null;
  {
    const g = new THREE.Group();
    // 平舟：細長い床と、低い舷
    add(g, box(14, 0.5, 5.2), M.deck, 0, 0.55, 0);
    for (const x of [-5, -1.7, 1.7, 5]) for (const z of [-1.9, 1.9]) add(g, new THREE.CylinderGeometry(0.5, 0.5, 3, 8), M.float, x, 0.15, z, 0, Math.PI / 2);
    for (const z of [-2.55, 2.55]) add(g, box(14, 0.35, 0.1), M.post, 0, 0.95, z);
    for (let k = 0; k < 28; k++) add(g, box(0.02, 0.01, 5), M.dark, -6.75 + k * 0.5, 0.81, 0); // 床板の目地
    // ひな壇の花台（3段）と花桶
    const bucketM = lam(0x7a8a8c),
      bucketG = new THREE.CylinderGeometry(0.28, 0.22, 0.45, 10);
    for (let r = 0; r < 3; r++) {
      add(g, box(11, 0.08, 1.2), M.deck, 0, 1.0 + r * 0.45, -1.6 + r * 1.2);
      for (let k = 0; k < 15; k++) add(g, bucketG, bucketM, -5.2 + k * 0.74, 1.3 + r * 0.45, -1.6 + r * 1.2);
    }
    // 日よけ：細い柱6本と、白と若草の縞の布（少したるませる）
    for (const x of [-6.6, 0, 6.6]) for (const z of [-2.4, 2.4]) add(g, new THREE.CylinderGeometry(0.04, 0.05, 3.4, 5), M.post, x, 2.5, z);
    const stripe = cvTex(64, 16, (c2, w, h2) => {
      for (let x = 0; x < w; x += 8) {
        c2.fillStyle = (x / 8) % 2 ? "#f3efe4" : "#a9c49a";
        c2.fillRect(x, 0, 8, h2);
      }
    });
    stripe.wrapS = THREE.RepeatWrapping;
    stripe.repeat.set(6, 1);
    const awn = new THREE.PlaneGeometry(13.6, 5.2, 12, 4).rotateX(-Math.PI / 2);
    {
      const p = awn.attributes.position;
      for (let i = 0; i < p.count; i++) p.setY(i, -0.25 * Math.cos((p.getZ(i) / 5.2) * Math.PI)); // 布のたるみ
    }
    add(g, awn, lam(0xffffff, { map: stripe, side: THREE.DoubleSide, emissive: 0x141412 }), 0, 4.2, 0);
    // 夕方の灯り：日よけの下に小さな裸電球を3つ
    const bulbM = glowMat(0xffd59a, 2.2);
    for (const x of [-4.5, 0, 4.5]) add(g, new THREE.SphereGeometry(0.16, 8, 6), bulbM, x, 3.8, 0);
    // 日よけの柱に下げた吊り鉢（緑が垂れる）
    const leaf = lam(0x4f7a42, { emissive: 0x060c04 }),
      leafD = lam(0x3a5e34);
    for (const x of [-6.6, 6.6])
      for (const z of [-2.4, 2.4]) {
        add(g, new THREE.CylinderGeometry(0.005, 0.005, 0.6, 3), M.dark, x, 3.6, z * 0.92);
        add(g, new THREE.SphereGeometry(0.32, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), lam(0x9a7a5a, { side: THREE.DoubleSide }), x, 3.3, z * 0.92);
        add(g, new THREE.SphereGeometry(0.34, 8, 6), leaf, x, 3.35, z * 0.92);
        for (let j = 0; j < 4; j++) add(g, new THREE.ConeGeometry(0.06, 0.7, 4), leafD, x + Math.cos(j * 1.6) * 0.25, 2.95, z * 0.92 + Math.sin(j * 1.6) * 0.25, 0, Math.PI);
      }
    // 桶のところどころに、葉物（細い円錐の束）と、紙で包んだ花束
    for (let r = 0; r < 3; r++)
      for (let k = 1; k < 15; k += 4) for (let j = 0; j < 3; j++) add(g, new THREE.ConeGeometry(0.05, 0.9, 4), leafD, -5.2 + k * 0.74 + (j - 1) * 0.08, 1.85 + r * 0.45, -1.6 + r * 1.2, (j - 1) * 0.2);
    const paper = lam(0xe8dcc4, { side: THREE.DoubleSide });
    for (const [x, z, a] of [[-6.2, 1.6, 0.3], [-5.9, 1.9, -0.2], [6.1, 1.8, 0.1]]) add(g, new THREE.ConeGeometry(0.28, 0.9, 10, 1, true), paper, x, 1.25, z, 0, a, Math.PI);
    // 小さな黒板（字は書かない）と、ブリキの如雨露
    for (const s2 of [-1, 1]) {
      const o = add(g, box(0.7, 1.0, 0.04), lam(0x2a2e2a), -6.3, 1.35, -1.9 + s2 * 0.18);
      o.rotation.x = s2 * 0.18;
    }
    add(g, new THREE.CylinderGeometry(0.22, 0.24, 0.42, 12), lam(0x9aa4a6), 5.9, 1.05, -1.8);
    add(g, new THREE.CylinderGeometry(0.03, 0.05, 0.55, 6), lam(0x9aa4a6), 6.2, 1.18, -1.8, 0, 0, -0.9);
    floH = moor(g, floSites);
    // 花の頭：桶ごとに数輪。色は季節で替える（形は共有、毎月の色だけ塗り直す）
    const heads = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.24, 0), new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x2a2020 }), 3 * 15 * 4),
      Mx = new THREE.Matrix4();
    let n = 0;
    for (let r = 0; r < 3; r++)
      for (let k = 0; k < 15; k++)
        for (let j = 0; j < 4; j++) {
          Mx.makeTranslation((-5.2 + k * 0.74 + (R() - 0.5) * 0.35) * 1.2, (1.75 + r * 0.45 + R() * 0.35) * 1.2, (-1.6 + r * 1.2 + (R() - 0.5) * 0.35) * 1.2);
          heads.setMatrixAt(n++, Mx);
        }
    heads.userData.noChunk = true;
    heads.frustumCulled = false;
    floH.g.add(heads); // 舟と一緒に動く（舟の大きさの1.2倍は、上の位置に掛けてある）
    heads.scale.setScalar(1 / 1.2);
    floHeads = heads;
  }
  // 季節の花の色（月ごと）：4月 桜、5〜6月 菖蒲と芍薬、7〜8月 向日葵、9〜10月 秋桜、11〜3月 椿と水仙
  const FLOWERS = [
    [0xc8243a, 0xf4f0d8, 0xe8c040],
    [0xc8243a, 0xf4f0d8, 0xe8c040],
    [0xf2c6d0, 0xfbe4ea, 0xf4f0e8],
    [0xf2c6d0, 0xfbe4ea, 0xf4f0e8],
    [0x6a4aa8, 0xe58aa8, 0xf3eef6],
    [0x6a4aa8, 0x8a6ac8, 0xe58aa8],
    [0xf2b81e, 0xe89a1a, 0xf6d860],
    [0xf2b81e, 0xe89a1a, 0xf6d860],
    [0xf2a8c8, 0xd8508a, 0xf6f0f2],
    [0xf2a8c8, 0xd8508a, 0xe8c040],
    [0xc8243a, 0xf4f0d8, 0xe58aa8],
    [0xc8243a, 0xf4f0d8, 0xe8c040],
  ];
  let floMonth = -1;
  // 離れたあとの花びら：着いていた岸の水面に、淡い花びらがしばらく残って流れる
  const NPET = 160,
    petPos = new Float32Array(NPET * 3),
    petCol = new Float32Array(NPET * 3),
    petG = new THREE.BufferGeometry();
  petG.setAttribute("position", new THREE.BufferAttribute(petPos, 3));
  petG.setAttribute("color", new THREE.BufferAttribute(petCol, 3));
  const petals = new THREE.Points(petG, new THREE.PointsMaterial({ size: 0.22, map: G.dotTex, vertexColors: true, transparent: true, depthWrite: false, alphaTest: 0.02 }));
  petals.frustumCulled = false;
  petals.userData.noRefl = true;
  scene.add(petals);
  const petSeed = Array.from({ length: NPET }, () => [R() * 6.28, Math.sqrt(R()), R()]);
  const floUpdate = (c, t) => {
    if (c.month !== floMonth) {
      floMonth = c.month;
      const P3 = FLOWERS[c.month],
        cc = new THREE.Color();
      for (let i = 0; i < floHeads.count; i++) floHeads.setColorAt(i, cc.setHex(P3[(i * 7 + (i >> 2)) % 3]));
      floHeads.instanceColor.needsUpdate = true;
    }
    // 花びら：いま漂っている間、直前に着いていた岸の水面に。離れてからの時間で薄れて消える
    const per = STAY + MOVE,
      nS = floH.sites.length,
      tt = (((c.t + floH.off) % (per * nS)) + per * nS) % (per * nS),
      k = Math.floor(tt / per),
      since = tt - k * per - STAY; // 離れてからの秒数（負なら着いている）
    const fade = since > 0 ? Math.max(0, 1 - since / MOVE) : 0;
    petals.visible = fade > 0.01 && !isFar;
    if (!petals.visible) return;
    const q = floH.sites[k],
      P3 = FLOWERS[c.month],
      cc = new THREE.Color(),
      wy = water.position.y;
    for (let i = 0; i < NPET; i++) {
      const [a, r, h] = petSeed[i],
        drift = since * 0.02;
      const x = q.x * S + Math.cos(a) * r * 14 + Math.cos(q.a + 0.6) * drift + Math.sin(t * 0.2 + a) * 0.3,
        z = q.y * S + Math.sin(a) * r * 14 + Math.sin(q.a + 0.6) * drift + Math.cos(t * 0.17 + a) * 0.3;
      petPos.set([x, wy + 0.05, z], i * 3);
      const k2 = fade * (0.6 + 0.4 * Math.min(1, c.phase > 0.3 && c.phase < 0.75 ? 1 : 0.4));
      cc.setHex(P3[Math.floor(h * 3)]).lerp(new THREE.Color(1, 1, 1), 0.35).multiplyScalar(k2);
      petCol.set([cc.r, cc.g, cc.b], i * 3);
    }
    petG.attributes.position.needsUpdate = petG.attributes.color.needsUpdate = true;
  };
  Object.assign(HALL, { floH, floUpdate });
}
