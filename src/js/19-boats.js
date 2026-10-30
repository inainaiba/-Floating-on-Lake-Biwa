/* ---------- 船：定期船は共有時計で決まった航路を走る（サーバー不要） ---------- */
const nearestIn = (x, y) => {
  if (inLake(x, y) && depth(x, y) > 2) return [x, y];
  for (let r = 100; r < 4000; r += 100)
    for (let a = 0; a < 6.28; a += 0.3) {
      const px = x + Math.cos(a) * r,
        py = y + Math.sin(a) * r;
      if (inLake(px, py) && depth(px, py) > 2) return [px, py];
    }
  return [x, y];
};
// 港の位置：長浜・柳が崎は地理院の注記に合わせた（雄琴・琵琶湖大橋は注記がなく概略のまま）
const PORT_LL = {
  imazu: [136.033, 35.413],
  chikubu: [136.143, 35.417],
  nagahama: [136.2641, 35.372],
  otsu: [135.866, 35.012],
  nionohama: [135.879, 35.004],
  yanagasaki: [135.8671, 35.0268],
  ogoto: [135.899, 35.075],
  ohashi: [135.932, 35.104],
};
// 船が着く点（水深2m以上の沖に寄せた点）。港の施設はこれではなく、下の PORT_SITES（岸の点）に建てる
const PORT = Object.fromEntries(
  Object.entries({
    imazu: [136.033, 35.413],
    chikubu: [136.143, 35.417],
    nagahama: [136.2641, 35.372],
    otsu: [135.866, 35.012],
    nionohama: [135.879, 35.004],
    yanagasaki: [135.8671, 35.0268],
    ogoto: [135.899, 35.075],
    ohashi: [135.932, 35.104],
  }).map(([k, [lo, la]]) => [k, nearestIn(...ll(lo, la))]),
);
// 港の施設（防波堤・灯り・桟橋・舟小屋・架台）を建てる岸の点
const PORT_SITES = [...Object.values(PORT_LL).map(([lo, la]) => ll(lo, la)), ...LAKE.ports.map((q) => [q[0], q[1]])].map(([x, y]) => shoreSnap(x, y));
const WP = Object.fromEntries(
  Object.entries({
    s1: [135.9, 35.035],
    s2: [135.925, 35.075],
    s3: [135.945, 35.11],
    s4: [135.985, 35.15],
    oki: [136.055, 35.19],
    takei: [136.205, 35.285],
    shira: [136.02, 35.27],
    mid: [136.12, 35.32],
    m1: [135.885, 35.04],
    m2: [135.905, 35.03],
  }).map(([k, [lo, la]]) => [k, nearestIn(...ll(lo, la))]),
);
const P = (k) => PORT[k] || WP[k];
// 航路：[港・経由点の列, 一日あたりの便数(往復), 速さm/s, 種類, 運航する時間帯]
const ROUTES = [
  {
    path: ["imazu", "chikubu"],
    trips: 4,
    v: 7,
    kind: "cruise",
    hours: [0.3, 0.72],
    stop: ["imazu", "chikubu"],
  },
  {
    path: ["nagahama", "chikubu"],
    trips: 4,
    v: 7,
    kind: "cruise",
    hours: [0.31, 0.73],
    stop: ["nagahama", "chikubu"],
  },
  {
    path: ["imazu", "chikubu", "nagahama"],
    trips: 1,
    v: 7,
    kind: "cruise",
    hours: [0.33, 0.7],
    stop: ["imazu", "chikubu", "nagahama"],
  },
  {
    path: ["otsu", "ogoto", "ohashi", "s4", "oki", "takei", "chikubu", "shira", "s4", "s3", "s2", "otsu"],
    trips: 1,
    v: 9,
    kind: "cruise",
    hours: [0.3, 0.75],
    stop: ["otsu", "chikubu"],
  },
  {
    path: ["otsu", "yanagasaki", "m1", "s2", "m2", "nionohama", "otsu"],
    trips: 3,
    v: 4,
    kind: "michigan",
    hours: [0.33, 0.88],
    stop: ["otsu", "nionohama"],
  },
];
const clearLine = (a, b) => {
  for (let u = 0; u <= 1; u += 0.01) {
    const x = a[0] + (b[0] - a[0]) * u,
      y = a[1] + (b[1] - a[1]) * u;
    if (depth(x, y) < 1.5) return false; // 陸は深さ0なので、湖の外かどうかもこれで分かる
  }
  return true;
};
// 小さい順に取り出す二分ヒープ（経路探しの候補。毎回並べ替えると、200m格子では数秒かかる）
class MinHeap {
  constructor() {
    this.k = [];
    this.v = [];
  }
  get size() {
    return this.k.length;
  }
  push(key, val) {
    const K = this.k,
      V = this.v;
    let i = K.length;
    K.push(key);
    V.push(val);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (K[p] <= K[i]) break;
      [K[p], K[i]] = [K[i], K[p]];
      [V[p], V[i]] = [V[i], V[p]];
      i = p;
    }
  }
  pop() {
    const K = this.k,
      V = this.v,
      top = [K[0], V[0]],
      lk = K.pop(),
      lv = V.pop();
    if (K.length) {
      K[0] = lk;
      V[0] = lv;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1,
          r = l + 1;
        let m = i;
        if (l < K.length && K[l] < K[m]) m = l;
        if (r < K.length && K[r] < K[m]) m = r;
        if (m === i) break;
        [K[m], K[i]] = [K[i], K[m]];
        [V[m], V[i]] = [V[i], V[m]];
        i = m;
      }
    }
    return top;
  }
}
function astar(a, b) {
  const id = (i, j) => j * GW + i,
    ok = (i, j) => i >= 0 && j >= 0 && i < GW && j < GH && depthG[id(i, j)] > 2.5;
  const ci = (p) => [Math.round((p[0] - minX) / CELL), Math.round((p[1] - minY) / CELL)];
  let [s0, s1] = ci(a),
    [g0, g1] = ci(b);
  const fix = (i, j) => {
    if (ok(i, j)) return [i, j];
    for (let r = 1; r < 8; r++)
      for (let di = -r; di <= r; di++)
        for (let dj = -r; dj <= r; dj++) if (ok(i + di, j + dj)) return [i + di, j + dj];
    return [i, j];
  };
  [s0, s1] = fix(s0, s1);
  [g0, g1] = fix(g0, g1);
  const G = new Float32Array(GW * GH).fill(1e9),
    from = new Int32Array(GW * GH).fill(-1),
    open = new MinHeap();
  open.push(0, id(s0, s1));
  G[id(s0, s1)] = 0;
  while (open.size) {
    const [f, k0] = open.pop(),
      i = k0 % GW,
      j = (k0 / GW) | 0;
    if (f - Math.hypot(i - g0, j - g1) > G[k0] + 1e-6) continue; // すでに短い道が見つかっている古い候補
    if (i === g0 && j === g1) break;
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const ni = i + di,
        nj = j + dj;
      if (!ok(ni, nj)) continue;
      const c = G[id(i, j)] + Math.hypot(di, dj) * (1 + 3 / (depthG[id(ni, nj)] + 1));
      if (c < G[id(ni, nj)]) {
        G[id(ni, nj)] = c;
        from[id(ni, nj)] = id(i, j);
        open.push(c + Math.hypot(ni - g0, nj - g1), id(ni, nj));
      }
    }
  }
  const path = [];
  let k = id(g0, g1);
  while (k >= 0) {
    path.push([minX + (k % GW) * CELL, minY + Math.floor(k / GW) * CELL]);
    k = from[k];
  }
  path.reverse();
  const out = [a];
  let cur = a;
  for (let i = 1; i < path.length; i++) {
    if (!clearLine(cur, path[i])) {
      out.push(path[i - 1]);
      cur = path[i - 1];
    }
  }
  out.push(b);
  return out;
}
ROUTES.forEach((r, ri) => {
  r.ri = ri;
});
for (const r of ROUTES) {
  const raw = r.path.map((k, ii) => {
    const p = P(k);
    if (!PORT[k]) return p;
    const ang = r.ri * 1.3 + (k === r.path[0] ? 0 : ii),
      o = [p[0] + Math.cos(ang) * (220 + r.ri * 90), p[1] + Math.sin(ang) * (220 + r.ri * 90)];
    return inLake(o[0], o[1]) && depth(o[0], o[1]) > 2 ? o : p;
  });
  r.pts = [raw[0]];
  for (let i = 1; i < raw.length; i++) {
    const seg = clearLine(raw[i - 1], raw[i]) ? [raw[i - 1], raw[i]] : astar(raw[i - 1], raw[i]);
    r.pts.push(...seg.slice(1));
  }
  const segs = [];
  let L = 0;
  for (let i = 0; i < r.pts.length - 1; i++) {
    const a = r.pts[i],
      b = r.pts[i + 1],
      l = Math.hypot(b[0] - a[0], b[1] - a[1]) * S;
    segs.push([a, b, L, l]);
    L += l;
  }
  r.segs = segs;
  r.L = L;
}
// 漁船：漁港の近くで朝早く動く
const fishPorts = LAKE.ports.length ? LAKE.ports : [[0, 0]];
const FISH = Array.from({ length: 6 }, (_, i) => {
  const p = fishPorts[(i * 5) % fishPorts.length];
  return { home: nearestIn(p[0], p[1]), seed: i * 1.7 };
});

