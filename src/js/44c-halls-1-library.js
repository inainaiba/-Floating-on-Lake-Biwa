/* ---------- 湖に浮かぶ建築 1. 水上子ども図書館（道具は 44c-halls-0-common.js の HALL） ---------- */
{
  const { villageSites, mute, lam, box, add, M, glowMat, pontoon, sudareM, furin, moor, setCur } = HALL;
  // ---------- 1. 水上子ども図書館 ----------
  // 着く岸（湖西の浜を北から南へ、また戻る）：萩の浜 → 北小松 → 近江舞子の浜（白砂と松並木）→ 和邇の浜 → 堅田
  // 湖西の浜を北から南へ（集落のある所だけ）：萩の浜・安曇川・北小松・近江舞子・和邇・堅田
  const libSites = villageSites([[136.062, 35.335], [136.075, 35.3], [135.987, 35.285], [135.9755, 35.2575], [135.952, 35.195], [135.925, 35.125]], 110);
  HALL.libSites = libSites;
  setCur("lib");
  {
    const g = new THREE.Group(),
      Rr = 9;
    pontoon(g, Rr, 8);
    // 柱8本と、ヨシ葺きの大きな八角屋根（軒が深く、反り気味）
    // 柱は細く（主柱8本＋間柱16本）、上に細い桁をまわし、軒裏に細い垂木を密に並べる
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2 + Math.PI / 8,
        main = k % 3 === 0;
      add(g, new THREE.CylinderGeometry(main ? 0.08 : 0.04, main ? 0.1 : 0.05, 3.6, 6), M.post, Math.cos(a) * 6.5, 2.65, Math.sin(a) * 6.5);
    }
    add(g, new THREE.TorusGeometry(6.5, 0.06, 4, 48), M.post, 0, 4.4, 0, 0, Math.PI / 2);
    for (let k = 0; k < 64; k++) {
      const a = (k / 64) * Math.PI * 2,
        r0 = 1.4,
        r1 = 10.3,
        y0 = 8.6,
        y1 = 4.45,
        L = Math.hypot(r1 - r0, y1 - y0);
      const o = add(g, box(L, 0.05, 0.05), M.post, Math.cos(a) * (r0 + r1) / 2, (y0 + y1) / 2 - 0.08, Math.sin(a) * (r0 + r1) / 2, -a);
      o.rotateZ(-Math.atan2(y0 - y1, r1 - r0));
    }
    // 腰の高さの細い格子（読書の間の縁、柱の間の半分ほど）
    for (let k = 0; k < 96; k++) {
      const a = (k / 96) * Math.PI * 2;
      if (Math.sin(a * 2 + 1) < -0.3) continue; // ところどころ開けて、出入りの口に
      add(g, box(0.025, 0.55, 0.025), M.post, Math.cos(a) * 6.5, 1.15, Math.sin(a) * 6.5);
    }
    {
      // 屋根の反り：軒先ほど少し持ち上げて、やわらかな曲線に
      const cg = new THREE.ConeGeometry(10.5, 4.6, 8, 6, true),
        p = cg.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const r = 1 - (p.getY(i) / 4.6 + 0.5);
        p.setY(i, p.getY(i) + 0.9 * r * r * r);
      }
      cg.computeVertexNormals();
      add(g, cg, M.thatch, 0, 6.6, 0, Math.PI / 8);
    }
    // 軒下の風鈴（8つ。短冊の色はとりどり）と、二方に半ば巻き上げた簾
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      furin(g, Math.cos(a) * 8.6, 4.75, Math.sin(a) * 8.6, [0xd8634f, 0x5b8fc4, 0xe9c25a, 0x7fae6a][k % 4]);
    }
    for (const a of [Math.PI * 0.75, Math.PI * 1.75]) {
      const o = add(g, new THREE.PlaneGeometry(4.6, 1.3), sudareM, Math.cos(a) * 6.55, 3.75, Math.sin(a) * 6.55, -a + Math.PI / 2);
      add(g, new THREE.CylinderGeometry(0.06, 0.06, 4.6, 6), lam(0xb99a62), Math.cos(a) * 6.55, 3.1, Math.sin(a) * 6.55, -a + Math.PI / 2, 0, Math.PI / 2); // 巻いた所
      o.userData.x = 0;
    }
    // 床に積んだ本（いくつかの小さな山）
    for (const [x, z, n] of [[-3.6, 3.4, 4], [2.6, -4.6, 3], [-4.8, -1.4, 2]])
      for (let j = 0; j < n; j++) add(g, box(0.55 - j * 0.04, 0.09, 0.4), lam([0xc94c3c, 0xe7b84a, 0x3f7fb4, 0xe9e2cf][(j + n) % 4]), x, 0.92 + j * 0.09, z, j * 0.25);
    add(g, new THREE.CylinderGeometry(10.5, 10.6, 0.5, 8, 1, true), M.thatch, 0, 4.3, 0, Math.PI / 8); // 軒の厚み
    add(g, new THREE.ConeGeometry(1.2, 1.4, 8), M.dark, 0, 9.3, 0); // 棟の押さえ
    add(g, new THREE.CylinderGeometry(0.03, 0.03, 1.6, 4), M.dark, 0, 10.6, 0); // 細い頂の竿
    // 本棚：外向きに4面、色とりどりの背表紙
    const bookTx = cvTex(64, 64, (c, w, h) => {
      c.fillStyle = "#5b4330";
      c.fillRect(0, 0, w, h);
      const cols = ["#c94c3c", "#e7b84a", "#3f7fb4", "#5f9a4e", "#e9e2cf", "#8a5aa6", "#d77a3a", "#2f5f6f"];
      for (let y = 2; y < h; y += 16)
        for (let x = 2; x < w - 2; ) {
          const bw = 2 + Math.random() * 4;
          c.fillStyle = cols[Math.floor(Math.random() * cols.length)];
          c.fillRect(x, y + Math.random() * 3, bw, 12);
          x += bw + 0.6;
        }
    });
    const shelf = lam(0xffffff, { map: bookTx, emissive: 0x0e0a06 });
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      add(g, box(3.4, 1.8, 0.6), shelf, Math.cos(a) * 2.4, 1.75, Math.sin(a) * 2.4, -a + Math.PI / 2);
    }
    // 丸い卓と座布団、置かれた本と麦わら帽子
    add(g, new THREE.CylinderGeometry(1.3, 1.3, 0.1, 16), M.deck, 4.6, 1.3, 2.2);
    add(g, new THREE.CylinderGeometry(0.15, 0.2, 0.5, 6), M.post, 4.6, 1.05, 2.2);
    const cush = [0xd8634f, 0xe9c25a, 0x5b8fc4, 0x7fae6a];
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      add(g, box(0.8, 0.18, 0.8), lam(cush[k]), 4.6 + Math.cos(a) * 1.8, 0.95, 2.2 + Math.sin(a) * 1.8, a);
    }
    add(g, box(0.5, 0.06, 0.35), lam(0xf1e7c8), 4.4, 1.38, 2.0, 0.4);
    add(g, box(0.45, 0.05, 0.32), lam(0x3f7fb4), 4.9, 1.38, 2.5, -0.2);
    add(g, new THREE.CylinderGeometry(0.5, 0.55, 0.05, 14), lam(0xe8cf8a), -5.2, 0.9, -3.6); // 麦わら帽子のつば
    add(g, new THREE.CylinderGeometry(0.22, 0.26, 0.2, 12), lam(0xe8cf8a), -5.2, 1.0, -3.6);
    // ハンモック（柱から柱へ）
    {
      const a1 = Math.PI / 8 + Math.PI * 1.25,
        a2 = a1 + Math.PI / 4,
        p1 = new THREE.Vector3(Math.cos(a1) * 6.5, 2.4, Math.sin(a1) * 6.5),
        p2 = new THREE.Vector3(Math.cos(a2) * 6.5, 2.4, Math.sin(a2) * 6.5),
        mid = p1.clone().add(p2).multiplyScalar(0.5);
      mid.y = 1.6;
      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.32, 5), lam(0xd9c9a3)));
    }
    // 吊り灯籠（夕方に灯る）
    const lanternM = glowMat(0xffc27a, 2.4);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      add(g, new THREE.SphereGeometry(0.35, 10, 8), lanternM, Math.cos(a) * 4.5, 3.6, Math.sin(a) * 4.5);
    }
    // 床に落ちる灯り（夜、床がほの明るい）
    add(g, new THREE.CircleGeometry(6, 24), glowMat(0x553a1c, 1), 0, 0.87, 0, 0, -Math.PI / 2);
    // 三角旗：屋根の軒から旗竿へ（色とりどり。材質は色ごとに共有）
    const FLAG = [0xd8634f, 0xe9c25a, 0x5b8fc4, 0x7fae6a, 0xf2efe6].map((c) => new THREE.MeshBasicMaterial({ color: mute(c), side: THREE.DoubleSide }));
    add(g, new THREE.CylinderGeometry(0.1, 0.12, 6, 6), M.post, 11.5, 3.3, 0);
    for (let k = 0; k < 9; k++) {
      const u = k / 8,
        x = 6 + u * 5.5,
        y = 4.4 + Math.sin(u * Math.PI) * -0.8 + u * 1.5;
      const f = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.25, 0, 0), new THREE.Vector3(0.25, 0, 0), new THREE.Vector3(0, -0.6, 0)]), FLAG[k % 5]);
      f.position.set(x, y, 0);
      g.add(f);
    }
    // つないだ小舟
    add(g, box(4, 0.6, 1.4), lam(0x7a9ab0), 0, 0.3, Rr + 2, 0.15);
    HALL.libH = moor(g, libSites);
  }
}
