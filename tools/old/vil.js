/* ---------- 湖岸集落：黒い瓦屋根の家並み、岸沿いの道、背後の田んぼ、港の防波堤（位置は概略。家は実物大、集落の広がりは縮尺どおり） ---------- */
const VILLAGES=[[136.075,35.342],[136.030,35.410],[136.075,35.478],[136.060,35.458],[136.130,35.500],[136.165,35.470],[136.170,35.518],[136.222,35.462],[136.210,35.432],
 [136.262,35.380],[136.275,35.330],[136.245,35.280],[136.205,35.228],[136.170,35.180],[136.065,35.200],[136.060,35.160],[136.010,35.110],[135.970,35.090],[135.942,35.060],
 [135.875,35.010],[135.872,35.065],[135.897,35.090],[135.920,35.115],[135.935,35.165],[135.960,35.230],[136.005,35.265],[136.060,35.310]];
function terrainAt(x,y){const i=(x-tx0)/tdx,j=(y-ty0)/tdy,i0=Math.floor(i),j0=Math.floor(j);if(i0<0||j0<0||i0>=TW-1||j0>=TH-1)return 0;const u=i-i0,v=j-j0,g=(a,b)=>Math.max(0,terrH[b*TW+a]);
 return g(i0,j0)*(1-u)*(1-v)+g(i0+1,j0)*u*(1-v)+g(i0,j0+1)*(1-u)*v+g(i0+1,j0+1)*u*v;}
const isLand=(x,y)=>!inLake(x,y);
const houses=[],paddies=[],roads=[],breaks=[];
{const R=rnd(314);for(const[lo,la]of VILLAGES){const[vx,vy]=ll(lo,la);
 // 岸の一番近い点と、陸へ向かう向き
 let best=null,bd=1e12;for(const poly of[outer,...islands])for(let i=0;i<poly.length-1;i++){const p=poly[i],d=(p[0]-vx)**2+(p[1]-vy)**2;if(d<bd){bd=d;best=[poly,i];}}
 const[poly,i0]=best;const n=60+Math.floor(R()*50);
 for(let k=0;k<n*3&&houses.length<4000;k++){const i=(i0+Math.floor((R()-.5)*Math.min(26,poly.length/3))+poly.length*4)%(poly.length-1),a=poly[i],b=poly[i+1],L=Math.hypot(b[0]-a[0],b[1]-a[1])||1,u=R();
  let nx=-(b[1]-a[1])/L,ny=(b[0]-a[0])/L;const px=a[0]+(b[0]-a[0])*u,py=a[1]+(b[1]-a[1])*u;if(!isLand(px+nx*80,py+ny*80)){nx=-nx;ny=-ny;}
  const back=60+Math.pow(R(),1.4)*420,x=px+nx*back,y=py+ny*back;if(!isLand(x,y)||inInner(x,y))continue;const th=terrainAt(x,y);if(th>60)continue;
  if(houses.some(h=>Math.hypot(h.x-x,h.y-y)<95))continue;   // 家どうしの間隔（実寸で約95m＝作品内で約9.5m）
  houses.push({x,y,rot:Math.atan2(b[1]-a[1],b[0]-a[0])+(R()<.75?0:Math.PI/2)+(R()-.5)*.15,w:7+R()*5,d:6+R()*4,h:3+(R()<.3?2.8:0)+R()*.6,roof:R(),ground:th});}
 // 岸沿いの道
 for(let k=-8;k<8;k++){const i=(i0+k+poly.length*4)%(poly.length-1),a=poly[i],b=poly[i+1],L=Math.hypot(b[0]-a[0],b[1]-a[1])||1;let nx=-(b[1]-a[1])/L,ny=(b[0]-a[0])/L;if(!isLand(a[0]+nx*80,a[1]+ny*80)){nx=-nx;ny=-ny;}roads.push([a[0]+nx*35,a[1]+ny*35,b[0]+nx*35,b[1]+ny*35]);}
 // 背後の田んぼ
 {const a=poly[i0],b=poly[(i0+1)%(poly.length-1)],L=Math.hypot(b[0]-a[0],b[1]-a[1])||1;let nx=-(b[1]-a[1])/L,ny=(b[0]-a[0])/L,tx=(b[0]-a[0])/L,ty=(b[1]-a[1])/L;if(!isLand(a[0]+nx*80,a[1]+ny*80)){nx=-nx;ny=-ny;}
  for(let r=0;r<4;r++)for(let c=-5;c<=5;c++){const x=a[0]+nx*(560+r*170)+tx*c*190,y=a[1]+ny*(560+r*170)+ty*c*190;if(isLand(x,y)&&!inInner(x,y)&&terrainAt(x,y)<25&&!houses.some(h=>Math.hypot(h.x-x,h.y-y)<120))paddies.push({x,y,rot:Math.atan2(ty,tx),v:R()});}}}
 // 港の防波堤
 for(const p of Object.values(PORT)){let a=0,bd2=1e12;for(let t=0;t<6.28;t+=.2){const d=depth(p[0]+Math.cos(t)*300,p[1]+Math.sin(t)*300);if(d>0&&d<bd2){}if(inLake(p[0]+Math.cos(t)*300,p[1]+Math.sin(t)*300)&&depth(p[0]+Math.cos(t)*300,p[1]+Math.sin(t)*300)>(breaks.a||0)){a=t;}}breaks.push({x:p[0]+Math.cos(a)*120,y:p[1]+Math.sin(a)*120,rot:a+Math.PI/2});}}
