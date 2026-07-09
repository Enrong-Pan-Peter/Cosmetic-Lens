## 12. MVP Implementation Plan

### 12.1 MVP Scope Definition

The MVP (Minimum Viable Product) focuses on core functionality that delivers immediate value:

**MVP Features (P0):**
- ✅ Product analysis chat interface
- ✅ Ingredient glossary (searchable)
- ✅ Bilingual support (EN/ZH toggle)
- ✅ Basic rate limiting (anonymous users)

**NOT in MVP (Phase 2+):**
- ❌ User authentication
- ❌ User profiles
- ❌ Analysis history
- ❌ Education pages
- ❌ Dupe finder

### 12.2 MVP Development Steps

Follow these steps sequentially. Each step includes the exact prompt you can give to Claude Code or Cursor.

---

#### Step 1: Project Setup

**Estimated time:** 15-30 minutes

**What you'll do:**
- Create new Astro project
- Install dependencies
- Configure Tailwind CSS
- Set up folder structure

**Prompt for AI coding assistant:**

```
Create a new Astro project for CosmeticLens with the following setup:

1. Initialize Astro project:
   - Use the "empty" template
   - Enable TypeScript (strict)
   - Install React integration

2. Install these dependencies:
   - @astrojs/react
   - @astrojs/tailwind
   - @supabase/supabase-js
   - react-markdown
   - tailwindcss
   - @tailwindcss/typography

3. Configure tailwind.config.mjs:
   - Add @tailwindcss/typography plugin
   - Configure content paths for Astro and React files
   - Add custom font family for Inter and Noto Sans SC

4. Create this folder structure:
   src/
   ├── components/
   │   ├── layout/
   │   ├── chat/
   │   ├── glossary/
   │   └── ui/
   ├── data/
   ├── i18n/
   ├── lib/
   ├── pages/
   │   ├── api/
   │   ├── en/
   │   └── zh/
   └── styles/
       └── global.css

5. Create .env.example file with placeholders for:
   - GEMINI_API_KEY
   - PUBLIC_SUPABASE_URL
   - PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - PUBLIC_SITE_URL

6. Create a basic global.css with Tailwind directives and custom font imports from Google Fonts (Inter and Noto Sans SC)

Please create all files and show me the commands to run.
```

---

#### Step 2: Data Files Setup

**Estimated time:** 30-45 minutes

**What you'll do:**
- Create ingredients database JSON
- Create glossary data JSON
- Create i18n translation files
- Create system prompt template

**Prompt for AI coding assistant:**

```
For the CosmeticLens project, create the following data files:

1. /src/data/ingredients-database.json
   Create a JSON file with 25 common cosmetic ingredients including:
   - Metadata section (version, sources)
   - Categories array (surfactant, humectant, emollient, active, preservative, etc.)
   - Ingredients array where each ingredient has:
     - id, inci_name, chinese_name
     - aliases_en, aliases_zh arrays
     - category
     - functions object with en and zh arrays
     - effective_concentration (if applicable)
     - evidence_level (strong, moderate, limited)
     - skin_types (suited, caution arrays)
     - concerns_addressed array
     - interactions array
     - irritation_potential
     - pregnancy_safe boolean
     - notes_en, notes_zh
   
   Include these key ingredients: niacinamide, retinol, hyaluronic acid (sodium hyaluronate), glycerin, salicylic acid, vitamin C (ascorbic acid), ceramides, centella asiatica, zinc oxide, benzoyl peroxide, and 15 more common ones.

2. /src/data/glossary-data.json
   A simpler version with entries for the glossary table:
   - metadata
   - categories array
   - entries array with: inci_name, chinese_name, aliases_en, aliases_zh, category, function_en, function_zh, notes_en, notes_zh

3. /src/i18n/en.json
   Complete English UI strings covering:
   - site (name, tagline, description)
   - nav (home, analyze, glossary, login, etc.)
   - chat (all labels, placeholders, errors, examples)
   - glossary (all labels)
   - common (loading, error, save, cancel, etc.)
   - footer (about, disclaimer, copyright)
   - errors (page not found, etc.)

4. /src/i18n/zh.json
   Chinese translations of all the above strings

5. /src/i18n/utils.ts
   TypeScript utility functions:
   - getTranslations(lang) - returns translation object
   - getLanguageFromURL(url) - extracts lang from URL path
   - getAlternateLanguagePath(path, currentLang) - switches language in path
   - t(translations, key) - helper for nested key access

6. /src/data/system-prompt.md
   The complete LLM system prompt with:
   - Role definition as evidence-based cosmetic analyst
   - Core principles (balanced, evidence-based, practical, honest)
   - Language instructions with {{LANGUAGE}} placeholder
   - {{USER_PROFILE}} placeholder
   - Analysis framework (overview, ingredients breakdown, claims assessment, suitability, value)
   - Interaction warnings table
   - Important guidelines
   - Response formatting instructions

Create all these files with complete, production-ready content.
```

