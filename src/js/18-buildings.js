/* ---------- 建物：10種類（水土空間 note「水上建築」の浮遊型を抽象化） ---------- */
const WOODTX = (() => {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#86643f";
  g.fillRect(0, 0, 64, 256);
  for (let x = 0; x < 64; x += 8) {
    g.fillStyle = "rgba(30,18,8,.35)";
    g.fillRect(x, 0, 1, 256);
  }
  for (let i = 0; i < 220; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? 40 : 150},${Math.random() < 0.5 ? 25 : 110},10,.12)`;
    g.fillRect(Math.random() * 64, Math.random() * 256, 1 + Math.random() * 2, 8 + Math.random() * 30);
  }
  for (let i = 0; i < 64; i += 8) {
    g.fillStyle = `rgba(0,0,0,${0.15 + Math.random() * 0.15})`;
    g.fillRect(i, 0, 1, 256);
  }
  for (let i = 0; i < 300; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? "40,25,10" : "160,120,80"},.18)`;
    g.fillRect(Math.random() * 64, Math.random() * 256, 1 + Math.random() * 6, 1);
  }
  const tx = new THREE.CanvasTexture(c);
  tx.colorSpace = THREE.SRGBColorSpace;
  tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
  return tx;
})();
const MAT = {
  body: () => new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: 0.9, map: G.plTx || null }),
  wood: () => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, map: WOODTX }),
  dark: () => new THREE.MeshStandardMaterial({ color: 0x34343a, roughness: 0.8 }),
  glass: () =>
    new THREE.MeshStandardMaterial({
      color: 0x8fa9b8,
      roughness: 0.05,
      metalness: 0.25,
      emissive: 0x000000,
      transparent: true,
      opacity: 0.6,
    }),
};
function gable(L, W, H, m) {
  const s = new THREE.Shape([
    new THREE.Vector2(-W / 2, 0),
    new THREE.Vector2(W / 2, 0),
    new THREE.Vector2(0, H),
  ]);
  const g = new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: false })
    .translate(0, 0, -L / 2)
    .rotateY(Math.PI / 2);
  return new THREE.Mesh(g, m);
}
const bbox = (w, h, d) => {
  const r = Math.min(0.12, w * 0.08, h * 0.08, d * 0.08),
    s = new THREE.Shape();
  const x = w / 2 - r,
    y = h / 2 - r;
  s.moveTo(-x, -h / 2);
  s.lineTo(x, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -y);
  s.lineTo(w / 2, y);
  s.quadraticCurveTo(w / 2, h / 2, x, h / 2);
  s.lineTo(-x, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, y);
  s.lineTo(-w / 2, -y);
  s.quadraticCurveTo(-w / 2, -h / 2, -x, -h / 2);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: d - 2 * r,
    bevelEnabled: true,
    bevelSize: r,
    bevelThickness: r,
    bevelSegments: 2,
    curveSegments: 2,
  }).translate(0, 0, -(d - 2 * r) / 2);
  g.computeVertexNormals();
  return g;
};
const box = (w, h, d, m, x = 0, y = 0, z = 0) => {
  // 細すぎる部材は遠目にちらつくので、最小の太さをそろえる
  w = Math.max(w, 0.06);
  h = Math.max(h, 0.06);
  d = Math.max(d, 0.06);
  const o = new THREE.Mesh(w > 0.5 && h > 0.5 && d > 0.5 ? bbox(w, h, d) : new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  return o;
};
function hullShape(L, W, H, m, bow = 0.25) {
  const s = new THREE.Shape();
  s.moveTo(-L / 2, 0);
  s.lineTo(L / 2 - L * bow * 0.4, 0);
  s.quadraticCurveTo(L / 2, 0, L / 2, H);
  s.lineTo(-L / 2, H);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: W, bevelEnabled: false }).translate(0, -H * 0.35, -W / 2);
  return new THREE.Mesh(g, m);
}
// 漂い方のパラメータ：draft喫水(流れに乗る) wind受風 align縦横比(向きを揃える速さ) rock揺れやすさ rudder舵 mass重さ reeds=ヨシ帯に入れる
const rod = (a, b, r, m) => {
  const A = new THREE.Vector3(...a),
    Bv = new THREE.Vector3(...b),
    L = A.distanceTo(Bv),
    o = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(r, 0.045), Math.max(r, 0.045), L, 6), m);
  o.position.copy(A).add(Bv).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), Bv.clone().sub(A).normalize());
  return o;
};
// 細い部材をまとめて並べる道具
const posts = (g, m, pts, y0, y1, r = 0.05) => pts.forEach(([x, z]) => g.add(rod([x, y0, z], [x, y1, z], r, m)));
const ringPts = (R, n, a0 = 0) => Array.from({ length: n }, (_, i) => [Math.cos(a0 + (i / n) * Math.PI * 2) * R, Math.sin(a0 + (i / n) * Math.PI * 2) * R]);
const ring = (g, m, R, y, r = 0.03, seg = 64) => {
  const t = new THREE.Mesh(new THREE.TorusGeometry(R, r, 5, seg), m);
  t.rotation.x = Math.PI / 2;
  t.position.y = y;
  g.add(t);
  return t;
};
// 灯り：建物の内側に置く光る面（夜だけ内側から明るくなる）
const glowBox = (g, m, w, h, d, x, y, z) => {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m.glow);
  o.position.set(x, y, z);
  o.castShadow = false;
  o.userData.noShadow = true;
  g.add(o);
  return o;
};
const BUILDINGS = [
  {
    name: "浮かぶ学校",
    line: "マココの浮かぶ学校",
    p: { draft: 0.5, wind: 1.1, align: 0.4, rock: 0.55, rudder: 0.6, mass: 0.7 },
    make(m) {
      const g = new THREE.Group(),
        blue = new THREE.MeshStandardMaterial({ color: 0x2f5fa8, roughness: 0.6 });
      // 浮き：青い樽を並べる
      for (let i = -4; i <= 4; i++) {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 9.6, 14), blue);
        c.rotation.z = Math.PI / 2;
        c.position.set(0, 0.2, i * 1.15);
        g.add(c);
      }
      // 床：細い板を並べる
      for (let i = -27; i <= 27; i++) g.add(box(10.6, 0.08, 0.17, m.wood, 0, 0.72, i * 0.2));
      // A形の骨組み：細い垂木を細かく並べる
      const H = 10.6,
        Wb = 5.2;
      for (let x = -5; x <= 5.001; x += 0.5)
        for (const s of [-1, 1]) g.add(rod([x, 0.8, s * Wb], [x, H, 0], x % 2.5 === 0 ? 0.07 : 0.035, m.wood));
      // 下階の壁：細い横板のルーバー
      for (let k = 0; k < 16; k++) {
        const y = 1 + k * 0.17,
          w = Wb * (1 - (y - 0.8) / (H - 0.8));
        for (const s of [-1, 1]) g.add(box(10.2, 0.025, 0.11, m.wood, 0, y, s * w));
      }
      // 中階の床と、上部の屋根（細い母屋の上に薄い屋根面）
      g.add(box(10.2, 0.12, 7.4, m.wood, 0, 3.6));
      g.add(box(10.2, 0.1, 3.4, m.wood, 0, 7.2));
      for (let k = 0; k < 12; k++) {
        const y = 3.8 + k * 0.5,
          w = Wb * (1 - (y - 0.8) / (H - 0.8));
        for (const s of [-1, 1]) g.add(box(10.4, 0.04, 0.05, m.wood, 0, y, s * (w + 0.05)));
      }
      for (const s of [-1, 1]) {
        const y = 7.6,
          w = Wb * (1 - (y - 0.8) / (H - 0.8));
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(10.6, Math.hypot(H - y, w) + 0.3), blue);
        pl.material.side = THREE.DoubleSide;
        pl.position.set(0, (y + H) / 2, (s * w) / 2);
        pl.rotation.set(s * -(Math.PI / 2 - Math.atan2(H - y, w)), 0, 0);
        g.add(pl);
      }
      // 妻面：細い縦格子
      for (const x of [-5.05, 5.05])
        for (let z = -4.6; z <= 4.6; z += 0.35) {
          const top = H - (Math.abs(z) / Wb) * (H - 0.8);
          if (top > 1.2) g.add(box(0.03, top - 0.9, 0.05, m.wood, x, (top + 0.9) / 2, z));
        }
      // 灯り：教室の中と、頂部の小屋裏
      glowBox(g, m, 9.4, 2.2, 6.6, 0, 2.2, 0);
      glowBox(g, m, 9.4, 1.4, 2.2, 0, 8.2, 0);
      return g;
    },
    L: 12,
    lamp: [0, 2.2, 0],
  },
  {
    name: "漏斗の舞台",
    line: "川に浮かぶ白い漏斗の舞台",
    p: { draft: 0.4, wind: 1.2, align: 0.3, rock: 0.7, rudder: 0.7, mass: 0.4 },
    make(m) {
      const g = new THREE.Group(),
        blue = new THREE.MeshStandardMaterial({ color: 0x2f5fa8, roughness: 0.6 }),
        fab = new THREE.MeshStandardMaterial({ color: 0xf7f6f1, emissive: 0x000000, roughness: 0.85, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
      glassMats.push(fab);
      for (let i = -3; i <= 3; i++) {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 8.4, 14), blue);
        c.rotation.z = Math.PI / 2;
        c.position.set(0, 0.15, i * 0.95);
        g.add(c);
      }
      for (let i = -17; i <= 17; i++) g.add(box(8.8, 0.08, 0.18, m.wood, 0, 0.62, i * 0.2));
      // 柱：細い柱を密に。梁は二重の細材
      const px = [-4.2, -2.8, -1.4, 0, 1.4, 2.8, 4.2];
      for (const x of px) for (const z of [-3.2, 3.2]) g.add(rod([x, 0.7, z], [x, 8.6, z], x === -4.2 || x === 4.2 ? 0.07 : 0.045, m.wood));
      for (const z of [-3.2, -1.6, 0, 1.6, 3.2]) for (const x of [-4.2, 4.2]) g.add(rod([x, 0.7, z], [x, 8.6, z], 0.045, m.wood));
      for (const y of [3.4, 3.6, 8.4, 8.6])
        for (const s of [-1, 1]) {
          g.add(box(8.5, 0.05, 0.05, m.wood, 0, y, s * 3.2));
          g.add(box(0.05, 0.05, 6.5, m.wood, s * 4.2, y, 0));
        }
      // 方杖：細い斜材
      for (const x of px.slice(1, -1))
        for (const s of [-1, 1]) g.add(rod([x - 0.6, 8.4, s * 3.2], [x + 0.6, 7.4, s * 3.2], 0.025, m.wood));
      // 漏斗の膜：上から吊る。内側に灯りを入れて膜ごと光る
      const f = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.6, 1, 4, 6, true), fab);
      f.rotation.y = Math.PI / 4;
      f.scale.set(5.9, 3.2, 4.4);
      f.position.y = 6.8;
      g.add(f);
      // 膜を吊る細いケーブル
      for (const x of [-2.1, 0, 2.1]) for (const s of [-1, 1]) g.add(rod([x, 8.4, s * 3.2], [x * 0.7, 5.3, s * 1.5], 0.012, m.dark));
      const lid = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 6.4), fab);
      lid.rotation.x = -Math.PI / 2;
      lid.position.y = 8.62;
      g.add(lid);
      // 舞台の床の縁と客席の段
      for (let k = 0; k < 3; k++) g.add(box(7.6 - k * 0.6, 0.12, 0.6, m.wood, 0, 0.75 + k * 0.25, -2.6 + k * 0.6));
      return g;
    },
    L: 9,
    lamp: [0, 5.4, 0],
  },
  {
    name: "葦の屋根",
    line: "水に浮かぶ屋根だけの小屋",
    p: { draft: 0.3, wind: 1, align: 0.3, rock: 0.8, rudder: 0.9, mass: 0.3, reeds: true },
    make(m) {
      const g = new THREE.Group(),
        th = new THREE.MeshStandardMaterial({
          color: 0xd8b27a,
          roughness: 1,
          map:
            G.thTx ||
            (G.thTx = cvTex(128, 128, (c, w, h) => {
              c.fillStyle = "#b89a6a";
              c.fillRect(0, 0, w, h);
              for (let i = 0; i < 900; i++) {
                const v = 110 + Math.random() * 90;
                c.strokeStyle = `rgb(${v},${(v * 0.82) | 0},${(v * 0.55) | 0})`;
                c.lineWidth = 1;
                const x = Math.random() * w;
                c.beginPath();
                c.moveTo(x, Math.random() * h);
                c.lineTo(x + (Math.random() - 0.5) * 3, Math.random() * h);
                c.stroke();
              }
            })),
        });
      for (let i = -15; i <= 15; i++) g.add(box(14, 0.1, 0.19, m.wood, 0, 0.45, i * 0.21));
      // 細い柱を細かく並べる
      for (let x = -6; x <= 6.001; x += 1.5) for (const z of [-2.3, 2.3]) g.add(rod([x, 0.5, z], [x, 3.05, z], 0.06, m.wood));
      g.add(box(13, 0.08, 0.12, m.wood, 0, 3.05, 2.3));
      g.add(box(13, 0.08, 0.12, m.wood, 0, 3.05, -2.3));
      // 屋根：薄い茅の面と、その下に見える細い垂木
      const r = gable(14.4, 8, 3.5, th);
      r.position.y = 2.75;
      r.scale.y = 1;
      g.add(r);
      for (let x = -6.8; x <= 6.801; x += 0.4) for (const s of [-1, 1]) g.add(rod([x, 2.72, s * 3.95], [x, 6.2, 0], 0.025, m.wood));
      g.add(rod([-7.2, 6.2, 0], [7.2, 6.2, 0], 0.06, m.wood));
      // 妻の細い格子
      for (const x of [-7.15, 7.15]) for (let z = -3.4; z <= 3.4; z += 0.45) {
        const top = 2.75 + 3.45 * (1 - Math.abs(z) / 4);
        g.add(rod([x, 2.75, z], [x, top, z], 0.02, m.wood));
      }
      // 灯り：棟から細い紐で吊った行灯
      g.add(rod([0, 6.1, 0], [0, 3.6, 0], 0.01, m.dark));
      const an = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.9, 12), m.glow);
      an.position.set(0, 3.15, 0);
      g.add(an);
      for (const x of [-3.5, 3.5]) {
        g.add(rod([x, 6.1, 0], [x, 4.1, 0], 0.01, m.dark));
        const a2 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.55, 10), m.glow);
        a2.position.set(x, 3.8, 0);
        g.add(a2);
      }
      return g;
    },
    L: 14,
    lamp: [0, 3.2, 0],
  },
  {
    name: "白い幕の環",
    line: "海に浮かぶ白いカーテンの輪",
    p: { draft: 0.35, wind: 1.3, align: 0, rock: 0.6, rudder: 0.5, mass: 0.45 },
    make(m) {
      const g = new THREE.Group(),
        wh = new THREE.MeshStandardMaterial({ color: 0xf2f1ec, roughness: 0.6 });
      const deck = new THREE.Mesh(new THREE.CylinderGeometry(9.2, 9.2, 0.5, 72, 1), wh);
      deck.position.y = 0.45;
      g.add(deck);
      const pool = new THREE.Mesh(new THREE.CylinderGeometry(6.8, 6.8, 0.52, 64), m.dark);
      pool.position.y = 0.46;
      g.add(pool);
      // 細い柱を48本、上下に細い輪
      posts(g, wh, ringPts(8.6, 48), 0.7, 4.6, 0.04);
      ring(g, wh, 8.6, 4.6, 0.045, 96);
      ring(g, wh, 8.6, 4.35, 0.025, 96);
      // カーテンレールから吊る幕：内側の灯りで幕ごとほのかに光る
      const cg = new THREE.CylinderGeometry(8.75, 8.95, 3.7, 128, 8, true),
        p = cg.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i),
          z = p.getZ(i),
          y = p.getY(i),
          a = Math.atan2(z, x),
          k = 1 + 0.016 * Math.sin(a * 96) + 0.02 * Math.sin(a * 7 + y) * (0.5 - y / 3.7);
        p.setX(i, x * k);
        p.setZ(i, z * k);
      }
      cg.computeVertexNormals();
      const cm = new THREE.MeshStandardMaterial({ color: 0xf6f4ee, roughness: 0.9, transparent: true, opacity: 0.62, emissive: 0x000000, side: THREE.DoubleSide, depthWrite: false });
      glassMats.push(cm);
      const cu = new THREE.Mesh(cg, cm);
      cu.position.y = 2.55;
      g.add(cu);
      // 水盤の縁の細い灯りの線
      const lr = new THREE.Mesh(new THREE.TorusGeometry(6.85, 0.05, 4, 96), m.glow);
      lr.rotation.x = Math.PI / 2;
      lr.position.y = 0.74;
      g.add(lr);
      return g;
    },
    L: 18,
    noWL: true,
    lamp: [0, 2.4, 0],
  },
  {
    name: "劇場",
    line: "世界劇場",
    p: { draft: 0.6, wind: 1.2, align: 0.2, rock: 0.6, rudder: 0.4, mass: 0.8 },
    make(m) {
      const g = new THREE.Group();
      g.add(box(22, 1.8, 22, m.dark, 0, 0.2));
      // 本体：細い縦の羽目板で覆う
      g.add(box(9.8, 12.6, 9.8, m.body, 0, 7.6));
      for (let k = -24; k <= 24; k++)
        for (const s of [-1, 1]) {
          g.add(box(0.06, 12.6, 0.06, m.wood, k * 0.2, 7.6, s * 4.93));
          g.add(box(0.06, 12.6, 0.06, m.wood, s * 4.93, 7.6, k * 0.2));
        }
      for (let i = 0; i < 4; i++) g.add(box(10.1, 0.12, 10.1, m.wood, 0, 3 + i * 3));
      // 細長い窓：内側の灯りが縦のスリットからこぼれる
      for (const y of [5.2, 8.2, 11.2])
        for (let k = -3; k <= 3; k += 2)
          for (const s of [-1, 1]) {
            glowBox(g, m, 0.35, 1.6, 0.05, k * 1.1, y, s * 4.97);
            glowBox(g, m, 0.05, 1.6, 0.35, s * 4.97, y, k * 1.1);
          }
      // 八角の頂塔：細い柱と連続窓。夜は頂部が灯籠のように灯る
      const o = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.4, 8), m.wood);
      o.position.y = 14.1;
      g.add(o);
      glowBox(g, m, 5.6, 3.2, 5.6, 0, 15.9, 0).geometry = new THREE.CylinderGeometry(3.9, 3.9, 3.2, 8);
      posts(g, m.wood, ringPts(4.1, 24, Math.PI / 8), 14.3, 17.6, 0.05);
      const o2 = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 4.3, 0.3, 8), m.wood);
      o2.position.y = 17.7;
      g.add(o2);
      const r = new THREE.Mesh(new THREE.ConeGeometry(4.6, 3.2, 8), m.roof);
      r.position.y = 19.45;
      g.add(r);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), m.roof);
      b.position.y = 21.4;
      g.add(b);
      const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4), m.dark);
      pl.position.y = 22.4;
      g.add(pl);
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.8), new THREE.MeshStandardMaterial({ color: 0xb03a2e, side: THREE.DoubleSide }));
      fl.position.set(0.72, 23.1, 0);
      g.add(fl);
      return g;
    },
    L: 22,
    lamp: [0, 15.9, 0],
  },
  {
    name: "泡",
    line: "Rotterdam Floating Pavilion",
    p: { draft: 0.5, wind: 1, align: 0, rock: 0.5, rudder: 0.5, mass: 0.7 },
    make(m) {
      const g = new THREE.Group(),
        wh = new THREE.MeshStandardMaterial({ color: 0xefeee9, roughness: 0.55 }),
        rib = new THREE.MeshStandardMaterial({ color: 0xf6f6f2, roughness: 0.4 });
      const dk = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 1.2, 96), wh);
      dk.position.y = 0.3;
      g.add(dk);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(15.05, 15.05, 0.5, 96, 1, true), m.dark);
      band.position.y = 0.1;
      g.add(band);
      ring(g, rib, 14.6, 2, 0.03, 128);
      ring(g, rib, 14.6, 1.5, 0.02, 128);
      posts(g, rib, ringPts(14.6, 96), 0.9, 2, 0.02);
      [
        [0, -5, 7],
        [-5, 5, 6],
        [6, 4, 5],
      ].forEach(([x, z, r]) => {
        const d = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), m.glass.clone());
        d.material.transparent = true;
        d.material.opacity = 0.38;
        d.material.color.set(0xe6edef);
        d.material.depthWrite = false;
        glassMats.push(d.material);
        d.position.set(x, 0.9, z);
        g.add(d);
        // 細いリブを密に（経線24本・緯線5本）
        for (let k = 0; k < 24; k++) {
          const a = new THREE.Mesh(new THREE.TorusGeometry(r, 0.03, 4, 40, Math.PI), rib);
          a.rotation.y = (k / 24) * Math.PI;
          a.position.set(x, 0.9, z);
          g.add(a);
        }
        for (const f of [0.2, 0.4, 0.6, 0.78, 0.92]) {
          const ri = new THREE.Mesh(new THREE.TorusGeometry(r * Math.cos(Math.asin(f)), 0.025, 4, 64), rib);
          ri.rotation.x = Math.PI / 2;
          ri.position.set(x, 0.9 + r * f, z);
          g.add(ri);
        }
        // 内部：床の上の柔らかな光の円
        const fl = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.06, 40), m.glow);
        fl.position.set(x, 0.95, z);
        g.add(fl);
      });
      return g;
    },
    L: 30,
    noWL: true,
    lamp: [0, 3, 0],
  },
  {
    name: "水上の塔",
    line: "湖に立つ見晴らしの塔",
    p: { draft: 0.6, wind: 1.4, align: 0.1, rock: 0.7, rudder: 0.6, mass: 0.6 },
    make(m) {
      const g = new THREE.Group(),
        gl = new THREE.MeshStandardMaterial({ color: 0xd6e2e6, roughness: 0.15, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
      for (let i = -24; i <= 24; i++) g.add(box(10, 0.08, 0.19, m.wood, 0, 0.62, i * 0.2));
      // 4本の主柱を、細い4本組の柱にして、細い斜材で組む
      for (const x of [-1.8, 1.8])
        for (const z of [-1.8, 1.8]) for (const dx of [-0.08, 0.08]) for (const dz of [-0.08, 0.08]) g.add(rod([x + dx, 0.7, z + dz], [x + dx, 16.8, z + dz], 0.035, m.wood));
      for (let y = 1; y < 16.5; y += 1.9)
        for (const s of [-1, 1]) {
          g.add(rod([-1.8, y, s * 1.8], [1.8, y + 1.9, s * 1.8], 0.02, m.wood));
          g.add(rod([1.8, y, s * 1.8], [-1.8, y + 1.9, s * 1.8], 0.02, m.wood));
          g.add(rod([s * 1.8, y, -1.8], [s * 1.8, y + 1.9, 1.8], 0.02, m.wood));
          g.add(rod([s * 1.8, y, 1.8], [s * 1.8, y + 1.9, -1.8], 0.02, m.wood));
          g.add(box(3.7, 0.04, 0.04, m.wood, 0, y, s * 1.8));
          g.add(box(0.04, 0.04, 3.7, m.wood, s * 1.8, y, 0));
        }
      // 中段の広がった床とガラスのスカート
      g.add(box(7.6, 0.12, 7.6, m.wood, 0, 5.4));
      const sk = new THREE.Mesh(new THREE.CylinderGeometry(2.6 * 1.414, 4.6 * 1.414, 3.4, 4, 1, true), gl);
      sk.rotation.y = Math.PI / 4;
      sk.position.y = 7.2;
      g.add(sk);
      for (let k = -8; k <= 8; k++)
        for (const s of [-1, 1]) {
          const u = k / 8;
          g.add(rod([u * 4.6, 5.5, s * 4.6], [u * 2.6, 8.9, s * 2.6], 0.018, m.wood));
          g.add(rod([s * 4.6, 5.5, u * 4.6], [s * 2.6, 8.9, u * 2.6], 0.018, m.wood));
        }
      g.add(box(3.9, 0.12, 3.9, m.wood, 0, 8.9));
      g.add(box(3.9, 0.12, 3.9, m.wood, 0, 12.4));
      // 頂部の見晴らし台：細い方立のガラス箱。夜は塔の頂が灯る
      const cage = new THREE.Mesh(new THREE.BoxGeometry(4, 4.2, 4), gl);
      cage.position.y = 14.6;
      g.add(cage);
      for (let k = -5; k <= 5; k++)
        for (const s of [-1, 1]) {
          g.add(box(0.03, 4.2, 0.03, m.wood, k * 0.39, 14.6, s * 2));
          g.add(box(0.03, 4.2, 0.03, m.wood, s * 2, 14.6, k * 0.39));
        }
      g.add(box(4.3, 0.1, 4.3, m.wood, 0, 16.75));
      glowBox(g, m, 3.4, 0.1, 3.4, 0, 16.6, 0);
      glowBox(g, m, 1.2, 1.2, 1.2, 0, 15.6, 0).geometry = new THREE.CylinderGeometry(0.45, 0.45, 1.1, 16);
      // 細い階段
      for (let y = 1; y < 12.4; y += 0.3) g.add(box(0.7, 0.03, 0.18, m.wood, 1.8 - (Math.floor(y / 3) % 2) * 3.6, y, -1.5 + ((y % 3) / 3) * 3));
      // 床の手すり
      for (const s of [-1, 1]) {
        g.add(box(9.6, 0.04, 0.04, m.wood, 0, 1.6, s * 4.8));
        g.add(box(0.04, 0.04, 9.6, m.wood, s * 4.8, 1.6, 0));
        for (let k = -4.8; k <= 4.801; k += 0.6) {
          g.add(box(0.03, 0.9, 0.03, m.wood, k, 1.15, s * 4.8));
          g.add(box(0.03, 0.9, 0.03, m.wood, s * 4.8, 1.15, k));
        }
      }
      return g;
    },
    L: 10,
    lamp: [0, 15.6, 0],
  },
  {
    name: "網の三角",
    line: "白い格子と網の三角の浮き床",
    p: { draft: 0.3, wind: 0.9, align: 0.3, rock: 0.9, rudder: 0.8, mass: 0.3 },
    make(m) {
      const g = new THREE.Group(),
        wh = new THREE.MeshStandardMaterial({ color: 0xf4f3ee, roughness: 0.5 });
      const R = 6.2,
        P = [0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
          return [Math.cos(a) * R, Math.sin(a) * R];
        });
      const fl = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.4, 3), wh);
      fl.rotation.y = Math.PI / 2;
      fl.position.y = 0.45;
      g.add(fl);
      const H = 5.2,
        net = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
          depthWrite: false,
          map:
            G.netTx2 ||
            (G.netTx2 = cvTex(256, 256, (c, w, h) => {
              c.fillStyle = "#000";
              c.fillRect(0, 0, w, h);
              c.strokeStyle = "#fff";
              c.lineWidth = 1.5;
              for (let i = 0; i < 16; i++) {
                c.beginPath();
                c.arc(128, 128, 8 * i, 0, 7);
                c.stroke();
              }
              for (let a = 0; a < 24; a++) {
                c.beginPath();
                c.moveTo(128, 128);
                c.lineTo(128 + Math.cos((a / 24) * 6.28) * 180, 128 + Math.sin((a / 24) * 6.28) * 180);
                c.stroke();
              }
            })),
        });
      net.alphaMap = net.map;
      // 細い白い格子：辺を8分割、上面は中心へ集まる
      for (let i = 0; i < 3; i++) {
        const [a, b] = [P[i], P[(i + 1) % 3]];
        g.add(rod([a[0], 0.7, a[1]], [b[0], 0.7, b[1]], 0.05, m.body));
        g.add(rod([a[0], H, a[1]], [b[0], H, b[1]], 0.05, m.body));
        g.add(rod([a[0], 0.7, a[1]], [a[0], H, a[1]], 0.06, m.body));
        for (let k = 1; k < 8; k++) {
          const u = k / 8,
            x = a[0] + (b[0] - a[0]) * u,
            z = a[1] + (b[1] - a[1]) * u;
          g.add(rod([x, 0.7, z], [x, H, z], 0.025, m.body));
          g.add(rod([x, H, z], [0, H + 0.5, 0], 0.02, m.body));
        }
        for (let k = 0; k < 4; k++) {
          const u0 = k / 4,
            u1 = (k + 1) / 4;
          g.add(rod([a[0] + (b[0] - a[0]) * u0, 0.7, a[1] + (b[1] - a[1]) * u0], [a[0] + (b[0] - a[0]) * u1, H, a[1] + (b[1] - a[1]) * u1], 0.015, m.body));
        }
        g.add(rod([a[0], H, a[1]], [0, H + 0.5, 0], 0.04, m.body));
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]),
          pl = new THREE.Mesh(new THREE.PlaneGeometry(L, H - 0.7), net);
        pl.position.set((a[0] + b[0]) / 2, (H + 0.7) / 2, (a[1] + b[1]) / 2);
        pl.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]);
        g.add(pl);
      }
      // 中央の低い座：その下から灯りが網を照らす
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.35, 3), wh);
      seat.rotation.y = Math.PI / 2;
      seat.position.y = 0.85;
      g.add(seat);
      const gl2 = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.08, 3), m.glow);
      gl2.rotation.y = Math.PI / 2;
      gl2.position.y = 0.66;
      g.add(gl2);
      // 頂点に吊る小さな灯り
      g.add(rod([0, H + 0.5, 0], [0, H - 0.6, 0], 0.008, m.dark));
      const lp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), m.glow);
      lp.position.y = H - 0.85;
      g.add(lp);
      return g;
    },
    L: 12,
    noWL: true,
    lamp: [0, 4.3, 0],
  },
  {
    name: "庵",
    line: "春夏秋冬そして春",
    p: { draft: 0.4, wind: 0.8, align: 0.4, rock: 0.8, rudder: 0.7, mass: 0.4 },
    make(m) {
      const g = new THREE.Group();
      // 浮き床：細い板張り
      for (let i = -19; i <= 19; i++) g.add(box(12, 0.08, 0.19, m.wood, 0, 0.6, i * 0.2));
      g.add(box(12, 0.5, 8, m.dark, 0, 0.3));
      // 柱・貫：細い角材
      const W0 = 5.4,
        D0 = 4.4,
        cx = -1.2;
      for (const x of [cx - W0 / 2, cx - W0 / 6, cx + W0 / 6, cx + W0 / 2]) for (const z of [-D0 / 2, D0 / 2]) g.add(box(0.1, 3.3, 0.1, m.wood, x, 2.3, z));
      for (const z of [-D0 / 2, 0, D0 / 2]) for (const x of [cx - W0 / 2, cx + W0 / 2]) g.add(box(0.1, 3.3, 0.1, m.wood, x, 2.3, z));
      for (const y of [0.75, 3.92])
        for (const s of [-1, 1]) {
          g.add(box(W0 + 0.1, 0.1, 0.1, m.wood, cx, y, (s * D0) / 2));
          g.add(box(0.1, 0.1, D0 + 0.1, m.wood, cx + (s * W0) / 2, y, 0));
        }
      // 障子：内側から灯る和紙の面と、細い組子
      for (const s of [-1, 1]) {
        glowBox(g, m, W0 - 0.1, 2.9, 0.03, cx, 2.3, (s * D0) / 2);
        for (let k = 1; k < 18; k++) g.add(box(0.025, 2.9, 0.035, m.wood, cx - W0 / 2 + (k * W0) / 18, 2.3, (s * D0) / 2 + s * 0.02));
        for (let k = 1; k < 8; k++) g.add(box(W0, 0.025, 0.035, m.wood, cx, 0.85 + (k * 2.9) / 8, (s * D0) / 2 + s * 0.02));
      }
      for (const s of [-1, 1]) {
        glowBox(g, m, 0.03, 2.9, D0 - 0.1, cx + (s * W0) / 2, 2.3, 0);
        for (let k = 1; k < 14; k++) g.add(box(0.035, 2.9, 0.025, m.wood, cx + (s * W0) / 2 + s * 0.02, 2.3, -D0 / 2 + (k * D0) / 14));
        for (let k = 1; k < 8; k++) g.add(box(0.035, 0.025, D0, m.wood, cx + (s * W0) / 2 + s * 0.02, 0.85 + (k * 2.9) / 8, 0));
      }
      // 屋根：薄い屋根面と、軒下に並ぶ細い垂木
      const r = gable(7.4, 6.6, 2.1, m.roof);
      r.position.set(cx, 4, 0);
      r.scale.set(1, 1, 1);
      g.add(r);
      for (let x = cx - 3.6; x <= cx + 3.601; x += 0.3) for (const s of [-1, 1]) g.add(rod([x, 3.98, s * 3.3], [x, 6.05, 0], 0.025, m.wood));
      // 縁側と、水に下りる細い段
      for (let i = 0; i < 12; i++) g.add(box(0.26, 0.06, 4.4, m.wood, 2.1 + i * 0.3, 0.72, 0));
      for (let k = 0; k < 3; k++) g.add(box(0.5, 0.05, 2, m.wood, 5.6 + k * 0.1, 0.5 - k * 0.18, 0));
      return g;
    },
    L: 12,
    lamp: [-1.2, 2.2, 0],
  },
  {
    name: "筏",
    line: "Floating Bamboo House",
    p: { draft: 0.3, wind: 0.6, align: 0.1, rock: 0.9, rudder: 0.8, mass: 0.3 },
    make(m) {
      const g = new THREE.Group(),
        bam = new THREE.MeshStandardMaterial({ color: 0xb8a46a, roughness: 0.7 });
      // 竹の筏：細い竹を密に二層で組む
      for (let i = -24; i <= 24; i++) {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 13, 8), bam);
        c.rotation.z = Math.PI / 2;
        c.position.set(0, 0.2, i * 0.26);
        g.add(c);
      }
      for (let i = -6; i <= 6; i++) {
        const d = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 13, 8), bam);
        d.rotation.x = Math.PI / 2;
        d.position.set(i, 0.42, 0);
        g.add(d);
      }
      // 小屋：細い竹の柱と、竹すだれの壁
      const W0 = 6,
        D0 = 5;
      for (const x of [-3, -1.5, 0, 1.5, 3]) for (const z of [-2.5, 2.5]) g.add(rod([x, 0.5, z], [x, 3.1, z], 0.06, bam));
      for (const z of [-1.25, 0, 1.25]) for (const x of [-3, 3]) g.add(rod([x, 0.5, z], [x, 3.1, z], 0.06, bam));
      glowBox(g, m, W0 - 0.3, 2.2, D0 - 0.3, 0, 1.7, 0);
      for (let k = 0; k < 13; k++) {
        const y = 0.6 + k * 0.19;
        if (y > 1.4 && y < 2.4) continue; // 窓の帯：ここから灯りがこぼれる
        for (const s of [-1, 1]) {
          g.add(rod([-3, y, s * 2.52], [3, y, s * 2.52], 0.045, bam));
          g.add(rod([s * 3.02, y, -2.5], [s * 3.02, y, 2.5], 0.045, bam));
        }
      }
      // 窓の帯の細い縦格子
      for (let k = -14; k <= 14; k++) for (const s of [-1, 1]) g.add(rod([k * 0.2, 1.4, s * 2.53], [k * 0.2, 2.4, s * 2.53], 0.015, bam));
      // 屋根：薄い屋根面と細い垂木
      const r = gable(7.6, 7, 1.6, m.roof);
      r.position.y = 3.05;
      g.add(r);
      for (let x = -3.6; x <= 3.601; x += 0.3) for (const s of [-1, 1]) g.add(rod([x, 3.03, s * 3.5], [x, 4.65, 0], 0.025, bam));
      // 筏の縁の手すり
      for (const s of [-1, 1]) {
        g.add(rod([-6.2, 1.3, s * 6.2], [6.2, 1.3, s * 6.2], 0.03, bam));
        for (let k = -6; k <= 6; k += 1) g.add(rod([k, 0.45, s * 6.2], [k, 1.3, s * 6.2], 0.03, bam));
      }
      return g;
    },
    L: 13,
    lamp: [0, 1.8, 0],
  },
];
// カスタマイズ（色・灯り・素材感）。通信で送るのは番号と設定値だけ
const BODY_COLORS = [0xe9e4d8, 0x8c3b2f, 0x2f4a5a, 0x6f7f4e, 0xc9a65a, 0x2a2a2a];
const LIGHT_COLORS = [0xffd9a0, 0xfff4e0, 0xa8d0ff, 0xff9a7a];
const CUST = { b: (+Q.get("b") || 0) % 10, body: 0, light: 0, bright: 0.7, mat: 0 };
const house = new THREE.Group();
scene.add(house);
house.lamp = new THREE.Mesh(
  new THREE.SphereGeometry(0.22, 8, 6),
  new THREE.MeshBasicMaterial({ color: 0xffd9a0 }),
);
house.light = new THREE.PointLight(0xffc98a, 0, 60, 1.2);
let BP = BUILDINGS[0].p,
  glassMats = [];
