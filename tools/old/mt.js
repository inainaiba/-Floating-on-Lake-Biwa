const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader']});const p=await b.newPage({viewport:{width:900,height:560}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.route('**/three.module.js',r=>r.fulfill({path:process.cwd()+'/node_modules/three/build/three.module.js'}));
const t0=Date.now();await p.goto('file://'+process.cwd()+'/floating.html'+process.argv[2]);await p.waitForTimeout(2000);await p.evaluate(()=>document.getElementById('title').click());await p.waitForTimeout(1200);
await p.evaluate(()=>document.getElementById('go').click());await p.waitForTimeout(2500);await p.screenshot({path:'m1.png',timeout:90000});
await p.evaluate(()=>document.getElementById('view').click());await p.waitForTimeout(1200);await p.screenshot({path:'m2.png',timeout:90000});console.log(errs.join('\n')||'ok',Date.now()-t0);await b.close();})();
