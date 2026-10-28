/* ---------- 山並み：地形図を参考にした作品用の地形（標高は実寸。表示は縮尺Sに合わせ、高さを1.5倍に強調） ---------- */
const VEX = 2.2,
  VFAR = 1.0;
const RIDGES = [
  // [始点lon,lat, 終点lon,lat, 高さm, 幅m]
  [135.84, 35.1, 135.99, 35.42, 900, 4500], // 比良山地
  [135.93, 35.5, 136.27, 35.62, 650, 5000], // 野坂山地（北）
  [136.33, 35.33, 136.43, 35.65, 950, 5000], // 伊吹山地
  [136.3, 34.85, 136.46, 35.28, 850, 4500], // 鈴鹿山脈
  [135.92, 34.9, 136.15, 34.92, 420, 5000], // 湖南の丘陵（信楽方面）
  [135.8, 34.95, 135.86, 35.08, 600, 3500],
]; // 比叡山・西の山
const PEAKS = [
  [135.876, 35.215, 1174, 3000],
  [136.416, 35.418, 1377, 3500],
  [136.42, 35.02, 1212, 3000],
  [135.834, 35.067, 848, 2200],
  [136.03, 35.03, 432, 900],
  [136.09, 35.14, 280, 800],
  [136.205, 35.215, 284, 900],
  [136.05, 35.165, 330, 1100],
];
function vnoise(x, y) {
  const h = (i, j) => {
    const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const i = Math.floor(x),
    j = Math.floor(y),
    u = x - i,
    v = y - j,
    f = (t) => t * t * (3 - 2 * t);
  return (
    (h(i, j) * (1 - f(u)) + h(i + 1, j) * f(u)) * (1 - f(v)) +
    (h(i, j + 1) * (1 - f(u)) + h(i + 1, j + 1) * f(u)) * f(v)
  );
}
const RG = RIDGES.map(([a, b, c, d, h, w]) => [...ll(a, b), ...ll(c, d), h, w]),
  PK = PEAKS.map(([a, b, h, w]) => [...ll(a, b), h, w]);
// 近江平野（湖東・湖南の平地）：ここでは稜線の山を消し、独立峰だけ残す
const PLAIN = [
  [136.33, 35.42],
  [136.3, 35.3],
  [136.27, 35.2],
  [136.25, 35.1],
  [136.2, 35.02],
  [136.12, 34.96],
  [136.02, 34.95],
  [135.93, 34.97],
  [135.92, 35.02],
  [135.96, 35.06],
  [136.05, 35.1],
  [136.12, 35.2],
  [136.2, 35.3],
  [136.24, 35.4],
  [136.26, 35.48],
].map((p) => ll(...p));
function plainK(x, y) {
  if (!inPoly(x, y, PLAIN)) return 0;
  let m = 1e12;
  for (let i = 0; i < PLAIN.length; i++) {
    const a = PLAIN[i],
      b = PLAIN[(i + 1) % PLAIN.length],
      dx = b[0] - a[0],
      dy = b[1] - a[1];
    let u = ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy);
    u = Math.max(0, Math.min(1, u));
    m = Math.min(m, Math.hypot(a[0] + u * dx - x, a[1] + u * dy - y));
  }
  return Math.min(1, m / 2500);
}
const RELIEF = __RELIEF__; // 国土地理院の陰影図から作った「山らしさ」の濃さ（湖の外形で位置を合わせた概略）
function relief(x, y) {
  const [b0, b1, b2, b3] = RELIEF.bx;
  let u = b0 + ((x - minX) / (maxX - minX)) * (b1 - b0),
    v = b2 + ((y - minY) / (maxY - minY)) * (b3 - b2);
  const uu = Math.max(0, Math.min(RELIEF.w - 1.001, u)),
    vv = Math.max(0, Math.min(RELIEF.h - 1.001, v)),
    out = Math.hypot(uu - u, vv - v);
  u = uu;
  v = vv;
  const i = Math.floor(u),
    j = Math.floor(v),
    f = u - i,
    g = v - j,
    D = RELIEF.d,
    W = RELIEF.w;
  return Math.min(
    1,
    ((D[j * W + i] * (1 - f) + D[j * W + i + 1] * f) * (1 - g) +
      (D[(j + 1) * W + i] * (1 - f) + D[(j + 1) * W + i + 1] * f) * g) /
      255 +
      out * 0.02,
  );
}
function landH(x, y) {
  const rv = relief(x, y);
  if (rv >= 0) {
    let p = 0;
    for (const [px, py, h, w] of PK) {
      const d = Math.hypot(x - px, y - py);
      p = Math.max(p, h * Math.exp(-(d * d) / (w * w)));
    }
    let rd = 0,
      amp = 1,
      f = 1 / 2200;
    for (let o = 0; o < 4; o++) {
      rd += amp * (1 - Math.abs(vnoise(x * f + o * 7.1, y * f - o * 3.3) * 2 - 1));
      amp *= 0.5;
      f *= 2.1;
    }
    const base = Math.pow(rv, 1.3) * 950 * (0.65 + (0.5 * rd) / 1.9);
    return 4 + Math.max(base, p * Math.min(1, rv * 3 + 0.3)) + 6 * vnoise(x / 3000, y / 3000);
  }
  let m = 0;
  for (const [x1, y1, x2, y2, h, w] of RG) {
    const dx = x2 - x1,
      dy = y2 - y1;
    let t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
    const e = t < 0 ? -t : t > 1 ? t - 1 : 0;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(x - (x1 + dx * t), y - (y1 + dy * t));
    m = Math.max(
      m,
      h * Math.exp(-(d * d) / (w * w)) * Math.exp(-e * e * 30) * (0.75 + 0.5 * vnoise(x / 3000, y / 3000)),
    );
  }
  for (const [px, py, h, w] of PK) {
    const d = Math.hypot(x - px, y - py);
    m = Math.max(m, h * Math.exp(-(d * d) / (w * w)));
  }
  const n = vnoise(x / 1500, y / 1500) * 0.6 + vnoise(x / 600, y / 600) * 0.4;
  m *= 0.8 + 0.4 * n;
  let rd = 0,
    amp = 1,
    f = 1 / 2200;
  for (let o = 0; o < 4; o++) {
    rd += amp * (1 - Math.abs(vnoise(x * f + o * 7.1, y * f - o * 3.3) * 2 - 1));
    amp *= 0.5;
    f *= 2.1;
  } // 尾根と谷のひだ
  m *= 0.7 + (0.45 * rd) / 1.9;
  const pk = plainK(x, y);
  if (pk > 0) {
    let p = 0;
    for (const [px, py, h, w] of PK) {
      const d = Math.hypot(x - px, y - py);
      p = Math.max(p, h * Math.exp(-(d * d) / (w * w)));
    }
    m = m * (1 - pk) + p * pk + pk * (6 + 8 * vnoise(x / 3000, y / 3000));
  }
  return 4 + m;
}
const TM = 26000,
  TW = QUALITY.terrain[0],
  TH = QUALITY.terrain[1],
  tx0 = minX - TM,
  ty0 = minY - TM,
  tdx = (maxX - minX + 2 * TM) / (TW - 1),
  tdy = (maxY - minY + 2 * TM) / (TH - 1);
