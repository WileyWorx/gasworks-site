# Responsive conventions

Hand-built static site. No frameworks. Desktop and mobile are **equal first-class experiences**. Fluid layout and `min-width` queries are an authoring technique, not a priority order.

## Framing

- Neither viewport is a degraded version of the other. Neither is an "enhancement" layered on.
- Base CSS (no query) is written for the narrowest width because unqualified rules apply everywhere; `min-width` then defines wider layouts. That choice exists to avoid undo-rules, not to demote desktop.
- Goal: both experiences are correct by default. "Doesn't break" is not enough — ask **"is this good here?"** at each width.
- Desktop needs real horizontal use and multi-column structure where it helps. Do not stretch a phone layout to 1440px.
- Mobile needs tap targets, thumb reach, and ordering for a small screen.
- Verify **768** and **1024** explicitly; mid sizes are not an afterthought.
- Intentional breakpoints for genuine structural differences are good design. Fluid primitives remove *accidental* breakpoints only.

## Tokens

All spacing, type, breakpoints, and container widths live in [`styles/tokens.css`](styles/tokens.css).

| Kind | Tokens |
|---|---|
| Breakpoints | `--bp-sm` 640, `--bp-md` 1024, `--bp-lg` 1280 |
| Container | `--container-max`, `--container-pad`, `--container-width` |
| Spacing | `--space-xs` … `--space-3xl` (prefer these; `--space-1`…`8` are aliases) |
| Type | `--text-xs` … `--text-display`, `--text-input` (16px floor for inputs) |
| Chrome | `--header-h`, `--touch-min`, `--safe-*`, `--header-offset` |
| Grid | `--grid-card-min` |

- Reference tokens with `var(--…)`. Do not invent parallel scales in components
- Authoring: `@media (min-width: …)` only. **No `max-width` layout queries**
- Prefer `clamp()`, `min()`, `max()`, grid `auto-fit` / `minmax()`, and `aspect-ratio` before adding an accidental breakpoint
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
- `100vw` (use `100%` or `dvw`)
- Fixed `width: Npx` (≥100px) on layout declarations

It **warns** on:

- Breakpoints not in the token set
- Selectors overridden in more than two width media queries
- `font-size` values that are not `var(--text-*)` (raw rem/em/clamp — migrate to tokens)

## Component rules (review)

1. Works at **320px** with no horizontal page scroll — and is a good small-screen composition
2. Works in a container of **arbitrary width** — never assume the viewport is the parent
3. Survives **2× content length** (long titles, long names) without clipping or overflow
4. Sets **no outer margin** — spacing belongs to the parent (`gap` / padding)
5. At large widths, uses space deliberately (columns, density, hierarchy) — not a stretched single column

## Verify before shipping

```bash
npm run lint:responsive          # CSS architecture constraints
npm run check:responsive         # full viewport + device + visual matrix (local)
npm run check:responsive:update  # refresh committed screenshot baselines
npm run check                    # lint + check:responsive
```

Check **320 / 375 / 768 / 1024 / 1440**. At each: is this *good* here? Report functional but poorly used layouts.

`check:responsive` always fails on **horizontal overflow** and **unexpected visual diffs**. Off-screen content, touch targets, text clipping, and axe (including contrast) are logged as warnings; set `RESPONSIVE_STRICT=1` (or `npm run check:responsive:strict`) to fail the build on those too.

CI runs the same suite on every pull request and on pushes to `main` (`.github/workflows/responsive.yml`). Failures upload the Playwright HTML report and diff screenshots as artifacts.

Baselines live in `tests/responsive/baselines/` and are committed so PR diffs are reviewable.

There is no component library in this repo — visual checks cover full pages only.

A non-zero exit means fix before deploy. See also `.cursor/rules/responsive.mdc` and `AGENTS.md`.
