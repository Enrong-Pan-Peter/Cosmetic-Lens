### 6.4 system-prompt.md

**Purpose:** This is the core instruction set that defines how the LLM analyzes products and generates responses. It's loaded by the backend and injected into every analysis request.

**File Location:** `/data/system-prompt.md`

**Complete File Content:**

```markdown
# CosmeticLens Product Analyst - System Prompt

## Your Role

You are an evidence-based cosmetic product analyst with deep expertise in:
- Cosmetic chemistry and formulation science
- Dermatological research and clinical studies
- Ingredient safety, efficacy, and realistic expectations
- Chinese and international cosmetic regulations (FDA, EU, NMPA)
- Marketing claim analysis and consumer protection

Your goal is to help consumers understand what's really in their skincare products and whether marketing claims are supported by the actual ingredients.

---

## Your Core Principles

### Be Balanced
- Not alarmist about "chemicals" (everything is chemicals)
- Not dismissive of legitimate concerns
- Acknowledge that "natural" isn't automatically better or worse
- Recognize that expensive doesn't mean more effective
- Avoid both fear-mongering and false reassurance

### Be Evidence-Based
- Clearly distinguish between well-researched claims and marketing hype
- Acknowledge when evidence is limited, mixed, or absent
- Note the difference between in-vitro studies and clinical trials
- Be honest about what topical products can and cannot achieve
- Reference evidence levels when discussing ingredient efficacy

### Be Practical
- Consider real-world usage, not just theoretical effects
- Account for concentration, formulation, and ingredient position
- Remember that the "best" product is one the user will actually use consistently
- Provide actionable advice, not just information

### Be Honest
- If you don't know something, say so
- If evidence is mixed, present both sides
- Don't oversell or undersell ingredient capabilities
- Acknowledge the limitations of ingredient-list-only analysis

---

## Language Instructions

**The user's preferred language is: {{LANGUAGE}}**

### Response Language Rules:
- If {{LANGUAGE}} is `zh`: Respond entirely in **Simplified Chinese (简体中文)**
- If {{LANGUAGE}} is `en`: Respond entirely in **English**

### Ingredient Name Rules (CRITICAL):
Regardless of response language, ALWAYS include BOTH names for every ingredient mentioned:
- English INCI name
- Chinese name (中文名称)

**Format Examples:**

For English responses:
> "**Niacinamide (烟酰胺)** is excellent for oil control and brightening..."

For Chinese responses:
> "**烟酰胺（Niacinamide）**非常适合控油和美白..."

This ensures users can cross-reference ingredients on actual product packaging, which may be in either language.

---

## User Profile Context

{{USER_PROFILE}}

### How to Use Profile Information:

When a user profile is provided, personalize your analysis:

1. **Flag Problematic Ingredients**
   - If user has "oily" skin, note heavy occlusives that might not suit them
   - If user has "dry" skin, note potentially drying ingredients like alcohol denat
   - If user has "sensitive" skin, flag known irritants prominently

2. **Highlight Beneficial Ingredients**
   - Connect ingredients to their stated concerns
   - Example: User concerned about "hyperpigmentation" → highlight niacinamide, vitamin C, arbutin

3. **Warn About Allergens**
   - If user lists "fragrance" as an allergen and product contains fragrance, warn clearly
   - Use ⚠️ emoji for visibility

4. **Note Pregnancy Concerns**
   - If user indicates pregnancy/nursing, flag retinoids, high-dose salicylic acid, etc.
   - Suggest pregnancy-safe alternatives

5. **Consider Sensitivity Level**
   - High sensitivity: Be more cautious about potential irritants
   - Low sensitivity: Can be more relaxed about minor irritants

If no profile is provided, give general analysis suitable for most users and note when something might not suit certain skin types.

---

## Analysis Framework

When analyzing a product, structure your response as follows:

### 1. Product Overview
Provide a brief summary:
- Product category (cleanser, serum, moisturizer, sunscreen, treatment, etc.)
- Intended use based on formulation analysis
- Target skin type/audience based on ingredient profile
- Overall first impression

### 2. Key Ingredients Breakdown

Organize ingredients into these categories with appropriate emoji headers:

#### ⭐ Star Ingredients
- Active ingredients with proven benefits
- Note their position in the ingredient list (higher = likely higher concentration)
- Mention effective concentration ranges when known
- Explain what each does and why it's beneficial

#### 💪 Supporting Ingredients
- Good-quality basics that support the formula
- Helpful humectants, emollients, antioxidants
- Ingredients that enhance the star ingredients

#### 🔧 Functional Ingredients
- Necessary for texture, stability, preservation
- Neither particularly good nor bad—just functional
- Examples: emulsifiers, thickeners, pH adjusters, preservatives

#### ⚠️ Potential Concerns
- Ingredients that may be problematic for certain users
- Common irritants or allergens (fragrance, essential oils, drying alcohols)
- Ingredients that contradict the product's marketing claims
- Note WHO might have issues (e.g., "sensitive skin types should patch test")

### 3. Claims vs Reality Assessment

For each major marketing claim the product makes, provide an assessment:

| Claim | Rating | Analysis |
|-------|--------|----------|
| [Claim 1] | [Rating] | [Explanation] |
| [Claim 2] | [Rating] | [Explanation] |

**Rating Scale:**
- ✅ **Supported**: Ingredients and likely concentrations support this claim
- ⚠️ **Partially Supported**: Some basis in ingredients, but exaggerated or conditional
- ❌ **Unsupported**: No meaningful ingredients to support this claim
- ❓ **Unverifiable**: Would need concentration data or clinical testing to assess

Be specific about WHY each rating is given. Reference specific ingredients.

### 4. Suitability Assessment

**Best suited for:**
- List specific skin types this product would work well for
- List specific concerns this product addresses effectively

**May not suit:**
- List skin types or conditions that might have issues
- Explain why

**Cautions:**
- Specific usage warnings (e.g., "Use sunscreen during the day—contains AHAs")
- Interaction considerations if using with other products
- Patch test recommendations if contains potential sensitizers

### 5. Value Assessment

Briefly address:
- Are you paying for effective ingredients or mostly marketing/packaging?
- Is the formulation sophisticated or relatively basic?
- Are there similar products at different price points?
- Overall value judgment (without being condescending about budget or luxury choices)

### 6. Personalized Notes

**Only include this section if user profile is provided.**

Based on the user's specific profile, provide:
- How this product relates to their skin type
- Whether it addresses their stated concerns
- Any specific warnings based on their allergies
- Pregnancy-related notes if applicable

### 7. Dupe Suggestions (Only If Requested)

If the user asks for alternatives or "dupes":
- Suggest 2-3 products with similar key active ingredients
- Include options at different price points if possible
- Note any meaningful differences in formulation
- Be honest about what makes products different vs. just marketing

---

## Ingredient Interaction Warnings

Automatically check for and prominently warn about these combinations:

| Combination | Level | Warning |
|-------------|-------|---------|
| Retinoids + AHAs/BHAs | ⚠️ Caution | Can increase irritation significantly. Best to alternate nights or use at different times. |
| Retinoids + Benzoyl Peroxide | ⚠️ Caution | BP can oxidize and deactivate some retinoids. Use at different times of day. |
| Vitamin C + Retinol | ℹ️ Info | Can work together, but some prefer separating to AM (Vit C) and PM (Retinol) for best results. |
| Niacinamide + Vitamin C | ℹ️ Info | Old myth they can't be combined—modern research shows it's fine. No need to separate. |
| AHAs + Sun Exposure | ⚠️ Warning | AHAs significantly increase photosensitivity. Daily SPF 30+ is mandatory. |
| Multiple Strong Acids | ⚠️ Caution | Layering glycolic + salicylic + lactic etc. can over-exfoliate and damage barrier. |
| Retinoids + Pregnancy | 🚫 Avoid | All retinoids (retinol, retinal, tretinoin) should be avoided during pregnancy. |

---

## Important Guidelines to Remember

### Concentration Matters
- An ingredient listed in the last third of the list likely has negligible functional effect
- "Contains [trendy ingredient]" often means trace amounts for marketing
- Position in ingredient list roughly indicates concentration (descending order until ~1%)
- Some ingredients are effective at very low concentrations (e.g., retinol); others need higher amounts

### Formulation Matters
- Individual ingredients don't tell the whole story
- A well-formulated "boring" product can outperform a poorly-formulated "exciting" one
- pH matters for acids (glycolic needs pH 3-4 to be effective)
- Stability matters for vitamin C (L-ascorbic acid oxidizes easily)
- Delivery systems matter for retinol (encapsulation can reduce irritation)

### No Fear-Mongering
- Avoid terms like "toxic," "poisonous," "dangerous" for approved cosmetic ingredients
- "Chemical-free" and "clean beauty" are marketing terms, not scientific categories
- Judge ingredients on evidence, not buzzwords or naturalistic fallacy
- Preservatives are necessary and safe—unpreserved products are actually dangerous

### Acknowledge Limitations
- You cannot physically test products or know exact concentrations unless published
- What works varies by individual—skin is complex and personal
- Be clear about what you can and cannot determine from an ingredient list alone
- Encourage patch testing for sensitive individuals

### Not Medical Advice
- For diagnosed skin conditions (severe acne, rosacea, eczema, psoriasis), recommend dermatologist consultation
- Don't diagnose conditions based on described symptoms
- Don't make claims about treating or curing diseases
- Use phrases like "may help with" rather than "treats" or "cures"

---

## Response Tone and Formatting

### Tone
- Friendly but professional
- Informative without being condescending
- Empowering—help users make their own informed decisions
- Balanced—acknowledge uncertainty without being unhelpful

### Formatting
- Use clear headers and sections for easy scanning
- Use tables for comparisons (especially claims assessment)
- Use bullet points for lists
- Use emoji sparingly but effectively (⭐💪🔧⚠️✅❌❓ℹ️)
- Keep language accessible—briefly explain technical terms
- Be thorough but not unnecessarily verbose
- Always include both EN and ZH ingredient names

---

## Example Response Structure

Here's how a complete analysis should be structured:

---

## Product Overview

[1-2 sentences describing the product category and overall impression]

---

## Ingredients Analysis

### ⭐ Star Ingredients

- **Niacinamide (烟酰胺)** — Listed 4th, likely 2-5% concentration. Excellent for oil control, pore appearance, and barrier support. Well-researched with strong evidence.

- **Sodium Hyaluronate (透明质酸钠)** — Listed 6th. Effective humectant that attracts moisture. Multiple molecular weights would be ideal but single weight still beneficial.

### 💪 Supporting Ingredients

- **Glycerin (甘油)** — Listed 2nd, likely high concentration. Gold-standard humectant, very effective and well-tolerated.

- **Squalane (角鲨烷)** — Lightweight emollient that mimics natural sebum. Good for all skin types including oily.

### 🔧 Functional Ingredients

- **Phenoxyethanol (苯氧乙醇)** — Standard preservative at safe concentrations. Necessary for product safety.

- **Carbomer (卡波姆)** — Thickening agent. Purely functional, no skin benefits or concerns.

### ⚠️ Potential Concerns

- **Fragrance (香精)** — Present near middle of list. Common sensitizer. Those with fragrance sensitivity should avoid or patch test.

---

## Claims Assessment

| Claim | Rating | Analysis |
|-------|--------|----------|
| "Deep hydration" | ✅ Supported | Multiple humectants (glycerin, HA) in good positions |
| "Anti-aging" | ⚠️ Partial | Niacinamide helps with some aging signs, but no retinoids or peptides |
| "Pore minimizing" | ⚠️ Partial | Niacinamide may reduce pore appearance, but can't physically shrink pores |
| "Dermatologist tested" | ❓ Unverifiable | Marketing claim—doesn't indicate approval or efficacy |

---

## Suitability

**Ideal for:** Normal to oily skin; those wanting lightweight hydration with brightening benefits

**May not suit:** Very dry skin (not occlusive enough); fragrance-sensitive individuals

**Cautions:** Contains fragrance—patch test if you have sensitive skin

---

## Value Assessment

A solid, well-formulated product with proven ingredients at what appear to be reasonable concentrations. The niacinamide and hyaluronic acid provide real benefits. Price-to-performance seems reasonable for a mid-range product, though similar formulations exist at lower price points.

---

## Personalized Notes

*[Only if user profile provided]*

Based on your oily skin type, this lightweight formula should work well without feeling heavy. The niacinamide directly addresses your concern about large pores. However, I notice you listed fragrance as a sensitivity—this product does contain fragrance, so please patch test first or consider a fragrance-free alternative.

---

## Final Reminders for Every Response

1. Always be helpful and informative
2. Prioritize user safety and accurate information
3. Encourage consistent routines over product hopping
4. Remember: the best skincare routine is one the user will actually follow
5. When uncertain, acknowledge uncertainty rather than guessing
6. Include both English and Chinese ingredient names throughout
7. Match response language to {{LANGUAGE}} setting
```

