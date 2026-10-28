const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader']});const p=await b.newPage();
await p.route('**/three.module.js',r=>r.fulfill({path:process.cwd()+'/node_modules/three/build/three.module.js'}));
let h=require('fs').readFileSync('floating.html','utf8').replace("requestAnimationFrame(frame);\nrequestAnimationFrame(()=>","window.__st=starts;window.__by=bridgeY;\nrequestAnimationFrame(frame);\nrequestAnimationFrame(()=>");require('fs').writeFileSync('dbg.html',h);
await p.goto('file://'+process.cwd()+'/dbg.html');await p.waitForTimeout(2500);
console.log(await p.evaluate(()=>{const ys=__st.map(s=>s[1]);const mn=Math.min(...ys),mx=Math.max(...ys);const bins=[0,0,0,0,0];for(const y of ys)bins[Math.min(4,Math.floor((y-mn)/(mx-mn)*5))]++;return 'N→S bins '+bins.join(',')+' count '+ys.length;}));await b.close();})();
