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
   ?q=high / mid / low で強制できる。中と低はスマホ（MOBILE）だと水面の網目をさらに粗くする */
const QUALITY_TABLE = {
  high: { resStart: 1, resMax: 1, pixelMax: 2.5, shadowMap: 2048, shadowRange: 90, waterGrid: 420, terrain: [520, 650], reflection: 1, nearTrees: [500, 800], forest: [900, 1300], treeShadow: true, fireworks: 9000, fireworkBurst: 1, dof: 0 },
  mid: { resStart: 0.85, resMax: 0.9, pixelMax: 2, shadowMap: 1024, shadowRange: 40, waterGrid: 300, terrain: [360, 450], reflection: 0.5, nearTrees: [300, 480], forest: [600, 900], treeShadow: false, fireworks: 6000, fireworkBurst: 1, dof: 0 },
  low: { resStart: 0.6, resMax: 0.9, pixelMax: 2, shadowMap: 512, shadowRange: 40, waterGrid: 300, terrain: [360, 450], reflection: 0.5, nearTrees: [300, 480], forest: [600, 900], treeShadow: false, fireworks: 3500, fireworkBurst: 0.55, dof: 0 },
};
const QUALITY = { ...(QUALITY_TABLE[QUAL] || QUALITY_TABLE.mid) };
if (!HQ && MOBILE) QUALITY.waterGrid = 180;
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
