# Resume bullets — CosmeticLens

Pick 3–4 per application; lead with the one matching the job description. All numbers are from committed eval runs (2026-07-07, `evals/results/`) — be ready to defend each in an interview.

## For AI/LLM application engineer roles

- Built and publicly deployed **CosmeticLens**, a bilingual (EN/中文) AI skincare-ingredient analyst: an **agentic LLM pipeline** where the model orchestrates four tools (product lookup, curated+vector dupe retrieval, interaction rule engine, pgvector RAG) in a bounded loop, streamed over SSE with live tool traces and per-answer **source provenance chips**.

- Designed a three-suite **evaluation harness** (124 golden cases EN+ZH, LLM-as-judge rubric, latency/cost capture); eval-driven debugging exposed a CJK word-boundary bug driving Chinese intent accuracy to **55%** — root-caused, fixed, and re-measured to **100%** the same day, alongside retrieval recall@6 of **97%**.

- **A/B-measured** classic pre-injection RAG vs agentic tool-calling on identical golden sets: agentic reached **100% judge pass vs 92.3%** at ~3× lower output cost (+0.5s TTFT), and the measurement — not intuition — set the production default.

- Hardened public LLM endpoints: **JWT-derived identity** (eliminated an IDOR exposing sensitive health profiles), namespaced per-user/per-IP **daily rate limits** with atomic increment-then-check, input caps, and **real-token telemetry** (`stream_options.include_usage` → Postgres) for cost/latency observability.

- Shipped production plumbing solo: cross-device **chat sync** (Postgres + RLS source of truth over a localStorage offline cache), language-filtered pgvector retrieval, idempotent content-hash embedding seeds, KaTeX rendering with an **LLM-dialect math normalizer**, and an emoji→icon pipeline keeping model output on-design-system.

## For general SWE / full-stack roles (alternate emphasis)

- Built a production-shaped full-stack app (Astro SSR + React 19 islands, Supabase Postgres/RLS/Auth, Vercel serverless) with SSE streaming, cross-device sync, bilingual i18n, and vision OCR input — deployed publicly with rate limiting, JWT auth, and spend controls.

- Wrote the security pass myself: found and fixed an IDOR (unverified body `userId` → service-role profile reads), moved all identity to verified JWTs, added tiered rate limiting backed by an atomic Postgres upsert function.

- Maintain a living architecture document + eval suite as the project's regression safety net; every behavioral claim in the README traces to a committed eval run.

## Interview story starters

1. **"The eval harness paid for itself in one day"** — zh intent 55% → the `\b` CJK bug → 100%. Shows: measurement-first debugging, i18n depth, regex internals.
2. **"Why agentic is the default"** — the A/B table; cost vs quality vs latency tradeoff; forced-final-answer fix for loop exhaustion (found by eval e2e-002 as an empty answer).
3. **"Chinese dupe queries all returned La Mer"** — normalizer stripped CJK → empty string matched everything. Shows: the value of language-diverse golden cases.
4. **"Fail-open rate limiting"** — availability vs strictness reasoning, spend cap as backstop, increment-then-check so hammering a 429 never resets the window.
5. **"$15 is not math"** — disabling single-dollar LaTeX because the domain has prices; normalizing the delimiter dialects LLMs actually emit.