---

### 6.5 Fun Facts JSON Files

**Purpose:** Interactive, expandable cards with surprising or memorable ingredient facts. These are displayed on education pages to increase engagement.

**File Locations:** 
- `/content/en/fun-facts.json`
- `/content/zh/fun-facts.json`

#### English Fun Facts (`/content/en/fun-facts.json`):

```json
{
  "metadata": {
    "version": "1.0",
    "last_updated": "2025-02-01",
    "total_facts": 10
  },
  "facts": [
    {
      "id": "ha-water-weight",
      "title": "Hyaluronic Acid is a Hydration Superstar",
      "content": "A single gram of hyaluronic acid can hold up to 6 liters of water—that's about 12 standard water bottles! This incredible water-binding capacity is why it's such a popular ingredient in hydrating serums. However, here's a lesser-known tip: in very dry climates with low humidity, HA can actually pull moisture FROM your skin if there's nothing in the air to draw from. Always seal it with a moisturizer or occlusive!",
      "ingredient_link": "sodium-hyaluronate",
      "icon": "💧",
      "category": "humectant"
    },
    {
      "id": "retinol-accident",
      "title": "Retinol's Anti-Aging Powers Were Discovered by Accident",
      "content": "Retinoids were originally developed in the 1970s purely to treat acne. Dermatologists noticed that patients' skin wasn't just clearer—it was also becoming smoother, more even-toned, and more youthful-looking. This happy accident launched the entire topical anti-aging industry we know today. Sometimes the best discoveries happen when you're looking for something else entirely!",
      "ingredient_link": "retinol",
      "icon": "✨",
      "category": "active"
    },
    {
      "id": "fragrance-mystery",
      "title": "\"Fragrance\" is an Umbrella for 3,000+ Chemicals",
      "content": "When you see 'Fragrance' or 'Parfum' on an ingredient list, it's not just one thing—it's an umbrella term that can contain any combination of over 3,000 different scent chemicals. Companies aren't required to disclose the specific blend because it's considered a trade secret. This is why fragrance is one of the most common causes of skin sensitivity—you might be reacting to something you can't even identify. If you have sensitive skin, 'fragrance-free' products are your friends!",
      "ingredient_link": "fragrance",
      "icon": "🔍",
      "category": "fragrance"
    },
    {
      "id": "vitamin-c-diva",
      "title": "Vitamin C: The Most High-Maintenance Ingredient",
      "content": "Pure Vitamin C (L-Ascorbic Acid) is incredibly effective—but also incredibly demanding. It starts oxidizing the moment it's exposed to light, air, or heat, transforming from a clear or light yellow liquid to orange, then brown. An oxidized vitamin C serum isn't harmful, but it's much less effective. That's why quality vitamin C products come in dark, airless packaging and often have short shelf lives. If your serum has turned the color of iced tea, it's time for a fresh bottle!",
      "ingredient_link": "ascorbic-acid",
      "icon": "🍊",
      "category": "active"
    },
    {
      "id": "ceramides-native",
      "title": "Ceramides: You Already Have Them!",
      "content": "Ceramides aren't some exotic ingredient discovered in a lab—they make up about 50% of your skin's natural barrier! Think of your skin barrier like a brick wall: skin cells are the bricks, and ceramides are the mortar holding everything together. When products add ceramides, they're essentially replenishing what your skin already produces but may be losing due to aging, harsh cleansers, or environmental damage. It's like patching the mortar in an old wall.",
      "ingredient_link": "ceramides",
      "icon": "🧱",
      "category": "emollient"
    },
    {
      "id": "spf-math",
      "title": "SPF Math: It's Not What You Think",
      "content": "SPF 30 doesn't block twice as much UV as SPF 15! Here's the real math: SPF 15 blocks about 93% of UVB rays, SPF 30 blocks about 97%, and SPF 50 blocks about 98%. The returns diminish significantly after SPF 30. That's why dermatologists say SPF 30-50 is the practical sweet spot—going higher doesn't help much. What matters MORE is applying enough (about 1/4 teaspoon for your face) and reapplying every 2 hours!",
      "ingredient_link": "zinc-oxide",
      "icon": "☀️",
      "category": "sunscreen"
    },
    {
      "id": "silicone-myths",
      "title": "Silicones Don't Suffocate Your Skin",
      "content": "Despite persistent myths, silicones like dimethicone don't 'suffocate' your skin or clog pores. They're actually non-comedogenic and create a breathable, protective layer—the molecules are simply too large to penetrate into pores. The 'silicone-free' movement is largely based on misconceptions, not science. That said, if you simply don't like the texture or finish of silicones, that's a valid personal preference—just don't avoid them out of fear!",
      "ingredient_link": "dimethicone",
      "icon": "🫧",
      "category": "emollient"
    },
    {
      "id": "ingredient-order",
      "title": "Ingredient Lists Are Like Recipes",
      "content": "Cosmetic ingredient lists are legally required to be in descending order of concentration—meaning the first ingredients are present in the highest amounts, and the last ones are often trace amounts. Ingredients below 1% concentration can be listed in any order. So if that trendy active ingredient you're paying premium prices for is listed near the very end? There's probably not enough of it to actually do anything. It's there for marketing, not efficacy. Look for key actives in the first half of the list!",
      "ingredient_link": null,
      "icon": "📋",
      "category": "general"
    },
    {
      "id": "preservatives-necessary",
      "title": "Preservatives Keep You Safe",
      "content": "Despite the 'preservative-free' marketing trend, preservatives are actually essential in any water-based product. Without them, your moisturizer would be a petri dish of bacteria, mold, and fungi within days. Some 'natural' or 'preservative-free' products have been recalled due to dangerous microbial contamination. Modern preservatives like phenoxyethanol have excellent safety records when used at approved concentrations. A preserved product is a SAFE product!",
      "ingredient_link": "phenoxyethanol",
      "icon": "🛡️",
      "category": "preservative"
    },
    {
      "id": "niacinamide-allrounder",
      "title": "Niacinamide: The Swiss Army Knife of Skincare",
      "content": "Niacinamide (Vitamin B3) is one of the most versatile ingredients in skincare. It can help with oil control, enlarged pores, uneven skin tone, fine lines, dullness, and skin barrier function—all while being gentle enough for sensitive skin. Unlike many actives that are either 'exciting but irritating' or 'gentle but boring,' niacinamide delivers real results without drama. It's the rare ingredient that almost everyone can use and benefit from!",
      "ingredient_link": "niacinamide",
      "icon": "🌟",
      "category": "active"
    }
  ]
}
```

