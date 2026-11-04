// LZMA の展開（build.py が作る code-*.lz を、開くときに戻す。src/shell.html に埋め込む）。
// 形式は「LZMA alone」：13バイトの頭（設定1・辞書の大きさ4・元の大きさ8）＋本体。元の大きさは build.py が書き込む
function lzmaDecode(src) {
  let ip = 13;
  const props = src[0],
    lc = props % 9,
    lp = Math.floor(props / 9) % 5,
    pb = Math.floor(props / 45);
  let size = 0;
  for (let i = 0; i < 6; i++) size += src[5 + i] * 2 ** (8 * i);
  const out = new Uint8Array(size);
  // 範囲符号
  let range = 0xffffffff,
    code = 0;
  ip++;
  for (let i = 0; i < 4; i++) code = ((code << 8) | src[ip++]) >>> 0;
  const P = (n) => new Uint16Array(n).fill(1024);
  const bit = (p, i) => {
    const bound = (range >>> 11) * p[i];
    let b;
    if (code < bound) {
      range = bound;
      p[i] += (2048 - p[i]) >>> 5;
      b = 0;
    } else {
      range = (range - bound) >>> 0;
      code = (code - bound) >>> 0;
      p[i] -= p[i] >>> 5;
      b = 1;
    }
    if (range < 0x1000000) {
      range = (range << 8) >>> 0;
      code = ((code << 8) | src[ip++]) >>> 0;
    }
    return b;
  };
  const direct = (n) => {
    let r = 0;
    while (n--) {
      range >>>= 1;
      let b = 1;
      if (code >= range) code = (code - range) >>> 0;
      else b = 0;
      if (range < 0x1000000) {
        range = (range << 8) >>> 0;
        code = ((code << 8) | src[ip++]) >>> 0;
      }
      r = ((r << 1) | b) >>> 0;
    }
    return r;
  };
  const tree = (p, o, n) => {
    let m = 1;
    for (let i = 0; i < n; i++) m = (m << 1) | bit(p, o + m);
    return m - (1 << n);
  };
  const rtree = (p, o, n) => {
    let m = 1,
      s = 0;
    for (let i = 0; i < n; i++) {
      const b = bit(p, o + m);
      m = (m << 1) | b;
      s |= b << i;
    }
    return s;
  };
  const NS = 1 << pb;
  const lenDec = () => ({ c: P(2), low: P(NS << 3), mid: P(NS << 3), high: P(256) });
  const len = (L, ps) => (!bit(L.c, 0) ? tree(L.low, ps << 3, 3) : !bit(L.c, 1) ? 8 + tree(L.mid, ps << 3, 3) : 16 + tree(L.high, 0, 8));
  const lit = P(0x300 << (lc + lp)),
    isMatch = P(192),
    isRep = P(12),
    isG0 = P(12),
    isG1 = P(12),
    isG2 = P(12),
    isRep0L = P(192),
    slot = P(4 << 6),
    posD = P(115),
    align = P(16),
    LD = lenDec(),
    RD = lenDec();
  let state = 0,
    r0 = 0,
    r1 = 0,
    r2 = 0,
    r3 = 0,
    pos = 0;
  while (pos < size) {
    const ps = pos & (NS - 1);
    if (!bit(isMatch, (state << 4) + ps)) {
      const prev = pos ? out[pos - 1] : 0,
        o = 0x300 * (((pos & ((1 << lp) - 1)) << lc) + (prev >> (8 - lc)));
      let s = 1;
      if (state >= 7) {
        let mb = out[pos - r0 - 1];
        do {
          const m = (mb >> 7) & 1;
          mb <<= 1;
          const b = bit(lit, o + ((1 + m) << 8) + s);
          s = (s << 1) | b;
          if (m !== b) break;
        } while (s < 0x100);
      }
      while (s < 0x100) s = (s << 1) | bit(lit, o + s);
      out[pos++] = s & 255;
      state = state < 4 ? 0 : state < 10 ? state - 3 : state - 6;
      continue;
    }
    let n;
    if (bit(isRep, state)) {
      if (!bit(isG0, state)) {
        if (!bit(isRep0L, (state << 4) + ps)) {
          state = state < 7 ? 9 : 11;
          out[pos] = out[pos - r0 - 1];
          pos++;
          continue;
        }
      } else {
        let d;
        if (!bit(isG1, state)) d = r1;
        else {
          if (!bit(isG2, state)) d = r2;
          else {
            d = r3;
            r3 = r2;
          }
          r2 = r1;
        }
        r1 = r0;
        r0 = d;
      }
      n = len(RD, ps);
      state = state < 7 ? 8 : 11;
    } else {
      r3 = r2;
      r2 = r1;
      r1 = r0;
      n = len(LD, ps);
      state = state < 7 ? 7 : 10;
      const sl = tree(slot, Math.min(n, 3) << 6, 6);
      if (sl < 4) r0 = sl;
      else {
        const nd = (sl >> 1) - 1;
        let d = ((2 | (sl & 1)) << nd) >>> 0;
        if (sl < 14) d += rtree(posD, d - sl, nd);
        else d += direct(nd - 4) * 16 + rtree(align, 0, 4);
        r0 = d >>> 0;
        if (r0 === 0xffffffff) break; // 終わりの印
      }
    }
    n += 2;
    for (; n > 0 && pos < size; n--, pos++) out[pos] = out[pos - r0 - 1];
  }
  return out;
}