var ROUTE_OFF = [0.05, 0.35, 0.8, 0.65, 0.05];
function routePos(ri, dayT) {
  const out = [];
  const r = ROUTES[ri];
  {
    if (dayT < r.hours[0] || dayT > r.hours[1]) return;
    const span = (r.hours[1] - r.hours[0]) * DAY,
      per = span / r.trips,
      local = ((dayT - r.hours[0]) * DAY + (ROUTE_OFF[ri] || 0) * per) % per;
    const loop = r.path[0] === r.path[r.path.length - 1],
      vv = Math.max(r.v, r.L / (per * (loop ? 0.85 : 0.42))),
      travel = r.L / vv,
      dwell = Math.max(0, (per - 2 * travel) / 2); // 往き→停泊→帰り→停泊
    let s,
      dir = 1;
    if (r.path[0] === r.path[r.path.length - 1]) {
      const tt = r.L / vv;
      s = Math.min(r.L, local * vv);
      if (local > tt) s = r.L;
    } else if (local < travel) s = local * vv;
    else if (local < travel + dwell) s = r.L;
    else if (local < 2 * travel + dwell) {
      s = r.L - (local - travel - dwell) * vv;
      dir = -1;
    } else s = 0;
    const sg = r.segs.find((q) => s <= q[2] + q[3]) || r.segs[r.segs.length - 1],
      u = Math.min(1, Math.max(0, (s - sg[2]) / sg[3])),
      a = sg[0],
      b = sg[1];
    const moving = s > 0 && s < r.L;
    const ox = 0,
      oy = 0;
    out.push({
      id: "r" + ri,
      kind: r.kind,
      x: a[0] + (b[0] - a[0]) * u + ox,
      y: a[1] + (b[1] - a[1]) * u + oy,
      h: Math.atan2((b[1] - a[1]) * dir, (b[0] - a[0]) * dir),
      moving,
      speed: moving ? r.v : 0,
    });
  }
  return out[0] || null;
}
function boatState(c) {
  const out = [];
  const dayT = c.phase;
  const placed = [];
  ROUTES.forEach((r, ri) => {
    const p = routePos(ri, dayT);
    if (p) out.push(p);
  });
  if (dayT > 0.19 && dayT < 0.45)
    FISH.forEach((f, i) => {
      const k = (dayT - 0.19) / 0.26,
        out_ = Math.sin(Math.PI * k),
        a = f.seed + c.t / 180,
        R = out_ * 900;
      const x = f.home[0] + Math.cos(a) * R,
        y = f.home[1] + Math.sin(a) * R;
      if (!inLake(x, y)) return;
      out.push({ id: "f" + i, kind: "fish", x, y, h: a + Math.PI / 2, moving: true, speed: 2.5 });
    });
  return out;
}

