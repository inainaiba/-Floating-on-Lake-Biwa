/* ---------- 遠くのにわか雨と雷：夏（6〜9月）の午後から夕方、晴れた湖の向こうに、局地的な雨雲が立つ。
   雲の下から灰色の雨脚が湖や山へ垂れ、雲はゆっくり流れながら育って消える。雲の中で稲光が光り、ときどき雷が落ちる。
   雷鳴は光ってから、離れている分だけ遅れて届く（音の速さ。遠いほど小さく低い）。
   ・雨雲の出る日・時刻・場所・流れる向きは共有時計で決まる（見る人みな同じ空）。稲光の瞬間は見る人ごと
   ・雲と雨脚はカメラに向いた1枚の板に、まとめて描く（雲1つにつき描画1回）
   ・自分が雨雲の真下に入ると、雨脚は見えなくなる（遠くから眺めるもの） ---------- */
G.showers = (() => {
  const MONTHS = [5, 6, 7, 8],
    NC = 2; // 一日に出る雨雲の数の上限
  // 雨雲の出る範囲：湖のまわり（湖岸線の外接長方形を広げたもの）
  let bx0 = 1e9,
    by0 = 1e9,
    bx1 = -1e9,
    by1 = -1e9;
  for (const [x, y] of outer) (bx0 = Math.min(bx0, x)), (by0 = Math.min(by0, y)), (bx1 = Math.max(bx1, x)), (by1 = Math.max(by1, y));
  bx0 -= 6000;
  by0 -= 6000;
  bx1 += 6000;
  by1 += 6000;
  // その日の雨雲（日と番号で決まる）
  function cell(dn, k) {
    const R = rndFor("shower:" + dn + ":" + k);
    if (R() > (k ? 0.3 : 0.65)) return null;
    const p0 = 0.5 + R() * 0.18, // 現れる時刻（一日の割合）
      dur = 0.12 + R() * 0.12,
      a = (R() - 0.5) * 1.6, // 流れる向き：夏は西から東へが多い
      v = (5 + R() * 6) * DAY, // 流れる速さ（実寸 m/秒）を、一日の割合あたりの道のりに
      r = 1500 + R() * 1500; // 雨脚の半径（実寸m）
    return { k, p0, dur, x: bx0 + R() * (bx1 - bx0), y: by0 + R() * (by1 - by0), dx: Math.cos(a), dy: Math.sin(a), v, r, seed: R() * 100, bolt: R() };
  }
  const vert = `varying vec2 vU;varying float vD;void main(){vU=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vD=-mv.z;gl_Position=projectionMatrix*mv;}`,
    frag = `${GLSL_NOISE}
uniform float uT,uA,uFl,uSeed,uBase,uHt,uW,uR,uLean,uAnv,uWarmA;uniform vec3 uLit,uDk,uFogC,uWarm;uniform vec2 uFog;varying vec2 vU;varying float vD;
void main(){
  float X=vU.x*2.-1.,Y=vU.y*uHt;
  // 雨脚：雲の底から水面まで。風下へ少し傾き、縁はほつれ、縦の筋が下へ流れる
  float sx=X*uW/uR+(uBase-Y)/uBase*uLean;
  float ed=1.-smoothstep(.5,1.,abs(sx)+(nzN(vec2(Y*.012,uSeed))-.5)*.5);
  float stv=.5+.5*nzN(vec2(sx*12.,Y*.03+uT*1.6));
  float sh=ed*stv*smoothstep(uBase*1.02,uBase*.7,Y)*smoothstep(0.,6.,Y)*(.7+.3*nzN(vec2(sx*2.,uT*.02+uSeed)));
  // 雲：底は平らで暗く、上へ行くほど細り、もくもくした縁。日の当たる上ほど明るい
  float h=(Y-uBase*.82)/(uHt-uBase*.82);
  float bp=nzF4(vec2(X*2.6+uSeed,Y*.005+uT*.003));
  // 積乱雲：底は広く、中ほどは塔のように細く立ち上がり、てっぺんは横へ平たく広がる（かなとこ雲）
  float hc=clamp(h,0.,1.);
  float pr=mix(.9,.42,smoothstep(.0,.55,hc));
  pr=mix(pr,1.02,smoothstep(.74,.9,hc)*uAnv);
  // 塔の部分は、もくもくした瘤（大きなうねり）で縁を削る
  float bump=(bp-.5)*.55+(nzN(vec2(X*5.+uSeed,Y*.012))-.5)*.25*(1.-smoothstep(.75,.9,hc));
  float cl=smoothstep(pr+.04,pr-.26,abs(X)+bump)*smoothstep(-.06,.1,h+(bp-.5)*.18)*smoothstep(1.,.93,h+(bp-.5)*.12);
  vec3 c=mix(uDk,uLit*1.05,smoothstep(.02,.75,h)*(.55+.45*bp));
  // 夕方：雲の上だけが日に照らされて赤く染まる
  c=mix(c,uWarm,smoothstep(.35,.95,h)*uWarmA*(.6+.4*bp));
  // 雨脚の色：雲の底の暗さを受けた青灰色。水面の近くは、しぶきで少し白む
  vec3 rc=mix(uDk*.62,vec3(.36,.4,.47)*dot(uLit,vec3(.33)),.4);
  rc=mix(rc,uLit*.8,smoothstep(60.,0.,Y)*.35);
  c=mix(rc,c,smoothstep(0.,.25,cl));
  // 稲光：雲の中がふわっと明るむ
  float g=exp(-(X*X*2.5+(h-.3)*(h-.3)*6.));
  c+=vec3(.82,.84,1.)*uFl*g*1.6;
  float a=max(sh*.9,cl*.94)*uA;
  float f=smoothstep(uFog.x,uFog.y*1.6,vD);
  c=mix(c,uFogC,f*.8);a*=1.-f*.55;
  if(a<.003)discard;
  gl_FragColor=vec4(c,a);
}`;
  const mk = () => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uT: { value: 0 },
          uA: { value: 0 },
          uFl: { value: 0 },
          uSeed: { value: 0 },
          uBase: { value: 420 },
          uHt: { value: 1300 },
          uW: { value: 1 },
          uR: { value: 1 },
          uLean: { value: 0.2 },
          uAnv: { value: 1 },
          uWarmA: { value: 0 },
          uWarm: { value: new THREE.Color(1, 0.55, 0.35) },
          uLit: { value: new THREE.Color() },
          uDk: { value: new THREE.Color() },
          uFogC: { value: new THREE.Color() },
          uFog: { value: new THREE.Vector2(800, 5000) },
        },
        vertexShader: vert,
        fragmentShader: frag,
      }),
    );
    m.frustumCulled = false;
    m.visible = false;
    m.renderOrder = -1; // 遠くのものなので、ほかの半透明のもの（花火・灯り）より先に描く
    scene.add(m);
    // 雨脚の下の湖面：雨粒に打たれて細かく荒れ、空が映らず暗い灰色になる
    const pm = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uT: { value: 0 }, uA: { value: 0 }, uC: { value: new THREE.Color() }, uSeed: { value: 0 } },
        vertexShader: `varying vec2 vP;void main(){vP=position.xz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `${GLSL_NOISE}
