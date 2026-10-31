/* ---------- 動画の撮影：右上のカメラの下の丸から。画面の部品は写さない
   ・動画：いま見ている湖をそのまま、音も一緒に（30秒まで）
   ・早回し：その日の時刻だけを速く進めて、一日の移り変わりを約20秒に縮める（月と天気はそのまま）。撮り終えたら今の時刻に戻る
   撮影の間は、描画の重さで解像度を変えない（動画の大きさが途中で変わらないように）。写真のボタンは隠す ---------- */
const REC = { on: false, mode: null, mr: null, chunks: [], t0: 0 },
  REC_MAX = 30, // 動画の長さの上限（秒）
  REC_TL = 20; // 早回しで一日にかける秒数
const recOk = !!(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream);
if (!recOk) document.body.classList.add("norec");
// 録れる形式：mp4 を先に（iPhone でも開きやすい）、なければ webm
function recMime() {
  for (const t of ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"])
    if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) return t;
  return "";
}
function recStart(mode) {
  $("recm").classList.remove("on");
  if (!recOk || REC.on || isFar) return;
  const stream = renderer.domElement.captureStream(30);
  // 動画は音も録る（Web Audio の出口を分けて、映像と一緒に）
  if (mode === "video" && SND.ctx) {
    if (!SND.recDest) {
      SND.recDest = SND.ctx.createMediaStreamDestination();
      SND.master.connect(SND.recDest);
    }
    for (const tr of SND.recDest.stream.getAudioTracks()) stream.addTrack(tr);
  }
  const mime = recMime();
  let mr;
  try {
    mr = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 10e6 } : { videoBitsPerSecond: 10e6 });
  } catch (e) {
    try {
      mr = new MediaRecorder(stream);
    } catch (e2) {
      return;
    }
  }
  REC.chunks = [];
  mr.ondataavailable = (e) => {
    if (e.data && e.data.size) REC.chunks.push(e.data);
  };
  mr.onstop = recSave;
  mr.start(500);
  Object.assign(REC, { on: true, mode, mr, t0: performance.now() });
  G.recOn = true;
  G.pw = 0;
  document.body.classList.add("rec");
  $("rec").classList.add("on");
  recLabel(0);
}
function recStop() {
  if (!REC.on) return;
  REC.on = false;
  G.recOn = false;
  try {
    REC.mr.stop();
  } catch (e) {}
  document.body.classList.remove("rec");
  $("rec").classList.remove("on");
  G.pw = 0; // 早回しで進めた時刻を戻す
}
function recLabel(el) {
  const s = Math.floor(el);
  $("rect").textContent = REC.mode === "video" ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `早回し ${Math.min(100, Math.round(G.pw * 100))}%`;
}
// 毎フレーム（53-frame.js）：経過を表示し、早回しでは時刻を進める。上限に来たら止める
function recTick(dt) {
  if (!REC.on) return;
  if (isFar || document.hidden) return recStop();
  const el = (performance.now() - REC.t0) / 1000;
  if (REC.mode === "timelapse") {
    G.pw = Math.min(1, G.pw + dt / REC_TL);
    if (G.pw >= 1) return recStop();
  } else if (el >= REC_MAX) return recStop();
  recLabel(el);
}
function recSave() {
  const type = (REC.mr && REC.mr.mimeType) || REC.chunks[0]?.type || "video/webm",
    bl = new Blob(REC.chunks, { type });
  REC.chunks = [];
  if (!bl.size) return;
  const u = URL.createObjectURL(bl),
    sh = $("shot"),
    v = sh.querySelector("video");
  if (v.src.startsWith("blob:")) URL.revokeObjectURL(v.src);
  v.src = u;
  sh.classList.add("on", "vid");
  v.play().catch(() => {});
  const t = new Date(),
    p = (n) => String(n).padStart(2, "0"),
    name = `floating-${REC.mode === "timelapse" ? "timelapse" : "video"}-${t.getFullYear()}${p(t.getMonth() + 1)}${p(t.getDate())}-${p(t.getHours())}${p(t.getMinutes())}${p(t.getSeconds())}.${type.includes("mp4") ? "mp4" : "webm"}`;
  const anchor = () => {
    const a = document.createElement("a");
    a.href = u;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  // 作品のページ（Artifact）では書き出しの仕組みで保存し、ほかではそのままファイルとして保存する
  if (DL) DL.save({ filename: name, data: bl }).catch(anchor);
  else anchor();
}
$("rec").onclick = (e) => {
  e.stopPropagation();
  if (REC.on) recStop();
  else $("recm").classList.toggle("on");
};
$("recV").onclick = (e) => {
  e.stopPropagation();
  recStart("video");
};
$("recT").onclick = (e) => {
  e.stopPropagation();
  recStart("timelapse");
};
addEventListener("pointerdown", (e) => {
  if (!e.target.closest || !e.target.closest("#recm,#rec")) $("recm").classList.remove("on");
});
// 写真・動画の見本を閉じるときは、動画を止める
$("shot").addEventListener("click", () => {
  const v = $("shot").querySelector("video");
  v.pause();
  $("shot").classList.remove("vid");
});