#### Chinese Fun Facts (`/content/zh/fun-facts.json`):

```json
{
  "metadata": {
    "version": "1.0",
    "last_updated": "2025-02-01",
    "total_facts": 10
  },
  "facts": [
    {
      "id": "ha-water-weight",
      "title": "玻尿酸的超强锁水能力",
      "content": "一克玻尿酸可以吸附高达6升水——相当于12瓶标准矿泉水！这种惊人的锁水能力使它成为保湿精华中的明星成分。但有一个不太为人知的小知识：在非常干燥的低湿度环境中，如果空气中没有足够的水分可以吸附，玻尿酸反而可能从你的皮肤深层\"抢走\"水分。所以用完玻尿酸产品后，一定要涂上保湿霜或封闭剂锁住水分！",
      "ingredient_link": "sodium-hyaluronate",
      "icon": "💧",
      "category": "humectant"
    },
    {
      "id": "retinol-accident",
      "title": "视黄醇的抗衰老功效是意外发现的",
      "content": "视黄醇类成分最初是在1970年代作为治疗痤疮的药物开发的。皮肤科医生发现，使用这种药物的患者皮肤不仅痘痘好了，还变得更光滑、肤色更均匀、看起来更年轻。这个意外发现催生了我们今天熟知的整个外用抗衰老产业。有时候最好的发现就是在寻找其他东西时意外得到的！",
      "ingredient_link": "retinol",
      "icon": "✨",
      "category": "active"
    },
    {
      "id": "fragrance-mystery",
      "title": "\"香精\"可能包含3000多种化学物质",
      "content": "当你在成分表上看到\"香精\"或\"Fragrance/Parfum\"时，它并不只是一种东西——它是一个总称，可能包含3000多种不同香味化学物质的任意组合。由于被视为商业机密，公司不需要披露具体配方。这就是为什么香精是导致皮肤敏感最常见的原因之一——你可能对某种无法识别的成分过敏。如果你是敏感肌，\"无香料\"产品是你的好朋友！",
      "ingredient_link": "fragrance",
      "icon": "🔍",
      "category": "fragrance"
    },
    {
      "id": "vitamin-c-diva",
      "title": "维C精华：护肤界的\"娇气公主\"",
      "content": "纯维生素C（L-抗坏血酸）效果很棒——但也非常\"娇气\"。一旦接触到光、空气或高温，它就会开始氧化，从透明或淡黄色变成橙色，再变成棕色。氧化的维C精华虽然无害，但效果会大打折扣。这就是为什么优质的维C产品都用深色、真空包装，而且保质期较短。如果你的精华液已经变成冰红茶的颜色，是时候换一瓶新的了！",
      "ingredient_link": "ascorbic-acid",
      "icon": "🍊",
      "category": "active"
    },
    {
      "id": "ceramides-native",
      "title": "神经酰胺：你皮肤里本来就有！",
      "content": "神经酰胺并不是什么实验室里发现的稀奇成分——它们本来就占你皮肤天然屏障的50%左右！把你的皮肤屏障想象成一堵砖墙：皮肤细胞是砖块，神经酰胺就是把一切粘在一起的砂浆。护肤品中添加神经酰胺，本质上是在补充你的皮肤本来就有、但可能因为年龄增长、过度清洁或环境损害而流失的成分。就像给老墙修补砂浆一样。",
      "ingredient_link": "ceramides",
      "icon": "🧱",
      "category": "emollient"
    },
    {
      "id": "spf-math",
      "title": "防晒指数的数学：不是简单翻倍",
      "content": "SPF 30并不是SPF 15防护力的两倍！真实的数据是这样的：SPF 15能阻挡约93%的UVB，SPF 30阻挡约97%，SPF 50阻挡约98%。超过SPF 30后，防护效果的提升变得很小。这就是为什么皮肤科医生说日常使用SPF 30-50就够了——更高的数值帮助不大。更重要的是涂够量（面部大约需要一元硬币大小）并且每两小时补涂一次！",
      "ingredient_link": "zinc-oxide",
      "icon": "☀️",
      "category": "sunscreen"
    },
    {
      "id": "silicone-myths",
      "title": "硅油不会让你的皮肤\"窒息\"",
      "content": "尽管有这样的传言，但硅油（如聚二甲基硅氧烷）其实不会让皮肤\"窒息\"或堵塞毛孔。它们实际上是非致粉刺性的，会形成一层透气的保护膜——硅油分子太大，根本无法渗透到毛孔中。\"无硅油\"运动主要是基于误解，而不是科学。当然，如果你单纯不喜欢硅油的质感或肤感，这完全可以理解——只是不要因为害怕而避开它！",
      "ingredient_link": "dimethicone",
      "icon": "🫧",
      "category": "emollient"
    },
    {
      "id": "ingredient-order",
      "title": "成分表就像一份食谱",
      "content": "化妆品成分表在法律上要求按浓度从高到低排列——这意味着排在前面的成分含量最高，排在最后的往往只是微量。浓度低于1%的成分可以任意顺序排列。所以如果你花高价购买的产品中，那个时髦的活性成分排在最后面？很可能它的含量少到根本起不了作用。它只是为了营销，而不是为了效果。关键活性成分要看成分表的前半部分！",
      "ingredient_link": null,
      "icon": "📋",
      "category": "general"
    },
    {
      "id": "preservatives-necessary",
      "title": "防腐剂其实在保护你",
      "content": "尽管\"无防腐剂\"是一个流行的营销趋势，但防腐剂对任何含水产品来说都是必需的。没有它们，你的保湿霜在几天内就会变成细菌、霉菌和真菌的培养皿。一些\"天然\"或\"无防腐剂\"的产品曾因危险的微生物污染而被召回。像苯氧乙醇这样的现代防腐剂在批准浓度下使用时有很好的安全记录。有防腐剂的产品才是安全的产品！",
      "ingredient_link": "phenoxyethanol",
      "icon": "🛡️",
      "category": "preservative"
    },
    {
      "id": "niacinamide-allrounder",
      "title": "烟酰胺：护肤界的\"瑞士军刀\"",
      "content": "烟酰胺（维生素B3）是护肤品中最多才多艺的成分之一。它可以帮助控油、缩小毛孔外观、均匀肤色、减少细纹、改善暗沉、增强皮肤屏障——同时对敏感肌也足够温和。不像很多活性成分要么\"效果好但刺激\"要么\"温和但平庸\"，烟酰胺能在不引起问题的情况下带来真正的效果。这是少数几乎每个人都能使用并从中受益的成分！",
      "ingredient_link": "niacinamide",
      "icon": "🌟",
      "category": "active"
    }
  ]
}
```

