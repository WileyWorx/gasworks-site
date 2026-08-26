#!/usr/bin/env node
/**
 * Entry point for local responsive checks.
 * Prefer: npm run check:responsive
 *
 * Legacy:
 *   node scripts/check-responsive.mjs
 *   node scripts/check-responsive.mjs https://wearegasworks.com
 *
 * Live URL mode still uses the inline probe (no visual baselines against prod).
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const liveUrl = process.argv[2];

if (liveUrl && /^https?:\/\//.test(liveUrl)) {
  console.error(
    "Live URL visual baselines are not supported.\n" +
      "Run against local files: npm run check:responsive\n" +
      "Or open the live site and use npm run check:responsive after deploy."
  );
  process.exit(1);
}

const args = ["playwright", "test", "--config=playwright.config.mjs", ...process.argv.slice(2)];
const child = spawn("npx", args, {
  cwd: ROOT,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 1));
