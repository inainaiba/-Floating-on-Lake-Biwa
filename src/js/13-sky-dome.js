// 空のドーム：天頂から地平へのグラデーションと、地平のかすみ、太陽
const skyU = {
  uTop: { value: new THREE.Color() },
  uHor: { value: new THREE.Color() },
  uSunD: { value: new THREE.Vector3(0, 1, 0) },
  uSunC2: { value: new THREE.Color() },
  uT: { value: 0 },
  uCloud: { value: 0.4 },
  uCu: { value: 0 },
  uDark: { value: 0 },
  uMp: { value: 0.5 },
  uCi: { value: 0.25 },
  uRay: { value: 0 },
  uLt: { value: 0 },
  uLd: { value: new THREE.Vector3(1, 0, 0) },
  uRb: { value: 0 },
  uStar: { value: 1 },
  uShaft: { value: 0 },
  uSnowCap: { value: 0 },
  uMet: { value: new THREE.Vector4(0, 0, 0, 0) },
  uCon: { value: new THREE.Vector4(0, 0, 0, 0) },
  uVenus: { value: 0 },
  uHzS: { value: 0 },
  uMw: { value: 1 },
  uMoonD: { value: new THREE.Vector3(0, 1, 0) },
  uVeil: { value: 0 },
  uWin: { value: 0 },
  uCity: { value: new THREE.Vector3(0, 0, 1) },
};
/* 空の描画（フラグメント）：処理の順に区切った部品。一つの main の中で上から順につながる。
   前の部品で作った値（y, sd, cp, cl, nt など）を後の部品が使うので、順番は入れ替えない。 */
const SKY_FS_HEAD = `uniform vec3 uTop,uHor,uSunD,uSunC2;
uniform float uT,uCloud,uDark,uCu,uMp,uCi,uRay,uLt,uRb,uStar,uHzS,uShaft,uSnowCap;uniform vec4 uMet;uniform vec4 uCon;uniform float uVenus;uniform float uMw;uniform vec3 uMoonD;uniform float uVeil,uWin;uniform vec3 uCity;
uniform vec3 uLd;
varying vec3 vD;
${GLSL_NOISE}
 `;
