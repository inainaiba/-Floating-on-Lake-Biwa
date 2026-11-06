// ---------- 山肌の色のシェーダー（TERR_FS_*）：地形の材質（16-terrain-2-mesh.js）に差し込む。処理の順に、傾き→岩肌→浜→森→紅葉→冬→季節のむら→霞→夜
// 傾きによる明暗
const TERR_FS_SLOPE = `// カメラのまわりの細かい網目（nearPatch）がある所では、粗い地形は下に沈めて描く（vNear：0 粗い地形・1 細かい網目・2 島）
// （粗い地形は頂点の計算で網目の下へ沈めてあるので、ここでは切り抜かない）
// ── 山肌の色の重なり ──
// 傾き → 岩肌 → 低地と浜 → 田の区画 → 森（杉林・樹冠・新緑と深緑）→ 紅葉 → 冬枯れと雪 → 霞・雲の影・山の縁の光
vec3 nrm=normalize(cross(dFdx(vec3(vXZ.x,vH,vXZ.y)),dFdy(vec3(vXZ.x,vH,vXZ.y))));
if(nrm.y<0.)nrm=-nrm;
// 山ひだの細部：標高データ（200m間隔）より細かい沢を、斜面の落ちる向きに伸びた筋として描く（実寸で幅約700m・300m・140mの3段）。
// 沢の底ほど暗く（rocc）、平地には付けず、遠くて細かすぎる所（ちらつく距離）では消す
vec3 wn=normalize(vWN); // 頂点の間でなめらかにつないだ向き（三角形ごとの向きを使うと、筋が三角形の境で途切れる）
float rocc=0.,rmt=smoothstep(20.,80.,vH)*smoothstep(.12,.45,length(wn.xz)); // 傾きが約7°〜27°（高さの強調込み）で効き始める
if(rmt>0.){float fw=length(fwidth(vXZ));vec2 dn=normalize(wn.xz+1e-4),pp=vec2(-dn.y,dn.x);
 for(int o=0;o<3;o++){float sc=o==0?.0071:o==1?.0167:.036,w=o==0?.5:o==1?.32:.22; // 作品の1単位は実寸5m
  float fd=1.-smoothstep(.12,.4,fw*sc);
  vec2 q=vec2(dot(vXZ,pp)*sc,dot(vXZ,dn)*sc*.3)+float(o)*17.3+nzN(vXZ*sc*.5)*.8;
  rocc+=(1.-smoothstep(0.,.45,abs(nzN(q)*2.-1.)))*w*fd*smoothstep(.25,.75,nzN(q*vec2(.45,.6)+5.3));} // 沢ごとに深さを変えて、櫛の目のような並びを崩す
 rocc*=rmt;}
vec3 nrmE=normalize(vec3(nrm.x*3.,nrm.y,nrm.z*3.));
float slope=1.-abs(nrm.y);
diffuseColor.rgb*=.78+.5*smoothstep(.0,.6,1.-slope)*.25+.12;
`;
// 岩肌（急な斜面）
const TERR_FS_ROCK = `// 岩肌（急な斜面）
{float rn=nzN(vXZ*.08);
vec3 rock=mix(vec3(.38,.37,.34),vec3(.55,.53,.49),rn)*(.85+.3*fract(sin(dot(floor(vXZ*.7),vec2(3.1,8.7)))*61.));
diffuseColor.rgb=mix(diffuseColor.rgb,rock,smoothstep(.42,.75,slope)*(.45+.4*rn)*smoothstep(10.,40.,vH));
}diffuseColor.rgb*=.5+.75*clamp(dot(nrmE,normalize(vec3(.55,.6,.4))),0.,1.);
float mic=.5+.5*sin(vXZ.x*3.1+sin(vXZ.y*2.7)*2.)*sin(vXZ.y*2.9+sin(vXZ.x*3.3));
mic=mix(mic,fract(sin(dot(floor(vXZ*9.),vec2(12.9,4.1)))*437.),.5);
diffuseColor.rgb*=.9+mic*.2*smoothstep(90.,8.,length(cameraPosition.xz-vXZ));
diffuseColor.rgb*=.85+.15*smoothstep(0.,40.,vH);
diffuseColor.rgb+=vec3(.08,.04,.0)*uLow*smoothstep(20.,120.,vH);
`;
// 浜（砂・礫・岩）と水際の濡れた帯
const TERR_FS_SHORE = `// 浜（砂・礫・岩）と水際の濡れた帯
float beach=1.-smoothstep(.85,1.0+.25*nzN(vXZ*.05),vH);
diffuseColor.rgb*=1.-.25*(1.-smoothstep(.62,.8,vH));
diffuseColor.rgb*=1.-.28*smoothstep(1.05,.75,vH)*smoothstep(.45,.7,vH);
{vec2 bq=vXZ*.0035,bi=floor(bq),bf=fract(bq);
bf=bf*bf*(3.-2.*bf);
float b1=fract(sin(dot(bi,vec2(12.9,7.7)))*437.),b2=fract(sin(dot(bi+vec2(1,0),vec2(12.9,7.7)))*437.),b3=fract(sin(dot(bi+vec2(0,1),vec2(12.9,7.7)))*437.),b4=fract(sin(dot(bi+1.,vec2(12.9,7.7)))*437.);
float sk=mix(mix(b1,b2,bf.x),mix(b3,b4,bf.x),bf.y);
float pb=fract(sin(dot(floor(vXZ*2.2),vec2(3.1,9.7)))*917.);
vec3 sand=mix(vec3(.6,.57,.5),vec3(.88,.85,.76),smoothstep(.6,.9,vH)),grav=mix(vec3(.36,.35,.33),vec3(.58,.56,.52),pb),rock=mix(vec3(.24,.23,.22),vec3(.46,.44,.41),pb*pb);
vec3 bc=sk<.4?sand:sk<.7?mix(sand,grav,smoothstep(.4,.5,sk)):mix(grav,rock,smoothstep(.7,.8,sk));
diffuseColor.rgb=mix(diffuseColor.rgb,bc,beach*.88);
}vec2 pq=vXZ*.06,pi=floor(pq),pf=fract(pq);
pf=pf*pf*(3.-2.*pf);
float ha=fract(sin(dot(pi,vec2(17.1,31.7)))*4375.5),hb=fract(sin(dot(pi+vec2(1,0),vec2(17.1,31.7)))*4375.5),hc=fract(sin(dot(pi+vec2(0,1),vec2(17.1,31.7)))*4375.5),hd=fract(sin(dot(pi+1.,vec2(17.1,31.7)))*4375.5);
float pn=mix(mix(ha,hb,pf.x),mix(hc,hd,pf.x),pf.y);
float pn2=fract(sin(dot(floor(vXZ*.2/*区画OK：畑の区画ごとの色*/),vec2(7.3,11.9)))*1531.7);
vec3 low=mix(vec3(.36,.45,.25),vec3(.5,.47,.32),pn);
{vec2 fq=vXZ*.25;
float fl=step(.08,fract(fq.x))*step(.08,fract(fq.y));
vec3 fc=mix(low,low*vec3(1.08,1.04,.9),step(.5,fract(sin(dot(floor(fq),vec2(3.3,7.7)))*91.)));
diffuseColor.rgb=mix(diffuseColor.rgb,mix(fc*.82,fc,fl)*(.9+pn2*.2),(1.-smoothstep(1.,6.,vH))*.75);
}diffuseColor.rgb*=.95+pn*.1;
vec2 cq=vXZ*.45,ci=floor(cq),cf=fract(cq);
cf=cf*cf*(3.-2.*cf);
float ca=fract(sin(dot(ci,vec2(12.7,47.3)))*2753.1),cb=fract(sin(dot(ci+vec2(1,0),vec2(12.7,47.3)))*2753.1),cc_=fract(sin(dot(ci+vec2(0,1),vec2(12.7,47.3)))*2753.1),cd=fract(sin(dot(ci+1.,vec2(12.7,47.3)))*2753.1);
float cn=mix(mix(ca,cb,cf.x),mix(cc_,cd,cf.x),cf.y);
`;
// 森（杉林・樹冠・新緑と深緑）
const TERR_FS_FOREST = `// 森
float wood=smoothstep(1.2,3.,vH)*(1.-smoothstep(.75,.95,slope));
vec2 c2q=vXZ*1.3,c2i=floor(c2q),c2f=fract(c2q);
c2f=c2f*c2f*(3.-2.*c2f);
float h2a=fract(sin(dot(c2i,vec2(9.1,3.7)))*517.3),h2b=fract(sin(dot(c2i+vec2(1,0),vec2(9.1,3.7)))*517.3),h2c=fract(sin(dot(c2i+vec2(0,1),vec2(9.1,3.7)))*517.3),h2d=fract(sin(dot(c2i+1.,vec2(9.1,3.7)))*517.3);
float cn2=mix(mix(h2a,h2b,c2f.x),mix(h2c,h2d,c2f.x),c2f.y);
cn=mix(cn,cn2,.4);
{float cedar=smoothstep(.42,.78,pn*.6+cn2*.4)*smoothstep(15.,60.,vH);
vec3 wc=mix(vec3(.13,.21,.1),vec3(.3,.38,.18),cn*cn);
wc=mix(wc,vec3(.08,.13,.08)+vec3(.04,.05,.03)*cn,cedar*.6);
{vec2 cq=vXZ*.22,ci=floor(cq),cf=fract(cq)-.5;
cf+=vec2(fract(sin(dot(ci,vec2(1.7,9.2)))*91.),fract(sin(dot(ci,vec2(8.3,2.8)))*91.))*.5-.25;
float cr=1.-smoothstep(.15,.55,length(cf));
float lit=dot(normalize(vec3(cf.x,.6,cf.y)),normalize(vec3(.5,.7,.35)));
wc*=.82+.32*cr*(.6+.4*lit)*smoothstep(160.,20.,length(cameraPosition.xz-vXZ))+.08*(1.-smoothstep(160.,20.,length(cameraPosition.xz-vXZ)));
}wc=mix(wc,wc*vec3(1.3,1.38,1.)+vec3(.035,.045,.02),max(uSpr,0.)*.55*smoothstep(uSpr*1.2+.05,uSpr*1.2-.15,clamp(vH/${(700 * S * VEX).toFixed(2)},0.,1.)));
wc*=1.+min(uSpr,0.)*.18;
diffuseColor.rgb=mix(diffuseColor.rgb,wc,wood*.95);
diffuseColor.rgb*=1.+.25*wood*(dot(nrmE,normalize(vec3(.55,.6,.4)))-.45);
// 中景・遠景の樹冠：木の塊のふくらみ。日の当たる側を明るく、反対を暗く（細かすぎて ちらつく距離では消す）
{vec2 sl=normalize(uSunT.xz+vec2(1e-4));
float fw=length(fwidth(vXZ));
float tc=0.;
for(int o=0;o<3;o++){float sc=o==0?.16:o==1?.055:.02;vec2 q=vXZ*sc,qi=floor(q),qf=fract(q);
 vec2 jt=vec2(fract(sin(dot(qi,vec2(7.7,3.1)))*91.),fract(sin(dot(qi,vec2(2.3,8.9)))*91.))*.5+.25;
 vec2 dd=qf-jt;float r=length(dd);
 float bump=1.-smoothstep(.12,.5,r);
 float face=dot(dd,-sl)/(r+.05);
 tc+=(bump*.6*face-(1.-bump)*.35)*(1.-smoothstep(.25,.6,fw*sc))*(o==0?.5:o==1?.45:.4);}
diffuseColor.rgb*=1.+tc*.5*wood*(1.-uSnow*.6);}
}
// 山ひだの細部の陰影：森の色で塗り替えたあとに、沢の底を暗く、その間の尾根をわずかに明るく（上の rocc）
diffuseColor.rgb*=1.-.75*rocc+.08*rmt;
// 尾根は明るく乾いた色、谷は暗く湿った色（山ひだ）
{float cvv=clamp(vCv,-1.,1.),land_=smoothstep(3.,14.,vH);
diffuseColor.rgb*=1.+land_*(cvv>0.?cvv*.22:cvv*.3);
diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.06,1.03,.9),land_*max(cvv,0.)*.5);
diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.86,.95,1.02),land_*max(-cvv,0.)*.6);}diffuseColor.rgb*=1.-wood*.28*(1.-uSnow*.5*(1.-uSnow*smoothstep(90.,120.,vH)));
`;
// 紅葉
const TERR_FS_AUTUMN = `// 紅葉
vec2 aq=vXZ*.35,ai=floor(aq),af=fract(aq);
af=af*af*(3.-2.*af);
float a1=fract(sin(dot(ai,vec2(12.9,78.2)))*43758.5),a2=fract(sin(dot(ai+vec2(1,0),vec2(12.9,78.2)))*43758.5),a3=fract(sin(dot(ai+vec2(0,1),vec2(12.9,78.2)))*43758.5),a4=fract(sin(dot(ai+1.,vec2(12.9,78.2)))*43758.5);
float nz=mix(mix(a1,a2,af.x),mix(a3,a4,af.x),af.y);
diffuseColor.rgb=mix(diffuseColor.rgb,mix(mix(vec3(.62,.22,.07),vec3(.78,.5,.1),fract(nz*7.)),vec3(.55,.12,.06),step(.85,fract(nz*13.))),uAut*.85*smoothstep(.45,.62,nz)*smoothstep(${(20 * S * VEX).toFixed(2)},${(120 * S * VEX).toFixed(2)},vH)*smoothstep(1.-uAut*1.1,1.15-uAut*1.1,1.-clamp(vH/${(700 * S * VEX).toFixed(2)},0.,1.)+(dot(nrmE,normalize(vec3(.55,.6,.4)))-.5)*.25));
`;
// 冬枯れと雪
const TERR_FS_WINTER = `// 冬枯れと雪
diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.05,.92,.75),uWin);
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.9,.92,.94)*(.85+.15*mic),uSL*(1.-smoothstep(.55,.9,slope))*smoothstep(.3,1.2,vH));
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.93,.94,.96),uSnow*smoothstep(${(600 * S * VEX).toFixed(2)},${(800 * S * VEX).toFixed(2)},vH+(fract(sin(dot(floor(vXZ*.6),vec2(3.,7.)))*91.)-.5)*${(120 * S * VEX).toFixed(2)}));
`;
// 遠くの霞・雲の影・朝夕の山の縁の光
// 山肌の季節のむら（控えめに）：4月は斜面に点々と山桜の淡い桃色、5〜6月は新緑の明るい黄緑の濃淡、
// 12〜2月は中腹から上に薄く雪がまだらに残る（山頂の雪とは別に）
const TERR_FS_SEASON = `{float lnd=smoothstep(30.,90.,vH)*(1.-smoothstep(${(900 * S * VEX).toFixed(2)},${(1100 * S * VEX).toFixed(2)},vH));
 if(uSea.x>0.){float sk=smoothstep(.72,.86,nzN(vXZ*.09))*smoothstep(.4,.6,nzN(vXZ*.011+5.1));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.93,.82,.84),sk*lnd*uSea.x*.55);}
 if(uSea.y>0.){float sh=nzN(vXZ*.018+2.3)*.65+nzN(vXZ*.07)*.35;diffuseColor.rgb*=mix(vec3(1.),mix(vec3(1.12,1.16,.92),vec3(.92,.98,.9),sh),lnd*uSea.y*.5);}
 if(uSea.z>0.){float dz=smoothstep(.55,.75,nzN(vXZ*.03+9.)*.6+nzN(vXZ*.12)*.4)*smoothstep(${(300 * S * VEX).toFixed(2)},${(550 * S * VEX).toFixed(2)},vH);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.88,.9,.93),dz*uSea.z*.45);}
}`;
const TERR_FS_HAZE = `// 遠くの霞、雲の影、朝夕の山の縁の光
{float dc_=length(cameraPosition.xz-vXZ);
float hz=1.-exp(-dc_/${glf(LOOK.hazeDist)});
hz*=(.55+.45*smoothstep(5.,160.,vH));
{float cs=smoothstep(.35,.8,.5+.5*sin((vXZ.x+uCT*2.6)*.0045+sin(vXZ.y*.0031)*2.)*sin((vXZ.y+uCT*1.3)*.0038+sin(vXZ.x*.0027)*1.7));
diffuseColor.rgb*=(1.-cs*${glf(LOOK.cloudShadowLand)}*uCSh*clamp(uSunT.y*3.,0.,1.))*(1.+(1.-cs)*${glf(LOOK.sunlitBoost)}*uCSh*clamp(uSunT.y*3.,0.,1.));
float low=smoothstep(.22,.02,uSunT.y)*smoothstep(-.1,.02,uSunT.y);
vec2 sd2=normalize(uSunT.xz+1e-4);
float face=pow(max(dot(normalize(nrm.xz+1e-4),sd2),0.),2.)*smoothstep(.05,.5,1.-nrm.y);
diffuseColor.rgb+=vec3(1.,.55,.3)*face*low*smoothstep(40.,180.,vH)*.35;
}// 遠い山ほど、白いかすみではなく暗い青灰の影に沈む
diffuseColor.rgb=mix(diffuseColor.rgb,mix(uHaze*1.1,uHaze*vec3(.5,.56,.68),smoothstep(${glf(LOOK.farDarkFrom)},${glf(LOOK.farDarkTo)},dc_)),clamp(hz,0.,1.)*${glf(LOOK.hazeAmount)});
diffuseColor.rgb*=1.+.12*hz;
// 空気の層：谷や山すそ（低い所）ほど霞がたまり、尾根が一枚ずつ浮かぶ。朝の霧の日は濃く
{float vf=(1.-smoothstep(8.,90.,vH))*smoothstep(40.,350.,dc_)*(.06+.16*uMist);diffuseColor.rgb=mix(diffuseColor.rgb,uHaze*1.18,clamp(vf,0.,1.));}
}`;
// 夜の山並み（霧をかけた後の色に重ねる。夜は光が弱く、色を変えても暗さに埋もれるため）：
// 月に向いた斜面に青白い光の縁、遠い稜線ほど夜空の地平の色に近づけて、重なる山を見分けられるように
const TERR_FS_NIGHT = `if(uNt>0.){float dn_=length(cameraPosition.xz-vXZ);vec2 md=normalize(uMoonT.xz+1e-4);
 float fm=pow(max(dot(normalize(nrm.xz+1e-4),md),0.),2.)*smoothstep(.05,.5,1.-nrm.y)*smoothstep(40.,180.,vH);
 vec3 hz_=linearToOutputTexel(vec4(uHaze*(1.15+.6*uMoonL),1.)).rgb;
 gl_FragColor.rgb+=vec3(.1,.12,.17)*fm*uMoonL*uNt*(1.-smoothstep(500.,5000.,dn_));
 gl_FragColor.rgb=mix(gl_FragColor.rgb,hz_,uNt*smoothstep(200.,3500.,dn_)*.72);}`; // 作品の1単位は実寸5m（約1kmから17km先で地平の色へ）
