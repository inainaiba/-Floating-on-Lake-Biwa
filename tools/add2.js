// 湖西線の高架（西岸の集落の背後を走る）
{const L=[[135.905,35.075],[135.925,35.12],[135.95,35.16],[135.975,35.21],[135.99,35.25],[136.015,35.29],[136.04,35.33],[136.06,35.37],[136.04,35.42],[136.07,35.47]].map(p=>ll(...p));
 const deck=[],piers=[];for(let i=0;i<L.length-1;i++){const[a,b]=[L[i],L[i+1]],len=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let s=0;s<len;s+=250){const u=s/len;let x=a[0]+(b[0]-a[0])*u,y=a[1]+(b[1]-a[1])*u;
  if(inLake(x,y))continue;const h=terrainAt(x,y);deck.push([x,y,Math.atan2(b[1]-a[1],b[0]-a[0]),h]);}}
 const D=new THREE.InstancedMesh(new THREE.BoxGeometry(25.5,1.2,5),new THREE.MeshLambertMaterial({color:0xc8c8c2}),deck.length),Pm=new THREE.InstancedMesh(new THREE.BoxGeometry(1.4,1,2.6).translate(0,.5,0),new THREE.MeshLambertMaterial({color:0xb0b0aa}),deck.length);
 const M=new THREE.Matrix4();deck.forEach(([x,y,r,h],i)=>{const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,-r,0)),gy=.6+h*S*VEX;M.compose(new THREE.Vector3(x*S,gy+9,y*S),q,new THREE.Vector3(1,1,1));D.setMatrixAt(i,M);M.compose(new THREE.Vector3(x*S,gy,y*S),q,new THREE.Vector3(1,9,1));Pm.setMatrixAt(i,M);});scene.add(D,Pm);}
// 岸の松並木と砂浜
{const tr=[],sand=[];const R=rnd(55);for(let i=0;i<outer.length-1;i++){const a=outer[i],b=outer[i+1],L=Math.hypot(b[0]-a[0],b[1]-a[1])||1;let nx=-(b[1]-a[1])/L,ny=(b[0]-a[0])/L;if(inLake(a[0]+nx*60,a[1]+ny*60)){nx=-nx;ny=-ny;}
  for(let s=0;s<L;s+=90){const x=a[0]+(b[0]-a[0])*s/L,y=a[1]+(b[1]-a[1])*s/L;if(inReeds(x,y))continue;if(R()<.5)sand.push([x+nx*12,y+ny*12,Math.atan2(b[1]-a[1],b[0]-a[0])]);if(R()<.35)tr.push([x+nx*(30+R()*25),y+ny*(30+R()*25),.7+R()*.6]);}}
 const T=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(3,0).translate(0,6,0),new THREE.MeshLambertMaterial({color:0x34502e,flatShading:true}),tr.length),M=new THREE.Matrix4();
 tr.forEach(([x,y,s],i)=>{M.compose(new THREE.Vector3(x*S,.6+terrainAt(x,y)*S*VEX,y*S),new THREE.Quaternion(),new THREE.Vector3(s*1.2,s,s*1.2));T.setMatrixAt(i,M);});scene.add(T);
 const Sd=new THREE.InstancedMesh(new THREE.PlaneGeometry(9.5,3).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({color:0xcfc2a2}),sand.length);sand.forEach(([x,y,r],i)=>{M.compose(new THREE.Vector3(x*S,.62,y*S),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,-r,0)),new THREE.Vector3(1,1,1));Sd.setMatrixAt(i,M);});scene.add(Sd);}
// 浮御堂（堅田）：湖に張り出した宝形造の小堂と橋
{const[x,y]=ll(135.917,35.115),g=new THREE.Group(),dk=new THREE.MeshLambertMaterial({color:0x5a5650}),wd=new THREE.MeshLambertMaterial({color:0x7a5a3a});
 for(const[px,pz]of[[-2.5,-2.5],[2.5,-2.5],[-2.5,2.5],[2.5,2.5]]){const p=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,3),wd);p.position.set(px,1,pz);g.add(p);}
 const fl=new THREE.Mesh(new THREE.BoxGeometry(6.5,.4,6.5),wd);fl.position.y=2.4;g.add(fl);const w=new THREE.Mesh(new THREE.BoxGeometry(4.5,2.4,4.5),wd);w.position.y=3.8;g.add(w);
 const r=new THREE.Mesh(new THREE.ConeGeometry(5.6,3,4).rotateY(Math.PI/4),dk);r.position.y=6.5;g.add(r);const br=new THREE.Mesh(new THREE.BoxGeometry(1.6,.3,14),wd);br.position.set(0,2.2,10);g.add(br);
 let ang=0,bd=-1;for(let t=0;t<6.28;t+=.3){const d=depth(x+Math.cos(t)*200,y+Math.sin(t)*200);if(d>bd){bd=d;ang=t;}}g.position.set((x+Math.cos(ang)*30)*S,0,(y+Math.sin(ang)*30)*S);g.rotation.y=-ang-Math.PI/2;scene.add(g);}
