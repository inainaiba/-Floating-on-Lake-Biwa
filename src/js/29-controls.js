/* ---------- 操作：ドラッグで視点、ホイール/ピンチで寄り引き、矢印キー/スティックで舵 ---------- */
let distT = 60,
  yawT = 0.6,
  yaw = 0.6,
  pitch = 0.32,
  dist = 60,
  isFar = false;
const ptrs = new Map();
let pinch0 = 0;
const setFar = (v) => {
  isFar = v;
  document.body.classList.toggle("far", v);
  if (!v && G.hidePick) G.hidePick(); // 地図を閉じたら、行き先の吹き出しも消す
};
document.getElementById("view").onclick = () => {
  setFar(!isFar);
  if (!isFar) dist = Math.min(dist, 120);
};
addEventListener(
  "wheel",
  (e) => {
    if (STATE !== "lake") return;
    if (e.shiftKey) {
      pitch = Math.max(-0.7, Math.min(1.45, pitch + e.deltaY * 0.002));
      return;
    }
    if (isFar) return;
    distT = Math.max(60, Math.min(320, distT * Math.exp(e.deltaY * 0.0012)));
    if (distT >= 320) setFar(true);
  },
  { passive: true },
);
const joy = document.getElementById("joy"),
  knob = joy.firstElementChild;
