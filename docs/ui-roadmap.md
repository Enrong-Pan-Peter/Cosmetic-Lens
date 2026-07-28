# CosmeticLens — UI/UX & Feature Roadmap (Phases 13–14)

**Created:** 2026-07-08 · **Extends:** [`advanced-roadmap.md`](./advanced-roadmap.md) (Phases 8–12)
**Goal:** elevate an already-clean shadcn/ui base into something that feels *premium and friendly* to a first-time visitor (the recruiter), and add the few features that round out the product — without regressing the streaming chat, the two-pipeline eval story, or the security posture.

## Current state (2026-07-08)

- **Design system:** shadcn/ui HSL tokens in `src/styles/global.css` (`--background`, `--foreground`, `--primary`, `--muted`, `--border`, `--ring`, `--radius: 0.625rem`) + a `--brand` blue (221 83% 53%). Monochrome primary (near-black), Inter + Noto Sans SC, Phosphor icons, `--radius`-based rounding.
- **Motion already present:** `.chat-bubble-enter`, `.thinking-dots`, `.streaming-caret`, gradient dividers, hero gradient glow. Tasteful, not overdone.
- **Gaps this plan targets:**
  - **Light theme only** — `:root` is the sole theme; no `.dark` block, `tailwind.config` has no `darkMode`, and no toggle.
  - **No `prefers-reduced-motion` handling** — all animations run regardless (a11y gap).
  - **Hardcoded color literals** in the surfaces added Phases 7/12 (`amber-50/300/700/800`, `emerald-50/200/700/800`, `sky-*`, `indigo-*` in `RoutineChecker`, `IngredientDetail`, `ConcernSearch`, `SharedAnalysisView`, `MessageFeedback`) — these won't adapt to dark mode and are the main dark-mode work item.
  - **Copy feedback is crude** — `ShareButton` falls back to `window.prompt`; no toast system.
  - **Slight inconsistency** across the newer surfaces (card padding, border treatment, header sizing) vs the original marketing/glossary pages.
  - **Homepage doesn't use its own proof** — the eval numbers (intent 100%, retrieval recall ~97%, agentic ~3× cheaper) aren't surfaced; the demo GIF is still a TODO.

---

## Phase 13 — UI/UX polish

> **Status 2026-07-08:** **13.1–13.4 + 13.7 BUILT** (190/190 tests, typecheck 0 errors/143 files; production build still FD-blocked in-sandbox — environmental). **Dark mode (13.1):** `darkMode:'class'` + full `.dark` HSL token block (`global.css`) + no-flash inline script in `BaseLayout` head + sun/moon nav toggle (CSS-swapped via `.dark`, persisted to localStorage, respects `prefers-color-scheme`). **Color de-hardcode (13.2):** badge `dark:` variants (routine/ingredient/concern/chat-message/product-warning) AND a full token conversion of the legacy `stone-*` chat surfaces — `ProductInput` composer + `ChatSidebar` now use `bg-card/bg-muted/text-foreground/text-muted-foreground/border-border/bg-primary` etc.; education pages got `dark:prose-invert`. **Motion/a11y (13.4):** `@media (prefers-reduced-motion: reduce)` kill-switch + `.card-hover` lift on ingredient/concern cards. **Toasts (13.3):** `ShareButton` `window.prompt` fallback replaced with an inline readonly copy field. **Homepage (13.7):** new `StatBand.astro` (100 ingredients · 100% intent · 97% recall@6 · 190+ tests — model-independent numbers) on both homepages. **Needs user visual QA:** the chat composer/sidebar dark styling was converted mechanically (can't render in-sandbox) — eyeball it in dark mode.
>
> **Status 2026-07-08 (cont.):** **13.5 skeletons + nav/footer + 14.4 print BUILT.** Nav labels shortened to single words (Analyze/Routine/Glossary; zh 护肤流程/科普/词典) + `whitespace-nowrap` — fixes the two-line wrapping. Footer expanded from 3 → 6 links (now the full index: Home/Analyze/Routine/Glossary/Ingredients/Learn, wrap-friendly) — the "secondary nav" answer without a second bar. Skeleton loaders on ConcernSearch + RoutineChecker. **14.4 print:** `@media print` chrome-strip in global.css + `print-hide` on the share CTA → clean printable `/a/[id]`. 190/190 tests, 0 type errors. **Remaining P13 → then done:** see next note.
>
> **Status 2026-07-08 (cont.):** **13.8 + 13.9 (mobile) BUILT.** Audit found the chat frame was already mobile-ready — `ChatSidebar` is a proper responsive drawer (`fixed`+translate on mobile, `lg:relative` on desktop, backdrop) and analysis markdown tables already wrap in `overflow-x-auto`. **13.8:** empty state gained `card-hover` on example cards + an "Or explore" chip row (Routine/Ingredients/Glossary) for feature discovery (helps mobile where the footer is far down). **13.9:** composer action buttons bumped 32→36px touch targets; `break-words` on user bubbles so long INCI pastes don't overflow narrow screens; nav labels shortened + footer index (prev note). **Still benefits from real-device QA** (can't render in-sandbox). **Only 13.6 (shared Card/SectionHeader extraction) deferred** — pure refactor churn, low user-visible value. **Phase 14 remaining (each a standalone build):** 14.1 quiz, 14.2 PDF export, 14.3 favorites, 14.7 routine library; **won't fake:** 14.5 citations (needs vetted sources), 14.6 barcode (browser-only).

