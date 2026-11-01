// 夜の窓の灯り
// 灯りの暮らし：窓ごとに「灯る暗さ」「消える時刻」「朝に灯る時刻」を持たせ、一斉ではなく一つずつ灯って一つずつ消える。
// 一階（台所・居間）は暗くなりはじめに早く灯って、夜10時ごろから消えていく。二階は遅く灯って、夜更けまで残る。
// 玄関の灯りなど、ひと晩じゅう点いている窓も少し。冬の朝は、早起きの台所が日の出前に灯る
const winGeo = new THREE.BufferGeometry(),
  wp = [],
  wUp = [];
/*窓は家の正面に*/ for (const h of houses)
  if ((((h.x * 7 + h.y * 3) % 10) + 10) % 10 < 8) {
    const fx = -Math.sin(h.rot),
      fz = Math.cos(h.rot),
      up = h.h > 5 && (h.x | 0) % 2 ? 1 : 0;
    for (const o of [-0.25, 0.2]) {
      wp.push(
        h.x * S + Math.cos(h.rot) * h.w * o + fx * h.d * 0.51,
        0.6 + h.ground * S * VEX + 1.6 + up * 2.6,
        h.y * S + Math.sin(h.rot) * h.w * o + fz * h.d * 0.51,
      );
      wUp.push(up);
    }
  }
