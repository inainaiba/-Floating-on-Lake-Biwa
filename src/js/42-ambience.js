/* ---------- 湖の暮らしの気配：釣り舟、はさ掛け、眺めるだけの時間 ---------- */
G.ambience = (() => {
  const R = rnd(7171);
  // 釣り舟：湖岸から少し沖を、ゆっくり行き来する小舟（自分の近くに3そう）
  const hullM = new THREE.MeshLambertMaterial({ color: 0x5a4a3a }),
    roofM2 = new THREE.MeshLambertMaterial({ color: 0xd8d4c8 }),
    manM = new THREE.MeshLambertMaterial({ color: 0x2a2a2e });
  const mkBoat = () => {
    const g = new THREE.Group();
    const h = new THREE.Mesh(new THREE.BoxGeometry(6, 0.7, 1.6), hullM);
    h.position.y = 0.2;
    g.add(h);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.6, 4).rotateZ(-Math.PI / 2).rotateX(Math.PI / 4), hullM);
    bow.position.set(3.6, 0.25, 0);
    bow.scale.set(1, 0.45, 1);
    g.add(bow);
    const man = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 1.2, 6), manM);
    man.position.set(-1.6, 1.1, 0);
    g.add(man);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.25, 8), roofM2);
    hat.position.set(-1.6, 1.85, 0);
    g.add(hat);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 4.5, 4), manM);
    rod.position.set(0.2, 1.8, 0);
    rod.rotation.z = -1.0;
    g.add(rod);
    g.visible = false;
    mergeStatic(g); // 舟の部品を材質ごとに束ねる
    scene.add(g);
    return { g, a: R() * 6.28, r: 0, cx: 0, cz: 0, sp: 0.004 + R() * 0.004, on: false };
  };
  const boats = [mkBoat(), mkBoat(), mkBoat()];
  // はさ掛け：稲刈り後（9〜10月）、田のわきに稲を干す木の架け
  const hzM = new THREE.MeshLambertMaterial({ color: 0xb8954a }),
    poleM = new THREE.MeshLambertMaterial({ color: 0x4a3a2a });
  const hz = paddies.filter((_, i) => i % 4 === 1);
  const rack = new THREE.InstancedMesh(new THREE.BoxGeometry(7, 1.3, 0.5).translate(0, 1.4, 0), hzM, Math.max(1, hz.length));
  const poles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 2.3, 0.12).translate(0, 1.15, 0), poleM, Math.max(1, hz.length * 3));
  {
    const M = new THREE.Matrix4(),
      Q2 = new THREE.Quaternion(),
      E = new THREE.Euler(),
      V = new THREE.Vector3();
    hz.forEach((p, i) => {
      const gy = landY(p.x, p.y) + 0.03,
        rot = -p.rot,
        ox = Math.sin(rot) * 5,
        oz = Math.cos(rot) * 5;
      Q2.setFromEuler(E.set(0, rot, 0));
      M.compose(V.set(p.x * S + ox, gy, p.y * S + oz), Q2, new THREE.Vector3(1, 1, 1));
      rack.setMatrixAt(i, M);
      for (let k = 0; k < 3; k++) {
        const s = (k - 1) * 3.4;
        M.compose(V.set(p.x * S + ox + Math.cos(rot) * s, gy, p.y * S + oz - Math.sin(rot) * s), Q2, new THREE.Vector3(1, 1, 1));
        poles.setMatrixAt(i * 3 + k, M);
      }
    });
  }
  rack.visible = poles.visible = false;
  rack.castShadow = poles.castShadow = QUALITY.treeShadow;
  scene.add(rack, poles);

  function update(dt, t, c, day) {
    const cx = camera.position.x,
      cz = camera.position.z;
    // 釣り舟は昼間だけ、自分から200〜500mの岸寄りの水面に現れる
    const daytime = day > 0.15;
    for (const b of boats) {
      if (!b.on && daytime && Math.random() < dt * 0.05) {
        for (let k = 0; k < 20; k++) {
          const a = Math.random() * 6.28,
            d = 200 + Math.random() * 300,
            x = cx + Math.cos(a) * d,
            z = cz + Math.sin(a) * d;
          const dp = depth(x / S, z / S);
          if (inLake(x / S, z / S) && dp > 2 && dp < 12) {
            b.cx = x;
            b.cz = z;
            b.r = 30 + Math.random() * 50;
            b.on = true;
            b.g.visible = true;
            break;
          }
        }
      }
      if (b.on) {
        if (!daytime || Math.hypot(b.cx - cx, b.cz - cz) > 900) {
          b.on = false;
          b.g.visible = false;
          continue;
        }
        b.a += b.sp * dt * 6;
        const x = b.cx + Math.cos(b.a) * b.r,
          z = b.cz + Math.sin(b.a) * b.r;
        b.g.position.set(x, waveH(x, z, t) * 0.8, z);
        b.g.rotation.set(0, -b.a - Math.PI / 2 + Math.PI, Math.sin(t * 1.3 + b.a) * 0.04);
      }
    }
    rack.visible = poles.visible = c.month === 8 || c.month === 9;
  }
  return { update, boats };
})();

// 眺めるだけの時間：しばらく操作がないと、カメラがゆっくり湖を見渡す
{
  const touch = () => (G.lastInput = performance.now());
  for (const ev of ["pointerdown", "keydown", "wheel"]) addEventListener(ev, touch, { passive: true });
  touch();
}
function idleLook(dt) {
  if (STATE !== "lake" || isFar) return;
  const idle = (performance.now() - (G.lastInput || 0)) / 1000;
  if (idle > 40) yawT += dt * 0.035 * Math.min(1, (idle - 40) / 10);
}
