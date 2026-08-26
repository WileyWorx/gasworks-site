#!/usr/bin/env node
/**
 * Responsive architecture linter for Gasworks (dev tooling only).
 *
 * Fails the process on hard violations; prints warnings for soft ones.
 * Does not modify CSS — report only.
 *
 * Usage: node scripts/lint-responsive.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TOKENS_FILE = path.join(ROOT, "styles", "tokens.css");
const CSS_GLOBS = ["styles.css", "styles/tokens.css"];

const ALLOWED_BP_VARS = new Set(["--bp-sm", "--bp-md", "--bp-lg"]);

const failures = [];
const warnings = [];

function fail(file, line, rule, message) {
  failures.push({ file, line, rule, message });
  console.error(`FAIL  ${path.relative(ROOT, file)}:${line}  [${rule}]  ${message}`);
}

function warn(file, line, rule, message) {
  warnings.push({ file, line, rule, message });
  console.warn(`WARN  ${path.relative(ROOT, file)}:${line}  [${rule}]  ${message}`);
}

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}

function lineAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

async function loadTokenBreakpoints(tokensCss) {
  const px = new Set();
  const re = /--bp-[\w-]+\s*:\s*([\d.]+)px/g;
  let m;
  while ((m = re.exec(tokensCss))) {
    px.add(`${m[1]}px`);
  }
  return px;
}

function isTokensPath(file) {
  return path.normalize(file) === path.normalize(TOKENS_FILE);
}

/** Rough selector → @media (min/max-width) count for layout queries only */
function countBreakpointOverrides(css, file) {
  const cleaned = stripComments(css);
  const mediaRe = /@media\s*([^{]+)\{/g;
  const selectorHits = new Map();
  let m;
  while ((m = mediaRe.exec(cleaned))) {
    const query = m[1];
    if (!/(max|min)-width/.test(query)) continue;
    // Find block body by brace matching
    let i = m.index + m[0].length - 1;
    let depth = 0;
    let start = -1;
    for (; i < cleaned.length; i++) {
      if (cleaned[i] === "{") {
        depth++;
        if (depth === 1) start = i + 1;
      } else if (cleaned[i] === "}") {
        depth--;
        if (depth === 0) {
          const body = cleaned.slice(start, i);
          const sels = body.match(/(^|})\s*([^{}@/]+)\{/g) || [];
          for (const raw of sels) {
            const sel = raw.replace(/^}\s*/, "").replace(/\{$/, "").trim();
            if (!sel || sel.startsWith("@")) continue;
            // Normalize to first simple selector chunk
            const key = sel.split(",")[0].trim().replace(/\s+/g, " ");
            selectorHits.set(key, (selectorHits.get(key) || 0) + 1);
          }
          break;
        }
      }
    }
  }

  for (const [sel, count] of selectorHits) {
    if (count > 2) {
      warn(
        file,
        1,
        "too-many-overrides",
        `selector appears in ${count} width media queries (>2): ${sel.slice(0, 120)}`
      );
    }
  }
}

function lintFile(file, css, allowedBpPx) {
  const cleaned = stripComments(css);
  const inTokens = isTokensPath(file);
  const lines = cleaned.split("\n");

  // Walk declarations line-by-line (good enough for this codebase)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    // font-size: …px outside tokens
    const fs = line.match(/font-size\s*:\s*([^;]+);/);
    if (fs && /\d+\s*px/.test(fs[1]) && !inTokens) {
      fail(file, lineNo, "font-size-px", `hardcoded px font-size outside tokens: ${fs[1].trim()}`);
    }

    // vh units (fail — use dvh/svh)
    if (/\d[\d.]*vh\b/.test(line) && !inTokens) {
      fail(file, lineNo, "vh-unit", `vh unit found — use dvh or svh instead: ${line.trim().slice(0, 100)}`);
    }

    // fixed width on likely layout containers
    const widthMatch = line.match(/(?<![-\w])width\s*:\s*([^;]+);/);
    if (widthMatch && !inTokens) {
      const val = widthMatch[1].trim();
      if (/^\d+(\.\d+)?px$/.test(val)) {
        const n = parseFloat(val);
        // ignore hairlines / icons / chrome under touch min
        if (n >= 100) {
          fail(
            file,
            lineNo,
            "fixed-width",
            `fixed pixel width on layout-ish declaration (${val}) — use % / min / max / tokens`
          );
        }
      }
    }
  }

  // Media queries
  const mediaRe = /@media\s*([^{]+)\{/g;
  let m;
  while ((m = mediaRe.exec(cleaned))) {
    const query = m[1].trim();
    const lineNo = lineAt(cleaned, m.index);

    if (/max-width\s*:/.test(query)) {
      fail(
        file,
        lineNo,
        "max-width-media",
        `max-width media query (use min-width authoring only): ${query.slice(0, 120)}`
      );
    }

    // Warn on min-width values not in token set
    const minVals = [...query.matchAll(/min-width\s*:\s*([^)\s]+)/g)];
    for (const mv of minVals) {
      const raw = mv[1].trim();
      if (raw.startsWith("var(")) {
        const varName = raw.match(/var\(\s*(--bp-[\w-]+)/);
        if (varName && !ALLOWED_BP_VARS.has(varName[1])) {
          warn(file, lineNo, "unknown-breakpoint", `breakpoint var not in token set: ${varName[1]}`);
        }
        continue;
      }
      if (/^\d+(\.\d+)?px$/.test(raw) && !allowedBpPx.has(raw)) {
        warn(
          file,
          lineNo,
          "unknown-breakpoint",
          `min-width ${raw} is not in styles/tokens.css (--bp-*): ${query.slice(0, 100)}`
        );
      }
    }

    // Also warn max-width values that aren't tokens (still a fail above)
    const maxVals = [...query.matchAll(/max-width\s*:\s*([^)\s]+)/g)];
    for (const mv of maxVals) {
      const raw = mv[1].trim();
      if (/^\d+(\.\d+)?px$/.test(raw) && !allowedBpPx.has(raw)) {
        warn(
          file,
          lineNo,
          "unknown-breakpoint",
          `max-width ${raw} is not in styles/tokens.css (--bp-*): ${query.slice(0, 100)}`
        );
      }
    }
  }

  countBreakpointOverrides(cleaned, file);
}

async function main() {
  const tokensCss = await fs.readFile(TOKENS_FILE, "utf8");
  const allowedBpPx = await loadTokenBreakpoints(tokensCss);

  for (const rel of CSS_GLOBS) {
    const file = path.join(ROOT, rel);
    let css;
    try {
      css = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }
    lintFile(file, css, allowedBpPx);
  }

  console.log("\n=== Responsive lint summary ===");
  console.log(`Token breakpoints: ${[...allowedBpPx].sort().join(", ") || "(none)"}`);
  console.log(`Failures: ${failures.length}`);
  console.log(`Warnings: ${warnings.length}`);

  if (failures.length) {
    const byRule = {};
    for (const f of failures) byRule[f.rule] = (byRule[f.rule] || 0) + 1;
    console.log("\nFailures by rule:");
    for (const [rule, n] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${n}\t${rule}`);
    }
  }
  if (warnings.length) {
    const byRule = {};
    for (const w of warnings) byRule[w.rule] = (byRule[w.rule] || 0) + 1;
    console.log("\nWarnings by rule:");
    for (const [rule, n] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${n}\t${rule}`);
    }
  }

  if (failures.length) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