// 地平から天頂へのグラデーション
const SKY_FS_BASE = `float y=max(vD.y,0.);
vec3 c=mix(uHor,uTop,pow(y,.45));
float sd=max(dot(vD,uSunD),0.);
float md=max(dot(vD,-uSunD),0.);
`;
// 月：満ち欠け・低い月の色・月のかさ
const SKY_FS_MOON = `{vec3 md0=uMoonD;/* 月の向き（天文の計算） */float mlow=1.-smoothstep(.02,.22,md0.y);
vec3 sx=normalize(cross(md0,vec3(0.,1.,0.)));
float a0=dot(vD,md0);
float mr0=mix(.99955,.9993,mlow),disc=smoothstep(mr0,mr0+.00013,a0);
float ph=uMp*6.2832;
vec3 sh=normalize(md0+sx*.026*cos(ph)*-1.);
float occ=smoothstep(mr0,mr0+.00013,dot(vD,sh));
float lit=uMp<.5?disc*(1.-occ*step(.03,abs(uMp-.5))):disc*(1.-occ*step(.03,abs(uMp-.5)));
float fullness=1.-abs(uMp-.5)*2.;
c+=mix(vec3(.95,.95,.88),vec3(1.,.66,.4),mlow*.85)*max(lit,disc*.06)*smoothstep(.05,-.1,uSunD.y);c+=vec3(1.,.6,.35)*pow(max(a0,0.),900.)*.35*mlow*smoothstep(.05,-.1,uSunD.y);
c+=vec3(.5,.55,.7)*pow(max(a0,0.),300.)*.25*fullness*smoothstep(.05,-.1,uSunD.y);
}`;
// 太陽：円盤・薄雲越しのにじみ・地平の茜
const SKY_FS_SUN = `c+=uSunC2*uVeil*(pow(sd,250.)*1.1+pow(sd,25.)*.35)*smoothstep(-.02,.08,uSunD.y);
c+=uSunC2*(1.-uVeil*.85)*(mix(pow(sd,1500.)*3.5,pow(sd,380.)*1.6,uHzS)+vec3(.35,-.15,-.3)*pow(sd,380.)*uHzS*.8+pow(sd,40.)*.2+pow(sd,6.)*.08+pow(sd,14.)*.22*uCloud);
c+=vec3(1.,.55,.3)*pow(max(dot(normalize(vec3(vD.x,0.,vD.z)),normalize(vec3(uSunD.x,0.,uSunD.z))),0.),6.)*smoothstep(.35,0.,y)*smoothstep(.35,0.,abs(uSunD.y))*.6;
`;
// 巻雲・層雲・街明かり・雲の銀の縁
const SKY_FS_CLOUDS = ` vec2 cp=vD.xz/(vD.y+.08)*1.4+vec2(uT*.004,uT*.002);
cp+=vec2(nzF5(cp*.35+1.3),nzF5(cp*.35+7.1))*1.1-.55;
float ci=(smoothstep(.55,.9,nzF5(vec2(cp.x*.6,cp.y*3.)+3.))+smoothstep(.6,.85,nzF5(cp*6.+9.))*smoothstep(.45,.7,nzF5(cp*.8+2.))*.8)*uCi*smoothstep(.05,.3,vD.y);
c=mix(c,vec3(1.),ci*(1.-uDark));
float cl=max(smoothstep(.5-uCloud*.3,1.,nzF5(cp)),smoothstep(.62-uCloud*.15,.95,nzF5(vec2(cp.x*.35,cp.y*1.6)+7.))*.9)*smoothstep(0.,.12,vD.y);
float cb=nzF5(cp+vec2(.05,.03));
float cb2=nzF5(cp-uSunD.xz*.06);
vec3 cc=(1.-.42*smoothstep(.45,.9,cb)+.18*smoothstep(.0,.3,cb-cb2))*mix(mix(vec3(1.),uTop*1.6,smoothstep(.25,0.,uSunD.y+.1)),uHor*.9,.35)*mix(mix(vec3(1.,.52,.38),vec3(1.,.72,.55),smoothstep(-.05,.12,uSunD.y)),vec3(1.),smoothstep(.05,.35,uSunD.y))*(1.+.35*smoothstep(.3,.0,uSunD.y)*smoothstep(-.12,.0,uSunD.y))*(1.-uDark*.6)+uSunC2*pow(sd,4.)*.4;
c=mix(c,cc,cl*.85);
// 雲の銀の縁：太陽の近くの雲の輪郭が白く光る
// 雲に映る街明かり：夜、街のある方角の雲の底が橙に照らされる
{float ntc=smoothstep(.05,-.15,uSunD.y);float dir=pow(max(dot(normalize(vec3(vD.x,0.,vD.z)),uCity),0.),3.);c+=vec3(1.,.58,.3)*cl*dir*ntc*.16*smoothstep(.45,.0,y)*(.5+uCloud);}
{float edge=smoothstep(.0,.25,cl)*smoothstep(.75,.2,cl);c+=uSunC2*edge*(pow(sd,10.)*1.4+pow(sd,60.)*1.2)*smoothstep(-.02,.1,uSunD.y)*(1.-uDark*.8);}
`;
// 積雲（入道雲）
const SKY_FS_CUMULUS_FLAT = `if(uCu>.01){
// 方位角は真西で +π と -π が入れ替わるので、そのあたりでは反対側の値と混ぜて継ぎ目を消す
float az=atan(vD.z,vD.x),az2=az-sign(az)*6.2832,ww=smoothstep(2.5,3.1416,abs(az))*.5;
vec2 q=vec2(az*3.2+uT*.0015,vD.y*9.),q2=vec2(az2*3.2+uT*.0015,vD.y*9.);
float hgt=mix(nzF5(vec2(q.x*1.3,1.7)),nzF5(vec2(q2.x*1.3,1.7)),ww)*.55+.12;
float base=.035;
float m_=smoothstep(.0,.04,vD.y-base)*smoothstep(hgt+.02,hgt-.06,vD.y)*smoothstep(.42,.62,mix(nzF5(q*vec2(1.6,1.)+5.),nzF5(q2*vec2(1.6,1.)+5.),ww));
float sh_=smoothstep(base+.2,base,vD.y)*.55+(1.-smoothstep(.0,.5,mix(nzF5(q*2.3+2.),nzF5(q2*2.3+2.),ww)))*.3-smoothstep(.45,.9,mix(nzF5(q*1.7+vec2(uSunD.x,uSunD.z)*2.),nzF5(q2*1.7+vec2(uSunD.x,uSunD.z)*2.),ww))*.2;
vec3 cu=mix(vec3(1.),vec3(.52,.57,.68),sh_);
{float hv=clamp((vD.y-base)/max(hgt-base,.02),0.,1.);float dusk=smoothstep(.35,.0,uSunD.y)*smoothstep(-.14,-.02,uSunD.y+.0)*1.;vec3 top=mix(vec3(1.,.55,.42),vec3(1.,.74,.5),smoothstep(-.05,.1,uSunD.y));vec3 bot=vec3(.62,.56,.74);vec3 dc=mix(bot,top,smoothstep(.15,.85,hv))*(1.+.25*pow(max(dot(normalize(vec3(vD.x,0.,vD.z)),normalize(vec3(uSunD.x,0.,uSunD.z))),0.),2.));cu=mix(cu,dc,max(dusk,smoothstep(.35,.0,uSunD.y)*.85));cu*=1.-uDark*.6;}
c=mix(c,cu,m_*uCu);
}
`;
// 立体的な入道雲：空の中の雲の層（高さ1〜2.6）を視線に沿って何段か進み、雲の濃さと、
// 太陽へ向けた数段で光の届き方を求めて重ねる。段数は画質で変える（QUALITY.cloudSteps）
const SKY_FS_CUMULUS_VOL = `if(uCu>.01&&vD.y>.012){
const int CS=${Math.max(1, QUALITY.cloudSteps)};
float H0=1.,H1=2.6,t0=H0/vD.y,t1=min(H1/vD.y,t0+14.);
float dtt=(t1-t0)/float(CS),T=1.;vec3 acc=vec3(0.);
float cov=1.-uCu*.5;
vec2 wnd=vec2(uT*.004,uT*.0015);
vec3 sD=normalize(vec3(uSunD.x,max(uSunD.y,.03),uSunD.z));
float jit=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));/* 画面の位置から決まる細かいずらし（縞を消し、ざらつきも目立たない） */
vec3 sunCol=mix(vec3(1.,.62,.42),vec3(1.,.97,.92),smoothstep(.0,.35,uSunD.y))*smoothstep(-.12,.02,uSunD.y)*(1.-uDark*.7);
for(int i=0;i<CS;i++){
 float tt=t0+dtt*(float(i)+jit);vec3 p=vD*tt;
 float hy=(p.y-H0)/(H1-H0);vec2 q=p.xz*.28+wnd;
 q+=vec2(nzN(q*1.3+7.),nzN(q*1.3+1.7))*.35;
 float top=.25+.75*nzN(q*.55+3.1);
 // 高いところほど雲が細り、頭が丸くなる。底は平ら
 float th=cov+hy*hy*.32+max(0.,hy-top)*1.5;
 float d=smoothstep(th,th+.07,nzF4(q))*smoothstep(.0,.04,hy);
 if(d<.01)continue;
 d*=.75+.25*nzN(p.xz*2.3+vec2(hy*5.)+wnd*2.);
 float ld=0.;for(int k=1;k<=3;k++){vec3 lp=p+sD*(float(k)*.22);ld+=smoothstep(cov,cov+.1,nzN(lp.xz*.28+wnd)*.92+.04)*step((lp.y-H0)/(H1-H0),.95);}
 float Ls=exp(-ld*1.2),pw=1.-exp(-d*5.);
 vec3 amb=mix(uHor*.85,uTop*1.15+.06,hy)*(1.-uDark*.6);
 vec3 col=sunCol*Ls*pw*1.7+amb*(.3+.7*smoothstep(.0,.6,hy));/* 底は暗く、日の当たる頭は明るく */
 float a=d*dtt*4.;acc+=T*col*a;T*=exp(-a);
 if(T<.03)break;
}
float fade=smoothstep(.012,.07,vD.y)*smoothstep(70.,22.,t0);
c=mix(c,acc/max(1.-T,1e-3),(1.-T)*fade*min(1.,uCu*1.6));
}
`;
// 画質で、立体的な雲かこれまでの雲かを選ぶ
const SKY_FS_CUMULUS = QUALITY.cloudSteps > 0 ? SKY_FS_CUMULUS_VOL : SKY_FS_CUMULUS_FLAT;
// 光芒：反薄明光線・薄明光線・稲光
const SKY_FS_RAYS = ` // 反薄明光線：夕方、太陽の反対側の空へ影の筋が集まる
 {float lw2=smoothstep(.18,.0,abs(uSunD.y+.02))*(1.-uDark)*clamp(uCu*1.5+uCloud*.6,0.,1.);if(lw2>.01){vec3 an_=-uSunD;vec3 sp2=normalize(vD-an_*dot(vD,an_));float a2=atan(dot(sp2,normalize(cross(an_,vec3(0.,1.,0.)))),sp2.y);float st2=smoothstep(.45,.75,nzF5(vec2(a2*7.,uT*.008)));c=mix(c,c*vec3(.8,.78,.88),st2*lw2*.35*smoothstep(.0,.08,vD.y)*smoothstep(.7,.1,vD.y));}}
 if(uRay>.01){vec3 sp=normalize(vD-uSunD*dot(vD,uSunD));
float an=atan(dot(sp,normalize(cross(uSunD,vec3(0.,1.,0.)))),sp.y);
float rays=smoothstep(.55,.9,nzF5(vec2(an*8.,uT*.01)))*pow(max(dot(vD,uSunD),0.),3.)*smoothstep(-.02,.15,vD.y);
c+=vec3(1.,.86,.62)*rays*uRay*.5*(1.+1.4*smoothstep(.0,-.15,vD.y-uSunD.y)*smoothstep(.15,.4,uSunD.y));
}if(uLt>.01){float lg=pow(max(dot(vD,normalize(uLd)),0.),18.)*smoothstep(.0,.04,vD.y)*smoothstep(.3,.06,vD.y);
c+=vec3(.85,.85,1.)*lg*uLt*1.4;
}
`;
// 虹
const SKY_FS_RAINBOW = ` if(uRb>.01){vec3 anti=normalize(-uSunD);
float ang=acos(clamp(dot(vD,anti),-1.,1.));
float band=(ang-.70)/.035;
vec3 rb=clamp(vec3(1.-abs(band-1.),1.-abs(band),1.-abs(band+1.)),0.,1.);
c+=rb*.22*uRb*smoothstep(.0,.05,vD.y)*smoothstep(-.4,.6,band+1.6)*(1.-smoothstep(1.6,2.2,abs(band)));
}
`;
// 夕焼け・明け方の色の層・地平のにじみ
const SKY_FS_TWILIGHT = ` {float lw=smoothstep(.3,.02,uSunD.y)*smoothstep(-.16,.0,uSunD.y)*(1.-uDark);
vec3 ly=mix(vec3(1.,.6,.32),vec3(1.,.62,.66),smoothstep(.0,.08,y));
ly=mix(ly,vec3(.72,.66,.9),smoothstep(.06,.22,y));
c=mix(c,ly*mix(1.,.8,smoothstep(.0,.3,y)),lw*.45*smoothstep(.45,.0,y));
}
 c+=uHor*.22*exp(-y*45.)*(1.-uDark)*smoothstep(-.1,.15,uSunD.y);
 // 明け方の色の層：地平の橙から桃、紫、藍へ細かく重なる
 {float dw=smoothstep(-.32,-.08,uSunD.y)*smoothstep(.06,-.02,uSunD.y)*(1.-uDark)*mix(.5,1.,smoothstep(-.3,.6,dot(normalize(vec3(vD.x,0.,vD.z)),normalize(vec3(uSunD.x,0.,uSunD.z)+1e-4))));
 vec3 l1=vec3(1.,.55,.28),l2=vec3(.98,.62,.6),l3=vec3(.62,.52,.78),l4=vec3(.2,.24,.48);
 vec3 dc2=mix(l1,l2,smoothstep(.0,.05,y));dc2=mix(dc2,l3,smoothstep(.05,.14,y));dc2=mix(dc2,l4,smoothstep(.14,.4,y));
 c=mix(c,dc2,dw*.55*smoothstep(.6,.0,y));}
 c+=vec3(.1,.1,.09)*exp(-y*16.)*smoothstep(-.1,.2,uSunD.y)*(1.-uDark);
`;
// 雪雲・雨の柱
const SKY_FS_WEATHER = ` if(uSnowCap>.01){float west=smoothstep(-.15,-.75,vD.x);float az=atan(vD.z,vD.x),az2=az-sign(az)*6.2832,ww=smoothstep(2.5,3.1416,abs(az))*.5;float sc=smoothstep(.45,.7,mix(nzF5(vec2(az*5.+uT*.003,vD.y*14.)),nzF5(vec2(az2*5.+uT*.003,vD.y*14.)),ww))*smoothstep(.03,.07,vD.y)*smoothstep(.26,.1,vD.y);c=mix(c,vec3(.58,.61,.66)*(1.-uDark*.7),clamp(sc*west*1.8,0.,.95)*uSnowCap);c=mix(c,vec3(.68,.7,.74)*(1.-uDark*.7),uSnowCap*.35*smoothstep(.5,.0,y));}
 if(uShaft>.01){float az=atan(vD.z,vD.x),az2=az-sign(az)*6.2832,ww=smoothstep(2.5,3.1416,abs(az))*.5;float sh_=smoothstep(.55,.85,mix(nzF5(vec2(az*2.2,uT*.002)),nzF5(vec2(az2*2.2,uT*.002)),ww))*smoothstep(.62,.9,mix(nzF5(vec2(az*9.,vD.y*3.+uT*.01)),nzF5(vec2(az2*9.,vD.y*3.+uT*.01)),ww))*smoothstep(.0,.03,vD.y)*smoothstep(.2,.05,vD.y);c=mix(c,vec3(.48,.52,.58)*(1.-uDark*.5),sh_*uShaft*.7);}
`;
// 飛行機雲・金星
const SKY_FS_OBJECTS = ` if(uCon.w>.01){float az=uCon.x,el=uCon.y;vec3 a=normalize(vec3(cos(az)*cos(el),sin(el),sin(az)*cos(el)));vec3 b=normalize(vec3(cos(az+1.1)*cos(el+.08),sin(el+.08),sin(az+1.1)*cos(el+.08)));vec3 hd=normalize(mix(a,b,uCon.z));vec3 n2=normalize(cross(a,b));float dl=abs(dot(vD,n2));float on_=dot(cross(a,vD),n2)>0.&&dot(cross(vD,hd),n2)>0.?1.:0.;float age=1.-clamp(acos(clamp(dot(vD,hd),-1.,1.))/(1.2*uCon.z+.001),0.,1.);float wid=mix(.0012,.006,1.-age);c=mix(c,vec3(1.),smoothstep(wid,0.,dl)*on_*(.25+.55*age)*uCon.w*(1.-uDark));}
 if(uVenus>.01){vec3 vd=normalize(vec3(.85,.16,.2));c+=vec3(1.,.97,.9)*(smoothstep(.99997,1.,dot(vD,vd))*2.5+pow(max(dot(vD,vd),0.),4000.)*.6)*uVenus;}
`;
// 夜：流れ星・星と瞬き・天の川
const SKY_FS_NIGHT = ` float nt=smoothstep(.05,-.15,uSunD.y);
 if(uMet.w>.01){float az=uMet.x,el=uMet.y;vec3 a=normalize(vec3(cos(az)*cos(el),sin(el),sin(az)*cos(el)));vec3 b=normalize(vec3(cos(az+.18)*cos(el-.09),sin(el-.09),sin(az+.18)*cos(el-.09)));vec3 hd=normalize(mix(a,b,uMet.z));vec3 nrm2=normalize(cross(a,b));float dl=abs(dot(vD,nrm2));float along=dot(cross(a,vD),nrm2)>0.&&dot(cross(vD,hd),nrm2)>0.?1.:0.;float tail=1.-clamp(acos(clamp(dot(vD,hd),-1.,1.))/(.2*uMet.z+.001),0.,1.);c+=vec3(.9,.95,1.)*smoothstep(.0012,.0,dl)*along*pow(tail,1.5)*uMet.w*nt*1.6;}
 vec2 sp_=vD.xz/(vD.y+.25);
float h1=fract(sin(dot(floor(sp_*160.),vec2(12.9,78.2)))*43758.5),h2=fract(sin(dot(floor(sp_*70.),vec2(39.3,11.1)))*24634.6);
 vec2 f1=fract(sp_*160.)-.5,f2=fract(sp_*70.)-.5;
float tw_=.55+.45*sin(uT*(3.+fract(h1*53.)*5.)+h1*90.);tw_=mix(1.,tw_,1.-smoothstep(.05,.45,y));
float st=tw_*step(mix(.992,.984,uWin),h1)*(.3+.7*fract(h1*91.))*smoothstep(.25,.0,length(f1))+step(mix(.997,.993,uWin),h2)*(1.3+uWin*.8)*smoothstep(.22,.0,length(f2));
 vec3 mwd=normalize(vec3(.55,.35,-.75));
float mw=exp(-pow(dot(vD,mwd)*4.,2.))*(.55+.45*nzF5(vD.xz*9.+vD.y*4.))*uMw*(.75+.5*smoothstep(.35,.75,nzF5(vD.xz*22.+3.)));
 st+=step(.97,h1)*mw*.9*smoothstep(.25,.0,length(f1));
c+=vec3(.55,.6,.8)*mw*.06*nt*(1.-uDark);
 c=mix(c,mix(vec3(.08,.14,.32),vec3(.01,.02,.08),pow(y,.6)),nt*.9);
c+=mw*nt*vec3(.05,.055,.08)*(1.-uDark);
 c+=vec3(.22,.2,.28)*mw*nt*smoothstep(.05,.35,y)*(1.-cl*.8);
 c+=mix(vec3(1.,.85,.7),vec3(.75,.85,1.),fract(h1*37.+h2*11.))*st*3.2*uStar*smoothstep(.04,.3,y)*nt*(1.-cl*.7);
 c+=vec3(1.,.62,.35)*exp(-y*9.)*nt*.45;
`;
// 仕上げ：地平を地平色に溶かす
const SKY_FS_FINISH = `c=mix(c,uHor,smoothstep(.2,0.,y)*.75);
`;
const skyDome = new THREE.Mesh(
  new THREE.SphereGeometry(9000, 32, 16),
  new THREE.ShaderMaterial({
    uniforms: skyU,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `varying vec3 vD;void main(){vD=normalize(position);vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_Position.z=gl_Position.w*.9999;}`,
    fragmentShader: `${SKY_FS_HEAD}void main(){
${SKY_FS_BASE}
${SKY_FS_MOON}
${SKY_FS_SUN}
${SKY_FS_CLOUDS}
${SKY_FS_CUMULUS}
${SKY_FS_RAYS}
${SKY_FS_RAINBOW}
${SKY_FS_TWILIGHT}
${SKY_FS_WEATHER}
${SKY_FS_OBJECTS}
${SKY_FS_NIGHT}
${SKY_FS_FINISH}
gl_FragColor=vec4(c,1.);
}`,
  }),
);
skyDome.renderOrder = -1;
skyDome.frustumCulled = false;
scene.add(skyDome);
const hemi = new THREE.HemisphereLight(0xcfe3f0, 0x46523a, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
scene.add(sun);
sun.castShadow = true;
sun.shadow.mapSize.set(QUALITY.shadowMap, QUALITY.shadowMap);
Object.assign(sun.shadow.camera, {
  left: -QUALITY.shadowRange,
  right: QUALITY.shadowRange,
  top: QUALITY.shadowRange,
  bottom: -QUALITY.shadowRange,
  near: 1,
  far: 300,
});
sun.shadow.bias = -0.0005;
scene.add(sun.target);
