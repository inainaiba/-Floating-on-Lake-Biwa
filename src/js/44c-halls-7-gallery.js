/* ---------- 湖に浮かぶ建築 7. 水上ギャラリー（道具は 44c-halls-0-common.js の HALL） ---------- */
{
  const { R, nearBridge, lam, box, add, M, glowMat, openPath, moor, setCur } = HALL;
  // ---------- 7. 水上ギャラリー ----------
  // 湖を気ままに漂う雲のような美術館。山の稜線のようにゆるく起伏し、縁が丸くすぼまった白い屋根を、林のように不揃いな細い柱が支える。
  // 屋根の下はガラスに囲まれた展示の間で、湖と山を写したような淡い色の絵と、丸い石の彫刻。屋根の裏は水面の照り返しで淡く青い。
  // ほかの水上建築のように岸には着かず、沖の何か所かで少しとどまっては、また漂う（夜は展示の間がほのかに灯る）
  const galSites = [
    [136.02, 35.3],
    [136.1, 35.4],
    [136.17, 35.36],
    [136.2, 35.28],
    [136.09, 35.3],
  ]
    .map(([lo, la]) => {
      const [x, y] = ll(lo, la);
      return { x, y, sx: x, sy: y, a: 0 };
    })
    .filter((q) => inLake(q.x, q.y) && inMain(q.x, q.y) && distShore(q.x, q.y, 400) > 350 && !nearBridge(q.x, q.y));
  galSites.forEach((q, i) => {
    const nq = galSites[(i + 1) % galSites.length];
    q.a = Math.atan2(nq.y - q.y, nq.x - q.x); // とどまる間も、次へ向かう向き
  });
  setCur("gal");
  let galH = null;
  if (galSites.length >= 2) {
    const g = new THREE.Group();
    // 形の輪郭：ゆるく波打つ楕円（屋根・床・ガラスの壁で大きさを変えて使う）
    const rOf = (t) => 1 + 0.1 * Math.sin(3 * t + 1) + 0.06 * Math.sin(5 * t + 2.3) + 0.04 * Math.sin(8 * t + 0.4);
    const AX = 13,
      AZ = 9;
    // 屋根：上の面は山の稜線のような起伏、下の面は水の照り返しを受けるゆるい曲面。縁で上下が丸く合わさる
    const ridge = (t, f) => 0.5 + 0.5 * (0.55 * Math.sin(3 * t + 0.5) + 0.3 * Math.sin(7 * t + 1.3) + 0.15 * Math.sin(11 * t + 2.1)) * (1 - 0.3 * f) * Math.min(1, f * 2.5); // 真ん中では向きによらず同じ高さ（尖らない）
    const mid = (t, f) => 6.0 + 0.45 * Math.sin(2 * t + f * 3) * f;
    const thick = (t, f) => (0.4 + 2.2 * ridge(t, f) * (1 - f * 0.45)) * Math.sqrt(Math.max(0, 1 - f * f)); // 稜線のような起伏（縁ほど薄く、丸くすぼまる）
    const roofSurf = (top) => {
      const I = 72,
        J = 14,
        P = [],
        C = [],
        idx = [];
      for (let j = 0; j <= J; j++)
        for (let i = 0; i <= I; i++) {
          const t = (i / I) * Math.PI * 2,
            f = j / J,
            r = rOf(t) * f,
            x = Math.cos(t) * AX * r,
            z = Math.sin(t) * AZ * r,
            y = top ? mid(t, f) + thick(t, f) * 0.78 : mid(t, f) - thick(t, f) * 0.22;
          P.push(x, y, z);
          const k = top ? 0.97 + 0.03 * ridge(t, f) : 0.86 + 0.06 * f; // 裏は水面の照り返しで淡く青い
          C.push(top ? k : k * 0.94, top ? k : k * 0.98, top ? k * 0.98 : k * 1.04);
        }
      for (let j = 0; j < J; j++)
        for (let i = 0; i < I; i++) {
          const a = j * (I + 1) + i,
            b = a + I + 1;
          if (top) idx.push(a, a + 1, b, a + 1, b + 1, b); // 上の面は上向き
          else idx.push(a, b, a + 1, a + 1, b, b + 1); // 下の面は下向き
        }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
      geo.setAttribute("color", new THREE.Float32BufferAttribute(C, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      return geo;
    };
    const roofM = new THREE.MeshLambertMaterial({ color: 0xf4f3ef, emissive: 0x161616 }),
      underM = new THREE.MeshLambertMaterial({ color: 0xe8eef2, emissive: 0x5e6870 }); // 裏：日は当たらないが、水面の照り返しで淡く明るい
    g.add(new THREE.Mesh(roofSurf(true), roofM));
    g.add(new THREE.Mesh(roofSurf(false), underM));
    // 床：屋根より一回り小さい、波打つ形の白い浮き床
    {
      const sh = new THREE.Shape();
      for (let i = 0; i <= 96; i++) {
        const t = (i / 96) * Math.PI * 2,
          r = rOf(t + 0.3) * 0.82;
        const x = Math.cos(t) * AX * r,
          z = Math.sin(t) * AZ * r;
        i ? sh.lineTo(x, z) : sh.moveTo(x, z);
      }
      const fg = new THREE.ExtrudeGeometry(sh, { depth: 0.5, bevelEnabled: false }).rotateX(Math.PI / 2);
      add(g, fg, lam(0xe9e6de, { emissive: 0x34342f, side: THREE.DoubleSide }), 0, 0.85, 0);
      for (let k = 0; k < 10; k++) {
        const t = (k / 10) * Math.PI * 2;
        add(g, new THREE.CylinderGeometry(0.5, 0.5, 2.4, 8), M.float, Math.cos(t) * AX * 0.55, 0.15, Math.sin(t) * AZ * 0.55, -t, 0, Math.PI / 2);
      }
    }
    // 柱：林のように不揃いな、細い白い柱（太さも少しずつ違う）
    const colM = lam(0xf2f1ec, { emissive: 0x141414 });
    for (let k = 0; k < 26; k++) {
      const t = R() * Math.PI * 2,
        f = 0.25 + Math.sqrt(R()) * 0.55,
        r = rOf(t) * f,
        x = Math.cos(t) * AX * r,
        z = Math.sin(t) * AZ * r,
        top = mid(t, f) - thick(t, f) * 0.22,
        w = 0.045 + R() * 0.035;
      add(g, new THREE.CylinderGeometry(w, w, top - 0.85, 6), colM, x, (top + 0.85) / 2, z);
    }
    // 展示の間：波打つ形のガラスの壁（細い方立をところどころに）
    const glassM = new THREE.MeshLambertMaterial({ color: 0xd6e4ea, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false, emissive: 0x0a1014 });
    {
      const n = 80,
        P = [],
        idx = [];
      for (let i = 0; i <= n; i++) {
        const t = (i / n) * Math.PI * 2,
          r = rOf(t + 0.7) * 0.5,
          x = Math.cos(t) * AX * r,
          z = Math.sin(t) * AZ * r;
        P.push(x, 0.85, z, x, 4.4, z);
        if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
        if (i % 8 === 0) add(g, box(0.035, 3.55, 0.035), colM, x, 2.62, z);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const w = new THREE.Mesh(geo, glassM);
      w.userData.keep = true;
      w.renderOrder = 3;
      g.add(w);
    }
    // 絵：湖と山を写したような、淡い色の面の絵（字や形ははっきり描かない）。白い自立壁に掛ける
    const paint = (seed, pal) =>
      cvTex(64, 48, (c, w, h) => {
        const Rr = rnd(seed);
        const gr = c.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, pal[0]);
        gr.addColorStop(0.55, pal[1]);
        gr.addColorStop(1, pal[2]);
        c.fillStyle = gr;
        c.fillRect(0, 0, w, h);
        // 稜線のような柔らかい線と、水面の淡い横の筋
        c.strokeStyle = pal[3];
        c.globalAlpha = 0.55;
        c.lineWidth = 2;
        c.beginPath();
        for (let x = 0; x <= w; x += 2) {
          const y = h * 0.5 - 6 * Math.sin(x * 0.09 + seed) - 3 * Math.sin(x * 0.23 + seed * 2);
          x ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.stroke();
        c.globalAlpha = 0.18;
        for (let k = 0; k < 6; k++) (c.fillStyle = "#ffffff"), c.fillRect(Rr() * w * 0.6, h * 0.62 + Rr() * h * 0.3, 10 + Rr() * 20, 1);
        c.globalAlpha = 1;
      });
    const PAL = [
      ["#c9d6dc", "#9fb6c2", "#7f98a6", "#5f6f6a"],
      ["#e8d8cc", "#d6b8b0", "#9aa6b8", "#6a6680"],
      ["#dfe2d2", "#b8c4a8", "#8fa098", "#4f5e52"],
      ["#f0e6d4", "#e2c9a0", "#a8a4a0", "#7a6650"],
      ["#d4dce6", "#b0bccd", "#c8b8c8", "#6a6a80"],
    ];
    const wallM = lam(0xf4f2ec, { emissive: 0x151513 });
    for (let k = 0; k < 5; k++) {
      const t = (k / 5) * Math.PI * 2 + 0.3,
        r = 3.6 + (k % 2) * 0.8,
        x = Math.cos(t) * r * 1.2,
        z = Math.sin(t) * r * 0.85,
        ry = -t + Math.PI / 2,
        wide = k % 2 === 0;
      add(g, box(wide ? 2.6 : 1.9, 2.7, 0.1), wallM, x, 2.2, z, ry);
      const pw = wide ? 1.9 : 1.1,
        ph = wide ? 1.3 : 1.6;
      const pm = new THREE.MeshLambertMaterial({ map: paint(k * 17 + 3, PAL[k]), emissive: 0x111111 });
      const o = add(g, new THREE.PlaneGeometry(pw, ph), pm, x + Math.cos(t) * 0.06, 2.35, z + Math.sin(t) * 0.06, ry - Math.PI / 2 + Math.PI / 2);
      o.rotation.y = -t; // 外（ガラスの向こう）を向く
      o.position.set(x + Math.cos(t) * 0.07, 2.35, z + Math.sin(t) * 0.07);
      o.rotateY(Math.PI / 2);
      add(g, new THREE.SphereGeometry(0.07, 8, 6), glowMat(0xfff0d8, 2.0), x + Math.cos(t) * 0.5, 3.4, z + Math.sin(t) * 0.5); // 絵を照らす小さな灯り
    }
    // 彫刻：丸い石（重ねた二つ）と、細く立つ形
    const stone = lam(0x9a9890);
    add(g, new THREE.SphereGeometry(0.7, 20, 14).scale(1.3, 0.75, 1), stone, 0.6, 1.4, -0.4);
    add(g, new THREE.SphereGeometry(0.45, 18, 12).scale(1.2, 0.8, 1), stone, 0.7, 2.15, -0.35);
    add(g, new THREE.CylinderGeometry(0.06, 0.16, 2.6, 8), lam(0x6a5a44), -1.6, 2.15, 1.0, 0, 0.08, 0.05);
    add(g, box(2.2, 0.4, 0.5), lam(0xd9d4c8), -0.8, 1.05, -2.1, 0.3); // 腰掛け
    // 夜：展示の間の床が、ほのかに灯る
    add(g, new THREE.CircleGeometry(4.2, 28), glowMat(0x4a4030, 1), 0, 0.88, 0, 0, -Math.PI / 2);
    galH = moor(g, galSites, 0, openPath);
  }
  HALL.galH = galH;
}
