# Portfolio media

Drop cover photos and hover preview videos for each portfolio tile.

## File naming

For each category folder (`spotlights`, `narratives`, `immersions`), use matching numbered pairs:

| Cover (default) | Video (plays on hover) |
|-----------------|------------------------|
| `01.jpg`        | `01.mp4`               |
| `02.jpg`        | `02.mp4`               |
| …               | …                      |
| `06.jpg`        | `06.mp4`               |

Paths are wired in `portfolio.html` via `data-poster` and `data-video` on each card.

## Notes

- JPG or WebP covers work; keep filenames aligned with the HTML (`01`–`06`).
- Videos should be muted-friendly (site mutes on hover for autoplay).
- If a cover is missing, the category gradient placeholder shows until you add the image.
