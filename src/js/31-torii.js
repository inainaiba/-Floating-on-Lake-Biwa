{
  const [tx_, ty_] = ll(136.0115, 35.2735);
  const g = new THREE.Group(),
    red = new THREE.MeshLambertMaterial({ color: 0xc8442c }),
    blk = new THREE.MeshLambertMaterial({ color: 0x2a2622 });
  const H = 12,
    Wd = 9.2;
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, H + 3, 16), red);
    p.position.set((s * Wd) / 2, (H - 3) / 2, 0);
    p.rotation.z = s * 0.035;
    g.add(p);
    const ft = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 1.4, 16), blk);
    ft.position.set((s * Wd) / 2, -0.2, 0);
    g.add(ft);
    for (const z of [-1.6, 1.6]) {
      const q = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, H + 2, 10), red);
      q.position.set((s * Wd) / 2, (H - 4) / 2, z);
      g.add(q);
      const qb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 1.6), red);
      qb.position.set((s * Wd) / 2, H * 0.55, z / 2);
      g.add(qb);
    }
  }
  const nuki = new THREE.Mesh(new THREE.BoxGeometry(Wd + 2.4, 0.6, 0.45), red);
  nuki.position.y = H - 2.4;
  g.add(nuki);
  const kasa = new THREE.Mesh(new THREE.BoxGeometry(Wd + 4.2, 0.55, 0.95), blk);
  kasa.position.y = H + 0.55;
  g.add(kasa);
  const shim = new THREE.Mesh(new THREE.BoxGeometry(Wd + 3.6, 0.5, 0.8), red);
  shim.position.y = H;
  g.add(shim);
  for (const s of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 0.95), blk);
    tip.position.set(s * (Wd / 2 + 2.4), H + 0.75, 0);
    tip.rotation.z = -s * 0.18;
    g.add(tip);
  }
  const gaku = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.3), blk);
  gaku.position.y = H - 1.2;
  g.add(gaku);
  let ox_ = tx_;
  for (let k = 0; k < 80 && depth(ox_, ty_) < 1.2; k++) ox_ += 10;
  g.position.set(ox_ * S, 0, ty_ * S);
  g.rotation.y = Math.PI / 2;
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  scene.add(g);
  const L_ = new THREE.PointLight(0xffc890, 0, 60, 1.6);
  L_.position.set(-12, 4, 0);
  g.add(L_);
  window.__torii = { g, red, L: L_ };
}
