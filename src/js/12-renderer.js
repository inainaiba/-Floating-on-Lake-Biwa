/* ---------- three.js：近景 ---------- */
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("gl"), antialias: true });
const MOBILE_ = matchMedia("(pointer:coarse)").matches;
// 画質：端末に応じた3段階（?q=high|mid|low で固定もできる）。表示中もフレームの速さで解像度を自動調整
const QQ = Q.get("q");
const QUAL =
  QQ ||
  (MOBILE_
    ? devicePixelRatio >= 3 || (navigator.hardwareConcurrency || 4) < 6
      ? "mid"
      : "mid"
    : (navigator.hardwareConcurrency || 4) >= 8
      ? "high"
      : "mid");
const HQ = QUAL === "high",
  LQ = QUAL === "low";
const MOBILE = matchMedia("(pointer:coarse)").matches;
/* 画質の表：高（high）・中（mid）・低（low）で何を省くか。重いときはここを調整する
   towns 実際の家並みから建てる家の数の上限（岸に近い順）／nearPatch カメラのまわりの細かい地形の網目のマス数（0 で使わない）／reedPer ヨシ1か所あたりの株の数／hedgeDetail 生け垣の形の細かさ（0 で荒く）／rocks 岸の石を残す割合
   ?q=high / mid / low で強制できる。中と低はスマホ（MOBILE）だと水面の網目をさらに粗くする */
const QUALITY_TABLE = {
  high: { resStart: 1, resMax: 1, pixelMax: 2.5, shadowMap: 2048, shadowRange: 90, waterGrid: 420, terrain: [520, 650], towns: 9000, nearPatch: 128, reedPer: 6, hedgeDetail: 1, rocks: 1, reflection: 1, nearTrees: [500, 800], forest: [900, 1300], treeShadow: true, fireworks: 9000, fireworkBurst: 1, msaa: 4, cloudSteps: 32 },
  mid: { resStart: 0.85, resMax: 0.9, pixelMax: 2, shadowMap: 1024, shadowRange: 40, waterGrid: 300, terrain: [360, 450], towns: 4500, nearPatch: 96, reedPer: 6, hedgeDetail: 1, rocks: 1, reflection: 0.7, nearTrees: [300, 480], forest: [600, 900], treeShadow: false, fireworks: 6000, fireworkBurst: 1, msaa: 2, cloudSteps: 16 },
  low: { resStart: 0.6, resMax: 0.9, pixelMax: 2, shadowMap: 512, shadowRange: 40, waterGrid: 300, terrain: [280, 350], towns: 3000, nearPatch: 0, reedPer: 3, hedgeDetail: 0, rocks: 0.5, reflection: 0.5, nearTrees: [300, 480], forest: [600, 900], treeShadow: false, fireworks: 3500, fireworkBurst: 0.55, msaa: 0, cloudSteps: 0 },
};
const QUALITY = { ...(QUALITY_TABLE[QUAL] || QUALITY_TABLE.mid) };
// 画質に合わせて数を間引く（QUALITY.rocks が 0.5 なら2つに1つ残す）。配列をその場で縮めて返す
function thinQ(a, f = QUALITY.rocks) {
  if (f >= 1) return a;
  const k = Math.max(1, Math.round(1 / f));
  let j = 0;
  for (let i = 0; i < a.length; i += k) a[j++] = a[i];
  a.length = j;
  return a;
}
if (!HQ && MOBILE) QUALITY.waterGrid = 180;
if (!HQ && MOBILE) QUALITY.cloudSteps = 0; // スマートフォンは、立体的な雲をやめて動きの滑らかさを保つ
let resScale = QUALITY.resStart;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
G.exp = 1;
renderer.shadowMap.enabled = !MOBILE_;
renderer.shadowMap.type = THREE.PCFShadowMap; // radius で影の柔らかさを変える
renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.5 : 2));
const scene = new THREE.Scene(),
  camera = new THREE.PerspectiveCamera(50, 1, 0.5, 12000);
scene.fog = new THREE.Fog(0x9bb7c8, 800, 5000);
