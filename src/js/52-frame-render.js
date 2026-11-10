/* ---------- 毎フレーム⑤：描画（映り込み → 本描画 → 色の仕上げ） ---------- */
// 数が0の InstancedMesh（季節や時刻で出ない鳥・走っていない電車・灯っていない灯りなど）は描かない。
// 中身がなくても描画の回数（映り込み・影・本描画）だけは増えるため。描く間だけ隠し、描き終えたら戻す（53-frame.js）
let INST = null;
function hideEmpty() {
  if (!INST) {
    INST = [];
    scene.traverse((o) => o.isInstancedMesh && INST.push(o));
  }
  const hid = G._hid || (G._hid = []);
  hid.length = 0;
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
          uVeil: { value: 0 },
          uDeep: { value: 0 },
        },
        depthTest: false,
        depthWrite: false,
        vertexShader: `varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}`,
        fragmentShader: `uniform sampler2D tD;uniform sampler2D tBl;uniform sampler2D tBl2;uniform float uAsp;uniform vec3 uSunS;uniform float uBlue;

uniform float uWarm,uDay,uMorn,uTm,uMoonL,uVeil,uDeep;
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
vec2 dir=vec2(cos(fa),sin(fa))*vec2(1./uAsp,1.)*(.00015+.00025*smoothstep(.15,.75,vU.y));
vec2 jt=(vec2(bn(q*61.),bn(q*61.+7.3))-.5)*.0001;
vec3 c0=texture2D(tD,vU+jt).rgb*.76+texture2D(tD,vU+dir+jt).rgb*.09+texture2D(tD,vU-dir).rgb*.09+texture2D(tD,vU+dir*2.2-jt).rgb*.06;
vec3 c=aces(c0*1.15);
vec3 bl=texture2D(tBl,vU).rgb,bl2=texture2D(tBl2,vU).rgb; // 明るい所のにじみ：近いにじみ（半分の解像度）と、広く空気ごと光るにじみ（8分の1の解像度）
vec3 glowT=mix(vec3(1.,.98,.95),vec3(1.,.95,.86),uWarm); // にじみの色：朝夕は金色に
float gk=mix(1.,.3,uDay*(1.-uWarm)); // 昼の明るい空まで光らせない（朝夕・夜に強く）
c+=bl*vec3(.15,.14,.13)*glowT+bl2*.02*glowT*gk;
// 太陽を向いたときのレンズの光のにじみ（ごく控えめに）
if(uSunS.z>.01){vec2 d=(vU-uSunS.xy)*vec2(uAsp,1.);float r=length(d);c+=vec3(1.,.93,.82)*(exp(-r*r*18.)*.05+exp(-r*5.)*.018)*uSunS.z;vec2 gp=vec2(1.)-uSunS.xy;float g2=length((vU-mix(uSunS.xy,gp,.7))*vec2(uAsp,1.));c+=vec3(.7,.85,1.)*smoothstep(.06,.04,g2)*smoothstep(.02,.04,g2)*.008*uSunS.z;}
// 逆光のとき、太陽の側の画面の縁から、ごくわずかに光がさしこむ（ほんの僅か）
if(uSunS.z>.01){vec2 sd_=(vU-uSunS.xy)*vec2(uAsp,1.);float ed_=length(sd_);c+=vec3(1.,.95,.86)*exp(-ed_*2.2)*.018*uSunS.z;c=mix(c,c+vec3(.012,.01,.008),uSunS.z*smoothstep(1.4,.2,ed_));}
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
    c=mix(c,shC*(ls*1.5+.05),sh*.035);
    c*=mix(vec3(1.),mix(vec3(1.04,1.01,.95),vec3(1.08,.98,.86),uWarm),smoothstep(.5,1.,ls)*.07);
    c=max(c,shC*.01);}
    // 夜は暗い所を深い藍に沈める（灯りの暖かさは明るい所に残る）。月のない夜は控えめに
    {float ln=dot(c,vec3(.299,.587,.114)),dn=ngt*(1.-smoothstep(.04,.45,ln))*(.4+.6*uMoonL);
    c=mix(c,c*vec3(.84,.9,1.12),dn*${glf(LOOK.nightIndigo)});}
    // 雲が日をかすめる：画面全体がわずかに沈んで青み、また明るむ（光の色の小さな揺らぎ）
    c*=mix(vec3(1.),vec3(.93,.95,.99),uVeil);
    // 夜更け：全体をわずかに暗く、静かに
    c*=1.-.12*uDeep;
    // 淡く明るい調子（ほんの少し）：明るい昼ほど、明るい所を上でやわらかく白へ寄せ、暗い所をわずかに持ち上げ、全体を乳白に少しだけ
    {float lp=dot(c,vec3(.299,.587,.114)),dk=uDay*(1.-uWarm*.6);
    c=mix(c,vec3(1.,.995,.985),smoothstep(.62,1.05,lp)*.1*dk);
    c=c*(1.-.035*dk)+vec3(.035,.035,.034)*dk;}
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
        uniforms: { tD: { value: null }, uNt: { value: 0 } },
        depthTest: false,
        depthWrite: false,
        vertexShader: `varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}`,
        fragmentShader: `uniform sampler2D tD;uniform float uNt;varying vec2 vU;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec3 bl=vec3(0.);
