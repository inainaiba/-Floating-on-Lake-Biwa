/* ---------- 詩と祈り：日暮れの鐘（近江八景「三井の晩鐘」） ----------
   日が沈んでしばらくすると、南湖の奥の三井寺の方から、鐘が一つ鳴る（一日に一度）。
   余韻が湖面を渡るあいだ、風の音が少し引き（G.bellQ → 30-audio.js）、建築のそばの水面に大きな輪が一つだけ、ゆっくり広がる。
   ときどき訪れる静けさ（風が止み、音が引き、湖面が凪ぐ）は 09-wind.js の hushOf。夜の浮御堂の灯りは 24-shore-landmarks.js */
{
  const MII = ll(135.853, 35.013); // 三井寺（園城寺）の鐘楼のあたり
  // 梵鐘の音：撞木の当たる鈍い音と、低い基音・少しずつずれた倍音の対。ずれが「うなり」になって、揺れながら長く消えていく。
  // 遠いほど小さく、こもった音に（湖を渡ってくる音）
  function bonsho() {
    if (!SND.ctx || !SND.on) return;
    const ac = SND.ctx,
      now = ac.currentTime + 0.05,
      dist = Math.hypot(B.x - MII[0], B.y - MII[1]),
      vol = 0.05 * (0.45 + 0.55 * Math.exp(-dist / 15000)),
      lp = ac.createBiquadFilter(),
      out = ac.createGain(),
      pn = ac.createStereoPanner();
    lp.type = "lowpass";
    lp.frequency.value = 700 + 2300 * Math.exp(-dist / 12000);
    out.gain.value = vol;
    pn.pan.value = panV(MII[0] * S, MII[1] * S) * 0.6;
    lp.connect(out).connect(pn).connect(SND.master);
    pn.connect(SND.rev);
    // 撞木の音
    {
      const s = ac.createBufferSource(),
        f = ac.createBiquadFilter(),
        g = ac.createGain();
      s.buffer = SND.brown;
      f.type = "lowpass";
      f.frequency.value = 260;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.9, now + 0.015);
      g.gain.setTargetAtTime(0.0001, now + 0.03, 0.12);
      s.connect(f).connect(g).connect(lp);
      s.start(now, Math.random() * 2);
      s.stop(now + 1.5);
    }
    // 響き：［基音に対する比、強さ、消えるまでの秒］
    const f0 = 126;
    for (const [r, a, T] of [
      [0.5, 0.4, 32],
      [1, 0.9, 22],
      [1.004, 0.6, 22],
      [2.03, 0.38, 12],
      [2.61, 0.26, 8],
      [3.36, 0.15, 5.5],
      [4.23, 0.08, 3.5],
    ]) {
      const o = ac.createOscillator(),
        g = ac.createGain();
      o.type = "sine";
      o.frequency.value = f0 * r;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(a, now + 0.02);
      g.gain.setTargetAtTime(0.0001, now + 0.06, T / 4.6);
      o.connect(g).connect(lp);
      o.start(now);
      o.stop(now + T + 1);
    }
  }
  let prevSy = null,
    bellAt = -1e9,
    ringDone = true;
  function ringBell(t) {
    bellAt = t;
    ringDone = false;
    bonsho();
  }
  G.ringBell = () => ringBell(G.lastT || 0); // 確認用（?debug のとき外から鳴らせる）
  onFrame(136, (f) => {
    G.lastT = f.t;
    const sy = G.sunY;
    // 日の入りのあと、太陽が地平の少し下（夕暮れ）を通るときに一度だけ。場面の切り替えで時刻が飛んだときは鳴らさない
    if (LOOK.show.eveningBell && !isFar && prevSy != null && f.c.phase > 0.5 && prevSy > -0.04 && sy <= -0.04 && prevSy - sy < 0.02) ringBell(f.t);
    prevSy = sy;
    const u = f.t - bellAt;
    G.bellQ = u < 0 || u > 16 ? 0 : Math.min(1, u / 1.2, (16 - u) / 10);
    // 鐘が鳴って少しあと、建築のそばの水面に輪が一つ
    if (!ringDone && u > 0.8) {
      ringDone = true;
      if (G.wideRing) {
        const dx = camera.position.x - house.position.x,
          dz = camera.position.z - house.position.z,
          d = Math.hypot(dx, dz) || 1,
          x = house.position.x + (dx / d) * 9 + (-dz / d) * 7,
          z = house.position.z + (dz / d) * 9 + (dx / d) * 7;
        if (inLake(x / S, z / S)) G.wideRing(x, z);
      }
    }
  });
}
