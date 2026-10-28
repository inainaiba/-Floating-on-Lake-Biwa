var FW;
FW = (() => {
  const NP = QUALITY.fireworks,
    K = 3,
    P0 = 0.8,
    DUR = 200,
    R_ = rnd(8081);
  const px = new Float32Array(NP),
    py = new Float32Array(NP),
    pz = new Float32Array(NP),
    vx = new Float32Array(NP),
    vy = new Float32Array(NP),
    vz = new Float32Array(NP),
    age = new Float32Array(NP),
    life = new Float32Array(NP).fill(-1),
    c1 = new Float32Array(NP * 3),
    c2 = new Float32Array(NP * 3),
    drag = new Float32Array(NP),
    grav = new Float32Array(NP),
    trl = new Float32Array(NP),
    sz = new Float32Array(NP),
    flk = new Float32Array(NP),
    kind = new Uint8Array(NP),
    tag = new Int32Array(NP).fill(-1);
  let head = 0;
  const pos = new Float32Array(NP * K * 3),
    col = new Float32Array(NP * K * 3),
    siz = new Float32Array(NP * K),
    alp = new Float32Array(NP * K);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("aS", new THREE.BufferAttribute(siz, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("aA", new THREE.BufferAttribute(alp, 1).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    uniforms: { uPx: { value: 600 } },
    vertexShader:
      "attribute float aS;attribute float aA;varying vec3 vC;varying float vA;uniform float uPx;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;float s=aS*uPx/max(1.,-mv.z);vA=aA*min(1.,s*s/4.);gl_PointSize=max(2.,s*1.4);vC=color;}",
    fragmentShader:
      "varying vec3 vC;varying float vA;void main(){vec2 d=gl_PointCoord-.5;float r=length(d)*2.;float a=exp(-r*r*3.)*(1.-smoothstep(.8,1.,r));if(vA*a<.003)discard;gl_FragColor=vec4(vC*(1.+.5*exp(-r*r*12.))*vA*a,1.);}",
  });
  const lpos = new Float32Array(NP * 6),
    lcol = new Float32Array(NP * 6),
    lgeo = new THREE.BufferGeometry();
  lgeo.setAttribute("position", new THREE.BufferAttribute(lpos, 3).setUsage(THREE.DynamicDrawUsage));
  lgeo.setAttribute("color", new THREE.BufferAttribute(lcol, 3).setUsage(THREE.DynamicDrawUsage));
  const lines = new THREE.LineSegments(
    lgeo,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    }),
  );
  lines.frustumCulled = false;
  lines.renderOrder = 5;
  scene.add(lines);
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.visible = false;
  pts.renderOrder = 5;
  scene.add(pts);
  const flashL = new THREE.PointLight(0xffe0b0, 0, 2600, 0);
  scene.add(flashL);
  const glowTx = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d"),
      gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,.55)");
    gr.addColorStop(0.35, "rgba(255,255,255,.18)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const glows = [];
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTx,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0,
      }),
    );
    s.visible = false;
    s.userData.a = 0;
    scene.add(s);
    glows.push(s);
  }
  let gi = 0;
  let bx, by, ux, uy;
  {
    const [sx, sy] = ll(135.8665, 35.0105),
      [tx, ty] = ll(135.885, 35.028);
    const L = Math.hypot(tx - sx, ty - sy);
    ux = (tx - sx) / L;
    uy = (ty - sy) / L;
    let x = sx,
      y = sy,
      k = 0;
    while (k < 200 && depth(x, y) < 4) {
      x += ux * 20;
      y += uy * 20;
      k++;
    }
    bx = x + ux * 400;
    by = y + uy * 400;
  }
  const BAR = [-2, -1, 0, 1, 2].map((i) => [bx * S - uy * i * 70, by * S + ux * i * 70]);
  const PAL = [
    [1, 0.62, 0.2],
    [1, 0.1, 0.06],
    [0.12, 1, 0.25],
    [0.15, 0.3, 1],
    [1, 0.18, 0.7],
    [1, 0.92, 0.45],
    [0.55, 0.15, 1],
    [0.1, 0.9, 1],
    [1, 0.42, 0.05],
  ];
  const ev = [];
  {
    const add = (t, o) => ev.push(Object.assign({ t }, o)),
      pc = () => PAL[Math.floor(R_() * PAL.length)],
      bb = () => Math.floor(R_() * 5);
    let t = 2;
    const big = (t, b, sub) =>
      add(t, {
        ty: "shell",
        sub,
        b,
        H: 170 + R_() * 110,
        R: 95 + R_() * 75,
        c: sub === "kamuro" ? PAL[0] : pc(),
        c2: sub === "kamuro" ? PAL[8] : pc(),
      });
    const mid = (t, b, sub) =>
      add(t, { ty: "shell", sub, b, H: 90 + R_() * 60, R: 50 + R_() * 25, c: pc(), c2: pc() });
    while (t < DUR - 35) {
      const sec = Math.floor(t / 30) % 3;
      if (sec === 0) {
        const sub = ["kamuro", "peony", "chrys", "ring", "chrys", "kamuro", "peony"][Math.floor(R_() * 7)];
        big(t, bb(), sub);
        if (R_() < 0.35) big(t + 0.1, bb(), sub);
        t += 1.1 + R_() * 1.4;
      } else if (sec === 1) {
        const T0 = t;
        for (let i = 0; i < 5; i++)
          for (let j = 0; j < 9; j++)
            add(T0 + j * 0.7 + i * 0.12, {
              ty: "fan",
              b: i,
              a: (j % 2 ? 1 : -1) * 0.25,
              c: PAL[(i * 2 + j) % PAL.length],
            });
        for (let i = 0; i < 24; i++)
          add(T0 + i * 0.28, { ty: "comet", b: i % 5, a: (R_() - 0.5) * 1.2, c: pc() });
        for (let i = 0; i < 16; i++) mid(T0 + 1 + i * 0.4, i % 5, R_() < 0.5 ? "peony" : "ring");
        for (let i = 0; i < 5; i++) big(T0 + 7.5, i, "chrys");
        t = T0 + 10;
      } else {
        const n = 3 + Math.floor(R_() * 3);
        for (let i = 0; i < n; i++)
          mid(t + R_() * 0.4, bb(), ["peony", "ring", "peony", "chrys"][Math.floor(R_() * 4)]);
        if (R_() < 0.4) big(t + 0.3, bb(), "peony");
        t += 1.3 + R_() * 0.8;
      }
    }
    for (let i = 0; i < 5; i++)
      for (let j = 0; j < 10; j++)
        add(t + j * 0.6 + i * 0.1, {
          ty: "fan",
          b: i,
          a: (j % 2 ? 1 : -1) * 0.2,
          c: PAL[(i + j) % PAL.length],
        });
    t += 3;
    for (let i = 0; i < 60; i++) big(t + i * 0.35 + R_() * 0.2, i % 5, i % 3 ? "kamuro" : "chrys");
    ev.sort((a, b) => a.t - b.t);
  }
  const spawn = (x, y, z, v1, v2, v3, l, ca, cb, dg, gv, tr, s, fk, kd) => {
    const i = head;
    head = (head + 1) % NP;
    px[i] = x;
    py[i] = y;
    pz[i] = z;
    vx[i] = v1;
    vy[i] = v2;
    vz[i] = v3;
    age[i] = 0;
    life[i] = l;
    c1.set(ca, i * 3);
    c2.set(cb || ca, i * 3);
    drag[i] = dg;
    grav[i] = gv;
    trl[i] = tr;
    sz[i] = s;
    flk[i] = fk;
    kind[i] = kd || 0;
    tag[i] = -1;
    return i;
  };
  const pending = [];
  const sound = (x, y, z, big, kd) => {
    if (!SND.ctx || isFar) return;
    const d = camera.position.distanceTo(new THREE.Vector3(x, y, z)),
      dl = d / 340;
    const pn = (() => {
      const dx = x - camera.position.x,
        dz = z - camera.position.z;
      return Math.max(
        -1,
        Math.min(1, (Math.cos(yaw) * dx - Math.sin(yaw) * dz) / Math.max(60, Math.hypot(dx, dz))),
      );
    })();
    const v = Math.min(0.7, 600 / (d + 300)) * (big ? 1 : 0.55);
    setTimeout(() => {
      if (!SND.ctx) return;
      nburst(140, 25, big ? 3.2 : 1.6, v, pn, 0.8, 0.9);
      nburst(1500, 180, 0.18, v * 0.6, pn, 0.7, 0.6);
      if (kd === "kamuro")
        for (let k = 0; k < 14; k++)
          setTimeout(
            () => SND.ctx && nburst(6000, 2500, 0.05, v * 0.12, pn + (Math.random() - 0.5) * 0.3, 0.7, 0.4),
            1400 + Math.random() * 1800,
          );
    }, dl * 1000);
  };
  const burst = (x, y, z, e) => {
    const n = Math.round(
        (e.sub === "kamuro" ? 220 : e.sub === "ring" ? 110 : e.sub === "chrys" ? 240 : 200) * (QUALITY.fireworkBurst),
      ),
      sp = e.R;
    let ax = R_() - 0.5,
      ay = R_() * 0.6,
      az = R_() - 0.5;
    const an = new THREE.Vector3(ax, 1, az).normalize(),
      t1 = new THREE.Vector3(1, 0, 0).cross(an).normalize(),
      t2 = an.clone().cross(t1);
    for (let i = 0; i < n; i++) {
      let d;
      if (e.sub === "ring") {
        const a = (i / n) * 6.2832;
        d = t1.clone().multiplyScalar(Math.cos(a)).addScaledVector(t2, Math.sin(a));
      } else {
        const u = Math.random() * 2 - 1,
          a = Math.random() * 6.2832,
          r = Math.sqrt(1 - u * u);
        d = new THREE.Vector3(r * Math.cos(a), u, r * Math.sin(a));
      }
      const s = sp * (0.92 + Math.random() * 0.16);
      if (e.sub === "kamuro")
        spawn(
          x,
          y,
          z,
          d.x * s * 1.3,
          d.y * s * 1.3,
          d.z * s * 1.3,
          4.6 + Math.random() * 1.4,
          e.c,
          [0.55, 0.28, 0.08],
          1.3,
          7,
          2.4,
          5,
          0.6,
          1,
        );
      else if (e.sub === "chrys")
        spawn(
          x,
          y,
          z,
          d.x * s * 1.6,
          d.y * s * 1.6,
          d.z * s * 1.6,
          2.6 + Math.random() * 0.6,
          e.c,
          e.c2,
          1.6,
          5,
          1.6,
          4.6,
          0.15,
          0,
        );
      else
        spawn(
          x,
          y,
          z,
          d.x * s * 1.9,
          d.y * s * 1.9,
          d.z * s * 1.9,
          2 + Math.random() * 0.4,
          e.c,
          e.c2,
          1.9,
          4,
          0.5,
          5,
          0.1,
          0,
        );
    }
    if (e.sub === "chrys" || e.sub === "peony")
      for (let i = 0; i < 40; i++) {
        const u = Math.random() * 2 - 1,
          a = Math.random() * 6.2832,
          r = Math.sqrt(1 - u * u),
          s = sp * 0.85;
        spawn(
          x,
          y,
          z,
          r * Math.cos(a) * s,
          u * s,
          r * Math.sin(a) * s,
          1.6,
          e.c2,
          e.c2,
          2,
          4,
          0.2,
          2.8,
          0.1,
          0,
        );
      }
    const g = glows[gi++ % glows.length];
    g.position.set(x, y, z);
    g.scale.setScalar(e.R * 3.2);
    g.material.color.setRGB(...e.c);
    g.userData.a = e.sub === "kamuro" ? 0.9 : 0.7;
    g.visible = true;
    flashL.position.set(x, y, z);
    flashL.color.setRGB(...e.c);
    self.flash = Math.max(self.flash, e.R > 90 ? 2.2 : 1.2);
    sound(x, y, z, e.R > 90, e.sub);
  };
  const launch = (e) => {
    const [bx_, bz_] = BAR[e.b];
    const y0 = 1.5;
    if (e.ty === "shell") {
      const T = Math.sqrt(e.H / 60);
      const i = spawn(
        bx_ + (Math.random() - 0.5) * 8,
        y0,
        bz_ + (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 4,
        (e.H / T) * 1.0,
        (Math.random() - 0.5) * 4,
        T,
        [1, 0.75, 0.45],
        [1, 0.6, 0.3],
        0,
        0,
        0.5,
        2.2,
        0.4,
        2,
      );
      pending.push([i, e]);
      if (SND.ctx && !isFar && e.H > 140) {
        const d = camera.position.distanceTo(new THREE.Vector3(bx_, 0, bz_));
        setTimeout(
          () => SND.ctx && nburst(260, 40, 0.35, Math.min(0.3, 200 / (d + 300)), 0, 0.7, 0.5),
          (d / 340) * 1000,
        );
      }
    } else if (e.ty === "comet" || e.ty === "fan") {
      const m = e.ty === "fan" ? 7 : 1;
      for (let k = 0; k < m; k++) {
        const a = e.ty === "fan" ? (k / (m - 1) - 0.5) * 1.5 + e.a : e.a,
          v = e.ty === "fan" ? 55 : 45 + Math.random() * 20;
        spawn(
          bx_,
          y0,
          bz_,
          Math.sin(a) * v * -uy,
          Math.cos(a) * v,
          Math.sin(a) * v * ux,
          2.6,
          e.c,
          [1, 0.9, 0.7],
          0.6,
          9.8,
          1.2,
          3.6,
          0.3,
          0,
        );
      }
      if (e.ty === "fan") sound(bx_, 10, bz_, false, "");
    }
  };
  let prevT = -1,
    t0 = performance.now() / 1000;
  const self = { flash: 0, sim: 0 };
  function update(dt, c, day) {
    const live = c.month === 7 && day < 0.03;
    const fixed = PH !== null;
    self.sim += dt;
    const st =
      fixed || Q.get("fw")
        ? self.sim + (fixed ? Math.max(0, (c.phase - P0) * DAY) : 0)
        : ((((c.phase - P0) % 1) + 1) % 1) * DAY;
    self.st = st;
    const on = (live || Q.get("fw")) && st >= 0 && st < DUR + 8;
    pts.visible = on || (pts.visible && self.flash > 0.01);
    if (!on && !pts.visible) {
      prevT = -1;
      flashL.intensity = 0;
      return;
    }
    if (prevT < 0 || st < prevT || st - prevT > 3) prevT = st - dt;
    if (on) for (const e of ev) if (e.t > prevT && e.t <= st) launch(e);
    prevT = st;
    for (let q = pending.length - 1; q >= 0; q--) {
      const [i, e] = pending[q];
      if (age[i] + dt >= life[i]) {
        burst(px[i], py[i], pz[i], e);
        life[i] = -1;
        pending.splice(q, 1);
      }
    }
    if (Math.random() < dt * 20)
      for (const [i] of pending)
        spawn(
          px[i],
          py[i],
          pz[i],
          (Math.random() - 0.5) * 2,
          -3,
          (Math.random() - 0.5) * 2,
          0.6,
          [1, 0.6, 0.3],
          [0.6, 0.3, 0.1],
          2,
          3,
          0,
          1.4,
          0.6,
          0,
        );
    let n = 0,
      nl = 0;
    const tt = performance.now() / 1000;
    for (let i = 0; i < NP; i++) {
      if (life[i] < 0) continue;
      age[i] += dt;
      if (age[i] >= life[i]) {
        life[i] = -1;
        continue;
      }
      const f = Math.exp(-drag[i] * dt);
      vx[i] *= f;
      vy[i] = vy[i] * f - grav[i] * dt;
      vz[i] *= f;
      px[i] += vx[i] * dt;
      py[i] += vy[i] * dt;
      pz[i] += vz[i] * dt;
      const k = age[i] / life[i],
        cm = Math.min(1, Math.max(0, (k - 0.45) * 2.5)),
        fade = kind[i] === 1 ? Math.pow(1 - k, 0.8) : (1 - k * k * k) * (k > 0.85 ? (1 - k) / 0.15 : 1),
        fl = 1 - flk[i] * (Math.random() < 0.5 ? 1 : 0) * (k > 0.3 ? 1 : 0);
      const br = (kind[i] === 2 ? 0.8 : 1.05) * fade * fl;
      const r = c1[i * 3] * (1 - cm) + c2[i * 3] * cm,
        g = c1[i * 3 + 1] * (1 - cm) + c2[i * 3 + 1] * cm,
        b = c1[i * 3 + 2] * (1 - cm) + c2[i * 3 + 2] * cm;
      if (trl[i] > 0) {
        const tau = trl[i] * 0.35,
          o = nl * 6;
        lpos[o] = px[i];
        lpos[o + 1] = py[i];
        lpos[o + 2] = pz[i];
        lpos[o + 3] = px[i] - vx[i] * tau;
        lpos[o + 4] = py[i] - vy[i] * tau + grav[i] * tau * tau * 0.5;
        lpos[o + 5] = pz[i] - vz[i] * tau;
        const lb = br * 0.55;
        lcol[o] = r * lb;
        lcol[o + 1] = g * lb;
        lcol[o + 2] = b * lb;
        lcol[o + 3] = lcol[o + 4] = lcol[o + 5] = 0;
        nl++;
      }
      for (let j = 0; j < K; j++) {
        const tau = ((trl[i] * j) / K) * 0.12;
        if (j > 0 && trl[i] <= 0) break;
        const o = n * 3;
        pos[o] = px[i] - vx[i] * tau;
        pos[o + 1] = py[i] - vy[i] * tau + grav[i] * tau * tau * 0.5;
        pos[o + 2] = pz[i] - vz[i] * tau;
        const w = j === 0 ? 1 : Math.pow(1 - j / K, 1.6) * 0.6;
        col[o] = r * br;
        col[o + 1] = g * br;
        col[o + 2] = b * br;
        siz[n] = sz[i] * (j === 0 ? 1 : 0.75);
        alp[n] = w;
        n++;
      }
    }
    geo.setDrawRange(0, n);
    lgeo.setDrawRange(0, nl * 2);
    lgeo.attributes.position.needsUpdate = lgeo.attributes.color.needsUpdate = true;
    lines.visible = pts.visible;
    for (const a of ["position", "color", "aS", "aA"]) geo.attributes[a].needsUpdate = true;
    mat.uniforms.uPx.value = renderer.domElement.height / (2 * Math.tan((camera.fov * Math.PI) / 360));
    self.flash *= Math.exp(-dt * 3.5);
    flashL.intensity = self.flash * 2.5;
    glows.forEach((g, k) => {
      const u = waterU.uFW.value[k];
      if (!g.visible) {
        u.w = 0;
        return;
      }
      u.set(g.position.x, g.position.y, g.position.z, g.userData.a * 1.4);
      waterU.uFWc.value[k].set(g.material.color.r, g.material.color.g, g.material.color.b);
    });
    for (const g of glows) {
      if (!g.visible) continue;
      g.userData.a *= Math.exp(-dt * 1.6);
      g.material.opacity = g.userData.a * 0.6;
      if (g.userData.a < 0.01) g.visible = false;
    }
  }
  return { update, BAR, pts, geo, pending, glows, ev, self };
})();
G.FW = FW;
