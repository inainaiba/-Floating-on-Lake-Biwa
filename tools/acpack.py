"""データを算術符号で詰める（build.py の data() から使う。読み戻しは src/js/00a-data.js の unpackAC）。

deflate（zip と同じ圧縮）は「同じ並びのくり返し」を見つけるのが得意だが、地形の標高や家の位置のように
「くり返しは少ないが、まわりから値の見当がつく」データでは、見当（予測）とその当たりやすさを使うほうが詰まる。
ここでは、値をビットずつ、場面（文脈）ごとに覚えた確率で符号にする（LZMA と同じ形の区間符号）。
元に戻すと1ビットも違わない（可逆）。読み戻しが正しいかは、元のバイト列の CRC32 を一緒に持たせて確かめる。

詰め方（m）
  g   … 格子（標高・水深）：左・上・左上・右上から線形に予測し、差を、まわりの起伏の大きさと左の差の向きで分けた文脈で符号にする
  n4  … 岸近くの細かい地形：32×32 の区画ごとに4ビットの値。左・上・左上の値の組を文脈にする
  st  … 道の線：線ごとに太さと点の数、点は前の点からの差（最初の点は前の線の最初の点からの差）
  tw  … 家：1軒8バイト（x, y, 幅, 奥行き, 向き, 種類）。幅は種類から、奥行きは幅から見当をつける
  lu  … 地図記号：種類ごと・25単位の帯ごとに並べ、帯の中は x の差で書く
"""
import struct, zlib

SH_BITS, ONE = 12, 4096


class Enc:
    def __init__(self):
        self.low, self.rng, self.cache, self.csize, self.out = 0, 0xFFFFFFFF, 0, 1, bytearray()

    def _shift(self):
        if (self.low & 0xFFFFFFFF) < 0xFF000000 or self.low >= 1 << 32:
            carry, t = self.low >> 32, self.cache
            while True:
                self.out.append((t + carry) & 255)
                t = 0xFF
                self.csize -= 1
                if not self.csize:
                    break
            self.cache = (self.low >> 24) & 255
        self.csize += 1
        self.low = (self.low & 0x00FFFFFF) << 8

    def bit(self, P, i, b, sh):
        p = P[i]
        bound = (self.rng >> SH_BITS) * p
        if b:
            self.low += bound
            self.rng -= bound
            P[i] = p - (p >> sh)
        else:
            self.rng = bound
            P[i] = p + ((ONE - p) >> sh)
        while self.rng < 1 << 24:
            self.rng = (self.rng << 8) & 0xFFFFFFFF
            self._shift()

    def sym(self, P, base, nb, v, sh):
        """nb ビットの値 v を、ビットの木で符号にする（文脈ごとに 1<<nb 個の確率を P[base…] に持つ）"""
        node = 1
        for k in range(nb - 1, -1, -1):
            b = (v >> k) & 1
            self.bit(P, base + node, b, sh)
            node = node * 2 + b

    def done(self):
        for _ in range(5):
            self._shift()
        return bytes(self.out)


def zz(r):  # -128…127 → 0…255（0, -1, 1, -2, …）
    r = ((r + 128) & 255) - 128
    return r << 1 if r >= 0 else (-r << 1) - 1


def zz16(v):
    v = ((v + 32768) & 65535) - 32768
    return v << 1 if v >= 0 else (-v << 1) - 1


def u16(e, P, b, v, sh):
    """16ビットの値：上位バイト（文脈 b）と、上位バイトごとの下位バイト（文脈 b+1+上位）"""
    e.sym(P, b * 256, 8, v >> 8, sh)
    e.sym(P, (b + 1 + (v >> 8)) * 256, 8, v & 255, sh)


GK = [0, 1, 2, 3, 5, 8, 12, 18, 28, 45]


def q5(e):
    return 0 if e < -2 else 1 if e < 0 else 2 if e == 0 else 3 if e <= 2 else 4