---

#### Step 3: Layout Components

**Estimated time:** 30-45 minutes

**What you'll do:**
- Create BaseLayout component
- Create Navigation component
- Create Footer component
- Create LanguageSwitcher component

**Prompt for AI coding assistant:**

```
For the CosmeticLens Astro project, create the layout components:

1. /src/components/layout/BaseLayout.astro
   - Accept props: title, description, lang ('en' | 'zh'), requiresAuth
   - Include proper HTML head with:
     - Meta tags, Open Graph tags
     - Google Fonts link (Inter, Noto Sans SC)
     - Favicon
   - Render Navigation, slot content, and Footer
   - Add dark bg-gray-50 for body, min-h-screen flex flex-col

2. /src/components/layout/Navigation.astro
   - Accept lang prop
   - Show logo (emoji + site name based on language)
   - Desktop nav links: Home, Analyze, Glossary
   - LanguageSwitcher component (React, client:load)
   - Mobile hamburger menu with slide-down
   - Sticky top-0 with shadow

3. /src/components/layout/Footer.astro
   - Accept lang prop
   - 3-column grid: About, Links, Disclaimer
   - Dark background (bg-gray-900)
   - Copyright notice

4. /src/components/layout/LanguageSwitcher.jsx
   - React component
   - Dropdown showing current language (EN/中文)
   - Click to toggle dropdown with both options
   - Links to equivalent page in other language
   - Use useState for dropdown open/close
   - Click outside to close

Use the translations from /src/i18n/ files. Style with Tailwind CSS.
Make sure Navigation and Footer use getTranslations(lang) to get localized strings.
```

---

#### Step 4: Supabase & Utility Setup

**Estimated time:** 20-30 minutes

**What you'll do:**
- Create Supabase client
- Create Gemini API wrapper
- Set up database schema

**Prompt for AI coding assistant:**

```
For the CosmeticLens project, create the utility files:

1. /src/lib/supabase.ts
   - Export browser client using PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY
   - Export createServerClient() function using service role key
   - Add TypeScript types for environment variables

2. /src/lib/gemini.ts
   - Interface for GeminiRequest (systemPrompt, userMessage, temperature, maxTokens)
   - Interface for GeminiResponse (success, content, error)
   - callGemini() async function that:
     - Fetches from Gemini API endpoint
     - Handles errors gracefully
     - Returns typed response
   - callGeminiWithRetry() function with exponential backoff for rate limits

3. /src/lib/prompt.ts
   - Types: Language, UserProfile, ProductContext
   - buildSystemPrompt(language, userProfile) - loads template and replaces placeholders
   - buildUserMessage(context, ingredientData) - formats the user message
   - findIngredientData(ingredientList) - searches ingredients database for matches
   - Helper functions for profile label translations

4. /src/lib/openbeautyfacts.ts
   - Interfaces for ProductSearchResult and SearchResponse
   - searchProduct(query) - searches Open Beauty Facts API
   - getProductByBarcode(barcode) - direct barcode lookup
   - extractIngredients(product, preferredLang) - gets best available ingredient text

5. SQL schema for Supabase (provide as a .sql file or instructions):
   - analysis_cache table (id, product_name_normalized, analysis_result_en, analysis_result_zh, created_at, updated_at)
   - rate_limits table (id, identifier, identifier_type, date, request_count)
   - Indexes for lookups
   - Helper function increment_rate_limit()
   - Helper function check_rate_limit()

Include proper TypeScript types and error handling throughout.
```

---

#### Step 5: Chat Components

**Estimated time:** 45-60 minutes

**What you'll do:**
- Create ChatInterface (main component)
- Create ChatMessage component
- Create AnalysisDisplay component
- Create ProductInput component
- Create LoadingIndicator component

**Prompt for AI coding assistant:**

