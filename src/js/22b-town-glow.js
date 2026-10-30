/* ---------- 町の灯り：実際の家並み（20-villages-layout.js の houses）から、家の集まる所を1.5km四方で数え、
   夜、その上にやわらかな灯りのにじみを置く。遠くの町が灯りの帯として見える。雲に映る街明かりの方角にも使う（49-frame-sky-light.js） ---------- */
G.towns = (() => {
  const C = 1500,
    cells = new Map();
  for (const h of houses) {
    const k = Math.floor(h.x / C) * 4096 + Math.floor(h.y / C);
    const c = cells.get(k) || { n: 0, x: 0, y: 0 };
    c.n++;
    c.x += h.x;
    c.y += h.y;
    cells.set(k, c);
  }
  const list = [...cells.values()]
    .filter((c) => c.n >= 12)
    .map((c) => ({ x: c.x / c.n, y: c.y / c.n, n: c.n }))
    .sort((a, b) => b.n - a.n);
  const pos = [],
    sz = [];
  for (const t of list) {
    pos.push(t.x * S, landY(t.x, t.y) + 9, t.y * S);
    sz.push(30 + Math.sqrt(t.n) * 9); // 家の数が多いほど大きく
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("aSize", new THREE.Float32BufferAttribute(sz, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uOp: { value: 0 }, tDot: { value: G.dotTex }, uScale: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    vertexShader: `attribute float aSize;uniform float uScale;varying float vF;
void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;
float d=-mv.z;gl_PointSize=clamp(aSize*uScale/max(d,1.),1.,220.);
vF=smoothstep(60.,400.,d);}`, // 近くでは消す（家の窓の灯りが見える距離）
    fragmentShader: `uniform sampler2D tDot;uniform float uOp;varying float vF;
void main(){float a=texture2D(tDot,gl_PointCoord).a;gl_FragColor=vec4(vec3(1.,.66,.36)*a*a*uOp*vF*.55,1.);}`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.visible = false;
  scene.add(pts);
  return { list, pts, mat };
})();
