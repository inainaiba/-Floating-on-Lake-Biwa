function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  fpsN++;
  fpsT += dt;
  if (fpsT > 3) {
    const f = fpsN / fpsT;
    const old = resScale;
    if (f < 38) resScale = Math.max(0.5, resScale - 0.1);
    else if (f > 57) resScale = Math.min(QUALITY.resMax, resScale + 0.05);
    if (old !== resScale) resize();
    fpsN = 0;
    fpsT = 0;
  }
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

  const { wxNow, day, night, sunAngle } = updateSkyLight(dt, t, c, W);
  const { hx, hz } = floatHouse(dt, t, W, day);
  updateBoats(boats, dt, t, night);
  if (FW) FW.update(dt, c, day);
  if (G.buoys) G.buoys.update(t, day < 0.08);
  if (G.EV) G.EV.update(dt, c, day, t, W);
  updateCamera(dt, t, hx, hz);
  renderFrame(c, W, wxNow, day, sunAngle);
  requestAnimationFrame(frame);
}
// 確認用：URLに ?debug を付けたときだけ、撮影スクリプトから視点を動かせるようにする
if (Q.has("debug")) {
  window.__setH = (k, yw, pt, ds) => {
    const h = houses[k];
    B.x = h.x; B.y = h.y; camX = h.x * S; camZ = h.y * S;
    G.lock = [h.x * S, h.y * S];
    yaw = yawT = yw; pitch = pt; dist = distT = ds; STATE = "lake";
  };
  // 同じページのまま、月・時刻・天気・建物を切り替える（確認用）
  window.__scene = (q) => {
    if (q.month !== undefined) MO = String(q.month);
    if (q.phase !== undefined) PH = String(q.phase);
    if (q.wx !== undefined) WXQ = String(q.wx);
    if (q.t !== undefined) G.tFix = q.t;
    if (q.b !== undefined && q.b !== CUST.b) {
      CUST.b = q.b;
      buildHouse();
    }
  };
  window.__set = (lo, la, dx, dy, yw, pt, ds) => {
    G.lock = null;
    const [x, y] = ll(lo, la);
    B.x = x + dx; B.y = y + dy; B.vx = B.vy = 0; camX = B.x * S; camZ = B.y * S;
    yaw = yawT = yw; pitch = pt; dist = distT = ds;
  };
}
requestAnimationFrame(frame);
requestAnimationFrame(() => (document.getElementById("veil").style.opacity = 0));
