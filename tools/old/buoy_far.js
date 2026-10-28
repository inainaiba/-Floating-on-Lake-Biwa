const {chromium}=require('playwright');(async()=>{const b=await chromium.launch({args:['--use-gl=swiftshader']});const ctx=await b.newContext({viewport:{width:500,height:800}});const p=await ctx.newPage();
p.on('pageerror',e=>console.log('ERR',e.message));await ctx.route('**/three.module.js',r=>r.fulfill({path:process.cwd()+'/node_modules/three/build/three.module.js'}));await ctx.route('https://youtu.be/**',r=>r.fulfill({body:'yt'}));
await p.goto('file://'+process.cwd()+'/dbg.html?wx=0&b=2&phase=0.42&month=5');await p.waitForTimeout(1500);
await p.evaluate(()=>document.getElementById('title').click());await p.waitForTimeout(500);await p.evaluate(()=>document.getElementById('go').click());
await p.evaluate(()=>__set(136.0544545,35.4471669,300,0,1.57,0.2,60));await p.waitForTimeout(3000);
console.log(await p.evaluate(()=>{const g=__buoys.items[0].g.position;return [g.x,g.z,innerWidth,__buoys.sp(0)]}));let xy=await p.evaluate(()=>__buoys.sp(0));let pr=ctx.waitForEvent('page',{timeout:8000}).then(pg=>pg.url()).catch(()=>'none');await p.mouse.click(xy[0],xy[1]);console.log('near(60m world):',await pr);
await p.evaluate(()=>__set(136.0544545,35.4471669,1500,0,1.57,0.2,60));await p.waitForTimeout(3000);
xy=await p.evaluate(()=>__buoys.sp(0));pr=ctx.waitForEvent('page',{timeout:8000}).then(pg=>pg.url()).catch(()=>'none');await p.mouse.click(xy[0],xy[1]);console.log('far(300m world):',await pr);
await p.evaluate(()=>document.getElementById('view').click());await p.waitForTimeout(3000);await p.screenshot({path:'farmap.png'});await b.close();})();
