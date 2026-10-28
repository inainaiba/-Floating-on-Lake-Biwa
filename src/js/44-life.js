/* ---------- 山と水辺の植物と雲：竹林、山肌を這う雲、ススキ、水辺の林、湖岸の松並木 ---------- */
G.life = (() => {
  const R = rnd(9393);
  // 竹林：集落の裏手に、ところどころ
  const bam = [];
  if (LOOK.show.bamboo) {
  const R = rndFor("bamboo");
  houses.forEach((h, i) => {
    if (i % 11 !== 3) return;
    for (let k = 0; k < 4; k++) {
      const x = h.x + Math.cos(h.rot + 1.57) * (60 + R() * 60) + (R() - 0.5) * 40,
        y = h.y + Math.sin(h.rot + 1.57) * (60 + R() * 60) + (R() - 0.5) * 40;
      if (!inLake(x, y)) bam.push([x, y, landY(x, y), 0.9 + R() * 0.4, R()]);
    }
  });
  if (bam.length) cardForest("bamboo", bam, 14, 8, 30, QUALITY.nearTrees[1], false);
  }

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

  // ススキ：秋（9〜11月）、田のあぜと山すそに穂が揺れる
  const susT = { value: 0 };
  const susuki = (() => {
    const R = rndFor("susuki");
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
    placeLog("ススキ", "land", ok);
    const im = new THREE.InstancedMesh(gm, mat, Math.max(1, ok.length)),
      M2 = new THREE.Matrix4(),
      Q2 = new THREE.Quaternion(),
      cc = new THREE.Color();
    ok.forEach(([x, y], i) => {
      const s = 1.4 + R() * 0.9;
      Q2.setFromAxisAngle(new THREE.Vector3(0, 1, 0), R() * 6.28);
      M2.compose(new THREE.Vector3(x * S, landY(x, y) - 0.05, y * S), Q2, new THREE.Vector3(s, s, s));
      im.setMatrixAt(i, M2);
      im.setColorAt(i, cc.setHSL(0.11 + R() * 0.03, 0.25, 0.75 + R() * 0.15));
    });
    im.visible = false;
    scene.add(im);
    return im;
  })();
  // 水辺の林：ヤナギ・ハンノキが浅い水に浸かって立つ（奥の洲のような木立）
  const wet = (() => {
    const R = rndFor("wetWoods");
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
    trunk.visible = crown.visible = LOOK.show.wetWoods;
    scene.add(trunk, crown);
    return { crown, cm };
  })();
  // 湖岸の松並木：近江舞子・北小松・萩の浜・宮ヶ浜の白砂青松
  if (LOOK.show.pines) {
    const R = rndFor("pines");
    const SITES = [
      [135.958, 35.262, 1400],
      [135.972, 35.284, 900],
      [136.043, 35.334, 900],
      [136.082, 35.172, 800],
    ].map(([lo, la, r]) => [...shoreSnap(...ll(lo, la)), r]); // 湖岸線の上の点に寄せる
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
          P.push([x, y, landY(x, y), 0.9 + R() * 0.5, R()]);
        }
    }
    if (P.length) cardForest("pine", P, 11, 7, 60, 3500, QUALITY.treeShadow);
    placeLog("松並木", "land", P);
  }
  function update(dt, t, c, day, wxNow) {
    const cx = camera.position.x,
      cz = camera.position.z;
    // 雲
    const want = LOOK.show.mountainClouds && day > 0.05 ? Math.min(1, Math.max(0, (wxNow.gray - 0.35) * 2) + wxNow.rain * 0.8 + wxNow.white * 0.6) : 0;
    if (want > 0.02 && (!cloudAt || Math.hypot(cloudAt[0] - cx, cloudAt[1] - cz) > 1200)) placeClouds();
    for (const cl of clouds) {
      cl.s.visible = cl.ok && want > 0.02 && !isFar;
      if (!cl.s.visible) continue;
      cl.s.position.x += Math.cos(cl.ph) * dt * 1.2;
      cl.s.position.z += Math.sin(cl.ph) * dt * 1.2;
      cl.s.material.opacity = want * (0.55 + 0.25 * Math.sin(t * 0.05 + cl.ph));
    }
    susT.value = t;
    susuki.visible = LOOK.show.susuki && c.month >= LOOK.months.susuki[0] && c.month <= LOOK.months.susuki[1];
    // 水辺の林の季節：冬は葉を落として枝の灰色、春は芽吹きの淡い緑、秋は黄色
    wet.cm.color.setHex([0x8a8478, 0x8a8478, 0xc8d8a0, 0xe0f0c0, 0xffffff, 0xffffff, 0xffffff, 0xffffff, 0xf4f0c0, 0xf0d890, 0xd8b880, 0x9a9080][c.month]);
  }
  return { update, bam, susuki };
})();
