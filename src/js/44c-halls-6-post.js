/* ---------- 湖に浮かぶ建築 6. 水上郵便局（道具は 44c-halls-0-common.js の HALL） ---------- */
{
  const { villageSites, apart, mute, lam, box, add, M, glowMat, moor, raft, setCur } = HALL;
  // ---------- 6. 水上郵便局 ----------
  // 赤い切妻屋根に白い板壁の小さな局舎を載せた平舟。舳先に丸い赤いポスト、局舎の窓の奥に仕分けの棚、甲板に小包。
  // 岸に着くと旗が上がり、窓に灯りがともる。北の湖を巡って、岸から岸へ手紙を運ぶ（行き先は分からないが、どこかへ届く）
  const postSites = apart(villageSites([[136.01, 35.27], [136.045, 35.35], [136.095, 35.43], [136.21, 35.4], [136.272, 35.36], [136.24, 35.31]], 110), [...HALL.libSites, ...HALL.cinSites, ...HALL.musSites, ...HALL.floSites, ...HALL.teaSites]);
  setCur("post");
  let postH = null,
    postFlag = null;
  {
    const g = new THREE.Group();
    raft(g, 13, 5.6, [-6.4, -3.6]);
    // 局舎：白い板壁（細い横の目地）と、格子の窓
    const wallTx = cvTex(64, 64, (c, w, h) => {
      c.fillStyle = "#eee9dd";
      c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 5) (c.fillStyle = "rgba(90,80,60,.22)"), c.fillRect(0, y, w, 1);
    });
    wallTx.wrapS = wallTx.wrapT = THREE.RepeatWrapping;
    wallTx.repeat.set(3, 2);
    const wallM = lam(0xffffff, { map: wallTx, emissive: 0x161410 });
    add(g, box(6, 0.25, 4.0), lam(0x5a3e2a), 1.2, 0.92, 0); // 土台
    for (const z of [-1.95, 1.95]) add(g, box(6, 3, 0.1), wallM, 1.2, 2.55, z);
    for (const x of [-1.75, 4.15]) add(g, box(0.1, 3, 4.0), wallM, x, 2.55, 0);
    // 窓：前に大きな窓（灯る）と細い格子、奥の仕分け棚
    const win = glowMat(0xffdfae, 1.8);
    add(g, box(3.4, 1.4, 0.04), win, 1.2, 2.7, -2.02);
    for (let k = 0; k <= 6; k++) add(g, box(0.03, 1.45, 0.06), M.dark, -0.5 + k * 0.567, 2.7, -2.05);
    add(g, box(3.45, 0.04, 0.06), M.dark, 1.2, 2.7, -2.05);
    for (const y of [1.98, 3.42]) add(g, box(3.6, 0.07, 0.12), lam(0x5a3e2a), 1.2, y, -2.05);
    const shelfTx = cvTex(64, 32, (c, w, h) => {
      c.fillStyle = "#6a4a30";
      c.fillRect(0, 0, w, h);
      for (let y = 1; y < h; y += 6)
        for (let x = 1; x < w; x += 6) {
          c.fillStyle = Math.random() < 0.55 ? ["#f1ead6", "#e9dcc0", "#d9e4ea", "#f3d9c8"][Math.floor(Math.random() * 4)] : "#3a281a";
          c.fillRect(x, y, 5, 5);
        }
    });
    add(g, box(3.2, 1.4, 0.3), lam(0xffffff, { map: shelfTx, emissive: 0x100c08 }), 1.2, 2.7, -1.6);
    // 戸口（横の小さな窓も）
    add(g, box(0.06, 2.1, 1.1), lam(0x7a2a22), -1.81, 2.1, 0.6);
    add(g, box(0.04, 0.8, 0.9), win, 4.22, 2.8, 0.2);
    // 赤い切妻屋根（薄い板2枚、軒を深く）と、細い棟・破風
    const red = lam(0xa8352c, { emissive: 0x140404, side: THREE.DoubleSide });
    for (const s of [-1, 1]) {
      const o = add(g, box(7.2, 0.08, 2.75), red, 1.2, 4.55, s * 1.2);
      o.rotation.x = s * 0.5;
    }
    add(g, box(7.3, 0.12, 0.14), lam(0x6a1e18), 1.2, 5.15, 0); // 棟
    for (const x of [-2.35, 4.75]) for (const s of [-1, 1]) {
      const o = add(g, box(0.06, 0.12, 2.8), M.white, x, 4.52, s * 1.2);
      o.rotation.x = s * 0.5; // 白い破風
    }
    // 舳先の丸い赤いポスト（胴・笠・投函口）
    const postRed = lam(0xc0322a, { emissive: 0x180404 });
    add(g, new THREE.CylinderGeometry(0.34, 0.36, 1.25, 16), postRed, -5.2, 1.45, -1.4);
    add(g, new THREE.SphereGeometry(0.36, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), postRed, -5.2, 2.07, -1.4);
    add(g, new THREE.CylinderGeometry(0.42, 0.42, 0.06, 16), postRed, -5.2, 2.08, -1.4);
    add(g, box(0.3, 0.05, 0.03), M.dark, -5.2, 1.8, -1.76);
    add(g, box(0.55, 0.12, 0.55), lam(0x3a3a3a), -5.2, 0.86, -1.4);
    // 小包と手紙の束（甲板の端に）
    const kraft = lam(0xb78a5a);
    for (const [x, z, w, h, d] of [[-4.6, 1.6, 0.8, 0.5, 0.6], [-3.8, 1.8, 0.6, 0.4, 0.5], [-4.3, 1.7, 0.5, 0.35, 0.45]]) add(g, box(w, h, d), kraft, x, 0.85 + h / 2 + (x === -4.3 ? 0.5 : 0), z);
    add(g, box(0.4, 0.15, 0.25), M.white, -3.2, 0.93, 1.9);
    // 軒下の小さな鐘と、舳先の灯り
    add(g, new THREE.CylinderGeometry(0.06, 0.14, 0.2, 10, 1, true), lam(0xb89a4a, { side: THREE.DoubleSide }), -2.05, 3.85, -2.3);
    add(g, new THREE.SphereGeometry(0.18, 10, 8), glowMat(0xffd59a, 2.2), -6.1, 1.9, 0);
    add(g, new THREE.CylinderGeometry(0.03, 0.03, 1.1, 5), M.post, -6.1, 1.35, 0);
    // 旗竿と旗（岸に着いている間だけ上がる）
    add(g, new THREE.CylinderGeometry(0.035, 0.045, 5.5, 6), M.post, 5.6, 3.6, 1.8);
    const flag = new THREE.Group();
    flag.position.set(5.6, 1.4, 1.8);
    const fg = new THREE.PlaneGeometry(1.4, 0.9, 6, 1).translate(0.7, 0, 0);
    {
      const p = fg.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 2.2) * 0.12 * p.getX(i)); // はためく形
    }
    const fm = add(flag, fg, new THREE.MeshLambertMaterial({ color: mute(0xc0322a), side: THREE.DoubleSide }), 0, 0, 0);
    add(flag, new THREE.PlaneGeometry(1.4, 0.18).translate(0.7, 0, 0.01), new THREE.MeshLambertMaterial({ color: 0xf2efe6, side: THREE.DoubleSide }), 0, 0, 0);
    flag.traverse((o) => o.isMesh && (o.userData.keep = true));
    fm.userData.keep = true;
    g.add(flag);
    postFlag = flag;
    postH = moor(g, postSites);
  }
  Object.assign(HALL, { postH, postFlag });
}
