const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader']});const p=await b.newPage({viewport:{width:900,height:600}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'||m.text().startsWith('CHK'))errs.push(m.text())});
await p.route('**/three.module.js',r=>r.fulfill({path:process.cwd()+'/node_modules/three/build/three.module.js'}));
let h=require('fs').readFileSync('floating.html','utf8').replace('requestAnimationFrame(frame);\nrequestAnimationFrame(()=>',
`ROUTES.forEach((r,i)=>{let bad=0;for(const[a,b2]of r.segs.map(s=>[s[0],s[1]]))for(let u=0;u<=1;u+=.02){const x=a[0]+(b2[0]-a[0])*u,y=a[1]+(b2[1]-a[1])*u;if(!inLake(x,y))bad++;}console.log('CHK route',i,r.path.join('>'),'land',bad,'len',Math.round(r.L));});
if(Q.get('boat')){const bs=boatState(clock());const bb=bs.find(q=>q.kind===Q.get('boat'));if(bb){B.x=bb.x+200/S*Math.cos(bb.h+1.6);B.y=bb.y+200/S*Math.sin(bb.h+1.6);camX=B.x*S;camZ=B.y*S;dist=150;yaw=Math.atan2(B.x-bb.x,B.y-bb.y);B.trail=[[B.x,B.y]];}console.log('CHK boats',bs.length);}
requestAnimationFrame(frame);\nrequestAnimationFrame(()=>`);
require('fs').writeFileSync('dbg.html',h);
await p.goto('file://'+process.cwd()+'/dbg.html'+(process.argv[2]||''));await p.waitForTimeout(6000);await p.screenshot({path:'near.png'});
await p.click('#view');await p.waitForTimeout(1200);await p.screenshot({path:'far.png'});console.log(errs.join('\n'));await b.close();})();
