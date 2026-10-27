import pathlib,json
from openpyxl import load_workbook
r=pathlib.Path(__file__).parent
def buoys():
    ws=load_workbook(r/'data/buoys.xlsx',data_only=True)['ブイ一覧'];out=[];skip=[]
    for row in ws.iter_rows(min_row=5,values_only=True):
        no,name,form,lat,lon,url,show=row[:7]
        if lat is None and lon is None and not url:continue
        if show=='×':continue
        if not isinstance(lat,(int,float)) or not isinstance(lon,(int,float)) or not url:skip.append(no);continue
        out.append({'no':no,'name':name or '','form':form or '','lat':lat,'lon':lon,'url':str(url).strip()})
    if skip:print('入力不足で飛ばした行 No:',skip)
    return out
t=(r/'template.html').read_text()
B=buoys()
out=t.replace('__LAKE__',(r/'data/lake.json').read_text()).replace('__RELIEF__',(r/'data/relief.json').read_text()).replace('__BUOYS__',json.dumps(B,ensure_ascii=False))
(r/'docs/index.html').write_text(out)
print('built docs/index.html  ブイ',len(B),'個')