**Why:** the actual user reviews this in ~60 seconds. Perceived quality and friendliness convert. Each item is visible on every page, and most are interview-legible ("design tokens, theming, a11y, motion").

| # | Task | Why / what it shows | Effort | Notes / files |
|---|------|--------------------|--------|---------------|
| 13.1 | **Dark mode.** Add a `.dark { … }` HSL token block in `global.css`; set `darkMode: 'class'` in `tailwind.config.mjs`; nav toggle that sets `class="dark"` on `<html>`, persists to `localStorage`, and respects `prefers-color-scheme` on first load (inline no-flash script in `BaseLayout` head). | The single biggest "feels premium" win; theming/token discipline is a real signal | M | `global.css`, `tailwind.config.mjs`, `BaseLayout.astro`, `Navigation.astro` |
| 13.2 | **De-hardcode colors for theming.** Audit the `amber/emerald/sky/indigo/*-50..800` literals in the Phase 7/12 components and map them to semantic tokens (add `--success`, `--warning`, `--info` token pairs light+dark) or `dark:` variants. Without this, dark mode looks broken on routine/ingredient/concern/share surfaces. | Prereq for 13.1 to look right everywhere; enforces the token system | M | routine, ingredients, glossary/ConcernSearch, share, chat badge components |
| 13.3 | **Toasts + copy feedback.** A tiny toast component (no dep, or `sonner`-style) to replace `ShareButton`'s `window.prompt` and confirm share/copy, feedback-sent, etc. Announce via `aria-live`. | Removes the one janky interaction; a11y announce | S | `ShareButton.jsx`, new `Toast.jsx` |
| 13.4 | **Motion + reduced-motion.** Wrap animations in `@media (prefers-reduced-motion: reduce)` no-op; add subtle hover-lift/`transition` on cards (ingredient, dupe, routine, concern result); consistent focus rings (already have `:focus-visible`). | Accessibility + tactile polish | S | `global.css`, card components |
| 13.5 | **Skeleton loaders.** Replace bare "Searching…/Checking…" text with skeleton rows on the async surfaces (concern search, routine results, history). | Perceived speed; commercial feel | S | `ConcernSearch`, `RoutineChecker`, `HistoryList` |
| 13.6 | **Consistency pass.** One card style + spacing scale + header sizing across marketing, glossary, ingredients, routine, share. Extract a shared `Card`/`SectionHeader` pattern (Astro/JSX) to stop drift. | Cohesion; reads as "designed, not assembled" | M | shared component + sweep |
| 13.7 | **Homepage proof + demo.** Trust stat-band from real eval numbers (intent accuracy, retrieval recall, cost/latency), a "three modes" showcase (verified / dupe / safety), and the hero demo GIF/loop (record `docs/assets/demo.gif`, still TODO from P5). | The recruiter's first 60s; turns your eval rigor into a visible headline | M | new marketing sections, `index.astro` |
| 13.8 | **Empty states & onboarding.** Friendlier first-time chat state with the 3 curated example prompts as clickable cards; a one-line "what this does" intro on routine / ingredients / concern search; gentle nudge to try a photo scan. | Reduces bounce; guides the first query to curated data (Mode A) | S–M | `ChatInterface` empty state, page intros |
| 13.9 | **Mobile pass.** Verify the nav drawer, touch targets (≥44px), horizontal scroll on wide tables (ingredient interactions, dupe tables, conflict matrix), and the composer on small screens. | Half your recruiter traffic is mobile | S–M | Navigation, tables, composer |

