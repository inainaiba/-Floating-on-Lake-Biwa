/* ---------- 天気：7種類。一日を4区間に分け、共通時計から決まる擬似乱数で抽選（全員が同じ天気） ---------- */
const WX_NAMES = ["晴れ", "曇り", "霧", "小雨", "大雨", "嵐", "雪"];
// 月ごとの出やすさ（%）：晴れ・曇り・霧・小雨・大雨・嵐・雪。雨（小雨・大雨・嵐）はもとの表の半分にして、減らした分を晴れに回している
const WX_P = [
  [24, 35, 5, 3, 0, 3, 30],
  [29, 35, 5, 3, 0, 3, 25],
  [42, 30, 5, 5, 0, 8, 10],
  [47, 30, 10, 10, 0, 3, 0],
  [59, 25, 5, 8, 3, 0, 0],
  [40, 30, 5, 15, 10, 0, 0],
  [59, 20, 0, 8, 8, 5, 0],
  [59, 20, 0, 5, 8, 8, 0],
  [49, 25, 5, 8, 5, 8, 0],
  [59, 25, 5, 8, 3, 0, 0],
  [40, 30, 15, 10, 0, 0, 5],
  [27, 35, 5, 5, 0, 3, 25],
];
// wind風 wave波 fog視界(近,遠m) gray灰色 dark暗さ rain雨 snow雪 storm雷 sense気配の届く距離
const WX = [
  { wind: 1, wave: 1, fog: [800, 5000], gray: 0, dark: 0, rain: 0, snow: 0, storm: 0, sense: 1 },
  { wind: 1, wave: 1, fog: [600, 4000], gray: 0.6, dark: 0.1, rain: 0, snow: 0, storm: 0, sense: 1 },
  {
    wind: 0.7,
    wave: 0.8,
    fog: [15, 260],
    gray: 0.75,
    dark: 0,
    rain: 0,
    snow: 0,
    storm: 0,
    sense: 1,
    white: 0.5,
  },
  {
    wind: 0.85,
    wave: 0.8,
    fog: [250, 1800],
    gray: 0.7,
    dark: 0.15,
    rain: 0.35,
    snow: 0,
    storm: 0,
    sense: 0.8,
  },
  { wind: 1.2, wave: 1.4, fog: [120, 1000], gray: 0.85, dark: 0.3, rain: 1, snow: 0, storm: 0, sense: 0.6 },
  { wind: 2, wave: 2.1, fog: [120, 900], gray: 0.9, dark: 0.5, rain: 0.8, snow: 0, storm: 1, sense: 0.4 },
  {
    wind: 0.6,
    wave: 0.6,
    fog: [70, 800],
    gray: 0.75,
    dark: 0.28,
    rain: 0,
    snow: 1,
    storm: 0,
    sense: 1,
    white: 0.2,
  },
];
let WXQ = Q.get("wx");
function wxPick(seg) {
  if (WXQ !== null) return +WXQ;
  const day = Math.floor(seg / 4),
    m = ((day % 12) + 12) % 12,
    r = (Math.sin(seg * 91.7 + 13.3) * 43758.5453) % 1,
    u = Math.abs(r) * 100;
  let acc = 0;
  for (let i = 0; i < 7; i++) {
    acc += WX_P[m][i];
    if (u < acc) return i;
  }
  return 0;
}
function weather(c) {
  const segLen = DAY / 4,
    seg = Math.floor(c.t / segLen),
    into = c.t - seg * segLen,
    a = WX[wxPick(seg - 1)],
    b = WX[wxPick(seg)],
    k = Math.min(1, into / 60); // 境目で約1分かけて移る
  const o = {};
  for (const key of ["wind", "wave", "gray", "dark", "rain", "snow", "storm", "sense", "white"])
    o[key] = (a[key] || 0) * (1 - k) + (b[key] || 0) * k;
  o.fog = [a.fog[0] * (1 - k) + b.fog[0] * k, a.fog[1] * (1 - k) + b.fog[1] * k];
  o.id = k < 0.5 ? wxPick(seg - 1) : wxPick(seg);
  // 河口の濁り：雨の量を、晴れると数分（約3分）で薄れるように積み上げる
  let turb = 0;
  for (let j = 0; j < 6; j++) {
    const s = seg - j,
      w = WX[wxPick(s)],
      end = (s + 1) * segLen,
      age = Math.max(0, c.t - end);
    turb += (w.rain || 0) * (j === 0 ? Math.min(1, into / 240) : 1) * Math.exp(-age / 180);
  }
  o.turb = Math.min(1.5, turb);
  return o;
}
// 水位（月ごとの目安。cm。試作の前に滋賀県の資料で確かめる）
const LEVEL = [-15, -10, 0, 10, 5, -10, -20, -30, -35, -30, -25, -20];
