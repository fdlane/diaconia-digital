#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const distRoot = path.resolve(__dirname, "../dist");
const bundleDir = path.join(distRoot, "_expo/static/js/web");

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
for (const filePath of walk(bundleDir)) {
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

const publicEnv = {
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || "",
  EXPO_PUBLIC_AUTH_DEV_BYPASS: process.env.EXPO_PUBLIC_AUTH_DEV_BYPASS || "",
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || "",
  EXPO_PUBLIC_ZERO_CACHE_URL: process.env.EXPO_PUBLIC_ZERO_CACHE_URL || "",
  EXPO_PUBLIC_CLERK_JWT_TEMPLATE: process.env.EXPO_PUBLIC_CLERK_JWT_TEMPLATE || "",
};

const indexPath = path.join(distRoot, "index.html");
if (fs.existsSync(indexPath)) {
  const indexHtml = fs.readFileSync(indexPath, "utf8");
  const runtimeConfigScript = `<script>window.__DIACONIA_ENV__=${JSON.stringify(publicEnv).replace(/</g, "\\u003c")};</script>`;
  const patchedHtml = indexHtml.includes("window.__DIACONIA_ENV__=")
    ? indexHtml.replace(/<script>window\.__DIACONIA_ENV__=.*?<\/script>/, runtimeConfigScript)
    : indexHtml.replace("<script src=", `${runtimeConfigScript}<script src=`);
  fs.writeFileSync(indexPath, patchedHtml);
  console.log("Injected mobile web runtime public env into index.html.");
}
