/**
 * Real device presets (iPhone + landscape) with DPR / safe-area from Playwright.
 * Always fails on horizontal overflow. Off-screen soft unless RESPONSIVE_STRICT=1.
 */
import { test, expect, devices } from "@playwright/test";
import {
  PAGES,
  DEVICE_PRESETS,
  OFFSCREEN_IGNORE,
  preparePage,
  settlePage,
} from "./helpers.mjs";

const STRICT = process.env.RESPONSIVE_STRICT === "1";

for (const device of DEVICE_PRESETS) {
  const descriptor = devices[device.key];
  if (!descriptor) {
    test(`device ${device.name} (missing preset)`, () => {
      test.skip(true, `Unknown Playwright device: ${device.key}`);
    });
    continue;
  }

  for (const pageInfo of PAGES.filter((p) => p.id === "index" || p.id === "process")) {
    test(`device ${device.name} · ${pageInfo.id}`, async ({ browser }) => {
      const context = await browser.newContext({
        ...descriptor,
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      await preparePage(page);
      await page.goto(pageInfo.path, { waitUntil: "domcontentloaded" });
      await settlePage(page);

      const findings = await page.evaluate((ignoreSelector) => {
        const vw = window.innerWidth;
        const scrollEl = document.scrollingElement || document.documentElement;
        const overflow =
          scrollEl.scrollWidth > vw + 1
            ? { scrollWidth: scrollEl.scrollWidth, vw }
            : null;

        function clippedByAncestor(el) {
          let p = el.parentElement;
          while (p && p !== document.body) {
            const s = window.getComputedStyle(p);
            if (
              s.overflowX === "hidden" ||
              s.overflowX === "clip" ||
              s.overflow === "hidden" ||
              s.overflow === "clip"
            ) {
              return true;
            }
            p = p.parentElement;
          }
          return false;
        }

        let offscreenCount = 0;
        document.querySelectorAll("body *").forEach((el) => {
          if (el.matches(ignoreSelector) || el.closest(ignoreSelector)) return;
          const style = window.getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden") return;
          const r = el.getBoundingClientRect();
          if (r.width < 1 || r.height < 1) return;
          if (r.right > vw + 2 && r.left < vw && !clippedByAncestor(el)) {
            offscreenCount++;
          }
        });

        return { overflow, offscreenCount };
      }, OFFSCREEN_IGNORE);

      expect(findings.overflow, JSON.stringify(findings.overflow)).toBeNull();

      if (STRICT) {
        expect(findings.offscreenCount).toBe(0);
      } else if (findings.offscreenCount) {
        console.warn(
          `  ⚠ ${device.name} · ${pageInfo.id}: off-screen×${findings.offscreenCount}`
        );
      }

      await expect(page).toHaveScreenshot(
        `device-${device.name.replace(/\s+/g, "-")}-${pageInfo.id}.png`,
        {
          fullPage: false,
          animations: "disabled",
          mask: [
            page.locator(".media-mill video"),
            page.locator(".hero__video"),
            page.locator(".site-backdrop"),
          ],
        }
      );

      await context.close();
    });
  }
}