```
For the CosmeticLens project, create the chat components:

1. /src/components/chat/ChatInterface.jsx
   - Main chat component with state for: messages[], isLoading, error
   - Welcome screen when no messages (title, tips, example buttons)
   - Messages list with ChatMessage components
   - ProductInput at bottom
   - handleAnalyze() function that:
     - Adds user message to state
     - Calls /api/analyze endpoint
     - Handles success/error responses
     - Adds assistant message with result
   - "New Chat" button to clear messages
   - Props: lang, translations

2. /src/components/chat/ChatMessage.jsx
   - Props: message (role, content, cached, product), lang
   - User messages: right-aligned, blue bubble
   - Assistant messages: left-aligned, white card with border
   - Show product info header if available (image, name, brand)
   - Show "Cached" badge if cached
   - Use AnalysisDisplay for assistant content

3. /src/components/chat/AnalysisDisplay.jsx
   - Props: content (markdown string), lang
   - Copy button in top-right corner
   - Use react-markdown to render content
   - Custom components for:
     - Tables with nice styling
     - Headers with proper hierarchy
     - Warning paragraphs (detect ⚠️ emoji) with amber background
     - Success paragraphs (detect ✅) with green text
   - Prose styling with @tailwindcss/typography

4. /src/components/chat/ProductInput.jsx
   - Props: onSubmit, isLoading, placeholder, buttonText
   - Input field (single line by default)
   - Toggle button to switch to textarea for pasting ingredient lists
   - Submit button with loading state
   - Submit on Enter (unless multiline mode with Shift)

5. /src/components/chat/LoadingIndicator.jsx
   - Props: text
   - Three bouncing dots animation
   - Loading text next to dots

Style all components with Tailwind CSS. Use proper React hooks and state management.
```

---

#### Step 6: API Routes

**Estimated time:** 30-45 minutes

**What you'll do:**
- Create /api/analyze endpoint
- Create /api/search-product endpoint
- Implement rate limiting

**Prompt for AI coding assistant:**

```
For the CosmeticLens Astro project, create the API routes:

1. /src/pages/api/analyze.ts
   - POST endpoint
   - Accept body: productName, ingredients, language, userId (optional)
   - Implementation:
     a. Validate input (need productName or ingredients)
     b. Normalize product name for cache key
     c. Check cache for existing analysis
     d. Check rate limit (5/day for anonymous based on IP hash)
     e. If no ingredients, search Open Beauty Facts
     f. Load matching ingredient data from database
     g. Build system prompt and user message
     h. Call Gemini API
     i. Cache the result
     j. Increment rate limit counter
     k. Return response
   - Error responses with appropriate codes:
     - 400 for missing input
     - 404 for product not found
     - 429 for rate limit exceeded
     - 500 for internal errors
   - Helper functions:
     - hashIP(ip) - anonymize IP for rate limiting
     - checkRateLimit(identifier, limit)
     - incrementRateLimit(identifier, type)

2. /src/pages/api/search-product.ts
   - GET endpoint with query parameter
   - Search Open Beauty Facts
   - Return product data or 404

Include proper TypeScript types, error handling, and logging.
Use the utility functions from /src/lib/.
```

---

#### Step 7: Glossary Components & Page

**Estimated time:** 30-45 minutes

**What you'll do:**
- Create GlossaryTable component
- Create Glossary pages (EN and ZH)

**Prompt for AI coding assistant:**

```
For the CosmeticLens project, create the glossary feature:

1. /src/components/glossary/GlossaryTable.jsx
   - Props: entries, categories, lang, translations
   - State: search query, selectedCategory, sortField, sortDirection
   - Search input that filters by:
     - INCI name
     - Chinese name
     - Aliases (both languages)
     - Function text
   - Category dropdown filter
   - Sortable table headers (click to sort)
   - Results count display
   - Table with columns:
     - INCI Name (with aliases below)
     - Chinese Name (with aliases below)
     - Category (as colored badge)
     - Function (with notes in smaller text)
   - Empty state when no results
   - Alternate row colors
   - Responsive (horizontal scroll on mobile)

2. /src/pages/en/glossary.astro
   - Import BaseLayout and GlossaryTable
   - Import glossary data and translations
   - Page title and subtitle
   - Render GlossaryTable with client:load directive
   - Pass entries, categories, lang='en', translations

3. /src/pages/zh/glossary.astro
   - Same as English version but with lang='zh'

Style with Tailwind CSS. Make the table professional and easy to scan.
```

---

#### Step 8: Main Pages

**Estimated time:** 30-45 minutes

**What you'll do:**
- Create home pages (EN and ZH)
- Create chat pages (EN and ZH)
- Create redirect from root

**Prompt for AI coding assistant:**

```
For the CosmeticLens project, create the main pages:

1. /src/pages/index.astro
   - Simple redirect to /en/
   - Use Astro's redirect or meta refresh

2. /src/pages/en/index.astro (Home page)
   - Use BaseLayout with proper title/description
   - Hero section:
     - Large heading: "Know What's Really in Your Skincare"
     - Subheading explaining the value proposition
     - Two CTA buttons: "Analyze a Product" → /en/chat, "Learn About Ingredients" → /en/glossary
   - Features section (3-4 cards):
     - Ingredient Analysis
     - Claim Verification
     - Find Dupes
     - Personalized Insights
   - How It Works section (3 steps):
     - Enter product/ingredients
     - AI analyzes
     - Get clear breakdown
   - Attractive gradient backgrounds, icons, modern design

3. /src/pages/zh/index.astro
   - Same structure as English, using Chinese translations

4. /src/pages/en/chat.astro
   - Use BaseLayout
   - Import and render ChatInterface component with client:load
   - Pass lang='en' and translations
   - Full height layout for chat interface

5. /src/pages/zh/chat.astro
   - Same as English with lang='zh'

Use translations from i18n files. Style with Tailwind CSS for a modern, professional look.
```

