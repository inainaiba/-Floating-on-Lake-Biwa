/* ---------- 山と水辺のいきもの：山肌を這う雲、竹林、トンボ、アオサギ ---------- */
G.life = (() => {
  const R = rnd(9393);
  // 竹林：集落の裏手に、ところどころ
  const bam = [];
  houses.forEach((h, i) => {
    if (i % 11 !== 3) return;
    for (let k = 0; k < 4; k++) {
      const x = h.x + Math.cos(h.rot + 1.57) * (60 + R() * 60) + (R() - 0.5) * 40,
        y = h.y + Math.sin(h.rot + 1.57) * (60 + R() * 60) + (R() - 0.5) * 40;
      if (!inLake(x, y)) bam.push([x, y, 0.6 + terrainAt(x, y) * S * VEX, 0.9 + R() * 0.4, R()]);
    }
  });
  if (bam.length) cardForest("bamboo", bam, 14, 8, 30, QUALITY.nearTrees[1], false);

  // 山肌を這う雲：雨上がりや曇りの日、山の中腹にゆっくり流れる白い雲
  const ctx = (() => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 64;
    const g = c.getContext("2d");
    for (let i = 0; i < 40; i++) {
      const x = 20 + Math.random() * 88,
        y = 22 + Math.random() * 20,
        r = 10 + Math.random() * 16,
        gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, "rgba(255,255,255,.35)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, 128, 64);
    }
    return new THREE.CanvasTexture(c);
  })();
  const clouds = [];
  for (let i = 0; i < 40; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctx, color: 0xf2f4f6, transparent: true, depthWrite: false, opacity: 0 }));
    s.visible = false;
    scene.add(s);
    clouds.push({ s, ok: false, ph: R() * 6 });
  }
  let cloudAt = null;
  const placeClouds = () => {
    const cx = camera.position.x,
      cz = camera.position.z;
    cloudAt = [cx, cz];
    for (const cl of clouds) {
      cl.ok = false;
      for (let k = 0; k < 30; k++) {
        const a = Math.random() * 6.28,
          d = 400 + Math.random() * 1600,
          x = cx + Math.cos(a) * d,
          z = cz + Math.sin(a) * d,
          hgt = terrainAt(x / S, z / S) * S * VEX;
        if (hgt > 35) {
          cl.s.position.set(x, hgt * (0.55 + Math.random() * 0.25), z);
          const w = 260 + Math.random() * 320;
          cl.s.scale.set(w, w * 0.32, 1);
          cl.ok = true;
          break;
        }
      }
    }
  };

  // トンボ：夏から秋の昼、ヨシ原の上を飛び交う
  const ND = 60,
    dfly = new THREE.InstancedMesh(
      (() => {
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0, 0, 0.06, 0, 0.02, -0.35, 0, 0.02, 0.35, 0.02, 0.02, 0], 3));
        return g;
      })(),
      new THREE.MeshBasicMaterial({ color: 0x3a3428, side: THREE.DoubleSide }),
      ND,
    );
  dfly.frustumCulled = false;
  dfly.visible = false;
  scene.add(dfly);
  const dps = [];
  let dAt = null;

  // アオサギ：浅瀬にじっと立つ大きなサギ
  const hm = new THREE.MeshLambertMaterial({ color: 0x8c9196 }),
    hd = new THREE.MeshLambertMaterial({ color: 0x3a3a3e });
  const heronG = new THREE.Group();
  {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), hm);
    body.scale.set(1.4, 0.8, 0.7);
    body.position.y = 1.05;
    heronG.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.7, 5), hm);
    neck.position.set(0.35, 1.45, 0);
    neck.rotation.z = -0.35;
    heronG.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), hm);
    head.position.set(0.48, 1.8, 0);
    heronG.add(head);
    const bill = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.3, 4).rotateZ(-Math.PI / 2), hd);
    bill.position.set(0.68, 1.78, 0);
    heronG.add(bill);
    for (const s of [-0.08, 0.08]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 4), hd);
      leg.position.set(-0.05, 0.4, s);
      heronG.add(leg);
    }
  }
  const herons = [];
  reedPts.forEach(([x, y], i) => {
    if (i % 140 !== 7 || herons.length > 24) return;
    for (let k = 0; k < 8; k++) {
      const a = R() * 6.28,
        xx = x + Math.cos(a) * 60,
        yy = y + Math.sin(a) * 60;
      const dp = depth(xx, yy);
      if (inLake(xx, yy) && dp > 0.2 && dp < 2) {
        const g = heronG.clone();
        g.position.set(xx * S, -0.35, yy * S);
        g.rotation.y = R() * 6.28;
        g.scale.setScalar(1.3);
        scene.add(g);
        herons.push(g);
        break;
      }
    }
  });

  const M = new THREE.Matrix4(),
    Qt = new THREE.Quaternion(),
    V = new THREE.Vector3(),
    Sc = new THREE.Vector3(1, 1, 1);
  // 田舟：ヨシ原の水際に舫われた細長い木の小舟
  const tabune = [];
  {
    const wd = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.95 }),
      g0 = new THREE.Group();
    const bot = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 5.2), wd);
    bot.position.y = 0.05;
    g0.add(bot);
    for (const sx of [-0.52, 0.52]) {
      const sd = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 5.2), wd);
      sd.position.set(sx, 0.2, 0);
      g0.add(sd);
    }
    const bow = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 0.08), wd);
    bow.position.set(0, 0.22, -2.6);
    bow.rotation.x = -0.5;
    g0.add(bow);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4.5, 4), new THREE.MeshStandardMaterial({ color: 0x8a8a5a }));
    pole.position.set(0.2, 0.32, 0);
    pole.rotation.x = Math.PI / 2;
    g0.add(pole);
    reedPts.forEach(([x, y], i) => {
      if (i % 97 !== 11 || tabune.length > 40) return;
      for (let k = 0; k < 6; k++) {
        const a = R() * 6.28,
          xx = x + Math.cos(a) * 25,
          yy = y + Math.sin(a) * 25,
          dp = depth(xx, yy);
        if (inLake(xx, yy) && dp > 0.1 && dp < 1.5) {
          const g = g0.clone();
          g.position.set(xx * S, -0.12, yy * S);
          g.rotation.y = a + 1.57 + (R() - 0.5) * 0.6;
          g.userData.ph = R() * 6.28;
          scene.add(g);
          tabune.push(g);
          break;
        }
      }
    });
  }
  // 家々の灯り：日暮れから一軒ずつ灯り、夜更けに一軒ずつ消える
  const wN = winGeo.attributes.color.count,
    wBase = winGeo.attributes.color.array.slice(),
    wOn = new Float32Array(wN),
    wOff = new Float32Array(wN),
    wMorn = new Float32Array(wN);
  for (let i = 0; i < wN; i++) {
    wOn[i] = 0.7 + R() * 0.1;
    wOff[i] = 0.9 + R() * 0.2;
    wMorn[i] = R() < 0.25 ? 0.19 + R() * 0.06 : 9;
  }
  let wT = 0;
  // ススキ：秋（9〜11月）、田のあぜと山すそに穂が揺れる
  const susT = { value: 0 };
  const susuki = (() => {
    const tex = cvTex(64, 128, (g, w, h) => {
      for (let k = 0; k < 14; k++) {
        const x0 = w * (0.2 + Math.random() * 0.6),
          lean = (Math.random() - 0.5) * 22,
          top = h * (0.08 + Math.random() * 0.2);
        g.strokeStyle = "rgba(150,140,95,1)";
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(x0, h);
        g.quadraticCurveTo(x0 + lean * 0.3, h * 0.5, x0 + lean, top + 18);
        g.stroke();
        // 穂：先がしなって垂れる
        g.fillStyle = "rgba(236,226,204,.95)";
        for (let j = 0; j < 9; j++) {
          g.beginPath();
          g.ellipse(x0 + lean + j * 0.9, top + j * 2.2, 2.2, 3.6, 0.4, 0, 6.28);
          g.fill();
        }
      }
      g.strokeStyle = "rgba(110,120,70,1)";
      g.lineWidth = 2;
      for (let k = 0; k < 10; k++) {
        const x0 = Math.random() * w;
        g.beginPath();
        g.moveTo(x0, h);
        g.quadraticCurveTo(x0 + 6, h * 0.7, x0 + (Math.random() - 0.5) * 30, h * 0.55);
        g.stroke();
      }
    });
    const geo = new THREE.PlaneGeometry(2.4, 3.2).translate(0, 1.6, 0),
      g2 = geo.clone().rotateY(Math.PI / 2),
      gm = new THREE.BufferGeometry();
    for (const k of ["position", "uv", "normal"]) {
      const A = geo.attributes[k],
        B = g2.attributes[k],
        arr = new Float32Array(A.array.length * 2);
      arr.set(A.array);
      arr.set(B.array, A.array.length);
      gm.setAttribute(k, new THREE.BufferAttribute(arr, A.itemSize));
    }
    gm.setIndex([...geo.index.array, ...[...g2.index.array].map((i) => i + 4)]);
    const mat = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.45, side: THREE.DoubleSide });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uSw = susT;
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uSw;")
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvec4 sw=modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.);float sd=length(cameraPosition.xz-sw.xz);float k=position.y*position.y*.05;transformed.x+=(sin(uSw*1.6+sw.x*.07+sw.z*.05)*.6+sin(uSw*3.3+sw.z*.11)*.25)*k;transformed.z+=sin(uSw*1.2+sw.x*.05)*.3*k;transformed*=1.-smoothstep(260.,380.,sd);",
        );
    };
    const pts = [];
    paddies.forEach((p, i) => {
      if (i % 3 !== 2) return;
      for (let k = 0; k < 4; k++) {
        const a = R() * 6.28,
          d = 10 + R() * 14;
        pts.push([p.x + Math.cos(a) * d, p.y + Math.sin(a) * d]);
      }
    });
    // 湖岸の堤：岸から少し陸に入ったところ
    for (let n = 0; n < 6000; n++) {
      const sg = Math.floor(R() * (outer.length - 1)),
        A = outer[sg],
        B = outer[sg + 1],
        u = R(),
        bx = A[0] + (B[0] - A[0]) * u,
        by = A[1] + (B[1] - A[1]) * u,
        L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1,
        d = 18 + R() * 30;
      for (const sgn of [1, -1]) {
        const x = bx - ((B[1] - A[1]) / L) * d * sgn,
          y = by + ((B[0] - A[0]) / L) * d * sgn;
        if (!inLake(x, y)) {
          for (let q = 0; q < 4; q++) pts.push([x + (R() - 0.5) * 8, y + (R() - 0.5) * 8]);
          break;
        }
      }
    }
    const ok = pts.reverse().filter(([x, y]) => !inLake(x, y)).slice(0, MOBILE ? 8000 : 22000);
    const im = new THREE.InstancedMesh(gm, mat, Math.max(1, ok.length)),
      M2 = new THREE.Matrix4(),
      Q2 = new THREE.Quaternion(),
      cc = new THREE.Color();
    ok.forEach(([x, y], i) => {
      const s = 1.4 + R() * 0.9;
      Q2.setFromAxisAngle(new THREE.Vector3(0, 1, 0), R() * 6.28);
      M2.compose(new THREE.Vector3(x * S, 0.55 + terrainAt(x, y) * S * VEX, y * S), Q2, new THREE.Vector3(s, s, s));
      im.setMatrixAt(i, M2);
      im.setColorAt(i, cc.setHSL(0.11 + R() * 0.03, 0.25, 0.75 + R() * 0.15));
    });
    im.visible = false;
    scene.add(im);
    return im;
  })();
  // 遠くの舟の航跡：静かな湖面に細く長く残るV字の筋
  const wakes = (G.ambience ? G.ambience.boats : []).map((b) => {
    const N = 60,
      pos = new Float32Array(N * 3 * 2 * 3),
      col = new Float32Array(N * 3 * 2 * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const idx = [];
    for (let r = 0; r < 3; r++)
      for (let i = 0; i < N - 1; i++) {
        const o = (r * N + i) * 2;
        idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2);
      }
    geo.setIndex(idx);
    const m = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    );
    m.frustumCulled = false;
    m.visible = false;
    scene.add(m);
    return { b, m, N, hist: [], acc: 0 };
  });
  // 波頭のしぶき：強風の日、白波の先から細かな水しぶきが風下へ飛ぶ
  const SPN = 600,
    spPos = new Float32Array(SPN * 3),
    spV = new Float32Array(SPN * 3),
    spL = new Float32Array(SPN);
  const spGeo = new THREE.BufferGeometry();
  spGeo.setAttribute("position", new THREE.BufferAttribute(spPos, 3));
  const spray = new THREE.Points(
    spGeo,
    new THREE.PointsMaterial({ color: 0xf4f8fa, size: 0.35, map: G.dotTex, transparent: true, opacity: 0.75, depthWrite: false }),
  );
  spray.frustumCulled = false;
  spray.visible = false;
  scene.add(spray);
  // 遊覧船：白い大きな船が、遠くをゆっくり横切る
  const ship = (() => {
    const g = new THREE.Group(),
      wh = new THREE.MeshStandardMaterial({ color: 0xf4f2ec, roughness: 0.55 }),
      bl = new THREE.MeshStandardMaterial({ color: 0x24406a, roughness: 0.6 }),
      rd = new THREE.MeshStandardMaterial({ color: 0xa83a2a, roughness: 0.6 }),
      gl = new THREE.MeshStandardMaterial({ color: 0x27323c, roughness: 0.15, metalness: 0.3 }),
      rl = new THREE.MeshStandardMaterial({ color: 0xdedcd4, roughness: 0.6 });
    // 平面形：舳先は細く尖り、船尾は丸い（x が船首方向）
    const plan = (L, B, bowK = 0.42, sternR = 0.5) => {
      const sh = new THREE.Shape(),
        hb = B / 2,
        xb = L / 2 - L * bowK,
        xs = -L / 2 + hb * sternR;
      sh.moveTo(xs, -hb);
      sh.lineTo(xb, -hb);
      sh.bezierCurveTo(xb + L * bowK * 0.55, -hb, L / 2 - L * 0.03, -hb * 0.35, L / 2, 0);
      sh.bezierCurveTo(L / 2 - L * 0.03, hb * 0.35, xb + L * bowK * 0.55, hb, xb, hb);
      sh.lineTo(xs, hb);
      sh.bezierCurveTo(xs - hb * sternR * 0.9, hb, -L / 2, hb * 0.6, -L / 2, 0);
      sh.bezierCurveTo(-L / 2, -hb * 0.6, xs - hb * sternR * 0.9, -hb, xs, -hb);
      return sh;
    };
    const slab = (L, B, h, m, y, x = 0, bowK, sternR, bevel = 0.25) => {
      const geo = new THREE.ExtrudeGeometry(plan(L, B, bowK, sternR), {
        depth: h,
        bevelEnabled: bevel > 0,
        bevelSize: bevel,
        bevelThickness: bevel,
        bevelSegments: 3,
        curveSegments: 16,
      }).rotateX(-Math.PI / 2);
      const o = new THREE.Mesh(geo, m);
      o.position.set(x, y, 0);
      o.castShadow = true;
      g.add(o);
      return o;
    };
    // 船体：喫水線から上へ広がるように、少しずつ大きい層を重ねる
    slab(32, 6.6, 0.6, bl, -0.2, 0, 0.42, 0.6, 0.2);
    slab(33, 7.4, 1.2, wh, 0.4, 0, 0.42, 0.6, 0.3);
    slab(33.6, 7.9, 1.4, wh, 1.6, 0, 0.42, 0.6, 0.3);
    slab(33.8, 8.0, 0.25, rd, 2.95, 0, 0.42, 0.6, 0.05);
    // 甲板の手すり
    slab(33.4, 7.7, 0.08, rl, 3.9, 0, 0.42, 0.6, 0);
    // 1層目の客室：連続窓
    slab(24, 6.6, 0.5, wh, 3.2, -2.5, 0.25, 0.9, 0.15);
    slab(24.2, 6.8, 1.1, gl, 3.75, -2.5, 0.25, 0.9, 0.08);
    slab(24, 6.6, 0.45, wh, 4.85, -2.5, 0.25, 0.9, 0.15);
    // 2層目
    slab(17, 5.8, 0.4, wh, 5.4, -3.5, 0.22, 0.9, 0.12);
    slab(17.2, 6.0, 1.0, gl, 5.85, -3.5, 0.22, 0.9, 0.06);
    slab(17, 5.8, 0.4, wh, 6.85, -3.5, 0.22, 0.9, 0.12);
    slab(16.6, 5.6, 0.06, rl, 7.9, -3.5, 0.22, 0.9, 0);
    // 操舵室
    slab(5.5, 4.4, 0.9, gl, 7.35, 1.2, 0.3, 0.9, 0.06);
    slab(5.6, 4.6, 0.3, wh, 8.25, 1.2, 0.3, 0.9, 0.1);
    // 煙突：少し後ろへ傾いた楕円
    const fun = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.95, 3.2, 16), rd);
    fun.scale.set(1.4, 1, 0.9);
    fun.position.set(-6.5, 9.2, 0);
    fun.rotation.z = 0.12;
    g.add(fun);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.4, 16), bl);
    cap.scale.set(1.4, 1, 0.9);
    cap.position.set(-6.7, 10.9, 0);
    cap.rotation.z = 0.12;
    g.add(cap);
    // マスト
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 4, 6), rl);
    mast.position.set(2.2, 10.3, 0);
    g.add(mast);
    g.visible = false;
    scene.add(g);
    return { g, on: false, x: 0, z: 0, dx: 0, dz: 0, life: 0 };
  })();
  // シジミ漁の舟：瀬田川の近くの浅い水面で、長い柄の道具を操る
  const shijimi = [];
  {
    const wd = new THREE.MeshLambertMaterial({ color: 0x4e4436 }),
      mn = new THREE.MeshLambertMaterial({ color: 0x2c2e34 }),
      ht = new THREE.MeshLambertMaterial({ color: 0xd6d0c0 }),
      g0 = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 5.5), wd);
    hull.position.y = 0.15;
    g0.add(hull);
    const man = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 1.15, 6), mn);
    man.position.set(0, 0.95, 1.2);
    g0.add(man);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.22, 8), ht);
    hat.position.set(0, 1.65, 1.2);
    g0.add(hat);
    // 長い柄の鋤簾（じょれん）：水中へ斜めに差し込む
    const arm = new THREE.Group();
    arm.position.set(0, 1.2, 1.2);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 7, 4).translate(0, -3.5, 0), new THREE.MeshLambertMaterial({ color: 0x9a8a62 }));
    arm.add(pole);
    arm.rotation.x = 0.9;
    g0.add(arm);
    const [sx, sy] = ll(135.906, 35.003);
    for (let n = 0; n < 400 && shijimi.length < 5; n++) {
      const x = sx + (R() - 0.5) * 3000,
        y = sy + (R() - 0.5) * 3000,
        dp = depth(x, y);
      if (inLake(x, y) && dp > 0.8 && dp < 4 && shijimi.every((b) => Math.hypot(b.position.x - x * S, b.position.z - y * S) > 60)) {
        const g = g0.clone();
        g.position.set(x * S, -0.1, y * S);
        g.rotation.y = R() * 6.28;
        g.userData.arm = g.children[3];
        g.userData.ph = R() * 6.28;
        scene.add(g);
        shijimi.push(g);
      }
    }
  }
  // 水辺の林：ヤナギ・ハンノキが浅い水に浸かって立つ（奥の洲のような木立）
  const wet = (() => {
    const pts = [];
    reedPts.forEach(([x, y], i) => {
      if (i % 23 !== 5) return;
      const a = R() * 6.28,
        xx = x + Math.cos(a) * 15,
        yy = y + Math.sin(a) * 15,
        dp = depth(xx, yy);
      if (dp < 0.7) for (let k = 0; k < 3; k++) pts.push([xx + (R() - 0.5) * 30, yy + (R() - 0.5) * 30]);
    });
    const P = pts.slice(0, MOBILE ? 400 : 1200),
      trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.3, 4, 5).translate(0, 2, 0), new THREE.MeshLambertMaterial({ color: 0x4a4038 }), Math.max(1, P.length)),
      crownG = new THREE.IcosahedronGeometry(2.6, 1);
    {
      // 枝垂れた形：下へ伸ばし、裾を広げる
      const p = crownG.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i);
        p.setY(i, y < 0 ? y * 1.5 : y * 0.8);
        const k = y < 0 ? 1.15 : 0.9;
        p.setX(i, p.getX(i) * k + (R() - 0.5) * 0.5);
        p.setZ(i, p.getZ(i) * k + (R() - 0.5) * 0.5);
      }
      crownG.computeVertexNormals();
    }
    const cm = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
      crown = new THREE.InstancedMesh(crownG, cm, Math.max(1, P.length)),
      M2 = new THREE.Matrix4(),
      Q2 = new THREE.Quaternion(),
      cc = new THREE.Color();
    P.forEach(([x, y], i) => {
      const s = 0.8 + R() * 0.6,
        gy = Math.max(-0.3, terrainAt(x, y) * S * VEX);
      Q2.setFromAxisAngle(new THREE.Vector3(0, 1, 0), R() * 6.28);
      M2.compose(new THREE.Vector3(x * S, gy - 0.3, y * S), Q2, new THREE.Vector3(s, s * (0.9 + R() * 0.4), s));
      trunk.setMatrixAt(i, M2);
      M2.compose(new THREE.Vector3(x * S, gy - 0.3 + 4.6 * s, y * S), Q2, new THREE.Vector3(s, s, s));
      crown.setMatrixAt(i, M2);
      // ヤナギは明るい黄緑、ハンノキは濃い緑
      crown.setColorAt(i, R() < 0.55 ? cc.setHSL(0.2 + R() * 0.03, 0.42, 0.42) : cc.setHSL(0.27, 0.35, 0.26));
    });
    trunk.castShadow = crown.castShadow = QUALITY.treeShadow;
    scene.add(trunk, crown);
    return { crown, cm };
  })();
  // えり：浅い沖に竹竿を一列に立て、先を矢じりの形に囲う湖の定置網
  {
    const P = [];
    const cand = [];
    for (let i = 0; i < outer.length - 1; i += 3) cand.push(i);
    for (let n = 0; n < cand.length && P.length < 30 * 90; n++) {
      if (R() > 0.12) continue;
      const i = cand[n],
        [ax, ay] = outer[i],
        [bx, by] = outer[i + 1],
        L = Math.hypot(bx - ax, by - ay) || 1;
      // 岸から沖へ向かう向き（湖の内側へ）
      let nx = -(by - ay) / L,
        ny = (bx - ax) / L;
      if (!inLake(ax + nx * 40, ay + ny * 40)) (nx = -nx), (ny = -ny);
      if (!inLake(ax + nx * 40, ay + ny * 40)) continue;
      const len = 150 + R() * 250,
        tx = -ny,
        ty = nx;
      const pts = [];
      for (let d = 20; d < len; d += 4) pts.push([ax + nx * d, ay + ny * d]);
      // 先の矢じり：左右に開いて戻る
      const ex = ax + nx * len,
        ey = ay + ny * len;
      for (const s of [-1, 1])
        for (let k = 0; k < 14; k++) {
          const u = k / 13,
            w = Math.sin(u * Math.PI) * 30;
          pts.push([ex + nx * u * 60 + tx * s * w, ey + ny * u * 60 + ty * s * w]);
        }
      if (pts.every(([x, y]) => inLake(x, y) && depth(x, y) < 5)) for (const p of pts) P.push(p);
    }
    const eri = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.05, 1, 5).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: 0x3a3630 }), Math.max(1, P.length)),
      M2 = new THREE.Matrix4(),
      Q2 = new THREE.Quaternion(),
      E2 = new THREE.Euler();
    P.forEach(([x, y], i) => {
      const h = 3 + R() * 2.5;
      Q2.setFromEuler(E2.set((R() - 0.5) * 0.12, 0, (R() - 0.5) * 0.12));
      M2.compose(new THREE.Vector3(x * S, -1.2, y * S), Q2, new THREE.Vector3(1, h + 1.2, 1));
      eri.setMatrixAt(i, M2);
    });
    eri.castShadow = false;
    scene.add(eri);
    G.eriMesh = eri;
  }
  // 湖岸の松並木：近江舞子・北小松・萩の浜・宮ヶ浜の白砂青松
  {
    const SITES = [
      [135.958, 35.262, 1400],
      [135.972, 35.284, 900],
      [136.043, 35.334, 900],
      [136.082, 35.172, 800],
    ].map(([lo, la, r]) => [...ll(lo, la), r]);
    const P = [];
    for (let i = 0; i < outer.length - 1; i++) {
      const [x1, y1] = outer[i],
        [x2, y2] = outer[i + 1],
        L = Math.hypot(x2 - x1, y2 - y1);
      if (L < 1 || !SITES.some(([sx, sy, r]) => Math.hypot(x1 - sx, y1 - sy) < r)) continue;
      let nx = -(y2 - y1) / L,
        ny = (x2 - x1) / L;
      if (inLake(x1 + nx * 30, y1 + ny * 30)) (nx = -nx), (ny = -ny);
      for (let s = 0; s < L; s += 9)
        for (let k = 0; k < 2; k++) {
          const off = 14 + R() * 45,
            x = x1 + ((x2 - x1) * s) / L + nx * off + (R() - 0.5) * 8,
            y = y1 + ((y2 - y1) * s) / L + ny * off + (R() - 0.5) * 8;
          if (inLake(x, y) || inInner(x, y)) continue;
          P.push([x, y, 0.6 + terrainAt(x, y) * S * VEX, 0.9 + R() * 0.5, R()]);
        }
    }
    if (P.length) cardForest("pine", P, 11, 7, 60, 3500, QUALITY.treeShadow);
  }
  function update(dt, t, c, day, wxNow) {
    const cx = camera.position.x,
      cz = camera.position.z;
    // 雲
    const want = day > 0.05 ? Math.min(1, Math.max(0, (wxNow.gray - 0.35) * 2) + wxNow.rain * 0.8 + wxNow.white * 0.6) : 0;
    if (want > 0.02 && (!cloudAt || Math.hypot(cloudAt[0] - cx, cloudAt[1] - cz) > 1200)) placeClouds();
    for (const cl of clouds) {
      cl.s.visible = cl.ok && want > 0.02 && !isFar;
      if (!cl.s.visible) continue;
      cl.s.position.x += Math.cos(cl.ph) * dt * 1.2;
      cl.s.position.z += Math.sin(cl.ph) * dt * 1.2;
      cl.s.material.opacity = want * (0.55 + 0.25 * Math.sin(t * 0.05 + cl.ph));
    }
    // トンボ
    const summer = c.month >= 5 && c.month <= 9 && day > 0.25 && wxNow.rain < 0.2;
    dfly.visible = false; // 整理：トンボは出さない
    if (summer) {
      if (!dAt || Math.hypot(dAt[0] - cx, dAt[1] - cz) > 250) {
        dAt = [cx, cz];
        dps.length = 0;
        const near = reedPts.filter(([x, y]) => Math.hypot(x * S - cx, y * S - cz) < 260);
        for (let i = 0; i < ND; i++) {
          const p = near.length ? near[Math.floor(Math.random() * near.length)] : [cx / S, cz / S];
          dps.push([p[0] * S + (Math.random() - 0.5) * 20, p[1] * S + (Math.random() - 0.5) * 20, Math.random() * 6.28, near.length ? 1 : 0]);
        }
      }
      dps.forEach(([x, z, ph, ok], i) => {
        if (!ok) {
          M.makeScale(0, 0, 0);
          dfly.setMatrixAt(i, M);
          return;
        }
        const k = t * (0.6 + (i % 5) * 0.1) + ph,
          xx = x + Math.sin(k) * 6 + Math.sin(k * 3.1) * 1.5,
          zz = z + Math.cos(k * 0.8) * 6,
          yy = 2.2 + Math.sin(k * 2.3) * 0.6;
        Qt.setFromAxisAngle(V.set(0, 1, 0), -k);
        M.compose(V.set(xx, yy, zz), Qt, Sc);
        dfly.setMatrixAt(i, M);
      });
      dfly.instanceMatrix.needsUpdate = true;
    }
    for (const g of tabune) {
      g.position.y = -0.12 + Math.sin(t * 0.8 + g.userData.ph) * 0.03;
      g.rotation.z = Math.sin(t * 0.6 + g.userData.ph) * 0.02;
    }
    wT -= dt;
    if (wT <= 0) {
      wT = 0.5;
      const p = c.phase,
        ar = winGeo.attributes.color.array;
      for (let i = 0; i < wN; i++) {
        const on = p >= wOn[i] ? p < wOff[i] : p + 1 < wOff[i] || (p >= wMorn[i] && p < 0.3);
        const k = on ? 1 : 0;
        ar[i * 3] = wBase[i * 3] * k;
        ar[i * 3 + 1] = wBase[i * 3 + 1] * k;
        ar[i * 3 + 2] = wBase[i * 3 + 2] * k;
      }
      winGeo.attributes.color.needsUpdate = true;
    }
    susT.value = t;
    susuki.visible = c.month >= 8 && c.month <= 10;
    for (const w of wakes) {
      const b = w.b;
      if (!b.on) {
        w.m.visible = false;
        w.hist.length = 0;
        continue;
      }
      w.acc += dt;
      if (w.acc > 0.5 || !w.hist.length) {
        w.acc = 0;
        w.hist.unshift([b.g.position.x, b.g.position.z]);
        if (w.hist.length > w.N) w.hist.pop();
      }
      const H = [[b.g.position.x, b.g.position.z], ...w.hist].slice(0, w.N),
        n = H.length;
      if (n < 3) continue;
      w.m.visible = true;
      const P = w.m.geometry.attributes.position.array,
        C = w.m.geometry.attributes.color.array,
        calm = waterU.uCalm.value,
        yy = 0.08;
      P.fill(0);
      C.fill(0);
      for (let r = 0; r < 3; r++)
        for (let i = 0; i < w.N; i++) {
          const j = Math.min(i, n - 1),
            j2 = Math.min(j + 1, n - 1),
            j0 = Math.max(j - 1, 0);
          let dx = H[j0][0] - H[j2][0],
            dz = H[j0][1] - H[j2][1];
          const L = Math.hypot(dx, dz) || 1;
          dx /= L;
          dz /= L;
          const nx = -dz,
            nz = dx,
            u = i / (w.N - 1),
            age = Math.hypot(H[j][0] - H[0][0], H[j][1] - H[0][1]);
          // r=0：中央の静かな筋　r=1,2：左右に開くV字の波
          const off = r === 0 ? 0 : (r === 1 ? 1 : -1) * (1 + age * 0.34),
            wd = r === 0 ? 0.8 + u * 4 : 0.35 + u * 0.8,
            a = (1 - u) * (i < n ? 1 : 0) * (r === 0 ? 0.1 : 0.2) * (0.4 + calm * 0.8) * Math.min(1, day * 3);
          const cx = H[j][0] + nx * off,
            cz = H[j][1] + nz * off;
          for (let e = 0; e < 2; e++) {
            const s = e ? 1 : -1,
              o = ((r * w.N + i) * 2 + e) * 3;
            P[o] = cx + nx * wd * s * 0.5;
            P[o + 1] = yy;
            P[o + 2] = cz + nz * wd * s * 0.5;
            C[o] = C[o + 1] = a;
            C[o + 2] = a * 1.05;
          }
        }
      w.m.geometry.attributes.position.needsUpdate = true;
      w.m.geometry.attributes.color.needsUpdate = true;
    }
    {
      const Wd = G.W || { x: 0, y: 0, s: 0 },
        ws = Wd.s || Math.hypot(Wd.x, Wd.y),
        str = Math.min(1, Math.max(0, (ws - 5) / 5)) * (wxNow.snow > 0.5 ? 0.3 : 1);
      spray.visible = false; // 整理：しぶきの粒は出さない
      if (spray.visible) {
        const cx = camera.position.x,
          cz = camera.position.z,
          ux = Wd.x / (ws || 1),
          uz = Wd.y / (ws || 1);
        for (let i = 0; i < SPN; i++) {
          const o = i * 3;
          spL[i] -= dt;
          if (spL[i] <= 0) {
            if (Math.random() > str * 0.9) {
              spPos[o + 1] = -99;
              spL[i] = Math.random() * 0.6;
              continue;
            }
            // しぶきは白波の位置で、まとまって飛ぶ
            const a = Math.random() * 6.28,
              d = 6 + Math.random() * 90,
              bx = cx + Math.cos(a) * d,
              bz = cz + Math.sin(a) * d;
            if (!inLake(bx / S, bz / S)) {
              spPos[o + 1] = -99;
              spL[i] = 0.3;
              continue;
            }
            spPos[o] = bx;
            spPos[o + 1] = 0.3;
            spPos[o + 2] = bz;
            const v = 2 + Math.random() * 4;
            spV[o] = ux * v + (Math.random() - 0.5);
            spV[o + 1] = 1.2 + Math.random() * 2;
            spV[o + 2] = uz * v + (Math.random() - 0.5);
            spL[i] = 0.6 + Math.random() * 0.8;
          } else if (spPos[o + 1] > -50) {
            spV[o + 1] -= 6 * dt;
            spPos[o] += spV[o] * dt;
            spPos[o + 1] = Math.max(0.05, spPos[o + 1] + spV[o + 1] * dt);
            spPos[o + 2] += spV[o + 2] * dt;
          }
        }
        spGeo.attributes.position.needsUpdate = true;
        spray.material.opacity = 0.5 + str * 0.35;
      }
    }
    {
      const cx = camera.position.x,
        cz = camera.position.z;
      if (!ship.on && day > 0.25 && wxNow.rain < 0.3 && Math.random() < dt / 90) {
        for (let k = 0; k < 15; k++) {
          const a = Math.random() * 6.28,
            d = 700 + Math.random() * 700,
            x = cx + Math.cos(a) * d,
            z = cz + Math.sin(a) * d;
          if (inMain(x / S, z / S) && depth(x / S, z / S) > 5) {
            const h = a + (Math.random() < 0.5 ? 1.57 : -1.57);
            Object.assign(ship, { on: true, x, z, dx: Math.cos(h), dz: Math.sin(h), life: 400 });
            ship.g.visible = true;
            break;
          }
        }
      }
      if (ship.on) {
        ship.life -= dt;
        ship.x += ship.dx * 3.5 * dt;
        ship.z += ship.dz * 3.5 * dt;
        const gone = ship.life <= 0 || day < 0.1 || !inMain(ship.x / S, ship.z / S) || depth(ship.x / S, ship.z / S) < 3 || Math.hypot(ship.x - cx, ship.z - cz) > 2200;
        if (gone) {
          ship.on = false;
          ship.g.visible = false;
        } else {
          ship.g.position.set(ship.x, waveH(ship.x, ship.z, t) * 0.3 - 0.2, ship.z);
          ship.g.rotation.set(0, -Math.atan2(ship.dz, ship.dx), Math.sin(t * 0.5) * 0.008);
        }
      }
    }
    for (const g of shijimi) {
      const k = t * 0.5 + g.userData.ph;
      g.userData.arm.rotation.x = 0.85 + Math.sin(k) * 0.18;
      g.userData.arm.rotation.z = Math.sin(k * 0.5) * 0.15;
      g.position.y = -0.1 + Math.sin(t * 0.9 + g.userData.ph) * 0.03;
      g.visible = day > 0.15;
    }
    // 水辺の林の季節：冬は葉を落として枝の灰色、春は芽吹きの淡い緑、秋は黄色
    wet.cm.color.setHex([0x8a8478, 0x8a8478, 0xc8d8a0, 0xe0f0c0, 0xffffff, 0xffffff, 0xffffff, 0xffffff, 0xf4f0c0, 0xf0d890, 0xd8b880, 0x9a9080][c.month]);
    // サギはときどき首をかしげる
    for (const h of herons) h.visible = false; // 水辺のサギは出さない
  }
  G.camera = camera;
  return { update, herons, bam, tabune, susuki, ship };
})();
