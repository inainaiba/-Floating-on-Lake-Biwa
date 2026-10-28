// 陸と島（湖の穴をあけた面）
{
  const big = new THREE.Shape([
    new THREE.Vector2(minX * S - 30000, -(minY * S - 30000)),
    new THREE.Vector2(maxX * S + 30000, -(minY * S - 30000)),
    new THREE.Vector2(maxX * S + 30000, -(maxY * S + 30000)),
    new THREE.Vector2(minX * S - 30000, -(maxY * S + 30000)),
  ]);
  big.holes.push(new THREE.Path(outer.map(([x, y]) => new THREE.Vector2(x * S, -y * S))));
  const shapes = [
    big,
    ...islands.map((h) => new THREE.Shape(h.map(([x, y]) => new THREE.Vector2(x * S, -y * S)))),
  ];
  const land = new THREE.Mesh(
    new THREE.ShapeGeometry(shapes).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0x56653f }),
  );
  land.position.y = -1.5;
  scene.add(land);
}