---

#### Step 9: Testing & Deployment

**Estimated time:** 30-45 minutes

**What you'll do:**
- Test all features locally
- Set up Vercel deployment
- Configure environment variables

**Prompt for AI coding assistant:**

```
Help me test and deploy the CosmeticLens project:

1. Local Testing Checklist:
   - Verify home page loads in both languages
   - Test language switcher navigation
   - Test chat interface:
     - Enter a product name (e.g., "CeraVe Hydrating Cleanser")
     - Paste an ingredient list
     - Verify analysis displays correctly
     - Test error handling (empty input, rate limit)
   - Test glossary:
     - Search functionality
     - Category filtering
     - Sorting
   - Test responsive design on mobile

2. Vercel Deployment:
   - Create vercel.json with:
     - Build command
     - Output directory
     - Environment variable references
   - Instructions for:
     - Connecting GitHub repo to Vercel
     - Setting environment variables in Vercel dashboard
     - Configuring custom domain (optional)

3. Supabase Setup:
   - SQL script to run in Supabase SQL Editor
   - Instructions for:
     - Getting project URL and keys
     - Setting up Row Level Security policies

4. Gemini API Setup:
   - Instructions for getting API key from Google AI Studio
   - Note about free tier limits (50 req/day for Pro, 1000 for Flash)

Provide a comprehensive checklist and any configuration files needed.
```

---

### 12.3 MVP Completion Checklist

Use this checklist to verify MVP is complete:

```markdown
## MVP Completion Checklist

### Project Setup
- [ ] Astro project initialized
- [ ] Dependencies installed
- [ ] Tailwind CSS configured
- [ ] Folder structure created
- [ ] Environment variables set up

### Data Files
- [ ] ingredients-database.json created (25+ ingredients)
- [ ] glossary-data.json created
- [ ] en.json translations complete
- [ ] zh.json translations complete
- [ ] system-prompt.md created
- [ ] i18n utils working

### Layout
- [ ] BaseLayout renders correctly
- [ ] Navigation shows correct links
- [ ] Language switcher works
- [ ] Footer displays properly
- [ ] Mobile responsive

### Chat Feature
- [ ] Welcome screen displays
- [ ] Example buttons work
- [ ] Product name search works
- [ ] Ingredient list paste works
- [ ] Loading indicator shows
- [ ] Analysis displays correctly
- [ ] Error messages show
- [ ] Rate limit message shows
- [ ] New chat button works

### Glossary Feature
- [ ] Table renders with all entries
- [ ] Search filters correctly
- [ ] Category filter works
- [ ] Sorting works
- [ ] Mobile responsive

### API
- [ ] /api/analyze endpoint works
- [ ] Cache stores results
- [ ] Rate limiting works
- [ ] Error handling works

### Deployment
- [ ] Vercel deployment successful
- [ ] Environment variables configured
- [ ] Supabase database set up
- [ ] Custom domain (optional)

### Testing
- [ ] English version fully functional
- [ ] Chinese version fully functional
- [ ] Mobile testing passed
- [ ] Error scenarios handled
```

---

## 13. Full Implementation Phases

### 13.1 Phase Overview

| Phase | Duration | Features |
|-------|----------|----------|
| **MVP** | Week 1 | Chat, Glossary, Bilingual, Rate Limiting |
| **Phase 2** | Week 2-3 | Auth, Profiles, History, Education |
| **Phase 3** | Week 4-5 | Dupe Finder, Interactions, Polish |

### 13.2 Phase 2: User Features

**Week 2: Authentication & Profiles**

```
Day 1-2: Supabase Auth Setup
- Create auth UI components (LoginForm, SignupForm)
- Create auth pages (/en/login, /en/signup, /zh/login, /zh/signup)
- Implement email/password authentication
- Add session management to Navigation
- Create AuthGuard component for protected routes

Day 3-4: User Profiles
- Create profiles table in Supabase (if not already)
- Create ProfileForm component with all fields
- Create profile pages (/en/profile, /zh/profile)
- Create /api/profile endpoint (GET, PUT)
- Integrate profile data into analysis prompts

Day 5: Analysis History
- Create analysis_history table (if not already)
- Create HistoryList component
- Create history pages (/en/history, /zh/history)
- Create /api/history endpoint
- Add "Save to History" for authenticated users
```

**Week 3: Education & Content**

