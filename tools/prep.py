import json, math
from shapely.geometry import shape, mapping, Polygon, MultiPolygon, LineString, Point
from shapely.ops import unary_union
g=json.load(open('/mnt/user-data/uploads/export.geojson'))
lake=None
for f in g['features']:
    if f.get('id')=='relation/63499' or f['properties'].get('@id')=='relation/63499':
        lake=shape(f['geometry'])
print(lake.geom_type, lake.bounds)
if lake.geom_type=='MultiPolygon':
    lake=max(lake.geoms,key=lambda p:p.area)
lat0=35.25; lon0=136.08
kx=111320*math.cos(math.radians(lat0)); ky=110540
def P(lon,lat): return ((lon-lon0)*kx, (lat0-lat)*ky)  # x east, y south (meters)
def proj(geom):
    from shapely.ops import transform
    return transform(lambda x,y,z=None:(  (x-lon0)*kx if True else 0, (lat0-y)*ky), geom)
L=proj(lake).simplify(40)
print('holes',len(L.interiors),'pts',len(L.exterior.coords))
holes=[h for h in L.interiors if Polygon(h).area>20000]
out={'outer':[[round(x),round(y)] for x,y in L.exterior.coords],
     'islands':[[[round(x),round(y)] for x,y in h.coords] for h in holes]}
# infra
g2=json.load(open('/mnt/user-data/uploads/export__2_.geojson'))
ports=[];bridges=[];rivers=[];lights=[]
for f in g2['features']:
    p=f['properties']; geom=shape(f['geometry']); gp=proj(geom)
    name=p.get('name','')
    if p.get('harbour')=='yes' or p.get('amenity')=='ferry_terminal' or '漁港' in name:
        c=gp.centroid; ports.append([round(c.x),round(c.y),name])
    elif p.get('man_made')=='lighthouse':
        c=gp.centroid; lights.append([round(c.x),round(c.y)])
    elif 'bridge' in p and name:
        if gp.geom_type in('LineString','MultiLineString'):
            ls=gp if gp.geom_type=='LineString' else max(gp.geoms,key=lambda l:l.length)
            bridges.append({'name':name,'pts':[[round(x),round(y)] for x,y in ls.simplify(20).coords]})
    elif p.get('waterway') in('river','canal') and gp.geom_type=='LineString':
        rivers.append([[round(x),round(y)] for x,y in gp.simplify(60).coords])
# piers as ports-ish markers
out.update(ports=ports,bridges=bridges,lights=lights,rivers=rivers)
# river mouths: endpoint closest to lake
bd=L.exterior
mouths=[]
for r in rivers:
    for e in (r[0],r[-1]):
        if bd.distance(Point(e))<300: mouths.append(e)
out['mouths']=mouths
json.dump(out,open('lake.json','w'),ensure_ascii=False,separators=(',',':'))
print(len(ports),len(bridges),len(lights),len(rivers),len(mouths), [b['name'] for b in bridges])
import os;print(os.path.getsize('lake.json'))
