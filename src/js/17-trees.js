/* ---------- 木：描いた葉と枝の絵を十字に組んだ板で、自然な輪郭とすき間を出す ---------- */
function paintTree(kind, seed) {
  const W = 256,
    H = 256,
    c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  const R = rnd(seed);
  const leaf = (x, y, r, col, a) => {
    g.fillStyle = col;
    g.globalAlpha = a;
    g.beginPath();
    for (let k = 0; k < 7; k++) {
      const ang = R() * 6.28,
        rr = r * (0.3 + R() * 0.7);
      g.moveTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
      g.arc(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr, r * (0.25 + R() * 0.35), 0, 7);
    }
    g.fill();
    g.globalAlpha = 1;
  };
  const shade = (y, cy, top) => {
    const k = Math.max(0, Math.min(1, (y - top) / (H - top)));
    return k;
  };
  const trunkCol = "#3e3226";
  g.strokeStyle = trunkCol;
  g.lineCap = "round";
  let clusters = [];
  if (kind === "pine") {
    // 幹は曲がり、枝先に平たい葉の雲
    let x = W / 2 + (R() - 0.5) * 20,
      y = H;
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(x, y);
    const pts = [];
    for (let i = 0; i < 6; i++) {
      x += (R() - 0.5) * 28 + (i > 2 ? 8 : 0);
      y -= 26 + R() * 8;
      g.lineTo(x, y);
      pts.push([x, y]);
    }
    g.stroke();
    for (let i = 1; i < pts.length; i++) {
      const [px, py] = pts[i];
      for (const sd of [-1, 1]) {
        if (R() < 0.3) continue;
        const ex = px + sd * (30 + R() * 55),
          ey = py - 10 + R() * 14;
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(px, py);
        g.quadraticCurveTo((px + ex) / 2, py - 14, ex, ey);
        g.stroke();
        clusters.push([ex, ey - 4, 22 + R() * 14, 0.45]);
      }
    }
    clusters.push([x, y - 6, 26, 0.45]);
  } else if (kind === "bamboo") {
    // 竹：細くまっすぐな稈が何本も立ち、上の方に細かい葉がしだれる
    g.strokeStyle = "#7c8a52";
    for (let k = 0; k < 9; k++) {
      const x0 = W / 2 + (R() - 0.5) * 120,
        lean = (R() - 0.5) * 30;
      g.lineWidth = 2 + R() * 2;
      g.beginPath();
      g.moveTo(x0, H);
      g.quadraticCurveTo(x0 + lean * 0.3, H * 0.5, x0 + lean, 10 + R() * 30);
      g.stroke();
      for (let y = 30; y < H * 0.55; y += 14) clusters.push([x0 + lean * (1 - y / H) + (R() - 0.5) * 30, y + R() * 10, 10 + R() * 8, 0.6]);
    }
    g.strokeStyle = "#3e3226";
  } else if (kind === "cedar") {
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(W / 2, H);
    g.lineTo(W / 2, 30);
    g.stroke();
    for (let y = 40; y < H - 20; y += 9) {
      const w = ((y - 30) / (H - 50)) * 95 + 8;
      clusters.push([W / 2 + (R() - 0.5) * w * 0.6, y, 8 + w * 0.25, 1]);
      clusters.push([W / 2 - w * 0.5 + R() * w, y + 4, 6 + w * 0.18, 1]);
    }
  } else {
    // 広葉樹：幹から分かれる枝と、丸く重なる葉の房
    const tx = W / 2 + (R() - 0.5) * 10;
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(tx, H);
    g.lineTo(tx, H * 0.55);
    g.stroke();
    for (let b = 0; b < 5; b++) {
      const ang = -Math.PI / 2 + (R() - 0.5) * 1.8,
        L = 50 + R() * 55,
        ex = tx + Math.cos(ang) * L,
        ey = H * 0.55 + Math.sin(ang) * L;
      g.lineWidth = 3 + R() * 2;
      g.beginPath();
      g.moveTo(tx, H * 0.6);
      g.quadraticCurveTo(tx + (ex - tx) * 0.4, H * 0.5, ex, ey);
      g.stroke();
      clusters.push([ex, ey, 30 + R() * 18, 1]);
    }
    for (let i = 0; i < 8; i++) clusters.push([tx + (R() - 0.5) * 150, 40 + R() * 110, 22 + R() * 20, 1]);
  }
  const top = Math.min(...clusters.map((c) => c[1] - c[2]));
  const base = kind === "pine" ? [54, 78, 52] : kind === "cedar" ? [44, 66, 48] : kind === "bamboo" ? [96, 124, 64] : [78, 108, 60];
  for (const [cx, cy, r, f] of clusters) {
    const n = Math.floor(r * 1.4);
    for (let i = 0; i < n; i++) {
      const a = R() * 6.28,
        q = Math.sqrt(R()) * r,
        x = cx + Math.cos(a) * q,
        y = cy + Math.sin(a) * q * (kind === "pine" ? 0.45 : 0.85);
      const lit = 1 - shade(y, cy, top) * 0.55 + (x < cx ? 0.1 : -0.05) + (y < cy ? 0.12 : -0.12);
      const v = (0.75 + R() * 0.35) * lit;
      const col = `rgb(${(base[0] * v) | 0},${(base[1] * v) | 0},${(base[2] * v) | 0})`;
      leaf(x, y, 3 + R() * 4, col, 0.9);
    }
  }
  const tx = new THREE.CanvasTexture(c);
  tx.colorSpace = THREE.SRGBColorSpace;
  tx.anisotropy = 4;
  return tx;
}
function cardTreeGeom(h, w, n = 3) {
  const ps = [],
    uv = [],
    nm = [],
    idx = [];
  for (let k = 0; k < n; k++) {
    const a = (k * Math.PI) / n,
      cx = (Math.cos(a) * w) / 2,
      cz = (Math.sin(a) * w) / 2,
      o = k * 4;
    ps.push(-cx, 0, -cz, cx, 0, cz, cx, h, cz, -cx, h, -cz);
    uv.push(0, 0, 1, 0, 1, 1, 0, 1);
    for (let i = 0; i < 4; i++) nm.push(0, 1, 0);
    idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(ps, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nm, 3));
  g.setIndex(idx);
  return g;
}
var TREE_TEX = {};
function treeTex(kind, v) {
  const k = kind + v;
  return TREE_TEX[k] || (TREE_TEX[k] = paintTree(kind, (kind.length * 97 + v * 31) | 0));
}
function cardTreeMat(kind, v, near, far) {
  const m = new THREE.MeshBasicMaterial({
    map: treeTex(kind, v),
    alphaTest: 0.45,
    alphaToCoverage: true,
    side: THREE.DoubleSide,
  });
  m.userData.card = 1;
  m.userData.kind = kind;
  (G.cards = G.cards || []).push(m);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = reedU.uT;
    sh.uniforms.uW = reedU.uW;
    sh.uniforms.uSunD = reedU.uSunD;
    // 木の板の明暗：日の向きに向いた板ほど明るく（vCL）、樹冠の上は明るく下は暗く（下の map の縦の位置で）
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uT;uniform vec2 uW;uniform vec3 uSunD;varying float vCL;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvec4 tw=modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.);float td=length(cameraPosition.xz-tw.xz);transformed*=1.-smoothstep(" +
          near.toFixed(1) +
          "," +
          far.toFixed(1) +
          ",td);float hh=position.y/10.;transformed.xz+=uW*.25*hh*hh*sin(uT*1.1+tw.x*.2+tw.z*.17);" +
          "vec3 nW=normalize(mat3(modelMatrix*instanceMatrix)*normal);float sl_=clamp(uSunD.y*3.,0.,1.);vCL=.95+.6*abs(dot(normalize(nW.xz+1e-4),normalize(uSunD.xz+1e-4)))*sl_+.1*sl_;",
      );
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vCL;")
      .replace("#include <map_fragment>", "#include <map_fragment>\ndiffuseColor.rgb*=vCL*(.8+.5*vMapUv.y);");
  };
  return m;
}
// 種類ごとに3枚の絵を描き分け、木ごとにどれかを使う
// tint：木の色にかける倍率 [r, g, b]（1より大きくもできる。竹生島のカワウで白く枯れた木などに使う）
function cardForest(kind, list, hgt, wid, near, far, shadow, tint) {
  list = list.filter(([x, y]) => !inRiver(x, y) && !meishoClear(x, y)); // 川の上と、名所の建物の上（03b-meisho-sites.js）には立てない
  placeLog("木・" + ({ broad: "広葉樹", pine: "松", cedar: "杉", bamboo: "竹" }[kind] || kind), "land", list);
  for (let v = 0; v < 3; v++) {
    const all = list.filter((_, i) => i % 3 === v);
    if (!all.length) continue;
    // 区画（00-head.js の CHUNK）ごとに分けて、画面の外の区画を描かないようにする。形と材質は区画どうしで共有
    const geo = cardTreeGeom(hgt, wid, kind === "cedar" ? 2 : 3),
      mat = cardTreeMat(kind, v, near, far),
      byChunk = new Map();
    for (const p of all) {
      const k = chunkOf(p[0], p[1]);
      if (!byChunk.has(k)) byChunk.set(k, []);
      byChunk.get(k).push(p);
    }
    for (const sel of byChunk.values()) {
    const I = new THREE.InstancedMesh(geo, mat, sel.length),
      M = new THREE.Matrix4(),
      c = new THREE.Color();
    sel.forEach(([x, y, gy, s, r], i) => {
      M.compose(
        new THREE.Vector3(x * S, gy, y * S),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r * 6.28, 0)),
        new THREE.Vector3(s, s * (0.85 + ((i * 7) % 5) * 0.06), s),
      );
      I.setMatrixAt(i, M);
      // 木ごとの明るさと色のむら（黄緑寄り〜青緑寄り）
      const hv = ((i * 29) % 11) / 10 - 0.5;
      I.setColorAt(i, c.setRGB(1 + hv * 0.1, 1, 1 - hv * 0.12).multiplyScalar(1.05 + ((i * 13) % 7) * 0.04));
      if (tint) I.instanceColor.setXYZ(i, c.r * tint[0], c.g * tint[1], c.b * tint[2]);
    });
    I.castShadow = !!shadow;
    I.userData.kind = kind;
    I.userData.tint = tint; // 季節の塗り直し（49-frame-sky-light.js）でも同じ倍率をかける
    I.userData.noChunk = true; // すでに区画ごと
    I.userData.far = far; // これより遠い区画は描かない（53-frame.js。木は far までに縮んで消えている）
    I.computeBoundingSphere();
    scene.add(I);
    G.chunks.push(I);
    (G.forest = G.forest || []).push(I);
    }
  }
}
