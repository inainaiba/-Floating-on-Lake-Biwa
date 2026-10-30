/* ---------- 町の灯り：遠くから見た夜の家並み。近くでは家の窓の灯り（22-village-lights-roads.js）が見えるので、少し離れてから現れる
   ・灯りの粒：実際の家の位置（data/towns.json の全部と集落の家）に、小さな光の点を1つずつ。家並みの形どおりの細かい光の帯になる
   ・にじみ：家の集まる所（1km四方）ごとに、地面に沿った横長のうすい光。遠いほど霞む
   家の集まる所の一覧（list）は、雲に映る街明かりの方角にも使う（49-frame-sky-light.js） ---------- */
G.towns = (() => {
  // 家の位置：data/towns.json は品質による数の上限（QUALITY.towns）を気にせず全部、集落の家は重ならないものだけ
  const P = [],
    seen = new Set(),
    key = (x, y) => Math.floor(x / 30) * 65536 + Math.floor(y / 30);
  if (TOWNS && TOWNS.n) {
    const B = Uint8Array.from(atob(TOWNS.b), (ch) => ch.charCodeAt(0)),
      dv = new DataView(B.buffer);
    for (let i = 0; i < TOWNS.n; i++) {
      const x = dv.getInt16(i * 8, true) * 2,
        y = dv.getInt16(i * 8 + 2, true) * 2;
      P.push([x, y]);
      seen.add(key(x, y));
    }
  }
  for (const h of houses) if (!seen.has(key(h.x, h.y))) P.push([h.x, h.y]);

  // 家の集まる所（1km四方で8軒以上）：中心と広がり
  const C = 1000,
    cells = new Map();
  for (const [x, y] of P) {
    const k = Math.floor(x / C) * 4096 + Math.floor(y / C);
    const c = cells.get(k) || { n: 0, x: 0, y: 0, xx: 0, yy: 0 };
    c.n++;
    c.x += x;
    c.y += y;
    c.xx += x * x;
    c.yy += y * y;
    cells.set(k, c);
  }
  const list = [...cells.values()]
    .filter((c) => c.n >= 8)
    .map((c) => {
      const x = c.x / c.n,
        y = c.y / c.n;
      return { x, y, n: c.n, r: Math.sqrt(Math.max(0, c.xx / c.n - x * x + c.yy / c.n - y * y)) };
    })
    .sort((a, b) => b.n - a.n);

  // 灯りの粒とにじみで共有する明るさ（49-frame-sky-light.js が夜の深さに合わせて変える）
  const uniforms = { uOp: { value: 0 }, uScale: { value: 1 }, tDot: { value: G.dotTex } };
  const R = rndFor("town-lights");

  // 灯りの粒：画面の上で1〜3画素の点。2割ほどは消えている家
  const pos = [],
    kk = [];
  for (const [x, y] of P) {
    if (R() < 0.2) continue;
    pos.push(x * S, landY(x, y) + 1.2, y * S);
    kk.push(0.45 + R() * 0.55, R());
  }
  const dotG = new THREE.BufferGeometry();
  dotG.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  dotG.setAttribute("aK", new THREE.Float32BufferAttribute(kk, 2));
  const dots = new THREE.Points(
    dotG,
    new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec2 aK;uniform float uScale;varying float vA;varying vec3 vC;
void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;
float d=-mv.z;gl_PointSize=clamp(uScale*1.6/max(d,1.),1.,3.);
// 近くは窓の灯りに任せ、遠いほど霞む
vA=aK.x*smoothstep(120.,450.,d)*mix(1.,.35,smoothstep(800.,6000.,d))*(1.-smoothstep(7000.,11000.,d));
vC=mix(vec3(1.,.72,.42),vec3(1.,.9,.75),step(.8,aK.y));}`,
      fragmentShader: `uniform sampler2D tDot;uniform float uOp;varying float vA;varying vec3 vC;
void main(){float a=texture2D(tDot,gl_PointCoord).a;gl_FragColor=vec4(vC*a*vA*uOp,1.);}`,
    }),
  );

  // にじみ：カメラに向いた横長の板（幅は家の広がりから、高さは幅の約2割）。下の縁が少し地面に沈むように置く
  const glowM = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aN;varying vec2 vU;varying float vA;
void main(){vec3 c=(instanceMatrix*vec4(0.,0.,0.,1.)).xyz;float w=length(instanceMatrix[0].xyz);
vec4 mv=modelViewMatrix*vec4(c,1.);mv.xy+=position.xy*vec2(w,w*.22);gl_Position=projectionMatrix*mv;
float d=-mv.z;vU=position.xy*2.;
vA=aN*smoothstep(250.,900.,d)*mix(1.,.4,smoothstep(1500.,7000.,d))*(1.-smoothstep(8000.,12000.,d));}`,
    fragmentShader: `uniform float uOp;varying vec2 vU;varying float vA;
void main(){float r=dot(vU,vU);float a=exp(-r*3.2)*(1.-smoothstep(.8,1.,r));gl_FragColor=vec4(vec3(1.,.64,.34)*a*vA*uOp*.3,1.);}`,
  });
  const glow = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), glowM, Math.max(1, list.length)),
    aN = new Float32Array(Math.max(1, list.length)),
    M = new THREE.Matrix4(),
    Q = new THREE.Quaternion(),
    V = new THREE.Vector3(),
    Sc = new THREE.Vector3();
  list.forEach((t, i) => {
    const w = (2 * t.r + 300) * S;
    M.compose(V.set(t.x * S, landY(t.x, t.y) + w * 0.05, t.y * S), Q, Sc.set(w, w, w));
    glow.setMatrixAt(i, M);
    aN[i] = Math.min(1, Math.sqrt(t.n) / 9);
  });
  glow.geometry.setAttribute("aN", new THREE.InstancedBufferAttribute(aN, 1));
  glow.count = list.length;

  const pts = new THREE.Group();
  for (const o of [dots, glow]) {
    o.frustumCulled = false;
    o.userData.noChunk = true; // 1つの塊のまま描く（区画に分けない）
    pts.add(o);
  }
  pts.visible = false;
  scene.add(pts);
  return { list, pts, mat: { uniforms } };
})();
