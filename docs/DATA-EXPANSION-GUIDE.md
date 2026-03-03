# Data Expansion Guide

Instructions for expanding existing data files and creating new data files. Use this as a reference when curating content.

---

## 1. Curated Dupes JSON (`src/data/curated-dupes.json`)

**Purpose:** Vetted dupe pairs for popular expensive products. Checked first when user asks for alternatives.

**Format:**

```json
{
  "metadata": {
    "version": "1.0",
    "last_updated": "YYYY-MM-DD",
    "total_pairs": 30
  },
  "pairs": [
    {
      "id": "la-mer-cream",
      "original": {
        "product_name": "Crème de la Mer",
        "brand": "La Mer",
        "category": "moisturizer",
        "price_tier": "luxury",
        "key_actives": ["Seaweed Extract", "Mineral Oil", "Glycerin", "Ceramides"]
      },
      "dupes": [
        {
          "product_name": "CeraVe Moisturizing Cream",
          "brand": "CeraVe",
          "price_tier": "budget",
          "key_similarities": ["Ceramides", "Glycerin", "Hyaluronic Acid"],
          "notes_en": "Similar barrier-repair focus with ceramides. Lacks seaweed; much simpler formula.",
          "notes_zh": "相似的屏障修复功效，含神经酰胺。无海藻成分，配方更简单。"
        },
        {
          "product_name": "Nivea Creme",
          "brand": "Nivea",
          "price_tier": "budget",
          "key_similarities": ["Petrolatum", "Glycerin", "Mineral Oil"],
          "notes_en": "Classic occlusive moisturizer. Similar heavy, protective feel.",
          "notes_zh": "经典封闭型保湿霜。质地和封闭感相似。"
        }
      ]
    }
  ]
}
```

**Field notes:**
- `id`: Slug for lookup (lowercase, hyphens).
- `original.key_actives`: Key ingredients that define the product; dupes should overlap.
- `dupes.key_similarities`: Ingredients the dupe shares with the original.
- `price_tier`: `budget` | `mid` | `luxury`.
- `category`: `cleanser` | `serum` | `moisturizer` | `sunscreen` | `treatment` | etc.

**Target:** 30 popular products, 2–3 dupes each.

---

## 2. Ingredient Interactions JSON (`src/data/ingredient-interactions.json`)

**Purpose:** Known interactions between ingredients. Used for automatic warnings during analysis.

**Format:**

```json
{
  "metadata": {
    "version": "1.0",
    "last_updated": "YYYY-MM-DD",
    "total_pairs": 0
  },
  "pairs": [
    {
      "ingredients": ["Retinol", "Glycolic Acid"],
      "ingredients_zh": ["视黄醇", "乙醇酸"],
      "level": "caution",
      "warning_en": "Using together can increase irritation significantly. Best to alternate nights or use at different times.",
      "warning_zh": "同时使用可能显著增加刺激。建议隔夜交替使用或在不同时间使用。"
    },
    {
      "ingredients": ["Retinol", "Benzoyl Peroxide"],
      "ingredients_zh": ["视黄醇", "过氧化苯甲酰"],
      "level": "caution",
      "warning_en": "BP can oxidize and deactivate retinol. Use at different times of day.",
      "warning_zh": "过氧化苯甲酰可能氧化并使视黄醇失活。应在不同时段使用。"
    },
    {
      "ingredients": ["Retinol"],
      "ingredients_zh": ["视黄醇"],
      "level": "avoid",
      "context": "pregnancy",
      "warning_en": "All retinoids (retinol, retinal, tretinoin) should be avoided during pregnancy.",
      "warning_zh": "孕期应避免使用所有视黄醇类成分（视黄醇、视黄醛、维A酸）。"
    }
  ]
}
```

**Field notes:**
- `ingredients`: Array of INCI names. Match is triggered when product contains any combination from the pair.
- `level`: `info` | `caution` | `warning` | `avoid`.
- `context`: Optional (e.g. `pregnancy`) for context-specific rules.
- Use exact INCI names that match `ingredients-database.json` and `findIngredientData` output.

---

## 3. Existing Files to Expand

