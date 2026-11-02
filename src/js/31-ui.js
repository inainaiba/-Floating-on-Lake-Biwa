/* ---------- 最初の画面：Floating → 建物を選ぶ → 色・素材・灯り → 放つ ---------- */
const $ = (id) => document.getElementById(id),
  restBtn = $("rest");
const hex = (c) => "#" + c.toString(16).padStart(6, "0");
function dots(el, cols, key) {
  el.innerHTML = "";
  cols.forEach((c, i) => {
    const d = document.createElement("div");
    d.className = "dot" + (CUST[key] === i ? " on" : "");
    d.style.background = hex(c);
    d.onclick = () => {
      CUST[key] = i;
      buildHouse();
      dots(el, cols, key);
    };
    el.appendChild(d);
  });
}
const MAT_ICONS = [
  '<path d="M5 19c4-6 10-8 14-14M8 19c3-4 7-6 11-9M5 14c3-3 6-5 9-9"/>',
  '<rect x="6" y="6" width="12" height="12"/>',
  '<circle cx="12" cy="12" r="7" stroke-dasharray="2 2"/>',
];
function mats() {
  const el = $("cMat");
  el.innerHTML = "";
  MAT_ICONS.forEach((p, i) => {
    const d = document.createElement("div");
    d.className = "mbtn" + (CUST.mat === i ? " on" : "");
    d.innerHTML = '<svg viewBox="0 0 24 24">' + p + "</svg>";
    d.onclick = () => {
      CUST.mat = i;
      buildHouse();
      mats();
    };
    el.appendChild(d);
  });
}
function showName() {
  const b = BUILDINGS[CUST.b];
  $("nm").textContent = String(CUST.b + 1).padStart(2, "0");
}
function pick(d) {
  CUST.b = (CUST.b + d + BUILDINGS.length) % BUILDINGS.length;
  buildHouse();
  showName();
}
$("prev").onclick = () => pick(-1);
$("next").onclick = () => pick(1);
$("bright").oninput = (e) => {
  CUST.bright = +e.target.value;
};
$("ab").onclick = (e) => {
  e.stopPropagation();
  $("about").classList.add("on");
};
$("about").onclick = (e) => {
  if (e.target.tagName !== "A") $("about").classList.remove("on");
};
$("title").onclick = () => {
  {
    const ok = starts.filter(([x, y]) => !inReeds(x, y) && inMain(x, y) && depth(x, y) > 1.2);
    const s2 = ok[Math.floor((DBG_START ? R0() : TRUE_RANDOM()) * ok.length)]; // 確認用（?debug）では毎回同じ所（撮り比べのため）
    if (s2) {
      B.x = s2[0];
      B.y = s2[1];
      camX = B.x * S;
      camZ = B.y * S;
    }
  }
  $("title").style.opacity = 0;
  setTimeout(() => ($("title").style.display = "none"), 1200);
  STATE = "select";
  $("sel").style.display = "flex";
  $("prev").style.display = $("next").style.display = "grid";
  showName();
  dots($("cBody"), BODY_COLORS, "body");
  dots($("cLight"), LIGHT_COLORS, "light");
  mats();
};
$("go").onclick = () => {
  audioInit();
  if (inReeds(B.x, B.y) || !inMain(B.x, B.y) || depth(B.x, B.y) < 1.2) {
    const ok = starts.filter(([x, y]) => !inReeds(x, y) && inMain(x, y) && depth(x, y) > 1.2);
    const s2 = ok[Math.floor((DBG_START ? R0() : Math.random()) * ok.length)]; // 確認用（?debug）では毎回同じ所（撮り比べのため）
    if (s2) {
      B.x = s2[0];
      B.y = s2[1];
      camX = B.x * S;
      camZ = B.y * S;
    }
  }
  STATE = "lake";
  document.body.classList.add("lake");
  $("sel").style.opacity = 0;
  setTimeout(() => ($("sel").style.display = "none"), 800);
  $("prev").style.display = $("next").style.display = "none";
  dist = distT = Math.max(80, house.size * 3);
  B.trail = [[B.x, B.y]];
  let seen = false;
  try {
    seen = localStorage.getItem("floating.hint2") === "1";
    localStorage.setItem("floating.hint2", "1");
  } catch (e) {}
  if (!seen || replayWanted) setTimeout(() => runHints(), 1200);
  replayWanted = false;
};
// 湖に出てからの案内：一つずつ文を出し、関係する画面のボタンを光らせる
let replayWanted = false; // 「案内をもう一度」を、湖に出る前に押したとき
function runHints() {
  const mob = matchMedia("(pointer:coarse)").matches;
  const steps = [
    ["ドラッグで見回す・" + (mob ? "ピンチ" : "ホイール") + "で寄る", "Drag to look around, " + (mob ? "pinch" : "scroll") + " to zoom", null],
    [mob ? "左下の円で舵をとる。手を離すと、また漂う" : "矢印キーかWASDで舵をとる。離すと、また漂う", mob ? "Steer with the circle at lower left" : "Steer with arrow keys or WASD", mob ? "joy" : null],
    ["右上の地図で、行きたい場所をタップ", "Tap the map (top right) to set a destination", "view"],
    ["赤いブイに近づいてタップすると、その集落の映像がひらく", "Drift close to a red buoy and tap it", null],
    ["時は流れ、季節がめぐる。ゆっくりどうぞ", "Time flows, seasons turn", null],
  ];
  const hn = $("hint");
  let k = 0,
    lit = null;
  const show = () => {
    if (lit) lit.classList.remove("ping");
    lit = null;
    if (k >= steps.length || STATE !== "lake") {
      hn.style.opacity = 0;
      return;
    }
    const [j, e, target] = steps[k++];
    hn.innerHTML = j + '<br><span style="font-size:11px;opacity:.8">' + e + "</span>";
    hn.style.opacity = 0.9;
    if (target && $(target)) (lit = $(target)).classList.add("ping");
    clearTimeout(hn._t);
    hn._t = setTimeout(() => {
      hn.style.opacity = 0;
      setTimeout(show, 1600);
    }, 5200);
  };
  show();
}
// 「この作品について」から、案内をもう一度
$("replayHint").onclick = (e) => {
  e.stopPropagation();
  $("about").classList.remove("on");
  if (STATE === "lake") runHints();
  else replayWanted = true; // 湖に出たときに流す
};
$("snd").onclick = () => {
  SND.on = !SND.on;
  $("snd").classList.toggle("off", !SND.on);
  if (SND.ctx && SND.on) SND.ctx.resume();
};
restBtn.onclick = () => {
  let best = null,
    bd = -1;
  for (let a = 0; a < 6.283; a += 0.2) {
    const x = B.x + Math.cos(a) * 400,
      y = B.y + Math.sin(a) * 400;
    if (!inLake(x, y)) continue;
    const d = depth(x, y);
    if (d > bd) {
      bd = d;
      best = a;
    }
  }
  if (best !== null) {
    B.kick = 6;
    B.kx = Math.cos(best) * 0.15;
    B.ky = Math.sin(best) * 0.15;
    B.rest = false;
  }
};
// 選ぶ画面では、横にスワイプして建物を替える
{
  let sx0 = null;
  gl.addEventListener("pointerdown", (e) => {
    if (STATE === "select") sx0 = e.clientX;
  });
  gl.addEventListener("pointerup", (e) => {
    if (STATE === "select" && sx0 !== null && Math.abs(e.clientX - sx0) > 60) pick(e.clientX < sx0 ? 1 : -1);
    sx0 = null;
  });
}
addEventListener("keydown", (e) => {
  if (STATE === "select") {
    if (e.key === "ArrowRight") pick(1);
    if (e.key === "ArrowLeft") pick(-1);
  }
});

