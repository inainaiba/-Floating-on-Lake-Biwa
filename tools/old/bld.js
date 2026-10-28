/* ---------- 建物：10種類（水土空間 note「水上建築」の浮遊型を抽象化） ---------- */
const MAT={
 body:()=>new THREE.MeshStandardMaterial({color:0xe9e4d8,roughness:.85}),
 wood:()=>new THREE.MeshStandardMaterial({color:0x7a5a3a,roughness:.9}),
 dark:()=>new THREE.MeshStandardMaterial({color:0x34343a,roughness:.8}),
 glass:()=>new THREE.MeshStandardMaterial({color:0x2a3440,roughness:.3,emissive:0x000000})};
function gable(L,W,H,m){const s=new THREE.Shape([new THREE.Vector2(-W/2,0),new THREE.Vector2(W/2,0),new THREE.Vector2(0,H)]);
 const g=new THREE.ExtrudeGeometry(s,{depth:L,bevelEnabled:false}).translate(0,0,-L/2).rotateY(Math.PI/2);return new THREE.Mesh(g,m);}
const box=(w,h,d,m,x=0,y=0,z=0)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);return o;};
function hullShape(L,W,H,m,bow=.25){const s=new THREE.Shape();s.moveTo(-L/2,0);s.lineTo(L/2-L*bow*.4,0);s.quadraticCurveTo(L/2,0,L/2,H);s.lineTo(-L/2,H);s.closePath();
 const g=new THREE.ExtrudeGeometry(s,{depth:W,bevelEnabled:false}).translate(0,-H*.35,-W/2);return new THREE.Mesh(g,m);}
// 漂い方のパラメータ：draft喫水(流れに乗る) wind受風 align縦横比(向きを揃える速さ) rock揺れやすさ rudder舵 mass重さ reeds=ヨシ帯に入れる
const BUILDINGS=[
 {name:'方舟',line:'ノアの箱舟',p:{draft:.9,wind:.9,align:.5,rock:.5,rudder:.6,mass:1},make(m){const g=new THREE.Group();g.add(hullShape(30,8,4,m.wood,.15));g.add(box(24,4,7,m.body,0,3.6));const r=gable(25,8,3.2,m.roof);r.position.y=5.6;g.add(r);
   for(let i=-5;i<=5;i++){g.add(box(.6,1.2,7.05,m.glass,i*2,4));}return g;},L:30},
 {name:'浮かぶ避難所',line:'アジール・フロッタン',p:{draft:.7,wind:.7,align:.8,rock:.35,rudder:.4,mass:1},make(m){const g=new THREE.Group();g.add(box(70,2.4,9,m.dark,0,.4));g.add(box(62,3.4,8,m.body,0,3.3));
   g.add(box(62.1,1,8.05,m.glass,0,3.5));for(let i=-15;i<=15;i++)g.add(box(.12,1,.12,m.dark,i*2,5.5,3.9));for(let i=-15;i<=15;i++)g.add(box(.12,1,.12,m.dark,i*2,5.5,-3.9));
   g.add(box(62,.12,.12,m.dark,0,6,3.9));g.add(box(62,.12,.12,m.dark,0,6,-3.9));return g;},L:70},
 {name:'田舟',line:'近江八幡の水郷の田舟',p:{draft:.3,wind:.5,align:1,rock:1.3,rudder:1.2,mass:.2,reeds:true},make(m){const g=new THREE.Group();g.add(hullShape(11,1.6,.7,m.wood,.5));
   for(let i=-2;i<=2;i++){const a=new THREE.Mesh(new THREE.TorusGeometry(.85,.04,4,12,Math.PI),m.dark);a.position.set(i*.9,.4,0);a.rotation.y=Math.PI/2;g.add(a);}
   const c=new THREE.Mesh(new THREE.CylinderGeometry(.88,.88,4,12,1,true,0,Math.PI),m.body);c.rotation.z=Math.PI/2;c.rotation.x=-Math.PI/2;c.position.y=.4;g.add(c);return g;},L:11},
 {name:'客船',line:'ガンツウ／海の上のピアニスト',p:{draft:.8,wind:.8,align:.9,rock:.3,rudder:.5,mass:1},make(m){const g=new THREE.Group();g.add(hullShape(50,9,3,m.body,.2));g.add(box(40,1,8.9,m.glass,-2,1.6));
   g.add(box(34,2.6,7.5,m.body,-4,3.6));g.add(box(34.1,.8,7.6,m.glass,-4,3.8));g.add(box(20,2.2,6,m.body,-6,6));g.add(box(8,1.6,4,m.roof,-6,7.9));return g;},L:50},
 {name:'劇場',line:'世界劇場',p:{draft:.6,wind:1.2,align:.2,rock:.6,rudder:.4,mass:.8},make(m){const g=new THREE.Group();g.add(box(22,1.8,22,m.dark,0,.2));g.add(box(10,13,10,m.body,0,7.6));
   for(let i=0;i<4;i++)g.add(box(10.1,.3,10.1,m.wood,0,3+i*3));const o=new THREE.Mesh(new THREE.CylinderGeometry(4.2,4.2,4,8),m.body);o.position.y=16;g.add(o);
   const r=new THREE.Mesh(new THREE.ConeGeometry(4.6,3.2,8),m.roof);r.position.y=19.6;g.add(r);const b=new THREE.Mesh(new THREE.SphereGeometry(.5,8,6),m.roof);b.position.y=21.6;g.add(b);return g;},L:22},
 {name:'泡',line:'Rotterdam Floating Pavilion',p:{draft:.5,wind:1,align:0,rock:.5,rudder:.5,mass:.7},make(m){const g=new THREE.Group();g.add(new THREE.Mesh(new THREE.CylinderGeometry(15,15,1.4,40),m.dark));
   [[0,-5,7],[ -5,5,6],[6,4,5]].forEach(([x,z,r])=>{const d=new THREE.Mesh(new THREE.SphereGeometry(r,28,14,0,Math.PI*2,0,Math.PI/2),m.body);d.position.set(x,.7,z);g.add(d);});return g;},L:30},
 {name:'帆の舟',line:'土佐日記の船旅',p:{draft:.5,wind:1.6,align:1,rock:1,rudder:.9,mass:.3},make(m){const g=new THREE.Group();g.add(hullShape(14,3,1.6,m.wood,.35));g.add(box(3.5,1.8,2.4,m.body,-4,1.8));
   g.add(box(.25,12,.25,m.wood,1,6.6));const sail=new THREE.Mesh(new THREE.PlaneGeometry(.2,1).scale(1,1,1),m.body);sail.geometry=new THREE.BoxGeometry(.08,8,7);sail.position.set(1.2,7.5,0);g.add(sail);
   g.add(box(.18,.18,7.6,m.wood,1.2,11.6));g.add(box(.18,.18,7.6,m.wood,1.2,3.5));return g;},L:14},
 {name:'家船',line:'家船／アースキンの船上設計事務所',p:{draft:.5,wind:.8,align:.8,rock:.9,rudder:.9,mass:.35},make(m){const g=new THREE.Group();g.add(hullShape(9,3,1.1,m.wood,.35));
   g.add(box(4,2.2,2.6,m.body,-1,1.8));const r=gable(4.6,3.2,1.4,m.roof);r.position.set(-1,2.9,0);g.add(r);g.add(box(1,.8,2.65,m.glass,-1,2));return g;},L:9},
 {name:'庵',line:'春夏秋冬そして春',p:{draft:.4,wind:.8,align:.4,rock:.8,rudder:.7,mass:.4},make(m){const g=new THREE.Group();g.add(box(12,.8,8,m.wood,0,.2));g.add(box(5.5,3.4,4.5,m.body,-1.2,2.3));
   const r=gable(6.6,6,2.3,m.roof);r.position.set(-1.2,4,0);g.add(r);g.add(box(3.6,.2,4.5,m.wood,3.2,.7));return g;},L:12},
 {name:'筏',line:'Floating Bamboo House',p:{draft:.3,wind:.6,align:.1,rock:.9,rudder:.8,mass:.3},make(m){const g=new THREE.Group();
   for(let i=-6;i<=6;i++){const c=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,13,6),m.wood);c.rotation.z=Math.PI/2;c.position.set(0,.2,i*1);g.add(c);const d=c.clone();d.rotation.set(Math.PI/2,0,0);d.position.set(i*1,.6,0);g.add(d);}
   g.add(box(6,2.2,5,m.body,0,1.9));const r=gable(7,6.4,1.3,m.roof);r.position.y=3;g.add(r);return g;},L:13}];
