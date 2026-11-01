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
  // 区画ごとに大きさと向きを少しずつ変える（同じ長方形がそろって並ぶと、格子の模様に見えるため）
  paddies.forEach((p, i) => {
    const h1 = bHash(p.x, p.y),
      h2 = bHash(p.y + 3, p.x - 7);
    q.setFromEuler(new THREE.Euler(0, -p.rot + (h1 - 0.5) * 0.1, 0));
    M.compose(
      new THREE.Vector3(p.x * S, landY(p.x, p.y) + 0.03, p.y * S),
      q,
      new THREE.Vector3(0.78 + h1 * 0.4, 1, 0.82 + h2 * 0.32),
    );
    paddyI.setMatrixAt(i, M);
  });
}
// 水を張った田（aWet）：空の雲が映るように、隣り合う田にまたがる明るさのむらと、風のさざ波の細かなきらめき
const paddyWet = new Float32Array(paddies.length);
paddyI.geometry.setAttribute("aWet", new THREE.InstancedBufferAttribute(paddyWet, 1));
paddyM.onBeforeCompile = (sh) => {
  sh.vertexShader = sh.vertexShader
    .replace("#include <common>", "#include <common>\nattribute float aWet;varying float vWet;varying vec2 vWp;")
    .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWet=aWet;vWp=(modelMatrix*instanceMatrix*vec4(transformed,1.)).xz;");
  sh.fragmentShader = sh.fragmentShader
    .replace("#include <common>", "#include <common>\nvarying float vWet;varying vec2 vWp;\n" + GLSL_NOISE)
    .replace(
      "#include <map_fragment>",
      "#include <map_fragment>\nif(vWet>.01){float cl=nzF4(vWp*.0045+vec2(3.1,1.7));float rp=nzN(vWp*.9);diffuseColor.rgb*=mix(1.,.78+.45*cl+.06*rp,vWet);}",
    );
};
paddyM.customProgramCacheKey = () => "paddy-wet";
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
  const states = PADDY[m].map(([col, share]) => {
      const c = new THREE.Color(col),
        wet = c.b > c.g && c.b > c.r;
      if (wet) c.lerp(sky, 0.5);
      return [c, share, wet];
    }),
    fc = new THREE.Color(SEASON.field[m]),
    c = new THREE.Color();
  for (let i = 0; i < paddies.length; i++) {
    const p = paddies[i],
      k = p.v,
      h = (((Math.sin(p.x * 0.0123 + p.y * 0.0371) * 43758.5453) % 1) + 1) % 1;
    let wet = 0;
    if (p.field) c.copy(fc);
    else {
      let acc = 0;
      for (const [sc, share, w] of states) {
        c.copy(sc);
        wet = w ? 1 : 0;
        if (h < (acc += share)) break;
      }
    }
    paddyWet[i] = wet;
    // 水を張った田は、田ごとの明るさの差を小さく（空を映すので、隣どうしの色はそろう。むらは雲の映り込みで出す）
    paddyI.setColorAt(i, c.multiplyScalar(wet ? 0.95 + k * 0.1 : 0.85 + k * 0.3));
  }
  paddyI.instanceColor.needsUpdate = true;
  paddyI.geometry.attributes.aWet.needsUpdate = true;
}
