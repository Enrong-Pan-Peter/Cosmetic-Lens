# Cosmetic-Lens redesign: three visual directions

Three genuinely different directions for the UI, delivered as static PNG mockups. No app code was changed. Every mockup is built token-first: the colors flow through the same CSS variable names that `src/styles/global.css` already uses (`--background`, `--primary`, `--brand`, `--border`, and so on), so adopting a direction is mostly repricing token values, not rewriting components. All three keep Inter plus Noto Sans SC as the base UI type, keep visible focus rings (shown on the composer and analyzer inputs), and keep the same page structure the app has today. Light mode is shown; each direction specifies its full dark palette below.

Start with `00-side-by-side.png` for a quick scan, then open the full-size screens.

| File | What it shows |
|---|---|
| `00-side-by-side.png` | All three directions, four screens each, one sheet |
| `01-warm-home.png`, `01-warm-chat.png`, `01-warm-ingredient.png`, `01-warm-home-zh.png` | Direction 01, Golden Hour |
| `02-clinical-home.png`, `02-clinical-chat.png`, `02-clinical-ingredient.png`, `02-clinical-home-zh.png` | Direction 02, Clean Room |
| `03-bold-home.png`, `03-bold-chat.png`, `03-bold-ingredient.png`, `03-bold-home-zh.png` | Direction 03, Ion |

The chat screens use a real product example (CeraVe Foaming Facial Cleanser) with the app's actual sections (Product Overview, Star Ingredients, Ingredients Analysis, Claims vs Reality, Sources) and its real trust details: the agent tool trace, the gpt-5.6-luna model chip, and PubChem plus Europe PMC citation chips. The ingredient screens use the real Niacinamide data from the live detail page.

---

## 01 · Golden Hour

Warm, editorial, premium. One line: the interface finally matches the product photography (cream marble, amber glass, blush, eucalyptus), so the whole app feels like one considered object.

This is the direction `docs/design-system.md` calls the biggest opportunity. The chrome moves from cool neutral gray to a warm cream, the hero photo sits in an arch frame with a floating live-analysis card, buttons become soft pills, and headlines switch to a serif display face (Fraunces) with one word accented in amber italic. Section headings inside the analysis and ingredient cards pick up the serif too, which makes the LLM output read like a well-set magazine page rather than a terminal dump.

Palette (token, light, dark):

| Token | Light | Dark |
|---|---|---|
| `background` / `foreground` | `40 43% 97%` / `26 24% 16%` | `24 18% 8%` / `38 30% 92%` |
| `card` | `42 50% 99%` | `25 16% 11%` |
| `primary` / `primary-foreground` | `27 48% 26%` (espresso) / `40 55% 97%` | `38 40% 90%` / `26 30% 12%` |
| `secondary` | `12 42% 92%` (blush) | `14 20% 20%` |
| `muted` / `muted-foreground` | `38 28% 92%` / `27 12% 40%` | `26 14% 16%` / `33 12% 68%` |
| `accent` / `accent-foreground` | `105 16% 89%` (eucalyptus) / `108 20% 24%` | `110 10% 20%` / `108 15% 85%` |
| `brand` / `brand-foreground` | `31 60% 42%` (amber) / `40 60% 98%` | `35 70% 58%` / `24 30% 10%` |
| `destructive` | `4 70% 46%` | `4 65% 55%` |
| `border` / `input` / `ring` | `36 26% 85%` / `36 26% 82%` / `30 58% 42%` | `26 14% 20%` / `26 14% 22%` / `35 60% 55%` |
| `safe` on `safe-bg` (new) | `132 30% 30%` on `128 26% 91%` | `130 30% 65%` on `130 20% 15%` |
| `caution` on `caution-bg` (new) | `30 85% 33%` on `38 72% 91%` | `38 80% 62%` on `33 45% 14%` |
| `radius` | `1rem`, pills for buttons and chips | same |

Typography: Fraunces 600 for display and section headings, paired with Noto Serif SC 600 so Chinese headlines get the same editorial voice (the zh screen shows this; the accent word is colored, not italicized, because synthetic CJK italics look wrong). Body and UI stay Inter plus Noto Sans SC. Serif numerals give the stat band a print feel. This is the only direction that adds two font families.

