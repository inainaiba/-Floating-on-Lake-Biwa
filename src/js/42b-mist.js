/* ---------- 朝の霧：風のない朝、湖面すれすれに薄い霧がたまり、ゆっくり流れて日が高くなると消える（2026年11月） ----------
   ・4時半〜8時半ごろ、凪の朝ほど濃い。夏は薄く、春・秋・冬に濃い。雨の日は出さない
   ・カメラのまわり（実寸約400m〜3km）の水の上に、大きくやわらかい粒を低く置く。粒は風下へ流れ、遠ざかると手前に置き直す
   ・谷や山すそにたまる霞の濃さ（16-terrain-2-mesh.js の MIST_U）もここで決める
   粒の明るさは空の色に合わせ、霧が景色の形を消しすぎないよう薄くする */
{
  const NP = 150,
    pos = new Float32Array(NP * 3),
    seed = new Float32Array(NP),
    g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  const puff = cvTex(64, 64, (c, w, h) => {
    const gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, "rgba(255,255,255,.9)");
    gr.addColorStop(0.5, "rgba(255,255,255,.35)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
  });
  const U = { uA: { value: 0 }, uCol: { value: new THREE.Color(0xdfe4e8) }, uMap: { value: puff } };
  const m = new THREE.ShaderMaterial({
    uniforms: U,
    transparent: true,
    depthWrite: false,
    vertexShader: `uniform float uA;attribute float aSeed;varying float vA;
void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;float d=-mv.z;
gl_PointSize=uA>.001?(22.+aSeed*26.)*540./max(d,1.):0.;
// 近すぎる粒（画面を覆う）と遠すぎる粒は薄く
vA=uA*smoothstep(40.,120.,d)*(1.-smoothstep(450.,650.,d))*(.6+.4*aSeed);}`,
    fragmentShader: `uniform sampler2D uMap;uniform vec3 uCol;varying float vA;
void main(){float a=texture2D(uMap,gl_PointCoord).a*vA;if(a<.003)discard;gl_FragColor=vec4(uCol,a);}`,
  });
  const mist = new THREE.Points(g, m);
  mist.frustumCulled = false;
  mist.renderOrder = 3;
  scene.add(mist);
  let ready = false;
  const place = (i, cx, cz, near) => {
    for (let k = 0; k < 8; k++) {
      const a = Math.random() * 6.283,
        r = (near ? 80 : 60) + Math.random() * 540,
        x = cx + Math.cos(a) * r,
        z = cz + Math.sin(a) * r;
      if (inLake(x / S, z / S)) {
        pos.set([x, 0.6 + Math.random() * 2.2, z], i * 3);
        return;
      }
    }
    pos[i * 3 + 1] = -50; // 水の上が見つからなければ隠す
  };
  const dayC = new THREE.Color(0xe4e8ec),
    dawnC = new THREE.Color(0xc9c4cf);
  onFrame(129, (f) => {
    const c = f.c,
      h = c.phase * 24,
      rain = f.wxNow.rain || 0,
      m0 = Math.max(0, 1 - Math.abs(h - 6.3) / 2.2),
      calm = Math.max(0, 1 - f.W.s / 3),
      season = c.month >= 5 && c.month <= 7 ? 0.45 : 1,
      a = m0 * m0 * (3 - 2 * m0) * calm * season * (rain > 0.3 ? 0 : 1);
    MIST_U.value = a; // 谷の霞（16-terrain-2-mesh.js）
    mist.visible = a > 0.01 && !isFar;
    if (!mist.visible) return;
    const cx = camera.position.x,
      cz = camera.position.z;
    if (!ready) {
      for (let i = 0; i < NP; i++) {
        seed[i] = Math.random();
        place(i, cx, cz, false);
      }
      g.attributes.aSeed.needsUpdate = true;
      ready = true;
    }
    // 風下へゆっくり流す。遠ざかった粒は、まわりのどこかに置き直す
    const wx = f.W.x * 0.15 + 0.08,
      wz = f.W.y * 0.15 + 0.05;
    for (let i = 0; i < NP; i++) {
      pos[i * 3] += wx * f.dt * (0.6 + seed[i] * 0.6);
      pos[i * 3 + 2] += wz * f.dt * (0.6 + seed[i] * 0.6);
      if (Math.hypot(pos[i * 3] - cx, pos[i * 3 + 2] - cz) > 650) place(i, cx, cz, true);
    }
    g.attributes.position.needsUpdate = true;
    U.uA.value = 0.065 * a;
    U.uCol.value.copy(dawnC).lerp(dayC, Math.min(1, f.day * 2));
  });
}