// 船の形
function makeBoat(kind) {
  const g = new THREE.Group(),
    white = new THREE.MeshLambertMaterial({ color: 0xf2f2ee }),
    dark = new THREE.MeshLambertMaterial({ color: 0x2d3a48 });
  if (kind === "cruise") {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(32, 3, 8), white);
    hull.position.y = 1;
    g.add(hull);
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(18, 3, 6.5), white);
    c1.position.set(-2, 4, 0);
    g.add(c1);
    const band = new THREE.Mesh(new THREE.BoxGeometry(32.2, 0.8, 8.2), dark);
    band.position.y = 0.2;
    g.add(band);
    const win = new THREE.Mesh(
      new THREE.BoxGeometry(18.1, 1, 6.6),
      new THREE.MeshLambertMaterial({ color: 0x223040 }),
    );
    win.position.set(-2, 4.4, 0);
    g.add(win);
  } else if (kind === "michigan") {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(60, 3, 12), white);
    hull.position.y = 1;
    g.add(hull);
    for (let i = 0; i < 3; i++) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(46 - i * 10, 2.8, 11 - i), white);
      d.position.set(2, 4 + i * 2.8, 0);
      g.add(d);
    }
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(4.5, 4.5, 10, 16, 1, true),
      new THREE.MeshLambertMaterial({ color: 0xb03a2e, side: THREE.DoubleSide }),
    );
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(-32, 3.5, 0);
    g.add(wheel);
    g.wheel = wheel;
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 6), dark);
    st.position.set(10, 13, 0);
    g.add(st);
  } else {
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(8, 1.2, 2.6),
      new THREE.MeshLambertMaterial({ color: 0xdedad0 }),
    );
    hull.position.y = 0.4;
    g.add(hull);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2, 1.6, 1.8), white);
    cab.position.set(-1.5, 1.6, 0);
    g.add(cab);
  }
  const lamp = new THREE.PointLight(0xfff0d0, 0, kind === "fish" ? 30 : 80, 1.5);
  lamp.position.y = kind === "fish" ? 3 : 9;
  g.add(lamp);
  g.lamp = lamp;
  const bulbs = new THREE.Mesh(
    new THREE.SphereGeometry(kind === "fish" ? 0.25 : 0.5, 6, 4),
    new THREE.MeshBasicMaterial({ color: 0xffe2a8 }),
  );
  bulbs.position.y = lamp.position.y;
  g.add(bulbs);
  g.bulbs = bulbs;
  return g;
}
const boatMeshes = new Map();
let W_SENSE = 1;
// 航跡：白い泡の点を落として薄れさせる
const WAKE_N = 3000,
  wake = G.wakeMesh = new THREE.InstancedMesh(
    new THREE.CircleGeometry(1, 12).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      color: 0xf2f6f6,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      map: cvTex(64, 64, (g, w, h) => {
        const gr = g.createRadialGradient(32, 32, 8, 32, 32, 32);
        gr.addColorStop(0, "rgba(255,255,255,0)");
        gr.addColorStop(0.7, "rgba(255,255,255,.7)");
        gr.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = gr;
        g.fillRect(0, 0, 64, 64);
        g.globalCompositeOperation = "destination-out";
        for (let i = 0; i < 120; i++) {
          g.fillStyle = "rgba(0,0,0,.6)";
          g.beginPath();
          g.arc(Math.random() * 64, Math.random() * 64, 1 + Math.random() * 3, 0, 7);
          g.fill();
        }
      }),
    }),
    WAKE_N,
  );
