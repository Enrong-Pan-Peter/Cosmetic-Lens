# CLAUDE.md

Guidance for AI coding sessions (and humans) working in Cosmetic-Lens. Read this first.

## What this is

A bilingual (EN / 简体中文) cosmetic-ingredient analysis web app, built as a portfolio-grade LLM application. Stack: Astro 5 (SSR) with React 19 islands, Tailwind with shadcn-style design tokens, Supabase (Postgres, Auth, RLS, pgvector), and the OpenAI API. Publicly deployed on Vercel.

## Commands

- Dev server: `npm run dev` (http://localhost:4321)
- Typecheck: `npx astro check` (target: 0 errors)
- Tests: `npx vitest run` (all must pass)
- Seed knowledge-base embeddings: `node scripts/seed-embeddings.mjs` (incremental)
- Citation data: `node scripts/fetch-references.mjs` (PubChem), `node scripts/fetch-pubmed-references.mjs` (Europe PMC)
- Evals: `node evals/run.mjs --suite all --pipeline both`; before/after table: `node evals/compare.mjs`

## Verify before calling something done

Run `npx astro check` (0 errors) and `npx vitest run` (all pass). `npm run build` can fail in a sandbox with EMFILE, which is a file-descriptor ceiling in the mounted filesystem and not a code bug, so rely on astro check plus vitest there. If `astro check` hits an EPERM writing its Vite cache onto a mounted folder, run it as `VITE_CACHE_DIR=/tmp/vite-cl npx astro check` to move the cache off the mount.

## Conventions that keep the app consistent

- Design tokens. Colors come from CSS variables in `src/styles/global.css` (light in `:root`, dark in `.dark`), exposed as Tailwind classes (`bg-background`, `text-foreground`, `text-primary`, `border-border`, `bg-brand`, and so on). Use these, never raw hex. See `docs/design-system.md`.
- Dark mode parity. `darkMode: 'class'`, toggled by `.dark` on `<html>` with a no-flash script in the head. Every surface must look right in both themes. Because colors are tokens, they usually flip automatically; still check both.
- Bilingual. Every user-facing string lives in BOTH `src/i18n/en.json` and `src/i18n/zh.json`. Update both. Fonts are Inter plus Noto Sans SC.
- Interactivity. Interactive UI is React islands loaded with `client:*`. Do not nest a `<button>` inside an `<a>`; wrap the card in a `div` and position the control absolutely instead.
- Mobile. Text inputs must be at least 16px on mobile (`text-base sm:text-sm`) or iOS Safari zooms the page on focus. Use `100dvh` for full-height layouts. Do not use `window.prompt`. Respect `prefers-reduced-motion`.
- Security. User identity comes only from a verified Supabase JWT (`getUserFromRequest`); never trust a `userId` from the body or query. Every API route is rate-limited by cost class (`chat` / `vision` / `light`) via `enforceRateLimit`, and rate limiting fails open by design.
- Models. Chat runs on `gpt-5.6-luna` in both pipelines (`src/lib/openai.ts` and `src/pages/api/chat-agentic.ts`). Vision OCR runs on `gpt-4o-mini` primary with `gpt-4.1-mini` fallback in `src/lib/vision.ts`; do not put a gpt-5.x text model on vision, it broke photo extraction. `src/lib/model-params.ts` routes the gpt-5 / o-series parameter contract (`max_completion_tokens`), so reuse it for any new OpenAI call.
- Data and citations. Never fabricate citations or ingredient data. PubChem provides compound pages, Europe PMC provides peer-reviewed reviews, both via the fetch scripts. Curated facts live in `src/data/*.json`.
- Git and deploy. Commit locally (a sandbox can leave a stale `.git/index.lock`; `rm -f .git/index.lock` if needed). Pushing to `main` triggers the Vercel deploy. Some files in `supabase/migrations/` must be run by hand in the Supabase SQL editor.

## Where things live

- UI components: `src/components/` (layout, chat, ingredients, glossary, routine, quiz, share, marketing, education, profile, history)
- Design tokens and global CSS: `src/styles/global.css`, `tailwind.config.mjs`
- i18n: `src/i18n/en.json`, `src/i18n/zh.json`
- API routes: `src/pages/api/`
- Server libraries: `src/lib/` (openai, chat-agentic helpers, retrieval, vision, model-params, rate-limit, auth, supabase, and the localStorage stores)
- Curated data: `src/data/`
- Database: `supabase/schema.sql` and `supabase/migrations/`
- Evals: `evals/` (datasets, run.mjs, compare.mjs, baseline.json)

## Docs

- `README.md` — product and architecture overview
- `docs/architecture.md` — SSE wire format, tool order, storage schema
- `docs/ui-roadmap.md` — UI and UX phases with status
- `docs/design-system.md` — design tokens, typography, imagery direction, and the redesign brief
- `evals/README.md` — the eval harness

Personal, machine-local notes can go in `CLAUDE.local.md`, which you should add to `.gitignore` if you create it.
