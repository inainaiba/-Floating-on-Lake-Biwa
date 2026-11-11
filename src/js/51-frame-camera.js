/* ---------- 毎フレーム④：カメラ（水平を保って建物を追う） ---------- */
function updateCamera(dt, t, hx, hz) {
  idleLook(dt);
  // 鑑賞：ゆっくり回りながら、低い目線と少し高い目線、近くと遠くを、何分もかけて行き来する
  if (G.watch && STATE === "lake" && !isFar) {
    const s = (performance.now() - G.watch) / 1000;
    yawT += dt * (RM ? 0.01 : 0.022); // 動きを抑えるときは、さらにゆっくり
    pitch += (0.1 + 0.12 * Math.sin(s * 0.021) - pitch) * Math.min(1, dt * 0.3);
    distT = 80 + 55 * (0.5 + 0.5 * Math.sin(s * 0.013 + 1));
  }
  // カメラ：水平を保って建物を追う
  if (
    STATE === "lake" &&
    !G.camFix && // 紹介動画の撮影中（53-frame.js の __cam）は回り込まない
    performance.now() - (G.lastDrag || 0) > 4000 &&
    Math.hypot(B.vx || 0, B.vy || 0) > 0.03
  ) {
    const behind = Math.atan2(-(B.vx || 0), -(B.vy || 0)) + Math.PI;
    let dd = behind - yawT;
    dd = Math.atan2(Math.sin(dd), Math.cos(dd));
    yawT += dd * Math.min(1, dt * 0.25);
  }
  if (STATE === "lake") {
    let dy = yawT - yaw;
    yaw += dy * (1 - Math.exp(-dt * 4.5));
    if (!ptrs.size) dist += (distT - dist) * (1 - Math.exp(-dt * 3.5));
    else distT = dist;
  }
  if (STATE !== "lake") {
    yaw += dt * 0.12;
    yawT = yaw;
    dist = Math.max(26, house.size * 1.7, house.h * 2.6);
  }
  if (G.lock) {
    camX = G.lock[0];
    camZ = G.lock[1];
  } else {
    const k = 1 - Math.exp(-dt * 2.6);
    camX += (hx - camX) * k;
    camZ += (hz - camZ) * k;
  }
  const pc = STATE === "lake" ? Math.max(0.04, pitch) : Math.atan2(house.h * 0.5 + dist * 0.2, dist),
    hd = dist * Math.cos(pc),
    ch = Math.max(3.5, (STATE === "lake" ? 2 : 0) + dist * Math.sin(pc));
  const lookUp = STATE === "lake" && pitch < 0.04 ? Math.tan(Math.min(1.2, 0.04 - pitch)) * hd : 0;
  camera.position.set(camX + Math.sin(yaw) * hd, ch, camZ + Math.cos(yaw) * hd);
  {
    // 陸や島の上に回り込んだときは、地面より上に保つ
    const gh = Math.max(0, groundH(camera.position.x / S, camera.position.z / S)) + 1.5;
    if (camera.position.y < gh) camera.position.y = gh;
  }
  camera.lookAt(camX, (STATE === "lake" ? 2 : house.h * 0.45) + lookUp, camZ);
  {
    const wv = waveH(camera.position.x, camera.position.z, t) + water.position.y + 1.5;
    if (camera.position.y < wv) camera.position.y = wv;
  }
  if (STATE === "lake") {
    if (camera.view && camera.view.enabled) camera.clearViewOffset();
  } else {
    const w = innerWidth,
      h = innerHeight;
    camera.setViewOffset(w, h, 0, h * 0.2, w, h);
  }
}
