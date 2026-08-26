#!/usr/bin/env node
/**
 * Tiny static file server for Playwright webServer.
 * Uses serve-handler (already a devDependency).
 */
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import handler from "serve-handler";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.argv[2] || process.env.PORT || 4173);

const server = http.createServer((request, response) =>
  handler(request, response, {
    public: ROOT,
    cleanUrls: true,
    rewrites: [{ source: "/", destination: "/index.html" }],
  })
);

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Static server ${ROOT} → http://127.0.0.1:${PORT}`);
});