Hero treatment: split layout, serif headline with an amber italic accent word, the existing `hero-lab.webp` in a tall arch with a thin amber outline ring, soft blush and amber radial washes behind, and a floating glass card showing two live verdict chips.

Dark mode: warm espresso brown surfaces rather than blue-black, cream text, amber brightens one step, blush and eucalyptus become muted tints. The photo arch keeps its warmth on dark, so the hero still glows. Primary buttons flip to cream with espresso text, mirroring how the current design flips near-black to near-white.

Tradeoffs: the most distinctive and the most on-brand with the existing imagery, and the strongest premium feel. It costs two extra font files (Fraunces plus a Noto Serif SC weight, roughly 1.5 MB for the CJK serif subset unless subset further), and serif headings need a little more line-height care in Chinese. Recruiters skimming the portfolio will remember it, but it reads more consumer-lifestyle than engineering-forward.

---

## 02 · Clean Room

Clinical, precise, trust-forward. One line: a lab-report interface that makes the evidence (concentrations, ratings, citations) the visual hero.

White surfaces, a fine graph-paper grid behind the hero, hairline borders everywhere, small radii, uppercase micro-labels with rule lines for section headings, and one deep lab teal doing all the accent work. The hero replaces lifestyle photography with the product itself: a working analyzer card (tabs for product name, paste ingredients, photo) with a focused INCI textarea and a sample result. Data details are set in JetBrains Mono: INCI strings, the PubChem CID, tool names in the agent trace, and source chips. The stat band becomes four ruled tiles with tabular numerals.

Palette (token, light, dark):

| Token | Light | Dark |
|---|---|---|
| `background` / `foreground` | `0 0% 100%` / `215 30% 13%` | `216 28% 7%` / `210 20% 96%` |
| `card` | `0 0% 100%` | `216 24% 10%` |
| `primary` / `primary-foreground` | `194 90% 24%` (lab teal) / `0 0% 100%` | `190 70% 50%` / `216 40% 8%` |
| `secondary` | `208 26% 96%` | `214 18% 15%` |
| `muted` / `muted-foreground` | `210 22% 96%` / `215 12% 40%` | `215 16% 13%` / `214 12% 65%` |
| `accent` / `accent-foreground` | `194 45% 93%` / `194 70% 20%` | `194 40% 16%` / `194 50% 85%` |
| `brand` / `brand-foreground` | `194 85% 30%` / `0 0% 100%` | `190 70% 50%` / `216 40% 8%` |
| `destructive` | `356 72% 44%` | `356 70% 55%` |
| `border` / `input` / `ring` | `213 22% 88%` / `213 22% 84%` / `194 90% 30%` | `214 15% 20%` / `214 15% 22%` / `190 70% 50%` |
| `safe` on `safe-bg` (new) | `161 75% 24%` on `160 45% 93%` | `160 55% 55%` on `160 30% 13%` |
| `caution` on `caution-bg` (new) | `33 90% 33%` on `40 80% 93%` | `35 85% 60%` on `33 45% 13%` |
| `radius` | `0.5rem` | same |

Typography: Inter only for UI, tighter tracking on headings, uppercase 11px eyebrows with letter spacing, `tnum` enabled for aligned numerals. JetBrains Mono (latin only, small files) for data tokens. Chinese stays Noto Sans SC everywhere; mono only ever wraps Latin INCI strings and IDs, so the zh screen needs nothing extra.

Hero treatment: copy on the left with a teal underline on the key word, the analyzer card on the right as the hero object, graph-paper grid fading out behind, and a thin teal top rule across the viewport. Trust strip entries become mono chips, like reagent labels.

Dark mode: cool near-black slate, teal brightens to cyan and flips to dark text on bright teal for buttons, hairlines lighten one step, and the graph grid drops to a few percent opacity so it stays texture rather than noise.

Tradeoffs: the strongest signal for "this product is rigorous", which matches the eval-harness, citations, and security story the repo tells, and it is the cheapest to ship (token repricing plus an optional mono font). The risk is feeling cold or generic B2B; it leans on the analyzer card and the data details for personality, and it walks away from the warm photography that already exists.

---

## 03 · Ion

