/**
 * Shared helpers for responsive Playwright tests.
 */
export const PAGES = [
  { id: "index", path: "/" },
  { id: "process", path: "/process" },
  { id: "contractors", path: "/contractors" },
  { id: "portfolio", path: "/portfolio" },
];

/** Fixed viewport matrix (width × height). */
export const VIEWPORTS = [
  { w: 320, h: 568, label: "320" },
  { w: 375, h: 667, label: "375" },
  { w: 390, h: 844, label: "390" },
  { w: 414, h: 896, label: "414" },
  { w: 768, h: 1024, label: "768" },
  { w: 1024, h: 768, label: "1024" },
  { w: 1280, h: 800, label: "1280" },
  { w: 1440, h: 900, label: "1440" },
];

/** Mobile widths where touch-target rules apply. */
export const MOBILE_MAX = 767;

/**
 * Playwright device presets: real phones + landscape variants.
 * Safe-area / DPR come from the device descriptor.
 */
export const DEVICE_PRESETS = [
  { name: "iPhone SE", key: "iPhone SE", landscape: false },
  { name: "iPhone 13", key: "iPhone 13", landscape: false },
  { name: "iPhone 13 landscape", key: "iPhone 13 landscape", landscape: true },
  { name: "iPhone 14 Pro", key: "iPhone 14 Pro", landscape: false },
  { name: "iPhone 14 Pro landscape", key: "iPhone 14 Pro landscape", landscape: true },
];

/** Decorative layers that intentionally paint past the viewport (clipped by overflow-x). */
export const OFFSCREEN_IGNORE =
  ".site-backdrop, .site-backdrop *, .media-mill__floor, .intro, .intro *";

export async function preparePage(page) {
  await page.addInitScript(() => {
    try {
      window.sessionStorage.setItem("gasworks-intro-done", "1");
    } catch {
      /* ignore */
    }
  });
}

export async function settlePage(page) {
  await page.evaluate(() => {
    try {
      sessionStorage.setItem("gasworks-intro-done", "1");
    } catch {
      /* ignore */
    }
    const intro = document.querySelector("[data-intro]");
    if (intro) {
      intro.classList.add("is-hidden");
      intro.setAttribute("aria-hidden", "true");
      intro.style.display = "none";
      document.body.classList.remove("intro-lock");
      document.body.classList.add("intro-done");
    }
    if (typeof window.GASWORKS_CLOSE_PROJECT === "function") {
      try {
        window.GASWORKS_CLOSE_PROJECT({ fromPop: true });
      } catch {
        /* ignore */
      }
    }
  });

  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.evaluate(() => {
    document.querySelectorAll("video").forEach((v) => {
      try {
        v.pause();
        v.removeAttribute("autoplay");
      } catch {
        /* ignore */
      }
    });
  });

  await page.waitForTimeout(350);

  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const doc = document.scrollingElement || document.documentElement;
    const max = Math.max(0, doc.scrollHeight - window.innerHeight);
    const steps = 6;
    for (let i = 1; i <= steps; i++) {
      window.scrollTo(0, Math.round((max * i) / steps));
      await sleep(80);
    }
    window.scrollTo(0, 0);
    await sleep(150);
  });
}
