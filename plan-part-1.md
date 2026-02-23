# CosmeticLens: Cosmetic Ingredient Analysis Platform

## Complete Project Plan & Implementation Guide

**Version:** 1.0  
**Last Updated:** February 2025  
**Project Type:** Full-stack web application with LLM integration  
**Target Users:** ~500 users initially  
**Languages:** Bilingual (English & Chinese)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement & Goals](#2-problem-statement--goals)
3. [Core Features](#3-core-features)
4. [Technical Architecture](#4-technical-architecture)
5. [Technology Stack](#5-technology-stack)
6. [Data Files & Knowledge Base](#6-data-files--knowledge-base)
7. [Bilingual (i18n) Implementation](#7-bilingual-i18n-implementation)
8. [Database Schema](#8-database-schema)
9. [API Design](#9-api-design)
10. [Frontend Pages & Components](#10-frontend-pages--components)
11. [LLM Integration & Prompting](#11-llm-integration--prompting)
12. [MVP Implementation Plan](#12-mvp-implementation-plan)
13. [Full Implementation Phases](#13-full-implementation-phases)
14. [File Structure](#14-file-structure)
15. [Deployment Guide](#15-deployment-guide)
16. [Testing Checklist](#16-testing-checklist)
17. [Future Enhancements](#17-future-enhancements)

---

## 1. Project Overview

### 1.1 What is CosmeticLens?

CosmeticLens is a bilingual (English/Chinese) web application that helps consumers understand cosmetic product ingredients and evaluate marketing claims against actual ingredient efficacy. The platform uses LLM technology to analyze product formulations and provide evidence-based assessments.

The application serves as a bridge between complex cosmetic chemistry knowledge and everyday consumers who want to make informed purchasing decisions about skincare and beauty products.

### 1.2 Key Value Proposition

- **Bridge the information asymmetry** between cosmetic companies and consumers
- **Provide objective, evidence-based** ingredient analysis rather than marketing-driven opinions
- **Help users find cost-effective alternatives** to expensive products with similar formulations
- **Educate the public** about common cosmetic ingredients in an accessible, engaging way
- **Support both English and Chinese users** with full bilingual interface and content

### 1.3 Project Naming

| Aspect | English | Chinese |
|--------|---------|---------|
| **Name** | CosmeticLens | 成分透视 |
| **Tagline** | "See through the marketing" | "看穿护肤品营销" |
| **Domain suggestion** | cosmeticlens.com or cosmeticlens.io | - |

### 1.4 Target Audience

**Primary Users:**
- Skincare enthusiasts who want to understand what they're putting on their skin
- Budget-conscious consumers looking for affordable alternatives to expensive products
- People with sensitive skin or allergies who need to avoid certain ingredients
- Chinese-speaking consumers who struggle to find ingredient information in their language

**Secondary Users:**
- Beauty bloggers and content creators researching products
- Dermatology patients wanting to understand recommended products
- Parents researching safe products for children

---

## 2. Problem Statement & Goals

### 2.1 The Problem

#### 2.1.1 Marketing vs Reality Gap

Cosmetic products frequently make exaggerated marketing claims that don't align with their actual ingredients. For example:
- A "hydrating" product may contain minimal humectants
- An "anti-aging miracle serum" may have beneficial actives listed near the end (meaning negligible concentrations)
- Products marketed as "gentle" may contain known irritants like SLS or high alcohol content

#### 2.1.2 Consumer Knowledge Gap

Most consumers lack the knowledge to evaluate products objectively:
- They don't know what ingredients actually do
- They can't assess whether concentrations are effective
- They fall for marketing buzzwords like "natural," "clean," or "chemical-free"
- They can't distinguish between different forms of the same ingredient (e.g., various Vitamin C derivatives)

#### 2.1.3 Information Accessibility Issues

- Scientific ingredient information is scattered across multiple sources
- Most authoritative resources are in English only
- Technical language makes it hard for non-experts to understand
- Existing tools are often database lookups without analysis or context

#### 2.1.4 Price-Value Disconnect

- Expensive products often contain similar formulations to budget alternatives
- Consumers pay premium prices for packaging and marketing, not superior ingredients
- Without ingredient knowledge, consumers can't identify good-value products

### 2.2 Project Goals

| Goal | Description | Success Metric |
|------|-------------|----------------|
| **Accurate Analysis** | Provide reliable, evidence-based ingredient analysis | >90% accuracy on known product formulations when compared to expert analysis |
| **User Education** | Help users understand ingredient categories and functions | Users can identify 5+ ingredient types and their purposes after using the platform |
| **Cost Savings** | Help users find effective, affordable alternatives | Users report finding alternatives averaging 30%+ cheaper than original products |
| **Bilingual Accessibility** | Serve both English and Chinese speaking users equally | Full feature parity between EN and ZH interfaces; all content available in both languages |
| **User Engagement** | Create a tool people return to regularly | Average 3+ analyses per returning user; 40%+ users return within 30 days |
| **Trust Building** | Establish credibility through balanced, honest analysis | User surveys show >80% trust rating; no accusations of bias toward/against brands |

### 2.3 Non-Goals (Out of Scope)

To maintain focus, the following are explicitly NOT goals for this project:

- **Medical diagnosis or treatment advice** - We analyze ingredients, not prescribe treatments
- **Brand partnerships or sponsored content** - Analysis must remain unbiased
- **E-commerce integration** - We inform, not sell
- **User-generated reviews** - Focus on objective ingredient analysis, not subjective opinions
- **Comprehensive product database** - We analyze on-demand, not maintain a complete catalog

---

## 3. Core Features

### 3.1 Feature Summary Table

| # | Feature | Description | Priority | Phase |
|---|---------|-------------|----------|-------|
| 1 | Product Analysis Chat | Users input product names/ingredients, LLM analyzes and compares to marketing claims | P0 | MVP |
| 2 | Ingredient Glossary | Searchable CN/EN database of common cosmetic ingredients | P0 | MVP |
| 3 | Language Toggle | Switch between EN/ZH interface seamlessly | P0 | MVP |
| 4 | Education Pages | Articles explaining ingredient categories and how to read labels | P1 | Phase 2 |
| 5 | Fun Fact Cards | Interactive expandable cards with surprising ingredient facts | P1 | Phase 2 |
| 6 | User Authentication | Account creation, login, profile management | P1 | Phase 2 |
| 7 | User Profiles | Save skin type, allergies, concerns for personalized analysis | P1 | Phase 2 |
| 8 | Dupe Finder | Suggest affordable alternatives to expensive products | P1 | Phase 2 |
| 9 | Interaction Warnings | Alert users to potentially problematic ingredient combinations | P1 | Phase 2 |
| 10 | Analysis History | Save and revisit past product analyses | P2 | Phase 3 |

### 3.2 Feature Detail Specifications

#### 3.2.1 Product Analysis Chat (P0 - MVP)

**Description:**
The core feature of the application. Users can input a product name or paste an ingredient list, and receive a comprehensive, evidence-based analysis of the product's formulation.

**User Flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│ User enters: "CeraVe Hydrating Cleanser"                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ System searches Open Beauty Facts API for product               │
│ → If found: Extract ingredient list automatically               │
│ → If not found: Prompt user to paste ingredients manually       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ System loads relevant ingredient profiles from knowledge base   │
│ System loads user profile (if authenticated)                    │
│ System constructs LLM prompt with all context                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ LLM generates structured analysis including:                    │
│ • Product overview                                              │
│ • Ingredient breakdown (star, supporting, functional, concerns) │
│ • Claims vs reality assessment                                  │
│ • Suitability for different skin types                         │
│ • Value assessment                                              │
│ • Personalized notes (if profile available)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ User sees formatted analysis                                    │
│ User can ask follow-up questions:                              │
│ • "Is this good for oily skin?"                                │
│ • "Find me a cheaper alternative"                              │
│ • "What about the fragrance in this?"                          │
└─────────────────────────────────────────────────────────────────┘
```

**Analysis Output Structure:**

The LLM should return analysis in this structured format:

1. **Product Overview**
   - Product category (cleanser, serum, moisturizer, sunscreen, etc.)
   - Intended use based on formulation analysis
   - Target skin type/audience based on ingredients

2. **Key Ingredients Breakdown**
   - ⭐ **Star Ingredients**: Active ingredients with proven benefits at likely effective concentrations
   - 💪 **Supporting Ingredients**: Good-quality basics that support the formula
   - 🔧 **Functional Ingredients**: Necessary for texture, stability, preservation (neutral)
   - ⚠️ **Potential Concerns**: Ingredients that may be problematic for certain users

3. **Claims vs Reality Assessment**
   - List each major marketing claim
   - Rate as: ✅ Supported | ⚠️ Partially Supported | ❌ Unsupported | ❓ Unverifiable
   - Provide specific reasoning for each rating

4. **Suitability Assessment**
   - Ideal for: [specific skin types and concerns]
   - May not suit: [skin types or conditions that might have issues]
   - Cautions: [specific warnings, e.g., "use sunscreen with this product"]

5. **Value Assessment**
   - Are you paying for effective ingredients or mostly marketing/packaging?
   - Is the formulation sophisticated or basic?
   - Brief price-to-performance consideration

6. **Personalized Notes** (when user profile is available)
   - Specific recommendations based on user's skin type
   - Warnings about ingredients that conflict with user's allergies/sensitivities
   - How well this product addresses user's stated concerns

**Input Methods:**
- Type product name (system searches databases)
- Paste full ingredient list
- Upload image of ingredient list (future enhancement)

**Follow-up Capabilities:**
- Ask clarifying questions about specific ingredients
- Request dupe/alternative suggestions
- Ask about suitability for specific concerns

---

#### 3.2.2 Ingredient Glossary (P0 - MVP)

**Description:**
A searchable, filterable database of common cosmetic ingredients with information in both English and Chinese.

**Features:**
- **Search**: Search by English name, Chinese name, INCI name, or aliases
- **Filter**: Filter by category (surfactant, humectant, active, preservative, etc.)
- **Sort**: Sort alphabetically or by category
- **Quick Info**: See function at a glance without clicking
- **Deep Link**: Each ingredient has a unique URL for sharing/linking

**Data Fields Per Ingredient:**

| Field | Description | Example |
|-------|-------------|---------|
| INCI Name | Official international nomenclature | Niacinamide |
| Chinese Name | 中文名称 | 烟酰胺 |
| Aliases (EN) | Other English names | Vitamin B3, Nicotinamide |
| Aliases (ZH) | Other Chinese names | 维生素B3 |
| Category | Ingredient type | Active |
| Function (EN) | Brief description | Brightening, oil control, barrier repair |
| Function (ZH) | 简要描述 | 美白、控油、修复屏障 |
| Notes | Additional context | Well-tolerated by most skin types |

**UI Design:**
- Responsive table on desktop
- Card layout on mobile
- Sticky search/filter bar
- Highlight search matches
- Smooth scroll to anchor links

---

#### 3.2.3 Language Toggle (P0 - MVP)

**Description:**
Users can switch between English and Chinese interfaces at any time. The switch should be seamless and preserve context.

**Requirements:**
- Toggle visible in navigation on all pages
- Switching language preserves current page (e.g., /en/glossary → /zh/glossary)
- All UI text switches immediately
- LLM responses match the selected language
- User preference saved (localStorage for anonymous, database for authenticated)

**Implementation Approach:**
- URL-based routing: `/en/*` and `/zh/*` prefixes
- Separate content files for each language
- Shared components with language prop
- i18n JSON files for UI strings

---

#### 3.2.4 Education Pages (P1 - Phase 2)

**Description:**
Educational articles that help users understand cosmetic ingredients and how to evaluate products themselves.

**Initial Articles (2 to start):**

1. **"How to Read a Cosmetic Ingredient List"**
   - Ingredients listed in descending order by concentration
   - The 1% line and what it means
   - Required vs. optional disclosures
   - Different naming conventions (INCI vs. common names)

2. **"Understanding Surfactants: The Science Behind Cleansers"**
   - What surfactants do
   - Types: anionic, cationic, amphoteric, nonionic
   - Why some are gentler than others
   - How to choose based on skin type

**Article Structure:**
```markdown
---
title: "Article Title"
title_zh: "中文标题"
description: "Brief description for SEO and preview"
description_zh: "简要描述"
category: "basics" | "ingredient-types" | "skin-concerns" | "myths"
readingTime: 5
author: "CosmeticLens Team"
publishedAt: "2025-02-01"
updatedAt: "2025-02-01"
relatedIngredients: ["niacinamide", "retinol"]
---

Article content in Markdown...
```

**Design Requirements:**
- Clean, readable typography
- Embedded fun fact cards (see 3.2.5)
- Related ingredients linked to glossary
- "Back to all articles" navigation
- Reading progress indicator
- Share buttons

**Expansion Plan:**
- Design system to easily add new articles
- Categories: Basics, Ingredient Types, Skin Concerns, Myths & Misconceptions
- Each article requires both EN and ZH versions before publishing

---

#### 3.2.5 Fun Fact Cards (P1 - Phase 2)

**Description:**
Interactive, expandable cards with surprising or memorable ingredient facts. These are interspersed throughout education pages to increase engagement and break up long text.

**Card Behavior:**
- **Collapsed State**: Shows icon + title only, visually distinct from article text
- **Expanded State**: Click/tap to reveal full content
- **Link**: Optional link to related glossary entry

**Example Fun Facts:**

| Icon | Title | Content Summary |
|------|-------|-----------------|
| 💧 | "Hyaluronic Acid is a Hydration Powerhouse" | 1 gram can hold 6 liters of water |
| ⏰ | "Retinol: From Acne Treatment to Anti-Aging Star" | Accidentally discovered anti-aging effects |
| 🔍 | "\"Fragrance\" Can Mean 3,000+ Chemicals" | Trade secret umbrella term |
| 🍊 | "Vitamin C: The Diva Ingredient" | Oxidizes easily, needs special packaging |
| 🧱 | "You Already Have Ceramides" | 50% of your skin barrier |
| ☀️ | "SPF Numbers Aren't Linear" | SPF 30 vs 50 difference is only 1% |
| 🫧 | "Silicones Don't Suffocate Your Skin" | Myth-busting |
| 📋 | "Ingredient Lists Are Like a Recipe" | Descending concentration order |

**Technical Requirements:**
- Separate JSON files for EN and ZH content
- Reusable React component
- Smooth expand/collapse animation
- Accessible (keyboard navigation, screen reader support)

---

#### 3.2.6 User Authentication (P1 - Phase 2)

**Description:**
Allow users to create accounts to save their profile and analysis history.

**Authentication Methods:**
- Email + Password (primary)
- Google OAuth (optional, nice-to-have)

**Features:**
- Sign up with email verification
- Login
- Password reset
- Logout
- Delete account

**Implementation:**
- Use Supabase Auth (built-in, secure, handles password hashing)
- JWT tokens for session management
- Protected routes for profile and history pages

---

#### 3.2.7 User Profiles (P1 - Phase 2)

**Description:**
Users can save their skin profile to receive personalized analysis recommendations.

**Profile Fields:**

| Field | Type | Options | Purpose |
|-------|------|---------|---------|
| Skin Type | Single Select | Oily, Dry, Combination, Normal | Tailor product suitability |
| Sensitivity | Single Select | Low, Medium, High | Warn about potential irritants |
| Known Allergies | Multi-select + Text | Fragrance, Essential Oils, Preservatives, Other | Flag specific ingredients |
| Skin Concerns | Multi-select | Acne, Aging, Hyperpigmentation, Dehydration, Redness, Large Pores | Highlight relevant actives |
| Pregnancy/Nursing | Boolean | Yes/No | Flag unsafe ingredients (retinoids, etc.) |
| Price Preference | Single Select | Budget, Mid-range, Luxury, No Preference | Tailor dupe suggestions |
| Preferred Language | Single Select | English, Chinese | Default interface language |

**How Profile Affects Analysis:**
1. Profile data is injected into LLM system prompt
2. LLM personalizes response:
   - "Based on your oily skin type, this product's lightweight formula should work well..."
   - "⚠️ Warning: This product contains fragrance, which you've listed as an allergen"
   - "This retinol serum is not recommended during pregnancy"

---

#### 3.2.8 Dupe Finder (P1 - Phase 2)

**Description:**
Help users find affordable alternatives to expensive products.

**How It Works:**
1. User analyzes an expensive product
2. User clicks "Find Similar Products" or asks "What's a cheaper alternative?"
3. LLM searches knowledge base and web for products with:
   - Similar key active ingredients
   - Similar concentrations (when known)
   - Lower price point
4. Returns 2-3 alternatives with:
   - Product name and approximate price
   - Key similarities to original
   - Any meaningful differences

**Example Output:**
```
Looking for alternatives to La Mer Crème de la Mer ($200)?

Here are similar products:

1. **Nivea Creme** (~$8)
   ✅ Similar: Glycerin-based moisturizer, mineral oil occlusive
   ⚠️ Different: No algae extract (La Mer's signature, though efficacy debated)
   
2. **CeraVe Moisturizing Cream** (~$16)
   ✅ Similar: Rich, occlusive moisturizer
   ✅ Better: Contains ceramides for barrier repair
   
3. **Eucerin Original Healing Cream** (~$10)
   ✅ Similar: Petrolatum-based, excellent for dry skin
   ⚠️ Different: Simpler formula, no fancy extracts
```

---

#### 3.2.9 Ingredient Interaction Warnings (P1 - Phase 2)

**Description:**
Automatically detect and warn about potentially problematic ingredient combinations within a single product or when comparing to user's routine.

**Known Interactions Database:**

| Combination | Warning Level | Explanation |
|-------------|---------------|-------------|
| Retinoids + AHAs/BHAs | ⚠️ Caution | Can increase irritation and dryness. Best to alternate or introduce slowly. |
| Retinoids + Benzoyl Peroxide | ⚠️ Caution | BP can oxidize and deactivate some retinoids. Use at different times. |
| Vitamin C + Retinol | ℹ️ Info | Can work together, but some prefer separating to AM (Vit C) and PM (Retinol). |
| Niacinamide + Vitamin C | ℹ️ Info | Old myth they can't be combined. Modern research shows it's fine. |
| AHAs + Sun Exposure | ⚠️ Warning | AHAs increase photosensitivity. Must use SPF during the day. |
| Multiple Strong Acids | ⚠️ Caution | Layering glycolic + salicylic + lactic can over-exfoliate. Choose one. |
| Retinoids + Pregnancy | 🚫 Avoid | Oral and topical retinoids linked to birth defects. |

**Display:**
- Warnings appear in a distinct callout box within analysis
- Icon indicates severity (info, caution, avoid)
- Brief explanation with actionable advice

---

#### 3.2.10 Analysis History (P2 - Phase 3)

**Description:**
Authenticated users can view their past product analyses.

**Features:**
- List of past analyses with:
  - Product name
  - Date analyzed
  - Brief summary
- Click to view full analysis
- Option to re-analyze (with updated profile or fresh data)
- Delete individual history items

**Storage:**
- Stored in Supabase `analysis_history` table
- Limited to last 50 analyses per user (to manage storage)
- Oldest automatically deleted when limit reached

---

## 4. Technical Architecture

### 4.1 High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER'S BROWSER                                 │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    FRONTEND (Astro + React)                        │  │
│  │                                                                    │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────┐  │  │
│  │  │    Chat    │ │ Education  │ │  Glossary  │ │ User Profile   │  │  │
│  │  │  Interface │ │   Pages    │ │   Table    │ │   Settings     │  │  │
│  │  │   (React)  │ │  (Astro)   │ │  (React)   │ │    (React)     │  │  │
│  │  └──────┬─────┘ └────────────┘ └────────────┘ └───────┬────────┘  │  │
│  │         │                                             │           │  │
│  │  ┌──────┴─────────────────────────────────────────────┴────────┐  │  │
│  │  │              SHARED COMPONENTS & UTILITIES                   │  │  │
│  │  │  • Navigation  • Footer  • Language Switcher  • i18n Utils  │  │  │
│  │  └──────┬──────────────────────────────────────────────────────┘  │  │
│  └─────────┼─────────────────────────────────────────────────────────┘  │
└────────────┼────────────────────────────────────────────────────────────┘
             │ HTTPS Requests
             ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        VERCEL EDGE NETWORK                              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    API ROUTES (Serverless Functions)              │  │
│  │                                                                   │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │  │
│  │  │  /api/analyze   │  │ /api/search     │  │  /api/profile   │   │  │
│  │  │                 │  │    -product     │  │                 │   │  │
│  │  │ • Validate req  │  │                 │  │ • Auth check    │   │  │
│  │  │ • Check cache   │  │ • Query Open    │  │ • Get profile   │   │  │
│  │  │ • Rate limit    │  │   Beauty Facts  │  │ • Update profile│   │  │
│  │  │ • Load context  │  │ • Return product│  │                 │   │  │
│  │  │ • Call LLM      │  │   data          │  │                 │   │  │
│  │  │ • Cache result  │  │                 │  │                 │   │  │
│  │  │ • Save history  │  │                 │  │                 │   │  │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘   │  │
│  └───────────┼───────────────────┼───────────────────┼──────────────┘  │
└──────────────┼───────────────────┼───────────────────┼──────────────────┘
               │                   │                   │
    ┌──────────┼───────────────────┼───────────────────┼──────────┐
    │          ▼                   ▼                   ▼          │
    │  ┌─────────────┐     ┌─────────────────┐    ┌───────────┐   │
    │  │   LLM API   │     │  Open Beauty    │    │ SUPABASE  │   │
    │  │             │     │   Facts API     │    │           │   │
    │  │ • Gemini    │     │                 │    │ ┌───────┐ │   │
    │  │   2.5 Pro   │     │ • Free, no key  │    │ │ Auth  │ │   │
    │  │ • Analyze   │     │ • Product search│    │ └───────┘ │   │
    │  │   products  │     │ • Ingredients   │    │ ┌───────┐ │   │
    │  │             │     │                 │    │ │  DB   │ │   │
    │  └─────────────┘     └─────────────────┘    │ └───────┘ │   │
    │                                             └───────────┘   │
    │                      EXTERNAL SERVICES                      │
    └─────────────────────────────────────────────────────────────┘
```

### 4.2 Data Flow Diagrams

#### 4.2.1 Product Analysis Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         PRODUCT ANALYSIS FLOW                             │
└──────────────────────────────────────────────────────────────────────────┘

User Input: "Analyze CeraVe Hydrating Cleanser"
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 1: CHECK ANALYSIS CACHE                                             │
│                                                                          │
│ Query: SELECT * FROM analysis_cache                                      │
│        WHERE product_name_normalized = 'cerave hydrating cleanser'       │
│        AND updated_at > NOW() - INTERVAL '30 days'                       │
│                                                                          │
│ ┌─────────────────┐    ┌──────────────────────────────────────────────┐ │
│ │ Cache HIT       │───▶│ Return cached analysis (fast path)           │ │
│ └─────────────────┘    │ Skip steps 2-7, go directly to response     │ │
│                        └──────────────────────────────────────────────┘ │
│ ┌─────────────────┐                                                     │
│ │ Cache MISS      │───▶ Continue to Step 2                              │
│ └─────────────────┘                                                     │
└─────────────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 2: CHECK RATE LIMIT                                                 │
│                                                                          │
│ Query: SELECT request_count FROM rate_limits                            │
│        WHERE user_id = ? AND date = CURRENT_DATE                        │
│                                                                          │
│ ┌─────────────────┐    ┌──────────────────────────────────────────────┐ │
│ │ Limit Exceeded  │───▶│ Return 429 Error: "Daily limit reached"      │ │
│ │ (>= 20/day)     │    └──────────────────────────────────────────────┘ │
│ └─────────────────┘                                                     │
│ ┌─────────────────┐                                                     │
│ │ Within Limit    │───▶ Continue to Step 3                              │
│ └─────────────────┘                                                     │
└─────────────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 3: FETCH PRODUCT INGREDIENTS                                        │
│                                                                          │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Try 1: Open Beauty Facts API                                        │ │
│ │ GET https://world.openbeautyfacts.org/cgi/search.pl                 │ │
│ │     ?search_terms=cerave+hydrating+cleanser&json=1                  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                         │                                                │
│           ┌─────────────┴─────────────┐                                 │
│           ▼                           ▼                                 │
│   ┌───────────────┐           ┌───────────────┐                        │
│   │ Product Found │           │ Not Found     │                        │
│   │ Extract:      │           │               │                        │
│   │ • ingredients │           │ Return error: │                        │
│   │ • brand       │           │ "Product not  │                        │
│   │ • category    │           │ found. Please │                        │
│   └───────┬───────┘           │ paste the     │                        │
│           │                   │ ingredient    │                        │
│           │                   │ list."        │                        │
│           │                   └───────────────┘                        │
│           ▼                                                             │
└─────────────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 4: LOAD RELEVANT INGREDIENT DATA FROM KNOWLEDGE BASE                │
│                                                                          │
│ Input: "Aqua, Glycerin, Cetearyl Alcohol, Phenoxyethanol,               │
│         Sodium Hyaluronate, Niacinamide, ..."                           │
│                                                                          │
│ Process:                                                                 │
│ 1. Parse ingredient string into array                                   │
│ 2. For each ingredient:                                                 │
│    a. Normalize name (lowercase, trim)                                  │
│    b. Search ingredients-database.json by:                              │
│       - INCI name                                                       │
│       - Chinese name                                                    │
│       - English aliases                                                 │
│       - Chinese aliases                                                 │
│    c. If found, add full profile to context                            │
│                                                                          │
│ Output: Array of matching ingredient profiles with all metadata         │
│         (functions, evidence level, interactions, etc.)                 │
└─────────────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 5: LOAD USER PROFILE (if authenticated)                            │
│                                                                          │
│ Query: SELECT skin_type, sensitivity, allergies, concerns,              │
│               is_pregnant, preferred_language                           │
│        FROM profiles WHERE user_id = ?                                  │
│                                                                          │
│ Output: User profile object or null                                     │
│ {                                                                       │
│   skin_type: "oily",                                                    │
│   sensitivity: "medium",                                                │
│   allergies: ["fragrance", "essential_oils"],                          │
│   concerns: ["acne", "large_pores"],                                   │
│   is_pregnant: false                                                    │
│ }                                                                       │
└─────────────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 6: CONSTRUCT LLM PROMPT                                             │
│                                                                          │
│ 1. Load system-prompt.md template                                       │
│ 2. Replace {{LANGUAGE}} with user's language ('en' or 'zh')            │
│ 3. Replace {{USER_PROFILE}} with formatted profile or default text     │
│ 4. Construct message:                                                   │
│                                                                          │
│    {                                                                    │
│      role: "user",                                                      │
│      content: `                                                         │
│        Analyze this product: CeraVe Hydrating Cleanser                  │
│                                                                          │
│        Ingredient list:                                                 │
│        Aqua, Glycerin, Cetearyl Alcohol, ...                           │
│                                                                          │
│        Relevant ingredient data:                                        │
│        [JSON of matched ingredient profiles]                            │
│      `                                                                  │
│    }                                                                    │
└─────────────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 7: CALL LLM API                                                     │
│                                                                          │
│ POST https://generativelanguage.googleapis.com/v1/models/               │
│      gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}               │
│                                                                          │
│ Request Body:                                                           │
│ {                                                                       │
│   contents: [{ role: "user", parts: [{ text: constructedPrompt }] }],  │
│   generationConfig: {                                                   │
│     temperature: 0.7,                                                   │
│     maxOutputTokens: 4096                                               │
│   }                                                                     │
│ }                                                                       │
│                                                                          │
│ Response: Structured analysis text                                      │
└─────────────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 8: POST-PROCESS AND STORE                                           │
│                                                                          │
│ 1. Parse LLM response                                                   │
│ 2. Check for ingredient interaction warnings (add if needed)            │
│ 3. Store in analysis_cache:                                             │
│    INSERT INTO analysis_cache (product_name_normalized, analysis_...)   │
│ 4. Store in analysis_history (if user authenticated):                   │
│    INSERT INTO analysis_history (user_id, product_name, ...)            │
│ 5. Increment rate limit counter:                                        │
│    UPDATE rate_limits SET request_count = request_count + 1             │
│ 6. Return response to frontend                                          │
└─────────────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ FRONTEND DISPLAYS FORMATTED ANALYSIS                                     │
│                                                                          │
│ • Render markdown content                                               │
│ • Highlight star ingredients                                            │
│ • Show warning callouts                                                 │
│ • Display claims assessment table                                       │
│ • Show personalized notes section                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 4.2.2 User Authentication Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         USER AUTHENTICATION FLOW                          │
└──────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │   User visits site  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Check for existing  │
                    │ session (JWT token) │
                    └──────────┬──────────┘
                               │
              ┌────────────────┴────────────────┐
              ▼                                 ▼
    ┌─────────────────┐               ┌─────────────────┐
    │ Session EXISTS  │               │ No Session      │
    │                 │               │                 │
    │ • Validate JWT  │               │ • Show login/   │
    │ • Load user     │               │   signup links  │
    │   profile       │               │ • Anonymous     │
    │ • Show logged   │               │   features OK   │
    │   in state      │               │                 │
    └─────────────────┘               └────────┬────────┘
                                               │
                                    ┌──────────▼──────────┐
                                    │ User clicks Sign Up │
                                    └──────────┬──────────┘
                                               │
                                    ┌──────────▼──────────┐
                                    │ Supabase Auth:      │
                                    │ • Create user       │
                                    │ • Send verification │
                                    │   email             │
                                    │ • Create profile    │
                                    │   record            │
                                    └──────────┬──────────┘
                                               │
                                    ┌──────────▼──────────┐
                                    │ User logged in      │
                                    │ • JWT stored        │
                                    │ • Redirect to       │
                                    │   profile setup     │
                                    └─────────────────────┘
```

### 4.3 Caching Strategy

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           CACHING STRATEGY                                │
└──────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: ANALYSIS CACHE (Database)                                       │
│                                                                          │
│ Purpose: Avoid redundant LLM calls for the same product                 │
│ Storage: Supabase analysis_cache table                                  │
│ TTL: 30 days                                                            │
│                                                                          │
│ Key: Normalized product name (lowercase, trimmed)                       │
│ Value: Full analysis result (separate columns for EN and ZH)            │
│                                                                          │
│ Cache HIT: Return immediately, skip LLM call                            │
│ Cache MISS: Call LLM, store result for future requests                  │
│                                                                          │
│ Note: Personalized portions are NOT cached; only the base analysis      │
│       is cached. Personalization is applied on top of cached result.    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ LAYER 2: STATIC ASSET CACHE (Vercel Edge)                               │
│                                                                          │
│ Purpose: Fast delivery of static content                                │
│ Storage: Vercel's global CDN                                            │
│ TTL: Automatic based on file type                                       │
│                                                                          │
│ Cached: JS bundles, CSS, images, fonts                                  │
│ Not Cached: API responses, dynamic pages                                │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ LAYER 3: CLIENT-SIDE CACHE (Browser)                                    │
│                                                                          │
│ Purpose: Reduce API calls for repeated operations                       │
│ Storage: localStorage / sessionStorage                                  │
│                                                                          │
│ Cached:                                                                 │
│ • User's language preference                                            │
│ • Glossary data (large JSON, cache locally)                            │
│ • Recent analysis results (session only)                               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Technology Stack

### 5.1 Stack Overview

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| **Frontend Framework** | Astro | 4.x | Content-heavy site with islands architecture; excellent i18n support; fast static pages with React for interactive components |
| **UI Components** | React | 18.x | Industry standard for interactive components; great ecosystem; works seamlessly with Astro |
| **Styling** | Tailwind CSS | 3.x | Rapid development; consistent design system; excellent responsive utilities; small bundle size with purging |
| **Backend/API** | Astro API Routes | - | Same codebase as frontend; serverless-ready; simple deployment |
| **Database** | Supabase (PostgreSQL) | - | Generous free tier (500MB); built-in auth; real-time subscriptions; row-level security |
| **Authentication** | Supabase Auth | - | Integrated with database; secure password handling; JWT tokens; OAuth support |
| **LLM API** | Gemini 2.5 Pro | - | Free tier available (50 req/day); good quality; fast responses |
| **Product Database** | Open Beauty Facts API | - | Free; open-source; no API key; decent coverage of Western brands |
| **Hosting** | Vercel | - | Excellent Astro support; free tier; global CDN; automatic HTTPS; analytics |
| **Version Control** | Git + GitHub | - | Industry standard; Vercel integration |

### 5.2 Why These Choices?

#### 5.2.1 Why Astro?

**Pros:**
- ✅ **Content-focused**: Perfect for education pages, glossary
- ✅ **Islands architecture**: Only ship JS where needed (chat, glossary table)
- ✅ **Great i18n support**: Built-in routing for `/en/` and `/zh/`
- ✅ **Fast**: Static pages load instantly; no JS overhead for content pages
- ✅ **Flexible**: Can use React, Vue, Svelte components as needed
- ✅ **Easy deployment**: First-class Vercel support

**Cons:**
- ⚠️ Less community resources than Next.js for complex apps
- ⚠️ API routes less feature-rich than Next.js

**Verdict**: Best fit for a content-heavy site with some interactive features.

#### 5.2.2 Why Supabase?

**Pros:**
- ✅ **Generous free tier**: 500MB database, 1GB storage, 50k MAU
- ✅ **Built-in auth**: No need for separate auth service
- ✅ **PostgreSQL**: Real database with full SQL capabilities
- ✅ **Row-level security**: Built-in authorization
- ✅ **Real-time**: Live subscriptions if needed later
- ✅ **Great DX**: Nice dashboard, auto-generated types

**Cons:**
- ⚠️ Vendor lock-in (mitigated by using standard PostgreSQL)
- ⚠️ Cold starts on free tier

**Verdict**: Best option for a project of this scale without upfront costs.

#### 5.2.3 Why Gemini 2.5 Pro?

**Pros:**
- ✅ **Free tier**: 50 requests/day, enough for MVP testing
- ✅ **Good quality**: Comparable to GPT-4 for analysis tasks
- ✅ **Fast**: Lower latency than some alternatives
- ✅ **Simple API**: Easy to integrate

**Cons:**
- ⚠️ Free tier is limited for production (50/day)
- ⚠️ Less ecosystem/examples than OpenAI

**Alternatives for production:**
- Gemini Flash: Higher free limits (1000/day), slightly lower quality
- OpenAI GPT-4: Better ecosystem, pay-per-use
- Claude: Excellent for analysis, pay-per-use

**Verdict**: Start with Gemini free tier; upgrade or switch as needed.

### 5.3 External API Details

#### 5.3.1 Gemini API

**Endpoint:**
```
POST https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent
```

**Authentication:**
- API key passed as query parameter: `?key=${GEMINI_API_KEY}`

**Free Tier Limits:**

| Limit Type | Gemini 2.5 Pro | Gemini 2.5 Flash |
|------------|----------------|-------------------|
| Requests per day | 50 | 1,000 |
| Requests per minute | 5 | 10 |
| Tokens per minute | 250,000 | 250,000 |

**Request Format:**
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [{ "text": "Your prompt here" }]
    }
  ],
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 4096,
    "topP": 0.95
  }
}
```

**Response Format:**
```json
{
  "candidates": [
    {
      "content": {
        "parts": [{ "text": "LLM response here" }],
        "role": "model"
      },
      "finishReason": "STOP"
    }
  ]
}
```

#### 5.3.2 Open Beauty Facts API

**Base URL:**
```
https://world.openbeautyfacts.org
```

**Search Products:**
```
GET /cgi/search.pl?search_terms={query}&json=1&page_size=10
```

**Get Product by Barcode:**
```
GET /api/v0/product/{barcode}.json
```

**Response Fields (relevant):**
```json
{
  "product": {
    "product_name": "CeraVe Hydrating Cleanser",
    "brands": "CeraVe",
    "categories": "Face cleansers",
    "ingredients_text": "Aqua, Glycerin, Cetearyl Alcohol...",
    "ingredients_text_en": "Water, Glycerin...",
    "image_url": "https://..."
  }
}
```

**Rate Limits:**
- No official limit, but be respectful (~1 request/second)
- No API key required

**Coverage Notes:**
- Good coverage of US/EU brands
- Limited coverage of Chinese domestic brands
- May need web search fallback for missing products

### 5.4 Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **Claude Code / Cursor** | AI-assisted development | Primary development method ("vibe coding") |
| **VS Code** | Backup editor | If not using Cursor |
| **Git** | Version control | Required |
| **GitHub** | Repository hosting | Integrates with Vercel |
| **Postman / Insomnia** | API testing | Test endpoints before frontend integration |
| **Supabase Dashboard** | Database management | View data, run queries, manage auth |

### 5.5 Environment Variables

```bash
# .env.example

# ============================================
# LLM API
# ============================================
GEMINI_API_KEY=your_gemini_api_key_here

# ============================================
# Supabase
# ============================================
# Find these in your Supabase project settings
PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-key...

# ============================================
# Site Configuration
# ============================================
PUBLIC_SITE_URL=http://localhost:4321
# In production: https://your-domain.com

# ============================================
# Optional: Analytics
# ============================================
# VERCEL_ANALYTICS_ID=your-analytics-id
```

**Security Notes:**
- `PUBLIC_*` variables are exposed to the client (safe for anon key)
- `SUPABASE_SERVICE_ROLE_KEY` is server-only (never expose to client)
- `GEMINI_API_KEY` is server-only (used in API routes only)

---

## End of Part 1

**Next Part (Part 2) will cover:**
- Section 6: Data Files & Knowledge Base
  - Complete `ingredients-database.json` with 50+ ingredients
  - Complete `glossary-data.json`
  - Complete `system-prompt.md`
  - Fun facts JSON files (EN and ZH)

---
