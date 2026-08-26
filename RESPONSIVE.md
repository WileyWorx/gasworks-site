# Responsive conventions

Hand-built static site. No frameworks. Layout stays fluid first; breakpoints are a last resort.

## Tokens

All spacing, type, breakpoints, and container widths live in [`styles/tokens.css`](styles/tokens.css).

- Reference tokens with `var(--…)` — do not invent parallel scales in components
- **Type:** `--text-xs` … `--text-display`, plus `--text-input` (16px floor for form fields). Body floor is 14px (`0.875rem`) via `--text-body`
- **Spacing:** `--space-xs` … `--space-3xl` (clamp). Prefer these over ad hoc rem values
- **Container:** `--container-width` = `min(max, 100% − 2×pad)` — one line, no media query for gutters
- **Grid helper:** `--grid-card-min` = `min(17.5rem, 100%)` for `auto-fit` card grids
- Breakpoints: `--bp-sm` (640), `--bp-md` (1024), `--bp-lg` (1280) — structural mode switches only
- Mobile-first only: `@media (min-width: …)`. **No `max-width` layout queries**
- Prefer `clamp()`, `min()`, `max()`, grid `auto-fit` / `minmax()`, and `aspect-ratio` before adding a breakpoint
- In `@media`, use the token pixel values with a comment (`/* --bp-sm */`) — `var(--bp-*)` is not reliable inside media queries

## Fluid primitives to reach for

```css
width: var(--container-width);
font-size: var(--text-display); /* clamp already in the token */
gap: var(--space-xl);
grid-template-columns: repeat(auto-fit, minmax(var(--grid-card-min), 1fr));
aspect-ratio: 16 / 9;
height: 100dvh; /* not vh */
min-width: 0; /* flex/grid children with text */
overflow-wrap: break-word;
```

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

## Verify before shipping

```bash
npm run lint:responsive          # CSS architecture constraints
npm run check:responsive         # full viewport + device + visual matrix (local)
npm run check:responsive:update  # refresh committed screenshot baselines
npm run check                    # lint + check:responsive
```

`check:responsive` always fails on **horizontal overflow** and **unexpected visual diffs**. Off-screen content, touch targets, text clipping, and axe (including contrast) are logged as warnings; set `RESPONSIVE_STRICT=1` (or `npm run check:responsive:strict`) to fail the build on those too.

CI runs the same suite on every pull request and on pushes to `main` (`.github/workflows/responsive.yml`). Failures upload the Playwright HTML report and diff screenshots as artifacts.

Baselines live in `tests/responsive/baselines/` and are committed so PR diffs are reviewable.

There is no component library in this repo — visual checks cover full pages only.

A non-zero exit means fix before deploy. See also `.cursor/rules/responsive.mdc` and `AGENTS.md`.
