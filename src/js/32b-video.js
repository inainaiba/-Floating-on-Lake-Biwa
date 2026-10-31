/* ---------- 動画の撮影：右上のカメラの下の丸から。画面の部品は写さない
   ・動画：いま見ている湖をそのまま（30秒まで。音は mp4 に入れて再生できる環境でだけ一緒に録る）
   ・早回し：その日の時刻だけを速く進めて、一日の移り変わりを約20秒に縮める（月と天気はそのまま）。撮り終えたら今の時刻に戻る
   撮影の間は、描画の重さで解像度を変えない（動画の大きさが途中で変わらないように）。写真のボタンは隠す ---------- */
const REC = { on: false, mode: null, mr: null, chunks: [], t0: 0 },
  REC_MAX = 30, // 動画の長さの上限（秒）
  REC_TL = 20; // 早回しで一日にかける秒数
const recOk = !!(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream);
if (!recOk) document.body.classList.add("norec");
// 録れる形式：Android や iPhone の動画アプリで再生できるよう、mp4（H.264）を選ぶ。
// 音は mp4 に AAC で入れられるとき（Safari など）だけ録る。Chrome の mp4 は音が Opus になり、多くのスマートフォンで再生できないため、映像だけにする。
// mp4 が録れないときは webm（音つき）
function recMime(audio) {
  const ok = (t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t);
  if (audio && ok("video/mp4;codecs=avc1.42E01E,mp4a.40.2")) return ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", true];
  for (const t of ["video/mp4;codecs=avc1.42E01E", "video/mp4;codecs=avc1", "video/mp4"]) if (ok(t)) return [t, false];
  for (const t of ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]) if (ok(t)) return [t, audio];
  return ["", false];
}
function recStart(mode) {
  $("recm").classList.remove("on");
  if (!recOk || REC.on || isFar) return;
  // H.264 は幅と高さが偶数でないと正しく作れないことがあるので、撮影の間は描く大きさを偶数にそろえる（止めたら resize で戻す）
  const cv = renderer.domElement;
  if (cv.width % 2 || cv.height % 2) renderer.setDrawingBufferSize(cv.width - (cv.width % 2), cv.height - (cv.height % 2), 1);
  const stream = cv.captureStream(30),
    [mime, withAudio] = recMime(mode === "video" && !!SND.ctx);
  // 動画は音も録る（Web Audio の出口を分けて、映像と一緒に）
  if (withAudio) {
    if (!SND.recDest) {
      SND.recDest = SND.ctx.createMediaStreamDestination();
      SND.master.connect(SND.recDest);
    }
    for (const tr of SND.recDest.stream.getAudioTracks()) stream.addTrack(tr);
  }
  let mr;
  try {
    mr = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 10e6 } : { videoBitsPerSecond: 10e6 });
  } catch (e) {
    try {
      mr = new MediaRecorder(stream);
    } catch (e2) {
      resize();
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
  resize(); // 偶数にそろえた描く大きさを戻す
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
