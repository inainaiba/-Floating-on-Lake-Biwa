/* ---------- 撮影：いま見ている湖の景色を写真にする（画面の部品は写さない）。航路は全体地図で見られる ---------- */
// 押した次のフレームで、表示より高い解像度（画面の3倍まで・長い辺2400pxまで）で一度だけ描き直して画像にし、元に戻す
function takePhoto() {
  const w = innerWidth,
    h = innerHeight,
    d = Math.min(3, 2400 / Math.max(w, h), Math.max(devicePixelRatio, 1) * 1.5);
  renderer.setPixelRatio(d);
  renderer.setSize(w, h, false);
  G.snapNow = true; // 次の描画のあとで画像にする（53-frame.js）
}
// 描いた直後のフレームの中で呼ぶ（描画の結果が残っているうちに読み出すため）
function finishPhoto() {
  G.snapNow = false;
  const cv = renderer.domElement;
  cv.toBlob(
    (bl) => {
      resize(); // 表示の解像度に戻す
      if (!bl) return;
      const u = URL.createObjectURL(bl),
        img = $("shot").querySelector("img");
      if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
      img.src = u;
      $("shot").classList.add("on");
      const t = new Date(),
        p = (n) => String(n).padStart(2, "0"),
        name = `floating-${t.getFullYear()}${p(t.getMonth() + 1)}${p(t.getDate())}-${p(t.getHours())}${p(t.getMinutes())}${p(t.getSeconds())}.jpg`;
      // 作品のページ（Artifact）では書き出しの仕組みで保存し、ほかではそのまま画像として保存する。
      // スマートフォンでは、出てきた写真を長押ししても写真に保存できる
      if (DL) DL.save({ filename: name, data: bl }).catch(() => {});
      else {
        const a = document.createElement("a");
        a.href = u;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    },
    "image/jpeg",
    0.92,
  );
}
$("save").onclick = () => takePhoto();
let DL = null;
try {
  window.claude &&
    window.claude.use &&
    window.claude
      .use("downloads")
      .then((d) => {
        DL = d;
      })
      .catch(() => {});
} catch (e) {}
$("shot").onclick = () => $("shot").classList.remove("on");
