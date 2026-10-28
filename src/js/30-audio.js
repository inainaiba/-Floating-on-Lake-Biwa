/* ---------- 音：すべてWeb Audioで合成（外部の音源なし）。波と風が土台 ---------- */
const SND = { on: true, ctx: null };
function audioInit() {
  if (SND.ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  // 再生向けの大きめの音のバッファ：画面の描画が重い瞬間にも、音が途切れにくい
  let ac;
  try {
    ac = new AC({ latencyHint: "playback" });
  } catch (_) {
    ac = new AC();
  }
  SND.ctx = ac;
  const len = ac.sampleRate * 4,
    mk = (type) => {
      const b = ac.createBuffer(1, len, ac.sampleRate),
        d = b.getChannelData(0);
      let l = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (type === "brown") {
          l = (l + 0.02 * w) / 1.02;
          d[i] = l * 3.5;
        } else d[i] = w;
      }
      return b;
    };
  SND.white = mk("white");
  SND.brown = mk("brown");
  const src = (b) => {
    const s = ac.createBufferSource();
    s.buffer = b;
    s.loop = true;
    s.start(0, Math.random() * 3);
    return s;
  };
  SND.master = ac.createGain();
  SND.master.gain.value = 0;
  SND.master.connect(ac.destination);
  SND.master.gain.setTargetAtTime(0.9, ac.currentTime + 0.3, 1.5); // ゆっくりフェードイン
  // 波：低いノイズをゆっくり膨らませる
  const wv = src(SND.brown),
    wvF = ac.createBiquadFilter();
  wvF.type = "lowpass";
  wvF.frequency.value = 220; // 波のざわめきは柔らかく（高域を落とす）
  SND.waveG = ac.createGain();
  SND.waveG.gain.value = 0;
  wv.connect(wvF).connect(SND.waveG).connect(SND.master);
  // 風：帯域ノイズ、中心周波数を揺らす
  const wd = src(SND.white),
    wdF = ac.createBiquadFilter();
  wdF.type = "bandpass";
  wdF.Q.value = 0.45;
  wdF.frequency.value = 500;
  SND.windF = wdF;
  SND.windG = ac.createGain();
  SND.windG.gain.value = 0;
  {
    const lp = ac.createBiquadFilter(); // 風はこもった柔らかい音色に
    lp.type = "lowpass";
    lp.frequency.value = 1400;
    wd.connect(wdF).connect(lp).connect(SND.windG).connect(SND.master);
  }
  // ヨシのそよぎ：高いノイズ
  const rd = src(SND.white),
    rdF = ac.createBiquadFilter();
  rdF.type = "bandpass";
  rdF.frequency.value = 2600;
  rdF.Q.value = 0.4;
  SND.reedG = ac.createGain();
  SND.reedG.gain.value = 0;
  rd.connect(rdF).connect(SND.reedG).connect(SND.master);
  // 岸の波：寄せては返す
  const sh = src(SND.brown),
    shF = ac.createBiquadFilter();
  shF.type = "lowpass";
  shF.frequency.value = 900;
  SND.shoreF = shF;
  SND.shoreG = ac.createGain();
  SND.shoreG.gain.value = 0;
  sh.connect(shF).connect(SND.shoreG).connect(SND.master);
  // 残響：短い合成インパルスで、水辺の空気の広がりを出す
  {
    const L = ac.sampleRate * 3.2,
      ir = ac.createBuffer(2, L, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < L; i++)
        d[i] =
          (Math.random() * 2 - 1) *
          Math.pow(1 - i / L, 3.2) *
          (i < ac.sampleRate * 0.02 ? i / (ac.sampleRate * 0.02) : 1);
    }
    SND.rev = ac.createConvolver();
    SND.rev.buffer = ir;
    SND.revG = ac.createGain();
    SND.revG.gain.value = 0.55;
    SND.rev.connect(SND.revG).connect(SND.master);
  }
  SND.nextSlap = 0;
  SND.nextGrain = 0;
  SND.nextShore = 0;
  SND.nextSwell = 0;
  {
    const s2 = src(SND.brown),
      f2 = ac.createBiquadFilter();
    f2.type = "lowpass";
    f2.frequency.value = 200;
    f2.Q.value = 0.3;
    SND.swF = f2;
    SND.swG = ac.createGain();
    SND.swG.gain.value = 0;
    SND.swP = ac.createStereoPanner();
    s2.connect(f2).connect(SND.swG).connect(SND.swP).connect(SND.master);
    SND.swG.connect(SND.rev);
  }
  SND.engines = new Map();
  SND.nextBird = ac.currentTime + 4;
  SND.nextLap = 0;
  if (G.deb) G.deb.init(); // 自然音によるドビュッシー的な層（30d-debussy.js）
}
// 自然音だけで：船体に当たる水（沖）、水の粒のさざめき、寄せては返す岸の波
function nburst(lp, hp, dur, vol, pn, q = 0.7, toRev = 0.5) {
  const ac = SND.ctx,
    t = ac.currentTime,
    s = ac.createBufferSource();
  s.buffer = SND.white;
  const a = ac.createBiquadFilter(),
    b = ac.createBiquadFilter(),
    g = ac.createGain(),
    p = ac.createStereoPanner(),
    r = ac.createGain();
  a.type = "lowpass";
  a.frequency.value = lp;
  a.Q.value = q;
  b.type = "highpass";
  b.frequency.value = hp;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + Math.max(Math.min(0.03, dur * 0.2), SND.atk || 0));
  g.gain.exponentialRampToValueAtTime(0.0004, t + dur);
  p.pan.value = pn;
  r.gain.value = toRev;
  s.connect(a).connect(b).connect(g).connect(p);
  p.connect(SND.master);
  p.connect(r);
  r.connect(SND.rev);
  s.start(t, Math.random() * 3);
  s.stop(t + dur + 0.05);
}

