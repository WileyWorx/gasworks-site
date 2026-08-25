#!/usr/bin/env node
/**
 * Cross-device regression check for the Gasworks static site.
 * Dev tooling only — never ships to production.
 *
 * Usage:
 *   node scripts/check-responsive.mjs
 *   node scripts/check-responsive.mjs https://wearegasworks.com
 */
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import handler from "serve-handler";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SCREEN_DIR = path.join(__dirname, "screenshots");

const PAGES = [
  { id: "index", path: "/" },
  { id: "process", path: "/process" },
  { id: "contractors", path: "/contractors" },
];

const VIEWPORTS = [
  { w: 320, h: 568, label: "320x568" },
  { w: 390, h: 844, label: "390x844" },
  { w: 430, h: 932, label: "430x932" },
  { w: 768, h: 1024, label: "768x1024" },
  { w: 1024, h: 768, label: "1024x768" },
  { w: 1440, h: 900, label: "1440x900" },
  { w: 1920, h: 1080, label: "1920x1080" },
  { w: 844, h: 390, label: "844x390" },
];

const argUrl = process.argv[2];
const failures = [];
const summaryRows = [];

function fail(pageId, viewport, rule, selector, measured) {
  const line = {
    page: pageId,
    viewport,
    rule,
    selector: selector || "(unknown)",
    measured: measured == null ? "" : String(measured),
  };
  failures.push(line);
  console.error(
    `FAIL  ${pageId} @ ${viewport}  [${rule}]  ${line.selector}  →  ${line.measured}`
  );
}

function cssPath(elInfo) {
  return elInfo || "(unknown)";
}

async function startLocalServer() {
  const server = http.createServer((request, response) =>
    handler(request, response, {
      public: ROOT,
      cleanUrls: true,
      rewrites: [{ source: "/", destination: "/index.html" }],
    })
  );

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      ),
  };
}

async function preparePage(page) {
  await page.addInitScript(() => {
    try {
      window.sessionStorage.setItem("gasworks-intro-done", "1");
    } catch (_) {
      /* ignore */
    }
  });
}

async function settlePage(page) {
  // Dismiss intro if still visible
  await page.evaluate(async () => {
    try {
      sessionStorage.setItem("gasworks-intro-done", "1");
    } catch (_) {}
    const intro = document.querySelector("[data-intro]");
    if (intro && !intro.classList.contains("is-hidden")) {
      intro.classList.add("is-hidden");
      intro.setAttribute("aria-hidden", "true");
      intro.style.display = "none";
      document.body.classList.remove("intro-lock");
      document.body.classList.add("intro-done");
    }
    if (typeof window.GASWORKS_CLOSE_PROJECT === "function") {
      try {
        window.GASWORKS_CLOSE_PROJECT({ fromPop: true });
      } catch (_) {}
    }
  });

  await page.waitForTimeout(400);

  // Scroll to wake IntersectionObservers / lazy media, then return to top
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const doc = document.scrollingElement || document.documentElement;
    const max = Math.max(0, doc.scrollHeight - window.innerHeight);
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      window.scrollTo(0, Math.round((max * i) / steps));
      await sleep(120);
    }
    window.scrollTo(0, 0);
    await sleep(200);
  });
}

