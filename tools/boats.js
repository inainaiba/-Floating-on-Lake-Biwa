/* ---------- 船：定期船は共有時計で決まった航路を走る（サーバー不要） ---------- */
const nearestIn=(x,y)=>{if(inLake(x,y)&&depth(x,y)>2)return[x,y];for(let r=100;r<4000;r+=100)for(let a=0;a<6.28;a+=.3){const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;if(inLake(px,py)&&depth(px,py)>2)return[px,py];}return[x,y];};
const PORT=Object.fromEntries(Object.entries({
 imazu:[136.033,35.413],chikubu:[136.143,35.417],nagahama:[136.262,35.381],otsu:[135.866,35.012],nionohama:[135.879,35.004],
 yanagasaki:[135.871,35.022],ogoto:[135.899,35.075],ohashi:[135.932,35.104]}).map(([k,[lo,la]])=>[k,nearestIn(...ll(lo,la))]));
const WP=Object.fromEntries(Object.entries({s1:[135.90,35.035],s2:[135.925,35.075],s3:[135.945,35.11],s4:[135.985,35.15],oki:[136.055,35.19],takei:[136.205,35.285],shira:[136.02,35.27],mid:[136.12,35.32],m1:[135.885,35.04],m2:[135.905,35.03]})
 .map(([k,[lo,la]])=>[k,nearestIn(...ll(lo,la))]));
const P=k=>PORT[k]||WP[k];
// 航路：[港・経由点の列, 一日あたりの便数(往復), 速さm/s, 種類, 運航する時間帯]
const ROUTES=[
 {path:['imazu','chikubu'],trips:4,v:7,kind:'cruise',hours:[.3,.72],stop:['imazu','chikubu']},
 {path:['nagahama','chikubu'],trips:4,v:7,kind:'cruise',hours:[.31,.73],stop:['nagahama','chikubu']},
 {path:['imazu','chikubu','nagahama'],trips:1,v:7,kind:'cruise',hours:[.33,.7],stop:['imazu','chikubu','nagahama']},
 {path:['otsu','ogoto','ohashi','s4','oki','takei','chikubu','shira','s4','s3','s2','otsu'],trips:1,v:9,kind:'cruise',hours:[.3,.75],stop:['otsu','chikubu']},
 {path:['otsu','yanagasaki','m1','s2','m2','nionohama','otsu'],trips:3,v:4,kind:'michigan',hours:[.33,.88],stop:['otsu','nionohama']}];
for(const r of ROUTES){r.pts=r.path.map(P);const segs=[];let L=0;for(let i=0;i<r.pts.length-1;i++){const a=r.pts[i],b=r.pts[i+1],l=Math.hypot(b[0]-a[0],b[1]-a[1])*S;segs.push([a,b,L,l]);L+=l;}r.segs=segs;r.L=L;}
// 漁船：漁港の近くで朝早く動く
const fishPorts=LAKE.ports.length?LAKE.ports:[[0,0]];
const FISH=Array.from({length:6},(_,i)=>{const p=fishPorts[(i*5)%fishPorts.length];return{home:nearestIn(p[0],p[1]),seed:i*1.7};});

function boatState(c){const out=[];const dayT=c.phase;
 ROUTES.forEach((r,ri)=>{if(dayT<r.hours[0]||dayT>r.hours[1])return;const span=(r.hours[1]-r.hours[0])*DAY,per=span/r.trips,local=((dayT-r.hours[0])*DAY)%per;
  const travel=r.L/r.v,dwell=Math.max(0,(per-2*travel)/2);   // 往き→停泊→帰り→停泊
  let s,dir=1;if(r.path[0]===r.path[r.path.length-1]){const tt=r.L/r.v;s=Math.min(r.L,local*r.v);if(local>tt)s=r.L;}
  else if(local<travel)s=local*r.v;else if(local<travel+dwell)s=r.L;else if(local<2*travel+dwell){s=r.L-(local-travel-dwell)*r.v;dir=-1;}else s=0;
  const sg=r.segs.find(q=>s<=q[2]+q[3])||r.segs[r.segs.length-1],u=Math.min(1,Math.max(0,(s-sg[2])/sg[3])),a=sg[0],b=sg[1];
  const moving=s>0&&s<r.L;out.push({id:'r'+ri,kind:r.kind,x:a[0]+(b[0]-a[0])*u,y:a[1]+(b[1]-a[1])*u,h:Math.atan2((b[1]-a[1])*dir,(b[0]-a[0])*dir),moving,speed:moving?r.v:0});});
 if(dayT>.19&&dayT<.45)FISH.forEach((f,i)=>{const k=(dayT-.19)/.26,out_=Math.sin(Math.PI*k),a=f.seed+c.t/180,R=out_*900;
  const x=f.home[0]+Math.cos(a)*R,y=f.home[1]+Math.sin(a)*R;if(!inLake(x,y))return;out.push({id:'f'+i,kind:'fish',x,y,h:a+Math.PI/2,moving:true,speed:2.5});});
 return out;}

