/* ---------- 名所の建築：竹生島の宝厳寺（本堂・三重塔・観音堂）と都久夫須麻神社（本殿・舟廊下・竜神拝所と湖の鳥居）、
   多景島の見塔寺（本堂・庫裏・題目塔）、彦根城（天守・太鼓門櫓・天秤櫓・西の丸三重櫓）、長浜城（天守）、
   長命寺（本堂・三重塔・鐘楼）、びわ湖ホール、琵琶湖博物館、菅浦の四足門。
   置き場所は 03b-meisho-sites.js。形は細部を省いた抽象（基壇・壁・屋根の重なり）。夜の彦根城は白壁が灯りに浮かぶ ---------- */
G.meisho = (() => {
  const L = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o }),
    tile = L(0x4c5157, { map: G.roofTex || null, side: THREE.DoubleSide }), // 瓦
    bark = L(0x5d4a3d, { side: THREE.DoubleSide }), // 檜皮葺
    shu = L(0xb4432f), // 朱塗り
    plaster = L(0xece8de), // 白壁
    wood = L(0x3b3029), // 素木・黒い板
    lacq = L(0x2a2421), // 漆
    gold = L(0xb8913f),
    lattice = L(0x1c1916),
    stone = L(0xa8a294, { side: THREE.DoubleSide }), // 石垣・基壇
    rock = L(0x77736b),
    // 彦根城は夜に灯りで浮かぶので、別の材質にして明るさを変える
    castleWall = L(0xece8de),
    castleStone = L(0xa8a294, { side: THREE.DoubleSide }),
    castleTile = L(0x4c5157, { map: G.roofTex || null, side: THREE.DoubleSide });
  const UP = new THREE.Vector3(0, 1, 0);

  // ---- 形の部品（作品の中の長さ。原点は建物の足元の中心、x が幅、z が奥行き、正面は +z）----
  const mesh = (geo, m, x = 0, y = 0, z = 0, ry = 0) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.rotation.y = ry;
    return o;
  };
  const box = (w, h, d, m, x = 0, y = 0, z = 0, ry = 0) => mesh(new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), m, x, y, z, ry);
  // 三角の面を並べた形（向きを気にしないよう、屋根の材質は両面）
  const tris = (v) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((v.length / 3) * 2), 2));
    g.computeVertexNormals();
    return g;
  };
  // 寄棟の屋根：底は w×d の長方形（y=0）、棟は長い辺に沿って高さ h
  function hipGeo(w, d, h) {
    const sw = w >= d,
      Lg = sw ? w : d,
      Dd = sw ? d : w,
      r = Math.max(0, Lg - Dd) / 2,
      P = (a, b, y) => (sw ? [a, y, b] : [b, y, a]),
      A = P(-Lg / 2, -Dd / 2, 0),
      B = P(Lg / 2, -Dd / 2, 0),
      C = P(Lg / 2, Dd / 2, 0),
      D = P(-Lg / 2, Dd / 2, 0),
      R1 = P(-r, 0, h),
      R2 = P(r, 0, h);
    return tris([...A, ...R1, ...B, ...B, ...R1, ...R2, ...D, ...C, ...R2, ...D, ...R2, ...R1, ...A, ...D, ...R1, ...B, ...R2, ...C]);
  }
  // 入母屋の屋根：下は寄棟、上に切妻を載せる。e は軒の出
  function irimoya(g, w, d, h, e, m, y) {
    g.add(mesh(hipGeo(w + 2 * e, d + 2 * e, h * 0.62), m, 0, y));
    const gl = gable(Math.max(w * 0.45, w + 2 * e - d * 0.75), (d + 2 * e) * 0.5, h * 0.69, m);
    gl.position.y = y + h * 0.31;
    g.add(gl);
  }
  // 石垣・基壇：上が w×d、下が b だけ広い四角錐台
  function frustum(w, d, h, b, m) {
    const t = [w / 2, d / 2],
      u = [w / 2 + b, d / 2 + b],
      c = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ],
      v = [];
    for (let i = 0; i < 4; i++) {
      const [ax, az] = c[i],
        [bx, bz] = c[(i + 1) % 4];
      const p0 = [ax * u[0], 0, az * u[1]],
        p1 = [bx * u[0], 0, bz * u[1]],
        p2 = [bx * t[0], h, bz * t[1]],
        p3 = [ax * t[0], h, az * t[1]];
      v.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3);
    }
    v.push(-t[0], h, -t[1], t[0], h, t[1], t[0], h, -t[1], -t[0], h, -t[1], -t[0], h, t[1], t[0], h, t[1]);
    return new THREE.Mesh(tris(v), m);
  }
  // 四角い宝形の屋根（塔の各重）：一辺 s、高さ h
  const pyramid = (s, h, m, y) => mesh(new THREE.ConeGeometry(s / Math.SQRT2, h, 4, 1).rotateY(Math.PI / 4).translate(0, h / 2, 0), m, 0, y);

  // ---- 建物の種類 ----
  // 堂：基壇・縁・柱の並ぶ壁・正面の格子戸・入母屋の屋根
  function hall(w, d, o) {
    const g = new THREE.Group(),
      h = o.h,
      base = o.base ?? 0.8;
    g.add(box(w + 2.4, base, d + 2.4, stone));
    g.add(box(w + 1.6, 0.35, d + 1.6, wood, 0, base)); // 縁
    g.add(box(w, h, d, o.wall, 0, base + 0.35));
    g.add(box(w * 0.7, h * 0.72, 0.12, lattice, 0, base + 0.35, d / 2 + 0.06)); // 正面の格子戸
    if (o.post)
      for (const sx of [-1, 1])
        for (const sz of [-1, 1]) g.add(box(0.45, h, 0.45, o.post, (sx * (w + 0.2)) / 2, base + 0.35, (sz * (d + 0.2)) / 2));
    if (o.band) g.add(box(w + 0.1, 0.35, d + 0.1, o.band, 0, base + 0.35 + h - 0.6)); // 軒下の飾りの帯
    irimoya(g, w, d, o.roofH, o.eave, o.roof, base + 0.35 + h);
    return g;
  }
  // 三重塔：各重の軸部と、四方に張り出す屋根、てっぺんの相輪
  function pagoda(s) {
    const g = new THREE.Group();
    g.add(box(s + 2, 0.9, s + 2, stone));
    let y = 0.9;
    for (let i = 0; i < 3; i++) {
      const k = 1 - i * 0.12,
        bw = s * k,
        th = i ? 2.6 : 3.2;
      g.add(box(bw, th, bw, shu, 0, y));
      g.add(box(bw * 0.55, th * 0.7, 0.1, plaster, 0, y + 0.3, bw / 2 + 0.05));
      y += th;
      g.add(pyramid(bw + 3.6, 1.3, tile, y - 0.15));
      y += 0.55;
    }
    g.add(pyramid(2.2, 1.6, tile, y));
    g.add(mesh(new THREE.CylinderGeometry(0.1, 0.16, 6, 6).translate(0, 3, 0), gold, 0, y + 1.2));
    for (let i = 0; i < 6; i++) g.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 8), gold, 0, y + 2.4 + i * 0.5));
    return g;
  }
  // 舟廊下：柱の並ぶ屋根付きの渡り廊下（長さ len）
  function corridor(len) {
    const g = new THREE.Group();
    g.add(box(len, 0.5, 3.2, wood, 0, 0.6));
    for (let x = -len / 2 + 0.6; x <= len / 2; x += 2.4)
      for (const z of [-1.4, 1.4]) g.add(box(0.3, 2.4, 0.3, wood, x, 1.1, z));
    const r = gable(len + 0.8, 4.4, 1.5, bark);
    r.position.y = 3.5;
    g.add(r);
    return g;
  }
  // 拝所：柱だけの開いた小さな堂
  function pavilion(w, d) {
    const g = new THREE.Group();
    g.add(box(w + 1.4, 0.8, d + 1.4, stone));
    g.add(box(w, 0.3, d, wood, 0, 0.8));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.4, 3, 0.4, shu, (sx * w) / 2 - sx * 0.3, 1.1, (sz * d) / 2 - sz * 0.3));
    irimoya(g, w, d, 2.4, 1, tile, 4.1);
    return g;
  }
  // 鳥居（湖の中）：笠木の反った明神鳥居を簡単に
  function torii(H, Wd) {
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      g.add(mesh(new THREE.CylinderGeometry(0.28, 0.34, H + 1.5, 10).translate(0, (H + 1.5) / 2 - 1.5, 0), shu, (s * Wd) / 2));
      g.add(mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.8, 10), lacq, (s * Wd) / 2, -0.2));
    }
    g.add(box(Wd + 1.6, 0.42, 0.35, shu, 0, H - 1.8));
    g.add(box(Wd + 2.6, 0.38, 0.62, shu, 0, H - 0.2));
    g.add(box(Wd + 3.2, 0.4, 0.7, lacq, 0, H + 0.18));
    return g;
  }
  // 題目塔：細長い石の塔と台座
  function tower() {
    const g = new THREE.Group();
    g.add(box(4.2, 0.8, 4.2, stone));
    g.add(box(2.8, 1.2, 2.8, rock, 0, 0.8));
    g.add(mesh(new THREE.CylinderGeometry(0.75, 1.0, 8.5, 4, 1).rotateY(Math.PI / 4).translate(0, 4.25, 0), rock, 0, 2));
    g.add(pyramid(1.6, 1.1, rock, 10.5));
    return g;
  }
  // 天守・櫓：石垣の上に、白壁と黒い腰板の各重。屋根は各重の寄棟に千鳥破風、最上重は入母屋と鯱
  function keep(w, d, tiers, base, o = {}) {
    const g = new THREE.Group(),
      wallM = o.wall || castleWall,
      roofM = o.roof || castleTile;
    g.add(frustum(w + 1, d + 1, base, base * 0.28, o.stone || castleStone));
    let y = base,
      tw = w,
      td = d;
    tiers.forEach((th, i) => {
      g.add(box(tw, th, td, wallM, 0, y));
      g.add(box(tw + 0.06, Math.min(1.1, th * 0.28), td + 0.06, wood, 0, y)); // 腰板
      for (const sz of [-1, 1]) g.add(box(tw * 0.5, 0.7, 0.08, lattice, 0, y + th * 0.5, (sz * td) / 2 + sz * 0.05)); // 窓の列
      y += th;
      const last = i === tiers.length - 1,
        e = last ? 1.3 : 1.6;
      if (last) {
        irimoya(g, tw, td, 3.2, e, roofM, y);
        for (const sx of [-1, 1]) g.add(box(0.5, 1, 0.4, lacq, (sx * Math.max(tw * 0.45, tw + 2 * e - td * 0.75)) / 2, y + 3.1)); // 鯱
      } else {
        g.add(mesh(hipGeo(tw + 2 * e, td + 2 * e, 1.7), roofM, 0, y));
        // 千鳥破風：正面と背面の屋根の上に三角の破風
        for (const sz of [-1, 1]) {
          const p = gable(1.8, tw * 0.34, 1.5, roofM);
          p.rotation.y = Math.PI / 2;
          p.position.set(0, y + 0.3, (sz * (td / 2 + e * 0.4)));
          g.add(p);
        }
        tw *= 0.74;
        td *= 0.74;
        y += 1.1;
      }
    });
    return g;
  }
  // 天秤櫓：長い一重の櫓と、両端の二重の櫓
  function tenbin(w, d) {
    const g = new THREE.Group();
    g.add(frustum(w + 1, d + 1, 4, 1.2, castleStone));
    g.add(box(w, 3.4, d, castleWall, 0, 4));
    g.add(box(w + 0.06, 1, d + 0.06, wood, 0, 4));
    g.add(mesh(hipGeo(w + 2.6, d + 2.6, 2), castleTile, 0, 7.4));
    for (const sx of [-1, 1]) {
      const k = keep(8, 7, [3.4, 2.8], 0.01);
      k.position.set((sx * (w - 8)) / 2, 4, 0);
      g.add(k);
    }
    return g;
  }

  // ---- 現代の建物と、集落の門 ----
  const concrete = L(0xe9e7e2),
    glass = L(0x6f8a9c),
    metal = L(0x8d9398),
    beige = L(0xd9d2c4),
    thatch = L(0x8a7458, { side: THREE.DoubleSide }); // 茅葺
  // 白い現代の建物は湖に向いた北側がいつも日陰になるので、壁の色に比べた明るさを少し足す（南湖の街の建物と同じくらい）
  for (const m of [concrete, glass, metal, beige]) m.emissive.copy(m.color).multiplyScalar(0.2);
  // びわ湖ホール：白い壁の大きな箱、湖に向いたガラスの帯、ゆるく傾いた大屋根。大ホールは舞台の上に高い塔
  function bhall(w, d, tower) {
    const g = new THREE.Group();
    g.add(box(w, 17, d, concrete));
    g.add(box(w * 0.96, 6, 0.4, glass, 0, 1.5, d / 2));
    const roof = box(w + 5, 1.1, d + 5, metal, 0, 0, 0);
    roof.rotation.x = 0.1;
    roof.position.y = 18;
    g.add(roof);
    if (tower) g.add(box(w * 0.36, 36, d * 0.46, concrete, -w * 0.12, 0, -d * 0.18));
    return g;
  }
  // 琵琶湖博物館：低く広い棟が重なり、中ほどにガラスの高い吹き抜け
  function museum(w, d, low) {
    const g = new THREE.Group(),
      h = low ? 9 : 14;
    g.add(box(w, h, d, beige));
    g.add(box(w * 0.55, h + 4, d * 0.5, concrete, w * 0.18, 0, -d * 0.12));
    g.add(box(w * 1.01, 0.8, d * 1.01, metal, 0, h - 0.8));
    if (!low) g.add(box(w * 0.24, h + 9, d * 0.3, glass, -w * 0.2, 0, d * 0.12));
    return g;
  }
  // 菅浦の四足門：四本の脚の上に、茅葺の屋根をのせた集落の入口の門
  function gate(w, d) {
    const g = new THREE.Group();
    for (const sx of [-1, 1]) {
      g.add(box(0.5, 4.2, 0.5, wood, (sx * w) / 2 * 0.62, 0, 0)); // 本柱
      for (const sz of [-1, 1]) g.add(box(0.35, 3.6, 0.35, wood, (sx * w) / 2 * 0.62, 0, (sz * d) / 2 * 0.7)); // 控柱
    }
    g.add(box(w * 0.8, 0.45, 0.5, wood, 0, 3.8, 0)); // 冠木
    g.add(mesh(hipGeo(w + 1.6, d + 1.8, 2.6), thatch, 0, 4.1));
    g.add(box(w * 0.5, 0.5, 0.7, thatch, 0, 6.5, 0)); // 棟
    return g;
  }

  function build(p) {
    switch (p.k) {
      case "hondo":
        return hall(p.w, p.d, { h: 5.2, wall: plaster, post: shu, band: shu, roof: tile, roofH: 5.6, eave: 2.2 });
      case "pagoda":
        return pagoda(p.w);
      case "kannon":
        return hall(p.w, p.d, { h: 4.4, wall: wood, roof: bark, roofH: 4.4, eave: 1.8 });
      case "honden":
        return hall(p.w, p.d, { h: 4, wall: lacq, post: lacq, band: gold, roof: bark, roofH: 4.2, eave: 1.6, base: 1.2 });
      case "haisho":
        return pavilion(p.w, p.d);
      case "temple":
        return hall(p.w, p.d, { h: 3.2, wall: wood, post: wood, roof: tile, roofH: 3.4, eave: 1.3, base: 0.6 });
      case "kuri":
        return hall(p.w, p.d, { h: 3, wall: plaster, roof: tile, roofH: 3, eave: 1, base: 0.5 });
      case "daimoku":
        return tower();
      case "tenshu": {
        const g = keep(p.w, p.d, [4.6, 4.2, 3.8], 6.5);
        const wing = keep(10, 5.5, [3.4], 4.4); // 附櫓と多聞櫓（天守の脇に低く続く）
        wing.position.set(p.w / 2 + 4.5, 0, p.d * 0.15);
        g.add(wing);
        return g;
      }
      case "taikomon":
        return keep(p.w, p.d, [3.4, 3], 4.5);
      case "tenbin":
        return tenbin(p.w, p.d);
      case "sanju":
        return keep(p.w, p.d, [3.4, 3, 2.6], 5);
      case "nagahama": // 長浜城：低い石垣の上に、三重の天守と最上階の望楼（昭和の再建。夜は灯らない）
        return keep(p.w, p.d, [4.2, 3.7, 3.2, 2.7], 3.5, { wall: plaster, roof: tile, stone });
      case "chomeiji": // 長命寺の本堂：檜皮葺の大きな屋根
        return hall(p.w, p.d, { h: 5, wall: wood, post: wood, roof: bark, roofH: 6.4, eave: 2.6, base: 1.4 });
      case "belfry": {
        // 鐘楼：柱の上の屋根と、吊られた梵鐘
        const g = pavilion(p.w, p.d);
        g.add(mesh(new THREE.CylinderGeometry(0.9, 1.15, 2, 12), lacq, 0, 2.6));
        return g;
      }
      case "bhall":
        return bhall(p.w, p.d, p.tower);
      case "museum":
        return museum(p.w, p.d, p.low);
      case "gate":
        return gate(p.w, p.d);
    }
    return new THREE.Group();
  }

  const root = new THREE.Group();
  scene.add(root);
  const gnd = (m, x, y) => (m.isle ? isleH(x, y) ?? 0 : landY(x, y));
  for (const m of MEISHO) {
    const site = new THREE.Group();
    site.userData.c = [m.ax * S, m.ay * S]; // 名所の中心（遠いときは描かない）
    root.add(site);
    for (const p of m.parts) {
      const a = (p.a * Math.PI) / 180,
        ux = Math.cos(a),
        uy = Math.sin(a),
        hw = p.w / 2 / S,
        hd = p.d / 2 / S;
      // 足元の高さ：中心といちばん高い隅の中ほどに据え（山側は斜面に少し埋まる）、いちばん低い隅まで石垣を下ろす（斜面に建つため）
      const hs = [[0, 0], [-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => gnd(m, p.x + ux * hw * i - uy * hd * j, p.y + uy * hw * i + ux * hd * j)),
        top = (hs[0] + Math.max(...hs)) / 2,
        low = Math.min(...hs);
      const g = build(p);
      if (top - low > 0.3) {
        const H = top - low + 1,
          f = frustum(p.w + 2.4, p.d + 2.4, H, Math.min(3, H * 0.18), m.isle ? stone : castleStone);
        f.position.y = -H;
        g.add(f);
      }
      g.position.set(p.x * S, top, p.y * S);
      g.quaternion.setFromAxisAngle(UP, -a);
      site.add(g);
      placeLog(m.name + "の建物", "land", [[p.x, p.y]]);
    }
    // 竹生島：竜神拝所の下の湖に鳥居（かわらけ投げの鳥居）。拝所からいちばん近い岸へ出て、少し沖に立てる
    if (m.name === "竹生島") {
      const p = m.parts.find((q) => q.k === "haisho");
      let best = null;
      for (let t = 0; t < Math.PI * 2; t += 0.05)
        for (let r = 5; r < 600; r += 5)
          if (isleH(p.x + Math.cos(t) * r, p.y + Math.sin(t) * r) === null) {
            if (!best || r < best[1]) best = [t, r];
            break;
          }
      if (best) {
        const [t, r] = best,
          x = p.x + Math.cos(t) * (r + 9 / S),
          y = p.y + Math.sin(t) * (r + 9 / S),
          g = torii(6.5, 4.6);
        g.position.set(x * S, 0, y * S);
        g.quaternion.setFromAxisAngle(UP, -(t - Math.PI / 2));
        site.add(g);
        placeLog("竹生島の鳥居", "water", [[x, y]]);
      }
    }
    site.traverse((o) => {
      if (o.isMesh) o.castShadow = o.receiveShadow = true;
    });
    mergeStatic(site); // 材質ごとに束ねて描画の回数を減らす
  }
  const NIGHT = new THREE.Color(0xffe6c4);
  return {
    root,
    // 夜の彦根城：白壁と石垣が灯りに浮かぶ
    update(day) {
      // 9km（作品の中で1800）より遠い名所は描かない（霞に溶けて見えず、描画の回数だけが増えるため）
      const cp = camera.position;
      for (const g of root.children) g.visible = Math.hypot(g.userData.c[0] - cp.x, g.userData.c[1] - cp.z) < 1800;
      const k = Math.min(1, Math.max(0, (0.2 - day) / 0.12));
      castleWall.emissive.copy(NIGHT).multiplyScalar(0.55 * k);
      castleStone.emissive.copy(NIGHT).multiplyScalar(0.12 * k);
      castleTile.emissive.copy(NIGHT).multiplyScalar(0.06 * k);
    },
  };
})();