**Done when:** dark mode is flawless on every surface (incl. the Phase 7/12 pages), no animation runs under reduced-motion, no `window.prompt`, the homepage leads with real numbers + a demo, and the newer pages are visually indistinguishable in style from the original ones.

**Interview stories:** "token-driven theming with a no-flash dark mode, `prefers-reduced-motion` support, and a consistent design system — the app is accessible and on-brand across 200+ generated pages."

---

## Phase 14 — Feature additions (product depth)

**Why:** a few features materially deepen the product and the demo. Ordered by value-per-effort; reuse existing backends.

| # | Feature | Why / what it shows | Effort | Depends on |
|---|---------|--------------------|--------|-----------|
| 14.1 | **Skin-profile quiz / onboarding.** A 4–6 question quiz (skin type, sensitivity, concerns, pregnancy) that writes the existing `profiles` fields and personalizes analyses + concern search. Anonymous → localStorage, logged-in → Supabase. | Personalization users feel; activates the profile the app already reads | M | profiles table (exists) |
| 14.2 | **Export analysis to PDF.** "Download PDF" on an answer / share page → a clean branded one-pager (ingredients, verdicts, sources). Reuses the PDF tooling. | Shareable artifact; commercial norm | S–M | 12.1 share snapshot |
| 14.3 | **Save & compare favorites.** Star ingredients/products; a "My shelf" page; feed saved products into the compare tool (7.7) and routine checker (7.1). | Retention loop; ties 7.1/7.7 together | M | auth, 7.1/7.7 |
| 14.4 | **Print-friendly share pages.** `@media print` styles on `/a/[id]` so a shared analysis prints/saves cleanly. | Cheap polish on the share feature | S | 12.1 |
| 14.5 | **Ingredient citations (12.4).** Add vetted `references[]` (PubChem/CIR/reviews) to the top ~20 actives; render on ingredient pages + cite in answers. **Requires manual source vetting — do NOT auto-generate citations.** | Provenance/credibility; pairs with the groundedness story | M | 7.2, manual research |
| 14.6 | **Barcode scan (7.5).** Mobile camera (`BarcodeDetector` + lib fallback) → existing `getProductByBarcode` → analysis. Progressive-enhancement: only where the API exists. | Wow-factor phone demo; backend already exists | S–M | P1 |
| 14.7 | **Routine library.** Save named routines (extends 7.1/12.3); reopen and re-check as products change. | Retention; deepens the differentiator feature | M | 7.1, auth |

> **Status 2026-07-08:** **14.1 skin-profile quiz + 14.6 barcode BUILT.** 14.1: `src/lib/profile-store.ts` (pure `sanitizeProfileInput` whitelist, `readLocalProfile`/`writeLocalProfile`, tested) + `SkinQuiz.jsx` (4-step: skin type / sensitivity / concerns / pregnancy, prefills from profile or localStorage) + `/[en|zh]/quiz`. Logged-in → `/api/profile`; anon → localStorage. **Anonymous personalization:** `chat.ts` + `chat-agentic.ts` now accept a whitelisted `body.profile` used ONLY for anon requests (authed always reads the DB); `ChatInterface` sends the local profile when logged out. Entry points: footer + chat empty-state chip. i18n `quiz.*` + `nav.quiz`. 14.6 barcode: native `BarcodeDetector` + ZXing CDN fallback (iOS), high-res camera + retail-format hints. 196/196 tests, 0 type errors/150 files (build EMFILE-blocked in sandbox). **14.2 PDF export BUILT:** share page "Download PDF" (window.print on the already-clean page) + chat-answer "PDF" button (isolates one message into `#print-region` via `body.print-single` CSS → browser Save-as-PDF). No dependency. **14.3 favorites BUILT:** `src/lib/favorites-store.ts` (localStorage, pure `normalizeFavorites` tested, `FAVORITES_EVENT` cross-island sync) + `FavoriteButton.jsx` (star on ingredient detail pages) + `MyShelf.jsx` + `/[en|zh]/shelf` + footer/`nav.shelf`. localStorage-only (cloud sync = follow-up). 200/200 tests, 0 type errors/156 files. **14.5 citations BUILT (real sources):** `scripts/fetch-references.mjs` resolves each single-compound ingredient to its authoritative PubChem page via PUG REST (name→CID) — no fabricated links; `src/data/ingredient-references.json` (seeded with 7 CID-verified: niacinamide/retinol/ascorbic_acid/glycolic_acid/glycerin/panthenol/squalane); `getReferences()` in ingredients.ts; References section on ingredient detail pages + i18n. **User: run `node scripts/fetch-references.mjs` locally to fill the rest** (my sandbox IP got PubChem-throttled after ~14 lookups). 200/200 tests, 0 type errors/157 files. **Remaining P14:** 14.7 routine library + favorites cloud-sync + stars on index/glossary/concern cards + cite refs in chat answers (follow-ups).