wake.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
G.wake = wake;
const wakeP = [];
let wakeI = 0;
scene.add(wake);
wake.frustumCulled = false;
const avoid = new Map(); // 自分の画面だけでの避ける量
let wakeBob = 0;
function updateBoats(boats, dt, t, night) {
  const hx = B.x * S,
    hz = B.y * S;
  const seen = new Set();
  wakeBob *= Math.exp(-dt * 0.6);
  {
    const vm = Math.hypot(B.vx || 0, B.vy || 0);
    if (vm > 0.04 && Math.random() < dt * Math.min(30, vm * 45)) {
      const ux = (B.vx || 0) / vm,
        uz = (B.vy || 0) / vm,
        bk = house.size * 0.55,
        sx = hx - ux * bk,
        sz = hz - uz * bk,
        nx = -uz,
        nz = ux;
      for (const s of [-1, 1])
        wakeP[wakeI++ % WAKE_N] = {
          x: sx + nx * s * house.size * 0.35,
          z: sz + nz * s * house.size * 0.35,
          vx: nx * s * 0.6,
          vz: nz * s * 0.6,
          born: t,
          big: false,
        };
    }
  }
  for (const b of boats) {
    seen.add(b.id);
    let m = boatMeshes.get(b.id);
    if (!m) {
      m = makeBoat(b.kind);
      boatMeshes.set(b.id, m);
      scene.add(m);
    }
    let x = b.x * S,
      z = b.y * S;
    // 建物を避ける：近いときだけ横にずれる（他の人の画面では本来の航路のまま）
    const dx = x - hx,
      dz = z - hz,
      d = Math.hypot(dx, dz),
      need = b.kind === "michigan" ? 90 : b.kind === "cruise" ? 70 : 35;
    let av = avoid.get(b.id) || 0;
    const nx = -Math.sin(b.h),
      nz = Math.cos(b.h),
      side = Math.sign(dx * nx + dz * nz) || 1;
    av = 0; // 定期船は航路を変えない（避けない）
    avoid.set(b.id, av);
    z += nz * av;
    const hy = waveH(x, z, t);
    m.position.set(x, hy * 0.5, z);
    m.rotation.set(0, -b.h, 0);
    if (m.wheel) m.wheel.rotation.y += dt * (b.moving ? 2 : 0);
    m.lamp.intensity = night ? 3 : 0;
    m.bulbs.visible = night;
    if (b.moving && Math.random() < dt * (b.kind === "fish" ? 10 : 40)) {
      const sx = x - Math.cos(b.h) * (b.kind === "michigan" ? 34 : b.kind === "cruise" ? 17 : 5),
        sz = z - Math.sin(b.h) * (b.kind === "michigan" ? 34 : 17);
      for (const s of [-1, 1])
        wakeP[wakeI++ % WAKE_N] = {
          x: sx + nx * s * (b.kind === "fish" ? 1 : 3),
          z: sz + nz * s * (b.kind === "fish" ? 1 : 3),
          vx: nx * s * 1.2,
          vz: nz * s * 1.2,
          born: t,
          big: b.kind !== "fish",
        };
    }
    // 航跡の波が建物に届くと揺れる
    const R_ = 400 * (W_SENSE || 1);
    if (b.moving && d < R_) wakeBob = Math.max(wakeBob, (b.kind === "fish" ? 0.25 : 0.7) * (1 - d / R_));
  }
  for (const [id, m] of boatMeshes)
    if (!seen.has(id)) {
      scene.remove(m);
      boatMeshes.delete(id);
    }
  const M = new THREE.Matrix4();
  let n = 0;
  for (const w of wakeP) {
    if (!w) continue;
    const age = t - w.born;
    if (age > 18) continue;
    const s = (w.big ? 1.1 : 0.5) + age * 0.3,
      f = 1 - age / 18;
    M.makeScale(s * f + 0.01, 1, s * f + 0.01);
    M.setPosition(w.x + w.vx * age, 0.35, w.z + w.vz * age);
    wake.setMatrixAt(n++, M);
  }
  wake.count = n;
  wake.instanceMatrix.needsUpdate = true;
}

