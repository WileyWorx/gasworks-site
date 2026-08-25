# Gasworks site

Static marketing site for [wearegasworks.com](https://wearegasworks.com). Hand-built HTML, CSS, and vanilla JS. No framework, no bundler.

## Before deploying

Run the automated cross-device check before every deploy:

```bash
npm install
npx playwright install chromium
npm run check
```

Point it at production instead of a local server:

```bash
npm run check:live
```

A **non-zero exit** means at least one viewport/page failed a hard rule (horizontal overflow, undersized touch targets, text/inputs too small, layout-shift media, safe-area collisions, or a console error). Fix those before shipping. Screenshots land in `scripts/screenshots/` for a visual pass.

This tooling is `devDependencies` only. It does not ship to visitors or change how the site loads in production.
