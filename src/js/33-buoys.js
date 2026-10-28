const VIS = new Set(
  (() => {
    try {
      return JSON.parse(localStorage.getItem("floating.visited.v1") || "[]");
    } catch (_) {
      return [];
    }
  })(),
);
window.__VIS = VIS;
window.__buoys = (() => {
  const LIST = __BUOYS__;
  const red = new THREE.MeshStandardMaterial({
      color: 0xff4a24,
      roughness: 0.3,
      metalness: 0,
      emissive: 0x3a0c00,
    }),
    rope = new THREE.MeshLambertMaterial({ color: 0xe8e2cf }),
    hitM = new THREE.MeshBasicMaterial({ visible: false });
  const placed = [],
    BUOY_HALO = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const g = c.getContext("2d"),
        gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, "rgba(255,255,255,.8)");
      gr.addColorStop(0.25, "rgba(255,255,255,.3)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();
  const items = LIST.map((b) => {
    const [x0, y0] = ll(b.lon, b.lat);
    let x = x0,
      y = y0;
    for (let k = 0; k < 60 && depth(x, y) < 1.5; k++) {
      const a = k * 2.4,
        r = 10 + k * 8;
      x = x0 + Math.cos(a) * r;
      y = y0 + Math.sin(a) * r;
    }
    const g = new THREE.Group(),
      ball = new THREE.Mesh(new THREE.SphereGeometry(0.8, 24, 16), red);
    ball.position.y = 0.45;
    g.add(ball);
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.045, 6, 32, Math.PI * 1.25), rope);
    loop.rotation.set(0, Math.PI / 2, -Math.PI * 0.12);
    loop.position.y = 0.45;
    g.add(loop);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), rope);
    knot.position.set(0, 1.27, 0);
    g.add(knot);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(7, 8, 6), hitM);
    hit.position.y = 1;
    g.add(hit);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: BUOY_HALO,
        color: 0xff7a50,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0,
        fog: false,
      }),
    );
    glow.position.y = 0.6;
    glow.scale.set(8, 8, 1);
    glow.visible = false;
    g.add(glow);
    for (const p of placed) {
      if (Math.hypot(p[0] - x * S, p[1] - y * S) < 8) {
        x += 40;
      }
    }
    placed.push([x * S, y * S]);
    g.position.set(x * S, 0, y * S);
    g.traverse((o) => {
      if (o.isMesh && o !== hit) o.castShadow = true;
    });
    scene.add(g);
    return { g, ball, hit, glow, url: b.url, name: b.name || "", ph: Math.random() * 6 };
  });
  const ray = new THREE.Raycaster(),
    v2 = new THREE.Vector2(),
    NEAR = 75;
  let down = null;
  const pick = (e) => {
    const r = gl.getBoundingClientRect();
    v2.set(((e.clientX - r.left) / r.width) * 2 - 1, (-(e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(v2, camera);
    const hs = ray.intersectObjects(
      items.map((i) => i.hit),
      false,
    );
    return hs.length ? items.find((i) => i.hit === hs[0].object) : null;
  };
  gl.addEventListener("pointerdown", (e) => {
    down = [e.clientX, e.clientY, performance.now()];
  });
  gl.addEventListener("pointerup", (e) => {
    if (!down || STATE !== "lake" || isFar) return;
    const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]),
      dtm = performance.now() - down[2];
    down = null;
    if (moved > 8 || dtm > 600) return;
    const it = pick(e);
    if (!it) return;
    const dB = Math.hypot(it.g.position.x - B.x * S, it.g.position.z - B.y * S);
    if (dB > NEAR) {
      const hn = document.getElementById("hint");
      hn.innerHTML =
        'ブイに近づいてからタップ<br><span style="font-size:11px;opacity:.8">Drift closer to the buoy</span>';
      hn.style.opacity = 1;
      clearTimeout(hn._t);
      hn._t = setTimeout(() => (hn.style.opacity = 0), 2200);
      return;
    }
    const a = document.createElement("a");
    VIS.add(it.url);
    try {
      localStorage.setItem("floating.visited.v1", JSON.stringify([...VIS]));
    } catch (_) {}
    a.href = it.url;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
  gl.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || ptrs.size) return;
    gl.style.cursor = STATE === "lake" && !isFar && pick(e) ? "pointer" : "";
  });
  function update(t, night) {
    const qx = B.x * S,
      qz = B.y * S;
    for (const it of items) {
      const near = Math.hypot(it.g.position.x - qx, it.g.position.z - qz) < NEAR;
      it.nk = (it.nk || 0) + ((near ? 1 : 0) - (it.nk || 0)) * 0.04;
      if (!it.rip) {
        const rm = new THREE.Mesh(
          new THREE.RingGeometry(0.9, 1.05, 40).rotateX(-Math.PI / 2),
          new THREE.MeshBasicMaterial({ color: 0xffe2c8, transparent: true, opacity: 0, depthWrite: false }),
        );
        rm.position.y = 0.06;
        it.g.add(rm);
        it.rip = rm;
      }
      {
        const ph = (t * 0.45 + it.ph) % 1;
        it.rip.scale.setScalar(1 + ph * 5);
        it.rip.material.opacity = it.nk * (1 - ph) * 0.55;
        it.rip.visible = it.nk > 0.02;
      }
      const x = it.g.position.x,
        z = it.g.position.z,
        h = waveH(x, z, t),
        hx = waveH(x + 1, z, t) - h,
        hz = waveH(x, z + 1, t) - h;
      it.g.position.y = h * 0.9 + Math.sin(t * 1.3 + it.ph) * 0.03;
      it.g.rotation.set(hz * 0.6, 0, -hx * 0.6);
      if (it.name && !it.name.startsWith("（") && !it.lab) {
        const c = document.createElement("canvas");
        c.width = 256;
        c.height = 64;
        const x = c.getContext("2d");
        x.font = '300 34px "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif';
        x.textAlign = "center";
        x.textBaseline = "middle";
        x.shadowColor = "rgba(0,0,0,.55)";
        x.shadowBlur = 8;
        x.fillStyle = "#fff";
        x.fillText(it.name, 128, 32);
        const tx = new THREE.CanvasTexture(c);
        tx.colorSpace = THREE.SRGBColorSpace;
        const sp = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, opacity: 0, fog: false }),
        );
        sp.scale.set(13, 3.25, 1);
        sp.position.y = 4.2;
        it.g.add(sp);
        it.lab = sp;
      }
      if (it.lab) {
        it.lab.material.opacity = Math.min(1, it.nk * 1.2);
        it.lab.visible = it.nk > 0.02;
      }
      it.glow.visible = night || it.nk > 0.02;
      it.glow.material.opacity =
        (night ? 0.42 : 0) +
        it.nk * (0.35 + 0.15 * Math.sin(t * 2.2 + it.ph)) +
        0.06 * Math.sin(t * 0.7 + it.ph);
      it.glow.scale.setScalar(8 + it.nk * 4);
    }
    red.emissive.set(night ? 0x7a1e0a : 0x3a0c00);
  }
  return {
    items,
    update,
    sp: (i) => {
      const v = items[i].ball.getWorldPosition(new THREE.Vector3()).project(camera),
        r = gl.getBoundingClientRect();
      return [r.left + ((v.x + 1) / 2) * r.width, r.top + ((1 - v.y) / 2) * r.height];
    },
  };
})();
