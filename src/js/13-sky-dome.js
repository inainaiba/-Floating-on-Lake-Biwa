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
};
const skyDome = new THREE.Mesh(
  new THREE.SphereGeometry(9000, 32, 16),
  new THREE.ShaderMaterial({
    uniforms: skyU,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `varying vec3 vD;void main(){vD=normalize(position);vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_Position.z=gl_Position.w*.9999;}`,
    fragmentShader: `uniform vec3 uTop,uHor,uSunD,uSunC2;
uniform float uT,uCloud,uDark,uCu,uMp,uCi,uRay,uLt,uRb;
uniform vec3 uLd;
varying vec3 vD;
 float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);
}float n(vec2 p){vec2 i=floor(p),f=fract(p);
f=f*f*(3.-2.*f);
return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);
}
 float fbm(vec2 p){float s=0.,a=.5;
for(int i=0;
i<5;
i++){s+=a*n(p);
p*=2.03;
a*=.5;
}return s;
}
 void main(){float y=max(vD.y,0.);
vec3 c=mix(uHor,uTop,pow(y,.45));
float sd=max(dot(vD,uSunD),0.);
float md=max(dot(vD,-uSunD),0.);
{vec3 md0=normalize(-uSunD*vec3(1.,-1.,1.)+vec3(0.,.25,0.));
vec3 sx=normalize(cross(md0,vec3(0.,1.,0.)));
float a0=dot(vD,md0);
float disc=smoothstep(.99955,.99968,a0);
float ph=uMp*6.2832;
vec3 sh=normalize(md0+sx*.026*cos(ph)*-1.);
float occ=smoothstep(.99955,.99968,dot(vD,sh));
float lit=uMp<.5?disc*(1.-occ*step(.03,abs(uMp-.5))):disc*(1.-occ*step(.03,abs(uMp-.5)));
float fullness=1.-abs(uMp-.5)*2.;
c+=vec3(.95,.95,.88)*max(lit,disc*.06)*smoothstep(.05,-.1,uSunD.y);
c+=vec3(.5,.55,.7)*pow(max(a0,0.),300.)*.25*fullness*smoothstep(.05,-.1,uSunD.y);
}c+=uSunC2*(pow(sd,1500.)*3.5+pow(sd,40.)*.2+pow(sd,6.)*.08+pow(sd,14.)*.22*uCloud);
c+=vec3(1.,.55,.3)*pow(max(dot(normalize(vec3(vD.x,0.,vD.z)),normalize(vec3(uSunD.x,0.,uSunD.z))),0.),6.)*smoothstep(.35,0.,y)*smoothstep(.35,0.,abs(uSunD.y))*.6;
 vec2 cp=vD.xz/(vD.y+.08)*1.4+vec2(uT*.004,uT*.002);
cp+=vec2(fbm(cp*.35+1.3),fbm(cp*.35+7.1))*1.1-.55;
float ci=(smoothstep(.55,.9,fbm(vec2(cp.x*.6,cp.y*3.)+3.))+smoothstep(.6,.85,fbm(cp*6.+9.))*smoothstep(.45,.7,fbm(cp*.8+2.))*.8)*uCi*smoothstep(.05,.3,vD.y);
c=mix(c,vec3(1.),ci*(1.-uDark));
float cl=max(smoothstep(.5-uCloud*.3,1.,fbm(cp)),smoothstep(.62-uCloud*.15,.95,fbm(vec2(cp.x*.35,cp.y*1.6)+7.))*.9)*smoothstep(0.,.12,vD.y);
float cb=fbm(cp+vec2(.05,.03));
float cb2=fbm(cp-uSunD.xz*.06);
vec3 cc=(1.-.42*smoothstep(.45,.9,cb)+.18*smoothstep(.0,.3,cb-cb2))*mix(mix(vec3(1.),uTop*1.6,smoothstep(.25,0.,uSunD.y+.1)),uHor*.9,.35)*mix(mix(vec3(1.,.52,.38),vec3(1.,.72,.55),smoothstep(-.05,.12,uSunD.y)),vec3(1.),smoothstep(.05,.35,uSunD.y))*(1.+.35*smoothstep(.3,.0,uSunD.y)*smoothstep(-.12,.0,uSunD.y))*(1.-uDark*.6)+uSunC2*pow(sd,4.)*.4;
c=mix(c,cc,cl*.85);
if(uCu>.01){vec2 q=vec2(atan(vD.z,vD.x)*3.2+uT*.0015,vD.y*9.);
float hgt=fbm(vec2(q.x*1.3,1.7))*.55+.12;
float base=.035;
float m_=smoothstep(.0,.04,vD.y-base)*smoothstep(hgt+.02,hgt-.06,vD.y)*smoothstep(.42,.62,fbm(q*vec2(1.6,1.)+5.));
float sh_=smoothstep(base+.18,base,vD.y)*.35+(1.-smoothstep(.0,.5,fbm(q*2.3+2.)))*.25;
vec3 cu=mix(vec3(1.),vec3(.72,.76,.84),sh_);
cu=mix(cu,mix(vec3(1.,.62,.6),vec3(1.,.72,.52),smoothstep(-.05,.1,uSunD.y)),smoothstep(.35,.0,uSunD.y)*.85)*(1.-uDark*.6);
c=mix(c,cu,m_*uCu);
}
 if(uRay>.01){vec3 sp=normalize(vD-uSunD*dot(vD,uSunD));
float an=atan(dot(sp,normalize(cross(uSunD,vec3(0.,1.,0.)))),sp.y);
float rays=smoothstep(.55,.9,fbm(vec2(an*8.,uT*.01)))*pow(max(dot(vD,uSunD),0.),3.)*smoothstep(-.02,.15,vD.y);
c+=vec3(1.,.86,.62)*rays*uRay*.5;
}if(uLt>.01){float lg=pow(max(dot(vD,normalize(uLd)),0.),18.)*smoothstep(.0,.04,vD.y)*smoothstep(.3,.06,vD.y);
c+=vec3(.85,.85,1.)*lg*uLt*1.4;
}
 if(uRb>.01){vec3 anti=normalize(-uSunD);
float ang=acos(clamp(dot(vD,anti),-1.,1.));
float band=(ang-.70)/.035;
vec3 rb=clamp(vec3(1.-abs(band-1.),1.-abs(band),1.-abs(band+1.)),0.,1.);
c+=rb*.22*uRb*smoothstep(.0,.05,vD.y)*smoothstep(-.4,.6,band+1.6)*(1.-smoothstep(1.6,2.2,abs(band)));
}
 {float lw=smoothstep(.3,.02,uSunD.y)*smoothstep(-.16,.0,uSunD.y)*(1.-uDark);
vec3 ly=mix(vec3(1.,.6,.32),vec3(1.,.62,.66),smoothstep(.0,.08,y));
ly=mix(ly,vec3(.72,.66,.9),smoothstep(.06,.22,y));
c=mix(c,ly*mix(1.,.8,smoothstep(.0,.3,y)),lw*.45*smoothstep(.45,.0,y));
}
 c+=vec3(.1,.1,.09)*exp(-y*16.)*smoothstep(-.1,.2,uSunD.y)*(1.-uDark);
 float nt=smoothstep(.05,-.15,uSunD.y);
 vec2 sp_=vD.xz/(vD.y+.25);
float h1=fract(sin(dot(floor(sp_*160.),vec2(12.9,78.2)))*43758.5),h2=fract(sin(dot(floor(sp_*70.),vec2(39.3,11.1)))*24634.6);
 vec2 f1=fract(sp_*160.)-.5,f2=fract(sp_*70.)-.5;
float st=step(.992,h1)*(.3+.7*fract(h1*91.))*smoothstep(.25,.0,length(f1))+step(.997,h2)*1.3*smoothstep(.22,.0,length(f2));
 vec3 mwd=normalize(vec3(.55,.35,-.75));
float mw=exp(-pow(dot(vD,mwd)*4.,2.))*(.55+.45*fbm(vD.xz*9.+vD.y*4.));
 st+=step(.97,h1)*mw*.9*smoothstep(.25,.0,length(f1));
c+=vec3(.55,.6,.8)*mw*.06*nt*(1.-uDark);
 c=mix(c,mix(vec3(.08,.14,.32),vec3(.01,.02,.08),pow(y,.6)),nt*.9);
c+=mw*nt*vec3(.05,.055,.08)*(1.-uDark);
 c+=vec3(.22,.2,.28)*mw*nt*smoothstep(.05,.35,y)*(1.-cl*.8);
 c+=mix(vec3(1.,.85,.7),vec3(.75,.85,1.),fract(h1*37.+h2*11.))*st*3.2*smoothstep(.04,.3,y)*nt*(1.-cl*.7);
 c+=vec3(1.,.62,.35)*exp(-y*9.)*nt*.45;
c=mix(c,uHor,smoothstep(.2,0.,y)*.75);
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
