/* ---------- 設定の画面：画質・音量・揺れを抑える・文字の表示（日本語／English／両方）。1項目1行の簡素な形。
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
  // 1項目1行：左に名前、右に選ぶもの。説明の小さな文字は出さない。文字の表示に合わせて、日本語か英語のどちらかだけを出す（data-en）
  const seg = (key, items) => `<div class="sg" data-k="${key}">` + items.map(([v, ja, en]) => `<b data-v="${v}" data-en="${en}">${ja}</b>`).join("") + "</div>";
  const row = (ja, en, ctl) => `<div class="it"><span class="lb" data-en="${en}">${ja}</span>${ctl}</div>`;
  p.innerHTML = `<div class="in"><h2 data-en="Settings">設定</h2>
${row("画質", "Quality", seg("q", [["auto", "自動", "Auto"], ["high", "高", "High"], ["mid", "中", "Mid"], ["low", "低", "Low"]]))}
${row("音量", "Volume", '<input id="cfgVol" type="range" min="0" max="1" step="0.05">')}
${row("揺れを抑える", "Less motion", seg("calm", [["true", "する", "On"], ["false", "しない", "Off"]]))}
${row("文字", "Text", seg("lang", [["ja", "日本語", "日本語"], ["en", "English", "English"], ["both", "両方", "Both"]]))}
<div class="cl" id="cfgClose" data-en="Close">閉じる</div></div>`;
  document.body.appendChild(p);
  applyLang();
  const vol = p.querySelector("#cfgVol");
  function show() {
    for (const sg of p.querySelectorAll(".sg")) {
      const k = sg.dataset.k;
      // 揺れを抑える：選んでいないときは、端末の設定（動きを減らす）に従っている値を示す
      const cur = k === "calm" ? String(CFG.calm ?? matchMedia("(prefers-reduced-motion: reduce)").matches) : String(CFG[k]);
      for (const b of sg.children) b.classList.toggle("on", b.dataset.v === cur);
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
      CFG.calm = v === "true";
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
