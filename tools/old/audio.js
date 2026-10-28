/* ---------- 音：すべてWeb Audioで合成（外部の音源なし）。波と風が土台 ---------- */
const SND={on:true,ctx:null};
function audioInit(){if(SND.ctx)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const ac=new AC();SND.ctx=ac;
 const len=ac.sampleRate*4,mk=type=>{const b=ac.createBuffer(1,len,ac.sampleRate),d=b.getChannelData(0);let l=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;if(type==='brown'){l=(l+.02*w)/1.02;d[i]=l*3.5;}else d[i]=w;}return b;};
 SND.white=mk('white');SND.brown=mk('brown');
 const src=b=>{const s=ac.createBufferSource();s.buffer=b;s.loop=true;s.start(0,Math.random()*3);return s;};
 SND.master=ac.createGain();SND.master.gain.value=0;SND.master.connect(ac.destination);
 SND.master.gain.setTargetAtTime(.9,ac.currentTime+.3,1.5);           // ゆっくりフェードイン
 // 波：低いノイズをゆっくり膨らませる
 const wv=src(SND.brown),wvF=ac.createBiquadFilter();wvF.type='lowpass';wvF.frequency.value=500;SND.waveG=ac.createGain();SND.waveG.gain.value=0;wv.connect(wvF).connect(SND.waveG).connect(SND.master);
 // 風：帯域ノイズ、中心周波数を揺らす
 const wd=src(SND.white),wdF=ac.createBiquadFilter();wdF.type='bandpass';wdF.Q.value=.8;wdF.frequency.value=500;SND.windF=wdF;SND.windG=ac.createGain();SND.windG.gain.value=0;wd.connect(wdF).connect(SND.windG).connect(SND.master);
 // ヨシのそよぎ：高いノイズ
 const rd=src(SND.white),rdF=ac.createBiquadFilter();rdF.type='highpass';rdF.frequency.value=3500;SND.reedG=ac.createGain();SND.reedG.gain.value=0;rd.connect(rdF).connect(SND.reedG).connect(SND.master);
 // 岸の波：寄せては返す
 const sh=src(SND.brown),shF=ac.createBiquadFilter();shF.type='lowpass';shF.frequency.value=900;SND.shoreF=shF;SND.shoreG=ac.createGain();SND.shoreG.gain.value=0;sh.connect(shF).connect(SND.shoreG).connect(SND.master);
 SND.engines=new Map();SND.nextBird=ac.currentTime+4;SND.nextLap=0;}
function pan(x,z){const p=SND.ctx.createStereoPanner();const dx=x-camera.position.x,dz=z-camera.position.z,r=Math.cos(yaw)*dx-Math.sin(yaw)*dz;p.pan.value=Math.max(-1,Math.min(1,r/Math.max(30,Math.hypot(dx,dz))));return p;}
function horn(x,z,d){const ac=SND.ctx,t=ac.currentTime,g=ac.createGain(),f=ac.createBiquadFilter(),vol=Math.min(.35,60/(d+60));f.type='lowpass';f.frequency.value=900;
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.25);g.gain.setValueAtTime(vol,t+2.2);g.gain.linearRampToValueAtTime(0,t+3.2);
 for(const fr of[147,185,220]){const o=ac.createOscillator();o.type='sawtooth';o.frequency.value=fr;o.connect(f);o.start(t);o.stop(t+3.3);}f.connect(g).connect(pan(x,z)).connect(SND.master);}
function bird(x,z,kind,vol){const ac=SND.ctx,t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();o.type='sine';
 if(kind===0){for(let i=0;i<10;i++){o.frequency.setValueAtTime(2600+Math.random()*300,t+i*.06);o.frequency.linearRampToValueAtTime(1900,t+i*.06+.05);}g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.05);g.gain.linearRampToValueAtTime(0,t+.65);o.start(t);o.stop(t+.7);} // カイツブリのような震える声
 else{o.frequency.setValueAtTime(700,t);o.frequency.exponentialRampToValueAtTime(420,t+.35);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.03);g.gain.exponentialRampToValueAtTime(.001,t+.4);o.start(t);o.stop(t+.45);
  const o2=ac.createOscillator();o2.type='triangle';o2.frequency.value=1400;const g2=ac.createGain();g2.gain.value=vol*.2;o2.connect(g2).connect(g);o2.start(t);o2.stop(t+.45);}  // カモのような短い声
 o.connect(g).connect(pan(x,z)).connect(SND.master);}
