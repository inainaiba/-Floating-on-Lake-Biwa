/* ---------- 湖の祭り：人は描かず、船・曳山・灯り・火で表す。日と時刻は共有時計で決まる（見る人みな同じ祭り）。
   ・8月　船幸祭（建部大社）：夕方、神輿を載せた御座船と供奉の船の列が、湖の南の端（瀬田川の口）を沖へ出て戻る。日が暮れると提灯が灯る
   ・10月　大津祭：昼は曳山が町の通りを順に進み（巡行）、夜は通りに並んだ曳山の提灯が灯る（宵宮）
   ・1月　左義長：小正月の夕べ、湖岸の集落の浜で、竹と藁を高く組んだ左義長が燃える。炎と火の粉、煙、水面に映る火 ---------- */
G.fest = (() => {
  const g = new THREE.Group();
  scene.add(g);
  const M = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o }),
    wood = M(0x6a4a30),
    dark = M(0x2a2622),
    red = M(0xb8352a),
    white = M(0xeeeae0),
    gold = M(0xc8a040, { emissive: 0x3a2a08 }),
    // 提灯：昼は紙の色、夜は明るく灯る（1より明るくして、にじませる）
    lampR = new THREE.MeshBasicMaterial({ color: 0xd04030 }),
    lampW = new THREE.MeshBasicMaterial({ color: 0xf0e6d0 }),
    LR_DAY = new THREE.Color(0xc84a38),
    LR_NIGHT = new THREE.Color(0xff6a3a).multiplyScalar(2.4),
    LW_DAY = new THREE.Color(0xeee6d4),
    LW_NIGHT = new THREE.Color(0xffd9a0).multiplyScalar(2.6);
  const box = (p, w, h, d, m, x, y, z) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z);
    p.add(o);
    return o;
  };
  const lantern = (p, m, x, y, z, s = 1) => {
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.32 * s, 8, 6), m);
    o.scale.y = 1.35;
    o.position.set(x, y, z);
    p.add(o);
  };

  // ======== 船幸祭（8月） ========
  const sen = (() => {
    // 道筋：瀬田川の口の近くの湖の上から、沖（いちばん深くなる向き）へ約1.2km出て、少し横にずれて戻る
    let [ax, ay] = ll(135.9055, 35.0015);
    for (let r = 0; r < 1500 && depth(ax, ay) < 1.2; r += 50) {
      let ok = false;
      for (let a = 0; a < 6.28 && !ok; a += 0.4)
        if (depth(ax + Math.cos(a) * r, ay + Math.sin(a) * r) >= 1.2) (ax += Math.cos(a) * r), (ay += Math.sin(a) * r), (ok = true);
      if (ok) break;
    }
    let ang = 0,
      best = -1;
    for (let a = 0; a < 6.28; a += 0.1) {
      const d = depth(ax + Math.cos(a) * 1200, ay + Math.sin(a) * 1200);
      if (d > best) (best = d), (ang = a);
    }
    const ux = Math.cos(ang),
      uy = Math.sin(ang),
      side = 80,
      P = [
        [ax, ay],
        [ax + ux * 1200, ay + uy * 1200],
        [ax + ux * 1200 - uy * side, ay + uy * 1200 + ux * side],
        [ax - uy * side, ay + ux * side],
      ],
      cum = [0];
    for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const LEN = cum[cum.length - 1];
    const at = (s) => {
      s = Math.max(0, Math.min(LEN, s));
      let i = 1;
      while (i < P.length - 1 && cum[i] < s) i++;
      const u = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1),
        x = P[i - 1][0] + (P[i][0] - P[i - 1][0]) * u,
        y = P[i - 1][1] + (P[i][1] - P[i - 1][1]) * u;
      return [x, y, Math.atan2(P[i][1] - P[i - 1][1], P[i][0] - P[i - 1][0])];
    };
    placeLog("船幸祭の船の道", "water", P);
    // 御座船：屋形と神輿、四隅の幟、軒の提灯
    const mkGoza = () => {
      const b = new THREE.Group();
      box(b, 16, 1.2, 4.2, dark, 0, 0.3, 0);
      box(b, 15.6, 0.25, 4.4, red, 0, 1, 0); // 朱の縁
      box(b, 7, 2.2, 3.4, wood, -1, 2.1, 0); // 屋形
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 7.6, 3, 1).rotateZ(Math.PI / 2), dark);
      roof.scale.set(1, 0.55, 1);
      roof.position.set(-1, 3.6, 0);
      b.add(roof);
      box(b, 1.6, 1.4, 1.6, gold, 3.6, 1.9, 0); // 神輿
      const mr = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.9, 4).rotateY(Math.PI / 4), gold);
      mr.position.set(3.6, 3, 0);
      b.add(mr);
      for (const [x, z] of [
        [7, 1.9],
        [7, -1.9],
        [-6.5, 1.9],
        [-6.5, -1.9],
      ]) {
        box(b, 0.12, 7, 0.12, wood, x, 4.3, z); // 幟の竿
        box(b, 0.05, 4.5, 0.9, x > 0 ? white : red, x, 5.3, z + (z > 0 ? 0.5 : -0.5));
      }
      for (let i = 0; i < 7; i++) {
        lantern(b, lampR, -4.2 + i * 1.07, 2.95, 1.85);
        lantern(b, lampR, -4.2 + i * 1.07, 2.95, -1.85);
      }
      return b;
    };
    // 供奉の船：舳先から艫へ張った綱に提灯を吊るし、真ん中に幟
    const mkTomo = (k) => {
      const b = new THREE.Group();
      box(b, 10, 0.9, 2.6, dark, 0, 0.25, 0);
      box(b, 9.8, 0.2, 2.7, k % 2 ? red : wood, 0, 0.8, 0);
      box(b, 0.1, 5.5, 0.1, wood, 0, 3.4, 0);
      box(b, 0.05, 3.2, 0.7, k % 2 ? white : red, 0, 4.4, 0.4);
      for (let i = 0; i < 9; i++) {
        const u = i / 8,
          x = -4.4 + u * 8.8,
          y = 1.6 + (1 - Math.abs(u - 0.5) * 2) * 3.4;
        lantern(b, i % 3 === 1 ? lampW : lampR, x, y, 0, 0.9);
      }
      return b;
    };
    const boats = [mkGoza(), ...Array.from({ length: 8 }, (_, k) => mkTomo(k))];
    for (const b of boats) {
      mergeStatic(b);
      b.visible = false;
      g.add(b);
    }
    function update(c, t, show) {
      const on = show && c.month === 7 && c.phase > 0.62 && c.phase < 0.86;
      // 17時ごろ（0.70）に出て、19時ごろ（0.80）に戻る。前後は出発点に並んで舫う
      const u = Math.min(1, Math.max(0, (c.phase - 0.7) / 0.1)),
        head = u * LEN;
      boats.forEach((b, i) => {
        b.visible = on;
        if (!on) return;
        const s = head - i * 110; // 御座船が先頭、供奉の船が続く（地図の上で110mおき。作品の中では22）
        // 出る前は出発点に横に並んで舫う。戻ったあとは、帰りの道に列のまま止まる
        const [x, y, a] = s <= 0 ? [ax - uy * 45 * i, ay + ux * 45 * i, ang] : at(s);
        b.position.set(x * S, waveH(x * S, y * S, t) * 0.5 - 0.15, y * S);
        b.rotation.set(0, -a, Math.sin(t * 0.8 + i) * 0.02);
      });
    }
    return { update };
  })();

  // ======== 大津祭（10月） ========
  const otsu = (() => {
    // 通り：大津港から大津駅へまっすぐ上る通り（中央大通り）。曳山はこの通りを渡って旧市街を巡る。
    // 湖と直角の通りなので、湖の上から通りの奥まで見通せる（南湖の街の建物は、この通りの上には建てない：47-city.js）
    // 湖の側の端は岸（港の岸壁）から20m内陸、そこから大津駅の方へ約650m
    const [qx, qy] = shoreSnap(...ll(135.8636, 35.0108)),
      [ex, ey] = ll(135.8628, 35.0042),
      qd = Math.hypot(ex - qx, ey - qy),
      route = [
        [qx + ((ex - qx) / qd) * 20, qy + ((ey - qy) / qd) * 20],
        [qx + ((ex - qx) / qd) * 670, qy + ((ey - qy) / qd) * 670],
      ];
    for (let k = 0; k < 40 && inLake(...route[0]); k++) (route[0][0] += ((ex - qx) / qd) * 10), (route[0][1] += ((ey - qy) / qd) * 10);
    const bestL = Math.hypot(route[1][0] - route[0][0], route[1][1] - route[0][1]);
    if (bestL < 250) return { update() {}, route: [] };
    const cum = [0];
    for (let i = 1; i < route.length; i++) cum.push(cum[i - 1] + Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]));
    const LEN = cum[cum.length - 1];
    const at = (s) => {
      s = Math.max(0, Math.min(LEN, s));
      let i = 1;
      while (i < route.length - 1 && cum[i] < s) i++;
      const u = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
      return [route[i - 1][0] + (route[i][0] - route[i - 1][0]) * u, route[i - 1][1] + (route[i][1] - route[i - 1][1]) * u, Math.atan2(route[i][1] - route[i - 1][1], route[i][0] - route[i - 1][0])];
    };
    placeLog("大津祭の曳山の通り", "land", route);
    // 曳山：大きな木の車輪、二層の山、反りのある屋根、四面の幕、前に見送りの幕。四方に提灯
    const t0 = new THREE.Group(),
      maku = M(0x9c2a22),
      kin = M(0xd0b060, { emissive: 0x2a2008 });
    for (const [x, z] of [
      [-1.6, 1.3],
      [1.6, 1.3],
      [-1.6, -1.3],
      [1.6, -1.3],
    ]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.3, 12).rotateX(Math.PI / 2), wood);
      w.position.set(x, 0.85, z);
      t0.add(w);
    }
    box(t0, 4.4, 0.5, 2.8, wood, 0, 1.6, 0);
    box(t0, 4, 2.2, 2.6, maku, 0, 2.95, 0); // 下の層の幕
    box(t0, 4.2, 0.25, 2.8, kin, 0, 4.15, 0);
    box(t0, 3.4, 2.2, 2.2, wood, 0, 5.35, 0); // 上の層（からくりの舞台）
    box(t0, 3.5, 1.2, 2.3, kin, 0, 5.0, 0);
    const rf = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 4.8, 4, 1).rotateY(Math.PI / 4), dark);
    rf.scale.set(1, 0.32, 0.7);
    rf.position.set(0, 7.0, 0);
    t0.add(rf);
    box(t0, 0.15, 2.4, 1.8, M(0x1f3c6a), -2.2, 3.1, 0); // 見送り幕
    for (let i = 0; i < 6; i++)
      for (const z of [1.5, -1.5]) {
        lantern(t0, lampW, -1.9 + i * 0.76, 4.6, z, 0.85);
        lantern(t0, lampR, -1.6 + i * 0.64, 6.6, z * 0.85, 0.75);
      }
    mergeStatic(t0);
    const NY = 13,
      yama = Array.from({ length: NY }, () => {
        const o = t0.clone();
        o.visible = false;
        g.add(o);
        return o;
      });
    // 夜の通りのにじみ：曳山の並ぶ通りの上に、ぼんやりした暖かい光
    const glowM = new THREE.SpriteMaterial({ map: G.dotTex, color: 0xffa860, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }),
      glow = new THREE.Sprite(glowM);
    g.add(glow);
    function update(c, t, show, night) {
      const day = c.phase > 0.38 && c.phase < 0.64,
        eve = c.phase > 0.74 && c.phase < 0.92,
        on = show && c.month === 9 && (day || eve);
      glow.visible = on && eve;
      // 巡行：10時から15時ごろに、通りを端から端へ。宵宮：通りに間をあけて並ぶ
      const u = day ? Math.min(1, Math.max(0, (c.phase - 0.4) / 0.22)) : 0.5,
        gap = Math.min(28, LEN / (NY + 1)),
        head = day ? u * (LEN + NY * gap) : LEN / 2 + (NY * gap) / 2;
      let mx = 0,
        mz = 0,
        n = 0;
      yama.forEach((o, i) => {
        const s = head - i * gap;
        o.visible = on && s >= 0 && s <= LEN;
        if (!o.visible) return;
        const [x, y, a] = at(s);
        o.position.set(x * S, landY(x, y), y * S);
        o.rotation.y = -a;
        mx += x * S;
        mz += y * S;
        n++;
      });
      if (glow.visible && n) {
        glow.position.set(mx / n, landY(mx / n / S, mz / n / S) + 14, mz / n); // 曳山の並ぶ通りが、ぼんやり明るむ
        glow.scale.set(Math.max(90, gap * NY * 0.8), 50, 1);
        glowM.opacity = 0.45 * night;
      }
    }
    return { update, route };
  })();

  // ======== 左義長（1月） ========
  const sagi = (() => {
    // 湖岸の集落の浜（集落から岸へ寄せ、陸の側へ少し入った所）
    const sites = [];
    VILLAGES.forEach(([lo, la], i) => {
      if (i % 3) return;
      const [sx, sy] = shoreSnap(...ll(lo, la));
      let best = null;
      for (let a = 0; a < 6.28 && !best; a += 0.3) {
        const x = sx + Math.cos(a) * 60,
          y = sy + Math.sin(a) * 60;
        if (!inLake(x, y) && !inLake(x + Math.cos(a) * 20, y + Math.sin(a) * 20)) best = [x, y];
      }
      if (best) sites.push({ x: best[0], y: best[1], sx, sy, ig: (i % 5) * 0.004, h: 8 + (i % 4) * 1.5 });
    });
    placeLog("左義長", "land", sites.map((q) => [q.x, q.y]));
    // 組み上げた竹と藁（円錐）と、てっぺんの扇
    const strawM = M(0xc8b078),
      stackG = new THREE.ConeGeometry(1, 1, 10, 1, true).translate(0, 0.5, 0),
      stacks = sites.map((q) => {
        const m = new THREE.Mesh(stackG, strawM);
        m.position.set(q.x * S, landY(q.x, q.y), q.y * S);
        m.visible = false;
        g.add(m);
        return m;
      });
    // 炎・火の粉・煙：粒の位置はシェーダーで時刻から（毎フレームの計算は要らない）。左義長ごとの位置と燃え具合は uniform の配列で
    const NF = sites.length,
      NP = 220,
      N = NF * NP,
      aF = new Float32Array(N),
      aR = new Float32Array(N * 3),
      R = rnd(7766);
    for (let i = 0; i < N; i++) {
      aF[i] = Math.floor(i / NP);
      aR[i * 3] = R();
      aR[i * 3 + 1] = R();
      aR[i * 3 + 2] = R();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    geo.setAttribute("aF", new THREE.BufferAttribute(aF, 1));
    geo.setAttribute("aR", new THREE.BufferAttribute(aR, 3));
    const fu = { uT: { value: 0 }, uDay: { value: 1 }, uP: { value: Array.from({ length: Math.max(1, NF) }, () => new THREE.Vector4()) }, uPx: { value: 600 } };
    const fireM = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: fu,
      vertexShader: `attribute float aF;attribute vec3 aR;uniform float uT,uPx;uniform vec4 uP[${Math.max(1, NF)}];varying vec3 vC;varying float vA;
void main(){
  vec4 P=uP[int(aF+.5)];float H=P.w;
  float emb=step(.78,aR.x),L=mix(.9+aR.y*.7,2.6+aR.y*2.,emb),s=fract(aR.z*7.31+uT/L);
  float a=aR.y*6.283+s*2.5+uT*(.6+aR.x),r=mix(1.6*(1.-s*.75),1.2+s*3.,emb)*(.4+.6*aR.x)*min(1.,H/4.);
  vec3 q=P.xyz+vec3(cos(a)*r,s*H*mix(.9+aR.x*.6,2.6,emb),sin(a)*r);
  vec4 mv=modelViewMatrix*vec4(q,1.);gl_Position=projectionMatrix*mv;
  float sz=mix(2.2-s*1.5,.28,emb)*min(1.,H/3.),px=sz*uPx/max(1.,-mv.z);gl_PointSize=max(1.5,px);
  vC=mix(mix(vec3(1.,.82,.42)*2.2,vec3(1.,.36,.08)*1.6,s),vec3(1.,.55,.2)*2.,emb);
  vA=step(.3,H)*mix(pow(1.-s,1.5)*.55,(1.-s)*(.6+.4*sin(uT*20.+aR.y*40.)),emb)*min(1.,px*px/3.)*(1.-smoothstep(1800.,3000.,-mv.z));
}`,
      fragmentShader: `varying vec3 vC;varying float vA;void main(){vec2 d=gl_PointCoord-.5;float r=length(d)*2.;float a=exp(-r*r*3.)*(1.-smoothstep(.8,1.,r));if(vA*a<.003)discard;gl_FragColor=vec4(vC*vA*a,1.);}`,
    });
    const fire = new THREE.Points(geo, fireM);
    fire.frustumCulled = false;
    fire.visible = false;
    g.add(fire);
    // 煙：炎の上へ、風下へ流れながら広がる（ふつうの重ね方の灰色）
    const smM = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: fu,
      vertexShader: `attribute float aF;attribute vec3 aR;uniform float uT,uPx,uDay;uniform vec4 uP[${Math.max(1, NF)}];varying float vA;varying vec3 vC;
void main(){
  vec4 P=uP[int(aF+.5)];float H=P.w,L=6.+aR.y*4.,s=fract(aR.z*3.17+uT/L);
  // 煙の色：昼は灰色、夜は暗く、根元は火に照らされて橙に
  vC=mix(vec3(.07,.065,.06),vec3(.36,.35,.34),uDay)+vec3(.5,.22,.06)*(1.-uDay)*(1.-smoothstep(0.,.35,s));
  vec3 q=P.xyz+vec3((aR.x-.5)*4.+s*s*14.,H*1.4+s*30.,(aR.y-.5)*4.+s*6.);
  vec4 mv=modelViewMatrix*vec4(q,1.);gl_Position=projectionMatrix*mv;
  float px=(2.5+s*9.)*uPx/max(1.,-mv.z);gl_PointSize=max(1.5,px);
  vA=step(.3,H)*step(aR.x,.45)*sin(s*3.1416)*.16*min(1.,H/4.)*(1.-smoothstep(1500.,2600.,-mv.z));
}`,
      fragmentShader: `varying float vA;varying vec3 vC;void main(){vec2 d=gl_PointCoord-.5;float r=length(d)*2.;float a=exp(-r*r*2.5);if(vA*a<.003)discard;gl_FragColor=vec4(vC,vA*a);}`,
    });
    const smoke = new THREE.Points(geo, smM);
    smoke.frustumCulled = false;
    smoke.visible = false;
    g.add(smoke);
    // 水面に映る火：火から自分の側へ伸びる、揺れる橙の筋
    const refl = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1).translate(0, -0.5, 0).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        map: cvTex(32, 128, (x, w, h) => {
          for (let y = 0; y < h; y += 2) {
            x.fillStyle = `rgba(255,255,255,${((1 - y / h) * (0.3 + Math.random() * 0.7)).toFixed(2)})`;
            const ww = w * (0.3 + Math.random() * 0.7);
            x.fillRect((w - ww) / 2, y, ww, 1);
          }
        }),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
      Math.max(1, NF),
    );
    refl.frustumCulled = false;
    refl.count = 0;
    refl.userData.noChunk = true;
    g.add(refl);
    const M4 = new THREE.Matrix4(),
      Qn = new THREE.Quaternion(),
      Yx = new THREE.Vector3(0, 1, 0),
      V3 = new THREE.Vector3(),
      Sc = new THREE.Vector3(),
      FC = new THREE.Color(1, 0.5, 0.18);
    function update(c, t, show, night) {
      const on = show && c.month === 0 && c.phase > 0.3 && c.phase < 0.86,
        cp = camera.position;
      fire.visible = smoke.visible = false;
      refl.count = 0;
      let any = false,
        nr = 0;
      sites.forEach((q, i) => {
        const m = stacks[i],
          d = Math.hypot(q.x * S - cp.x, q.y * S - cp.z);
        m.visible = on && d < 2500;
        // 燃え具合：17時ごろ（0.71）に火が入り、約20分（作品の中で0.1日）で燃え尽きる
        const b = (c.phase - 0.71 - q.ig) / 0.1,
          H0 = q.h,
          left = b < 0 ? 1 : Math.max(0.08, 1 - b * 0.95);
        m.scale.set(H0 * 0.32 * (0.6 + 0.4 * left), H0 * left, H0 * 0.32 * (0.6 + 0.4 * left));
        const fl = !on || b < 0 || b > 1.15 ? 0 : H0 * 1.3 * Math.min(1, b / 0.12) * (b > 0.75 ? Math.max(0.15, 1 - (b - 0.75) / 0.4) : 1);
        const gy = landY(q.x, q.y);
        fu.uP.value[i].set(q.x * S, gy + H0 * left * 0.35, q.y * S, d < 3000 ? fl : 0);
        if (fl > 0.3 && d < 3000) any = true;
        // 映り込み：火と自分の間が湖のとき
        if (fl > 0.3 && night > 0.05 && d < 1800 && d > 30) {
          const wx = q.sx * S,
            wz = q.sy * S,
            dd = Math.hypot(cp.x - wx, cp.z - wz);
          Qn.setFromAxisAngle(Yx, Math.atan2(cp.x - wx, cp.z - wz));
          M4.compose(V3.set(wx, water.position.y + 0.06, wz), Qn, Sc.set(3 + fl * 0.5, 1, Math.min(dd * 0.7, fl * 9 + 20)));
          refl.setMatrixAt(nr, M4);
          refl.setColorAt(nr++, FC.clone().multiplyScalar(0.9 * night * (fl / (H0 * 1.3)) * (1 - d / 1800)));
        }
      });
      fire.visible = smoke.visible = any;
      fu.uT.value = t;
      fu.uDay.value = 1 - night;
      fu.uPx.value = renderer.domElement.height / (2 * Math.tan((camera.fov * Math.PI) / 360));
      refl.count = nr;
      if (nr) {
        refl.instanceMatrix.needsUpdate = true;
        if (refl.instanceColor) refl.instanceColor.needsUpdate = true;
      }
    }
    return { update, sites };
  })();

  function update(dt, t, c, day) {
    const night = Math.min(1, Math.max(0, (0.22 - day) / 0.14)),
      show = !isFar;
    lampR.color.lerpColors(LR_DAY, LR_NIGHT, night);
    lampW.color.lerpColors(LW_DAY, LW_NIGHT, night);
    sen.update(c, t, show);
    otsu.update(c, t, show, night);
    sagi.update(c, t, show, night);
  }
  return { update, g, sagi, street: otsu.route };
})();
