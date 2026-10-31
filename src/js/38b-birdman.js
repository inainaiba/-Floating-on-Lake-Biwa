/* ---------- 鳥人間コンテスト（7月・彦根の松原の湖岸）：湖へ突き出た高さ約10mの発進台と、そこから飛び立つ人力の飛行機。
   人は描かない（操縦席はふさいだ形）。飛ぶ時刻と機体は共有時計から決まる（見る人みな同じ）。
   ・滑空機：短く滑空して着水する／プロペラ機：プロペラを回して湖の上を長く飛び、ゆっくり下りて着水する
   ・着水した所に白い輪が広がり、機体はしばらく浮かんでから消える ---------- */
G.birdman = (() => {
  const MONTH = 6, // 7月
    P0 = 0.34, // 一日の中で飛びはじめる時刻と終わる時刻
    P1 = 0.7,
    SLOT = 0.03; // 一機ごとの間（一日の割合。共有時計で約40秒）
  // 発進台の場所：松原の湖岸。いちばん深くなる向きへ突き出す
  const [sx, sy] = shoreSnap(...ll(136.2466, 35.2885));
  let ang = 0,
    best = -1;
  for (let t = 0; t < Math.PI * 2; t += 0.05) {
    const d = depth(sx + Math.cos(t) * 300, sy + Math.sin(t) * 300);
    if (d > best) (best = d), (ang = t);
  }
  const ux = Math.cos(ang),
    uz = Math.sin(ang),
    L = 30, // 台の長さ（作品の中の長さ）
    H = 10, // 台の高さ
    g = new THREE.Group();
  const M = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o }),
    steel = M(0x8a8f94),
    deck = M(0xeeeeea),
    red = M(0xc8402e),
    blue = M(0x2c5aa0),
    box = (w, h, d, m, x, y, z, rx = 0) => {
      const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      o.position.set(x, y, z);
      o.rotation.x = rx;
      g.add(o);
      return o;
    };
  // 台の向き：ローカルの +x が湖の側。後ろの端は浜に、前の端は水の上に出る
  box(L, 0.6, 8, deck, 0, H, 0);
  box(L, 1.4, 0.2, red, 0, H + 1, 4); // 手すりの幕（赤と青）
  box(L, 1.4, 0.2, blue, 0, H + 1, -4);
  box(6, 0.6, 8, deck, L / 2 + 2.4, H - 0.4, 0).rotation.z = -0.12; // 先の少し下がった踏み切り
  for (let i = 0; i <= 5; i++)
    for (const z of [-3.6, 3.6]) {
      const x = -L / 2 + (i / 5) * L;
      box(0.35, H, 0.35, steel, x, H / 2, z); // 足場の柱
      if (i < 5) box(L / 5, 0.2, 0.2, steel, x + L / 10, H * 0.5, z); // 横の材
    }
  for (let i = 0; i < 5; i++) box(0.2, 0.2, 7.2, steel, -L / 2 + (i + 0.5) * (L / 5), H * 0.5, 0);
  // 浜から台へ上がる斜めの通路
  box(12, 0.4, 2.2, deck, -L / 2 - 5, H / 2, 0).rotation.z = 0.7;
  const cx = sx * S,
    cz = sy * S;
  g.position.set(cx, Math.max(0, landY(sx, sy) - 1), cz);
  g.rotation.y = -ang;
  g.visible = false;
  scene.add(g);
  placeLog("鳥人間コンテストの発進台", "shore", [[sx, sy]]);
  const tipX = cx + ux * (L / 2 + 5),
    tipZ = cz + uz * (L / 2 + 5),
    tipY = g.position.y + H + 0.8;

  // ---- 機体：細長い主翼（半透明の白）、細い胴体の骨組み、ふさいだ操縦席、尾翼。プロペラ機は機首にプロペラ ----
  const wingM = M(0xf4f6f8, { transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
    frameM = M(0x3a3d42),
    podMs = [M(0xd8473a), M(0x2f6fb4), M(0xe8c43a), M(0x3f9a5a), M(0xf0f0f0)],
    plane = new THREE.Group(),
    pod = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), podMs[0]);
  const part = (geo, m, x, y, z) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    plane.add(o);
    return o;
  };
  // 機首が +x、翼は z の向きに長い
  const wing = part(new THREE.BoxGeometry(1.6, 0.12, 30), wingM, 0.6, 1.4, 0);
  part(new THREE.BoxGeometry(9, 0.18, 0.18), frameM, -2, 1.2, 0); // 胴体の骨組み
  pod.scale.set(1.8, 0.9, 0.8);
  pod.position.set(1.6, 0.6, 0);
  plane.add(pod);
  part(new THREE.BoxGeometry(1.2, 0.08, 6), wingM, -6.2, 1.3, 0); // 水平尾翼
  part(new THREE.BoxGeometry(1.2, 2, 0.08), wingM, -6.2, 2.2, 0); // 垂直尾翼
  const prop = new THREE.Group();
  for (const s of [-1, 1]) {
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.6, 0.25), frameM);
    bl.position.y = s * 0.8;
    prop.add(bl);
  }
  prop.position.set(3.6, 0.8, 0);
  plane.add(prop);
  plane.visible = false;
  scene.add(plane);
  // 着水の白い輪
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.8, 1, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xf4f8f8, transparent: true, opacity: 0, depthWrite: false }),
  );
  ring.visible = false;
  scene.add(ring);

  // 一機ごとの機体と飛び方（日と順番で決まる）
  function flight(day, k) {
    const R = rndFor("birdman:" + day + ":" + k);
    R();
    const propel = R() < 0.45;
    return {
      propel,
      col: Math.floor(R() * podMs.length),
      turn: (R() - 0.5) * (propel ? 0.5 : 0.15), // 少しずつ曲がる量
      v: propel ? 5 + R() * 1.5 : 8 + R() * 2, // 作品の中の長さ / 秒
      fly: propel ? 40 + R() * 45 : 6 + R() * 10, // 空にいる秒数
    };
  }
  function update(dt, t, c) {
    const on = c.month === MONTH;
    g.visible = on && !isFar;
    plane.visible = ring.visible = false;
    if (!on || isFar || c.phase < P0 || c.phase > P1) return;
    const k = Math.floor((c.phase - P0) / SLOT),
      tau = (c.phase - P0 - k * SLOT) * DAY, // この機が飛び立ってからの秒数
      f = flight(Math.floor(c.t / DAY), k),
      float = 8; // 着水してから浮かんでいる秒数
    if (tau > f.fly + float) return;
    const tt = Math.min(tau, f.fly),
      hd = ang + f.turn * (tt / f.fly),
      dist = f.v * tt,
      x = tipX + Math.cos(ang + f.turn * 0.5 * (tt / f.fly)) * dist,
      z = tipZ + Math.sin(ang + f.turn * 0.5 * (tt / f.fly)) * dist,
      u = tt / f.fly,
      // 高さ：滑空機は落ちるように、プロペラ機は台の高さを保ちながらゆっくり下りる
      y = f.propel ? tipY * (1 - u * u) + Math.sin(tt * 0.8) * 0.4 * (1 - u) : tipY * (1 - Math.pow(u, 1.6)),
      wy = water.position.y;
    pod.material = podMs[f.col];
    plane.visible = true;
    plane.position.set(x, Math.max(wy + 0.2, y), z);
    plane.rotation.set(tau > f.fly ? 0.05 : Math.sin(tt * 0.6) * 0.04, -hd, tau > f.fly ? 0 : -0.06 - (f.propel ? 0 : u * 0.25));
    prop.visible = f.propel;
    if (f.propel && tau < f.fly) prop.rotation.x += dt * 18;
    // 着水したら白い輪が広がる
    if (tau > f.fly) {
      const s = tau - f.fly;
      ring.visible = true;
      ring.position.set(x, wy + 0.06, z);
      ring.scale.setScalar(2 + s * 4);
      ring.material.opacity = Math.max(0, 0.6 * (1 - s / float));
      plane.position.y = wy - 0.4 + Math.sin(t * 1.3) * 0.08;
    }
  }
  return { update, g };
})();
