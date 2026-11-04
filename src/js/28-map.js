/* ---------- 遠景：線画 ---------- */
const far = document.getElementById("far"),
  fx = far.getContext("2d");
const contours = (() => {
  const out = [];
  for (const lv of [10, 30, 50, 70, 90]) {
    const P = [];
    for (let j = 0; j < GH - 1; j++)
      for (let i = 0; i < GW - 1; i++) {
        const a = depthG[j * GW + i],
          b = depthG[j * GW + i + 1],
          c = depthG[(j + 1) * GW + i + 1],
          d = depthG[(j + 1) * GW + i];
        const idx = (a > lv) | ((b > lv) << 1) | ((c > lv) << 2) | ((d > lv) << 3);
        if (!idx || idx === 15) continue;
        const x = minX + i * CELL,
          y = minY + j * CELL,
          L = (p, q) => (lv - p) / (q - p || 1);
        const e = [
            [x + L(a, b) * CELL, y],
            [x + CELL, y + L(b, c) * CELL],
            [x + L(d, c) * CELL, y + CELL],
            [x, y + L(a, d) * CELL],
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
const FZ = { z: 1, px: 0, py: 0 };
function fzAt(k, qx, qy) {
  if (!far._map || !far._base) return;
  const w = far.width,
    h = far.height,
    z = Math.max(1, Math.min(14, FZ.z * k)),
    [ox, oy, sc] = far._map,
    [ox0, oy0, sc0] = far._base,
    ux = (qx - ox) / sc,
    uy = (qy - oy) / sc,
    s2 = sc0 * z;
  FZ.px = qx - ux * s2 - w / 2 - (ox0 - w / 2) * z;
  FZ.py = qy - uy * s2 - h / 2 - (oy0 - h / 2) * z;
  FZ.z = z;
  if (z === 1) {
    FZ.px = FZ.py = 0;
  }
  far._map = [w / 2 + FZ.px + (ox0 - w / 2) * z, h / 2 + FZ.py + (oy0 - h / 2) * z, s2];
}
function drawFar(boats = [], wxNow = null, W = null) {
  const w = far.width,
    h = far.height,
    dpr = far._dpr;
  fx.setTransform(1, 0, 0, 1, 0, 0);
  fx.fillStyle = "#f6f5f0";
  fx.fillRect(0, 0, w, h);
  const m = 40 * dpr,
    sc0 = Math.min((w - 2 * m) / (maxX - minX), (h - 2 * m) / (maxY - minY)),
    ox0 = (w - (maxX - minX) * sc0) / 2 - minX * sc0,
    oy0 = (h - (maxY - minY) * sc0) / 2 - minY * sc0;
  const Z = FZ.z,
    sc = sc0 * Z,
    ox = w / 2 + FZ.px + (ox0 - w / 2) * Z,
    oy = h / 2 + FZ.py + (oy0 - h / 2) * Z;
  const X = (x) => ox + x * sc,
    Y = (y) => oy + y * sc;
  far._map = [ox, oy, sc];
  far._base = [ox0, oy0, sc0];
  fx.lineJoin = "round";
  fx.strokeStyle = "rgba(27,27,27,.18)";
  fx.lineWidth = 0.8 * dpr;
  fx.beginPath();
  for (const P of contours)
    for (let k = 0; k < P.length; k += 2) {
      fx.moveTo(X(P[k][0]), Y(P[k][1]));
      fx.lineTo(X(P[k + 1][0]), Y(P[k + 1][1]));
    }
  fx.stroke();
  fx.strokeStyle = "rgba(27,27,27,.13)";
  fx.lineWidth = 0.7 * dpr;
  fx.beginPath();
  for (const P of landContours)
    for (let k = 0; k < P.length; k += 2) {
      fx.moveTo(X(P[k][0]), Y(P[k][1]));
      fx.lineTo(X(P[k + 1][0]), Y(P[k + 1][1]));
    }
  fx.stroke();
  fx.fillStyle = "rgba(27,27,27,.55)";
  for (const [px, py, h] of PK.slice(0, 4)) {
    const k = 4 * dpr;
    fx.beginPath();
    fx.moveTo(X(px), Y(py) - k);
    fx.lineTo(X(px) - k * 0.8, Y(py) + k * 0.5);
    fx.lineTo(X(px) + k * 0.8, Y(py) + k * 0.5);
    fx.closePath();
    fx.fill();
  }
  // 陸の川と池：3Dの景色と同じ地理院の水域（06-inner-lakes.js の RIVERS。外周と穴の多角形）。うすく塗って縁を細く描く
  fx.beginPath();
  for (const poly of RIVERS)
    for (const ring of poly) {
      ring.forEach(([x, y], i) => (i ? fx.lineTo(X(x), Y(y)) : fx.moveTo(X(x), Y(y))));
      fx.closePath();
    }
  fx.fillStyle = "rgba(27,27,27,.07)";
  fx.fill("evenodd");
  fx.strokeStyle = "rgba(27,27,27,.3)";
  fx.lineWidth = 0.6 * dpr;
  fx.stroke();
  // 鉄道（湖西線・琵琶湖線）：地図の鉄道の記号のように、黒い線に白い破線を重ねる（24-shore-landmarks.js の G.kosei・G.biwako）。
  // トンネルは細い破線、駅は白い丸
  for (const K of [G.kosei, G.biwako]) {
    if (!K) continue;
    const { pts: kp, tun } = K,
      path = (inT) => {
        fx.beginPath();
        for (let i = 0; i < kp.length - 1; i++) {
          if ((tun[i] && tun[i + 1]) !== inT) continue;
          fx.moveTo(X(kp[i][0]), Y(kp[i][1]));
          fx.lineTo(X(kp[i + 1][0]), Y(kp[i + 1][1]));
        }
      };
    path(false);
    fx.strokeStyle = "rgba(27,27,27,.7)";
    fx.lineWidth = 2.2 * dpr;
    fx.stroke();
    fx.save();
    fx.setLineDash([5 * dpr, 5 * dpr]);
    fx.strokeStyle = "#f6f5f0";
    fx.lineWidth = 1.1 * dpr;
    fx.stroke();
    path(true);
    fx.setLineDash([2.5 * dpr, 2.5 * dpr]);
    fx.strokeStyle = "rgba(27,27,27,.7)";
    fx.lineWidth = 1 * dpr;
    fx.stroke();
    fx.restore();
    fx.fillStyle = "#f6f5f0";
    fx.strokeStyle = "rgba(27,27,27,.8)";
    fx.lineWidth = 1 * dpr;
    for (const q of K.st) {
      fx.beginPath();
      fx.arc(X(q.x), Y(q.y), 2.4 * dpr, 0, 7);
      fx.fill();
      fx.stroke();
    }
  }
  fx.strokeStyle = "#1b1b1b";
  fx.lineWidth = 1.3 * dpr;
  fx.beginPath();
  for (const poly of [outer, ...islands]) {
    poly.forEach(([x, y], i) => (i ? fx.lineTo(X(x), Y(y)) : fx.moveTo(X(x), Y(y))));
    fx.closePath();
  }
  fx.stroke();
  fx.strokeStyle = "#1b1b1b";
  fx.lineWidth = 1 * dpr;
  fx.beginPath();
  for (const p of innerPolys) {
    p.forEach(([x, y], i) => (i ? fx.lineTo(X(x), Y(y)) : fx.moveTo(X(x), Y(y))));
  }
  fx.stroke();
  fx.lineWidth = 0.7 * dpr;
  fx.beginPath();
  for (const p of innerChan) {
    fx.moveTo(X((p[0][0] + p[3][0]) / 2), Y((p[0][1] + p[3][1]) / 2));
    fx.lineTo(X((p[1][0] + p[2][0]) / 2), Y((p[1][1] + p[2][1]) / 2));
  }
  fx.stroke();
  fx.save();
  fx.setLineDash([2 * dpr, 3 * dpr]);
  fx.strokeStyle = "rgba(27,27,27,.45)";
  fx.beginPath();
  for (const p of RECLAIMED) {
    p.forEach(([x, y], i) => (i ? fx.lineTo(X(x), Y(y)) : fx.moveTo(X(x), Y(y))));
  }
  fx.stroke();
  fx.restore(); // 干拓された内湖
  fx.strokeStyle = "#1b1b1b";
  fx.lineWidth = 0.6 * dpr;
  fx.beginPath();
  for (const [x, y] of innerReedPts.filter((_, i) => i % 6 === 0)) {
    fx.moveTo(X(x), Y(y));
    fx.lineTo(X(x), Y(y) - 4 * dpr);
  }
  for (let i = 0; i < reedPts.length; i += 8) {
    const [x, y] = reedPts[i];
    fx.moveTo(X(x), Y(y));
    fx.lineTo(X(x), Y(y) - 4 * dpr);
  }
  fx.stroke();
  fx.lineWidth = 2.2 * dpr;
  for (const b of LAKE.bridges) {
    fx.beginPath();
    b.pts.forEach(([x, y], i) => (i ? fx.lineTo(X(x), Y(y)) : fx.moveTo(X(x), Y(y))));
    fx.stroke();
  }
  fx.fillStyle = "rgba(27,27,27,.28)";
  for (const hh of houses) {
    fx.fillRect(X(hh.x) - 0.5 * dpr, Y(hh.y) - 0.5 * dpr, 1.1 * dpr, 1.1 * dpr);
  }
  fx.fillStyle = "rgba(27,27,27,.5)";
  for (const [x, y] of G.eri || []) fx.fillRect(X(x), Y(y), 0.8 * dpr, 0.8 * dpr);
  fx.fillStyle = "#1b1b1b";
  for (const [x, y] of LAKE.ports) {
    fx.beginPath();
    fx.arc(X(x), Y(y), 1.8 * dpr, 0, 7);
    fx.fill();
  }
  if (G.buoys) {
    fx.save();
    for (const it of G.buoys.items) {
      const bx = X(it.g.position.x / S),
        by = Y(it.g.position.z / S);
      fx.beginPath();
      const vd = VIS.has(it.url);
      if (!vd) {
        fx.beginPath();
        fx.arc(bx, by, 7 * dpr, 0, 7);
        fx.lineWidth = 1 * dpr;
        fx.strokeStyle = "rgba(226,54,28,.55)";
        fx.stroke();
      }
      fx.beginPath();
      fx.arc(bx, by, 3.4 * dpr, 0, 7);
      if (vd) {
        fx.lineWidth = 1.4 * dpr;
        fx.strokeStyle = "#e2361c";
        fx.fillStyle = "#f6f5f0";
        fx.fill();
        fx.stroke();
      } else {
        fx.fillStyle = "#e2361c";
        fx.fill();
      }
    }
    if (FZ.z >= 2.5) {
      const seen = {};
      fx.font = 12 * dpr + 'px "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif';
      fx.textBaseline = "middle";
      fx.lineJoin = "round";
      for (const it of G.buoys.items) {
        if (!it.name || it.name.startsWith("（")) continue;
        const bx = X(it.g.position.x / S),
          by = Y(it.g.position.z / S);
        const s = seen[it.name];
        if (s && Math.hypot(s[0] - bx, s[1] - by) < 90 * dpr) continue;
        seen[it.name] = [bx, by];
        const tx = bx + 10 * dpr,
          ty = by;
        fx.lineWidth = 4 * dpr;
        fx.strokeStyle = "#f6f5f0";
        fx.strokeText(it.name, tx, ty);
        fx.fillStyle = "#7a2a1a";
        fx.fillText(it.name, tx, ty);
      }
    }
    fx.restore();
  }
  for (const b of boats) {
    fx.save();
    fx.translate(X(b.x), Y(b.y));
    fx.rotate(b.h);
    fx.beginPath();
    const k = (b.kind === "fish" ? 2.5 : 4.5) * dpr;
    fx.moveTo(k, 0);
    fx.lineTo(-k, -k * 0.6);
    fx.lineTo(-k, k * 0.6);
    fx.closePath();
    fx.fill();
    fx.restore();
  }
  // 湖に浮かぶ建築（44c-floating-halls.js）：形で見分ける小さな印。図書館は八角、映画館は横長の幕、音楽堂は半円の殻、花屋は星形、茶屋は丸、郵便局はひし形。
  // 岸に着いて使われている間は塗りつぶし、漂っている間は輪郭だけ（文字は出さない）
  if (G.hallMarks) {
    fx.save();
    for (const m of G.hallMarks()) {
      const hx = X(m.x),
        hy = Y(m.y),
        k = 5.5 * dpr;
      fx.beginPath();
      if (m.k === "lib") for (let i = 0; i < 8; i++) fx[i ? "lineTo" : "moveTo"](hx + Math.cos((i / 8) * 6.283 + 0.39) * k, hy + Math.sin((i / 8) * 6.283 + 0.39) * k);
      else if (m.k === "cin") fx.rect(hx - k * 1.3, hy - k * 0.55, k * 2.6, k * 1.1);
      else if (m.k === "tea") fx.arc(hx, hy, k * 0.85, 0, 6.283); // 茶屋は丸（茶碗）
      else if (m.k === "post") (fx.moveTo(hx, hy - k * 1.05), fx.lineTo(hx + k * 1.05, hy), fx.lineTo(hx, hy + k * 1.05), fx.lineTo(hx - k * 1.05, hy)); // 郵便局はひし形
      else if (m.k === "flo") for (let i = 0; i < 10; i++) fx[i ? "lineTo" : "moveTo"](hx + Math.cos((i / 10) * 6.283 - 1.571) * k * (i % 2 ? 0.5 : 1.1), hy + Math.sin((i / 10) * 6.283 - 1.571) * k * (i % 2 ? 0.5 : 1.1)); // 花屋は星形（花）
      else {
        fx.arc(hx, hy + k * 0.35, k * 1.05, Math.PI, 0);
      }
      fx.closePath();
      fx.lineWidth = 1.6 * dpr;
      fx.strokeStyle = "#8a4b1c";
      fx.fillStyle = "#d98a3a";
      if (m.moored) fx.fill();
      fx.stroke();
    }
    fx.restore();
  }
  // 名所：小さな菱形だけ（建物の名前は出さない。地図は眺めるためのもの）
  {
    fx.save();
    for (const m of MEISHO) {
      const mx = X(m.ax),
        my = Y(m.ay),
        k = 3.2 * dpr;
      fx.fillStyle = "#4a4a46";
      fx.beginPath();
      fx.moveTo(mx, my - k);
      fx.lineTo(mx + k, my);
      fx.lineTo(mx, my + k);
      fx.lineTo(mx - k, my);
      fx.closePath();
      fx.fill();
    }
    fx.restore();
  }
  // 自分（操作する建物）は濃い藍色：赤いブイ・橙の水上建築と見分けやすく
  fx.strokeStyle = "rgba(35,72,168,.75)";
  fx.lineWidth = 1.8 * dpr;
  fx.beginPath();
  B.trail.forEach(([x, y], i) =>
    i ? fx.lineTo(X(x), Y(y)) : fx.moveTo(X(x), Y(y)),
  );
  fx.lineTo(X(B.x), Y(B.y));
  fx.stroke();
  fx.fillStyle = "rgba(27,27,27,.45)";
  fx.font = 9 * dpr + "px sans-serif";
  fx.textAlign = "right";
  fx.fillText("国土地理院 ／ © OpenStreetMap contributors", w - 10 * dpr, h - 8 * dpr);
  fx.textAlign = "left";
  if (B.goal) {
    fx.strokeStyle = "#1b1b1b";
    fx.lineWidth = 1 * dpr;
    fx.beginPath();
    fx.arc(X(B.goal[0]), Y(B.goal[1]), 5 * dpr, 0, 7);
    fx.stroke();
    fx.setLineDash([2 * dpr, 3 * dpr]);
    fx.beginPath();
    fx.moveTo(X(B.x), Y(B.y));
    fx.lineTo(X(B.goal[0]), Y(B.goal[1]));
    fx.stroke();
    fx.setLineDash([]);
  }
  {
    const px = X(B.x),
      py = Y(B.y),
      pu = ((performance.now() / 1000) % 2) / 2;
    fx.strokeStyle = `rgba(35,72,168,${1 - pu})`;
    fx.lineWidth = 2 * dpr;
    fx.beginPath();
    fx.arc(px, py, (6 + pu * 16) * dpr, 0, 7);
    fx.stroke();
    fx.save();
    fx.translate(px, py);
    fx.rotate(B.yaw);
    fx.fillStyle = "#2348a8";
    fx.strokeStyle = "#fff";
    fx.lineWidth = 1.5 * dpr;
    fx.beginPath();
    fx.moveTo(10 * dpr, 0);
    fx.lineTo(-7 * dpr, -6 * dpr);
    fx.lineTo(-3.5 * dpr, 0);
    fx.lineTo(-7 * dpr, 6 * dpr);
    fx.closePath();
    fx.fill();
    fx.stroke();
    fx.restore();
  }
}
