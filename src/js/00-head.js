import * as THREE from "three";

// 部品をまたいで使う共有の値はここに集める。
// URL に ?debug を付けたときだけ、確認用に window.__floating として外から見えるようにする（公開時は閉じておく）
const G = /[?&]debug(?:[=&]|$)/.test(location.search) ? (window.__floating = {}) : {};
// 点を丸く柔らかく描くための小さな画像（蛍・花びら・落ち葉など）
G.dotTex = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d"),
    gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.45, "rgba(255,255,255,.8)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
})();

var LEAFTX;
function mkLeaf() {
  return cvTex(128, 128, (g, w, h) => {
    g.fillStyle = "#f2f2ee";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 180; i++) {
      const x = Math.random() * w,
        y = Math.random() * h,
        r = 4 + Math.random() * 7;
      const gr = g.createRadialGradient(x, y - r * 0.3, 0, x, y, r);
      gr.addColorStop(0, "rgba(255,255,240,.55)");
      gr.addColorStop(0.6, "rgba(200,200,200,.2)");
      gr.addColorStop(1, "rgba(40,50,40,.4)");
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, r, 0, 7);
      g.fill();
    }
    for (let i = 0; i < 900; i++) {
      g.strokeStyle = `rgba(${Math.random() < 0.5 ? 30 : 255},${Math.random() < 0.5 ? 40 : 255},30,.18)`;
      g.lineWidth = 1;
      const x = Math.random() * w,
        y = Math.random() * h,
        a = Math.random() * 6.3;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4);
      g.stroke();
    }
  });
}

function NEAR_TREE_MAT() {
  if (!LEAFTX) {
    LEAFTX = mkLeaf();
    LEAFTX.wrapS = LEAFTX.wrapT = THREE.RepeatWrapping;
    LEAFTX.repeat.set(3, 3);
  }
  return new THREE.MeshLambertMaterial({ vertexColors: true, map: LEAFTX });
}

// シェーダーで共有する雑音の関数（空・水で使う）：nzH 乱数、nzN なめらかな雑音、nzF4/nzF5 重ね合わせ（4段・5段）
const GLSL_NOISE = `float nzH(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
float nzN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(nzH(i),nzH(i+vec2(1,0)),f.x),mix(nzH(i+vec2(0,1)),nzH(i+1.),f.x),f.y);}
float nzF4(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*nzN(p);p*=2.03;a*=.5;}return s;}
float nzF5(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*nzN(p);p*=2.03;a*=.5;}return s;}`;