Bold, graphic, modern. One line: a high-contrast consumer-tech statement (one electric violet, one lime highlighter, near-black ink) built to be memorable in a portfolio stack.

Oversized Inter 800 headlines with a skewed lime highlighter mark on the key word, a violet pill CTA, and a dark ink "scan card" as the hero graphic: an INCI list with a glowing violet row for niacinamide, a lime scan beam, and verdict chips pinned to the card corners. Gradient mesh blobs and a dotted grid give depth without photography. Chips and buttons are pills, cards keep moderate radii, and the stat band goes heavy weight with violet accent glyphs and lime diamond separators.

Palette (token, light, dark):

| Token | Light | Dark |
|---|---|---|
| `background` / `foreground` | `250 20% 99%` / `254 22% 10%` | `252 12% 5%` / `250 20% 96%` |
| `card` | `0 0% 100%` | `252 10% 8%` |
| `primary` / `primary-foreground` | `258 78% 48%` (violet) / `0 0% 100%` | `262 92% 72%` / `255 35% 10%` |
| `secondary` | `252 16% 94%` | `252 10% 14%` |
| `muted` / `muted-foreground` | `250 12% 95%` / `252 8% 40%` | `252 10% 12%` / `251 10% 66%` |
| `accent` / `accent-foreground` | `258 75% 95%` / `258 65% 32%` | `258 40% 18%` / `258 60% 88%` |
| `brand` / `brand-foreground` | `84 78% 52%` (lime) / `80 90% 8%` | `84 70% 58%` / `80 90% 8%` |
| `destructive` | `350 82% 42%` | `350 80% 58%` |
| `border` / `input` / `ring` | `250 14% 88%` / `250 14% 84%` / `258 78% 48%` | `252 10% 18%` / `252 10% 20%` / `262 92% 72%` |
| `safe` on `safe-bg` (new) | `152 70% 26%` on `150 55% 92%` | `150 55% 55%` on `150 30% 12%` |
| `caution` on `caution-bg` (new) | `27 92% 32%` on `36 85% 93%` | `32 90% 60%` on `33 50% 13%` |
| `radius` | `0.85rem` cards, pills for chips and CTAs | same |

Typography: Inter only, pushed hard: 800 weight, tight tracking and line height for display, bold uppercase kickers. Chinese display drops to Noto Sans SC 700 at a slightly smaller size (CJK has no 800 here and needs looser line height), which the zh screen demonstrates. The lime never carries text on white; it appears as a highlighter behind ink text, as chip fill with near-black text, or as marks on the dark scan card, so contrast holds.

Hero treatment: giant left-aligned type with the lime mark, violet CTA pill plus an underlined text link, and the ink scan card at right with mesh gradients and the dotted grid behind. The scan card doubles as a product demo: it shows what the analyzer does before the user touches anything.

Dark mode: this direction is happiest in the dark. True near-black, violet lifts to a bright tint with ink text on buttons, lime dims one step, the mesh blobs gain a soft glow, and the scan card becomes tone-on-tone. Light mode is the statement; dark mode is where it feels native.

Tradeoffs: the most memorable and the most "2026 consumer AI product", with zero new fonts. It is also the loudest: the violet and lime need discipline (one highlight per screen) or it tips into landing-page noise, and it discards the existing warm photography entirely, which would want replacing with graphic illustrations for the feature cards.

---

## Accessibility, checked

WCAG contrast was computed for the key token pairs of every direction (script, not eyeball). All pairs pass AA for their role in all three palettes. Worth calling out: body text lands between 13.7:1 and 17.7:1, secondary text between 5.3:1 and 6.1:1, primary buttons between 7.6:1 and 8.9:1, safe badges between 5.3:1 and 5.8:1, and caution badges between 4.6:1 and 4.9:1 (the Ion caution was darkened one step specifically to clear 4.5:1).

Safety verdicts never rely on color alone: every safe or caution chip carries an icon plus a text label in all three directions, which also covers red-green color blindness where the status hues sit close in a CVD simulation. Focus rings stay visible (each chat composer and the Clean Room analyzer are drawn in their focused state), `prefers-reduced-motion` behavior and the 16px mobile input rule are unaffected, and `safe`/`caution` are proposed as real tokens so the current hardcoded emerald and amber badge classes can be retired (the ui-roadmap 13.2 cleanup finishes properly).

