/* ---------- three.js：近景 ---------- */
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("gl"), antialias: true });
const MOBILE_ = matchMedia("(pointer:coarse)").matches;
// 画質：端末に応じた3段階（?q=high|mid|low で固定もできる）。表示中もフレームの速さで解像度を自動調整
const QQ = Q.get("q");
const QUAL =
  QQ ||
  (MOBILE_
    ? devicePixelRatio >= 3 || (navigator.hardwareConcurrency || 4) < 6
      ? "mid"
      : "mid"
    : (navigator.hardwareConcurrency || 4) >= 8
      ? "high"
      : "mid");
const HQ = QUAL === "high",
  LQ = QUAL === "low";
const MOBILE = matchMedia("(pointer:coarse)").matches;
/* 画質の表：高（high）・中（mid）・低（low）で何を省くか。重いときはここを調整する
   ?q=high / mid / low で強制できる。中と低はスマホ（MOBILE）だと水面の網目をさらに粗くする */
const QUALITY_TABLE = {
  high: { resStart: 1, resMax: 1, pixelMax: 2.5, shadowMap: 2048, shadowRange: 90, waterGrid: 420, terrain: [520, 650], reflection: 0.75, nearTrees: [500, 800], forest: [900, 1300], treeShadow: true, fireworks: 9000, fireworkBurst: 1 },
  mid: { resStart: 0.85, resMax: 0.9, pixelMax: 2, shadowMap: 1024, shadowRange: 40, waterGrid: 300, terrain: [360, 450], reflection: 0.5, nearTrees: [300, 480], forest: [600, 900], treeShadow: false, fireworks: 6000, fireworkBurst: 1 },
  low: { resStart: 0.6, resMax: 0.9, pixelMax: 2, shadowMap: 512, shadowRange: 40, waterGrid: 300, terrain: [360, 450], reflection: 0.5, nearTrees: [300, 480], forest: [600, 900], treeShadow: false, fireworks: 3500, fireworkBurst: 0.55 },
};
const QUALITY = { ...(QUALITY_TABLE[QUAL] || QUALITY_TABLE.mid) };
if (!HQ && MOBILE) QUALITY.waterGrid = 180;
let resScale = QUALITY.resStart;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
G.exp = 1;
renderer.shadowMap.enabled = !MOBILE_;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.5 : 2));
const scene = new THREE.Scene(),
  camera = new THREE.PerspectiveCamera(50, 1, 0.5, 12000);
scene.fog = new THREE.Fog(0x9bb7c8, 800, 5000);

