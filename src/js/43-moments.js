/* ---------- 湖の詩情：湖岸の一本の木、水に浮かぶ花びらと落ち葉、刈ったヨシの束、夕方の鐘 ---------- */
G.moments = (() => {
  const R = rnd(4040);
  // 一本の木：湖岸の突き出た所に、枝を広げた木を一本ずつ（全体で約14本）
  const lone = [];
  for (let i = 2; i < outer.length - 2 && lone.length < 14; i += 7) {
    const [x0, y0] = outer[i - 2],
      [x1, y1] = outer[i],
      [x2, y2] = outer[i + 2];
    const turn = (x1 - x0) * (y2 - y1) - (y1 - y0) * (x2 - x1);
    if (Math.abs(turn) < 3e4 || R() < 0.55) continue;
    const mx = (x0 + x2) / 2,
      my = (y0 + y2) / 2,
      dx = x1 - mx,
      dy = y1 - my,
      L = Math.hypot(dx, dy) || 1,
      x = x1 - (dx / L) * 18,
      y = y1 - (dy / L) * 18;
    if (inLake(x, y) || lone.some((p) => Math.hypot(p[0] - x, p[1] - y) < 2500)) continue;
    lone.push([x, y, landY(x, y), 1.5 + R() * 0.5, R()]);
  }
  if (lone.length) cardForest("broad", lone, 13, 12, 10, 6000, QUALITY.treeShadow);

  // 水に浮かぶ花びら（4月）と落ち葉（11月）：自分のまわりの水面をゆっくり流れる
  const NP = 500,
    pos = new Float32Array(NP * 3),
    col = new Float32Array(NP * 3),
    geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  // 葉・花びらの形：水面に平たく寝た小さな面。光を受けるので、夜は暗い湖面に溶け込む
  const leafG = (() => {
    const sh = new THREE.Shape();
    sh.moveTo(0, -0.5);
    sh.quadraticCurveTo(0.42, -0.1, 0, 0.5);
    sh.quadraticCurveTo(-0.42, -0.1, 0, -0.5);
    return new THREE.ShapeGeometry(sh, 4).rotateX(-Math.PI / 2);
  })();
  const pts = new THREE.InstancedMesh(leafG, new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }), NP);
  const lM = new THREE.Matrix4(),
    lQ = new THREE.Quaternion(),
    lE = new THREE.Euler(),
    lV = new THREE.Vector3(),
    lS = new THREE.Vector3(),
    lC = new THREE.Color(),
    lRot = Float32Array.from({ length: NP }, () => Math.random() * 6.28),
    lSz = Float32Array.from({ length: NP }, () => 0.25 + Math.random() * 0.25);
  pts.frustumCulled = false;
  pts.visible = false;
  scene.add(pts);
  let kindNow = -1;
  const seed = () => {
    const cx = camera.position.x,
      cz = camera.position.z;
    for (let i = 0; i < NP; i++) {
      const a = Math.random() * 6.28,
        r = Math.sqrt(Math.random()) * 140;
      pos[i * 3] = cx + Math.cos(a) * r;
      pos[i * 3 + 2] = cz + Math.sin(a) * r;
      const c = kindNow === 3 ? [1, 0.78 + Math.random() * 0.12, 0.84 + Math.random() * 0.1] : [0.75 + Math.random() * 0.2, 0.32 + Math.random() * 0.3, 0.1];
      col.set(c, i * 3);
      pts.setColorAt(i, lC.setRGB(c[0] * 0.8, c[1] * 0.8, c[2] * 0.8));
    }
    pts.instanceColor.needsUpdate = true;
  };

  // 刈ったヨシの束（12〜2月）：ヨシ原のそばの岸に立てかける
  const bundles = reedPts.filter((p, i) => i % 23 === 0 && [40, 45, 50].every((d) => !inLake(p[0] + d, p[1] - 3) && !inLake(p[0] + d, p[1] + 3))).slice(0, 220);
  const bI = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.9, 3.2, 7, 1, true).translate(0, 1.6, 0),
    new THREE.MeshLambertMaterial({ color: 0xc9a86a, side: THREE.DoubleSide }),
    Math.max(1, bundles.length * 3),
  );
  {
    const M = new THREE.Matrix4(),
      Qq = new THREE.Quaternion(),
      E = new THREE.Euler(),
      V = new THREE.Vector3(),
      Sc = new THREE.Vector3();
    bundles.forEach(([x, y], i) => {
      for (let k = 0; k < 3; k++) {
        const xx = x + 40 + k * 5,
          yy = y + (R() - 0.5) * 6;
        Qq.setFromEuler(E.set((R() - 0.5) * 0.25, R() * 6, (R() - 0.5) * 0.25));
        M.compose(V.set(xx * S, landY(xx, yy), yy * S), Qq, Sc.set(1, 0.9 + R() * 0.3, 1));
        bI.setMatrixAt(i * 3 + k, M);
      }
    });
  }
  bI.visible = false;
  scene.add(bI);

  // 夕方の鐘：一日に一度、日暮れのころ湖岸の寺から遠く響く
  let lastBell = -1;
  function bell() {
    if (!SND.ctx || !SND.on) return;
    const ac = SND.ctx,
      t0 = ac.currentTime;
    for (let n = 0; n < 3; n++) {
      const st = t0 + n * 9;
      for (const [f, a, d] of [
        [98, 0.05, 9],
        [196.5, 0.03, 7],
        [271, 0.018, 5],
        [530, 0.008, 3],
      ]) {
        const o = ac.createOscillator(),
          g = ac.createGain(),
          lp = ac.createBiquadFilter();
        o.type = "sine";
        o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.004);
        lp.type = "lowpass";
        lp.frequency.value = 900;
        g.gain.setValueAtTime(0, st);
        g.gain.linearRampToValueAtTime(a, st + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0003, st + d);
        o.connect(lp).connect(g);
        g.connect(SND.master);
        g.connect(SND.rev);
        o.start(st);
        o.stop(st + d + 0.1);
      }
    }
  }

  function update(dt, t, c, W) {
    const kind = c.month === LOOK.months.petals ? 3 : c.month === LOOK.months.leaves ? 10 : -1;
    // 雪の日は出さない
    pts.visible = LOOK.show.floatingLeaves && kind >= 0 && !isFar && !(G.wxNow && G.wxNow.snow > 0.05);
    if (kind >= 0) {
      if (kind !== kindNow || Math.hypot(pos[0] - camera.position.x, pos[2] - camera.position.z) > 260) {
        kindNow = kind;
        seed();
      }
      for (let i = 0; i < NP; i++) {
        const x = (pos[i * 3] += W.x * dt * 0.06 + Math.sin(t * 0.3 + i) * dt * 0.05),
          z = (pos[i * 3 + 2] += W.y * dt * 0.06 + Math.cos(t * 0.27 + i) * dt * 0.05);
        const y = (pos[i * 3 + 1] = inLake(x / S, z / S) ? waveH(x, z, t) + 0.04 : -50);
        lE.set(Math.sin(t * 0.9 + i) * 0.08, lRot[i] + Math.sin(t * 0.1 + i) * 0.3, Math.cos(t * 0.8 + i) * 0.08);
        const s = lSz[i] * (kindNow === 3 ? 0.7 : 1);
        lM.compose(lV.set(x, y, z), lQ.setFromEuler(lE), lS.set(s, s, s * (kindNow === 3 ? 0.8 : 1.3)));
        pts.setMatrixAt(i, lM);
      }
      pts.instanceMatrix.needsUpdate = true;
    }
    bI.visible = c.month === 11 || c.month <= 1;
    const dayNo = Math.floor(c.t / DAY);
    if (c.phase > 0.735 && c.phase < 0.75 && dayNo !== lastBell && !isFar) {
      lastBell = dayNo;
      bell();
    }
  }
  return { update, lone };
})();
