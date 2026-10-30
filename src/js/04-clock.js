/* ---------- 共有時計：一日≈23分36秒、12日で一年 ---------- */
const DAY = 1416,
  EPOCH = Date.UTC(2026, 0, 1);
let PH = Q.get("phase"),
  MO = Q.get("month");
function clock() {
  // 確認用に時刻を止められる（G.tFix：?debug のときだけ __scene から設定）
  const t = G.tFix != null ? G.tFix : (Date.now() - EPOCH) / 1000,
    d = Math.floor(t / DAY);
  // G.pw：早回しの撮影（32b-video.js）で進めた時刻（一日の割合）。月と、t で決まるもの（天気・電車の位置など）は変えない
  const ph = PH !== null ? +PH : (t % DAY) / DAY;
  return { t, month: MO !== null ? +MO : ((d % 12) + 12) % 12, phase: G.pw ? (ph + G.pw) % 1 : ph };
}

// 太陽と月の位置（天文の計算）：作品の月は「その月の中日」、時刻は作品の一日の中の時刻として、
// 琵琶湖の緯度で、太陽の高度・方位と、月齢に応じた月の位置を求める。
// 返す向きは作品の座標（x 東、y 上、z 南）の単位ベクトル。
const LAT_R = (35.25 * Math.PI) / 180;
function astro(c) {
  const doy = c.month * 30.44 + 15,
    dec = ((23.44 * Math.PI) / 180) * Math.sin((2 * Math.PI * (284 + doy)) / 365),
    H = (c.phase * 24 - 12) * ((15 * Math.PI) / 180); // 時角（正午で0）
  const dirOf = (h, d) => {
    const E = -Math.cos(d) * Math.sin(h),
      N = Math.cos(LAT_R) * Math.sin(d) - Math.sin(LAT_R) * Math.cos(d) * Math.cos(h),
      U = Math.sin(LAT_R) * Math.sin(d) + Math.cos(LAT_R) * Math.cos(d) * Math.cos(h);
    return new THREE.Vector3(E, U, -N).normalize();
  };
  const sun = dirOf(H, dec),
    noon = Math.sin(Math.PI / 2 - Math.abs(LAT_R - dec)); // 南中の高さ（sin）
  // 月齢（0 新月 → 0.5 満月）。新月の月は太陽と同じ方角、満月は反対。赤緯も月齢で太陽と逆向きにふれる
  const mp = ((((c.t / DAY) % 29.53) + 29.53) % 29.53) / 29.53,
    moon = dirOf(H - mp * 2 * Math.PI, dec * Math.cos(mp * 2 * Math.PI));
  // これまでの「太陽の角度」（日の出 0、正午 π/2、日の入り π）に読み替えた値。明るさや朝夕の判定に使う
  const s = Math.max(-1, Math.min(1, sun.y / noon)),
    a = Math.asin(s),
    sunAngle = c.phase < 0.5 ? a : Math.PI - a;
  return { sun, moon, mp, sunAngle, phaseEff: (((0.25 + sunAngle / (2 * Math.PI)) % 1) + 1) % 1 };
}
