/* ---------- 建物の状態（座標は実寸m。描画時に縮尺Sをかける） ---------- */
const B = {
  x: st[0],
  y: st[1],
  yaw: 0,
  rest: false,
  trail: [[st[0], st[1]]],
  dist: 0,
  kick: 0,
  kx: 0,
  ky: 0,
};
let STATE = "title";
const steer = { x: 0, y: 0 };