const terrH = new Float32Array(TW * TH);
for (let j = 0; j < TH; j++)
  for (let i = 0; i < TW; i++) {
    const x = tx0 + i * tdx,
      y = ty0 + j * tdy;
    {
      const d = distShore(x, y);
      terrH[j * TW + i] = inLake(x, y)
        ? -14
        : 4 + 18 * (1 - Math.exp(-d / 450)) + landH(x, y) * Math.min(1, 0.15 + d / 2500);
    }
  }
for (let pass = 0; pass < 3; pass++) {
  const tmp = terrH.slice();
  for (let j = 1; j < TH - 1; j++)
    for (let i = 1; i < TW - 1; i++) {
      const k = j * TW + i;
      if (tmp[k] < 40) continue;
      let s = 0,
        w = 0;
      for (let b = -1; b <= 1; b++)
        for (let a = -1; a <= 1; a++) {
          const v = tmp[k + b * TW + a];
          if (v < 0) continue;
          const ww = a || b ? 1 : 2;
          s += v * ww;
          w += ww;
        }
      terrH[k] = s / w;
    }
}
const terrGeo_ = 0;
const terrGeo = new THREE.PlaneGeometry((TW - 1) * tdx * S, (TH - 1) * tdy * S, TW - 1, TH - 1).rotateX(
  -Math.PI / 2,
);
{
  const pos = terrGeo.attributes.position,
    col = new Float32Array(pos.count * 3);
  for (let k = 0; k < pos.count; k++) {
    const i = k % TW,
      j = Math.floor(k / TW),
      h = terrH[j * TW + i];
    pos.setY(k, h * S * VEX);
    const c =
      h < 0
        ? new THREE.Color(0x3d4a35)
        : h < 60
          ? new THREE.Color(0x6b7a52)
          : h < 400
            ? new THREE.Color(0x4c5f3c).lerp(new THREE.Color(0x3b4c33), (h - 60) / 340)
            : new THREE.Color(0x3b4c33).lerp(new THREE.Color(0x6a6a5e), Math.min(1, (h - 400) / 900));
    col.set([c.r, c.g, c.b], k * 3);
  }
  terrGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  terrGeo.computeVertexNormals();
}
const terrMat = new THREE.MeshLambertMaterial({ vertexColors: true });
terrMat.onBeforeCompile = (sh) => {
  sh.uniforms.uHaze = { value: new THREE.Color(0x9fb4c8) };
  sh.uniforms.uLow = { value: 0 };
  terrMat.userData.low = sh.uniforms.uLow;
  terrMat.userData.haze = sh.uniforms.uHaze;
  sh.uniforms.uSnow = { value: 0 };
  sh.uniforms.uSpr = { value: 0 };
  sh.uniforms.uCT = { value: 0 };
  sh.uniforms.uCSh = { value: 1 };
  sh.uniforms.uSunT = { value: new THREE.Vector3(0, 1, 0) };
  sh.uniforms.uSL = { value: 0 };
  sh.uniforms.uWin = { value: 0 };
  sh.uniforms.uAut = { value: 0 };
  terrMat.userData.sh = sh;
  sh.vertexShader = sh.vertexShader
    .replace("#include <common>", "#include <common>\nvarying float vH;varying vec2 vXZ;")
    .replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvH=position.y;vXZ=(modelMatrix*vec4(position,1.)).xz;",
    )
    .replace(
      "#include <fog_fragment>",
      "float hz=pow(smoothstep(${glf(LOOK.hazeNear)},${glf(LOOK.hazeFar)},length(cameraPosition.xz-vXZ)),.85)*1.25;hz=max(hz,uLow*.45*smoothstep(800.,5000.,length(cameraPosition.xz-vXZ)));gl_FragColor.rgb=mix(gl_FragColor.rgb,mix(uHaze*vec3(.85,.92,1.04),uHaze*vec3(.5,.56,.68),smoothstep(${glf(LOOK.farDarkFrom)},${glf(LOOK.farDarkTo)},length(cameraPosition.xz-vXZ))),hz*${glf(LOOK.hazeAmount)});\n#include <fog_fragment>",
    );
  sh.fragmentShader = sh.fragmentShader
    .replace(
      "#include <common>",
      "#include <common>\nvarying float vH;varying vec2 vXZ;uniform float uSnow;uniform float uSL;uniform float uSpr;uniform float uCT;uniform float uCSh;uniform vec3 uSunT;uniform float uWin;uniform float uAut;uniform vec3 uHaze;uniform float uLow;",
    )
    .replace(
      "#include <color_fragment>",
      `#include <color_fragment>
// ── 山肌の色の重なり ──
// 傾き → 岩肌 → 低地と浜 → 田の区画 → 森（杉林・樹冠・新緑と深緑）→ 紅葉 → 冬枯れと雪 → 霞・雲の影・山の縁の光
vec3 nrm=normalize(cross(dFdx(vec3(vXZ.x,vH,vXZ.y)),dFdy(vec3(vXZ.x,vH,vXZ.y))));
if(nrm.y<0.)nrm=-nrm;
vec3 nrmE=normalize(vec3(nrm.x*3.,nrm.y,nrm.z*3.));
float slope=1.-abs(nrm.y);
diffuseColor.rgb*=.78+.5*smoothstep(.0,.6,1.-slope)*.25+.12;
// 岩肌（急な斜面）
{float rn=fract(sin(dot(floor(vXZ*.08),vec2(5.3,1.9)))*91.);
vec3 rock=mix(vec3(.38,.37,.34),vec3(.55,.53,.49),rn)*(.85+.3*fract(sin(dot(floor(vXZ*.7),vec2(3.1,8.7)))*61.));
diffuseColor.rgb=mix(diffuseColor.rgb,rock,smoothstep(.42,.75,slope)*(.45+.4*rn)*smoothstep(10.,40.,vH));
}diffuseColor.rgb*=.5+.75*clamp(dot(nrmE,normalize(vec3(.55,.6,.4))),0.,1.);
float mic=.5+.5*sin(vXZ.x*3.1+sin(vXZ.y*2.7)*2.)*sin(vXZ.y*2.9+sin(vXZ.x*3.3));
mic=mix(mic,fract(sin(dot(floor(vXZ*9.),vec2(12.9,4.1)))*437.),.5);
diffuseColor.rgb*=.9+mic*.2*smoothstep(90.,8.,length(cameraPosition.xz-vXZ));
diffuseColor.rgb*=.85+.15*smoothstep(0.,40.,vH);
diffuseColor.rgb+=vec3(.08,.04,.0)*uLow*smoothstep(20.,120.,vH);
// 浜（砂・礫・岩）と水際の濡れた帯
float beach=1.-smoothstep(.85,1.0+.25*fract(sin(dot(floor(vXZ*.05),vec2(2.,9.)))*77.),vH);
diffuseColor.rgb*=1.-.25*(1.-smoothstep(.62,.8,vH));
diffuseColor.rgb*=1.-.28*smoothstep(1.05,.75,vH)*smoothstep(.45,.7,vH);
{vec2 bq=vXZ*.0035,bi=floor(bq),bf=fract(bq);
bf=bf*bf*(3.-2.*bf);
float b1=fract(sin(dot(bi,vec2(12.9,7.7)))*437.),b2=fract(sin(dot(bi+vec2(1,0),vec2(12.9,7.7)))*437.),b3=fract(sin(dot(bi+vec2(0,1),vec2(12.9,7.7)))*437.),b4=fract(sin(dot(bi+1.,vec2(12.9,7.7)))*437.);
float sk=mix(mix(b1,b2,bf.x),mix(b3,b4,bf.x),bf.y);
float pb=fract(sin(dot(floor(vXZ*2.2),vec2(3.1,9.7)))*917.);
vec3 sand=mix(vec3(.6,.57,.5),vec3(.88,.85,.76),smoothstep(.6,.9,vH)),grav=mix(vec3(.36,.35,.33),vec3(.58,.56,.52),pb),rock=mix(vec3(.24,.23,.22),vec3(.46,.44,.41),pb*pb);
vec3 bc=sk<.4?sand:sk<.7?mix(sand,grav,smoothstep(.4,.5,sk)):mix(grav,rock,smoothstep(.7,.8,sk));
diffuseColor.rgb=mix(diffuseColor.rgb,bc,beach*.88);
}vec2 pq=vXZ*.06,pi=floor(pq),pf=fract(pq);
pf=pf*pf*(3.-2.*pf);
float ha=fract(sin(dot(pi,vec2(17.1,31.7)))*4375.5),hb=fract(sin(dot(pi+vec2(1,0),vec2(17.1,31.7)))*4375.5),hc=fract(sin(dot(pi+vec2(0,1),vec2(17.1,31.7)))*4375.5),hd=fract(sin(dot(pi+1.,vec2(17.1,31.7)))*4375.5);
float pn=mix(mix(ha,hb,pf.x),mix(hc,hd,pf.x),pf.y);
float pn2=fract(sin(dot(floor(vXZ*.2),vec2(7.3,11.9)))*1531.7);
vec3 low=mix(vec3(.36,.45,.25),vec3(.5,.47,.32),pn);
{vec2 fq=vXZ*.25;
float fl=step(.08,fract(fq.x))*step(.08,fract(fq.y));
vec3 fc=mix(low,low*vec3(1.08,1.04,.9),step(.5,fract(sin(dot(floor(fq),vec2(3.3,7.7)))*91.)));
diffuseColor.rgb=mix(diffuseColor.rgb,mix(fc*.82,fc,fl)*(.9+pn2*.2),(1.-smoothstep(1.,6.,vH))*.75);
}diffuseColor.rgb*=.95+pn*.1;
vec2 cq=vXZ*.45,ci=floor(cq),cf=fract(cq);
cf=cf*cf*(3.-2.*cf);
float ca=fract(sin(dot(ci,vec2(12.7,47.3)))*2753.1),cb=fract(sin(dot(ci+vec2(1,0),vec2(12.7,47.3)))*2753.1),cc_=fract(sin(dot(ci+vec2(0,1),vec2(12.7,47.3)))*2753.1),cd=fract(sin(dot(ci+1.,vec2(12.7,47.3)))*2753.1);
float cn=mix(mix(ca,cb,cf.x),mix(cc_,cd,cf.x),cf.y);
// 森
float wood=smoothstep(1.2,3.,vH)*(1.-smoothstep(.75,.95,slope));
vec2 c2q=vXZ*1.3,c2i=floor(c2q),c2f=fract(c2q);
c2f=c2f*c2f*(3.-2.*c2f);
float h2a=fract(sin(dot(c2i,vec2(9.1,3.7)))*517.3),h2b=fract(sin(dot(c2i+vec2(1,0),vec2(9.1,3.7)))*517.3),h2c=fract(sin(dot(c2i+vec2(0,1),vec2(9.1,3.7)))*517.3),h2d=fract(sin(dot(c2i+1.,vec2(9.1,3.7)))*517.3);
float cn2=mix(mix(h2a,h2b,c2f.x),mix(h2c,h2d,c2f.x),c2f.y);
cn=mix(cn,cn2,.4);
{float cedar=smoothstep(.42,.78,pn*.6+cn2*.4)*smoothstep(15.,60.,vH);
vec3 wc=mix(vec3(.13,.21,.1),vec3(.3,.38,.18),cn*cn);
wc=mix(wc,vec3(.08,.13,.08)+vec3(.04,.05,.03)*cn,cedar*.6);
{vec2 cq=vXZ*.22,ci=floor(cq),cf=fract(cq)-.5;
cf+=vec2(fract(sin(dot(ci,vec2(1.7,9.2)))*91.),fract(sin(dot(ci,vec2(8.3,2.8)))*91.))*.5-.25;
float cr=1.-smoothstep(.15,.55,length(cf));
float lit=dot(normalize(vec3(cf.x,.6,cf.y)),normalize(vec3(.5,.7,.35)));
wc*=.82+.32*cr*(.6+.4*lit)*smoothstep(160.,20.,length(cameraPosition.xz-vXZ))+.08*(1.-smoothstep(160.,20.,length(cameraPosition.xz-vXZ)));
}wc=mix(wc,wc*vec3(1.3,1.38,1.)+vec3(.035,.045,.02),max(uSpr,0.)*.55*smoothstep(uSpr*1.2+.05,uSpr*1.2-.15,clamp(vH/${(700 * S * VEX).toFixed(2)},0.,1.)));
wc*=1.+min(uSpr,0.)*.18;
diffuseColor.rgb=mix(diffuseColor.rgb,wc,wood*.95);
diffuseColor.rgb*=1.+.25*wood*(dot(nrmE,normalize(vec3(.55,.6,.4)))-.45);
}diffuseColor.rgb*=1.-wood*.28*(1.-uSnow*.5*(1.-uSnow*smoothstep(90.,120.,vH)));
// 紅葉
vec2 aq=vXZ*.35,ai=floor(aq),af=fract(aq);
af=af*af*(3.-2.*af);
float a1=fract(sin(dot(ai,vec2(12.9,78.2)))*43758.5),a2=fract(sin(dot(ai+vec2(1,0),vec2(12.9,78.2)))*43758.5),a3=fract(sin(dot(ai+vec2(0,1),vec2(12.9,78.2)))*43758.5),a4=fract(sin(dot(ai+1.,vec2(12.9,78.2)))*43758.5);
float nz=mix(mix(a1,a2,af.x),mix(a3,a4,af.x),af.y);
diffuseColor.rgb=mix(diffuseColor.rgb,mix(mix(vec3(.62,.22,.07),vec3(.78,.5,.1),fract(nz*7.)),vec3(.55,.12,.06),step(.85,fract(nz*13.))),uAut*.85*smoothstep(.45,.62,nz)*smoothstep(${(20 * S * VEX).toFixed(2)},${(120 * S * VEX).toFixed(2)},vH)*smoothstep(1.-uAut*1.1,1.15-uAut*1.1,1.-clamp(vH/${(700 * S * VEX).toFixed(2)},0.,1.)+(dot(nrmE,normalize(vec3(.55,.6,.4)))-.5)*.25));
// 冬枯れと雪
diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.05,.92,.75),uWin);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.9,.92,.94)*(.85+.15*mic),uSL*(1.-smoothstep(.55,.9,slope))*smoothstep(.3,1.2,vH));
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.93,.94,.96),uSnow*smoothstep(${(600 * S * VEX).toFixed(2)},${(800 * S * VEX).toFixed(2)},vH+(fract(sin(dot(floor(vXZ*.6),vec2(3.,7.)))*91.)-.5)*${(120 * S * VEX).toFixed(2)}));
// 遠くの霞、雲の影、朝夕の山の縁の光
{float dc_=length(cameraPosition.xz-vXZ);
float hz=1.-exp(-dc_/3800.);
hz*=(.55+.45*smoothstep(5.,160.,vH));
{float cs=smoothstep(.35,.8,.5+.5*sin((vXZ.x+uCT*4.)*.0045+sin(vXZ.y*.0031)*2.)*sin((vXZ.y+uCT*2.)*.0038+sin(vXZ.x*.0027)*1.7));
diffuseColor.rgb*=(1.-cs*${glf(LOOK.cloudShadowLand)}*uCSh*clamp(uSunT.y*3.,0.,1.))*(1.+(1.-cs)*${glf(LOOK.sunlitBoost)}*uCSh*clamp(uSunT.y*3.,0.,1.));
float low=smoothstep(.22,.02,uSunT.y)*smoothstep(-.1,.02,uSunT.y);
vec2 sd2=normalize(uSunT.xz+1e-4);
float face=pow(max(dot(normalize(nrm.xz+1e-4),sd2),0.),2.)*smoothstep(.05,.5,1.-nrm.y);
diffuseColor.rgb+=vec3(1.,.55,.3)*face*low*smoothstep(40.,180.,vH)*.35;
}diffuseColor.rgb=mix(diffuseColor.rgb,uHaze*1.1,clamp(hz,0.,1.)*.85);
diffuseColor.rgb*=1.+.12*hz;
}`,
    );
};
const terr = new THREE.Mesh(terrGeo, terrMat);
terr.receiveShadow = true;
terr.position.set((tx0 + ((TW - 1) * tdx) / 2) * S, 0, (ty0 + ((TH - 1) * tdy) / 2) * S);
scene.add(terr);
const FOREST_TINT = SEASON.forestTint;
const SNOW = SEASON.snowPeak;
// 遠景用の等高線（陸）
const landContours = (() => {
  const out = [];
  for (const lv of [150, 400, 700, 1000]) {
    const P = [];
    for (let j = 0; j < TH - 1; j++)
      for (let i = 0; i < TW - 1; i++) {
        const a = terrH[j * TW + i],
          b = terrH[j * TW + i + 1],
          c = terrH[(j + 1) * TW + i + 1],
          d = terrH[(j + 1) * TW + i];
        const idx = (a > lv) | ((b > lv) << 1) | ((c > lv) << 2) | ((d > lv) << 3);
        if (!idx || idx === 15) continue;
        const x = tx0 + i * tdx,
          y = ty0 + j * tdy,
          L = (p, q) => (lv - p) / (q - p || 1);
        const e = [
            [x + L(a, b) * tdx, y],
            [x + tdx, y + L(b, c) * tdy],
            [x + L(d, c) * tdx, y + tdy],
            [x, y + L(a, d) * tdy],
          ],
          ed = [];
        if ((idx & 1) !== ((idx >> 1) & 1)) ed.push(e[0]);
        if (((idx >> 1) & 1) !== ((idx >> 2) & 1)) ed.push(e[1]);
        if (((idx >> 2) & 1) !== ((idx >> 3) & 1)) ed.push(e[2]);
        if (((idx >> 3) & 1) !== (idx & 1)) ed.push(e[3]);
        for (let k = 0; k + 1 < ed.length; k += 2) P.push(ed[k], ed[k + 1]);
      }
    out.push(P);
  }
  return out;
})();

