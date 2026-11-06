/* ---------- 湖に浮かぶ建築 5. 水上茶屋（道具は 44c-halls-0-common.js の HALL） ---------- */
{
  const { villageSites, apart, lam, box, add, M, glowMat, moor, raft, curvedRoof, steamPuff, setCur } = HALL;
  // ---------- 5. 水上茶屋 ----------
  // 反った宝形の杉皮葺きの屋根に、藍の暖簾。畳の間と、緋毛氈の縁台、赤い野点傘。岸に着くと釜から湯気が立ち、行灯が灯る。
  // 人の姿はなく、湯気と灯りと、ときどき湯の沸く音で、お茶を点てる誰かの気配。湖東の中ほど（野洲〜近江八幡〜能登川）の集落を巡る
  const teaSites = apart(villageSites([[136.04, 35.15], [136.11, 35.205], [136.17, 35.195], [136.065, 35.16]], 110), [...HALL.libSites, ...HALL.cinSites, ...HALL.musSites, ...HALL.floSites]);
  HALL.teaSites = teaSites;
  setCur("tea");
  let teaH = null,
    teaSteam = null;
  {
    const g = new THREE.Group();
    raft(g, 12, 8, [-1.6, 1.6]);
    // 畳の台（一段高い）：淡い若草色に、細い黒の縁
    const tatamiTx = cvTex(64, 32, (c, w, h) => {
      c.fillStyle = "#c9c79a";
      c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 2) (c.fillStyle = `rgba(90,95,50,${(0.06 + Math.random() * 0.06).toFixed(2)})`), c.fillRect(0, y, w, 1);
      c.fillStyle = "#2b2a24";
      c.fillRect(0, 0, w, 2);
      c.fillRect(0, h - 2, w, 2);
      c.fillRect(w / 2 - 1, 0, 2, h);
    });
    tatamiTx.wrapS = tatamiTx.wrapT = THREE.RepeatWrapping;
    tatamiTx.repeat.set(3, 2);
    add(g, box(7, 0.35, 5), M.deck, 0.6, 1.0, 0.6);
    add(g, box(6.8, 0.02, 4.8), lam(0xffffff, { map: tatamiTx, emissive: 0x0c0c08 }), 0.6, 1.19, 0.6);
    // 柱：四隅の細い角柱と、間の細い柱。上に細い桁と、軒裏の細い垂木
    const postM = lam(0x5a3e2a);
    for (const x of [-2.9, 4.1]) for (const z of [-1.9, 3.1]) add(g, box(0.12, 3.4, 0.12), postM, x, 2.85, z);
    for (const x of [-0.6, 1.8]) for (const z of [-1.9, 3.1]) add(g, box(0.07, 3.4, 0.07), postM, x, 2.85, z);
    for (const z of [-1.9, 3.1]) add(g, box(7.2, 0.12, 0.1), postM, 0.6, 4.5, z);
    for (const x of [-2.9, 4.1]) add(g, box(0.1, 0.12, 5.2), postM, x, 4.5, 0.6);
    for (let k = 0; k < 30; k++) add(g, box(0.03, 0.04, 6.6), M.post, -3.6 + k * 0.29, 4.62, 0.6); // 垂木
    // 屋根：杉皮のこげ茶、軒は深く薄い。頂に小さな宝珠
    const barkTx = cvTex(64, 64, (c, w, h) => {
      c.fillStyle = "#4e3a2a";
      c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 4) (c.fillStyle = `rgba(20,12,6,${(0.25 + Math.random() * 0.2).toFixed(2)})`), c.fillRect(0, y, w, 1);
      for (let i = 0; i < 120; i++) (c.fillStyle = "rgba(120,95,70,.25)"), c.fillRect(Math.random() * w, Math.random() * h, 1, 3);
    });
    barkTx.wrapS = barkTx.wrapT = THREE.RepeatWrapping;
    barkTx.repeat.set(4, 3);
    const roofM = lam(0xffffff, { map: barkTx, emissive: 0x0a0604, side: THREE.DoubleSide });
    const rf = curvedRoof(10.4, 8.4, 3.0, roofM);
    rf.position.set(0.6, 6.0, 0.6);
    g.add(rf);
    add(g, box(10.4 * 0.71, 0.06, 0.08), M.post, 0.6, 4.62, 0.6 - 8.4 * 0.355); // 軒先の細い鼻隠し（前）
    add(g, box(10.4 * 0.71, 0.06, 0.08), M.post, 0.6, 4.62, 0.6 + 8.4 * 0.355);
    add(g, new THREE.CylinderGeometry(0.22, 0.32, 0.25, 8), M.dark, 0.6, 7.55, 0.6); // 露盤
    add(g, new THREE.SphereGeometry(0.2, 10, 8), lam(0x8a7a4a), 0.6, 7.85, 0.6); // 宝珠
    // 藍の暖簾：正面の口に3枚（裾を少し揺らした形）
    const indigo = lam(0x2c3e62, { side: THREE.DoubleSide, emissive: 0x05080e });
    for (let k = 0; k < 3; k++) {
      const n = add(g, new THREE.PlaneGeometry(0.95, 1.3), indigo, -0.4 + k * 1.0, 3.75, -1.95, 0, 0.06 * (k - 1));
      n.rotation.z = 0.02 * (k - 1);
    }
    add(g, new THREE.CylinderGeometry(0.025, 0.025, 3.4, 5), M.post, 0.6, 4.4, -1.95, 0, 0, Math.PI / 2); // 暖簾の竿
    // 奥の簾（細い竹を密に）
    const sudareTx = cvTex(64, 64, (c, w, h) => {
      c.fillStyle = "rgba(0,0,0,0)";
      c.clearRect(0, 0, w, h);
      for (let x = 0; x < w; x += 3) (c.fillStyle = "#b99a62"), c.fillRect(x, 0, 2, h);
      for (let y = 10; y < h; y += 20) (c.fillStyle = "#5a4630"), c.fillRect(0, y, w, 1);
    });
    add(g, new THREE.PlaneGeometry(6.8, 2.2), lam(0xffffff, { map: sudareTx, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }), 0.6, 3.25, 3.1);
    // 茶道具：炉と釜、棚、茶碗（小さな物を少しだけ）
    add(g, box(0.9, 0.3, 0.9), lam(0x3a2c22), 1.6, 1.35, 1.4);
    add(g, new THREE.SphereGeometry(0.32, 12, 8), lam(0x2a2826), 1.6, 1.72, 1.4); // 釜
    add(g, box(1.6, 0.06, 0.45), postM, -1.6, 1.9, 2.6); // 棚
    add(g, box(1.6, 0.06, 0.45), postM, -1.6, 1.4, 2.6);
    for (const [x, c] of [[-2.1, 0x2f4e44], [-1.6, 0xd9cfb8], [-1.1, 0x6a3a2a]]) add(g, new THREE.CylinderGeometry(0.11, 0.08, 0.12, 10), lam(c), x, 2.0, 2.6);
    // 縁台と緋毛氈、赤い野点傘（前の甲板）
    const felt = lam(0xb8322a, { emissive: 0x140404 });
    for (const [x, z, r] of [[-4.2, -2.4, 0.1], [-4.6, 1.2, -0.15]]) {
      add(g, box(2.4, 0.08, 0.9), postM, x, 1.3, z, r);
      add(g, box(2.4, 0.03, 0.9), felt, x, 1.36, z, r);
      for (const dx of [-1, 1]) for (const dz of [-0.35, 0.35]) add(g, box(0.06, 0.5, 0.06), postM, x + dx * Math.cos(r) + dz * Math.sin(r), 1.05, z - dx * Math.sin(r) + dz * Math.cos(r));
    }
    add(g, new THREE.CylinderGeometry(0.035, 0.035, 3.6, 5), postM, -4.6, 2.6, -0.6);
    const kasa = new THREE.ConeGeometry(2.3, 0.9, 20, 1, true);
    add(g, kasa, lam(0xc23a2c, { side: THREE.DoubleSide, emissive: 0x160404 }), -4.6, 4.2, -0.6);
    for (let k = 0; k < 20; k++) {
      const a = (k / 20) * Math.PI * 2;
      add(g, box(2.25, 0.02, 0.02), M.dark, -4.6 + Math.cos(a) * 1.12, 4.0, -0.6 + Math.sin(a) * 1.12, -a, 0, -0.37); // 傘の骨
    }
    // 行灯（夕方に灯る）と、軒下の小さな提灯
    const andon = glowMat(0xffd7a0, 2.0);
    for (const [x, z] of [[-2.6, -1.6], [3.8, 2.8]]) {
      add(g, box(0.45, 0.7, 0.45), andon, x, 1.6, z);
      add(g, box(0.5, 0.04, 0.5), M.dark, x, 1.97, z);
    }
    const chochin = glowMat(0xffb070, 2.2);
    for (let k = 0; k < 5; k++) add(g, new THREE.SphereGeometry(0.16, 10, 8).scale(1, 1.3, 1), chochin, -2.4 + k * 1.5, 4.05, -2.15);
    add(g, new THREE.CircleGeometry(3.2, 20), glowMat(0x4a3418, 1), 0.6, 1.21, 0.6, 0, -Math.PI / 2); // 畳に落ちる灯り
    // つないだ小舟
    add(g, box(3.4, 0.5, 1.2), lam(0x6f8a7a), 0, 0.3, 5.4, 0.1);
    teaH = moor(g, teaSites);
    teaSteam = steamPuff(teaH.g, 1.6, 2.0, 1.4); // 釜の上（舟の中の位置。舟と一緒に動く）
  }
  Object.assign(HALL, { teaH, teaSteam });
}
