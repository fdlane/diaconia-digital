#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const distDir = path.resolve(__dirname, "../dist/_expo/static/js/web");

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return entry.isFile() && entry.name.endsWith(".js") ? [fullPath] : [];
  });
}

let patchedFiles = 0;
let patchedOccurrences = 0;
for (const filePath of walk(distDir)) {
  const source = fs.readFileSync(filePath, "utf8");
  const occurrences = source.match(/import\.meta/g)?.length ?? 0;
  if (occurrences === 0) continue;

  fs.writeFileSync(filePath, source.replace(/import\.meta/g, "({ env: {} })"));
  patchedFiles += 1;
  patchedOccurrences += occurrences;
}

if (patchedOccurrences > 0) {
  console.log(`Patched ${patchedOccurrences} import.meta reference(s) in ${patchedFiles} web bundle file(s).`);
}