// 空のドーム：天頂から地平へのグラデーションと、地平のかすみ、太陽
const skyU = {
  uTop: { value: new THREE.Color() },
  uHor: { value: new THREE.Color() },
  uSunD: { value: new THREE.Vector3(0, 1, 0) },
  uSunC2: { value: new THREE.Color() },
  uT: { value: 0 },
  uCloud: { value: 0.4 },
  uCu: { value: 0 },
  uDark: { value: 0 },
  uMp: { value: 0.5 },
  uCi: { value: 0.25 },
  uRay: { value: 0 },
  uLt: { value: 0 },
  uLd: { value: new THREE.Vector3(1, 0, 0) },
  uRb: { value: 0 },
};
const skyDome = new THREE.Mesh(
  new THREE.SphereGeometry(9000, 32, 16),
  new THREE.ShaderMaterial({
    uniforms: skyU,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `varying vec3 vD;void main(){vD=normalize(position);vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_Position.z=gl_Position.w*.9999;}`,
    fragmentShader: `uniform vec3 uTop,uHor,uSunD,uSunC2;
uniform float uT,uCloud,uDark,uCu,uMp,uCi,uRay,uLt,uRb;
uniform vec3 uLd;
varying vec3 vD;
 float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);
}float n(vec2 p){vec2 i=floor(p),f=fract(p);
f=f*f*(3.-2.*f);
return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);
}
 float fbm(vec2 p){float s=0.,a=.5;
for(int i=0;
i<5;
i++){s+=a*n(p);
p*=2.03;
a*=.5;
}return s;
}
 void main(){float y=max(vD.y,0.);
vec3 c=mix(uHor,uTop,pow(y,.45));
float sd=max(dot(vD,uSunD),0.);
float md=max(dot(vD,-uSunD),0.);
{vec3 md0=normalize(-uSunD*vec3(1.,-1.,1.)+vec3(0.,.25,0.));
vec3 sx=normalize(cross(md0,vec3(0.,1.,0.)));
float a0=dot(vD,md0);
float disc=smoothstep(.99955,.99968,a0);
float ph=uMp*6.2832;
vec3 sh=normalize(md0+sx*.026*cos(ph)*-1.);
float occ=smoothstep(.99955,.99968,dot(vD,sh));
float lit=uMp<.5?disc*(1.-occ*step(.03,abs(uMp-.5))):disc*(1.-occ*step(.03,abs(uMp-.5)));
float fullness=1.-abs(uMp-.5)*2.;
c+=vec3(.95,.95,.88)*max(lit,disc*.06)*smoothstep(.05,-.1,uSunD.y);
c+=vec3(.5,.55,.7)*pow(max(a0,0.),300.)*.25*fullness*smoothstep(.05,-.1,uSunD.y);
}c+=uSunC2*(pow(sd,1500.)*3.5+pow(sd,40.)*.2+pow(sd,6.)*.08+pow(sd,14.)*.22*uCloud);
c+=vec3(1.,.55,.3)*pow(max(dot(normalize(vec3(vD.x,0.,vD.z)),normalize(vec3(uSunD.x,0.,uSunD.z))),0.),6.)*smoothstep(.35,0.,y)*smoothstep(.35,0.,abs(uSunD.y))*.6;
 vec2 cp=vD.xz/(vD.y+.08)*1.4+vec2(uT*.004,uT*.002);
cp+=vec2(fbm(cp*.35+1.3),fbm(cp*.35+7.1))*1.1-.55;
float ci=(smoothstep(.55,.9,fbm(vec2(cp.x*.6,cp.y*3.)+3.))+smoothstep(.6,.85,fbm(cp*6.+9.))*smoothstep(.45,.7,fbm(cp*.8+2.))*.8)*uCi*smoothstep(.05,.3,vD.y);
c=mix(c,vec3(1.),ci*(1.-uDark));
float cl=max(smoothstep(.5-uCloud*.3,1.,fbm(cp)),smoothstep(.62-uCloud*.15,.95,fbm(vec2(cp.x*.35,cp.y*1.6)+7.))*.9)*smoothstep(0.,.12,vD.y);
float cb=fbm(cp+vec2(.05,.03));
float cb2=fbm(cp-uSunD.xz*.06);
vec3 cc=(1.-.42*smoothstep(.45,.9,cb)+.18*smoothstep(.0,.3,cb-cb2))*mix(mix(vec3(1.),uTop*1.6,smoothstep(.25,0.,uSunD.y+.1)),uHor*.9,.35)*mix(mix(vec3(1.,.52,.38),vec3(1.,.72,.55),smoothstep(-.05,.12,uSunD.y)),vec3(1.),smoothstep(.05,.35,uSunD.y))*(1.+.35*smoothstep(.3,.0,uSunD.y)*smoothstep(-.12,.0,uSunD.y))*(1.-uDark*.6)+uSunC2*pow(sd,4.)*.4;
c=mix(c,cc,cl*.85);
if(uCu>.01){vec2 q=vec2(atan(vD.z,vD.x)*3.2+uT*.0015,vD.y*9.);
float hgt=fbm(vec2(q.x*1.3,1.7))*.55+.12;
float base=.035;
float m_=smoothstep(.0,.04,vD.y-base)*smoothstep(hgt+.02,hgt-.06,vD.y)*smoothstep(.42,.62,fbm(q*vec2(1.6,1.)+5.));
float sh_=smoothstep(base+.18,base,vD.y)*.35+(1.-smoothstep(.0,.5,fbm(q*2.3+2.)))*.25;
vec3 cu=mix(vec3(1.),vec3(.72,.76,.84),sh_);
cu=mix(cu,mix(vec3(1.,.62,.6),vec3(1.,.72,.52),smoothstep(-.05,.1,uSunD.y)),smoothstep(.35,.0,uSunD.y)*.85)*(1.-uDark*.6);
c=mix(c,cu,m_*uCu);
}
 if(uRay>.01){vec3 sp=normalize(vD-uSunD*dot(vD,uSunD));
float an=atan(dot(sp,normalize(cross(uSunD,vec3(0.,1.,0.)))),sp.y);
float rays=smoothstep(.55,.9,fbm(vec2(an*8.,uT*.01)))*pow(max(dot(vD,uSunD),0.),3.)*smoothstep(-.02,.15,vD.y);
c+=vec3(1.,.86,.62)*rays*uRay*.5;
}if(uLt>.01){float lg=pow(max(dot(vD,normalize(uLd)),0.),18.)*smoothstep(.0,.04,vD.y)*smoothstep(.3,.06,vD.y);
c+=vec3(.85,.85,1.)*lg*uLt*1.4;
}
 if(uRb>.01){vec3 anti=normalize(-uSunD);
float ang=acos(clamp(dot(vD,anti),-1.,1.));
float band=(ang-.70)/.035;
vec3 rb=clamp(vec3(1.-abs(band-1.),1.-abs(band),1.-abs(band+1.)),0.,1.);
c+=rb*.22*uRb*smoothstep(.0,.05,vD.y)*smoothstep(-.4,.6,band+1.6)*(1.-smoothstep(1.6,2.2,abs(band)));
}
 {float lw=smoothstep(.3,.02,uSunD.y)*smoothstep(-.16,.0,uSunD.y)*(1.-uDark);
vec3 ly=mix(vec3(1.,.6,.32),vec3(1.,.62,.66),smoothstep(.0,.08,y));
ly=mix(ly,vec3(.72,.66,.9),smoothstep(.06,.22,y));
c=mix(c,ly*mix(1.,.8,smoothstep(.0,.3,y)),lw*.45*smoothstep(.45,.0,y));
}
 c+=vec3(.1,.1,.09)*exp(-y*16.)*smoothstep(-.1,.2,uSunD.y)*(1.-uDark);
 float nt=smoothstep(.05,-.15,uSunD.y);
 vec2 sp_=vD.xz/(vD.y+.25);
float h1=fract(sin(dot(floor(sp_*160.),vec2(12.9,78.2)))*43758.5),h2=fract(sin(dot(floor(sp_*70.),vec2(39.3,11.1)))*24634.6);
 vec2 f1=fract(sp_*160.)-.5,f2=fract(sp_*70.)-.5;
float st=step(.992,h1)*(.3+.7*fract(h1*91.))*smoothstep(.25,.0,length(f1))+step(.997,h2)*1.3*smoothstep(.22,.0,length(f2));
 vec3 mwd=normalize(vec3(.55,.35,-.75));
float mw=exp(-pow(dot(vD,mwd)*4.,2.))*(.55+.45*fbm(vD.xz*9.+vD.y*4.));
 st+=step(.97,h1)*mw*.9*smoothstep(.25,.0,length(f1));
c+=vec3(.55,.6,.8)*mw*.06*nt*(1.-uDark);
 c=mix(c,mix(vec3(.08,.14,.32),vec3(.01,.02,.08),pow(y,.6)),nt*.9);
c+=mw*nt*vec3(.05,.055,.08)*(1.-uDark);
 c+=vec3(.22,.2,.28)*mw*nt*smoothstep(.05,.35,y)*(1.-cl*.8);
 c+=mix(vec3(1.,.85,.7),vec3(.75,.85,1.),fract(h1*37.+h2*11.))*st*3.2*smoothstep(.04,.3,y)*nt*(1.-cl*.7);
 c+=vec3(1.,.62,.35)*exp(-y*9.)*nt*.45;
c=mix(c,uHor,smoothstep(.2,0.,y)*.75);
gl_FragColor=vec4(c,1.);
}`,
  }),
);
skyDome.renderOrder = -1;
skyDome.frustumCulled = false;
scene.add(skyDome);
const hemi = new THREE.HemisphereLight(0xcfe3f0, 0x46523a, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
scene.add(sun);
sun.castShadow = true;
sun.shadow.mapSize.set(QUALITY.shadowMap, QUALITY.shadowMap);
Object.assign(sun.shadow.camera, {
  left: -QUALITY.shadowRange,
  right: QUALITY.shadowRange,
  top: QUALITY.shadowRange,
  bottom: -QUALITY.shadowRange,
  near: 1,
  far: 300,
});
sun.shadow.bias = -0.0005;
scene.add(sun.target);

// 水深テクスチャ（浅い所の色に使う）
const dtex = new Uint8Array(GW * GH * 4);
for (let i = 0; i < GW * GH; i++) {
  const v = Math.min(255, depthG[i] * 6);
  dtex[i * 4] = v;
  dtex[i * 4 + 3] = 255;
}
const depthTex = new THREE.DataTexture(dtex, GW, GH);
depthTex.magFilter = depthTex.minFilter = THREE.LinearFilter;
depthTex.needsUpdate = true;

// ゲルストナー波（JSとシェーダで同じ式）
const NW = 8,
  waves = Array.from({ length: NW }, () => ({ dx: 1, dz: 0, k: 0.1, w: 1, A: 0.2, Qs: 0.5 }));
function setWaves(W) {
  const base = Math.atan2(W.y, W.x),
    amp = (RM ? 0.4 : 1) * Math.min(1.4, (0.06 + W.s * W.s * 0.012) * (W.wave || 1));
  const spec = [
    [0, 34, 1],
    [0.42, 23, 0.7],
    [-0.37, 17, 0.55],
    [0.9, 12, 0.38],
    [-0.8, 9, 0.3],
    [0.2, 6.5, 0.22],
    [-1.3, 4.6, 0.16],
    [1.5, 3.2, 0.11],
  ];
  spec.forEach(([da, L, f], i) => {
    const a = base + da,
      k = (2 * Math.PI) / L;
    Object.assign(waves[i], {
      dx: Math.cos(a),
      dz: Math.sin(a),
      k,
      w: Math.sqrt(9.8 * k),
      A: ((amp * f * L) / 34) * 0.8,
      Qs: 0.38,
    });
  });
}
function waveH(x, z, t) {
  let h = 0;
  for (let i = 0; i < 3; i++) {
    const v = waves[i];
    h +=
      v.A * Math.sin(v.k * (v.dx * x + v.dz * z) - v.w * t + Math.sin((x * 0.013 + z * 0.017) * (1 + i)) * 2);
  }
  return h;
} // 水面のシェーダと同じ式（長い3波）
function waveTop(x, z, t, r) {
  let m = -1e9;
  for (const [a, b] of [
    [0, 0],
    [r, 0],
    [-r, 0],
    [0, r],
    [0, -r],
  ])
    m = Math.max(m, waveH(x + a, z + b, t));
  return m;
}

const waterU = {
  uT: { value: 0 },
  uW: { value: Array.from({ length: NW }, () => new THREE.Vector4()) },
  uA: { value: Array.from({ length: NW }, () => new THREE.Vector2()) },
  uSky: { value: new THREE.Color() },
  uDeep: { value: new THREE.Color(PALETTE.waterDeep) },
  uShal: { value: new THREE.Color(PALETTE.waterShallow) },
  uSun: { value: new THREE.Vector3() },
  uSunC: { value: new THREE.Color() },
  uDepth: { value: depthTex },
  uBox: {
    value: new THREE.Vector4(minX * S, minY * S, (maxX - minX) * S + CELL * S, (maxY - minY) * S + CELL * S),
  },
  uFogC: { value: new THREE.Color() },
  uFog: { value: new THREE.Vector2(800, 5000) },
  uFoam: { value: 0 },
  uT2: { value: 0 },
  uHouse: { value: new THREE.Vector3(0, 0, 8) },
  uWd: { value: new THREE.Vector2(1, 0) },
  uRefl: { value: null },
  uTM: { value: new THREE.Matrix4() },
  uWy: { value: 0 },
  uRes: { value: new THREE.Vector2(1, 1) },
  uCalm: { value: 1 },
  uSD: { value: 0 },
  uMist: { value: 0 },
  uMp2: { value: 0.5 },
  uCSh: { value: 1 },
  uTr: { value: Array.from({ length: 40 }, () => new THREE.Vector4(0, 0, 99, 0)) },
  uLamp: { value: new THREE.Color(0) },
  uHL: { value: new THREE.Vector4() },
  uHLc: { value: new THREE.Vector3() },
  uFW: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) },
  uFWc: { value: Array.from({ length: 8 }, () => new THREE.Vector3()) },
  uMouth: { value: Array.from({ length: 16 }, () => new THREE.Vector4()) },
  uRainR: { value: 0 },
  uMurk: { value: 0 },
};
const water = new THREE.Mesh(
  new THREE.PlaneGeometry(5000, 5000, QUALITY.waterGrid, QUALITY.waterGrid).rotateX(
    -Math.PI / 2,
  ),
  new THREE.ShaderMaterial({
    uniforms: waterU,
    vertexShader: `uniform float uT;
uniform vec4 uW[${NW}];
uniform vec2 uA[${NW}];
varying vec3 vP;
varying vec3 vP0;
void main(){vec3 p=(modelMatrix*vec4(position,1.)).xyz;
vec3 q=p;
float dc=length(cameraPosition.xz-p.xz);
for(int i=0;
i<3;
i++){vec2 d=uW[i].xy;
float k=uW[i].z,w=uW[i].w,A=uA[i].x,Qs=uA[i].y/(k*A*3.+1e-4);
float f=k*dot(d,p.xz)-w*uT+sin(dot(p.xz,vec2(.013,.017))*(1.+float(i)))*2.;
float att=1.-smoothstep(120.,500.,dc);
q.x+=Qs*A*d.x*cos(f)*att;
q.z+=Qs*A*d.y*cos(f)*att;
q.y+=A*sin(f)*att;
}
vP=q;
vP0=p;
gl_Position=projectionMatrix*viewMatrix*vec4(q,1.);
}`,
    fragmentShader: `uniform vec3 uSky,uDeep,uShal,uSun,uSunC,uFogC;
uniform sampler2D uDepth;
uniform vec4 uBox;
uniform vec2 uFog;
uniform float uMurk;
uniform float uFoam;
uniform vec4 uMouth[16];
uniform vec4 uFW[8];
uniform vec3 uFWc[8];
uniform vec4 uHL;
uniform vec3 uHLc;
uniform float uRainR;
uniform float uT2;
uniform vec3 uHouse;
uniform vec2 uWd;
uniform sampler2D uRefl;
uniform vec2 uRes;
uniform float uCalm;
uniform float uSD;
uniform float uMist;
uniform float uMp2;
uniform float uCSh;
uniform mat4 uTM;
uniform float uWy;
uniform vec4 uTr[40];
uniform vec3 uLamp;
uniform float uT;
uniform vec4 uW[${NW}];
uniform vec2 uA[${NW}];
varying vec3 vP;
varying vec3 vP0;
void main(){vec3 V=normalize(cameraPosition-vP);
float dc=length(cameraPosition-vP);
vec3 n=vec3(0.,1.,0.);
for(int i=0;
i<${NW};
i++){vec2 d=uW[i].xy;
float k=uW[i].z,w=uW[i].w,A=uA[i].x;
float L=6.2832/k;
float fd=clamp(1.-dc/(L*18.),0.,1.)*1.4;
float f=k*dot(d,vP0.xz)-w*uT+sin(dot(vP0.xz,vec2(.013,.017))*(1.+float(i)))*2.;
n.x-=d.x*k*A*cos(f)*fd;
n.z-=d.y*k*A*cos(f)*fd;
}
vec2 rp=vP0.xz;
float t2=uT2;
vec2 g=vec2(0.);
float fa=1.;
vec2 pp=rp*1.1;
for(int o=0;
o<5;
o++){vec2 q=pp-uWd*t2*(.35+float(o)*.12)+vec2(sin(pp.y*.7+t2*.21),cos(pp.x*.6-t2*.17))*.35;
vec2 i=floor(q),f=fract(q);
vec2 u=f*f*(3.-2.*f);
 float a=fract(sin(dot(i,vec2(127.1,311.7)))*43758.5),b=fract(sin(dot(i+vec2(1,0),vec2(127.1,311.7)))*43758.5),c2=fract(sin(dot(i+vec2(0,1),vec2(127.1,311.7)))*43758.5),d2=fract(sin(dot(i+vec2(1,1),vec2(127.1,311.7)))*43758.5);
 vec2 du=6.*f*(1.-f);
g+=fa*vec2((b-a)*(1.-u.y)+(d2-c2)*u.y,(c2-a)*(1.-u.x)+(d2-b)*u.x)*du*.17*smoothstep(160.+float(o)*-20.,4.,dc*(1.+float(o)*.4));
pp=mat2(1.6,1.2,-1.2,1.6)*pp+vec2(1.7,9.2);
fa*=.55;
}
g+=vec2(cos(dot(rp,vec2(.05,.03))+t2*.6+sin(rp.y*.021)*3.),cos(dot(rp,vec2(-.02,.06))+t2*.5+sin(rp.x*.017)*3.))*.01;
vec2 mg=vec2(sin(rp.x*3.1+t2*1.9+sin(rp.y*2.3)),sin(rp.y*2.9+t2*1.7+sin(rp.x*2.1)))*.018*smoothstep(25.,2.,dc);
g+=mg;
float wf=0.;
for(int i=0;
i<40;
i++){vec4 tr=uTr[i];
if(tr.z>14.)continue;
vec2 d=vP0.xz-tr.xy;
float dd=length(d),r=tr.z*1.6+.5;
float env=exp(-pow((dd-r)/(1.2+tr.z*.35),2.))*exp(-tr.z*.22)*tr.w;
  float ph=(dd-r)*2.4;
g+=d/(dd+1e-3)*cos(ph)*env*.55;
wf+=exp(-dd*dd/(.5+tr.z*.9))*exp(-tr.z*.28)*tr.w*.55;
}
 float bk=.55+.9*fract(sin(dot(floor(vP0.xz*.004),vec2(3.3,7.9)))*91.)*.5+.45*sin(vP0.x*.0031+sin(vP0.z*.0023)*2.)*.5;
g*=bk;
vec3 N=normalize(n*vec3(1.-uCalm*.5,1.,1.-uCalm*.5)+vec3(-g.x,0.,-g.y)*(1.+uFoam)*(1.-uCalm*.45)*(1.-.6*smoothstep(.0,-.2,uSun.y)));
N=normalize(mix(N,vec3(0.,1.,0.),smoothstep(150.,900.,dc)*.85));
float fr=.02+.98*pow(1.-max(dot(N,V),0.),5.);
vec2 uv=(vP.xz-uBox.xy)/uBox.zw;
float dep=texture2D(uDepth,uv).r*255./6.;
float sh=exp(-dep/3.);
// ── 水の色の重なり（上から順に塗り重ねる）──
// ① 沖と浅い水の基本色（PALETTE.waterDeep / waterShallow）　② 風の筋で暗く
// ③ 浅瀬：湖底が透ける（lakeBedSand/Light）　④ 浅瀬と沖の間の青緑（shoalTeal）　⑤ 浅瀬の光の網目
vec3 body=mix(uDeep,uShal,sh*.8);
{vec2 wd=normalize(uWd+1e-4),wp=vec2(dot(vP0.xz,wd),dot(vP0.xz,vec2(-wd.y,wd.x)));
float ws=(1.-uCalm)*smoothstep(.45,.75,fract(sin(dot(floor(vec2(wp.x*.006-uT2*.05,wp.y*.03)),vec2(5.1,3.7)))*91.))*smoothstep(.2,.8,sin(wp.y*.045+sin(wp.x*.004)*3.)*.5+.5);
body*=1.-ws*.22;
}{float sb=smoothstep(4.,.4,dep);
vec3 bed=mix(${v3(PALETTE.lakeBedSand)},${v3(PALETTE.lakeBedLight)},fract(sin(dot(floor(vP0.xz*.08),vec2(4.7,1.9)))*77.)*.6);
body=mix(body,bed,sb*.5);
{vec2 cq=vP0.xz*.9;
float ca=abs(sin(cq.x+sin(cq.y*1.3+uT2*.9)*1.6+uT2*.6)*sin(cq.y*1.1+sin(cq.x*1.4-uT2*.7)*1.5-uT2*.5));
body+=vec3(.09,.1,.07)*pow(1.-ca,6.)*sb*clamp(uSun.y*3.,0.,1.)*smoothstep(150.,10.,dc);
}body=mix(body,${v3(PALETTE.shoalTeal)},smoothstep(12.,3.,dep)*(1.-sb)*.3);
}body=mix(body,vec3(.22,.42,.55),smoothstep(10.,60.,dep)*.5);
float tb=0.;
for(int i=0;
i<16;
i++){vec2 d=vP.xz-uMouth[i].xy;
tb+=uMouth[i].w*exp(-dot(d,d)/(uMouth[i].z*uMouth[i].z));
}body=mix(body,vec3(.52,.42,.28),clamp(tb,0.,.85));
// ── 反射：空の色・太陽のきらめき・月の照り返し ──
vec3 R=reflect(-V,N);
float rs=max(dot(R,uSun),0.);
float mr=max(dot(R,normalize(vec3(-uSun.x,abs(uSun.y)+.2,-uSun.z))),0.);
float msp=(.25+.75*(1.-abs(uMp2-.5)*2.))*(pow(mr,300.)*1.4+pow(mr,40.)*.12*step(.75,fract(sin(dot(floor(vP0.xz*4.),vec2(4.1,7.3))+uT2*1.5)*99.)))*smoothstep(.0,-.15,uSun.y);
float gh=fract(sin(dot(floor(vP0.xz*6.),vec2(4.1,7.3)))*99.);
float glit=step(.72,gh)*smoothstep(.45,.1,length(fract(vP0.xz*6.)-.5))*pow(.5+.5*sin(uT2*(2.+gh*3.)+gh*40.),4.)*pow(rs,14.)*5.5*smoothstep(900.,10.,dc)+step(.9,fract(sin(dot(floor(vP0.xz*1.5),vec2(7.7,3.1)))*91.))*pow(.5+.5*sin(uT2*3.+gh*20.),6.)*pow(rs,40.)*3.*smoothstep(2500.,200.,dc);
float sp=glit+msp+pow(rs,900.)*2.*smoothstep(500.,30.,dc)*(.6+.8*fract(sin(dot(floor(vP0.xz*3.),vec2(4.1,7.3))+uT2*2.)*99.))+pow(rs,60.)*.6*smoothstep(.35,0.,uSun.y)+pow(rs,60.)*.22+pow(rs,8.)*.05;
vec3 skyR=mix(uSky*1.12,uSky*.78,pow(clamp(R.y,0.,1.),.5))+vec3(1.,.6,.35)*exp(-max(R.y,0.)*12.)*smoothstep(.05,-.15,uSun.y)*.3+vec3(.8,.85,1.)*step(.996,fract(sin(dot(floor(R.xz/(R.y+.25)*300.),vec2(12.9,78.2)))*43758.5))*smoothstep(.05,-.15,uSun.y)*smoothstep(.05,.25,R.y)*.6+vec3(.02,.03,.05)*smoothstep(.05,-.1,uSun.y);
float lowR=smoothstep(.09,.0,R.y);
skyR+=vec3(.25,.16,.06)*lowR*smoothstep(.0,-.15,uSun.y)*.25*(.5+.5*sin(vP.x*.9+sin(vP.z*.3)*3.));
skyR*=1.+.1*(fract(sin(dot(floor((vP.xz+R.xz*200.)*.01),vec2(1.7,9.2)))*43.)-.5)*(1.-lowR);
// ── 建物のまわり：喫水の陰、波の斜面の陰影、建物の影、水際の泡 ──
float ub=length(vP.xz-uHouse.xy);
body*=1.-.38*smoothstep(uHouse.z*1.15,uHouse.z*.3,ub);
body*=.9+.22*clamp(dot(N,normalize(vec3(uSun.x,1.2,uSun.z))),0.,1.);
{vec2 so=uHouse.xy-normalize(uSun.xz+1e-4)*uHouse.z*.9/max(uSun.y,.25)*.6;
float hs=smoothstep(uHouse.z*1.,uHouse.z*.4,length(vP.xz-so));
body*=1.-hs*.28*clamp(uSun.y*3.,0.,1.);
}float wlf=exp(-pow((ub-uHouse.z*.92)/(.6+uHouse.z*.05),2.))*(.55+.45*sin(atan(vP.z-uHouse.y,vP.x-uHouse.x)*9.+uT2*1.3))*(.5+.5*fract(sin(dot(floor(vP0.xz*3.),vec2(3.7,8.1)))*91.));
skyR=mix(skyR,vec3(.18,.26,.2),lowR*.65);
// ── 泡：白波・岸の波打ち際・雨の波紋・遠くの白波 ──
float wfoam=smoothstep(.12,.8,wf)*(.35+.65*fract(sin(dot(floor(vP0.xz*5.),vec2(7.,3.)))*91.));
float foam=wfoam*.55+uFoam*smoothstep(.12,.3,1.-N.y)*.8+smoothstep(.06,.12,1.-N.y)*uFoam*.25;
float swn=sin(dot(vP0.xz,vec2(.6,.8))*.9-uT*1.4+sin(vP0.x*.21)*2.)*.5+.5;
float fn=.5+.5*sin(vP0.x*.9+sin(vP0.z*.7)*2.+uT*.7);
float shoreF=smoothstep(.15,0.,dep)*smoothstep(.75,1.,swn)*(.4+.6*fn)*.7*(.35+uFoam*.6)*smoothstep(700.,30.,dc);
foam+=shoreF+smoothstep(.22,.04,dep)*smoothstep(.0,.04,dep)*.12*(.6+.4*sin(uT2*1.2+vP0.x*.4));
foam+=(1.-uCalm)*smoothstep(.3,1.,1.-uCalm)*step(.985,fract(sin(dot(floor(vec2(dot(vP0.xz,uWd)*.05-uT2*.08,dot(vP0.xz,vec2(-uWd.y,uWd.x))*.012)),vec2(4.3,9.1)))*733.))*smoothstep(250.,1200.,dc)*smoothstep(6000.,2500.,dc)*.7;
body=mix(body,vec3(.48,.56,.42),smoothstep(.5,0.,dep)*.3);
{vec2 sq=vP0.xz*1.6,si=floor(sq);
float sn=fract(sin(dot(si,vec2(7.1,3.9)))*91.),sd2=length(fract(sq)-.5);
vec3 stone=mix(vec3(.55,.48,.36),vec3(.38,.36,.4),sn)*(1.-smoothstep(.3,.5,sd2)*.4);
body=mix(body,stone,smoothstep(.45,0.,dep)*.55);
}body*=1.-.15*smoothstep(.6,.1,dep);
body+=vec3(.05,.06,.04)*smoothstep(.4,0.,dep)*pow(abs(sin(vP0.x*1.7+uT2)*sin(vP0.z*1.9-uT2*.8)),3.)*clamp(uSun.y*3.,0.,1.);
float rr=0.;
{for(int k=0;
k<2;
k++){vec2 q=vP.xz*(1.1+float(k)*.7)+float(k)*7.3,ci=floor(q),cf=fract(q)-.5;
float h=fract(sin(dot(ci,vec2(12.9,78.2)))*43758.5),ph=fract(uT2*(.8+h*.6)+h*7.);
vec2 o=vec2(fract(h*13.)-.5,fract(h*29.)-.5)*.4;
float r=length(cf-o),rad=ph*.45;
rr+=smoothstep(.04,.0,abs(r-rad))*(1.-ph)*step(.35,h);
}rr*=uRainR*.35*smoothstep(70.,8.,length(cameraPosition-vP));
}foam+=wlf*.32;
foam+=rr;
// ── 明るさ：時刻、空の映り込み、浅瀬の濡れた石、遠くで空と溶ける ──
body*=.55+.6*clamp(uSun.y*2.+.1,0.,1.);
body+=uSky*.14;
float sss=pow(max(dot(V,-uSun+N*.5),0.),3.)*max(vP.y,0.)*.25;
body+=vec3(.1,.18,.12)*sss;
float graz=pow(1.-max(V.y,0.),3.);
N=normalize(mix(N,vec3(0.,1.,0.),graz*.3*smoothstep(60.,400.,dc)));
body=mix(body,body*vec3(.75,.85,.95),graz*.5);
// ── 山や建物の映り込み（静かな日ほど鮮明に）──
vec4 tp=uTM*vec4(vP.x,uWy,vP.z,1.);
vec2 ruv=tp.xy/tp.w+N.xz*vec2(.04,.08)*(1.2-uCalm*.7)*(.35+.65*smoothstep(1400.,40.,dc));
vec4 rf=vec4(0.);
for(int k=-3;
k<=3;
k++)for(int j=-1;
j<=1;
j++)rf+=texture2D(uRefl,ruv+vec2(float(j)*.003,float(k)*.0018)*(1.-uCalm*.65));
rf/=21.;
float fogR=1.-smoothstep(uFog.x*.5,uFog.y*.55,dc);
float lr=dot(rf.rgb/max(rf.a,.001),vec3(.3,.59,.11)),lfg=dot(uFogC,vec3(.3,.59,.11));
float keep=max(smoothstep(lfg-.03,lfg-.18,lr),smoothstep(lfg+.04,lfg+.25,lr));
skyR=mix(skyR,mix(rf.rgb/max(rf.a,.001),uFogC,1.-fogR),smoothstep(.0,.6,rf.a)*.9*fogR*keep*(.55+.45*smoothstep(25.,350.,dc)));
for(int i=0;
i<8;
i++){if(uFW[i].w<.01)continue;
vec3 Lf=normalize(uFW[i].xyz-vP);
float dd=max(dot(R,Lf),0.);
skyR+=uFWc[i]*uFW[i].w*(pow(dd,180.)*1.6+pow(dd,30.)*.25);
}
// ── 合成：水の色と反射を混ぜ、灯り・花火・霧・遠景の霞を重ねる ──
 vec3 c=mix(body,skyR*mix(vec3(.9,.95,1.),vec3(1.05),graz),min(1.,fr*(1.05-uRainR*.3)+.03))+uSunC*sp+foam+uSunC*.04*pow(max(dot(-V,uSun),0.),2.);
float ws_=smoothstep(.6,1.,sin(dot(vP0.xz,vec2(.011,.017))+sin(vP0.x*.004)*3.)*.5+.5)*.04*(1.-smoothstep(300.,1500.,dc));
c+=ws_;
c*=.97+.06*sin(vP.x*.002+sin(vP.z*.0017)*2.);
float csh=smoothstep(.35,.8,.5+.5*sin((vP.x+uT2*4.)*.0045+sin(vP.z*.0031)*2.)*sin((vP.z+uT2*2.)*.0038+sin(vP.x*.0027)*1.7));
c*=1.-csh*.24*clamp(uSun.y*3.,0.,1.)*uCSh;
if(uHL.w>.001){vec2 dh=vP.xz-uHL.xz;
float dl=length(dh);
vec3 Lh=normalize(uHL.xyz-vP);
float sh=max(dot(reflect(-V,N),Lh),0.);
c+=uHLc*uHL.w*(exp(-dl*dl/180.)*.22+exp(-dl*dl/900.)*.12+exp(-dl/9.)*.08+pow(sh,90.)*1.2*smoothstep(400.,20.,dl));
}c=mix(c,c*vec3(.42,.56,.56)+vec3(.0,.02,.025),uSD);
c=mix(c,mix(uFogC,vec3(1.),.45)*1.05,uMist*smoothstep(30.,700.,dc)*.8);
c=mix(c,uFogC*1.02,smoothstep(1500.,6500.,dc)*(.25+.45*uCalm));
float fd=length(cameraPosition-vP);
c=mix(c,uFogC,smoothstep(uFog.x*.6,uFog.y,fd));
gl_FragColor=vec4(c,1.);
}`,
  }),
);
water.frustumCulled = false;
scene.add(water);

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
