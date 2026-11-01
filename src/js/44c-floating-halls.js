/* ---------- 湖に浮かぶ建築（2026年11月）：水上子ども図書館・水上映画館・水上音楽堂 ----------
   人の姿は出さず、置かれた物と灯りと音で、そこで過ごす誰かの気配を見せる。どれも岸の近くに係留され、波にゆっくり揺れる
   ・水上子ども図書館（近江舞子の浜）：ヨシ葺きの大きな八角屋根の、壁のない読書の間。本棚・丸い卓・座布団・ハンモック、
     屋根から岸の柱へ渡した三角旗、夕方は吊り灯籠が灯る。近づくと、ページをめくる音と風鈴
   ・水上映画館（長浜の岸）：岸に白い幕を張り、湖に浮かぶ映写小屋から光の筋が届く。幕の前の水面に、浮かぶ座布団の席が並ぶ。
     夏（6〜9月）の夜（19時半〜22時半）だけ、幕に古い湖の映像がぼんやり映り、映写機のカタカタという音
   ・水上音楽堂（菅浦の入江）：貝殻のように反った屋根の、六角の舞台。譜面台・琴・和太鼓・椅子。夕方は舞台の灯り。
     ときどき、遠くで練習の音（笛と琴の短い旋律）が流れて、すぐ止む */
{
  const R = rndFor("floating-halls");
  // 岸の近くの水の上の点：岸から沖へ off m。沖の向き（いちばん深い向き）も返す
  function spot(lo, la, off) {
    const [sx, sy] = shoreSnap(...ll(lo, la));
    let a = 0,
      bd = -1;
    for (let k = 0; k < 6.28; k += 0.1) {
      const d = inLake(sx + Math.cos(k) * 200, sy + Math.sin(k) * 200) ? depth(sx + Math.cos(k) * 200, sy + Math.sin(k) * 200) : -1;
      if (d > bd) (bd = d), (a = k);
    }
    return { x: sx + Math.cos(a) * off, y: sy + Math.sin(a) * off, sx, sy, a };
  }
  const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const add = (g, geo, m, x, y, z, ry = 0, rx = 0, rz = 0) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.rotation.set(rx, ry, rz);
    g.add(o);
    return o;
  };
  // 共通の材料
  const woodTx = cvTex(64, 64, (g, w, h) => {
    g.fillStyle = "#b08a5e";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) {
      g.fillStyle = `rgba(60,35,15,${(0.08 + Math.random() * 0.12).toFixed(2)})`;
      g.fillRect(0, y, w, 7);
      g.fillStyle = "rgba(40,25,10,.4)";
      g.fillRect(0, y + 7, w, 1);
    }
  });
  woodTx.wrapS = woodTx.wrapT = THREE.RepeatWrapping;
  woodTx.repeat.set(4, 4);
  const thatchTx = cvTex(64, 64, (g, w, h) => {
    g.fillStyle = "#b9965a";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) {
      g.strokeStyle = `rgba(${90 + Math.random() * 80},${70 + Math.random() * 50},30,.5)`;
      const x = Math.random() * w;
      g.beginPath();
      g.moveTo(x, Math.random() * h);
      g.lineTo(x + (Math.random() - 0.5) * 3, Math.random() * h);
      g.stroke();
    }
    for (let y = 8; y < h; y += 16) (g.fillStyle = "rgba(50,35,15,.35)"), g.fillRect(0, y, w, 2); // 葺き重ねの段
  });
  thatchTx.wrapS = thatchTx.wrapT = THREE.RepeatWrapping;
  thatchTx.repeat.set(5, 2);
  const M = {
    deck: lam(0xffffff, { map: woodTx, emissive: 0x120c06 }),
    dark: lam(0x4a3626),
    post: lam(0x6b4a30),
    thatch: lam(0xffffff, { map: thatchTx, emissive: 0x100c06, side: THREE.DoubleSide }),
    white: lam(0xf2efe6, { emissive: 0x1a1a18 }),
    float: lam(0x8a9aa4),
    rope: lam(0xcbb68c),
  };
  // 夜に灯る材質（灯籠・窓・舞台の灯り）：日暮れに灯る
  const lit = [];
  const glowMat = (c, k = 2) => {
    const m = new THREE.MeshBasicMaterial({ color: 0x3a3630 });
    m.userData.on = new THREE.Color(c).multiplyScalar(k);
    lit.push(m);
    return m;
  };
  // 浮き（ポンツーン）：丸い浮きを並べた上に床板
  function pontoon(g, rad, sides, h = 0.6) {
    add(g, new THREE.CylinderGeometry(rad, rad, h, sides), M.deck, 0, 0.55, 0);
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * Math.PI * 2;
      add(g, new THREE.CylinderGeometry(0.55, 0.55, rad * 0.5, 8), M.float, Math.cos(a) * rad * 0.75, 0.15, Math.sin(a) * rad * 0.75, -a, 0, Math.PI / 2);
    }
    // 縁の手すり
    for (let k = 0; k < sides * 2; k++) {
      const a = (k / (sides * 2)) * Math.PI * 2;
      add(g, box(0.12, 0.9, 0.12), M.post, Math.cos(a) * (rad - 0.2), 1.3, Math.sin(a) * (rad - 0.2));
    }
    const rail = new THREE.TorusGeometry(rad - 0.2, 0.06, 4, sides * 4);
    add(g, rail, M.post, 0, 1.75, 0, 0, Math.PI / 2);
  }
  const halls = [];
  function moor(g, sp, extraY = 0) {
    g.position.set(sp.x * S, extraY, sp.y * S);
    g.rotation.y = -sp.a + Math.PI / 2;
    scene.add(g);
    halls.push({ g, ph: R() * 6.28, x: sp.x * S, z: sp.y * S, y0: extraY });
    placeLog("湖に浮かぶ建築", "water", [[sp.x, sp.y]]);
  }

  // ---------- 1. 水上子ども図書館 ----------
  const lib = spot(135.9755, 35.2575, 110); // 近江舞子の浜の沖（白砂と松並木を背に）
  {
    const g = new THREE.Group(),
      Rr = 9;
    pontoon(g, Rr, 8);
    // 柱8本と、ヨシ葺きの大きな八角屋根（軒が深く、反り気味）
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      add(g, new THREE.CylinderGeometry(0.16, 0.2, 3.6, 6), M.post, Math.cos(a) * 6.5, 2.65, Math.sin(a) * 6.5);
    }
    add(g, new THREE.ConeGeometry(10.5, 4.6, 8, 1, true), M.thatch, 0, 6.6, 0, Math.PI / 8);
    add(g, new THREE.CylinderGeometry(10.5, 10.6, 0.5, 8, 1, true), M.thatch, 0, 4.3, 0, Math.PI / 8); // 軒の厚み
    add(g, new THREE.ConeGeometry(1.2, 1.4, 8), M.dark, 0, 9.3, 0); // 棟の押さえ
    // 本棚：外向きに4面、色とりどりの背表紙
    const bookTx = cvTex(64, 64, (c, w, h) => {
      c.fillStyle = "#5b4330";
      c.fillRect(0, 0, w, h);
      const cols = ["#c94c3c", "#e7b84a", "#3f7fb4", "#5f9a4e", "#e9e2cf", "#8a5aa6", "#d77a3a", "#2f5f6f"];
      for (let y = 2; y < h; y += 16)
        for (let x = 2; x < w - 2; ) {
          const bw = 2 + Math.random() * 4;
          c.fillStyle = cols[Math.floor(Math.random() * cols.length)];
          c.fillRect(x, y + Math.random() * 3, bw, 12);
          x += bw + 0.6;
        }
    });
    const shelf = lam(0xffffff, { map: bookTx, emissive: 0x0e0a06 });
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      add(g, box(3.4, 1.8, 0.6), shelf, Math.cos(a) * 2.4, 1.75, Math.sin(a) * 2.4, -a + Math.PI / 2);
    }
    // 丸い卓と座布団、置かれた本と麦わら帽子
    add(g, new THREE.CylinderGeometry(1.3, 1.3, 0.1, 16), M.deck, 4.6, 1.3, 2.2);
    add(g, new THREE.CylinderGeometry(0.15, 0.2, 0.5, 6), M.post, 4.6, 1.05, 2.2);
    const cush = [0xd8634f, 0xe9c25a, 0x5b8fc4, 0x7fae6a];
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      add(g, box(0.8, 0.18, 0.8), lam(cush[k]), 4.6 + Math.cos(a) * 1.8, 0.95, 2.2 + Math.sin(a) * 1.8, a);
    }
    add(g, box(0.5, 0.06, 0.35), lam(0xf1e7c8), 4.4, 1.38, 2.0, 0.4);
    add(g, box(0.45, 0.05, 0.32), lam(0x3f7fb4), 4.9, 1.38, 2.5, -0.2);
    add(g, new THREE.CylinderGeometry(0.5, 0.55, 0.05, 14), lam(0xe8cf8a), -5.2, 0.9, -3.6); // 麦わら帽子のつば
    add(g, new THREE.CylinderGeometry(0.22, 0.26, 0.2, 12), lam(0xe8cf8a), -5.2, 1.0, -3.6);
    // ハンモック（柱から柱へ）
    {
      const a1 = Math.PI / 8 + Math.PI * 1.25,
        a2 = a1 + Math.PI / 4,
        p1 = new THREE.Vector3(Math.cos(a1) * 6.5, 2.4, Math.sin(a1) * 6.5),
        p2 = new THREE.Vector3(Math.cos(a2) * 6.5, 2.4, Math.sin(a2) * 6.5),
        mid = p1.clone().add(p2).multiplyScalar(0.5);
      mid.y = 1.6;
      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.32, 5), lam(0xd9c9a3)));
    }
    // 吊り灯籠（夕方に灯る）
    const lanternM = glowMat(0xffc27a, 2.4);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      add(g, new THREE.SphereGeometry(0.35, 10, 8), lanternM, Math.cos(a) * 4.5, 3.6, Math.sin(a) * 4.5);
    }
    // 床に落ちる灯り（夜、床がほの明るい）
    add(g, new THREE.CircleGeometry(6, 24), glowMat(0x553a1c, 1), 0, 0.87, 0, 0, -Math.PI / 2);
    // 三角旗：屋根の軒から旗竿へ（色とりどり）
    add(g, new THREE.CylinderGeometry(0.1, 0.12, 6, 6), M.post, 11.5, 3.3, 0);
    for (let k = 0; k < 9; k++) {
      const u = k / 8,
        x = 6 + u * 5.5,
        y = 4.4 + Math.sin(u * Math.PI) * -0.8 + u * 1.5;
      const f = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.25, 0, 0), new THREE.Vector3(0.25, 0, 0), new THREE.Vector3(0, -0.6, 0)]), new THREE.MeshBasicMaterial({ color: [0xd8634f, 0xe9c25a, 0x5b8fc4, 0x7fae6a, 0xf2efe6][k % 5], side: THREE.DoubleSide }));
      f.position.set(x, y, 0);
      g.add(f);
    }
    // つないだ小舟
    add(g, box(4, 0.6, 1.4), lam(0x7a9ab0), 0, 0.3, Rr + 2, 0.15);
    moor(g, lib);
  }

  // ---------- 2. 水上映画館 ----------
  const cin = spot(136.258, 35.392, 160);
  const screenU = { uT: { value: 0 }, uOn: { value: 0 } };
  let beam = null;
  {
    // 岸の幕：2本の柱に白い大きな幕（16m×9m）。幕の面は湖の映写小屋へ向ける
    const sg = new THREE.Group(),
      sx = cin.sx + Math.cos(cin.a) * 6,
      sy = cin.sy + Math.cos(cin.a) * 0 + Math.sin(cin.a) * 6;
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
    add(sg, new THREE.PlaneGeometry(16, 9), scrM, 0, 7.5, 0);
    for (const s of [-8.4, 8.4]) add(sg, new THREE.CylinderGeometry(0.2, 0.25, 12, 6), M.post, s, 6, -0.2);
    add(sg, box(17, 0.3, 0.3), M.post, 0, 12.1, -0.2);
    // 岸に並ぶ空の椅子（数脚）
    for (let k = 0; k < 6; k++) {
      const x = -6 + k * 2.4;
      add(sg, box(0.9, 0.12, 0.9), lam(0x9a6b44), x, 0.75, 6, 0);
      add(sg, box(0.9, 0.9, 0.1), lam(0x9a6b44), x, 1.2, 6.45, 0);
    }
    sg.position.set(sx * S, landY(sx, sy), sy * S);
    sg.rotation.y = Math.PI / 2 - cin.a; // 幕の表（と椅子）を湖へ向ける
    scene.add(sg);
    placeLog("水上映画館の幕", "shore", [[sx, sy]]);
    // 湖の映写小屋：小さな浮き小屋。屋根の上に丸い映写の窓
    const g = new THREE.Group();
    pontoon(g, 4.2, 6, 0.5);
    add(g, box(4.4, 3, 3.6), lam(0x2f3a44, { emissive: 0x0c0f12 }), 0, 2.4, 0);
    add(g, box(5, 0.25, 4.2), M.dark, 0, 4.0, 0, 0, 0, 0.08);
    const lens = glowMat(0xfff1d0, 3);
    add(g, new THREE.CylinderGeometry(0.35, 0.35, 0.4, 12), lens, 0, 2.8, -1.85, 0, Math.PI / 2); // 岸の幕のほうへ
    moor(g, cin);
    // 光の筋：映写窓から幕まで（夜の上映中だけ）。加算の淡い円錐
    const L = Math.hypot(cin.x - sx, cin.y - sy) * S;
    beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 5.5, L, 16, 1, true).translate(0, -L / 2, 0).rotateX(-Math.PI / 2), // 映写窓で細く、幕で広い
      new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    );
    beam.position.set(cin.x * S, 2.8, cin.y * S);
    beam.lookAt(sx * S, landY(sx, sy) + 7.5, sy * S);
    beam.userData.noRefl = true;
    scene.add(beam);
    // 幕の前の水面：浮かぶ座布団の席（3列）
    const seatG = new THREE.CylinderGeometry(0.9, 0.9, 0.35, 10),
      seats = new THREE.InstancedMesh(seatG, lam(0xffffff), 21),
      Mx = new THREE.Matrix4(),
      c = new THREE.Color();
    let n = 0;
    for (let r = 0; r < 3; r++)
      for (let k = 0; k < 7; k++) {
        const t = 0.35 + r * 0.12,
          px = cin.x + (sx - cin.x) * t + Math.cos(cin.a + Math.PI / 2) * (k - 3) * 4.5 + (R() - 0.5),
          py = cin.y + (sy - cin.y) * t + Math.sin(cin.a + Math.PI / 2) * (k - 3) * 4.5 + (R() - 0.5);
        if (!inLake(px, py)) continue;
        Mx.makeTranslation(px * S, 0.25, py * S);
        seats.setMatrixAt(n, Mx);
        seats.setColorAt(n++, c.set([0xd8634f, 0xe9c25a, 0x5b8fc4, 0xe9e2cf][(r + k) % 4]));
      }
    seats.count = n;
    scene.add(seats);
  }

  // ---------- 3. 水上音楽堂 ----------
  const mus = spot(136.1335, 35.4795, 120);
  {
    const g = new THREE.Group();
    pontoon(g, 8, 6);
    // 貝殻のように反った屋根：半球を斜めに切った殻を、舞台の後ろから前へかぶせる
    const shell = new THREE.SphereGeometry(8, 24, 12, Math.PI * 0.32, Math.PI * 1.36, 0, Math.PI * 0.5);
    {
      const p = shell.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i),
          z = p.getZ(i),
          y = p.getY(i);
        p.setY(i, y * (0.8 + 0.2 * (x / 8)) + Math.max(0, -x) * 0.25); // 開いた口（前）ほど高く反る
      }
      shell.computeVertexNormals();
      shell.rotateY(Math.PI / 2); // 開いた口を湖（前）へ
    }
    add(g, shell, lam(0xf3efe4, { side: THREE.DoubleSide, emissive: 0x1c1b18 }), 0, 0.9, 0);
    // 舞台の床（一段高い木の床）
    add(g, new THREE.CylinderGeometry(6.2, 6.2, 0.3, 6), M.deck, 0, 1.0, 0, Math.PI / 6);
    // 譜面台と椅子（半円に5つ）
    for (let k = 0; k < 5; k++) {
      const a = Math.PI * (0.2 + 0.15 * k) + Math.PI;
      const x = Math.cos(a) * 3.2,
        z = Math.sin(a) * 3.2;
      add(g, new THREE.CylinderGeometry(0.03, 0.03, 1.2, 4), M.dark, x * 0.75, 1.75, z * 0.75);
      add(g, box(0.5, 0.35, 0.02), M.dark, x * 0.75, 2.3, z * 0.75, -a + Math.PI / 2, -0.3);
      add(g, box(0.5, 0.08, 0.5), lam(0x8a5a3a), x, 1.6, z);
      add(g, box(0.5, 0.5, 0.06), lam(0x8a5a3a), x * 1.08, 1.85, z * 1.08, -a + Math.PI / 2);
    }
    // 琴（長い胴）と和太鼓
    add(g, box(1.8, 0.12, 0.35), lam(0xb88c58), 1.2, 1.25, 1.6, 0.4);
    add(g, new THREE.CylinderGeometry(0.55, 0.55, 0.7, 14), lam(0x7a3a24), -1.8, 1.55, 1.2, 0, Math.PI / 2 - 0.2);
    add(g, new THREE.CircleGeometry(0.55, 14), lam(0xe9dcc0), -1.8, 1.55 + Math.sin(0.2) * 0.36, 1.2 + 0.35, 0, -0.2);
    // 舞台の灯り：殻の内側に小さな灯りを並べる
    const stageM = glowMat(0xffd59a, 2.2);
    for (let k = 0; k < 7; k++) {
      const a = Math.PI * (0.2 + (k / 6) * 0.6) + Math.PI;
      add(g, new THREE.SphereGeometry(0.22, 8, 6), stageM, Math.cos(a) * 6, 4.6, Math.sin(a) * 6);
    }
    add(g, new THREE.CircleGeometry(5.5, 24), glowMat(0x4a3418, 1), 0, 1.17, 0, 0, -Math.PI / 2);
    // 水に浮かぶ灯籠（まわりに5つ、夕方に灯る）
    const lantM = glowMat(0xffb86a, 2.4);
    for (let k = 0; k < 5; k++) {
      const a = R() * 6.28,
        r = 11 + R() * 5;
      add(g, box(0.6, 0.6, 0.6), lantM, Math.cos(a) * r, 0.45, Math.sin(a) * r, R());
    }
    moor(g, mus);
  }

  G.halls = { lib, cin, mus }; // 確認用（実寸の位置と沖の向き）
  // 毎フレーム：波にゆっくり揺れ、日暮れに灯り、夏の夜は上映、近づくと音
  const OFF = new THREE.Color(0x3a3630);
  let nextPage = 0,
    nextTune = 0,
    nextClick = 0;
  onFrame(132, (f) => {
    const t = f.t,
      c = f.c,
      h = c.phase * 24,
      lt = Math.min(1, Math.max(0, (0.22 - f.day) / 0.12)),
      late = h < 5 || h > 22.8 ? 0.15 : 1; // 夜更けは灯りを落とす
    for (const H of halls) {
      if (Math.abs(H.x - camera.position.x) > 3000 || Math.abs(H.z - camera.position.z) > 3000) continue;
      H.g.position.y = H.y0 + water.position.y + Math.sin(t * 0.7 + H.ph) * 0.12;
      H.g.rotation.z = Math.sin(t * 0.5 + H.ph) * 0.012 * (RM ? 0.3 : 1);
      H.g.rotation.x = Math.sin(t * 0.43 + H.ph * 2) * 0.01 * (RM ? 0.3 : 1);
    }
    for (const m of lit) m.color.lerpColors(OFF, m.userData.on, lt * late);
    // 上映：夏（6〜9月）の夜、19時半〜22時半
    const show = c.month >= 5 && c.month <= 8 && h > 19.5 && h < 22.5 ? Math.min(1, (h - 19.5) / 0.15, (22.5 - h) / 0.15) * lt : 0;
    screenU.uT.value = t;
    screenU.uOn.value = show;
    if (beam) {
      beam.visible = show > 0.01;
      beam.material.opacity = show * (0.07 + 0.015 * Math.sin(t * 23));
    }
    // 近くの音
    if (!SND.ctx || !SND.on || isFar || (SND.quiet || 0) > 0.3) return;
    const now = SND.ctx.currentTime,
      dOf = (p) => Math.hypot(p.x * S - camera.position.x, p.y * S - camera.position.z);
    const dl = dOf(lib),
      dm = dOf(mus),
      dc = dOf(cin);
    // 図書館：ページをめくる音（昼〜夕方）
    if (dl < 120 && h > 9 && h < 19 && now > nextPage) {
      nextPage = now + 4 + Math.random() * 9;
      nburst(6000, 1800, 0.18, 0.05 * (1 - dl / 120), panV(lib.x * S, lib.y * S), 0.5, 0.2);
    }
    // 映画館：映写機のカタカタ（上映中）
    if (show > 0.5 && dc < 160 && now > nextClick) {
      nextClick = now + 0.09;
      nburst(3000, 900, 0.025, 0.018 * (1 - dc / 160), panV(cin.x * S, cin.y * S), 1.5, 0.1);
    }
    // 音楽堂：ときどき遠くで練習の旋律（笛か琴、5〜8音の短い句）
    if (dm < 350 && h > 10 && h < 21 && now > nextTune) {
      nextTune = now + 40 + Math.random() * 70;
      const ac = SND.ctx,
        out = ac.createStereoPanner(),
        g0 = ac.createGain(),
        flute = Math.random() < 0.5,
        scale = [0, 2, 5, 7, 9, 12, 14],
        base = flute ? 74 : 62,
        n = 5 + Math.floor(Math.random() * 4);
      out.pan.value = panV(mus.x * S, mus.y * S) * 0.7;
      g0.gain.value = 0.5 * (1 - dm / 350);
      g0.connect(out).connect(SND.master);
      let st = now + 0.2;
      for (let k = 0; k < n; k++) {
        const f0 = 440 * Math.pow(2, (base + scale[Math.floor(Math.random() * scale.length)] - 69) / 12),
          d = flute ? 0.45 + Math.random() * 0.6 : 0.9,
          o = ac.createOscillator(),
          e = ac.createGain();
        o.type = flute ? "sine" : "triangle";
        o.frequency.value = f0;
        e.gain.setValueAtTime(0, st);
        e.gain.linearRampToValueAtTime(flute ? 0.035 : 0.05, st + (flute ? 0.08 : 0.005));
        if (flute) e.gain.setValueAtTime(0.035, st + d * 0.8);
        e.gain.exponentialRampToValueAtTime(1e-4, st + d * (flute ? 1 : 2));
        o.connect(e).connect(g0);
        o.start(st);
        o.stop(st + d * 2 + 0.1);
        st += flute ? d : 0.38 + Math.random() * 0.3;
      }
    }
  });
}
