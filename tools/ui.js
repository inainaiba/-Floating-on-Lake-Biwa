const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader']});const p=await b.newPage({viewport:{width:900,height:600}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.route('**/three.module.js',r=>r.fulfill({path:process.cwd()+'/node_modules/three/build/three.module.js'}));
await p.goto('file://'+process.cwd()+'/floating.html?phase=0.45');await p.waitForTimeout(3000);await p.screenshot({path:'s0.png'});
await p.click('#title');await p.waitForTimeout(2500);console.log('E',errs);await p.screenshot({path:'s1.png'});
for(const i of [4,5,6]){ await p.click('#next');await p.waitForTimeout(400);} await p.waitForTimeout(1500);await p.screenshot({path:'s2.png'});
await p.click('#next');await p.click('#next');await p.click('#next');await p.click('#next');await p.click('#next');await p.click('#next');await p.waitForTimeout(1200);await p.screenshot({path:'s3.png'});
await p.click('#go');await p.waitForTimeout(3000);await p.screenshot({path:'s4.png'});console.log(errs.join('\n')||'ok');await b.close();})();
