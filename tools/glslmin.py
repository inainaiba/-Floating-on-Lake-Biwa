"""まとめて縮めたコード（esbuild の出力）の中のシェーダー（GLSL）を、さらに縮める（build.py が使う）。描画は変わらない。

- GLSL らしいテンプレート文字列（`…`）だけを対象に、行をつなぎ、記号の前後の空白を除く。# で始まる行（#include・#ifdef など）は1行のまま残す
- 作品のコードが three.js のシェーダーの文字を探して書き換える所（"void main() {" など、PROTECT）は元の形のまま残す
- three.js の、作品で使わない材質（トゥーン・マットキャップ・フォン・法線・破線・影だけの材質）と、
  物理ベースの材質だけの部品（透過・虹彩・クリアコート）のシェーダーの文字を空にする（UNUSED。#ifdef の外では読まれない）
"""
import re
HINT = re.compile(r'gl_Position|gl_FragColor|void main|\bvarying\b|\buniform\b|\bvec[234]\b|#include|#ifdef')
PROTECT = ['void main() {', 'gl_PointSize = size;']
PUN = set(';,{}()=+-*/<>!&|?:[]^%~')
def min_text(t):
    """GLSL の断片（${} を含まない）を縮める。# で始まる行はそのまま1行に残す"""
    keep = {}
    for i, p in enumerate(PROTECT):
        k = f'\x01{i}\x01'
        if p in t:
            t = t.replace(p, k); keep[k] = p
    out = []
    lines = t.split('\n')
    buf = []
    def flush():
        if buf:
            s = ' '.join(buf)
            s = re.sub(r'[ \t]+', ' ', s)
            # 記号の前後の空白を除く（ただし + - が続く所、数の前の . は残す）
            r = []
            n = len(s)
            for i, ch in enumerate(s):
                if ch == ' ':
                    a = r[-1] if r else ''
                    b = s[i + 1] if i + 1 < n else ''
                    if (a in PUN or b in PUN) and not (a in '+-' and b in '+-') and a != '' and b != '':
                        continue
                r.append(ch)
            out.append(''.join(r).strip())
            buf.clear()
    for ln in lines:
        st = ln.strip()
        if st.startswith('#'):
            flush(); out.append(ln.rstrip()); continue
        if st: buf.append(st)
    flush()
    res = '\n'.join(x for x in out if x != '')
    # 先頭・末尾の空白は1文字だけ残す（${} とつながる所の区切りを変えない。改行なら改行）
    if t[:1].isspace(): res = ('\n' if '\n' in t[:len(t) - len(t.lstrip())] else ' ') + res
    if t[-1:].isspace() and res.strip(): res = res + ('\n' if '\n' in t[len(t.rstrip()):] else ' ')
    for k, p in keep.items(): res = res.replace(k, p)
    return res

def scan_templates(code):
    """縮めたJSの中のテンプレート文字列の範囲を返す（[(start,end)]：` の内側。${} の中は飛ばす）"""
    res = []; i = 0; n = len(code); stack = []
    while i < n:
        c = code[i]
        if c in '"\'':
            q = c; i += 1
            while i < n and code[i] != q:
                if code[i] == '\\': i += 1
                i += 1
            i += 1; continue
        if c == '`':
            i += 1; parts = []; st = i
            while i < n and code[i] != '`':
                if code[i] == '\\': i += 2; continue
                if code[i] == '$' and code[i + 1] == '{':
                    parts.append((st, i)); i += 2; d = 1
                    # 中の式：入れ子の文字列・テンプレートも飛ばす
                    while i < n and d:
                        ch = code[i]
                        if ch in '"\'':
                            q = ch; i += 1
                            while code[i] != q:
                                if code[i] == '\\': i += 1
                                i += 1
                        elif ch == '`':
                            j = i + 1; dd = 0
                            while not (code[j] == '`' and dd == 0):
                                if code[j] == '\\': j += 1
                                elif code[j:j+2] == '${': dd += 1; j += 1
                                elif code[j] == '}' and dd: dd -= 1
                                j += 1
                            i = j
                        elif ch == '{': d += 1
                        elif ch == '}': d -= 1
                        i += 1
                    st = i; continue
                i += 1
            parts.append((st, i)); res.append(parts); i += 1; continue
        i += 1
    return res

def minify_js(code):
    tpls = scan_templates(code)
    edits = []
    for parts in tpls:
        whole = ''.join(code[a:b] for a, b in parts)
        if not HINT.search(whole): continue
        for a, b in parts:
            seg = code[a:b]
            if '\\' in seg: continue  # エスケープを含む所は触れない
            new = min_text(seg)
            if new != seg: edits.append((a, b, new))
    out = []; last = 0
    for a, b, new in sorted(edits):
        out.append(code[last:a]); out.append(new); last = b
    out.append(code[last:])
    return ''.join(out), len(edits)


# 作品で使わない three.js のシェーダーの部品（ShaderChunk の名前）
UNUSED = ['clearcoat_normal_fragment_begin', 'clearcoat_normal_fragment_maps', 'clearcoat_pars_fragment', 'gradientmap_pars_fragment',
          'iridescence_fragment', 'iridescence_pars_fragment', 'lights_phong_fragment', 'lights_phong_pars_fragment',
          'lights_toon_fragment', 'lights_toon_pars_fragment', 'transmission_fragment', 'transmission_pars_fragment',
          'linedashed_vert', 'linedashed_frag', 'meshmatcap_vert', 'meshmatcap_frag', 'meshnormal_vert', 'meshnormal_frag',
          'meshphong_vert', 'meshphong_frag', 'meshtoon_vert', 'meshtoon_frag', 'shadow_vert', 'shadow_frag']


def strip_unused(code):
    """three.js の ShaderChunk のうち UNUSED の文字を空にする。見つからない・形が違うときは止める（three.js の版が変わったとき）"""
    for name in UNUSED:
        m = re.findall(r'[{,]' + name + r':([\w$]+)[,}]', code)
        if len(m) != 1:
            raise SystemExit(f'three.js のシェーダーの部品 {name} が見つかりません')
        v = re.escape(m[0])
        d = list(re.finditer(r'(?<![\w$.])' + v + r'=`', code))
        if len(d) != 1:
            raise SystemExit(f'three.js のシェーダーの部品 {name}（{m[0]}）の定義が1つに決まりません')
        a = d[0].end()
        b = code.index('`', a)
        if '${' in code[a:b] or '\\' in code[a:b]:
            raise SystemExit(f'three.js のシェーダーの部品 {name} の形が想定と違います')
        code = code[:a] + code[b:]
    return code