function pan(x, z) {
  const p = SND.ctx.createStereoPanner();
  const dx = x - camera.position.x,
    dz = z - camera.position.z,
    r = Math.cos(yaw) * dx - Math.sin(yaw) * dz;
  p.pan.value = Math.max(-1, Math.min(1, r / Math.max(30, Math.hypot(dx, dz))));
  return p;
}
function horn(x, z, d) {
  const ac = SND.ctx,
    t = ac.currentTime,
    g = ac.createGain(),
    f = ac.createBiquadFilter(),
    vol = Math.min(0.35, 60 / (d + 60));
  f.type = "lowpass";
  f.frequency.value = 900;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.25);
  g.gain.setValueAtTime(vol, t + 2.2);
  g.gain.linearRampToValueAtTime(0, t + 3.2);
  for (const fr of [147, 185, 220]) {
    const o = ac.createOscillator();
    o.type = "sine";
    o.frequency.value = fr;
    o.connect(f);
    o.start(t);
    o.stop(t + 3.3);
  }
  f.connect(g).connect(pan(x, z)).connect(SND.master);
}
function bird(x, z, kind, vol) {
  const ac = SND.ctx,
    t = ac.currentTime,
    o = ac.createOscillator(),
    g = ac.createGain();
  o.type = "sine";
  if (kind === 0) {
    for (let i = 0; i < 10; i++) {
      o.frequency.setValueAtTime(2600 + Math.random() * 300, t + i * 0.06);
      o.frequency.linearRampToValueAtTime(1900, t + i * 0.06 + 0.05);
    }
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.05);
    g.gain.linearRampToValueAtTime(0, t + 0.65);
    o.start(t);
    o.stop(t + 0.7);
  } // カイツブリのような震える声
  else {
    o.frequency.setValueAtTime(700, t);
    o.frequency.exponentialRampToValueAtTime(420, t + 0.35);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.start(t);
    o.stop(t + 0.45);
    const o2 = ac.createOscillator();
    o2.type = "triangle";
    o2.frequency.value = 1400;
    const g2 = ac.createGain();
    g2.gain.value = vol * 0.2;
    o2.connect(g2).connect(g);
    o2.start(t);
    o2.stop(t + 0.45);
  } // カモのような短い声
  o.connect(g).connect(pan(x, z)).connect(SND.master);
}
const prevMoving = new Map();
function audioUpdate(dt, c, W, boats, nearReed) {
  if (!SND.ctx) return;
  const ac = SND.ctx,
    now = ac.currentTime,
    k = 0.25;
  SND.master.gain.setTargetAtTime(SND.on ? 0.9 : 0, now, 0.4);
  if (!SND.on) return;
  if (G.deb) G.deb.update(dt, c, W, nearReed, G.wxNow);
  const ws = Math.min(1, W.s / 8);
  {
    const gust =
      0.5 + 0.5 * Math.sin(now * 0.13) * Math.sin(now * 0.071 + 1) + 0.25 * Math.sin(now * 0.29 + 2);
    SND.windG.gain.setTargetAtTime(
      ((isFar ? 0.03 : 0.012) + ws * ws * (isFar ? 0.08 : 0.05)) * (0.35 + 0.65 * Math.max(0, gust)),
      now,
      3,
    );
  }
  SND.windF.frequency.setTargetAtTime(350 + ws * 600 + 120 * Math.sin(now * 0.4), now, k);
  SND.waveG.gain.setTargetAtTime(
    isFar ? 0 : (0.045 + ws * 0.1) * (0.65 + 0.35 * Math.sin((now * 2 * Math.PI) / 7.5)),
    now,
    0.6,
  );
  {
    // 岸からの距離で水の音が変わる。うねりは周期の違う3つの波を重ね、強弱が「ラ・メール」のように満ち引きする
    const dsh = distShore(B.x, B.y) * S,
      near = Math.max(0, 1 - dsh / 60),
      off = 1 - near,
      sw =
        (Math.sin((now * 2 * Math.PI) / 7.3) +
          0.6 * Math.sin((now * 2 * Math.PI) / 11.9 + 1) +
          0.4 * Math.sin((now * 2 * Math.PI) / 19.7 + 2)) /
          2 +
        0.5;
    SND.waveG.gain.setTargetAtTime(isFar ? 0 : (0.006 + ws * 0.015) * off * (0.3 + 0.7 * sw), now, 0.8);
    SND.windF.frequency.setTargetAtTime(260 + ws * 380 + 90 * Math.sin(now * 0.23), now, 1);
    if (!isFar && now > SND.nextSwell) {
      const per = 5.5 + Math.random() * 4.5,
        up = per * 0.42,
        v = (0.05 + ws * 0.09) * (0.55 + 0.45 * sw),
        nr = near;
      const g = SND.swG.gain,
        f = SND.swF.frequency;
      g.cancelScheduledValues(now);
      g.setValueAtTime(Math.max(g.value, 0.0001), now);
      g.setTargetAtTime(v * (1 + nr * 0.8), now, up * 0.45);
      g.setTargetAtTime(0.0001 + v * 0.12, now + up, per * 0.25);
      f.cancelScheduledValues(now);
      f.setValueAtTime(Math.max(160, f.value), now);
      f.setTargetAtTime(380 + nr * 700 + ws * 250, now, up * 0.5);
      f.setTargetAtTime(170, now + up, per * 0.3);
      if (nr > 0.15) {
        const pn = SND.swP.pan;
        pn.setTargetAtTime((Math.random() - 0.5) * 0.7, now, 1);
        SND.atk = 0.6;
        setTimeout(() => {
          if (SND.on) {
            SND.atk = 0.9;
            nburst(2600, 500, per * 0.55, v * 0.22 * nr, (Math.random() - 0.5) * 0.6, 0.4, 0.7);
            SND.atk = 0;
          }
        }, up * 1000);
        SND.atk = 0;
      }
      if (off > 0.3 && Math.random() < 0.55) {
        setTimeout(
          () => {
            if (SND.on) {
              SND.atk = 0.12;
              nburst(320, 50, 0.9, (0.03 + ws * 0.04) * off, (Math.random() - 0.5) * 0.5, 0.4, 0.5);
              SND.atk = 0;
            }
          },
          (up * 0.7 + Math.random() * 0.6) * 1000,
        );
      }
      SND.nextSwell = now + (per * (0.7 + Math.random() * 0.4)) / (0.8 + ws * 0.4);
    }
  } // 遠景では波は聞こえない
  SND.reedG.gain.setTargetAtTime(isFar ? 0 : nearReed * (0.003 + ws * 0.012), now, k);
  if (!isFar && B.rest && now > SND.nextLap) {
    const g = SND.shoreG.gain,
      f = SND.shoreF.frequency;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0.32, now + 1.3);
    g.linearRampToValueAtTime(0.05, now + 3.6);
    f.cancelScheduledValues(now);
    f.setValueAtTime(500, now);
    f.linearRampToValueAtTime(1400, now + 1.2);
    f.linearRampToValueAtTime(2600, now + 2.2);
    f.linearRampToValueAtTime(600, now + 3.6);
    SND.nextLap = now + 4 + Math.random() * 1.5;
  }
  if (isFar || !B.rest) SND.shoreG.gain.setTargetAtTime(0, now, 0.8);
  // 船：エンジンは近いときだけ、汽笛は定期船が港を出るとき
  const seen = new Set();
  for (const b of boats) {
    const m = boatMeshes.get(b.id);
    const x = m ? m.position.x : b.x * S,
      z = m ? m.position.z : b.y * S,
      d = Math.hypot(x - camera.position.x, z - camera.position.z);
    seen.add(b.id);
    const was = prevMoving.get(b.id);
    prevMoving.set(b.id, b.moving);
    if (!isFar && b.kind !== "fish" && was === false && b.moving && d < 1500) horn(x, z, d);
    let e = SND.engines.get(b.id);
    const hear = !isFar && b.moving && d < (b.kind === "fish" ? 220 : 400);
    if (hear && !e) {
      const o = ac.createOscillator(),
        f = ac.createBiquadFilter(),
        g = ac.createGain(),
        p = ac.createStereoPanner(),
        lfo = ac.createOscillator(),
        lg = ac.createGain();
      o.type = "sawtooth";
      o.frequency.value = b.kind === "fish" ? 72 : b.kind === "michigan" ? 38 : 48;
      f.type = "lowpass";
      f.frequency.value = b.kind === "fish" ? 500 : 260;
      g.gain.value = 0;
      lfo.frequency.value = b.kind === "fish" ? 9 : 5;
      lg.gain.value = 0;
      lfo.connect(lg);
      o.connect(f).connect(g).connect(p).connect(SND.master);
      o.start();
      lfo.start();
      e = { o, g, p, lfo, lg };
      SND.engines.set(b.id, e);
    }
    if (e) {
      const vol = hear ? Math.min(0.04, (b.kind === "fish" ? 2 : 5) / (d + 20)) : 0;
      e.g.gain.setTargetAtTime(vol, now, 0.5);
      const dx = x - camera.position.x,
        dz = z - camera.position.z;
      e.p.pan.setTargetAtTime(
        Math.max(-1, Math.min(1, (Math.cos(yaw) * dx - Math.sin(yaw) * dz) / (d + 30))),
        now,
        0.2,
      );
      if (!hear && e.g.gain.value < 0.002) {
        e.o.stop();
        e.lfo.stop();
        SND.engines.delete(b.id);
      }
    }
  }
  for (const [id, e] of SND.engines)
    if (!seen.has(id)) {
      e.g.gain.setTargetAtTime(0, now, 0.3);
      setTimeout(() => {
        try {
          e.o.stop();
          e.lfo.stop();
        } catch (_) {}
      }, 1500);
      SND.engines.delete(id);
    }
  // 水鳥：冬に多く、夜は少ない。岸やヨシの近くでよく鳴く
  if (!isFar && now > SND.nextBird) {
    const winter = SEASON.waterbirds[c.month],
      night = c.phase < 0.22 || c.phase > 0.82;
    const rate = (0.15 + winter * 0.6 + nearReed * 0.6) * (night ? 0.2 : 1);
    SND.nextBird = now + (6 + Math.random() * 14) / rate;
    const a = Math.random() * 6.283,
      r = 40 + Math.random() * 200;
    bird(
      camera.position.x + Math.cos(a) * r,
      camera.position.z + Math.sin(a) * r,
      Math.random() < 0.45 ? 0 : 1,
      0.05 + 0.06 * Math.random(),
    );
  }
}
