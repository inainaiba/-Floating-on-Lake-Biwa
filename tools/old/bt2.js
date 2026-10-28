const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader']});const p=await b.newPage();
await p.route('**/three.module.js',r=>r.fulfill({path:process.cwd()+'/node_modules/three/build/three.module.js'}));
await p.goto('file://'+process.cwd()+'/dbg.html');await p.waitForTimeout(3000);
const r=await p.evaluate(()=>{const prev={};let mj=0,w=null;for(let k=0;k<20000;k++){const ph=.28+k/20000*.62;for(const b of __bs({t:ph*1416,month:5,phase:ph})){if(b.kind==='fish')continue;const q=prev[b.id];if(q){const d=Math.hypot(q.x-b.x,q.y-b.y);if(d>mj){mj=d;w=[b.id,ph]}}prev[b.id]=b;}}return[mj,w];});
console.log('max step m',Math.round(r[0]),JSON.stringify(r[1]));await b.close();})();
