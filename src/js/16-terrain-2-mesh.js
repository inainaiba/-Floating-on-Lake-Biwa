// ---------- 地形の材質と網目：遠い山の粗い網目、カメラのまわりの細かい網目（G.nearPatch）、遠景の等高線
const NEAR_U = { value: new THREE.Vector4(0, 0, 0, 0) }; // 細かい網目の中心 x, z・半分の幅（作品の単位）・使うか
const TERR_RF = { value: 0 }; // 水面の映り込みを描いている間だけ 1（52-frame-render.js）。波でにじんで見分けられない細かい模様（細い沢の筋・樹冠のふくらみ）の計算を省く
const MIST_U = { value: 0 }; // 朝の霧の濃さ（42b-mist.js が毎フレーム決める）。谷にたまる霞に使う
const terrMat = new THREE.MeshLambertMaterial({ vertexColors: true });
terrMat.onBeforeCompile = (sh) => {
  sh.uniforms.uHaze = { value: new THREE.Color(0x9fb4c8) };
  sh.uniforms.uLow = { value: 0 };
  terrMat.userData.low = sh.uniforms.uLow;
  terrMat.userData.haze = sh.uniforms.uHaze;
  sh.uniforms.uSnow = { value: 0 };
  sh.uniforms.uSpr = { value: 0 };
  sh.uniforms.uSea = { value: new THREE.Vector3(0, 0, 0) }; // 山肌の季節のむら：山桜・新緑・薄雪（49-frame-sky-light.js）
  sh.uniforms.uCT = { value: 0 };
  sh.uniforms.uCSh = { value: 1 };
  sh.uniforms.uSunT = { value: new THREE.Vector3(0, 1, 0) };
  sh.uniforms.uMoonT = { value: new THREE.Vector3(0, 1, 0) };
  sh.uniforms.uNear = NEAR_U;
  sh.uniforms.uMist = MIST_U;
  sh.uniforms.uMoonL = { value: 0 };
  sh.uniforms.uNt = { value: 0 };
  sh.uniforms.uRf = TERR_RF; // 映り込みを描いている間は 1（細かい模様を省く）
  sh.uniforms.uSL = { value: 0 };
  sh.uniforms.uWin = { value: 0 };
  sh.uniforms.uAut = { value: 0 };
  terrMat.userData.sh = sh;
  sh.vertexShader = sh.vertexShader
    .replace("#include <common>", "#include <common>\nvarying float vH;varying vec2 vXZ;attribute float aCv;varying float vCv;varying vec3 vWN;attribute float aNear;varying float vNear;uniform vec4 uNear;attribute float aSink;attribute float aCell;")
    .replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvH=position.y;vXZ=(modelMatrix*vec4(position,1.)).xz;vCv=aCv;vWN=normal;vNear=aNear;" +
        // 細かい網目の中の粗い地形は、切り抜かずに下へ沈める（切り抜くと、網目の縁の向こうの山を下から覗くことになり、
        // 空が透けて山の切れ端が宙に浮いて見えた）。網目の縁をまたぐ三角形は下り坂の壁になって、細かい地形の下に隠れる
        "if(aNear<.5&&uNear.w>.5){vec2 dn_=abs(vXZ-uNear.xy);if(max(dn_.x,dn_.y)<uNear.z-aCell)transformed.y-=80.;else if(max(dn_.x,dn_.y)<uNear.z)transformed.y-=.6;}transformed.y-=80.*aSink;",
        // 沈めるのは、細かい網目の縁から粗い網目の1マス（aCell）以上内側の点だけ。縁をまたぐ三角形が網目の外まで斜めに沈んで、
        // 陸が割けて見えないように（2026年11月）。縁の近くの粗い点は少しだけ下げて、細かい網目（縁の近くは粗い地形の高さにつなぐ）を上に
    );
  sh.fragmentShader = sh.fragmentShader
    .replace(
      "#include <common>",
      "#include <common>\n" + GLSL_NOISE + "\nuniform float uRf;varying float vH;varying vec2 vXZ;varying float vCv;varying vec3 vWN;varying float vNear;uniform vec4 uNear;uniform float uMist;uniform float uSnow;uniform float uSL;uniform float uSpr;uniform vec3 uSea;uniform float uCT;uniform float uCSh;uniform vec3 uSunT;uniform float uWin;uniform float uAut;uniform vec3 uHaze;uniform float uLow;uniform vec3 uMoonT;uniform float uMoonL;uniform float uNt;",
    )
    .replace(
      "#include <color_fragment>",
      `#include <color_fragment>
${TERR_FS_SLOPE}${TERR_FS_ROCK}${TERR_FS_SHORE}${TERR_FS_FOREST}${TERR_FS_AUTUMN}${TERR_FS_WINTER}${TERR_FS_SEASON}${TERR_FS_HAZE}`,
    )
    .replace("#include <fog_fragment>", "#include <fog_fragment>\n" + TERR_FS_NIGHT);
};
terrGeo.setAttribute("aNear", new THREE.BufferAttribute(new Float32Array(terrGeo.attributes.position.count), 1));
// 粗い網目の1マスの大きさ（作品の中の長さ）：カメラのまわりの細かい網目の縁で、どこまで内側を沈めるかに使う
const TERR_CELL = Math.max(tdx, tdy) * S * 1.05;
terrGeo.setAttribute("aCell", new THREE.BufferAttribute(new Float32Array(terrGeo.attributes.position.count).fill(TERR_CELL), 1));
// 地形の網目：湖とそのまわり（湖から約8km）は細かい網目のまま、その外の遠い山は3つおきの粗い網目で描く（三角形がおよそ半分に）。
// 粗い網目は細かい網目の所では下へ沈めて隠し（aSink）、細かい網目の縁の点は、粗い網目の辺の上にそろえて、すき間を作らない
const terr = new THREE.Mesh(terrGeo, terrMat);
terr.receiveShadow = true;
terr.position.set((tx0 + ((TW - 1) * tdx) / 2) * S, 0, (ty0 + ((TH - 1) * tdy) / 2) * S);
{
  const ST = 3,
    MG = 8000,
    al = (v, lo) => (lo ? Math.floor(v / ST) * ST : Math.ceil(v / ST) * ST),
    ci0 = Math.max(0, al(Math.floor((minX - MG - tx0) / tdx), true)),
    ci1 = Math.min(TW - 1, al(Math.ceil((maxX + MG - tx0) / tdx), false)),
    cj0 = Math.max(0, al(Math.floor((minY - MG - ty0) / tdy), true)),
    cj1 = Math.min(TH - 1, al(Math.ceil((maxY + MG - ty0) / tdy), false)),
    pos = terrGeo.attributes.position,
    idxA = terrGeo.index.array,
    qw = TW - 1;
  // 粗い網目（全体を3つおき。最後の行・列は必ず含める）
  const lst = (n) => {
      const a = [];
      for (let i = 0; i < n - 1; i += ST) a.push(i);
      a.push(n - 1);
      return a;
    },
    IX = lst(TW),
    JY = lst(TH),
    nv = IX.length * JY.length,
    og = new THREE.BufferGeometry(),
    attrs = {};
  for (const k of ["position", "normal", "color", "aCv"]) {
    const A = terrGeo.attributes[k],
      n = A.itemSize,
      arr = new Float32Array(nv * n);
    let o = 0;
    for (const j of JY)
      for (const i of IX) {
        const v = j * TW + i;
        for (let c = 0; c < n; c++) arr[o++] = A.array[v * n + c];
      }
    og.setAttribute(k, new THREE.BufferAttribute(arr, n));
  }
  const sink = new Float32Array(nv);
  {
    let o = 0;
    for (const j of JY) for (const i of IX) sink[o++] = i > ci0 + ST - 1 && i < ci1 - ST + 1 && j > cj0 + ST - 1 && j < cj1 - ST + 1 ? 1 : 0;
  }
  og.setAttribute("aSink", new THREE.BufferAttribute(sink, 1));
  og.setAttribute("aNear", new THREE.BufferAttribute(new Float32Array(nv), 1));
  og.setAttribute("aCell", new THREE.BufferAttribute(new Float32Array(nv).fill(TERR_CELL * ST), 1)); // 遠い山の網目は3つおき
  const oi = [],
    W = IX.length;
  for (let b = 0; b < JY.length - 1; b++)
    for (let a = 0; a < W - 1; a++) {
      const p0 = b * W + a,
        p1 = p0 + 1,
        p2 = p0 + W,
        p3 = p2 + 1;
      // 細かい網目の中に入る粗いマスは、三角形ごと省く
      if (IX[a] >= ci0 && IX[a + 1] <= ci1 && JY[b] >= cj0 && JY[b + 1] <= cj1) continue;
      oi.push(p0, p2, p1, p2, p3, p1);
    }
  // 細かい網目の外側の一列を含めて省くと縁にすき間ができるので、細かい網目の縁から1マス内側までの粗いマスは残し、沈めて隠す
  for (let b = 0; b < JY.length - 1; b++)
    for (let a = 0; a < W - 1; a++) {
      if (!(IX[a] >= ci0 && IX[a + 1] <= ci1 && JY[b] >= cj0 && JY[b + 1] <= cj1)) continue;
      if (IX[a] > ci0 && IX[a + 1] < ci1 && JY[b] > cj0 && JY[b + 1] < cj1) continue;
      const p0 = b * W + a,
        p1 = p0 + 1,
        p2 = p0 + W,
        p3 = p2 + 1;
      oi.push(p0, p2, p1, p2, p3, p1);
    }
  og.setIndex(oi);
  og.computeBoundingSphere();
  // 細かい網目：湖のまわりの範囲の三角形だけ
  const sub = [];
  for (let j = cj0; j < cj1; j++) {
    const o = (j * qw + ci0) * 6;
    for (let k = 0; k < (ci1 - ci0) * 6; k++) sub.push(idxA[o + k]);
  }
  // 縁の点：粗い網目の点（3つおき）の間にある点の高さを、両端の点の直線の上にそろえる（T字のすき間をなくす）
  const fix = (i, j, i0, j0, i1, j1, u) => {
    const v = j * TW + i,
      a = j0 * TW + i0,
      b = j1 * TW + i1;
    pos.setY(v, pos.getY(a) * (1 - u) + pos.getY(b) * u);
  };
  for (const j of [cj0, cj1])
    for (let i = ci0; i <= ci1; i++)
      if (i % ST) {
        const i0 = Math.floor(i / ST) * ST,
          i1 = Math.min(TW - 1, i0 + ST);
        fix(i, j, i0, j, i1, j, (i - i0) / (i1 - i0));
      }
  for (const i of [ci0, ci1])
    for (let j = cj0; j <= cj1; j++)
      if (j % ST) {
        const j0 = Math.floor(j / ST) * ST,
          j1 = Math.min(TH - 1, j0 + ST);
        fix(i, j, i, j0, i, j1, (j - j0) / (j1 - j0));
      }
  pos.needsUpdate = true;
  terrGeo.setIndex(sub);
  terrGeo.computeBoundingSphere();
  // 区画に分ける：地形を1枚で描くと、背中側の山も毎コマ（本描画と映り込みの両方で）描くことになる。
  // 頂点はそのまま共有して、三角形だけを区画（実寸で細かい網目は約18km、遠い山は約40km四方）ごとの子に分け、
  // 画面に入っている区画だけを描く（見た目は同じ）。terr 自身は親として残し、何も描かない
  const tiles = (geo, index, size) => {
    const P = geo.attributes.position,
      by = new Map();
    for (let t = 0; t < index.length; t += 3) {
      const v = index[t],
        k = Math.floor(P.getX(v) / (size * S)) * 4096 + Math.floor(P.getZ(v) / (size * S));
      if (!by.has(k)) by.set(k, []);
      by.get(k).push(index[t], index[t + 1], index[t + 2]);
    }
    for (const ix of by.values()) {
      const g = new THREE.BufferGeometry();
      for (const [k, a] of Object.entries(geo.attributes)) g.setAttribute(k, a);
      g.setIndex(ix);
      // 区画の範囲（その区画の三角形の頂点だけから。高さは沈めた分も含める）
      const bb = new THREE.Box3(),
        v3 = new THREE.Vector3();
      for (const v of ix) bb.expandByPoint(v3.fromBufferAttribute(P, v));
      bb.min.y -= 80;
      g.boundingBox = bb;
      g.boundingSphere = bb.getBoundingSphere(new THREE.Sphere());
      const m = new THREE.Mesh(g, terrMat);
      m.receiveShadow = true;
      terr.add(m);
    }
  };
  tiles(terrGeo, sub, 18000); // 湖のまわりの細かい網目
  tiles(og, oi, 40000); // 遠い山の粗い網目（位置は terr に合わせる）
  terrGeo.setIndex([]);
  terr.material = new THREE.MeshBasicMaterial({ visible: false }); // 親は描かない（子の区画だけを描く）
}
scene.add(terr);
// カメラのまわりの細かい網目：岸近くの細かい地形（NEAR）を30m間隔で描く。カメラが約240m動いたら作り直す。
// 縁の4マスは粗い地形の高さへなだらかにつなぎ、いちばん外の一周は粗い地形の下へ少し沈めて、すき間が見えないようにする
G.nearPatch = (() => {
  const N = QUALITY.nearPatch;
  if (!N || !nearBlk.size) return null;
  const st = NEAR.step,
    geo = new THREE.PlaneGeometry(N * st * S, N * st * S, N, N).rotateX(-Math.PI / 2),
    pos = geo.attributes.position,
    col = new Float32Array(pos.count * 3),
    cv = new Float32Array(pos.count),
    hh = new Float32Array(pos.count);
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("aCv", new THREE.BufferAttribute(cv, 1));
  geo.setAttribute("aNear", new THREE.BufferAttribute(new Float32Array(pos.count).fill(1), 1));
  geo.setAttribute("aCell", new THREE.BufferAttribute(new Float32Array(pos.count), 1));
  // 縁から粗い網目の1マス分（＋少し）は、粗い地形の高さへなだらかにつなぐ（その下の粗い地形は沈めないので、高さをそろえる）
  const BL = Math.max(4, Math.ceil(TERR_CELL / (st * S)) + 2);
  const m = new THREE.Mesh(geo, terrMat);
  m.receiveShadow = true;
  m.frustumCulled = false;
  m.visible = false;
  scene.add(m);
  let cx = 1e9,
    cy = 1e9;
  function build(x0, y0) {
    let any = false;
    for (let k = 0; k < pos.count; k++) {
      const i = k % (N + 1),
        j = Math.floor(k / (N + 1)),
        x = x0 + (i - N / 2) * st,
        y = y0 + (j - N / 2) * st,
        e = Math.min(i, j, N - i, N - j),
        hc = terrGrid(x, y, terrHD),
        hf = nearAt(x, y);
      if (hf !== null) any = true;
      const t = Math.min(1, Math.max(0, (e - 1) / BL)),
        h = hf === null ? hc : hc + (hf - hc) * t * t * (3 - 2 * t);
      hh[k] = h;
      pos.setXYZ(k, (i - N / 2) * st * S, h * S * VEX - (e === 0 ? 1.5 : 0), (j - N / 2) * st * S);
      const c = terrColor(h);
      col.set([c.r, c.g, c.b], k * 3);
    }
    // 尾根と谷（粗い地形と同じ考え方。30m間隔なので、約90m・270m先と比べる）
    const at = (i, j) => Math.max(0, hh[Math.min(N, Math.max(0, j)) * (N + 1) + Math.min(N, Math.max(0, i))]);
    for (let k = 0; k < pos.count; k++) {
      const i = k % (N + 1),
        j = Math.floor(k / (N + 1)),
        h = at(i, j);
      let v = 0;
      if (h > 0) for (const r of [3, 9]) v += (h - (at(i - r, j) + at(i + r, j) + at(i, j - r) + at(i, j + r)) / 4) / (r === 3 ? 5 : 15);
      cv[k] = Math.max(-1, Math.min(1, v));
    }
    pos.needsUpdate = geo.attributes.color.needsUpdate = geo.attributes.aCv.needsUpdate = true;
    geo.computeVertexNormals();
    m.position.set(x0 * S, 0, y0 * S);
    m.visible = any;
    NEAR_U.value.set(x0 * S, y0 * S, (N / 2 - 1) * st * S, any ? 1 : 0);
  }
  return {
    mesh: m,
    // x, y：カメラの真下（実寸m）。網目の点にそろえ、240m以上ずれたら作り直す
    update(x, y) {
      const q = st * 8,
        nx = Math.round(x / q) * q,
        ny = Math.round(y / q) * q;
      if (Math.abs(nx - cx) < 240 && Math.abs(ny - cy) < 240) return;
      cx = nx;
      cy = ny;
      build(nx, ny);
    },
  };
})();
const FOREST_TINT = SEASON.forestTint;
const SNOW = SEASON.snowPeak;
// 遠景用の等高線（陸）
const landContours = (() => {
  const out = [];
  for (const lv of [150, 400, 700, 1000]) {
    const P = [];
    for (let j = 0; j < TH - 1; j++)
      for (let i = 0; i < TW - 1; i++) {
        const a = terrH[j * TW + i],
          b = terrH[j * TW + i + 1],
          c = terrH[(j + 1) * TW + i + 1],
          d = terrH[(j + 1) * TW + i];
        const idx = (a > lv) | ((b > lv) << 1) | ((c > lv) << 2) | ((d > lv) << 3);
        if (!idx || idx === 15) continue;
        const x = tx0 + i * tdx,
          y = ty0 + j * tdy,
          L = (p, q) => (lv - p) / (q - p || 1);
        const e = [
            [x + L(a, b) * tdx, y],
            [x + tdx, y + L(b, c) * tdy],
            [x + L(d, c) * tdx, y + tdy],
            [x, y + L(a, d) * tdy],
          ],
          ed = [];
        if ((idx & 1) !== ((idx >> 1) & 1)) ed.push(e[0]);
        if (((idx >> 1) & 1) !== ((idx >> 2) & 1)) ed.push(e[1]);
        if (((idx >> 2) & 1) !== ((idx >> 3) & 1)) ed.push(e[2]);
        if (((idx >> 3) & 1) !== (idx & 1)) ed.push(e[3]);
        for (let k = 0; k + 1 < ed.length; k += 2) P.push(ed[k], ed[k + 1]);
      }
    out.push(P);
  }
  return out;
})();

