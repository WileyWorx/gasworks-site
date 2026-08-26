# Gasworks site

Static marketing site for [wearegasworks.com](https://wearegasworks.com). Hand-built HTML, CSS, and vanilla JS. No framework, no bundler.

## Before deploying

```bash
npm install
npx playwright install chromium
npm run lint:responsive   # architecture constraints (tokens, media queries, vh, fixed widths)
npm run check             # Playwright device matrix + screenshots
```

`lint:responsive` fails on `max-width` media queries, `vh` units, px font-sizes outside `styles/tokens.css`, and large fixed widths. See [`RESPONSIVE.md`](RESPONSIVE.md).

`npm run check` / `npm run check:live` fails on overflow, touch targets, type size, media CLS, and console errors. Screenshots land in `scripts/screenshots/`.

This tooling is `devDependencies` only. It does not ship to visitors or change how the site loads in production.