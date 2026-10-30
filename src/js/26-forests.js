// 遠くの木は1本ずつ見せず、森の面（地形の色）に溶かす：距離に応じて縮めて消す
function treeFade(m, near, far) {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvec4 tw=modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.);float td=length(cameraPosition.xz-tw.xz);transformed*=1.-smoothstep(" +
        near.toFixed(1) +
        "," +
        far.toFixed(1) +
        ",td);",
    );
  };
  return m;
}
// 山すその森（スギ・ヒノキの植林と広葉樹）
{
  const R = rnd(4242),
    pts = [];
  for (let n = 0; n < (MOBILE ? 80000 : 200000) && pts.length < (MOBILE ? 16000 : 40000); n++) {
    const sg = Math.floor(R() * (outer.length - 1)),
      a_ = outer[sg],
      b_ = outer[sg + 1],
      u_ = R(),
      bx = a_[0] + (b_[0] - a_[0]) * u_,
      by = a_[1] + (b_[1] - a_[1]) * u_,
      ang = R() * 6.283,
      rr = 250 + Math.pow(R(), 1.6) * 3500,
      x = bx + Math.cos(ang) * rr,
      y = by + Math.sin(ang) * rr;
    if (inLake(x, y)) continue;
    const h = terrainAt(x, y);
    if (h > 1100) continue;
    const ds = distShore(x, y);
    if (ds < 250) continue;
    if (h < 40 && R() < 0.75) continue;
    if (
      innerPolys.some((p) => {
        const q = p[0];
        return (
          Math.hypot(q[0] - x, q[1] - y) < 2500 &&
          (inPoly(x, y, p) || p.some((v) => Math.hypot(v[0] - x, v[1] - y) < 250))
        );
      })
    )
      continue;
    if (houseNear(x, y, 90, true)) continue;
    pts.push([x, y, h, R()]);
  }
  for (const kd of ["cedar", "broad"]) {
    const sel = pts
      .filter((p) => p[3] < 0.45 === (kd === "cedar"))
      .map(([x, y, h, r]) => [x, y, h * S * VEX + 0.4, (1.1 + r * 1.6) * (kd === "cedar" ? 1.2 : 1), r * 20]);
    cardForest(
      kd,
      sel,
      kd === "cedar" ? 12 : 10,
      kd === "cedar" ? 7 : 11,
      QUALITY.forest[0],
      QUALITY.forest[1],
      false,
    );
  }
}