async function measure(page) {
  return page.evaluate(() => {
    const results = {
      overflow: null,
      overflowCulprits: [],
      smallHits: [],
      smallText: [],
      smallInputs: [],
      safeArea: [],
      mediaShift: [],
    };

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scrollEl = document.scrollingElement || document.documentElement;
    const scrollWidth = scrollEl.scrollWidth;

    if (scrollWidth > vw + 1) {
      results.overflow = { scrollWidth, vw, delta: scrollWidth - vw };
      const all = Array.from(document.querySelectorAll("body *"));
      for (const el of all) {
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") continue;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        if (r.right > vw + 1) {
          results.overflowCulprits.push({
            selector: describe(el),
            right: Math.round(r.right * 10) / 10,
            width: Math.round(r.width * 10) / 10,
          });
        }
      }
      results.overflowCulprits.sort((a, b) => b.right - a.right);
      results.overflowCulprits = results.overflowCulprits.slice(0, 8);
    }

    function describe(el) {
      if (!el || el === document.body) return "body";
      if (el.id) return `${el.tagName.toLowerCase()}#${el.id}`;
      const cls = (el.className && String(el.className).trim().split(/\s+/).slice(0, 3).join(".")) || "";
      const base = el.tagName.toLowerCase() + (cls ? "." + cls : "");
      const parent = el.parentElement;
      if (!parent || parent === document.body) return base;
      const siblings = Array.from(parent.children).filter((c) => c.tagName === el.tagName);
      const idx = siblings.indexOf(el);
      return `${describe(parent)} > ${base}:nth-of-type(${idx + 1})`;
    }

    function isVisible(el) {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
        return false;
      }
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }

    const interactiveSel =
      'a[href], button, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])';
    document.querySelectorAll(interactiveSel).forEach((el) => {
      if (!isVisible(el)) return;
      if (el.closest("[hidden], [aria-hidden='true'], .intro")) return;
      const r = el.getBoundingClientRect();
      const w = r.width;
      const h = r.height;
      if (w + 0.5 < 44 || h + 0.5 < 44) {
        results.smallHits.push({
          selector: describe(el),
          width: Math.round(w * 10) / 10,
          height: Math.round(h * 10) / 10,
        });
      }
    });

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const seenText = new Set();
    while (walker.nextNode()) {
      const parent = walker.currentNode.parentElement;
      if (!parent || !isVisible(parent)) continue;
      if (parent.closest("[hidden], [aria-hidden='true'], .visually-hidden, .sr-only, .intro")) {
        continue;
      }
      const style = window.getComputedStyle(parent);
      const size = parseFloat(style.fontSize);
      if (!Number.isFinite(size) || size >= 12) continue;
      const key = describe(parent);
      if (seenText.has(key)) continue;
      seenText.add(key);
      results.smallText.push({
        selector: key,
        fontSize: Math.round(size * 100) / 100,
      });
    }

    document.querySelectorAll("input, select, textarea").forEach((el) => {
      if (!isVisible(el)) return;
      if (el.closest("[hidden], [aria-hidden='true'], .intro")) return;
      if (el.type === "hidden" || el.tabIndex < 0 && el.getAttribute("tabindex") === "-1") return;
      const style = window.getComputedStyle(el);
      const size = parseFloat(style.fontSize);
      if (Number.isFinite(size) && size + 0.01 < 16) {
        results.smallInputs.push({
          selector: describe(el),
          fontSize: Math.round(size * 100) / 100,
        });
      }
    });

    // Safe-area probe (0 on most desktop runs)
    const probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;left:0;top:0;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none;";
    document.body.appendChild(probe);
    const cs = window.getComputedStyle(probe);
    const safeTop = parseFloat(cs.paddingTop) || 0;
    const safeBottom = parseFloat(cs.paddingBottom) || 0;
    probe.remove();

    if (safeTop > 0.5 || safeBottom > 0.5) {
      document.querySelectorAll("*").forEach((el) => {
        const style = window.getComputedStyle(el);
        const pos = style.position;
        if (pos !== "fixed" && pos !== "sticky") return;
        if (!isVisible(el)) return;
        const r = el.getBoundingClientRect();
        if (safeTop > 0.5 && r.top < safeTop - 0.5 && r.bottom > 0) {
          results.safeArea.push({
            selector: describe(el),
            edge: "top",
            top: Math.round(r.top * 10) / 10,
            safeTop,
          });
        }
        if (safeBottom > 0.5 && r.bottom > vh - safeBottom + 0.5 && r.top < vh) {
          results.safeArea.push({
            selector: describe(el),
            edge: "bottom",
            bottom: Math.round(r.bottom * 10) / 10,
            safeBottom,
            vh,
          });
        }
      });
    }

    document.querySelectorAll("img, video").forEach((el) => {
      if (el.closest("noscript")) return;
      const hasAttrW = el.hasAttribute("width") && el.getAttribute("width") !== "";
      const hasAttrH = el.hasAttribute("height") && el.getAttribute("height") !== "";
      const style = window.getComputedStyle(el);
      const ar = style.aspectRatio;
      const hasAr = ar && ar !== "auto" && ar !== "normal";
      const parentAr = el.parentElement
        ? window.getComputedStyle(el.parentElement).aspectRatio
        : "auto";
      const parentHasAr = parentAr && parentAr !== "auto" && parentAr !== "normal";
      if ((hasAttrW && hasAttrH) || hasAr || parentHasAr) return;
      // Intrinsic size from attributes on <source> parent tiles still count via parent aspect-ratio
      results.mediaShift.push({
        selector: describe(el),
        detail: "no width/height attrs and no aspect-ratio",
      });
    });

    return results;
  });
}

