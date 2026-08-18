/* global process */

import { spawn } from "node:child_process";

const FALLBACK_ENV = {
  VITE_SUPABASE_URL: "SUPABASE_URL",
  VITE_LASTFM_API_KEY: "LASTFM_API_KEY",
};

for (const [viteKey, fallbackKey] of Object.entries(FALLBACK_ENV)) {
  if (!process.env[viteKey] && process.env[fallbackKey]) {
    process.env[viteKey] = process.env[fallbackKey];
  }
}

const command =
  process.platform === "win32"
    ? { file: "powershell.exe", args: ["-NoProfile", "-Command", "npm.cmd run build"] }
    : { file: "npm", args: ["run", "build"] };

const child = spawn(command.file, command.args, {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
  shell: false,
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (code === 0) return;
  console.error(`npm run build failed with ${signal ?? code}`);
  process.exit(code ?? 1);
});
