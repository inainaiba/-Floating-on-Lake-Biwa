/* ---------- 12か月の風（吹いてくる方角°・m/s）と環流の強さ ---------- */
const WIND = [
  [315, 4.5],
  [315, 4.2],
  [270, 4.8],
  [200, 3.5],
  [180, 3.0],
  [180, 2.6],
  [170, 2.5],
  [160, 2.5],
  [30, 2.8],
  [330, 3.2],
  [315, 3.8],
  [315, 4.5],
];
const GYRE = [0.35, 0.3, 0.4, 0.6, 0.9, 1, 1, 1, 0.9, 0.7, 0.5, 0.4];
// 静けさ（黙祷のような間）：ときどき（平均で約30分に一度。時計から決めるので、見る人みな同じ時刻に）、
// 20秒あまり風が止み、湖面が鏡のように凪ぎ、音が引いていく（30-audio.js）。また少しずつ世界が戻ってくる。雨の日は起きない
function hushOf(t) {
  if (!LOOK.show.hush) return 0;
  const P = 1100,
    n = Math.floor(t / P),
    h = (k) => (((Math.sin(n * 78.233 + k * 12.9898) * 43758.5453) % 1) + 1) % 1;
  if (h(0) > 0.6) return 0;
  const u = t - n * P - 60 - h(1) * (P - 150);
  return u < 0 || u > 24 ? 0 : Math.min(1, u / 5, (24 - u) / 8);
}
function wind(c) {
  const wxNow = weather(c);
  // 凪の時間：朝と夕方は風が落ち、湖面が鏡のようになって山が映る（約2時間。日によって深さが違う）。
  // なめらかに凪いで、なめらかに風が戻る（戻るとき、さざ波の帯が風下へ渡っていく：14-water.js）
  const bump = (p0) => {
      const u = Math.min(1, Math.abs(c.phase - p0) / 0.095);
      return 0.5 + 0.5 * Math.cos(Math.PI * u);
    },
    dn = Math.floor(c.t / DAY),
    rr = (((Math.sin(dn * 12.9898) * 43758.5453) % 1) + 1) % 1,
    deep = 0.8 + 0.15 * rr,
    calmT = Math.max(bump(0.265), bump(0.775)) * deep;
  const hiraHakko = c.month === 2 ? Math.max(0, 1 - Math.abs(c.phase - 0.6) / 0.07) : 0;
  const [d0, s1] = WIND[c.month],
    d = d0 * (1 - hiraHakko) + 300 * hiraHakko,
    s0 = s1 * (1 + 1.7 * hiraHakko),
    s = s0 * wxNow.wind * (1 - calmT) * (1 - 0.92 * hushOf(c.t) * (1 - Math.min(1, wxNow.rain || 0))),
    g = 1 + 0.35 * Math.sin(c.t / 37) + 0.2 * Math.sin(c.t / 11.3),
    a = ((d + 15 * Math.sin(c.t / 53)) * Math.PI) / 180;
  return {
    x: -Math.sin(a) * s * g,
    y: Math.cos(a) * s * g,
    s: s * g,
    wave: wxNow.wave * (1 + hiraHakko * 0.9),
    wx: wxNow,
    hk: hiraHakko,
  };
} // 吹いていく向き（y南）
const gyres = [
  [...ll(136.15, 35.4), 8000, +1, 0.14],
  [...ll(136.1, 35.28), 7000, -1, 0.1],
  [...ll(136.0, 35.19), 6000, +1, 0.08],
];
const outlet = ll(135.905, 34.985);
function flow(x, y, c) {
  let vx = 0,
    vy = 0;
  const k = GYRE[c.month];
  for (const [cx, cy, R, sg, U] of gyres) {
    const dx = x - cx,
      dyn = -(y - cy),
      r = Math.hypot(dx, dyn) + 1e-6,
      q = r / R,
      sp = U * k * q * Math.exp(0.5 * (1 - q * q));
    // 反時計回り(sg=+1)は北上座標で(-dy,dx)
    vx += sg * (-dyn / r) * sp;
    vy += -(sg * (dx / r) * sp);
  }
  if (y > bridgeY - 3000) {
    const w = Math.min(1, (y - bridgeY + 3000) / 3000),
      dx = outlet[0] - x,
      dy = outlet[1] - y,
      r = Math.hypot(dx, dy) + 1;
    vx += (dx / r) * 0.05 * w;
    vy += (dy / r) * 0.05 * w;
  }
  const W = wind(c);
  vx += W.x * 0.03;
  vy += W.y * 0.03;
  return [vx, vy];
}

function reedFree0() {
  return false;
}