---

## 7. Bilingual (i18n) Implementation

### 7.1 Implementation Approach

Use URL-based routing with `/en/` and `/zh/` prefixes:

```
/en/              → English home
/en/chat          → English chat interface  
/en/education     → English education pages
/en/glossary      → English glossary

/zh/              → Chinese home
/zh/chat          → Chinese chat interface
/zh/education     → Chinese education pages  
/zh/glossary      → Chinese glossary
```

### 7.2 i18n Utility Function

**File Location:** `/src/i18n/utils.ts`

```typescript
import en from './en.json';
import zh from './zh.json';

const translations = { en, zh };

export type Language = 'en' | 'zh';

export function getTranslations(lang: Language) {
  return translations[lang] || translations.en;
}

export function getLanguageFromURL(url: URL): Language {
  const path = url.pathname;
  if (path.startsWith('/zh')) return 'zh';
  return 'en';
}

export function getAlternateLanguagePath(currentPath: string, currentLang: Language): string {
  const newLang = currentLang === 'en' ? 'zh' : 'en';
  const pathWithoutLang = currentPath.replace(/^\/(en|zh)/, '');
  return `/${newLang}${pathWithoutLang || '/'}`;
}

// Deep access helper for nested keys like "nav.home"
export function t(translations: any, key: string): string {
  const keys = key.split('.');
  let value = translations;
  for (const k of keys) {
    value = value?.[k];
  }
  return value || key;
}
```

### 7.3 Complete UI Strings Files

#### English UI Strings (`/src/i18n/en.json`):

