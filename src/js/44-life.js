/* ---------- 山と水辺のいきもの：山肌を這う雲、竹林、トンボ、アオサギ ---------- */
G.life = (() => {
  const R = rnd(9393);
  // 竹林：集落の裏手に、ところどころ
  const bam = [];
  houses.forEach((h, i) => {
    if (i % 11 !== 3) return;
    for (let k = 0; k < 4; k++) {
      const x = h.x + Math.cos(h.rot + 1.57) * (60 + R() * 60) + (R() - 0.5) * 40,
        y = h.y + Math.sin(h.rot + 1.57) * (60 + R() * 60) + (R() - 0.5) * 40;
      if (!inLake(x, y)) bam.push([x, y, 0.6 + terrainAt(x, y) * S * VEX, 0.9 + R() * 0.4, R()]);
    }
  });
  if (bam.length) cardForest("bamboo", bam, 14, 8, 30, QUALITY.nearTrees[1], false);

  // 山肌を這う雲：雨上がりや曇りの日、山の中腹にゆっくり流れる白い雲
  const ctx = (() => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 64;
    const g = c.getContext("2d");
    for (let i = 0; i < 40; i++) {
      const x = 20 + Math.random() * 88,
        y = 22 + Math.random() * 20,
        r = 10 + Math.random() * 16,
        gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, "rgba(255,255,255,.35)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, 128, 64);
    }
    return new THREE.CanvasTexture(c);
  })();
  const clouds = [];
  for (let i = 0; i < 40; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctx, color: 0xf2f4f6, transparent: true, depthWrite: false, opacity: 0 }));
    s.visible = false;
    scene.add(s);
    clouds.push({ s, ok: false, ph: R() * 6 });
  }
  let cloudAt = null;
  const placeClouds = () => {
    const cx = camera.position.x,
      cz = camera.position.z;
    cloudAt = [cx, cz];
    for (const cl of clouds) {
      cl.ok = false;
      for (let k = 0; k < 30; k++) {
        const a = Math.random() * 6.28,
          d = 400 + Math.random() * 1600,
          x = cx + Math.cos(a) * d,
          z = cz + Math.sin(a) * d,
          hgt = terrainAt(x / S, z / S) * S * VEX;
        if (hgt > 35) {
          cl.s.position.set(x, hgt * (0.55 + Math.random() * 0.25), z);
          const w = 260 + Math.random() * 320;
          cl.s.scale.set(w, w * 0.32, 1);
          cl.ok = true;
          break;
        }
      }
    }
  };

  // トンボ：夏から秋の昼、ヨシ原の上を飛び交う
  const ND = 60,
    dfly = new THREE.InstancedMesh(
      (() => {
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0, 0, 0.06, 0, 0.02, -0.35, 0, 0.02, 0.35, 0.02, 0.02, 0], 3));
        return g;
      })(),
      new THREE.MeshBasicMaterial({ color: 0x3a3428, side: THREE.DoubleSide }),
      ND,
    );
  dfly.frustumCulled = false;
  dfly.visible = false;
  scene.add(dfly);
  const dps = [];
  let dAt = null;

  // アオサギ：浅瀬にじっと立つ大きなサギ
  const hm = new THREE.MeshLambertMaterial({ color: 0x8c9196 }),
    hd = new THREE.MeshLambertMaterial({ color: 0x3a3a3e });
  const heronG = new THREE.Group();
  {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), hm);
    body.scale.set(1.4, 0.8, 0.7);
    body.position.y = 1.05;
    heronG.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.7, 5), hm);
    neck.position.set(0.35, 1.45, 0);
    neck.rotation.z = -0.35;
    heronG.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), hm);
    head.position.set(0.48, 1.8, 0);
    heronG.add(head);
    const bill = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.3, 4).rotateZ(-Math.PI / 2), hd);
    bill.position.set(0.68, 1.78, 0);
    heronG.add(bill);
    for (const s of [-0.08, 0.08]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 4), hd);
      leg.position.set(-0.05, 0.4, s);
      heronG.add(leg);
    }
  }
  const herons = [];
  reedPts.forEach(([x, y], i) => {
    if (i % 140 !== 7 || herons.length > 24) return;
    for (let k = 0; k < 8; k++) {
      const a = R() * 6.28,
        xx = x + Math.cos(a) * 60,
        yy = y + Math.sin(a) * 60;
      const dp = depth(xx, yy);
      if (inLake(xx, yy) && dp > 0.2 && dp < 2) {
        const g = heronG.clone();
        g.position.set(xx * S, -0.35, yy * S);
        g.rotation.y = R() * 6.28;
        g.scale.setScalar(1.3);
        scene.add(g);
        herons.push(g);
        break;
      }
    }
  });

  const M = new THREE.Matrix4(),
    Qt = new THREE.Quaternion(),
    V = new THREE.Vector3(),
    Sc = new THREE.Vector3(1, 1, 1);
  // 田舟：ヨシ原の水際に舫われた細長い木の小舟
  const tabune = [];
  {
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
  // 家々の灯り：日暮れから一軒ずつ灯り、夜更けに一軒ずつ消える
  const wN = winGeo.attributes.color.count,
    wBase = winGeo.attributes.color.array.slice(),
    wOn = new Float32Array(wN),
    wOff = new Float32Array(wN),
    wMorn = new Float32Array(wN);
  for (let i = 0; i < wN; i++) {
    wOn[i] = 0.7 + R() * 0.1;
    wOff[i] = 0.9 + R() * 0.2;
    wMorn[i] = R() < 0.25 ? 0.19 + R() * 0.06 : 9;
  }
  let wT = 0;
  function update(dt, t, c, day, wxNow) {
    const cx = camera.position.x,
      cz = camera.position.z;
    // 雲
    const want = day > 0.05 ? Math.min(1, Math.max(0, (wxNow.gray - 0.35) * 2) + wxNow.rain * 0.8 + wxNow.white * 0.6) : 0;
    if (want > 0.02 && (!cloudAt || Math.hypot(cloudAt[0] - cx, cloudAt[1] - cz) > 1200)) placeClouds();
    for (const cl of clouds) {
      cl.s.visible = cl.ok && want > 0.02 && !isFar;
      if (!cl.s.visible) continue;
      cl.s.position.x += Math.cos(cl.ph) * dt * 1.2;
      cl.s.position.z += Math.sin(cl.ph) * dt * 1.2;
      cl.s.material.opacity = want * (0.55 + 0.25 * Math.sin(t * 0.05 + cl.ph));
    }
    // トンボ
    const summer = c.month >= 5 && c.month <= 9 && day > 0.25 && wxNow.rain < 0.2;
    dfly.visible = summer && !isFar;
    if (summer) {
      if (!dAt || Math.hypot(dAt[0] - cx, dAt[1] - cz) > 250) {
        dAt = [cx, cz];
        dps.length = 0;
        const near = reedPts.filter(([x, y]) => Math.hypot(x * S - cx, y * S - cz) < 260);
        for (let i = 0; i < ND; i++) {
          const p = near.length ? near[Math.floor(Math.random() * near.length)] : [cx / S, cz / S];
          dps.push([p[0] * S + (Math.random() - 0.5) * 20, p[1] * S + (Math.random() - 0.5) * 20, Math.random() * 6.28, near.length ? 1 : 0]);
        }
      }
      dps.forEach(([x, z, ph, ok], i) => {
        if (!ok) {
          M.makeScale(0, 0, 0);
          dfly.setMatrixAt(i, M);
          return;
        }
        const k = t * (0.6 + (i % 5) * 0.1) + ph,
          xx = x + Math.sin(k) * 6 + Math.sin(k * 3.1) * 1.5,
          zz = z + Math.cos(k * 0.8) * 6,
          yy = 2.2 + Math.sin(k * 2.3) * 0.6;
        Qt.setFromAxisAngle(V.set(0, 1, 0), -k);
        M.compose(V.set(xx, yy, zz), Qt, Sc);
        dfly.setMatrixAt(i, M);
      });
      dfly.instanceMatrix.needsUpdate = true;
    }
    for (const g of tabune) {
      g.position.y = -0.12 + Math.sin(t * 0.8 + g.userData.ph) * 0.03;
      g.rotation.z = Math.sin(t * 0.6 + g.userData.ph) * 0.02;
    }
    wT -= dt;
    if (wT <= 0) {
      wT = 0.5;
      const p = c.phase,
        ar = winGeo.attributes.color.array;
      for (let i = 0; i < wN; i++) {
        const on = p >= wOn[i] ? p < wOff[i] : p + 1 < wOff[i] || (p >= wMorn[i] && p < 0.3);
        const k = on ? 1 : 0;
        ar[i * 3] = wBase[i * 3] * k;
        ar[i * 3 + 1] = wBase[i * 3 + 1] * k;
        ar[i * 3 + 2] = wBase[i * 3 + 2] * k;
      }
      winGeo.attributes.color.needsUpdate = true;
    }
    // サギはときどき首をかしげる
    for (const h of herons) h.visible = day > 0.05 && !(c.month === 0 && wxNow.snow > 0.5);
  }
  return { update, herons, bam, tabune };
})();
