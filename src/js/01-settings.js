/* ---------- 設定（試作用の調整値：URLの ?scale=10&speed=20 で変更） ---------- */
const Q = new URLSearchParams(location.search);
const S = 1 / (+Q.get("scale") || 5); // 湖の縮尺（長さ）
const SPEED = +Q.get("speed") || 28; // 流れの速さの倍率（縮尺とは別）
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
// 湖岸線と島の形は、詰めたデータから（00a-data.js の DATA.shape。輪は1つの多角形の中に入れてある）
const LAKE = { ...__LAKE__, outer: DATA.shape.outer[0][0], islands: DATA.shape.islands[0] };
const RAIL = __RAIL__; // 湖西線の道筋（data/rail.json：経度・緯度の列）
LAKE.ports = LAKE.ports.filter(([x, y]) => {
  let m = 1e12;
  const o = LAKE.outer;
  for (let i = 0; i < o.length; i++) {
    const d = (o[i][0] - x) ** 2 + (o[i][1] - y) ** 2;
    if (d < m) m = d;
  }
  return m < 1500 * 1500;
});