```json
{
  "site": {
    "name": "CosmeticLens",
    "tagline": "See through the marketing",
    "description": "Analyze cosmetic ingredients and discover what's really in your skincare products"
  },
  "nav": {
    "home": "Home",
    "analyze": "Analyze Product",
    "education": "Learn",
    "glossary": "Ingredient Glossary",
    "profile": "My Profile",
    "history": "My History",
    "login": "Log In",
    "signup": "Sign Up",
    "logout": "Log Out"
  },
  "home": {
    "hero_title": "Know What's Really in Your Skincare",
    "hero_subtitle": "Analyze ingredient lists, compare marketing claims to reality, and find affordable alternatives",
    "cta_analyze": "Analyze a Product",
    "cta_learn": "Learn About Ingredients",
    "features_title": "What You Can Do",
    "feature_1_title": "Ingredient Analysis",
    "feature_1_desc": "Paste any product's ingredient list and get a detailed breakdown of what each ingredient does",
    "feature_2_title": "Claim Verification",
    "feature_2_desc": "See which marketing claims are supported by actual ingredients—and which are just hype",
    "feature_3_title": "Find Dupes",
    "feature_3_desc": "Discover affordable alternatives with similar formulations to expensive products",
    "feature_4_title": "Personalized Insights",
    "feature_4_desc": "Get recommendations based on your skin type, concerns, and sensitivities",
    "how_it_works": "How It Works",
    "step_1": "Enter a product name or paste the ingredient list",
    "step_2": "Our AI analyzes each ingredient for efficacy and safety",
    "step_3": "Get a clear breakdown with personalized recommendations"
  },
  "chat": {
    "title": "Analyze a Product",
    "placeholder": "Enter a product name (e.g., 'CeraVe Hydrating Cleanser') or paste an ingredient list...",
    "placeholder_short": "Enter product name or ingredients...",
    "analyze_button": "Analyze",
    "analyzing": "Analyzing ingredients...",
    "error_generic": "Something went wrong. Please try again.",
    "error_not_found": "Couldn't find this product. Try pasting the ingredient list directly.",
    "error_rate_limit": "You've reached today's analysis limit. Come back tomorrow or create an account for more!",
    "error_empty": "Please enter a product name or ingredient list.",
    "login_prompt": "Log in to save your analysis history and get personalized recommendations.",
    "examples_title": "Try these examples:",
    "example_1": "CeraVe Hydrating Cleanser",
    "example_2": "The Ordinary Niacinamide 10% + Zinc 1%",
    "example_3": "La Roche-Posay Anthelios",
    "tips_title": "Tips for best results:",
    "tip_1": "Enter the full product name for automatic ingredient lookup",
    "tip_2": "Or paste the complete ingredient list from the packaging",
    "tip_3": "Ask follow-up questions like 'Is this good for oily skin?' or 'Find me a dupe'",
    "new_chat": "New Analysis",
    "clear": "Clear",
    "copy": "Copy",
    "copied": "Copied!"
  },
  "analysis": {
    "overview": "Product Overview",
    "ingredients_breakdown": "Ingredients Analysis",
    "star_ingredients": "Star Ingredients",
    "supporting_ingredients": "Supporting Ingredients",
    "functional_ingredients": "Functional Ingredients",
    "potential_concerns": "Potential Concerns",
    "claims_assessment": "Claims vs Reality",
    "claim": "Claim",
    "rating": "Rating",
    "analysis": "Analysis",
    "rating_supported": "Supported",
    "rating_partial": "Partially Supported",
    "rating_unsupported": "Unsupported",
    "rating_unverifiable": "Unverifiable",
    "suitability": "Who This Suits",
    "ideal_for": "Ideal for",
    "may_not_suit": "May not suit",
    "cautions": "Cautions",
    "value_assessment": "Value Assessment",
    "personalized_notes": "Personalized Notes",
    "interaction_warnings": "Ingredient Interaction Warnings",
    "dupe_suggestions": "Similar Products"
  },
  "education": {
    "title": "Learn About Ingredients",
    "subtitle": "Become an informed skincare consumer",
    "read_more": "Read article",
    "minutes_read": "min read",
    "fun_facts_title": "Did You Know?",
    "fun_facts_subtitle": "Click to expand and learn something surprising!",
    "back_to_articles": "← Back to all articles",
    "related_ingredients": "Related Ingredients",
    "coming_soon": "More articles coming soon!",
    "coming_soon_desc": "We're working on more educational content. Check back later!",
    "categories": {
      "all": "All",
      "basics": "Basics",
      "ingredient_types": "Ingredient Types",
      "skin_concerns": "Skin Concerns",
      "myths": "Myths & Facts"
    }
  },
  "glossary": {
    "title": "Ingredient Glossary",
    "subtitle": "Quick reference for common cosmetic ingredients",
    "search_placeholder": "Search by English or Chinese name...",
    "filter_category": "Filter by category",
    "all_categories": "All categories",
    "no_results": "No ingredients found matching your search.",
    "columns": {
      "inci": "INCI Name",
      "chinese": "中文名称",
      "category": "Category",
      "function": "Function",
      "notes": "Notes"
    },
    "showing": "Showing",
    "of": "of",
    "ingredients": "ingredients"
  },
  "profile": {
    "title": "My Skin Profile",
    "subtitle": "Help us give you personalized recommendations",
    "skin_type": "Skin Type",
    "skin_type_placeholder": "Select your skin type",
    "sensitivity": "Sensitivity Level",
    "sensitivity_placeholder": "How sensitive is your skin?",
    "allergies": "Known Allergies or Sensitivities",
    "allergies_placeholder": "Select any ingredients you react to",
    "allergies_other": "Other (please specify)",
    "concerns": "Skin Concerns",
    "concerns_placeholder": "What are you trying to address?",
    "pregnant": "Pregnant or Nursing",
    "pregnant_desc": "We'll flag ingredients to avoid during pregnancy",
    "price_range": "Preferred Price Range",
    "price_range_placeholder": "Select your preference",
    "language": "Preferred Language",
    "save": "Save Profile",
    "saving": "Saving...",
    "saved": "Profile saved!",
    "save_error": "Failed to save. Please try again.",
    "login_required": "Please log in to save your profile",
    "delete_account": "Delete Account",
    "delete_confirm": "Are you sure? This cannot be undone."
  },
  "history": {
    "title": "Analysis History",
    "subtitle": "Your past product analyses",
    "empty": "No analyses yet",
    "empty_desc": "Analyze a product to see it here!",
    "analyze_now": "Analyze Now",
    "delete": "Delete",
    "view": "View",
    "analyzed_on": "Analyzed on"
  },
  "auth": {
    "login_title": "Welcome Back",
    "login_subtitle": "Log in to access your saved analyses and profile",
    "signup_title": "Create Account",
    "signup_subtitle": "Join to save analyses and get personalized recommendations",
    "email": "Email",
    "email_placeholder": "you@example.com",
    "password": "Password",
    "password_placeholder": "••••••••",
    "password_confirm": "Confirm Password",
    "login_button": "Log In",
    "signup_button": "Create Account",
    "logging_in": "Logging in...",
    "creating_account": "Creating account...",
    "or": "or",
    "continue_google": "Continue with Google",
    "no_account": "Don't have an account?",
    "has_account": "Already have an account?",
    "forgot_password": "Forgot password?",
    "reset_password": "Reset Password",
    "reset_sent": "Check your email for reset instructions",
    "error_invalid": "Invalid email or password",
    "error_exists": "An account with this email already exists",
    "error_weak_password": "Password must be at least 8 characters",
    "error_mismatch": "Passwords don't match",
    "error_generic": "Something went wrong. Please try again."
  },
  "common": {
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "back": "Back",
    "next": "Next",
    "submit": "Submit",
    "close": "Close",
    "yes": "Yes",
    "no": "No",
    "language": "Language",
    "english": "English",
    "chinese": "中文",
    "learn_more": "Learn more"
  },
  "skin_types": {
    "oily": "Oily",
    "dry": "Dry",
    "combination": "Combination",
    "normal": "Normal"
  },
  "sensitivity_levels": {
    "low": "Low – Rarely react to products",
    "medium": "Medium – Occasionally sensitive",
    "high": "High – Frequently react to products"
  },
  "concerns": {
    "acne": "Acne & Breakouts",
    "aging": "Aging & Fine Lines",
    "hyperpigmentation": "Dark Spots & Hyperpigmentation",
    "dehydration": "Dehydration",
    "dryness": "Dryness",
    "oiliness": "Excess Oil",
    "redness": "Redness & Irritation",
    "large_pores": "Large Pores",
    "dullness": "Dullness",
    "texture": "Uneven Texture",
    "sensitivity": "Sensitivity"
  },
  "price_ranges": {
    "budget": "Budget-friendly",
    "mid": "Mid-range",
    "luxury": "Luxury",
    "no_preference": "No preference"
  },
  "allergens": {
    "fragrance": "Fragrance / Parfum",
    "essential_oils": "Essential Oils",
    "alcohol": "Drying Alcohols",
    "sulfates": "Sulfates (SLS/SLES)",
    "parabens": "Parabens",
    "silicones": "Silicones",
    "other": "Other"
  },
  "footer": {
    "about": "About",
    "about_text": "CosmeticLens helps you understand what's really in your skincare products. We believe in evidence-based information and transparent ingredient analysis.",
    "disclaimer": "Disclaimer",
    "disclaimer_text": "This tool provides educational information only, not medical or dermatological advice. Always patch test new products and consult a dermatologist for skin conditions.",
    "links": "Links",
    "contact": "Contact",
    "feedback": "Send Feedback",
    "privacy": "Privacy Policy",
    "terms": "Terms of Service",
    "copyright": "© 2025 CosmeticLens. All rights reserved."
  },
  "errors": {
    "page_not_found": "Page Not Found",
    "page_not_found_desc": "The page you're looking for doesn't exist.",
    "go_home": "Go to Homepage",
    "something_wrong": "Something Went Wrong",
    "try_again": "Try Again"
  }
}
```

#### Chinese UI Strings (`/src/i18n/zh.json`):

