// 田んぼ（季節で色が変わる。春は水が張られて空を映す）
const paddyM = new THREE.MeshLambertMaterial({ color: 0xffffff });
const paddyI = new THREE.InstancedMesh(
  new THREE.PlaneGeometry(16, 9).rotateX(-Math.PI / 2),
  paddyM,
  paddies.length,
);
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
  const c = new THREE.Color(PADDY[m]);
  if (m === 3 || m === 4) c.lerp(sky, 0.5);
  for (let i = 0; i < paddies.length; i++) {
    const k = paddies[i].v;
    paddyI.setColorAt(i, c.clone().multiplyScalar(0.85 + k * 0.3));
  }
  paddyI.instanceColor.needsUpdate = true;
}
