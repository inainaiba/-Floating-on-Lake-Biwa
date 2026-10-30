/* ---------- 毎フレーム②：波・空・光・霧・季節の色・夜の灯り ---------- */
// 時間とともに持ち越す空の状態（雨上がり・時雨・稲光・流れ星・飛行機雲）を初期に戻す（確認用の場面切り替えで使う）
G.resetSky = () => {
  G.afterRain = 0;
  G.shigure = 0;
  G.lt = 0;
  skyU.uMet.value.w = 0;
  skyU.uCon.value.w = 0;
};
function updateSkyLight(dt, t, c, W) {
  // 波・空・光
  G.W = W;
  setWaves(W);
  waves.forEach((v, i) => {
    waterU.uW.value[i].set(v.dx, v.dz, v.k, v.w);
    waterU.uA.value[i].set(v.A, v.Qs);
  });
  waterU.uT.value = t;
  const wxNow = W.wx;
  G.wxNow = wxNow;
  // 太陽と月：天文の計算で（04-clock.js の astro）。季節で日の出の時刻・方角、南中の高さが変わる
  const AS = astro(c),
    sunAngle = AS.sunAngle,
    day = Math.max(0, Math.sin(sunAngle));
  const sunDirSky = AS.sun.clone();
  skyU.uMoonD.value.copy(AS.moon);
  waterU.uMoonD.value.copy(AS.moon);
  G.sunY = sunDirSky.y;
  G.morning = c.phase < 0.5;
  const sky = skyAt(AS.phaseEff); // 空の色は、実際の太陽の高さに合わせた時刻で
  // 月明かり：満ちた月が空にあるほど 1。月のない夜は暗く、青みを抜く（灯りの暖かさを引き立てる）
  G.moonLit = (1 - Math.abs(skyU.uMp.value - 0.5) * 2) * Math.min(1, Math.max(0, (AS.moon.y + 0.05) / 0.25));
  skyU.uMoonL.value = G.moonLit;
  {
    const nt0 = Math.max(0, 1 - day * 8),
      dk = nt0 * (1 - G.moonLit),
      l = sky.r * 0.3 + sky.g * 0.59 + sky.b * 0.11;
    sky.lerp(new THREE.Color(l, l, l * 1.08), dk * 0.6).multiplyScalar(1 - dk * 0.45);
  }
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
    skyU.uCloud.value = 0.5 + wxNow.gray * 0.5 + SEASON.snowCloud[c.month] * 0.25;
    skyU.uSnowCap.value = SEASON.snowCloud[c.month] * (wxNow.rain > 0.3 ? 0.5 : 1);
    {
      // 飛行機雲：晴れた昼、高い空にまっすぐ伸びて、ゆっくり広がり消える
      const cn = skyU.uCon.value;
      if (cn.w > 0) {
        cn.z = Math.min(1, cn.z + dt / 70);
        if (cn.z >= 1) cn.w = Math.max(0, cn.w - dt / 40);
      } else if (day > 0.3 && wxNow.gray < 0.3 && Math.random() < dt / 120) cn.set(Math.random() * 6.28, 0.5 + Math.random() * 0.4, 0, 1);
      // 明けの明星：夜明け前の東の低い空に
      skyU.uVenus.value = c.phase < 0.5 ? Math.max(0, 1 - Math.abs(sunDirSky.y + 0.12) / 0.1) * (1 - wxNow.gray) : 0;
      // 流れ星：晴れた夜、ときどき空を走る
      const m = skyU.uMet.value;
      if (m.w > 0) {
        m.z += dt * 1.6;
        if (m.z >= 1) m.w = 0;
      } else if (day <= 0 && wxNow.gray < 0.3 && Math.random() < dt / 25) m.set(Math.random() * 6.28, 0.35 + Math.random() * 0.5, 0, 1);
    }
    skyU.uCi.value = SEASON.cirrus[c.month] * (1 - wxNow.gray * 0.6);
    skyU.uRay.value =
      wxNow.gray > 0.25 && wxNow.gray < 0.8 && wxNow.rain < 0.3
        ? Math.max(Math.max(0, 1 - Math.abs(Math.sin(sunAngle)) * 3), day > 0.3 ? 0.55 * (1 - Math.abs(wxNow.gray - 0.5) * 3) : 0)
        : 0;
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
    skyU.uShaft.value = (c.month >= 5 && c.month <= 7 && c.phase > 0.55 && c.phase < 0.72 ? 1 : 0) * Math.min(1, skyU.uCu.value * 1.4) * (wxNow.rain > 0.2 ? 1.4 : 0.6);
    waterU.uGap.value = wxNow.gray > 0.45 && wxNow.rain < 0.3 ? Math.min(1, day * 3) * wxNow.gray : 0;
    skyU.uStar.value = SEASON.stars[c.month] * (1 - wxNow.gray * 0.8);
    skyU.uHzS.value = SEASON.springHaze[c.month] * Math.max(0, 1 - Math.abs(Math.sin(sunAngle)) * 3.5);
    waterU.uLowSun.value = (c.month >= 8 && c.month <= 11 ? 1 : 0.75) * Math.max(0, 1 - Math.abs(Math.sin(sunAngle)) * 3) * (day > 0 ? 1 : 0) * (1 - wxNow.gray);
    skyU.uMp.value = ((((c.t / DAY) % 29.53) + 29.53) % 29.53) / 29.53;
    // 天の川：夏の、月の細い晴れた夜ほど濃い
    skyU.uMw.value = (0.55 + 0.9 * Math.max(0, 1 - Math.abs(c.month - 7) / 2.5)) * (0.3 + 0.7 * Math.abs(skyU.uMp.value - 0.5) * 2);
    skyU.uCu.value = SEASON.cumulus[c.month] * (1 - wxNow.gray * 0.8) * (wxNow.rain > 0.3 ? 0 : 1);
    skyU.uDark.value = wxNow.dark;
    // 薄雲越しのぼんやりした太陽：高曇りや巻雲の多い日
    skyU.uVeil.value = Math.min(1, Math.max(0, 1 - Math.abs(wxNow.gray - 0.45) * 3.5) + Math.max(0, skyU.uCi.value - 0.45) * 1.2) * (wxNow.rain > 0.3 ? 0 : 1);
    skyU.uWin.value = c.month === 11 || c.month <= 1 ? 1 : c.month === 10 || c.month === 2 ? 0.5 : 0;
    {
      // 街の方角（大津・草津のあたり）
      const [ox, oy] = ll(135.9, 35.02);
      skyU.uCity.value.set(ox * S - camera.position.x, 0, oy * S - camera.position.z).normalize();
    }
    waterU.uCl.value = skyU.uCloud.value * (1 - wxNow.gray * 0.5);
    waterU.uLead.value = (c.month === 11 || c.month <= 1 ? 1 : c.month === 2 ? 0.5 : 0) * Math.min(1, wxNow.gray * 1.4);
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
  {
    // 雨上がり：雨のあと10分ほどは空気が澄んで、遠くまでくっきり見える
    if (wxNow.rain > 0.3) G.afterRain = 1;
    else G.afterRain = Math.max(0, (G.afterRain || 0) - dt / 600);
    const ar = wxNow.rain < 0.1 ? G.afterRain : 0;
    scene.fog.near *= 1 + ar * 0.8;
    scene.fog.far *= 1 + ar * 0.7;
  }
  waterU.uFog.value.set(scene.fog.near, scene.fog.far);
  waterU.uFoam.value = Math.max(0, wxNow.wave - 1.2) * 0.9;
  {
    // 時雨：11〜12月の昼、晴れ間に数分だけ通り過ぎる
    const dn = Math.floor(c.t / DAY),
      lucky = Math.abs(Math.sin(dn * 7.31) * 9137.1) % 1 < 0.6;
    const pass = Math.max(0, Math.sin(c.t / 37 + dn) * 1.6 - 0.9);
    const want = c.month >= LOOK.months.shigure[0] && c.month <= LOOK.months.shigure[1] && lucky && day > 0.3 && wxNow.rain < 0.1 && wxNow.gray < 0.6 ? Math.min(1, pass * 1.5) : 0;
    G.shigure = (G.shigure || 0) + (want - (G.shigure || 0)) * Math.min(1, dt * 0.5);
  }
  waterU.uRainR.value = Math.max(wxNow.rain, G.shigure * 0.6);
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
  wetU.value = water.position.y;
  // ヨシの一年
  {
    const rk = REED_MONTH[c.month];
    reedU.uCut.value = rk === "cut" || rk === "burnt" ? 1 : 0;
    reedU.tAlt.value = REED_TEX[rk === "burnt" ? "cut" : "winter"];
    for (const r of [reeds, innerReeds]) {
      r.material.map = REED_TEX[rk];
      r.position.y = r === reeds ? lvl * 1.2 : INNER_Y * 0;
    }
    reedU.uT.value = t;
    reedU.uSunD.value.copy(sunDirSky); // 木の板の明暗に使う日の向き
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
  const sd = AS.sun.clone();
  sd.y = Math.max(0.05, sd.y);
  sd.normalize();
  waterU.uSun.value.copy(sd);
  sun.position.copy(sd).multiplyScalar(100).add(house.position);
  sun.target.position.copy(house.position);
  const warm = 1 - Math.min(1, day * 2.5);
  sun.color.setRGB(1, 1 - 0.3 * warm - 0.04, 1 - 0.55 * warm - 0.1);
  sun.intensity = (0.3 + 1.35 * day) * (1 - wxNow.gray * 0.6) + fl * 2;
  hemi.intensity = (0.38 + 0.42 * day) * (1 - wxNow.dark * 0.4) + fl;
  {
    // 満月の夜は青白く明るく、新月の夜は暗い
    const full = 1 - Math.abs(skyU.uMp.value - 0.5) * 2,
      nt = Math.max(0, 1 - day * 8);
    hemi.intensity *= 1 + nt * (G.moonLit * 0.95 - 0.5) * (1 - wxNow.gray * 0.8);
    // 影の柔らかさ：昼はくっきり、朝夕と曇りはぼんやり
    sun.shadow.radius = 1.2 + (1 - Math.min(1, day * 1.6)) * 4 + wxNow.gray * 5;
  }
  hemi.color.set(day < 0.1 ? 0x8a9ac8 : 0xb9d3f2); // 晴れた日の影は空の青を映す
  if (day < 0.1) hemi.color.lerp(new THREE.Color(0x6a6e78), 1 - G.moonLit); // 月のない夜は青みのない暗さ
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
      su.uMoonT.value.copy(AS.moon);
      su.uMoonL.value = G.moonLit;
      su.uNt.value = Math.min(1, Math.max(0, (0.02 - G.sunY) / 0.12)); // 夜の度合い（日が沈むと1）
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
  // 灯りの揺らぎ：ろうそくのように、ごくわずかに
  const flick = 0.95 + LOOK.flicker[0] * Math.sin(t * 7.1) + LOOK.flicker[1] * Math.sin(t * 13.7 + Math.sin(t * 2.3));
  house.light.intensity = night ? 9 * CUST.bright * flick : 0;
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
    house.halo.material.opacity = CUST.bright * LOOK.haloOpacity;
    house.halo.scale.setScalar(2.4 * (1 + (wxNow.white || 0) * 3.5));
  }
  for (const g of glassMats)
    g.emissive.set(night ? LIGHT_COLORS[CUST.light] : 0).multiplyScalar(night ? CUST.bright * (g === G.glowMat ? LOOK.glowNight : LOOK.glassNight) * flick : 0);
  portLamps.visible = night || day < 0.12;
  windows.material.size = 3.4 * (1 + (wxNow.white || 0) * 1.6);
  if (G.street) G.street.material.size = 2.4 * (1 + (wxNow.white || 0) * 1.8);
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
            else {
              const hv = ((i * 29) % 11) / 10 - 0.5; // 木ごとの色のむら（17-trees.js の cardForest と同じ）
              cc.setRGB(1 + hv * 0.1, 1, 1 - hv * 0.12).multiplyScalar(1.05 + ((i * 13) % 7) * 0.04);
            }
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
