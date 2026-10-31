/* ---------- びわこ花噴水（大津港）：港の沖の防波堤に沿って、水の柱が一列に並ぶ噴水。
   4月〜10月に動く。昼は10時から17時まで毎時はじめの30分、夜は19時から21時半まで続けて、色の光で照らす。
   ・水の柱は粒で描き、動きはすべて描く側（シェーダー）で時刻から計算する（毎フレームの計算は要らない）
   ・波のように高さが送られる／一本おきに高さが入れ替わる／中ほどが高く呼吸するように伸び縮みする、の3つの演目を、
     共有時計で順に移す（見る人みな同じ）
   ・夜は水面に色の光の筋が映る（近くで見るときだけ）
   ・作品の地図は横に1/5へ縮めてあり、噴水は高さを実物より低め、長さを地図の上の長さより長めにして、釣り合いをとる ---------- */
G.fountain = (() => {
  const LEN = 700, // 防波堤の長さ（実寸m。作品の中では140）
    HMAX = 24, // いちばん高い水の柱（作品の中の長さ）
    NZ = 72, // 噴き出し口の数
    NP = QUALITY.fireworks > 3000 ? 40 : 26; // 噴き出し口ひとつあたりの粒の数
  // 置き場所：大津港の岸から沖へ。船の航路と港の囲いにかからない所で、港にいちばん近い所
  // 置き場所：大津港の前の湖の上。港の囲い（25-harbors.js）より沖で、船の航路から離れていて、港にいちばん近い所。
  // 向きも合わせて探す（実物も、港の沖に岸と並ぶように延びる防波堤の上にある）
  const [px, py] = shoreSnap(...ll(135.866, 35.012)),
    segD = (x, y, a, b) => {
      const dx = b[0] - a[0],
        dy = b[1] - a[1];
      let t = ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1);
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      return Math.hypot(a[0] + t * dx - x, a[1] + t * dy - y);
    },
    near = [];
  for (const r of ROUTES)
    for (let i = 0; i < r.pts.length - 1; i++) if (segD(px, py, r.pts[i], r.pts[i + 1]) < 3000) near.push([r.pts[i], r.pts[i + 1]]);
  const cand = [];
  for (let i = -25; i <= 25; i++) for (let j = -25; j <= 25; j++) if (Math.hypot(i, j) * 60 > 400) cand.push([px + i * 60, py + j * 60]);
  cand.sort((a, b) => Math.hypot(a[0] - px, a[1] - py) - Math.hypot(b[0] - px, b[1] - py));
  let C = [px, py],
    th = 0;
  find: for (const [cx, cy] of cand)
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI,
        dx = Math.cos(a),
        dy = Math.sin(a);
      let ok = true;
      for (let u = -1; u <= 1 && ok; u += 0.1) {
        const x = cx + dx * u * (LEN / 2 + 40),
          y = cy + dy * u * (LEN / 2 + 40);
        if (!inLake(x, y) || Math.hypot(x - px, y - py) < 480) ok = false;
        for (let n = 0; n < near.length && ok; n++) if (segD(x, y, near[n][0], near[n][1]) < 100) ok = false;
        for (let n = 0; n < PORT_SITES.length && ok; n++) if (Math.hypot(x - PORT_SITES[n][0], y - PORT_SITES[n][1]) < 400) ok = false;
      }
      if (ok) {
        C = [cx, cy];
        th = a;
        break find;
      }
    }
  const vx = Math.cos(th),
    vy = Math.sin(th),
    ux = -vy,
    uy = vx; // 堤に直角の向き（しぶきの広がる向き）
  const A = [C[0] - (vx * LEN) / 2, C[1] - (vy * LEN) / 2],
    B = [C[0] + (vx * LEN) / 2, C[1] + (vy * LEN) / 2];
  placeLog("びわこ花噴水", "water", [A, C, B]);
  const g = new THREE.Group();
  scene.add(g);
  // 防波堤：低く細長いコンクリートの堤と、噴き出し口の並ぶ縁
  {
    const L = LEN * S,
      wall = new THREE.Mesh(new THREE.BoxGeometry(L + 6, 2.2, 4.2), new THREE.MeshLambertMaterial({ color: 0x9a9890 }));
    wall.position.set(C[0] * S, 0.2, C[1] * S);
    wall.rotation.y = -Math.atan2(vy, vx);
    g.add(wall);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(L, 0.3, 1.2), new THREE.MeshLambertMaterial({ color: 0x3e4246 }));
    lip.position.set(C[0] * S, 1.4, C[1] * S);
    lip.rotation.y = wall.rotation.y;
    g.add(lip);
  }
  // ---- 水の柱：噴き出し口ごとに粒を並べる。粒の位置は時刻からシェーダーで決める ----
  const N = NZ * NP,
    aU = new Float32Array(N),
    aR = new Float32Array(N * 2),
    pos = new Float32Array(N * 3),
    R = rnd(4401);
  for (let i = 0; i < N; i++) {
    aU[i] = (Math.floor(i / NP) + 0.5) / NZ;
    aR[i * 2] = R();
    aR[i * 2 + 1] = R();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aU", new THREE.BufferAttribute(aU, 1));
  geo.setAttribute("aR", new THREE.BufferAttribute(aR, 2));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(C[0] * S, HMAX / 2, C[1] * S), (LEN * S) / 2 + HMAX);
  // 演目の高さ（0〜1）。シェーダーと、水面の光の筋（下の JS）で同じ式を使う
  const HFN = `float hgt(float u,float t,vec3 w){
  float a=.5+.5*sin(u*14.-t*1.3);
  float b=.5+.5*sin(t*1.1+mod(floor(u*36.),2.)*3.1416);
  float c=clamp(1.-abs(u-.5)*1.7,0.,1.)*(.62+.38*sin(t*.85));
  return .22+.78*(a*w.x+b*w.y+c*w.z);}
vec3 hue(float h){return clamp(abs(fract(h+vec3(0.,.6667,.3333))*6.-3.)-1.,0.,1.);}`;
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uT: { value: 0 },
      uA: { value: new THREE.Vector2(A[0] * S, A[1] * S) },
      uB: { value: new THREE.Vector2(B[0] * S, B[1] * S) },
      uN: { value: new THREE.Vector2(ux, uy) },
      uY: { value: 0 },
      uH: { value: HMAX },
      uW: { value: new THREE.Vector3(1, 0, 0) },
      uOn: { value: 0 },
      uNight: { value: 0 },
      uPx: { value: 600 },
      uDay: { value: new THREE.Color(0.5, 0.53, 0.56) },
    },
    vertexShader: `attribute float aU;attribute vec2 aR;uniform float uT,uY,uH,uOn,uNight,uPx;uniform vec2 uA,uB,uN;uniform vec3 uW,uDay;
varying vec3 vC;varying float vA;
${HFN}
void main(){
  float T=2.6,s=fract(aR.x+uT/T),h=uH*hgt(aU,uT,uW)*uOn;
  vec2 p=mix(uA,uB,aU);
  float mist=step(aR.y,.18);
  // 柱：まっすぐ上がって、上で少し広がって落ちる。霧：根元の水面に低くたまる
  float y=mix(h*4.*s*(1.-s),(.6+aR.y*9.)*s*(.4+h/uH),mist);
  float sp=(aR.y-.5)*(mix(.25,1.6,mist)+s*s*h*.07);
  vec2 q=p+uN*sp+(uB-uA)/length(uB-uA)*(fract(aR.y*13.7)-.5)*mix(.3,2.6,mist);
  vec4 mv=modelViewMatrix*vec4(q.x,uY+.8+y,q.y,1.);
  gl_Position=projectionMatrix*mv;
  float sz=mix(.55+s*.9,2.4+s*2.,mist),px=sz*uPx/max(1.,-mv.z);
  gl_PointSize=clamp(px,1.5,28.);
  float far=(1.-smoothstep(1400.,2600.,-mv.z))*smoothstep(3.,14.,-mv.z); // すぐ近くの粒は大きな玉にならないよう薄める
  vA=uOn*(1.-s*s)*mix(mix(.15,.42,uNight),mix(.05,.08,uNight),mist)*min(1.,px*px/3.)*far*step(.5,h);
  vec3 lit=mix(vec3(1.),hue(aU*.55+uT*.025+floor(uT/48.)*.31),.78)*(.7+.6*(1.-s));
  vC=mix(uDay,lit*2.2,uNight);
}`,
    fragmentShader: `varying vec3 vC;varying float vA;void main(){vec2 d=gl_PointCoord-.5;float r=length(d)*2.;float a=exp(-r*r*3.)*(1.-smoothstep(.8,1.,r));if(vA*a<.002)discard;gl_FragColor=vec4(vC*vA*a,1.);}`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.visible = false;
  g.add(pts);
  // ---- 夜の水面に映る色の光：区切りごとに、噴水からカメラの側へ伸びる筋 ----
  const K = 12,
    glowM = new THREE.MeshBasicMaterial({
      map: cvTex(32, 128, (x, w, h) => {
        for (let y = 0; y < h; y += 2) {
          const a = (1 - y / h) * (0.3 + Math.random() * 0.7);
          x.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
          const ww = w * (0.4 + Math.random() * 0.6);
          x.fillRect((w - ww) / 2, y, ww, 1);
        }
      }),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
    glow = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).translate(0, -0.5, 0).rotateX(-Math.PI / 2), glowM, K);
  glow.frustumCulled = false;
  glow.count = 0;
  glow.userData.noChunk = true;
  g.add(glow);
  const M4 = new THREE.Matrix4(),
    Qn = new THREE.Quaternion(),
    Yax = new THREE.Vector3(0, 1, 0),
    V3 = new THREE.Vector3(),
    Sc = new THREE.Vector3(),
    GC = new THREE.Color(),
    WH = new THREE.Color(1, 1, 1);
  const hgtJS = (u, t, w) => {
    const a = 0.5 + 0.5 * Math.sin(u * 14 - t * 1.3),
      b = 0.5 + 0.5 * Math.sin(t * 1.1 + (Math.floor(u * 36) % 2) * 3.1416),
      c = Math.max(0, 1 - Math.abs(u - 0.5) * 1.7) * (0.62 + 0.38 * Math.sin(t * 0.85));
    return 0.22 + 0.78 * (a * w.x + b * w.y + c * w.z);
  };
  // 動く時間：4〜10月。昼は10〜17時の毎時はじめの30分、夜は19時〜21時半
  function onAt(c) {
    if (c.month < 3 || c.month > 9) return 0;
    const h = c.phase * 24,
      edge = (a, b) => Math.min(1, Math.max(0, Math.min(h - a, b - h) / 0.04));
    if (h >= 19 && h <= 21.5) return edge(19, 21.5);
    if (h >= 10 && h < 17) {
      const m = h - Math.floor(h);
      return edge(Math.floor(h), Math.floor(h) + 0.5) * (m < 0.5 ? 1 : 0);
    }
    return 0;
  }
  function update(dt, c, day) {
    const cp = camera.position,
      dc = Math.hypot(cp.x - C[0] * S, cp.z - C[1] * S),
      on = onAt(c);
    g.visible = !isFar && dc < 3200;
    pts.visible = g.visible && on > 0.001;
    glow.count = 0;
    if (!pts.visible) return;
    // 演目：48秒ごとに次へ。移るときは8秒かけて混ぜる
    const t = c.t % 100000,
      k = Math.floor(t / 48),
      f = Math.min(1, (t - k * 48) / 8),
      w = mat.uniforms.uW.value.set(0, 0, 0),
      ax = ["x", "y", "z"];
    w[ax[k % 3]] += f;
    w[ax[(k + 2) % 3]] += 1 - f;
    const night = Math.min(1, Math.max(0, (0.25 - day) / 0.15)),
      U = mat.uniforms;
    U.uT.value = t;
    U.uY.value = water.position.y;
    U.uOn.value = on;
    U.uNight.value = night;
    U.uPx.value = renderer.domElement.height / (2 * Math.tan((camera.fov * Math.PI) / 360));
    // 昼の水しぶきは白く、日なたほど明るい
    U.uDay.value.setScalar(0.25 + 0.35 * Math.min(1, day * 2));
    // 夜の水面の光の筋
    const fade = 1 - Math.min(1, Math.max(0, (dc - 300) / 900)),
      wy = water.position.y;
    if (night > 0.01 && fade > 0.01) {
      let n = 0;
      for (let i = 0; i < K; i++) {
        const u = (i + 0.5) / K,
          x = (A[0] + (B[0] - A[0]) * u) * S,
          z = (A[1] + (B[1] - A[1]) * u) * S,
          d = Math.hypot(cp.x - x, cp.z - z);
        if (d < 20) continue;
        const h = HMAX * hgtJS(u, t, w) * on,
          hu = (((u * 0.55 + t * 0.025 + Math.floor(t / 48) * 0.31) % 1) + 1) % 1;
        GC.setHSL(hu, 0.9, 0.55).lerp(WH, 0.15);
        Qn.setFromAxisAngle(Yax, Math.atan2(cp.x - x, cp.z - z));
        M4.compose(V3.set(x, wy + 0.06, z), Qn, Sc.set(((LEN * S) / K) * 0.9, 1, Math.min(d * 0.7, h * 3.2 + 10)));
        glow.setMatrixAt(n, M4);
        glow.setColorAt(n++, GC.multiplyScalar(1.3 * night * on * fade * (0.4 + h / HMAX)));
      }
      glow.count = n;
      glow.instanceMatrix.needsUpdate = true;
      if (glow.instanceColor) glow.instanceColor.needsUpdate = true;
    }
  }
  return { update, at: C, th, g };
})();
