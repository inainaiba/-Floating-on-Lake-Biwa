/* ---------- 人の営みの音：姿は見せず、音だけで暮らしを感じさせる（2026年11月） ----------
   ・踏切：対岸の地上を走る電車が近づくと、遠くで「カンカン」と鳴って、通り過ぎると止む（高架の湖西線には踏切がない）
   ・夕方の放送：町の防災無線が夕方5時（冬は4時半）に「家路」を流す。いくつもの拡声器から少しずつ遅れて届き、山にこだまする
   ・漁船の発動機：夜明けから朝のうちに、沖へ出る漁船の「トントントン」という低い音が遠くを横切る
   ・風鈴：夏、岸の集落の近くで、風が吹くと軒先の風鈴が鳴る
   ・新聞配達のバイク：夜明け前（4時半〜5時半）、集落の道を小さなバイクが止まっては走る音が遠くを移っていく
   ・豆腐屋のラッパ：夕方（4時〜5時半）、「トーフー」と2つの音のラッパが、少しずつ場所を変えて聞こえる
   ・夏祭りの太鼓：7・8月の宵（7時〜9時）、遠くの集落から太鼓の拍子が風にのって届く
   ・火の用心：冬（12〜2月）の夜（8時〜10時）、拍子木の「カチ、カチ」が通りを移っていく（声は入れない）
   どれも岸（集落）に近いほど大きく、沖では聞こえない。霧や雨の日はこもる */
{
  const T = { n: {}, gray: 0, lastH: null, nearV: 0, nextChk: 0, nextBoat: 0, nextBell: 0, nextLife: 0, xing: null, village: null };
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

  // ---- 時刻で重なる暮らしの音（2026年11月の追加）----
  // 新聞配達のバイク：小さなエンジン（のこぎり波）が、走っては止まり、また走る。左右がゆっくり移る
  function paperBike(vx, vz, near) {
    T.n.bike = (T.n.bike || 0) + 1;
    const ac = SND.ctx,
      t0 = ac.currentTime + 0.1,
      dur = 30,
      dest = out(vx, vz, 0.05 * near, 900, 0.4),
      o = ac.createOscillator(),
      g = ac.createGain(),
      p = ac.createStereoPanner();
    o.type = "sawtooth";
    p.pan.setValueAtTime(-0.6 + Math.random() * 0.4, t0);
    p.pan.linearRampToValueAtTime(0.2 + Math.random() * 0.4, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    let t = t0;
    while (t < t0 + dur - 4) {
      const run = 2 + Math.random() * 3,
        stop = 1.5 + Math.random() * 2.5;
      o.frequency.setValueAtTime(48, t);
      o.frequency.linearRampToValueAtTime(95 + Math.random() * 20, t + 0.8);
      o.frequency.linearRampToValueAtTime(80, t + run);
      o.frequency.linearRampToValueAtTime(38, t + run + 0.6);
      g.gain.linearRampToValueAtTime(1, t + 0.3);
      g.gain.setValueAtTime(1, t + run);
      g.gain.linearRampToValueAtTime(0.25, t + run + 0.6); // 止まってアイドリング（郵便受けに入れている間）
      t += run + stop;
    }
    g.gain.linearRampToValueAtTime(0, t + 1.5);
    o.connect(g).connect(p).connect(dest);
    o.start(t0);
    o.stop(t + 1.6);
  }
  // 豆腐屋のラッパ：リードの鳴る2つの音「トー（高）フー（低）」を、間をおいて2回
  function tofuHorn(x, z, vol) {
    T.n.tofu = (T.n.tofu || 0) + 1;
    const ac = SND.ctx,
      t0 = ac.currentTime + 0.2,
      dest = out(x, z, vol, 1800, 0.7);
    for (const [st, f, d] of [
      [0, 659, 0.9],
      [0.95, 587, 1.3],
      [3.6, 659, 0.9],
      [4.55, 587, 1.5],
    ]) {
      const o = ac.createOscillator(),
        o2 = ac.createOscillator(),
        g = ac.createGain(),
        bp = ac.createBiquadFilter();
      o.type = "sawtooth";
      o2.type = "square";
      o.frequency.value = f;
      o2.frequency.value = f * 1.004;
      bp.type = "bandpass";
      bp.frequency.value = f * 2;
      bp.Q.value = 1.2;
      g.gain.setValueAtTime(0, t0 + st);
      g.gain.linearRampToValueAtTime(0.06, t0 + st + 0.08);
      g.gain.setValueAtTime(0.06, t0 + st + d - 0.15);
      g.gain.linearRampToValueAtTime(0, t0 + st + d);
      o.connect(bp);
      o2.connect(bp);
      bp.connect(g).connect(dest);
      for (const q of [o, o2]) q.start(t0 + st), q.stop(t0 + st + d + 0.05);
    }
  }
  // 太鼓の一打：低い膜の音（すぐ下がる高さ）と、ばちの当たる短いノイズ
  function drum(st, vol, dest, big) {
    const ac = SND.ctx,
      o = ac.createOscillator(),
      g = ac.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(big ? 92 : 120, st);
    o.frequency.exponentialRampToValueAtTime(big ? 52 : 70, st + 0.35);
    g.gain.setValueAtTime(0, st);
    g.gain.linearRampToValueAtTime(vol, st + 0.006);
    g.gain.exponentialRampToValueAtTime(1e-4, st + (big ? 1.1 : 0.6));
    o.connect(g).connect(dest);
    o.start(st);
    o.stop(st + 1.2);
  }
  // 夏祭りの太鼓：「ドン、ドン、ドドン」の拍子を数回。遠くから風にのって
  function festivalDrums(x, z, vol) {
    T.n.drum = (T.n.drum || 0) + 1;
    const ac = SND.ctx,
      t0 = ac.currentTime + 0.2,
      dest = out(x, z, vol, 700, 0.9),
      pat = [0, 0.62, 1.24, 1.55, 2.48, 3.1, 3.72, 4.03],
      reps = 3 + Math.floor(Math.random() * 3);
    for (let r = 0; r < reps; r++) for (const [k, b] of pat.entries()) drum(t0 + r * 4.96 + b, k % 4 === 0 ? 0.5 : 0.32, dest, k % 4 === 0);
  }
  // 拍子木：硬い木の「カチ」（高い帯域の短い音）を2つ。間をおいて数回、少しずつ遠ざかる
  function clappers(x, z, vol) {
    T.n.clap = (T.n.clap || 0) + 1;
    const ac = SND.ctx,
      t0 = ac.currentTime + 0.2;
    for (let r = 0; r < 4; r++) {
      const dest = out(x + r * 25, z, vol * (1 - r * 0.18), 4000, 0.8);
      for (const dt of [0, 0.28]) {
        const st = t0 + r * 6 + dt;
        for (const f of [1850, 2900]) {
          const o = ac.createOscillator(),
            g = ac.createGain();
          o.type = "triangle";
          o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.02);
          g.gain.setValueAtTime(0, st);
          g.gain.linearRampToValueAtTime(f < 2000 ? 0.25 : 0.12, st + 0.002);
          g.gain.exponentialRampToValueAtTime(1e-4, st + 0.09);
          o.connect(g).connect(dest);
          o.start(st);
          o.stop(st + 0.1);
        }
      }
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
    }
    T.lastH = h;
    // 漁船の発動機：夜明けから朝（4時半〜9時）。冬はやや少ない
    const hush = (SND.quiet || 0) > 0.3; // 音の余白（30-audio.js）の間は、ときどき鳴る音を控える
    if (h > 4.5 && h < 9 && now > T.nextBoat && !rainy && !hush) {
      T.nextBoat = now + 50 + Math.random() * 90;
      if (Math.random() < (c.month <= 1 ? 0.5 : 0.85)) fishingBoat(near);
    }
    // 時刻で重なる暮らしの音：集落の近くで、ときどき（それぞれ決まった時間帯の中で）
    if (near > 0.15 && now > T.nextLife && !hush) {
      T.nextLife = now + 35 + Math.random() * 60;
      const m = c.month,
        ox = vx + (Math.random() - 0.5) * 120,
        oz = vz + (Math.random() - 0.5) * 120;
      if (h > 4.5 && h < 5.6 && Math.random() < 0.7) paperBike(ox, oz, near);
      else if (h > 16 && h < 17.5 && !rainy && Math.random() < 0.45) tofuHorn(ox, oz, 0.5 * near);
      else if ((m === 6 || m === 7) && h > 19 && h < 21 && !rainy && Math.random() < 0.6) festivalDrums(ox, oz, 0.55 * near);
      else if ((m >= 11 || m <= 1) && h > 20 && h < 22 && Math.random() < 0.55) clappers(ox, oz, 0.3 * near);
    }
    // 風鈴：夏（6〜8月）、昼から宵、集落の近くで風があるとき
    if (c.month >= 5 && c.month <= 7 && h > 9 && h < 22 && near > 0.35 && now > T.nextBell && !rainy && !hush) {
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