```
Day 1-2: Education Infrastructure
- Create ArticleCard component
- Create FunFactCard component
- Create education landing pages
- Set up content collections for articles

Day 3-4: Initial Content
- Write "How to Read an Ingredient List" article (EN + ZH)
- Write "Understanding Surfactants" article (EN + ZH)
- Create 10 fun facts (EN + ZH)
- Link fun facts to glossary entries

Day 5: Polish & Integration
- Add related ingredients to articles
- Improve navigation between features
- Add "Learn More" links in analysis results
```

### 13.3 Phase 3: Advanced Features

**Week 4: Dupe Finder**

```
Day 1-2: Dupe Database
- Research and compile dupe pairs data
- Create dupes data structure
- Add dupe matching logic

Day 3-4: Dupe UI
- Add "Find Similar Products" button to analysis
- Create DupeSuggestions component
- Integrate with LLM for intelligent suggestions

Day 5: Interaction Warnings
- Create interactions database
- Add automatic interaction detection
- Display warnings prominently in analysis
```

**Week 5: Polish & Launch**

```
Day 1-2: Performance
- Optimize bundle size
- Add proper caching headers
- Implement lazy loading
- Test Core Web Vitals

Day 3-4: UX Polish
- Add loading skeletons
- Improve error messages
- Add success animations
- Mobile optimization pass

Day 5: Launch Prep
- Final testing
- Documentation
- Monitoring setup
- Soft launch
```

---

## 14. Complete File Structure

### 14.1 Full Project Structure

```
cosmeticlens/
├── .env                          # Environment variables (git-ignored)
├── .env.example                  # Environment template
├── .gitignore
├── astro.config.mjs              # Astro configuration
├── package.json
├── tailwind.config.mjs           # Tailwind configuration
├── tsconfig.json                 # TypeScript configuration
├── vercel.json                   # Vercel deployment config
│
├── public/
│   ├── favicon.svg
│   ├── og-image.png              # Open Graph image
│   └── robots.txt
│
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── BaseLayout.astro
│   │   │   ├── Navigation.astro
│   │   │   ├── Footer.astro
│   │   │   └── LanguageSwitcher.jsx
│   │   │
│   │   ├── chat/
│   │   │   ├── ChatInterface.jsx
│   │   │   ├── ChatMessage.jsx
│   │   │   ├── AnalysisDisplay.jsx
│   │   │   ├── ProductInput.jsx
│   │   │   └── LoadingIndicator.jsx
│   │   │
│   │   ├── glossary/
│   │   │   └── GlossaryTable.jsx
│   │   │
│   │   ├── education/
│   │   │   ├── ArticleCard.jsx
│   │   │   ├── ArticleList.jsx
│   │   │   └── FunFactCard.jsx
│   │   │
│   │   ├── profile/
│   │   │   └── ProfileForm.jsx
│   │   │
│   │   ├── auth/
│   │   │   ├── LoginForm.jsx
│   │   │   ├── SignupForm.jsx
│   │   │   └── AuthGuard.jsx
│   │   │
│   │   └── ui/
│   │       ├── Button.jsx
│   │       ├── Input.jsx
│   │       ├── Select.jsx
│   │       ├── Card.jsx
│   │       ├── Modal.jsx
│   │       └── Toast.jsx
│   │
│   ├── content/
│   │   ├── en/
│   │   │   ├── articles/
│   │   │   │   ├── how-to-read-ingredients.md
│   │   │   │   └── understanding-surfactants.md
│   │   │   └── fun-facts.json
│   │   │
│   │   └── zh/
│   │       ├── articles/
│   │       │   ├── how-to-read-ingredients.md
│   │       │   └── understanding-surfactants.md
│   │       └── fun-facts.json
│   │
│   ├── data/
│   │   ├── ingredients-database.json
│   │   ├── glossary-data.json
│   │   └── system-prompt.md
│   │
│   ├── i18n/
│   │   ├── en.json
│   │   ├── zh.json
│   │   └── utils.ts
│   │
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── gemini.ts
│   │   ├── prompt.ts
│   │   ├── openbeautyfacts.ts
│   │   └── analyzer.ts
│   │
│   ├── pages/
│   │   ├── index.astro                    # Redirect to /en/
│   │   │
│   │   ├── api/
│   │   │   ├── analyze.ts
│   │   │   ├── search-product.ts
│   │   │   ├── profile.ts
│   │   │   └── history.ts
│   │   │
│   │   ├── en/
│   │   │   ├── index.astro                # English home
│   │   │   ├── chat.astro                 # English chat
│   │   │   ├── glossary.astro             # English glossary
│   │   │   ├── login.astro                # Login page
│   │   │   ├── signup.astro               # Signup page
│   │   │   ├── profile.astro              # User profile
│   │   │   ├── history.astro              # Analysis history
│   │   │   └── education/
│   │   │       ├── index.astro            # Education landing
│   │   │       └── [slug].astro           # Article pages
│   │   │
│   │   └── zh/
│   │       ├── index.astro                # Chinese home
│   │       ├── chat.astro                 # Chinese chat
│   │       ├── glossary.astro             # Chinese glossary
│   │       ├── login.astro
│   │       ├── signup.astro
│   │       ├── profile.astro
│   │       ├── history.astro
│   │       └── education/
│   │           ├── index.astro
│   │           └── [slug].astro
│   │
│   ├── styles/
│   │   └── global.css
│   │
│   └── env.d.ts                           # TypeScript env declarations
│
└── supabase/
    └── schema.sql                         # Database schema
```

