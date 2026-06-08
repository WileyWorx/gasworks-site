# Media Mill — clip & poster files

Drop your best 4–10 second loops here. The hero mill is **14 tiles** — each wired in `index.html` to one loop + poster in this folder. The site auto‑pauses any video that scrolls off‑screen.

**Source rule:** When adding or replacing clips, use files from the main **`Gasworks Site Cursor/`** drop folder only. Do **not** pull from **`Gasworks Site Cursor/Extra/`** (that folder is for alternates / duplicates, e.g. a second `Sports_Website.mp4`, and must not feed the live mill).

## Filenames the site looks for

| Tile | Loop | Poster |
|---|---|---|
| 01 | `reel-01.mp4` | `reel-01-poster.jpg` |
| 02 | `reel-02.mp4` | `reel-02-poster.jpg` |
| 03 | `reel-03.mp4` | `reel-03-poster.jpg` |
| 04 | `reel-04.mp4` | `reel-04-poster.jpg` |
| 05 | `reel-05.mp4` | `reel-05-poster.jpg` |
| 06 | `reel-06.mp4` | `reel-06-poster.jpg` |
| 07 | `reel-07.mp4` | `reel-07-poster.jpg` |
| 08 | `reel-08.mp4` | `reel-08-poster.jpg` |
| 09 | `reel-09.mp4` | `reel-09-poster.jpg` |
| 10 | `reel-10.mp4` | `reel-10-poster.jpg` |
| 11 | `reel-11.mp4` | `reel-11-poster.jpg` |
| 12 | `reel-12.mp4` | `reel-12-poster.jpg` |
| 13 | `reel-13.mp4` | `reel-13-poster.jpg` |
| 14 | `reel-14.mp4` | `reel-14-poster.jpg` |

(GIF works too — name `reel-XX.gif`. MP4 is ~10× smaller for the same quality.)

**Current production clips** (14 tiles in `index.html`; tiles **13–14** are placeholders awaiting media):  
`iseered` ← `ISeeRed_Website.mp4`, `nordic`, `brighton`, `cars`, `whoop`, `kiltech`, `powmow`, `lincoln-spot`, `porsche`, `amici`, `talking-head`, `shan`.  

`Testimonials_ForWebsite.mp4` is in the main folder but not used on the mill (13 clips → 12 tiles). Add it by swapping any tile’s `<source>` / `poster` if you want it live.

## Encoding spec

- **Length:** 4–10 s loop. Should look seamless when looped (no hard cut at the end).
- **Resolution:** 640×360 to 960×540 (16:9) is plenty. The tile renders at ~180–320 px wide on screen — anything bigger is wasted bytes.
- **Aspect:** 16:9. Other aspect ratios are letter/pillar‑boxed by the tile's `object-fit: cover`.
- **Audio:** None. Strip it (`-an` in ffmpeg). Browsers won't autoplay with sound anyway.
- **Codec:** H.264 (`libx264`) for broadest compatibility, or H.265 if you serve fallbacks. AV1 is ideal but lacks Safari fallback.
- **Bitrate:** Aim for ~600 KB / clip. CRF 26–28 with H.264 hits that for short loops.
- **Color:** sRGB.
- **Posters:** JPG/WebP, ~50 KB each. Pull a representative still from the loop.

### Quick ffmpeg recipe

For a clean, web‑optimized loop from a source clip:

```bash
ffmpeg -i source.mov \
  -an \
  -vf "scale=860:-2,crop=860:484" \
  -c:v libx264 -preset slow -crf 27 \
  -movflags +faststart -pix_fmt yuv420p \
  reel-01.mp4
```

For the poster:

```bash
ffmpeg -i reel-01.mp4 -ss 00:00:01 -frames:v 1 -q:v 4 reel-01-poster.jpg
```

## Wiring a tile up

In `index.html`, find the matching `<article class="media-mill__tile" data-tile="01" ...>` and replace its placeholder body. Full instructions live in [`../../PLACEHOLDERS.md`](../../PLACEHOLDERS.md#hero--the-media-mill-3d-scroll-driven-palette).

## Tips

- **Curate the front row first** (`data-tile="09"` through `12`). Those are closest to the camera and read largest — put your most camera‑ready material there.
- **Save the back row for atmosphere** (`data-tile="01"`–`04`). Those sit far back and small; abstract motion / texture / b‑roll reads better there than dialogue or wide landscapes.
- **The middle row** (`05`–`08`) is the bread and butter — clean hero shots that hold up at medium scale.
- The mill is a **gas‑works production line** — favor process / making‑of textures (sparks, lights, machinery, wide tracking moves) over portrait‑heavy or talking‑head shots, to lean into the theme.
