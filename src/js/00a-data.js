/* ---------- データを読み戻す：地形・深さ・島・岸近くの地形・家並み・地図記号（data/*.json）。
   組み立て（build.py）で、大きな2進のデータ（base64 の文字列）を、並べ方を変えてから圧縮して埋め込んである（読み込む量を減らすため）。
   ここで伸張して並べ方を戻し、元とまったく同じ base64 の文字列に戻す（それを読む各部品は変わらない）。
   並べ方：raw そのまま／delta 前のバイトとの差／p{k} k バイトごとの組を、バイトの位置ごとの列に分ける／pd{k} 列に分けてから差／
   2d 左と上と左上から予測した値との差（横 w マスの格子）／med 同じく、角を見分けて予測した値との差 ---------- */
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
  let s = "";
  for (let i = 0; i < n; i += 32768) s += String.fromCharCode.apply(null, o.subarray(i, i + 32768));
  return btoa(s);
}
async function unpackData(v) {
  if (Array.isArray(v)) return Promise.all(v.map(unpackData));
  if (v && typeof v === "object") {
    if (v.$p !== undefined) return unpackBlob(v);
    const out = {};
    for (const k in v) out[k] = await unpackData(v[k]);
    return out;
  }
  return v;
}
const DATA = await unpackData(__DATA__);
