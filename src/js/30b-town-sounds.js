/* ---------- 人の営みの音：姿は見せず、音だけで暮らしを感じさせる（2026年11月） ----------
   ・踏切：対岸の地上を走る電車が近づくと、遠くで「カンカン」と鳴って、通り過ぎると止む（高架の湖西線には踏切がない）
   ・夕方の放送：町の防災無線が夕方5時（冬は4時半）に「家路」を流す。いくつもの拡声器から少しずつ遅れて届き、山にこだまする
   ・学校のチャイム：朝・昼・午後に、岸の集落の学校から「キーンコーンカーンコーン」
   ・漁船の発動機：夜明けから朝のうちに、沖へ出る漁船の「トントントン」という低い音が遠くを横切る
   ・風鈴：夏、岸の集落の近くで、風が吹くと軒先の風鈴が鳴る
   どれも岸（集落）に近いほど大きく、沖では聞こえない。霧や雨の日はこもる */
{
  const T = { n: {}, gray: 0, lastH: null, nearV: 0, nextChk: 0, nextBoat: 0, nextBell: 0, xing: null, village: null };
  // いちばん近い集落の家（実寸）と、そこまでの隔たり（2秒ごとに数え直す）
  function nearestVillage() {
    const cx = camera.position.x / S,
      cz = camera.position.z / S;
    let bd = 1e9,
      bx = 0,
      bz = 0;
    for (let i = 0; i < houses.length; i += 3) {
      const h = houses[i],
        d = (h.x - cx) ** 2 + (h.y - cz) ** 2;
      if (d < bd) (bd = d), (bx = h.x), (bz = h.y);
    }
    return { x: bx, y: bz, d: Math.sqrt(bd) };
  }
  // 音の出口：左右の振り分けと、こもり（遠いほど・霧や雨の日ほど高い音が落ちる）と、残響
  function out(x, z, vol, lpF, rev = 0.5) {
    const ac = SND.ctx,
      g = ac.createGain(),
      lp = ac.createBiquadFilter(),
      p = ac.createStereoPanner(),
      r = ac.createGain();
    g.gain.value = vol;
    lp.type = "lowpass";
    lp.frequency.value = lpF * (1 - 0.5 * Math.min(1, T.gray)); // 霧・曇り・雨の日はこもる
    p.pan.value = panV(x, z) * 0.7;
    r.gain.value = rev;
    g.connect(lp).connect(p);
    p.connect(SND.master);
    p.connect(r);
    r.connect(SND.rev);
    return g;
  }
  // 澄んだ金属の音（倍音を重ねて、長く減衰させる）
  function ding(st, f, vol, dur, dest, parts = [1, 2.76, 5.4]) {
    const ac = SND.ctx;
    parts.forEach((m, i) => {
      const o = ac.createOscillator(),
        g = ac.createGain();
      o.type = "sine";
      o.frequency.value = f * m;
      g.gain.setValueAtTime(0, st);
      g.gain.linearRampToValueAtTime(vol / (1 + i * 1.6), st + 0.004);
      g.gain.exponentialRampToValueAtTime(1e-5, st + dur / (1 + i * 0.7));
      o.connect(g).connect(dest);
      o.start(st);
      o.stop(st + dur + 0.05);
    });
  }
  // 拡声器から流れる旋律：やわらかい矩形波を、いくつもの拡声器から少しずつ遅らせて重ね、こだまにする
  function speakerTune(notes, beat, x, z, vol, lpF) {
    T.n.tune = (T.n.tune || 0) + 1;
    const ac = SND.ctx,
      t0 = ac.currentTime + 0.3,
      dest = out(x, z, vol, lpF, 0.9);
    for (const [delay, gain] of [
      [0, 1],
      [0.42, 0.55],
      [1.05, 0.35],
      [1.9, 0.22],
    ]) {
      const bus = ac.createGain(),
        lp = ac.createBiquadFilter();
      bus.gain.value = gain;
      lp.type = "lowpass";
      lp.frequency.value = 1600 - delay * 400; // 遠い拡声器ほどこもる
      bus.connect(lp).connect(dest);
      let t = t0 + delay;
      for (const [n, len] of notes) {
        if (n !== null) {
          const o = ac.createOscillator(),
            o2 = ac.createOscillator(),
            g = ac.createGain(),
            f = 440 * Math.pow(2, (n - 69) / 12);
          o.type = "square";
          o2.type = "sine";
          o.frequency.value = f;
          o2.frequency.value = f * 1.003; // わずかにずらして揺らぎを
          const d = len * beat;
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.05, t + 0.06);
          g.gain.setValueAtTime(0.05, t + d * 0.8);
          g.gain.linearRampToValueAtTime(0, t + d * 0.98);
          o.connect(g);
          o2.connect(g);
          g.connect(bus);
          o.start(t);
          o2.start(t);
          o.stop(t + d);
          o2.stop(t + d);
        }
        t += len * beat;
      }
    }
  }
  // 「家路」（ドヴォルザーク『新世界より』第2楽章の旋律）：ミソソー ミレドー レミソミ レー ／ ミソソー ミレドー レミレド ドー
  const IEJI = [
    [64, 1], [67, 0.5], [67, 1.5], [64, 1], [62, 0.5], [60, 1.5], [62, 1], [64, 0.5], [67, 1], [64, 0.5], [62, 3],
    [null, 1],
    [64, 1], [67, 0.5], [67, 1.5], [64, 1], [62, 0.5], [60, 1.5], [62, 1], [64, 0.5], [62, 1], [60, 0.5], [60, 3],
  ];
  // 学校のチャイム（ウェストミンスターの鐘）：ミドレソ ソレミド
  const CHIME = [
    [76, 1], [72, 1], [74, 1], [67, 2],
    [67, 1], [74, 1], [76, 1], [72, 2],
  ];
  // 踏切：2つの高さの「カン」を交互に、1秒に2回ほど。電車が通り過ぎるまで
  function crossing(dt, list) {
    const ac = SND.ctx,
      tr = list.filter((q) => q.ground && q.d < 450).sort((a, b) => a.d - b.d)[0];
    if (tr && !T.xing) {
      // 踏切は電車の少し先の、線路と道が交わる所。位置は電車の近くに置く
      T.xing = { x: tr.x, z: tr.z, next: ac.currentTime, k: 0, until: ac.currentTime + 14 + Math.random() * 6 };
    }
    const X = T.xing;
    if (!X) return;
    if (ac.currentTime > X.until) {
      if (!tr) T.xing = null; // 通り過ぎたら止む（次の電車まで鳴らない）
      return;
    }
    if (ac.currentTime >= X.next) {
      const d = Math.hypot(X.x - camera.position.x, X.z - camera.position.z),
        v = Math.min(0.5, 70 / (d + 70)) * 0.22;
      ding(ac.currentTime, X.k++ % 2 ? 690 : 760, v, 0.5, out(X.x, X.z, 1, 2600 - Math.min(1800, d * 3), 0.6), [1, 2.1, 3.3]);
      X.next = ac.currentTime + 0.52;
    }
  }
  // 漁船の発動機：低い「トン」を一定の間合いで続け、遠くを横切る（左右がゆっくり移る）
  function fishingBoat(nearShore) {
    T.n.boat = (T.n.boat || 0) + 1;
    const ac = SND.ctx,
      t0 = ac.currentTime,
      dur = 25 + Math.random() * 20,
      a0 = Math.random() * 6.28,
      a1 = a0 + (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.8),
      p = ac.createStereoPanner(),
      g = ac.createGain(),
      lp = ac.createBiquadFilter(),
      vol = 0.05 * (0.5 + 0.5 * nearShore);
    lp.type = "lowpass";
    lp.frequency.value = 260;
    p.pan.setValueAtTime(Math.sin(a0 - yaw), t0);
    p.pan.linearRampToValueAtTime(Math.sin(a1 - yaw), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + dur * 0.35);
    g.gain.linearRampToValueAtTime(vol * 0.7, t0 + dur * 0.65);
    g.gain.linearRampToValueAtTime(0, t0 + dur);
    g.connect(lp).connect(p).connect(SND.master);
    const rate = 4.2 + Math.random() * 1.5;
    for (let t = 0; t < dur; t += 1 / rate) {
      const o = ac.createOscillator(),
        e = ac.createGain(),
        st = t0 + t + (Math.random() - 0.5) * 0.01;
      o.type = "triangle";
      o.frequency.setValueAtTime(70, st);
      o.frequency.exponentialRampToValueAtTime(46, st + 0.12);
      e.gain.setValueAtTime(0, st);
      e.gain.linearRampToValueAtTime(1, st + 0.008);
      e.gain.exponentialRampToValueAtTime(0.001, st + 0.14);
      o.connect(e).connect(g);
      o.start(st);
      o.stop(st + 0.16);
    }
  }
  // 時刻 h0 を、前のフレームから今のフレームの間にまたいだか（一日の終わりをまたぐ場合も）
  const crossed = (h0, a, b) => (a <= b ? a < h0 && h0 <= b : h0 > a || h0 <= b);

  G.townSnd = T; // 確認用（鳴らした回数 T.n）
  onFrame(160, (f) => {
    if (!SND.ctx || !SND.on || isFar) {
      T.lastH = null;
      return;
    }
    const c = f.c,
      h = c.phase * 24,
      ac = SND.ctx,
      now = ac.currentTime;
    if (now > T.nextChk) {
      T.nextChk = now + 2;
      T.village = nearestVillage();
    }
    const V = T.village;
    if (!V) return;
    // 集落からの近さ（実寸）：300mでいちばん大きく、3kmで消える
    const near = Math.max(0, Math.min(1, 1 - (V.d - 300) / 2700)),
      vx = V.x * S,
      vz = V.y * S,
      rainy = (f.wxNow.rain || 0) > 0.3;
    T.gray = Math.max(f.wxNow.gray || 0, f.wxNow.rain || 0);
    // 踏切
    crossing(f.dt, G.trainNear || []);
    // 時刻が大きく飛んだとき（場面の切り替えなど）は鳴らさない
    if (T.lastH !== null && T.lastH !== h && (h - T.lastH + 24) % 24 < 0.5 && near > 0.02) {
      const winter = c.month <= 1 || c.month >= 9;
      // 夕方の放送（雨の日も流れる）
      if (crossed(winter ? 16.5 : 17, T.lastH, h)) speakerTune(IEJI, 0.62, vx, vz, 0.55 * near, 1500);
      // 学校のチャイム（春・夏・秋休み以外の月。8月は鳴らない）
      if (c.month !== 7 && c.month !== 2)
        for (const ch of [8.5, 12.3, 15.6]) if (crossed(ch, T.lastH, h)) speakerTune(CHIME, 0.75, vx + 40, vz - 30, 0.42 * near, 2200);
    }
    T.lastH = h;
    // 漁船の発動機：夜明けから朝（4時半〜9時）。冬はやや少ない
    if (h > 4.5 && h < 9 && now > T.nextBoat && !rainy) {
      T.nextBoat = now + 50 + Math.random() * 90;
      if (Math.random() < (c.month <= 1 ? 0.5 : 0.85)) fishingBoat(near);
    }
    // 風鈴：夏（6〜8月）、昼から宵、集落の近くで風があるとき
    if (c.month >= 5 && c.month <= 7 && h > 9 && h < 22 && near > 0.35 && now > T.nextBell && !rainy) {
      const ws = Math.min(1, f.W.s / 6);
      T.nextBell = now + (2 + Math.random() * 7) / (0.2 + ws);
      if (ws > 0.08) {
        const base = 2050 + Math.random() * 380,
          v = 0.022 * near * (0.4 + ws);
        // 短冊が揺れて、1〜3回続けて鳴る
        const n = 1 + Math.floor(Math.random() * 3),
          dest = out(vx + (Math.random() - 0.5) * 60, vz + (Math.random() - 0.5) * 60, 1, 7000, 0.35);
        for (let k = 0; k < n; k++) ding(now + k * (0.18 + Math.random() * 0.25), base * (1 + (Math.random() - 0.5) * 0.01), v * (1 - k * 0.25), 2.2, dest, [1, 2.43, 4.1]);
      }
    }
  });
}
