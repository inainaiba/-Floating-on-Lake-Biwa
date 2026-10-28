/* ---------- 持ち帰る線画：湖岸線・等深線・自分の軌跡・出発点・最後の点。文字なし、白と黒だけ、縦長 ---------- */
function makeDrawing() {
  const W_ = 1080,
    H_ = 1920,
    cv = document.createElement("canvas");
  cv.width = W_;
  cv.height = H_;
  const g = cv.getContext("2d");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, W_, H_);
  const pts = [...B.trail, [B.x, B.y]];
  let a = 1e9,
    b = 1e9,
    c2 = -1e9,
    d = -1e9;
  for (const [x, y] of pts) {
    a = Math.min(a, x);
    b = Math.min(b, y);
    c2 = Math.max(c2, x);
    d = Math.max(d, y);
  }
  // 構図：移動距離に応じて。短ければ軌跡に寄り、長ければ湖全体
  const cx = (a + c2) / 2,
    cy = (b + d) / 2,
    span = Math.max(c2 - a, ((d - b) * W_) / H_, 6000) * 1.5,
    lakeSpan = Math.max(maxX - minX, ((maxY - minY) * W_) / H_) * 1.08;
  const k = Math.min(1, Math.max(0, (B.dist - 3000) / 40000)),
    sp = Math.min(lakeSpan, span * (1 - k) + lakeSpan * k),
    ccx = cx * (1 - k) + ((minX + maxX) / 2) * k,
    ccy = cy * (1 - k) + ((minY + maxY) / 2) * k;
  const sc = W_ / sp,
    X = (x) => W_ / 2 + (x - ccx) * sc,
    Y = (y) => H_ / 2 + (y - ccy) * sc;
  g.lineJoin = g.lineCap = "round";
  g.strokeStyle = "rgba(0,0,0,.16)";
  g.lineWidth = 1.2;
  g.beginPath();
  for (const P of contours)
    for (let i = 0; i < P.length; i += 2) {
      g.moveTo(X(P[i][0]), Y(P[i][1]));
      g.lineTo(X(P[i + 1][0]), Y(P[i + 1][1]));
    }
  g.stroke();
  g.strokeStyle = "#000";
  g.lineWidth = 2.4;
  g.beginPath();
  for (const poly of [outer, ...islands]) {
    poly.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
    g.closePath();
  }
  g.stroke();
  g.lineWidth = 3.2;
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
  g.stroke();
  g.lineWidth = 2.4;
  g.fillStyle = "#fff";
  g.beginPath();
  g.arc(X(pts[0][0]), Y(pts[0][1]), 9, 0, 7);
  g.fill();
  g.stroke();
  g.fillStyle = "#000";
  g.beginPath();
  g.arc(X(B.x), Y(B.y), 5, 0, 7);
  g.fill();
  return cv;
}
$("save").onclick = () => {
  const cv = makeDrawing();
  cv.toBlob((bl) => {
    const u = URL.createObjectURL(bl);
    $("shot").querySelector("img").src = u;
    $("shot").classList.add("on");
    DL && DL.save({ filename: "floating.png", data: bl }).catch(() => {});
  }, "image/png");
};
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