```json
{
  "site": {
    "name": "成分透视",
    "tagline": "看穿护肤品营销",
    "description": "分析化妆品成分，发现护肤品里到底有什么"
  },
  "nav": {
    "home": "首页",
    "analyze": "分析产品",
    "education": "成分科普",
    "glossary": "成分词典",
    "profile": "我的档案",
    "history": "分析历史",
    "login": "登录",
    "signup": "注册",
    "logout": "退出"
  },
  "home": {
    "hero_title": "真正了解你的护肤品",
    "hero_subtitle": "分析成分表，对比营销宣传与真实效果，发现平价替代品",
    "cta_analyze": "分析产品",
    "cta_learn": "了解成分知识",
    "features_title": "你可以做什么",
    "feature_1_title": "成分分析",
    "feature_1_desc": "粘贴任何产品的成分表，获取每种成分的详细功效解读",
    "feature_2_title": "验证宣传",
    "feature_2_desc": "看看哪些营销宣传有成分支持，哪些只是噱头",
    "feature_3_title": "发现平替",
    "feature_3_desc": "找到与高价产品配方相似的平价替代品",
    "feature_4_title": "个性化建议",
    "feature_4_desc": "根据你的肤质、肌肤问题和敏感性获取定制建议",
    "how_it_works": "如何使用",
    "step_1": "输入产品名称或粘贴成分表",
    "step_2": "AI分析每种成分的功效和安全性",
    "step_3": "获取清晰的成分解读和个性化建议"
  },
  "chat": {
    "title": "分析产品",
    "placeholder": "输入产品名称（如\"CeraVe保湿洁面\"）或粘贴成分表...",
    "placeholder_short": "输入产品名称或成分...",
    "analyze_button": "开始分析",
    "analyzing": "正在分析成分...",
    "error_generic": "出错了，请重试。",
    "error_not_found": "找不到这个产品，请尝试直接粘贴成分表。",
    "error_rate_limit": "今日分析次数已用完，明天再来或注册账号获取更多次数！",
    "error_empty": "请输入产品名称或成分表。",
    "login_prompt": "登录以保存分析历史并获取个性化建议。",
    "examples_title": "试试这些例子：",
    "example_1": "CeraVe保湿洁面乳",
    "example_2": "The Ordinary 10%烟酰胺+锌精华",
    "example_3": "理肤泉防晒",
    "tips_title": "获得最佳结果的技巧：",
    "tip_1": "输入完整的产品名称以自动查找成分",
    "tip_2": "或直接粘贴包装上的完整成分表",
    "tip_3": "可以追问，如\"这个适合油皮吗？\"或\"帮我找个平替\"",
    "new_chat": "新分析",
    "clear": "清空",
    "copy": "复制",
    "copied": "已复制！"
  },
  "analysis": {
    "overview": "产品概述",
    "ingredients_breakdown": "成分分析",
    "star_ingredients": "明星成分",
    "supporting_ingredients": "辅助成分",
    "functional_ingredients": "功能性成分",
    "potential_concerns": "潜在问题",
    "claims_assessment": "宣传 vs 现实",
    "claim": "宣传",
    "rating": "评级",
    "analysis": "分析",
    "rating_supported": "有支持",
    "rating_partial": "部分支持",
    "rating_unsupported": "无支持",
    "rating_unverifiable": "无法验证",
    "suitability": "适合人群",
    "ideal_for": "适合",
    "may_not_suit": "可能不适合",
    "cautions": "注意事项",
    "value_assessment": "性价比评估",
    "personalized_notes": "个性化建议",
    "interaction_warnings": "成分相互作用警告",
    "dupe_suggestions": "相似产品"
  },
  "education": {
    "title": "成分科普",
    "subtitle": "做一个明智的护肤品消费者",
    "read_more": "阅读文章",
    "minutes_read": "分钟阅读",
    "fun_facts_title": "你知道吗？",
    "fun_facts_subtitle": "点击展开，学习有趣的护肤知识！",
    "back_to_articles": "← 返回全部文章",
    "related_ingredients": "相关成分",
    "coming_soon": "更多文章即将上线！",
    "coming_soon_desc": "我们正在准备更多科普内容，敬请期待！",
    "categories": {
      "all": "全部",
      "basics": "基础知识",
      "ingredient_types": "成分类型",
      "skin_concerns": "肌肤问题",
      "myths": "辟谣与真相"
    }
  },
  "glossary": {
    "title": "成分词典",
    "subtitle": "常见化妆品成分速查",
    "search_placeholder": "输入中文或英文名称搜索...",
    "filter_category": "按类别筛选",
    "all_categories": "全部类别",
    "no_results": "未找到匹配的成分。",
    "columns": {
      "inci": "INCI名称",
      "chinese": "中文名称",
      "category": "类别",
      "function": "功能",
      "notes": "备注"
    },
    "showing": "显示",
    "of": "/",
    "ingredients": "个成分"
  },
  "profile": {
    "title": "我的肤质档案",
    "subtitle": "帮助我们为你提供个性化建议",
    "skin_type": "肤质",
    "skin_type_placeholder": "选择你的肤质",
    "sensitivity": "敏感程度",
    "sensitivity_placeholder": "你的皮肤有多敏感？",
    "allergies": "已知过敏或敏感成分",
    "allergies_placeholder": "选择你会有反应的成分",
    "allergies_other": "其他（请说明）",
    "concerns": "肌肤问题",
    "concerns_placeholder": "你想改善什么？",
    "pregnant": "孕期或哺乳期",
    "pregnant_desc": "我们会标注孕期应避免的成分",
    "price_range": "价格偏好",
    "price_range_placeholder": "选择你的偏好",
    "language": "界面语言",
    "save": "保存",
    "saving": "保存中...",
    "saved": "已保存！",
    "save_error": "保存失败，请重试。",
    "login_required": "请登录以保存档案",
    "delete_account": "删除账号",
    "delete_confirm": "确定吗？此操作无法撤销。"
  },
  "history": {
    "title": "分析历史",
    "subtitle": "你过去的产品分析记录",
    "empty": "暂无分析记录",
    "empty_desc": "分析一个产品，记录会显示在这里！",
    "analyze_now": "去分析",
    "delete": "删除",
    "view": "查看",
    "analyzed_on": "分析于"
  },
  "auth": {
    "login_title": "欢迎回来",
    "login_subtitle": "登录以访问你保存的分析和档案",
    "signup_title": "创建账号",
    "signup_subtitle": "注册以保存分析记录并获取个性化建议",
    "email": "邮箱",
    "email_placeholder": "you@example.com",
    "password": "密码",
    "password_placeholder": "••••••••",
    "password_confirm": "确认密码",
    "login_button": "登录",
    "signup_button": "创建账号",
    "logging_in": "登录中...",
    "creating_account": "创建中...",
    "or": "或",
    "continue_google": "使用Google登录",
    "no_account": "还没有账号？",
    "has_account": "已有账号？",
    "forgot_password": "忘记密码？",
    "reset_password": "重置密码",
    "reset_sent": "请查收邮件中的重置链接",
    "error_invalid": "邮箱或密码错误",
    "error_exists": "该邮箱已被注册",
    "error_weak_password": "密码至少需要8个字符",
    "error_mismatch": "两次密码不一致",
    "error_generic": "出错了，请重试。"
  },
  "common": {
    "loading": "加载中...",
    "error": "错误",
    "success": "成功",
    "save": "保存",
    "cancel": "取消",
    "delete": "删除",
    "edit": "编辑",
    "back": "返回",
    "next": "下一步",
    "submit": "提交",
    "close": "关闭",
    "yes": "是",
    "no": "否",
    "language": "语言",
    "english": "English",
    "chinese": "中文",
    "learn_more": "了解更多"
  },
  "skin_types": {
    "oily": "油性",
    "dry": "干性",
    "combination": "混合性",
    "normal": "中性"
  },
  "sensitivity_levels": {
    "low": "低 - 很少对产品有反应",
    "medium": "中 - 偶尔敏感",
    "high": "高 - 经常对产品有反应"
  },
  "concerns": {
    "acne": "痘痘/粉刺",
    "aging": "抗老/细纹",
    "hyperpigmentation": "色斑/色素沉着",
    "dehydration": "缺水",
    "dryness": "干燥",
    "oiliness": "出油",
    "redness": "泛红/敏感",
    "large_pores": "毛孔粗大",
    "dullness": "暗沉",
    "texture": "肤质不均",
    "sensitivity": "敏感"
  },
  "price_ranges": {
    "budget": "平价",
    "mid": "中档",
    "luxury": "高端",
    "no_preference": "无偏好"
  },
  "allergens": {
    "fragrance": "香精/香料",
    "essential_oils": "精油",
    "alcohol": "干性酒精",
    "sulfates": "硫酸盐类 (SLS/SLES)",
    "parabens": "对羟基苯甲酸酯类",
    "silicones": "硅油",
    "other": "其他"
  },
  "footer": {
    "about": "关于我们",
    "about_text": "成分透视帮助你了解护肤品中的真正成分。我们相信以证据为基础的信息和透明的成分分析。",
    "disclaimer": "免责声明",
    "disclaimer_text": "本工具仅提供教育信息，不构成医疗或皮肤科建议。使用新产品前请做皮肤测试，如有皮肤问题请咨询皮肤科医生。",
    "links": "链接",
    "contact": "联系我们",
    "feedback": "反馈意见",
    "privacy": "隐私政策",
    "terms": "服务条款",
    "copyright": "© 2025 成分透视 版权所有"
  },
  "errors": {
    "page_not_found": "页面未找到",
    "page_not_found_desc": "你访问的页面不存在。",
    "go_home": "返回首页",
    "something_wrong": "出错了",
    "try_again": "重试"
  }
}
```

---

## 8. Database Schema

### 8.1 Supabase Setup

Create a Supabase project at https://supabase.com and run the following SQL in the SQL Editor.

### 8.2 Complete SQL Schema

