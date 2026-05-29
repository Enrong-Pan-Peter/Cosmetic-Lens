# Image Assets

This document tracks every image asset used in the marketing surface plus a curated list of stock-photo fallbacks if you ever want to swap out the AI-generated images.

---

## Current assets (`public/images/`)

| File | Role | Source | Approx size |
|------|------|--------|------------:|
| `hero-lab.webp` | Homepage hero (right column of split layout) | AI-generated 2026-05-27 | 1.8 MB |
| `feature-vision.webp` | "How the AI works" card 1 — Vision OCR | AI-generated 2026-05-27 | 1.7 MB |
| `feature-agent.webp` | "How the AI works" card 2 — Agentic reasoning | AI-generated 2026-05-27 | 1.8 MB |
| `feature-rag.webp` | "How the AI works" card 3 — Curated knowledge | AI-generated 2026-05-27 | 2.3 MB |
| `og.webp` | Open Graph / Twitter social preview | AI-generated 2026-05-27 | 1.7 MB |

All AI-generated images are royalty-free for commercial use (per OpenAI's image generation terms). No re-licensing required.

**Visual direction:** soft pastel skincare lab — cream marble, amber-glass dropper bottles, blush pink chamomile, eucalyptus, warm golden-hour sidelight. Photo-realistic editorial style, no logos, no readable text, no human faces.

### Optimization notes

Files are served as-is from `public/`. Future optimization options:

- Convert to `astro:assets` `<Image>` for automatic responsive `srcset` + `loading="lazy"` (Phase 1.5 polish).
- Generate AVIF variants (~40 % smaller than webp at same quality).
- The hero is the only image above the fold — eagerly load it; lazy-load the rest.

---

## Stock-photo fallbacks (if you ever want to replace the AI images)

If you prefer photographs from real photographers, here are vetted search queries and creators that match the visual direction. **Verify each image's license before using** — most Unsplash / Pexels content is royalty-free but a few have attribution requirements.

### Unsplash searches

Visit `https://unsplash.com/s/photos/<query>` and replace `<query>`:

- `skincare-flatlay` — flat-lay arrangements of unbranded bottles
- `cosmetic-lab` — dropper bottles, glass beakers, botanical sprigs
- `serum-bottle-marble` — amber bottles on marble surfaces
- `botanicals-skincare` — leaves, flowers, neutral palette
- `dropper-bottle-eucalyptus` — exact aesthetic match
- `magnifying-glass-book` — for the RAG card alternative

**Recommended Unsplash creators** (consistent warm-pastel skincare aesthetic):
- Mathilde Langevin
- Christin Hume
- Domino Studio
- Antonika Chanel

### Pexels searches

`https://www.pexels.com/search/<query>/`:

- `skincare bottles`
- `cosmetic ingredients`
- `pastel skincare lab`
- `dropper bottle pink`

### Suggested specific photographs (verify license at fetch time)

These are illustrative Unsplash IDs — confirm each is still available and the license matches your use:

- `K4mSJ7kc0As` — amber bottles on marble (hero candidate)
- `eVC0G8s4HhI` — cosmetic flat-lay
- `pLm32fOFKQc` — pink palette skincare composition

### Process for swapping an image

1. Download the chosen `.jpg` / `.png` from Unsplash or Pexels at the highest resolution.
2. Convert to webp: `cwebp -q 80 input.jpg -o output.webp`.
3. Resize the hero to ~2400 px wide (the rest can be 1600 px).
4. Save into `public/images/` using the same filename so no code changes are needed.
5. If the image has a noticeably different aspect ratio, adjust the `aspect-[4/3]` class on the homepage hero `<img>` in `src/components/marketing/Hero.astro`.

---

## Adding new marketing imagery

When adding a new image:

1. Use the soft-pastel-lab visual direction so the marketing surface stays cohesive.
2. Save to `public/images/<descriptive-name>.webp`.
3. Add a row to the **Current assets** table above.
4. Reference from a marketing partial in `src/components/marketing/`.
5. Always provide meaningful `alt` text (not empty `alt=""`) — required for accessibility.

---

*Last updated: 2026-05-27*