---

## 15. Deployment Guide

### 15.1 Prerequisites

Before deploying, ensure you have:
- [ ] GitHub account with repository created
- [ ] Vercel account (free tier works)
- [ ] Supabase account with project created
- [ ] Google AI Studio account with Gemini API key

### 15.2 Supabase Setup

**Step 1: Create Project**
1. Go to https://supabase.com
2. Create new project
3. Note your project URL and keys from Settings > API

**Step 2: Run Schema**
1. Go to SQL Editor in Supabase dashboard
2. Paste and run the schema from `/supabase/schema.sql`
3. Verify tables are created in Table Editor

**Step 3: Configure Auth (Phase 2)**
1. Go to Authentication > Providers
2. Enable Email provider
3. Configure email templates (optional)
4. Enable Google OAuth (optional)

### 15.3 Vercel Deployment

**Step 1: Connect Repository**
1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repository
4. Select "Astro" as framework preset

**Step 2: Configure Environment Variables**

Add these in Vercel dashboard (Settings > Environment Variables):

| Variable | Value | Environment |
|----------|-------|-------------|
| `GEMINI_API_KEY` | Your Gemini API key | Production, Preview |
| `PUBLIC_SUPABASE_URL` | https://xxx.supabase.co | All |
| `PUBLIC_SUPABASE_ANON_KEY` | eyJ... | All |
| `SUPABASE_SERVICE_ROLE_KEY` | eyJ... | Production only |
| `PUBLIC_SITE_URL` | https://your-domain.com | Production |

**Step 3: Deploy**
1. Click "Deploy"
2. Wait for build to complete
3. Test the deployed site

**Step 4: Custom Domain (Optional)**
1. Go to Settings > Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Wait for SSL certificate

### 15.4 vercel.json Configuration

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "astro",
  "regions": ["iad1"],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store" }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

### 15.5 Post-Deployment Checklist

```markdown
## Post-Deployment Verification

### Functionality
- [ ] Home page loads correctly
- [ ] Language switcher works
- [ ] Chat analysis works (test with real product)
- [ ] Glossary loads and search works
- [ ] Rate limiting triggers after 5 requests (anonymous)
- [ ] Cache returns faster on second request for same product

### Performance
- [ ] Lighthouse score > 90 for Performance
- [ ] First Contentful Paint < 2s
- [ ] No console errors

### Security
- [ ] Environment variables not exposed in client
- [ ] API routes protected
- [ ] HTTPS working

### SEO
- [ ] Meta tags present
- [ ] Open Graph tags working
- [ ] robots.txt accessible
```

---

## 16. Testing Checklist

### 16.1 Functional Testing

```markdown
## Chat Feature Tests

### Product Name Search
- [ ] Search "CeraVe Hydrating Cleanser" → returns analysis
- [ ] Search "The Ordinary Niacinamide" → returns analysis
- [ ] Search "nonexistent product xyz123" → shows not found error
- [ ] Search with empty input → shows validation error

### Ingredient List Paste
- [ ] Paste valid ingredient list → returns analysis
- [ ] Paste very long list (100+ ingredients) → handles gracefully
- [ ] Paste non-ingredient text → LLM handles appropriately

### Analysis Display
- [ ] Markdown renders correctly
- [ ] Tables display properly
- [ ] Emojis display correctly
- [ ] Warning boxes styled correctly
- [ ] Copy button works

### Rate Limiting
- [ ] First 5 requests succeed (anonymous)
- [ ] 6th request shows rate limit error
- [ ] Error message is clear and helpful

### Caching
- [ ] First request takes 3-10 seconds
- [ ] Second request for same product is instant
- [ ] Cached badge appears

## Glossary Feature Tests

### Search
- [ ] Search "niacinamide" → finds entry
- [ ] Search "烟酰胺" → finds entry
- [ ] Search "vitamin b3" → finds niacinamide (alias)
- [ ] Search "xyz" → shows no results message

### Filtering
- [ ] "All categories" shows all entries
- [ ] Select "Active" → shows only actives
- [ ] Combine search + filter → works correctly

### Sorting
- [ ] Click INCI header → sorts A-Z
- [ ] Click again → sorts Z-A
- [ ] Sort persists with search/filter

## Language Tests

### Switcher
- [ ] Click EN → stays on English page
- [ ] Click 中文 → navigates to Chinese equivalent
- [ ] URL updates correctly (/en/ ↔ /zh/)

### Content
- [ ] All UI text in correct language
- [ ] Ingredient names show both EN and ZH
- [ ] Analysis response matches selected language
```

