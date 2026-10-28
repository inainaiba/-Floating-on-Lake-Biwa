/* ---------- 放つ場所：湖上の数百か所から ---------- */
function rnd(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
const R0 = rnd((Math.random() * 1e9) | 0),
  starts = [];
const cumL = [0];
for (let i = 0; i < outer.length - 1; i++)
  cumL.push(cumL[i] + Math.hypot(outer[i + 1][0] - outer[i][0], outer[i + 1][1] - outer[i][1]));
const NB = 6,
  bands = Array.from({ length: NB }, () => []);
for (let i = 0; i < outer.length - 1; i++) {
  const my = (outer[i][1] + outer[i + 1][1]) / 2,
    k = Math.min(NB - 1, Math.max(0, Math.floor(((my - minY) / (maxY - minY)) * NB)));
  bands[k].push(i);
}
const okB = bands.filter((b) => b.length);
for (const bd of okB) {
  let n = 0,
    guard = 0;
  while (n < 50 && guard++ < 4000) {
    const i = bd[Math.floor(R0() * bd.length)],
      a = outer[i],
      b = outer[i + 1],
      L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1,
      u = R0();
    const px = a[0] + (b[0] - a[0]) * u,
      py = a[1] + (b[1] - a[1]) * u,
      nx = -(b[1] - a[1]) / L,
      ny = (b[0] - a[0]) / L;
    let ok = false;
    for (const off of [125, 250, 400, 600]) {
      for (const sg of [1, -1]) {
        const x = px + nx * off * sg,
          y = py + ny * off * sg;
        if (inMain(x, y) && depth(x, y) > 1.5 && Math.abs(distShore(x, y) - off) < off * 0.5) {
          starts.push([x, y]);
          n++;
          ok = true;
          break;
        }
      }
      if (ok) break;
    }
  }
}
const okS = starts.filter(([x, y]) => !reedFree0(x, y));
const st = (okS.length ? okS : starts)[Math.floor(Math.random() * (okS.length || starts.length))];
