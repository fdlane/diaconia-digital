const path = require("node:path");
const fs = require("node:fs");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const config = getDefaultConfig(projectRoot);
const clerkReactRoot = path.dirname(require.resolve("@clerk/react/package.json"));
const clerkSharedRoot = path.dirname(require.resolve("@clerk/shared/package.json", { paths: [clerkReactRoot] }));
const clerkSharedRuntimeRoot = path.join(clerkSharedRoot, "dist/runtime");

function resolveClerkSharedCommonJs(moduleName) {
  const prefix = "@clerk/shared/";
  let subpath = null;
  if (moduleName === "@clerk/shared") {
    subpath = "index";
  } else if (moduleName.startsWith(prefix)) {
    subpath = moduleName.slice(prefix.length);
  }
  if (!subpath) return null;

  const candidates = [
    path.join(clerkSharedRuntimeRoot, `${subpath}.js`),
    path.join(clerkSharedRuntimeRoot, subpath, "index.js"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.unstable_enablePackageExports = true;
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "@clerk/react": path.resolve(projectRoot, "node_modules/@clerk/react"),
};
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" || platform == null) {
    const clerkSharedCommonJs = resolveClerkSharedCommonJs(moduleName);
    if (clerkSharedCommonJs) {
      return { type: "sourceFile", filePath: clerkSharedCommonJs };
    }
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
