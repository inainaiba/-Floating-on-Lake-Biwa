const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader']});const p=await b.newPage({viewport:{width:800,height:500}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.route('**/three.module.js',r=>r.fulfill({path:process.cwd()+'/node_modules/three/build/three.module.js'}));
let h=require('fs').readFileSync('floating.html','utf8').replace("requestAnimationFrame(frame);\nrequestAnimationFrame(()=>","window.__B=B;window.__tr=waterU.uTr.value;window.__mk=()=>{const a=0;B.yaw=a;B.vx=.4;B.vy=0;const tr=waterU.uTr.value;for(let i=0;i<tr.length;i++){const age=i*.3;tr[i].set(B.x*S-Math.cos(a)*(6+age*2.2),B.y*S-Math.sin(a)*(6+age*2.2),age,1);}yaw=yawT=1.2;pitch=.55;dist=distT=70;};{const[x,y]=ll(136.06,35.26);B.x=x;B.y=y;}\nrequestAnimationFrame(frame);\nrequestAnimationFrame(()=>");require('fs').writeFileSync('dbg.html',h);
await p.goto('file://'+process.cwd()+'/dbg.html?phase=0.45&wx=0&b=7');await p.waitForTimeout(1500);await p.evaluate(()=>document.getElementById('title').click());await p.waitForTimeout(500);await p.evaluate(()=>document.getElementById('go').click());await p.waitForTimeout(1000);
// synthesize trail: building moving +x for 12s
await p.evaluate(()=>__mk());
await p.waitForTimeout(200);await p.screenshot({path:'wk.png',timeout:90000});console.log(errs.join('\n')||'ok');await b.close();})();
