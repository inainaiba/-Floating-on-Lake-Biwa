const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader']});const p=await b.newPage({viewport:{width:640,height:420}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.route('**/three.module.js',r=>r.fulfill({path:process.cwd()+'/node_modules/three/build/three.module.js'}));
for(const i of process.argv.slice(2)){await p.goto('file://'+process.cwd()+'/floating.html?phase=0.45&b='+i);await p.waitForTimeout(1500);await p.evaluate(()=>document.getElementById('title').click());await p.waitForTimeout(2500);await p.screenshot({path:'b'+i+'.png',timeout:90000});}
console.log(errs.join('\n')||'ok');await b.close();})();
