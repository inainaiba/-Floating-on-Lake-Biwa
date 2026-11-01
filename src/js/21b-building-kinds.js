/* ---------- 集落の住宅以外の建物（20-villages-layout.js で、実際の建物の面積と種類から分けたもの）
   ・物置・小屋（shed）：小さな箱に、ゆるい切妻の金属の屋根（青・赤錆・灰）。板壁や波板の壁
   ・工場・倉庫（factory）：低く広い箱に、金属の波板の壁と、ゆるい切妻の金属の屋根
   ・鉄筋の建物（rc）：平らな屋根と手すり壁（パラペット）。2〜5階。集合住宅・事務所・店・医院
   ・大きな鉄筋の建物（rcBig）：学校・病院・大きな店。長い箱に、窓の列
   窓の模様は建物の大きさに合わせて繰り返す（階の高さと柱の間隔をそろえる。47-city.js と同じしくみ）。夜は窓が灯る ---------- */
G.bkinds = (() => {
  const list = houses.filter((h) => h.kind && h.kind !== "house" && h.kind !== "barn");
  const g = new THREE.Group();
  scene.add(g);
  const M = new THREE.Matrix4(),
    Qq = new THREE.Quaternion(),
    E = new THREE.Euler(),
    V = new THREE.Vector3(),
    Sc = new THREE.Vector3(),
    c = new THREE.Color();
  const gy = (h) => 0.6 + h.ground * S * VEX;
  // ---- 壁の模様（4種類を横に並べた1枚の絵。1つが「柱の間隔4つ×2階」）----
  const paint = (lit) =>
    cvTex(256, 64, (x, w, hh) => {
      const L = (col) => (x.fillStyle = col),
        Rr = rnd(lit ? 41 : 40);
      L(lit ? "#000" : "#fff");
      x.fillRect(0, 0, w, hh);
      for (let v = 0; v < 4; v++)
        for (let f = 0; f < 2; f++)
          for (let b = 0; b < 4; b++) {
            const x0 = v * 64 + b * 16,
              y0 = f * 32,
              on = Rr() < 0.45,
              warm = Rr() < 0.7 ? "#ffd9a0" : "#fff1d8";
            if (v === 0) {
              // 集合住宅：ベランダの手すり（明るい帯）と、奥まった窓
              if (lit) on && (L(warm), x.fillRect(x0 + 2, y0 + 6, 12, 14));
              else (L("#5d6670"), x.fillRect(x0, y0 + 4, 16, 18), L("#f2f0ea"), x.fillRect(x0, y0 + 20, 16, 9), L("#c9ccce"), x.fillRect(x0 + 15, y0 + 4, 1, 25));
            } else if (v === 1) {
              // 事務所・店：横に続く窓の帯
              if (lit) on && (L(warm), x.fillRect(x0, y0 + 9, 16, 12));
              else (L("#55626e"), x.fillRect(x0, y0 + 9, 16, 12), L("#8e989f"), x.fillRect(x0 + 15, y0 + 9, 1, 12));
            } else if (v === 2) {
              // 学校・病院：大きな窓が整然と並ぶ
              if (lit) on && (L("#e8eef2"), x.fillRect(x0 + 2, y0 + 6, 12, 16));
              else (L("#6a7884"), x.fillRect(x0 + 2, y0 + 6, 12, 16), L("#d8dcdc"), x.fillRect(x0 + 7, y0 + 6, 1, 16));
            } else {
              // 古い店舗つきの建物：1階はシャッターと店先、2階は小さな窓
              if (f === 1) {
                if (lit) on && (L(warm), x.fillRect(x0 + 2, y0 + 6, 12, 18));
                else (L(b % 2 ? "#9aa0a2" : "#6c7378"), x.fillRect(x0 + 2, y0 + 6, 12, 18));
                for (let k = y0 + 7; k < y0 + 24; k += 2) (L(lit ? "#000" : "rgba(0,0,0,.18)"), x.fillRect(x0 + 2, k, 12, 1));
              } else if (lit) on && (L(warm), x.fillRect(x0 + 4, y0 + 8, 8, 10));
              else (L("#5d6670"), x.fillRect(x0 + 4, y0 + 8, 8, 10));
            }
          }
    });
  const FILL = "totalEmissiveRadiance += diffuseColor.rgb * .12;";
  const rcMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, map: paint(false), emissiveMap: paint(true), emissive: 0xffffff, emissiveIntensity: 0 });
  for (const t of [rcMat.map, rcMat.emissiveMap]) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  rcMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aV;")
      .replace(
        "#include <uv_vertex>",
        `#include <uv_vertex>
float sx_=length(instanceMatrix[0].xyz),sy_=length(instanceMatrix[1].xyz),sz_=length(instanceMatrix[2].xyz);
vec2 cu_=abs(normal.y)>.5?vec2(.01,.95):vec2(uv.x*(abs(normal.x)>.5?sz_:sx_)/14.4,uv.y*sy_/6.6);
cu_.x=(fract(cu_.x)+aV)*.25;vMapUv=cu_;vEmissiveMapUv=cu_;`,
      );
    sh.fragmentShader = sh.fragmentShader.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n" + FILL);
  };
  rcMat.customProgramCacheKey = () => "bkinds-rc";
  // 金属の波板：縦の細い筋
  const metalTx = cvTex(32, 32, (x, w, hh) => {
    x.fillStyle = "#fff";
    x.fillRect(0, 0, w, hh);
    for (let i = 0; i < w; i += 4) (x.fillStyle = "rgba(0,0,0,.13)"), x.fillRect(i, 0, 1.5, hh);
    x.fillStyle = "rgba(0,0,0,.08)";
    x.fillRect(0, hh - 3, w, 3);
  });
  metalTx.wrapS = metalTx.wrapT = THREE.RepeatWrapping;
  const metalMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: metalTx });
  metalMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace(
      "#include <uv_vertex>",
      `#include <uv_vertex>
float sx_=length(instanceMatrix[0].xyz),sy_=length(instanceMatrix[1].xyz),sz_=length(instanceMatrix[2].xyz);
vMapUv=abs(normal.y)>.5?vec2(.5):vec2(uv.x*(abs(normal.x)>.5?sz_:sx_)/3.,uv.y*sy_/3.);`,
    );
  };
  metalMat.customProgramCacheKey = () => "bkinds-metal";
  // ゆるい切妻の屋根（両端も閉じた三角柱）：幅1・奥行き1・高さ1。x が棟の向き
  const prism = (() => {
    const p = [
      [-0.5, 0, -0.5],
      [0.5, 0, -0.5],
      [0.5, 1, 0],
      [-0.5, 1, 0],
      [-0.5, 0, 0.5],
      [0.5, 0, 0.5],
    ];
    const idx = [0, 3, 2, 0, 2, 1, 4, 5, 2, 4, 2, 3, 0, 4, 3, 1, 2, 5];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(idx.flatMap((i) => p[i]), 3));
    geo.computeVertexNormals();
    return geo;
  })();
  const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const rc = list.filter((h) => h.kind === "rc" || h.kind === "rcBig"),
    mt = list.filter((h) => h.kind === "shed" || h.kind === "factory");
  // ---- 鉄筋の建物：壁・屋上の床（パラペットの内側）・パラペット・屋上の設備 ----
  const RC_COL = [0xe8e5de, 0xdcd8cf, 0xcfcac0, 0xd9cfbf, 0xc4bcae, 0xbfc3c4, 0xa99c8c, 0xe2d6c2],
    rcW = new THREE.InstancedMesh(box.clone(), rcMat, Math.max(1, rc.length)),
    aV = new Float32Array(Math.max(1, rc.length)),
    par = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ color: 0xffffff }), Math.max(1, rc.length)),
    roofIn = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ color: 0x8a8c8a }), Math.max(1, rc.length)),
    tops = [];
  rc.forEach((h, i) => {
    const v = bHash(h.x + 3, h.y - 5),
      big = h.kind === "rcBig",
      // 種類：大きいものは学校・病院の窓。小さいものは集合住宅・事務所・古い店舗
      vi = big ? (v < 0.7 ? 2 : 1) : v < 0.4 ? 0 : v < 0.7 ? 1 : 3,
      y0 = gy(h);
    aV[i] = vi;
    Qq.setFromEuler(E.set(0, -h.rot, 0));
    M.compose(V.set(h.x * S, y0 - 0.4, h.y * S), Qq, Sc.set(h.w, h.h + 0.4, h.d));
    rcW.setMatrixAt(i, M);
    const col = c.setHex(RC_COL[Math.floor(v * 97) % RC_COL.length]);
    rcW.setColorAt(i, col);
    M.compose(V.set(h.x * S, y0 + h.h, h.y * S), Qq, Sc.set(h.w + 0.3, 0.9, h.d + 0.3));
    par.setMatrixAt(i, M);
    par.setColorAt(i, col.clone().multiplyScalar(0.94));
    M.compose(V.set(h.x * S, y0 + h.h + 0.05, h.y * S), Qq, Sc.set(h.w - 0.5, 0.9, h.d - 0.5));
    roofIn.setMatrixAt(i, M);
    // 屋上：階段室・給水塔・室外機
    const n = big ? 2 : v < 0.6 ? 1 : 0;
    for (let k = 0; k < n; k++) {
      const ox = (bHash(h.x, k) - 0.5) * h.w * 0.5,
        oz = (bHash(k, h.y) - 0.5) * h.d * 0.4,
        cr = Math.cos(h.rot),
        sr = Math.sin(h.rot);
      tops.push([h.x * S + ox * cr - oz * sr, y0 + h.h + 0.9, h.y * S + ox * sr + oz * cr, 2.5 + k * 1.5, 2 + bHash(k, h.x) * 1.5, 2.5, h.rot]);
    }
  });
  rcW.geometry.setAttribute("aV", new THREE.InstancedBufferAttribute(aV, 1));
  rcW.count = par.count = roofIn.count = rc.length;
  const topI = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ color: 0xc8c8c2 }), Math.max(1, tops.length));
  tops.forEach(([x, y, z, w, hh, d, r], i) => {
    M.compose(V.set(x, y, z), Qq.setFromEuler(E.set(0, -r, 0)), Sc.set(w, hh, d));
    topI.setMatrixAt(i, M);
  });
  topI.count = tops.length;
  // ---- 物置と工場：波板の壁と、ゆるい切妻の金属の屋根 ----
  const WALL_M = [0xe4e0d4, 0xcfd2d0, 0xb9c6cc, 0xd8cfb8, 0x9aa3a6, 0x7a5a44, 0x4a3c32],
    ROOF_M = [0x4d6f8a, 0x3f5f78, 0x8a4a38, 0x6e3e30, 0x8c9094, 0x5f6a62, 0x3d6b5a, 0xa8aaa6],
    mw = new THREE.InstancedMesh(box, metalMat, Math.max(1, mt.length)),
    mr = new THREE.InstancedMesh(prism, new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }), Math.max(1, mt.length));
  mt.forEach((h, i) => {
    const v = bHash(h.x - 11, h.y + 2),
      y0 = gy(h),
      fac = h.kind === "factory";
    Qq.setFromEuler(E.set(0, -h.rot, 0));
    M.compose(V.set(h.x * S, y0 - 0.3, h.y * S), Qq, Sc.set(h.w, h.h + 0.3, h.d));
    mw.setMatrixAt(i, M);
    // 工場は明るい波板が多く、物置は板壁（茶・焦げ茶）も混ざる
    mw.setColorAt(i, c.setHex(WALL_M[fac ? Math.floor(v * 5) : Math.floor(v * 7)]));
    M.compose(V.set(h.x * S, y0 + h.h, h.y * S), Qq, Sc.set(h.w + 0.6, Math.max(0.5, h.d * (fac ? 0.12 : 0.2)), h.d + 0.6));
    mr.setMatrixAt(i, M);
    mr.setColorAt(i, c.setHex(ROOF_M[Math.floor(v * 113) % ROOF_M.length]));
  });
  mw.count = mr.count = mt.length;
  // ---- 正面の細部：工場のシャッター・高窓の帯・看板、鉄筋の建物の入口のガラスと庇・店の看板、物置の戸、納屋の大きな引き戸 ----
  const parts = [],
    front = (h, off, y, w, hh, dz, col) => {
      // 正面（h.rot から決まる向き）の、横 off・高さ y の位置に、幅 w・高さ hh・厚さ dz の板
      const fx = -Math.sin(h.rot),
        fz = Math.cos(h.rot),
        lx = Math.cos(h.rot),
        lz = Math.sin(h.rot);
      parts.push([h.x * S + fx * (h.d / 2 + dz / 2) + lx * off, y, h.y * S + fz * (h.d / 2 + dz / 2) + lz * off, w, hh, dz, h.rot, col]);
    };
  for (const h of houses) {
    const y0 = gy(h),
      v = bHash(h.x - 5, h.y + 9);
    if (h.kind === "factory") {
      const n = h.w > 26 ? 2 : 1;
      for (let k = 0; k < n; k++) front(h, (k - (n - 1) / 2) * h.w * 0.4, y0, 4.6, Math.min(4.6, h.h - 1.2), 0.15, 0x8e9396); // シャッター
      front(h, 0, y0 + h.h - 2.4, h.w * 0.82, 0.9, 0.08, 0x46525c); // 高窓の帯
      if (v < 0.6) front(h, -h.w * 0.25, y0 + h.h - 1.25, Math.min(10, h.w * 0.3), 1.1, 0.18, [0xf2f2ee, 0x2f5f9a, 0xe8e0c8][Math.floor(v * 5) % 3]); // 社名の看板
    } else if (h.kind === "rc" || h.kind === "rcBig") {
      front(h, h.w * 0.2, y0, 2.6, 2.6, 0.12, 0x3c4a54); // 入口のガラス戸
      front(h, h.w * 0.2, y0 + 2.75, 3.6, 0.22, 1.4, 0xd8d8d2); // 庇
      if (h.kind === "rc" && v < 0.35) front(h, -h.w * 0.15, y0 + 3.4, Math.min(8, h.w * 0.5), 0.9, 0.2, [0xc84a3c, 0x2e6fa8, 0xe8c040, 0x3f8f5a][Math.floor(v * 40) % 4]); // 店の看板
    } else if (h.kind === "shed") front(h, 0, y0, Math.min(1.8, h.w * 0.5), Math.min(1.9, h.h - 0.3), 0.08, v < 0.5 ? 0x5a4a3a : 0x9aa2a6); // 物置の戸
    else if (h.kind === "barn") front(h, h.w * 0.15, y0, 3.6, Math.min(3.2, h.h - 0.8), 0.12, 0x3a2e26); // 納屋の大きな引き戸
  }
  const stripeTx = cvTex(16, 32, (x, w, hh) => {
    x.fillStyle = "#fff";
    x.fillRect(0, 0, w, hh);
    for (let i = 0; i < hh; i += 4) (x.fillStyle = "rgba(0,0,0,.12)"), x.fillRect(0, i, w, 1);
  });
  const pI = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ color: 0xffffff, map: stripeTx }), Math.max(1, parts.length));
  parts.forEach(([x, y, z, w, hh, dz, r, col], i) => {
    M.compose(V.set(x, y, z), Qq.setFromEuler(E.set(0, -r, 0)), Sc.set(w, hh, dz));
    pI.setMatrixAt(i, M);
    pI.setColorAt(i, c.setHex(col));
  });
  pI.count = parts.length;
  for (const m of [rcW, par, roofIn, topI, mw, mr, pI]) {
    m.castShadow = m.receiveShadow = QUALITY.treeShadow;
    g.add(m);
  }
  return {
    g,
    // 夜は鉄筋の建物の窓が灯る
    update(day) {
      rcMat.emissiveIntensity = Math.min(1, Math.max(0, (0.2 - day) / 0.1)) * 1.6;
    },
  };
})();
onFrame(140, (f) => G.bkinds.update(f.day)); // 毎フレームの更新（集落の鉄筋の建物の夜の窓。順番は 00-head.js の onFrame）
