// 公開用のコードを軽くする（build.py から呼ぶ）：コメントと行頭の字下げを取り除く。名前や処理は変えない。
// 標準入力のコードを、標準出力へ。TypeScript（npm の typescript@6.0.2 を全体に入れる）の読み取りと書き出しを使う
// （文字列・テンプレート文字列・正規表現の中は触らない。テンプレート文字列の中の字下げもそのまま残す）
import { createRequire } from "module";
import { execSync } from "child_process";
import { readFileSync } from "fs";
const require = createRequire(import.meta.url);
let ts;
try {
  ts = require("typescript");
} catch (e) {
  ts = require(execSync("npm root -g").toString().trim() + "/typescript");
}
const src = readFileSync(0, "utf8");
const out = ts.transpileModule(src, {
  fileName: "floating.js",
  compilerOptions: { removeComments: true, target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, allowJs: true },
}).outputText;
// テンプレート文字列の範囲（その中の行頭の空白は残す）
const sf = ts.createSourceFile("o.js", out, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS);
const keep = [];
(function walk(n) {
  if (n.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral || n.kind === ts.SyntaxKind.TemplateExpression) keep.push([n.getStart(sf), n.end]);
  ts.forEachChild(n, walk);
})(sf);
keep.sort((a, b) => a[0] - b[0]);
let res = "",
  k = 0,
  pos = 0;
for (const line of out.split("\n")) {
  while (k < keep.length && keep[k][1] <= pos) k++;
  const inside = k < keep.length && keep[k][0] < pos && pos < keep[k][1];
  const t = inside ? line : line.replace(/^[ \t]+/, "");
  if (t.length || inside) res += t + "\n";
  pos += line.length + 1;
}
// 書き出しの先頭に付く "use strict"（モジュールではもともと厳格なので不要）を外す
process.stdout.write(res.replace(/^"use strict";\n/, ""));
