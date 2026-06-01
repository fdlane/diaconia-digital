#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(__dirname, "../../..");
const envPath = path.join(repoRoot, ".env");
const pathKey = process.platform === "win32" ? "Path" : "PATH";
const pathSeparator = process.platform === "win32" ? ";" : ":";

function parseEnvFile(source) {
  const env = {};

  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const name = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (!name) continue;

    const quote = value[0];
    if ((quote === "\"" || quote === "'") && value[value.length - 1] === quote) {
      value = value.slice(1, -1);
    }

    env[name] = value;
  }

  return env;
}

const rootEnv = fs.existsSync(envPath) ? parseEnvFile(fs.readFileSync(envPath, "utf8")) : {};
const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("Usage: run-with-root-env <command> [...args]");
  process.exit(1);
}

const child = spawn(command, args, {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...rootEnv,
    ...process.env,
    [pathKey]: [
      path.join(projectRoot, "node_modules/.bin"),
      path.join(repoRoot, "node_modules/.bin"),
      process.env[pathKey],
    ]
      .filter(Boolean)
      .join(pathSeparator),
  },
});

child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
