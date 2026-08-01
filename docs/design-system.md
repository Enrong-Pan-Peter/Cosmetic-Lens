# Design system and redesign brief

The single source of truth for the visual layer of Cosmetic-Lens, and a brief for anyone (human or AI) improving the UI. If you change how the app looks, change it here and in the token file, not by scattering colors through components.

## Foundations (as built today)

### Color tokens

Colors are HSL triples defined in `src/styles/global.css` (light values in `:root`, dark values in `.dark`) and exposed as Tailwind classes through `tailwind.config.mjs` (`bg-background`, `text-primary`, `border-border`, `bg-brand`, and so on). Edit the values here; do not hardcode hex in components.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `background` / `foreground` | white / near-black | near-black / near-white | page base and default text |
| `card` | white | `240 8% 7%` | panels, cards, popovers |
| `primary` | `240 5.9% 10%` (near-black) | `0 0% 96%` (near-white) | primary buttons and strong emphasis |
| `secondary` / `muted` / `accent` | light grays | dark grays | subtle surfaces and secondary text |
| `brand` | `221 83% 53%` (blue) | `217 91% 60%` | CTAs and accent highlights |
| `destructive` | `0 84% 60%` (red) | `0 72% 51%` | errors and "avoid" states |
| `border` / `input` / `ring` | light gray / focus ring | dark gray | outlines and focus rings |
| `radius` | `0.625rem` | same | corner rounding (lg/md/sm derive from it) |

### Typography

Inter for Latin text and Noto Sans SC for Chinese, weights 400/500/600/700, loaded in `BaseLayout.astro` and set as the default sans family in Tailwind. The type is bilingual by design; do not drop Noto Sans SC.

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

## The current look, honestly

The chrome is the neutral shadcn default: a near-black primary and cool grays. It is clean, consistent, and accessible, but it is generic and it does not echo the product's own imagery.

## The biggest opportunity

`docs/ASSETS.md` defines the photography as a "soft pastel skincare lab": cream marble, amber-glass dropper bottles, blush pink, eucalyptus, and warm golden-hour light. The interface palette is cool and neutral, so the chrome and the photography currently pull in different directions. Warming the palette toward that softer identity (a warm off-white background, an amber or blush accent alongside or instead of the blue, and a more considered type scale) is likely the highest-impact change. Because the colors are tokens, most of this is editing `global.css`, not touching every component.

## Constraints for any redesign

- Change the tokens, not scattered colors. Keep the token names and reprice their values.
- Keep dark-mode parity. Every token has a light and a dark value; update both and check both themes.
- Keep it bilingual. Do not break Noto Sans SC or assume English-only line lengths.
- Keep accessibility. Visible focus rings, reduced-motion support, and sufficient contrast.
- Verify with `npx astro check` and `npx vitest run`.

## Target direction (please fill in)

"Better design" is a taste decision the codebase cannot make on its own. Fill this in before a redesign so a fresh session designs toward a target instead of guessing:

- Desired vibe (for example: warm and premium, clinical and precise, playful and fresh):
- Reference sites or brands you like:
- Fixed brand colors or a logo, if any:
- Surfaces to keep as-is versus surfaces open to change:

Until this is set, the working brief is: align the cool neutral chrome to the warm pastel imagery, raise overall polish, and keep everything accessible and bilingual.
