/* ---------- 湖に浮かぶ建築 3. 水上音楽堂（道具は 44c-halls-0-common.js の HALL） ---------- */
{
  const { R, villageSites, apart, lam, box, add, M, glowMat, pontoon, moor, setCur } = HALL;
  const { cinSites } = HALL;
  // ---------- 3. 水上音楽堂 ----------
  // 着く岸：菅浦の入江 → 海津の浜 → 月出の入江
  // 奥琵琶湖の入江を西から東へ：海津の浜 → 大浦 → 菅浦の入江 → 月出の入江 → 片山
  // 湖北の岸（集落のある所だけ）：今津・海津・大浦・菅浦・片山・塩津
  const musSites = apart(villageSites([[136.03, 35.41], [136.072, 35.462], [136.115, 35.495], [136.1335, 35.4795], [136.198, 35.455], [136.155, 35.515]], 120), cinSites);
  HALL.musSites = musSites;
  setCur("mus");
  {
    const g = new THREE.Group();
    pontoon(g, 8, 6);
    // 貝殻のように反った屋根：半球を斜めに切った殻を、舞台の後ろから前へかぶせる
    const shell = new THREE.SphereGeometry(8, 24, 12, Math.PI * 0.32, Math.PI * 1.36, 0, Math.PI * 0.5);
    {
      const p = shell.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i),
          z = p.getZ(i),
          y = p.getY(i);
        p.setY(i, y * (0.8 + 0.2 * (x / 8)) + Math.max(0, -x) * 0.25); // 開いた口（前）ほど高く反る
      }
      shell.computeVertexNormals();
      shell.rotateY(Math.PI / 2); // 開いた口を湖（前）へ
    }
    add(g, shell, lam(0xf3efe4, { side: THREE.DoubleSide, emissive: 0x1c1b18 }), 0, 0.9, 0);
    // 殻の外の細い肋骨（殻と同じ曲がり方で、21本）と、殻を受ける細い柱
    for (let k = 0; k <= 20; k++) {
      const ph = Math.PI * 0.32 + (Math.PI * 1.36 * k) / 20,
        pts = [];
      for (let j = 0; j <= 12; j++) {
        const th = (Math.PI * 0.5 * j) / 12,
          x = -8.08 * Math.cos(ph) * Math.sin(th),
          z = 8.08 * Math.sin(ph) * Math.sin(th);
        let y = 8.08 * Math.cos(th);
        y = y * (0.8 + 0.2 * (x / 8)) + Math.max(0, -x) * 0.25;
        pts.push(new THREE.Vector3(z, y + 0.9, -x)); // 殻と同じく、口を前へ回す
      }
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.04, 4), M.post));
      if (k % 4 === 0) {
        const p0 = pts[12];
        add(g, new THREE.CylinderGeometry(0.05, 0.06, Math.max(0.5, p0.y - 1.1), 5), M.post, p0.x * 0.97, (p0.y + 1.1) / 2, p0.z * 0.97);
      }
    }
    // 舞台の床（一段高い木の床）
    add(g, new THREE.CylinderGeometry(6.2, 6.2, 0.3, 6), M.deck, 0, 1.0, 0, Math.PI / 6);
    // 舞台の縁の細い段（2段の細い框）
    add(g, new THREE.TorusGeometry(6.25, 0.03, 3, 36), M.post, 0, 1.15, 0, 0, Math.PI / 2);
    // 譜面台と椅子（半円に5つ）
    for (let k = 0; k < 5; k++) {
      const a = Math.PI * (0.2 + 0.15 * k) + Math.PI;
      const x = Math.cos(a) * 3.2,
        z = Math.sin(a) * 3.2;
      add(g, new THREE.CylinderGeometry(0.03, 0.03, 1.2, 4), M.dark, x * 0.75, 1.75, z * 0.75);
      add(g, box(0.5, 0.35, 0.02), M.dark, x * 0.75, 2.3, z * 0.75, -a + Math.PI / 2, -0.3);
      add(g, box(0.5, 0.08, 0.5), lam(0x8a5a3a), x, 1.6, z);
      add(g, box(0.5, 0.5, 0.06), lam(0x8a5a3a), x * 1.08, 1.85, z * 1.08, -a + Math.PI / 2);
    }
    // 琴（長い胴）と和太鼓
    add(g, box(1.8, 0.12, 0.35), lam(0xb88c58), 1.2, 1.25, 1.6, 0.4);
    add(g, new THREE.CylinderGeometry(0.55, 0.55, 0.7, 14), lam(0x7a3a24), -1.8, 1.55, 1.2, 0, Math.PI / 2 - 0.2);
    add(g, new THREE.CircleGeometry(0.55, 14), lam(0xe9dcc0), -1.8, 1.55 + Math.sin(0.2) * 0.36, 1.2 + 0.35, 0, -0.2);
    // 舞台の灯り：殻の内側に小さな灯りを並べる
    const stageM = glowMat(0xffd59a, 2.2);
    for (let k = 0; k < 7; k++) {
      const a = Math.PI * (0.2 + (k / 6) * 0.6) + Math.PI;
      add(g, new THREE.SphereGeometry(0.22, 8, 6), stageM, Math.cos(a) * 6, 4.6, Math.sin(a) * 6);
    }
    add(g, new THREE.CircleGeometry(5.5, 24), glowMat(0x4a3418, 1), 0, 1.17, 0, 0, -Math.PI / 2);
    // 殻の口に沿って、小さな灯りを細い線でつないで下げる（垂れた弧を3つ）
    {
      const bulb = glowMat(0xffe2b0, 2.0);
      for (let k = 0; k < 3; k++)
        for (let j = 0; j <= 8; j++) {
          const u = j / 8,
            a = Math.PI * (1.2 + 0.2 * (k + u)),
            x = Math.cos(a) * 7.2,
            z = Math.sin(a) * 7.2,
            y = 6.6 - Math.sin(u * Math.PI) * 0.7;
          add(g, new THREE.SphereGeometry(0.08, 6, 4), bulb, x, y, z);
        }
    }
    // 細い幟（3本、くすんだ色の布）と、舞台の前の小さな木の段
    for (const [a, c] of [[Math.PI * 1.08, 0x6a7f9a], [Math.PI * 1.92, 0xb06a4a], [Math.PI * 0.5, 0x8a9a6a]]) {
      const x = Math.cos(a) * 7.4,
        z = Math.sin(a) * 7.4;
      add(g, new THREE.CylinderGeometry(0.03, 0.04, 5.2, 5), M.post, x, 3.4, z);
      add(g, new THREE.PlaneGeometry(0.5, 2.6), lam(c, { side: THREE.DoubleSide, emissive: 0x0c0c0c }), x + Math.cos(a + 1.57) * 0.27, 4.4, z + Math.sin(a + 1.57) * 0.27, -a);
    }
    for (let k = 0; k < 2; k++) add(g, box(2.4, 0.15, 0.5), M.deck, 6.6 - k * 0.45, 0.98 - k * 0.15, 0, 0); // 段
    // 水に浮かぶ灯籠（まわりに5つ、夕方に灯る）
    const lantM = glowMat(0xffb86a, 2.4);
    for (let k = 0; k < 5; k++) {
      const a = R() * 6.28,
        r = 11 + R() * 5;
      add(g, box(0.6, 0.6, 0.6), lantM, Math.cos(a) * r, 0.45, Math.sin(a) * r, R());
    }
    // 舞台の口を陸（浜の客席）へ向ける：中身を半回転させて、外の器に入れる
    const g2 = new THREE.Group();
    g.rotation.y = Math.PI;
    g2.add(g);
    HALL.musH = moor(g2, musSites);
    // 浜の客席：湖の舞台を向いた長椅子の列・敷物・提灯の列（人の姿はなく、置かれた物だけ）。舞台が着いている浜にだけ出す
    const bg = new THREE.Group(),
      benchM = lam(0x8a6a48),
      lantM2 = glowMat(0xffb070, 2.2);
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++) {
        const x = (k - 1.5) * 5.2 + (r % 2) * 1.2,
          z = -5 - r * 2.4;
        add(bg, box(4.2, 0.08, 0.45), benchM, x, 0.45, z);
        add(bg, box(4.2, 0.4, 0.05), benchM, x, 0.68, z - 0.22);
        for (const dx of [-1.9, 0, 1.9]) add(bg, box(0.05, 0.45, 0.4), M.dark, x + dx, 0.22, z);
      }
    for (const [x, z, c] of [[-12, -6, 0xd8634f], [12, -8, 0x5b8fc4]]) add(bg, box(2.4, 0.03, 1.7), lam(c), x, 0.03, z, 0.15);
    for (let k = 0; k < 7; k++) {
      add(bg, new THREE.CylinderGeometry(0.03, 0.03, 2.2, 4), M.post, (k - 3) * 4, 1.1, -2.8);
      add(bg, new THREE.SphereGeometry(0.2, 8, 6), lantM2, (k - 3) * 4, 2.3, -2.8);
    }
    mergeStatic(bg);
    scene.add(bg);
    // 客席の置き場所：陸の上で、家や港の防波堤・建物に重ならず、舞台から見える所。岸に沿って左右にもずらして探す（実寸 m）
    const wallNear = (x, y, r) =>
      (G.harb || []).some(([x1, y1, x2, y2]) => {
        const dx = x2 - x1,
          dy = y2 - y1,
          u = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1)));
        return Math.hypot(x - x1 - u * dx, y - y1 - u * dy) < r;
      });
    const seatSpot = (q) => {
      if (q._seat) return q._seat;
      const ca = Math.cos(q.a),
        sa = Math.sin(q.a),
        clear = (d, l) =>
          [20, 40, 60].every((k) =>
            [-1, 0, 1].every((w) => {
              const x = q.sx - ca * (d + k) - sa * (l + w * 50),
                y = q.sy - sa * (d + k) + ca * (l + w * 50);
              return !inLake(x, y) && !inRiver(x, y) && !houseNear(x, y, 22, true) && !wallNear(x, y, 40);
            }),
          );
      let best = null;
      for (const l of [0, 60, -60, 120, -120, 180, -180])
        for (let d = 6; d < 200 && !best; d += 10) if (clear(d, l)) best = [d, l];
      if (!best) best = [6, 0];
      return (q._seat = best);
    };
    placeLog("水上音楽堂の客席", "land", musSites.map((q) => { const [d, l] = seatSpot(q); return [q.sx - Math.cos(q.a) * (d + 40) - Math.sin(q.a) * l, q.sy - Math.sin(q.a) * (d + 40) + Math.cos(q.a) * l]; }));
    HALL.placeBenches = (q) => {
      const [d, l] = seatSpot(q),
        sx = q.sx - Math.cos(q.a) * d - Math.sin(q.a) * l,
        sy = q.sy - Math.sin(q.a) * d + Math.cos(q.a) * l;
      bg.position.set(sx * S, landY(sx - Math.cos(q.a) * 40, sy - Math.sin(q.a) * 40), sy * S);
      bg.rotation.y = Math.PI / 2 - q.a; // 長椅子を湖（+Z）へ向ける
    };
    G.musSeats = bg;
  }
}
