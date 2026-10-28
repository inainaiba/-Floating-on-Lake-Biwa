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
    o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 6), m);
  o.position.copy(A).add(Bv).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), Bv.clone().sub(A).normalize());
  return o;
};
const s0 = (k) => (k % 2 ? -4.2 : 4.2);
const BUILDINGS = [
  {
    name: "浮かぶ学校",
    line: "マココの浮かぶ学校",
    p: { draft: 0.5, wind: 1.1, align: 0.4, rock: 0.55, rudder: 0.6, mass: 0.7 },
    make(m) {
      const g = new THREE.Group(),
        blue = new THREE.MeshStandardMaterial({ color: 0x2f5fa8, roughness: 0.6 });
      for (let i = -4; i <= 4; i++) {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 10, 12), blue);
        c.rotation.z = Math.PI / 2;
        c.position.set(0, 0.2, i * 1.15);
        g.add(c);
      }
      g.add(box(11, 0.3, 11, m.wood, 0, 0.75));
      for (const s of [-1, 1]) {
        for (let k = 0; k < 5; k++) {
          const y = 1 + k * 1.8,
            w = 10 * (1 - (y - 0.9) / 10.5);
          g.add(box(10.4, 0.12, 0.14, m.wood, 0, y, (s * w) / 2));
        }
        g.add(rod([-5, 0.9, s * 5], [-5, 11.4, 0], 0.12, m.wood));
        g.add(rod([5, 0.9, s * 5], [5, 11.4, 0], 0.12, m.wood));
        g.add(rod([0, 0.9, s * 5], [0, 11.4, 0], 0.1, m.wood));
      }
      for (let k = 0; k < 9; k++) {
        const y = 3.7 + k * 0.5,
          w = 9.4 * (1 - (y - 3.6) / 4.6);
        if (w < 0.4) break;
        for (const s of [-1, 1]) g.add(box(9.6, 0.32, 0.08, m.body, 0, y, (s * w) / 2));
      }
      for (let k = 0; k < 12; k++) {
        const y = 1 + k * 0.38;
        g.add(box(0.08, 0.3, 8.9, m.body, s0(k), y, 0));
      }
      for (const x of [-4.8, 4.8]) {
        const tri = gable(0.12, 9.4, 4.6, m.body);
        tri.position.set(x, 3.6, 0);
        g.add(tri);
      }
      g.add(box(9.6, 0.25, 8.6, m.wood, 0, 3.6));
      g.add(box(9.6, 0.25, 4.9, m.wood, 0, 7));
      const roof = gable(10.6, 4.6, 2.3, blue);
      roof.position.y = 8.9;
      g.add(roof);
      const roof2 = gable(10.8, 5.2, 2.6, blue);
      roof2.position.set(0, 8.6, 0);
      roof2.scale.set(1, 1, 1.0);
      g.add(roof2);
      return g;
    },
    L: 12,
  },
  {
    name: "漏斗の舞台",
    line: "川に浮かぶ白い漏斗の舞台",
    p: { draft: 0.4, wind: 1.2, align: 0.3, rock: 0.7, rudder: 0.7, mass: 0.4 },
    make(m) {
      const g = new THREE.Group(),
        blue = new THREE.MeshStandardMaterial({ color: 0x2f5fa8, roughness: 0.6 }),
        fab = new THREE.MeshStandardMaterial({
          color: 0xf7f6f1,
          emissive: 0x2a2a28,
          roughness: 0.8,
          transparent: true,
          opacity: 0.93,
        });
      fab.side = THREE.DoubleSide;
      for (let i = -3; i <= 3; i++) {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 8.4, 10), blue);
        c.rotation.z = Math.PI / 2;
        c.position.set(0, 0.15, i * 0.95);
        g.add(c);
      }
      g.add(box(9, 0.25, 7, m.wood, 0, 0.6));
      for (const x of [-4.2, 4.2]) for (const z of [-3.2, 3.2]) g.add(box(0.18, 8, 0.18, m.wood, x, 4.6, z));
      for (const y of [3.4, 5.2, 8.5])
        for (const s of [-1, 1]) {
          g.add(box(8.6, 0.14, 0.14, m.wood, 0, y, s * 3.2));
          g.add(box(0.14, 0.14, 6.6, m.wood, s * 4.2, y, 0));
        }
      for (const x of [-2.1, 0, 2.1])
        g.add(box(0.1, 3.2, 0.1, m.wood, x, 6.9, 3.2)), g.add(box(0.1, 3.2, 0.1, m.wood, x, 6.9, -3.2));
      const f = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.62, 1, 4, 1, true), fab);
      f.rotation.y = Math.PI / 4;
      f.scale.set(6.1, 3.3, 4.6);
      f.position.y = 6.85;
      g.add(f);
      const lid = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 6.5), fab);
      lid.rotation.x = -Math.PI / 2;
      lid.position.y = 8.52;
      g.add(lid);
      g.add(box(1, 1.2, 0.8, m.dark, -3, 1.3, -2.4));
      g.add(box(1, 1.2, 0.8, m.dark, 3, 1.3, -2.4));
      return g;
    },
    L: 9,
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
              for (let i = 0; i < 700; i++) {
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
      g.add(box(14, 0.35, 6.4, m.wood, 0, 0.45));
      for (const x of [-5.5, 0, 5.5])
        for (const z of [-2.2, 2.2]) g.add(box(0.28, 2.4, 0.28, m.dark, x, 1.8, z));
      g.add(box(13, 0.25, 0.3, m.wood, 0, 3, 2.2));
      g.add(box(13, 0.25, 0.3, m.wood, 0, 3, -2.2));
      const r = gable(14.6, 8.2, 3.6, th);
      r.position.y = 2.6;
      g.add(r);
      const ri = gable(12.8, 6.6, 2.8, m.wood);
      ri.position.y = 2.65;
      g.add(ri);
      for (const x of [-7.1, 7.1]) {
        g.add(rod([x, 2.7, -3.6], [x, 6.1, 0], 0.09, m.wood));
        g.add(rod([x, 2.7, 3.6], [x, 6.1, 0], 0.09, m.wood));
        g.add(rod([x, 2.7, 0], [x, 6.1, 0], 0.08, m.wood));
      }
      return g;
    },
    L: 14,
    lamp: [6.4, 2.1, 0, 0.62],
  },
  {
    name: "白い幕の環",
    line: "海に浮かぶ白いカーテンの輪",
    p: { draft: 0.35, wind: 1.3, align: 0, rock: 0.6, rudder: 0.5, mass: 0.45 },
    make(m) {
      const g = new THREE.Group(),
        wh = new THREE.MeshStandardMaterial({ color: 0xf2f1ec, roughness: 0.6 });
      const deck = new THREE.Mesh(new THREE.CylinderGeometry(9.2, 9.2, 0.5, 56, 1), wh);
      deck.position.y = 0.45;
      g.add(deck);
      const pool = new THREE.Mesh(new THREE.CylinderGeometry(6.8, 6.8, 0.52, 48), m.dark);
      pool.position.y = 0.46;
      g.add(pool);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        g.add(box(0.16, 4, 0.16, wh, Math.cos(a) * 8.6, 2.6, Math.sin(a) * 8.6));
      }
      const tr = new THREE.Mesh(new THREE.TorusGeometry(8.6, 0.07, 6, 64), wh);
      tr.rotation.x = Math.PI / 2;
      tr.position.y = 4.55;
      g.add(tr);
      const cg = new THREE.CylinderGeometry(8.75, 8.95, 3.9, 96, 6, true),
        p = cg.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i),
          z = p.getZ(i),
          y = p.getY(i),
          a = Math.atan2(z, x),
          k = 1 + 0.018 * Math.sin(a * 64) + 0.02 * Math.sin(a * 7 + y) * (0.5 - y / 3.9);
        p.setX(i, x * k);
        p.setZ(i, z * k);
      }
      cg.computeVertexNormals();
      const cm = m.body.clone();
      cm.transparent = true;
      cm.opacity = 0.62;
      cm.emissive = new THREE.Color(0x1c1c1a);
      cm.side = THREE.DoubleSide;
      cm.depthWrite = false;
      const cu = new THREE.Mesh(cg, cm);
      cu.position.y = 2.6;
      g.add(cu);
      return g;
    },
    L: 18,
    noWL: true,
  },
  {
    name: "劇場",
    line: "世界劇場",
    p: { draft: 0.6, wind: 1.2, align: 0.2, rock: 0.6, rudder: 0.4, mass: 0.8 },
    make(m) {
      const g = new THREE.Group();
      g.add(box(22, 1.8, 22, m.dark, 0, 0.2));
      g.add(box(10, 13, 10, m.body, 0, 7.6));
      for (let i = 0; i < 4; i++) g.add(box(10.1, 0.3, 10.1, m.wood, 0, 3 + i * 3));
      const o = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 4, 8), m.body);
      o.position.y = 16;
      g.add(o);
      const r = new THREE.Mesh(new THREE.ConeGeometry(4.6, 3.2, 8), m.roof);
      r.position.y = 19.6;
      g.add(r);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), m.roof);
      b.position.y = 21.6;
      g.add(b);
      const fl = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 1),
        new THREE.MeshStandardMaterial({ color: 0xb03a2e, side: THREE.DoubleSide }),
      );
      fl.position.set(0.8, 23, 0);
      g.add(fl);
      const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4), m.dark);
      pl.position.y = 22.6;
      g.add(pl);
      return g;
    },
    L: 22,
    lamp: [7.5, 3.2, 7.5, 1.1],
  },
  {
    name: "泡",
    line: "Rotterdam Floating Pavilion",
    p: { draft: 0.5, wind: 1, align: 0, rock: 0.5, rudder: 0.5, mass: 0.7 },
    make(m) {
      const g = new THREE.Group(),
        wh = new THREE.MeshStandardMaterial({ color: 0xefeee9, roughness: 0.55 }),
        rib = new THREE.MeshStandardMaterial({ color: 0xf6f6f2, roughness: 0.4 });
      const dk = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 1.2, 64), wh);
      dk.position.y = 0.3;
      g.add(dk);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(15.05, 15.05, 0.5, 64, 1, true), m.dark);
      band.position.y = 0.1;
      g.add(band);
      const rl = new THREE.Mesh(new THREE.TorusGeometry(14.6, 0.05, 4, 96), rib);
      rl.rotation.x = Math.PI / 2;
      rl.position.y = 2;
      g.add(rl);
      for (let k = 0; k < 40; k++) {
        const a = (k / 40) * Math.PI * 2;
        g.add(box(0.06, 1.1, 0.06, rib, Math.cos(a) * 14.6, 1.45, Math.sin(a) * 14.6));
      }
      [
        [0, -5, 7],
        [-5, 5, 6],
        [6, 4, 5],
      ].forEach(([x, z, r]) => {
        const d = new THREE.Mesh(
          new THREE.SphereGeometry(r, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2),
          m.glass.clone(),
        );
        d.material.transparent = true;
        d.material.opacity = 0.42;
        d.material.color.set(0xe6edef);
        d.material.depthWrite = false;
        glassMats.push(d.material);
        d.position.set(x, 0.9, z);
        g.add(d);
        for (let k = 0; k < 12; k++) {
          const a = new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 4, 28, Math.PI), rib);
          a.rotation.y = (k / 12) * Math.PI;
          a.position.set(x, 0.9, z);
          g.add(a);
        }
        for (const f of [0.35, 0.7]) {
          const ri = new THREE.Mesh(new THREE.TorusGeometry(r * Math.cos(Math.asin(f)), 0.05, 4, 48), rib);
          ri.rotation.x = Math.PI / 2;
          ri.position.set(x, 0.9 + r * f, z);
          g.add(ri);
        }
        g.add(box(r * 0.5, 0.08, r * 0.25, m.wood, x, 1.3, z));
      });
      return g;
    },
    L: 30,
    noWL: true,
  },
  {
    name: "水上の塔",
    line: "湖に立つ見晴らしの塔",
    p: { draft: 0.6, wind: 1.4, align: 0.1, rock: 0.7, rudder: 0.6, mass: 0.6 },
    make(m) {
      const g = new THREE.Group(),
        gl = new THREE.MeshStandardMaterial({
          color: 0xd6e2e6,
          roughness: 0.15,
          transparent: true,
          opacity: 0.32,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
      g.add(box(10, 0.5, 10, m.wood, 0, 0.45));
      for (const x of [-1.8, 1.8]) for (const z of [-1.8, 1.8]) g.add(box(0.35, 16, 0.35, m.wood, x, 8.6, z));
      g.add(box(7.6, 0.25, 7.6, m.wood, 0, 5.4));
      const sk = new THREE.Mesh(new THREE.CylinderGeometry(2.6 * 1.414, 4.6 * 1.414, 3.4, 4, 1, true), gl);
      sk.rotation.y = Math.PI / 4;
      sk.position.y = 7.2;
      g.add(sk);
      for (const y of [8.9, 12.4, 16.3])
        for (const s of [-1, 1]) {
          g.add(box(4.2, 0.2, 0.2, m.wood, 0, y, s * 2.05));
          g.add(box(0.2, 0.2, 4.2, m.wood, s * 2.05, y, 0));
        }
      const cage = new THREE.Mesh(new THREE.BoxGeometry(4, 7.3, 4), gl);
      cage.position.y = 12.6;
      g.add(cage);
      g.add(box(3.9, 0.2, 3.9, m.wood, 0, 12.4));
      g.add(box(3.9, 0.2, 3.9, m.body, 0, 8.9));
      for (let y = 1; y < 15.6; y += 0.45) g.add(box(0.7, 0.06, 0.06, m.wood, 1.8, y, -1.55));
      g.add(box(0.06, 15, 0.06, m.wood, 1.45, 8, -1.55));
      g.add(box(0.06, 15, 0.06, m.wood, 2.15, 8, -1.55));
      for (const s of [-1, 1]) {
        g.add(box(9.6, 0.06, 0.06, m.wood, 0, 1.6, s * 4.8));
        g.add(box(0.06, 0.06, 9.6, m.wood, s * 4.8, 1.6, 0));
        for (let k = -4; k <= 4; k += 2) {
          g.add(box(0.06, 1, 0.06, m.wood, k, 1.1, s * 4.8));
          g.add(box(0.06, 1, 0.06, m.wood, s * 4.8, 1.1, k));
        }
      }
      return g;
    },
    L: 10,
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
      const fl = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.5, 3), wh);
      fl.rotation.y = Math.PI / 2;
      fl.position.y = 0.45;
      g.add(fl);
      const H = 5.2,
        net = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide,
          depthWrite: false,
          map:
            G.netTx ||
            (G.netTx = cvTex(128, 128, (c, w, h) => {
              c.fillStyle = "#000";
              c.fillRect(0, 0, w, h);
              c.strokeStyle = "#fff";
              c.lineWidth = 3;
              for (let i = 0; i < 8; i++) {
                c.beginPath();
                c.arc(64, 64, 8 * i, 0, 7);
                c.stroke();
              }
              for (let a = 0; a < 12; a++) {
                c.beginPath();
                c.moveTo(64, 64);
                c.lineTo(64 + Math.cos((a / 12) * 6.28) * 90, 64 + Math.sin((a / 12) * 6.28) * 90);
                c.stroke();
              }
            })),
        });
      net.alphaMap = net.map;
      for (let i = 0; i < 3; i++) {
        const [a, b] = [P[i], P[(i + 1) % 3]];
        g.add(rod([a[0], 0.7, a[1]], [b[0], 0.7, b[1]], 0.09, m.body));
        g.add(rod([a[0], H, a[1]], [b[0], H, b[1]], 0.09, m.body));
        g.add(rod([a[0], 0.7, a[1]], [a[0], H, a[1]], 0.09, m.body));
        for (let k = 1; k < 4; k++) {
          const u = k / 4,
            x = a[0] + (b[0] - a[0]) * u,
            z = a[1] + (b[1] - a[1]) * u;
          g.add(rod([x, 0.7, z], [x, H, z], 0.05, m.body));
          g.add(rod([x, H, z], [0, H, 0], 0.05, m.body));
        }
        g.add(rod([a[0], 0.7, a[1]], [b[0], H, b[1]], 0.05, m.body));
        g.add(rod([a[0], H, a[1]], [0, H, 0], 0.06, m.body));
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]),
          pl = new THREE.Mesh(new THREE.PlaneGeometry(L, H - 0.7), net);
        pl.position.set((a[0] + b[0]) / 2, (H + 0.7) / 2, (a[1] + b[1]) / 2);
        pl.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]);
        g.add(pl);
      }
      g.add(box(3.5, 0.6, 2.2, wh, 0, 1, 0.6));
      return g;
    },
    L: 12,
    noWL: true,
  },
  {
    name: "庵",
    line: "春夏秋冬そして春",
    p: { draft: 0.4, wind: 0.8, align: 0.4, rock: 0.8, rudder: 0.7, mass: 0.4 },
    make(m) {
      const g = new THREE.Group();
      g.add(box(12, 0.8, 8, m.wood, 0, 0.2));
      g.add(box(5.5, 3.4, 4.5, m.body, -1.2, 2.3));
      const r = gable(6.6, 6, 2.3, m.roof);
      r.position.set(-1.2, 4, 0);
      g.add(r);
      g.add(box(3.6, 0.2, 4.5, m.wood, 3.2, 0.7));
      g.add(box(0.5, 0.8, 0.5, m.body, 4.6, 1.2, 1.8));
      g.add(
        box(0.05, 1.6, 3.6, new THREE.MeshStandardMaterial({ color: 0xa58a5a, roughness: 1 }), 1.56, 3, 0),
      );
      return g;
    },
    L: 12,
    lamp: [4.8, 2.1, -2.6, 0.6],
  },
  {
    name: "筏",
    line: "Floating Bamboo House",
    p: { draft: 0.3, wind: 0.6, align: 0.1, rock: 0.9, rudder: 0.8, mass: 0.3 },
    make(m) {
      const g = new THREE.Group();
      for (let i = -6; i <= 6; i++) {
        const c = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.22, 13, 6),
          new THREE.MeshStandardMaterial({ color: 0xb8a46a, roughness: 0.7 }),
        );
        c.rotation.z = Math.PI / 2;
        c.position.set(0, 0.2, i * 1);
        g.add(c);
        const d = c.clone();
        d.rotation.set(Math.PI / 2, 0, 0);
        d.position.set(i * 1, 0.6, 0);
        g.add(d);
      }
      g.add(box(6, 2.2, 5, m.body, 0, 1.9));
      const r = gable(7.6, 7, 1.5, m.roof);
      r.position.y = 3;
      g.add(r);
      for (const s of [-1, 1]) {
        g.add(box(12, 0.06, 0.06, m.wood, 0, 1.3, s * 6.2));
        for (let k = -6; k <= 6; k += 2) g.add(box(0.08, 1, 0.08, m.wood, k, 0.85, s * 6.2));
      }
      g.add(box(1.2, 1.9, 0.06, m.wood, 3.01, 1.75, 0));
      return g;
    },
    L: 13,
    lamp: [4.3, 2.4, 3.3, 0.42],
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
  };
  glassMats = [m.glass];
  const g = Bd.make(m);
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
  if (Bd.lamp) {
    const [lx, ly, lz, ld] = Bd.lamp;
    house.lamp.position.set(lx * k, ly * k, lz * k);
    house.add(rod([lx * k, ld * k, lz * k], [lx * k, (ly + 0.35) * k, lz * k], 0.06, MAT.dark()));
    house.add(
      rod([lx * k, (ly + 0.35) * k, lz * k], [(lx - 0.5) * k, (ly + 0.35) * k, lz * k], 0.04, MAT.dark()),
    );
  } else
    house.lamp.position.set(
      (top.min.x + top.max.x) / 2,
      Math.max(1.2, Math.min(2.6, top.max.y * 0.4)),
      (top.min.z + top.max.z) / 2,
    );
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
    sp.scale.setScalar(Bd.lamp ? 3.2 : 7);
    sp.visible = false;
    house.lamp.add(sp);
    house.halo = sp;
  }
  house.add(house.lamp, house.light);
  house.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
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
