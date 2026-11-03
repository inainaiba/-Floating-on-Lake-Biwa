/* ---------- 琵琶湖大橋（2026年11月）：北湖と南湖の境。位置は地理院のデータ（data/lake.json の bridges）
   ・作品では横の距離を1/5に縮め、建物は実物大で描くので、橋の長さ（約1.4km）は約270mになるが、高さは実物のまま。
     実物のゆるい坂をそのまま縮めると急な坂に見えるので、橋の大部分は低く平らにし、西寄りの船の通る所だけを高く持ち上げる
   ・低い所でも、操作する建物・水上建築・遊覧船がくぐれる高さ（桁の下 CLEAR）。橋脚は、船の道や水上建築の漂う道が
     橋をまたぐ所を避けて立てる。操作する建物は橋脚に当たる（48-frame-move.js が G.piers を見る）
   ・夜は橋の灯りと、行き交う車の灯り（白い前照灯・赤い尾灯）が点になって流れる。人の姿は出さない */
{
  const segs = LAKE.bridges.filter((b) => b.name.includes("琵琶湖大橋")).map((b) => b.pts);
  if (segs.length) {
    // 橋の中心線：線の端のうち、いちばん西といちばん東を結ぶ（上り・下りの2本の真ん中）
    const ends = segs.flatMap((p) => [p[0], p[p.length - 1]]).sort((a, b) => a[0] - b[0]),
      mid = (k) => [(ends[k][0] + ends[k + (k ? -1 : 1)][0]) / 2, (ends[k][1] + ends[k + (k ? -1 : 1)][1]) / 2],
      A = mid(0), // 西のたもと（堅田）
      Bq = mid(ends.length - 1), // 東のたもと（守山）
      LEN = Math.hypot(Bq[0] - A[0], Bq[1] - A[1]),
      dx = (Bq[0] - A[0]) / LEN,
      dy = (Bq[1] - A[1]) / LEN,
      px = -dy,
      py = dx;
    const CLEAR = 15, // 低い所の桁の下（水面から。実物大）
      HUMP = 26, // 船の通る所の桁の下（実物は約26m）
      WIDTH = 20, // 上り・下りを合わせた幅
      TH = 1.8, // 桁の厚み
      N = 140;
    // 湖の上にある区間（t：西のたもと 0 〜 東のたもと 1）
    let t0 = 1,
      t1 = 0;
    for (let i = 0; i <= 400; i++) {
      const t = i / 400;
      if (inLake(A[0] + dx * LEN * t, A[1] + dy * LEN * t)) (t0 = Math.min(t0, t)), (t1 = Math.max(t1, t));
    }
    const RAMP = 140 / LEN, // 岸から陸のたもとへ下りる長さ（実寸m）
      sm = (a, b, v) => {
        const u = Math.min(1, Math.max(0, (v - a) / (b - a)));
        return u * u * (3 - 2 * u);
      },
      humpAt = t0 + (t1 - t0) * 0.2, // 西寄りの高い所
      groundAt = (t) => landY(A[0] + dx * LEN * t, A[1] + dy * LEN * t),
      deckY = (t) => {
        // 桁の上の高さ（作品の y）：湖の上は CLEAR、西寄りはなだらかに HUMP まで。岸を越えると陸のたもとへ下りる
        const w = 0.13 * (t1 - t0),
          hb = Math.exp(-(((t - humpAt) / w) ** 2)),
          onLake = water.position.y + CLEAR + TH + (HUMP - CLEAR) * hb,
          land = groundAt(Math.min(1, Math.max(0, t))) + 0.6,
          k = Math.min(sm(t0 - RAMP, t0, t), 1 - sm(t1, t1 + RAMP, t));
        return land + (onLake - land) * k;
      };
    const tA = Math.max(0, t0 - RAMP),
      tB = Math.min(1, t1 + RAMP);
    // 中心線に沿った帯（左右 o0〜o1、上下 y0〜y1 は桁の上からの高さ）を形にする
    const ribbon = (o0, o1, y0, y1) => {
      const P = [],
        I = [];
      for (let i = 0; i <= N; i++) {
        const t = tA + ((tB - tA) * i) / N,
          cx = A[0] + dx * LEN * t,
          cy = A[1] + dy * LEN * t,
          h = deckY(t);
        for (const [o, y] of [
          [o0, y1],
          [o1, y1],
          [o1, y0],
          [o0, y0],
        ])
          P.push((cx + (px * o) / S) * S, h + y, (cy + (py * o) / S) * S);
      }
      for (let i = 0; i < N; i++)
        for (let k = 0; k < 4; k++) {
          const a = i * 4 + k,
            b = i * 4 + ((k + 1) % 4),
            c = a + 4,
            d = b + 4;
          I.push(a, c, b, b, c, d);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
      g.setIndex(I);
      g.computeVertexNormals();
      return g;
    };
    const grp = new THREE.Group(),
      concrete = new THREE.MeshLambertMaterial({ color: 0xc9c6bd }),
      under = new THREE.MeshLambertMaterial({ color: 0x8d8b85 }),
      rail = new THREE.MeshLambertMaterial({ color: 0xe4e2dc });
    grp.add(new THREE.Mesh(ribbon(-WIDTH / 2, WIDTH / 2, -TH, 0), concrete)); // 桁
    grp.add(new THREE.Mesh(ribbon(-0.5, 0.5, 0, 0.45), under)); // 上り・下りを分ける中央の縁石
    for (const s of [-1, 1]) grp.add(new THREE.Mesh(ribbon(s * (WIDTH / 2 - 0.25), s * (WIDTH / 2), 0, 1.1), rail)); // 欄干
    // 橋脚：船の道・水上建築の漂う道が橋をまたぐ所は空ける
    const cross = [];
    const addCross = (pts) => {
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1],
          [bx, by] = pts[i],
          ex = bx - ax,
          ey = by - ay,
          den = ex * dy - ey * dx;
        if (Math.abs(den) < 1e-9) continue;
        const qx = A[0] - ax,
          qy = A[1] - ay,
          u = (qx * dy - qy * dx) / den, // 道の上の位置
          t = (qx * ey - qy * ex) / den / LEN; // 橋の上の位置
        if (u >= 0 && u <= 1 && t >= 0 && t <= 1) cross.push(t);
      }
    };
    for (const r of typeof ROUTES !== "undefined" ? ROUTES : []) addCross(r.pts || []);
    for (const H of Object.values(G.halls || {})) for (const L of H.legs || []) addCross(L.pts);
    const piers = [],
      SP = 210, // 橋脚の間隔（実寸m。作品の中で約42）
      AV = 90 / LEN; // 道から空ける幅（片側、実寸m）
    const pierG = new THREE.CylinderGeometry(1.1, 1.3, 1, 10);
    pierG.translate(0, 0.5, 0);
    for (let s = (t0 * LEN + SP / 2) / LEN; s < t1 - 30 / LEN; s += SP / LEN) {
      if (cross.some((c) => Math.abs(c - s) < AV)) continue;
      const cx = A[0] + dx * LEN * s,
        cy = A[1] + dy * LEN * s;
      if (!inLake(cx, cy)) continue;
      piers.push([cx, cy]);
      const top = deckY(s) - TH,
        bot = water.position.y - 3;
      for (const o of [-WIDTH * 0.28, WIDTH * 0.28]) {
        const m = new THREE.Mesh(pierG, under);
        m.position.set((cx + (px * o) / S) * S, bot, (cy + (py * o) / S) * S);
        m.scale.y = top - bot;
        grp.add(m);
      }
      // 橋脚の頭をつなぐ梁
      const cap = new THREE.Mesh(new THREE.BoxGeometry(WIDTH * 0.75, 1.2, 2.4), under);
      cap.position.set(cx * S, top - 0.6, cy * S);
      cap.rotation.y = -Math.atan2(py, px);
      grp.add(cap);
    }
    scene.add(grp);
    mergeStatic(grp);
    G.piers = piers; // 48-frame-move.js：操作する建物は橋脚に当たる
    placeLog("琵琶湖大橋の橋脚", "water", piers);

    // 夜の灯り：橋の街灯（両側に一定の間隔）と、行き交う車の灯り
    const lamps = [];
    for (let s = tA + 0.01; s < tB; s += 45 / LEN)
      for (const o of [-WIDTH / 2 + 0.4, WIDTH / 2 - 0.4]) {
        const cx = A[0] + dx * LEN * s,
          cy = A[1] + dy * LEN * s;
        lamps.push((cx + (px * o) / S) * S, deckY(s) + 7, (cy + (py * o) / S) * S);
      }
    const NC = 36, // 車の灯りの数（上りと下りの合計）
      cars = Array.from({ length: NC }, (_, i) => ({ dir: i % 2 ? 1 : -1, u: Math.random(), v: 0.75 + Math.random() * 0.5, lane: Math.random() < 0.5 ? 0 : 1 })),
      LP = new Float32Array(lamps),
      CP = new Float32Array(NC * 3),
      CC = new Float32Array(NC * 3);
    const mkPts = (pos, col, size) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      const p = new THREE.Points(
        g,
        new THREE.PointsMaterial({ size, map: G.dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: true }),
      );
      p.frustumCulled = false;
      scene.add(p);
      return p;
    };
    const LC = new Float32Array(lamps.length);
    for (let i = 0; i < LC.length; i += 3) LC.set([1, 0.82, 0.55], i);
    const lampP = mkPts(LP, LC, 2.2),
      carP = mkPts(CP, CC, 1.3);
    for (let i = 0; i < NC; i++) CC.set(cars[i].dir > 0 ? [1, 0.95, 0.85] : [0.95, 0.18, 0.12], i * 3);
    carP.geometry.attributes.color.needsUpdate = true;
    const span = (tB - tA) * LEN * S;
    onFrame(133, (f) => {
      const night = Math.min(1, Math.max(0, (0.25 - f.day) / 0.15));
      lampP.visible = carP.visible = night > 0.01 && !isFar;
      if (!lampP.visible) return;
      lampP.material.opacity = night * 0.9;
      carP.material.opacity = night * 0.85;
      const late = (() => {
        const h = f.c.phase * 24;
        return h < 5 || h > 23 ? 0.35 : 1; // 夜更けは車が少ない
      })();
      for (let i = 0; i < NC; i++) {
        const c = cars[i];
        c.u = (c.u + (c.dir * f.dt * c.v * 14) / span + 1) % 1; // 約50km/h（作品の縮尺で）
        const t = tA + (tB - tA) * c.u,
          o = c.dir * (WIDTH / 4 + (c.lane ? 2 : -2)),
          cx = A[0] + dx * LEN * t,
          cy = A[1] + dy * LEN * t,
          on = i / NC < late;
        CP.set([(cx + (px * o) / S) * S, on ? deckY(t) + 0.8 : -999, (cy + (py * o) / S) * S], i * 3);
      }
      carP.geometry.attributes.position.needsUpdate = true;
    });
    G.ohashi = { grp, piers, A, B: Bq, deckY, t0, t1 }; // 確認用
  }
}