uniform float uT,uA,uSeed;uniform vec3 uC;varying vec2 vP;
void main(){float r=length(vP)+(nzN(vP*2.+uSeed)-.5)*.35;float e=1.-smoothstep(.55,1.,r);
float pit=step(.86,nzH(floor(vP*90.+vec2(uT*7.,uT*5.3))));
float a=uA*e*(.22+.12*pit+.08*nzN(vP*6.+uT*.4));if(a<.003)discard;gl_FragColor=vec4(uC*(1.+.25*pit),a);}`,
      }),
    );
    pm.visible = false;
    pm.frustumCulled = false;
    scene.add(pm);
    return { m, pm, fl: 0, next: 0, key: "" };
  };
  const cells = Array.from({ length: NC }, mk);
  // 落雷の光の筋：雲の底から地面・水面へ、折れ曲がりながら（枝分かれ1〜2本）
  const NB = 64,
    bPos = new Float32Array(NB * 6),
    bGeo = new THREE.BufferGeometry();
  bGeo.setAttribute("position", new THREE.BufferAttribute(bPos, 3));
  const bolt = new THREE.LineSegments(bGeo, new THREE.LineBasicMaterial({ color: 0xe8e8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  bolt.frustumCulled = false;
  bolt.visible = false;
  scene.add(bolt);
  let boltT = 0;
  // 落雷の水面の映り込み：落ちた所から自分の側へ伸びる、白く揺れる筋
  const bRef = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1).translate(0, -0.5, 0).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      map: cvTex(32, 128, (x, w, hh) => {
        for (let y = 0; y < hh; y += 2) {
          x.fillStyle = `rgba(255,255,255,${((1 - y / hh) * (0.3 + Math.random() * 0.7)).toFixed(2)})`;
          const ww = w * (0.3 + Math.random() * 0.7);
          x.fillRect((w - ww) / 2, y, ww, 1);
        }
      }),
      color: 0xdcdcff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    }),
  );
  bRef.visible = false;
  bRef.frustumCulled = false;
  scene.add(bRef);
  let bWater = false,
    bx_ = 0,
    bz_ = 0;
  function strike(cx, cz, top, bottom, w) {
    let n = 0;
    const seg = (x0, y0, z0, x1, y1, z1) => {
      if (n >= NB) return;
      bPos.set([x0, y0, z0, x1, y1, z1], n * 6);
      n++;
    };
    const path = (x, y, z, y1, steps, spread) => {
      let px = x,
        py = y,
        pz = z;
      for (let i = 1; i <= steps; i++) {
        const nx = px + (Math.random() - 0.5) * spread,
          ny = y + ((y1 - y) * i) / steps,
          nz = pz + (Math.random() - 0.5) * spread;
        seg(px, py, pz, nx, ny, nz);
        if (i > 2 && i < steps - 3 && Math.random() < 0.12) path(nx, ny, nz, ny - (y - y1) * 0.25, 5, spread * 0.8);
        (px = nx), (py = ny), (pz = nz);
      }
    };
    const sx0 = cx + (Math.random() - 0.5) * w,
      sz0 = cz + (Math.random() - 0.5) * w;
    path(sx0, top, sz0, bottom, 18, w * 0.12);
    // 落ちた所（最後の線の先）が湖の上なら、水面に映す
    bx_ = bPos[(n - 1) * 6 + 3];
    bz_ = bPos[(n - 1) * 6 + 5];
    bWater = inLake(bx_ / S, bz_ / S);
    bGeo.setDrawRange(0, n * 2);
    bGeo.attributes.position.needsUpdate = true;
    bolt.visible = true;
    boltT = 0.32;
  }
  const lit = new THREE.Color(),
    dk = new THREE.Color(),
    WH = new THREE.Color(0xf2f3f6),
    NIGHT = new THREE.Color(0x0b0d12);
  function update(dt, t, c, day, wx) {
    const on = MONTHS.includes(c.month) && !isFar && wx.rain < 0.3 && wx.snow < 0.1,
      dn = Math.floor(c.t / DAY),
      cp = camera.position;
    // 雲の色：昼は空の地平の色に寄せた白、夕方は空の色を映し、夜は暗い（稲光のときだけ見える）
    lit.copy(skyU.uHor.value).lerp(WH, 0.45).lerp(NIGHT, 1 - Math.min(1, day * 2.5));
    dk.copy(lit).multiplyScalar(0.48).lerp(new THREE.Color(0x3a4252), 0.25 * Math.min(1, day * 2));
    cells.forEach((cc, k) => {
      if (cc.key !== dn) (cc.key = dn), (cc.q = cell(dn, k));
      const q = on ? cc.q : null,
        u = q ? (c.phase - q.p0) / q.dur : -1;
      if (!q || u < 0 || u > 1) {
        cc.m.visible = cc.pm.visible = false;
        return;
      }
      // 育って、最も盛んになり、崩れて消える
      const grow = Math.min(1, u / 0.25),
        fade = Math.min(1, (1 - u) / 0.3),
        A = Math.min(grow, fade),
        x = (q.x + q.dx * q.v * (c.phase - q.p0)) * S,
        z = (q.y + q.dy * q.v * (c.phase - q.p0)) * S,
        R = q.r * S * (0.7 + 0.3 * grow),
        d = Math.hypot(x - cp.x, z - cp.z),
        inside = Math.min(1, Math.max(0, (d - R * 0.6) / (R * 0.8))); // 真下に近いほど消す
      const m = cc.m,
        U = m.material.uniforms,
        Ht = 1100 + 800 * grow,
        W = R * 2.8;
      m.visible = A * inside > 0.01;
      // 湖面の荒れ：雨雲の真ん中が湖の上のときだけ（真下に入っても見える）
      {
        const pm = cc.pm,
          pu = pm.material.uniforms;
        pm.visible = A > 0.01 && inLake(x / S, z / S) && d < 6000;
        if (pm.visible) {
          pm.position.set(x, water.position.y + 0.05, z);
          pm.scale.set(R * 0.9, 1, R * 0.9);
          pu.uT.value = t;
          pu.uA.value = A;
          pu.uSeed.value = q.seed;
          pu.uC.value.copy(dk).multiplyScalar(0.85);
        }
      }
      if (!m.visible) return;
      m.position.set(x, water.position.y - 2, z);
      m.rotation.set(0, Math.atan2(cp.x - x, cp.z - z), 0);
      m.scale.set(W, Ht, 1);
      U.uT.value = t;
      U.uA.value = A * inside;
      U.uSeed.value = q.seed;
      U.uBase.value = 420;
      U.uHt.value = Ht;
      U.uW.value = W / 2;
      U.uR.value = R;
      U.uLean.value = 0.25 * (q.dx * Math.cos(m.rotation.y) - q.dy * Math.sin(m.rotation.y));
      U.uAnv.value = Math.min(1, Math.max(0, (u - 0.2) / 0.3)); // 育ちきると、てっぺんが広がる
      {
        const sy = G.sunY || 0; // 太陽の高さ（sin）。低いほど雲の上が赤い
        U.uWarmA.value = sy > -0.04 && sy < 0.28 ? Math.min(1, (0.28 - sy) / 0.2) * Math.min(1, (sy + 0.04) / 0.06) * 0.75 : 0;
      }
      U.uLit.value.copy(lit);
      U.uDk.value.copy(dk);
      U.uFogC.value.copy(scene.fog.color);
      U.uFog.value.set(scene.fog.near, scene.fog.far);
      // 稲光：盛んなときに数秒〜十数秒おき。真夏（7・8月）と夕方以降に多い
      cc.fl = Math.max(0, cc.fl - dt * 4);
      if (A > 0.6 && t > cc.next) {
        const busy = (c.month === 6 || c.month === 7 ? 1.6 : 1) * (c.phase > 0.68 ? 1.5 : 1);
        cc.next = t + (4 + Math.random() * 12) / busy;
        if (cc.next - t < 30) {
          cc.fl = RM ? 0.35 : 1; // 動きを抑えるときは、稲光を弱く
          const dm = d / S, // 実寸の隔たり（m）
            big = q.bolt > 0.35 && Math.random() < 0.45;
          if (big && d < 6000) {
            const gx = x / S,
              gz = z / S,
              gy = inLake(gx, gz) ? water.position.y : landY(gx, gz);
            strike(x, z, 420, gy, R * 0.5);
          }
          if (typeof thunder === "function") thunder(Math.min(18, dm / 340), Math.min(0.5, 3000 / (dm + 3000)) * (big ? 1 : 0.6), x, z, big);
        }
      }
      // 稲光はちらつく（1回の光に2〜3度）
      U.uFl.value = cc.fl > 0 ? cc.fl * (0.55 + 0.45 * Math.sin(cc.fl * 40)) : 0;
    });
    bRef.visible = false;
    if (bolt.visible) {
      boltT -= dt;
      bolt.material.opacity = boltT > 0 ? (RM ? 0.35 : 0.6 + 0.4 * Math.sin(boltT * 70)) * Math.min(1, boltT * 6) : 0; // 動きを抑えるときは、ちらつかせない
      if (bWater && boltT > 0) {
        const dd = Math.hypot(cp.x - bx_, cp.z - bz_);
        bRef.visible = true;
        bRef.position.set(bx_, water.position.y + 0.08, bz_);
        bRef.rotation.set(0, Math.atan2(cp.x - bx_, cp.z - bz_), 0);
        bRef.scale.set(14 + dd * 0.01, 1, Math.min(dd * 0.7, 700));
        bRef.material.opacity = bolt.material.opacity * 0.55;
      }
      if (boltT <= 0) bolt.visible = false;
    }
  }
  // 全体地図：いま立っている雨雲（中心の位置。流れる分も含めて）
  mapMark((c) => {
    if (!MONTHS.includes(c.month)) return [];
    const wx = weather(c);
    if (wx.rain >= 0.3 || wx.snow >= 0.1) return []; // 湖じゅうが雨の日は出ない（update と同じ）
    const dn = Math.floor(c.t / DAY),
      out = [];
    for (let k = 0; k < NC; k++) {
      const q = cell(dn, k);
      if (!q || c.phase < q.p0 || c.phase > q.p0 + q.dur) continue;
      out.push({ x: q.x + q.dx * q.v * (c.phase - q.p0), y: q.y + q.dy * q.v * (c.phase - q.p0), ja: "にわか雨", en: "Passing shower" });
    }
    return out;
  });
  return { update, cells };
})();
onFrame(170, (f) => G.showers.update(f.dt, f.t, f.c, f.day, f.wxNow)); // 毎フレームの更新（遠くのにわか雨と雷。順番は 00-head.js の onFrame）
