/* ---------- 山並み：国土地理院の標高タイルから作った実際の地形（標高は実寸。表示は縮尺Sに合わせ、高さを2.2倍に強調） ---------- */
const VEX = 2.2,
  VFAR = 1.0;
// 主な山頂（全体地図の山の印）
const PEAKS = [
  [135.8858, 35.2096, 1174, 3000], // 蓬莱山（比良山地。山頂の位置は地理院の注記から）
  [136.4061, 35.4193, 1377, 3500], // 伊吹山
  [136.42, 35.02, 1212, 3000], // 御在所岳（鈴鹿山脈）
  [135.834, 35.067, 848, 2200], // 比叡山
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
const PK = PEAKS.map(([a, b, h, w]) => [...ll(a, b), h, w]);
// 標高の格子（tools/dem.py）：作品の座標で200m間隔、湖面からの高さ。1マス1バイトで h = top·(v/255)²
const DEM = __DEM__;
const DEM_D = Uint8Array.from(atob(DEM.d || ""), (c) => c.charCodeAt(0));
function landH(x, y) {
  const u = Math.max(0, Math.min(DEM.w - 1.001, (x - DEM.x0) / DEM.step)),
    v = Math.max(0, Math.min(DEM.h - 1.001, (y - DEM.y0) / DEM.step)),
    i = Math.floor(u),
    j = Math.floor(v),
    f = u - i,
    g = v - j,
    W = DEM.w,
    q = (k) => (DEM_D[k] / 255) ** 2;
  return (
    DEM.top *
    ((q(j * W + i) * (1 - f) + q(j * W + i + 1) * f) * (1 - g) +
      (q((j + 1) * W + i) * (1 - f) + q((j + 1) * W + i + 1) * f) * g)
  );
}
const TM = 26000,
  TW = QUALITY.terrain[0],
  TH = QUALITY.terrain[1],
  tx0 = minX - TM,
  ty0 = minY - TM,
  tdx = (maxX - minX + 2 * TM) / (TW - 1),
  tdy = (maxY - minY + 2 * TM) / (TH - 1);
// 地面の高さ（実寸m、湖面から）：標高 lh に、岸の形を重ねる。岸はなだらかに：陸は水際で低く（浜）、内へゆっくり上がる。
// 湖は岸から少しずつ深くなる。岸から3kmより遠くでは値が変わらないので、岸までの距離はそこで打ち切る
// 高さ＝岸の形 A ＋ 標高 × 岸からの効き B（B は水際で小さく、岸から800mで1）。B は細かい地形（下の NEAR）にも使う
let terrShapeB = 0;
function terrShape(x, y, lh) {
  const d = distShore(x, y, 3000),
    sm = Math.min(1, d / 300),
    rise = sm * sm * (3 - 2 * sm);
  if (inLake(x, y)) {
    terrShapeB = 0;
    return -Math.min(14, 1 + d * 0.06);
  }
  terrShapeB = Math.min(1, 0.15 * rise + d / 800);
  return 1.6 + 2.4 * rise + 6 * (1 - Math.exp(-d / 450)) + lh * terrShapeB;
}
const terrH = new Float32Array(TW * TH),
  terrB = new Float32Array(TW * TH);
for (let j = 0; j < TH; j++)
  for (let i = 0; i < TW; i++) {
    const x = tx0 + i * tdx,
      y = ty0 + j * tdy;
    terrH[j * TW + i] = terrShape(x, y, landH(x, y));
    terrB[j * TW + i] = terrShapeB;
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
// 岸近くの細かい地形（tools/near.py → data/near.json）：30m間隔で、200mの標高との差を4ビットで持つ。
// 高さは「粗い地形の高さ＋差×岸からの効き」。家や木の置き場所（terrainAt）と、カメラのまわりの細かい網目（下の nearPatch）で使う
const NEAR = __NEAR__;
const nearBlk = new Map();
{
  if (NEAR && NEAR.idx) {
    const ix = Uint8Array.from(atob(NEAR.idx), (c) => c.charCodeAt(0)),
      dv = new DataView(ix.buffer),
      d = Uint8Array.from(atob(NEAR.d), (c) => c.charCodeAt(0)),
      per = (NEAR.bs * NEAR.bs) / 2;
    for (let k = 0; k < ix.length / 4; k++) nearBlk.set(dv.getUint16(k * 4, true) * 65536 + dv.getUint16(k * 4 + 2, true), d.subarray(k * per, (k + 1) * per));
  }
}
// 細かい網目の点 (gi, gj) の差（m）。区画がない所は null
function nearRes(gi, gj) {
  const bs = NEAR.bs,
    b = nearBlk.get(Math.floor(gi / bs) * 65536 + Math.floor(gj / bs));
  if (!b) return null;
  const k = (gj % bs) * bs + (gi % bs),
    v = k & 1 ? b[k >> 1] & 15 : b[k >> 1] >> 4;
  return NEAR.lv[v];
}
// 粗い地形の高さ（実寸m、湖は負）と、岸からの効き B の補間
function terrGrid(x, y, arr = terrH) {
  const i = Math.max(0, Math.min(TW - 1.001, (x - tx0) / tdx)),
    j = Math.max(0, Math.min(TH - 1.001, (y - ty0) / tdy)),
    i0 = Math.floor(i),
    j0 = Math.floor(j),
    u = i - i0,
    v = j - j0,
    g = (a, b) => arr[b * TW + a];
  return (g(i0, j0) * (1 - u) + g(i0 + 1, j0) * u) * (1 - v) + (g(i0, j0 + 1) * (1 - u) + g(i0 + 1, j0 + 1) * u) * v;
}
// 細かい地形の高さ（実寸m）。細かい区画の外は null
function nearAt(x, y) {
  if (!nearBlk.size) return null;
  const u = (x - NEAR.x0) / NEAR.step,
    v = (y - NEAR.y0) / NEAR.step,
    i = Math.floor(u),
    j = Math.floor(v),
    a = nearRes(i, j),
    b = nearRes(i + 1, j),
    c = nearRes(i, j + 1),
    e = nearRes(i + 1, j + 1);
  if (a === null || b === null || c === null || e === null) return null;
  const f = u - i,
    g = v - j,
    res = (a * (1 - f) + b * f) * (1 - g) + (c * (1 - f) + e * f) * g;
  return terrGrid(x, y) + res * terrGrid(x, y, terrB);
}
const terrGeo_ = 0;
// 地形の頂点の色（高さ h は実寸m）
const terrColor = (h) =>
  h < 0
    ? new THREE.Color(0x3d4a35)
    : h < 60
      ? new THREE.Color(0x6b7a52)
      : h < 400
        ? new THREE.Color(0x4c5f3c).lerp(new THREE.Color(0x3b4c33), (h - 60) / 340)
        : new THREE.Color(0x3b4c33).lerp(new THREE.Color(0x6a6a5e), Math.min(1, (h - 400) / 900));
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
    const c = terrColor(h);
    col.set([c.r, c.g, c.b], k * 3);
  }
  terrGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  // 尾根と谷：まわりより高い所（尾根）は明るく、低い所（谷）は暗く。2つの広さで見て、大きな山ひだと小さな沢の両方を拾う
  const cv = new Float32Array(pos.count),
    at = (i, j) => Math.max(0, terrH[Math.min(TH - 1, Math.max(0, j)) * TW + Math.min(TW - 1, Math.max(0, i))]);
  for (let k = 0; k < pos.count; k++) {
    const i = k % TW,
      j = Math.floor(k / TW),
      h = at(i, j);
    if (h <= 0) continue;
    let v = 0;
    for (const r of [1, 3]) v += (h - (at(i - r, j) + at(i + r, j) + at(i, j - r) + at(i, j + r)) / 4) / (r === 1 ? 5 : 15);
    cv[k] = Math.max(-1, Math.min(1, v));
  }
  terrGeo.setAttribute("aCv", new THREE.BufferAttribute(cv, 1));
  terrGeo.computeVertexNormals();
}
/* 山肌の色（地形のフラグメントに差し込む）：処理の順に区切った部品。上から順につながる。 */
// 傾きによる明暗
const TERR_FS_SLOPE = `// カメラのまわりの細かい網目（nearPatch）がある所では、粗い地形を描かない（vNear：0 粗い地形・1 細かい網目・2 島）
if(vNear<.5&&uNear.w>.5&&abs(vXZ.x-uNear.x)<uNear.z&&abs(vXZ.y-uNear.y)<uNear.z)discard;
// ── 山肌の色の重なり ──
// 傾き → 岩肌 → 低地と浜 → 田の区画 → 森（杉林・樹冠・新緑と深緑）→ 紅葉 → 冬枯れと雪 → 霞・雲の影・山の縁の光
vec3 nrm=normalize(cross(dFdx(vec3(vXZ.x,vH,vXZ.y)),dFdy(vec3(vXZ.x,vH,vXZ.y))));
if(nrm.y<0.)nrm=-nrm;
// 山ひだの細部：標高データ（200m間隔）より細かい沢を、斜面の落ちる向きに伸びた筋として描く（実寸で幅約700m・300m・140mの3段）。
// 沢の底ほど暗く（rocc）、平地には付けず、遠くて細かすぎる所（ちらつく距離）では消す
vec3 wn=normalize(vWN); // 頂点の間でなめらかにつないだ向き（三角形ごとの向きを使うと、筋が三角形の境で途切れる）
float rocc=0.,rmt=smoothstep(20.,80.,vH)*smoothstep(.12,.45,length(wn.xz)); // 傾きが約7°〜27°（高さの強調込み）で効き始める
if(rmt>0.){float fw=length(fwidth(vXZ));vec2 dn=normalize(wn.xz+1e-4),pp=vec2(-dn.y,dn.x);
 for(int o=0;o<3;o++){float sc=o==0?.0071:o==1?.0167:.036,w=o==0?.5:o==1?.32:.22; // 作品の1単位は実寸5m
  float fd=1.-smoothstep(.12,.4,fw*sc);
  vec2 q=vec2(dot(vXZ,pp)*sc,dot(vXZ,dn)*sc*.3)+float(o)*17.3+nzN(vXZ*sc*.5)*.8;
  rocc+=(1.-smoothstep(0.,.45,abs(nzN(q)*2.-1.)))*w*fd*smoothstep(.25,.75,nzN(q*vec2(.45,.6)+5.3));} // 沢ごとに深さを変えて、櫛の目のような並びを崩す
 rocc*=rmt;}
vec3 nrmE=normalize(vec3(nrm.x*3.,nrm.y,nrm.z*3.));
float slope=1.-abs(nrm.y);
diffuseColor.rgb*=.78+.5*smoothstep(.0,.6,1.-slope)*.25+.12;
`;
// 岩肌（急な斜面）
const TERR_FS_ROCK = `// 岩肌（急な斜面）
{float rn=fract(sin(dot(floor(vXZ*.08),vec2(5.3,1.9)))*91.);
vec3 rock=mix(vec3(.38,.37,.34),vec3(.55,.53,.49),rn)*(.85+.3*fract(sin(dot(floor(vXZ*.7),vec2(3.1,8.7)))*61.));
diffuseColor.rgb=mix(diffuseColor.rgb,rock,smoothstep(.42,.75,slope)*(.45+.4*rn)*smoothstep(10.,40.,vH));
}diffuseColor.rgb*=.5+.75*clamp(dot(nrmE,normalize(vec3(.55,.6,.4))),0.,1.);
float mic=.5+.5*sin(vXZ.x*3.1+sin(vXZ.y*2.7)*2.)*sin(vXZ.y*2.9+sin(vXZ.x*3.3));
mic=mix(mic,fract(sin(dot(floor(vXZ*9.),vec2(12.9,4.1)))*437.),.5);
diffuseColor.rgb*=.9+mic*.2*smoothstep(90.,8.,length(cameraPosition.xz-vXZ));
diffuseColor.rgb*=.85+.15*smoothstep(0.,40.,vH);
diffuseColor.rgb+=vec3(.08,.04,.0)*uLow*smoothstep(20.,120.,vH);
`;
// 浜（砂・礫・岩）と水際の濡れた帯
const TERR_FS_SHORE = `// 浜（砂・礫・岩）と水際の濡れた帯
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
`;
// 森（杉林・樹冠・新緑と深緑）
const TERR_FS_FOREST = `// 森
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
// 中景・遠景の樹冠：木の塊のふくらみ。日の当たる側を明るく、反対を暗く（細かすぎて ちらつく距離では消す）
{vec2 sl=normalize(uSunT.xz+vec2(1e-4));
float fw=length(fwidth(vXZ));
float tc=0.;
for(int o=0;o<3;o++){float sc=o==0?.16:o==1?.055:.02;vec2 q=vXZ*sc,qi=floor(q),qf=fract(q);
 vec2 jt=vec2(fract(sin(dot(qi,vec2(7.7,3.1)))*91.),fract(sin(dot(qi,vec2(2.3,8.9)))*91.))*.5+.25;
 vec2 dd=qf-jt;float r=length(dd);
 float bump=1.-smoothstep(.12,.5,r);
 float face=dot(dd,-sl)/(r+.05);
 tc+=(bump*.6*face-(1.-bump)*.35)*(1.-smoothstep(.25,.6,fw*sc))*(o==0?.5:o==1?.45:.4);}
diffuseColor.rgb*=1.+tc*.5*wood*(1.-uSnow*.6);}
}
// 山ひだの細部の陰影：森の色で塗り替えたあとに、沢の底を暗く、その間の尾根をわずかに明るく（上の rocc）
diffuseColor.rgb*=1.-.75*rocc+.08*rmt;
// 尾根は明るく乾いた色、谷は暗く湿った色（山ひだ）
{float cvv=clamp(vCv,-1.,1.),land_=smoothstep(3.,14.,vH);
diffuseColor.rgb*=1.+land_*(cvv>0.?cvv*.22:cvv*.3);
diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.06,1.03,.9),land_*max(cvv,0.)*.5);
diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.86,.95,1.02),land_*max(-cvv,0.)*.6);}diffuseColor.rgb*=1.-wood*.28*(1.-uSnow*.5*(1.-uSnow*smoothstep(90.,120.,vH)));
`;
// 紅葉
const TERR_FS_AUTUMN = `// 紅葉
vec2 aq=vXZ*.35,ai=floor(aq),af=fract(aq);
af=af*af*(3.-2.*af);
float a1=fract(sin(dot(ai,vec2(12.9,78.2)))*43758.5),a2=fract(sin(dot(ai+vec2(1,0),vec2(12.9,78.2)))*43758.5),a3=fract(sin(dot(ai+vec2(0,1),vec2(12.9,78.2)))*43758.5),a4=fract(sin(dot(ai+1.,vec2(12.9,78.2)))*43758.5);
float nz=mix(mix(a1,a2,af.x),mix(a3,a4,af.x),af.y);
diffuseColor.rgb=mix(diffuseColor.rgb,mix(mix(vec3(.62,.22,.07),vec3(.78,.5,.1),fract(nz*7.)),vec3(.55,.12,.06),step(.85,fract(nz*13.))),uAut*.85*smoothstep(.45,.62,nz)*smoothstep(${(20 * S * VEX).toFixed(2)},${(120 * S * VEX).toFixed(2)},vH)*smoothstep(1.-uAut*1.1,1.15-uAut*1.1,1.-clamp(vH/${(700 * S * VEX).toFixed(2)},0.,1.)+(dot(nrmE,normalize(vec3(.55,.6,.4)))-.5)*.25));
`;
// 冬枯れと雪
const TERR_FS_WINTER = `// 冬枯れと雪
diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.05,.92,.75),uWin);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.9,.92,.94)*(.85+.15*mic),uSL*(1.-smoothstep(.55,.9,slope))*smoothstep(.3,1.2,vH));
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.93,.94,.96),uSnow*smoothstep(${(600 * S * VEX).toFixed(2)},${(800 * S * VEX).toFixed(2)},vH+(fract(sin(dot(floor(vXZ*.6),vec2(3.,7.)))*91.)-.5)*${(120 * S * VEX).toFixed(2)}));
`;
// 遠くの霞・雲の影・朝夕の山の縁の光
const TERR_FS_HAZE = `// 遠くの霞、雲の影、朝夕の山の縁の光
{float dc_=length(cameraPosition.xz-vXZ);
float hz=1.-exp(-dc_/${glf(LOOK.hazeDist)});
hz*=(.55+.45*smoothstep(5.,160.,vH));
{float cs=smoothstep(.35,.8,.5+.5*sin((vXZ.x+uCT*4.)*.0045+sin(vXZ.y*.0031)*2.)*sin((vXZ.y+uCT*2.)*.0038+sin(vXZ.x*.0027)*1.7));
diffuseColor.rgb*=(1.-cs*${glf(LOOK.cloudShadowLand)}*uCSh*clamp(uSunT.y*3.,0.,1.))*(1.+(1.-cs)*${glf(LOOK.sunlitBoost)}*uCSh*clamp(uSunT.y*3.,0.,1.));
float low=smoothstep(.22,.02,uSunT.y)*smoothstep(-.1,.02,uSunT.y);
vec2 sd2=normalize(uSunT.xz+1e-4);
float face=pow(max(dot(normalize(nrm.xz+1e-4),sd2),0.),2.)*smoothstep(.05,.5,1.-nrm.y);
diffuseColor.rgb+=vec3(1.,.55,.3)*face*low*smoothstep(40.,180.,vH)*.35;
}// 遠い山ほど、白いかすみではなく暗い青灰の影に沈む
diffuseColor.rgb=mix(diffuseColor.rgb,mix(uHaze*1.1,uHaze*vec3(.5,.56,.68),smoothstep(${glf(LOOK.farDarkFrom)},${glf(LOOK.farDarkTo)},dc_)),clamp(hz,0.,1.)*${glf(LOOK.hazeAmount)});
diffuseColor.rgb*=1.+.12*hz;
}`;
// 夜の山並み（霧をかけた後の色に重ねる。夜は光が弱く、色を変えても暗さに埋もれるため）：
// 月に向いた斜面に青白い光の縁、遠い稜線ほど夜空の地平の色に近づけて、重なる山を見分けられるように
const TERR_FS_NIGHT = `if(uNt>0.){float dn_=length(cameraPosition.xz-vXZ);vec2 md=normalize(uMoonT.xz+1e-4);
 float fm=pow(max(dot(normalize(nrm.xz+1e-4),md),0.),2.)*smoothstep(.05,.5,1.-nrm.y)*smoothstep(40.,180.,vH);
 vec3 hz_=linearToOutputTexel(vec4(uHaze*(1.15+.6*uMoonL),1.)).rgb;
 gl_FragColor.rgb+=vec3(.1,.12,.17)*fm*uMoonL*uNt*(1.-smoothstep(500.,5000.,dn_));
 gl_FragColor.rgb=mix(gl_FragColor.rgb,hz_,uNt*smoothstep(200.,3500.,dn_)*.72);}`; // 作品の1単位は実寸5m（約1kmから17km先で地平の色へ）
