/* ---------- 自然音だけで、ドビュッシーの響きを：水滴・風の鳴り・光のきらめき ----------
   楽器は使わず、自然の音の素材（水滴の「ぽつ」、風が細いものを鳴らす音、きらめきの微かな音）に、
   ドビュッシーの書法をあてはめる。
   ① 全音音階　　　：夕方・夜・霧の日は、水滴と風の鳴りの音の高さを全音音階から選ぶ
   ② 五音音階　　　：朝と晴れた昼は五音音階（①と②は時刻と天気でゆっくり入れ替わる）
   ③ 平行和音　　　：風の鳴りは和音の形を保ったまま、全体が平行に滑って移る
   ④ 解決しない不協和：風の鳴りは九度・十一度を含む和音のまま、落ち着く先へ進まない
   ⑤ あいまいな拍　：水滴は 3 と 2 の重なりと揺らぎで落ち、拍がはっきりしない
   ⑥ 淡い音色　　　：どの音もやわらかい立ち上がりと、細い帯域の雑音・正弦波だけで作る
   ⑦ 弱音の幅　　　：この層の音量は小さく、強弱の幅も狭い（圧縮して大きくなりすぎない）
   ⑧ ペダルの響き　：長い残響に多く送り、音が重なって溶ける
   ⑨ 動機の断片　　：4音の短い動機を、ときどき水滴で鳴らす（移高・反行・拡大・断片化）
   ⑩ 自然の標題　　：水（岸・ヨシ・雨の近くで水滴が増える）、風（風が強いと鳴りが濃く）、
   　　　　　　　　　光（低い日のきらめきで高い微かな音） */