## What adopting a direction involves

Reprice the values in `src/styles/global.css` (`:root` and `.dark`), keeping every token name; add the two `safe`/`caution` tokens plus their Tailwind mappings in `tailwind.config.mjs`; then a short component pass for the direction's shape language (radii, shadows, the hero section, and the section-heading style in chat and ingredient pages). Golden Hour additionally installs Fraunces and one Noto Serif SC weight; Clean Room optionally installs JetBrains Mono; Ion adds no fonts. Everything else (layout, i18n, islands, routes) stays as it is. Verification stays `npx astro check` plus `npx vitest run`, and both themes get a visual pass.

Pick one (or a blend: for example Clean Room's analyzer hero inside Golden Hour's palette) and the next session builds it for real.

---

# 02b · Clean Room v2 (revision after review)

Enrong picked the clinical direction and asked for two changes: make it feel less AI, and answer what happens to the existing pictures. v2 keeps the Clean Room tokens, type, and layout, and changes the voice and the imagery. Files: `02b-clinical-v2-home.png`, `02b-clinical-v2-chat.png`, `02b-clinical-v2-ingredient.png`, `02b-clinical-v2-home-zh.png`, `02b-imagery-sheet.png`, with the prepared image assets in `assets/`.

## Less AI, same rigor

The product now presents itself through evidence and chemistry rather than through its AI machinery. The word AI appears nowhere on the three screens. Specifically: the hero eyebrow became "Evidence-based ingredient analysis" (循证成分分析); the trust strip became "Data sources" listing PubChem, Europe PMC, and Open Beauty Facts instead of the infra stack (OpenAI, Supabase, pgvector); the stat band dropped the machine-learning metrics (intent accuracy, retrieval recall) in favor of knowledge-base counts (100 documented ingredients, 39 interactions mapped, 30 dupe sets compared, 190+ automated tests); the chat header's model chip became a quiet "Every claim source-linked" note; the agent trace with tool-name chips became one muted line, "Checked against PubChem, Europe PMC, and 39 mapped interactions"; every sparkle icon was replaced by flask, microscope, book, or shield; and the gradient topline became a solid teal rule. Nothing about the actual pipeline changes; the same information is framed as sourcing rather than as machinery.

## The imagery system

Three kinds of pictures, shown side by side in `02b-imagery-sheet.png`:

1. **Existing photos, clinically graded.** One repeatable grade (saturation ×0.72, red ×0.96, blue ×1.05, brightness +3, contrast −4, 4% teal wash) cools the warm originals so they sit naturally in the white and teal chrome. `hero-lab` and `feature-rag` appear on the homepage as figure plates; `feature-vision` stays on the label-scanning feature card.
2. **Molecule plates, drawn from real chemistry.** Each ingredient's skeletal structure is rendered from its actual PubChem SMILES (RDKit, line art on faint graph paper): niacinamide (CID 936) on the homepage and its detail page, ascorbic acid and retinol as further examples. This scales to all 100 documented ingredients and doubles as share/OG imagery.
3. **One retirement.** `feature-agent` (a dropper wrapped in glowing light strands) is the one existing image that actively reads as AI marketing even after grading; v2 replaces it with a molecule plate. An optional teal duotone treatment of any photo exists for secondary surfaces.

In the UI, photos and structures sit in hairline-framed plates with monospace figure captions (FIG. 01 The formulation bench, FIG. 02 Niacinamide · PubChem CID 936, FIG. 03 The reference library), so imagery reads as documentation rather than decoration. Captions are bilingual like everything else.

## Unchanged from 02

Tokens (including the dark values above), Inter plus Noto Sans SC with JetBrains Mono for data, the analyzer-card hero, the graph-paper background, contrast results, status chips with icon plus label, and visible focus rings. Implementation cost over the original 02 is one image-grading script, one molecule-rendering script, and copy edits in both i18n files.

---

# 02c · Imagery refinement (the molecule question and the vision photo)

Two adjustments after review of v2, argued visually in `02c-imagery-refinement.png`.