### 16.2 Cross-Browser Testing

```markdown
## Browser Compatibility

### Desktop
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile
- [ ] iOS Safari
- [ ] Android Chrome
- [ ] Responsive layout works
- [ ] Touch interactions work
```

### 16.3 Performance Testing

```markdown
## Performance Metrics

### Lighthouse Scores (target)
- [ ] Performance: > 90
- [ ] Accessibility: > 90
- [ ] Best Practices: > 90
- [ ] SEO: > 90

### Core Web Vitals
- [ ] LCP (Largest Contentful Paint): < 2.5s
- [ ] FID (First Input Delay): < 100ms
- [ ] CLS (Cumulative Layout Shift): < 0.1

### API Response Times
- [ ] /api/analyze (uncached): < 15s
- [ ] /api/analyze (cached): < 500ms
- [ ] /api/search-product: < 2s
```

---

## 17. Future Enhancements

### 17.1 Short-term (1-3 months)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Image Upload** | OCR to extract ingredients from photos | High |
| **Routine Builder** | Help users build AM/PM routines | High |
| **Product Comparison** | Compare 2-3 products side by side | Medium |
| **Share Results** | Generate shareable analysis links | Medium |
| **Email Reports** | Send analysis to email | Low |

### 17.2 Medium-term (3-6 months)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Mobile App** | React Native or PWA | High |
| **Community Features** | User reviews, discussions | Medium |
| **Brand Profiles** | Pages for brands with their products | Medium |
| **Ingredient Alerts** | Notify when products with allergens appear | Medium |
| **API Access** | Public API for developers | Low |

### 17.3 Long-term (6-12 months)

| Feature | Description | Priority |
|---------|-------------|----------|
| **AI Recommendations** | Personalized product recommendations | High |
| **Barcode Scanner** | Scan products in-store | High |
| **Price Tracking** | Track prices across retailers | Medium |
| **Formulation Analysis** | Deeper chemical analysis | Medium |
| **B2B Features** | Tools for formulators/brands | Low |

### 17.4 Technical Improvements

```markdown
## Infrastructure
- [ ] Add Redis caching layer
- [ ] Implement CDN for static assets
- [ ] Add error monitoring (Sentry)
- [ ] Add analytics (Plausible/Umami)
- [ ] Set up CI/CD pipeline with tests

## Code Quality
- [ ] Add unit tests for utilities
- [ ] Add E2E tests with Playwright
- [ ] Implement proper logging
- [ ] Add TypeScript strict mode throughout
- [ ] Document API with OpenAPI spec

## Performance
- [ ] Implement streaming for LLM responses
- [ ] Add service worker for offline support
- [ ] Optimize images with next-gen formats
- [ ] Implement virtual scrolling for large lists
```

---

## Appendix A: Sample Education Article

### How to Read a Cosmetic Ingredient List

**File:** `/src/content/en/articles/how-to-read-ingredients.md`

```markdown
---
title: "How to Read a Cosmetic Ingredient List"
title_zh: "如何阅读化妆品成分表"
description: "Learn the secrets of decoding ingredient lists to make informed skincare choices"
description_zh: "学会解读成分表的秘密，做出明智的护肤选择"
category: "basics"
readingTime: 5
author: "CosmeticLens Team"
publishedAt: "2025-02-01"
updatedAt: "2025-02-01"
relatedIngredients: ["glycerin", "niacinamide", "retinol"]
---

Ever stared at the back of a moisturizer and felt like you were reading a chemistry textbook? You're not alone. Cosmetic ingredient lists can be intimidating, but once you understand a few key rules, they become a powerful tool for making informed skincare decisions.

## The Golden Rule: Descending Order

Here's the most important thing to know: **ingredients are listed in descending order of concentration**. The first ingredient is present in the highest amount, and quantities decrease as you go down the list.

This means:
- The first 5-6 ingredients typically make up the bulk of the product (often 70-80%)
- If a "star ingredient" is listed near the end, there's probably very little of it
- Water (Aqua) is almost always first in water-based products

## The 1% Line

Here's where it gets interesting. Ingredients present at 1% concentration or less can be listed in any order. But how do you know where the 1% line is?

**Common markers that indicate you've crossed the 1% threshold:**
- Preservatives (phenoxyethanol, parabens)
- Fragrance/Parfum
- Colorants
- Vitamin E (tocopherol)

If you see these, everything after them is likely present in trace amounts.

## INCI Names: The Universal Language

Ingredient lists use INCI (International Nomenclature of Cosmetic Ingredients) names—standardized names that are the same worldwide. This is helpful because:

- "Aqua" = Water (everywhere)
- "Sodium Hyaluronate" = Hyaluronic acid's salt form
- "Tocopherol" = Vitamin E

Some names look scary but are perfectly safe (Butyrospermum Parkii Butter is just shea butter!).

## Red Flags vs. Marketing Hype

**Legitimate concerns to watch for:**
- Fragrance/Parfum high on the list (if you're sensitive)
- Alcohol Denat near the top (can be drying)
- Ingredients you know you react to

**Marketing terms that don't mean much:**
- "Chemical-free" (everything is chemicals!)
- "Natural" (no legal definition)
- "Dermatologist tested" (doesn't mean approved)

## Practice Makes Perfect

Start by looking at products you already use and love. Can you identify:
1. The main ingredients (first 5)?
2. Where the 1% line might be?
3. Any active ingredients and their position?

The more you practice, the faster you'll become at evaluating new products!

---

*Ready to analyze a specific product? Try our [Product Analyzer](/en/chat) to get a detailed breakdown.*
```

