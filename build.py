import pathlib
r=pathlib.Path(__file__).parent
t=(r/'template.html').read_text()
out=t.replace('__LAKE__',(r/'data/lake.json').read_text()).replace('__RELIEF__',(r/'data/relief.json').read_text())
(r/'docs/index.html').write_text(out)
print('built docs/index.html')
