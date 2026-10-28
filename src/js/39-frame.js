function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  fpsN++;
  fpsT += dt;
  if (fpsT > 3) {
    const f = fpsN / fpsT;
    const old = resScale;
    if (f < 38) resScale = Math.max(0.5, resScale - 0.1);
    else if (f > 57) resScale = Math.min(QUALITY.resMax, resScale + 0.05);
    if (old !== resScale) resize();
    fpsN = 0;
    fpsT = 0;
  }
  const c = clock(),
    W = wind(c),
    t = now / 1000;
  // 舵（キーボード・スティック）を、カメラの向きに合わせて地図上の向きに直す
  {
    const tx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0),
      ty = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0),
      kk = 1 - Math.exp(-dt * 6);
    kIn.x += (tx - kIn.x) * kk;
    kIn.y += (ty - kIn.y) * kk;
  }
  let sx = steer.x + kIn.x,
    sy = steer.y + kIn.y;
  let gx = 0,
    gy = 0;
  if (B.goal) {
    const dx = B.goal[0] - B.x,
      dy = B.goal[1] - B.y,
      d = Math.hypot(dx, dy);
    if (d < 60) {
      B.vx *= 0.6;
      B.vy *= 0.6;
    }
    if (d < 60 || Math.abs(sx) + Math.abs(sy) > 0.1) B.goal = null;
    else {
      gx = (dx / d) * 0.3 * Math.min(1, d / 300);
      gy = (dy / d) * 0.3 * Math.min(1, d / 300);
    }
  }
  {
    const l = Math.hypot(sx, sy);
    if (l > 1) {
      sx /= l;
      sy /= l;
    }
  } // 4 斜め入力の正規化
  const fwdX = -Math.sin(yaw),
    fwdZ = -Math.cos(yaw),
    rgtX = Math.cos(yaw),
    rgtZ = -Math.sin(yaw);
  const boost = keys.Shift ? 1.8 : 1;
  const ruX = (rgtX * sx - fwdX * sy) * 0.38 * boost,
    ruY = (rgtZ * sx - fwdZ * sy) * 0.38 * boost;
  if (keys[" "] && B.vx !== undefined) {
    B.vx *= Math.exp(-dt * 3);
    B.vy *= Math.exp(-dt * 3);
  }
  let [vx, vy] = flow(B.x, B.y, c);
  vx -= W.x * 0.03;
  vy -= W.y * 0.03; // 湖流だけ
  const dr = 0.6 + 0.5 * BP.draft;
  vx = vx * dr + W.x * 0.03 * BP.wind;
  vy = vy * dr + W.y * 0.03 * BP.wind;
  const steering = Math.hypot(ruX, ruY) > 0.01 || !!B.goal;
  if (B.kick > 0) {
    B.kick -= dt;
    vx += B.kx;
    vy += B.ky;
  }
  vx += gx;
  vy += gy;
  if (STATE !== "lake") {
    vx = vy = 0;
  } else if (B.rest && !steering && !(B.kick > 0)) {
    vx = vy = 0;
  } else {
    const rb = B.rest ? 1.6 : 1;
    vx += ruX * BP.rudder * rb;
    vy += ruY * BP.rudder * rb;
  }
  {
    const vm = Math.hypot(vx, vy),
      cap = 0.7;
    if (vm > cap) {
      vx *= cap / vm;
      vy *= cap / vm;
    }
    const k = 1 - Math.exp(-dt * (steering ? 2.4 : 0.9));
    B.vx = (B.vx || 0) + (vx - (B.vx || 0)) * k;
    B.vy = (B.vy || 0) + (vy - (B.vy || 0)) * k;
    vx = B.vx;
    vy = B.vy;
  } // 慣性でなめらかに
  const nx = B.x + (vx * SPEED * dt) / S,
    ny = B.y + (vy * SPEED * dt) / S;
  const crossW = (G.harb || []).some(([a, b, c2, d]) => {
    const s = (x1, y1, x2, y2) => (x2 - x1) * (ny - y1) - (y2 - y1) * (nx - x1);
    const e = (x, y) => (c2 - a) * (y - b) - (d - b) * (x - a);
    return (
      e(B.x, B.y) * e(nx, ny) < 0 &&
      ((B.x - nx) * (b - ny) - (B.y - ny) * (a - nx)) * ((B.x - nx) * (d - ny) - (B.y - ny) * (c2 - nx)) < 0
    );
  });
  const blocked =
    crossW ||
    !inLake(nx, ny) ||
    depth(nx, ny) + LEVEL[c.month] / 100 < 0.3 ||
    (!BP.reeds && inReeds(nx, ny) && !inReeds(B.x, B.y)) ||
    (!BP.reeds && inInner(nx, ny) && !inMain(nx, ny));
  if (blocked && !crossW) {
    const tx = B.x + (vx * SPEED * dt) / S,
      ty = B.y;
    const ok1 = inLake(tx, ty) && depth(tx, ty) > 0.3,
      ok2 = inLake(B.x, B.y + (vy * SPEED * dt) / S) && depth(B.x, B.y + (vy * SPEED * dt) / S) > 0.3;
    if (ok1) {
      B.x = tx;
      B.vy *= 0.5;
    } else if (ok2) {
      B.y += (vy * SPEED * dt) / S;
      B.vx *= 0.5;
    }
  }
  if (Math.hypot(vx, vy) > 1e-4) {
    if (blocked) {
      if (!B.wasBlk && navigator.vibrate && joyId !== null)
        try {
          navigator.vibrate(12);
        } catch (e) {}
      B.wasBlk = 1;
      B.vx *= 0.3;
      B.vy *= 0.3;
      B.blk = (B.blk || 0) + dt;
      if (B.blk > 3) B.goal = null;
    } else {
      B.blk = 0;
      B.wasBlk = 0;
    }
    if (!blocked) {
      B.dist += Math.hypot(nx - B.x, ny - B.y);
      B.x = nx;
      B.y = ny;
      B.rest = false;
    } else {
      B.rest = true;
      B.kick = 0;
    }
  }
  restBtn.classList.toggle("on", STATE === "lake" && B.rest);
  const sp = Math.hypot(vx, vy);
  if (sp > 0.005 && !B.rest && (BP.align > 0.05 || steering)) {
    const tgt = Math.atan2(vy, vx);
    let d = tgt - B.yaw;
    if (BP.align > 0.6) d = Math.atan2(Math.sin(2 * d), Math.cos(2 * d)) / 2;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    B.yawV =
      (B.yawV || 0) + (d * (1.2 + Math.min(2, sp * 8)) * Math.max(0.3, BP.align) - (B.yawV || 0) * 2.2) * dt;
    B.yaw += B.yawV * dt;
  } else if (BP.align <= 0.05) B.yaw += dt * 0.01;
  const boats = boatState(c);
  trailT += dt;
  if (STATE === "lake" && trailT > 1.5) {
    trailT = 0;
    B.trail.push([B.x, B.y]);
    if (B.trail.length > 4000) B.trail.shift();
  }

  {
    let nr = 0;
    const cx = Math.floor(B.x / 120),
      cy = Math.floor(B.y / 120);
    for (let a = -3; a <= 3; a++)
      for (let b = -3; b <= 3; b++)
        if (reedMask.has(cx + a + "," + (cy + b))) nr = Math.max(nr, 1 - Math.hypot(a, b) / 4.3);
    audioUpdate(dt, c, W, boats, nr);
  }
  if (isFar) {
    drawFar(boats, W.wx, W);
    requestAnimationFrame(frame);
    return;
  }

  // 波・空・光
  setWaves(W);
  waves.forEach((v, i) => {
    waterU.uW.value[i].set(v.dx, v.dz, v.k, v.w);
    waterU.uA.value[i].set(v.A, v.Qs);
  });
  waterU.uT.value = t;
  const X_ = W.wx;
  const sa = (c.phase - 0.25) * 2 * Math.PI,
    day = Math.max(0, Math.sin(sa));
  const sElev = SEASON.sunHeight[c.month];
  const sd_ = new THREE.Vector3(
    Math.cos(sa) * 0.8,
    Math.sin(sa) * sElev,
    0.45 + 0.25 * (1 - sElev),
  ).normalize();
  const sky = skyAt(c.phase);
  {
    const g = new THREE.Color(
      sky.r * 0.3 + sky.g * 0.59 + sky.b * 0.11,
      sky.r * 0.3 + sky.g * 0.59 + sky.b * 0.11,
      sky.r * 0.3 + sky.g * 0.59 + sky.b * 0.11,
    );
    sky.lerp(g, X_.gray).multiplyScalar(1 - X_.dark * 0.5);
    if (X_.white)
      sky.lerp(new THREE.Color(0xdcdfe0).multiplyScalar(0.35 + 0.65 * Math.min(1, day * 3 + 0.2)), X_.white);
  }
  if (X_.storm > 0.5 && t > nextFlash && !isFar) {
    flash = 1;
    nextFlash = t + 6 + Math.random() * 14;
  }
  flash = Math.max(0, flash - dt * 1.2);
  const fl = Math.sin(Math.min(1, flash) * Math.PI) * 0.35;
  sky.lerp(new THREE.Color(0xd8dcf0), fl);
  {
    const top = sky
      .clone()
      .lerp(new THREE.Color(0x2f73c8), 0.6 * Math.min(1, day * 2) * (1 - X_.gray))
      .lerp(new THREE.Color(0x7d8fc0), 0.85 * (1 - Math.min(1, day * 2.5)));
    const hor = sky.clone().lerp(new THREE.Color(0xe9eef2), 0.5 * Math.min(1, day * 2) * (1 - X_.gray * 0.5));
    skyU.uTop.value.copy(top);
    skyU.uHor.value.copy(hor);
    skyU.uSunD.value.copy(sd_);
    skyU.uSunC2.value.copy(sun.color).multiplyScalar(day > 0 ? 1 : 0);
    skyU.uT.value = t;
    skyU.uCloud.value = 0.5 + X_.gray * 0.5;
    skyU.uCi.value = SEASON.cirrus[c.month] * (1 - X_.gray * 0.6);
    skyU.uRay.value =
      X_.gray > 0.3 && X_.gray < 0.8 && X_.rain < 0.3 ? Math.max(0, 1 - Math.abs(Math.sin(sa)) * 3) : 0;
    {
      const dn = Math.floor(c.t / DAY),
        hr = Math.abs(Math.sin(dn * 12.9898) * 43758.5453) % 1;
      skyU.uRb.value =
        c.month >= 4 &&
        c.month <= 8 &&
        hr < 0.35 &&
        X_.rain < 0.2 &&
        X_.gray < 0.5 &&
        c.phase > 0.58 &&
        c.phase < 0.7
          ? Math.min(1, (c.phase - 0.58) / 0.02, (0.7 - c.phase) / 0.02) * 0.9
          : 0;
      const thunder = (c.month === 6 || c.month === 7) && (c.phase > 0.74 || c.phase < 0.2) && hr > 0.5;
      if (thunder && Math.random() < 0.004) {
        G.lt = 1;
        skyU.uLd.value.set(Math.cos(dn) * 1, 0.12, Math.sin(dn));
      }
      G.lt = (G.lt || 0) * 0.85;
      skyU.uLt.value = G.lt * (Math.random() < 0.7 ? 1 : 0.3);
    }
    skyU.uMp.value = (((Math.floor(c.t / DAY) % 8) + 8) % 8) / 8 + 0.0625;
    skyU.uCu.value = SEASON.cumulus[c.month] * (1 - X_.gray * 0.8) * (X_.rain > 0.3 ? 0 : 1);
    skyU.uDark.value = X_.dark;
    skyDome.position.copy(camera.position);
  }
  renderer.toneMappingExposure = 1.04 + (1 - Math.min(1, day * 3)) * 0.25;
  renderer.setClearColor(sky);
  scene.fog.color.copy(skyU.uHor.value).lerp(new THREE.Color(0x8fa6bd), 0.15);
  const mist =
    c.phase > 0.22 && c.phase < 0.33
      ? (1 - Math.abs(c.phase - 0.27) / 0.06) * SEASON.morningMist[c.month]
      : 0;
  const mornH = Math.max(0, 1 - Math.abs(c.phase - 0.34) / 0.08);
  const airQ = SEASON.airClarity[c.month];
  scene.fog.near = X_.fog[0] * (1 - mist * 0.8) * (1 - mornH * 0.2) * airQ;
  scene.fog.far = X_.fog[1] * (day < 0.05 && X_.fog[1] > 3000 ? 1.8 : 1) * airQ;
  scene.fog.far *= (1 - mist * 0.6) * (1 - mornH * 0.1);
  waterU.uFog.value.set(scene.fog.near, scene.fog.far);
  waterU.uFoam.value = Math.max(0, X_.wave - 1.2) * 0.9;
  waterU.uRainR.value = X_.rain;
  waterU.uT2.value = t;
  updatePrecip(X_, W, dt, t);
  W_SENSE = X_.sense;
  // 河口の濁り
  LAKE.mouths.slice(0, 16).forEach(([x, y], i) => {
    const [fx_, fy_] = flow(x, y, c);
    waterU.uMouth.value[i].set(
      (x + fx_ * 900) * S,
      (y + fy_ * 900) * S,
      (300 + X_.turb * 1500) * S,
      X_.turb * 0.75,
    );
  });
  // 水位（見えやすいよう誇張）
  const lvl = LEVEL[c.month] / 100;
  water.position.y = lvl * 1.2;
  // ヨシの一年
  {
    const rk = REED_MONTH[c.month];
    for (const r of [reeds, innerReeds]) {
      r.material.map = REED_TEX[rk];
      r.position.y = r === reeds ? lvl * 1.2 : INNER_Y * 0;
    }
    reedU.uT.value = t;
    {
      const br = (0.07 + 0.61 * Math.min(1, day * 2.5)) * (1 - X_.gray * 0.25) + fl;
      {
        const st = new THREE.Color(FOREST_TINT[c.month]);
        for (const m of G.cards || []) {
          m.color.setScalar(br * 1.05);
          if (m.userData.kind !== "cedar" && m.userData.kind !== "pine") m.color.multiply(st);
          else if (SNOW[c.month] > 0.6) m.color.lerp(new THREE.Color(br, br, br * 1.05), 0.25);
        }
      }
      for (const r of [reeds, innerReeds]) {
        r.material.color.setScalar(br);
        if (day < 0.05) r.material.color.multiply(new THREE.Color(0.8, 0.88, 1.1));
      }
    }
    reedU.uW.value.set(W.x * 0.09, W.y * 0.09);
    smoke.visible = c.month === 2 && day > 0.2;
    if (smoke.visible) {
      const p = smokeGeo.attributes.position.array;
      smB.forEach(([x, z, o], i) => {
        const k = (t * 1.5 + o) % 40;
        p[i * 3] = x + k * W.x * 0.4;
        p[i * 3 + 1] = k;
        p[i * 3 + 2] = z + k * W.y * 0.4;
      });
      smokeGeo.attributes.position.needsUpdate = true;
    }
  }
  waterU.uSky.value.copy(sky);
  waterU.uFogC.value.copy(skyU.uHor.value);
  const sd = new THREE.Vector3(
    Math.cos(sa) * 0.8,
    Math.max(0.05, Math.sin(sa) * sElev),
    0.45 + 0.25 * (1 - sElev),
  ).normalize();
  waterU.uSun.value.copy(sd);
  sun.position.copy(sd).multiplyScalar(100).add(house.position);
  sun.target.position.copy(house.position);
  const warm = 1 - Math.min(1, day * 2.5);
  sun.color.setRGB(1, 1 - 0.3 * warm - 0.04, 1 - 0.55 * warm - 0.1);
  sun.intensity = (0.3 + 1.35 * day) * (1 - X_.gray * 0.6) + fl * 2;
  hemi.intensity = (0.38 + 0.42 * day) * (1 - X_.dark * 0.4) + fl;
  hemi.color.set(day < 0.1 ? 0x8a9ac8 : 0xcfe3f0);
  if (day < 0.05) sun.color.setRGB(0.7, 0.78, 1);
  waterU.uSunC.value.copy(sun.color).multiplyScalar((day > 0 ? 0.9 : 0.35) * (1 - X_.gray));
  if (terrMat.userData.haze)
    terrMat.userData.haze.value
      .copy(skyU.uHor.value)
      .lerp(new THREE.Color(0x7f9cc8), 0.35)
      .multiplyScalar(day < 0.15 ? 0.55 : 1);
  if (terrMat.userData.low) terrMat.userData.low.value = 1 - Math.min(1, day * 4);
  if (terrMat.userData.sh) {
    terrMat.userData.sh.uniforms.uSnow.value = SNOW[c.month];
    {
      const su = terrMat.userData.sh.uniforms;
      su.uCT.value = waterU.uT2.value;
      su.uSunT.value.copy(waterU.uSun.value);
      su.uCSh.value = waterU.uCSh.value;
    }
    terrMat.userData.sh.uniforms.uSpr.value = SEASON.greenery[c.month];
    waterU.uCSh.value = Math.max(0, skyU.uCu.value * 1.2 + 0.3) * (1 - X_.gray * 0.7);
    waterU.uMist.value =
      Math.max(0, 1 - Math.abs(c.phase - 0.27) / 0.06) *
      (X_.rain > 0.3 ? 0 : 1) *
      (c.month >= 8 || c.month <= 4 ? 1 : 0.6);
    waterU.uMp2.value = skyU.uMp.value;
    waterU.uSD.value += ((X_.snow > 0.5 ? 1 : 0) * 0.85 - waterU.uSD.value) * (WXQ !== null ? 1 : 0.01);
    {
      const u = terrMat.userData.sh.uniforms.uSL,
        tg = (c.month >= 11 || c.month <= 1) && X_.snow > 0.5 ? 1 : 0;
      u.value = WXQ !== null ? tg : u.value + (tg - u.value) * 0.002;
    }
    terrMat.userData.sh.uniforms.uWin.value = SEASON.winterTint[c.month];
    terrMat.userData.sh.uniforms.uAut.value = SEASON.autumn[c.month];
  }
  const night = day < 0.05;
  house.light.intensity = night ? 9 * CUST.bright : 0;
  {
    const hp = house.lamp.getWorldPosition(new THREE.Vector3()),
      lc = new THREE.Color(LIGHT_COLORS[CUST.light]);
    waterU.uHL.value.set(hp.x, hp.y, hp.z, night ? CUST.bright : 0);
    waterU.uHLc.value.set(lc.r, lc.g, lc.b);
  }
  house.light.color.set(LIGHT_COLORS[CUST.light]);
  house.lamp.material.color.set(night ? LIGHT_COLORS[CUST.light] : 0x8a8070);
  if (house.halo) {
    house.halo.visible = night || day < 0.12;
    house.halo.material.color.set(LIGHT_COLORS[CUST.light]);
    house.halo.material.opacity = CUST.bright;
  }
  for (const g of glassMats)
    g.emissive.set(night ? LIGHT_COLORS[CUST.light] : 0).multiplyScalar(night ? CUST.bright * 0.8 : 0);
  portLamps.visible = night || day < 0.12;
  if (G.torii) {
    G.torii.L.intensity = day < 0.08 ? 60 : 0;
    G.torii.red.emissive.set(day < 0.08 ? 0x3a0e06 : 0);
  }
  windows.visible = night || day < 0.18;
  if (G.street) G.street.visible = night || day < 0.1;
  windows.material.opacity = day < 0.05 ? 0.95 : 0.6;
  if (paddySeason._m !== c.month) {
    if (G.grass)
      G.grass.material.color.set(SEASON.grass[c.month]);
    roofSnowU.value = SEASON.roofSnow[c.month];
    roofM.color.setScalar(1 + roofSnowU.value * 2.2);
    (G.forest || []).forEach((I) => {
      if (I.userData.kind === "broad") {
        const au = c.month === 9 || c.month === 10;
        I.material.color.set(au ? 0xffffff : FOREST_TINT[c.month]);
        if (I.instanceColor) {
          const P = [0xff8a3a, 0xffc23a, 0xff5a32, 0xffa848, 0xe8d870, 0xfff090, 0xc8e090],
            cc = new THREE.Color();
          for (let i = 0; i < I.count; i++) {
            if (au)
              cc.set(P[(i * 13 + I.id) % (c.month === 9 ? 7 : 6)]).multiplyScalar(
                1.05 + ((i * 13) % 7) * 0.03,
              );
            else cc.setScalar(1.05 + ((i * 13) % 7) * 0.04);
            I.setColorAt(i, cc);
          }
          I.instanceColor.needsUpdate = true;
        }
      } else I.material.color.set(SNOW[c.month] > 0.6 ? 0xdfe6e8 : 0xffffff);
    });
    treeSeason(c.month);
    paddySeason(c.month, sky);
    paddySeason._m = c.month;
  }
  // 建物の浮き沈み（画面は傾けない）
  const hx = B.x * S,
    hz = B.y * S,
    slow = Math.sqrt(Math.max(1, house.size / 8)),
    wb = wakeBob * Math.sin(t * 2.6) * (RM ? 0.4 : 1),
    h0 = waveH(hx, hz, t) + wb,
    hF = waveH(hx + Math.cos(B.yaw) * 5, hz + Math.sin(B.yaw) * 5, t),
    hS = waveH(hx - Math.sin(B.yaw) * 3, hz + Math.cos(B.yaw) * 3, t);
  const inIn = !inMain(B.x, B.y) && inInner(B.x, B.y);
  {
    const wl = Math.hypot(W.x, W.y) || 1;
    waterU.uWd.value.set(W.x / wl, W.y / wl);
  }
  waterU.uHouse.value.set(hx, hz, house.size * 0.6);
  {
    const tgt = inIn
      ? INNER_Y + h0 * 0.15
      : Math.max(h0, waveTop(hx, hz, t, house.size * 0.35) - 0.25) + water.position.y;
    B.hy = (B.hy || 0) + (tgt - (B.hy || 0)) * Math.min(1, (dt * 6) / slow);
    B.hy = Math.max(B.hy, tgt - 0.4);
  }
  house.position.set(hx, B.hy, hz);
  house.rotation.set(0, 0, 0);
  house.rotateY(-B.yaw + Math.sin(t * 0.4) * 0.015 * BP.rock);
  const tilt = (RM ? 0.3 : 1) * BP.rock * (12 / Math.max(8, house.size)) ** 0.5 * 1.15;
  B.rz = (B.rz || 0) + (((hF - h0) / 5) * 0.6 * tilt - (B.rz || 0)) * Math.min(1, (dt * 3) / slow);
  B.rx =
    (B.rx || 0) + ((-(hS - h0) / 3) * 0.6 * tilt + wb * 0.04 - (B.rx || 0)) * Math.min(1, (dt * 3) / slow);
  house.rotateZ(B.rz);
  house.rotateX(B.rx);
  {
    const spd = Math.hypot(B.vx || 0, B.vy || 0);
    if (false) {
      const a = Math.atan2(B.vy, B.vx),
        bx = B.x * S - Math.cos(a) * house.size * 0.45,
        bz = B.y * S - Math.sin(a) * house.size * 0.45,
        nx = -Math.sin(a),
        nz = Math.cos(a);
      for (const s of [-1, 1])
        wakeP[wakeI++ % WAKE_N] = {
          x: bx + nx * s * house.size * 0.2,
          z: bz + nz * s * house.size * 0.2,
          vx: nx * s * 0.6 - Math.cos(a) * 0.2,
          vz: nz * s * 0.6 - Math.sin(a) * 0.2,
          born: t,
          big: false,
        };
    }
  }
  if (!G.gm) {
    G.gm = new THREE.Mesh(
      new THREE.RingGeometry(1.6, 2, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }),
    );
    scene.add(G.gm);
  }
  G.gm.visible = !!B.goal;
  if (B.goal) {
    G.gm.position.set(B.goal[0] * S, 0.4, B.goal[1] * S);
    G.gm.material.opacity = 0.4 + 0.25 * Math.sin(t * 3);
  }
  if (G.wake) G.wake.material.opacity = 0.06 + 0.16 * Math.min(1, day * 3);

  {
    const tr = waterU.uTr.value,
      spd = Math.hypot(B.vx || 0, B.vy || 0) * SPEED;
    for (const v of tr) v.z += dt;
    G.trT = (G.trT || 0) + dt;
    if (spd > 0.3 && G.trT > 0.3) {
      G.trT = 0;
      let k = 0;
      for (let i = 1; i < tr.length; i++) if (tr[i].z > tr[k].z) k = i;
      const a = B.yaw,
        L = house.size * 0.45;
      tr[k].set(
        B.x * S - Math.cos(a) * L,
        B.y * S - Math.sin(a) * L,
        0,
        Math.min(1, spd / 3) * Math.min(1.4, house.size / 12),
      );
    }
  }
  updateBoats(boats, dt, t, night);
  if (FW) FW.update(dt, c, day);
  if (G.buoys) G.buoys.update(t, day < 0.08);
  if (G.EV) G.EV.update(dt, c, day, t, W);
  // カメラ：水平を保って建物を追う
  if (
    STATE === "lake" &&
    performance.now() - (G.lastDrag || 0) > 4000 &&
    Math.hypot(B.vx || 0, B.vy || 0) > 0.03
  ) {
    const behind = Math.atan2(-(B.vx || 0), -(B.vy || 0)) + Math.PI;
    let dd = behind - yawT;
    dd = Math.atan2(Math.sin(dd), Math.cos(dd));
    yawT += dd * Math.min(1, dt * 0.25);
  }
  if (STATE === "lake") {
    let dy = yawT - yaw;
    yaw += dy * (1 - Math.exp(-dt * 4.5));
    if (!ptrs.size) dist += (distT - dist) * (1 - Math.exp(-dt * 3.5));
    else distT = dist;
  }
  if (STATE !== "lake") {
    yaw += dt * 0.12;
    yawT = yaw;
    dist = Math.max(26, house.size * 1.7, house.h * 2.6);
  }
  if (G.lock) {
    camX = G.lock[0];
    camZ = G.lock[1];
  } else {
    const k = 1 - Math.exp(-dt * 2.6);
    camX += (hx - camX) * k;
    camZ += (hz - camZ) * k;
  }
  const pc = STATE === "lake" ? Math.max(0.04, pitch) : Math.atan2(house.h * 0.5 + dist * 0.2, dist),
    hd = dist * Math.cos(pc),
    ch = Math.max(3.5, (STATE === "lake" ? 2 : 0) + dist * Math.sin(pc));
  const lookUp = STATE === "lake" && pitch < 0.04 ? Math.tan(Math.min(1.2, 0.04 - pitch)) * hd : 0;
  camera.position.set(camX + Math.sin(yaw) * hd, ch, camZ + Math.cos(yaw) * hd);
  {
    const gh =
      (inLake(camera.position.x / S, camera.position.z / S)
        ? 0
        : terrainAt(camera.position.x / S, camera.position.z / S) * S * VEX) + 1.5;
    if (camera.position.y < gh) camera.position.y = gh;
  }
  camera.lookAt(camX, (STATE === "lake" ? 2 : house.h * 0.45) + lookUp, camZ);
  {
    const wv = waveH(camera.position.x, camera.position.z, t) + water.position.y + 1.5;
    if (camera.position.y < wv) camera.position.y = wv;
  }
  if (STATE === "lake") {
    if (camera.view && camera.view.enabled) camera.clearViewOffset();
  } else {
    const w = innerWidth,
      h = innerHeight;
    camera.setViewOffset(w, h, 0, h * 0.2, w, h);
  }
  {
    const q = 5000 / (QUALITY.waterGrid);
    water.position.x = Math.round(camX / q) * q;
    water.position.z = Math.round(camZ / q) * q;
  }
  if (!G.rt) {
    G.rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    G.gq = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms: {
          tD: { value: null },
          uTm: { value: 0 },
          uWarm: { value: 0 },
          uDay: { value: 1 },
          uMorn: { value: 0 },
        },
        depthTest: false,
        depthWrite: false,
        vertexShader: `varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}`,
        fragmentShader: `uniform sampler2D tD;
uniform float uWarm,uDay,uMorn,uTm;
varying vec2 vU;
   vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);
}
   void main(){vec3 c=aces(texture2D(tD,vU).rgb*1.15);
vec3 bl=vec3(0.);
for(int i=0;
i<16;
i++){float a=float(i)*2.399,r=.003+.0032*float(i);
vec3 s=aces(texture2D(tD,vU+vec2(cos(a),sin(a))*r*vec2(1.,1.6)).rgb*1.15);
bl+=max(s-.55,0.)*(1.-float(i)/20.);
}c+=bl*vec3(.15,.14,.13);
c=pow(c,vec3(1./2.2));
    float l=dot(c,vec3(.299,.587,.114));
    c=mix(vec3(l),c,.86);
                                  // 彩度を抑えて淡く
    float lift=max(uDay*.7*(1.-uMorn*.6),uWarm*.9);
c*=mix(vec3(1.),${v3(PALETTE.gradeGolden)},uWarm*.6);
c=c*(.9-.05*uWarm)+mix(vec3(.08,.09,.1),vec3(.1,.085,.09),uWarm)*lift+.012;
                                  // 影を持ち上げて明るい調子に
    float ngt=1.-max(uDay,uWarm);
vec3 tint=mix(mix(${v3(PALETTE.gradeDayTint)},${v3(PALETTE.gradeDuskTint)},uWarm),${v3(PALETTE.gradeNightTint)},ngt);
 // 昼は水色、朝夕は桃色寄り
    c*=tint;
c=mix(c,mix(${v3(PALETTE.gradeHorizonLow)},${v3(PALETTE.gradeHorizonHigh)},smoothstep(.35,1.,vU.y)),uWarm*.32);
          // 朝夕は地平が桃・ラベンダー
    vec3 hi=vec3(1.,.98,.96);
c=mix(c,hi,smoothstep(.7,1.1,l)*.35*lift);
   // ハイライトのにじみ
    {float l2=dot(c,vec3(.299,.587,.114));
vec3 mint=mix(vec3(.62,.72,.70),vec3(.86,.91,.90),smoothstep(.0,1.,l2));
vec3 cm=mix(vec3(.36,.5,.5),vec3(.84,.89,.88),smoothstep(.15,.95,l2));
c=mix(c,cm,uMorn*.6);
c=mix(c,vec3(.86,.9,.88),uMorn*.45*smoothstep(.55,.95,vU.y));
}
    float v=distance(vU,vec2(.5));
c=mix(c,c*1.04+.03,smoothstep(.3,.75,v)*uDay*.6);
{float gr=fract(sin(dot(floor(vU*vec2(1920.,1080.)),vec2(12.9898,78.233))+uTm*7.13)*43758.5453)-.5;
c+=gr*(.022-.01*l);
}
    gl_FragColor=vec4(pow(c,vec3(2.2)),1.);
}`,
      }),
    );
    G.gs = new THREE.Scene();
    G.gs.add(G.gq);
    G.gc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  {
    const w = renderer.domElement.width,
      h = renderer.domElement.height;
    if (G.rt.width !== w || G.rt.height !== h) G.rt.setSize(w, h);
  }
  {
    if (!G.rf) {
      G.rf = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
      G.rc = new THREE.PerspectiveCamera();
    }
    const w = renderer.domElement.width,
      h = renderer.domElement.height,
      rs = QUALITY.reflection;
    if (G.rf.width !== Math.floor(w * rs)) G.rf.setSize(Math.floor(w * rs), Math.floor(h * rs));
    const rc = G.rc;
    const wy = water.position.y;
    camera.updateMatrixWorld();
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    rc.position.set(camera.position.x, 2 * wy - camera.position.y, camera.position.z);
    rc.up.set(0, 1, 0);
    rc.lookAt(rc.position.x + dir.x, rc.position.y - dir.y, rc.position.z + dir.z);
    rc.fov = camera.fov;
    rc.aspect = camera.aspect;
    rc.near = camera.near;
    rc.far = camera.far;
    rc.updateProjectionMatrix();
    rc.updateMatrixWorld();
    waterU.uTM.value
      .set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)
      .multiply(rc.projectionMatrix)
      .multiply(rc.matrixWorldInverse);
    const vis = [water.visible, skyDome.visible];
    water.visible = false;
    skyDome.visible = false;
    const cc = renderer.getClearColor(new THREE.Color()),
      ca = renderer.getClearAlpha();
    renderer.setClearColor(0, 0);
    renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 1, 0), -wy + 0.05)];
    renderer.setRenderTarget(G.rf);
    renderer.clear();
    renderer.render(scene, rc);
    renderer.clippingPlanes = [];
    renderer.setRenderTarget(null);
    renderer.setClearColor(cc, ca);
    water.visible = vis[0];
    skyDome.visible = vis[1];
    waterU.uRefl.value = G.rf.texture;
    waterU.uWy.value = wy;
    waterU.uRes.value.set(w, h);
    waterU.uCalm.value = Math.max(0, 1 - W.s / 6) * (X_.rain > 0.3 ? 0.3 : 1);
  }
  renderer.setRenderTarget(G.rt);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  G.gq.material.uniforms.tD.value = G.rt.texture;
  G.gq.material.uniforms.uTm.value = (performance.now() / 1000) % 100;
  G.gq.material.uniforms.uDay.value = Math.min(1, day * 2.5) * (1 - X_.dark);
  G.gq.material.uniforms.uMorn.value = Math.max(0, 1 - Math.abs(c.phase - 0.34) / 0.08) * (1 - X_.gray * 0.5);
  G.gq.material.uniforms.uWarm.value = Math.max(0, 1 - Math.abs(Math.sin(sa)) * 2.2);
  {
    const tm = renderer.toneMapping;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.render(G.gs, G.gc);
    renderer.toneMapping = tm;
  }
  requestAnimationFrame(frame);
}
// 確認用：URLに ?debug を付けたときだけ、撮影スクリプトから視点を動かせるようにする
if (Q.has("debug")) {
  window.__setH = (k, yw, pt, ds) => {
    const h = houses[k];
    B.x = h.x; B.y = h.y; camX = h.x * S; camZ = h.y * S;
    G.lock = [h.x * S, h.y * S];
    yaw = yawT = yw; pitch = pt; dist = distT = ds; STATE = "lake";
  };
  // 同じページのまま、月・時刻・天気・建物を切り替える（確認用）
  window.__scene = (q) => {
    if (q.month !== undefined) MO = String(q.month);
    if (q.phase !== undefined) PH = String(q.phase);
    if (q.wx !== undefined) WXQ = String(q.wx);
    if (q.b !== undefined && q.b !== CUST.b) {
      CUST.b = q.b;
      buildHouse();
    }
  };
  window.__set = (lo, la, dx, dy, yw, pt, ds) => {
    G.lock = null;
    const [x, y] = ll(lo, la);
    B.x = x + dx; B.y = y + dy; B.vx = B.vy = 0; camX = B.x * S; camZ = B.y * S;
    yaw = yawT = yw; pitch = pt; dist = distT = ds;
  };
}
requestAnimationFrame(frame);
requestAnimationFrame(() => (document.getElementById("veil").style.opacity = 0));
