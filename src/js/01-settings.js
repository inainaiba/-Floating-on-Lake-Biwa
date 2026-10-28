/* ---------- 設定（試作用の調整値：URLの ?scale=10&speed=20 で変更） ---------- */
const Q = new URLSearchParams(location.search);
const S = 1 / (+Q.get("scale") || 5); // 湖の縮尺（長さ）
const SPEED = +Q.get("speed") || 28; // 流れの速さの倍率（縮尺とは別）
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const LAKE = __LAKE__;
LAKE.ports = LAKE.ports.filter(([x, y]) => {
  let m = 1e12;
  const o = LAKE.outer;
  for (let i = 0; i < o.length; i++) {
    const d = (o[i][0] - x) ** 2 + (o[i][1] - y) ** 2;
    if (d < m) m = d;
  }
  return m < 1500 * 1500;
});
