/* ---------- 湖に浮かぶ建築（2026年11月）：水上子ども図書館・水上映画館・水上音楽堂・水上の花屋・水上茶屋・水上郵便局 ----------
   人の姿は出さず、置かれた物と灯りと音で、そこで過ごす誰かの気配を見せる。
   3つとも、決まった岸に着いて使われる時と、湖を漂って次の岸へ移る時がある（共有時計で決まり、見る人みな同じ）。
   岸に着いている間だけ灯りが灯り、音がし、映画館は陸に客席を出す。漂う間は灯りを落として、岸沿いの沖をゆっくり進む
   ・水上子ども図書館（近江舞子の浜）：ヨシ葺きの大きな八角屋根の、壁のない読書の間。本棚・丸い卓・座布団・ハンモック、
     屋根から岸の柱へ渡した三角旗、夕方は吊り灯籠が灯る。近づくと、ページをめくる音と風鈴
   ・水上映画館（湖東の岸）：大きな白い幕を立てた舟。岸に着くと、陸に並んだ椅子のほうへ幕を向け、陸の映写台から光の筋が届く。
     夏（6〜9月）の夜（19時半〜22時半）だけ、幕に古い湖の映像がぼんやり映り、陸では映写機のカタカタという音
   ・水上音楽堂（菅浦の入江）：貝殻のように反った屋根の、六角の舞台。譜面台・琴・和太鼓・椅子。夕方は舞台の灯り。
     ときどき、遠くで練習の音（笛と琴の短い旋律）が流れて、すぐ止む */
{
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
  let CUR = null; // いま作っている建築（灯りの持ち主）
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
  // ---------- 1. 水上子ども図書館 ----------
  // 着く岸（湖西の浜を北から南へ、また戻る）：萩の浜 → 北小松 → 近江舞子の浜（白砂と松並木）→ 和邇の浜 → 堅田
  // 湖西の浜を北から南へ（集落のある所だけ）：萩の浜・安曇川・北小松・近江舞子・和邇・堅田
  const libSites = villageSites([[136.062, 35.335], [136.075, 35.3], [135.987, 35.285], [135.9755, 35.2575], [135.952, 35.195], [135.925, 35.125]], 110);
  CUR = "lib";
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
    var libH = moor(g, libSites);
  }

  // ---------- 2. 水上映画館 ----------
  // 湖に浮かぶ大きな幕の舟。岸に着くと、陸に並んだ椅子のほうへ幕を向け、陸の映写台から光の筋が届く。人は陸から観る
  // 湖東の岸を北から南へ：尾上 → 長浜 → 米原の磯 → 彦根の松原 → 新海浜
  // 湖東の岸を北から南へ（集落のある所だけ）：尾上・長浜・米原の磯・彦根・新海浜・守山
  // 幕を向ける岸：幕と陸の客席の間にヨシ原がなく、客席のまわりに家がある浜だけ（ヨシ原に向かって上映しても、観る人がいない）
  const screenOk = (q) => {
    const ca = Math.cos(q.a),
      sa = Math.sin(q.a);
    // 幕（沖）から岸、岸から陸へ120mまで、幅±70mの帯にヨシ原がないこと
    for (let d = -Math.hypot(q.x - q.sx, q.y - q.sy); d <= 120; d += 20)
      for (const w of [-70, 0, 70]) {
        const x = q.sx - ca * d - sa * w,
          y = q.sy - sa * d + ca * w;
        if (inReeds(x, y)) return false;
      }
    // 客席のあたり（岸から陸へ約60m）から700m以内に家の集まり（1km四方で8軒以上。画質によらない家並みのデータ）があること
    const x = q.sx - ca * 60,
      y = q.sy - sa * 60;
    return (G.towns ? G.towns.list : []).some((t) => t.ns >= 8 && Math.hypot(t.x - x, t.y - y) < 700);
  };
  const cinCands = [[136.2, 35.455], [136.258, 35.392], [136.272, 35.335], [136.243, 35.283], [136.19, 35.22], [135.97, 35.12], [136.09, 35.165]];
  const cinSites = villageSites(cinCands, 140).filter(screenOk);
  G.cinCheck = () => villageSites(cinCands, 140).map((q) => [+(136.08 + q.x / 90940).toFixed(3), +(35.25 - q.y / 110540).toFixed(3), screenOk(q)]); // 確認用
  CUR = "cin";
  let placeScreen = null;
  const screenU = { uT: { value: 0 }, uOn: { value: 0 } };
  let beam = null;
  {
    const scrM = new THREE.ShaderMaterial({
      uniforms: screenU,
      side: THREE.DoubleSide,
      vertexShader: `varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      // 古い湖の映像：ゆっくり流れる山並みと水面の明暗、ちらつき、縦の傷、ぼんやりした縁
      fragmentShader: `uniform float uT;uniform float uOn;varying vec2 vU;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
void main(){vec2 u=vU;float t=uT;float sc=floor(t/14.);
float hz=.45+.12*n(vec2(u.x*3.+sc*7.,sc))+.05*n(vec2(u.x*11.-t*.05,0.));
float img=u.y>hz?.75+.2*(u.y-hz)+.15*n(u*vec2(4.,2.)+t*.02):.35+.25*n(vec2(u.x*20.+t*.3,u.y*60.-t*.4))*(1.-(hz-u.y));
img*=1.-smoothstep(.0,.06,abs(u.y-hz))*.3;
img*=.9+.1*h(vec2(floor(t*18.),0.));
img-=step(.997,h(vec2(floor(u.x*300.),floor(t*6.))))*.4;
img*=smoothstep(0.,.08,u.x)*smoothstep(0.,.08,1.-u.x)*smoothstep(0.,.1,u.y)*smoothstep(0.,.1,1.-u.y);
vec3 off=vec3(.9,.9,.86);vec3 on=vec3(1.,.93,.8)*img*1.25;
gl_FragColor=vec4(mix(off*.75,on,uOn),1.);}`,
    });
    // 幕の舟：細長い浮き床（20m×6m）に、白い大きな幕（16m×9m）を細い枠で立てる。幕の表は岸（-Z）へ
    const g = new THREE.Group();
    add(g, box(20, 0.5, 6), M.deck, 0, 0.55, 0);
    for (const x of [-8, -4, 0, 4, 8]) for (const z of [-2.2, 2.2]) add(g, new THREE.CylinderGeometry(0.5, 0.5, 3.4, 8), M.float, x, 0.15, z, 0, Math.PI / 2);
    for (let k = 0; k < 40; k++) add(g, box(0.02, 0.01, 5.8), M.dark, -9.75 + k * 0.5, 0.81, 0); // 床板の目地
    for (let k = 0; k <= 80; k++) {
      const x = -10 + k * 0.25,
        main = k % 8 === 0;
      for (const z of [-2.9, 2.9]) add(g, box(main ? 0.06 : 0.025, 0.9, main ? 0.06 : 0.025), M.post, x, 1.3, z); // 細い格子の手すり
    }
    for (const z of [-2.9, 2.9]) for (const y of [1.75, 1.3]) add(g, box(20, y > 1.5 ? 0.06 : 0.03, y > 1.5 ? 0.06 : 0.03), M.post, 0, y, z);
    // 幕と枠：岸に着いている間だけ立てる。漂って移る間は、風に煽られないよう床の上へたたむ（rig を床の高さで縦に縮める）
    const rig = new THREE.Group();
    rig.position.y = 0.8;
    g.add(rig);
    const scr = add(rig, new THREE.PlaneGeometry(16, 9), scrM, 0, 6.6, 0.3);
    scr.rotation.y = Math.PI; // 表を岸へ
    for (const s of [-8.4, -5, -1.7, 1.7, 5, 8.4]) {
      add(rig, new THREE.CylinderGeometry(0.06, 0.08, 11.6, 6), M.post, s, 5.6, 0.5);
      const b1 = add(rig, box(0.04, 6.2, 0.04), M.post, s, 2.8, 2.2);
      b1.rotation.x = 0.55; // 後ろ（沖側）の細い筋交い
    }
    for (const y of [11.3, 2.05]) add(rig, box(17, 0.06, 0.06), M.post, 0, y, 0.45);
    for (let k = 0; k < 17; k++) add(rig, box(0.012, 9.2, 0.012), M.rope, -8 + k, 6.6, 0.4); // 幕を留める細い紐
    // 幕の枠を支える細い控え綱（枠の上から床の四隅へ）と、上の桁の小さな三角旗
    for (const sx of [-8.4, 8.4])
      for (const ez of [-2.8, 2.8]) {
        const a = new THREE.Vector3(sx, 11.2, 0.5),
          b = new THREE.Vector3(sx * 1.15, 0.2, ez),
          m = a.clone().add(b).multiplyScalar(0.5),
          L = a.distanceTo(b),
          o = add(rig, new THREE.CylinderGeometry(0.012, 0.012, L, 3), M.rope, m.x, m.y, m.z);
        o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      }
    {
      const FL = [0xd8634f, 0xe9c25a, 0x5b8fc4, 0xf2efe6].map((c) => new THREE.MeshBasicMaterial({ color: mute(c), side: THREE.DoubleSide }));
      for (let k = 0; k < 17; k++) {
        const f = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.22, 0, 0), new THREE.Vector3(0.22, 0, 0), new THREE.Vector3(0, -0.5, 0)]), FL[k % 4]);
        f.position.set(-8 + k, 11.25, 0.55);
        rig.add(f);
      }
    }
    rig.traverse((o) => o.isMesh && (o.userData.keep = true)); // 動かすので束ねない
    // たたんだ幕を巻いた筒（たたんでいる間だけ見える）
    const roll = add(g, new THREE.CylinderGeometry(0.35, 0.35, 16.4, 10), lam(0xe9e6dc), 0, 1.2, 0.4, 0, 0, Math.PI / 2);
    roll.userData.keep = true;
    G.cinRig = { rig, roll };
    // 幕の舟の、小さな舵小屋と灯り
    add(g, box(2.2, 2, 1.8), lam(0x2f3a44, { emissive: 0x0c0f12 }), 8.2, 1.8, 1.6);
    add(g, new THREE.SphereGeometry(0.2, 8, 6), glowMat(0xffd59a, 2), 8.2, 3.0, 0.6);
    // 舳と艫の、細い竿に下げた提灯
    for (const x of [-9.6, 9.6]) {
      add(g, new THREE.CylinderGeometry(0.03, 0.03, 2.2, 5), M.post, x, 1.9, -2.6);
      add(g, new THREE.SphereGeometry(0.18, 10, 8).scale(1, 1.3, 1), glowMat(0xffb070, 2.2), x, 2.95, -2.6);
    }
    var cinH = moor(g, cinSites);
    // 陸の客席：映写台（小さな卓と映写機）と、湖へ向いた椅子の列・敷物・提灯。人の姿はなく、置かれた物だけ
    const sg = new THREE.Group(),
      chairM = lam(0x9a6b44),
      lens = glowMat(0xfff1d0, 3),
      lantern = glowMat(0xffb070, 2.2);
    add(sg, box(1.2, 1.0, 0.8), M.dark, 0, 0.5, -16);
    add(sg, box(0.6, 0.45, 0.9), lam(0x2a2a2c), 0, 1.25, -16);
    add(sg, new THREE.CylinderGeometry(0.16, 0.16, 0.25, 10), lens, 0, 1.3, -15.45, 0, Math.PI / 2);
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 8; k++) {
        const x = (k - 3.5) * 1.6 + (r % 2) * 0.4,
          z = -6 - r * 2.2;
        add(sg, box(0.55, 0.05, 0.5), chairM, x, 0.45, z);
        add(sg, box(0.55, 0.55, 0.04), chairM, x, 0.75, z - 0.25);
        for (const dx of [-0.24, 0.24]) add(sg, box(0.03, 0.45, 0.03), M.dark, x + dx, 0.22, z);
      }
    for (const [x, z, c] of [[-9, -5, 0xd8634f], [9.5, -6, 0x5b8fc4], [-10, -9, 0xe9c25a]]) add(sg, box(2.2, 0.03, 1.6), lam(c), x, 0.03, z, 0.2); // 敷物
    for (let k = 0; k < 9; k++) {
      const x = (k - 4) * 3;
      add(sg, new THREE.CylinderGeometry(0.03, 0.03, 2.4, 4), M.post, x, 1.2, -3.2);
      add(sg, new THREE.SphereGeometry(0.22, 8, 6), lantern, x, 2.5, -3.2);
    }
    mergeStatic(sg);
    scene.add(sg);

    // 光の筋：陸の映写機から、湖の幕まで（夜の上映中だけ）。長さ1の形を伸ばして向ける
    beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 5.5, 1, 16, 1, true).translate(0, -0.5, 0).rotateX(-Math.PI / 2), // 映写機で細く、幕で広い
      new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    );
    beam.userData.noRefl = true;
    scene.add(beam);
    // 客席（岸から実寸30〜80m奥）が陸の上に収まるまで、少しずつ奥へ
    const seatD = (q) => {
      const onLand = (dd) => [30, 55, 80].every((k) => [-1, 0, 1].every((w) => !inLake(q.sx - Math.cos(q.a) * (dd + k) - Math.sin(q.a) * w * 40, q.sy - Math.sin(q.a) * (dd + k) + Math.cos(q.a) * w * 40)));
      let d = 6;
      while (d < 200 && !onLand(d)) d += 10;
      return d;
    };
    placeLog("水上映画館の客席", "land", cinSites.map((q) => [q.sx - Math.cos(q.a) * (seatD(q) + 55), q.sy - Math.sin(q.a) * (seatD(q) + 55)]));
    // 着いた岸に、客席と光の筋を置く（客席の前が岸。陸の上の高さに合わせる）
    placeScreen = (q) => {
      const d = seatD(q),
        sx = q.sx - Math.cos(q.a) * d,
        sy = q.sy - Math.sin(q.a) * d,
        gy = landY(sx - Math.cos(q.a) * 50, sy - Math.sin(q.a) * 50);
      sg.position.set(sx * S, gy, sy * S);
      sg.rotation.y = Math.PI / 2 - q.a; // 椅子を湖へ向ける（+Z が湖）
      sg.updateMatrixWorld();
      const pr = new THREE.Vector3(0, 1.3, -15.45).applyMatrix4(sg.matrixWorld),
        sc = new THREE.Vector3(q.x * S, 7.4 * 1.2, q.y * S);
      beam.position.copy(pr);
      beam.scale.set(1, 1, pr.distanceTo(sc));
      beam.lookAt(sc);
    };
    placeScreen(cinSites[0]);
    G.cinParts = { sg, seats: sg };
  }

  // ---------- 3. 水上音楽堂 ----------
  // 着く岸：菅浦の入江 → 海津の浜 → 月出の入江
  // 奥琵琶湖の入江を西から東へ：海津の浜 → 大浦 → 菅浦の入江 → 月出の入江 → 片山
  // 湖北の岸（集落のある所だけ）：今津・海津・大浦・菅浦・片山・塩津
  const musSites = apart(villageSites([[136.03, 35.41], [136.072, 35.462], [136.115, 35.495], [136.1335, 35.4795], [136.198, 35.455], [136.155, 35.515]], 120), cinSites);
  CUR = "mus";
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
    var musH = moor(g2, musSites);
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
    var placeBenches = (q) => {
      const [d, l] = seatSpot(q),
        sx = q.sx - Math.cos(q.a) * d - Math.sin(q.a) * l,
        sy = q.sy - Math.sin(q.a) * d + Math.cos(q.a) * l;
      bg.position.set(sx * S, landY(sx - Math.cos(q.a) * 40, sy - Math.sin(q.a) * 40), sy * S);
      bg.rotation.y = Math.PI / 2 - q.a; // 長椅子を湖（+Z）へ向ける
    };
    G.musSeats = bg;
  }

  // ---------- 4. 水上の花屋 ----------
  // 甲板に花桶をひな壇に並べた平舟に、縞の日よけ。花は季節で替わり（桜・菖蒲・向日葵・秋桜・椿）、岸に着くと色を持ち込む。
  // 離れたあとの岸には、淡い花びらがしばらく水面に残って流れる。南湖の集落を巡る
  // 南湖の岸（ほかの水上建築と重ならない所）：坂本・唐崎・膳所・矢橋・草津
  const floSites = villageSites([[135.875, 35.07], [135.86, 35.05], [135.89, 35.0], [135.93, 35.03], [135.94, 35.06]], 100);
  CUR = "flo";
  let floH = null,
    floHeads = null;
  {
    const g = new THREE.Group();
    // 平舟：細長い床と、低い舷
    add(g, box(14, 0.5, 5.2), M.deck, 0, 0.55, 0);
    for (const x of [-5, -1.7, 1.7, 5]) for (const z of [-1.9, 1.9]) add(g, new THREE.CylinderGeometry(0.5, 0.5, 3, 8), M.float, x, 0.15, z, 0, Math.PI / 2);
    for (const z of [-2.55, 2.55]) add(g, box(14, 0.35, 0.1), M.post, 0, 0.95, z);
    for (let k = 0; k < 28; k++) add(g, box(0.02, 0.01, 5), M.dark, -6.75 + k * 0.5, 0.81, 0); // 床板の目地
    // ひな壇の花台（3段）と花桶
    const bucketM = lam(0x7a8a8c),
      bucketG = new THREE.CylinderGeometry(0.28, 0.22, 0.45, 10);
    for (let r = 0; r < 3; r++) {
      add(g, box(11, 0.08, 1.2), M.deck, 0, 1.0 + r * 0.45, -1.6 + r * 1.2);
      for (let k = 0; k < 15; k++) add(g, bucketG, bucketM, -5.2 + k * 0.74, 1.3 + r * 0.45, -1.6 + r * 1.2);
    }
    // 日よけ：細い柱6本と、白と若草の縞の布（少したるませる）
    for (const x of [-6.6, 0, 6.6]) for (const z of [-2.4, 2.4]) add(g, new THREE.CylinderGeometry(0.04, 0.05, 3.4, 5), M.post, x, 2.5, z);
    const stripe = cvTex(64, 16, (c2, w, h2) => {
      for (let x = 0; x < w; x += 8) {
        c2.fillStyle = (x / 8) % 2 ? "#f3efe4" : "#a9c49a";
        c2.fillRect(x, 0, 8, h2);
      }
    });
    stripe.wrapS = THREE.RepeatWrapping;
    stripe.repeat.set(6, 1);
    const awn = new THREE.PlaneGeometry(13.6, 5.2, 12, 4).rotateX(-Math.PI / 2);
    {
      const p = awn.attributes.position;
      for (let i = 0; i < p.count; i++) p.setY(i, -0.25 * Math.cos((p.getZ(i) / 5.2) * Math.PI)); // 布のたるみ
    }
    add(g, awn, lam(0xffffff, { map: stripe, side: THREE.DoubleSide, emissive: 0x141412 }), 0, 4.2, 0);
    // 夕方の灯り：日よけの下に小さな裸電球を3つ
    const bulbM = glowMat(0xffd59a, 2.2);
    for (const x of [-4.5, 0, 4.5]) add(g, new THREE.SphereGeometry(0.16, 8, 6), bulbM, x, 3.8, 0);
    // 日よけの柱に下げた吊り鉢（緑が垂れる）
    const leaf = lam(0x4f7a42, { emissive: 0x060c04 }),
      leafD = lam(0x3a5e34);
    for (const x of [-6.6, 6.6])
      for (const z of [-2.4, 2.4]) {
        add(g, new THREE.CylinderGeometry(0.005, 0.005, 0.6, 3), M.dark, x, 3.6, z * 0.92);
        add(g, new THREE.SphereGeometry(0.32, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), lam(0x9a7a5a, { side: THREE.DoubleSide }), x, 3.3, z * 0.92);
        add(g, new THREE.SphereGeometry(0.34, 8, 6), leaf, x, 3.35, z * 0.92);
        for (let j = 0; j < 4; j++) add(g, new THREE.ConeGeometry(0.06, 0.7, 4), leafD, x + Math.cos(j * 1.6) * 0.25, 2.95, z * 0.92 + Math.sin(j * 1.6) * 0.25, 0, Math.PI);
      }
    // 桶のところどころに、葉物（細い円錐の束）と、紙で包んだ花束
    for (let r = 0; r < 3; r++)
      for (let k = 1; k < 15; k += 4) for (let j = 0; j < 3; j++) add(g, new THREE.ConeGeometry(0.05, 0.9, 4), leafD, -5.2 + k * 0.74 + (j - 1) * 0.08, 1.85 + r * 0.45, -1.6 + r * 1.2, (j - 1) * 0.2);
    const paper = lam(0xe8dcc4, { side: THREE.DoubleSide });
    for (const [x, z, a] of [[-6.2, 1.6, 0.3], [-5.9, 1.9, -0.2], [6.1, 1.8, 0.1]]) add(g, new THREE.ConeGeometry(0.28, 0.9, 10, 1, true), paper, x, 1.25, z, 0, a, Math.PI);
    // 小さな黒板（字は書かない）と、ブリキの如雨露
    for (const s2 of [-1, 1]) {
      const o = add(g, box(0.7, 1.0, 0.04), lam(0x2a2e2a), -6.3, 1.35, -1.9 + s2 * 0.18);
      o.rotation.x = s2 * 0.18;
    }
    add(g, new THREE.CylinderGeometry(0.22, 0.24, 0.42, 12), lam(0x9aa4a6), 5.9, 1.05, -1.8);
    add(g, new THREE.CylinderGeometry(0.03, 0.05, 0.55, 6), lam(0x9aa4a6), 6.2, 1.18, -1.8, 0, 0, -0.9);
    floH = moor(g, floSites);
    // 花の頭：桶ごとに数輪。色は季節で替える（形は共有、毎月の色だけ塗り直す）
    const heads = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.24, 0), new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x2a2020 }), 3 * 15 * 4),
      Mx = new THREE.Matrix4();
    let n = 0;
    for (let r = 0; r < 3; r++)
      for (let k = 0; k < 15; k++)
        for (let j = 0; j < 4; j++) {
          Mx.makeTranslation((-5.2 + k * 0.74 + (R() - 0.5) * 0.35) * 1.2, (1.75 + r * 0.45 + R() * 0.35) * 1.2, (-1.6 + r * 1.2 + (R() - 0.5) * 0.35) * 1.2);
          heads.setMatrixAt(n++, Mx);
        }
    heads.userData.noChunk = true;
    heads.frustumCulled = false;
    floH.g.add(heads); // 舟と一緒に動く（舟の大きさの1.2倍は、上の位置に掛けてある）
    heads.scale.setScalar(1 / 1.2);
    floHeads = heads;
  }
  // 季節の花の色（月ごと）：4月 桜、5〜6月 菖蒲と芍薬、7〜8月 向日葵、9〜10月 秋桜、11〜3月 椿と水仙
  const FLOWERS = [
    [0xc8243a, 0xf4f0d8, 0xe8c040],
    [0xc8243a, 0xf4f0d8, 0xe8c040],
    [0xf2c6d0, 0xfbe4ea, 0xf4f0e8],
    [0xf2c6d0, 0xfbe4ea, 0xf4f0e8],
    [0x6a4aa8, 0xe58aa8, 0xf3eef6],
    [0x6a4aa8, 0x8a6ac8, 0xe58aa8],
    [0xf2b81e, 0xe89a1a, 0xf6d860],
    [0xf2b81e, 0xe89a1a, 0xf6d860],
    [0xf2a8c8, 0xd8508a, 0xf6f0f2],
    [0xf2a8c8, 0xd8508a, 0xe8c040],
    [0xc8243a, 0xf4f0d8, 0xe58aa8],
    [0xc8243a, 0xf4f0d8, 0xe8c040],
  ];
  let floMonth = -1;
  // 離れたあとの花びら：着いていた岸の水面に、淡い花びらがしばらく残って流れる
  const NPET = 160,
    petPos = new Float32Array(NPET * 3),
    petCol = new Float32Array(NPET * 3),
    petG = new THREE.BufferGeometry();
  petG.setAttribute("position", new THREE.BufferAttribute(petPos, 3));
  petG.setAttribute("color", new THREE.BufferAttribute(petCol, 3));
  const petals = new THREE.Points(petG, new THREE.PointsMaterial({ size: 0.22, map: G.dotTex, vertexColors: true, transparent: true, depthWrite: false, alphaTest: 0.02 }));
  petals.frustumCulled = false;
  petals.userData.noRefl = true;
  scene.add(petals);
  const petSeed = Array.from({ length: NPET }, () => [R() * 6.28, Math.sqrt(R()), R()]);
  const floUpdate = (c, t) => {
    if (c.month !== floMonth) {
      floMonth = c.month;
      const P3 = FLOWERS[c.month],
        cc = new THREE.Color();
      for (let i = 0; i < floHeads.count; i++) floHeads.setColorAt(i, cc.setHex(P3[(i * 7 + (i >> 2)) % 3]));
      floHeads.instanceColor.needsUpdate = true;
    }
    // 花びら：いま漂っている間、直前に着いていた岸の水面に。離れてからの時間で薄れて消える
    const per = STAY + MOVE,
      nS = floH.sites.length,
      tt = (((c.t + floH.off) % (per * nS)) + per * nS) % (per * nS),
      k = Math.floor(tt / per),
      since = tt - k * per - STAY; // 離れてからの秒数（負なら着いている）
    const fade = since > 0 ? Math.max(0, 1 - since / MOVE) : 0;
    petals.visible = fade > 0.01 && !isFar;
    if (!petals.visible) return;
    const q = floH.sites[k],
      P3 = FLOWERS[c.month],
      cc = new THREE.Color(),
      wy = water.position.y;
    for (let i = 0; i < NPET; i++) {
      const [a, r, h] = petSeed[i],
        drift = since * 0.02;
      const x = q.x * S + Math.cos(a) * r * 14 + Math.cos(q.a + 0.6) * drift + Math.sin(t * 0.2 + a) * 0.3,
        z = q.y * S + Math.sin(a) * r * 14 + Math.sin(q.a + 0.6) * drift + Math.cos(t * 0.17 + a) * 0.3;
      petPos.set([x, wy + 0.05, z], i * 3);
      const k2 = fade * (0.6 + 0.4 * Math.min(1, c.phase > 0.3 && c.phase < 0.75 ? 1 : 0.4));
      cc.setHex(P3[Math.floor(h * 3)]).lerp(new THREE.Color(1, 1, 1), 0.35).multiplyScalar(k2);
      petCol.set([cc.r, cc.g, cc.b], i * 3);
    }
    petG.attributes.position.needsUpdate = petG.attributes.color.needsUpdate = true;
  };

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

  // ---------- 5. 水上茶屋 ----------
  // 反った宝形の杉皮葺きの屋根に、藍の暖簾。畳の間と、緋毛氈の縁台、赤い野点傘。岸に着くと釜から湯気が立ち、行灯が灯る。
  // 人の姿はなく、湯気と灯りと、ときどき湯の沸く音で、お茶を点てる誰かの気配。湖東の中ほど（野洲〜近江八幡〜能登川）の集落を巡る
  const teaSites = apart(villageSites([[136.04, 35.15], [136.11, 35.205], [136.17, 35.195], [136.065, 35.16]], 110), [...libSites, ...cinSites, ...musSites, ...floSites]);
  CUR = "tea";
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

  // ---------- 6. 水上郵便局 ----------
  // 赤い切妻屋根に白い板壁の小さな局舎を載せた平舟。舳先に丸い赤いポスト、局舎の窓の奥に仕分けの棚、甲板に小包。
  // 岸に着くと旗が上がり、窓に灯りがともる。北の湖を巡って、岸から岸へ手紙を運ぶ（行き先は分からないが、どこかへ届く）
  const postSites = apart(villageSites([[136.01, 35.27], [136.045, 35.35], [136.095, 35.43], [136.21, 35.4], [136.272, 35.36], [136.24, 35.31]], 110), [...libSites, ...cinSites, ...musSites, ...floSites, ...teaSites]);
  CUR = "post";
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


  // ---------- 7. 水上ギャラリー ----------
  // 湖を気ままに漂う雲のような美術館。山の稜線のようにゆるく起伏し、縁が丸くすぼまった白い屋根を、林のように不揃いな細い柱が支える。
  // 屋根の下はガラスに囲まれた展示の間で、湖と山を写したような淡い色の絵と、丸い石の彫刻。屋根の裏は水面の照り返しで淡く青い。
  // ほかの水上建築のように岸には着かず、沖の何か所かで少しとどまっては、また漂う（夜は展示の間がほのかに灯る）
  const galSites = [
    [136.02, 35.3],
    [136.1, 35.4],
    [136.17, 35.36],
    [136.2, 35.28],
    [136.09, 35.3],
  ]
    .map(([lo, la]) => {
      const [x, y] = ll(lo, la);
      return { x, y, sx: x, sy: y, a: 0 };
    })
    .filter((q) => inLake(q.x, q.y) && inMain(q.x, q.y) && distShore(q.x, q.y, 400) > 350 && !nearBridge(q.x, q.y));
  galSites.forEach((q, i) => {
    const nq = galSites[(i + 1) % galSites.length];
    q.a = Math.atan2(nq.y - q.y, nq.x - q.x); // とどまる間も、次へ向かう向き
  });
  CUR = "gal";
  let galH = null;
  if (galSites.length >= 2) {
    const g = new THREE.Group();
    // 形の輪郭：ゆるく波打つ楕円（屋根・床・ガラスの壁で大きさを変えて使う）
    const rOf = (t) => 1 + 0.1 * Math.sin(3 * t + 1) + 0.06 * Math.sin(5 * t + 2.3) + 0.04 * Math.sin(8 * t + 0.4);
    const AX = 13,
      AZ = 9;
    // 屋根：上の面は山の稜線のような起伏、下の面は水の照り返しを受けるゆるい曲面。縁で上下が丸く合わさる
    const ridge = (t, f) => 0.5 + 0.5 * (0.55 * Math.sin(3 * t + 0.5) + 0.3 * Math.sin(7 * t + 1.3) + 0.15 * Math.sin(11 * t + 2.1)) * (1 - 0.3 * f) * Math.min(1, f * 2.5); // 真ん中では向きによらず同じ高さ（尖らない）
    const mid = (t, f) => 6.0 + 0.45 * Math.sin(2 * t + f * 3) * f;
    const thick = (t, f) => (0.4 + 2.2 * ridge(t, f) * (1 - f * 0.45)) * Math.sqrt(Math.max(0, 1 - f * f)); // 稜線のような起伏（縁ほど薄く、丸くすぼまる）
    const roofSurf = (top) => {
      const I = 72,
        J = 14,
        P = [],
        C = [],
        idx = [];
      for (let j = 0; j <= J; j++)
        for (let i = 0; i <= I; i++) {
          const t = (i / I) * Math.PI * 2,
            f = j / J,
            r = rOf(t) * f,
            x = Math.cos(t) * AX * r,
            z = Math.sin(t) * AZ * r,
            y = top ? mid(t, f) + thick(t, f) * 0.78 : mid(t, f) - thick(t, f) * 0.22;
          P.push(x, y, z);
          const k = top ? 0.97 + 0.03 * ridge(t, f) : 0.86 + 0.06 * f; // 裏は水面の照り返しで淡く青い
          C.push(top ? k : k * 0.94, top ? k : k * 0.98, top ? k * 0.98 : k * 1.04);
        }
      for (let j = 0; j < J; j++)
        for (let i = 0; i < I; i++) {
          const a = j * (I + 1) + i,
            b = a + I + 1;
          if (top) idx.push(a, a + 1, b, a + 1, b + 1, b); // 上の面は上向き
          else idx.push(a, b, a + 1, a + 1, b, b + 1); // 下の面は下向き
        }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
      geo.setAttribute("color", new THREE.Float32BufferAttribute(C, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      return geo;
    };
    const roofM = new THREE.MeshLambertMaterial({ color: 0xf4f3ef, emissive: 0x161616 }),
      underM = new THREE.MeshLambertMaterial({ color: 0xe8eef2, emissive: 0x5e6870 }); // 裏：日は当たらないが、水面の照り返しで淡く明るい
    g.add(new THREE.Mesh(roofSurf(true), roofM));
    g.add(new THREE.Mesh(roofSurf(false), underM));
    // 床：屋根より一回り小さい、波打つ形の白い浮き床
    {
      const sh = new THREE.Shape();
      for (let i = 0; i <= 96; i++) {
        const t = (i / 96) * Math.PI * 2,
          r = rOf(t + 0.3) * 0.82;
        const x = Math.cos(t) * AX * r,
          z = Math.sin(t) * AZ * r;
        i ? sh.lineTo(x, z) : sh.moveTo(x, z);
      }
      const fg = new THREE.ExtrudeGeometry(sh, { depth: 0.5, bevelEnabled: false }).rotateX(Math.PI / 2);
      add(g, fg, lam(0xe9e6de, { emissive: 0x34342f, side: THREE.DoubleSide }), 0, 0.85, 0);
      for (let k = 0; k < 10; k++) {
        const t = (k / 10) * Math.PI * 2;
        add(g, new THREE.CylinderGeometry(0.5, 0.5, 2.4, 8), M.float, Math.cos(t) * AX * 0.55, 0.15, Math.sin(t) * AZ * 0.55, -t, 0, Math.PI / 2);
      }
    }
    // 柱：林のように不揃いな、細い白い柱（太さも少しずつ違う）
    const colM = lam(0xf2f1ec, { emissive: 0x141414 });
    for (let k = 0; k < 26; k++) {
      const t = R() * Math.PI * 2,
        f = 0.25 + Math.sqrt(R()) * 0.55,
        r = rOf(t) * f,
        x = Math.cos(t) * AX * r,
        z = Math.sin(t) * AZ * r,
        top = mid(t, f) - thick(t, f) * 0.22,
        w = 0.045 + R() * 0.035;
      add(g, new THREE.CylinderGeometry(w, w, top - 0.85, 6), colM, x, (top + 0.85) / 2, z);
    }
    // 展示の間：波打つ形のガラスの壁（細い方立をところどころに）
    const glassM = new THREE.MeshLambertMaterial({ color: 0xd6e4ea, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false, emissive: 0x0a1014 });
    {
      const n = 80,
        P = [],
        idx = [];
      for (let i = 0; i <= n; i++) {
        const t = (i / n) * Math.PI * 2,
          r = rOf(t + 0.7) * 0.5,
          x = Math.cos(t) * AX * r,
          z = Math.sin(t) * AZ * r;
        P.push(x, 0.85, z, x, 4.4, z);
        if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
        if (i % 8 === 0) add(g, box(0.035, 3.55, 0.035), colM, x, 2.62, z);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const w = new THREE.Mesh(geo, glassM);
      w.userData.keep = true;
      w.renderOrder = 3;
      g.add(w);
    }
    // 絵：湖と山を写したような、淡い色の面の絵（字や形ははっきり描かない）。白い自立壁に掛ける
    const paint = (seed, pal) =>
      cvTex(64, 48, (c, w, h) => {
        const Rr = rnd(seed);
        const gr = c.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, pal[0]);
        gr.addColorStop(0.55, pal[1]);
        gr.addColorStop(1, pal[2]);
        c.fillStyle = gr;
        c.fillRect(0, 0, w, h);
        // 稜線のような柔らかい線と、水面の淡い横の筋
        c.strokeStyle = pal[3];
        c.globalAlpha = 0.55;
        c.lineWidth = 2;
        c.beginPath();
        for (let x = 0; x <= w; x += 2) {
          const y = h * 0.5 - 6 * Math.sin(x * 0.09 + seed) - 3 * Math.sin(x * 0.23 + seed * 2);
          x ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.stroke();
        c.globalAlpha = 0.18;
        for (let k = 0; k < 6; k++) (c.fillStyle = "#ffffff"), c.fillRect(Rr() * w * 0.6, h * 0.62 + Rr() * h * 0.3, 10 + Rr() * 20, 1);
        c.globalAlpha = 1;
      });
    const PAL = [
      ["#c9d6dc", "#9fb6c2", "#7f98a6", "#5f6f6a"],
      ["#e8d8cc", "#d6b8b0", "#9aa6b8", "#6a6680"],
      ["#dfe2d2", "#b8c4a8", "#8fa098", "#4f5e52"],
      ["#f0e6d4", "#e2c9a0", "#a8a4a0", "#7a6650"],
      ["#d4dce6", "#b0bccd", "#c8b8c8", "#6a6a80"],
    ];
    const wallM = lam(0xf4f2ec, { emissive: 0x151513 });
    for (let k = 0; k < 5; k++) {
      const t = (k / 5) * Math.PI * 2 + 0.3,
        r = 3.6 + (k % 2) * 0.8,
        x = Math.cos(t) * r * 1.2,
        z = Math.sin(t) * r * 0.85,
        ry = -t + Math.PI / 2,
        wide = k % 2 === 0;
      add(g, box(wide ? 2.6 : 1.9, 2.7, 0.1), wallM, x, 2.2, z, ry);
      const pw = wide ? 1.9 : 1.1,
        ph = wide ? 1.3 : 1.6;
      const pm = new THREE.MeshLambertMaterial({ map: paint(k * 17 + 3, PAL[k]), emissive: 0x111111 });
      const o = add(g, new THREE.PlaneGeometry(pw, ph), pm, x + Math.cos(t) * 0.06, 2.35, z + Math.sin(t) * 0.06, ry - Math.PI / 2 + Math.PI / 2);
      o.rotation.y = -t; // 外（ガラスの向こう）を向く
      o.position.set(x + Math.cos(t) * 0.07, 2.35, z + Math.sin(t) * 0.07);
      o.rotateY(Math.PI / 2);
      add(g, new THREE.SphereGeometry(0.07, 8, 6), glowMat(0xfff0d8, 2.0), x + Math.cos(t) * 0.5, 3.4, z + Math.sin(t) * 0.5); // 絵を照らす小さな灯り
    }
    // 彫刻：丸い石（重ねた二つ）と、細く立つ形
    const stone = lam(0x9a9890);
    add(g, new THREE.SphereGeometry(0.7, 20, 14).scale(1.3, 0.75, 1), stone, 0.6, 1.4, -0.4);
    add(g, new THREE.SphereGeometry(0.45, 18, 12).scale(1.2, 0.8, 1), stone, 0.7, 2.15, -0.35);
    add(g, new THREE.CylinderGeometry(0.06, 0.16, 2.6, 8), lam(0x6a5a44), -1.6, 2.15, 1.0, 0, 0.08, 0.05);
    add(g, box(2.2, 0.4, 0.5), lam(0xd9d4c8), -0.8, 1.05, -2.1, 0.3); // 腰掛け
    // 夜：展示の間の床が、ほのかに灯る
    add(g, new THREE.CircleGeometry(4.2, 28), glowMat(0x4a4030, 1), 0, 0.88, 0, 0, -Math.PI / 2);
    galH = moor(g, galSites, 0, openPath);
  }

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
