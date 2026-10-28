"""Floating の組み立て：src/ の部品と data/ を1つのHTML（docs/index.html）にまとめる。

  src/shell.html  … HTML・CSS・画面の部品（__SCRIPT__ の位置に描画のコードが入る）
  src/js/NN-*.js  … 描画のコード。ファイル名の番号順につなげる（1つのモジュールとして動く）
  data/lake.json, data/relief.json, data/buoys.xlsx … 湖・地形・ブイのデータ
"""
import pathlib, json, re
from openpyxl import load_workbook

r = pathlib.Path(__file__).parent


LAT_RANGE, LON_RANGE = (34.85, 35.6), (135.8, 136.35)   # 琵琶湖とその周り
YT = re.compile(r'^https?://(?:www\.|m\.)?(?:youtube\.com/(?:watch\?v=|shorts/|live/)|youtu\.be/)([\w-]{11})')


def buoys():
    """ブイ一覧を読み、入力を確かめる。作品に出せない行は飛ばし、気になる点は知らせる。"""
    ws = load_workbook(r / 'data/buoys.xlsx', data_only=True)['ブイ一覧']
    out, notes = [], []
    seen_pos, seen_vid = {}, {}
    for row in ws.iter_rows(min_row=5, values_only=True):
        no, name, form, lat, lon, url, show = row[:7]
        if lat is None and lon is None and not url:
            continue
        tag = f'No.{no}' + (f'（{name}）' if name else '')
        if show == '×':
            continue
        if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
            notes.append(f'{tag}：北緯・東経が数値でないため飛ばしました'); continue
        if LON_RANGE[0] <= lat <= LON_RANGE[1] and LAT_RANGE[0] <= lon <= LAT_RANGE[1]:
            notes.append(f'{tag}：北緯と東経が逆のようです（入れ替えて使いました）'); lat, lon = lon, lat
        if not (LAT_RANGE[0] <= lat <= LAT_RANGE[1] and LON_RANGE[0] <= lon <= LON_RANGE[1]):
            notes.append(f'{tag}：琵琶湖の範囲外の座標（{lat}, {lon}）のため飛ばしました'); continue
        if not url:
            notes.append(f'{tag}：リンクがないため飛ばしました'); continue
        url = str(url).strip()
        m = YT.match(url)
        if not m:
            notes.append(f'{tag}：YouTubeのリンクではないようです（そのまま使いました）：{url}')
        else:
            vid = m.group(1)
            if vid in seen_vid:
                notes.append(f'{tag}：{seen_vid[vid]} と同じ動画です')
            seen_vid[vid] = tag
        key = (round(lat, 4), round(lon, 4))   # 約10mの精度で同じ場所
        if key in seen_pos:
            notes.append(f'{tag}：{seen_pos[key]} とほぼ同じ場所です（約10m以内）')
        seen_pos[key] = tag
        if not name:
            notes.append(f'{tag}：集落名が空です')
        out.append({'no': no, 'name': name or '', 'form': form or '', 'lat': lat, 'lon': lon, 'url': url})
    for n in notes:
        print('ブイ一覧：', n)
    return out


def build():
    import sys
    sys.path.insert(0, str(r / 'tools'))
    import deps
    errs = deps.write()
    if errs:
        for e in errs:
            print('エラー：', e)
        raise SystemExit('部品の名前が重なっています（src/DEPENDENCIES.md 参照）')
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