---

## Appendix B: Configuration Files

### astro.config.mjs

```javascript
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  integrations: [
    react(),
    tailwind()
  ],
  output: 'server',
  adapter: vercel(),
  vite: {
    ssr: {
      noExternal: ['react-markdown']
    }
  }
});
```

### tailwind.config.mjs

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
```

### tsconfig.json

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@lib/*": ["src/lib/*"],
      "@data/*": ["src/data/*"]
    }
  }
}
```

### package.json

```json
{
  "name": "cosmeticlens",
  "type": "module",
  "version": "1.0.0",
  "scripts": {
    "dev": "astro dev",
    "start": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro",
    "lint": "eslint src --ext .ts,.tsx,.astro",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@astrojs/react": "^3.0.0",
    "@astrojs/tailwind": "^5.0.0",
    "@astrojs/vercel": "^7.0.0",
    "@supabase/supabase-js": "^2.39.0",
    "astro": "^4.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-markdown": "^9.0.0"
  },
  "devDependencies": {
    "@tailwindcss/typography": "^0.5.10",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0"
  }
}
```

---

## Appendix C: Quick Reference

### Key API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `POST /api/analyze` | POST | No | Analyze product |
| `GET /api/search-product` | GET | No | Search OBF |
| `GET /api/profile` | GET | Yes | Get profile |
| `PUT /api/profile` | PUT | Yes | Update profile |
| `GET /api/history` | GET | Yes | Get history |
| `DELETE /api/history/[id]` | DELETE | Yes | Delete item |

### Rate Limits

| User Type | Daily Limit |
|-----------|-------------|
| Anonymous | 5 analyses |
| Authenticated | 20 analyses |
| Cached results | Unlimited |

### External APIs

| Service | Free Tier | Notes |
|---------|-----------|-------|
| Gemini 2.5 Pro | 50 req/day | Use Flash for higher limits |
| Gemini 2.5 Flash | 1000 req/day | Faster, slightly lower quality |
| Open Beauty Facts | Unlimited | Be respectful, ~1 req/sec |
| Supabase | 500MB DB | Generous for this scale |
| Vercel | 100GB bandwidth | Plenty for 500 users |

---

## End of Part 5 - Plan Complete!

**This file is saved as: `/home/claude/plan-part-5.md`**

**Part 5 covers:**
- Section 12: MVP Implementation Plan (step-by-step with prompts)
- Section 13: Full Implementation Phases (Weeks 1-5)
- Section 14: Complete File Structure
- Section 15: Deployment Guide
- Section 16: Testing Checklist
- Section 17: Future Enhancements
- Appendix A: Sample Education Article
- Appendix B: Configuration Files
- Appendix C: Quick Reference

**Character count: ~32,000 characters**

---

## Summary: All Parts Complete

| Part | File | Size | Contents |
|------|------|------|----------|
| **Part 1** | `plan-part-1.md` | ~61KB | Sections 1-5: Overview, Goals, Features, Architecture, Tech Stack |
| **Part 2** | `plan-part-2.md` | ~45KB | Section 6.1-6.3: ingredients-database.json, glossary-data.json |
| **Part 3** | `plan-part-3.md` | ~75KB | Sections 6.4-9: system-prompt, fun-facts, i18n, Database, API |
| **Part 4** | `plan-part-4.md` | ~77KB | Sections 10-11: Frontend Components, LLM Integration |
| **Part 5** | `plan-part-5.md` | ~32KB | Sections 12-17: MVP Plan, Phases, Deployment, Testing, Future |

**Total: ~290KB of comprehensive documentation**

---
