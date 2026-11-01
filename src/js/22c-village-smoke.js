/* ---------- 夕餉の煙と朝の湯気：人の姿は見せず、煙で暮らしを感じさせる（2026年11月） ----------
   ・夕方（4時半ごろ〜8時ごろ）、集落の家からまばらに細い煙が立ちのぼり、風下へたなびいて薄れる。家ごとに立つ時刻・消える時刻が違う
   ・冬（12〜3月）の朝（6時ごろ〜8時ごろ）は、湯気や薪の煙が立つ家がある。冬は煙の立つ家が多く、夏は少ない
   ・雨の日は立たない。風が強いほど低く横に流れる
   粒（Points）の動きはすべてシェーダーで計算する（粒ごとの年齢＝時刻と位相から）。映り込みには描かない */
{
  const PER = 12, // 1本の煙の粒の数
    cols = [];
  for (let i = 0; i < houses.length; i++) {
    const h = houses[i];
    if (h.kind && h.kind !== "house" && h.kind !== "barn") continue;
    const v = bHash(h.x + 17, h.y - 5);
    if (v > 0.22) continue; // 家の2割ほどに煙突（かまど・風呂・薪ストーブ）
    cols.push([h, v / 0.22]);
  }
  const n = cols.length * PER,
    P = new Float32Array(n * 3),
    A = new Float32Array(n * 4), // 粒の位相・本ごとの乱数・夕方に立つ時刻・夕方に消える時刻
    Bm = new Float32Array(n * 2); // 朝に立つ時刻・朝に消える時刻（立たない家は 0,0）
  cols.forEach(([h, r], k) => {
    const x = h.x * S + Math.cos(h.rot) * h.w * 0.25,
      z = h.y * S + Math.sin(h.rot) * h.w * 0.25,
      y = 0.6 + h.ground * S * VEX + h.h + 0.6,
      eveOn = 16.4 + Math.random() * 1.6,
      eveOff = 18.6 + Math.random() * 1.6,
      mOn = Math.random() < 0.45 ? 5.8 + Math.random() * 0.8 : 0,
      mOff = mOn ? 7.4 + Math.random() * 1.0 : 0;
    for (let j = 0; j < PER; j++) {
      const i = k * PER + j;
      P.set([x, y, z], i * 3);
      A.set([j / PER + Math.random() * 0.05, r, eveOn, eveOff], i * 4);
      Bm.set([mOn, mOff], i * 2);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(P, 3));
  g.setAttribute("aS", new THREE.BufferAttribute(A, 4));
  g.setAttribute("aM", new THREE.BufferAttribute(Bm, 2));
  const puff = cvTex(64, 64, (c, w, hh) => {
    const gr = c.createRadialGradient(w / 2, hh / 2, 0, w / 2, hh / 2, w / 2);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.45, "rgba(255,255,255,.45)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = gr;
    c.fillRect(0, 0, w, hh);
  });
  const U = {
    uT: { value: 0 },
    uHour: { value: 12 },
    uAmt: { value: 0.5 }, // 煙の立つ家の割合（季節と雨で変わる）
    uMorn: { value: 0 }, // 冬の朝の湯気があるか
    uWind: { value: new THREE.Vector2(1, 0) },
    uCol: { value: new THREE.Color(0xcfd2d4) },
    uMap: { value: puff },
  };
  const m = new THREE.ShaderMaterial({
    uniforms: U,
    transparent: true,
    depthWrite: false,
    fog: false,
    vertexShader: `uniform float uT;uniform float uHour;uniform float uAmt;uniform float uMorn;uniform vec2 uWind;
attribute vec4 aS;attribute vec2 aM;varying float vA;
void main(){
  float h=uHour;
  // 夕方：立つ時刻から消える時刻まで（立ちはじめと消えぎわは細く）。朝：冬だけ
  float eve=smoothstep(aS.z,aS.z+.3,h)*(1.-smoothstep(aS.w-.4,aS.w,h));
  float mor=uMorn*step(.01,aM.x)*smoothstep(aM.x,aM.x+.3,h)*(1.-smoothstep(aM.y-.4,aM.y,h));
  float on=max(eve,mor)*step(aS.y,uAmt);
  float age=fract(uT*.045+aS.x+aS.y*7.3);
  float ws=length(uWind);
  vec3 p=position;
  // 立ちのぼり、風下へ曲がる。風が強いほど低く横に流れる。ゆるい揺らぎ
  p.y+=age*15.*mix(1.,.45,min(ws/5.,1.));
  p.xz+=uWind*pow(age,1.7)*5.+vec2(sin(uT*.6+aS.y*20.+age*5.),cos(uT*.5+aS.y*13.+age*4.))*age*.8;
  vec4 mv=modelViewMatrix*vec4(p,1.);
  gl_Position=projectionMatrix*mv;
  float d=-mv.z;
  gl_PointSize=on>.001?(2.+age*7.)*520./max(d,1.):0.;
  // 遠いほど・年をとるほど薄い。遠景（約3km先）では見せない
  vA=on*(1.-age)*smoothstep(0.,.1,age)*.9*(1.-smoothstep(500.,1100.,d));
}`,
    fragmentShader: `uniform sampler2D uMap;uniform vec3 uCol;varying float vA;
void main(){vec4 t=texture2D(uMap,gl_PointCoord);if(t.a*vA<.004)discard;gl_FragColor=vec4(uCol,t.a*vA);}`,
  });
  const smoke = new THREE.Points(g, m);
  smoke.frustumCulled = false;
  smoke.renderOrder = 2;
  scene.add(smoke);
  G.smoke = smoke; // 確認用
  const DAYC = new THREE.Color(0xd4d7d9),
    DUSK = new THREE.Color(0xa49fa8),
    NIGHT = new THREE.Color(0x4a4b52);
  onFrame(128, (f) => {
    const c = f.c,
      h = c.phase * 24,
      winter = c.month >= 11 || c.month <= 2,
      rain = f.wxNow.rain || 0;
    smoke.visible = !isFar && ((h > 16 && h < 20.5) || (winter && h > 5.5 && h < 8.6)) && rain < 0.5;
    if (!smoke.visible) return;
    U.uT.value = f.t;
    U.uHour.value = h;
    // 冬は多く、夏は少ない（かまど・風呂・薪ストーブ）。雨の降りはじめは減る
    U.uAmt.value = (winter ? 0.9 : c.month >= 5 && c.month <= 7 ? 0.35 : 0.6) * (1 - rain * 1.6);
    U.uMorn.value = winter ? 1 : 0;
    const ws = Math.min(8, f.W.s);
    U.uWind.value.set(f.W.x, f.W.y).normalize().multiplyScalar(0.3 + ws * 0.35);
    // 色：昼は白っぽく、夕暮れは空に溶ける灰紫、夜は暗い（灯りに照らされた所だけ見える程度）
    const d = f.day;
    U.uCol.value.copy(d > 0.3 ? DAYC : d > 0.08 ? DUSK.clone().lerp(DAYC, (d - 0.08) / 0.22) : NIGHT.clone().lerp(DUSK, d / 0.08));
  });
}
