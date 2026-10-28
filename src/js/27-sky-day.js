/* ---------- 空と一日の色 ---------- */
const SKY = [
  [0, 0x1a2a5c],
  [0.19, 0x2c3878],
  [0.225, 0x9a9ad0],
  [0.255, 0xe8c0c8],
  [0.29, 0xf2d2b8],
  [0.34, 0xa8c8e0],
  [0.68, 0xa6c6de],
  [0.715, 0xf2d29a],
  [0.745, 0xf4b070],
  [0.77, 0xe8a0a8],
  [0.8, 0xa898d0],
  [0.84, 0x4a4aa8],
  [0.88, 0x26307a],
  [1, 0x1a2a5c],
];
function skyAt(p) {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [a, ca] = SKY[i],
      [b, cb] = SKY[i + 1];
    if (p >= a && p <= b) return new THREE.Color(ca).lerp(new THREE.Color(cb), (p - a) / (b - a));
  }
  return new THREE.Color(SKY[0][1]);
}
