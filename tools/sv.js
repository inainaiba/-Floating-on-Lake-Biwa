const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader']});const p=await b.newPage({viewport:{width:500,height:800},acceptDownloads:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.route('**/three.module.js',r=>r.fulfill({path:process.cwd()+'/node_modules/three/build/three.module.js'}));
await p.goto('file://'+process.cwd()+'/floating.html?phase=0.5&wx=0&speed=600');await p.waitForTimeout(1500);await p.evaluate(()=>document.getElementById('title').click());await p.waitForTimeout(800);
await p.evaluate(()=>document.getElementById('go').click());await p.waitForTimeout(20000);
const dl=p.waitForEvent('download',{timeout:5000}).catch(()=>null);await p.evaluate(()=>document.getElementById('save').click());const d=await dl;if(d)await d.saveAs('drawing.png');await p.waitForTimeout(800);await p.screenshot({path:'sv.png'});
console.log(errs.join('\n')||'ok',!!d);await b.close();})();
