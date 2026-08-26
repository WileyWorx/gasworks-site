/**
 * Layout assertions across the viewport matrix.
 * Catches overflow, clipping, touch targets, off-screen content, and axe issues.
 *
 * Always fails: horizontal overflow.
 * Soft (annotations) unless RESPONSIVE_STRICT=1: off-screen, text clip, touch, axe/contrast.
 */
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  PAGES,
  VIEWPORTS,
  MOBILE_MAX,
  OFFSCREEN_IGNORE,
  preparePage,
  settlePage,
} from "./helpers.mjs";

const STRICT = process.env.RESPONSIVE_STRICT === "1";

for (const pageInfo of PAGES) {
  for (const vp of VIEWPORTS) {
    test(`layout ${pageInfo.id} @ ${vp.label}`, async ({ page }) => {
      await preparePage(page);
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await page.goto(pageInfo.path, { waitUntil: "domcontentloaded" });
      await settlePage(page);

      const findings = await page.evaluate(
        ({ ignoreSelector, mobileMax, checkTouch }) => {
          const out = {
            horizontalOverflow: null,
            offscreenRight: [],
            textClipped: [],
            touchTargets: [],
          };

          const vw = window.innerWidth;
          const scrollEl = document.scrollingElement || document.documentElement;

          if (scrollEl.scrollWidth > vw + 1) {
            out.horizontalOverflow = {
              scrollWidth: scrollEl.scrollWidth,
              vw,
              delta: scrollEl.scrollWidth - vw,
            };
          }

          function describe(el) {
            if (!el || el === document.body) return "body";
            if (el.id) return `${el.tagName.toLowerCase()}#${el.id}`;
            const cls =
              (el.className &&
                String(el.className).trim().split(/\s+/).slice(0, 2).join(".")) ||
              "";
            return el.tagName.toLowerCase() + (cls ? "." + cls : "");
          }

          function isVisible(el) {
            const style = window.getComputedStyle(el);
            if (
              style.display === "none" ||
              style.visibility === "hidden" ||
              Number(style.opacity) === 0
            ) {
              return false;
            }
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          }

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

          document.querySelectorAll("body *").forEach((el) => {
            if (el.matches(ignoreSelector) || el.closest(ignoreSelector)) return;
            if (!isVisible(el)) return;
            const style = window.getComputedStyle(el);
            const r = el.getBoundingClientRect();

            if (r.right > vw + 2 && r.left < vw && !clippedByAncestor(el)) {
              out.offscreenRight.push({
                selector: describe(el),
                right: Math.round(r.right),
                width: Math.round(r.width),
              });
            }

            const oy = style.overflowY;
            const ox = style.overflowX;
            const clipY = oy === "hidden" || oy === "clip";
            const clipX = ox === "hidden" || ox === "clip";
            if (
              (clipY || clipX) &&
              (el.scrollHeight > el.clientHeight + 2 ||
                el.scrollWidth > el.clientWidth + 2)
            ) {
              if (el.tagName === "VIDEO" || el.tagName === "IMG") return;
              if (el.querySelector(":scope > video, :scope > img")) return;
              out.textClipped.push({
                selector: describe(el),
                scrollHeight: el.scrollHeight,
                clientHeight: el.clientHeight,
              });
            }
          });

          out.offscreenRight.sort((a, b) => b.right - a.right);
          out.offscreenRight = out.offscreenRight.slice(0, 10);
          out.textClipped = out.textClipped.slice(0, 10);

          if (checkTouch && vw <= mobileMax) {
            const sel =
              'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])';
            document.querySelectorAll(sel).forEach((el) => {
              if (!isVisible(el)) return;
              if (
                el.closest(
                  "[hidden], [aria-hidden='true'], .intro, .visually-hidden, .sr-only"
                )
              ) {
                return;
              }
              const r = el.getBoundingClientRect();
              const style = window.getComputedStyle(el);
              const w = Math.max(r.width, parseFloat(style.minWidth) || 0);
              const h = Math.max(r.height, parseFloat(style.minHeight) || 0);
              if (w + 0.5 < 44 || h + 0.5 < 44) {
                out.touchTargets.push({
                  selector: describe(el),
                  width: Math.round(w * 10) / 10,
                  height: Math.round(h * 10) / 10,
                });
              }
            });
            out.touchTargets = out.touchTargets.slice(0, 30);
          }

          return out;
        },
        {
          ignoreSelector: OFFSCREEN_IGNORE,
          mobileMax: MOBILE_MAX,
          checkTouch: true,
        }
      );

      expect(
        findings.horizontalOverflow,
        findings.horizontalOverflow
          ? `horizontal overflow delta=${findings.horizontalOverflow.delta}`
          : ""
      ).toBeNull();

      const softNotes = [];
      if (findings.offscreenRight.length) {
        softNotes.push(
          `off-screen×${findings.offscreenRight.length}: ${findings.offscreenRight[0].selector}`
        );
      }
      if (findings.textClipped.length) {
        softNotes.push(`clip×${findings.textClipped.length}`);
      }
      if (findings.touchTargets.length) {
        softNotes.push(`touch×${findings.touchTargets.length}`);
      }

      if (STRICT) {
        expect(findings.offscreenRight).toEqual([]);
        expect(findings.textClipped).toEqual([]);
        expect(findings.touchTargets).toEqual([]);
      }

      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();

      const serious = axe.violations.filter((v) =>
        ["critical", "serious"].includes(v.impact)
      );

      if (serious.length) {
        softNotes.push(`axe: ${serious.map((v) => v.id).join(", ")}`);
      }

      if (STRICT) {
        expect(serious, serious.map((v) => v.id).join(", ")).toEqual([]);
      }

      if (softNotes.length) {
        test.info().annotations.push({
          type: STRICT ? "strict" : "warning",
          description: softNotes.join(" · "),
        });
        console.warn(`  ⚠ ${pageInfo.id}@${vp.label}: ${softNotes.join(" · ")}`);
      }
    });
  }
}
