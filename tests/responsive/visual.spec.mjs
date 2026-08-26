/**
 * Visual regression across the viewport matrix.
 * Baselines live in tests/responsive/baselines/ — commit them; update with:
 *   npm run check:responsive:update
 */
import { test, expect } from "@playwright/test";
import { PAGES, VIEWPORTS, preparePage, settlePage } from "./helpers.mjs";

for (const pageInfo of PAGES) {
  for (const vp of VIEWPORTS) {
    test(`visual ${pageInfo.id} @ ${vp.label}`, async ({ page }) => {
      await preparePage(page);
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await page.goto(pageInfo.path, { waitUntil: "domcontentloaded" });
      await settlePage(page);

      // Viewport shot (not full-page) — stable size, catches chrome/hero/layout breaks
      await expect(page).toHaveScreenshot(`${pageInfo.id}-${vp.label}.png`, {
        fullPage: false,
        animations: "disabled",
        // Mask highly dynamic media so video frames do not flake
        mask: [
          page.locator(".media-mill video"),
          page.locator(".hero__video"),
          page.locator(".site-backdrop"),
        ],
      });
    });
  }
}
