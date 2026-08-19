# Design system and redesign brief

The single source of truth for the visual layer of Cosmetic-Lens, and a brief for anyone (human or AI) improving the UI. If you change how the app looks, change it here and in the token file, not by scattering colors through components.

## Foundations (as built today)

### Color tokens

Colors are HSL triples defined in `src/styles/global.css` (light values in `:root`, dark values in `.dark`) and exposed as Tailwind classes through `tailwind.config.mjs` (`bg-background`, `text-primary`, `border-border`, `bg-brand`, and so on). Edit the values here; do not hardcode hex in components.

The current system is "Clean Room, tailored + trust" (02g): porcelain paper, white cards, ink primary, petrol functional accent, brass decorative detail, and document-of-record furniture (masthead double rule, ledger tables, analysis record headers). Full rationale and the mockup history live in `design/mockups/comparison.md`.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `background` / `foreground` | `40 22% 98%` (porcelain) / `212 30% 11%` (ink) | `212 25% 7%` / `40 15% 94%` | page base and default text |
| `card` | white | `212 20% 10%` | panels, cards, popovers |
| `primary` | `212 28% 13%` (ink) | `40 18% 92%` (warm near-white) | primary buttons; the ink authority carried over from the original B&W design |
| `secondary` / `muted` / `accent` | cool light grays / pale petrol wash | dark equivalents | subtle surfaces and secondary text |
| `brand` | `197 48% 26%` (petrol) | `195 55% 55%` | links, active tabs, focus, functional accents only |
| `destructive` | `356 72% 44%` | `356 65% 48%` | errors and "avoid" states |
| `safe` on `safe-bg` | `161 75% 24%` on `160 45% 93%` | `160 55% 55%` on `160 30% 13%` | safe/supported status; always icon + label, never color alone |
| `caution` on `caution-bg` | `33 90% 33%` on `40 80% 93%` | `35 85% 60%` on `33 45% 13%` | caution/partial status; always icon + label |
| `metal` | `36 35% 38%` (brass) | `38 40% 62%` | decorative only: FIG labels, hairline details; never status |
| `border` / `input` / `ring` | cool hairlines / petrol ring | dark equivalents | outlines and focus rings |
| `radius` | `0.625rem` | same | corner rounding (lg/md/sm derive from it) |

### Typography

Inter for Latin text and Noto Sans SC for Chinese (weights 400/500/600/700) remain the body and UI faces. Two purpose-bound additions, all loaded in `BaseLayout.astro`:

- `font-display` — Playfair Display 500/600 (+ 500 italic) with Noto Serif SC 600 for Chinese. Headlines, section titles, stat numerals, ingredient and product names. Never italicize CJK; accent the key word with `text-brand` instead.
- `font-mono` — JetBrains Mono 400/500. Data details only: INCI strings, PubChem CIDs, record numbers, FIG labels.

The type is bilingual by design; do not drop Noto Sans SC or Noto Serif SC.

### Interaction and accessibility

Dark mode is class-based (`.dark` on `<html>`) with a no-flash script in the head. `prefers-reduced-motion` is respected. Focus rings use `--ring`. Cards use a subtle hover lift (`.card-hover`).

## Component inventory

- Layout: `Navigation`, `Footer`, `BaseLayout`
- Chat: `ChatInterface`, `ProductInput`, `ChatMessage`, `AnalysisDisplay`, `AgentTrace`
- Ingredients: `IngredientIndex`, `IngredientDetail`, `FavoriteButton`, `MyShelf`
- Glossary: `GlossaryTable`, `ConcernSearch`
- Routine: `RoutineChecker`
- Quiz: `SkinQuiz`
- Share: `SharedAnalysisView`
- Plus marketing (homepage), education, profile, and history surfaces.

## The current look

The 02g system described above, implemented 2026-08. The original hero photograph survives in a clinically graded version (`public/images/hero-lab-clinical.webp`; the grade recipe is in `design/mockups/comparison.md`), presented as a captioned figure plate rather than a lifestyle hero. The `docs/ASSETS.md` prompt style remains useful for generating new photography, but grade anything new to neutral before shipping it, and never ship metaphor images.

## Constraints for any redesign

- Change the tokens, not scattered colors. Keep the token names and reprice their values.
- Keep dark-mode parity. Every token has a light and a dark value; update both and check both themes.
- Keep it bilingual. Do not break Noto Sans SC or assume English-only line lengths.
- Keep accessibility. Visible focus rings, reduced-motion support, and sufficient contrast.
- Verify with `npx astro check` and `npx vitest run`.

## Target direction (decided 2026-08, implemented)

Enrong chose "Clean Room, tailored + trust" (02g) after three candidate directions and six review rounds; `design/mockups/` holds the full trail. The standing rules:

- Vibe: evidence-first and classy. Class comes from the finish (serif display, porcelain, petrol, brass detail); trust comes from the structure (ink buttons, masthead double rule, ledger tables, numbered analysis records, verification checks on data sources).
- Voice: no "AI" wording in the interface. The product speaks through data sources (PubChem, Europe PMC, Open Beauty Facts), knowledge-base counts, and citations, not through its machinery. No model names, no tool-name chips, no sparkle icons.
- Imagery: no metaphor photos, and homepage figures must read in one glance. Every picture depicts something real: the clinically graded bench photo, molecule structures drawn from PubChem (see `scripts/fetch-molecule-svgs.mjs`), and plates typeset from live `src/data` records (the dupe card renders from `curated-dupes.json`). Retired: `feature-agent.webp`, `feature-vision.webp`, `feature-rag.webp`.
- Status semantics: `safe`/`caution` tokens with an icon and a label every time; brass is never used for meaning.

## Motion (added 2026-08, from the inspora review)

Motion in this system narrates real work or settles real numbers — never decoration. Three pieces exist; hold any new motion to the same three rules: it depicts something actually happening, it runs once (or only while the real work runs), and it is disabled under `prefers-reduced-motion` with a static state that loses nothing.

- **Thinking mark** (`ThinkingMark.jsx` + `.think-mark` in `global.css`): a circle of vertical hairlines that breathes outward from the center. Replaces all bouncing-dot spinners (pre-stream row, agent-trace header, photo extraction). Tint with a text token: `text-foreground/70` idle, `text-brand` for a running step.
- **Live stage captions** (`AgentTrace.jsx`): while streaming, the trace header names the tool that is actually running (`chat.tools.*` labels in both i18n files), then "Writing answer…" once tools finish. Labels map 1:1 to streamed tool events; never invent a stage.
- **Stepped trace**: tool calls render as steps on a vertical connector — safe-check circle when done, thinking mark while running, X on error. Same status semantics as everywhere: token colors plus an icon, never color alone.
- **Stat odometer** (`StatBand.astro` + `.odo-*` in `global.css`): the band's digits roll into place once, the first time the band scrolls into view. Server-rendered text is the source of truth; the script restores the exact text node when done, keeps the final value in `aria-label` while strips churn, and never runs under reduced motion or without JS.