for(int i=0;i<16;i++){float a=float(i)*2.399,r=.003+.0032*float(i);
vec3 s=aces(texture2D(tD,vU+vec2(cos(a),sin(a))*r*vec2(1.,1.6)).rgb*1.15);
bl+=max(s-.55,0.)*(1.-float(i)/20.);}
// 夜の灯りの尾：強い光だけを、下へ長く・上へ短く、縦に薄く引きのばす（長く開けた写真のにじみ。ほんの少し）
if(uNt>0.){vec3 st=vec3(0.);for(int j=1;j<9;j++){float o=float(j)*.0022,k=1.-float(j)/9.;
st+=(max(aces(texture2D(tD,vU+vec2(0.,o)).rgb*1.15)-.7,0.)+max(aces(texture2D(tD,vU-vec2(0.,o*.5)).rgb*1.15)-.7,0.)*.6)*k;}
bl+=st*uNt*${glf(LOOK.nightStreak)};}
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
      G.rf = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }); // 映り込みは波でにじむので、画面の6割ほどの解像度で描く（画質の表の reflection）
      G.rc = new THREE.PerspectiveCamera();
    }
    const w = renderer.domElement.width,
      h = renderer.domElement.height,
      rs = QUALITY.reflection;
    if (G.rf.width !== Math.floor(w * rs)) G.rf.setSize(Math.floor(w * rs), Math.floor(h * rs));
    const rc = G.rc;
    const wy = water.position.y;
    camera.updateMatrixWorld();
    const dir = G._dir || (G._dir = new THREE.Vector3()); // 毎コマ新しく作らない
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
        if (o.geometry.boundingSphere.radius < 1.6) G.noRefl.push(o); // 形の大きさが約1.6より小さい物（小物・草・石）
      });
    }
    const nrVis = G._nrVis || (G._nrVis = []);
    nrVis.length = 0;
    for (const o of G.noRefl) nrVis.push(o.visible);
    for (const o of G.noRefl) o.visible = false;
    // 映り込みには遠い区画の景物（家・森・ヨシなど）を描かない。水面では波でにじんで見分けられないため（山並みと空は描く）
    const far2 = (QUALITY.reflFar * S) ** 2,
      cp = camera.position,
      v3 = G._v3r || (G._v3r = new THREE.Vector3()),
      farHid = G._farHid || (G._farHid = []);
    farHid.length = 0;
    for (const c of G.chunks) {
      if (!c.visible) continue;
      v3.copy(c.boundingSphere.center).applyMatrix4(c.matrixWorld);
      const d2 = (v3.x - cp.x) ** 2 + (v3.z - cp.z) ** 2,
        lf = c.userData.lodFar ? (c.userData.lodFar * 0.28 + c.boundingSphere.radius) ** 2 : Infinity; // 小さな物は、映り込みではもっと近くまで（波でにじむ。本描画の3割ほどの距離まで）
      if (d2 > far2 || d2 > lf) {
        c.visible = false;
        farHid.push(c);
      }
    }
    const cc = renderer.getClearColor(G._cc || (G._cc = new THREE.Color())),
      ca = renderer.getClearAlpha();
    renderer.setClearColor(0, 0);
    if (!G._clip) G._clip = [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)];
    G._clip[0].constant = -wy + 0.05;
    renderer.clippingPlanes = G._clip;
    renderer.setRenderTarget(G.rf);
    renderer.clear();
    TERR_RF.value = 1; // 映り込みの山肌は、細かい模様を省く（16-terrain-1-colors.js）
    renderer.render(scene, rc);
    TERR_RF.value = 0;
    renderer.clippingPlanes = G._noClip || (G._noClip = []);
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
  //   さらに、カメラも建物もほとんど動いていない間は3コマに1回、日が沈んでいる間（影がほとんど見えない）は6コマに1回にする
  {
    const cp = camera.position,
      q = camera.quaternion,
      L = G._shL || (G._shL = [0, 0, 0, 0, 0, 0, 0]),
      mv = Math.abs(cp.x - L[0]) + Math.abs(cp.y - L[1]) + Math.abs(cp.z - L[2]) + (Math.abs(q.x - L[3]) + Math.abs(q.y - L[4]) + Math.abs(q.z - L[5]) + Math.abs(q.w - L[6])) * 40;
    L[0] = cp.x;
    L[1] = cp.y;
    L[2] = cp.z;
    L[3] = q.x;
    L[4] = q.y;
    L[5] = q.z;
    L[6] = q.w;
    const still = mv < 0.02 && Math.hypot(B.vx || 0, B.vy || 0) < 0.02,
      every = sunAngle < -0.08 ? 6 : still ? 3 : 2;
    G.shTick = (G.shTick || 0) + 1;
    if (G.shTick % every === 0) renderer.shadowMap.needsUpdate = true;
  }
  // 立体的な入道雲を、半分の解像度で先に描く（13-sky-dome.js の G.skyCu）。入道雲のない空では描かない
  if (G.skyCu) {
    const on = skyU.uCu.value > 0.01 && skyDome.visible;
    skyU.uCuOn.value = on ? 1 : 0;
    if (on) {
      const K = G.skyCu,
        w2 = Math.max(1, G.rt.width >> 1),
        h2 = Math.max(1, G.rt.height >> 1);
      if (K.rt.width !== w2 || K.rt.height !== h2) K.rt.setSize(w2, h2);
      K.mesh.position.copy(skyDome.position);
      const cc = renderer.getClearColor(G._cc2 || (G._cc2 = new THREE.Color())),
        ca = renderer.getClearAlpha();
      renderer.setClearColor(0, 0);
      renderer.setRenderTarget(K.rt);
      renderer.clear();
      const nu = renderer.shadowMap.needsUpdate; // 影の描き直しは本描画で（雲の画面では使わない）
      renderer.shadowMap.needsUpdate = false;
      renderer.render(K.scene, camera);
      renderer.shadowMap.needsUpdate = nu;
      renderer.setClearColor(cc, ca);
      skyU.tCu.value = K.rt.texture;
      skyU.uCuRes.value.set(1 / G.rt.width, 1 / G.rt.height);
    }
  }
  renderer.setRenderTarget(G.rt);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  G.gq.material.uniforms.tD.value = G.rt.texture;
  {
    const w = Math.max(1, renderer.domElement.width >> 1),
      h = Math.max(1, renderer.domElement.height >> 1);
    if (G.blRT.width !== w || G.blRT.height !== h) G.blRT.setSize(w, h);
    G.blQ.material.uniforms.tD.value = G.rt.texture;
    G.blQ.material.uniforms.uNt.value = 1 - Math.max(Math.min(1, day * 2.5) * (1 - wxNow.dark), Math.max(0, 1 - Math.abs(Math.sin(sunAngle)) * 2.2)); // 夜の深さ（仕上げの ngt と同じ）
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
      const sp = (G._sp || (G._sp = new THREE.Vector3())).copy(sun.position).sub(house.position).normalize().multiplyScalar(500).add(camera.position).project(camera);
      const vis = sp.z < 1 && Math.abs(sp.x) < 1.2 && Math.abs(sp.y) < 1.2 ? Math.min(1, day * 2) * (1 - wxNow.gray) : 0;
      u.uSunS.value.set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5, vis);
    }
    u.uBlue.value = G.morning ? Math.max(0, 1 - Math.abs((G.sunY || 0) + 0.13) / 0.11) * (1 - wxNow.gray * 0.5) : 0;
  }
  G.gq.material.uniforms.uMoonL.value = G.moonLit;
  G.gq.material.uniforms.uDeep.value = G.deepNight || 0;
  {
    // 雲が日をかすめる揺らぎ：時計（見る人みな同じ）から、ゆっくりした不規則な重なりで。晴れた昼ほど、雲の多い日ほどよく起きる
    const tt = c.t,
      n = 0.5 + 0.5 * Math.sin(tt * 0.031 + Math.sin(tt * 0.0117) * 2.3) * Math.sin(tt * 0.0193 + 1.7),
      pass = Math.max(0, (n - 0.55) / 0.45),
      cl = Math.min(1, 0.25 + (skyU.uCu.value || 0) + (skyU.uCloud.value || 0) * 0.6);
    G.gq.material.uniforms.uVeil.value = pass * pass * cl * Math.min(1, day * 3) * (1 - wxNow.gray);
  }
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