const NEAR_U = { value: new THREE.Vector4(0, 0, 0, 0) }; // 細かい網目の中心 x, z・半分の幅（作品の単位）・使うか
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
  sh.uniforms.uMoonT = { value: new THREE.Vector3(0, 1, 0) };
  sh.uniforms.uNear = NEAR_U;
  sh.uniforms.uMoonL = { value: 0 };
  sh.uniforms.uNt = { value: 0 };
  sh.uniforms.uSL = { value: 0 };
  sh.uniforms.uWin = { value: 0 };
  sh.uniforms.uAut = { value: 0 };
  terrMat.userData.sh = sh;
  sh.vertexShader = sh.vertexShader
    .replace("#include <common>", "#include <common>\nvarying float vH;varying vec2 vXZ;attribute float aCv;varying float vCv;varying vec3 vWN;attribute float aNear;varying float vNear;")
    .replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvH=position.y;vXZ=(modelMatrix*vec4(position,1.)).xz;vCv=aCv;vWN=normal;vNear=aNear;",
    );
  sh.fragmentShader = sh.fragmentShader
    .replace(
      "#include <common>",
      "#include <common>\n" + GLSL_NOISE + "\nvarying float vH;varying vec2 vXZ;varying float vCv;varying vec3 vWN;varying float vNear;uniform vec4 uNear;uniform float uSnow;uniform float uSL;uniform float uSpr;uniform float uCT;uniform float uCSh;uniform vec3 uSunT;uniform float uWin;uniform float uAut;uniform vec3 uHaze;uniform float uLow;uniform vec3 uMoonT;uniform float uMoonL;uniform float uNt;",
    )
    .replace(
      "#include <color_fragment>",
      `#include <color_fragment>
${TERR_FS_SLOPE}${TERR_FS_ROCK}${TERR_FS_SHORE}${TERR_FS_FOREST}${TERR_FS_AUTUMN}${TERR_FS_WINTER}${TERR_FS_HAZE}`,
    )
    .replace("#include <fog_fragment>", "#include <fog_fragment>\n" + TERR_FS_NIGHT);
};
terrGeo.setAttribute("aNear", new THREE.BufferAttribute(new Float32Array(terrGeo.attributes.position.count), 1));
const terr = new THREE.Mesh(terrGeo, terrMat);
terr.receiveShadow = true;
terr.position.set((tx0 + ((TW - 1) * tdx) / 2) * S, 0, (ty0 + ((TH - 1) * tdy) / 2) * S);
scene.add(terr);
// カメラのまわりの細かい網目：岸近くの細かい地形（NEAR）を30m間隔で描く。カメラが約240m動いたら作り直す。
// 縁の4マスは粗い地形の高さへなだらかにつなぎ、いちばん外の一周は粗い地形の下へ少し沈めて、すき間が見えないようにする
G.nearPatch = (() => {
  const N = QUALITY.nearPatch;
  if (!N || !nearBlk.size) return null;
  const st = NEAR.step,
    geo = new THREE.PlaneGeometry(N * st * S, N * st * S, N, N).rotateX(-Math.PI / 2),
    pos = geo.attributes.position,
    col = new Float32Array(pos.count * 3),
    cv = new Float32Array(pos.count),
    hh = new Float32Array(pos.count);
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("aCv", new THREE.BufferAttribute(cv, 1));
  geo.setAttribute("aNear", new THREE.BufferAttribute(new Float32Array(pos.count).fill(1), 1));
  const m = new THREE.Mesh(geo, terrMat);
  m.receiveShadow = true;
  m.frustumCulled = false;
  m.visible = false;
  scene.add(m);
  let cx = 1e9,
    cy = 1e9;
  function build(x0, y0) {
    let any = false;
    for (let k = 0; k < pos.count; k++) {
      const i = k % (N + 1),
        j = Math.floor(k / (N + 1)),
        x = x0 + (i - N / 2) * st,
        y = y0 + (j - N / 2) * st,
        e = Math.min(i, j, N - i, N - j),
        hc = terrGrid(x, y),
        hf = nearAt(x, y);
      if (hf !== null) any = true;
      const t = Math.min(1, Math.max(0, (e - 1) / 4)),
        h = hf === null ? hc : hc + (hf - hc) * t * t * (3 - 2 * t);
      hh[k] = h;
      pos.setXYZ(k, (i - N / 2) * st * S, h * S * VEX - (e === 0 ? 1.5 : 0), (j - N / 2) * st * S);
      const c = terrColor(h);
      col.set([c.r, c.g, c.b], k * 3);
    }
    // 尾根と谷（粗い地形と同じ考え方。30m間隔なので、約90m・270m先と比べる）
    const at = (i, j) => Math.max(0, hh[Math.min(N, Math.max(0, j)) * (N + 1) + Math.min(N, Math.max(0, i))]);
    for (let k = 0; k < pos.count; k++) {
      const i = k % (N + 1),
        j = Math.floor(k / (N + 1)),
        h = at(i, j);
      let v = 0;
      if (h > 0) for (const r of [3, 9]) v += (h - (at(i - r, j) + at(i + r, j) + at(i, j - r) + at(i, j + r)) / 4) / (r === 3 ? 5 : 15);
      cv[k] = Math.max(-1, Math.min(1, v));
    }
    pos.needsUpdate = geo.attributes.color.needsUpdate = geo.attributes.aCv.needsUpdate = true;
    geo.computeVertexNormals();
    m.position.set(x0 * S, 0, y0 * S);
    m.visible = any;
    NEAR_U.value.set(x0 * S, y0 * S, (N / 2 - 1) * st * S, any ? 1 : 0);
  }
  return {
    mesh: m,
    // x, y：カメラの真下（実寸m）。網目の点にそろえ、240m以上ずれたら作り直す
    update(x, y) {
      const q = st * 8,
        nx = Math.round(x / q) * q,
        ny = Math.round(y / q) * q;
      if (Math.abs(nx - cx) < 240 && Math.abs(ny - cy) < 240) return;
      cx = nx;
      cy = ny;
      build(nx, ny);
    },
  };
})();
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
  [136.178, 35.297, 40], // 多景島
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
// 島の標高の格子（tools/isles.py → data/isles.json）：20m間隔、湖面からの高さ。小さすぎて標高データに出ない島（多景島）は作り話の丘のまま
const ISLE_DEM = __ISLES__;
function isleGrid(I, x, y) {
  const g = I.g,
    u = Math.max(0, Math.min(g.w - 1.001, (x - g.x0) / g.step)),
    v = Math.max(0, Math.min(g.h - 1.001, (y - g.y0) / g.step)),
    i = Math.floor(u),
    j = Math.floor(v),
    f = u - i,
    e = v - j,
    q = (a, b) => g.d[b * g.w + a];
  return ((q(i, j) * (1 - f) + q(i + 1, j) * f) * (1 - e) + (q(i, j + 1) * (1 - f) + q(i + 1, j + 1) * f) * e) * (g.top / 255);
}
function isleShape(I, x, y, dd) {
  let h = I.g ? 0.6 + isleGrid(I, x, y) * S * VEX * Math.min(1, 0.25 + dd / 40) : 0.6 + I.top * S * VEX * Math.pow(dd / I.md, 0.6);
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
  // 標高の格子：島の中心を含むもの。湖面から3m以上の高さが出ないもの（小さすぎる島）は使わない
  let g = (ISLE_DEM || []).find((q) => cx > q.x0 && cx < q.x0 + q.w * q.step && cy > q.y0 && cy < q.y0 + q.h * q.step);
  if (g) {
    const dd_ = Uint8Array.from(atob(g.d), (ch) => ch.charCodeAt(0));
    g = dd_.reduce((m, v) => Math.max(m, v), 0) * (g.top / 255) >= 3 ? { ...g, d: dd_ } : null;
  }
  ISLES.push({ h, top, md, box: [a, b, c, d], g });
  for (let k = 0; k < pos.count; k++)
    pos.setY(k, ds[k] < 0 ? -3 : isleShape(ISLES[ISLES.length - 1], cx + pos.getX(k) / S, cy + pos.getZ(k) / S, ds[k]));
  geo.computeVertexNormals();
  // 地形と同じ材質で描く（岩肌・森・山ひだ・霞・夜の山並みが島にも付く）。色は地形の頂点色と同じ決め方
  {
    const col = new Float32Array(pos.count * 3),
      C = new THREE.Color();
    for (let k = 0; k < pos.count; k++) {
      const hh = (pos.getY(k) - 0.6) / (S * VEX);
      if (hh < 60) C.set(0x6b7a52);
      else C.set(0x4c5f3c).lerp(new THREE.Color(0x3b4c33), Math.min(1, (hh - 60) / 340));
      col.set([C.r, C.g, C.b], k * 3);
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.setAttribute("aCv", new THREE.BufferAttribute(new Float32Array(pos.count), 1));
    geo.setAttribute("aNear", new THREE.BufferAttribute(new Float32Array(pos.count).fill(2), 1));
  }
  const m = new THREE.Mesh(geo, terrMat);
  m.receiveShadow = true;
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
// （中心は湖岸の上。内陸に置いていた7か所は、区域の中に岸がなくヨシが立たなかったので、いちばん近い岸へ寄せた。
//   野洲の内陸に置いていた1か所は、寄せると赤野井のえりの並ぶ水面を覆うので除き、隣の小浜で受け持つ）
const REED_SITES = [
  [136.1986, 35.4591, 2500], // 片山（地名は近くの地理院の注記）
  [136.07, 35.345, 2200], // 新旭
  [136.03, 35.405, 1500], // 今津
  [136.045, 35.3, 1500], // 横江浜
  [136.1968, 35.4319, 1500], // 延勝寺
  [136.1945, 35.2499, 1500], // 三津屋
  [136.0662, 35.1531, 1500], // 津田
  [135.971, 35.1211, 1200], // 小浜
  [135.9174, 35.0229, 1500], // 山田
  [135.93, 35.115, 1000], // 堅田
].map(([lo, la, r]) => [...ll(lo, la), r]);
const reedPts = [];
{
  const o = outer;
  for (const [cx, cy, r] of REED_SITES) {
    const R = rndFor("reeds:" + Math.round(cx) + "," + Math.round(cy)); // 区域ごとの乱数（区域を足し引きしても、ほかの区域は変わらない）
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
    cut: { stem: "#9c8a66", leaf: null, plume: null, h: 0.2 },
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
const reedU = { uT: { value: 0 }, uW: { value: new THREE.Vector2(1, 0) }, uCut: { value: 0 }, tAlt: { value: null }, uSunD: { value: new THREE.Vector3(0.5, 0.7, 0.3) } };
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
    sh.uniforms.uCut = reedU.uCut;
    sh.uniforms.tAlt = reedU.tAlt;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uT;uniform vec2 uW;varying vec2 vRW;varying float vRH;")
      .replace(
        "#include <project_vertex>",
        "vec4 wp=modelMatrix*instanceMatrix*vec4(transformed,1.);float hh=clamp(transformed.y/4.2,0.,1.);float sw=(.35+.65*sin(uT*1.6+wp.x*.35+wp.z*.27)+.3*sin(uT*.6+dot(wp.xz,normalize(uW+1e-4))*.08))*hh*hh;wp.xz+=uW*sw;vec4 mvPosition=viewMatrix*wp;gl_Position=projectionMatrix*mvPosition;vRW=wp.xz;vRH=hh;",
      );
    // 刈り取り後のヨシ原：刈り残しの立ったヨシの群れ、株の高さのむら、まばらな所と水の見える すき間、板の端をまばらに
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uCut;uniform sampler2D tAlt;varying vec2 vRW;varying float vRH;float rh_(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5);}float rn_(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(rh_(i),rh_(i+vec2(1,0)),f.x),mix(rh_(i+vec2(0,1)),rh_(i+1.),f.x),f.y);}")
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
// 板の形を隠す：茎の列ごとに背丈をばらつかせ（上の縁を不揃いに）、板の左右の端ほど低くまばらにして、株の丸い形にする
if(uCut<=0.){float cl=rh_(vec2(floor(vMapUv.x*40.),floor(vRW.x*.13+vRW.y*.17))),sd=smoothstep(0.,.45,min(vMapUv.x,1.-vMapUv.x));
 diffuseColor.a*=step(vRH,(.62+.38*cl)*(.5+.5*sd));
 diffuseColor.a*=step(cl*.9,sd*1.25);}
if(uCut>0.){float pn=rn_(vRW*.03)*.65+rn_(vRW*.11)*.35;
 float keep=smoothstep(.66,.74,pn);
 if(keep>.5){vec4 tA=texture2D(tAlt,vMapUv);diffuseColor=vec4(diffuse*tA.rgb,opacity*tA.a);}
 else{float col=rh_(floor(vRW*2.3)+floor(vMapUv.x*36.));
  diffuseColor.a*=step(vRH,(.08+.16*col)*(.55+.9*pn));
  diffuseColor.a*=smoothstep(.3,.42,pn+col*.1);
  diffuseColor.rgb*=.8+.4*col;}
 diffuseColor.a*=step(rh_(vec2(floor(vMapUv.x*48.),floor(vRW.x*.2+vRW.y*.2))),smoothstep(0.,.3,min(vMapUv.x,1.-vMapUv.x))*1.25);}`,
      );
  };
  return m;
}
const reedGeo = reedGeom();
const reeds = new THREE.InstancedMesh(reedGeo, reedMat(), reedPts.length * QUALITY.reedPer);
{
  const m = new THREE.Matrix4(),
    R = rnd(9);
  // ヨシ原の縁：まわりの株が少ない所（群落の端・沖側）ほど低く細くして、四角い塊の縁を崩す
  const cell = (x, y) => Math.floor(x / 60) + "," + Math.floor(y / 60),
    cnt = new Map();
  for (const [x, y] of reedPts) cnt.set(cell(x, y), (cnt.get(cell(x, y)) || 0) + 1);
  const around = (x, y) => {
    let n = 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) n += cnt.get(cell(x + a * 60, y + b * 60)) || 0;
    return n;
  };
  const ns = reedPts.map(([x, y]) => around(x, y)),
    med = [...ns].sort((a, b) => a - b)[ns.length >> 1] || 1;
  let i = 0;
  reedPts.forEach(([x, y], j) => {
    const e = Math.min(1, Math.max(0, (ns[j] / med - 0.2) / 0.7));
    for (let k = 0; k < QUALITY.reedPer; k++) {
      const s = (0.6 + R() * 0.7) * (0.8 + 0.4 * vnoise(x / 700, y / 700)) * (0.7 + 0.3 * e);
      m.makeRotationY(R() * 3.14).premultiply(new THREE.Matrix4().makeScale(s, s * (0.85 + R() * 0.3) * (0.55 + 0.45 * e), s));
      m.setPosition(x * S + (R() - 0.5) * 24, 0, y * S + (R() - 0.5) * 24);
      reeds.setMatrixAt(i++, m);
    }
  });
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
  innerPolys.forEach((p, pi) => {
    const R = rndFor("innerReeds:" + INNER[pi][0]); // 内湖ごとの乱数
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