// 港の灯り（常夜灯は各港に）
const portLamps = new THREE.InstancedMesh(
  new THREE.SphereGeometry(0.8, 8, 6),
  new THREE.MeshBasicMaterial({ color: 0xffd59a }),
  LAKE.ports.length + 8,
);
{
  const m = new THREE.Matrix4();
  placeLog("港の灯り", "shore", PORT_SITES);
  PORT_SITES.forEach(([x, y], i) => {
    m.makeTranslation(x * S, 5, y * S);
    portLamps.setMatrixAt(i, m);
  });
}
scene.add(portLamps);
// 雨と雪の粒（カメラの周りだけ）
const PN = 2500,
  precipGeo = new THREE.BufferGeometry(),
  pPos = new Float32Array(PN * 6);
for (let i = 0; i < PN; i++) {
  const x = (Math.random() - 0.5) * 160,
    y = Math.random() * 60,
    z = (Math.random() - 0.5) * 160;
  pPos.set([x, y, z, x, y - 1, z], i * 6);
}
precipGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
const rainMesh = new THREE.LineSegments(
  precipGeo,
  new THREE.LineBasicMaterial({ color: 0xcfd8e0, transparent: true, opacity: 0 }),
);
rainMesh.frustumCulled = false;
scene.add(rainMesh);
const snowGeo = new THREE.BufferGeometry(),
  sPos = new Float32Array(PN * 3);
for (let i = 0; i < PN; i++)
  sPos.set([(Math.random() - 0.5) * 160, Math.random() * 60, (Math.random() - 0.5) * 160], i * 3);
snowGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
const snowMesh = new THREE.Points(
  snowGeo,
  new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.6,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    map: (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 32;
      const g = c.getContext("2d"),
        gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.5, "rgba(255,255,255,.5)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, 32, 32);
      return new THREE.CanvasTexture(c);
    })(),
  }),
);
snowMesh.frustumCulled = false;
scene.add(snowMesh);
function updatePrecip(wxNow, W, dt, t) {
  const cx = camera.position.x,
    cz = camera.position.z;
  // 時雨：晩秋、日が差したまま細い雨が斜めに光る
  const sg = G.shigure || 0,
    rn = Math.max(wxNow.rain, sg * 0.55);
  rainMesh.material.opacity = Math.min(0.35, rn * 0.4) + sg * 0.12;
  rainMesh.material.color.setHex(sg > wxNow.rain ? 0xfff0d8 : 0xcfd8e0);
  rainMesh.visible = rn > 0.02;
  snowMesh.material.opacity = wxNow.snow * 0.9;
  snowMesh.visible = wxNow.snow > 0.02;
  if (rainMesh.visible) {
    const p = precipGeo.attributes.position.array,
      vy = 28 * dt,
      sx = W.x * (0.15 + sg * 0.25),
      sz = W.y * (0.15 + sg * 0.25);
    for (let i = 0; i < PN; i++) {
      const o = i * 6;
      let y = p[o + 1] - vy;
      if (y < 0) y += 60;
      let x = p[o] + sx * dt * 8,
        z = p[o + 2] + sz * dt * 8;
      x = cx + ((((x - cx + 80) % 160) + 160) % 160) - 80;
      z = cz + ((((z - cz + 80) % 160) + 160) % 160) - 80;
      p[o] = x;
      p[o + 1] = y;
      p[o + 2] = z;
      p[o + 3] = x - sx;
      p[o + 4] = y - 1.6;
      p[o + 5] = z - sz;
    }
    precipGeo.attributes.position.needsUpdate = true;
  }
  if (snowMesh.visible) {
    const p = snowGeo.attributes.position.array;
    for (let i = 0; i < PN; i++) {
      const o = i * 3;
      let y = p[o + 1] - 2.2 * dt;
      if (y < 0) y += 60;
      let x = p[o] + (W.x * 0.2 + Math.sin(t + i) * 0.3) * dt,
        z = p[o + 2] + W.y * 0.2 * dt;
      x = cx + ((((x - cx + 80) % 160) + 160) % 160) - 80;
      z = cz + ((((z - cz + 80) % 160) + 160) % 160) - 80;
      p[o] = x;
      p[o + 1] = y;
      p[o + 2] = z;
    }
    snowGeo.attributes.position.needsUpdate = true;
  }
}
// 雷：点滅ではなく、ゆっくり明るむ光（1秒に3回以下）
let flash = 0,
  nextFlash = 0;
// ヨシの一年：冬に刈られ、早春にヨシ焼き、春に新芽、夏に茂り、秋に穂
const REED_YEAR = [
  [0x9a8a64, 0.25],
  [0x9a8a64, 0.25],
  [0x2b2620, 0.22],
  [0x9fbf6a, 0.5],
  [0x88ad58, 0.75],
  [0x6f8f45, 1],
  [0x5f8240, 1.1],
  [0x627f3e, 1.15],
  [0xa69a52, 1.15],
  [0xc4a85a, 1.1],
  [0xa88d5c, 1.05],
  [0x998465, 1],
];
// ヨシ焼きの煙（3月の昼）
const smokeGeo = new THREE.BufferGeometry(),
  smP = new Float32Array(600 * 3),
  smB = [];
{
  const R = rnd(21);
  for (let i = 0; i < 600; i++) {
    const s = REED_SITES[i % REED_SITES.length];
    const a = R() * 6.28,
      q = R() * s[2] * 0.6;
    smB.push([(s[0] + Math.cos(a) * q) * S, (s[1] + Math.sin(a) * q) * S, R() * 40]);
  }
}
smokeGeo.setAttribute("position", new THREE.BufferAttribute(smP, 3));
const smoke = new THREE.Points(
  smokeGeo,
  new THREE.PointsMaterial({ color: 0x9a958c, size: 6, transparent: true, opacity: 0.35, depthWrite: false }),
);
smoke.frustumCulled = false;
scene.add(smoke);