// カスタマイズ（色・灯り・素材感）。通信で送るのは番号と設定値だけ
const BODY_COLORS=[0xe9e4d8,0x8c3b2f,0x2f4a5a,0x6f7f4e,0xc9a65a,0x2a2a2a];
const LIGHT_COLORS=[0xffd9a0,0xfff4e0,0xa8d0ff,0xff9a7a];
const CUST={b:0,body:0,light:0,bright:.7,mat:0};
const house=new THREE.Group();scene.add(house);
house.lamp=new THREE.Mesh(new THREE.SphereGeometry(.3,8,6),new THREE.MeshBasicMaterial({color:0xffd9a0}));
house.light=new THREE.PointLight(0xffc98a,0,60,1.6);
let P=BUILDINGS[0].p,glassMats=[];
function buildHouse(){while(house.children.length)house.remove(house.children[0]);const Bd=BUILDINGS[CUST.b];P=Bd.p;
 const body=CUST.mat===0?new THREE.MeshStandardMaterial({color:BODY_COLORS[CUST.body],roughness:.9}):CUST.mat===1?new THREE.MeshStandardMaterial({color:BODY_COLORS[CUST.body],roughness:.5,metalness:0})
  :new THREE.MeshStandardMaterial({color:BODY_COLORS[CUST.body],roughness:.2,transparent:true,opacity:.55});
 if(CUST.mat===0)body.color.multiply(new THREE.Color(0xc8b8a0));
 const m={body,wood:MAT.wood(),roof:MAT.dark(),dark:MAT.dark(),glass:MAT.glass()};glassMats=[m.glass];
 const g=Bd.make(m);house.add(g);house.size=Bd.L;
 const top=new THREE.Box3().setFromObject(g);house.lamp.position.set(Bd.L*.3,Math.min(3,top.max.y*.5),0);house.light.position.copy(house.lamp.position);house.add(house.lamp,house.light);}
buildHouse();
// ヨシ帯の範囲（田舟だけが入れる）
const reedMask=new Set();for(const[x,y]of reedPts)for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)reedMask.add((Math.floor(x/120)+a)+','+(Math.floor(y/120)+b));
const inReeds=(x,y)=>reedMask.has(Math.floor(x/120)+','+Math.floor(y/120));
