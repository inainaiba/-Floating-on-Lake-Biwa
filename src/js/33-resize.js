/* ---------- 画面サイズ ---------- */
function resize() {
  const w = innerWidth,
    h = innerHeight,
    d = Math.min(devicePixelRatio, QUALITY.pixelMax, MOBILE ? 9 : 1.75) * resScale; // PC の高解像度の画面（Retina・4K）は1.75倍まで（見分けられない細かさは描かない）
  renderer.setPixelRatio(d);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  far.width = w * d;
  far.height = h * d;
  far._dpr = d;
}
addEventListener("resize", resize);
document.addEventListener("gesturestart", (e) => e.preventDefault());
resize();
