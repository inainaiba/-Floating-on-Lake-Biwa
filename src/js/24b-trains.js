/* ---------- 湖西線の電車：高架（24-shore-landmarks.js の G.kosei）の上を、共有時計で決まった時刻に走る（見る人みな同じ電車）。
   上り・下りとも約4分ごと、8両、時速約100km。朝5時ごろから夜11時半ごろまで。夜は窓が灯り、湖面に灯りの筋が映る ---------- */
G.trains = (() => {
  const K = G.kosei;
  if (!K || K.pts.length < 2) return null;
  const P = K.pts,
    cum = [0];
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const LEN = cum[cum.length - 1],
    V = 28, // 実寸 m/s
    HEAD = 240, // 同じ向きの電車の間隔（秒）
    CARS = 8,
    CAR = 20, // 1両の長さ（作品の中では実物大。位置の上では5倍の100mに当たる）
    NT = Math.ceil(LEN / V / HEAD) + 1,
    N = NT * 2 * CARS;
  // 道のり s（実寸m）の所の位置・向き・桁の高さ
  function at(s) {
    s = Math.max(0, Math.min(LEN - 0.01, s));
    let lo = 0,
      hi = cum.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (cum[m] <= s) lo = m;
      else hi = m;
    }
    const u = (s - cum[lo]) / (cum[hi] - cum[lo] || 1),
      a = P[lo],
      b = P[hi];
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, K.ht[lo] + (K.ht[hi] - K.ht[lo]) * u, Math.atan2(b[1] - a[1], b[0] - a[0]), K.tun[lo] && K.tun[hi]];
  }
  const body = new THREE.InstancedMesh(new THREE.BoxGeometry(CAR - 0.6, 3.1, 2.9), new THREE.MeshLambertMaterial({ color: 0xd8d4c8 }), N),
    winM = new THREE.MeshBasicMaterial({ color: 0x2a3036 }),
    win = new THREE.InstancedMesh(new THREE.BoxGeometry(CAR - 2.2, 0.9, 2.96), winM, N);
  // 湖面に映る窓の灯りの筋：遠い小さな灯りは水面の映り込み（14-water.js）では筋にならないので、
  // 車両ごとに、鏡に映った窓の見える水面の所へ、こちらへ伸びる縦長の光を置く
  const glowM = new THREE.MeshBasicMaterial({
      map: cvTex(32, 128, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, w, 0);
        gr.addColorStop(0, "rgba(255,255,255,0)");
        gr.addColorStop(0.5, "rgba(255,255,255,1)");
        gr.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
        g.globalCompositeOperation = "destination-in";
        const gv = g.createLinearGradient(0, 0, 0, h);
        gv.addColorStop(0, "rgba(0,0,0,0)");
        gv.addColorStop(0.25, "rgba(0,0,0,1)");
        gv.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = gv;
        g.fillRect(0, 0, w, h);
        // さざ波で途切れる：横の縞ごとに明るさを変える
        const R = rnd(2424);
        g.globalCompositeOperation = "destination-out";
        for (let y = 0; y < h; y += 2) {
          g.fillStyle = `rgba(0,0,0,${(R() * 0.75).toFixed(2)})`;
          g.fillRect(R() * w * 0.3 - w * 0.15, y, w, 2);
        }
      }),
      color: 0x000000,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
    glow = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), glowM, N),
    GLOW = new THREE.Color(0xffc48a);
  for (const m of [body, win, glow]) {
    m.userData.noChunk = true; // 毎フレーム動かす
    m.frustumCulled = false;
    m.count = 0;
    scene.add(m);
  }
  const M = new THREE.Matrix4(),
    Qn = new THREE.Quaternion(),
    Y = new THREE.Vector3(0, 1, 0),
    V3 = new THREE.Vector3(),
    W3 = new THREE.Vector3(),
    one = new THREE.Vector3(1, 1, 1),
    WIN_DAY = new THREE.Color(0x2a3036),
    WIN_NIGHT = new THREE.Color(0xffd7a0).multiplyScalar(2.6), // 1より明るくして、にじむようにする
    C3 = new THREE.Vector3(),
    Sg = new THREE.Vector3();
  return {
    update(c, day) {
      const run = c.phase > 0.22 && c.phase < 0.98;
      const lit = Math.min(1, Math.max(0, (0.2 - day) / 0.1)),
        cp = camera.position,
        wy = water.position.y;
      let n = 0,
        ng = 0;
      if (run)
        for (const dir of [1, -1])
          for (let k = 0; k < NT; k++) {
            // 先頭の道のり：時計から決める。向きごとに半周期ずらす
            const head = ((((c.t + (dir < 0 ? HEAD / 2 : 0)) % HEAD) + HEAD) % HEAD) * V + k * HEAD * V,
              s0 = dir > 0 ? head : LEN - head;
            if (head > LEN + CARS * CAR * 5) continue;
            for (let j = 0; j < CARS; j++) {
              const s = s0 - dir * (j * CAR / S + CAR / S / 2);
              if (s < 0 || s > LEN) continue;
              const [x, y, h, a, inTunnel] = at(s);
              if (inTunnel) continue; // トンネルの中は見えない
              const off = dir * 1.0; // 上下線で横にずらす（桁の幅は4）
              Qn.setFromAxisAngle(Y, -a);
              V3.set(x * S - Math.sin(a) * off, h + 0.45 + 1.75, y * S + Math.cos(a) * off);
              M.compose(V3, Qn, one);
              body.setMatrixAt(n, M);
              W3.copy(V3);
              W3.y += 0.35;
              M.compose(W3, Qn, one);
              win.setMatrixAt(n, M);
              n++;
              // 窓の鏡像（水面で折り返した点）とカメラを結ぶ線が水面を切る所に筋を置く。そこが湖の上のときだけ
              if (lit > 0.01 && cp.y > wy + 0.2) {
                const my = 2 * wy - W3.y,
                  t = (cp.y - wy) / (cp.y - my),
                  gx = cp.x + (W3.x - cp.x) * t,
                  gz = cp.z + (W3.z - cp.z) * t,
                  d = Math.hypot(gx - cp.x, gz - cp.z);
                if (d > 30 && inLake(gx / S, gz / S)) {
                  Qn.setFromAxisAngle(Y, Math.atan2(cp.x - gx, cp.z - gz));
                  C3.set(gx + ((cp.x - gx) / d) * d * 0.2, wy + 0.05, gz + ((cp.z - gz) / d) * d * 0.2);
                  M.compose(C3, Qn, Sg.set(CAR * 0.22 * Math.max(1, d / 700), 1, d * 0.5));
                  glow.setMatrixAt(ng++, M);
                }
              }
            }
          }
      body.count = win.count = n;
      glow.count = ng;
      body.instanceMatrix.needsUpdate = win.instanceMatrix.needsUpdate = glow.instanceMatrix.needsUpdate = true;
      // 夕方から窓が灯る
      winM.color.lerpColors(WIN_DAY, WIN_NIGHT, lit);
      glowM.color.copy(GLOW).multiplyScalar(0.55 * lit);
    },
  };
})();