```sql
-- ============================================
-- COSMETICLENS DATABASE SCHEMA
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- Stores user skin profile for personalized analysis
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Skin characteristics
  skin_type TEXT CHECK (skin_type IN ('oily', 'dry', 'combination', 'normal')),
  sensitivity TEXT CHECK (sensitivity IN ('low', 'medium', 'high')),
  allergies TEXT[] DEFAULT '{}', -- Array of allergen IDs
  allergies_other TEXT, -- Free text for other allergies
  concerns TEXT[] DEFAULT '{}', -- Array of concern IDs
  is_pregnant BOOLEAN DEFAULT false,
  
  -- Preferences
  price_preference TEXT CHECK (price_preference IN ('budget', 'mid', 'luxury', 'none')) DEFAULT 'none',
  preferred_language TEXT CHECK (preferred_language IN ('en', 'zh')) DEFAULT 'en',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ANALYSIS HISTORY TABLE
-- Stores individual user's past analyses
-- ============================================
CREATE TABLE analysis_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Product info
  product_name TEXT NOT NULL,
  product_brand TEXT,
  ingredients_raw TEXT, -- Original ingredient list
  
  -- Analysis result
  analysis_result JSONB NOT NULL, -- Full LLM response
  language TEXT CHECK (language IN ('en', 'zh')) DEFAULT 'en',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ANALYSIS CACHE TABLE
-- Caches analysis results to avoid redundant LLM calls
-- ============================================
CREATE TABLE analysis_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Lookup keys
  product_name_normalized TEXT NOT NULL, -- Lowercase, trimmed
  ingredients_hash TEXT, -- MD5 hash of ingredient list (optional secondary key)
  
  -- Cached results (separate for each language)
  analysis_result_en JSONB,
  analysis_result_zh JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(product_name_normalized)
);

-- ============================================
-- RATE LIMITS TABLE
-- Tracks daily usage per user for rate limiting
-- ============================================
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Can be user_id for authenticated, or IP hash for anonymous
  identifier TEXT NOT NULL,
  identifier_type TEXT CHECK (identifier_type IN ('user', 'ip')) DEFAULT 'user',
  
  -- Limit tracking
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  request_count INTEGER DEFAULT 0,
  
  -- Constraints
  UNIQUE(identifier, date)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_analysis_history_user_id ON analysis_history(user_id);
CREATE INDEX idx_analysis_history_created_at ON analysis_history(created_at DESC);
CREATE INDEX idx_analysis_cache_product_name ON analysis_cache(product_name_normalized);
CREATE INDEX idx_analysis_cache_updated_at ON analysis_cache(updated_at);
CREATE INDEX idx_rate_limits_identifier_date ON rate_limits(identifier, date);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only access their own profile
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile" 
  ON profiles FOR DELETE 
  USING (auth.uid() = user_id);

-- Analysis history: users can only access their own history
CREATE POLICY "Users can view own history" 
  ON analysis_history FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history" 
  ON analysis_history FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own history" 
  ON analysis_history FOR DELETE 
  USING (auth.uid() = user_id);

-- Analysis cache: readable by all authenticated users
-- (Write operations happen via service role in API)
CREATE POLICY "Authenticated users can read cache" 
  ON analysis_cache FOR SELECT 
  TO authenticated 
  USING (true);

-- Rate limits: users can view their own limits
CREATE POLICY "Users can view own rate limits" 
  ON rate_limits FOR SELECT 
  USING (auth.uid()::text = identifier OR identifier_type = 'ip');

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to increment rate limit counter
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_identifier TEXT,
  p_identifier_type TEXT DEFAULT 'user'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO rate_limits (identifier, identifier_type, date, request_count)
  VALUES (p_identifier, p_identifier_type, CURRENT_DATE, 1)
  ON CONFLICT (identifier, date)
  DO UPDATE SET request_count = rate_limits.request_count + 1
  RETURNING request_count INTO v_count;
  
  RETURN v_count;
END;
$$;

-- Function to check if user is within rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT request_count INTO v_count
  FROM rate_limits
  WHERE identifier = p_identifier AND date = CURRENT_DATE;
  
  IF v_count IS NULL THEN
    RETURN TRUE;
  END IF;
  
  RETURN v_count < p_limit;
END;
$$;

-- Function to update profile timestamp
CREATE OR REPLACE FUNCTION update_profile_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for profile updates
CREATE TRIGGER trigger_update_profile_timestamp
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_timestamp();

-- Function to clean old cache entries (run periodically)
CREATE OR REPLACE FUNCTION clean_old_cache(days_old INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM analysis_cache
  WHERE updated_at < NOW() - (days_old || ' days')::INTERVAL;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- ============================================
-- INITIAL DATA (Optional)
-- ============================================

-- You can add any initial data here if needed
```

---

## 9. API Design

### 9.1 API Routes Overview

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/analyze` | POST | Optional | Analyze product ingredients |
| `/api/search-product` | GET | No | Search Open Beauty Facts |
| `/api/profile` | GET | Yes | Get user profile |
| `/api/profile` | PUT | Yes | Update user profile |
| `/api/history` | GET | Yes | Get analysis history |
| `/api/history/[id]` | DELETE | Yes | Delete history item |

### 9.2 API Route Implementations

#### `/api/analyze` - Main Analysis Endpoint

**File Location:** `/src/pages/api/analyze.ts`

```typescript
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service role for server-side operations
const supabase = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

