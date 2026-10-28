const {chromium,devices}=require('playwright');(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader']});const c=await b.newContext({...devices['iPhone 13'],defaultBrowserType:undefined});const p=await c.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.route('**/three.module.js',r=>r.fulfill({path:process.cwd()+'/node_modules/three/build/three.module.js'}));
await p.goto('file://'+process.cwd()+'/floating.html?phase=0.5&wx=0');await p.waitForTimeout(2000);await p.evaluate(()=>document.getElementById('title').click());await p.waitForTimeout(800);await p.evaluate(()=>document.getElementById('go').click());await p.waitForTimeout(3000);
await p.screenshot({path:'mob.png',timeout:90000});console.log(errs.join('\n')||'ok');await b.close();})();
