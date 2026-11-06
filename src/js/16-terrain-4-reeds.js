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
// 冬（11〜2月）は黄金色の枯れヨシが立ったまま。1・2月は刈り取りが少しずつ進み（REED_CUT）、3月にヨシ焼き（38-seasonal-events.js）
const REED_MONTH = [
  "winter",
  "winter",
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
const REED_CUT = [0.22, 0.4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // 刈り取られた所の割合の目安（1・2月）
const reedU = {
  uT: { value: 0 },
  uW: { value: new THREE.Vector2(1, 0) },
  uCutT: { value: 0 }, // 刈り取りの進み（0：刈っていない）
  uBurnOn: { value: 0 }, // 3月：ヨシ焼き（uBurn の円の内側が焼け跡）
  uBurn: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, 0, 0)) }, // 火を付けた所 x, z・燃え広がった半径・火が燃えているか
  uGold: { value: 0 }, // 穂が光をとらえる強さ（秋・冬）
  tAlt: { value: null },
  uSunD: { value: new THREE.Vector3(0.5, 0.7, 0.3) },
};
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
    sh.uniforms.uCutT = reedU.uCutT;
    sh.uniforms.uBurnOn = reedU.uBurnOn;
    sh.uniforms.uBurn = reedU.uBurn;
    sh.uniforms.uGold = reedU.uGold;
    sh.uniforms.uSunD = reedU.uSunD;
    sh.uniforms.tAlt = reedU.tAlt;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uT;uniform vec2 uW;varying vec2 vRW;varying float vRH;varying float vRY;varying float vGust;")
      .replace(
        "#include <project_vertex>",
        // 風に波打つ：風が渡ると、明るい帯が波のように群落の上を風下へ走る（帯の所は大きくなびく）
        "vec4 wp=modelMatrix*instanceMatrix*vec4(transformed,1.);float hh=clamp(transformed.y/4.2,0.,1.);vec2 wd_=normalize(uW+1e-4);float gb=smoothstep(.45,1.,sin(dot(wp.xz,wd_)*.045-uT*1.25+sin(wp.x*.013+wp.z*.011)*2.));float sw=(.35+.65*sin(uT*1.6+wp.x*.35+wp.z*.27)+.3*sin(uT*.6+dot(wp.xz,wd_)*.08)+gb*1.4)*hh*hh;wp.xz+=uW*sw;vec4 mvPosition=viewMatrix*wp;gl_Position=projectionMatrix*mvPosition;vRW=wp.xz;vRH=hh;vRY=wp.y;vGust=gb*min(1.,length(uW)*2.5);",
      );
    // 刈り取り後のヨシ原・焼け跡：刈り残し（焼け残り）の立ったヨシの群れ、株の高さのむら、まばらな所と水の見える すき間
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uCutT;uniform float uBurnOn;uniform vec4 uBurn[8];uniform float uGold;uniform vec3 uSunD;uniform sampler2D tAlt;varying vec2 vRW;varying float vRH;varying float vRY;varying float vGust;float rh_(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5);}float rn_(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(rh_(i),rh_(i+vec2(1,0)),f.x),mix(rh_(i+vec2(0,1)),rh_(i+1.),f.x),f.y);}")
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
float pn=rn_(vRW*.03)*.65+rn_(vRW*.11)*.35,bm=0.,emb=0.;
if(uBurnOn>0.)for(int i=0;i<8;i++){vec4 b=uBurn[i];if(b.z<=0.)continue;float d=length(vRW-b.xy)+(pn-.5)*7.;bm=max(bm,smoothstep(b.z+1.5,b.z-1.5,d));emb=max(emb,exp(-pow((d-b.z)/2.2,2.))*b.w);}
float keep=uBurnOn>0.?1.-bm:(uCutT>0.?smoothstep(uCutT-.04,uCutT+.04,pn):1.);
bool alt=uBurnOn>0.||uCutT>0.;
if(alt&&keep>.5){vec4 tA=texture2D(tAlt,vMapUv);diffuseColor=vec4(diffuse*tA.rgb,opacity*tA.a);}
// 板の形を隠す：茎の列ごとに背丈をばらつかせ（上の縁を不揃いに）、板の左右の端ほど低くまばらにして、株の丸い形にする
if(!alt||keep>.5){float cl=rh_(vec2(floor(vMapUv.x*40.),floor(vRW.x*.13+vRW.y*.17))),sd=smoothstep(0.,.45,min(vMapUv.x,1.-vMapUv.x));
 diffuseColor.a*=step(vRH,(.62+.38*cl)*(.5+.5*sd));
 diffuseColor.a*=step(cl*.9,sd*1.25);
 // 穂が光をとらえる：朝日・夕日を背にしたヨシ原の上の方（穂）が、金色に透けて光る。風の帯の所は少し明るい
 vec3 vd=normalize(vec3(vRW.x,vRY,vRW.y)-cameraPosition);vec3 sd_=normalize(uSunD);
 float bl=pow(max(dot(vd,sd_),0.),4.)*smoothstep(.5,.02,sd_.y)*smoothstep(-.06,.04,sd_.y),top=smoothstep(.5,.95,vRH);
 diffuseColor.rgb+=vec3(1.,.72,.36)*bl*top*uGold*.85+vec3(1.,.92,.75)*top*uGold*.07*smoothstep(0.,.3,sd_.y);
 diffuseColor.rgb*=1.+vGust*.16*top;}
else{float col=rh_(floor(vRW*2.3)+floor(vMapUv.x*36.));
  diffuseColor.a*=step(vRH,(.08+.16*col)*(.55+.9*pn));
  diffuseColor.a*=smoothstep(.3,.42,pn+col*.1);
  diffuseColor.rgb*=.8+.4*col;
  if(uBurnOn>0.)diffuseColor.rgb*=.32; // 焼け跡は黒く
  // 燃えている縁：焼け跡の株の根もとが赤く熾る
  diffuseColor.rgb+=vec3(1.,.38,.08)*emb*(.6+.4*sin(vRW.x*3.1+vRW.y*2.7))*1.4;}
if(alt)diffuseColor.a*=step(rh_(vec2(floor(vMapUv.x*48.),floor(vRW.x*.2+vRW.y*.2))),smoothstep(0.,.3,min(vMapUv.x,1.-vMapUv.x))*1.25);`,
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
      const s = (0.8 + R() * 0.5) * (0.85 + 0.3 * vnoise(x / 700, y / 700)) * (0.7 + 0.3 * e); // 背丈をそろえて、群落の帯に
      m.makeRotationY(R() * 3.14).premultiply(new THREE.Matrix4().makeScale(s, s * (0.85 + R() * 0.3) * (0.55 + 0.45 * e), s));
      m.setPosition(x * S + (R() - 0.5) * 16, 0, y * S + (R() - 0.5) * 16);
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
