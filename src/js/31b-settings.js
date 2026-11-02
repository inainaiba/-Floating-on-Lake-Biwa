/* ---------- 設定の画面：画質・音量・動きを抑える・文字の表示（日本語と英語／日本語／English）。
   上段の右端のボタンで開く。選んだものはこの端末に保存し、次に開いたときも使う（01-settings.js の CFG）。
   画質は読み込み直すと変わる。ほかはすぐ変わる ---------- */
G.settings = (() => {
  const save = () => {
    try {
      localStorage.setItem("floating.cfg", JSON.stringify(CFG));
    } catch (_) {}
  };
  // 文字の表示：body に lang-ja / lang-en を付ける（CSS で英語の行・日本語の文字を隠す）。日本語だけの見出しは data-en の英語に差し替える
  function applyLang() {
    document.body.classList.toggle("lang-ja", CFG.lang === "ja");
    document.body.classList.toggle("lang-en", CFG.lang === "en");
    for (const el of document.querySelectorAll("[data-en]")) {
      if (el.dataset.ja === undefined) el.dataset.ja = el.textContent;
      el.textContent = CFG.lang === "en" ? el.dataset.en : el.dataset.ja;
    }
  }
  applyLang();
  const p = document.createElement("div");
  p.id = "cfgp";
  const seg = (key, items) =>
    `<div class="sg" data-k="${key}">` + items.map(([v, t]) => `<b data-v="${v}">${t}</b>`).join("") + "</div>";
  p.innerHTML = `<div class="in"><h2>設定 <small style="font-size:11px;opacity:.6;letter-spacing:.1em">Settings</small></h2>
<div class="it"><div class="lb">画質 Quality<small>変えると読み込み直します / reloads the page</small></div>${seg("q", [["auto", "自動 Auto"], ["high", "高 High"], ["mid", "中 Mid"], ["low", "低 Low"]])}</div>
<div class="it"><div class="lb">音量 Volume</div><input id="cfgVol" type="range" min="0" max="1" step="0.05"></div>
<div class="it"><div class="lb">動きを抑える Reduce motion<small>揺れ・自動で回る速さ・稲光を抑えます</small></div>${seg("calm", [["null", "端末に従う Device"], ["true", "抑える On"], ["false", "抑えない Off"]])}</div>
<div class="it"><div class="lb">文字 Text</div>${seg("lang", [["both", "日本語と英語"], ["ja", "日本語"], ["en", "English"]])}</div>
<div class="cl" id="cfgClose">閉じる Close</div></div>`;
  document.body.appendChild(p);
  const vol = p.querySelector("#cfgVol");
  function show() {
    for (const sg of p.querySelectorAll(".sg")) {
      const k = sg.dataset.k;
      for (const b of sg.children) b.classList.toggle("on", b.dataset.v === String(CFG[k]));
    }
    vol.value = CFG.vol;
  }
  p.addEventListener("click", (e) => {
    if (e.target === p || e.target.id === "cfgClose") return p.classList.remove("on");
    const b = e.target.closest(".sg b");
    if (!b) return;
    const k = b.parentElement.dataset.k,
      v = b.dataset.v;
    if (k === "q") {
      if (CFG.q === v) return;
      CFG.q = v;
      save();
      // 画質は組み立てのときに決まるので、読み込み直す（?q= があれば外す）。
      // 湖に出ていたら、いまの位置・向き・建物を覚えておき、読み込み直したあと同じ所から続ける（31-ui.js の resumeLake）
      if (STATE === "lake")
        try {
          sessionStorage.setItem("floating.resume", JSON.stringify({ x: B.x, y: B.y, yaw: B.yaw || 0, cy: yaw, pitch, dist, cust: { ...CUST }, at: Date.now() }));
        } catch (e) {}
      const u = new URL(location.href);
      u.searchParams.delete("q");
      location.href = u.toString();
      return;
    }
    if (k === "calm") {
      CFG.calm = v === "null" ? null : v === "true";
      RM = CFG.calm ?? matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    if (k === "lang") {
      CFG.lang = v;
      applyLang();
    }
    save();
    show();
  });
  vol.addEventListener("input", () => {
    CFG.vol = +vol.value;
    save();
  });
  $("cfg").onclick = (e) => {
    e.stopPropagation();
    show();
    p.classList.add("on");
  };
  return { applyLang };
})();