const ROOF_COLS=[0x2f3237,0x3a3d42,0x45474b,0x2a2c30,0x4d5e6e,0x7a3b32,0x5b6670,0x6e5a46];
const wallG=new THREE.BoxGeometry(1,1,1).translate(0,.5,0);
const roofShape=new THREE.Shape([new THREE.Vector2(-.6,0),new THREE.Vector2(.6,0),new THREE.Vector2(0,.45)]);
const roofG=new THREE.ExtrudeGeometry(roofShape,{depth:1.1,bevelEnabled:false}).translate(0,0,-.55);
const wallM=new THREE.MeshLambertMaterial({color:0xffffff}),roofM=new THREE.MeshLambertMaterial({color:0xffffff});
const walls=new THREE.InstancedMesh(wallG,wallM,houses.length),roofs=new THREE.InstancedMesh(roofG,roofM,houses.length);
{const M=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),c=new THREE.Color();houses.forEach((h,i)=>{const gy=.6+h.ground*S*VEX;q.setFromEuler(e.set(0,-h.rot,0));
 M.compose(new THREE.Vector3(h.x*S,gy,h.y*S),q,new THREE.Vector3(h.w,h.h,h.d));walls.setMatrixAt(i,M);walls.setColorAt(i,c.set(h.roof<.15?0xd9d4c8:h.roof<.5?0xbfb6a6:0x8a7f70));
 M.compose(new THREE.Vector3(h.x*S,gy+h.h,h.y*S),q,new THREE.Vector3(h.d,h.w*.75,h.w));
 // 屋根は棟を長手方向に。ExtrudeはZ方向に伸びるので、幅dで回転を合わせる
 const q2=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,-h.rot+Math.PI/2,0));M.compose(new THREE.Vector3(h.x*S,gy+h.h,h.y*S),q2,new THREE.Vector3(h.d*1.05,h.d*.9,h.w*1.05));
 roofs.setMatrixAt(i,M);roofs.setColorAt(i,c.set(h.roof<.82?ROOF_COLS[Math.floor(h.roof*5)]:ROOF_COLS[5+Math.floor((h.roof-.82)/.06)%3]));});}
scene.add(walls,roofs);
// 夜の窓の灯り
const winGeo=new THREE.BufferGeometry(),wp=[];for(const h of houses)if(((h.x*7+h.y*3)%10+10)%10<6)wp.push(h.x*S+Math.cos(h.rot)*1.5,.6+h.ground*S*VEX+1.6,h.y*S+Math.sin(h.rot)*1.5);
winGeo.setAttribute('position',new THREE.Float32BufferAttribute(wp,3));const windows=new THREE.Points(winGeo,new THREE.PointsMaterial({color:0xffd59a,size:1.6,sizeAttenuation:true,transparent:true,opacity:.9}));scene.add(windows);
// 岸沿いの道
{const pos=[];for(const[x1,y1,x2,y2]of roads){const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy)||1,nx=-dy/L*35,ny=dx/L*35;pos.push(x1+nx,y1+ny,x2+nx,y2+ny,x2-nx,y2-ny,x1+nx,y1+ny,x2-nx,y2-ny,x1-nx,y1-ny);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos.flatMap((v,i)=>i%2?[]:[pos[i]*S,.64,pos[i+1]*S]),3));g.computeVertexNormals();
 scene.add(new THREE.Mesh(g,new THREE.MeshLambertMaterial({color:0x7c7a74,side:THREE.DoubleSide})));}
// 田んぼ（季節で色が変わる。春は水が張られて空を映す）
const paddyM=new THREE.MeshLambertMaterial({color:0xffffff});const paddyI=new THREE.InstancedMesh(new THREE.PlaneGeometry(16,9).rotateX(-Math.PI/2),paddyM,paddies.length);
{const M=new THREE.Matrix4(),q=new THREE.Quaternion();paddies.forEach((p,i)=>{q.setFromEuler(new THREE.Euler(0,-p.rot,0));M.compose(new THREE.Vector3(p.x*S,.63+terrainAt(p.x,p.y)*S*VEX,p.y*S),q,new THREE.Vector3(1,1,1));paddyI.setMatrixAt(i,M);});}
scene.add(paddyI);
const PADDY=[0x7a6a52,0x7a6a52,0x7d6c50,0x8a9aa8,0x8fa6b2,0x6f9a3e,0x5e8a34,0x6f8f3a,0xbfa24e,0x9a8456,0x7a6a52,0x7a6a52];
function paddySeason(m,sky){const c=new THREE.Color(PADDY[m]);if(m===3||m===4)c.lerp(sky,.5);for(let i=0;i<paddies.length;i++){const k=paddies[i].v;paddyI.setColorAt(i,c.clone().multiplyScalar(.85+k*.3));}paddyI.instanceColor.needsUpdate=true;}
// 防波堤
const brk=new THREE.InstancedMesh(new THREE.BoxGeometry(22,1.6,2.2),new THREE.MeshLambertMaterial({color:0x9a988f}),breaks.length);
{const M=new THREE.Matrix4();breaks.forEach((b,i)=>{M.compose(new THREE.Vector3(b.x*S,.4,b.y*S),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,-b.rot,0)),new THREE.Vector3(1,1,1));brk.setMatrixAt(i,M);});}scene.add(brk);