let joyId = null;
joy.addEventListener("pointerdown", (e) => {
  joy.style.opacity = 1;
  joyId = e.pointerId;
  joy.setPointerCapture(joyId);
  e.stopPropagation();
});
joy.addEventListener("pointermove", (e) => {
  if (e.pointerId !== joyId) return;
  const r = joy.getBoundingClientRect(),
    dx0 = (e.clientX - r.left - r.width / 2) / (r.width * 0.42),
    dy0 = (e.clientY - r.top - r.height / 2) / (r.width * 0.42),
    m0 = Math.hypot(dx0, dy0),
    mm = m0 < 0.12 ? 0 : Math.pow(Math.min(1, (m0 - 0.12) / 0.88), 1.4),
    dx = m0 ? (dx0 / m0) * mm : 0,
    dy = m0 ? (dy0 / m0) * mm : 0,
    l = Math.min(1, Math.hypot(dx, dy)) / (Math.hypot(dx, dy) || 1);
  steer.x = dx * l;
  steer.y = dy * l;
  knob.style.transform = `translate(${steer.x * 22}px,${steer.y * 22}px)`;
});
const joyEnd = () => {
  joy.style.opacity = "";
  joyId = null;
  steer.x = steer.y = 0;
  knob.style.transition = "transform .2s";
  knob.style.transform = "";
  setTimeout(() => (knob.style.transition = ""), 220);
};
joy.addEventListener("pointerup", joyEnd);
joy.addEventListener("pointercancel", joyEnd);
const gl = document.getElementById("gl");
gl.addEventListener("pointerdown", (e) => {
  ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  gl.setPointerCapture(e.pointerId);
  if (ptrs.size === 2) {
    const [a, b] = [...ptrs.values()];
    pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]);
  }
});
gl.addEventListener("pointermove", (e) => {
  const p = ptrs.get(e.pointerId);
  if (!p) return;
  G.lastDrag = performance.now();
  if (ptrs.size === 1 && STATE === "lake") {
    yawT = (typeof yawT === "number" ? yawT : yaw) - (e.clientX - p[0]) * (3.6 / Math.max(400, innerWidth));
    pitch = Math.max(-0.7, Math.min(1.45, pitch + (e.clientY - p[1]) * 0.005));
  } else if (ptrs.size === 2) {
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    const [a, b] = [...ptrs.values()],
      d = Math.hypot(a[0] - b[0], a[1] - b[1]);
    if (G.pm !== undefined)
      pitch = Math.max(-0.7, Math.min(1.45, pitch + ((a[1] + b[1]) / 2 - G.pm) * 0.004));
    G.pm = (a[1] + b[1]) / 2;
    distT = Math.max(60, (distT * pinch0) / d);
    dist = distT;
    pinch0 = d;
    if (dist > 320) setFar(true);
    dist = Math.min(320, dist);
    return;
  }
  ptrs.set(e.pointerId, [e.clientX, e.clientY]);
});
let lastTap = 0;
gl.addEventListener("dblclick", (e) => {
  if (STATE !== "lake") return;
  const r = new THREE.Raycaster(),
    v = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, (-e.clientY / innerHeight) * 2 + 1);
  r.setFromCamera(v, camera);
  const p = new THREE.Vector3();
  if (r.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p)) {
    B.goal = [p.x / S, p.z / S];
  }
});
const up = (e) => {
  ptrs.delete(e.pointerId);
  if (ptrs.size < 2) G.pm = undefined;
};
gl.addEventListener("pointerup", up);
gl.addEventListener("pointercancel", up);
{
  const fp = new Map();
  let moved = 0,
    pd0 = 0;
  far.addEventListener("pointerdown", (e) => {
    fp.set(e.pointerId, [e.clientX, e.clientY]);
    far.setPointerCapture(e.pointerId);
    if (fp.size === 1) moved = 0;
    if (fp.size === 2) {
      const [a, b] = [...fp.values()];
      pd0 = Math.hypot(a[0] - b[0], a[1] - b[1]);
    }
  });
  far.addEventListener("pointermove", (e) => {
    if (!fp.has(e.pointerId)) return;
    const o = fp.get(e.pointerId),
      d = far._dpr;
    const dx = e.clientX - o[0],
      dy = e.clientY - o[1];
    fp.set(e.pointerId, [e.clientX, e.clientY]);
    if (fp.size === 1) {
      moved += Math.abs(dx) + Math.abs(dy);
      if (FZ.z > 1) {
        FZ.px += dx * d;
        FZ.py += dy * d;
      }
    } else if (fp.size === 2) {
      const [a, b] = [...fp.values()],
        pd = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (pd0 > 0) fzAt(pd / pd0, ((a[0] + b[0]) / 2) * d, ((a[1] + b[1]) / 2) * d);
      pd0 = pd;
      moved = 99;
    }
  });
  const fup = (e) => {
    fp.delete(e.pointerId);
    if (fp.size < 2) pd0 = 0;
  };
  far.addEventListener("pointerup", fup);
  far.addEventListener("pointercancel", fup);
  far.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const d = far._dpr;
      fzAt(Math.exp(-e.deltaY * 0.0015), e.clientX * d, e.clientY * d);
    },
    { passive: false },
  );
  far.addEventListener("dblclick", () => {
    setFar(false);
    dist = 200;
  });
  // 地図をタップしたら、すぐには向かわず、行き先の名前と「ここへ向かう」を出して確かめる
  const pick = document.createElement("div");
  pick.id = "mpick";
  pick.style.cssText =
    "position:fixed;z-index:8;display:none;transform:translate(-50%,calc(-100% - 14px));background:#f6f5f0;color:#1b1b1b;border:1px solid rgba(27,27,27,.25);border-radius:6px;padding:8px 10px 6px;font:12px/1.6 'Hiragino Mincho ProN','Yu Mincho','Noto Serif JP',serif;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.15);white-space:nowrap";
  document.body.appendChild(pick);
  const hidePick = () => {
    pick.style.display = "none";
    G.mapPick = null;
  };
  // 行き先のいちばん近い名所・港・集落の名前（3km 以内）
  const placeName = (x, y) => {
    let best = null,
      bd = 3000;
    for (const m of MEISHO) {
      const d = Math.hypot(m.ax - x, m.ay - y);
      if (d < bd) (bd = d), (best = m.name);
    }
    for (const q of LAKE.ports) {
      const d = Math.hypot(q[0] - x, q[1] - y);
      if (q[2] && d < bd) (bd = d), (best = q[2]);
    }
    return best;
  };
  far.addEventListener("click", (e) => {
    if (!far._map || moved > 8) return;
    const [ox, oy, sc] = far._map,
      d = far._dpr,
      x = (e.clientX * d - ox) / sc,
      y = (e.clientY * d - oy) / sc,
      en = CFG.lang === "en",
      nm = placeName(x, y),
      water = inLake(x, y);
    G.mapPick = [x, y];
    pick.innerHTML =
      `<div style="opacity:.75;font-size:11px">${nm ? (en ? "near " : "") + nm + (en ? "" : " の近く") : en ? "on the lake" : "湖の上"}${water ? "" : en ? " (on land: you will stop at the shore)" : "（陸の上：岸で止まります）"}</div>` +
      `<span data-a="go" style="display:inline-block;margin-top:4px;padding:3px 12px;border-radius:12px;background:#1b1b1b;color:#f6f5f0;cursor:pointer">${en ? "Sail here" : "ここへ向かう"}</span>` +
      `<span data-a="no" style="display:inline-block;margin:4px 0 0 8px;padding:3px 8px;cursor:pointer;opacity:.6">${en ? "Cancel" : "やめる"}</span>`;
    pick.style.left = e.clientX + "px";
    pick.style.top = e.clientY + "px";
    pick.style.display = "block";
  });
  pick.addEventListener("click", (e) => {
    const a = e.target.dataset.a;
    if (a === "go" && G.mapPick) B.goal = G.mapPick;
    if (a) hidePick();
  });
  // 地図を動かしたり拡大したりしたら、吹き出しは消す（タップした所からずれるため）
  far.addEventListener("pointermove", () => moved > 8 && pick.style.display === "block" && hidePick());
  far.addEventListener("wheel", () => pick.style.display === "block" && hidePick());
  G.hidePick = hidePick;
}
const keys = {};
addEventListener("keydown", (e) => {
  keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = 1;
  if (e.key.startsWith("Arrow") && STATE === "lake") e.preventDefault();
});
addEventListener("keyup", (e) => (keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = 0));
addEventListener("keydown", (e) => {
  if (STATE !== "lake") return;
  if (e.key === "q") yawT += 0.35;
  if (e.key === "e") yawT -= 0.35;
  if (e.key === "r" || e.key === "R") {
    yawT = B.yaw + Math.PI / 2;
    pitch = 0.32;
    distT = 60;
  }
  if (e.key === "+" || e.key === "=") distT = Math.max(60, distT * 0.8);
  if (e.key === "-") distT = Math.min(320, distT * 1.25);
});
addEventListener("blur", () => {
  for (const k in keys) keys[k] = 0;
}); // 3 タブを離れたら舵を戻す
const kIn = { x: 0, y: 0 };
