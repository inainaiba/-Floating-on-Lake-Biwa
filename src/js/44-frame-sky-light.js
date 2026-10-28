/* ---------- 毎フレーム②：波・空・光・霧・季節の色・夜の灯り ---------- */
function updateSkyLight(dt, t, c, W) {
  // 波・空・光
  setWaves(W);
  waves.forEach((v, i) => {
    waterU.uW.value[i].set(v.dx, v.dz, v.k, v.w);
    waterU.uA.value[i].set(v.A, v.Qs);
  });
  waterU.uT.value = t;
  const wxNow = W.wx;
  const sunAngle = (c.phase - 0.25) * 2 * Math.PI,
    day = Math.max(0, Math.sin(sunAngle));
  const sunHeight = SEASON.sunHeight[c.month];
  const sunDirSky = new THREE.Vector3(
    Math.cos(sunAngle) * 0.8,
    Math.sin(sunAngle) * sunHeight,
    0.45 + 0.25 * (1 - sunHeight),
  ).normalize();
  const sky = skyAt(c.phase);
  {
    const g = new THREE.Color(
      sky.r * 0.3 + sky.g * 0.59 + sky.b * 0.11,
      sky.r * 0.3 + sky.g * 0.59 + sky.b * 0.11,
      sky.r * 0.3 + sky.g * 0.59 + sky.b * 0.11,
    );
    sky.lerp(g, wxNow.gray).multiplyScalar(1 - wxNow.dark * 0.5);
    if (wxNow.white)
      sky.lerp(new THREE.Color(0xdcdfe0).multiplyScalar(0.35 + 0.65 * Math.min(1, day * 3 + 0.2)), wxNow.white);
  }
  if (wxNow.storm > 0.5 && t > nextFlash && !isFar) {
    flash = 1;
    nextFlash = t + 6 + Math.random() * 14;
  }
  flash = Math.max(0, flash - dt * 1.2);
  const fl = Math.sin(Math.min(1, flash) * Math.PI) * 0.35;
  sky.lerp(new THREE.Color(0xd8dcf0), fl);
  {
    const top = sky
      .clone()
      .lerp(new THREE.Color(0x2f73c8), 0.6 * Math.min(1, day * 2) * (1 - wxNow.gray))
      .lerp(new THREE.Color(0x7d8fc0), 0.85 * (1 - Math.min(1, day * 2.5)));
    const hor = sky.clone().lerp(new THREE.Color(0xe9eef2), 0.5 * Math.min(1, day * 2) * (1 - wxNow.gray * 0.5));
    skyU.uTop.value.copy(top);
    skyU.uHor.value.copy(hor);
    skyU.uSunD.value.copy(sunDirSky);
    skyU.uSunC2.value.copy(sun.color).multiplyScalar(day > 0 ? 1 : 0);
    skyU.uT.value = t;
    skyU.uCloud.value = 0.5 + wxNow.gray * 0.5;
    skyU.uCi.value = SEASON.cirrus[c.month] * (1 - wxNow.gray * 0.6);
    skyU.uRay.value =
      wxNow.gray > 0.3 && wxNow.gray < 0.8 && wxNow.rain < 0.3 ? Math.max(0, 1 - Math.abs(Math.sin(sunAngle)) * 3) : 0;
    {
      const dn = Math.floor(c.t / DAY),
        hr = Math.abs(Math.sin(dn * 12.9898) * 43758.5453) % 1;
      skyU.uRb.value =
        c.month >= 4 &&
        c.month <= 8 &&
        hr < 0.35 &&
        wxNow.rain < 0.2 &&
        wxNow.gray < 0.5 &&
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
    skyU.uCu.value = SEASON.cumulus[c.month] * (1 - wxNow.gray * 0.8) * (wxNow.rain > 0.3 ? 0 : 1);
    skyU.uDark.value = wxNow.dark;
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
  scene.fog.near = wxNow.fog[0] * (1 - mist * 0.8) * (1 - mornH * 0.2) * airQ;
  scene.fog.far = wxNow.fog[1] * (day < 0.05 && wxNow.fog[1] > 3000 ? 1.8 : 1) * airQ;
  scene.fog.far *= (1 - mist * 0.6) * (1 - mornH * 0.1);
  waterU.uFog.value.set(scene.fog.near, scene.fog.far);
  waterU.uFoam.value = Math.max(0, wxNow.wave - 1.2) * 0.9;
  waterU.uRainR.value = wxNow.rain;
  waterU.uT2.value = t;
  updatePrecip(wxNow, W, dt, t);
  W_SENSE = wxNow.sense;
  // 河口の濁り
  LAKE.mouths.slice(0, 16).forEach(([x, y], i) => {
    const [fx_, fy_] = flow(x, y, c);
    waterU.uMouth.value[i].set(
      (x + fx_ * 900) * S,
      (y + fy_ * 900) * S,
      (300 + wxNow.turb * 1500) * S,
      wxNow.turb * 0.75,
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
      const br = (0.07 + 0.61 * Math.min(1, day * 2.5)) * (1 - wxNow.gray * 0.25) + fl;
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
    Math.cos(sunAngle) * 0.8,
    Math.max(0.05, Math.sin(sunAngle) * sunHeight),
    0.45 + 0.25 * (1 - sunHeight),
  ).normalize();
  waterU.uSun.value.copy(sd);
  sun.position.copy(sd).multiplyScalar(100).add(house.position);
  sun.target.position.copy(house.position);
  const warm = 1 - Math.min(1, day * 2.5);
  sun.color.setRGB(1, 1 - 0.3 * warm - 0.04, 1 - 0.55 * warm - 0.1);
  sun.intensity = (0.3 + 1.35 * day) * (1 - wxNow.gray * 0.6) + fl * 2;
  hemi.intensity = (0.38 + 0.42 * day) * (1 - wxNow.dark * 0.4) + fl;
  hemi.color.set(day < 0.1 ? 0x8a9ac8 : 0xcfe3f0);
  if (day < 0.05) sun.color.setRGB(0.7, 0.78, 1);
  waterU.uSunC.value.copy(sun.color).multiplyScalar((day > 0 ? 0.9 : 0.35) * (1 - wxNow.gray));
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
    waterU.uCSh.value = Math.max(0, skyU.uCu.value * 1.2 + 0.3) * (1 - wxNow.gray * 0.7);
    waterU.uMist.value =
      Math.max(0, 1 - Math.abs(c.phase - 0.27) / 0.06) *
      (wxNow.rain > 0.3 ? 0 : 1) *
      (c.month >= 8 || c.month <= 4 ? 1 : 0.6);
    waterU.uMp2.value = skyU.uMp.value;
    waterU.uSD.value += ((wxNow.snow > 0.5 ? 1 : 0) * 0.85 - waterU.uSD.value) * (WXQ !== null ? 1 : 0.01);
    {
      const u = terrMat.userData.sh.uniforms.uSL,
        tg = (c.month >= 11 || c.month <= 1) && wxNow.snow > 0.5 ? 1 : 0;
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
  return { wxNow, day, night, sunAngle };
}
