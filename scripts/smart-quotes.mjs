// Curl straight apostrophes that sit between two letters (it's → it’s,
// designer's → designer’s). That pattern only occurs in prose — code never
// has a letter'letter sequence (string delimiters/JSX attrs sit at word
// boundaries), so this is safe to run repo-wide and is idempotent.
//
// Usage: node scripts/smart-quotes.mjs [--write]
import fs from "node:fs";
import path from "node:path";

const WRITE = process.argv.includes("--write");
const exts = new Set([".js", ".jsx", ".json", ".md", ".css"]);
const skip = new Set(["node_modules", ".next", ".git", ".playwright-mcp", "scripts"]);
const RE = /([A-Za-z])'([A-Za-z])/g;

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (skip.has(e.name)) continue;
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f);
    else if (exts.has(path.extname(e.name))) files.push(f);
  }
})(".");

let changedFiles = 0;
let total = 0;
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  const count = (s.match(RE) || []).length;
  if (count === 0) continue;
  const n = s.replace(RE, "$1’$2");
  total += count;
  changedFiles++;
  console.log(`${count}\t${f}`);
  if (WRITE) fs.writeFileSync(f, n);
}
console.log("---");
console.log(`files: ${changedFiles}  apostrophes: ${total}  ${WRITE ? "(written)" : "(dry run)"}`);
