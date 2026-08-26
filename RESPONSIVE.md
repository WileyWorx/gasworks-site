# Responsive conventions

Hand-built static site. No frameworks. Layout stays fluid first; breakpoints are a last resort.

## Tokens

All spacing, type, breakpoints, and container widths live in [`styles/tokens.css`](styles/tokens.css).

- Reference tokens with `var(--…)` — do not invent parallel scales in components
- Breakpoints: `--bp-sm` (640), `--bp-md` (1024), `--bp-lg` (1280)
- Mobile-first only: `@media (min-width: …)`. **No `max-width` layout queries**
- Prefer `clamp()`, `min()`, `max()`, grid `auto-fit` / `minmax()`, and `aspect-ratio` before adding a breakpoint
- In `@media`, use the token pixel values with a comment (`/* --bp-sm */`) — `var(--bp-*)` is not reliable inside media queries

## Hard lint rules

`npm run lint:responsive` fails when it finds:

- `font-size` with `px` outside `styles/tokens.css`
- `max-width` media queries
- `vh` units (use `dvh` or `svh`)
- Fixed `width: Npx` (≥100px) on layout declarations

It **warns** on breakpoints not in the token set, and on selectors overridden in more than two width media queries.

## Component rules (review)

1. Works at **320px** with no horizontal page scroll
2. Works in a container of **arbitrary width** — never assume the viewport is the parent
3. Survives **2× content length** (long titles, long names) without clipping or overflow
4. Sets **no outer margin** — spacing belongs to the parent (`gap` / padding)

## Fluid primitives to reach for

```css
width: min(var(--container-max), 100%);
font-size: var(--text-display); /* clamp already in the token */
gap: var(--space-5);
aspect-ratio: 16 / 9;
height: 100dvh; /* not vh */
```

## Verify before shipping

```bash
npm run lint:responsive   # architecture constraints
npm run check             # Playwright device matrix
```

A non-zero exit means fix before deploy. See also `.cursor/rules/responsive.mdc` and `AGENTS.md`.
