/* ---------- 南湖のバスボート：琵琶湖大橋より南の浅い湖で、低く平たい小さなボートが速く走っては止まり、しばらく漂ってまた走る。
   走るときは舳先が少し持ち上がり、船尾から白いしぶきが立ち、後ろに白い航跡が残る（45-boats.js の航跡と同じもの）。
   人は描かない。昼間だけ、自分のまわり（約1.5kmまで）に数そう。冬は少ない ---------- */
G.bass = (() => {
  const YS = ll(135.93, 35.104)[1], // 琵琶湖大橋のあたり：これより南（y が大きい）が南湖
    inSouth = (x, y) => y > YS && inMain(x, y),
    okSpot = (x, y) => {
      const d = depth(x, y);
      return inSouth(x, y) && d > 1.5 && d < 7;
    };
  // 船体の平面形：舳先が尖り、船尾は四角い（x が船首方向）
  const plan = (L, B) => {
    const s = new THREE.Shape(),
      h = B / 2;
    s.moveTo(-L / 2, -h);
    s.lineTo(L * 0.1, -h);
    s.quadraticCurveTo(L * 0.4, -h * 0.95, L / 2, 0);
    s.quadraticCurveTo(L * 0.4, h * 0.95, L * 0.1, h);
    s.lineTo(-L / 2, h);
    s.closePath();
    return s;
  };
  const slab = (L, B, d, bev) =>
    new THREE.ExtrudeGeometry(plan(L, B), { depth: d, bevelEnabled: bev > 0, bevelSize: bev, bevelThickness: bev, bevelSegments: 2, curveSegments: 10 }).rotateX(-Math.PI / 2);
  // ラメの入った船体の色
  const FLAKE = [0xd0303a, 0x2a5ac8, 0x30343a, 0x3f8a4a, 0xa8389e, 0xd8dadc],
    deckM = new THREE.MeshStandardMaterial({ color: 0x55595f, roughness: 0.95 }),
    blackM = new THREE.MeshStandardMaterial({ color: 0x16181b, roughness: 0.4, metalness: 0.3 }),
    glassM = new THREE.MeshStandardMaterial({ color: 0x3a4650, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.6 }),
    whiteM = new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.5 });
  const sprayTx = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d");
    for (let i = 0; i < 90; i++) {
      const r = 2 + Math.random() * 7,
        px = 32 + (Math.random() - 0.5) * 52,
        py = 64 - Math.random() ** 0.7 * 60,
        gr = x.createRadialGradient(px, py, 0, px, py, r);
      gr.addColorStop(0, "rgba(255,255,255,.8)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = gr;
      x.fillRect(px - r, py - r, r * 2, r * 2);
    }
    return new THREE.CanvasTexture(c);
  })();
  const mkBoat = (i) => {
    const g = new THREE.Group(),
      body = new THREE.Group(), // 走るとき舳先を持ち上げる部分
      hullM = new THREE.MeshStandardMaterial({ color: FLAKE[i % FLAKE.length], roughness: 0.3, metalness: 0.15 }),
      L = 6.2,
      B = 2.3;
    hullM.emissive.set(FLAKE[i % FLAKE.length]).multiplyScalar(0.12);
    const add = (geo, m, x, y, z, p = body) => {
      const o = new THREE.Mesh(geo, m);
      o.position.set(x, y, z);
      p.add(o);
      return o;
    };
    add(slab(L, B * 0.86, 0.35, 0.08), hullM, 0, -0.25, 0); // 水に入る部分は少し細い
    add(slab(L, B, 0.42, 0.06), hullM, 0, 0.1, 0);
    add(slab(L * 0.96, B * 0.9, 0.06, 0), deckM, -0.05, 0.6, 0); // 平らな甲板（灰色の敷物）
    add(new THREE.BoxGeometry(L * 0.5, 0.04, 0.06), whiteM, -0.4, 0.62, B * 0.43); // 縁の白い線
    add(new THREE.BoxGeometry(L * 0.5, 0.04, 0.06), whiteM, -0.4, 0.62, -B * 0.43);
    add(new THREE.BoxGeometry(0.55, 0.55, 0.5), hullM, -0.6, 0.9, 0.55); // 操縦台
    const ws = add(new THREE.BoxGeometry(0.06, 0.35, 0.55), glassM, -0.32, 1.32, 0.55);
    ws.rotation.z = 0.5;
    add(new THREE.BoxGeometry(0.55, 0.4, 0.5), hullM, -0.6, 0.85, -0.55);
    add(new THREE.BoxGeometry(0.9, 0.35, 1.4), deckM, -1.9, 0.8, 0); // 後ろの座席
    // 船外機：船尾の大きな黒いエンジン
    const eng = add(new THREE.BoxGeometry(0.6, 0.85, 0.55), blackM, -L / 2 - 0.25, 1.0, 0);
    eng.rotation.z = -0.12;
    add(new THREE.BoxGeometry(0.18, 1.1, 0.12), blackM, -L / 2 - 0.22, 0.1, 0);
    add(new THREE.BoxGeometry(0.3, 0.06, 0.35), whiteM, -L / 2 - 0.25, 1.42, 0);
    // 舳先の小さなモーター（エレキ）の柄
    add(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5), blackM, L / 2 - 0.4, 0.95, 0.25);
    mergeStatic(body);
    g.add(body);
    // 船尾のしぶき：縦に交差する2枚の板。走る速さに応じて見える
    const spM = new THREE.MeshBasicMaterial({ map: sprayTx, transparent: true, depthWrite: false, opacity: 0, color: 0xf4f8fa }),
      spray = new THREE.Group();
    for (const r of [0, Math.PI / 2]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), spM);
      p.rotation.y = r;
      spray.add(p);
    }
    spray.position.set(-L / 2 - 1.8, 0, 0);
    g.add(spray);
    g.visible = false;
    scene.add(g);
    return { g, body, spray, spM, on: false, st: "fish", x: 0, z: 0, hd: 0, v: 0, tx: 0, tz: 0, wait: 0, spin: 0 };
  };
  for (const m of [deckM, whiteM]) m.emissive.copy(m.color).multiplyScalar(0.15); // 日の当たらない側も暗くなりすぎないように
  const boats = [0, 1, 2, 3].map(mkBoat);
  // 次に走って行く先：今の所から300〜1200先の、南湖の浅い所。途中に岸や浅瀬がないこと
  function pickTarget(b) {
    for (let k = 0; k < 24; k++) {
      const a = b.hd + (Math.random() - 0.5) * 2.4,
        d = 300 + Math.random() * 900,
        x = b.x + Math.cos(a) * d,
        z = b.z + Math.sin(a) * d;
      if (!okSpot(x / S, z / S)) continue;
      let ok = true;
      for (let u = 0.1; u < 1 && ok; u += 0.1) if (depth((b.x + (x - b.x) * u) / S, (b.z + (z - b.z) * u) / S) < 1.2) ok = false;
      if (ok) return [x, z];
    }
    return null;
  }
  function update(dt, t, c, day) {
    const cp = camera.position,
      want = isFar || day < 0.2 ? 0 : c.month === 11 || c.month <= 1 ? 1 : 4;
    boats.forEach((b, i) => {
      if (!b.on) {
        if (i >= want || Math.random() > dt * 0.08) return;
        for (let k = 0; k < 20; k++) {
          const a = Math.random() * 6.28,
            d = 250 + Math.random() * 700,
            x = cp.x + Math.cos(a) * d,
            z = cp.z + Math.sin(a) * d;
          if (okSpot(x / S, z / S)) {
            Object.assign(b, { on: true, x, z, hd: Math.random() * 6.28, v: 0, st: "fish", wait: 5 + Math.random() * 30, spin: (Math.random() - 0.5) * 0.06 });
            b.g.visible = true;
            break;
          }
        }
        return;
      }
      if (i >= want || Math.hypot(b.x - cp.x, b.z - cp.z) > 1600) {
        b.on = false;
        b.g.visible = false;
        return;
      }
      if (b.st === "fish") {
        // 釣りの間：ほとんど止まって、ゆっくり向きを変えながら漂う
        b.v = Math.max(0, b.v - dt * 3);
        b.hd += b.spin * dt;
        b.wait -= dt;
        if (b.wait < 0) {
          const tg = pickTarget(b);
          if (tg) [b.tx, b.tz, b.st] = [tg[0], tg[1], "run"];
          else b.wait = 10;
        }
      } else {
        // 走る：向きを行き先へ回しながら速さを上げ、近づいたら落とす
        const dx = b.tx - b.x,
          dz = b.tz - b.z,
          d = Math.hypot(dx, dz);
        let da = Math.atan2(dz, dx) - b.hd;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        b.hd += Math.max(-0.6 * dt, Math.min(0.6 * dt, da));
        const vt = d < 60 ? 1.5 : 12;
        b.v += Math.max(-4 * dt, Math.min(2.5 * dt, vt - b.v));
        if (d < 12 || depth((b.x + Math.cos(b.hd) * 20) / S, (b.z + Math.sin(b.hd) * 20) / S) < 1) {
          b.st = "fish";
          b.wait = 20 + Math.random() * 45;
          b.spin = (Math.random() - 0.5) * 0.06;
        }
      }
      b.x += Math.cos(b.hd) * b.v * dt;
      b.z += Math.sin(b.hd) * b.v * dt;
      const sp = Math.min(1, b.v / 12),
        plane = Math.min(1, Math.max(0, (b.v - 2) / 4)) * (1 - sp * 0.5); // 走りはじめに舳先が最も持ち上がる
      b.g.position.set(b.x, waveH(b.x, b.z, t) * (1 - sp * 0.7) * 0.8 + sp * 0.12, b.z);
      b.g.rotation.set(0, -b.hd, 0);
      b.body.rotation.set(Math.sin(t * 1.5 + i) * 0.03 * (1 - sp), 0, 0.03 + plane * 0.1 + Math.sin(t * 7 + i) * 0.01 * sp);
      b.spM.opacity = sp * 0.85;
      b.spray.visible = sp > 0.05;
      b.spray.scale.set(2.5 + sp * 3, 0.8 + sp * 2.4 + Math.sin(t * 20 + i) * 0.15, 1);
    });
  }
  return { update, boats };
})();
