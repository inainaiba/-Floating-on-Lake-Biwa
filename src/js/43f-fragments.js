/* ---------- 自然の断片と、めぐる命（2026年11月） ----------
   人の姿は出さず、ささやかな瞬間を、建物のまわり（実寸約500m）にだけ置く。どれも小さく、すぐ消える
   ・蜻蛉：夏〜秋の昼、水面すれすれを、止まっては素早く移る
   ・灯りに寄る虫：夏の夜、建物の灯りのまわりを小さな虫がめぐる
   ・ヨシの先のしずく：雨上がり、ヨシの先から水滴が落ちて、小さな輪が広がる（43e-reed-near.js の輪と同じ水面）
   ・線香花火：夏の夜（8月）、浜のどこかで小さな火花がひとつだけ、ぱちぱちと散って、やがて落ちる
   ・水面の細部：カメラが水面すれすれに下りたときだけ、浮かぶ花粉や泡、小さな羽虫が見える
   ・蜉蝣：夏の宵、水面の上に白い群れが舞い、明け方には水面に白く浮かんでいる（一晩の命）
   ・蓮の花：夏、ヨシ際の浅瀬に咲き、朝に開いて昼過ぎに閉じる
   ・産卵の波紋：5〜6月、浅瀬で魚の波紋が増える（43e-reed-near.js の G.fishBoost）
   ・枯れヨシの打ち上げ：冬、岸に枯れたヨシが寄って積もる */
{
  const NP = 420,
    pos = new Float32Array(NP * 3),
    col = new Float32Array(NP * 3),
    g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const mk = (blend) =>
    new THREE.PointsMaterial({
      size: 0.16,
      map: G.dotTex,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      alphaTest: 0.02,
      blending: blend,
      sizeAttenuation: true,
    });
  // 暗い粒（蜻蛉・羽虫）と、光る粒（灯りの虫・しずく・花火・蜉蝣・花粉）を分ける
  const dark = new THREE.Points(g, mk(THREE.NormalBlending)),
    gL = new THREE.BufferGeometry(),
    posL = new Float32Array(NP * 3),
    colL = new Float32Array(NP * 3);
  gL.setAttribute("position", new THREE.BufferAttribute(posL, 3));
  gL.setAttribute("color", new THREE.BufferAttribute(colL, 3));
  const lite = new THREE.Points(gL, mk(THREE.AdditiveBlending));
  for (const p of [dark, lite]) {
    p.frustumCulled = false;
    p.userData.noRefl = true;
    scene.add(p);
  }
  // 蓮の花：薄紅の小さな盃（開くと平たく、閉じると細い蕾）と、丸い葉
  const NL = 40,
    lotusG = new THREE.ConeGeometry(0.45, 0.5, 8, 1, true).rotateX(Math.PI).translate(0, 0.25, 0),
    lotus = new THREE.InstancedMesh(lotusG, new THREE.MeshLambertMaterial({ color: 0xf3c4cc, emissive: 0x3a1a20, side: THREE.DoubleSide }), NL),
    leafM = new THREE.MeshLambertMaterial({ color: 0x3f6a3a, side: THREE.DoubleSide }),
    leaves = new THREE.InstancedMesh(new THREE.CircleGeometry(0.8, 10).rotateX(-Math.PI / 2), leafM, NL * 2);
  // 打ち上げられた枯れヨシ：岸に寄った細い茎の束
  const NW = 120,
    wrack = new THREE.InstancedMesh(new THREE.BoxGeometry(2.2, 0.06, 0.06), new THREE.MeshLambertMaterial({ color: 0xb59a68 }), NW);
  for (const m of [lotus, leaves, wrack]) {
    m.userData.noChunk = true;
    m.frustumCulled = false;
    m.count = 0;
    scene.add(m);
  }
  const M = new THREE.Matrix4(),
    Q = new THREE.Quaternion(),
    E = new THREE.Euler(),
    V = new THREE.Vector3(),
    Sc = new THREE.Vector3();
  // 粒ひとつずつの状態
  const P = Array.from({ length: NP }, () => ({ k: "", a: -1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, ph: Math.random() * 6.28 }));
  const PL = Array.from({ length: NP }, () => ({ k: "", a: -1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, ph: Math.random() * 6.28 }));
  let at = null,
    nearReed = [],
    shore = [],
    spark = null,
    lastSet = "";
  const R = Math.random;
  const free = (arr) => arr.find((p) => p.a < 0);
  G.frag = { lotus, leaves, wrack, dark, lite }; // 確認用
  onFrame(135, (f) => {
    const c = f.c,
      mo = c.month,
      h = c.phase * 24,
      t = f.t,
      dt = f.dt,
      cx = camera.position.x,
      cz = camera.position.z,
      hx = B.x * S,
      hz = B.y * S,
      wy = water.position.y,
      day = f.day,
      rain = f.wxNow.rain || 0;
    if (isFar) {
      dark.visible = lite.visible = lotus.visible = leaves.visible = wrack.visible = false;
      return;
    }
    dark.visible = lite.visible = true;
    // まわりのヨシと岸（建物が大きく動いたら選び直す）
    if (!at || Math.hypot(at[0] - hx, at[1] - hz) > 40) {
      at = [hx, hz];
      nearReed = reedPts.filter(([x, y]) => Math.abs(x * S - hx) < 110 && Math.abs(y * S - hz) < 110);
      shore = [];
      for (let i = 0; i < outer.length - 1; i += 1) {
        const [x, y] = outer[i];
        if (Math.abs(x * S - hx) < 140 && Math.abs(y * S - hz) < 140) shore.push([x, y]);
      }
      lastSet = "";
    }
    // ---- 暗い粒：蜻蛉（夏〜秋の昼）、水面すれすれの羽虫（カメラが低いとき） ----
    const low = camera.position.y - wy < 4.5;
    const wantDF = mo >= 5 && mo <= 9 && h > 8.5 && h < 17.5 && rain < 0.2 ? 9 : 0; // 少しだけ多めに（2026年11月）
    let nDF = P.filter((p) => p.k === "df" && p.a >= 0).length;
    while (nDF < wantDF) {
      const p = free(P);
      if (!p) break;
      const a = R() * 6.28,
        r = 6 + R() * 25;
      Object.assign(p, { k: "df", a: 0, x: hx + Math.cos(a) * r, y: wy + 0.6 + R() * 0.8, z: hz + Math.sin(a) * r, vx: 0, vz: 0, tt: 0 });
      nDF++;
    }
    if (low) {
      let nG = P.filter((p) => p.k === "gn" && p.a >= 0).length;
      while (nG < 30) {
        const p = free(P);
        if (!p) break;
        const a = R() * 6.28,
          r = 2 + R() * 9;
        Object.assign(p, { k: "gn", a: 0, x: cx + Math.cos(a) * r, y: wy + 0.15 + R() * 0.5, z: cz + Math.sin(a) * r });
        nG++;
      }
    }
    // ---- 光る粒 ----
    const nightTint = day < 0.12;
    // 灯りに寄る虫：夏の夜、建物の灯りのまわり
    if (mo >= 5 && mo <= 8 && nightTint && rain < 0.3) {
      let n = PL.filter((p) => p.k === "bug" && p.a >= 0).length;
      while (n < 34) {
        const p = free(PL);
        if (!p) break;
        Object.assign(p, { k: "bug", a: 0, r: 0.6 + R() * 1.8, sp: 1.5 + R() * 2.5, yo: R() * 1.5 });
        n++;
      }
    }
    // ヨシの先のしずく：雨上がり（G.afterRain）、近くのヨシから
    if ((G.afterRain || 0) > 0.05 && rain < 0.1 && nearReed.length && R() < dt * 9 * G.afterRain) {
      const p = free(PL),
        q = nearReed[Math.floor(R() * nearReed.length)];
      if (p) Object.assign(p, { k: "drop", a: 0, x: q[0] * S + (R() - 0.5) * 8, y: wy + 3 + R() * 0.8, z: q[1] * S + (R() - 0.5) * 8, vy: 0 });
    }
    // 水面の花粉と泡：カメラが低いとき
    if (low) {
      let n = PL.filter((p) => p.k === "pol" && p.a >= 0).length;
      while (n < 40) {
        const p = free(PL);
        if (!p) break;
        const a = R() * 6.28,
          r = 1.5 + R() * 10;
        Object.assign(p, { k: "pol", a: 0, x: cx + Math.cos(a) * r, y: wy + 0.05, z: cz + Math.sin(a) * r });
        n++;
      }
    }
    // 蜉蝣：7〜8月の宵（19〜21時）は舞い、明け方（4〜6時）は水面に白く浮かぶ
    const mayEve = (mo === 6 || mo === 7) && h > 18.8 && h < 21.6 && rain < 0.3,
      mayDawn = (mo === 6 || mo === 7) && h > 4 && h < 6.5;
    if (mayEve || mayDawn) {
      let n = PL.filter((p) => p.k === "may" && p.a >= 0).length;
      while (n < 110) {
        const p = free(PL);
        if (!p) break;
        const a = R() * 6.28,
          r = 4 + R() * 30;
        Object.assign(p, { k: "may", a: 0, x: hx + Math.cos(a) * r, y: mayEve ? wy + 1 + R() * 4 : wy + 0.04, z: hz + Math.sin(a) * r, fl: mayDawn });
        n++;
      }
    }
    // 線香花火：8月の夜（20〜22時）、近くの浜のどこかでひとつだけ
    if (mo === 7 && h > 20 && h < 22 && rain < 0.1 && shore.length && !spark && R() < dt / 14) {
      const q = shore[Math.floor(R() * shore.length)];
      spark = { x: q[0] * S, z: q[1] * S, y: landY(q[0], q[1]) + 0.8, a: 0, life: 18 + R() * 10 };
    }
    if (spark) {
      spark.a += dt;
      const s = spark.a / spark.life;
      if (s >= 1) spark = null;
      else if (R() < dt * (s < 0.15 ? 8 : s < 0.75 ? 26 : 6)) {
        // 火の玉から、細い火花が四方へはじける（終わりぎわは細く少なく）
        for (let k = 0; k < (s < 0.75 ? 3 : 1); k++) {
          const p = free(PL);
          if (!p) break;
          const a = R() * 6.28,
            v = 0.4 + R() * 0.9;
          Object.assign(p, { k: "spk", a: 0, x: spark.x, y: spark.y, z: spark.z, vx: Math.cos(a) * v, vy: 0.3 + R() * 0.6, vz: Math.sin(a) * v });
        }
      }
    }
    // ---- 動かして、描く ----
    let n = 0;
    for (const p of P) {
      if (p.a < 0) continue;
      if (p.k === "df") {
        // 止まって（ホバリング）、また素早く移る
        p.tt -= dt;
        if (p.tt <= 0) {
          p.tt = 0.6 + R() * 1.8;
          const a = R() * 6.28,
            v = R() < 0.6 ? 0 : 4 + R() * 4;
          p.vx = Math.cos(a) * v;
          p.vz = Math.sin(a) * v;
        }
        p.x += p.vx * dt;
        p.z += p.vz * dt;
        p.vx *= 1 - dt * 3;
        p.vz *= 1 - dt * 3;
        p.a += dt / 40;
        if (Math.hypot(p.x - hx, p.z - hz) > 60 || !inLake(p.x / S, p.z / S) || wantDF === 0) p.a = 1;
        pos.set([p.x, p.y + Math.sin(t * 9 + p.ph) * 0.03, p.z], n * 3);
        col.set([0.18, 0.22, 0.32], n * 3);
      } else if (p.k === "gn") {
        p.a += dt / 6;
        p.x += Math.sin(t * 3 + p.ph) * dt * 0.4;
        p.z += Math.cos(t * 2.6 + p.ph) * dt * 0.4;
        if (!low) p.a = 1;
        pos.set([p.x, p.y + Math.sin(t * 5 + p.ph) * 0.08, p.z], n * 3);
        col.set([0.15, 0.15, 0.13], n * 3);
      }
      if (p.a >= 1) {
        p.a = -1;
        continue;
      }
      n++;
    }
    g.setDrawRange(0, n);
    g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true;
    const lampP = house.lamp ? house.lamp.getWorldPosition(V) : V.set(hx, wy + 4, hz);
    const lx = lampP.x,
      ly = lampP.y,
      lz = lampP.z;
    let m = 0;
    const br = Math.min(1, day * 2.5);
    for (const p of PL) {
      if (p.a < 0) continue;
      let x, y, z, r, gg, b;
      if (p.k === "bug") {
        p.a += dt / 30;
        if (!(mo >= 5 && mo <= 8 && nightTint)) p.a = 1;
        const a = t * p.sp + p.ph;
        x = lx + Math.cos(a) * p.r;
        y = ly - 0.3 + p.yo + Math.sin(t * 3 + p.ph) * 0.3;
        z = lz + Math.sin(a * 1.3) * p.r;
        r = 1;
        gg = 0.85;
        b = 0.55;
      } else if (p.k === "drop") {
        p.vy -= 9.8 * dt * 0.6;
        p.y += p.vy * dt;
        x = p.x;
        y = p.y;
        z = p.z;
        r = gg = b = 0.5 + 0.4 * br;
        if (p.y <= wy) {
          p.a = 1;
          G.dropRing && G.dropRing(p.x, p.z); // 水面に小さな輪（43e-reed-near.js）
        }
      } else if (p.k === "pol") {
        p.a += dt / 12;
        p.x += Math.sin(t * 0.3 + p.ph) * dt * 0.05;
        p.z += Math.cos(t * 0.27 + p.ph) * dt * 0.05;
        if (!low) p.a = 1;
        x = p.x;
        y = wy + 0.05 + waveH(p.x, p.z, t) * 0.5;
        z = p.z;
        const k = 0.25 * br + 0.05;
        r = k;
        gg = k * 0.95;
        b = k * 0.7;
      } else if (p.k === "may") {
        p.a += dt / 60;
        if (!(mayEve || mayDawn)) p.a = 1;
        if (!p.fl) {
          // 舞う：ふわりと上がって、ゆっくり降りる
          p.y += Math.sin(t * 1.4 + p.ph) * dt * 0.8;
          p.x += Math.sin(t * 0.5 + p.ph) * dt * 0.3;
        }
        x = p.x;
        y = p.fl ? wy + 0.04 + waveH(p.x, p.z, t) * 0.5 : p.y;
        z = p.z;
        const k = p.fl ? 0.35 : 0.25 + 0.15 * (1 - day);
        r = k;
        gg = k;
        b = k * 0.92;
      } else if (p.k === "spk") {
        p.a += dt / 0.5;
        p.vy -= 3 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        x = p.x;
        y = p.y;
        z = p.z;
        const k = 1 - p.a;
        r = 1.6 * k;
        gg = 0.9 * k;
        b = 0.35 * k;
      }
      if (p.a >= 1) {
        p.a = -1;
        continue;
      }
      posL.set([x, y, z], m * 3);
      colL.set([r, gg, b], m * 3);
      m++;
    }
    if (spark) {
      // 火の玉そのもの
      posL.set([spark.x, spark.y, spark.z], m * 3);
      colL.set([1.4, 0.7, 0.25], m * 3);
      m++;
    }
    gL.setDrawRange(0, m);
    gL.attributes.position.needsUpdate = gL.attributes.color.needsUpdate = true;
    // ---- 蓮の花（7〜8月、ヨシ際）：朝に開いて、昼過ぎに閉じる ----
    const lotusOn = (mo === 6 || mo === 7) && nearReed.length;
    lotus.visible = leaves.visible = !!lotusOn;
    if (lotusOn) {
      const open = Math.max(0, Math.min(1, (h - 4.5) / 1.5, (14 - h) / 2));
      const key = "lotus" + Math.round(open * 20) + at.join();
      if (key !== lastSet) {
        lastSet = key;
        const RR = rnd(Math.floor(at[0]) * 3 + Math.floor(at[1]));
        let k = 0;
        for (let i = 0; i < NL; i++) {
          const q = nearReed[Math.floor(RR() * nearReed.length)],
            x = q[0] * S + (RR() - 0.5) * 14,
            z = q[1] * S + (RR() - 0.5) * 14;
          if (!inLake(x / S, z / S)) continue;
          M.compose(V.set(x, wy + 0.05, z), Q.setFromEuler(E.set(0, RR() * 6, 0)), Sc.set(0.35 + open * 0.75, 0.7 + open * 0.2, 0.35 + open * 0.75));
          lotus.setMatrixAt(k, M);
          for (let j = 0; j < 2; j++) {
            M.compose(V.set(x + (RR() - 0.5) * 2.4, wy + 0.03, z + (RR() - 0.5) * 2.4), Q.identity(), Sc.setScalar(0.7 + RR() * 0.6));
            leaves.setMatrixAt(k * 2 + j, M);
          }
          k++;
        }
        lotus.count = k;
        leaves.count = k * 2;
        lotus.instanceMatrix.needsUpdate = leaves.instanceMatrix.needsUpdate = true;
      }
      const br2 = 0.15 + 0.85 * Math.min(1, day * 2.5);
      lotus.material.color.setRGB(0.95 * br2, 0.77 * br2, 0.8 * br2);
      leafM.color.setRGB(0.25 * br2, 0.42 * br2, 0.23 * br2);
    }
    // ---- 冬（12〜2月）：岸に打ち上げられた枯れヨシ ----
    const wOn = (mo >= 11 || mo <= 1) && shore.length;
    wrack.visible = !!wOn;
    if (wOn && wrack.userData.at !== at.join()) {
      wrack.userData.at = at.join();
      const RR = rnd(Math.floor(at[0]) + Math.floor(at[1]) * 7);
      let k = 0;
      for (let i = 0; i < NW; i++) {
        const q = shore[Math.floor(RR() * shore.length)],
          x = q[0] * S + (RR() - 0.5) * 6,
          z = q[1] * S + (RR() - 0.5) * 6;
        if (inLake(x / S, z / S)) continue;
        M.compose(V.set(x, landY(x / S, z / S) + 0.04, z), Q.setFromEuler(E.set(0, RR() * 6.28, (RR() - 0.5) * 0.2)), Sc.set(0.6 + RR() * 0.9, 1, 1));
        wrack.setMatrixAt(k++, M);
      }
      wrack.count = k;
      wrack.instanceMatrix.needsUpdate = true;
    }
  });
}