def enc_g(b, w):
    e, P, n = Enc(), [2048] * (55 * 256), len(b)
    err = [0] * n
    for i in range(n):
        x, y = i % w, i // w
        a = b[i - 1] if x else (b[i - w] if y else 0)
        c = b[i - w] if y else a
        d = b[i - w - 1] if y and x else c
        f = b[i - w + 1] if y and x + 1 < w else c
        p = min(255, max(0, (3 * a + 3 * c - 2 * d + f + 2) // 5))
        g = abs(a - d) + abs(c - d) + abs(c - f)
        k = 0
        while k < 10 and g > GK[k]:
            k += 1
        r = ((b[i] - p + 128) & 255) - 128
        e.sym(P, (k * 5 + q5(err[i - 1] if x else 0)) * 256, 8, zz(r), 5)
        err[i] = r
    return e.done()


def enc_n4(b, bs):
    e, P, per = Enc(), [2048] * (4096 * 16), bs * bs // 2
    for k0 in range(0, len(b), per):
        blk = b[k0:k0 + per]
        v = [blk[j >> 1] & 15 if j & 1 else blk[j >> 1] >> 4 for j in range(bs * bs)]
        for j in range(bs * bs):
            gi, gj = j % bs, j // bs
            l = v[j - 1] if gi else 7
            u = v[j - bs] if gj else l
            d = v[j - bs - 1] if gi and gj else u
            e.sym(P, ((l * 16 + u) * 16 + d) * 16, 4, v[j], 4)
    return e.done()


def enc_st(b):
    e, PW, PK, PP = Enc(), [2048] * (256 * 256), [2048] * (256 * 256), [2048] * (1028 * 256)
    o, n, pw, fx, fy = 0, 0, 0, 0, 0
    while o < len(b):
        w, k = b[o], b[o + 1]
        o += 2
        e.sym(PW, pw * 256, 8, w, 5)
        e.sym(PK, w * 256, 8, k, 5)
        lx, ly = fx, fy
        for t in range(k):
            x, y = struct.unpack_from('<hh', b, o)
            o += 4
            c = 0 if t else 2
            u16(e, PP, (c + 0) * 257, zz16(x - lx), 5)
            u16(e, PP, (c + 1) * 257, zz16(y - ly), 5)
            lx, ly = x, y
            if t == 0:
                fx, fy = x, y
        pw = w
        n += 1
    return e.done(), n


def enc_tw(b):
    e, P = Enc(), [2048] * (1028 * 256)
    for o in range(0, len(b), 8):
        x, y, w, d, r, t = struct.unpack_from('<hhBBBB', b, o)
        u16(e, P, 0, zz16(x), 5)
        u16(e, P, 257, zz16(y), 5)
        e.sym(P, 514 * 256, 8, t, 5)
        e.sym(P, (515 + t) * 256, 8, w, 5)
        e.sym(P, (771 + w) * 256, 8, d, 5)
        e.sym(P, 1027 * 256, 8, r, 5)
    return e.done()


LU_ROW = 25


def lu_order(pts):
    """地図記号の並べ方（種類 → 25単位の帯 → x → y）。読む側は並び順に頼らない"""
    return sorted(pts, key=lambda q: (q[0], q[2] // LU_ROW, q[1], q[2]))


def enc_lu(b):
    e, P = Enc(), [2048] * (1100 * 256)
    pk, prow, px = -1, None, 0
    for o in range(0, len(b), 5):
        k, x, y = struct.unpack_from('<Bhh', b, o)
        row = y // LU_ROW
        nr = k != pk or row != prow
        e.bit(P, 0, nr, 5)
        if nr:
            e.bit(P, 1, k != pk, 5)
            if k != pk:
                e.sym(P, 256, 8, k, 5)
            u16(e, P, 2, zz16(row if k != pk else row - prow), 5)
            u16(e, P, 259, zz16(x), 5)
        else:
            u16(e, P, 516, zz16(x - px), 5)
        e.sym(P, (773 + min(k, 5)) * 256, 8, y - row * LU_ROW, 5)
        pk, prow, px = k, row, x
    return e.done()


def crc(b):
    return zlib.crc32(b) & 0xFFFFFFFF
