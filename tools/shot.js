const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});const p=await b.newPage({viewport:{width:900,height:600}});
const errs=[];p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('pageerror',e=>errs.push(e.message));
await p.route('**/three.module.js',r=>r.fulfill({path:process.cwd()+'/node_modules/three/build/three.module.js'}));
await p.goto('file://'+process.cwd()+'/floating.html'+(process.argv[2]||''));await p.waitForTimeout(5000);await p.screenshot({path:'near.png'});
await p.click('#view');await p.waitForTimeout(1500);await p.screenshot({path:'far.png'});
console.log(errs.join('\n')||'no errors');await b.close();})();
