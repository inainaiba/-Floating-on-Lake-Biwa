// 港の囲い：L字の防波堤で小さな船だまりをつくり、小舟を並べる
{
  const walls_ = [],
    boats_ = [],
    R = rnd(612);
  for (const p of PORT_SITES) {
    let a = 0,
      bd = -1;
    for (let k = 0; k < 6.28; k += 0.2) {
      const d = depth(p[0] + Math.cos(k) * 250, p[1] + Math.sin(k) * 250);
      if (d > bd) {
        bd = d;
        a = k;
      }
    }
    const ux = Math.cos(a),
      uy = Math.sin(a),
      vx = -uy,
      vy = ux,
      W = 300 + R() * 200,
      D = 250 + R() * 150,
      o = [p[0], p[1]];
    walls_.push([
      o[0] + (vx * W) / 2,
      o[1] + (vy * W) / 2,
      o[0] + (vx * W) / 2 + ux * D,
      o[1] + (vy * W) / 2 + uy * D,
    ]);
    walls_.push([
      o[0] + (vx * W) / 2 + ux * D,
      o[1] + (vy * W) / 2 + uy * D,
      o[0] - vx * W * 0.15 + ux * D,
      o[1] - vy * W * 0.15 + uy * D,
    ]);
    walls_.push([
      o[0] - (vx * W) / 2,
      o[1] - (vy * W) / 2,
      o[0] - (vx * W) / 2 + ux * D * 0.55,
      o[1] - (vy * W) / 2 + uy * D * 0.55,
    ]);
    for (let k = 0; k < 6 + Math.floor(R() * 8); k++)
      boats_.push([
        o[0] + vx * (R() - 0.5) * W * 0.8 + ux * (30 + R() * D * 0.6),
        o[1] + vy * (R() - 0.5) * W * 0.8 + uy * (30 + R() * D * 0.6),
        a + (R() < 0.5 ? 0 : Math.PI),
      ]);
  }
  const M = new THREE.Matrix4(),
    // 防波堤：打ち継ぎ目のあるコンクリート（長さに合わせて目地を繰り返す）。
    // 夜に真っ黒の帯にならないよう、わずかに自らの明るさを持たせる
    wallTx = cvTex(64, 16, (g, w, h) => {
      g.fillStyle = "#fff";
      g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 16) {
        g.fillStyle = `rgba(0,0,0,${(0.03 + Math.random() * 0.08).toFixed(2)})`;
        g.fillRect(x, 0, 15, h);
        g.fillStyle = "rgba(0,0,0,.28)";
        g.fillRect(x + 15, 0, 1, h);
      }
      g.fillStyle = "rgba(0,0,0,.18)";
      g.fillRect(0, h - 4, w, 4); // 水ぎわの汚れ
    }),
    wallM = new THREE.MeshLambertMaterial({ color: 0xb8b6ae, map: wallTx, emissive: 0x1c1c1a }),
    WI = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1.6, 2.4), wallM, walls_.length);
  wallTx.wrapS = THREE.RepeatWrapping;
  wallM.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace("#include <uv_vertex>", "#include <uv_vertex>\nvMapUv=vec2(uv.x*length(instanceMatrix[0].xyz)/8.,uv.y);");
  };
  wallM.customProgramCacheKey = () => "harbor-wall";
  walls_.forEach(([x1, y1, x2, y2], i) => {
    const L = Math.hypot(x2 - x1, y2 - y1) * S;
    M.compose(
      new THREE.Vector3(((x1 + x2) / 2) * S, 0.5, ((y1 + y2) / 2) * S),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.atan2(y2 - y1, x2 - x1), 0)),
      new THREE.Vector3(L, 1, 1),
    );
    WI.setMatrixAt(i, M);
  });
  scene.add(WI);
  // 港口の灯台：入口の両側に赤と白の小さな灯柱。夜に灯る
  {
    const postG = new THREE.CylinderGeometry(0.35, 0.45, 3.2, 8).translate(0, 1.6, 0),
      lampG = new THREE.SphereGeometry(0.45, 8, 6).translate(0, 3.4, 0),
      g = new THREE.Group(),
      lamps = [];
    for (let i = 0; i < walls_.length; i += 3) {
      for (const [w, col, lc] of [
        [walls_[i + 1], 0xc8383a, 0xff5040],
        [walls_[i + 2], 0xeeeeea, 0x70ff90],
      ]) {
        const x = w[2] * S,
          z = w[3] * S,
          p = new THREE.Mesh(postG, new THREE.MeshLambertMaterial({ color: col, emissive: 0x141414 })),
          lm = new THREE.MeshBasicMaterial({ color: 0x333333 }),
          l = new THREE.Mesh(lampG, lm);
        p.position.set(x, 1.3, z);
        l.position.set(x, 1.3, z);
        lm.userData.night = new THREE.Color(lc).multiplyScalar(1.8);
        lamps.push(lm);
        g.add(p, l);
      }
    }
    scene.add(g);
    const OFF = new THREE.Color(0x333333);
    const WE_DAY = new THREE.Color(0x1c1c1a),
      WE_NIGHT = new THREE.Color(0x6e6c66);
    onFrame(126, (f) => {
      const lit = Math.min(1, Math.max(0, (0.2 - f.day) / 0.1)),
        bl = 0.55 + 0.45 * Math.sign(Math.sin(f.t * 1.6)); // ゆっくり明滅
      for (const m of lamps) m.color.lerpColors(OFF, m.userData.night, lit * bl);
      wallM.emissive.lerpColors(WE_DAY, WE_NIGHT, lit); // 夜の堤は月明かりにほの白く
    });
  }
  // 港の小舟：とがった舳先・内側の床・船べりの線・船尾の船外機。半分ほどは青い幌（ほろ）付き。
  // 部品ごとの色は頂点の色で持ち、舟ごとの色（白・水色など）を掛ける。波にあわせてゆっくり上下・横揺れ
  const boatGeo = (() => {
    const parts = [],
      paint = (g, fn) => {
        g = g.index ? g.toNonIndexed() : g;
        g.computeVertexNormals();
        const p = g.attributes.position,
          n = g.attributes.normal,
          c = [];
        for (let i = 0; i < p.count; i++) c.push(...fn(p.getX(i), p.getY(i), p.getZ(i), n.getY(i)));
        g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3));
        g.deleteAttribute("uv");
        parts.push(g);
      };
    // 船体：箱の前の方を細めて舳先をとがらせ、少し反り上げる。底は細く
    const h = new THREE.BoxGeometry(5, 0.8, 1.8, 6, 2, 1),
      hp = h.attributes.position;
    for (let i = 0; i < hp.count; i++) {
      let x = hp.getX(i),
        y = hp.getY(i),
        z = hp.getZ(i);
      const t = Math.max(0, (x - 0.8) / 1.7);
      z *= 1 - Math.pow(t, 1.3) * 0.96;
      if (y > 0) y += t * t * 0.35;
      else z *= 0.62;
      hp.setXYZ(i, x, y, z);
    }
    paint(h, (x, y, z, ny) => (ny > 0.8 ? [0.5, 0.42, 0.33] : y > 0.22 + Math.max(0, (x - 0.8) / 1.7) ** 2 * 0.35 ? [0.32, 0.4, 0.55] : y < -0.25 ? [0.42, 0.36, 0.3] : [1, 1, 1]));
    // 船外機
    paint(new THREE.BoxGeometry(0.45, 0.9, 0.4).translate(-2.65, 0.45, 0), () => [0.16, 0.17, 0.19]);
    // 座板
    paint(new THREE.BoxGeometry(0.3, 0.08, 1.5).translate(0.4, 0.38, 0), () => [0.62, 0.52, 0.4]);
    const join = (list) => {
      const g = new THREE.BufferGeometry();
      for (const k of ["position", "normal", "color"]) {
        const arrs = list.map((q) => q.attributes[k].array),
          out = new Float32Array(arrs.reduce((n, q) => n + q.length, 0));
        let o = 0;
        for (const q of arrs) out.set(q, o), (o += q.length);
        g.setAttribute(k, new THREE.BufferAttribute(out, 3));
      }
      return g;
    };
    const plain = join(parts);
    // 幌：2本の柱と、少し反った屋根
    paint(new THREE.BoxGeometry(0.08, 1.1, 0.08).translate(-1.5, 0.95, 0.7), () => [0.7, 0.7, 0.7]);
    paint(new THREE.BoxGeometry(0.08, 1.1, 0.08).translate(-1.5, 0.95, -0.7), () => [0.7, 0.7, 0.7]);
    paint(new THREE.BoxGeometry(1.8, 0.06, 1.7).translate(-1.9, 1.5, 0), () => [0.3, 0.48, 0.72]);
    return [plain, join(parts)];
  })();
  const boatM = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x101010 }),
    BIs = boatGeo.map((g, k) => new THREE.InstancedMesh(g, boatM, boats_.length)),
    c = new THREE.Color(),
    bob = [];
  BIs.forEach((m) => (m.count = 0));
  boats_.forEach(([x, y, r], i) => {
    if (!inLake(x, y)) return;
    const k = R() < 0.45 ? 1 : 0,
      m = BIs[k],
      j = m.count++;
    m.setColorAt(j, c.set([0xf2f2ee, 0xe8eef2, 0x9fc3d6, 0xd9e2d0, 0xeadfc8][i % 5]));
    bob.push([m, j, x * S, y * S, -r, R() * 6.28]);
  });
  const q = new THREE.Quaternion(),
    e = new THREE.Euler(),
    pv = new THREE.Vector3(),
    one = new THREE.Vector3(1, 1, 1),
    place = (t) => {
      for (const [m, j, x, z, r, ph] of bob) {
        const a = RM ? 0.3 : 1;
        q.setFromEuler(e.set(Math.sin(t * 0.9 + ph) * 0.05 * a, r, Math.sin(t * 0.7 + ph * 1.3) * 0.03 * a, "YXZ"));
        M.compose(pv.set(x, 0.28 + Math.sin(t * 1.1 + ph) * 0.06 * a, z), q, one);
        m.setMatrixAt(j, M);
      }
      for (const m of BIs) m.instanceMatrix.needsUpdate = true;
    };
  place(0);
  for (const m of BIs) {
    m.instanceColor.needsUpdate = true;
    scene.add(m);
  }
  // 港の中は穏やかなので揺れは小さく。遠くからは見えないので、カメラが港の近くにいるときだけ動かす
  onFrame(127, (f) => {
    const cx = camera.position.x,
      cz = camera.position.z;
    if (bob.some(([, , x, z]) => Math.abs(x - cx) < 250 && Math.abs(z - cz) < 250)) place(f.t);
  });
  // 堤の先の消波ブロック、岸の舟小屋（錆びたトタンの波板屋根）、船を上げる門形の鉄骨
  {
    const tet = [],
      shed = [],
      crane = [];
    walls_.forEach(([x1, y1, x2, y2], i) => {
      if (i % 3 !== 2) tet.push([x2, y2]);
    });
    for (let i = 0; i < walls_.length; i += 3) {
      const [x1, y1] = walls_[i],
        [, , ,] = walls_[i];
      const ox = (walls_[i][0] + walls_[i + 2][0]) / 2,
        oy = (walls_[i][1] + walls_[i + 2][1]) / 2,
        a = Math.atan2(walls_[i][3] - walls_[i][1], walls_[i][2] - walls_[i][0]);
      for (let k = 0; k < 3; k++)
        shed.push([
          ox - Math.cos(a) * (40 + k * 18) + Math.cos(a + 1.57) * (k - 1) * 90,
          oy - Math.sin(a) * (40 + k * 18) + Math.sin(a + 1.57) * (k - 1) * 90,
          a,
        ]);
      crane.push([ox - Math.cos(a) * 15, oy - Math.sin(a) * 15, a]);
      placeLog("荷揚げの架台", "shore", [crane.at(-1)]);
    }
    // 消波ブロック：四本脚（中心から正四面体の頂点へ太い脚が伸びる）。堤の先に、崩れた山のように積む
    const tetraG = (() => {
      const V = [
          [1, 1, 1],
          [1, -1, -1],
          [-1, 1, -1],
          [-1, -1, 1],
        ],
        list = [],
        up = new THREE.Vector3(0, 1, 0);
      for (const v of V) {
        const d = new THREE.Vector3(...v).normalize(),
          g = new THREE.CylinderGeometry(0.28, 0.55, 1.5, 6).translate(0, 0.75, 0);
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, d));
        list.push(g.toNonIndexed());
      }
      const g = new THREE.BufferGeometry();
      for (const k of ["position", "normal"]) {
        const arrs = list.map((q) => q.attributes[k].array),
          out = new Float32Array(arrs.reduce((n, q) => n + q.length, 0));
        let o = 0;
        for (const q of arrs) out.set(q, o), (o += q.length);
        g.setAttribute(k, new THREE.BufferAttribute(out, 3));
      }
      return g;
    })();
    const NT = 14,
      T = new THREE.InstancedMesh(tetraG, new THREE.MeshLambertMaterial({ color: 0xaeaca4, emissive: 0x1a1a18, flatShading: true }), tet.length * NT),
      tc = new THREE.Color();
    let n = 0;
    tet.forEach(([x, y]) => {
      for (let k = 0; k < NT; k++) {
        // 下の段ほど広く、上の段ほど堤の先に寄せる
        const lay = k < 8 ? 0 : k < 12 ? 1 : 2,
          rr = (3.6 - lay * 1.2) * Math.sqrt(R()),
          aa = R() * 6.28;
        M.compose(
          new THREE.Vector3(x * S + Math.cos(aa) * rr, -0.2 + lay * 0.85 + R() * 0.2, y * S + Math.sin(aa) * rr),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(R() * 3, R() * 3, R() * 3)),
          new THREE.Vector3(1, 1, 1).multiplyScalar(0.85 + R() * 0.2),
        );
        T.setMatrixAt(n, M);
        T.setColorAt(n++, tc.setScalar(0.82 + R() * 0.22)); // 古いものほど黒ずむ
      }
    });
    scene.add(T);
    // 舟小屋：縦の羽目板の壁に大きな引き戸、錆の浮いたトタンの波板屋根（片流れ）
    const shedWall = cvTex(128, 32, (g, w, h) => {
        g.fillStyle = "#cfc8ba";
        g.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 4) {
          g.fillStyle = `rgba(60,45,30,${(0.05 + Math.random() * 0.1).toFixed(2)})`;
          g.fillRect(x, 0, 3, h);
          g.fillStyle = "rgba(0,0,0,.18)";
          g.fillRect(x + 3, 0, 1, h);
        }
        g.fillStyle = "#5e5a52"; // 引き戸
        g.fillRect(w * 0.3, h * 0.22, w * 0.4, h * 0.78);
        g.fillStyle = "rgba(0,0,0,.35)";
        g.fillRect(w * 0.5, h * 0.22, 1, h * 0.78);
        g.fillStyle = "rgba(90,70,50,.35)"; // 足もとの汚れ
        g.fillRect(0, h * 0.85, w, h * 0.15);
      }),
      shedRoof = cvTex(64, 64, (g, w, h) => {
        g.fillStyle = "#8a8e8c";
        g.fillRect(0, 0, w, h);
        for (let k = 0; k < 9; k++) {
          // 錆のしみ
          const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
          gr.addColorStop(0, "rgba(150,70,30,.75)");
          gr.addColorStop(1, "rgba(150,70,30,0)");
          g.save();
          g.translate(Math.random() * w, Math.random() * h);
          g.scale(6 + Math.random() * 14, 4 + Math.random() * 10);
          g.fillStyle = gr;
          g.fillRect(-1, -1, 2, 2);
          g.restore();
        }
        for (let x = 0; x < w; x += 4) {
          // 波板の山と谷
          g.fillStyle = "rgba(255,255,255,.16)";
          g.fillRect(x, 0, 1, h);
          g.fillStyle = "rgba(0,0,0,.22)";
          g.fillRect(x + 2, 0, 2, h);
        }
      });
    shedRoof.wrapS = shedRoof.wrapT = THREE.RepeatWrapping;
    shedRoof.repeat.set(3, 1);
    const SH = new THREE.InstancedMesh(
        new THREE.BoxGeometry(14, 3, 7).translate(0, 1.5, 0),
        new THREE.MeshLambertMaterial({ color: 0xffffff, map: shedWall, emissive: 0x141210 }),
        shed.length,
      ),
      RF = new THREE.InstancedMesh(
        new THREE.BoxGeometry(14.8, 0.18, 8.2).rotateX(0.12),
        new THREE.MeshLambertMaterial({ color: 0xffffff, map: shedRoof, emissive: 0x100c0a }),
        shed.length,
      );
    shed.forEach(([x, y, a], i) => {
      if (inLake(x, y)) {
        M.makeScale(0, 0, 0);
        SH.setMatrixAt(i, M);
        RF.setMatrixAt(i, M);
        return;
      }
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a, 0));
      M.compose(new THREE.Vector3(x * S, 0.6, y * S), q, new THREE.Vector3(1, 1, 1));
      SH.setMatrixAt(i, M);
      M.compose(new THREE.Vector3(x * S, 3.75, y * S), q, new THREE.Vector3(1, 1, 1));
      RF.setMatrixAt(i, M);
    });
    scene.add(SH, RF);
    const cg = new THREE.Group();
    crane.forEach(([x, y, a]) => {
      const g = new THREE.Group(),
        m = new THREE.MeshLambertMaterial({ color: 0x6b3e2a });
      for (const s of [-2.5, 2.5]) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7, 0.4), m);
        p.position.set(0, 3.5, s);
        g.add(p);
      }
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 6), m);
      b.position.y = 7;
      g.add(b);
      g.position.set(x * S, 0.6, y * S);
      g.rotation.y = -a;
      cg.add(g);
    });
    mergeStatic(cg); // 荷揚げの架台を束ねる
    scene.add(cg);
  }
  G.harb = walls_;
}