winGeo.setAttribute("position", new THREE.Float32BufferAttribute(wp, 3));
{
  // aLit：x＝灯る暗さ（昼の明るさがこれより下がると灯る）、y＝消える時刻（時。24を超えると翌日の夜中）、z＝朝に灯る時刻（灯らない窓は99）
  const n = wp.length / 3,
    a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const up = wUp[i],
      allNight = Math.random() < 0.07;
    a[i * 3] = up ? 0.06 + Math.random() * 0.12 : 0.16 + Math.random() * 0.16;
    a[i * 3 + 1] = allNight ? 40 : up ? 22.3 + Math.pow(Math.random(), 0.8) * 3.6 : 20.8 + Math.random() * 2.8;
    a[i * 3 + 2] = allNight ? 0 : !up && Math.random() < 0.35 ? 4.6 + Math.random() * 1.9 : 99;
  }
  winGeo.setAttribute("aLit", new THREE.Float32BufferAttribute(a, 3));
}
const winU = { uHour: { value: 20 }, uDay: { value: 0 } };
{
  const n = wp.length / 3,
    cl = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = Math.random(),
      k = r < 0.22 ? 0 : 0.55 + Math.random() * 0.45;
    const w = Math.random();
    cl[i * 3] = k;
    cl[i * 3 + 1] = k * (w < 0.2 ? 0.95 : 0.72 + Math.random() * 0.1);
    cl[i * 3 + 2] = k * (w < 0.2 ? 0.85 : 0.4 + Math.random() * 0.15);
  }
  winGeo.setAttribute("color", new THREE.Float32BufferAttribute(cl, 3));
}
const windows = new THREE.Points(
  winGeo,
  new THREE.PointsMaterial({
    vertexColors: true,
    color: 0xffffff,
    size: 3.4,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
  }),
);
windows.material.onBeforeCompile = (sh) => {
  sh.uniforms.uHour = winU.uHour;
  sh.uniforms.uDay = winU.uDay;
  sh.vertexShader = sh.vertexShader
    .replace("#include <common>", "#include <common>\nattribute vec3 aLit;uniform float uHour;uniform float uDay;")
    .replace(
      "#include <color_vertex>",
      // 夕方〜夜：暗くなったら灯り、消える時刻まで。夜中（0〜12時）は前の晩の続き。朝：決まった時刻から明るくなるまで
      "#include <color_vertex>\nfloat dark=step(uDay,aLit.x);float h=uHour;float eve=h>=12.?step(h,aLit.y):step(h+24.,aLit.y);float morn=h<12.?step(aLit.z,h):0.;float on=dark*max(eve,morn);vColor*=on;",
    )
    .replace("gl_PointSize = size;", "gl_PointSize = size*on;");
};
windows.material.customProgramCacheKey = () => "village-windows";
scene.add(windows);
// 岸沿いの道
{
  const pos = [];
  for (let [x1, y1, x2, y2] of roads) {
    {
      let bad = false;
      const L0 = Math.hypot(x2 - x1, y2 - y1) || 1,
        nx0 = (-(y2 - y1) / L0) * 30,
        ny0 = ((x2 - x1) / L0) * 30;
      for (let u = 0; u <= 1 && !bad; u += 0.125)
        for (const s of [-1, 1]) {
          const x = x1 + (x2 - x1) * u + nx0 * s,
            y = y1 + (y2 - y1) * u + ny0 * s;
          if (inLake(x, y) || distShore(x, y) < 15) {
            bad = true;
            break;
          }
        }
      if (bad) continue;
    }
    {
      const ex = (x2 - x1) * 0.12,
        ey = (y2 - y1) * 0.12;
      x1 -= ex;
      y1 -= ey;
      x2 += ex;
      y2 += ey;
    }
    const dx = x2 - x1,
      dy = y2 - y1,
      L = Math.hypot(dx, dy) || 1,
      nx = (-dy / L) * 22,
      ny = (dx / L) * 22;
    pos.push(
      x1 + nx,
      y1 + ny,
      x2 + nx,
      y2 + ny,
      x2 - nx,
      y2 - ny,
      x1 + nx,
      y1 + ny,
      x2 - nx,
      y2 - ny,
      x1 - nx,
      y1 - ny,
    );
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      pos.flatMap((v, i) =>
        i % 2 ? [] : [pos[i] * S, landY(pos[i], pos[i + 1]) + 0.06, pos[i + 1] * S],
      ),
      3,
    ),
  );
  g.computeVertexNormals();
  const rdM = new THREE.Mesh(
    g,
    new THREE.MeshLambertMaterial({
      color: 0x66655f,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  scene.add(rdM);
}
// 実際の道（20-villages-layout.js の streets）：幅の段ごとの帯。地形の網目は粗いので、約60mごとに区切って地面に沿わせる
{
  const pos = [],
    HW = [9, 11, 16, 22, 26, 30]; // 道の半分の幅（実寸m）：地理院の幅の段 0〜5（作品では家と同じく実物大に見えるよう5倍）
  for (const { w, p } of streets) {
    const hw = HW[Math.min(5, w)];
    for (let i = 0; i < p.length - 1; i++) {
      const [ax, ay] = p[i],
        [bx, by] = p[i + 1],
        L = Math.hypot(bx - ax, by - ay);
      if (L < 1) continue;
      const nx = (-(by - ay) / L) * hw,
        ny = ((bx - ax) / L) * hw,
        n = Math.max(1, Math.ceil(L / 60));
      for (let k = 0; k < n; k++) {
        const x1 = ax + ((bx - ax) * k) / n,
          y1 = ay + ((by - ay) * k) / n,
          x2 = ax + ((bx - ax) * (k + 1)) / n,
          y2 = ay + ((by - ay) * (k + 1)) / n;
        if (inLake(x1, y1) || inLake(x2, y2) || inRiver((x1 + x2) / 2, (y1 + y2) / 2)) continue;
        pos.push(x1 + nx, y1 + ny, x2 + nx, y2 + ny, x2 - nx, y2 - ny, x1 + nx, y1 + ny, x2 - nx, y2 - ny, x1 - nx, y1 - ny);
      }
    }
  }
  if (pos.length) {
    const g = new THREE.BufferGeometry(),
      v = new Float32Array((pos.length / 2) * 3);
    for (let i = 0, j = 0; i < pos.length; i += 2, j += 3) {
      v[j] = pos[i] * S;
      v[j + 1] = landY(pos[i], pos[i + 1]) + 0.08;
      v[j + 2] = pos[i + 1] * S;
    }
    g.setAttribute("position", new THREE.BufferAttribute(v, 3));
    g.computeVertexNormals();
    scene.add(
      new THREE.Mesh(
        g,
        new THREE.MeshLambertMaterial({ color: 0x6f6d66, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }),
      ),
    );
  }
}
