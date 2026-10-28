"""部品どうしのつながりを調べて src/DEPENDENCIES.md に書き出す。build.py からも呼ばれる。

各部品（src/js/NN-*.js）について
  ・この部品で作る名前（最上位の const / let / var / function / class）
  ・ほかの部品から使っている名前（どの部品で作られたものか）
  ・window.__xxx の共有の値（作る側・使う側）
を一覧にする。同じ名前を2つの部品で作っていたら、エラーとして知らせる。
後ろの部品で作る名前を、前の部品が読み込み時に使うと動かないので、その可能性がある所に印を付ける。
"""
import re, pathlib, sys
R = pathlib.Path(__file__).resolve().parent.parent
J = R / 'src/js'
DECL = re.compile(r'^(?:const|let|var)\s+([^=;]+?)\s*(?:=|;)', re.M)
FUNC = re.compile(r'^(?:async\s+)?(?:function|class)\s+([A-Za-z_$][\w$]*)', re.M)
WIN = re.compile(r'window\.(__[A-Za-z]\w*)')


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
        names |= set(FUNC.findall(tl))
        for n in names:
            if n in defs:
                errors.append(f'{n} を {defs[n]} と {f.name} の両方で作っている')
            defs[n] = f.name
    order = [f.name for f in files]
    uses, wins = {}, {}
    for f in order:
        ids = set(re.findall(r'(?<![.\w$])([A-Za-z_$][\w$]*)', raw[f]))
        uses[f] = sorted((n, defs[n]) for n in ids if n in defs and defs[n] != f)
        for m in WIN.finditer(raw[f]):
            wins.setdefault(m.group(1), set()).add(f)
    return order, defs, uses, wins, errors


def write():
    order, defs, uses, wins, errors = analyze()
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
                later = '（後ろの部品）' if order.index(g) > order.index(f) else ''
                L.append(f'  - {g}{later}：' + '、'.join(f'`{n}`' for n in by[g]))
        L.append('')
    L += ['## 共有の値（window.__xxx）', '']
    for k in sorted(wins):
        L.append(f'- `{k}`：' + '、'.join(sorted(wins[k])))
    (R / 'src/DEPENDENCIES.md').write_text('\n'.join(L) + '\n')
    return errors


if __name__ == '__main__':
    errs = write()
    print('src/DEPENDENCIES.md を更新しました')
    for e in errs:
        print('エラー：', e)
    sys.exit(1 if errs else 0)
