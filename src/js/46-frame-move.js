/* ---------- 毎フレーム①：建物の移動（舵・流れ・風・岸との当たり・向き） ---------- */
function moveHouse(dt, c, W) {
  // 舵（キーボード・スティック）を、カメラの向きに合わせて地図上の向きに直す
  {
    const tx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0),
      ty = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0),
      kk = 1 - Math.exp(-dt * 6);
    kIn.x += (tx - kIn.x) * kk;
    kIn.y += (ty - kIn.y) * kk;
  }
  let sx = steer.x + kIn.x,
    sy = steer.y + kIn.y;
  let gx = 0,
    gy = 0;
  if (B.goal) {
    const dx = B.goal[0] - B.x,
      dy = B.goal[1] - B.y,
      d = Math.hypot(dx, dy);
    if (d < 60) {
      B.vx *= 0.6;
      B.vy *= 0.6;
    }
    if (d < 60 || Math.abs(sx) + Math.abs(sy) > 0.1) B.goal = null;
    else {
      gx = (dx / d) * 0.3 * Math.min(1, d / 300);
      gy = (dy / d) * 0.3 * Math.min(1, d / 300);
    }
  }
  {
    const l = Math.hypot(sx, sy);
    if (l > 1) {
      sx /= l;
      sy /= l;
    }
  } // 4 斜め入力の正規化
  const fwdX = -Math.sin(yaw),
    fwdZ = -Math.cos(yaw),
    rgtX = Math.cos(yaw),
    rgtZ = -Math.sin(yaw);
  const boost = keys.Shift ? 1.8 : 1;
  const ruX = (rgtX * sx - fwdX * sy) * 0.38 * boost,
    ruY = (rgtZ * sx - fwdZ * sy) * 0.38 * boost;
  if (keys[" "] && B.vx !== undefined) {
    B.vx *= Math.exp(-dt * 3);
    B.vy *= Math.exp(-dt * 3);
  }
  let [vx, vy] = flow(B.x, B.y, c);
  vx -= W.x * 0.03;
  vy -= W.y * 0.03; // 湖流だけ
  const dr = 0.6 + 0.5 * BP.draft;
  vx = vx * dr + W.x * 0.03 * BP.wind;
  vy = vy * dr + W.y * 0.03 * BP.wind;
  const steering = Math.hypot(ruX, ruY) > 0.01 || !!B.goal;
  if (B.kick > 0) {
    B.kick -= dt;
    vx += B.kx;
    vy += B.ky;
  }
  vx += gx;
  vy += gy;
  if (STATE !== "lake") {
    vx = vy = 0;
  } else if (B.rest && !steering && !(B.kick > 0)) {
    vx = vy = 0;
  } else {
    const rb = B.rest ? 1.6 : 1;
    vx += ruX * BP.rudder * rb;
    vy += ruY * BP.rudder * rb;
  }
  {
    const vm = Math.hypot(vx, vy),
      cap = 0.7;
    if (vm > cap) {
      vx *= cap / vm;
      vy *= cap / vm;
    }
    const k = 1 - Math.exp(-dt * (steering ? 2.4 : 0.9));
    B.vx = (B.vx || 0) + (vx - (B.vx || 0)) * k;
    B.vy = (B.vy || 0) + (vy - (B.vy || 0)) * k;
    vx = B.vx;
    vy = B.vy;
  } // 慣性でなめらかに
  const nx = B.x + (vx * SPEED * dt) / S,
    ny = B.y + (vy * SPEED * dt) / S;
  const crossW = (G.harb || []).some(([a, b, c2, d]) => {
    const s = (x1, y1, x2, y2) => (x2 - x1) * (ny - y1) - (y2 - y1) * (nx - x1);
    const e = (x, y) => (c2 - a) * (y - b) - (d - b) * (x - a);
    return (
      e(B.x, B.y) * e(nx, ny) < 0 &&
      ((B.x - nx) * (b - ny) - (B.y - ny) * (a - nx)) * ((B.x - nx) * (d - ny) - (B.y - ny) * (c2 - nx)) < 0
    );
  });
  const blocked =
    crossW ||
    !inLake(nx, ny) ||
    depth(nx, ny) + LEVEL[c.month] / 100 < 0.3 ||
    (!BP.reeds && inReeds(nx, ny) && !inReeds(B.x, B.y)) ||
    (!BP.reeds && inInner(nx, ny) && !inMain(nx, ny));
  if (blocked && !crossW) {
    const tx = B.x + (vx * SPEED * dt) / S,
      ty = B.y;
    const ok1 = inLake(tx, ty) && depth(tx, ty) > 0.3,
      ok2 = inLake(B.x, B.y + (vy * SPEED * dt) / S) && depth(B.x, B.y + (vy * SPEED * dt) / S) > 0.3;
    if (ok1) {
      B.x = tx;
      B.vy *= 0.5;
    } else if (ok2) {
      B.y += (vy * SPEED * dt) / S;
      B.vx *= 0.5;
    }
  }
  if (Math.hypot(vx, vy) > 1e-4) {
    if (blocked) {
      if (!B.wasBlk && navigator.vibrate && joyId !== null)
        try {
          navigator.vibrate(12);
        } catch (e) {}
      B.wasBlk = 1;
      B.vx *= 0.3;
      B.vy *= 0.3;
      B.blk = (B.blk || 0) + dt;
      if (B.blk > 3) B.goal = null;
    } else {
      B.blk = 0;
      B.wasBlk = 0;
    }
    if (!blocked) {
      B.dist += Math.hypot(nx - B.x, ny - B.y);
      B.x = nx;
      B.y = ny;
      B.rest = false;
    } else {
      B.rest = true;
      B.kick = 0;
    }
  }
  restBtn.classList.toggle("on", STATE === "lake" && B.rest);
  const sp = Math.hypot(vx, vy);
  if (sp > 0.005 && !B.rest && (BP.align > 0.05 || steering)) {
    const tgt = Math.atan2(vy, vx);
    let d = tgt - B.yaw;
    if (BP.align > 0.6) d = Math.atan2(Math.sin(2 * d), Math.cos(2 * d)) / 2;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    B.yawV =
      (B.yawV || 0) + (d * (1.2 + Math.min(2, sp * 8)) * Math.max(0.3, BP.align) - (B.yawV || 0) * 2.2) * dt;
    B.yaw += B.yawV * dt;
  } else if (BP.align <= 0.05) B.yaw += dt * 0.01;
}
