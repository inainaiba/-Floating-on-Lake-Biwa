/* ---------- 南湖の街（大津・草津の湖岸）：現代の建物を12種類で。タワーマンション・中層マンション（横に続くバルコニー／縦の格子）・
   ガラス張りのオフィス（縦の方立／横の帯窓）・窓の並ぶ古いビル（白い壁／煉瓦色のタイル）・低く横に長い商業施設・
   低層のアパート・細い雑居ビル（色とりどりの看板の帯）・ホテル・学校や役所（横に長い白い建物）。
   形も一様にしない：高い建物の一部は上の階を細くし（段々）、塔は低い基壇の上に立てる。向きも少しずつずらす。
   湖岸の目印に、びわ湖大津プリンスホテル（38階）。
   建物は実物大。窓の模様は建物の大きさに合わせて繰り返す（階の高さと柱の間隔をそろえる）。夜は種類ごとに窓が灯る ---------- */
G.city = (() => {
  const KX_ = 111320 * Math.cos((35.25 * Math.PI) / 180),
    R = rnd(5150),
    bl = [];
  // 種類：fl 階の高さ・bay 柱の間隔（作品の中の長さ）、w・d・h の幅、色の候補
  const TYPES = {
    tower: { fl: 3.1, bay: 3.6, w: [18, 26], d: [14, 20], h: [45, 80], cols: [0xf1efe9, 0xe4e1da, 0xd9d6cf, 0xe9e2d4] },
    mansion: { fl: 3.0, bay: 3.6, w: [22, 38], d: [10, 14], h: [16, 42], cols: [0xf0ede6, 0xe6dfd2, 0xd8d2c6, 0xcfc4b4, 0xbfae98] },
    office: { fl: 4.0, bay: 3.2, w: [16, 30], d: [14, 24], h: [20, 54], cols: [0xa9b8c4, 0x9fb0bb, 0xb9c3c9, 0x8fa2ad] },
    old: { fl: 3.5, bay: 3.0, w: [14, 26], d: [10, 18], h: [10, 30], cols: [0xe8e4dc, 0xd9d2c4, 0xcdbfae, 0xc9c9c4, 0xb59a84] },
    mall: { fl: 5.0, bay: 6.0, w: [40, 70], d: [28, 46], h: [9, 16], cols: [0xe6e2da, 0xd4d0c8, 0xc8c2b6] },
    mansion2: { fl: 3.0, bay: 3.2, w: [20, 34], d: [11, 15], h: [18, 36], cols: [0xd9cbb6, 0xc8b59c, 0xe2dccf, 0xb8a58c] },
    office2: { fl: 3.8, bay: 4.0, w: [18, 32], d: [16, 26], h: [16, 40], cols: [0xe4e2dc, 0xcfd2d2, 0xb7bcbc] },
    old2: { fl: 3.4, bay: 3.0, w: [12, 22], d: [10, 16], h: [10, 24], cols: [0xa8664e, 0x9a5c48, 0xb47a5e, 0x8f6a58] },
    apt: { fl: 2.9, bay: 3.4, w: [14, 24], d: [8, 11], h: [6, 12], cols: [0xf0ece2, 0xe2d6c0, 0xd6dcd8, 0xe8dccc, 0xcfd6dc] },
    shop: { fl: 3.3, bay: 2.8, w: [8, 13], d: [10, 16], h: [10, 24], cols: [0xe9e4da, 0xd8cfc2, 0xc9cdd0, 0xe4d2b8, 0xbfc6c0] },
    hotel: { fl: 3.2, bay: 3.4, w: [20, 34], d: [12, 18], h: [24, 44], cols: [0x9e8a78, 0xb8a894, 0x8a7e72, 0xd4ccbe] },
    school: { fl: 3.8, bay: 3.6, w: [34, 52], d: [12, 15], h: [11, 15], cols: [0xf2f0ea, 0xe8e6de] },
  };
  const pick = (t) => {
    const r = R();
    // 大津・草津の湖岸は中層のマンションと古いビルが多く、高い塔はところどころ
    // 湖岸の一列目は中層・高層が多く、奥ほど低いアパート・雑居ビル・学校が混じる
    const P0 = [["tower", 0.07], ["mansion", 0.2], ["mansion2", 0.14], ["office", 0.08], ["office2", 0.07], ["hotel", 0.07], ["old", 0.12], ["old2", 0.07], ["shop", 0.06], ["mall", 0.08], ["apt", 0.04]],
      P1 = [["tower", 0.04], ["mansion", 0.14], ["mansion2", 0.1], ["office", 0.05], ["office2", 0.06], ["hotel", 0.03], ["old", 0.13], ["old2", 0.1], ["shop", 0.12], ["mall", 0.07], ["apt", 0.12], ["school", 0.04]];
    let acc = 0;
    for (const [k, w] of t === 0 ? P0 : P1) if (r < (acc += w)) return k;
    return "old";
  };
  const span = ([a, b]) => a + R() * (b - a);
  // 建物どうしが重ならないか（作品の中の大きさで、中心の間隔が半径の和の8割以上）
  const free = (x, y, rr) => bl.every((b) => Math.hypot(b[0] - x, b[1] - y) * S >= (rr + Math.hypot(b[2], b[3]) / 2) * 0.8);
  // 大津祭の曳山の通り（38c-festivals.js）：建物の角が通りにかからないように
  const street = (G.fest && G.fest.street) || [],
    offStreet = (x, y, w, d) => {
      if (street.length < 2) return true;
      const [a, b] = street,
        dx = b[0] - a[0],
        dy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
      return Math.hypot(a[0] + t * dx - x, a[1] + t * dy - y) * S > Math.hypot(w, d) * 0.5 + 7;
    };
  const onLand = (x, y, w, d) => !inLake(x, y) && !inInner(x, y) && !meishoClear(x, y) && offStreet(x, y, w, d) && distShore(x, y) * S >= Math.hypot(w, d) * 0.5 + 3; // 名所（びわ湖ホールなど）の上には建てない
  // 湖岸の目印：びわ湖大津プリンスホテル（なぎさの湖岸。高さ約133m・38階、細長い楕円の塔）
  {
    let [x, y] = ll(135.8884, 35.0062);
    for (let k = 0; k < 60 && !onLand(x, y, 40, 18); k++) y += 20; // 岸の内側へ
    if (onLand(x, y, 40, 18)) bl.push([x, y, 40, 18, 133, -0.35, "prince", 0xeceae4]);
  }
  for (let i = 0; i < outer.length - 1; i++) {
    const [x1, y1] = outer[i],
      [x2, y2] = outer[i + 1];
    const lo = 136.08 + x1 / KX_,
      la = 35.25 - y1 / 110540;
    if (!(la < 35.035 && lo > 135.85 && lo < 135.99)) continue;
    const L = Math.hypot(x2 - x1, y2 - y1);
    if (L < 1) continue;
    let nx = -(y2 - y1) / L,
      ny = (x2 - x1) / L;
    if (inLake(x1 + nx * 60, y1 + ny * 60)) {
      nx = -nx;
      ny = -ny;
    }
    for (let s = 0; s < L; s += 55) {
      const u = s / L;
      for (let k = 0; k < 3; k++) {
        const off = 60 + k * 90 + R() * 60,
          x = x1 + (x2 - x1) * u + nx * off + (R() - 0.5) * 30,
          y = y1 + (y2 - y1) * u + ny * off + (R() - 0.5) * 30,
          ty = pick(k),
          T = TYPES[ty],
          bw = span(T.w),
          bd = span(T.d);
        // 建物の角まで陸に収まり、ほかの建物と重ならない所だけ
        if (!onLand(x, y, bw * (ty === "tower" ? 1.7 : 1), bd * (ty === "tower" ? 1.6 : 1)) || !free(x, y, Math.hypot(bw, bd) / 2)) continue;
        const h = Math.round((span(T.h) * (ty === "tower" || ty === "office" ? (k ? 1 : 0.85) : 1)) / T.fl) * T.fl,
          rot = Math.atan2(y2 - y1, x2 - x1) + (R() < 0.3 ? Math.PI / 2 : 0) + (R() - 0.5) * 0.24, // 向きを少しずつずらす
          col = T.cols[Math.floor(R() * T.cols.length)];
        if (ty === "tower") {
          // 塔は、低く広い基壇（商業施設の形）の上に
          const hb = 2 * TYPES.mall.fl;
          bl.push([x, y, bw * 1.7, bd * 1.6, hb, rot, "mall", TYPES.mall.cols[Math.floor(R() * 3)], 0, true]);
          bl.push([x, y, bw, bd, h, rot, ty, col, hb]);
        } else if ((ty === "mansion" || ty === "mansion2" || ty === "office" || ty === "office2" || ty === "hotel") && h > 20 && R() < 0.4) {
          // 上の階を細くした段々の形：下の部分と、少し細い上の部分（片側に寄せる）
          const h1 = Math.round((h * (0.55 + R() * 0.2)) / T.fl) * T.fl,
            sh = (R() < 0.5 ? -1 : 1) * bw * 0.15,
            cr = Math.cos(rot),
            sr = Math.sin(rot);
          bl.push([x, y, bw, bd, h1, rot, ty, col, 0]);
          bl.push([x + (sh * cr) / S, y + (sh * sr) / S, bw * 0.68, bd * (0.75 + R() * 0.2), h - h1, rot, ty, col, h1, true]);
        } else bl.push([x, y, bw, bd, h, rot, ty, col, 0]);
      }
    }
  }

  // ---- 窓の模様：1枚の絵が「柱の間隔4つ×2階」。昼の壁（map）と、夜に灯る窓（emissiveMap）----
  const paint = (ty, lit) =>
    cvTex(64, 64, (g, w, h) => {
      const L = (c) => (g.fillStyle = c),
        Rr = rnd(ty.length * 131 + (lit ? 7 : 0));
      L(lit ? "#000" : "#fff");
      g.fillRect(0, 0, w, h);
      for (let f = 0; f < 2; f++) {
        const y0 = f * 32;
        for (let b = 0; b < 4; b++) {
          const x0 = b * 16,
            on = Rr() < (ty === "office" ? 0.55 : 0.4),
            warm = ty === "office" ? "#dfe8f0" : Rr() < 0.75 ? "#ffd9a0" : "#fff1d8";
          if (ty === "mansion2") {
            // 縦の格子の手すりと、住戸ごとの奥まった窓（色の濃い壁と、明るい格子）
            if (lit) {
              if (on) (L(warm), g.fillRect(x0 + 3, y0 + 5, 10, 16));
            } else {
              L("#4e555c");
              g.fillRect(x0 + 1, y0 + 4, 14, 20);
              L("#e8e4dc");
              for (let k = 0; k < 14; k += 2) g.fillRect(x0 + 1 + k, y0 + 18, 1, 8);
              g.fillRect(x0 + 1, y0 + 17, 14, 1);
            }
          } else if (ty === "office2") {
            // 横に続く帯窓：各階に1本の長い窓と、白い腰壁
            if (lit) {
              if (on) (L(warm), g.fillRect(x0, y0 + 8, 16, 12));
            } else {
              L(Rr() < 0.5 ? "#5f7686" : "#6a8090");
              g.fillRect(x0, y0 + 8, 16, 12);
              L("#9aa6ac");
              g.fillRect(x0 + 15, y0 + 8, 1, 12);
            }
          } else if (ty === "old2") {
            // 煉瓦色のタイルの壁：目地の細い線と、白い枠の縦長の窓
            if (lit) {
              if (on) (L(warm), g.fillRect(x0 + 5, y0 + 7, 6, 15));
            } else {
              L("rgba(60,30,20,.18)");
              for (let yy = 0; yy < 32; yy += 3) g.fillRect(x0, y0 + yy, 16, 1);
              L("#e9e4da");
              g.fillRect(x0 + 4, y0 + 6, 8, 17);
              L("#4f5a62");
              g.fillRect(x0 + 5, y0 + 7, 6, 15);
            }
          } else if (ty === "apt") {
            // 低層のアパート：外の廊下と玄関の扉、小さな窓、物干しの手すり
            if (lit) {
              if (on) (L(warm), g.fillRect(x0 + 9, y0 + 9, 5, 6));
              if (Rr() < 0.5) (L("#fff4dc"), g.fillRect(x0 + 1, y0 + 22, 14, 2)); // 廊下の灯り
            } else {
              L("#7a5a44");
              g.fillRect(x0 + 2, y0 + 6, 5, 16);
              L("#6a747c");
              g.fillRect(x0 + 9, y0 + 9, 5, 6);
              L("#bfc4c4");
              g.fillRect(x0, y0 + 24, 16, 2);
            }
          } else if (ty === "shop") {
            // 細い雑居ビル：一階は店先、上の階は窓と、色とりどりの看板の帯（字は書かない）
            if (lit) {
              if (f === 0) (L("#ffe8c0"), g.fillRect(x0 + 1, y0 + 6, 14, 18));
              else if (on) (L(warm), g.fillRect(x0 + 3, y0 + 8, 10, 12));
              if (Rr() < 0.4) (L(["#ffb070", "#a0d8ff", "#ff9aa8", "#c8ff9a"][Math.floor(Rr() * 4)]), g.fillRect(x0 + 1, y0 + 24, 14, 4));
            } else {
              if (f === 0) (L("#5c6a74"), g.fillRect(x0 + 1, y0 + 6, 14, 18));
              else (L("#66727c"), g.fillRect(x0 + 3, y0 + 8, 10, 12));
              L(["#c9563f", "#e0b04a", "#4a7aa8", "#5f9a5e", "#e9e2cf", "#8a5aa6"][Math.floor(Rr() * 6)]);
              g.fillRect(x0 + 1, y0 + 24, 14, 4);
            }
          } else if (ty === "hotel") {
            // ホテル：深い窓の列と、細い柱型
            if (lit) {
              if (on || Rr() < 0.25) (L("#ffe0b0"), g.fillRect(x0 + 3, y0 + 7, 10, 16));
            } else {
              L("#3e464c");
              g.fillRect(x0 + 3, y0 + 7, 10, 16);
              L("rgba(255,255,255,.25)");
              g.fillRect(x0, y0, 2, 32);
            }
          } else if (ty === "school") {
            // 学校や役所：横に長い窓の帯と、白い庇
            if (lit) {
              if (f === 1 && Rr() < 0.25) (L("#e8f0f4"), g.fillRect(x0, y0 + 9, 16, 13));
            } else {
              L("#6f8090");
              g.fillRect(x0, y0 + 9, 16, 13);
              L("#ffffff");
              g.fillRect(x0, y0 + 23, 16, 3);
              L("#d8dcdc");
              g.fillRect(x0 + 15, y0 + 9, 1, 13);
            }
          } else if (ty === "mansion" || ty === "tower") {
            // 横に続くバルコニー：手すり（明るい帯）の上に、奥まった窓（暗い帯）。住戸の境に細い仕切り
            if (lit) {
              if (on) (L(warm), g.fillRect(x0 + 2, y0 + 6, 12, 14));
            } else {
              L("#5d6670");
              g.fillRect(x0, y0 + 4, 16, 18);
              L("#f4f2ee");
              g.fillRect(x0, y0 + 20, 16, 9);
              L("#c9ccce");
              g.fillRect(x0 + 15, y0 + 4, 1, 25);
            }
          } else if (ty === "office") {
            // ガラスの壁：縦の方立と、各階の腰の帯
            if (lit) {
              if (on) (L(warm), g.fillRect(x0 + 1, y0 + 1, 14, 22));
            } else {
              L(Rr() < 0.5 ? "#6f8494" : "#7d92a2");
              g.fillRect(x0, y0, 16, 24);
              L("#4e5c66");
              g.fillRect(x0, y0 + 24, 16, 8);
              L("#c3cbd0");
              g.fillRect(x0 + 15, y0, 1, 32);
            }
          } else if (ty === "old") {
            // 窓の並ぶビル：壁に四角い窓
            if (lit) {
              if (on) (L(warm), g.fillRect(x0 + 4, y0 + 8, 9, 13));
            } else {
              L(Rr() < 0.85 ? "#6e7a86" : "#56606a");
              g.fillRect(x0 + 4, y0 + 8, 9, 13);
            }
          } else {
            // 商業施設：下の階はガラスの店先、上は窓の少ない壁と色の帯
            if (lit) {
              if (f === 0) (L("#fff0d0"), g.fillRect(x0, y0 + 4, 16, 18));
            } else if (f === 0) {
              L("#6d7c88");
              g.fillRect(x0, y0 + 4, 16, 18);
            } else {
              L(b % 2 ? "#b44a3c" : "#c9563f");
              g.fillRect(x0, y0 + 20, 16, 5);
            }
          }
        }
      }
    });
  // 陰の面がつぶれないよう、壁の色に比べた明るさを少し足す（以前の建物の自己照明と同じくらい）
  const CITY_FILL = "totalEmissiveRadiance += diffuseColor.rgb * .14;";
  const M = new THREE.Matrix4(),
    Qq = new THREE.Quaternion(),
    E = new THREE.Euler(),
    V = new THREE.Vector3(),
    Sc = new THREE.Vector3(),
    c = new THREE.Color(),
    mats = [];
  const g = new THREE.Group();
  for (const ty of Object.keys(TYPES)) {
    const list = bl.filter((b) => b[6] === ty);
    if (!list.length) continue;
    const T = TYPES[ty],
      m = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: ty === "office" ? 0.35 : 0.85,
        metalness: ty === "office" ? 0.15 : 0,
        map: paint(ty, false),
        emissiveMap: paint(ty, true),
        emissive: 0xffffff,
        emissiveIntensity: 0,
      });
    for (const t of [m.map, m.emissiveMap]) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    // 窓の模様を、建物の大きさに合わせて繰り返す（箱の面ごとに、幅と高さを柱の間隔・階の高さで割る）。屋根は無地
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace(
        "#include <uv_vertex>",
        `#include <uv_vertex>
float sx_=length(instanceMatrix[0].xyz),sy_=length(instanceMatrix[1].xyz),sz_=length(instanceMatrix[2].xyz);
vec2 cu_=abs(normal.y)>.5?vec2(.02,.02):vec2(uv.x*(abs(normal.x)>.5?sz_:sx_)/${(T.bay * 4).toFixed(2)},uv.y*sy_/${(T.fl * 2).toFixed(2)});
vMapUv=cu_;vEmissiveMapUv=cu_;`,
      );
      sh.fragmentShader = sh.fragmentShader.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n" + CITY_FILL);
    };
    m.customProgramCacheKey = () => "city-" + ty;
    mats.push(m);
    const I = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), m, list.length);
    list.forEach(([x, y, w, d, h, r, , col, y0 = 0], i) => {
      // y0：段々の上の部分・基壇の上の塔は、下の部分の高さから
      M.compose(V.set(x * S, landY(x, y) - 0.3 + y0, y * S), Qq.setFromEuler(E.set(0, -r, 0)), Sc.set(w, h + (y0 ? 0 : 0.3), d));
      I.setMatrixAt(i, M);
      I.setColorAt(i, c.setHex(col).multiplyScalar(0.92 + R() * 0.12));
    });
    I.castShadow = I.receiveShadow = false;
    g.add(I);
  }
  // 屋上の設備（機械室・塔屋）：高い建物の屋上に小さな箱を1〜2つ
  {
    const tops = [];
    for (const [x, y, w, d, h0, r, ty, , y0 = 0] of bl) {
      const h = h0 + y0;
      if (ty === "prince" || ty === "mall" || ty === "school" || h < 18) continue;
      const n = 1 + (R() < 0.5 ? 1 : 0);
      for (let k = 0; k < n; k++) {
        const ox = (R() - 0.5) * w * 0.5,
          oz = (R() - 0.5) * d * 0.5,
          cr = Math.cos(r),
          sr = Math.sin(r);
        tops.push([x * S + ox * cr - oz * sr, landY(x, y) + h, y * S + ox * sr + oz * cr, 3 + R() * 4, 2 + R() * 2.5, 3 + R() * 3, r]);
      }
    }
    const T = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0xb8b8b2, roughness: 0.9 }), Math.max(1, tops.length));
    tops.forEach(([x, y, z, w, h, d, r], i) => {
      M.compose(V.set(x, y, z), Qq.setFromEuler(E.set(0, -r, 0)), Sc.set(w, h, d));
      T.setMatrixAt(i, M);
    });
    T.count = tops.length;
    g.add(T);
  }
  // びわ湖大津プリンスホテル：細長い楕円の塔。白い壁に、階ごとの窓の帯
  {
    const p = bl.find((b) => b[6] === "prince");
    if (p) {
      const [x, y, w, d, h, r] = p,
        m = new THREE.MeshStandardMaterial({
          color: 0xeceae4,
          roughness: 0.6,
          map: cvTex(32, 64, (gg, cw, ch) => {
            gg.fillStyle = "#f2f0ea";
            gg.fillRect(0, 0, cw, ch);
            gg.fillStyle = "#56636e";
            for (let yy = 0; yy < ch; yy += 8) gg.fillRect(0, yy + 2, cw, 4);
          }),
          emissiveMap: cvTex(32, 64, (gg, cw, ch) => {
            const Rr = rnd(77);
            gg.fillStyle = "#000";
            gg.fillRect(0, 0, cw, ch);
            for (let yy = 0; yy < ch; yy += 8) for (let xx = 0; xx < cw; xx += 4) if (Rr() < 0.45) (gg.fillStyle = "#ffe2b0"), gg.fillRect(xx, yy + 2, 3, 4);
          }),
          emissive: 0xffffff,
          emissiveIntensity: 0,
        });
      for (const t of [m.map, m.emissiveMap]) {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(10, h / 3.5 / 8);
      }
      m.onBeforeCompile = (sh) => {
        sh.fragmentShader = sh.fragmentShader.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n" + CITY_FILL);
      };
      m.customProgramCacheKey = () => "city-prince";
      mats.push(m);
      const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 28, 1).translate(0, 0.5, 0), m);
      tw.position.set(x * S, landY(x, y) - 0.3, y * S);
      tw.scale.set(w, h, d);
      tw.rotation.y = -r;
      g.add(tw);
      const base = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0xd9d5cc, roughness: 0.85 }));
      base.position.copy(tw.position);
      base.scale.set(w * 1.6, 12, d * 2.2);
      base.rotation.y = -r;
      g.add(base);
    }
  }
  scene.add(g);
  g.userData.bl = bl; // 確認用（はみ出しの検査）
  return {
    g,
    userData: g.userData,
    // 夜は窓が灯る（種類ごとに灯る窓の割合と色が違う）
    update(day) {
      const k = Math.min(1, Math.max(0, (0.22 - day) / 0.14));
      for (const m of mats) m.emissiveIntensity = 1.1 * k;
    },
  };
})();
onFrame(130, (f) => G.city.update(f.day)); // 毎フレームの更新（南湖の街の夜の窓。順番は 00-head.js の onFrame）
