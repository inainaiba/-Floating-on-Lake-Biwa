"""更新の手順をひとまとめに：組み立て → 見た目の確認（代表4場面）→ GitHubへ記録・公開。

使い方（リポジトリの直下で）
  python3 tools/release.py "変更の説明"
  python3 tools/release.py "変更の説明" --full    確認を全12場面で行う
  python3 tools/release.py "変更の説明" --no-check 確認を省く（文言だけの変更など）

確認でページのエラーが出たら、記録せずに止まる。
GitHubに送ると、数分で GitHub Pages（docs/）に反映される。
"""
import sys, subprocess, pathlib

R = pathlib.Path(__file__).resolve().parent.parent


def run(*cmd):
    print('$', ' '.join(cmd))
    return subprocess.run(cmd, cwd=R).returncode


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        print(__doc__)
        sys.exit(2)
    msg = args[0]
    if run(sys.executable, 'build.py'):
        sys.exit('組み立てに失敗しました')
    if '--no-check' not in sys.argv:
        if run(sys.executable, 'tools/check.py', *([] if '--full' in sys.argv else ['--quick'])):
            sys.exit('確認でエラーが出たため、記録を中止しました（check/sheet.png を確認）')
    run('git', 'add', '-A')
    if subprocess.run(['git', 'diff', '--cached', '--quiet'], cwd=R).returncode == 0:
        print('変更はありません')
        return
    run('git', 'commit', '-q', '-m', msg)
    run('git', 'push', '-q')
    print('記録しました。数分で公開ページに反映されます。')


if __name__ == '__main__':
    main()
