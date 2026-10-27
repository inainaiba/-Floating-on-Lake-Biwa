const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader']});const p=await b.newPage({viewport:{width:800,height:500}});
const errs=[];p.on('pageerror',e=>{errs.push(e.message);console.log('ERR',e.message)});await p.route('**/three.module.js',r=>r.fulfill({path:process.cwd()+'/node_modules/three/build/three.module.js'}));
let h=require('fs').readFileSync('floating.html','utf8').replace("requestAnimationFrame(frame);\nrequestAnimationFrame(()=>","window.__setH=(k,yw,pt,ds)=>{const h=houses[k];B.x=h.x+Math.cos(h.rot+1.57)*0;B.y=h.y;camX=h.x*S;camZ=h.y*S;window.__lock=[h.x*S,h.y*S];yaw=yawT=yw;pitch=pt;dist=distT=ds;STATE='lake';};window.__set=(lo,la,dx,dy,yw,pt,ds)=>{window.__lock=null;const[x,y]=ll(lo,la);B.x=x+dx;B.y=y+dy;B.vx=B.vy=0;camX=B.x*S;camZ=B.y*S;yaw=yawT=yw;pitch=pt;dist=distT=ds;};\nrequestAnimationFrame(frame);\nrequestAnimationFrame(()=>");require('fs').writeFileSync('dbg.html',h);
await p.goto('file://'+process.cwd()+'/dbg.html?wx=0&b=2&phase=0.9&month=7&fw=1');await p.waitForTimeout(1500);
await p.evaluate(()=>document.getElementById('title').click());await p.waitForTimeout(500);await p.evaluate(()=>document.getElementById('go').click());
const V=JSON.parse(process.argv[2]);await p.evaluate(v=>__set(...v),V);
for(let i=0;i<4;i++){await p.evaluate(()=>{for(let k=0;k<30;k++)__FW.update(.05,{month:7,phase:.86},0);});await p.waitForTimeout(400);await p.screenshot({path:'f'+i+'.png'});}
await b.close();})();