function buildHouse() {
  while (house.children.length) house.remove(house.children[0]);
  const Bd = BUILDINGS[CUST.b];
  BP = Bd.p;
  const body =
    CUST.mat === 0
      ? new THREE.MeshStandardMaterial({ color: BODY_COLORS[CUST.body], roughness: 0.9 })
      : CUST.mat === 1
        ? new THREE.MeshStandardMaterial({ color: BODY_COLORS[CUST.body], roughness: 0.5, metalness: 0 })
        : new THREE.MeshStandardMaterial({
            color: BODY_COLORS[CUST.body],
            roughness: 0.2,
            transparent: true,
            opacity: 0.55,
          });
  if (CUST.mat === 0) body.color.multiply(new THREE.Color(0xeee2cc));
  body.side = THREE.DoubleSide;
  if (!G.plTx) {
    G.plTx = cvTex(128, 128, (g, w, h) => {
      g.fillStyle = "#fff";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1600; i++) {
        const v = 225 + Math.random() * 30;
        g.fillStyle = `rgb(${v},${v},${v - 4})`;
        g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
      g.fillStyle = "rgba(0,0,0,.08)";
      for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 1);
    });
    G.plTx.wrapS = G.plTx.wrapT = THREE.RepeatWrapping;
  }
  if (CUST.mat !== 2) {
    body.map = G.plTx;
  }
  const m = {
    body,
    wood: MAT.wood(),
    roof: new THREE.MeshStandardMaterial({ color: 0x3a3a3e, roughness: 0.75, map: G.roofTex || null }),
    dark: MAT.dark(),
    glass: MAT.glass(),
    // 灯りの面：昼は和紙や内壁の色、夜は内側から光る
    glow: new THREE.MeshStandardMaterial({ color: 0xece2cc, roughness: 0.95, emissive: 0x000000 }),
  };
  glassMats = [m.glass, m.glow];
  G.glowMat = m.glow;
  const g = Bd.make(m);
  mergeStatic(g); // 細い部材を材質ごとに束ねて、描画の回数を減らす
  {
    const bb = new THREE.Box3().setFromObject(g),
      sz = bb.getSize(new THREE.Vector3());
    {
      const fo = new THREE.Mesh(
        new THREE.RingGeometry(Math.max(sz.x, sz.z) * 0.5, Math.max(sz.x, sz.z) * 0.62, 40).rotateX(
          -Math.PI / 2,
        ),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false }),
      );
      fo.scale.set(1, 1, sz.z / Math.max(sz.x, sz.z));
      fo.position.set((bb.min.x + bb.max.x) / 2, 0.08, (bb.min.z + bb.max.z) / 2);
      g.add(fo);
    }
    if (!Bd.noWL) {
      const wl = new THREE.Mesh(
        new THREE.BoxGeometry(sz.x * 1.01, 0.25, sz.z * 1.01),
        new THREE.MeshStandardMaterial({ color: 0x2d2a24, roughness: 1 }),
      );
      wl.position.set((bb.min.x + bb.max.x) / 2, 0.05, (bb.min.z + bb.max.z) / 2);
      g.add(wl);
    }
  }
  const bb2 = new THREE.Box3().setFromObject(g),
    s2 = bb2.getSize(new THREE.Vector3()),
    fp = Math.max(s2.x, s2.z),
    k = Math.min(1, 11 / fp, 8.5 / Math.max(1, bb2.max.y));
  g.scale.setScalar(k);
  house.add(g);
  house.size = fp * k;
  house.remove(g);
  g.updateMatrixWorld(true);
  const top = new THREE.Box3().setFromObject(g);
  house.add(g);
  // 灯りの位置：建物の内側・頂部（光源の玉そのものは見せない）
  const [lx, ly, lz] = Bd.lamp || [0, 2, 0];
  house.lamp.position.set(lx * k, ly * k, lz * k);
  house.lamp.material.visible = false;
  house.light.position.copy(house.lamp.position);
  {
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: (() => {
          const c = document.createElement("canvas");
          c.width = c.height = 64;
          const g = c.getContext("2d"),
            gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
          gr.addColorStop(0, "rgba(255,220,160,.9)");
          gr.addColorStop(1, "rgba(255,200,120,0)");
          g.fillStyle = gr;
          g.fillRect(0, 0, 64, 64);
          return new THREE.CanvasTexture(c);
        })(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    sp.scale.setScalar(2.4);
    sp.visible = false;
    house.lamp.add(sp);
    house.halo = sp;
  }
  house.add(house.lamp, house.light);
  house.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = !o.userData.noShadow;
      o.receiveShadow = true;
    }
  });
  house.h = top.max.y;
}
buildHouse();
// ヨシ帯の範囲（田舟だけが入れる）
const reedMask = new Set();
for (const [x, y] of reedPts)
  for (let a = -1; a <= 1; a++)
    for (let b = -1; b <= 1; b++) reedMask.add(Math.floor(x / 120) + a + "," + (Math.floor(y / 120) + b));
const inReeds = (x, y) => reedMask.has(Math.floor(x / 120) + "," + Math.floor(y / 120));
