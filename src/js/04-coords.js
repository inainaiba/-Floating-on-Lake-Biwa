/* ---------- 座標 ---------- */
const LAT0 = 35.25,
  LON0 = 136.08,
  KX = 111320 * Math.cos((LAT0 * Math.PI) / 180),
  KY = 110540;
const ll = (lon, lat) => [(lon - LON0) * KX, (LAT0 - lat) * KY]; // 実寸m, x東 y南