document.addEventListener("visibilitychange", () => {
  if (!SND.ctx) return;
  document.hidden ? SND.ctx.suspend() : SND.on && SND.ctx.resume();
});
// 鑑賞：ボタンや案内を消し、カメラがゆっくり湖を漂う（51-frame-camera.js）。どこかに触れるか、キーを押すと戻る
$("watch").onclick = (e) => {
  e.stopPropagation();
  G.watch = performance.now();
  document.body.classList.add("watch");
};
for (const ev of ["pointerdown", "keydown", "wheel"])
  addEventListener(
    ev,
    () => {
      if (!G.watch || performance.now() - G.watch < 600) return; // 押したその手で戻らないように
      G.watch = 0;
      document.body.classList.remove("watch");
    },
    true,
  );


// 画質を変えて読み込み直したとき（31b-settings.js）：はじめの画面を飛ばして、元の位置・向き・建物のまま湖に戻る
function resumeLake() {
  let r = null;
  try {
    r = JSON.parse(sessionStorage.getItem("floating.resume") || "null");
    sessionStorage.removeItem("floating.resume");
  } catch (e) {}
  if (!r || Date.now() - r.at > 120000) return false;
  Object.assign(CUST, r.cust);
  buildHouse();
  B.x = r.x;
  B.y = r.y;
  B.yaw = r.yaw;
  camX = B.x * S;
  camZ = B.y * S;
  $("title").style.display = "none";
  $("sel").style.display = "none";
  $("prev").style.display = $("next").style.display = "none";
  STATE = "lake";
  document.body.classList.add("lake");
  audioInit(); // 音は、次に画面に触れたときに鳴りはじめる（ブラウザの決まり）
  addEventListener("pointerdown", () => SND.ctx && SND.on && SND.ctx.resume(), { once: true });
  yaw = yawT = r.cy;
  pitch = r.pitch;
  dist = distT = r.dist;
  B.trail = [[B.x, B.y]];
  return true;
}

// ボタンを控えめに：触れる・動かす・キーを押すと、上のボタンと舵の円を数秒だけはっきり見せる（src/shell.html の body.awake）
{
  let tid = 0;
  const wake = () => {
    document.body.classList.add("awake");
    clearTimeout(tid);
    tid = setTimeout(() => document.body.classList.remove("awake"), 4000);
  };
  for (const ev of ["pointerdown", "pointermove", "keydown", "wheel"]) addEventListener(ev, (e) => (ev !== "pointermove" || e.pointerType === "mouse" ? wake() : 0), { passive: true });
  wake();
}
