/* ---------- 湖に浮かぶ建築：屋根の鳥とカモ（かすかなユーモア）・確認用の窓口・毎コマの更新（揺れ・灯り・上映・近くの音） ---------- */
{
  const { lam, box, add, lit, halls, place } = HALL;
  const { libH, cinH, musH, floH, teaH, postH, galH, placeScreen, screenU, beam, placeBenches, floUpdate, teaSteam, postFlag } = HALL;
  // ---------- かすかなユーモア：屋根の鳥と、郵便局の舟を追うカモ ----------
  // ・ハクセキレイが一羽、どれかの水上建築の屋根にとまって、しばらく一緒に漂う（日ごとに、とまる建築と時刻が変わる。とまらない日もある）
  // ・郵便局の舟が漂って移る日の一部は、カモが三羽、少し遅れて後ろをついていく
  const birdM = { w: lam(0xe8e6e0), k: lam(0x2a2a2a), g: lam(0x8a8a86) };
  const bird = new THREE.Group();
  {
    add(bird, new THREE.SphereGeometry(0.16, 10, 8).scale(1, 0.85, 1.7), birdM.w, 0, 0.16, 0); // 胴（白）
    add(bird, new THREE.SphereGeometry(0.15, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.5, 1.6), birdM.k, 0, 0.2, -0.02); // 背（黒）
    add(bird, new THREE.SphereGeometry(0.09, 10, 8), birdM.w, 0, 0.3, 0.27); // 頭
    add(bird, new THREE.SphereGeometry(0.07, 8, 6).scale(1, 0.6, 1), birdM.k, 0, 0.36, 0.25); // 頭の黒
    add(bird, new THREE.ConeGeometry(0.02, 0.07, 4), birdM.g, 0, 0.3, 0.37, 0, Math.PI / 2); // 嘴
    add(bird, box(0.07, 0.02, 0.4), birdM.k, 0, 0.2, -0.38, 0, 0.25); // 長い尾
    for (const x of [-0.05, 0.05]) add(bird, new THREE.CylinderGeometry(0.008, 0.008, 0.12, 3), birdM.g, x, 0.05, 0.02);
  }
  bird.traverse((o) => o.isMesh && (o.userData.keep = true));
  bird.visible = false;
  const tail = bird.children[5];
  // とまる所（それぞれの水上建築の中の位置）：図書館の屋根・茶屋の宝珠・郵便局の棟・花屋の日よけ・音楽堂の殻の頂
  const PERCH = [
    [libH, () => libH.g, [1.6, 8.25, 0]],
    [teaH, () => teaH.g, [0.6, 8.05, 0.6]],
    [postH, () => postH.g, [2.0, 5.22, 0]],
    [floH, () => floH.g, [2.0, 4.0, 0]],
    [musH, () => musH.g.children[0], [0, 7.3, 0]],
  ];
  const hsh = (n) => {
    const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  let perchK = -1;
  const duckM = { b: lam(0x7a6650), h: lam(0x2f5a3e), w: lam(0xd8d4c8), y: lam(0xd0a040) };
  const ducks = [];
  for (let i = 0; i < 3; i++) {
    const d = new THREE.Group();
    add(d, new THREE.SphereGeometry(0.28, 10, 8).scale(1, 0.62, 1.55), duckM.b, 0, 0.1, 0);
    add(d, new THREE.SphereGeometry(0.14, 10, 8), i ? duckM.b : duckM.h, 0, 0.38, 0.36); // 先頭は雄（緑の頭）
    add(d, new THREE.ConeGeometry(0.05, 0.16, 4).scale(1.4, 0.5, 1), duckM.y, 0, 0.35, 0.52, 0, Math.PI / 2);
    add(d, box(0.14, 0.06, 0.18), duckM.w, 0, 0.18, -0.45, 0, -0.3);
    d.visible = false;
    d.userData.noRefl = false;
    scene.add(d);
    ducks.push(d);
  }
  G.humor = { bird, ducks, perch: () => perchK }; // 確認用
  function humorUpdate(t, c, h) {
    // 屋根の鳥：作品の一日ごとに、どの建築にとまるか・とまるかどうかを決める。昼（7〜16時）だけ
    const day = Math.floor(c.t / DAY),
      want = hsh(day) < 0.55 && h > 7 + hsh(day + 3) * 3 && h < 13 + hsh(day + 5) * 3 ? Math.floor(hsh(day + 7) * PERCH.length) : -1;
    if (want !== perchK) {
      // 近くで見ているときは、急に現れたり消えたりしないよう待つ
      const near = perchK >= 0 && Math.hypot(PERCH[perchK][0].x - camera.position.x, PERCH[perchK][0].z - camera.position.z) < 40;
      const nearW = want >= 0 && Math.hypot(PERCH[want][0].x - camera.position.x, PERCH[want][0].z - camera.position.z) < 40;
      if (!near && !nearW) {
        perchK = want;
        if (want >= 0) {
          const [, par, p] = PERCH[want];
          par().add(bird);
          bird.position.set(...p);
        }
        bird.visible = want >= 0;
      }
    }
    if (bird.visible) {
      // ときどき向きを変え、尾を上下に振る
      bird.rotation.y = Math.floor(t / 7) % 3 === 0 ? 0.6 : Math.floor(t / 7) % 3 === 1 ? -1.2 : 2.4;
      tail.rotation.x = 0.25 + Math.max(0, Math.sin(t * 9)) * 0.35;
    }
    // カモ：郵便局が漂って移る日の半分ほど、後ろをついていく（昼）
    const go = postH.mv > 0.2 && hsh(day + 11) < 0.5 && h > 6 && h < 17 && !isFar;
    for (let i = 0; i < 3; i++) {
      const d = ducks[i];
      d.visible = go;
      if (!go) continue;
      const back = 9.5 + i * 2.4 + Math.sin(t * 0.8 + i) * 0.4,
        side = (i - 1) * 1.1 + Math.sin(t * 0.5 + i * 2) * 0.3,
        px = postH.x - postH.dx * back - postH.dy * side,
        pz = postH.z - postH.dy * back + postH.dx * side;
      d.position.set(px, water.position.y + 0.02 + Math.sin(t * 2.1 + i) * 0.03, pz);
      d.rotation.y = Math.atan2(postH.dx, postH.dy);
    }
  }

  G.waterU = waterU; // 確認用
  G.halls = { lib: libH, cin: cinH, mus: musH, flo: floH, tea: teaH, post: postH, gal: galH }; // 確認用（いまの位置・岸に着いているか）
  // 全体地図の印（28-map.js）：地図を開いている間は毎コマの更新が止まるので、ここで共有時計から位置を求め直す
  G.hallMarks = () => {
    const ct = clock().t;
    return [
      ["lib", libH],
      ["cin", cinH],
      ["mus", musH],
      ["flo", floH],
      ["tea", teaH],
      ["post", postH],
      ["gal", galH],
    ].filter(([, H]) => H).map(([k, H]) => (place(H, ct), { k, x: H.px, y: H.py, moored: H.moored, rot: H.rot }));
  };
  let scrSite = -1,
    musSite = -1;
  // 毎フレーム：波にゆっくり揺れ、日暮れに灯り、夏の夜は上映、近づくと音
  const OFF = new THREE.Color(0x3a3630);
  let nextPage = 0,
    nextKettle = 0,
    nextBell = 0,
    nextTune = 0,
    nextClick = 0;
  let wkH = null; // 航跡を描いている水上建築
  onFrame(132, (f) => {
    const t = f.t,
      c = f.c,
      h = c.phase * 24,
      lt = Math.min(1, Math.max(0, (0.22 - f.day) / 0.12)),
      late = h < 5 || h > 22.8 ? 0.15 : 1; // 夜更けは灯りを落とす
    for (const H of halls) {
      place(H, c.t);
      H.x = H.px * S;
      H.z = H.py * S;
      H.g.position.x = H.x;
      H.g.position.z = H.z;
      H.g.rotation.y = H.rot;
      H.g.position.y = H.y0 + water.position.y + Math.sin(t * 0.7 + H.ph) * 0.12;
      H.g.rotation.z = Math.sin(t * 0.5 + H.ph) * 0.012 * (RM ? 0.3 : 1);
      H.g.rotation.x = Math.sin(t * 0.43 + H.ph * 2) * 0.01 * (RM ? 0.3 : 1);
    }
    {
      // 漂う間の航跡：カメラに近い1つだけ、後ろにうっすら八の字を描く（14-water.js）。切り替えは一度消してから
      let best = null,
        bd = 1e12;
      for (const H of halls) {
        if (H.mv < 0.02) continue;
        const d = (H.x - camera.position.x) ** 2 + (H.z - camera.position.z) ** 2;
        if (d < bd) (bd = d), (best = H);
      }
      const u = waterU.uHW.value,
        k = Math.min(1, f.dt * 1.5);
      if (best !== wkH && u.w > 0.02) u.w = Math.max(0, u.w - f.dt * 0.8);
      else {
        wkH = best;
        u.w += ((best ? best.mv * 0.85 : 0) - u.w) * k;
      }
      if (wkH) {
        u.x = wkH.x;
        u.y = wkH.z;
        u.z = 10;
        waterU.uHD.value.set(wkH.dx, wkH.dy);
      }
    }
    const useOf = { lib: libH.use, cin: cinH.use, mus: musH.use, flo: floH.use, tea: teaH.use, post: postH.use, gal: 1 }; // ギャラリーは漂う間も、夜は灯る
    // 茶屋：岸に着いている昼〜夜（7〜21時）は、釜から湯気。郵便局：着いている間は旗が上がる
    teaSteam(t, h > 7 && h < 21 && f.wxNow.rain < 0.5 ? teaH.use : 0);
    postFlag.position.y = 1.4 + 4.6 * (postH.use * postH.use * (3 - 2 * postH.use));
    postFlag.rotation.y = Math.sin(t * 1.3) * 0.15;
    floUpdate(c, t);
    humorUpdate(t, c, h);
    for (const m of lit) m.color.lerpColors(OFF, m.userData.on, lt * late * (0.2 + 0.8 * useOf[m.userData.owner])); // 漂う間は灯りを落とす
    // 映画館：着いた岸に客席を出す
    if (cinH.moored && cinH.site !== scrSite) placeScreen(cinH.sites[(scrSite = cinH.site)]);
    G.cinParts.sg.visible = cinH.moored; // 陸の客席は、幕の舟が着いている岸にだけ
    {
      // 幕を立てる・たたむ：着いてしばらくして立ち上がり、離れる前にたたむ（use の0→1に合わせて）
      const u = cinH.use,
        e = u * u * (3 - 2 * u);
      G.cinRig.rig.scale.y = Math.max(0.02, e);
      G.cinRig.rig.visible = e > 0.03;
      G.cinRig.roll.visible = e < 0.6;
    }
    if (musH.moored && musH.site !== musSite) placeBenches(musH.sites[(musSite = musH.site)]);
    G.musSeats.visible = musH.moored;
    // 上映：夏（6〜9月）の夜、19時半〜22時半
    const show = (c.month >= 5 && c.month <= 8 && h > 19.5 && h < 22.5 ? Math.min(1, (h - 19.5) / 0.15, (22.5 - h) / 0.15) * lt : 0) * cinH.use;
    screenU.uT.value = t;
    screenU.uOn.value = show;
    if (beam) {
      beam.visible = show > 0.01;
      beam.material.opacity = show * (0.07 + 0.015 * Math.sin(t * 23));
    }
    // 近くの音
    if (!SND.ctx || !SND.on || isFar || (SND.quiet || 0) > 0.3) return;
    const now = SND.ctx.currentTime,
      dOf = (H) => (H.use > 0.5 ? Math.hypot(H.x - camera.position.x, H.z - camera.position.z) : 1e9); // 音は岸に着いて使われている間だけ
    const dl = dOf(libH),
      dm = dOf(musH),
      dc = dOf(cinH),
      lib = { x: libH.px, y: libH.py },
      mus = { x: musH.px, y: musH.py },
      cin = { x: cinH.px, y: cinH.py };
    const dt_ = dOf(teaH),
      dp = dOf(postH);
    // 茶屋：釜の湯の沸く、ごく小さな音（昼〜夜）
    if (dt_ < 90 && h > 7 && h < 21 && now > nextKettle) {
      nextKettle = now + 6 + Math.random() * 10;
      nburst(900, 200, 1.6, 0.03 * (1 - dt_ / 90), panV(teaH.x, teaH.z), 0.4, 0.3);
    }
    // 郵便局：ときどき小さな鐘（昼）
    if (dp < 200 && h > 8 && h < 17 && now > nextBell) {
      nextBell = now + 50 + Math.random() * 60;
      const ac = SND.ctx,
        o = ac.createOscillator(),
        e = ac.createGain(),
        pn = ac.createStereoPanner();
      o.type = "sine";
      o.frequency.value = 1760;
      pn.pan.value = panV(postH.x, postH.z) * 0.7;
      e.gain.setValueAtTime(0, now);
      e.gain.linearRampToValueAtTime(0.03 * (1 - dp / 200), now + 0.005);
      e.gain.exponentialRampToValueAtTime(1e-4, now + 1.4);
      o.connect(e).connect(pn).connect(SND.master);
      o.start(now);
      o.stop(now + 1.5);
    }
    // 図書館：ページをめくる音（昼〜夕方）
    if (dl < 120 && h > 9 && h < 19 && now > nextPage) {
      nextPage = now + 4 + Math.random() * 9;
      nburst(6000, 1800, 0.18, 0.05 * (1 - dl / 120), panV(lib.x * S, lib.y * S), 0.5, 0.2);
    }
    // 映画館：映写機のカタカタ（上映中）
    if (show > 0.5 && dc < 160 && now > nextClick) {
      nextClick = now + 0.09;
      nburst(3000, 900, 0.025, 0.018 * (1 - dc / 160), panV(cin.x * S, cin.y * S), 1.5, 0.1);
    }
    // 音楽堂：ときどき遠くで練習の旋律（笛か琴、5〜8音の短い句）
    if (dm < 350 && h > 10 && h < 21 && now > nextTune) {
      nextTune = now + 40 + Math.random() * 70;
      const ac = SND.ctx,
        out = ac.createStereoPanner(),
        g0 = ac.createGain(),
        flute = Math.random() < 0.5,
        scale = [0, 2, 5, 7, 9, 12, 14],
        base = flute ? 74 : 62,
        n = 5 + Math.floor(Math.random() * 4);
      out.pan.value = panV(mus.x * S, mus.y * S) * 0.7;
      g0.gain.value = 0.5 * (1 - dm / 350);
      g0.connect(out).connect(SND.master);
      let st = now + 0.2;
      for (let k = 0; k < n; k++) {
        const f0 = 440 * Math.pow(2, (base + scale[Math.floor(Math.random() * scale.length)] - 69) / 12),
          d = flute ? 0.45 + Math.random() * 0.6 : 0.9,
          o = ac.createOscillator(),
          e = ac.createGain();
        o.type = flute ? "sine" : "triangle";
        o.frequency.value = f0;
        e.gain.setValueAtTime(0, st);
        e.gain.linearRampToValueAtTime(flute ? 0.035 : 0.05, st + (flute ? 0.08 : 0.005));
        if (flute) e.gain.setValueAtTime(0.035, st + d * 0.8);
        e.gain.exponentialRampToValueAtTime(1e-4, st + d * (flute ? 1 : 2));
        o.connect(e).connect(g0);
        o.start(st);
        o.stop(st + d * 2 + 0.1);
        st += flute ? d : 0.38 + Math.random() * 0.3;
      }
    }
  });
}
