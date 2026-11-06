/* ---------- 湖に浮かぶ建築 2. 水上映画館（道具は 44c-halls-0-common.js の HALL） ---------- */
{
  const { villageSites, mute, lam, box, add, M, glowMat, moor, setCur } = HALL;
  // ---------- 2. 水上映画館 ----------
  // 湖に浮かぶ大きな幕の舟。岸に着くと、陸に並んだ椅子のほうへ幕を向け、陸の映写台から光の筋が届く。人は陸から観る
  // 湖東の岸を北から南へ：尾上 → 長浜 → 米原の磯 → 彦根の松原 → 新海浜
  // 湖東の岸を北から南へ（集落のある所だけ）：尾上・長浜・米原の磯・彦根・新海浜・守山
  // 幕を向ける岸：幕と陸の客席の間にヨシ原がなく、客席のまわりに家がある浜だけ（ヨシ原に向かって上映しても、観る人がいない）
  const screenOk = (q) => {
    const ca = Math.cos(q.a),
      sa = Math.sin(q.a);
    // 幕（沖）から岸、岸から陸へ120mまで、幅±70mの帯にヨシ原がないこと
    for (let d = -Math.hypot(q.x - q.sx, q.y - q.sy); d <= 120; d += 20)
      for (const w of [-70, 0, 70]) {
        const x = q.sx - ca * d - sa * w,
          y = q.sy - sa * d + ca * w;
        if (inReeds(x, y)) return false;
      }
    // 客席のあたり（岸から陸へ約60m）から700m以内に家の集まり（1km四方で8軒以上。画質によらない家並みのデータ）があること
    const x = q.sx - ca * 60,
      y = q.sy - sa * 60;
    return (G.towns ? G.towns.list : []).some((t) => t.ns >= 8 && Math.hypot(t.x - x, t.y - y) < 700);
  };
  const cinCands = [[136.2, 35.455], [136.258, 35.392], [136.272, 35.335], [136.243, 35.283], [136.19, 35.22], [135.97, 35.12], [136.09, 35.165]];
  const cinSites = villageSites(cinCands, 140).filter(screenOk);
  G.cinCheck = () => villageSites(cinCands, 140).map((q) => [+(136.08 + q.x / 90940).toFixed(3), +(35.25 - q.y / 110540).toFixed(3), screenOk(q)]); // 確認用
  HALL.cinSites = cinSites;
  setCur("cin");
  let placeScreen = null;
  const screenU = { uT: { value: 0 }, uOn: { value: 0 } };
  let beam = null;
  {
    const scrM = new THREE.ShaderMaterial({
      uniforms: screenU,
      side: THREE.DoubleSide,
      vertexShader: `varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      // 古い湖の映像：ゆっくり流れる山並みと水面の明暗、ちらつき、縦の傷、ぼんやりした縁
      fragmentShader: `uniform float uT;uniform float uOn;varying vec2 vU;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
void main(){vec2 u=vU;float t=uT;float sc=floor(t/14.);
float hz=.45+.12*n(vec2(u.x*3.+sc*7.,sc))+.05*n(vec2(u.x*11.-t*.05,0.));
float img=u.y>hz?.75+.2*(u.y-hz)+.15*n(u*vec2(4.,2.)+t*.02):.35+.25*n(vec2(u.x*20.+t*.3,u.y*60.-t*.4))*(1.-(hz-u.y));
img*=1.-smoothstep(.0,.06,abs(u.y-hz))*.3;
img*=.9+.1*h(vec2(floor(t*18.),0.));
img-=step(.997,h(vec2(floor(u.x*300.),floor(t*6.))))*.4;
img*=smoothstep(0.,.08,u.x)*smoothstep(0.,.08,1.-u.x)*smoothstep(0.,.1,u.y)*smoothstep(0.,.1,1.-u.y);
vec3 off=vec3(.9,.9,.86);vec3 on=vec3(1.,.93,.8)*img*1.25;
gl_FragColor=vec4(mix(off*.75,on,uOn),1.);}`,
    });
    // 幕の舟：細長い浮き床（20m×6m）に、白い大きな幕（16m×9m）を細い枠で立てる。幕の表は岸（-Z）へ
    const g = new THREE.Group();
    add(g, box(20, 0.5, 6), M.deck, 0, 0.55, 0);
    for (const x of [-8, -4, 0, 4, 8]) for (const z of [-2.2, 2.2]) add(g, new THREE.CylinderGeometry(0.5, 0.5, 3.4, 8), M.float, x, 0.15, z, 0, Math.PI / 2);
    for (let k = 0; k < 40; k++) add(g, box(0.02, 0.01, 5.8), M.dark, -9.75 + k * 0.5, 0.81, 0); // 床板の目地
    for (let k = 0; k <= 80; k++) {
      const x = -10 + k * 0.25,
        main = k % 8 === 0;
      for (const z of [-2.9, 2.9]) add(g, box(main ? 0.06 : 0.025, 0.9, main ? 0.06 : 0.025), M.post, x, 1.3, z); // 細い格子の手すり
    }
    for (const z of [-2.9, 2.9]) for (const y of [1.75, 1.3]) add(g, box(20, y > 1.5 ? 0.06 : 0.03, y > 1.5 ? 0.06 : 0.03), M.post, 0, y, z);
    // 幕と枠：岸に着いている間だけ立てる。漂って移る間は、風に煽られないよう床の上へたたむ（rig を床の高さで縦に縮める）
    const rig = new THREE.Group();
    rig.position.y = 0.8;
    g.add(rig);
    const scr = add(rig, new THREE.PlaneGeometry(16, 9), scrM, 0, 6.6, 0.3);
    scr.rotation.y = Math.PI; // 表を岸へ
    for (const s of [-8.4, -5, -1.7, 1.7, 5, 8.4]) {
      add(rig, new THREE.CylinderGeometry(0.06, 0.08, 11.6, 6), M.post, s, 5.6, 0.5);
      const b1 = add(rig, box(0.04, 6.2, 0.04), M.post, s, 2.8, 2.2);
      b1.rotation.x = 0.55; // 後ろ（沖側）の細い筋交い
    }
    for (const y of [11.3, 2.05]) add(rig, box(17, 0.06, 0.06), M.post, 0, y, 0.45);
    for (let k = 0; k < 17; k++) add(rig, box(0.012, 9.2, 0.012), M.rope, -8 + k, 6.6, 0.4); // 幕を留める細い紐
    // 幕の枠を支える細い控え綱（枠の上から床の四隅へ）と、上の桁の小さな三角旗
    for (const sx of [-8.4, 8.4])
      for (const ez of [-2.8, 2.8]) {
        const a = new THREE.Vector3(sx, 11.2, 0.5),
          b = new THREE.Vector3(sx * 1.15, 0.2, ez),
          m = a.clone().add(b).multiplyScalar(0.5),
          L = a.distanceTo(b),
          o = add(rig, new THREE.CylinderGeometry(0.012, 0.012, L, 3), M.rope, m.x, m.y, m.z);
        o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      }
    {
      const FL = [0xd8634f, 0xe9c25a, 0x5b8fc4, 0xf2efe6].map((c) => new THREE.MeshBasicMaterial({ color: mute(c), side: THREE.DoubleSide }));
      for (let k = 0; k < 17; k++) {
        const f = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.22, 0, 0), new THREE.Vector3(0.22, 0, 0), new THREE.Vector3(0, -0.5, 0)]), FL[k % 4]);
        f.position.set(-8 + k, 11.25, 0.55);
        rig.add(f);
      }
    }
    rig.traverse((o) => o.isMesh && (o.userData.keep = true)); // 動かすので束ねない
    // たたんだ幕を巻いた筒（たたんでいる間だけ見える）
    const roll = add(g, new THREE.CylinderGeometry(0.35, 0.35, 16.4, 10), lam(0xe9e6dc), 0, 1.2, 0.4, 0, 0, Math.PI / 2);
    roll.userData.keep = true;
    G.cinRig = { rig, roll };
    // 幕の舟の、小さな舵小屋と灯り
    add(g, box(2.2, 2, 1.8), lam(0x2f3a44, { emissive: 0x0c0f12 }), 8.2, 1.8, 1.6);
    add(g, new THREE.SphereGeometry(0.2, 8, 6), glowMat(0xffd59a, 2), 8.2, 3.0, 0.6);
    // 舳と艫の、細い竿に下げた提灯
    for (const x of [-9.6, 9.6]) {
      add(g, new THREE.CylinderGeometry(0.03, 0.03, 2.2, 5), M.post, x, 1.9, -2.6);
      add(g, new THREE.SphereGeometry(0.18, 10, 8).scale(1, 1.3, 1), glowMat(0xffb070, 2.2), x, 2.95, -2.6);
    }
    HALL.cinH = moor(g, cinSites);
    // 陸の客席：映写台（小さな卓と映写機）と、湖へ向いた椅子の列・敷物・提灯。人の姿はなく、置かれた物だけ
    const sg = new THREE.Group(),
      chairM = lam(0x9a6b44),
      lens = glowMat(0xfff1d0, 3),
      lantern = glowMat(0xffb070, 2.2);
    add(sg, box(1.2, 1.0, 0.8), M.dark, 0, 0.5, -16);
    add(sg, box(0.6, 0.45, 0.9), lam(0x2a2a2c), 0, 1.25, -16);
    add(sg, new THREE.CylinderGeometry(0.16, 0.16, 0.25, 10), lens, 0, 1.3, -15.45, 0, Math.PI / 2);
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 8; k++) {
        const x = (k - 3.5) * 1.6 + (r % 2) * 0.4,
          z = -6 - r * 2.2;
        add(sg, box(0.55, 0.05, 0.5), chairM, x, 0.45, z);
        add(sg, box(0.55, 0.55, 0.04), chairM, x, 0.75, z - 0.25);
        for (const dx of [-0.24, 0.24]) add(sg, box(0.03, 0.45, 0.03), M.dark, x + dx, 0.22, z);
      }
    for (const [x, z, c] of [[-9, -5, 0xd8634f], [9.5, -6, 0x5b8fc4], [-10, -9, 0xe9c25a]]) add(sg, box(2.2, 0.03, 1.6), lam(c), x, 0.03, z, 0.2); // 敷物
    for (let k = 0; k < 9; k++) {
      const x = (k - 4) * 3;
      add(sg, new THREE.CylinderGeometry(0.03, 0.03, 2.4, 4), M.post, x, 1.2, -3.2);
      add(sg, new THREE.SphereGeometry(0.22, 8, 6), lantern, x, 2.5, -3.2);
    }
    mergeStatic(sg);
    scene.add(sg);

    // 光の筋：陸の映写機から、湖の幕まで（夜の上映中だけ）。長さ1の形を伸ばして向ける
    beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 5.5, 1, 16, 1, true).translate(0, -0.5, 0).rotateX(-Math.PI / 2), // 映写機で細く、幕で広い
      new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    );
    beam.userData.noRefl = true;
    scene.add(beam);
    // 客席（岸から実寸30〜80m奥）が陸の上に収まるまで、少しずつ奥へ
    const seatD = (q) => {
      const onLand = (dd) => [30, 55, 80].every((k) => [-1, 0, 1].every((w) => !inLake(q.sx - Math.cos(q.a) * (dd + k) - Math.sin(q.a) * w * 40, q.sy - Math.sin(q.a) * (dd + k) + Math.cos(q.a) * w * 40)));
      let d = 6;
      while (d < 200 && !onLand(d)) d += 10;
      return d;
    };
    placeLog("水上映画館の客席", "land", cinSites.map((q) => [q.sx - Math.cos(q.a) * (seatD(q) + 55), q.sy - Math.sin(q.a) * (seatD(q) + 55)]));
    // 着いた岸に、客席と光の筋を置く（客席の前が岸。陸の上の高さに合わせる）
    placeScreen = (q) => {
      const d = seatD(q),
        sx = q.sx - Math.cos(q.a) * d,
        sy = q.sy - Math.sin(q.a) * d,
        gy = landY(sx - Math.cos(q.a) * 50, sy - Math.sin(q.a) * 50);
      sg.position.set(sx * S, gy, sy * S);
      sg.rotation.y = Math.PI / 2 - q.a; // 椅子を湖へ向ける（+Z が湖）
      sg.updateMatrixWorld();
      const pr = new THREE.Vector3(0, 1.3, -15.45).applyMatrix4(sg.matrixWorld),
        sc = new THREE.Vector3(q.x * S, 7.4 * 1.2, q.y * S);
      beam.position.copy(pr);
      beam.scale.set(1, 1, pr.distanceTo(sc));
      beam.lookAt(sc);
    };
    placeScreen(cinSites[0]);
    G.cinParts = { sg, seats: sg };
  }
  Object.assign(HALL, { placeScreen, screenU, beam });
}