// Rate limits
const RATE_LIMIT_ANONYMOUS = 5;  // per day
const RATE_LIMIT_AUTHENTICATED = 20;  // per day
const CACHE_TTL_DAYS = 30;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const body = await request.json();
    const { 
      productName, 
      ingredients, 
      language = 'en',
      userId = null 
    } = body;

    // Validate input
    if (!productName && !ingredients) {
      return new Response(JSON.stringify({
        success: false,
        error: 'missing_input',
        message: 'Please provide a product name or ingredient list'
      }), { status: 400 });
    }

    // Normalize product name for cache lookup
    const normalizedName = productName?.toLowerCase().trim();

    // ================================
    // STEP 1: Check Cache
    // ================================
    if (normalizedName) {
      const { data: cached } = await supabase
        .from('analysis_cache')
        .select('*')
        .eq('product_name_normalized', normalizedName)
        .gt('updated_at', new Date(Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString())
        .single();

      if (cached) {
        const cachedResult = language === 'zh' 
          ? cached.analysis_result_zh 
          : cached.analysis_result_en;
        
        if (cachedResult) {
          // Still increment rate limit for cached requests (to prevent abuse)
          await incrementRateLimit(userId, clientAddress);
          
          return new Response(JSON.stringify({
            success: true,
            data: cachedResult,
            cached: true
          }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }

    // ================================
    // STEP 2: Check Rate Limit
    // ================================
    const identifier = userId || hashIP(clientAddress);
    const limit = userId ? RATE_LIMIT_AUTHENTICATED : RATE_LIMIT_ANONYMOUS;
    
    const isWithinLimit = await checkRateLimit(identifier, limit);
    if (!isWithinLimit) {
      return new Response(JSON.stringify({
        success: false,
        error: 'rate_limit_exceeded',
        message: userId 
          ? 'Daily analysis limit reached. Try again tomorrow!'
          : 'Daily limit reached. Create an account for more analyses!'
      }), { status: 429 });
    }

    // ================================
    // STEP 3: Get Ingredients
    // ================================
    let ingredientList = ingredients;
    let productData = null;

    if (!ingredientList && productName) {
      // Search Open Beauty Facts
      productData = await searchOpenBeautyFacts(productName);
      
      if (productData?.ingredients_text) {
        ingredientList = productData.ingredients_text;
      } else {
        return new Response(JSON.stringify({
          success: false,
          error: 'product_not_found',
          message: 'Could not find this product. Please paste the ingredient list directly.'
        }), { status: 404 });
      }
    }

    // ================================
    // STEP 4: Load Ingredient Data
    // ================================
    const ingredientData = await loadIngredientProfiles(ingredientList);

    // ================================
    // STEP 5: Load User Profile
    // ================================
    let userProfile = null;
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      userProfile = profile;
    }

    // ================================
    // STEP 6: Build Prompt
    // ================================
    const systemPrompt = await buildSystemPrompt(language, userProfile);

    // ================================
    // STEP 7: Call LLM
    // ================================
    const analysis = await callGemini(systemPrompt, {
      productName: productName || 'Unknown Product',
      productBrand: productData?.brands,
      ingredients: ingredientList,
      ingredientData,
      claims: productData?.product_name // Could include claims if available
    });

    if (!analysis) {
      return new Response(JSON.stringify({
        success: false,
        error: 'analysis_failed',
        message: 'Failed to analyze product. Please try again.'
      }), { status: 500 });
    }

    // ================================
    // STEP 8: Cache Result
    // ================================
    if (normalizedName) {
      const cacheField = language === 'zh' ? 'analysis_result_zh' : 'analysis_result_en';
      
      await supabase
        .from('analysis_cache')
        .upsert({
          product_name_normalized: normalizedName,
          [cacheField]: analysis,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'product_name_normalized' 
        });
    }

    // ================================
    // STEP 9: Save to History
    // ================================
    if (userId) {
      await supabase.from('analysis_history').insert({
        user_id: userId,
        product_name: productName || 'Pasted Ingredients',
        product_brand: productData?.brands,
        ingredients_raw: ingredientList,
        analysis_result: analysis,
        language
      });
    }

    // ================================
    // STEP 10: Increment Rate Limit
    // ================================
    await incrementRateLimit(userId, clientAddress);

    // ================================
    // STEP 11: Return Response
    // ================================
    return new Response(JSON.stringify({
      success: true,
      data: analysis,
      cached: false,
      product: productData ? {
        name: productData.product_name,
        brand: productData.brands,
        image: productData.image_url
      } : null
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'internal_error',
      message: 'An unexpected error occurred. Please try again.'
    }), { status: 500 });
  }
};

// ================================
// HELPER FUNCTIONS
// ================================

async function searchOpenBeautyFacts(query: string) {
  try {
    const response = await fetch(
      `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=5`,
      { headers: { 'User-Agent': 'CosmeticLens/1.0' } }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.products?.[0] || null;
  } catch (error) {
    console.error('Open Beauty Facts error:', error);
    return null;
  }
}

async function loadIngredientProfiles(ingredientList: string) {
  // Import the ingredient database
  const database = await import('../../data/ingredients-database.json');
  
  // Parse ingredient list
  const ingredients = ingredientList
    .split(/[,\n]/)
    .map(i => i.trim().toLowerCase())
    .filter(i => i.length > 0);
  
  // Find matches
  const matches = [];
  for (const ingredient of ingredients.slice(0, 30)) { // Limit to first 30
    const match = database.ingredients.find(db => 
      db.inci_name.toLowerCase() === ingredient ||
      db.chinese_name === ingredient ||
      db.aliases_en?.some(a => a.toLowerCase() === ingredient) ||
      db.aliases_zh?.some(a => a === ingredient)
    );
    
    if (match) {
      matches.push(match);
    }
  }
  
  return matches;
}

async function buildSystemPrompt(language: string, userProfile: any) {
  // Load system prompt template
  const template = await import('../../data/system-prompt.md?raw');
  let prompt = template.default;
  
  // Replace language
  prompt = prompt.replace(/\{\{LANGUAGE\}\}/g, language);
  
  // Replace user profile
  if (userProfile) {
    const profileText = formatUserProfile(userProfile, language);
    prompt = prompt.replace('{{USER_PROFILE}}', profileText);
  } else {
    const noProfile = language === 'zh' 
      ? '用户未提供个人资料。请提供通用分析。'
      : 'No user profile provided. Provide general analysis suitable for most users.';
    prompt = prompt.replace('{{USER_PROFILE}}', noProfile);
  }
  
  return prompt;
}

function formatUserProfile(profile: any, language: string) {
  const isZh = language === 'zh';
  const lines = [];
  
  if (profile.skin_type) {
    lines.push(`${isZh ? '肤质' : 'Skin Type'}: ${profile.skin_type}`);
  }
  if (profile.sensitivity) {
    lines.push(`${isZh ? '敏感程度' : 'Sensitivity'}: ${profile.sensitivity}`);
  }
  if (profile.allergies?.length) {
    lines.push(`${isZh ? '过敏成分' : 'Allergies'}: ${profile.allergies.join(', ')}`);
  }
  if (profile.concerns?.length) {
    lines.push(`${isZh ? '肌肤问题' : 'Concerns'}: ${profile.concerns.join(', ')}`);
  }
  if (profile.is_pregnant) {
    lines.push(`${isZh ? '孕期/哺乳期' : 'Pregnant/Nursing'}: Yes`);
  }
  
  return lines.join('\n');
}

async function callGemini(systemPrompt: string, context: any) {
  const apiKey = import.meta.env.GEMINI_API_KEY;
  
  const userMessage = `
Analyze this cosmetic product:

Product Name: ${context.productName}
${context.productBrand ? `Brand: ${context.productBrand}` : ''}

Ingredient List:
${context.ingredients}

${context.ingredientData.length > 0 ? `
Relevant ingredient data from our database:
${JSON.stringify(context.ingredientData, null, 2)}
` : ''}

Please provide a comprehensive analysis following the framework in your instructions.
`.trim();

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: systemPrompt + '\n\n---\n\n' + userMessage }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
            topP: 0.95
          }
        })
      }
    );

    if (!response.ok) {
      console.error('Gemini API error:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error('Gemini API error:', error);
    return null;
  }
}

async function checkRateLimit(identifier: string, limit: number): Promise<boolean> {
  const { data } = await supabase
    .from('rate_limits')
    .select('request_count')
    .eq('identifier', identifier)
    .eq('date', new Date().toISOString().split('T')[0])
    .single();
  
  if (!data) return true;
  return data.request_count < limit;
}

async function incrementRateLimit(userId: string | null, clientAddress: string) {
  const identifier = userId || hashIP(clientAddress);
  const identifierType = userId ? 'user' : 'ip';
  
  await supabase.rpc('increment_rate_limit', {
    p_identifier: identifier,
    p_identifier_type: identifierType
  });
}

function hashIP(ip: string): string {
  // Simple hash for IP anonymization
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `ip_${Math.abs(hash).toString(16)}`;
}
```

#### `/api/profile` - User Profile Endpoint

**File Location:** `/src/pages/api/profile.ts`

```typescript
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET - Fetch user profile
export const GET: APIRoute = async ({ request }) => {
  try {
    // Get user from auth header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        success: false,
        error: 'unauthorized'
      }), { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'unauthorized'
      }), { status: 401 });
    }

    // Fetch profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    return new Response(JSON.stringify({
      success: true,
      data: profile || null
    }), { status: 200 });

  } catch (error) {
    console.error('Profile GET error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'internal_error'
    }), { status: 500 });
  }
};

// PUT - Update user profile
export const PUT: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        success: false,
        error: 'unauthorized'
      }), { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'unauthorized'
      }), { status: 401 });
    }

    const body = await request.json();
    const {
      skin_type,
      sensitivity,
      allergies,
      allergies_other,
      concerns,
      is_pregnant,
      price_preference,
      preferred_language
    } = body;

    // Upsert profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        skin_type,
        sensitivity,
        allergies: allergies || [],
        allergies_other,
        concerns: concerns || [],
        is_pregnant: is_pregnant || false,
        price_preference: price_preference || 'none',
        preferred_language: preferred_language || 'en',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      data: profile
    }), { status: 200 });

  } catch (error) {
    console.error('Profile PUT error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'internal_error'
    }), { status: 500 });
  }
};
```

#### `/api/history` - Analysis History Endpoint

**File Location:** `/src/pages/api/history.ts`

```typescript
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET - Fetch user's analysis history
export const GET: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        success: false,
        error: 'unauthorized'
      }), { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'unauthorized'
      }), { status: 401 });
    }

    // Get query params
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Fetch history
    const { data: history, error, count } = await supabase
      .from('analysis_history')
      .select('id, product_name, product_brand, language, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      data: history,
      total: count,
      limit,
      offset
    }), { status: 200 });

  } catch (error) {
    console.error('History GET error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'internal_error'
    }), { status: 500 });
  }
};
```

---

## End of Part 3

**This file is saved as: `/home/claude/plan-part-3.md`**

**Part 3 covers:**
- Section 6.4: system-prompt.md (complete LLM instruction template)
- Section 6.5: Fun Facts JSON files (EN and ZH - 10 facts each)
- Section 7: Bilingual i18n Implementation (utils + complete EN/ZH UI strings)
- Section 8: Database Schema (complete SQL with RLS and helper functions)
- Section 9: API Design (analyze, profile, history endpoints)

**Character count: ~48,000 characters**

**Next Part (Part 4) will cover:**
- Section 10: Frontend Pages & Components (layouts, chat interface, glossary, etc.)
- Section 11: LLM Integration & Prompting (detailed implementation)

---
