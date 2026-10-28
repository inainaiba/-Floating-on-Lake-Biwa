"""Floating の組み立て：src/ の部品と data/ を1つのHTML（docs/index.html）にまとめる。

  src/shell.html  … HTML・CSS・画面の部品（__SCRIPT__ の位置に描画のコードが入る）
  src/js/NN-*.js  … 描画のコード。ファイル名の番号順につなげる（1つのモジュールとして動く）
  data/lake.json, data/relief.json, data/buoys.xlsx … 湖・地形・ブイのデータ
"""
import pathlib, json
from openpyxl import load_workbook

r = pathlib.Path(__file__).parent


def buoys():
    ws = load_workbook(r / 'data/buoys.xlsx', data_only=True)['ブイ一覧']
    out, skip = [], []
    for row in ws.iter_rows(min_row=5, values_only=True):
        no, name, form, lat, lon, url, show = row[:7]
        if lat is None and lon is None and not url:
            continue
        if show == '×':
            continue
        if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)) or not url:
            skip.append(no)
            continue
        out.append({'no': no, 'name': name or '', 'form': form or '', 'lat': lat, 'lon': lon, 'url': str(url).strip()})
    if skip:
        print('入力不足で飛ばした行 No:', skip)
    return out


def build():
    parts = sorted((r / 'src/js').glob('*.js'))
    script = '\n'.join(f'// ==== {p.name} ====\n' + p.read_text() for p in parts)
    html = (r / 'src/shell.html').read_text().replace('__SCRIPT__', script)
    B = buoys()
    html = (html.replace('__LAKE__', (r / 'data/lake.json').read_text())
                .replace('__RELIEF__', (r / 'data/relief.json').read_text())
                .replace('__BUOYS__', json.dumps(B, ensure_ascii=False)))
    (r / 'docs/index.html').write_text(html)
    print(f'built docs/index.html  部品 {len(parts)} 個 / ブイ {len(B)} 個')


if __name__ == '__main__':
    build()