const prevMoving=new Map();
function audioUpdate(dt,c,W,boats,nearReed){if(!SND.ctx)return;const ac=SND.ctx,now=ac.currentTime,k=.25;
 SND.master.gain.setTargetAtTime(SND.on?.9:0,now,.4);if(!SND.on)return;
 const ws=Math.min(1,W.s/8);
 SND.windG.gain.setTargetAtTime((isFar?.1:.035)+ws*ws*(isFar?.35:.18),now,k);SND.windF.frequency.setTargetAtTime(350+ws*600+120*Math.sin(now*.4),now,k);
 SND.waveG.gain.setTargetAtTime(isFar?0:(.08+ws*.18)*(.65+.35*Math.sin(now*2*Math.PI/7.5)),now,.6);   // 遠景では波は聞こえない
 SND.reedG.gain.setTargetAtTime(isFar?0:nearReed*(.01+ws*.05),now,k);
 if(!isFar&&B.rest&&now>SND.nextLap){const g=SND.shoreG.gain,f=SND.shoreF.frequency;g.cancelScheduledValues(now);g.setValueAtTime(g.value,now);g.linearRampToValueAtTime(.32,now+1.3);g.linearRampToValueAtTime(.05,now+3.6);
  f.cancelScheduledValues(now);f.setValueAtTime(500,now);f.linearRampToValueAtTime(1400,now+1.2);f.linearRampToValueAtTime(2600,now+2.2);f.linearRampToValueAtTime(600,now+3.6);SND.nextLap=now+4+Math.random()*1.5;}
 if(isFar||!B.rest)SND.shoreG.gain.setTargetAtTime(0,now,.8);
 // 船：エンジンは近いときだけ、汽笛は定期船が港を出るとき
 const seen=new Set();for(const b of boats){const m=boatMeshes.get(b.id);const x=m?m.position.x:b.x*S,z=m?m.position.z:b.y*S,d=Math.hypot(x-camera.position.x,z-camera.position.z);seen.add(b.id);
  const was=prevMoving.get(b.id);prevMoving.set(b.id,b.moving);if(!isFar&&b.kind!=='fish'&&was===false&&b.moving&&d<1500)horn(x,z,d);
  let e=SND.engines.get(b.id);const hear=!isFar&&b.moving&&d<(b.kind==='fish'?220:400);
  if(hear&&!e){const o=ac.createOscillator(),f=ac.createBiquadFilter(),g=ac.createGain(),p=ac.createStereoPanner(),lfo=ac.createOscillator(),lg=ac.createGain();
   o.type='sawtooth';o.frequency.value=b.kind==='fish'?72:b.kind==='michigan'?38:48;f.type='lowpass';f.frequency.value=b.kind==='fish'?500:260;g.gain.value=0;
   lfo.frequency.value=b.kind==='fish'?9:5;lg.gain.value=b.kind==='fish'?.5:.2;lfo.connect(lg);o.connect(f).connect(g).connect(p).connect(SND.master);o.start();lfo.start();e={o,g,p,lfo,lg};SND.engines.set(b.id,e);}
  if(e){const vol=hear?Math.min(.12,(b.kind==='fish'?6:14)/(d+20)):0;e.g.gain.setTargetAtTime(vol,now,.5);const dx=x-camera.position.x,dz=z-camera.position.z;e.p.pan.setTargetAtTime(Math.max(-1,Math.min(1,(Math.cos(yaw)*dx-Math.sin(yaw)*dz)/(d+30))),now,.2);
   if(!hear&&e.g.gain.value<.002){e.o.stop();e.lfo.stop();SND.engines.delete(b.id);}}}
 for(const[id,e]of SND.engines)if(!seen.has(id)){e.g.gain.setTargetAtTime(0,now,.3);setTimeout(()=>{try{e.o.stop();e.lfo.stop();}catch(_){}},1500);SND.engines.delete(id);}
 // 水鳥：冬に多く、夜は少ない。岸やヨシの近くでよく鳴く
 if(!isFar&&now>SND.nextBird){const winter=[1,1,.7,.4,.3,.3,.3,.3,.4,.6,.9,1][c.month],night=c.phase<.22||c.phase>.82;
  const rate=(.15+winter*.6+nearReed*.6)*(night?.2:1);SND.nextBird=now+(6+Math.random()*14)/rate;
  const a=Math.random()*6.283,r=40+Math.random()*200;bird(camera.position.x+Math.cos(a)*r,camera.position.z+Math.sin(a)*r,Math.random()<.45?0:1,.05+.06*Math.random());}}