First, the molecule plates moved from textbook mode to specimen-card mode, answering the worry that raw structures feel academic and aloof. The heteroatoms pick up the brand teal instead of textbook black, the plain-English name leads the caption ("Niacinamide · brightening workhorse", 烟酰胺 · 全能提亮成分) with the PubChem CID demoted to fine print, and one plain-language annotation explains what the structure means for skin (for niacinamide: tiny at 122 Da and unusually stable, which is why it fits almost any formula). The rule that keeps chemistry friendly: molecules never headline. They sit in small framed plates beside photography, so the photos do the welcoming and the structure does the credibility. The case for keeping them at all: the structure is the app's actual subject (bottles on marble are the marketing the app sees through), it is the least AI imagery possible (every line is drawn from the same PubChem record the citation chips link to, nothing generated), and no consumer skincare competitor does it, so it scales into a recognizable brand asset across all 100 documented ingredients.

Second, `feature-vision.webp` is retired alongside `feature-agent.webp`: a phone with a floating analysis card is startup-promo language even after grading. Its replacement is the label-specimen plate (`assets/label-specimen.png`): a marked-up INCI label with highlighter underlines, margin verdicts, and a "read 14 of 14, flagged 1" footer. It depicts the scanning feature as the human action it automates (reading the back label in the aisle), with zero glow.

New assets in `assets/`: `mol-niacinamide-teal.svg`, `mol-ascorbic-acid-teal.svg`, `mol-retinol-teal.svg`, `label-specimen.png`. The 02b home, home-zh, and ingredient PNGs were re-rendered with the specimen treatment in place.

Fallback if the structures still feel cold: keep them only on ingredient detail pages, where a user has chosen to study one ingredient, and let photography carry the homepage. The layout survives either choice, and the vision photo retires in both.

---

# 02d · FIG. 03 replaced (the last metaphor photo)

The book-and-magnifier photo (`feature-rag.webp`) retires too. The pattern behind all three rejected images is now explicit: metaphor photos are what read as AI. Glowing strands stood for "intelligence", a phone with floating cards stood for "app magic", and an old book with a magnifying glass stood for "knowledge". None of them depict anything the product contains. The imagery rule going forward: no metaphor photos. One real photograph, real structures, and real typeset data.

Since the FIG. 03 slot represents the evidence layer, both replacement candidates are typeset directly from data the app already stores (`02d-fig03-options.png` shows them side by side). Option 1, the reference index, is recommended and now sits in the home mockups: niacinamide's actual sources (the PubChem compound record and the two Europe PMC reviews) set as a clean citation card, with a compact variant sized for the homepage strip (`assets/citation-card.png`, `assets/citation-card-strip.png`). The trio then reads product, chemistry, evidence, one plate per trust pillar. Option 2, "Pairs well?" (`assets/pairs-card.png`), draws two real rows from the 39 mapped interactions, including the niacinamide and vitamin C myth; it is friendlier at a glance but overlaps with what the Routine page demonstrates. Both candidates are the same plate component with different content, so swapping them, or using option 2 on the Learn page's knowledge card, is a one-line change. The homepage figure strip's third column widened (1fr / 1fr / 1.5fr) so the typeset card stays legible.

---

# 02e · FIG. 03, low-text edition

The citation card read well but carried too much text for a homepage figure, so it moves to the Learn page (where reading is the point) and three glance-first candidates replaced it, all typeset from records that exist in `src/data` today (`02e-fig03-lowtext.png`).

The recommendation, now in the home mockups, is the dupe card (`assets/cand-dupe.png`): the real La Mer entry from `curated-dupes.json`, showing Crème de la Mer against Nivea Creme with five-segment price-tier meters, the three shared base ingredients (Petrolatum, Glycerin, Mineral Oil), and the knowledge base's own note ("Similar heavy, protective feel"). About ten words of text, and it is the only candidate that adds information the homepage does not already carry: it proves the subtitle's "find affordable alternatives" promise with a story both audiences recognize, in both languages (平替档案：La Mer 对比妮维雅). The trio's logic becomes photograph, structure, payoff.

The alternates: a library waffle (`assets/cand-waffle.png`), 100 teal dots for the 100 documented ingredients, calmest but redundant with the "100" in the stat band directly below; and a routine check plate (`assets/cand-routine.png`), AM and PM rows with pairing verdicts, friendly but it previews the Routine section further down the page. All three are the same plate component, so swapping is a one-line change. Price tiers are shown as ordinal five-segment meters with mono labels rather than invented dollar amounts, keeping the no-fabrication rule.

