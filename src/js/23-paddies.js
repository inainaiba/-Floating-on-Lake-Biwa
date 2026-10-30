// 田んぼ（季節で色が変わる。春は水が張られて空を映す）
const paddyM = new THREE.MeshLambertMaterial({ color: 0xffffff });
const paddyI = new THREE.InstancedMesh(
  new THREE.PlaneGeometry(16, 9).rotateX(-Math.PI / 2),
  paddyM,
  paddies.length,
);
paddyI.userData.noChunk = true; // 季節ごとに1枚ずつ色を変える（区画に分けない）
paddyM.map = cvTex(64, 32, (g, w, h) => {
  g.fillStyle = "#fff";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "rgba(0,0,0,.12)";
  for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
  g.fillStyle = "rgba(60,50,30,.5)";
  g.fillRect(0, 0, w, 1.5);
  g.fillRect(0, h - 1.5, w, 1.5);
  g.fillRect(0, 0, 1.5, h);
  g.fillRect(w - 1.5, 0, 1.5, h);
});
{
  const M = new THREE.Matrix4(),
    q = new THREE.Quaternion();
  paddies.forEach((p, i) => {
    q.setFromEuler(new THREE.Euler(0, -p.rot, 0));
    M.compose(
      new THREE.Vector3(p.x * S, landY(p.x, p.y) + 0.03, p.y * S),
      q,
      new THREE.Vector3(1, 1, 1),
    );
    paddyI.setMatrixAt(i, M);
  });
}
scene.add(paddyI);
const ghI = new THREE.InstancedMesh(
  new THREE.CylinderGeometry(1.6, 1.6, 14, 10, 1, false, 0, Math.PI)
    .rotateZ(Math.PI / 2)
    .rotateY(Math.PI / 2),
  new THREE.MeshLambertMaterial({ color: 0xe8ecee, transparent: true, opacity: 0.85 }),
  paddies.length,
);
{
  const M = new THREE.Matrix4();
  let n = 0;
  paddies.forEach((p) => {
    if (p.v > 0.9) {
      M.compose(
        new THREE.Vector3(p.x * S, landY(p.x, p.y) + 0.03, p.y * S),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -p.rot + Math.PI / 2, 0)),
        new THREE.Vector3(1, 1, 1),
      );
      ghI.setMatrixAt(n++, M);
    }
  });
  ghI.count = n;
}
scene.add(ghI);
const PADDY = SEASON.paddy;
function paddySeason(m, sky) {
  // 水を張った田（空の色が強い色）は空を映す。区画ごとの状態は位置から決まる乱数で（毎月同じ区画が先に田植え・稲刈り）
  const states = PADDY[m].map(([hex, share]) => {
      const c = new THREE.Color(hex);
      if (c.b > c.g && c.b > c.r) c.lerp(sky, 0.5);
      return [c, share];
    }),
    fc = new THREE.Color(SEASON.field[m]),
    c = new THREE.Color();
  for (let i = 0; i < paddies.length; i++) {
    const p = paddies[i],
      k = p.v,
      h = (((Math.sin(p.x * 0.0123 + p.y * 0.0371) * 43758.5453) % 1) + 1) % 1;
    if (p.field) c.copy(fc);
    else {
      let acc = 0;
      for (const [sc, share] of states) {
        c.copy(sc);
        if (h < (acc += share)) break;
      }
    }
    paddyI.setColorAt(i, c.multiplyScalar(0.85 + k * 0.3));
  }
  paddyI.instanceColor.needsUpdate = true;
}
