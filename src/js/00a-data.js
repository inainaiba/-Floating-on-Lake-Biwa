/* ---------- データを読み戻す：地形・深さ・島・岸近くの地形・家並み・地図記号（data/*.json）。
   組み立て（build.py）で、大きな2進のデータ（base64 の文字列）を詰めて埋め込んである（読み込む量を減らすため）。
   ここで元とまったく同じ base64 の文字列に戻す（それを読む各部品は変わらない）。詰め方は2通り：
   ・$a：算術符号（tools/acpack.py）。値をビットずつ、場面（文脈）ごとに覚えた確率で符号にしてある。読み戻しは下の unpackAC。
     格子 g（標高・水深）／岸近くの細かい地形 n4／道の線 st／家 tw／地図記号 lu。元のバイト列の CRC32 で読み戻しを確かめる
   ・$p：deflate（小さなデータ）。並べ方を変えてから圧縮してある。並べ方：raw そのまま／delta 前のバイトとの差／
     p{k} k バイトごとの組を、バイトの位置ごとの列に分ける／pd{k} 列に分けてから差／2d 左と上と左上から予測した値との差 ---------- */
const b64 = (o) => {
  let s = "";
  for (let i = 0; i < o.length; i += 32768) s += String.fromCharCode.apply(null, o.subarray(i, i + 32768));
  return btoa(s);
};
function unpackAC(p) {
  const z = Uint8Array.from(atob(p.$a), (c) => c.charCodeAt(0));
  let zi = 0,
    rng = 0xffffffff,
    code = 0;
  for (let k = 0; k < 5; k++) code = ((code << 8) | z[zi++]) >>> 0;
  const bit = (P, i, sh) => {
    const q = P[i],
      bound = (rng >>> 12) * q;
    let b;
    if (code < bound) (rng = bound), (P[i] = q + ((4096 - q) >> sh)), (b = 0);
    else (code -= bound), (rng -= bound), (P[i] = q - (q >> sh)), (b = 1);
    while (rng < 16777216) (rng = (rng << 8) >>> 0), (code = ((code << 8) | (z[zi++] | 0)) >>> 0);
    return b;
  };
  const sym = (P, base, nb, sh) => {
    let node = 1;
    for (let k = 0; k < nb; k++) node = node * 2 + bit(P, base + node, sh);
    return node - (1 << nb);
  };
  const u16 = (P, b) => {
    const hi = sym(P, b * 256, 8, 5);
    return hi * 256 + sym(P, (b + 1 + hi) * 256, 8, 5);
  };
  const unz = (v) => (v & 1 ? -((v + 1) >> 1) : v >> 1),
    M = (n) => new Uint16Array(n * 256).fill(2048),
    o = new Uint8Array(p.n),
    dv = new DataView(o.buffer),
    m = p.m;
  if (m === "g") {
    const w = p.w,
      P = M(55),
      err = new Int16Array(p.n),
      K = [0, 1, 2, 3, 5, 8, 12, 18, 28, 45];
    for (let i = 0; i < p.n; i++) {
      const x = i % w,
        y = (i / w) | 0,
        a = x ? o[i - 1] : y ? o[i - w] : 0,
        c = y ? o[i - w] : a,
        d = y && x ? o[i - w - 1] : c,
        f = y && x + 1 < w ? o[i - w + 1] : c,
        pr = Math.min(255, Math.max(0, Math.floor((3 * a + 3 * c - 2 * d + f + 2) / 5))),
        g = Math.abs(a - d) + Math.abs(c - d) + Math.abs(c - f),
        ea = x ? err[i - 1] : 0;
      let k = 0;
      while (k < 10 && g > K[k]) k++;
      const r = unz(sym(P, (k * 5 + (ea < -2 ? 0 : ea < 0 ? 1 : ea === 0 ? 2 : ea <= 2 ? 3 : 4)) * 256, 8, 5));
      err[i] = r;
      o[i] = (pr + r) & 255;
    }
  } else if (m === "n4") {
    const bs = p.bs,
      per = (bs * bs) / 2,
      P = new Uint16Array(4096 * 16).fill(2048),
      v = new Uint8Array(bs * bs);
    for (let k0 = 0; k0 < p.n; k0 += per) {
      for (let j = 0; j < bs * bs; j++) {
        const gi = j % bs,
          gj = (j / bs) | 0,
          l = gi ? v[j - 1] : 7,
          u = gj ? v[j - bs] : l,
          d = gi && gj ? v[j - bs - 1] : u;
        v[j] = sym(P, ((l * 16 + u) * 16 + d) * 16, 4, 4);
      }
      for (let j = 0; j < per; j++) o[k0 + j] = (v[j * 2] << 4) | v[j * 2 + 1];
    }
  } else if (m === "st") {
    const PW = M(256),
      PK = M(256),
      PP = M(1028);
    let at = 0,
      pw = 0,
      fx = 0,
      fy = 0;
    for (let q = 0; q < p.c; q++) {
      const w = sym(PW, pw * 256, 8, 5),
        k = sym(PK, w * 256, 8, 5);
      o[at++] = w;
      o[at++] = k;
      let lx = fx,
        ly = fy;
      for (let t = 0; t < k; t++, at += 4) {
        const c = t ? 0 : 2;
        lx += unz(u16(PP, c * 257));
        ly += unz(u16(PP, (c + 1) * 257));
        dv.setInt16(at, lx, true);
        dv.setInt16(at + 2, ly, true);
        if (!t) (fx = lx), (fy = ly);
      }
      pw = w;
    }
  } else if (m === "tw") {
    const P = M(1028);
    for (let at = 0; at < p.n; at += 8) {
      dv.setInt16(at, unz(u16(P, 0)), true);
      dv.setInt16(at + 2, unz(u16(P, 257)), true);
      const t = sym(P, 514 * 256, 8, 5),
        w = sym(P, (515 + t) * 256, 8, 5);
      o[at + 4] = w;
      o[at + 5] = sym(P, (771 + w) * 256, 8, 5);
      o[at + 6] = sym(P, 1027 * 256, 8, 5);
      o[at + 7] = t;
    }
  } else if (m === "lu") {
    const P = M(1100),
      RW = 25;
    let pk = -1,
      row = 0,
      x = 0;
    for (let at = 0; at < p.n; at += 5) {
      let k = pk;
      if (bit(P, 0, 5)) {
        if (bit(P, 1, 5)) k = sym(P, 256, 8, 5);
        const dr = unz(u16(P, 2));
        row = k !== pk ? dr : row + dr;
        x = unz(u16(P, 259));
      } else x += unz(u16(P, 516));
      o[at] = k;
      dv.setInt16(at + 1, x, true);
      dv.setInt16(at + 3, row * RW + sym(P, (773 + Math.min(k, 5)) * 256, 8, 5), true);
      pk = k;
    }
  }
  // 読み戻しの確かめ（CRC32）。違えばコンソールに誤りとして出す（tools/check.py が拾う）
  let cr = -1;
  for (let i = 0; i < o.length; i++) {
    cr ^= o[i];
    for (let k = 0; k < 8; k++) cr = (cr >>> 1) ^ (0xedb88320 & -(cr & 1));
  }
  if ((cr ^ -1) >>> 0 !== p.c32) console.error("[data] 読み戻しが元と違います：" + m);
  return b64(o);
}
async function unpackBlob(p) {
  const z = Uint8Array.from(atob(p.$p), (c) => c.charCodeAt(0)),
    b = new Uint8Array(await new Response(new Blob([z]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer()),
    n = b.length,
    t = p.t,
    o = new Uint8Array(n);
  const sum = (a, s, e) => {
    for (let i = s + 1; i < e; i++) a[i] = (a[i] + a[i - 1]) & 255;
  };
  if (t === "raw") o.set(b);
  else if (t === "delta") {
    o.set(b);
    sum(o, 0, n);
  } else if (t === "2d" || t === "med") {
    const w = p.w;
    for (let i = 0; i < n; i++) {
      const a = i % w ? o[i - 1] : 0,
        c = i >= w ? o[i - w] : 0,
        d = i >= w && i % w ? o[i - w - 1] : 0,
        q = t === "2d" ? a + c - d : d >= Math.max(a, c) ? Math.min(a, c) : d <= Math.min(a, c) ? Math.max(a, c) : a + c - d;
      o[i] = (b[i] + q) & 255;
    }
  } else {
    const k = +t.replace(/\D/g, ""),
      nr = Math.floor(n / k);
    if (t[1] === "d") for (let j = 0; j < k; j++) sum(b, j * nr, (j + 1) * nr);
    for (let j = 0; j < k; j++) for (let r = 0; r < nr; r++) o[r * k + j] = b[j * nr + r];
    o.set(b.subarray(nr * k), nr * k);
  }
  return b64(o);
}
async function unpackData(v) {
  if (Array.isArray(v)) return Promise.all(v.map(unpackData));
  if (v && typeof v === "object") {
    if (v.$a !== undefined) return unpackAC(v);
    if (v.$p !== undefined) return unpackBlob(v);
    const out = {};
    for (const k in v) out[k] = await unpackData(v[k]);
    return out;
  }
  return v;
}
const DATA = await unpackData(__DATA__);
