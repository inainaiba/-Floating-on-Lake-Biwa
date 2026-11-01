// 組み立てのたびに、詰めたデータ（build.py の data()）を、作品と同じ読み戻し（src/js/00a-data.js）で元に戻し、
// 元のデータの CRC32 と一致するかを確かめる。一致しなければ、組み立てを止める（壊れたデータを公開しないため）。
//   node tools/datacheck.mjs <詰めたデータの JSON>
import fs from "fs";
const src = fs.readFileSync(new URL("../src/js/00a-data.js", import.meta.url), "utf8").replace(/^const DATA = await unpackData\(__DATA__\);\s*$/m, "");
const errs = [];
console.error = (m) => errs.push(String(m));
const unpackData = new Function(src + "\nreturn unpackData;")();
const data = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
let n = 0;
const count = (v) => {
  if (Array.isArray(v)) return v.forEach(count);
  if (v && typeof v === "object") {
    if (v.c32 !== undefined) n++;
    else for (const k in v) count(v[k]);
  }
};
count(data);
await unpackData(data);
if (errs.length) {
  process.stdout.write("データの読み戻しが元と違います：\n" + errs.join("\n") + "\n");
  process.exit(1);
}
process.stdout.write(`データの読み戻し：${n} 個とも元と同じ\n`);
