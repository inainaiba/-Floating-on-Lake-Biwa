/* ---------- 山並み：地形図を参考にした作品用の地形（標高は実寸。表示は縮尺Sに合わせ、高さを1.5倍に強調） ---------- */
const VEX=1.5;
const RIDGES=[ // [始点lon,lat, 終点lon,lat, 高さm, 幅m]
 [135.84,35.10,135.99,35.42,900,4500],   // 比良山地
 [135.93,35.50,136.27,35.62,650,5000],   // 野坂山地（北）
 [136.33,35.33,136.43,35.65,950,5000],   // 伊吹山地
 [136.30,34.85,136.46,35.28,850,4500],   // 鈴鹿山脈
 [135.92,34.90,136.15,34.92,420,5000],   // 湖南の丘陵（信楽方面）
 [135.80,34.95,135.86,35.08,600,3500]];  // 比叡山・西の山
const PEAKS=[[135.876,35.215,1174,3000],[136.416,35.418,1377,3500],[136.42,35.02,1212,3000],[135.834,35.067,848,2200],
 [136.03,35.03,432,900],[136.09,35.14,280,800],[136.205,35.215,284,900],[136.05,35.165,330,1100]];
function vnoise(x,y){const h=(i,j)=>{const s=Math.sin(i*127.1+j*311.7)*43758.5453;return s-Math.floor(s);};const i=Math.floor(x),j=Math.floor(y),u=x-i,v=y-j,f=t=>t*t*(3-2*t);
 return (h(i,j)*(1-f(u))+h(i+1,j)*f(u))*(1-f(v))+(h(i,j+1)*(1-f(u))+h(i+1,j+1)*f(u))*f(v);}
const RG=RIDGES.map(([a,b,c,d,h,w])=>[...ll(a,b),...ll(c,d),h,w]),PK=PEAKS.map(([a,b,h,w])=>[...ll(a,b),h,w]);
function landH(x,y){let m=0;
 for(const[x1,y1,x2,y2,h,w]of RG){const dx=x2-x1,dy=y2-y1;let t=((x-x1)*dx+(y-y1)*dy)/(dx*dx+dy*dy);const e=t<0?-t:t>1?t-1:0;t=Math.max(0,Math.min(1,t));
  const d=Math.hypot(x-(x1+dx*t),y-(y1+dy*t));m=Math.max(m,h*Math.exp(-(d*d)/(w*w))*Math.exp(-e*e*30)*(.75+.5*vnoise(x/3000,y/3000)));}
 for(const[px,py,h,w]of PK){const d=Math.hypot(x-px,y-py);m=Math.max(m,h*Math.exp(-(d*d)/(w*w)));}
 const n=vnoise(x/1500,y/1500)*.6+vnoise(x/600,y/600)*.4;m*=.8+.4*n;return 4+m;}
const TM=26000,TW=200,TH=250,tx0=minX-TM,ty0=minY-TM,tdx=(maxX-minX+2*TM)/(TW-1),tdy=(maxY-minY+2*TM)/(TH-1);
const terrH=new Float32Array(TW*TH);
for(let j=0;j<TH;j++)for(let i=0;i<TW;i++){const x=tx0+i*tdx,y=ty0+j*tdy;terrH[j*TW+i]=inLake(x,y)?-30:landH(x,y)*Math.min(1,.15+distShore(x,y)/2500);}
const terrGeo=new THREE.PlaneGeometry((TW-1)*tdx*S,(TH-1)*tdy*S,TW-1,TH-1).rotateX(-Math.PI/2);
{const pos=terrGeo.attributes.position,col=new Float32Array(pos.count*3);
 for(let k=0;k<pos.count;k++){const i=k%TW,j=Math.floor(k/TW),h=terrH[j*TW+i];pos.setY(k,h*S*VEX);
  const c=h<0?new THREE.Color(0x3d4a35):h<60?new THREE.Color(0x6b7a52):h<400?new THREE.Color(0x4c5f3c).lerp(new THREE.Color(0x3b4c33),(h-60)/340):new THREE.Color(0x3b4c33).lerp(new THREE.Color(0x6a6a5e),Math.min(1,(h-400)/900));
  col.set([c.r,c.g,c.b],k*3);}
 terrGeo.setAttribute('color',new THREE.BufferAttribute(col,3));terrGeo.computeVertexNormals();}
const terrMat=new THREE.MeshLambertMaterial({vertexColors:true});
terrMat.onBeforeCompile=sh=>{sh.uniforms.uSnow={value:0};terrMat.userData.sh=sh;sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying float vH;').replace('#include <begin_vertex>','#include <begin_vertex>\nvH=position.y;');
 sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying float vH;uniform float uSnow;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.93,.94,.96),uSnow*smoothstep('+(600*S*VEX).toFixed(2)+','+(800*S*VEX).toFixed(2)+',vH));');};
const terr=new THREE.Mesh(terrGeo,terrMat);terr.position.set((tx0+(TW-1)*tdx/2)*S,0,(ty0+(TH-1)*tdy/2)*S);scene.add(terr);
const SNOW=[1,.9,.5,0,0,0,0,0,0,0,.2,.7];
// 遠景用の等高線（陸）
const landContours=(()=>{const out=[];for(const lv of[150,400,700,1000]){const P=[];for(let j=0;j<TH-1;j++)for(let i=0;i<TW-1;i++){const a=terrH[j*TW+i],b=terrH[j*TW+i+1],c=terrH[(j+1)*TW+i+1],d=terrH[(j+1)*TW+i];
  const idx=(a>lv)|(b>lv)<<1|(c>lv)<<2|(d>lv)<<3;if(!idx||idx===15)continue;const x=tx0+i*tdx,y=ty0+j*tdy,L=(p,q)=>(lv-p)/(q-p||1);
  const e=[[x+L(a,b)*tdx,y],[x+tdx,y+L(b,c)*tdy],[x+L(d,c)*tdx,y+tdy],[x,y+L(a,d)*tdy]],ed=[];
  if((idx&1)!==(idx>>1&1))ed.push(e[0]);if((idx>>1&1)!==(idx>>2&1))ed.push(e[1]);if((idx>>2&1)!==(idx>>3&1))ed.push(e[2]);if((idx>>3&1)!==(idx&1))ed.push(e[3]);
  for(let k=0;k+1<ed.length;k+=2)P.push(ed[k],ed[k+1]);}out.push(P);}return out;})();