// 島：竹生島・沖島・多景島などを丘として立てる（島の輪郭の中で、岸からの距離に応じて高くする）
const ISLE_H = [
  [136.145, 35.42, 197],
  [136.065, 35.205, 220],
  [136.205, 35.293, 40],
].map(([a, b, h]) => [...ll(a, b), h]);
const ISLES = [];
// 沖島の南西側の集落：岸から約100mは低く平らな土地にして、その奥から山になる
const OKI = ll(136.065, 35.205);
let OKI_BOX = null;
const okiZone = (x, y) => {
  if (!OKI_BOX) return false;
  const [a, b, c, d] = OKI_BOX;
  return x > a - 300 && x < a + (c - a) * 0.58 && y > (b + d) / 2 - (d - b) * 0.05 && y < d + 300;
};
function isleShape(I, x, y, dd) {
  let h = 0.6 + I.top * S * VEX * Math.pow(dd / I.md, 0.6);
  const [a, b, c, d] = I.box;
  if (Math.hypot((a + c) / 2 - OKI[0], (b + d) / 2 - OKI[1]) < 2500) OKI_BOX = I.box;
  if (OKI_BOX === I.box && okiZone(x, y)) {
    const flat = 1.3 + Math.max(0, dd - 30) * 0.004;
    h = Math.min(h, flat + Math.max(0, h - flat) * Math.min(1, Math.max(0, (dd - 110) / 120)) ** 1.5);
  }
  return h;
}
for (const h of islands) {
  let a = 1e9,
    b = 1e9,
    c = -1e9,
    d = -1e9;
  for (const [x, y] of h) {
    a = Math.min(a, x);
    b = Math.min(b, y);
    c = Math.max(c, x);
    d = Math.max(d, y);
  }
  const cx = (a + c) / 2,
    cy = (b + d) / 2,
    top = (ISLE_H.find(([x, y]) => Math.hypot(x - cx, y - cy) < 2500) || [
      0,
      0,
      Math.min(60, Math.sqrt((c - a) * (d - b)) * 0.08),
    ])[2];
  const n = 110,
    geo = new THREE.PlaneGeometry((c - a) * S, (d - b) * S, n, n).rotateX(-Math.PI / 2),
    pos = geo.attributes.position;
  const segI = [];
  for (let i = 0; i < h.length - 1; i++) segI.push(h[i], h[i + 1]);
  let md = 1;
  const ds = [];
  for (let k = 0; k < pos.count; k++) {
    const x = cx + pos.getX(k) / S,
      y = cy + pos.getZ(k) / S;
    let dd = -1;
    if (inPoly(x, y, h)) {
      dd = 1e12;
      for (let i = 0; i < segI.length; i += 2) {
        const p = segI[i],
          q = segI[i + 1],
          dx = q[0] - p[0],
          dy = q[1] - p[1];
        let u = ((x - p[0]) * dx + (y - p[1]) * dy) / (dx * dx + dy * dy || 1);
        u = Math.max(0, Math.min(1, u));
        dd = Math.min(dd, Math.hypot(p[0] + u * dx - x, p[1] + u * dy - y));
      }
      md = Math.max(md, dd);
    }
    ds.push(dd);
  }
  ISLES.push({ h, top, md, box: [a, b, c, d] });
  for (let k = 0; k < pos.count; k++)
    pos.setY(k, ds[k] < 0 ? -3 : isleShape(ISLES[ISLES.length - 1], cx + pos.getX(k) / S, cy + pos.getZ(k) / S, ds[k]));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x4a6a3a }));
  m.position.set(cx * S, 0, cy * S);
  scene.add(m);
}

