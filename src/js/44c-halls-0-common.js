/* ---------- 湖に浮かぶ建築（2026年11月）：共通の道具 ----------
   水上子ども図書館・水上映画館・水上音楽堂・水上の花屋・水上茶屋・水上郵便局・水上ギャラリー（44c-halls-1〜7）と、
   毎コマの更新（44c-halls-8）が使う道具を HALL にまとめる。人の姿は出さず、置かれた物と灯りと音で、そこで過ごす誰かの気配を見せる。
   どれも、決まった岸に着いて使われる時と、湖を漂って次の岸へ移る時がある（共有時計で決まり、見る人みな同じ）。
   岸に着いている間だけ灯りが灯り、音がする。漂う間は灯りを落として、岸沿いの沖をゆっくり進む（ギャラリーは沖を漂う）
   ・作った建築や着く岸は、各部品が HALL に載せる（HALL.libH・HALL.libSites など）。あとの部品はそこから取り出す
   ・乱数 R は全部品で1つを順に使う（部品の順番を入れ替えると、花の位置などが変わる） */
const HALL = (() => {
  const R = rndFor("floating-halls");
  // 岸の近くの水の上の点：岸から沖へ off m。沖の向き（いちばん深い向き）も返す
  function spot(lo, la, off) {
    const [sx, sy] = shoreSnap(...ll(lo, la));
    let a = 0,
      bd = -1;
    for (let k = 0; k < 6.28; k += 0.1) {
      const d = inLake(sx + Math.cos(k) * 200, sy + Math.sin(k) * 200) ? depth(sx + Math.cos(k) * 200, sy + Math.sin(k) * 200) : -1;
      if (d > bd) (bd = d), (a = k);
    }
    // ヨシ原や港の防波堤に重なるときは、重ならない所まで沖へ出す
    const nearWall = (x, y) =>
      (G.harb || []).some(([x1, y1, x2, y2]) => {
        const dx = x2 - x1,
          dy = y2 - y1,
          u = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1)));
        return Math.hypot(x - x1 - u * dx, y - y1 - u * dy) < 90;
      });
    // 入り組んだ岸では、沖へ出しても別の岸に近いことがある：どの岸からも実寸90m（建物の大きさの分）離れるまで出す
    const tight = (x, y) => inReeds(x, y) || nearWall(x, y) || distShore(x, y, 120) < 90;
    while (off < 900 && tight(sx + Math.cos(a) * off, sy + Math.sin(a) * off)) off += 40;
    return { x: sx + Math.cos(a) * off, y: sy + Math.sin(a) * off, sx, sy, a };
  }
  // 集落のある岸だけ：岸の点から2km以内の家（22b-town-glow.js の家の集まり。画質によらない）が120軒以上ある所に着く。
  // 北の集落のない入江や、家の少ない浜には着かない
  G.hallSpot = (lo, la, off) => spot(lo, la, off); // 確認用
  // 琵琶湖大橋（45b-ohashi.js と同じ線）から実寸400m以内か
  const nearBridge = (x, y) =>
    LAKE.bridges
      .filter((b) => b.name.includes("琵琶湖大橋"))
      .some((b) =>
        b.pts.some((p, i) => {
          if (!i) return false;
          const [ax, ay] = b.pts[i - 1],
            dx = p[0] - ax,
            dy = p[1] - ay,
            u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
          return Math.hypot(x - ax - u * dx, y - ay - u * dy) < 400;
        }),
      );
  const villageSites = (cands, off) =>
    cands
      .filter(([lo, la]) => {
        const [x, y] = shoreSnap(...ll(lo, la));
        let n = 0;
        for (const t of G.towns ? G.towns.list : []) if (t.ns >= 8 && Math.hypot(t.x - x, t.y - y) < 2000) n += t.ns; // 岸の帯の家だけ数える
        return n >= 120;
      })
      .map(([lo, la]) => spot(lo, la, off))
      .filter((q) => inLake(q.x, q.y) && inMain(q.x, q.y) && distShore(q.x, q.y, 120) >= 80) // 沖へ出したら別の岸に掛かる所は除く
      .filter((q) => !nearBridge(q.x, q.y)); // 琵琶湖大橋のそばには着かない（橋脚が建物にかぶる）
  // 着く岸を、ほかの水上建築の着く岸から離れた所だけに（同じ時に同じ浜に重ならないよう、実寸1.5km）
  const apart = (list, others) => list.filter((q) => others.every((o) => Math.hypot(o.x - q.x, o.y - q.y) > 1500));
  // 色は少しだけくすませて、景色に馴染ませる（鮮やかさを2割ほど落とす。灯りの色は別）
  const mute = (c) => {
    const col = new THREE.Color(c),
      hsl = {};
    col.getHSL(hsl);
    return col.setHSL(hsl.h, hsl.s * 0.78, hsl.l);
  };
  const LAMS = new Map(),
    lam = (c, o) => {
      if (o) return new THREE.MeshLambertMaterial({ ...o, color: mute(c) });
      if (!LAMS.has(c)) LAMS.set(c, new THREE.MeshLambertMaterial({ color: mute(c) })); // 同じ色は材質を共有（まとめて描ける）
      return LAMS.get(c);
    };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const add = (g, geo, m, x, y, z, ry = 0, rx = 0, rz = 0) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.rotation.set(rx, ry, rz);
    g.add(o);
    return o;
  };
  // 共通の材料
  const woodTx = cvTex(64, 64, (g, w, h) => {
    g.fillStyle = "#b08a5e";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) {
      g.fillStyle = `rgba(60,35,15,${(0.08 + Math.random() * 0.12).toFixed(2)})`;
      g.fillRect(0, y, w, 7);
      g.fillStyle = "rgba(40,25,10,.4)";
      g.fillRect(0, y + 7, w, 1);
    }
  });
  woodTx.wrapS = woodTx.wrapT = THREE.RepeatWrapping;
  woodTx.repeat.set(4, 4);
  const thatchTx = cvTex(64, 64, (g, w, h) => {
    g.fillStyle = "#b9965a";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) {
      g.strokeStyle = `rgba(${90 + Math.random() * 80},${70 + Math.random() * 50},30,.5)`;
      const x = Math.random() * w;
      g.beginPath();
      g.moveTo(x, Math.random() * h);
      g.lineTo(x + (Math.random() - 0.5) * 3, Math.random() * h);
      g.stroke();
    }
    for (let y = 8; y < h; y += 16) (g.fillStyle = "rgba(50,35,15,.35)"), g.fillRect(0, y, w, 2); // 葺き重ねの段
  });
  thatchTx.wrapS = thatchTx.wrapT = THREE.RepeatWrapping;
  thatchTx.repeat.set(5, 2);
  const M = {
    deck: lam(0xffffff, { map: woodTx, emissive: 0x120c06 }),
    dark: lam(0x4a3626),
    post: lam(0x6b4a30),
    thatch: lam(0xffffff, { map: thatchTx, emissive: 0x100c06, side: THREE.DoubleSide }),
    white: lam(0xf2efe6, { emissive: 0x1a1a18 }),
    float: lam(0x8a9aa4),
    rope: lam(0xcbb68c),
  };
  // 夜に灯る材質（灯籠・窓・舞台の灯り）：日暮れに灯る
  const lit = [];
  let CUR = null; // いま作っている建築（灯りの持ち主）。各部品が setCur で切り替える
  const GLOWS = new Map();
  const glowMat = (c, k = 2) => {
    const key = CUR + ":" + c + ":" + k; // 同じ建築の同じ灯りは材質を共有（まとめて描ける）
    if (GLOWS.has(key)) return GLOWS.get(key);
    const m = new THREE.MeshBasicMaterial({ color: 0x3a3630 });
    GLOWS.set(key, m);
    m.userData.on = new THREE.Color(c).multiplyScalar(k);
    m.userData.owner = CUR;
    lit.push(m);
    return m;
  };
  // 浮き（ポンツーン）：丸い浮きを並べた上に床板
  function pontoon(g, rad, sides, h = 0.6) {
    add(g, new THREE.CylinderGeometry(rad, rad, h, sides), M.deck, 0, 0.55, 0);
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * Math.PI * 2;
      add(g, new THREE.CylinderGeometry(0.55, 0.55, rad * 0.5, 8), M.float, Math.cos(a) * rad * 0.75, 0.15, Math.sin(a) * rad * 0.75, -a, 0, Math.PI / 2);
    }
    // 縁の手すり：細い格子（細い縦桟を密に、上と中ほどに細い横木）
    const nb = Math.round(rad * 9);
    for (let k = 0; k < nb; k++) {
      const a = (k / nb) * Math.PI * 2,
        main = k % 6 === 0;
      add(g, box(main ? 0.07 : 0.03, 0.9, main ? 0.07 : 0.03), M.post, Math.cos(a) * (rad - 0.2), 1.3, Math.sin(a) * (rad - 0.2));
    }
    add(g, new THREE.TorusGeometry(rad - 0.2, 0.035, 4, sides * 8), M.post, 0, 1.75, 0, 0, Math.PI / 2);
    add(g, new THREE.TorusGeometry(rad - 0.2, 0.018, 3, sides * 8), M.post, 0, 1.3, 0, 0, Math.PI / 2);
    // 床板の目地（細い線を放射状に）
    for (let k = 0; k < sides * 4; k++) {
      const a = (k / (sides * 4)) * Math.PI * 2;
      add(g, box(rad * 0.9, 0.01, 0.02), M.dark, Math.cos(a) * rad * 0.45, 0.86, Math.sin(a) * rad * 0.45, -a);
    }
  }
  const halls = [];
  // 簾（細い竹を密に並べ、ところどころ編み糸）：茶屋・図書館で使う
  const sudareTx = cvTex(64, 64, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    for (let x = 0; x < w; x += 3) (c.fillStyle = "#b99a62"), c.fillRect(x, 0, 2, h);
    for (let y = 10; y < h; y += 20) (c.fillStyle = "#5a4630"), c.fillRect(0, y, w, 1);
  });
  const sudareM = lam(0xffffff, { map: sudareTx, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
  // 風鈴：小さなガラスの鈴と、下に下がる細い短冊
  const glassM = lam(0xcfe4ea, { transparent: true, opacity: 0.6, emissive: 0x18242a });
  const furin = (g, x, y, z, c) => {
    add(g, new THREE.CylinderGeometry(0.004, 0.004, 0.35, 3), M.dark, x, y + 0.2, z);
    add(g, new THREE.SphereGeometry(0.11, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.6), glassM, x, y, z);
    add(g, box(0.06, 0.28, 0.005), lam(c, { side: THREE.DoubleSide }), x, y - 0.25, z);
  };
  // 岸沿いの沖の道：岸の線（outer）を、湖の側へ約500m離してなぞる。A の岸から B の岸まで、近い向きに
  const NO = outer.length - 1;
  const nearIdx = (x, y) => {
    let bi = 0,
      bd = 1e18;
    for (let i = 0; i < NO; i++) {
      const d = (outer[i][0] - x) ** 2 + (outer[i][1] - y) ** 2;
      if (d < bd) (bd = d), (bi = i);
    }
    return bi;
  };
  function coastPath(A, B) {
    const ia = nearIdx(A.sx, A.sy),
      ib = nearIdx(B.sx, B.sy),
      fw = (ib - ia + NO) % NO,
      dir = fw <= NO / 2 ? 1 : -1,
      n = dir > 0 ? fw : NO - fw,
      pts = [[A.x, A.y]];
    let last = null;
    for (let k = 0; k <= n; k++) {
      const i = (ia + dir * k + NO) % NO,
        j = (i + 1) % NO,
        [x0, y0] = outer[i],
        [x1, y1] = outer[j],
        L = Math.hypot(x1 - x0, y1 - y0) || 1;
      if (last && Math.hypot(x0 - last[0], y0 - last[1]) < 250 && k < n) continue;
      last = [x0, y0];
      let nx = -(y1 - y0) / L,
        ny = (x1 - x0) / L;
      if (!inLake(x0 + nx * 60, y0 + ny * 60)) (nx = -nx), (ny = -ny);
      let d = 500;
      while (d > 80 && !inLake(x0 + nx * d, y0 + ny * d)) d *= 0.7;
      if (inLake(x0 + nx * d, y0 + ny * d)) pts.push([x0 + nx * d, y0 + ny * d]);
    }
    pts.push([B.x, B.y]);
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, cum, len: cum[cum.length - 1] };
  }
  const STAY = DAY * 1.0, // 岸に着いている長さ（作品の一日）
    MOVE = DAY * 0.6; // 次の岸へ移る長さ
  // 沖をまっすぐ渡る道（水上ギャラリー）：途中が陸や島にかかるときは、岸沿いの道にする
  function openPath(A, B) {
    const L = Math.hypot(B.x - A.x, B.y - A.y),
      n = Math.max(2, Math.ceil(L / 200)),
      pts = [];
    for (let i = 0; i <= n; i++) {
      const x = A.x + ((B.x - A.x) * i) / n,
        y = A.y + ((B.y - A.y) * i) / n;
      if (!inLake(x, y) || !inMain(x, y) || distShore(x, y, 300) < 250) return coastPath(A, B);
      pts.push([x, y]);
    }
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, cum, len: cum[cum.length - 1] };
  }
  function moor(g, sites, extraY = 0, path = coastPath) {
    g.scale.multiplyScalar(1.2); // 3つの水上建築は少し大きく（部材の太さも一緒に）
    mergeStatic(g); // 部品を材質ごとに1つの形にまとめて、描く回数を減らす（00-head.js）
    scene.add(g);
    const legs = sites.map((A, i) => path(A, sites[(i + 1) % sites.length]));
    const H = { g, ph: R() * 6.28, sites, legs, off: R() * (STAY + MOVE) * sites.length, y0: extraY, x: sites[0].x * S, z: sites[0].y * S, moored: true, site: 0, use: 1 };
    halls.push(H);
    placeLog("湖に浮かぶ建築の着く所", "water", sites.map((q) => [q.x, q.y]));
    placeLog("湖に浮かぶ建築の漂う道", "water", legs.flatMap((l) => l.pts));
    return H;
  }
  const rotFor = (ang) => Math.PI / 2 - ang; // 建築の前（+Z）を ang の向きへ
  const lerpA = (a, b, u) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * u;
  // 共有時計から、いまの位置・向き・岸に着いているか
  function place(H, ct) {
    const per = STAY + MOVE,
      n = H.sites.length,
      tt = (((ct + H.off) % (per * n)) + per * n) % (per * n),
      k = Math.floor(tt / per),
      r = tt - k * per;
    if (r < STAY) {
      const q = H.sites[k];
      H.moored = true;
      H.site = k;
      H.px = q.x;
      H.py = q.y;
      H.rot = rotFor(q.a);
      H.use = Math.min(1, r / (DAY * 0.05), (STAY - r) / (DAY * 0.05)); // 着いてしばらくして灯り、離れる前に消える
      H.mv = 0;
      return;
    }
    const L = H.legs[k],
      u0 = (r - STAY) / MOVE,
      u = u0 * u0 * (3 - 2 * u0),
      d = u * L.len;
    let i = 1;
    while (i < L.cum.length - 1 && L.cum[i] < d) i++;
    const f = (d - L.cum[i - 1]) / (L.cum[i] - L.cum[i - 1] || 1),
      [x0, y0] = L.pts[i - 1],
      [x1, y1] = L.pts[i];
    H.moored = false;
    H.use = 0;
    H.px = x0 + (x1 - x0) * f;
    H.py = y0 + (y1 - y0) * f;
    // 進む向きと速さ（0〜1）：離れぎわと着きぎわは遅い。八の字の航跡に使う
    const sl = Math.hypot(x1 - x0, y1 - y0) || 1;
    H.dx = (x1 - x0) / sl;
    H.dy = (y1 - y0) / sl;
    H.mv = Math.min(1, 6 * u0 * (1 - u0) / 1.2);
    const hd = rotFor(Math.atan2(y1 - y0, x1 - x0));
    H.rot = lerpA(lerpA(rotFor(H.sites[k].a), hd, Math.min(1, u0 / 0.12)), rotFor(H.sites[(k + 1) % n].a), Math.max(0, (u0 - 0.88) / 0.12));
  }
  // ---------- 共通：細長い平舟（茶屋・郵便局） ----------
  // 長さ L・幅 W の床、丸い浮き、細い格子の手すり（open の範囲 [x0, x1] は前の舷を開けて出入りの口に）、床板の目地
  function raft(g, L, W, open = null) {
    add(g, box(L, 0.5, W), M.deck, 0, 0.55, 0);
    for (let x = -L / 2 + 1.6; x <= L / 2 - 1.5; x += 3.2) for (const z of [-W / 2 + 0.7, W / 2 - 0.7]) add(g, new THREE.CylinderGeometry(0.45, 0.45, 2.6, 8), M.float, x, 0.15, z, 0, Math.PI / 2);
    for (let k = 0; k < L * 2; k++) add(g, box(0.02, 0.01, W - 0.2), M.dark, -L / 2 + 0.25 + k * 0.5, 0.81, 0);
    for (const z of [-W / 2 + 0.08, W / 2 - 0.08]) {
      for (let k = 0; k <= L * 3; k++) {
        const x = -L / 2 + k / 3;
        if (open && z < 0 && x > open[0] && x < open[1]) continue;
        add(g, box(k % 6 ? 0.022 : 0.05, 0.7, k % 6 ? 0.022 : 0.05), M.post, x, 1.15, z);
      }
      const segs = open && z < 0 ? [[-L / 2, open[0]], [open[1], L / 2]] : [[-L / 2, L / 2]];
      for (const [a, b] of segs) {
        add(g, box(b - a, 0.05, 0.05), M.post, (a + b) / 2, 1.52, z);
        add(g, box(b - a, 0.025, 0.025), M.post, (a + b) / 2, 1.15, z);
      }
    }
    for (const x of [-L / 2 + 0.08, L / 2 - 0.08]) add(g, box(0.05, 0.05, W - 0.2), M.post, x, 1.52, 0);
  }
  // 反った屋根：四隅へ下がる宝形（4つの面）を、軒先ほど少し持ち上げて反らせる。幅 a・奥行き b・高さ h
  function curvedRoof(a, b, h, m) {
    const geo = new THREE.ConeGeometry(Math.SQRT2 / 2, 1, 4, 6, true);
    geo.rotateY(Math.PI / 4);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) + 0.5, // 0（軒）〜1（頂）
        r = 1 - y;
      p.setXYZ(i, p.getX(i) * a, (y + 0.22 * r * r * r - 0.5) * h, p.getZ(i) * b); // 軒先ほど持ち上げる（反り）
    }
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, m);
  }
  // 湯気・煙の粒（茶屋の釜）：ゆっくり立ちのぼって薄れる。粒の動きは毎コマ少しだけ
  function steamPuff(g, x, y, z, n = 18) {
    const pos = new Float32Array(n * 3),
      geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ size: 0.9, map: G.dotTex, color: 0xf4f2ee, transparent: true, opacity: 0, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.userData.noRefl = true;
    pts.userData.keep = true;
    g.add(pts);
    const seed = Array.from({ length: n }, (_, i) => [i / n, R() * 6.28]);
    return (t, on) => {
      mat.opacity = 0.35 * on;
      pts.visible = on > 0.02;
      if (!pts.visible) return;
      for (let i = 0; i < n; i++) {
        const u = (seed[i][0] + t * 0.12) % 1;
        pos[i * 3] = x + Math.sin(seed[i][1] + t * 0.7) * 0.25 * u;
        pos[i * 3 + 1] = y + u * 3.2;
        pos[i * 3 + 2] = z + Math.cos(seed[i][1] + t * 0.5) * 0.25 * u;
      }
      geo.attributes.position.needsUpdate = true;
      mat.size = 0.9;
    };
  }
  return { R, spot, villageSites, apart, nearBridge, mute, lam, box, add, M, glowMat, lit, halls, pontoon, sudareM, glassM, furin, coastPath, openPath, moor, place, STAY, MOVE, raft, curvedRoof, steamPuff, setCur: (k) => (CUR = k) };
})();
