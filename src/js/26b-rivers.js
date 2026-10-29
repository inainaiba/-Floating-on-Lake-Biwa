/* ---------- 陸の川と池：地理院のベクトルタイルの水域（tools/rivers.py → data/rivers.json）。湖と同じ水の材質で、地面の高さに沿わせる ---------- */
{
  const RY = 0.8; // 地面より少し上（地形の網目は粗く、同じ高さだと所々で地面に隠れる）
  let n = 0;
  for (const poly of RIVERS) {
    const [ring, ...holes] = poly; // 内湖と重なるものは 06-inner-lakes.js で除いてある（二重に描かないため）
    const sh = new THREE.Shape(ring.map(([x, y]) => new THREE.Vector2(x * S, -y * S)));
    for (const h of holes) sh.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x * S, -y * S))));
    const geo = new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2),
      pos = geo.attributes.position;
    for (let k = 0; k < pos.count; k++) pos.setY(k, landY(pos.getX(k) / S, pos.getZ(k) / S) + RY);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, water.material);
    m.frustumCulled = false;
    scene.add(m);
    G.innerMeshes.push(m); // 映り込みを描く間は隠す（52-frame-render.js）
    n++;
  }
  G.riverCount = n;
}
