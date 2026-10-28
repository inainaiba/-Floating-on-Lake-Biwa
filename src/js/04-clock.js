/* ---------- 共有時計：一日≈23分36秒、12日で一年 ---------- */
const DAY = 1416,
  EPOCH = Date.UTC(2026, 0, 1);
let PH = Q.get("phase"),
  MO = Q.get("month");
function clock() {
  const t = (Date.now() - EPOCH) / 1000,
    d = Math.floor(t / DAY);
  return { t, month: MO !== null ? +MO : ((d % 12) + 12) % 12, phase: PH !== null ? +PH : (t % DAY) / DAY };
}
