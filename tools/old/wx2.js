// 雨と雪の粒（カメラの周りだけ）
const PN=2500,precipGeo=new THREE.BufferGeometry(),pPos=new Float32Array(PN*6);
for(let i=0;i<PN;i++){const x=(Math.random()-.5)*160,y=Math.random()*60,z=(Math.random()-.5)*160;pPos.set([x,y,z,x,y-1,z],i*6);}
precipGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));
const rainMesh=new THREE.LineSegments(precipGeo,new THREE.LineBasicMaterial({color:0xcfd8e0,transparent:true,opacity:0}));rainMesh.frustumCulled=false;scene.add(rainMesh);
const snowGeo=new THREE.BufferGeometry(),sPos=new Float32Array(PN*3);for(let i=0;i<PN;i++)sPos.set([(Math.random()-.5)*160,Math.random()*60,(Math.random()-.5)*160],i*3);
snowGeo.setAttribute('position',new THREE.BufferAttribute(sPos,3));const snowMesh=new THREE.Points(snowGeo,new THREE.PointsMaterial({color:0xffffff,size:.35,transparent:true,opacity:0}));snowMesh.frustumCulled=false;scene.add(snowMesh);
function updatePrecip(X_,W,dt,t){const cx=camera.position.x,cz=camera.position.z;
 rainMesh.material.opacity=Math.min(.55,X_.rain*.6);rainMesh.visible=X_.rain>.02;snowMesh.material.opacity=X_.snow*.9;snowMesh.visible=X_.snow>.02;
 if(rainMesh.visible){const p=precipGeo.attributes.position.array,vy=28*dt,sx=W.x*.15,sz=W.y*.15;for(let i=0;i<PN;i++){const o=i*6;let y=p[o+1]-vy;if(y<0)y+=60;
  let x=p[o]+sx*dt*8,z=p[o+2]+sz*dt*8;x=cx+((x-cx+80)%160+160)%160-80;z=cz+((z-cz+80)%160+160)%160-80;p[o]=x;p[o+1]=y;p[o+2]=z;p[o+3]=x-sx;p[o+4]=y-1.6;p[o+5]=z-sz;}precipGeo.attributes.position.needsUpdate=true;}
 if(snowMesh.visible){const p=snowGeo.attributes.position.array;for(let i=0;i<PN;i++){const o=i*3;let y=p[o+1]-2.2*dt;if(y<0)y+=60;let x=p[o]+(W.x*.2+Math.sin(t+i)*.3)*dt,z=p[o+2]+(W.y*.2)*dt;
  x=cx+((x-cx+80)%160+160)%160-80;z=cz+((z-cz+80)%160+160)%160-80;p[o]=x;p[o+1]=y;p[o+2]=z;}snowGeo.attributes.position.needsUpdate=true;}}
// 雷：点滅ではなく、ゆっくり明るむ光（1秒に3回以下）
let flash=0,nextFlash=0;
// ヨシの一年：冬に刈られ、早春にヨシ焼き、春に新芽、夏に茂り、秋に穂
const REED_YEAR=[[0x9a8a64,.25],[0x9a8a64,.25],[0x2b2620,.22],[0x9fbf6a,.5],[0x88ad58,.75],[0x6f8f45,1],[0x5f8240,1.1],[0x627f3e,1.15],[0xa69a52,1.15],[0xc4a85a,1.1],[0xa88d5c,1.05],[0x998465,1]];
// ヨシ焼きの煙（3月の昼）
const smokeGeo=new THREE.BufferGeometry(),smP=new Float32Array(600*3),smB=[];{const R=rnd(21);for(let i=0;i<600;i++){const s=REED_SITES[i%REED_SITES.length];const a=R()*6.28,q=R()*s[2]*.6;smB.push([(s[0]+Math.cos(a)*q)*S,(s[1]+Math.sin(a)*q)*S,R()*40]);}}
smokeGeo.setAttribute('position',new THREE.BufferAttribute(smP,3));const smoke=new THREE.Points(smokeGeo,new THREE.PointsMaterial({color:0x9a958c,size:6,transparent:true,opacity:.35,depthWrite:false}));smoke.frustumCulled=false;scene.add(smoke);
