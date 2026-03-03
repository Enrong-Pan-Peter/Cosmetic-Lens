# CosmeticLens

**CosmeticLens** (护肤黄金眼) is a bilingual (English/Chinese) web application that helps consumers understand what's really in their skincare and cosmetic products. It uses AI-powered analysis to evaluate ingredient lists, compare marketing claims against actual formulation efficacy, and provide personalized recommendations. The roadmap includes core chat analysis (Phase 1), user features and education (Phase 2), and dupe finding with interaction warnings (Phase 3 — in progress).

---

## Features

### Phase 1 — MVP (Complete)

- **Product analysis chat** — Enter a product name or paste an ingredient list; receive evidence-based analysis
- **Smart ingredient sourcing** — Local database → [Open Beauty Facts](https://world.openbeautyfacts.org) API → LLM knowledge as fallback
- **Claims assessment** — Structured table comparing marketing claims to ingredient reality
- **Ingredient glossary** — Searchable EN/ZH table with categories and filters
- **Bilingual support** — Full UI and analysis in English and Chinese
- **Rate limiting** — Anonymous and authenticated tiers

### Phase 2 — User Features (Complete)

- **Authentication** — Email/password signup and login via Supabase Auth; forgot-password flow
- **User profiles** — Skin type, sensitivity, allergies, concerns, pregnancy status for personalized analysis
- **Analysis history** — Save and revisit past product analyses (authenticated users)
- **Education pages** — Articles (e.g. "How to Read Ingredient Lists") and expandable fun-facts cards
- **Multi-turn chat** — Full conversation with `/api/chat`; follow-up questions like "Is this good for oily skin?"
- **RAG (Retrieval-Augmented Generation)** — Semantic search over curated ingredient and article content for consistent, data-grounded answers

### Phase 3 — In Progress

- **Dupe Finder** — Hybrid approach: curated pairs (30 products) → vector search → OBF fallback
- **Interaction Warnings** — 39 ingredient pairs (retinol + AHAs, pregnancy, etc.); auto-injected when analyzing products
- **RAG strengthening** — Glossary, fun-facts, interactions, and curated dupes embedded for semantic search
- **Polish & Launch** — Performance tuning, loading skeletons, improved error UX, final testing

---

## Tech Stack

| Layer       | Technology                          |
|------------|--------------------------------------|
| Framework  | [Astro](https://astro.build) 5.x     |
| UI         | React 19, Tailwind CSS, shadcn-inspired design |
| Icons      | [Phosphor Icons](https://phosphoricons.com)    |
| Backend    | Astro server endpoints, Vercel serverless |
| LLM        | [OpenAI API](https://platform.openai.com) (gpt-4.1-mini) |
| Data       | [Supabase](https://supabase.com) (Postgres, Auth, pgvector) |
| Ingredient lookup | [Open Beauty Facts](https://world.openbeautyfacts.org) API |
| Markdown   | react-markdown, remark-gfm           |

---

## Key Decisions

- **OpenAI instead of Gemini** — Switched from the original plan’s Gemini to OpenAI for reliability and tooling; uses gpt-4.1-mini with retry and backoff.

- **RAG for consistency** — Semantic search over curated ingredients, glossary, articles, fun-facts, interactions, and dupes (via pgvector embeddings) grounds answers in our data and reduces hallucination. *Tradeoff:* Embedding adds latency and API cost per query; we accept this for health-stake questions where accuracy matters more than speed.

- **Open Beauty Facts API** — Used to fetch verified ingredient lists for product names, reducing reliance on user-pasted lists. 5-second timeout for graceful failure. *Tradeoff:* OBF coverage and data quality vary; we use it as a fallback after curated/vector search, not as the primary source.

- **Hybrid dupe finder** — Curated pairs first, then vector search over embedded formulations, then OBF. *Tradeoff:* Curated gives high quality but limited coverage (~30 products); vector search handles semantic queries ("dupe for luxury moisturizer"); OBF provides breadth when neither matches. No single source covers all cases.

- **JSON data files vs database** — Curated content (ingredients, glossary, interactions, dupes) lives in versioned JSON files, not DB tables. *Tradeoff:* Easy to review, diff, and edit; no migrations for content updates. Downside: embedding updates require re-running the seed script.

- **Prompt injection vs embedding** — `translations-reference.json` is injected into the system prompt for zh, not embedded. *Tradeoff:* Small reference data doesn't need semantic search; injection is deterministic, fast, and avoids extra embedding calls. Embedding is reserved for content that benefits from retrieval.

- **content_type segmentation** — `knowledge_embeddings` uses distinct types (ingredient, glossary, article, faq, interaction, product). *Tradeoff:* `filterType` enables targeted retrieval (e.g. product-only for dupes), but requires schema and seed script to stay in sync when adding new types.

- **Idempotent SQL schema** — `DROP POLICY IF EXISTS` before `CREATE POLICY` so the schema can be re-run safely. *Tradeoff:* Policies are dropped and recreated on each run; acceptable for dev/setup, avoids "already exists" errors.

- **Phosphor Icons** — Replaced emoji icons with Phosphor for a cleaner, consistent UI across home and chat.

- **shadcn-style design** — CSS variables, semantic color tokens, and Tailwind for maintainable theming.

---

## Project Structure

```
src/
├── components/
│   ├── auth/          # LoginForm, SignupForm, AuthGuard
│   ├── chat/          # ChatInterface, ChatMessage, AnalysisDisplay, ClaimsTable, ChatSidebar
│   ├── education/     # ArticleCard, ArticleList, FunFactCard
│   ├── glossary/      # GlossaryTable
│   ├── history/       # HistoryList
│   ├── layout/        # BaseLayout, Navigation, Footer, LanguageSwitcher
│   └── profile/       # ProfileForm
├── content/
│   ├── en/            # Articles, fun-facts.json
│   └── zh/
├── data/              # ingredients-database, glossary-data, ingredient-interactions,
│                      # curated-dupes, translations-reference, system-prompt
├── i18n/              # en.json, zh.json, utils.ts
├── lib/
│   ├── analyzer.ts    # Single-turn analysis pipeline
│   ├── embeddings.ts  # pgvector / RAG, searchKnowledge, searchDupeProducts
│   ├── dupe-finder.ts # findDupes (curated → vector → OBF)
│   ├── openai.ts      # OpenAI chat with retry
│   ├── openbeautyfacts.ts
│   ├── prompt.ts      # findIngredientData, getInteractionWarnings, enrichMessageWithIngredients
│   └── supabase.ts
├── pages/
│   ├── api/           # analyze, chat, profile, history, search-product
│   ├── en/            # index, chat, glossary, education, profile, history, login, signup
│   └── zh/            # (mirrors en/)
└── styles/

scripts/
└── seed-embeddings.mjs   # Index ingredients, glossary, fun-facts, interactions, articles, dupes

docs/
└── DATA-EXPANSION-GUIDE.md   # Instructions for expanding data files in the future
```

## License

See [LICENSE](LICENSE).