---

# 02f · The tailored finish (classy pass)

A finish layer on top of everything already approved, shown against the standard finish in `02f-before-after.png` and applied across `02f-classy-home.png`, `02f-classy-chat.png`, `02f-classy-ingredient.png`, and `02f-classy-home-zh.png`. Layout, content, the de-AI voice, the analyzer hero, the figure plates, and the dupe card are unchanged; only type, paper, and detail color move.

What changes, exactly. Display type goes serif: Playfair Display 500 for English headlines, ingredient names, and stat numerals, with Noto Serif SC 600 carrying the Chinese headlines; the hero's key word turns italic in English and petrol-colored in Chinese (no CJK italics). The page sits on warm porcelain instead of stark white while cards stay pure white, which makes every panel read as an object on paper. The teal deepens to petrol. A small brass accent takes over the eyebrows, the FIG labels, and the stat-band eyebrow, giving the documentation details a heritage-lab warmth. Corners round from 10px to 14px with softer, deeper shadows, buttons gain a little height, and the wordmark becomes spaced capitals (COSMETIC LENS). Body text, tables, chips, the mono data details, and all status colors stay exactly as in v2, so the report surfaces keep their precision.

Repriced tokens (light): `background 40 22% 98%`, `foreground 212 30% 11%`, `primary 197 52% 21%` on `primary-foreground 40 30% 98%`, `brand 197 48% 26%`, `accent 196 30% 94%` / `197 55% 17%`, `border 210 15% 90%`, `input 210 15% 86%`, `ring 197 52% 26%`, plus one new decorative token `metal 36 35% 38%` (brass, only ever for eyebrows, FIG labels, and hairline details, never for status meaning). Dark adaptation: porcelain flips to a warm ink (`212 25% 7%`), cards to `212 20% 10%`, petrol lifts to `195 55% 55%` with ink text on buttons, brass lightens to `38 40% 62%`, and the serif rides along unchanged. Contrast, measured: ink on porcelain 16.6, petrol buttons 10.4, petrol as text 10.4, brass on porcelain 5.0, secondary text 5.8. All pass AA.

Cost over the standard finish: two font families (Playfair Display latin, small; Noto Serif SC 600 at roughly 1.6 MB for the CJK subset, worth subsetting further at build time) and the same token-repricing implementation path as before. The decision is now standard 02b versus tailored 02f; everything else is settled.

---

# 02g · The trust layer

Enrong's read on 02f: it lost the sense of trust the original black-and-white design carried. The diagnosis: the original earned credibility through ink authority (near-black buttons and text asserting themselves) and plainness (nothing decorative, so nothing salesy). The tailored finish traded some of that for warmth. 02g puts the authority back without giving up the class, shown against 02f in `02g-trust-layer.png` and applied in `02g-trust-home.png`, `02g-trust-chat.png`, `02g-trust-ingredient.png`, `02g-trust-home-zh.png`.

Five devices, all tokens and small CSS. First, primary buttons return to near-black ink (`primary 212 28% 13%`), the single strongest carryover from the original design; petrol demotes to function (links, focus rings, active tabs) and brass survives only on the FIG plate labels. Second, the nav gains a masthead double rule (a 1.5px ink line over a hairline), the signature of certificates and broadsheets, and the topline goes ink. Third, tables switch to ledger ruling: a heavy rule under the header row, horizontal hairlines only, no vertical grid. Fourth, every analysis opens with a record header (ANALYSIS RECORD · NO. CL-0847 · date · sources cited) closed by an ink rule, so the output presents itself as a numbered document rather than a chat bubble; report numbers would be generated per analysis in implementation. Fifth, the data-source chips carry verification checks. Serif, porcelain, imagery, status colors, and all content are untouched, and the ink button pair measures 14.9:1 so contrast improves.

The theory in one line: class comes from the finish, trust comes from the structure, and the two layers do not compete. The trust layer is also finish-independent; the same five devices drop onto standard 02b unchanged if the serif finish is ever dropped. Current decision space: 02b standard, 02f tailored, or 02g tailored plus trust. Recommended: 02g.
