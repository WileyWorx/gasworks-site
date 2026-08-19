# Client logo files

Drop the official **transparent‑background PNGs** (or SVGs) for each brand here, using the exact filenames below. The `index.html` placeholders already reference these paths via `data-brand="<slug>"` — once a file exists, swap the matching `.logo-carousel__panel--placeholder` block for an `<img>` (see [`../PLACEHOLDERS.md`](../PLACEHOLDERS.md#swapping-a-placeholder-for-the-real-logo)).

| Brand | Filename |
|---|---|
| Monster Energy | `monster-energy.png` |
| University of Utah | `utah.png` |
| Burton Snowboards | `burton.png` |
| Oakley | `oakley.png` |
| O’Neill | `oneill.png` |
| ESPN | `espn.png` |
| Live Nation | `live-nation.png` |
| US Ski Team | `us-ski-team.png` |
| USA Nordic | `usa-nordic.png` |
| PAC-12 | `pac-12.png` (optional archive if you switch the slot back to PAC-12) |
| Big 12 Conference | `big-12.png` |
| Snowbird | `snowbird.png` |
| Subaru | `subaru.png` |
| Lincoln | `lincoln.png` |
| Columbia | `columbia.png` |
| Advanced Gloves | `advanced-gloves.png` |
| Powder Mountain | `powder-mountain.png` |
| Nissan | `nissan.png` |
| Suunto | `suunto.png` |

## File specs

- **Format:** PNG-24 with transparent background. SVG is also accepted.
- **Color:** white/light marks read best on the dark stage, but full‑color marks also work — the CSS glow is white and additive, so it lifts a colored logo without tinting it.
- **Size:** export at roughly **64–96 px tall @2x** (the panel renders ~32 px tall). Tight crop, no internal padding.
- **Do not bake an outer glow into the file.** The site applies it in CSS via `drop-shadow` on `.logo-carousel__panel img`, so the glow stays consistent across every brand. If you bake one in, it will double up.

## Where to find each brand’s official mark

Every brand below has a public press / brand assets page. Always pull from the official source so the artwork matches their guidelines and is legally cleared for partner display:

- Monster Energy — sponsorship / press kit
- University of Utah — University Marketing & Communications brand toolbox (`umc.utah.edu`)
- Burton Snowboards — Burton press room
- Oakley — Oakley press / partner assets
- O’Neill — O’Neill press kit
- ESPN — ESPN Press Room
- Live Nation — Live Nation media / partner assets
- US Ski Team — US Ski & Snowboard partner kit (`usskiandsnowboard.org`)
- USA Nordic — `usanordic.org` media kit
- Big 12 Conference — Big 12 partner / brand assets
- PAC-12 — only if you swap the carousel slot back to PAC-12 (`data-brand="pac-12"` + `pac-12.png`)
- Snowbird — Snowbird media kit
- Subaru — Subaru newsroom / brand toolkit
- Lincoln — Lincoln press site
- Columbia — Columbia Sportswear press portal
- Advanced Gloves — request through brand contact
- Powder Mountain — `powdermountain.com` brand assets / press contact

If a brand requires written approval to display their mark, get it before launch.
