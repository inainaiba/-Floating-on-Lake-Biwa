function frame(now) {
  // 確認用：撮影の間は描画を止める（?debug の __frames / __pause から使う）
  if (G.paused) {
    requestAnimationFrame(frame);
    return;
  }
  if (G.frameWaiters) for (const f of G.frameWaiters.splice(0)) requestAnimationFrame(f);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  fpsN++;
  fpsT += dt;
  if (fpsT > 3 && !G.prof) {
    // 描画が重いときは解像度を下げる（確認用 ?debug のときは、撮影の条件をそろえるため変えない）
    const f = fpsN / fpsT;
    const old = resScale;
    if (f < 38) resScale = Math.max(0.5, resScale - 0.1);
    else if (f > 57) resScale = Math.min(QUALITY.resMax, resScale + 0.05);
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
    t = now / 1000;
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
  if (FW) FW.update(dt, c, day);
  if (G.buoys) G.buoys.update(t, day < 0.08);
  if (G.EV) G.EV.update(dt, c, day, t, W);
  if (G.ambience) G.ambience.update(dt, t, c, day);
  if (G.moments) G.moments.update(dt, t, c, W);
  if (G.life) G.life.update(dt, t, c, day, wxNow);
  if (G.boats) G.boats.update(dt, t, c, day, wxNow);
  if (G.shore) G.shore.update(dt, t, c, day, wxNow);
  updateCamera(dt, t, hx, hz);
  const pC = performance.now();
  renderFrame(c, W, wxNow, day, sunAngle);
  if (prof) {
    const pD = performance.now(),
      add = (k, v) => (prof[k] = (prof[k] || 0) * 0.9 + v * 0.1);
    add("move", pA - p0);
    add("skyLight", pB - pA);
    add("elements", pC - pB);
    add("render", pD - pC);
    prof.calls = renderer.info.render.calls;
    prof.triangles = renderer.info.render.triangles;
  }
  requestAnimationFrame(frame);
}
// 確認用：URLに ?debug を付けたときだけ、撮影スクリプトから視点を動かせるようにする
if (Q.has("debug")) {
  // 撮影スクリプトが中を調べるための口（?debug のときだけ）
  G.camera = camera;
  G.groundH = groundH;
  G.S = S;
  G.prof = {};
  G.scene = scene;
  G.dbg = { houses, inLake, inMain, isleH, terrainAt, distShore, landY, PLACE_LOG };
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
requestAnimationFrame(frame);
requestAnimationFrame(() => (document.getElementById("veil").style.opacity = 0));
