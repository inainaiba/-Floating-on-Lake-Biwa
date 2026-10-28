"""全体の点検：建物のはみ出しと、動作の重さを数で調べる。

使い方（リポジトリの直下で）
  python3 tools/audit.py

調べること
  ・集落の家・南湖の街並み・沖島の家：建物の四隅が湖（または島の外の水）に出ていないか
  ・代表の場面ごとの処理時間の内訳（移動・空と光・景物・描画）と、描画の回数・三角形の数
この環境はソフトウェア描画なので、時間の絶対値は実機よりずっと遅い。場面どうし・部分どうしの比較に使う。
"""
import sys, json, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import check
from playwright.sync_api import sync_playwright

SCENES = [
    ('湖上・夏の昼', {'month': 6, 'phase': 0.45, 'wx': 0, 'b': 0, 't': 1000000}, [136.03, 35.22, 0, 0, 0.7, 0.1, 80]),
    ('海津・集落の前', {'month': 6, 'phase': 0.45, 'wx': 0, 'b': 0, 't': 1000000}, [136.072254, 35.46257, 600, 600, 0.6, 0.1, 90]),
    ('南湖の街', {'month': 6, 'phase': 0.45, 'wx': 0, 'b': 0, 't': 1000000}, [135.9, 35.05, 0, 0, 3.4, 0.02, 90]),
    ('ヨシ原（秋）', {'month': 9, 'phase': 0.6, 'wx': 0, 'b': 0, 't': 1000000}, [135.9295, 35.124, 320, 0, 1.57, 0.1, 60]),
    ('夜・灯り', {'month': 5, 'phase': 0.9, 'wx': 0, 'b': 8, 't': 1000000}, [136.03, 35.22, 0, 0, 0.7, 0.12, 60]),
    ('雨', {'month': 5, 'phase': 0.4, 'wx': 4, 'b': 0, 't': 1000000}, [136.03, 35.22, 0, 0, 0.7, 0.3, 60]),
]

OVERLAP = r"""()=>{
 const G=__floating,D=G.dbg,S=G.S,out={};
 const corners=(cx,cz,w,d,r)=>{const c=Math.cos(r),s=Math.sin(r),p=[];for(const [a,b] of [[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]]){p.push([(cx+(a*w)*c-(b*d)*s)/S,(cz+(a*w)*s+(b*d)*c)/S]);}return p;};
 // 集落の家：中心は実寸、幅・奥行きは作品内の単位、向きは rot
 let n=0,bad=[];for(const h of D.houses){n++;const p=corners(h.x*S,h.y*S,h.w,h.d,h.rot);if(p.some(([x,y])=>D.inLake(x,y)))bad.push([+(h.x).toFixed(0),+(h.y).toFixed(0)]);}
 out.houses=[n,bad.length,bad.slice(0,8)];
 // 南湖の街並み
 n=0;bad=[];for(const [x,y,w,d,h,r] of (G.city&&G.city.userData.bl)||[]){n++;const p=corners(x*S,y*S,w,d,-r);if(p.some(([a,b])=>D.inLake(a,b)))bad.push([+x.toFixed(0),+y.toFixed(0)]);}
 out.city=[n,bad.length,bad.slice(0,8)];
 // 沖島の家：四隅が島の上にあるか
 n=0;bad=[];for(const [wx,wz,w,d,r] of (G.okishima&&G.okishima.foot)||[]){n++;const p=corners(wx,wz,w,d,-r);if(p.some(([x,y])=>D.isleH(x,y)===null))bad.push([+(wx/S).toFixed(0),+(wz/S).toFixed(0)]);}
 out.okishima=[n,bad.length,bad.slice(0,8)];
 // 湖西線の高架：桁どうしのすき間（約60以上の飛び）と、桁の下に地面が出ていないか
 const K=G.kosei;if(K){let gaps=0,under=0;for(let i=0;i<K.pts.length-1;i++){const a=K.pts[i],b=K.pts[i+1];if(Math.hypot(b[0]-a[0],b[1]-a[1])*S<0.01)continue;
  for(const u of [.25,.5,.75]){const x=a[0]+(b[0]-a[0])*u,y=a[1]+(b[1]-a[1])*u,h=K.ht[i]+(K.ht[i+1]-K.ht[i])*u;if(D.landY(x,y)>h-1.2)under++;}}
  out.kosei=[K.pts.length,under,['桁が地面にめり込む所 '+under]];}
 // 湖岸の景物：記録した位置が、それぞれの決まり（湖の上・陸・岸の近く）を守っているか
 const ok={water:(x,y)=>D.inLake(x,y),land:(x,y)=>!D.inLake(x,y)||D.isleH(x,y)!==null,shore:(x,y)=>D.distShore(x,y)<250};
 const agg={};for(const L of D.PLACE_LOG){const a=agg[L.name]||(agg[L.name]={n:0,bad:[],rule:L.rule});for(const p of L.pts){a.n++;if(!ok[L.rule](p[0],p[1]))a.bad.push([+p[0].toFixed(0),+p[1].toFixed(0)]);}}
 for(const [k,a] of Object.entries(agg))out[k+'（'+({water:'湖の上',land:'陸',shore:'岸の近く'})[a.rule]+'）']=[a.n,a.bad.length,a.bad.slice(0,5)];
 return out;}"""


def main():
    import subprocess
    subprocess.run([sys.executable, str(check.R / 'build.py')], cwd=check.R, check=True, capture_output=True)
    srv = check.serve()
    port = srv.server_address[1]
    errs = []
    bad_total = 0
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=swiftshader'])
        pg = b.new_page(viewport={'width': 640, 'height': 400})
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: check.gl_error(m, errs))
        three = check.R / 'node_modules/three/build/three.module.js'
        if three.exists():
            pg.route('**/three.module.js', lambda r: r.fulfill(path=str(three)))
        pg.goto(f'http://127.0.0.1:{port}/docs/index.html?debug')
        pg.evaluate("()=>{try{localStorage.setItem('floating.hint2','1')}catch(e){}}")
        pg.wait_for_timeout(900)
        pg.evaluate("()=>document.getElementById('title').click()")
        pg.wait_for_timeout(900)
        pg.evaluate("()=>document.getElementById('go').click()")
        pg.wait_for_timeout(1500)
        print('■ 建物のはみ出し（全数／はみ出し／例）')
        for k, v in pg.evaluate(OVERLAP).items():
            print(f'  {k}：{v[0]} 棟中 {v[1]} 棟', v[2] if v[1] else '')
            bad_total += v[1]
        print('■ 場面ごとの処理時間（ミリ秒、ソフトウェア描画）と描画の量')
        for name, sc, v in SCENES:
            pg.evaluate('a=>{__scene(a[0]);__set(...a[1])}', [sc, v])
            pg.evaluate('()=>{__floating.prof={}}')
            pg.evaluate('()=>__frames(6)')
            pr = pg.evaluate('()=>__floating.prof')
            print(f"  {name}：移動 {pr['move']:.1f}／空と光 {pr['skyLight']:.1f}／景物 {pr['elements']:.1f}／描画 {pr['render']:.0f}"
                  f"　描画回数 {pr['calls']}　三角形 {pr['triangles']/1e6:.2f}M")
        b.close()
    srv.shutdown()
    if errs:
        print('■ ページのエラー')
        for e in sorted(set(errs)):
            print('  ', e)
    # はみ出しや置き場所の誤り、ページの誤りがあれば失敗にする（自動確認で止めるため）
    if bad_total or errs:
        sys.exit(1)


if __name__ == '__main__':
    main()
