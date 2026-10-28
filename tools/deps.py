"""部品どうしのつながりを調べて src/DEPENDENCIES.md に書き出す。build.py からも呼ばれる。

各部品（src/js/NN-*.js）について
  ・この部品で作る名前（最上位の const / let / var / function / class）
  ・ほかの部品から使っている名前（どの部品で作られたものか）
  ・window.__xxx の共有の値（作る側・使う側）
  ・共有の箱 G に載せる名前（G.xxx = …）と、それを載せる部品
を一覧にする。同じ名前を2つの部品で作っていたら、エラーとして知らせる。
G.xxx を2つの部品で載せている場合もエラーにする（片方がもう片方を上書きして壊すため。
同じ値を育てて使う場合は、その名前を G_SHARED に書いて意図を明示する）。
後ろの部品で作る名前を、前の部品が読み込み時に使うと動かないので、その可能性がある所に印を付ける。
"""
import re, pathlib, sys
R = pathlib.Path(__file__).resolve().parent.parent
J = R / 'src/js'
DECL = re.compile(r'^(?:const|let|var)\s+([^=;]+?)\s*(?:=|;)', re.M)
FUNC = re.compile(r'^(?:async\s+)?(?:function|class)\s+([A-Za-z_$][\w$]*)', re.M)
WIN = re.compile(r'window\.(__[A-Za-z]\w*)')
GSET = re.compile(r'(?<![\w$.])G\.([A-Za-z_$][\w$]*)\s*(?:=(?!=)|\|\|=|\?\?=)')
# 複数の部品から書き換えてよい G の名前（意図して共有しているもの）
G_SHARED = set()


def strip(src):
    src = re.sub(r'`(?:\\.|[^`\\])*`', '``', src, flags=re.S)
    src = re.sub(r"'(?:\\.|[^'\\\n])*'", "''", src)
    src = re.sub(r'"(?:\\.|[^"\\\n])*"', '""', src)
    src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
    return re.sub(r'//[^\n]*', '', src)


def top_level(src):
    # 波かっこの深さ0の行だけ取り出す
    out, d = [], 0
    for line in src.split('\n'):
        if d == 0:
            out.append(line)
        d += line.count('{') - line.count('}')
        d = max(d, 0)
    return '\n'.join(out)


def analyze():
    files = sorted(J.glob('*.js'))
    defs, raw = {}, {}
    global funcs
    funcs = set()
    errors = []
    for f in files:
        s = strip(f.read_text())
        raw[f.name] = s
        tl = top_level(s)
        names = set()
        for m in re.finditer(r'^(?:const|let|var)\s', tl, re.M):
            i, d, buf = m.end(), 0, ''
            while i < len(tl):
                ch = tl[i]
                if ch in '([{': d += 1
                elif ch in ')]}': d -= 1
                elif ch == ';' and d == 0: break
                buf += ch if d == 0 else ('' if ch not in ',' else ' ')
                i += 1
            for part in buf.split(','):
                n = part.split('=')[0].strip()
                if re.fullmatch(r'[A-Za-z_$][\w$]*', n):
                    names.add(n)
        fn = set(FUNC.findall(tl))
        names |= fn
        funcs.update(fn)
        for n in names:
            if n in defs:
                errors.append(f'{n} を {defs[n]} と {f.name} の両方で作っている')
            defs[n] = f.name
    order = [f.name for f in files]
    uses, wins = {}, {}
    for f in order:
        src = re.sub(r'(?<![.\w$])([A-Za-z_$][\w$]*)\s*:(?!:)', ' ', raw[f])  # オブジェクトのキーは除く
        local = set(re.findall(r'(?:const|let|var)\s+([A-Za-z_$][\w$]*)', src)) | set(re.findall(r',\s*([A-Za-z_$][\w$]*)\s*=(?!=)', src))
        local |= set(x for args in re.findall(r'\(([\w$,\s]*)\)\s*=>', src) for x in re.findall(r'[A-Za-z_$][\w$]*', args))
        local |= set(x for args in re.findall(r'function\s*[\w$]*\s*\(([^)]*)\)', src) for x in re.findall(r'[A-Za-z_$][\w$]*', args))
        ids = set(re.findall(r'(?<![.\w$])([A-Za-z_$][\w$]*)', src)) - (local - set(n for n, g in defs.items() if g == f))
        uses[f] = sorted((n, defs[n]) for n in ids if n in defs and defs[n] != f)
        for m in WIN.finditer(raw[f]):
            wins.setdefault(m.group(1), set()).add(f)
    gset = {}
    for f in order:
        for m in GSET.finditer(raw[f]):
            gset.setdefault(m.group(1), set()).add(f)
    for k, fs in gset.items():
        if len(fs) > 1 and k not in G_SHARED:
            errors.append(f'G.{k} を ' + ' と '.join(sorted(fs)) + ' の両方で書き換えている')
    analyze.gset = gset
    return order, defs, uses, wins, errors


def write():
    order, defs, uses, wins, errors = analyze()
    gset = analyze.gset
    L = ['# 部品どうしのつながり', '', '`python3 tools/deps.py` で自動生成（`build.py` を実行すると更新される）。手で書き換えない。', '']
    L += ['部品は番号順に1つのモジュールとしてつながる。後ろの部品で作る名前は、前の部品の「読み込み時に動く処理」からは使えない（関数の中や毎フレームの処理からは使える）。', '']
    for f in order:
        mine = sorted(n for n, g in defs.items() if g == f)
        L.append(f'## {f}')
        L.append('- 作る：' + ('、'.join(f'`{n}`' for n in mine) if mine else '（なし）'))
        by = {}
        for n, g in uses[f]:
            by.setdefault(g, []).append(n)
        if by:
            L.append('- 使う：')
            for g in sorted(by):
                later = order.index(g) > order.index(f)
                risky = [n for n in by[g] if n not in funcs] if later else []
                tag = ('（後ろの部品・要注意）' if risky else '（後ろの部品・関数なので可）') if later else ''
                L.append(f'  - {g}{tag}：' + '、'.join(f'`{n}`' for n in by[g]))
        L.append('')
    L += ['## 共有の値（window.__xxx）', '']
    for k in sorted(wins):
        L.append(f'- `{k}`：' + '、'.join(sorted(wins[k])))
    L += ['', '## 共有の箱 G に載せる名前（G.xxx）', '', '2つの部品で同じ名前を載せるとビルドが止まる（tools/deps.py の G_SHARED に書いたものを除く）。', '']
    for k in sorted(gset):
        L.append(f'- `G.{k}`：' + '、'.join(sorted(gset[k])))
    (R / 'src/DEPENDENCIES.md').write_text('\n'.join(L) + '\n')
    for l in L:
        if '要注意' in l:
            print('注意：前の部品が後ろの部品の値を使っています →', l.strip())
    return errors


if __name__ == '__main__':
    errs = write()
    print('src/DEPENDENCIES.md を更新しました')
    for e in errs:
        print('エラー：', e)
    sys.exit(1 if errs else 0)