// 島の地面の高さ（作品内の高さ。島の外は null）
function isleH(x, y) {
  for (const I of ISLES) {
    const [a, b, c, d] = I.box;
    if (x < a || x > c || y < b || y > d || !inPoly(x, y, I.h)) continue;
    let dd = 1e12;
    for (let i = 0; i < I.h.length - 1; i++) {
      const p = I.h[i],
        q = I.h[i + 1],
        dx = q[0] - p[0],
        dy = q[1] - p[1];
      let u = ((x - p[0]) * dx + (y - p[1]) * dy) / (dx * dx + dy * dy || 1);
      u = Math.max(0, Math.min(1, u));
      dd = Math.min(dd, Math.hypot(p[0] + u * dx - x, p[1] + u * dy - y));
    }
    return isleShape(I, x, y, dd);
  }
  return null;
}
// ヨシ（指定区域の近くの、浅い岸だけに立てる）
const REED_SITES = [
  [136.235, 35.465, 2500],
  [136.07, 35.345, 2200],
  [135.995, 35.065, 1500],
  [136.03, 35.405, 1500],
  [136.045, 35.3, 1500],
  [136.215, 35.43, 1500],
  [136.205, 35.235, 1500],
  [136.1, 35.15, 1500],
  [135.97, 35.1, 1200],
  [135.935, 35.025, 1500],
  [135.93, 35.115, 1000],
].map(([lo, la, r]) => [...ll(lo, la), r]);
const reedPts = [];
{
  const R = rnd(3);
  const o = outer;
  for (const [cx, cy, r] of REED_SITES)
    for (let i = 0; i < o.length - 1; i++) {
      const a = o[i],
        b = o[i + 1];
      if (Math.hypot(a[0] - cx, a[1] - cy) > r + 2000) continue;
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]),
        nx = -(b[1] - a[1]) / L,
        ny = (b[0] - a[0]) / L;
      for (let s = 0; s < L; s += 25) {
        const px = a[0] + ((b[0] - a[0]) * s) / L,
          py = a[1] + ((b[1] - a[1]) * s) / L;
        if (Math.hypot(px - cx, py - cy) > r + 1500) continue;
        for (let n = 0; n < 3; n++) {
          const q = 20 + R() * 260,
            sg = inLake(px + nx * 60, py + ny * 60) ? 1 : -1,
            x = px + nx * q * sg + (R() - 0.5) * 20,
            y = py + ny * q * sg + (R() - 0.5) * 20;
          if (inLake(x, y) && depth(x, y) < 4) reedPts.push([x, y]);
        }
      }
    }
}
// ヨシ：茎・葉・穂を描いた板を十字に組み、密な群落にする。背丈は3〜4m、風になびく
function reedTex(kind) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 512;
  const g = c.getContext("2d");
  const R = rnd(kind.length * 31 + 7);
  const P = {
    summer: { stem: "#55703c", leaf: "#6b8746", plume: null, h: 1 },
    spring: { stem: "#7fa257", leaf: "#94b866", plume: null, h: 0.55 },
    autumn: { stem: "#a98d55", leaf: "#94864a", plume: "#8a6a52", h: 1 },
    winter: { stem: "#c8a868", leaf: null, plume: "#d8c49a", h: 1 },
    cut: { stem: "#c4ad80", leaf: null, plume: null, h: 0.2 },
    burnt: { stem: "#6a5a48", leaf: null, plume: null, h: 0.14 },
  }[kind];
  // 刈り跡・焼け跡は短い株を密に並べ、点々ではなく淡い帯に見せる
  const NS = P.h < 0.3 ? 320 : 90;
  for (let i = 0; i < NS; i++) {
    const u_ = R(),
      x = 4 + u_ * 248,
      top = 512 - (300 + R() * 200) * P.h,
      bend = (R() - 0.5) * 30;
    g.strokeStyle = P.stem;
    g.lineWidth = 1.1 + R() * 1.2;
    g.beginPath();
    g.moveTo(x, 512);
    g.quadraticCurveTo(x + bend * 0.3, (512 + top) / 2, x + bend, top);
    g.stroke();
    if (P.leaf)
      for (let k = 0; k < 5; k++) {
        const y = 512 - (512 - top) * (0.2 + R() * 0.7),
          xx = x + bend * ((512 - y) / (512 - top)) ** 2,
          d = R() < 0.5 ? -1 : 1;
        g.strokeStyle = P.leaf;
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(xx, y);
        g.quadraticCurveTo(xx + d * 22, y - 6, xx + d * 44, y + 12 + R() * 14);
        g.stroke();
      }
    if (P.plume) {
      g.fillStyle = P.plume;
      g.save();
      g.translate(x + bend, top);
      g.rotate(bend * 0.012);
      g.beginPath();
      g.ellipse(4, 8, 6, 26, 0, 0, 7);
      g.fill();
      g.restore();
    }
  }
  if (P.h >= 0.3) {
    g.globalCompositeOperation = "source-atop";
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, "rgba(255,255,230,.12)");
    gr.addColorStop(0.6, "rgba(0,0,0,0)");
    gr.addColorStop(1, "rgba(20,25,10,.55)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 512);
    g.globalCompositeOperation = "source-over";
  }
  const tx = new THREE.CanvasTexture(c);
  tx.colorSpace = THREE.SRGBColorSpace;
  tx.anisotropy = 4;
  return tx;
}
const REED_TEX = {};
for (const k of ["summer", "spring", "autumn", "winter", "cut", "burnt"]) REED_TEX[k] = reedTex(k);
const REED_MONTH = [
  "cut",
  "cut",
  "burnt",
  "spring",
  "spring",
  "summer",
  "summer",
  "summer",
  "autumn",
  "autumn",
  "winter",
  "winter",
];
function reedGeom() {
  const a = new THREE.PlaneGeometry(3.4, 4.2).translate(0, 2.1, 0),
    b = a.clone().rotateY(Math.PI / 2),
    pos = [...a.attributes.position.array, ...b.attributes.position.array],
    uv = [...a.attributes.uv.array, ...b.attributes.uv.array],
    nrm = [...a.attributes.normal.array, ...b.attributes.normal.array],
    idx = [...a.index.array, ...[...b.index.array].map((i) => i + 4)];
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3).clone());
  g.setIndex(idx);
  const n = g.attributes.normal;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  return g;
} // 上向きの法線で、板の向きによる明暗の差をなくす
const reedU = { uT: { value: 0 }, uW: { value: new THREE.Vector2(1, 0) } };
function reedMat() {
  const m = new THREE.MeshBasicMaterial({
    map: REED_TEX.summer,
    alphaTest: 0.45,
    side: THREE.DoubleSide,
    fog: true,
  });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = reedU.uT;
    sh.uniforms.uW = reedU.uW;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uT;uniform vec2 uW;")
      .replace(
        "#include <project_vertex>",
        "vec4 wp=modelMatrix*instanceMatrix*vec4(transformed,1.);float hh=clamp(transformed.y/4.2,0.,1.);float sw=(.35+.65*sin(uT*1.6+wp.x*.35+wp.z*.27)+.3*sin(uT*.6+dot(wp.xz,normalize(uW+1e-4))*.08))*hh*hh;wp.xz+=uW*sw;vec4 mvPosition=viewMatrix*wp;gl_Position=projectionMatrix*mvPosition;",
      );
  };
  return m;
}
const reedGeo = reedGeom();
const reeds = new THREE.InstancedMesh(reedGeo, reedMat(), reedPts.length * 6);
{
  const m = new THREE.Matrix4(),
    R = rnd(9);
  let i = 0;
  for (const [x, y] of reedPts)
    for (let k = 0; k < 6; k++) {
      const s = (0.6 + R() * 0.7) * (0.8 + 0.4 * vnoise(x / 700, y / 700));
      m.makeRotationY(R() * 3.14).premultiply(new THREE.Matrix4().makeScale(s, s * (0.85 + R() * 0.3), s));
      m.setPosition(x * S + (R() - 0.5) * 24, 0, y * S + (R() - 0.5) * 24);
      reeds.setMatrixAt(i++, m);
    }
  reeds.count = i;
}

