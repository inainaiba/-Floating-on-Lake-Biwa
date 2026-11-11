// 描く間隔の調整（画面の書き換えの間隔 ref ミリ秒、k 回に1回描く。c は前に描いてからの回数）
const PACE = { g: [], n: 0, ref: 16.7, k: 1, c: 0, prev: 0, low: 0, high: 0 };
function frame(now) {
  // 確認用：撮影の間は描画を止める（?debug の __frames / __pause から使う）
  if (G.paused) {
    requestAnimationFrame(frame);
    return;
  }
  if (G.frameWaiters) for (const f of G.frameWaiters.splice(0)) requestAnimationFrame(f);
  // 確認用に時計を止めているとき（G.tFix）は、動きの時刻も一定の歩みで進める（撮るたびに雲や波の形が違わないように）
  const fixed = G.tFix != null;
  // 画面の書き換えの間隔（Hz）に合わせて描く：60〜90Hz は毎回、120Hz・144Hz などは1つおき（60〜72コマ）、240Hz は3つおき。
  //   いつも同じ数だけ飛ばすので、コマの間隔が揃う（以前は「13.3ミリ秒より早ければ休む」で、75Hz・90Hz では描く・休むが不揃いになり引っかかった）
  if (!fixed) {
    const g = now - (PACE.prev || now);
    PACE.prev = now;
    if (g > 2 && g < 60) {
      PACE.g.push(g);
      if (PACE.g.length > 40) PACE.g.shift();
      if (++PACE.n % 20 === 0) {
        PACE.ref = [...PACE.g].sort((a, b) => a - b)[PACE.g.length >> 1]; // 書き換えの間隔（直近40回の中央値）
        PACE.k = Math.max(1, Math.round(15 / PACE.ref));
      }
    }
    if (++PACE.c < PACE.k && now - last < PACE.ref * PACE.k * 1.5) {
      requestAnimationFrame(frame);
      return;
    }
    PACE.c = 0;
  }
  // 動きの量：コマの間隔のぶれ（ブラウザの時刻の揺れ）をそのまま動きにすると揺れて見えるので、
  // ふだんの間隔に近いときは、決まった間隔（書き換えの間隔 × 飛ばす数）で進める。本当に遅れたコマだけ、実際の時間で追いつく
  const gap = now - last,
    step = PACE.ref * PACE.k,
    dt = fixed ? 1 / 30 : Math.min(0.1, (gap > step * 0.6 && gap < step * 1.45 ? step : gap) / 1000),
    rs0 = resScale;
  last = now;
  fpsN++;
  fpsT += Math.min(0.25, gap / 1000);
  if (fpsT > (G.resUp ? 3 : 1.5) && (!G.prof || G.perfMode)) {
    // 描画が重いときは解像度を下げる。解像度を変えると描く画面を作り直すので一瞬止まる。何度も上げ下げしないよう、
    //   下げるのは「目標の7割に届かない」が2回続いたとき（半分に届かないときはすぐ）、上げるのは「目標の95%を超える」が2回続いたときだけ。
    //   目標は描く速さ（書き換えの速さ ÷ 飛ばす数。60〜72コマ）。確認用 ?debug のときは、撮影の条件をそろえるため変えない（?debug&perf は除く）
    const f = fpsN / fpsT,
      goal = Math.min(72, Math.max(60, 1000 / step)), // 描く速さの目標（重くて書き換えに追いつかない間も、60 より下にはしない）
      old = resScale;
    if (f < goal * 0.5 || (f < goal * 0.7 && PACE.low)) (resScale = Math.max(0.5, resScale - (f < goal * 0.5 ? 0.15 : 0.08))), (G.resUp = 0), (PACE.low = 0), (PACE.high = 0);
    else if (f < goal * 0.7) (PACE.low = 1), (PACE.high = 0);
    else if (f > goal * 0.95 && PACE.high) (resScale = Math.min(QUALITY.resMax, resScale + 0.05)), (G.resUp = 1), (PACE.high = 0), (PACE.low = 0);
    else if (f > goal * 0.95) (PACE.high = 1), (PACE.low = 0);
    else (PACE.low = 0), (PACE.high = 0);
    if (old !== resScale) resize();
    fpsN = 0;
    fpsT = 0;
  }
  const p0 = performance.now(),
    prof = G.prof;
  if (prof) {
    renderer.info.autoReset = false; // 確認用：1フレーム分（映り込み・本描画・仕上げ）を合計して数える
    renderer.info.reset();
  } // 確認用：処理時間の内訳（?debug のときだけ G.prof がある）
  const c = clock(),
    W = wind(c),
    t = fixed ? (G.simT = (G.simT || 0) + dt) : now / 1000;
  moveHouse(dt, c, W);
  const boats = boatState(c);
  trailT += dt;
  if (STATE === "lake" && trailT > 1.5) {
    trailT = 0;
    B.trail.push([B.x, B.y]);
    if (B.trail.length > 4000) B.trail.shift();
  }

  {
    let nr = 0;
    const cx = Math.floor(B.x / 120),
      cy = Math.floor(B.y / 120);
    for (let a = -3; a <= 3; a++)
      for (let b = -3; b <= 3; b++)
        if (reedMask.has(cx + a + "," + (cy + b))) nr = Math.max(nr, 1 - Math.hypot(a, b) / 4.3);
    audioUpdate(dt, c, W, boats, nr);
  }
  if (isFar) {
    drawFar(boats, W.wx, W);
    requestAnimationFrame(frame);
    return;
  }

  const pA = performance.now();
  const { wxNow, day, night, sunAngle } = updateSkyLight(dt, t, c, W);
  const pB = performance.now();
  const { hx, hz } = floatHouse(dt, t, W, day);
  updateBoats(boats, dt, t, night);
  const pF = performance.now();
  // 景物の部品の毎フレームの更新（各部品が onFrame で登録したもの。00-head.js）
  {
    const f = { dt, t, c, day, W, wxNow };
    if (prof) {
      // 確認用：部品ごとの時間（遅れたコマの記録に使う。名前は onFrame の順番の数）
      const hk = (G.slowHk = {});
      for (const [o, fn] of FRAME_HOOKS) {
        const a = performance.now();
        fn(f);
        hk["#" + o] = (hk["#" + o] || 0) + performance.now() - a;
      }
    } else for (const [, fn] of FRAME_HOOKS) fn(f);
  }
  const pH = performance.now();
  updateCamera(dt, t, hx, hz);
  if (G.nearPatch) G.nearPatch.update(camera.position.x / S, camera.position.z / S); // カメラのまわりの細かい地形（16-terrain-2-mesh.js）
  const pN = performance.now();
  // 木が縮んで消える距離（cardForest の far）より遠い森の区画は、はじめから描かない
  {
    const cp = camera.position,
      v3 = G._v3 || (G._v3 = new THREE.Vector3());
    for (const I of G.forest || []) {
      v3.copy(I.boundingSphere.center).applyMatrix4(I.matrixWorld);
      const r = I.userData.far + I.boundingSphere.radius;
      I.visible = (v3.x - cp.x) ** 2 + (v3.z - cp.z) ** 2 < r * r;
    }
    // 小さな物の区画（石・柵・生け垣・小物など）は、画面で約1.5点より小さくなる距離から先は描かない（見た目は変わらない）。
    // 距離は、区画の中の物ひとつの大きさ（形の大きさ × 置いた大きさ）の約650倍。家のような大きな物は遠くまで描く
    if (!G.lodC) {
      G.lodC = [];
      const M = new THREE.Matrix4(),
        sc = new THREE.Vector3(),
        q = new THREE.Quaternion(),
        p = new THREE.Vector3();
      for (const c of G.chunks) {
        if ((G.forest || []).includes(c) || !c.isInstancedMesh || !c.count) continue;
        if (!c.geometry.boundingSphere) c.geometry.computeBoundingSphere();
        let m = 0;
        const n = Math.min(c.count, 8);
        for (let i = 0; i < n; i++) {
          c.getMatrixAt(Math.floor((i * c.count) / n), M);
          M.decompose(p, q, sc);
          m = Math.max(m, sc.x, sc.y, sc.z);
        }
        const far = 650 * c.geometry.boundingSphere.radius * m;
        if (far < 9000) G.lodC.push([c, far]), (c.userData.lodFar = far);
      }
    }
    for (const [c, far] of G.lodC) {
      v3.copy(c.boundingSphere.center).applyMatrix4(c.matrixWorld);
      const r = far + c.boundingSphere.radius;
      c.visible = (v3.x - cp.x) ** 2 + (v3.z - cp.z) ** 2 < r * r;
    }
  }
  const pC = performance.now();
  const hid = hideEmpty(); // 数が0の部品は描かない（52-frame-render.js）
  if (!G.noRender) renderFrame(c, W, wxNow, day, sunAngle); // 確認用 ?debug&perf&norender：描かずに、処理だけの引っかかりを測る
  for (const o of hid) o.visible = true;
  if (G.snapNow) finishPhoto(); // 撮影（32-photo.js）：描いた直後に画像にする
  if (prof) {
    const pD = performance.now(),
      add = (k, v) => (prof[k] = (prof[k] || 0) * 0.9 + v * 0.1);
    add("move", pA - p0);
    add("skyLight", pB - pA);
    add("elements", pC - pB);
    add("render", pD - pC);
    prof.calls = renderer.info.render.calls;
    prof.triangles = renderer.info.render.triangles;
    slowLog(now, gap, {
      move: pA - p0,
      skyLight: pB - pA,
      floatBoats: pF - pB,
      ...G.slowHk,
      camera_nearPatch: pN - pH,
      lod: pC - pN,
      render: pD - pC,
    }, pD - p0, resScale !== rs0);
  }
  requestAnimationFrame(frame);
}
// 確認用（?debug）：遅れたコマの記録。コマの間隔が、ふだんの間隔（直近の中央値）の1.6倍を超えたコマ、または処理が20ミリ秒を超えたコマを、
// そのコマの処理の内訳（時間の長い順）と一緒に残す。__slow() でまとめ、?debug&perf なら画面の左上に直近の記録を出す
const SLOW = { gaps: [], list: [], n: 0, since: 0 };
function slowLog(now, gap, parts, work, resized) {
  if (!SLOW.since) SLOW.since = now;
  SLOW.n++;
  const g = SLOW.gaps;
  g.push(gap);
  if (g.length > 120) g.shift();
  const med = [...g].sort((a, b) => a - b)[g.length >> 1] || 16.7;
  if (SLOW.n < 30 || (gap < med * 1.6 && work < 20)) return;
  const top = Object.entries(parts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k, v]) => k + " " + v.toFixed(1));
  SLOW.list.push({ at: +((now - SLOW.since) / 1000).toFixed(1), gap: +gap.toFixed(1), med: +med.toFixed(1), work: +work.toFixed(1), resized, top });
  if (SLOW.list.length > 300) SLOW.list.shift();
  if (SLOW.el) SLOW.el.textContent = SLOW.list.slice(-8).map((e) => `${e.at}s 間隔${e.gap}ms(ふだん${e.med}) 処理${e.work}ms${e.resized ? " 解像度" : ""} ｜ ${e.top.join(" / ")}`).join("\n");
}
// 確認用：URLに ?debug を付けたときだけ、撮影スクリプトから視点を動かせるようにする
if (Q.has("debug")) {
  window.__slow = (reset) => {
    const r = { frames: SLOW.n, slow: SLOW.list.length, list: SLOW.list.slice() };
    if (reset) (SLOW.list.length = 0), (SLOW.n = 0), (SLOW.since = 0), (SLOW.gaps.length = 0);
    return r;
  };
  window.__goal = (dx, dy) => (B.goal = [B.x + dx, B.y + dy]); // 確認用：いまの所から (dx, dy)（実寸m）へ向かわせる
  if (/[?&]perf/.test(location.search)) {
    G.noRender = /[?&]norender/.test(location.search);
    G.perfMode = true; // 確認用：解像度の自動調整もふだんどおりに動かす（その引っかかりも記録する）
    SLOW.el = Object.assign(document.createElement("pre"), { style: "position:fixed;left:6px;top:6px;z-index:99;margin:0;font:10px/1.35 monospace;color:#fff;background:rgba(0,0,0,.55);padding:4px 6px;pointer-events:none;white-space:pre" });
    document.body.appendChild(SLOW.el);
  }
  // 撮影スクリプトが中を調べるための口（?debug のときだけ）
  G.camera = camera;
  G.groundH = groundH;
  G.S = S;
  G.prof = {};
  G.scene = scene;
  G.dbg = { houses, inLake, inMain, inRiver, isleH, terrainAt, distShore, landY, PLACE_LOG, scene, terr, water };
  window.__setH = (k, yw, pt, ds) => {
    const h = houses[k];
    B.x = h.x; B.y = h.y; camX = h.x * S; camZ = h.y * S;
    G.lock = [h.x * S, h.y * S];
    yaw = yawT = yw; pitch = pt; dist = distT = ds; STATE = "lake";
  };
  // 同じページのまま、月・時刻・天気・建物を切り替える（確認用）
  window.__scene = (q) => {
    // 場面ごとに初期状態へ戻す：前の場面から持ち越す状態（雨上がり・時雨・稲光・流れ星・飛行機雲・
    // ときどき現れる舟）と、偶然に頼る出来事の乱数をそろえ、撮る順番に結果が左右されないようにする
    Math.random = rnd(20261028);
    G.resetSky();
    if (G.boats && G.boats.ship) {
      G.boats.ship.on = false;
      G.boats.ship.g.visible = false;
    }
    for (const b of (G.ambience && G.ambience.boats) || []) {
      b.on = false;
      b.g.visible = false;
    }
    if (q.month !== undefined) MO = String(q.month);
    if (q.phase !== undefined) PH = String(q.phase);
    if (q.wx !== undefined) WXQ = String(q.wx);
    if (q.t !== undefined) G.tFix = q.t;
    G.simT = 0; // 動きの時刻も、場面ごとに同じ所から
    if (q.b !== undefined && q.b !== CUST.b) {
      CUST.b = q.b;
      buildHouse();
    }
  };
  // 描画を n 回進めてから知らせる（撮影の前に場面を落ち着かせる）
  window.__frames = (n) =>
    new Promise((res) => {
      G.frameWaiters = G.frameWaiters || [];
      const step = (k) => (k <= 0 ? res() : G.frameWaiters.push(() => step(k - 1)));
      step(n);
    });
  // 撮影の間、描画を止める（画面には最後に描いた絵が残る）
  window.__pause = (p) => (G.paused = p);
  // カメラの向き・見上げ・距離だけを決める（紹介動画を1コマずつ描くとき、毎コマ呼んでゆっくり動かす。tools/video.py）。
  // 建築の進む向きへ回り込む動きは止める（G.camFix → 51-frame-camera.js）。建築の位置や漂いには触れない
  window.__cam = (yw, pt, ds) => {
    yaw = yawT = yw; pitch = pt; dist = distT = ds;
    G.camFix = true;
  };
  window.__set = (lo, la, dx, dy, yw, pt, ds) => {
    G.lock = null;
    const [x, y] = ll(lo, la);
    B.x = x + dx; B.y = y + dy; B.vx = B.vy = 0; camX = B.x * S; camZ = B.y * S;
    // 向き・回転・航跡の波紋も初期に戻す（前の場面の動きを持ち越さない）
    B.yaw = 0; B.yawV = 0; B.kick = 0; B.goal = null;
    G.resetTrail();
    yaw = yawT = yw; pitch = pt; dist = distT = ds;
  };
}
// 湖全体に散らばる動かない景物を、区画ごとの子に分ける（00-head.js の chunkify。画面の外の区画を描かない）
if (G.wakeMesh) G.wakeMesh.userData.noChunk = true; // 航跡は毎フレーム動く
{
  const list = [];
  scene.traverse((o) => {
    if (o.isInstancedMesh && !o.userData.chunkOf && !G.chunks.includes(o)) list.push(o);
  });
  for (const o of list) chunkify(o);
}
// 見た目の計算（シェーダー）の準備を、読み込み中の幕の後ろで済ませる。途中で初めて出てくる物（季節の景物・花火など）や、
// 映り込み（水面で切る面がある）の分もまとめて準備し、湖に出た直後や季節・天気が変わったときに一瞬止まらないようにする
{
  const hidden = [];
  scene.traverse((o) => {
    if (!o.visible) {
      hidden.push(o);
      o.visible = true;
    }
  });
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
  // compileAsync：GPU が並行してシェーダーを用意できるときは、それを待つ間も画面が止まらない（読み込み中の線が動く）
  try {
    renderer.setRenderTarget(rt);
    await renderer.compileAsync(scene, camera);
    renderer.setRenderTarget(rt);
    renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)];
    await renderer.compileAsync(scene, camera);
  } catch (e) {
    console.warn(e);
  }
  renderer.clippingPlanes = [];
  renderer.setRenderTarget(null);
  rt.dispose();
  // 画像（テクスチャ）も、ここでまとめて GPU へ送っておく（初めて画面に出た物の画像を、そのコマで送って一瞬止まるのを防ぐ）
  {
    const seen = new Set(),
      put = (t) => {
        if (!t || !t.isTexture || t.isRenderTargetTexture || seen.has(t)) return;
        seen.add(t);
        try {
          renderer.initTexture(t);
        } catch (e) {}
      };
    scene.traverse((o) => {
      for (const m of [].concat(o.material || [])) {
        for (const k in m) if (m[k] && m[k].isTexture) put(m[k]);
        if (m.uniforms) for (const k in m.uniforms) put(m.uniforms[k] && m.uniforms[k].value);
      }
    });
  }
  for (const o of hidden) o.visible = false;
}
Math.random = TRUE_RANDOM; // 組み立てが終わったら、乱数を元に戻す（00-head.js）
if (!G.tFix && !/[?&]debug/.test(location.search)) resumeLake(); // 画質を変えて読み込み直したときは、元の所から（31-ui.js）
window.__ready = true; // 読み込みが終わった（これより後の誤りでは、描けない幕を出さない。src/shell.html）
requestAnimationFrame(frame);
requestAnimationFrame(() => (document.getElementById("veil").style.opacity = 0));