G.deb = (() => {
  const S_ = {};
  // 音の高さ：半音を単位に。基準は D（ニ音）
  const BASE = 146.83;
  const WT = [0, 2, 4, 6, 8, 10]; // 全音音階
  const PT = [0, 2, 4, 7, 9]; // 五音音階
  const hz = (semi) => BASE * Math.pow(2, semi / 12);
  // 音階の音を、段の番号から半音に（オクターブをまたいで続く）
  const degree = (scale, k) => {
    const n = scale.length,
      o = Math.floor(k / n);
    return scale[((k % n) + n) % n] + 12 * o;
  };
  // 動機：4音（音階の段で）。ときどき形を変えて現れる
  const MOTIF = [4, 3, 1, 2];

  function init() {
    const ac = SND.ctx;
    if (!ac || S_.ac) return;
    S_.ac = ac;
    // ⑦ 小さく、幅の狭い強弱：この層だけの音量と、ゆるい圧縮
    S_.out = ac.createGain();
    S_.out.gain.value = 0;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -34;
    comp.ratio.value = 4;
    comp.attack.value = 0.05;
    comp.release.value = 1.2;
    S_.out.connect(comp).connect(SND.master);
    // ⑧ ペダル：長い残響（約7秒）
    {
      const L = Math.floor(ac.sampleRate * 7),
        ir = ac.createBuffer(2, L, ac.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        for (let i = 0; i < L; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / L, 2.2) * (i < ac.sampleRate * 0.04 ? i / (ac.sampleRate * 0.04) : 1);
      }
      S_.rev = ac.createConvolver();
      S_.rev.buffer = ir;
      const rg = ac.createGain();
      rg.gain.value = 0.9;
      S_.rev.connect(rg).connect(S_.out);
    }
    S_.dry = ac.createGain();
    S_.dry.gain.value = 0.45;
    S_.dry.connect(S_.out);
    // ③④⑥ 風の鳴り：細い帯域の雑音を4声。和音の形（根音・九度・十一度・十三度に当たる段）を保って平行に動く
    S_.voices = [0, 1, 2, 3].map((v) => {
      const s = ac.createBufferSource();
      s.buffer = SND.white;
      s.loop = true;
      const bp = ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 55;
      const g = ac.createGain();
      g.gain.value = 0;
      const p = ac.createStereoPanner();
      p.pan.value = [-0.6, -0.2, 0.25, 0.65][v];
      s.connect(bp).connect(g).connect(p);
      p.connect(S_.rev);
      const d = ac.createGain();
      d.gain.value = 0.25;
      p.connect(d).connect(S_.dry);
      s.start(0, Math.random() * 3);
      return { bp, g };
    });
    S_.mode = 1; // 1：全音音階、0：五音音階（なめらかに入れ替わる）
    S_.root = 0; // 根音の段
    S_.nextShift = ac.currentTime + 20;
    S_.nextDrop = ac.currentTime + 2;
    S_.nextMotif = ac.currentTime + 18;
    S_.nextGlint = ac.currentTime + 5;
    S_.beat = 0;
  }

  // ⑥ 水滴：小さな泡の共鳴（音の高さが少し上がる正弦波）と、ごく短い水音
  function drop(f, vol, pn, len = 0.22) {
    const ac = S_.ac,
      t = ac.currentTime + 0.01;
    const o = ac.createOscillator(),
      g = ac.createGain(),
      p = ac.createStereoPanner();
    o.type = "sine";
    o.frequency.setValueAtTime(f * 0.82, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    o.frequency.exponentialRampToValueAtTime(f * 1.04, t + len);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0003, t + len);
    p.pan.value = pn;
    o.connect(g).connect(p);
    p.connect(S_.rev);
    p.connect(S_.dry);
    o.start(t);
    o.stop(t + len + 0.05);
    // 水面に触れる微かな音
    const s = ac.createBufferSource(),
      hp = ac.createBiquadFilter(),
      g2 = ac.createGain();
    s.buffer = SND.white;
    hp.type = "highpass";
    hp.frequency.value = 3000;
    g2.gain.setValueAtTime(vol * 0.12, t);
    g2.gain.exponentialRampToValueAtTime(0.0002, t + 0.03);
    s.connect(hp).connect(g2).connect(p);
    s.start(t, Math.random() * 2);
    s.stop(t + 0.05);
  }
  // 今の音階（①②）：全音音階と五音音階を、確率で混ぜて選ぶ
  const scaleNow = () => (Math.random() < S_.mode ? WT : PT);

  function update(dt, c, W, nearReed, wx) {
    if (!S_.ac || !LOOK.show.debussy) {
      if (S_.out) S_.out.gain.setTargetAtTime(0, SND.ctx.currentTime, 1);
      return;
    }
    const ac = S_.ac,
      now = ac.currentTime;
    const day = Math.max(0, Math.sin((c.phase - 0.25) * 2 * Math.PI)),
      gray = wx ? wx.gray : 0,
      rain = wx ? wx.rain : 0,
      ws = Math.min(1, W.s / 8);
    // ⑦ 層の音量：静か。遠景（地図）では鳴らさない
    S_.out.gain.setTargetAtTime(isFar ? 0 : LOOK.debussyVol, now, 2);
    // ①② 音階の入れ替わり：朝と晴れた昼は五音、夕方・夜・霧は全音
    const wantWT = Math.min(1, (1 - day) * 1.4 + gray * 0.6);
    S_.mode += (wantWT - S_.mode) * Math.min(1, dt / 40);
    // ③ 平行和音：根音を1段ずつ、和音の形のまま滑らせる（ゆっくり、ときに戻る）
    if (now > S_.nextShift) {
      S_.root += Math.random() < 0.6 ? 1 : -1;
      if (Math.abs(S_.root) > 4) S_.root -= Math.sign(S_.root) * 2;
      S_.nextShift = now + 22 + Math.random() * 30;
    }
    // ④ 和音の形：根音・九度・十一度・十三度に当たる段（解決しない響きのまま）
    const sc = S_.mode > 0.5 ? WT : PT,
      shape = sc === WT ? [0, 5, 7, 9] : [0, 4, 6, 8];
    S_.voices.forEach((v, i) => {
      const f = hz(degree(sc, S_.root + shape[i]) + (i === 0 ? 0 : 12));
      v.bp.frequency.setTargetAtTime(f, now, 6); // ゆっくり滑る（平行に動く）
      // ⑩ 風：風が強いほど鳴りが濃い。ゆらぎで息づく
      const breath = 0.5 + 0.5 * Math.sin(now * (0.05 + i * 0.013) + i * 1.7);
      v.g.gain.setTargetAtTime((0.05 + ws * 0.16) * (0.4 + 0.6 * breath) * (i === 0 ? 1.3 : 1), now, 4);
    });
    // ⑤ 水滴：3 と 2 の重なりに揺らぎを足して、拍のはっきりしない落ち方に
    if (now > S_.nextDrop) {
      S_.beat++;
      const base = 1.1 + Math.random() * 0.5,
        three = S_.beat % 3 === 0,
        two = S_.beat % 2 === 0;
      // ⑩ 水：岸・ヨシ・雨の近くで増える
      const dens = 0.35 + nearReed * 0.8 + rain * 1.2;
      S_.nextDrop = now + (base * (three ? 1.5 : two ? 1 : 0.75) + Math.random() * 1.2) / dens;
      const s = scaleNow();
      const k = Math.floor(Math.random() * 8) + 5;
      drop(hz(degree(s, S_.root + k)), 0.05 + Math.random() * 0.04, Math.random() * 1.6 - 0.8);
      // ③ ときどき、同じ形の2音（平行四度・五度）が重なって落ちる
      if (Math.random() < 0.18) drop(hz(degree(s, S_.root + k + 2)), 0.035, Math.random() * 1.6 - 0.8);
    }
    // ⑨ 動機の断片：4音の動機を、形を変えて水滴で鳴らす
    if (now > S_.nextMotif && !isFar) {
      S_.nextMotif = now + 28 + Math.random() * 40;
      const s = scaleNow(),
        kind = Math.floor(Math.random() * 4), // 0 そのまま 1 反行 2 拡大 3 断片
        start = S_.root + 6 + Math.floor(Math.random() * 3);
      let notes = MOTIF.map((d) => (kind === 1 ? -d : d));
      if (kind === 3) notes = notes.slice(0, 2 + Math.floor(Math.random() * 2));
      const step = kind === 2 ? 0.9 : 0.5,
        pn = Math.random() * 1.2 - 0.6;
      notes.forEach((d, i) => setTimeout(() => S_.ac && drop(hz(degree(s, start + d)), 0.06, pn + i * 0.05, 0.35), (i * step + Math.random() * 0.12) * 1000));
    }
    // ⑩ 光：日が低く晴れた水面のきらめきに、高い微かな音（五音音階）
    const glint = day > 0 ? (1 - gray) * Math.max(0, 1 - Math.abs(Math.sin((c.phase - 0.25) * 2 * Math.PI)) * 2.2) : 0;
    if (glint > 0.05 && now > S_.nextGlint) {
      S_.nextGlint = now + (0.6 + Math.random() * 1.6) / glint;
      drop(hz(degree(PT, S_.root + 15 + Math.floor(Math.random() * 5))), 0.018, Math.random() * 1.8 - 0.9, 0.5);
    }
  }
  return { init, update };
})();
