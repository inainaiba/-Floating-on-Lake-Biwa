const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader']});const p=await b.newPage({viewport:{width:1200,height:630}});
await p.route('**/three.module.js',r=>r.fulfill({path:process.cwd()+'/node_modules/three/build/three.module.js'}));
await p.goto('file://'+process.cwd()+'/dbg.html?b=3&wx=0&phase=0.255&month=4&q=high');await p.waitForTimeout(2000);
await p.evaluate(()=>document.getElementById('title').click());await p.waitForTimeout(400);await p.evaluate(()=>document.getElementById('go').click());
await p.evaluate(()=>{try{localStorage.setItem('floating.hint2','1')}catch(e){};__set(136.0115,35.2735,1500,0,1.57,0.06,90);document.querySelectorAll('.ico,#hint,#rest').forEach(e=>e.style.display='none');});await p.waitForTimeout(4000);
await p.evaluate(()=>{document.querySelectorAll('.ico,#hint,#rest').forEach(e=>e.style.display='none');});await p.screenshot({path:'og.png',timeout:180000});await b.close();})();