// 船の形
function makeBoat(kind){const g=new THREE.Group(),white=new THREE.MeshLambertMaterial({color:0xf2f2ee}),dark=new THREE.MeshLambertMaterial({color:0x2d3a48});
 if(kind==='cruise'){const hull=new THREE.Mesh(new THREE.BoxGeometry(32,3,8),white);hull.position.y=1;g.add(hull);const c1=new THREE.Mesh(new THREE.BoxGeometry(18,3,6.5),white);c1.position.set(-2,4,0);g.add(c1);
  const band=new THREE.Mesh(new THREE.BoxGeometry(32.2,.8,8.2),dark);band.position.y=.2;g.add(band);const win=new THREE.Mesh(new THREE.BoxGeometry(18.1,1,6.6),new THREE.MeshLambertMaterial({color:0x223040}));win.position.set(-2,4.4,0);g.add(win);}
 else if(kind==='michigan'){const hull=new THREE.Mesh(new THREE.BoxGeometry(60,3,12),white);hull.position.y=1;g.add(hull);
  for(let i=0;i<3;i++){const d=new THREE.Mesh(new THREE.BoxGeometry(46-i*10,2.8,11-i),white);d.position.set(2,4+i*2.8,0);g.add(d);}
  const wheel=new THREE.Mesh(new THREE.CylinderGeometry(4.5,4.5,10,16,1,true),new THREE.MeshLambertMaterial({color:0xb03a2e,side:THREE.DoubleSide}));wheel.rotation.x=Math.PI/2;wheel.position.set(-32,3.5,0);g.add(wheel);g.wheel=wheel;
  const st=new THREE.Mesh(new THREE.CylinderGeometry(.8,.8,6),dark);st.position.set(10,13,0);g.add(st);}
 else{const hull=new THREE.Mesh(new THREE.BoxGeometry(8,1.2,2.6),new THREE.MeshLambertMaterial({color:0xdedad0}));hull.position.y=.4;g.add(hull);const cab=new THREE.Mesh(new THREE.BoxGeometry(2,1.6,1.8),white);cab.position.set(-1.5,1.6,0);g.add(cab);}
 const lamp=new THREE.PointLight(0xfff0d0,0,kind==='fish'?30:80,1.5);lamp.position.y=kind==='fish'?3:9;g.add(lamp);g.lamp=lamp;
 const bulbs=new THREE.Mesh(new THREE.SphereGeometry(kind==='fish'?.25:.5,6,4),new THREE.MeshBasicMaterial({color:0xffe2a8}));bulbs.position.y=lamp.position.y;g.add(bulbs);g.bulbs=bulbs;
 return g;}
const boatMeshes=new Map();
// 航跡：白い泡の点を落として薄れさせる
const WAKE_N=1500,wake=new THREE.InstancedMesh(new THREE.CircleGeometry(1,10).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.35,depthWrite:false}),WAKE_N);
wake.instanceMatrix.setUsage(THREE.DynamicDrawUsage);const wakeP=[];let wakeI=0;scene.add(wake);wake.frustumCulled=false;
const avoid=new Map();  // 自分の画面だけでの避ける量
let wakeBob=0;
function updateBoats(boats,dt,t,night){const hx=B.x*S,hz=B.y*S;const seen=new Set();wakeBob*=Math.exp(-dt*.6);
 for(const b of boats){seen.add(b.id);let m=boatMeshes.get(b.id);if(!m){m=makeBoat(b.kind);boatMeshes.set(b.id,m);scene.add(m);}
  let x=b.x*S,z=b.y*S;
  // 建物を避ける：近いときだけ横にずれる（他の人の画面では本来の航路のまま）
  const dx=x-hx,dz=z-hz,d=Math.hypot(dx,dz),need=b.kind==='michigan'?90:b.kind==='cruise'?70:35;let av=avoid.get(b.id)||0;
  const nx=-Math.sin(b.h),nz=Math.cos(b.h),side=Math.sign(dx*nx+dz*nz)||1;av+=((d<need*2?side*(need*2-d):0)-av)*Math.min(1,dt*.8);avoid.set(b.id,av);
  x+=nx*av;z+=nz*av;
  const hy=waveH(x,z,t);m.position.set(x,hy*.5,z);m.rotation.set(0,-b.h,0);
  if(m.wheel)m.wheel.rotation.y+=dt*(b.moving?2:0);
  m.lamp.intensity=night?3:0;m.bulbs.visible=night;
  if(b.moving&&Math.random()<dt*(b.kind==='fish'?6:14)){const sx=x-Math.cos(b.h)*(b.kind==='michigan'?34:b.kind==='cruise'?17:5),sz=z-Math.sin(b.h)*(b.kind==='michigan'?34:17);
   for(const s of[-1,1])wakeP[wakeI++%WAKE_N]={x:sx+nx*s*(b.kind==='fish'?1:3),z:sz+nz*s*(b.kind==='fish'?1:3),vx:nx*s*1.2,vz:nz*s*1.2,born:t,big:b.kind!=='fish'};}
  // 航跡の波が建物に届くと揺れる
  if(b.moving&&d<400)wakeBob=Math.max(wakeBob,(b.kind==='fish'?.25:.7)*(1-d/400));}
 for(const[id,m]of boatMeshes)if(!seen.has(id)){scene.remove(m);boatMeshes.delete(id);}
 const M=new THREE.Matrix4();let n=0;for(const w of wakeP){if(!w)continue;const age=t-w.born;if(age>25)continue;const s=(w.big?2:1)+age*.5,f=1-age/25;
  M.makeScale(s*f+.01,1,s*f+.01);M.setPosition(w.x+w.vx*age,.35,w.z+w.vz*age);wake.setMatrixAt(n++,M);}wake.count=n;wake.instanceMatrix.needsUpdate=true;}
