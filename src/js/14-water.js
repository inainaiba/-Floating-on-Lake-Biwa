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
  uGap: { value: 0 },
  uLowSun: { value: 0 },
  uMp2: { value: 0.5 },
  uCSh: { value: 1 },
  uCl: { value: 0 },
  uMoonD: { value: new THREE.Vector3(0, 1, 0) },
  uLead: { value: 0 },
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
/* 水面の描画（フラグメント）：処理の順に区切った部品。上から順に一つの main の中でつながる。
   どの部品も前の部品で作った値（V, dc, N, body, skyR, foam, c など）を使うので、順番は入れ替えない。 */
const W_FS_HEAD = `uniform vec3 uSky,uDeep,uShal,uSun,uSunC,uFogC;
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
uniform float uMist;uniform float uGap;uniform float uLowSun;
uniform float uMp2;
uniform float uCSh;uniform float uCl,uLead;uniform vec3 uMoonD;
${GLSL_NOISE}
uniform mat4 uTM;
uniform float uWy;
uniform vec4 uTr[40];
uniform vec3 uLamp;
uniform float uT;
uniform vec4 uW[${NW}];
uniform vec2 uA[${NW}];
varying vec3 vP;
varying vec3 vP0;`;
// 波の法線：うねり・小波・航跡のさざなみ
const W_FS_NORMAL = `vec3 V=normalize(cameraPosition-vP);
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
// 風紋の境目：微風の日、鏡のような凪の面と波立つ面がくっきり分かれる
{vec2 wd=normalize(uWd+1e-4);vec2 q=vP0.xz*.0011-wd*uT2*.01;float fld=sin(q.x*2.3+sin(q.y*1.7)*1.8)*sin(q.y*2.1+sin(q.x*1.3)*1.5)+.25*sin(q.x*7.1+q.y*5.3);
float lt=smoothstep(.15,.45,uCalm)*smoothstep(1.,.75,uCalm);float gz=smoothstep(.02,.06,fld)*lt;N=normalize(mix(N,vec3(0.,1.,0.),gz*.8));}
float fr=.02+.98*pow(1.-max(dot(N,V),0.),5.);
vec2 uv=(vP.xz-uBox.xy)/uBox.zw;
float dep=texture2D(uDepth,uv).r*255./6.;
float sh=exp(-dep/3.);`;
// 水の色の重なり
const W_FS_COLOR = `// ── 水の色の重なり（上から順に塗り重ねる）──
// ① 沖と浅い水の基本色（PALETTE.waterDeep / waterShallow）　② 風の筋で暗く
// ③ 浅瀬：湖底が透ける（lakeBedSand/Light）　④ 浅瀬と沖の間の青緑（shoalTeal）　⑤ 浅瀬の光の網目
// ⑥ 深い所の青（waterOffshore）　⑦ 河口の濁り（riverSilt）
vec3 body=mix(uDeep,uShal,sh*.8);
// 湖面の色のまだら：場所ごとに青寄り・緑寄りに分かれる
{float pt=nzF4(vP0.xz*.0007+vec2(uT2*.002,0.));body*=mix(vec3(.93,1.05,.98),vec3(1.03,.98,1.05),smoothstep(.3,.7,pt));}
// 冬の曇りの日は、灰色がかった重い青
body=mix(body,body*vec3(.7,.76,.82)+vec3(.04,.045,.05),uLead*.9);
// 風の通り道：さざ波の立った暗い帯が風下へ流れる（静かな日ほど目立つ）
float cpw;{vec2 wd=normalize(uWd+1e-4);vec2 q=vP0.xz*.0016-wd*uT2*.014;cpw=smoothstep(.45,.85,(sin(q.x*3.1+sin(q.y*2.3)*1.4)*sin(q.y*2.7+sin(q.x*1.9)*1.3))*.5+.5)*(.35+.65*uCalm);body*=1.-cpw*.16;}
{vec2 wd=normalize(uWd+1e-4),wp=vec2(dot(vP0.xz,wd),dot(vP0.xz,vec2(-wd.y,wd.x)));
float ws=(1.-uCalm)*smoothstep(.45,.75,fract(sin(dot(floor(vec2(wp.x*.006-uT2*.05,wp.y*.03)),vec2(5.1,3.7)))*91.))*smoothstep(.2,.8,sin(wp.y*.045+sin(wp.x*.004)*3.)*.5+.5);
body*=1.-ws*.22;
}{float sb=smoothstep(4.,.4,dep);
vec3 bed=mix(${v3(PALETTE.lakeBedSand)},${v3(PALETTE.lakeBedLight)},fract(sin(dot(floor(vP0.xz*.08),vec2(4.7,1.9)))*77.)*.6);
body=mix(body,bed,sb*.5);
{vec2 cq=vP0.xz*.9;
float ca=abs(sin(cq.x+sin(cq.y*1.3+uT2*.9)*1.6+uT2*.6)*sin(cq.y*1.1+sin(cq.x*1.4-uT2*.7)*1.5-uT2*.5));
body+=vec3(.09,.1,.07)*pow(1.-ca,6.)*sb*clamp(uSun.y*3.,0.,1.)*smoothstep(150.,10.,dc);
}body=mix(body,${v3(PALETTE.shoalTeal)},smoothstep(12.,3.,dep)*(1.-sb)*.42);
}body=mix(body,${v3(PALETTE.waterOffshore)},smoothstep(10.,60.,dep)*.68);
float tb=0.;
for(int i=0;
i<16;
i++){vec2 d=vP.xz-uMouth[i].xy;
tb+=uMouth[i].w*exp(-dot(d,d)/(uMouth[i].z*uMouth[i].z));
}body=mix(body,${v3(PALETTE.riverSilt)},clamp(tb,0.,.85));`;
// 反射：空・太陽・月
const W_FS_REFLECT = `// ── 反射：空の色・太陽のきらめき・月の照り返し ──
vec3 R=reflect(-V,N);
float rs=max(dot(R,uSun),0.);
float mr=max(dot(R,uMoonD),0.)*step(.0,uMoonD.y);/* 月の映り込み（月が地平より上のときだけ） */
float msp=(.25+.75*(1.-abs(uMp2-.5)*2.))*(pow(mr,300.)*1.4+pow(mr,40.)*.12*step(.75,fract(sin(dot(floor(vP0.xz*4.),vec2(4.1,7.3))+uT2*1.5)*99.)))*smoothstep(.0,-.15,uSun.y);
float gh=fract(sin(dot(floor(vP0.xz*6.),vec2(4.1,7.3)))*99.);
float glit=step(.72,gh)*smoothstep(.45,.1,length(fract(vP0.xz*6.)-.5))*pow(.5+.5*sin(uT2*(2.+gh*3.)+gh*40.),4.)*pow(rs,14.)*5.5*smoothstep(900.,10.,dc)+step(.9,fract(sin(dot(floor(vP0.xz*1.5),vec2(7.7,3.1)))*91.))*pow(.5+.5*sin(uT2*3.+gh*20.),6.)*pow(rs,40.)*3.*smoothstep(2500.,200.,dc);
float sp=glit+msp+pow(rs,900.)*2.*smoothstep(500.,30.,dc)*(.6+.8*fract(sin(dot(floor(vP0.xz*3.),vec2(4.1,7.3))+uT2*2.)*99.))+pow(rs,60.)*.6*smoothstep(.35,0.,uSun.y)+pow(rs,60.)*.22+pow(rs,8.)*.05
+pow(rs,250.)*smoothstep(700.,3000.,dc)*1.6*step(.55,fract(sin(dot(floor(vP0.xz*.35),vec2(4.1,7.3))+floor(uT2*3.))*99.))*clamp(uSun.y*4.,0.,1.);
vec3 skyR=mix(uSky*1.12,uSky*.78,pow(clamp(R.y,0.,1.),.5))+vec3(1.,.6,.35)*exp(-max(R.y,0.)*12.)*smoothstep(.05,-.15,uSun.y)*.3+vec3(.8,.85,1.)*step(.996,fract(sin(dot(floor(R.xz/(R.y+.25)*300.),vec2(12.9,78.2)))*43758.5))*smoothstep(.05,-.15,uSun.y)*smoothstep(.05,.25,R.y)*.6+vec3(.02,.03,.05)*smoothstep(.05,-.1,uSun.y);
float lowR=smoothstep(.09,.0,R.y);
skyR+=vec3(.25,.16,.06)*lowR*smoothstep(.0,-.15,uSun.y)*.25*(.5+.5*sin(vP.x*.9+sin(vP.z*.3)*3.));
skyR*=1.+.1*(fract(sin(dot(floor((vP.xz+R.xz*200.)*.01),vec2(1.7,9.2)))*43.)-.5)*(1.-lowR);`;
// 建物のまわり
const W_FS_HOUSE = `// ── 建物のまわり：喫水の陰、波の斜面の陰影、建物の影、水際の泡 ──
float ub=length(vP.xz-uHouse.xy);
vec2 hso=uHouse.xy-normalize(uSun.xz+1e-4)*uHouse.z*.9/max(uSun.y,.25)*.6;
// 建物の影：日が低いほど長く伸びる（家から影の先までの線分への距離）
vec2 hsE=uHouse.xy-normalize(uSun.xz+1e-4)*uHouse.z*.55/max(uSun.y,${glf(LOOK.longShadowMinSun)});
float hs;{vec2 ab=hsE-uHouse.xy;float tt=clamp(dot(vP.xz-uHouse.xy,ab)/max(dot(ab,ab),1e-3),0.,1.);hs=smoothstep(uHouse.z*.8,uHouse.z*.3,length(vP.xz-uHouse.xy-ab*tt))*(1.-tt*.5);}
// 喫水の陰 × 波の斜面の陰影 × 建物の影 を一度に掛ける
body*=(1.-.38*smoothstep(uHouse.z*1.15,uHouse.z*.3,ub))*(.9+.22*clamp(dot(N,normalize(vec3(uSun.x,1.2,uSun.z))),0.,1.))*(1.-hs*.28*clamp(uSun.y*3.,0.,1.));
// 浅瀬では建物の影が湖底に落ち、水深の分だけ日の向こうへずれる
{float shal=smoothstep(5.,.3,dep);vec2 bo=hso-normalize(uSun.xz+1e-4)*dep*1.8/max(uSun.y,.3);float bsh=smoothstep(uHouse.z*1.1,uHouse.z*.35,length(vP.xz-bo));body*=1.-bsh*.38*shal*clamp(uSun.y*3.,0.,1.);}
{float msh=0.;vec2 sdir=normalize(uSun.xz+1e-4);float stp=55.*(1.+6.*(1.-clamp(uSun.y*4.,0.,1.)));for(int k=1;k<=10;k++){vec2 q=(vP.xz+sdir*float(k)*stp-uBox.xy)/uBox.zw;float d2=texture2D(uDepth,q).r;msh=max(msh,step(d2,.002)*(1.-float(k)/11.));}body*=1.-msh*.5*uLowSun;skyR*=1.-msh*.35*uLowSun;}
{float gp=smoothstep(.6,.72,.5+.5*sin((vP.x-uT2*5.)*.0024+sin(vP.z*.0019)*2.3)*sin((vP.z+uT2*2.5)*.0021+sin(vP.x*.0017)*1.9));body*=1.+gp*.85*uGap;skyR*=1.+gp*.55*uGap;}
float wlf=exp(-pow((ub-uHouse.z*.92)/(.6+uHouse.z*.05),2.))*(.55+.45*sin(atan(vP.z-uHouse.y,vP.x-uHouse.x)*9.+uT2*1.3))*(.5+.5*fract(sin(dot(floor(vP0.xz*3.),vec2(3.7,8.1)))*91.));
skyR=mix(skyR,vec3(.18,.26,.2),lowR*.65);
skyR*=1.-cpw*.3;
// 水面に映る雲：凪の日ほどはっきり
{vec2 cp=R.xz/(max(R.y,0.)+.08)*1.4+vec2(uT2*.004,uT2*.002);cp+=vec2(nzF4(cp*.35+1.3),nzF4(cp*.35+7.1))*1.1-.55;float clr=smoothstep(.5-uCl*.3,1.,nzF4(cp))*smoothstep(0.,.12,R.y);vec3 cc_=mix(mix(vec3(1.),uSky*1.3,.3),uSunC*1.15+vec3(.08,.05,.1),smoothstep(.35,.02,uSun.y))*(.35+.65*clamp(uSun.y*3.+.25,0.,1.));skyR=mix(skyR,cc_,clr*mix(${glf(LOOK.cloudReflect[0])},${glf(LOOK.cloudReflect[1])},uCalm));}`;
// 泡と波紋
const W_FS_FOAM = `// ── 泡：白波・岸の波打ち際・雨の波紋・遠くの白波 ──
float wfoam=smoothstep(.12,.8,wf)*(.35+.65*fract(sin(dot(floor(vP0.xz*5.),vec2(7.,3.)))*91.));
float foam=wfoam*.55+uFoam*smoothstep(.12,.3,1.-N.y)*.8+smoothstep(.06,.12,1.-N.y)*uFoam*.25;
float swn=sin(dot(vP0.xz,vec2(.6,.8))*.9-uT*1.4+sin(vP0.x*.21)*2.)*.5+.5;
float fn=.5+.5*sin(vP0.x*.9+sin(vP0.z*.7)*2.+uT*.7);
float shoreF=(.35+1.6*smoothstep(.0,.25,texture2D(uDepth,uv-normalize(uWd+1e-4)*25./uBox.zw).r*255./6.-dep)*(1.-uCalm))*smoothstep(.15,0.,dep)*smoothstep(.75,1.,swn)*(.4+.6*fn)*.7*(.35+uFoam*.6)*smoothstep(700.,30.,dc);
foam+=shoreF+smoothstep(.22,.04,dep)*smoothstep(.0,.04,dep)*.12*(.6+.4*sin(uT2*1.2+vP0.x*.4));
foam+=(1.-uCalm)*smoothstep(.3,1.,1.-uCalm)*step(.985,fract(sin(dot(floor(vec2(dot(vP0.xz,uWd)*.05-uT2*.08,dot(vP0.xz,vec2(-uWd.y,uWd.x))*.012)),vec2(4.3,9.1)))*733.))*smoothstep(250.,1200.,dc)*smoothstep(6000.,2500.,dc)*.7;
body=mix(body,vec3(.48,.56,.42),smoothstep(.5,0.,dep)*.3);
{vec2 sq=vP0.xz*1.6,si=floor(sq);
float sn=fract(sin(dot(si,vec2(7.1,3.9)))*91.),sd2=length(fract(sq)-.5);
float sandy=smoothstep(.4,.6,nzF4(vP0.xz*.0012+3.7));
vec3 stone=mix(mix(vec3(.55,.48,.36),vec3(.38,.36,.4),sn)*(1.-smoothstep(.3,.5,sd2)*.4),mix(vec3(.78,.72,.6),vec3(.84,.79,.68),sn),sandy);
body=mix(body,stone,smoothstep(.45,0.,dep)*.55);
}body*=1.-.15*smoothstep(.6,.1,dep);
body+=vec3(.05,.06,.04)*smoothstep(.4,0.,dep)*pow(abs(sin(vP0.x*1.7+uT2)*sin(vP0.z*1.9-uT2*.8)),3.)*clamp(uSun.y*3.,0.,1.);
float rr=0.;
{for(int k=0;
k<3;
k++){vec2 q=vP.xz*(1.1+float(k)*.7)+float(k)*7.3,ci=floor(q),cf=fract(q)-.5;
float h=fract(sin(dot(ci,vec2(12.9,78.2)))*43758.5),ph=fract(uT2*(.8+h*.6)+h*7.);
vec2 o=vec2(fract(h*13.)-.5,fract(h*29.)-.5)*.4;
float r=length(cf-o),rad=ph*.45;
rr+=smoothstep(.04,.0,abs(r-rad))*(1.-ph)*step(.35,h);
}rr*=uRainR*.55*smoothstep(160.,8.,length(cameraPosition-vP));
}foam+=wlf*.32;
foam+=rr;`;
// 明るさ
const W_FS_LIGHT = `// ── 明るさ：時刻、空の映り込み、浅瀬の濡れた石、遠くで空と溶ける ──
body*=.55+.6*clamp(uSun.y*2.+.1,0.,1.);
body+=uSky*.14;
float sss=pow(max(dot(V,-uSun+N*.5),0.),3.)*max(vP.y,0.)*.25;
body+=vec3(.1,.18,.12)*sss;
float graz=pow(1.-max(V.y,0.),3.);
N=normalize(mix(N,vec3(0.,1.,0.),graz*.3*smoothstep(60.,400.,dc)));
body=mix(body,body*vec3(.75,.85,.95),graz*.5);`;
// 山や建物の映り込み
const W_FS_MIRROR = `// ── 山や建物の映り込み（静かな日ほど鮮明に）──
vec4 tp=uTM*vec4(vP.x,uWy,vP.z,1.);
vec2 ruv=tp.xy/tp.w+N.xz*vec2(.04,.08)*(1.2-uCalm*.7)*(.35+.65*smoothstep(1400.,40.,dc));
vec4 rf=vec4(0.);
for(int k=-3;
k<=3;
k++)for(int j=-1;
j<=1;
j++)rf+=texture2D(uRefl,ruv+vec2(float(j)*.003,float(k)*.0018)*(1.-uCalm*.65));
rf/=21.;
// 夜の灯りの映り込み：明るい灯りほど水面に縦長の筋になって揺れる
{float nt=smoothstep(.0,-.12,uSun.y);if(nt>.01){vec3 sk=vec3(0.);for(int k=-8;k<=8;k++){vec4 s=texture2D(uRefl,ruv+vec2(sin(float(k)*1.7+uT2*2.)*.002*(1.-uCalm*.5),float(k)*.007));sk=max(sk,(s.rgb/max(s.a,.001))*s.a*(1.-abs(float(k))/9.));}rf.rgb+=max(sk-.35,0.)*1.4*nt*rf.a;}}
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
}`;
// 合成と仕上げ
const W_FS_FINISH = `// ── 合成：水の色と反射を混ぜ、灯り・花火・霧・遠景の霞を重ねる ──
 vec3 c=mix(body,skyR*mix(vec3(.9,.95,1.),vec3(1.05),graz),min(1.,fr*(1.05-uRainR*.3)+.03))+uSunC*sp+foam+uSunC*.04*pow(max(dot(-V,uSun),0.),2.);
float ws_=smoothstep(.6,1.,sin(dot(vP0.xz,vec2(.011,.017))+sin(vP0.x*.004)*3.)*.5+.5)*.04*(1.-smoothstep(300.,1500.,dc));
c+=ws_;
// 夜の湖面：月のない夜も、空の明るさをうっすら映す
c+=vec3(.02,.03,.055)*smoothstep(.0,-.15,uSun.y)*(.4+.6*pow(1.-max(V.y,0.),2.));
// 写真のような落ち着いた湖の色：鮮やかすぎる青緑を少し鎮める
c=mix(c,vec3(dot(c,vec3(.3,.59,.11)))*vec3(.92,.97,1.06),${glf(LOOK.waterCalmGrade)});
// 真昼の水面に流れる細かな光の網目
{vec2 cq=vP0.xz*.35;float ca=abs(sin(cq.x+sin(cq.y*1.3+uT2*.7)*1.6+uT2*.5)*sin(cq.y*1.1+sin(cq.x*1.4-uT2*.6)*1.5-uT2*.4));c+=uSunC*pow(1.-ca,10.)*.05*smoothstep(.45,.8,uSun.y)*smoothstep(250.,20.,dc)*(.4+.6*uCalm);}
c*=.97+.06*sin(vP.x*.002+sin(vP.z*.0017)*2.);
float csh=smoothstep(.35,.8,.5+.5*sin((vP.x+uT2*4.)*.0045+sin(vP.z*.0031)*2.)*sin((vP.z+uT2*2.)*.0038+sin(vP.x*.0027)*1.7));
c*=1.-csh*${glf(LOOK.cloudShadowWater)}*clamp(uSun.y*3.,0.,1.)*uCSh;
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
gl_FragColor=vec4(c,1.);`;
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
i++){float fi=float(i);float ra=.28*sin(p.x*.0017+fi*1.7)*sin(p.z*.0013+fi*2.3);vec2 d=mat2(cos(ra),-sin(ra),sin(ra),cos(ra))*uW[i].xy;
float k=uW[i].z,w=uW[i].w,A=uA[i].x*(.62+.38*sin(dot(p.xz,vec2(.0021,.0016))*(1.+fi*.7)+fi*2.)*sin(dot(p.xz,vec2(-.0014,.0023))*(1.+fi*.4)+fi)),Qs=uA[i].y/(k*A*3.+1e-4);
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
    fragmentShader: `${W_FS_HEAD}
void main(){
${W_FS_NORMAL}
${W_FS_COLOR}
${W_FS_REFLECT}
${W_FS_HOUSE}
${W_FS_FOAM}
${W_FS_LIGHT}
${W_FS_MIRROR}
${W_FS_FINISH}
}`,
  }),
);
water.frustumCulled = false;
scene.add(water);
