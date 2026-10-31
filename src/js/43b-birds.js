/* ---------- 水鳥と空の鳥：冬のカモの群れとユリカモメ、湖北のコハクチョウとガン（秋の夕方は堅田に雁が降りる）、竹生島のカワウ、
   ヨシ際のカイツブリと岸のサギ、夏の田のシラサギ、空を舞うトビ。
   ・どこにどの群れがいるか、ねぐらへの行き帰りの時刻は、共有時計の日ごとに決まる（見る人みな同じ）
   ・建築が近づくと群れは飛び立ち、少し先の水面へ移る（カイツブリは潜る）。これは各自の画面だけ
   ・カメラから約800mより近い鳥は描かない（間近では不自然なため）。遠景の群れと、空を渡る編隊を見せる
   ・形は5種類（泳ぐカモ形・ハクチョウ・カワウ・立つサギ・飛ぶ鳥）。飛ぶ鳥の羽ばたきは頂点の計算で動かす
   ・見えやすいよう実物の約2.5倍の大きさ。群れは自分のまわり（約1.6km）にだけ置く ---------- */
G.birds = (() => {
  const NEAR_HIDE = 160, // これより近い鳥は描かない（作品の中の長さ。実寸で約800m）
    VIS = 2.5,
    U = { uT: { value: 0 } },
    Mx = (x, y, z, sx = 1, sy = 1, sz = 1, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, rz)), new THREE.Vector3(sx, sy, sz));

  // ---- 形：部品を1つの形にまとめる（wing は羽、羽ばたきで上下する）。長さは実寸m、+x が前 ----
  const ball = (x, y, z, sx, sy, sz, rz = 0) => [new THREE.SphereGeometry(1, 7, 5), Mx(x, y, z, sx, sy, sz, rz)];
  const seg = (ax, ay, bx, by, r, z = 0) => [new THREE.CylinderGeometry(r * 0.8, r, Math.hypot(bx - ax, by - ay), 5), Mx((ax + bx) / 2, (ay + by) / 2, z, 1, 1, 1, Math.atan2(-(bx - ax), by - ay))];
  const beak = (x, y, r, len) => [new THREE.ConeGeometry(r, len, 4), Mx(x + len / 2, y, 0, 1, 1, 1, -Math.PI / 2)];
  function wings(span) {
    const v = [];
    for (const s of [-1, 1]) {
      const z0 = s * 0.05,
        z1 = s * span * 0.45,
        z2 = s * span;
      const a = [0.1, 0, z0],
        b = [-0.14, 0, z0],
        c = [0.08, 0, z1],
        d = [-0.13, 0, z1],
        e = [-0.01, 0, z2],
        f = [-0.1, 0, z2];
      v.push(...a, ...c, ...b, ...b, ...c, ...d, ...c, ...e, ...d, ...d, ...e, ...f);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
    return [g, new THREE.Matrix4(), true];
  }
  function merge(parts) {
    let n = 0;
    const gs = parts.map(([g, m, w]) => {
      const q = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(m);
      q.computeVertexNormals();
      n += q.attributes.position.count;
      return [q, w];
    });
    const P = new Float32Array(n * 3),
      N = new Float32Array(n * 3),
      Wg = new Float32Array(n);
    let i = 0;
    for (const [q, w] of gs) {
      const p = q.attributes.position,
        nm = q.attributes.normal;
      for (let k = 0; k < p.count; k++, i++) {
        P.set([p.getX(k), p.getY(k), p.getZ(k)], i * 3);
        N.set([nm.getX(k), nm.getY(k), nm.getZ(k)], i * 3);
        Wg[i] = w ? 1 : 0;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(P, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(N, 3));
    geo.setAttribute("wing", new THREE.BufferAttribute(Wg, 1));
    geo.computeBoundingSphere();
    return geo;
  }
  const GEO = {
    duck: merge([ball(0, 0.05, 0, 0.28, 0.12, 0.15), seg(0.17, 0.08, 0.22, 0.19, 0.045), ball(0.23, 0.21, 0, 0.07, 0.065, 0.06), beak(0.28, 0.2, 0.025, 0.08), ball(-0.27, 0.09, 0, 0.07, 0.03, 0.07)]),
    swan: merge([ball(0, 0.1, 0, 0.5, 0.2, 0.27), seg(0.32, 0.15, 0.38, 0.62, 0.055), ball(0.43, 0.64, 0, 0.1, 0.07, 0.065), beak(0.5, 0.62, 0.03, 0.12), ball(-0.48, 0.16, 0, 0.12, 0.06, 0.12)]),
    corm: merge([ball(0, 0.02, 0, 0.36, 0.09, 0.13), seg(0.28, 0.06, 0.34, 0.3, 0.05), ball(0.37, 0.32, 0, 0.08, 0.06, 0.055), beak(0.43, 0.31, 0.02, 0.1), ball(-0.36, 0.06, 0, 0.12, 0.025, 0.06)]),
    heron: merge([
      seg(0, 0, 0.02, 0.56, 0.022, 0.05),
      seg(0, 0, -0.03, 0.56, 0.022, -0.05),
      ball(0, 0.66, 0, 0.24, 0.12, 0.12, 0.35),
      seg(0.14, 0.72, 0.1, 0.93, 0.03),
      seg(0.1, 0.93, 0.18, 1.06, 0.028),
      ball(0.2, 1.08, 0, 0.06, 0.045, 0.045),
      beak(0.24, 1.07, 0.018, 0.16),
      ball(-0.2, 0.62, 0, 0.1, 0.03, 0.06),
    ]),
    fly: merge([ball(0, 0, 0, 0.3, 0.09, 0.1), seg(0.22, 0.01, 0.38, 0.03, 0.04), ball(0.41, 0.035, 0, 0.06, 0.05, 0.05), beak(0.45, 0.03, 0.018, 0.08), ball(-0.33, 0, 0, 0.1, 0.02, 0.09), wings(0.75)]),
  };
  // 飛ぶ鳥の材質：羽（wing）の頂点を、付け根からの隔たりに比べて上下させる。aAnim＝（位相・速さ・振れ幅）
  const flyMat = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  flyMat.onBeforeCompile = (sh) => {
    sh.uniforms.uT = U.uT;
    sh.vertexShader =
      "uniform float uT;\nattribute float wing;\nattribute vec3 aAnim;\n" +
      sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed.y += wing * abs(position.z) * aAnim.z * sin(uT * aAnim.y + aAnim.x);");
  };
  const CAP = { duck: 460, swan: 90, corm: 160, heron: 70, fly: 460 },
    MESH = {};
  for (const k in CAP) {
    const I = new THREE.InstancedMesh(GEO[k], k === "fly" ? flyMat : new THREE.MeshLambertMaterial({ color: 0xffffff }), CAP[k]);
    I.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CAP[k] * 3), 3);
    if (k === "fly") GEO.fly.setAttribute("aAnim", (I.aAnim = new THREE.InstancedBufferAttribute(new Float32Array(CAP.fly * 3), 3)));
    I.count = 0;
    I.frustumCulled = false;
    I.userData.noChunk = true; // 毎フレーム動かす
    scene.add(I);
    MESH[k] = I;
  }

  // ---- 鳥の種類：泳ぐ形・色・大きさ・飛ぶときの形（長さ・羽の長さ）・羽ばたき・速さ・飛ぶ高さ・逃げ出す距離（作品の中の長さ）----
  const SP = {
    duck: { swim: "duck", cols: [0x5b4b3b, 0x6d5c47, 0x45403a, 0x7c6b55, 0x8a7a62, 0x1f1e1d], sz: 1, len: 0.9, span: 0.95, freq: 15, amp: 1, v: 10, alt: 9, flush: 38 },
    gull: { swim: "duck", cols: [0xf2f2ee, 0xe4e6e8], sz: 0.75, len: 0.85, span: 1.35, freq: 8, amp: 0.8, v: 8, alt: 9, flush: 0 },
    swan: { swim: "swan", cols: [0xf7f6f1, 0xefeee8], sz: 1, len: 1.6, span: 1.45, freq: 5.5, amp: 0.7, v: 12, alt: 14, flush: 55 },
    goose: { swim: "duck", cols: [0x6d5f4d, 0x5f5444, 0x7a6b58], sz: 1.45, len: 1.3, span: 1.3, freq: 7, amp: 0.8, v: 13, alt: 34, flush: 50 },
    corm: { swim: "corm", cols: [0x1c1c1e, 0x26252a], sz: 1, len: 1.2, span: 1.05, freq: 11, amp: 0.85, v: 12, alt: 7, flush: 34 },
    heron: { stand: true, cols: [0x8f969c, 0x868d93], sz: 1, len: 1.1, span: 1.35, freq: 4, amp: 1, v: 7, alt: 9, flush: 30 },
    egret: { stand: true, cols: [0xf3f3ee], sz: 0.9, len: 1.05, span: 1.3, freq: 4.2, amp: 1, v: 7, alt: 8, flush: 26 },
    grebe: { swim: "duck", cols: [0x4b3a2b, 0x55432f], sz: 0.5, flush: 22 },
    kite: { cols: [0x5c4835, 0x4e3d2e], sz: 1.3, len: 1, span: 1.55, freq: 2.2, amp: 0.12, v: 6 },
  };
  const col = new THREE.Color();
  const colOf = (sp, i) => SP[sp].cols[i % SP[sp].cols.length];

  // ---- 場所の決まり ----
  const onWater = (x, y) => inLake(x, y) && isleH(x, y) === null;
  const shallow = (x, y, dmax, smin, smax) => onWater(x, y) && depth(x, y) < dmax && distShore(x, y) > smin && distShore(x, y) < smax;
  // (lon, lat) のいちばん近い所から、岸から off m 以上沖の湖の点（実寸）
  function lakeNear(lon, lat, off) {
    const [x0, y0] = ll(lon, lat);
    for (let r = 0; r < 4000; r += 40)
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2,
          x = x0 + Math.cos(a) * r,
          y = y0 + Math.sin(a) * r;
        if (onWater(x, y) && distShore(x, y) >= off) return [x, y];
      }
    return [x0, y0];
  }
  const SITE = {
    swan: lakeNear(136.205, 35.445, 120), // 湖北（コハクチョウ。湖北町の岸の沖）
    roost: lakeNear(136.2, 35.485, 250), // 湖北のガンのねぐら（山本山の西の沖）
    katata: lakeNear(135.9216, 35.1099, 250), // 堅田（浮御堂の沖）：秋の夕方に雁が降りる
  };
  const FIELDS = [ll(136.27, 35.47), ll(136.255, 35.5), ll(136.285, 35.44)]; // 湖北の田（ガンが昼に餌をとる）
  const chikubu = MEISHO[0];
  const CHIKUBU = [chikubu.ax, chikubu.ay];
  const chikubuIsle = ISLES.find((I) => Math.hypot((I.box[0] + I.box[2]) / 2 - CHIKUBU[0], (I.box[1] + I.box[3]) / 2 - CHIKUBU[1]) < 600);

  // ---- 群れ ----
  // kind：raft 水に浮かぶ群れ／stand 立つサギ／grebe 潜るカイツブリ／circle 輪を描いて舞う／perch 竹生島の木にとまるカワウ
  // 位置は作品の中の長さ（x, z）。メンバーの ox, oz は群れの中心からのずれ
  let flocks = [];
  const house = () => [B.x * S, B.y * S];
  function raft(sp, x, y, n, R, key) {
    const m = [],
      r = 2 * Math.sqrt(n); // 群れの広がり（作品の中の長さ）
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2,
        d = Math.sqrt(R()) * r;
      m.push({ ox: Math.cos(a) * d, oz: Math.sin(a) * d, hd: R() * 6.28, c: colOf(sp, Math.floor(R() * 7)), ph: R() * 6.28, sp });
    }
    return { kind: "raft", sp, x: x * S, z: y * S, r, m, key, st: "rest" };
  }
  // 逃げる先：建築から離れる向きに、手ごろな水面を探す（見つからなければ遠くへ飛び去る）
  function fleeTo(f, R) {
    const [hx, hz] = house(),
      away = Math.atan2(f.z - hz, f.x - hx);
    for (let k = 0; k < 16; k++) {
      const a = away + (R() - 0.5) * 2.2,
        d = 110 + R() * 160,
        x = f.x + Math.cos(a) * d,
        z = f.z + Math.sin(a) * d;
      if (f.sp === "heron" || f.sp === "egret" ? shallow(x / S, z / S, 1.5, 0, 90) : shallow(x / S, z / S, 8, 50, 1500)) return [x, z, true];
    }
    return [f.x + Math.cos(away) * 500, f.z + Math.sin(away) * 500, false];
  }
  function takeOff(f, t, R) {
    const [tx, tz, land] = fleeTo(f, R),
      [hx, hz] = house(),
      sp = SP[f.sp],
      d = Math.hypot(tx - f.x, tz - f.z);
    f.st = "fly";
    f.fl = { ax: f.x, az: f.z, bx: tx, bz: tz, cx: (f.x + tx) / 2 + (R() - 0.5) * d * 0.4, cz: (f.z + tz) / 2 + (R() - 0.5) * d * 0.4, t0: t, dur: d / sp.v, land };
    for (const b of f.m) b.dl = Math.min(1.4, Math.hypot(f.x + b.ox - hx, f.z + b.oz - hz) * 0.012) * (0.6 + R() * 0.6);
  }

  // ---- 自分のまわりの群れ：600m四方の升ごとに、その日の群れを決める（升と日で決まる乱数）----
  const CELL = 600,
    NEAR = 1600,
    FAR = 2300,
    made = new Map(); // 升 → 群れを作った日
  function fillCells(c, dn, cx, cy) {
    const m = c.month,
      wb = SEASON.waterbirds[m],
      winter = [10, 11, 0, 1, 2].includes(m),
      summer = m >= 4 && m <= 8;
    for (const [k, d] of made) if (d !== dn) made.delete(k);
    const i0 = Math.floor((cx - NEAR) / CELL),
      i1 = Math.floor((cx + NEAR) / CELL),
      j0 = Math.floor((cy - NEAR) / CELL),
      j1 = Math.floor((cy + NEAR) / CELL);
    for (let i = i0; i <= i1; i++)
      for (let j = j0; j <= j1; j++) {
        const key = i + "," + j;
        if (made.get(key) === dn) continue;
        if ((i + 0.5) * CELL - cx > NEAR || cx - (i + 0.5) * CELL > NEAR || (j + 0.5) * CELL - cy > NEAR || cy - (j + 0.5) * CELL > NEAR) continue;
        made.set(key, dn);
        const R = rndFor("birds:" + key + ":" + dn);
        R();
        const pick = (ok) => {
          for (let k = 0; k < 10; k++) {
            const x = (i + R()) * CELL,
              y = (j + R()) * CELL;
            if (ok(x, y)) return [x, y];
          }
          return null;
        };
        // カモの群れ（冬に多い）。オオバンの黒が混じる
        if (R() < 0.32 * wb) {
          const p = pick((x, y) => shallow(x, y, 6, 60, 900));
          if (p) flocks.push(raft("duck", p[0], p[1], Math.round(8 + R() * 40 * wb), R, key));
        }
        // ユリカモメ（冬）：水面の上を輪を描いて舞う。建築が近いとついてくる
        if (winter && R() < 0.14) {
          const p = pick((x, y) => onWater(x, y) && distShore(x, y) < 1500);
          if (p) {
            const n = Math.round(10 + R() * 22),
              m = [];
            for (let k = 0; k < n; k++) m.push({ a: R() * 6.28, r: 8 + R() * 26, w: (0.25 + R() * 0.3) * (R() < 0.5 ? 1 : -1), h: 5 + R() * 10, c: colOf("gull", k), ph: R() * 6.28, sp: "gull", sit: R() < 0.3 });
            flocks.push({ kind: "circle", sp: "gull", x: p[0] * S, z: p[1] * S, m, key, follow: true });
          }
        }
        // カイツブリ：ヨシ際の水面で、ときどき潜る
        if (R() < 0.45) {
          const p = pick((x, y) => shallow(x, y, 3, 15, 260));
          if (p) {
            const n = 2 + Math.floor(R() * 4),
              m = [];
            for (let k = 0; k < n; k++) m.push({ ox: (R() - 0.5) * 16, oz: (R() - 0.5) * 16, hd: R() * 6.28, c: colOf("grebe", k), ph: R() * 6.28, dive: 4 + R() * 12, under: 0, sp: "grebe" });
            flocks.push({ kind: "grebe", sp: "grebe", x: p[0] * S, z: p[1] * S, m, key });
          }
        }
        // サギ：岸の浅瀬に1羽ずつ
        if (R() < 0.4) {
          const p = pick((x, y) => shallow(x, y, 0.8, 0, 60));
          if (p) flocks.push({ kind: "stand", sp: R() < 0.6 ? "heron" : "egret", x: p[0] * S, z: p[1] * S, m: [{ ox: 0, oz: 0, hd: R() * 6.28, c: 0, ph: R() * 6.28 }], key, st: "rest" });
        }
        // シラサギ（夏）：田の中に数羽
        if (summer && R() < 0.35) {
          const cand = paddies.filter((q) => !q.field && q.x >= i * CELL && q.x < (i + 1) * CELL && q.y >= j * CELL && q.y < (j + 1) * CELL);
          if (cand.length) {
            const q = cand[Math.floor(R() * cand.length)],
              n = 2 + Math.floor(R() * 5),
              m = [];
            for (let k = 0; k < n; k++) m.push({ ox: (R() - 0.5) * 14, oz: (R() - 0.5) * 14, hd: R() * 6.28, c: 0, ph: R() * 6.28 });
            flocks.push({ kind: "stand", sp: "egret", x: q.x * S, z: q.y * S, m, key, st: "rest", land: true });
          }
        }
        // トビ：岸の上の高い空をゆっくり輪を描く
        if (R() < 0.12) {
          const p = pick((x, y) => distShore(x, y) < 1200);
          if (p) flocks.push({ kind: "circle", sp: "kite", x: p[0] * S, z: p[1] * S, m: [{ a: R() * 6.28, r: 30 + R() * 40, w: 0.12 + R() * 0.08, h: 55 + R() * 40, c: colOf("kite", 0), ph: R() * 6.28, sp: "kite" }], key });
        }
      }
  }

  // ---- 決まった場所の群れ（湖北のコハクチョウ・ガンのねぐら・堅田の雁・竹生島のカワウ）----
  function fixedFlocks(c, dn) {
    const m = c.month,
      out = [],
      R = rndFor("birds-fixed:" + dn);
    R();
    if ([10, 11, 0, 1].includes(m)) out.push(raft("swan", SITE.swan[0], SITE.swan[1], 26 + Math.floor(R() * 20), R, "swan"));
    if ([9, 10, 11, 0, 1].includes(m)) {
      const g = raft("goose", SITE.roost[0], SITE.roost[1], 40 + Math.floor(R() * 30), R, "roost");
      g.night = true; // 昼は田へ出ている（夜明けに発ち、夕方に戻る）
      out.push(g);
    }
    if ([9, 10].includes(m)) {
      const g = raft("goose", SITE.katata[0], SITE.katata[1], 18 + Math.floor(R() * 10), R, "katata");
      g.night = true;
      out.push(g);
    }
    // 竹生島のカワウ：島の木の上にとまる群れと、島のまわりの水に浮かぶ群れ
    if (chikubuIsle) {
      const pm = [],
        [a, b, cc, d] = chikubuIsle.box;
      for (let k = 0; k < 400 && pm.length < 70; k++) {
        const x = a + R() * (cc - a),
          y = b + R() * (d - b),
          h = isleH(x, y);
        if (h === null || meishoClear(x, y)) continue;
        pm.push({ ox: x * S, oz: y * S, y: h + 6.5 + R() * 2, hd: R() * 6.28, c: colOf("corm", k), ph: R() * 6.28 });
      }
      out.push({ kind: "perch", sp: "corm", x: CHIKUBU[0] * S, z: CHIKUBU[1] * S, m: pm, key: "chikubu" });
      const [wx, wy] = lakeNear(136.1395, 35.4165, 120);
      out.push(raft("corm", wx, wy, 20 + Math.floor(R() * 14), R, "chikubu-water"));
    }
    return out;
  }

  // ---- ねぐらと餌場の行き来（共有時計で決まる時刻に、決まった道を飛ぶ）----
  // { sp, n, form 'v'|'line', a [x,y] 発つ所, b [x,y] 着く所, p0 発つ時刻（一日の割合）, dur 秒, alt, up 水から飛び立つか, down 水に降りるか }
  function schedule(c, dn) {
    const out = [],
      m = c.month,
      R = rndFor("birds-sched:" + dn);
    R();
    if ([9, 10, 11, 0, 1].includes(m)) {
      for (let k = 0; k < 4; k++) {
        const f = FIELDS[k % FIELDS.length],
          n = 9 + Math.floor(R() * 16),
          d = Math.hypot(f[0] - SITE.roost[0], f[1] - SITE.roost[1]) * S,
          dur = d / SP.goose.v;
        out.push({ sp: "goose", n, form: "v", a: SITE.roost, b: f, p0: 0.245 + k * 0.012 + R() * 0.01, dur, alt: 30 + R() * 25, up: true });
        out.push({ sp: "goose", n, form: "v", a: f, b: SITE.roost, p0: 0.73 + k * 0.012 + R() * 0.01, dur, alt: 30 + R() * 25, down: true });
      }
    }
    // 堅田落雁：秋の夕方、北の空から列をなして堅田の沖へ降りる
    if ([9, 10].includes(m)) {
      const a = [SITE.katata[0] + 2500 + R() * 1500, SITE.katata[1] - 6000 - R() * 2000],
        d = Math.hypot(a[0] - SITE.katata[0], a[1] - SITE.katata[1]) * S;
      out.push({ sp: "goose", n: 14 + Math.floor(R() * 8), form: "v", a, b: SITE.katata, p0: 0.715 + R() * 0.02, dur: d / SP.goose.v, alt: 45, down: true });
      out.push({ sp: "goose", n: 14 + Math.floor(R() * 8), form: "v", a: SITE.katata, b: [SITE.katata[0] + 3000, SITE.katata[1] - 7000], p0: 0.255 + R() * 0.02, dur: (Math.hypot(3000, 7000) * S) / SP.goose.v, alt: 45, up: true });
    }
    // 竹生島のカワウ：朝に列をなして餌場へ散り、夕方に戻る
    for (let k = 0; k < 9; k++) {
      const ang = R() * Math.PI * 2,
        far = 5000 + R() * 9000;
      let b = [CHIKUBU[0] + Math.cos(ang) * far, CHIKUBU[1] + Math.sin(ang) * far];
      if (!onWater(...b)) b = lakeNear(LON0 + b[0] / KX, LAT0 - b[1] / KY, 200);
      const d = Math.hypot(b[0] - CHIKUBU[0], b[1] - CHIKUBU[1]) * S,
        dur = d / SP.corm.v,
        n = 6 + Math.floor(R() * 14);
      out.push({ sp: "corm", n, form: "line", a: CHIKUBU, b, p0: 0.25 + R() * 0.07, dur, alt: 6 + R() * 6, up: true, down: true });
      out.push({ sp: "corm", n, form: "line", a: b, b: CHIKUBU, p0: 0.68 + R() * 0.08, dur, alt: 6 + R() * 6, up: true });
    }
    // 島から飛び立つ・島へ戻る列は、島の木の高さから（島の地面にもぐらないように）
    for (const g of out) {
      const ha = isleH(...g.a),
        hb = isleH(...g.b);
      g.ha = ha === null ? 0 : ha + 7;
      g.hb = hb === null ? 0 : hb + 7;
    }
    return out;
  }

  // ---- 1フレームの書き出し ----
  const M = new THREE.Matrix4(),
    Q = new THREE.Quaternion(),
    E = new THREE.Euler(),
    V = new THREE.Vector3(),
    Sc = new THREE.Vector3(),
    cnt = { duck: 0, swan: 0, corm: 0, heron: 0, fly: 0 };
  function put(kind, x, y, z, hd, pitch, roll, sx, sy, sz, c, anim) {
    const I = MESH[kind],
      i = cnt[kind];
    if (i >= CAP[kind]) return;
    // 近くの鳥は描かない（間近では形の粗さが目立ち不自然なため）。遠景の群れと編隊だけを見せる
    if ((x - camera.position.x) ** 2 + (z - camera.position.z) ** 2 < NEAR_HIDE * NEAR_HIDE) return;
    cnt[kind]++;
    E.set(roll, -hd, pitch, "YZX");
    M.compose(V.set(x, y, z), Q.setFromEuler(E), Sc.set(sx, sy, sz));
    I.setMatrixAt(i, M);
    I.setColorAt(i, col.setHex(c));
    if (anim) I.aAnim.setXYZ(i, anim[0], anim[1], anim[2]);
  }
  const swimKind = (sp) => SP[sp].swim || "duck";
  function putSwim(sp, x, z, hd, c, ph, t, wy) {
    const s = VIS * SP[sp].sz,
      y = wy + waveH(x, z, t) + Math.sin(t * 1.3 + ph) * 0.03;
    put(swimKind(sp), x, y, z, hd, Math.sin(t * 1.1 + ph) * 0.05, Math.sin(t * 0.9 + ph) * 0.06, s, s, s, c);
  }
  function putFly(sp, x, y, z, hd, pitch, c, ph, flap) {
    const P = SP[sp],
      s = VIS * P.sz;
    put("fly", x, y, z, hd, pitch, 0, s * P.len, s, s * P.span, c, [ph, P.freq * (flap > 1 ? 1.25 : 1), P.amp * flap]);
  }
  // 2次のベジェ曲線（群れの中心の飛ぶ道）
  const bez = (f, u) => [(1 - u) * (1 - u) * f.ax + 2 * (1 - u) * u * f.cx + u * u * f.bx, (1 - u) * (1 - u) * f.az + 2 * (1 - u) * u * f.cz + u * u * f.bz];

  let dnNow = -1,
    fixed = [],
    sched = [],
    tCells = 0,
    nextHonk = 0,
    nextCall = { gull: 2, kite: 6 };
  function update(dt, t, c, day, W, wx) {
    U.uT.value = t;
    for (const k in cnt) cnt[k] = 0;
    if (isFar) {
      for (const k in MESH) MESH[k].count = 0;
      return;
    }
    const dn = Math.floor(c.t / DAY),
      cx = camera.position.x / S,
      cy = camera.position.z / S,
      [hx, hz] = house(),
      wy = water.position.y,
      light = day > 0.25,
      calm = !wx || wx.rain < 0.6;
    if (dn * 100 + c.month !== dnNow) {
      dnNow = dn * 100 + c.month; // 日（作品では月も日で変わる）ごとに群れを決め直す。確認で月だけを変えたときも
      flocks = [];
      made.clear();
      fixed = fixedFlocks(c, dn);
      sched = schedule(c, dn);
    }
    tCells -= dt;
    if (tCells <= 0) {
      tCells = 1;
      fillCells(c, dn, cx, cy);
      // 遠ざかった群れは消す（升ごとの記録も消して、戻ってきたらまた現れるように）
      flocks = flocks.filter((f) => {
        const keep = Math.hypot(f.x / S - cx, f.z / S - cy) < FAR;
        if (!keep) made.delete(f.key);
        return keep;
      });
    }
    const windHd = Math.atan2(-W.y, -W.x); // 水に浮かぶ鳥は風上を向く
    const night = c.phase < 0.25 || c.phase > 0.76;
    const R = Math.random;
    for (const f of [...flocks, ...fixed]) {
      if (Math.abs(f.x / S - cx) > FAR || Math.abs(f.z / S - cy) > FAR) continue;
      if (f.night && !night && f.st !== "fly") continue; // ガンは昼は田へ出ている
      const P = SP[f.sp];
      if (f.kind === "raft" || f.kind === "stand") {
        if (f.st === "rest") {
          if (P.flush && Math.hypot(f.x - hx, f.z - hz) < P.flush + (f.r || 0)) takeOff(f, t, R);
        }
        if (f.st === "rest") {
          for (const b of f.m) {
            if (f.kind === "raft") {
              b.ox += Math.sin(t * 0.21 + b.ph) * dt * 0.15;
              b.oz += Math.cos(t * 0.17 + b.ph) * dt * 0.15;
              b.hd += (((windHd + Math.sin(b.ph) * 0.6 - b.hd + 9.42) % 6.28) - 3.14) * dt * 0.3;
              putSwim(f.sp, f.x + b.ox, f.z + b.oz, b.hd, b.c, b.ph, t, wy);
            } else {
              const x = f.x + b.ox,
                z = f.z + b.oz,
                y = f.land ? landY(x / S, z / S) : wy + 0.02;
              b.hd += Math.sin(t * 0.05 + b.ph) * dt * 0.05;
              put("heron", x, y, z, b.hd, 0, 0, VIS * P.sz, VIS * P.sz, VIS * P.sz, P.cols[0]);
            }
          }
        } else {
          const fl = f.fl;
          let done = true;
          for (const b of f.m) {
            const u = Math.max(0, Math.min(1, (t - fl.t0 - (b.dl || 0)) / fl.dur));
            if (u < 1) done = false;
            if (u <= 0) {
              // まだ飛び立っていない：水の上（立つ鳥は足元）にいる
              if (f.kind === "raft") putSwim(f.sp, f.x + b.ox, f.z + b.oz, b.hd, b.c, b.ph, t, wy);
              else put("heron", f.x + b.ox, f.land ? landY((f.x + b.ox) / S, (f.z + b.oz) / S) : wy, f.z + b.oz, b.hd, 0, 0, VIS * P.sz, VIS * P.sz, VIS * P.sz, P.cols[0]);
              continue;
            }
            const [x0, z0] = bez(fl, u),
              [x1, z1] = bez(fl, Math.min(1, u + 0.01)),
              hd = Math.atan2(z1 - z0, x1 - x0),
              up = Math.min(1, u / 0.2),
              dn2 = fl.land ? Math.min(1, (1 - u) / 0.25) : 1,
              h = P.alt * (up * up * (3 - 2 * up)) * (dn2 * dn2 * (3 - 2 * dn2)),
              spread = 1 + Math.sin(Math.PI * u) * 0.8,
              x = x0 + b.ox * spread,
              z = z0 + b.oz * spread;
            if (u >= 1 && fl.land) {
              if (f.kind === "raft") putSwim(f.sp, x, z, hd, b.c, b.ph, t, wy);
              continue;
            }
            putFly(f.sp, x, wy + 0.3 + h, z, hd, up < 1 ? 0.35 : dn2 < 1 ? -0.15 : 0, f.kind === "raft" ? b.c : P.cols[0], b.ph, up < 1 ? 1.3 : dn2 < 0.6 ? 0.3 : 1);
          }
          if (done) {
            if (!fl.land) {
              f.gone = true;
              continue;
            }
            f.x = fl.bx;
            f.z = fl.bz;
            f.st = "rest";
            f.land = false; // 降りた先は水辺
          }
        }
      } else if (f.kind === "grebe") {
        const near = Math.hypot(f.x - hx, f.z - hz) < P.flush;
        for (const b of f.m) {
          if (b.under > 0) {
            b.under -= dt;
            if (b.under <= 0) {
              b.ox += (R() - 0.5) * 12;
              b.oz += (R() - 0.5) * 12;
              b.ox = Math.max(-14, Math.min(14, b.ox));
              b.oz = Math.max(-14, Math.min(14, b.oz));
            }
            continue;
          }
          b.dive -= dt;
          if (b.dive <= 0 || near) {
            b.under = 4 + R() * 7;
            b.dive = 6 + R() * 14;
            continue;
          }
          putSwim("grebe", f.x + b.ox, f.z + b.oz, b.hd, b.c, b.ph, t, wy);
        }
      } else if (f.kind === "circle") {
        if (!light || !calm) continue;
        // 声：近くで舞うユリカモメは鳴き交わし、トビはときどき高い空から鳴く
        if (SND.ctx && SND.on && t > nextCall[f.sp]) {
          const d = Math.hypot(f.x - camera.position.x, f.z - camera.position.z),
            hear = f.sp === "kite" ? 500 : 260;
          if (d < hear && d > NEAR_HIDE) {
            const b = f.m[Math.floor(R() * f.m.length)],
              v = (1 - d / hear) * (f.sp === "kite" ? 0.035 : 0.03);
            if (f.sp === "kite") kiteCall(f.x + Math.cos(b.a) * b.r, f.z + Math.sin(b.a) * b.r, v);
            else gullCall(f.x + Math.cos(b.a) * b.r, f.z + Math.sin(b.a) * b.r, v);
            nextCall[f.sp] = t + (f.sp === "kite" ? 9 + R() * 14 : 0.8 + R() * 3);
          }
        }
        for (const b of f.m) {
          if (b.sit && f.follow && Math.hypot(hx - f.x, hz - f.z) > 120) {
            putSwim("gull", f.x + Math.cos(b.a) * b.r, f.z + Math.sin(b.a) * b.r, b.a, b.c, b.ph, t, wy);
            continue;
          }
          b.a += b.w * dt * (f.sp === "kite" ? 0.6 : 1);
          const x = f.x + Math.cos(b.a) * b.r,
            z = f.z + Math.sin(b.a) * b.r,
            hd = b.a + (b.w > 0 ? Math.PI / 2 : -Math.PI / 2),
            flap = f.sp === "kite" ? 1 : Math.sin(t * 0.7 + b.ph) > 0.4 ? 1 : 0.18;
          putFly(f.sp, x, (f.sp === "kite" ? groundH(x / S, z / S) : wy) + b.h + Math.sin(t * 0.5 + b.ph) * 1.5, z, hd, 0, b.c, b.ph, flap);
        }
      } else if (f.kind === "perch") {
        for (const b of f.m) {
          b.hd += Math.sin(t * 0.07 + b.ph) * dt * 0.08;
          put("corm", b.ox, b.y, b.oz, b.hd, -0.3, 0, VIS, VIS, VIS, b.c);
        }
      }
    }
    flocks = flocks.filter((f) => !f.gone);
    // 決まった時刻の行き来（列やV字の編隊）
    if (light || c.phase < 0.3 || c.phase > 0.7)
      for (const g of sched) {
        const u = ((c.phase - g.p0) * DAY) / g.dur;
        if (u < 0 || u > 1) continue;
        const ax = g.a[0] * S,
          az = g.a[1] * S,
          bx = g.b[0] * S,
          bz = g.b[1] * S,
          lx = ax + (bx - ax) * u,
          lz = az + (bz - az) * u;
        if (Math.hypot(lx / S - cx, lz / S - cy) > FAR + 2000) continue;
        const hd = Math.atan2(bz - az, bx - ax),
          upF = g.up ? Math.min(1, u / 0.12) : 1,
          dnF = g.down ? Math.min(1, (1 - u) / 0.15) : 1,
          sm = (v) => (v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v)),
          h = Math.max(g.alt * Math.min(sm(upF), sm(dnF)), g.ha * (1 - sm(u / 0.2)), g.hb * sm((u - 0.8) / 0.2)),
          ch = Math.cos(hd),
          sh = Math.sin(hd),
          sp = SP[g.sp],
          gap = VIS * sp.sz * 1.4;
        for (let i = 0; i < g.n; i++) {
          let along, side;
          if (g.form === "v") {
            const k = Math.ceil(i / 2);
            along = -k * gap;
            side = (i % 2 ? 1 : -1) * k * gap * 0.8;
          } else {
            along = -i * gap * 1.2;
            side = Math.sin(i * 1.7 + t * 0.4) * gap * 0.4;
          }
          const x = lx + ch * along - sh * side,
            z = lz + sh * along + ch * side;
          putFly(g.sp, x, wy + 0.3 + h + Math.sin(i * 2.1 + t) * 0.3, z, hd, upF < 1 ? 0.3 : dnF < 1 ? -0.2 : 0, colOf(g.sp, i), i * 1.3, dnF < 0.5 ? 0.35 : 1);
        }
        // ガンの声：近くを渡る編隊から
        if (g.sp === "goose" && SND.ctx && SND.on && t > nextHonk && Math.hypot(lx - camera.position.x, lz - camera.position.z) < 350) {
          nextHonk = t + 1.5 + R() * 3;
          gooseCall(lx, lz, 0.025 + R() * 0.02);
        }
      }
    for (const k in MESH) {
      const I = MESH[k];
      I.count = cnt[k];
      I.instanceMatrix.needsUpdate = true;
      if (I.instanceColor) I.instanceColor.needsUpdate = true;
      if (I.aAnim) I.aAnim.needsUpdate = true;
    }
  }
  return { update, SITE, MESH, get flocks() { return flocks; }, get fixed() { return fixed; } }; // MESH・flocks は確認用
})();