async function run() {
  await fs.mkdir(SCREEN_DIR, { recursive: true });

  let baseUrl = argUrl ? argUrl.replace(/\/$/, "") : null;
  let local = null;
  if (!baseUrl) {
    local = await startLocalServer();
    baseUrl = local.baseUrl;
    console.log(`Serving ${ROOT} at ${baseUrl}`);
  } else {
    console.log(`Checking live URL ${baseUrl}`);
  }

  const browser = await chromium.launch({ headless: true });
  const consoleErrors = new Map();

  try {
    for (const pageInfo of PAGES) {
      for (const vp of VIEWPORTS) {
        const key = `${pageInfo.id}@${vp.label}`;
        consoleErrors.set(key, []);

        const context = await browser.newContext({
          viewport: { width: vp.w, height: vp.h },
          deviceScaleFactor: 1,
        });
        const page = await context.newPage();
        await preparePage(page);

        page.on("pageerror", (err) => {
          consoleErrors.get(key).push(`pageerror: ${err.message}`);
        });
        page.on("console", (msg) => {
          if (msg.type() === "error") {
            consoleErrors.get(key).push(`console: ${msg.text()}`);
          }
        });

        const url = `${baseUrl}${pageInfo.path}`;
        let loadOk = true;
        try {
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
          await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
        } catch (err) {
          loadOk = false;
          fail(pageInfo.id, vp.label, "load", url, err.message);
        }

        if (loadOk) {
          await settlePage(page);

          const shotPath = path.join(SCREEN_DIR, `${pageInfo.id}-${vp.w}.png`);
          await page.screenshot({ path: shotPath, fullPage: true });

          const m = await measure(page);

          if (m.overflow) {
            const top = m.overflowCulprits[0];
            fail(
              pageInfo.id,
              vp.label,
              "horizontal-overflow",
              top ? top.selector : "document.scrollingElement",
              `scrollWidth=${m.overflow.scrollWidth} viewport=${m.overflow.vw} delta=${m.overflow.delta}` +
                (top ? ` culpritRight=${top.right}` : "")
            );
            for (let i = 1; i < Math.min(3, m.overflowCulprits.length); i++) {
              const c = m.overflowCulprits[i];
              fail(
                pageInfo.id,
                vp.label,
                "horizontal-overflow-culprit",
                c.selector,
                `right=${c.right} width=${c.width}`
              );
            }
          }

          for (const hit of m.smallHits) {
            fail(
              pageInfo.id,
              vp.label,
              "touch-target",
              hit.selector,
              `${hit.width}x${hit.height}`
            );
          }

          for (const t of m.smallText) {
            fail(
              pageInfo.id,
              vp.label,
              "text-size",
              t.selector,
              `${t.fontSize}px`
            );
          }

          for (const t of m.smallInputs) {
            fail(
              pageInfo.id,
              vp.label,
              "input-font-size",
              t.selector,
              `${t.fontSize}px`
            );
          }

          for (const s of m.safeArea) {
            fail(
              pageInfo.id,
              vp.label,
              "safe-area",
              s.selector,
              s.edge === "top"
                ? `top=${s.top} safeTop=${s.safeTop}`
                : `bottom=${s.bottom} safeBottom=${s.safeBottom}`
            );
          }

          for (const media of m.mediaShift) {
            fail(pageInfo.id, vp.label, "layout-shift-risk", media.selector, media.detail);
          }
        }

        for (const err of consoleErrors.get(key)) {
          fail(pageInfo.id, vp.label, "console-error", pageInfo.path, err);
        }

        const pageFails = failures.filter(
          (f) => f.page === pageInfo.id && f.viewport === vp.label
        ).length;
        summaryRows.push({
          page: pageInfo.id,
          viewport: vp.label,
          status: pageFails ? `FAIL(${pageFails})` : "PASS",
        });

        await context.close();
      }
    }
  } finally {
    await browser.close();
    if (local) await local.close();
  }

  console.log("\n=== Summary ===");
  const pad = (s, n) => String(s).padEnd(n);
  console.log(`${pad("page", 14)}${pad("viewport", 12)}${pad("status", 12)}`);
  for (const row of summaryRows) {
    console.log(`${pad(row.page, 14)}${pad(row.viewport, 12)}${pad(row.status, 12)}`);
  }
  console.log(`\nScreenshots: ${SCREEN_DIR}`);
  console.log(`Total failures: ${failures.length}`);

  if (failures.length) {
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