### 3.1 `src/data/ingredients-database.json`

**Current:** 20 ingredients.

**Target:** 50–80 ingredients.

**Structure (per ingredient):** Keep existing schema. Each entry should have:
- `id`, `inci_name`, `chinese_name`, `aliases_en`, `aliases_zh`
- `category`, `subcategory` (optional)
- `functions` (en, zh arrays)
- `effective_concentration` (for actives): `minimum`, `optimal`, `maximum_beneficial`, or `beginner`/`intermediate`/`advanced`, plus `notes_en`/`notes_zh`
- `evidence_level`: `strong` | `moderate` | `limited`
- `evidence_notes_en`, `evidence_notes_zh`
- `skin_types`: `suited`, `caution`, `notes_en`, `notes_zh`
- `concerns_addressed`: array
- `interactions`: array of `{ ingredient, ingredient_zh, type, details_en, details_zh }`
- `irritation_potential`, `comedogenic_rating`, `pregnancy_safe`, `pregnancy_notes_en`, `pregnancy_notes_zh`
- `vegan`, `common_in`, `price_indicator`, `notes_en`, `notes_zh`

**Priorities to add:**
- Preservatives: Methylparaben, Propylparaben, Methylisothiazolinone, Sodium Benzoate
- Actives: Bakuchiol, Tranexamic Acid, Peptides (Palmitoyl Pentapeptide-4, etc.), Kojic Acid, Adapalene
- Emulsifiers: Polysorbate 80, Cetearyl Glucoside
- More surfactants, humectants, emollients as needed

---

### 3.2 `src/data/glossary-data.json`

**Current:** 30 entries.

**Target:** 50–80 entries (align with ingredients-database where possible).

**Structure (per entry):**
- `inci_name`, `chinese_name`, `aliases_en`, `aliases_zh`
- `category` (use existing category ids)
- `function_en`, `function_zh` (short descriptions)
- `notes_en`, `notes_zh`

**Note:** Simpler than ingredients-database. Can add entries that are not yet in ingredients-database (e.g. minor ingredients). Will be seeded into RAG.

---

### 3.3 `src/data/translations-reference.json`

**Current:** Section headers, table headers, verdicts, skin types, ~10 common terms.

**Target:** Add health/ingredient terms for consistent zh output.

**Structure:** Nested objects with `en` and `zh` keys.

**Add:**
- `health_terms`: `pregnancy_safe`, `avoid_during_pregnancy`, `patch_test`, `consult_dermatologist`, etc.
- `ingredient_qualifiers`: `effective_concentration`, `trace_amount`, `marketing_ingredient`, etc.
- Any terms the LLM uses often that need standardized zh.

---

## 4. Additional Content (Not in `src/data/`)

### 4.1 Fun Facts (`content/en/fun-facts.json`, `content/zh/fun-facts.json`)

**Current:** 10 facts per language.

**Target:** 15–20 facts. Will be added to RAG seed.

**Structure (per fact):**
- `id`, `title`, `content`, `ingredient_link` (id or null), `icon`, `category`

**Priorities:** Pregnancy safety, preservatives, fragrance, SPF, concentration myths, patch testing.

---

### 4.2 Education Articles (`content/en/articles/*.md`, `content/zh/articles/*.md`)

**Current:** 2 articles per language (how-to-read-ingredients, understanding-surfactants).

**Target:** Add 2–4 more (e.g. pregnancy-safe ingredients, reading concentrations, preservatives, sunscreen).

**Format:** Markdown with frontmatter `title: "..."`. Body is indexed for RAG.

---

## 5. Summary

| File | Location | Action |
|------|----------|--------|
| ingredients-database.json | src/data/ | Expand 20 → 98 |
| glossary-data.json | src/data/ | Expand 30 → 98 |
| translations-reference.json | src/data/ | Add health/ingredient terms |
| curated-dupes.json | src/data/ | **Create** — 30 products, 2–3 dupes each |
| ingredient-interactions.json | src/data/ | **Create** — interaction pairs |
| fun-facts.json | content/en/, content/zh/ | Expand 10 → 15–20 |
| articles/*.md | content/*/articles/ | Add 2–4 new articles |
