import * as THREE from "three";

// 部品をまたいで使う共有の値はここに集める。
// URL に ?debug を付けたときだけ、確認用に window.__floating として外から見えるようにする（公開時は閉じておく）
const G = /[?&]debug(?:[=&]|$)/.test(location.search) ? (window.__floating = {}) : {};
// three.js の内部シェーダーを文字列で置き換えて改造している箇所の見張り（?debug のときだけ）。
// 置き換え先の目印（#include <…>）が見つからないと、改造が黙って効かなくなるので、コンソールに誤りとして出す。
// 撮影確認（tools/check.py）はコンソールの誤りを拾って失敗にする。
if (window.__floating) {
  const orig = String.prototype.replace;
  String.prototype.replace = function (a, b) {
    if (typeof a === "string" && a.startsWith("#include <") && !this.includes(a)) console.error("[shader] 置き換えの目印が見つかりません：" + a);
    return orig.call(this, a, b);
  };
}
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

// 動かない部品の束ね：グループの中の普通のメッシュを、同じ材質ごとに1つのメッシュへまとめる。
// 見た目は変えずに描画の回数を減らす（沖島の家並み・水上建築のように細かい部品の多いもの）。
// 戻り値：まとめた後のメッシュの数
function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert(),
    byMat = new Map(),
    olds = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || o === root) return;
    if (o.userData.keep) return; // 動かす部品は束ねない
    olds.push(o);
    const k = o.material;
    if (!byMat.has(k)) byMat.set(k, []);
    byMat.get(k).push(o);
  });
  for (const o of olds) o.parent.remove(o);
  const out = [];
  const M = new THREE.Matrix4(),
    N = new THREE.Matrix3(),
    v = new THREE.Vector3();
  for (const [mat, list] of byMat) {
    let n = 0;
    const gs = list.map((o) => {
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
      n += g.attributes.position.count;
      return [o, g];
    });
    const P = new Float32Array(n * 3),
      Nn = new Float32Array(n * 3),
      U = new Float32Array(n * 2);
    let i = 0,
      noShadow = false;
    for (const [o, g] of gs) {
      M.multiplyMatrices(inv, o.matrixWorld);
      N.getNormalMatrix(M);
      const p = g.attributes.position,
        nm = g.attributes.normal,
        uv = g.attributes.uv;
      for (let k = 0; k < p.count; k++, i++) {
        v.fromBufferAttribute(p, k).applyMatrix4(M);
        P.set([v.x, v.y, v.z], i * 3);
        if (nm) {
          v.fromBufferAttribute(nm, k).applyMatrix3(N).normalize();
          Nn.set([v.x, v.y, v.z], i * 3);
        }
        if (uv) U.set([uv.getX(k), uv.getY(k)], i * 2);
      }
      if (o.userData.noShadow) noShadow = true;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(P, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(Nn, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(U, 2));
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = !noShadow;
    m.receiveShadow = true;
    m.userData.noShadow = noShadow;
    root.add(m);
    out.push(m);
  }
  return out.length;
}

// 画面に入っている所だけ描くための区画（実寸6km四方）。湖全体に散らばる景物（家・森・ヨシ・石など）を区画ごとの
// 子に分けると、three.js が画面の外の区画を描かなくなる。映り込みでは遠い区画も省く（52-frame-render.js）
const CHUNK = 6000;
const chunkOf = (x, y) => Math.floor(x / CHUNK) * 4096 + Math.floor(y / CHUNK);
G.chunks = [];
// 動かない InstancedMesh を区画ごとの子に分ける。元の物は親として残し（見え隠れ・位置・材質の切り替えはそのまま効く）、
// 自分では何も描かない。実行中に1本ずつ位置や色を変える物（userData.noChunk）には使わない
function chunkify(mesh) {
  if (!mesh.isInstancedMesh || mesh.userData.noChunk || mesh.count < 200) return;
  const M = new THREE.Matrix4(),
    groups = new Map();
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, M);
    const k = chunkOf(M.elements[12] / S + mesh.position.x / S, M.elements[14] / S + mesh.position.z / S);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(i);
  }
  if (groups.size < 2) return;
  const col = new THREE.Color();
  for (const idx of groups.values()) {
    const c = new THREE.InstancedMesh(mesh.geometry, mesh.material, idx.length);
    idx.forEach((i, j) => {
      mesh.getMatrixAt(i, M);
      c.setMatrixAt(j, M);
      if (mesh.instanceColor) {
        mesh.getColorAt(i, col);
        c.setColorAt(j, col);
      }
    });
    c.castShadow = mesh.castShadow;
    c.receiveShadow = mesh.receiveShadow;
    c.renderOrder = mesh.renderOrder;
    c.userData = { ...mesh.userData, chunkOf: mesh };
    c.computeBoundingSphere();
    mesh.add(c);
    G.chunks.push(c);
  }
  mesh.count = 0;
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -1e7, 0), 0); // 親は描かない（いつも画面の外とみなす）
}
// 置き場所の記録（点検用）：景物ごとに位置（実寸の x, y）と、守るべき決まりを残す。
// 決まり：water＝湖の上、land＝陸か島の上、shore＝岸の近く（約250m以内）。tools/audit.py が数を調べる
const PLACE_LOG = [];
function placeLog(name, rule, pts) {
  PLACE_LOG.push({ name, rule, pts });
}
