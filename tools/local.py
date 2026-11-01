"""手元の確認を一度に：速いテスト → 全体点検 → 見た目の確認 を順に走らせ、どこかで失敗したらそこで止める。

使い方（リポジトリの直下で）
  python3 tools/local.py            すべて（全場面）
  python3 tools/local.py --quick    見た目の確認を代表の場面だけにする（自動確認と同じ）
  python3 tools/local.py --accept   すべて通ったら、今回の撮影を新しい基準にする

各段の出力はそのまま流し、最後に「通った／失敗した段と、失敗の行」をまとめて出す。
（以前、出力の末尾だけを見ていて、全体点検の失敗の行（松並木が川に2本）を見落とし、
  自動確認で初めて気づいたことがあった。終了コードで判定し、失敗の行を拾って最後に並べる）
"""
import sys, subprocess, pathlib, re, time

R = pathlib.Path(__file__).resolve().parent.parent
PY = sys.executable

# 失敗を示す行（各道具の出力の書き方に合わせる）
BAD = [
    re.compile(r'棟中 [1-9]'),              # 全体点検：置き場所のはみ出し
    re.compile(r'★上限を超えています'),      # 全体点検：重さ
    re.compile(r'^■ ページのエラー|^ページのエラー'),
    re.compile(r'覆われたボタン [1-9]'),
    re.compile(r'[1-9]\d* 回が陸や島に近すぎ'),
    re.compile(r'湖面の検査：.*（[1-9]'),    # 見た目の確認：湖面のまっすぐな縁
    re.compile(r'Error|Traceback|見つけられません|一致しません'),
]


def step(name, args):
    t0 = time.time()
    print(f'━━ {name} ━━', flush=True)
    p = subprocess.Popen([PY, *args], cwd=R, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    bad = []
    for line in p.stdout:
        print(line, end='', flush=True)
        if any(b.search(line) for b in BAD):
            bad.append(line.rstrip())
    p.wait()
    return p.returncode == 0 and not bad, bad, time.time() - t0


def main():
    a = sys.argv[1:]
    steps = [
        ('速いテスト', ['tools/test.py']),
        ('全体点検', ['tools/audit.py']),
        ('見た目の確認', ['tools/check.py'] + (['--quick'] if '--quick' in a else [])),
    ]
    results = []
    for name, args in steps:
        ok, bad, dt = step(name, args)
        results.append((name, ok, bad, dt))
        if not ok:
            break
    print('━━ まとめ ━━')
    for name, ok, bad, dt in results:
        print(f'  {"○" if ok else "×"} {name}（{dt:.0f}秒）')
        for b in bad[:10]:
            print('      ', b)
    for name, _ in steps[len(results):]:
        print(f'  － {name}（前の段が失敗したので走らせていない）')
    if not all(ok for _, ok, _, _ in results) or len(results) < len(steps):
        sys.exit(1)
    if '--accept' in a:
        subprocess.run([PY, 'tools/check.py', '--accept'], cwd=R, check=True)


if __name__ == '__main__':
    main()
