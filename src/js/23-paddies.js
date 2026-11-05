// 田んぼ（季節で色が変わる。春は水が張られて空を映す）
const paddyM = new THREE.MeshLambertMaterial({ color: 0xffffff });
const paddyI = new THREE.InstancedMesh(
  new THREE.PlaneGeometry(16, 9).rotateX(-Math.PI / 2),
  paddyM,
  paddies.length,
);
paddyI.userData.noChunk = true; // 季節ごとに1枚ずつ色を変える（区画に分けない）
paddyM.map = cvTex(64, 32, (g, w, h) => {
  // 田の面：規則正しい縞や黒い縁は描かない（太陽光パネルの升目と枠に見えるため。2026年11月）。
  // 縁は明るい土と草の畦、内側はやわらかなむらと、かすかな苗の列（列は少し揺らす）
  const Rr = rnd(2311);
  g.fillStyle = "#fff";
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(${Rr() < 0.5 ? "60,50,30" : "255,255,240"},${(0.03 + Rr() * 0.05).toFixed(3)})`;
    g.beginPath();
    g.arc(Rr() * w, Rr() * h, 3 + Rr() * 9, 0, 7);
    g.fill();
  }
  for (let y = 3; y < h - 2; y += 3.4)
    for (let x = 3; x < w - 2; x += 2.2) {
      g.fillStyle = `rgba(50,70,30,${(0.05 + Rr() * 0.05).toFixed(3)})`;
      g.fillRect(x + (Rr() - 0.5) * 0.8, y + Math.sin(x * 0.2) * 0.4, 1, 1);
    }
  // 畦：明るい土と草の、やわらかな縁（内側へ薄れる）
  for (let k = 0; k < 3; k++) {
    g.strokeStyle = `rgba(${96 - k * 6},${118 - k * 6},${64 - k * 4},${(0.45 - k * 0.13).toFixed(2)})`; // 草の生えた畦（緑がかった土色）
    g.lineWidth = 1;
    g.strokeRect(0.5 + k, 0.5 + k, w - 1 - 2 * k, h - 1 - 2 * k);
  }
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
      new THREE.Vector3(p.x * S, landY(p.x, p.y) + 0.03 + h2 * 0.03, p.y * S), // 隣と重なる所で、ちらつかないよう高さを少しずつ変える
      q,
      // 隣の田と少し重ねて、田の間に地面の暗いすき間（升目の枠に見える）を作らない。境は畦の色で見せる
      new THREE.Vector3(1.02 + h1 * 0.22, 1, 1.04 + h2 * 0.2),
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
      "#include <map_fragment>\nif(vWet>.01){float cl=nzF4(vWp*.0045+vec2(3.1,1.7));float rp=nzN(vWp*.9);diffuseColor.rgb*=mix(1.,.88+.24*cl+.05*rp,vWet);}",
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
      if (wet) c.lerp(sky, 0.3).lerp(new THREE.Color(0x8c8664), 0.5); // 空を映しつつ、泥水の黄土色を混ぜる（青灰色の板に見えないよう）
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
    // 田ごとに明るさと色味を少しずつ変える（水を張った田も、泥の濃さや水の深さで違う。そろいすぎると板が並んで見える）
    const h3 = (((Math.sin(p.x * 0.0291 - p.y * 0.0173) * 24634.6345) % 1) + 1) % 1;
    if (wet) c.offsetHSL((h3 - 0.5) * 0.03, (h3 - 0.5) * 0.12, 0);
    paddyI.setColorAt(i, c.multiplyScalar(wet ? 0.86 + k * 0.26 : 0.85 + k * 0.3));
  }
  paddyI.instanceColor.needsUpdate = true;
  paddyI.geometry.attributes.aWet.needsUpdate = true;
}
