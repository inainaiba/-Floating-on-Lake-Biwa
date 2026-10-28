/* ---------- 毎フレーム⑤：描画（映り込み → 本描画 → 色の仕上げ） ---------- */
function renderFrame(c, W, wxNow, day, sunAngle) {
  {
    const q = 5000 / (QUALITY.waterGrid);
    water.position.x = Math.round(camX / q) * q;
    water.position.z = Math.round(camZ / q) * q;
  }
  if (!G.rt) {
    G.rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    G.rt.depthTexture = new THREE.DepthTexture(1, 1);
    G.gq = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms: {
          tD: { value: null },
          tZ: { value: null },
          uN: { value: 0.1 },
          uF: { value: 1000 },
          uFoc: { value: 50 },
          uDof: { value: 0 },
          uAsp: { value: 1.6 },
          uSunS: { value: new THREE.Vector3(0, 0, 0) },
          uTm: { value: 0 },
          uWarm: { value: 0 },
          uDay: { value: 1 },
          uMorn: { value: 0 },
        },
        depthTest: false,
        depthWrite: false,
        vertexShader: `varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}`,
        fragmentShader: `uniform sampler2D tD,tZ;uniform float uN,uF,uFoc,uDof,uAsp;uniform vec3 uSunS;
float lz(vec2 u){float z=texture2D(tZ,u).r*2.-1.;return 2.*uN*uF/(uF+uN-z*(uF-uN));}
float coc(vec2 u){return clamp((lz(u)-uFoc*3.)/(uFoc*10.),0.,1.);}
uniform float uWarm,uDay,uMorn,uTm;
varying vec2 vU;
   vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);
}
   void main(){vec3 c0=texture2D(tD,vU).rgb;
// 被写界深度：建物に寄ったときだけ、遠景をほのかにぼかす
if(uDof>.01){float k=coc(vU)*uDof;if(k>.02){vec3 s=c0;float ws=1.;for(int i=0;i<14;i++){float a=float(i)*2.399,r=sqrt(float(i)+.5)*.001*k;vec2 o=vU+vec2(cos(a),sin(a)*uAsp)*r;float w=coc(o);s+=texture2D(tD,o).rgb*w;ws+=w;}c0=s/ws;}}
vec3 c=aces(c0*1.15);
vec3 bl=vec3(0.);
for(int i=0;
i<16;
i++){float a=float(i)*2.399,r=.003+.0032*float(i);
vec3 s=aces(texture2D(tD,vU+vec2(cos(a),sin(a))*r*vec2(1.,1.6)).rgb*1.15);
bl+=max(s-.55,0.)*(1.-float(i)/20.);
}c+=bl*vec3(.15,.14,.13);
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
    const vis = [water.visible, skyDome.visible];
    water.visible = false;
    skyDome.visible = false;
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
    waterU.uRefl.value = G.rf.texture;
    waterU.uWy.value = wy;
    waterU.uRes.value.set(w, h);
    waterU.uCalm.value = Math.max(0, 1 - W.s / 6) * (wxNow.rain > 0.3 ? 0.3 : 1);
  }
  renderer.setRenderTarget(G.rt);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  G.gq.material.uniforms.tD.value = G.rt.texture;
  {
    const u = G.gq.material.uniforms,
      fd = camera.position.distanceTo(house.position);
    u.tZ.value = G.rt.depthTexture;
    u.uN.value = camera.near;
    u.uF.value = camera.far;
    u.uFoc.value = fd;
    u.uAsp.value = camera.aspect;
    {
      const sp = sun.position.clone().sub(house.position).normalize().multiplyScalar(500).add(camera.position).project(camera);
      const vis = sp.z < 1 && Math.abs(sp.x) < 1.2 && Math.abs(sp.y) < 1.2 ? Math.min(1, day * 2) * (1 - wxNow.gray) : 0;
      u.uSunS.value.set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5, vis);
    }
    u.uDof.value = 0.8 * Math.min(1, Math.max(0, (85 - fd) / 20)) * QUALITY.dof;
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