> **Status 2026-07-26:** **14.5b/14.5c citations + 14.7 routine library BUILT.** 14.5b literature: `scripts/fetch-pubmed-references.mjs` adds peer-reviewed "Further reading" via Europe PMC (which indexes PubMed/MEDLINE — Lancet/JAMA/JAAD/etc., with real PMIDs+DOIs; no journal scraping). Ranks on-topic (ingredient-in-title) then citation count; merges with the PubChem entries (both scripts now tag entries `compound`/`literature` and are merge-safe). Ingredient pages render **References** (PubChem) + **Further reading** (reviews) with an honest "background, not per-claim proof" note. 14.5c answer citations: `src/lib/citations.ts` (pure, tested) deterministically matches ingredient names in a finished answer against our catalog and attaches only refs from our own data — the model never invents a reference; `chat-agentic` emits a `citations` SSE event before `done`; `ChatMessage` renders "Further reading" (also in PDF export + persisted in saved chats); word-boundary + CJK aware; fail-open. 14.7 routine library: `src/lib/routine-store.ts` (localStorage, pure `sanitizeRoutineInput`/`normalizeSavedRoutines`, tested, `ROUTINES_EVENT` cross-island sync) + Save/Load UI in `RoutineChecker` (name → save → reopen chip → re-check → delete). 222/222 tests, 0 type errors/162 files (build EMFILE-blocked in sandbox — environmental). **Remaining P14 follow-ups:** favorites cloud-sync + stars on index/glossary/concern cards.

**Deliberately still out of scope:** PWA/offline, price tracking, notifications, community reviews, social login, fine-tuning (per decision 1). List as conscious non-goals in the README.

---

## Recommended sequencing & cut line

- **Do first (one cohesive "prettier + friendlier" build):** 13.2 de-hardcode colors → 13.1 dark mode → 13.3 toasts → 13.4 motion/reduced-motion. This is the highest-visibility upgrade and touches every page; verifiable via typecheck + a manual dark-mode contrast check.
- **Then the conversion surface:** 13.7 homepage proof + demo, 13.8 empty states.
- **Then feature depth:** 14.1 quiz (personalization) or 14.2 PDF export (shareable artifact) — pick by whether you want a retention or a sharing story next.
- **Consistency (13.6) + mobile (13.9)** ride along opportunistically.
- **Cut line:** 13.1–13.4 + 13.7 is a complete "the app looks and feels finished" story on its own.

## Risks / watch-list

- **Dark mode is only as good as its worst surface** — the `amber/emerald/sky/indigo` literals (13.2) must be handled or the routine/ingredient/share pages will look broken in dark. Audit before shipping the toggle.
- **No-flash theming** — set the theme class in an inline head script before paint, or dark-mode users get a white flash on every navigation.
- **Don't regress streaming** — the chat's `_streaming` states, caret, and agent trace are load-bearing; theme/motion changes must leave them intact.
- **Contrast** — verify WCAG AA on both themes, especially muted-foreground text and the badge colors.
- **KaTeX + prose** — the `.prose-analysis` and KaTeX styles need dark variants too (math renders on a light assumption today).
