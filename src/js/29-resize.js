/* ---------- 画面サイズ ---------- */
function resize() {
  const w = innerWidth,
    h = innerHeight,
    d = Math.min(devicePixelRatio, HQ ? 2.5 : 2) * resScale;
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
