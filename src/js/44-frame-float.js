/* ---------- 毎フレーム③：建物の浮き沈みと傾き、目的地の印、引き波 ---------- */
function floatHouse(dt, t, W, day) {
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
  return { hx, hz };
}
