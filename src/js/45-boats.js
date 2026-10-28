/* ---------- 湖の舟：田舟、遠くの舟の航跡、遊覧船、シジミ漁の舟 ---------- */
G.boats = (() => {
  const R = rnd(9494);
  // 田舟：ヨシ原の水際に舫われた細長い木の小舟
  const tabune = [];
  if (LOOK.show.tabune) {
    const R = rndFor("tabune");
    const wd = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.95 }),
      g0 = new THREE.Group();
    const bot = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 5.2), wd);
    bot.position.y = 0.05;
    g0.add(bot);
    for (const sx of [-0.52, 0.52]) {
      const sd = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 5.2), wd);
      sd.position.set(sx, 0.2, 0);
      g0.add(sd);
    }
    const bow = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 0.08), wd);
    bow.position.set(0, 0.22, -2.6);
    bow.rotation.x = -0.5;
    g0.add(bow);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4.5, 4), new THREE.MeshStandardMaterial({ color: 0x8a8a5a }));
    pole.position.set(0.2, 0.32, 0);
    pole.rotation.x = Math.PI / 2;
    g0.add(pole);
    reedPts.forEach(([x, y], i) => {
      if (i % 97 !== 11 || tabune.length > 40) return;
      for (let k = 0; k < 6; k++) {
        const a = R() * 6.28,
          xx = x + Math.cos(a) * 25,
          yy = y + Math.sin(a) * 25,
          dp = depth(xx, yy);
        if (inLake(xx, yy) && dp > 0.1 && dp < 1.5) {
          const g = g0.clone();
          g.position.set(xx * S, -0.12, yy * S);
          g.rotation.y = a + 1.57 + (R() - 0.5) * 0.6;
          g.userData.ph = R() * 6.28;
          scene.add(g);
          tabune.push(g);
          break;
        }
      }
    });
  }
  // 遠くの舟の航跡：静かな湖面に細く長く残るV字の筋
  const wakes = (LOOK.show.wakes && G.ambience ? G.ambience.boats : []).map((b) => {
    const N = 60,
      pos = new Float32Array(N * 3 * 2 * 3),
      col = new Float32Array(N * 3 * 2 * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const idx = [];
    for (let r = 0; r < 3; r++)
      for (let i = 0; i < N - 1; i++) {
        const o = (r * N + i) * 2;
        idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2);
      }
    geo.setIndex(idx);
    const m = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    );
    m.frustumCulled = false;
    m.visible = false;
    scene.add(m);
    return { b, m, N, hist: [], acc: 0 };
  });
  // 遊覧船：白い大きな船が、遠くをゆっくり横切る
  const ship = (() => {
    const g = new THREE.Group(),
      wh = new THREE.MeshStandardMaterial({ color: 0xf4f2ec, roughness: 0.55 }),
      bl = new THREE.MeshStandardMaterial({ color: 0x24406a, roughness: 0.6 }),
      rd = new THREE.MeshStandardMaterial({ color: 0xa83a2a, roughness: 0.6 }),
      gl = new THREE.MeshStandardMaterial({ color: 0x27323c, roughness: 0.15, metalness: 0.3 }),
      rl = new THREE.MeshStandardMaterial({ color: 0xdedcd4, roughness: 0.6 });
    // 平面形：舳先は細く尖り、船尾は丸い（x が船首方向）
    const plan = (L, B, bowK = 0.42, sternR = 0.5) => {
      const sh = new THREE.Shape(),
        hb = B / 2,
        xb = L / 2 - L * bowK,
        xs = -L / 2 + hb * sternR;
      sh.moveTo(xs, -hb);
      sh.lineTo(xb, -hb);
      sh.bezierCurveTo(xb + L * bowK * 0.55, -hb, L / 2 - L * 0.03, -hb * 0.35, L / 2, 0);
      sh.bezierCurveTo(L / 2 - L * 0.03, hb * 0.35, xb + L * bowK * 0.55, hb, xb, hb);
      sh.lineTo(xs, hb);
      sh.bezierCurveTo(xs - hb * sternR * 0.9, hb, -L / 2, hb * 0.6, -L / 2, 0);
      sh.bezierCurveTo(-L / 2, -hb * 0.6, xs - hb * sternR * 0.9, -hb, xs, -hb);
      return sh;
    };
    const slab = (L, B, h, m, y, x = 0, bowK, sternR, bevel = 0.25) => {
      const geo = new THREE.ExtrudeGeometry(plan(L, B, bowK, sternR), {
        depth: h,
        bevelEnabled: bevel > 0,
        bevelSize: bevel,
        bevelThickness: bevel,
        bevelSegments: 3,
        curveSegments: 16,
      }).rotateX(-Math.PI / 2);
      const o = new THREE.Mesh(geo, m);
      o.position.set(x, y, 0);
      o.castShadow = true;
      g.add(o);
      return o;
    };
    // 船体：喫水線から上へ広がるように、少しずつ大きい層を重ねる
    slab(32, 6.6, 0.6, bl, -0.2, 0, 0.42, 0.6, 0.2);
    slab(33, 7.4, 1.2, wh, 0.4, 0, 0.42, 0.6, 0.3);
    slab(33.6, 7.9, 1.4, wh, 1.6, 0, 0.42, 0.6, 0.3);
    slab(33.8, 8.0, 0.25, rd, 2.95, 0, 0.42, 0.6, 0.05);
    // 甲板の手すり
    slab(33.4, 7.7, 0.08, rl, 3.9, 0, 0.42, 0.6, 0);
    // 1層目の客室：連続窓
    slab(24, 6.6, 0.5, wh, 3.2, -2.5, 0.25, 0.9, 0.15);
    slab(24.2, 6.8, 1.1, gl, 3.75, -2.5, 0.25, 0.9, 0.08);
    slab(24, 6.6, 0.45, wh, 4.85, -2.5, 0.25, 0.9, 0.15);
    // 2層目
    slab(17, 5.8, 0.4, wh, 5.4, -3.5, 0.22, 0.9, 0.12);
    slab(17.2, 6.0, 1.0, gl, 5.85, -3.5, 0.22, 0.9, 0.06);
    slab(17, 5.8, 0.4, wh, 6.85, -3.5, 0.22, 0.9, 0.12);
    slab(16.6, 5.6, 0.06, rl, 7.9, -3.5, 0.22, 0.9, 0);
    // 操舵室
    slab(5.5, 4.4, 0.9, gl, 7.35, 1.2, 0.3, 0.9, 0.06);
    slab(5.6, 4.6, 0.3, wh, 8.25, 1.2, 0.3, 0.9, 0.1);
    // 煙突：少し後ろへ傾いた楕円
    const fun = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.95, 3.2, 16), rd);
    fun.scale.set(1.4, 1, 0.9);
    fun.position.set(-6.5, 9.2, 0);
    fun.rotation.z = 0.12;
    g.add(fun);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.4, 16), bl);
    cap.scale.set(1.4, 1, 0.9);
    cap.position.set(-6.7, 10.9, 0);
    cap.rotation.z = 0.12;
    g.add(cap);
    // マスト
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 4, 6), rl);
    mast.position.set(2.2, 10.3, 0);
    g.add(mast);
    g.visible = false;
    scene.add(g);
    return { g, on: false, x: 0, z: 0, dx: 0, dz: 0, life: 0 };
  })();
  // シジミ漁の舟：瀬田川の近くの浅い水面で、長い柄の道具を操る
  const shijimi = [];
  if (LOOK.show.shijimi) {
    const R = rndFor("shijimi");
    const wd = new THREE.MeshLambertMaterial({ color: 0x4e4436 }),
      mn = new THREE.MeshLambertMaterial({ color: 0x2c2e34 }),
      ht = new THREE.MeshLambertMaterial({ color: 0xd6d0c0 }),
      g0 = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 5.5), wd);
    hull.position.y = 0.15;
    g0.add(hull);
    const man = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 1.15, 6), mn);
    man.position.set(0, 0.95, 1.2);
    g0.add(man);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.22, 8), ht);
    hat.position.set(0, 1.65, 1.2);
    g0.add(hat);
    // 長い柄の鋤簾（じょれん）：水中へ斜めに差し込む
    const arm = new THREE.Group();
    arm.position.set(0, 1.2, 1.2);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 7, 4).translate(0, -3.5, 0), new THREE.MeshLambertMaterial({ color: 0x9a8a62 }));
    arm.add(pole);
    arm.rotation.x = 0.9;
    g0.add(arm);
    const [sx, sy] = ll(135.906, 35.003);
    for (let n = 0; n < 400 && shijimi.length < 5; n++) {
      const x = sx + (R() - 0.5) * 3000,
        y = sy + (R() - 0.5) * 3000,
        dp = depth(x, y);
      if (inLake(x, y) && dp > 0.8 && dp < 4 && shijimi.every((b) => Math.hypot(b.position.x - x * S, b.position.z - y * S) > 60)) {
        const g = g0.clone();
        g.position.set(x * S, -0.1, y * S);
        g.rotation.y = R() * 6.28;
        g.userData.arm = g.children[3];
        g.userData.ph = R() * 6.28;
        scene.add(g);
        shijimi.push(g);
      }
    }
  }
  function update(dt, t, c, day, wxNow) {
    const cx = camera.position.x,
      cz = camera.position.z;
    for (const g of tabune) {
      g.position.y = -0.12 + Math.sin(t * 0.8 + g.userData.ph) * 0.03;
      g.rotation.z = Math.sin(t * 0.6 + g.userData.ph) * 0.02;
    }
    for (const w of wakes) {
      const b = w.b;
      if (!b.on) {
        w.m.visible = false;
        w.hist.length = 0;
        continue;
      }
      w.acc += dt;
      if (w.acc > 0.5 || !w.hist.length) {
        w.acc = 0;
        w.hist.unshift([b.g.position.x, b.g.position.z]);
        if (w.hist.length > w.N) w.hist.pop();
      }
      const H = [[b.g.position.x, b.g.position.z], ...w.hist].slice(0, w.N),
        n = H.length;
      if (n < 3) continue;
      w.m.visible = true;
      const P = w.m.geometry.attributes.position.array,
        C = w.m.geometry.attributes.color.array,
        calm = waterU.uCalm.value,
        yy = 0.08;
      P.fill(0);
      C.fill(0);
      for (let r = 0; r < 3; r++)
        for (let i = 0; i < w.N; i++) {
          const j = Math.min(i, n - 1),
            j2 = Math.min(j + 1, n - 1),
            j0 = Math.max(j - 1, 0);
          let dx = H[j0][0] - H[j2][0],
            dz = H[j0][1] - H[j2][1];
          const L = Math.hypot(dx, dz) || 1;
          dx /= L;
          dz /= L;
          const nx = -dz,
            nz = dx,
            u = i / (w.N - 1),
            age = Math.hypot(H[j][0] - H[0][0], H[j][1] - H[0][1]);
          // r=0：中央の静かな筋　r=1,2：左右に開くV字の波
          const off = r === 0 ? 0 : (r === 1 ? 1 : -1) * (1 + age * 0.34),
            wd = r === 0 ? 0.8 + u * 4 : 0.35 + u * 0.8,
            a = (1 - u) * (i < n ? 1 : 0) * (r === 0 ? 0.1 : 0.2) * (0.4 + calm * 0.8) * Math.min(1, day * 3);
          const cx = H[j][0] + nx * off,
            cz = H[j][1] + nz * off;
          for (let e = 0; e < 2; e++) {
            const s = e ? 1 : -1,
              o = ((r * w.N + i) * 2 + e) * 3;
            P[o] = cx + nx * wd * s * 0.5;
            P[o + 1] = yy;
            P[o + 2] = cz + nz * wd * s * 0.5;
            C[o] = C[o + 1] = a;
            C[o + 2] = a * 1.05;
          }
        }
      w.m.geometry.attributes.position.needsUpdate = true;
      w.m.geometry.attributes.color.needsUpdate = true;
    }
    {
      const cx = camera.position.x,
        cz = camera.position.z;
      if (!ship.on && LOOK.show.ship && day > 0.25 && wxNow.rain < 0.3 && Math.random() < dt / 90) {
        for (let k = 0; k < 15; k++) {
          const a = Math.random() * 6.28,
            d = 700 + Math.random() * 700,
            x = cx + Math.cos(a) * d,
            z = cz + Math.sin(a) * d;
          if (inMain(x / S, z / S) && depth(x / S, z / S) > 5) {
            const h = a + (Math.random() < 0.5 ? 1.57 : -1.57);
            Object.assign(ship, { on: true, x, z, dx: Math.cos(h), dz: Math.sin(h), life: 400 });
            ship.g.visible = true;
            break;
          }
        }
      }
      if (ship.on) {
        ship.life -= dt;
        ship.x += ship.dx * 3.5 * dt;
        ship.z += ship.dz * 3.5 * dt;
        const gone = ship.life <= 0 || day < 0.1 || !inMain(ship.x / S, ship.z / S) || depth(ship.x / S, ship.z / S) < 3 || Math.hypot(ship.x - cx, ship.z - cz) > 2200;
        if (gone) {
          ship.on = false;
          ship.g.visible = false;
        } else {
          ship.g.position.set(ship.x, waveH(ship.x, ship.z, t) * 0.3 - 0.2, ship.z);
          ship.g.rotation.set(0, -Math.atan2(ship.dz, ship.dx), Math.sin(t * 0.5) * 0.008);
        }
      }
    }
    for (const g of shijimi) {
      const k = t * 0.5 + g.userData.ph;
      g.userData.arm.rotation.x = 0.85 + Math.sin(k) * 0.18;
      g.userData.arm.rotation.z = Math.sin(k * 0.5) * 0.15;
      g.position.y = -0.1 + Math.sin(t * 0.9 + g.userData.ph) * 0.03;
      g.visible = day > 0.15;
    }
  }
  return { update, tabune, ship };
})();