function lumpy(r, R, det, amp = 0.22) {
  const g = new THREE.IcosahedronGeometry(r, det);
  g.userData.keepN = 1;
  const p = g.attributes.position,
    o = [R() * 9, R() * 9, R() * 9];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i),
      l = Math.hypot(x, y, z),
      n =
        Math.sin(x * 2.3 + o[0]) * Math.sin(y * 2.7 + o[1]) * Math.sin(z * 2.1 + o[2]) * 0.5 +
        Math.sin(x * 5.1 + o[1]) * Math.sin(z * 4.7 + o[2]) * 0.25;
    const k =
      1 +
      n * amp +
      Math.sin(x * 9 + o[2]) * Math.sin(z * 9 + o[0]) * amp * 0.35 -
      (y < 0 ? 0.18 * (-y / l) : 0);
    p.setXYZ(i, x * k, y * k, z * k);
  }
  {
    const nn = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i),
        l = Math.hypot(x, y, z) || 1;
      nn.setXYZ(i, x / l, y / l + 0.15, z / l);
    }
  }
  return g;
}

function treeGeom(kind, det = 1) {
  const parts = [];
  const R = rnd(kind === "pine" ? 3 : kind === "cedar" ? 5 : 7);
  const trunk = new THREE.CylinderGeometry(0.14, 0.24, kind === "cedar" ? 5 : 3.4, 5)
    .translate(0, kind === "cedar" ? 2.5 : 1.5, 0)
    .rotateZ(kind === "pine" ? 0.18 : 0)
    .toNonIndexed();
  parts.push([trunk, new THREE.Color(0x4a3a2a)]);
  if (kind !== "cedar")
    for (let b = 0; b < 3; b++) {
      const a = b * 2.1 + R(),
        br = new THREE.CylinderGeometry(0.05, 0.1, 2, 4)
          .translate(0, 1, 0)
          .rotateZ(0.9)
          .rotateY(a)
          .translate(0, 2.2 + b * 0.3, 0)
          .toNonIndexed();
      parts.push([br, new THREE.Color(0x4a3a2a)]);
    }
  if (kind === "cedar") {
    for (let k = 0; k < 5; k++)
      parts.push([
        (() => {
          const g = new THREE.ConeGeometry(2.3 - k * 0.4, 3, 10, 2)
              .translate(0, 3.8 + k * 1.6, 0)
              .toNonIndexed(),
            p = g.attributes.position;
          for (let i = 0; i < p.count; i++) {
            const x = p.getX(i),
              z = p.getZ(i),
              a = Math.atan2(z, x),
              j = 1 + 0.18 * Math.sin(a * 5 + k) + 0.1 * Math.sin(a * 11);
            p.setX(i, x * j);
            p.setZ(i, z * j);
          }
          g.computeVertexNormals();
          return g;
        })(),
        new THREE.Color(0x29442f).offsetHSL(0, 0, k * 0.025),
      ]);
  } else
    for (let k = 0; k < (kind === "pine" ? (det > 1 ? 9 : 6) : det > 1 ? 11 : 6); k++) {
      const r = kind === "pine" ? 1.0 + R() * 0.5 : 1.1 + R() * 1.0,
        a = R() * 6.28,
        q = k ? 1.2 + R() * 1.5 : 0;
      parts.push([
        lumpy(r, R, det, kind === "pine" ? 0.42 : 0.24)
          .scale(1 + R() * 0.35, kind === "pine" ? 0.45 + R() * 0.15 : 0.9, 1 + R() * 0.35)
          .translate(
            Math.cos(a) * q,
            (kind === "pine" ? 2.9 : 3.2) + R() * 2.4 - (q > 2 ? 0.6 : 0),
            Math.sin(a) * q,
          )
          .toNonIndexed(),
        new THREE.Color(kind === "pine" ? 0x56784a : 0x5f8a44).offsetHSL(0, 0, (R() - 0.5) * 0.08),
      ]);
    }
  const pos = [],
    col = [],
    nrm = [],
    uvs = [];
  for (let [g, c] of parts) {
    if (g.index) {
      g = g.toNonIndexed();
    } else if (!g.userData.keepN) g.computeVertexNormals();
    const p = g.attributes.position.array,
      n = g.attributes.normal.array;
    for (let i = 0; i < p.length; i += 3) {
      pos.push(p[i], p[i + 1], p[i + 2]);
      nrm.push(n[i], n[i + 1], n[i + 2]);
      {
        const isLeaf = c.g > c.r * 1.2;
        uvs.push(
          isLeaf ? Math.atan2(p[i + 2], p[i]) * 1.2 + p[i + 1] * 0.2 : 0,
          isLeaf ? p[i + 1] * 0.9 + p[i] * 0.3 : 0,
        );
      }
      const sh = 0.6 + 0.55 * Math.min(1, Math.max(0, p[i + 1] / 7));
      const tip = Math.max(0, p[i + 1] - 5) * 0.03;
      const ln =
        0.8 +
        0.4 *
          (Math.sin(p[i] * 4.1 + p[i + 1] * 3.7) * Math.sin(p[i + 2] * 4.3 - p[i + 1] * 2.9) * 0.5 + 0.5) *
          (0.85 + 0.3 * Math.abs(Math.sin(p[i] * 17 + p[i + 2] * 13)));
      const ao = Math.min(1, 0.55 + 0.25 * Math.hypot(p[i], p[i + 2]));
      col.push((c.r * sh + tip * 0.3) * ln * ao, (c.g * sh + tip * 0.4) * ln * ao, c.b * sh * ln * ao);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  return g;
}
const TREE_MAT = new THREE.MeshLambertMaterial({ vertexColors: true });
NEAR_TREE_MAT();
TREE_MAT.map = LEAFTX;
