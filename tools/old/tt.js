const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader']});const p=await b.newPage({viewport:{width:768,height:256}});
await p.route('**/three.module.js',r=>r.fulfill({path:process.cwd()+'/node_modules/three/build/three.module.js'}));
let h=require('fs').readFileSync('floating.html','utf8').replace("requestAnimationFrame(frame);\nrequestAnimationFrame(()=>","window.__pt=paintTree;window.__sc=scene;\nrequestAnimationFrame(frame);\nrequestAnimationFrame(()=>");require('fs').writeFileSync('dbg.html',h);
await p.goto('file://'+process.cwd()+'/dbg.html');await p.waitForTimeout(2500);
await p.evaluate(()=>{document.body.innerHTML='';document.body.style.background='#9ab';for(const k of['pine','broad','cedar']){const c=__pt(k,5).image;c.style.width='256px';document.body.appendChild(c);}});
await p.screenshot({path:'tt.png'});await b.close();})();
