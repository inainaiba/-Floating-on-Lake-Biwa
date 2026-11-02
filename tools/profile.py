"""重さの内訳：部品（src/js のファイル）ごとに、組み立ての時間と、作った物の三角形の数・描く回数を数える。

使い方（リポジトリの直下で）
  python3 tools/profile.py           代表の場面（湖上・夏の昼）で
  python3 tools/profile.py 南湖       名前に「南湖」を含む全体点検の場面で

数え方
  ・組み立ての時間：部品の終わりの印（performance.mark）の間の時間（ソフトウェア描画の環境なので、比べるための目安）
  ・三角形：その部品が作った物（子も含む）の、いま描かれる形の三角形 × 数（InstancedMesh は数をかける）。画面の外も含む全体の量
  ・描く回数：画面に入っている物の数（三角形が0の物は除く）。実際の描画（映り込み・影を含む）の内訳の目安
公開ファイル（docs/index.html）は変えない（計測用の tools/.profile.html を作る）
"""
import os, sys, subprocess, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import check, audit
from playwright.sync_api import sync_playwright

R = check.R


def main():
    key = sys.argv[1] if len(sys.argv) > 1 else '湖上・夏の昼'
    sc = next(s for s in audit.SCENES if key in s[0])
    env = dict(os.environ, PROFILE='1')
    subprocess.run([sys.executable, str(R / 'build.py')], cwd=R, check=True, capture_output=True, env=env)
    srv = check.serve()
    port = srv.server_address[1]
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=swiftshader'])
        pg = b.new_page(viewport={'width': 640, 'height': 400})
        pg.goto(f'http://127.0.0.1:{port}/tools/.profile.html?debug&q=mid')
        check.ready(pg)
        pg.evaluate("()=>{try{localStorage.setItem('floating.hint2','1')}catch(e){}}")
        pg.wait_for_timeout(900)
        pg.evaluate("()=>document.getElementById('title').click()")
        pg.wait_for_timeout(900)
        pg.evaluate("()=>document.getElementById('go').click()")
        pg.wait_for_timeout(1200)
        pg.evaluate('a=>{__scene(a[0]);__set(...a[1])}', [sc[1], sc[2]])
        pg.evaluate('()=>__frames(4)')
        res = pg.evaluate("""()=>{
          const marks=performance.getEntriesByType('mark').filter(m=>m.name.endsWith('.js'));
          const t={};let prev=0;for(const m of marks){t[m.name.replace('.js','')]=m.startTime-prev;prev=m.startTime;}
          const cam=__floating.camera, F=new (cam.projectionMatrix.constructor)(), fr={};
          const Fr=new (Object.getPrototypeOf(Object.getPrototypeOf(cam)).constructor.prototype.constructor)();
          const out={};
          const frustum=(()=>{const m=cam.projectionMatrix.clone().multiply(cam.matrixWorldInverse);const f=new (window.__Frustum||Object)();return m;})();
          __floating.scene.traverse(o=>{
            let p=o,mod=null;while(p&&!mod){mod=p.userData&&p.userData.__mod;p=p.parent;}
            mod=mod||'?';const r=out[mod]||(out[mod]={tri:0,obj:0,vis:0});
            if(!(o.isMesh||o.isPoints||o.isLine))return;
            const g=o.geometry;if(!g)return;
            const n=g.index?g.index.count:(g.attributes.position?g.attributes.position.count:0);
            const inst=o.isInstancedMesh?o.count:1;
            let vis=true;for(let q=o;q;q=q.parent)if(!q.visible){vis=false;break;}
            if(!vis||!inst)return;
            r.obj++;r.tri+=(o.isMesh?n/3:n)*inst;
          });
          return {t,out,info:[__floating.prof&&__floating.prof.calls,__floating.prof&&__floating.prof.triangles]};
        }""")
        b.close()
    srv.shutdown()
    t, out = res['t'], res['out']
    print(f'■ 場面：{sc[0]}（中画質）　描画回数 {res["info"][0]}　三角形 {res["info"][1]}')
    print('■ 部品ごと（見えている物の三角形が多い順）：部品　三角形（万）　物の数　組み立て（ミリ秒）')
    rows = sorted(out.items(), key=lambda kv: -kv[1]['tri'])
    for k, v in rows[:25]:
        print(f'  {k:28s} {v["tri"]/1e4:8.1f} {v["obj"]:6d} {t.get(k, 0):8.0f}')
    print('■ 組み立ての時間が長い部品（ミリ秒）')
    for k, v in sorted(t.items(), key=lambda kv: -kv[1])[:12]:
        print(f'  {k:28s} {v:8.0f}')


if __name__ == '__main__':
    main()
