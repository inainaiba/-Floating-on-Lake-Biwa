"""地理院タイルから作るデータを、まとめて作り直す。

  python3 tools/data.py            地形・線路・深さを順に作り直してから組み立てる
  python3 tools/data.py dem depth  名前を並べると、そのデータだけ作り直す（dem・isles・near・rivers・towns・landuse・rail・depth・ports）

- dem   … data/dem.json   周囲の地形（tools/dem.py。標高タイル）
- isles … data/isles.json 島の高さ（tools/isles.py。標高タイルのズーム14）
- near  … data/near.json  岸近くの細かい地形（tools/near.py。標高タイルのズーム14。dem のあとに作る）
- rivers… data/rivers.json 陸の川と池（tools/rivers.py。ベクトルタイルの水域）
- towns … data/towns.json 湖岸の家並みと道（tools/towns.py。ベクトルタイルの建物・道路）
- landuse … data/landuse.json 田・畑・森の地図記号（tools/landuse.py。ベクトルタイルの記号）
- rail  … data/rail.json  湖西線の道筋（tools/rail.py。ベクトルタイルの鉄道）
- depth … data/depth.json 湖の深さ（tools/depth.py。ベクトルタイルの等深線）
- ports … data/lake.json の港の点（tools/ports.py。ベクトルタイルの注記と湖岸線に合わせる）
取り寄せたタイルは tools/.dem_cache/・tools/.bv_cache/ に残し、2回目からはそれを使う。
湖岸線（data/lake.json の outer・islands）は tools/shore.py、橋・川などは OpenStreetMap から作る別の手順（tools/prep.py）で、ここでは扱わない。
必要な Python の部品は tools/requirements.txt（pip install -r tools/requirements.txt）。
"""
import subprocess, sys, time
from pathlib import Path

r = Path(__file__).resolve().parent.parent
STEPS = {'dem': 'tools/dem.py', 'isles': 'tools/isles.py', 'near': 'tools/near.py', 'rivers': 'tools/rivers.py', 'towns': 'tools/towns.py', 'landuse': 'tools/landuse.py', 'rail': 'tools/rail.py', 'depth': 'tools/depth.py', 'ports': 'tools/ports.py'}


def main():
    names = sys.argv[1:] or list(STEPS)
    bad = [n for n in names if n not in STEPS]
    if bad:
        raise SystemExit(f'知らない名前：{" ".join(bad)}（使えるのは {" ".join(STEPS)}）')
    for n in names:
        t = time.time()
        print(f'■ {n}（{STEPS[n]}）')
        subprocess.run([sys.executable, str(r / STEPS[n])], cwd=r, check=True)
        print(f'  {time.time() - t:.0f}秒')
    subprocess.run([sys.executable, str(r / 'build.py')], cwd=r, check=True)
    print('作り直したデータは git diff data/ で確かめてから記録する')


if __name__ == '__main__':
    main()
