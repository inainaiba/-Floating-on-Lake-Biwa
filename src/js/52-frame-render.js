/* ---------- 毎フレーム⑤：描画（映り込み → 本描画 → 色の仕上げ） ---------- */
// 数が0の InstancedMesh（季節や時刻で出ない鳥・走っていない電車・灯っていない灯りなど）は描かない。
// 中身がなくても描画の回数（映り込み・影・本描画）だけは増えるため。描く間だけ隠し、描き終えたら戻す（53-frame.js）
let INST = null;
function hideEmpty() {
  if (!INST) {
    INST = [];
    scene.traverse((o) => o.isInstancedMesh && INST.push(o));
  }
  const hid = [];
  // 区画ごとの子に分けた物（00-head.js の chunkify）の親は数が0でも隠さない（隠すと子の区画もすべて消える）
  for (const o of INST)
    if (o.visible && o.count === 0 && !o.children.length) {
      o.visible = false;
      hid.push(o);
    }
  return hid;
}
function renderFrame(c, W, wxNow, day, sunAngle) {
  {
    const q = 5000 / (QUALITY.waterGrid);
    water.position.x = Math.round(camX / q) * q;
    water.position.z = Math.round(camZ / q) * q;
  }
  if (!G.rt) {
    // 後処理の前の描画もマルチサンプルで滑らかに（細い部材や遠景のちらつきを抑える）
    G.rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: QUALITY.msaa });
    G.gq = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms: {
          tD: { value: null },
          tBl: { value: null },
          tBl2: { value: null },
          uAsp: { value: 1.6 },
          uSunS: { value: new THREE.Vector3(0, 0, 0) },
          uBlue: { value: 0 },
          uTm: { value: 0 },
          uWarm: { value: 0 },
          uDay: { value: 1 },
          uMorn: { value: 0 },
          uMoonL: { value: 1 },
        },
        depthTest: false,
        depthWrite: false,
        vertexShader: `varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}`,
        fragmentShader: `uniform sampler2D tD;uniform sampler2D tBl;uniform sampler2D tBl2;uniform float uAsp;uniform vec3 uSunS;uniform float uBlue;

uniform float uWarm,uDay,uMorn,uTm,uMoonL;
varying vec2 vU;
   vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);
}
float bh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
float bn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(bh(i),bh(i+vec2(1,0)),f.x),mix(bh(i+vec2(0,1)),bh(i+1.),f.x),f.y);}
   void main(){
// 輪郭をほどく：画面を筆の流れのような向きの場に沿って、少しずつずらした色を重ねる。
// 輪郭がにじんで隣の色と溶け合う。画面の上（遠景）ほど強く、下（手前）は控えめ。場はゆっくり漂うだけで、ちらつかない
vec2 q=vU*vec2(uAsp,1.);
float fa=(bn(q*9.+uTm*.004)*.7+bn(q*23.-uTm*.003)*.3)*6.2832;
vec2 dir=vec2(cos(fa),sin(fa))*vec2(1./uAsp,1.)*(.0016+.0026*smoothstep(.15,.75,vU.y));
vec2 jt=(vec2(bn(q*61.),bn(q*61.+7.3))-.5)*.0012;
vec3 c0=texture2D(tD,vU+jt).rgb*.34+texture2D(tD,vU+dir+jt).rgb*.24+texture2D(tD,vU-dir).rgb*.24+texture2D(tD,vU+dir*2.2-jt).rgb*.18;
vec3 c=aces(c0*1.15);
vec3 bl=texture2D(tBl,vU).rgb,bl2=texture2D(tBl2,vU).rgb; // 明るい所のにじみ：近いにじみ（半分の解像度）と、広く空気ごと光るにじみ（8分の1の解像度）
vec3 glowT=mix(vec3(1.,.96,.9),vec3(1.,.84,.64),uWarm); // にじみの色：朝夕は金色に
float gk=mix(1.,.3,uDay*(1.-uWarm)); // 昼の明るい空まで光らせない（朝夕・夜に強く）
c+=bl*vec3(.2,.19,.18)*glowT*(.6+.4*gk)+bl2*.24*glowT*gk;
// 太陽を向いたときのレンズの光のにじみ（ごく控えめに）
if(uSunS.z>.01){vec2 d=(vU-uSunS.xy)*vec2(uAsp,1.);float r=length(d);c+=vec3(1.,.93,.82)*(exp(-r*r*18.)*.05+exp(-r*5.)*.018)*uSunS.z;vec2 gp=vec2(1.)-uSunS.xy;float g2=length((vU-mix(uSunS.xy,gp,.7))*vec2(uAsp,1.));c+=vec3(.7,.85,1.)*smoothstep(.06,.04,g2)*smoothstep(.02,.04,g2)*.008*uSunS.z;}
c=pow(c,vec3(1./2.2));
    float l=dot(c,vec3(.299,.587,.114));
    c=mix(vec3(l),c,.86);
                                  // 彩度を抑えて淡く
    float lift=max(uDay*.7*(1.-uMorn*.6),uWarm*.9);
c*=mix(vec3(1.),${v3(PALETTE.gradeGolden)},uWarm*.6);
c=c*(.9-.05*uWarm)+mix(vec3(.08,.09,.1),vec3(.1,.085,.09),uWarm)*lift+.012;
                                  // 影を持ち上げて明るい調子に
    float ngt=1.-max(uDay,uWarm);
vec3 tint=mix(mix(${v3(PALETTE.gradeDayTint)},${v3(PALETTE.gradeDuskTint)},uWarm),${v3(PALETTE.gradeNightTint)},ngt);
 // 昼は水色、朝夕は桃色寄り
    c*=tint;
// 月のない夜：青みを抜いて暗く。灯りの暖かさが引き立つ
{float dk=ngt*(1.-uMoonL);float ll=dot(c,vec3(.299,.587,.114));c=mix(c,mix(vec3(ll),c,.75)*vec3(1.02,1.,.94),dk*.7);c*=1.-dk*.18;}
c=mix(c,mix(${v3(PALETTE.gradeHorizonLow)},${v3(PALETTE.gradeHorizonHigh)},smoothstep(.35,1.,vU.y)),uWarm*.32);
          // 朝夕は地平が桃・ラベンダー
    vec3 hi=vec3(1.,.98,.96);
c=mix(c,hi,smoothstep(.7,1.1,l)*.35*lift);
   // ハイライトのにじみ
    {float l2=dot(c,vec3(.299,.587,.114));
vec3 mint=mix(vec3(.62,.72,.70),vec3(.86,.91,.90),smoothstep(.0,1.,l2));
vec3 cm=mix(vec3(.36,.5,.5),vec3(.84,.89,.88),smoothstep(.15,.95,l2));
c=mix(c,cm,uMorn*.6);
c=mix(c,vec3(.86,.9,.88),uMorn*.45*smoothstep(.55,.95,vU.y));
}
    // 夜明け前の青：空と湖の境目が消える、青一色の時間
    {float lb=dot(c,vec3(.299,.587,.114));c=mix(c,vec3(.5,.68,1.)*(lb*1.15+.04),uBlue*.55);}
    // 影を色で塗る：暗い所を黒ではなく、空の色（昼は青、朝夕は紫、夜は藍）で満たす。明るい所はわずかに暖かく。真っ黒は残さない
    {float ls=dot(c,vec3(.299,.587,.114));
    vec3 shC=mix(mix(vec3(.30,.38,.62),vec3(.42,.30,.58),uWarm),vec3(.16,.19,.36),ngt);
    float sh=1.-smoothstep(.04,.5,ls);
    c=mix(c,shC*(ls*1.5+.05),sh*.36);
    c*=mix(vec3(1.),mix(vec3(1.04,1.01,.95),vec3(1.08,.98,.86),uWarm),smoothstep(.5,1.,ls)*.6);
    c=max(c,shC*.07);}
    float v=distance(vU,vec2(.5));
c=mix(c,c*1.04+.03,smoothstep(.3,.75,v)*uDay*.6);
{float gr=fract(sin(dot(floor(vU*vec2(1920.,1080.)),vec2(12.9898,78.233))+uTm*7.13)*43758.5453)-.5;
c+=gr*(.022-.01*l);
}
    gl_FragColor=vec4(pow(c,vec3(2.2)),1.);
}`,
      }),
    );
    G.gs = new THREE.Scene();
    G.gs.add(G.gq);
    // 明るい所のにじみを、縦横半分の解像度で計算する（にじみはもともとぼやけているので、画面の全部の点で16か所ずつ調べなくてよい）
    G.blRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    G.blQ = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms: { tD: { value: null } },
        depthTest: false,
        depthWrite: false,
        vertexShader: `varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}`,
        fragmentShader: `uniform sampler2D tD;varying vec2 vU;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec3 bl=vec3(0.);
for(int i=0;i<16;i++){float a=float(i)*2.399,r=.003+.0032*float(i);
vec3 s=aces(texture2D(tD,vU+vec2(cos(a),sin(a))*r*vec2(1.,1.6)).rgb*1.15);
bl+=max(s-.52,0.)*(1.-float(i)/20.);}
gl_FragColor=vec4(bl,1.);}`,
      }),
    );
    G.blS = new THREE.Scene();
    G.blS.add(G.blQ);
    // 広いにじみ：近いにじみをさらに8分の1の解像度で大きく広げる（明るい所が周りの空気ごと光る）
    G.bl2RT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    G.bl2Q = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms: { tB: { value: null } },
        depthTest: false,
        depthWrite: false,
        vertexShader: `varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}`,
        fragmentShader: `uniform sampler2D tB;varying vec2 vU;
void main(){vec3 b=vec3(0.);float w=0.;
for(int i=0;i<24;i++){float a=float(i)*2.399,r=.01+.0075*float(i),k=1.-float(i)/28.;
b+=texture2D(tB,vU+vec2(cos(a),sin(a))*r*vec2(1.,1.6)).rgb*k;w+=k;}
gl_FragColor=vec4(b/w*1.6,1.);}`,
      }),
    );
    G.bl2S = new THREE.Scene();
    G.bl2S.add(G.bl2Q);
    G.gc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  {
    const w = renderer.domElement.width,
      h = renderer.domElement.height;
    if (G.rt.width !== w || G.rt.height !== h) G.rt.setSize(w, h);
  }
  {
    if (!G.rf) {
      G.rf = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
      G.rc = new THREE.PerspectiveCamera();
    }
    const w = renderer.domElement.width,
      h = renderer.domElement.height,
      rs = QUALITY.reflection;
    if (G.rf.width !== Math.floor(w * rs)) G.rf.setSize(Math.floor(w * rs), Math.floor(h * rs));
    const rc = G.rc;
    const wy = water.position.y;
    camera.updateMatrixWorld();
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    rc.position.set(camera.position.x, 2 * wy - camera.position.y, camera.position.z);
    rc.up.set(0, 1, 0);
    rc.lookAt(rc.position.x + dir.x, rc.position.y - dir.y, rc.position.z + dir.z);
    rc.fov = camera.fov;
    rc.aspect = camera.aspect;
    rc.near = camera.near;
    rc.far = camera.far;
    rc.updateProjectionMatrix();
    rc.updateMatrixWorld();
    waterU.uTM.value
      .set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)
      .multiply(rc.projectionMatrix)
      .multiply(rc.matrixWorldInverse);
    // 映り込みを描く間は、水面の材質を使うもの（湖・内湖）を隠す。
    // 隠さないと、描いている最中の映り込みの画像を自分で読むことになる（WebGL のフィードバックループ）
    const vis = [water.visible, skyDome.visible],
      inner = (G.innerMeshes || []).map((m) => m.visible);
    water.visible = false;
    skyDome.visible = false;
    for (const m of G.innerMeshes || []) m.visible = false;
    // 映り込みには、小さなもの（石・草・生け垣・粒）を描かない。水面では見分けられず、描く量だけが増えるので
    if (!G.noRefl) {
      G.noRefl = [];
      scene.traverse((o) => {
        if (o.isPoints || o.userData.noRefl) return G.noRefl.push(o); // noRefl：水面に貼りつく帯（航跡など）。映り込みに描くと暗い帯になる
        if (!o.isInstancedMesh) return;
        if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
        if (o.geometry.boundingSphere.radius < 1.3) G.noRefl.push(o);
      });
    }
    const nrVis = G.noRefl.map((o) => o.visible);
    for (const o of G.noRefl) o.visible = false;
    // 映り込みには遠い区画の景物（家・森・ヨシなど）を描かない。水面では波でにじんで見分けられないため（山並みと空は描く）
    const far2 = (QUALITY.reflFar * S) ** 2,
      cp = camera.position,
      v3 = new THREE.Vector3(),
      farHid = [];
    for (const c of G.chunks) {
      if (!c.visible) continue;
      v3.copy(c.boundingSphere.center).applyMatrix4(c.matrixWorld);
      if ((v3.x - cp.x) ** 2 + (v3.z - cp.z) ** 2 > far2) {
        c.visible = false;
        farHid.push(c);
      }
    }
    const cc = renderer.getClearColor(new THREE.Color()),
      ca = renderer.getClearAlpha();
    renderer.setClearColor(0, 0);
    renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 1, 0), -wy + 0.05)];
    renderer.setRenderTarget(G.rf);
    renderer.clear();
    renderer.render(scene, rc);
    renderer.clippingPlanes = [];
    renderer.setRenderTarget(null);
    renderer.setClearColor(cc, ca);
    water.visible = vis[0];
    skyDome.visible = vis[1];
    (G.innerMeshes || []).forEach((m, i) => (m.visible = inner[i]));
    G.noRefl.forEach((o, i) => (o.visible = nrVis[i]));
    for (const c of farHid) c.visible = true;
    waterU.uRefl.value = G.rf.texture;
    waterU.uWy.value = wy;
    waterU.uRes.value.set(w, h);
    waterU.uCalm.value = Math.max(0, 1 - W.s / 6) * (wxNow.rain > 0.3 ? 0.3 : 1);
  }
  // 影：家や木は動かず、太陽はゆっくり動くので、2フレームに1回で足りる。映り込みの描画では描き直さない
  //（以前は映り込みと本描画の2回、毎フレーム描いていた）
  G.shTick = (G.shTick || 0) + 1;
  if (G.shTick % 2 === 1) renderer.shadowMap.needsUpdate = true;
  renderer.setRenderTarget(G.rt);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  G.gq.material.uniforms.tD.value = G.rt.texture;
  {
    const w = Math.max(1, renderer.domElement.width >> 1),
      h = Math.max(1, renderer.domElement.height >> 1);
    if (G.blRT.width !== w || G.blRT.height !== h) G.blRT.setSize(w, h);
    G.blQ.material.uniforms.tD.value = G.rt.texture;
    const tm = renderer.toneMapping;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setRenderTarget(G.blRT);
    renderer.render(G.blS, G.gc);
    {
      const w2 = Math.max(1, renderer.domElement.width >> 3),
        h2 = Math.max(1, renderer.domElement.height >> 3);
      if (G.bl2RT.width !== w2 || G.bl2RT.height !== h2) G.bl2RT.setSize(w2, h2);
      G.bl2Q.material.uniforms.tB.value = G.blRT.texture;
      renderer.setRenderTarget(G.bl2RT);
      renderer.render(G.bl2S, G.gc);
    }
    renderer.setRenderTarget(null);
    renderer.toneMapping = tm;
    G.gq.material.uniforms.tBl.value = G.blRT.texture;
    G.gq.material.uniforms.tBl2.value = G.bl2RT.texture;
  }
  {
    const u = G.gq.material.uniforms;
    u.uAsp.value = camera.aspect;
    {
      const sp = sun.position.clone().sub(house.position).normalize().multiplyScalar(500).add(camera.position).project(camera);
      const vis = sp.z < 1 && Math.abs(sp.x) < 1.2 && Math.abs(sp.y) < 1.2 ? Math.min(1, day * 2) * (1 - wxNow.gray) : 0;
      u.uSunS.value.set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5, vis);
    }
    u.uBlue.value = G.morning ? Math.max(0, 1 - Math.abs((G.sunY || 0) + 0.13) / 0.11) * (1 - wxNow.gray * 0.5) : 0;
  }
  G.gq.material.uniforms.uMoonL.value = G.moonLit;
  G.gq.material.uniforms.uTm.value = (performance.now() / 1000) % 100;
  G.gq.material.uniforms.uDay.value = Math.min(1, day * 2.5) * (1 - wxNow.dark);
  G.gq.material.uniforms.uMorn.value = Math.max(0, 1 - Math.abs(c.phase - 0.34) / 0.08) * (1 - wxNow.gray * 0.5);
  G.gq.material.uniforms.uWarm.value = Math.max(0, 1 - Math.abs(Math.sin(sunAngle)) * 2.2);
  {
    const tm = renderer.toneMapping;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.render(G.gs, G.gc);
    renderer.toneMapping = tm;
  }
}
