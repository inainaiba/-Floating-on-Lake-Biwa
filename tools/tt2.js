const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader']});const p=await b.newPage();
await p.route('**/three.module.js',r=>r.fulfill({path:process.cwd()+'/node_modules/three/build/three.module.js'}));
let h=require('fs').readFileSync('floating.html','utf8').replace("requestAnimationFrame(frame);\nrequestAnimationFrame(()=>","window.__F=window.__forest;window.THREE=THREE;\nrequestAnimationFrame(frame);\nrequestAnimationFrame(()=>");require('fs').writeFileSync('dbg.html',h);
await p.goto('file://'+process.cwd()+'/dbg.html');await p.waitForTimeout(2500);
console.log(await p.evaluate(()=>{const I=__F.find(i=>i.userData.kind==='cedar'&&i.count>500);const m=new THREE.Matrix4(),v=new THREE.Vector3();let o=[];for(let i=0;i<5;i++){I.getMatrixAt(i*100,m);v.setFromMatrixPosition(m);o.push(v.toArray().map(a=>a.toFixed(1)).join(','));}return o.join(' | ');}));await b.close();})();
