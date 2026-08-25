# Gasworks site — agent notes

Hand-built static marketing site. **No frameworks, bundlers, or new dependencies.** HTML, CSS, and vanilla JS only.

## Project

- Workspace: this repo only (`gasworks-site`)
- Live: https://wearegasworks.com (Vercel project `gasworks-site`)
- Stack preference if migrating later: Astro on Vercel — do not migrate unless asked

## File structure

- `index.html` — homepage (hero media mill, lanes, contact)
- `process.html` — how we work
- `contractors.html` — crew roster form (**intentionally unlisted and `noindex`**; reachable from the footer / inquiry path, not search)
- `portfolio.html` — work by lane (`?cat=…`)
- `js/` — classic scripts (`projects.js`, `project-modal.js`, `credits.js`, etc.)
- `media/` — brand, mill, lanes, clients, process assets
- `styles.css`, `script.js` — global styles and interactions

## Conventions

- BEM-style class names (e.g. `.media-mill`, `.media-mill__tile`, `.media-mill__bezel`)
- Brand fonts: Space Grotesk (display), DM Sans (body)
- Capability lanes: Spotlights, Narratives, Immersions → `portfolio.html?cat=…`
- Do not re-add the footer slogan “Built different. Built to last.”
- Visitor-facing copy: no hyphens, en dashes, or em dashes unless truly required (see `.cursor/rules/no-hyphens-in-copy.mdc`)
- Do not call Gasworks a “production company” or “production house” in site copy

## Credits and project data

- Client credit attribution (`js/credits.js`) and project catalog fields (`js/projects.js`) are never invented or altered without explicit human input
- Unverified credit buckets stay `"TODO"` and must not render as claimed relationships
- Fabricated clients, agencies, years, or credits are worse than blanks

## Cross-device (summary)

Full rules: `.cursor/rules/responsive.mdc` (`alwaysApply: true`).

- Full-height: `vh` fallback then `dvh` — never bare `100vh`
- No `100vw`; no horizontal page scroll from 320px up
- Touch: 44×44px hit areas; hover features need a touch equivalent via `(hover: none)` / `(pointer: coarse)`
- Forms: ≥16px input font size
- Media: dimensions / `aspect-ratio`; autoplay needs `muted` + `playsinline`; respect reduced motion and data-saver
- Fixed UI: `env(safe-area-inset-*)` + `viewport-fit=cover`
- After any HTML/CSS/JS change: verify at 320, 390, 768, and 1280 — report what you checked