// 内湖の水面（陸より少し上の静かな面）とまわりのヨシ
const INNER_Y = 0.63;
const innerMat = new THREE.MeshBasicMaterial({ color: 0x3f6152, side: THREE.DoubleSide });
G.innerMeshes = [];
for (const p of [...innerPolys, ...innerChan]) {
  const m = new THREE.Mesh(
    new THREE.ShapeGeometry(new THREE.Shape(p.map(([x, y]) => new THREE.Vector2(x * S, -y * S))), 4).rotateX(
      -Math.PI / 2,
    ),
    water.material,
  );
  m.frustumCulled = false;
  m.position.y = INNER_Y;
  scene.add(m);
  G.innerMeshes.push(m);
}
const innerReedPts = [];
{
  const R = rnd(77);
  innerPolys.forEach((p, pi) => {
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i],
        b = p[i + 1],
        L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (let s = 0; s < L; s += 12) {
        const x = a[0] + ((b[0] - a[0]) * s) / L + (R() - 0.5) * 60,
          y = a[1] + ((b[1] - a[1]) * s) / L + (R() - 0.5) * 60;
        if (!innerChan.some((c) => inPoly(x, y, c))) innerReedPts.push([x, y]);
      }
    }
  });
}
const innerReeds = new THREE.InstancedMesh(reedGeo, reedMat(), innerReedPts.length * 2);
{
  const m = new THREE.Matrix4(),
    R = rnd(5);
  let i = 0;
  for (const [x, y] of innerReedPts)
    for (let k = 0; k < 2; k++) {
      const s = 0.75 + R() * 0.5;
      m.makeRotationY(R() * 3.14).premultiply(new THREE.Matrix4().makeScale(s, s, s));
      m.setPosition(x * S + (R() - 0.5) * 6, INNER_Y, y * S + (R() - 0.5) * 6);
      innerReeds.setMatrixAt(i++, m);
    }
  innerReeds.count = i;
}
scene.add(innerReeds);
// 遠景の線画とヨシ帯の判定にも加える
scene.add(reeds);
