import * as THREE from "three";

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
