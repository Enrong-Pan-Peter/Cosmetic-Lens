## 6. Data Files & Knowledge Base

This section contains all the data files needed for the application. These files should be created in your project and will be used by both the frontend (glossary, education) and backend (LLM context).

### 6.1 File Overview

| File | Purpose | Location | Used By |
|------|---------|----------|---------|
| `ingredients-database.json` | Detailed ingredient profiles for LLM context | `/data/` | Backend (LLM prompts) |
| `glossary-data.json` | Quick-reference ingredient table | `/data/` | Frontend (Glossary page) |
| `system-prompt.md` | LLM instruction template | `/data/` | Backend (LLM prompts) |
| `en.json` | English UI strings | `/src/i18n/` | Frontend (all pages) |
| `zh.json` | Chinese UI strings | `/src/i18n/` | Frontend (all pages) |
| `fun-facts.json` (EN) | English fun fact cards | `/content/en/` | Frontend (Education pages) |
| `fun-facts.json` (ZH) | Chinese fun fact cards | `/content/zh/` | Frontend (Education pages) |

---

### 6.2 ingredients-database.json

**Purpose:** This is the knowledge base that provides grounded, accurate ingredient information to the LLM during product analysis. It is NOT shown directly to users—it's injected into the LLM context to improve analysis quality.

**How to Create:**
1. Use an LLM to generate initial entries based on authoritative sources
2. Manually verify key claims against Paula's Choice, CIR, published research
3. Curate and refine for accuracy and balance

**File Location:** `/data/ingredients-database.json`

**Complete Schema with Example Entries:**

```json
{
  "metadata": {
    "version": "1.0",
    "last_updated": "2025-02-01",
    "total_ingredients": 50,
    "sources": [
      "Paula's Choice Ingredient Dictionary",
      "Cosmetic Ingredient Review (CIR) Safety Assessments",
      "Published dermatological research",
      "EWG Skin Deep Database"
    ]
  },
  "categories": [
    {
      "id": "surfactant",
      "name_en": "Surfactants",
      "name_zh": "表面活性剂",
      "description_en": "Cleansing agents that help water mix with oil and dirt",
      "description_zh": "帮助水与油脂和污垢混合的清洁剂"
    },
    {
      "id": "humectant",
      "name_en": "Humectants",
      "name_zh": "保湿剂",
      "description_en": "Ingredients that attract and hold water",
      "description_zh": "吸引并保持水分的成分"
    },
    {
      "id": "emollient",
      "name_en": "Emollients",
      "name_zh": "润肤剂",
      "description_en": "Ingredients that soften and smooth skin",
      "description_zh": "软化和平滑皮肤的成分"
    },
    {
      "id": "occlusive",
      "name_en": "Occlusives",
      "name_zh": "封闭剂",
      "description_en": "Ingredients that form a barrier to prevent water loss",
      "description_zh": "形成屏障防止水分流失的成分"
    },
    {
      "id": "active",
      "name_en": "Active Ingredients",
      "name_zh": "活性成分",
      "description_en": "Ingredients with proven biological effects on skin",
      "description_zh": "对皮肤有已证实生物效果的成分"
    },
    {
      "id": "preservative",
      "name_en": "Preservatives",
      "name_zh": "防腐剂",
      "description_en": "Ingredients that prevent microbial growth",
      "description_zh": "防止微生物生长的成分"
    },
    {
      "id": "antioxidant",
      "name_en": "Antioxidants",
      "name_zh": "抗氧化剂",
      "description_en": "Ingredients that neutralize free radicals",
      "description_zh": "中和自由基的成分"
    },
    {
      "id": "fragrance",
      "name_en": "Fragrance",
      "name_zh": "香料",
      "description_en": "Ingredients that provide scent",
      "description_zh": "提供香味的成分"
    },
    {
      "id": "sunscreen",
      "name_en": "Sunscreen Agents",
      "name_zh": "防晒剂",
      "description_en": "Ingredients that protect against UV radiation",
      "description_zh": "防护紫外线辐射的成分"
    },
    {
      "id": "exfoliant",
      "name_en": "Exfoliants",
      "name_zh": "去角质剂",
      "description_en": "Ingredients that remove dead skin cells",
      "description_zh": "去除死皮细胞的成分"
    },
    {
      "id": "solvent",
      "name_en": "Solvents",
      "name_zh": "溶剂",
      "description_en": "Ingredients that dissolve other ingredients",
      "description_zh": "溶解其他成分的成分"
    }
  ],
  "ingredients": [
    {
      "id": "niacinamide",
      "inci_name": "Niacinamide",
      "chinese_name": "烟酰胺",
      "aliases_en": ["Vitamin B3", "Nicotinamide"],
      "aliases_zh": ["维生素B3", "尼克酰胺"],
      "category": "active",
      "subcategory": "vitamin",
      "functions": {
        "en": [
          "Brightening and evening skin tone",
          "Reducing sebum production and pore appearance",
          "Strengthening skin barrier function",
          "Anti-inflammatory effects",
          "Improving skin texture"
        ],
        "zh": [
          "美白和均匀肤色",
          "减少皮脂分泌和毛孔外观",
          "增强皮肤屏障功能",
          "消炎作用",
          "改善皮肤质地"
        ]
      },
      "effective_concentration": {
        "minimum": "2%",
        "optimal": "4-5%",
        "maximum_beneficial": "10%",
        "notes_en": "Higher concentrations (>10%) may cause flushing without additional benefit. 5% is optimal for most people.",
        "notes_zh": "较高浓度（>10%）可能导致泛红但不会带来额外效果。5%对大多数人来说是最佳浓度。"
      },
      "evidence_level": "strong",
      "evidence_notes_en": "Extensively studied with multiple RCTs supporting efficacy for hyperpigmentation, oil control, and barrier repair.",
      "evidence_notes_zh": "经过广泛研究，多项随机对照试验支持其对色素沉着、控油和屏障修复的功效。",
      "skin_types": {
        "suited": ["oily", "combination", "normal", "dry"],
        "caution": [],
        "notes_en": "Well-tolerated by most skin types including sensitive skin.",
        "notes_zh": "大多数肤质（包括敏感肌）都能良好耐受。"
      },
      "concerns_addressed": ["hyperpigmentation", "acne", "aging", "dullness", "large_pores"],
      "interactions": [
        {
          "ingredient": "L-Ascorbic Acid",
          "ingredient_zh": "左旋维生素C",
          "type": "info",
          "details_en": "Old myth they cancel out. Modern research shows they can be used together safely.",
          "details_zh": "旧说法认为两者会相互抵消是误解。现代研究表明可以安全地一起使用。"
        }
      ],
      "irritation_potential": "low",
      "comedogenic_rating": 0,
      "pregnancy_safe": true,
      "pregnancy_notes_en": "Considered safe during pregnancy.",
      "pregnancy_notes_zh": "孕期使用被认为是安全的。",
      "vegan": true,
      "common_in": ["serums", "moisturizers", "toners"],
      "price_indicator": "affordable",
      "notes_en": "One of the most versatile and well-researched skincare actives. Great for beginners.",
      "notes_zh": "最多功能且研究充分的护肤活性成分之一。非常适合新手。"
    },
    {
      "id": "retinol",
      "inci_name": "Retinol",
      "chinese_name": "视黄醇",
      "aliases_en": ["Vitamin A"],
      "aliases_zh": ["维生素A醇", "A醇"],
      "category": "active",
      "subcategory": "retinoid",
      "functions": {
        "en": [
          "Accelerates cell turnover",
          "Stimulates collagen production",
          "Reduces fine lines and wrinkles",
          "Helps with acne",
          "Fades hyperpigmentation"
        ],
        "zh": [
          "加速细胞更新",
          "刺激胶原蛋白生成",
          "减少细纹和皱纹",
          "帮助改善痤疮",
          "淡化色素沉着"
        ]
      },
      "effective_concentration": {
        "beginner": "0.25-0.3%",
        "intermediate": "0.5%",
        "advanced": "1%",
        "notes_en": "Start low and increase gradually. Higher isn't always better.",
        "notes_zh": "从低浓度开始逐渐增加。浓度不是越高越好。"
      },
      "evidence_level": "strong",
      "evidence_notes_en": "Gold standard anti-aging ingredient with decades of research.",
      "evidence_notes_zh": "具有数十年研究历史的抗衰老黄金标准成分。",
      "skin_types": {
        "suited": ["normal", "oily", "combination"],
        "caution": ["sensitive", "dry", "rosacea", "eczema"],
        "notes_en": "Requires careful introduction. Use sunscreen during the day.",
        "notes_zh": "需要谨慎引入。白天必须使用防晒霜。"
      },
      "concerns_addressed": ["aging", "fine_lines", "wrinkles", "acne", "hyperpigmentation"],
      "interactions": [
        {
          "ingredient": "AHAs/BHAs",
          "ingredient_zh": "果酸/水杨酸",
          "type": "caution",
          "details_en": "Using together can increase irritation. Best to alternate nights.",
          "details_zh": "同时使用可能增加刺激。最好隔夜交替使用。"
        },
        {
          "ingredient": "Benzoyl Peroxide",
          "ingredient_zh": "过氧化苯甲酰",
          "type": "caution",
          "details_en": "Can oxidize and deactivate retinol. Use at different times.",
          "details_zh": "可能氧化并使视黄醇失活。应在不同时间使用。"
        }
      ],
      "irritation_potential": "medium_to_high",
      "comedogenic_rating": 0,
      "pregnancy_safe": false,
      "pregnancy_notes_en": "AVOID during pregnancy. Use bakuchiol or azelaic acid instead.",
      "pregnancy_notes_zh": "孕期应避免使用。可使用补骨脂酚或壬二酸替代。",
      "vegan": false,
      "common_in": ["serums", "night_creams"],
      "price_indicator": "moderate_to_expensive",
      "notes_en": "Most proven anti-aging ingredient. Results take 3-6 months. Always use SPF.",
      "notes_zh": "最有效的抗衰老成分。需要3-6个月见效。必须配合防晒。"
    },
    {
      "id": "hyaluronic_acid",
      "inci_name": "Sodium Hyaluronate",
      "chinese_name": "透明质酸钠",
      "aliases_en": ["Hyaluronic Acid", "HA"],
      "aliases_zh": ["玻尿酸", "透明质酸"],
      "category": "humectant",
      "functions": {
        "en": [
          "Attracts and holds moisture",
          "Plumps skin temporarily",
          "Improves hydration levels"
        ],
        "zh": [
          "吸引并保持水分",
          "暂时使皮肤饱满",
          "改善水合水平"
        ]
      },
      "effective_concentration": {
        "typical": "0.1-2%",
        "notes_en": "Effective at low concentrations. Multiple molecular weights work best.",
        "notes_zh": "低浓度即有效。多种分子量效果最佳。"
      },
      "evidence_level": "strong",
      "skin_types": {
        "suited": ["all"],
        "caution": [],
        "notes_en": "In very dry climates, seal with moisturizer to prevent reverse osmosis.",
        "notes_zh": "在非常干燥的环境中，需涂抹保湿霜锁住水分。"
      },
      "concerns_addressed": ["dehydration", "dryness", "fine_lines"],
      "interactions": [],
      "irritation_potential": "very_low",
      "comedogenic_rating": 0,
      "pregnancy_safe": true,
      "vegan": true,
      "common_in": ["serums", "toners", "moisturizers"],
      "price_indicator": "affordable",
      "notes_en": "A hydration staple. Sodium Hyaluronate is the salt form with smaller molecules.",
      "notes_zh": "保湿必备成分。透明质酸钠是盐形式，分子更小。"
    },
    {
      "id": "glycerin",
      "inci_name": "Glycerin",
      "chinese_name": "甘油",
      "aliases_en": ["Glycerol", "Vegetable Glycerin"],
      "aliases_zh": ["丙三醇"],
      "category": "humectant",
      "functions": {
        "en": [
          "Attracts moisture to skin",
          "Strengthens skin barrier",
          "Softens and smooths skin"
        ],
        "zh": [
          "吸引水分到皮肤",
          "增强皮肤屏障",
          "软化和平滑皮肤"
        ]
      },
      "effective_concentration": {
        "typical": "1-10%",
        "notes_en": "Very effective even at low concentrations."
      },
      "evidence_level": "strong",
      "skin_types": {
        "suited": ["all"],
        "caution": []
      },
      "concerns_addressed": ["dryness", "dehydration"],
      "interactions": [],
      "irritation_potential": "very_low",
      "comedogenic_rating": 0,
      "pregnancy_safe": true,
      "vegan": true,
      "common_in": ["all_skincare"],
      "price_indicator": "very_affordable",
      "notes_en": "Gold standard humectant. Often outperforms trendy alternatives in studies.",
      "notes_zh": "保湿黄金标准。在研究中通常优于时髦的替代品。"
    },
    {
      "id": "salicylic_acid",
      "inci_name": "Salicylic Acid",
      "chinese_name": "水杨酸",
      "aliases_en": ["BHA", "Beta Hydroxy Acid"],
      "aliases_zh": ["β-羟基酸"],
      "category": "active",
      "subcategory": "exfoliant",
      "functions": {
        "en": [
          "Chemical exfoliation",
          "Unclogs pores (oil-soluble)",
          "Anti-inflammatory",
          "Controls oil"
        ],
        "zh": [
          "化学去角质",
          "疏通毛孔（脂溶性）",
          "消炎",
          "控油"
        ]
      },
      "effective_concentration": {
        "otc_max": "2%",
        "typical": "0.5-2%"
      },
      "evidence_level": "strong",
      "skin_types": {
        "suited": ["oily", "combination", "acne_prone"],
        "caution": ["dry", "sensitive"]
      },
      "concerns_addressed": ["acne", "blackheads", "oily_skin", "clogged_pores"],
      "interactions": [
        {
          "ingredient": "Retinoids",
          "ingredient_zh": "视黄酸类",
          "type": "caution",
          "details_en": "Can increase irritation. Alternate use recommended."
        }
      ],
      "irritation_potential": "medium",
      "comedogenic_rating": 0,
      "pregnancy_safe": false,
      "pregnancy_notes_en": "Avoid leave-on products. Wash-off cleansers are lower risk.",
      "vegan": true,
      "common_in": ["cleansers", "toners", "spot_treatments"],
      "price_indicator": "affordable",
      "notes_en": "Oil-soluble BHA penetrates pores unlike water-soluble AHAs.",
      "notes_zh": "脂溶性BHA能渗透毛孔，不同于水溶性AHA。"
    },
    {
      "id": "ascorbic_acid",
      "inci_name": "Ascorbic Acid",
      "chinese_name": "抗坏血酸",
      "aliases_en": ["Vitamin C", "L-Ascorbic Acid"],
      "aliases_zh": ["维生素C", "左旋维生素C"],
      "category": "active",
      "subcategory": "antioxidant",
      "functions": {
        "en": [
          "Antioxidant protection",
          "Brightens skin",
          "Stimulates collagen",
          "Enhances sun protection"
        ],
        "zh": [
          "抗氧化保护",
          "美白皮肤",
          "刺激胶原蛋白",
          "增强防晒保护"
        ]
      },
      "effective_concentration": {
        "minimum": "8%",
        "optimal": "10-20%",
        "notes_en": "pH must be below 3.5 for L-ascorbic acid penetration."
      },
      "evidence_level": "strong",
      "skin_types": {
        "suited": ["normal", "oily", "combination"],
        "caution": ["sensitive", "rosacea"]
      },
      "concerns_addressed": ["hyperpigmentation", "dullness", "aging", "sun_damage"],
      "interactions": [],
      "irritation_potential": "medium",
      "comedogenic_rating": 0,
      "pregnancy_safe": true,
      "vegan": true,
      "common_in": ["serums"],
      "price_indicator": "moderate_to_expensive",
      "notes_en": "Unstable—oxidizes with light/air. Look for opaque, airless packaging.",
      "notes_zh": "不稳定——接触光/空气会氧化。选择不透光、真空包装。"
    },
    {
      "id": "sodium_lauryl_sulfate",
      "inci_name": "Sodium Lauryl Sulfate",
      "chinese_name": "月桂基硫酸钠",
      "aliases_en": ["SLS"],
      "aliases_zh": ["十二烷基硫酸钠"],
      "category": "surfactant",
      "functions": {
        "en": [
          "Strong cleansing",
          "Foaming agent"
        ],
        "zh": [
          "强效清洁",
          "起泡剂"
        ]
      },
      "evidence_level": "strong",
      "skin_types": {
        "suited": ["oily", "normal"],
        "caution": ["dry", "sensitive", "eczema", "rosacea"],
        "notes_en": "Can strip natural oils and compromise barrier with frequent use."
      },
      "concerns_addressed": ["cleansing"],
      "interactions": [],
      "irritation_potential": "high",
      "comedogenic_rating": 0,
      "pregnancy_safe": true,
      "vegan": true,
      "common_in": ["cleansers", "shampoos"],
      "price_indicator": "very_affordable",
      "notes_en": "Not inherently bad but can be harsh. Dry/sensitive skin may prefer amino acid surfactants.",
      "notes_zh": "并非本质上不好但可能刺激。干性/敏感肌可能更适合氨基酸表面活性剂。"
    },
    {
      "id": "fragrance",
      "inci_name": "Fragrance",
      "chinese_name": "香精",
      "aliases_en": ["Parfum"],
      "aliases_zh": ["香料"],
      "category": "fragrance",
      "functions": {
        "en": [
          "Provides scent",
          "Masks other ingredient odors"
        ],
        "zh": [
          "提供香味",
          "掩盖其他成分气味"
        ]
      },
      "evidence_level": "n/a",
      "skin_types": {
        "suited": ["normal", "oily"],
        "caution": ["sensitive", "eczema", "rosacea", "allergy_prone"],
        "notes_en": "One of the most common causes of skin reactions."
      },
      "concerns_addressed": [],
      "interactions": [],
      "irritation_potential": "variable_often_high",
      "comedogenic_rating": 0,
      "pregnancy_safe": true,
      "vegan": "varies",
      "common_in": ["most_cosmetics"],
      "notes_en": "'Fragrance' can mean 3000+ chemicals. 'Fragrance-free' ≠ 'unscented'.",
      "notes_zh": "'香精'可代表3000多种化学物质。'无香料'≠'无香味'。"
    },
    {
      "id": "phenoxyethanol",
      "inci_name": "Phenoxyethanol",
      "chinese_name": "苯氧乙醇",
      "aliases_en": [],
      "aliases_zh": [],
      "category": "preservative",
      "functions": {
        "en": [
          "Prevents microbial growth",
          "Extends shelf life"
        ],
        "zh": [
          "防止微生物生长",
          "延长保质期"
        ]
      },
      "effective_concentration": {
        "typical": "0.5-1%",
        "max_allowed": "1%"
      },
      "evidence_level": "strong",
      "skin_types": {
        "suited": ["most"],
        "caution": ["extremely_sensitive"]
      },
      "interactions": [],
      "irritation_potential": "low",
      "comedogenic_rating": 0,
      "pregnancy_safe": true,
      "vegan": true,
      "common_in": ["most_skincare"],
      "notes_en": "Common paraben alternative. Preservatives are necessary for product safety.",
      "notes_zh": "常见的对羟基苯甲酸酯替代品。防腐剂对产品安全是必要的。"
    },
    {
      "id": "dimethicone",
      "inci_name": "Dimethicone",
      "chinese_name": "聚二甲基硅氧烷",
      "aliases_en": ["Silicone"],
      "aliases_zh": ["硅油"],
      "category": "emollient",
      "functions": {
        "en": [
          "Smooths skin",
          "Creates protective barrier",
          "Silky texture"
        ],
        "zh": [
          "平滑皮肤",
          "形成保护屏障",
          "丝滑质感"
        ]
      },
      "evidence_level": "strong",
      "skin_types": {
        "suited": ["all"],
        "notes_en": "Non-comedogenic despite myths. Doesn't suffocate skin."
      },
      "interactions": [],
      "irritation_potential": "very_low",
      "comedogenic_rating": 0,
      "pregnancy_safe": true,
      "vegan": true,
      "common_in": ["primers", "moisturizers", "serums"],
      "notes_en": "Silicones are misunderstood. They don't clog pores or prevent absorption.",
      "notes_zh": "硅油被误解了。它们不会堵塞毛孔或阻止吸收。"
    },
    {
      "id": "ceramides",
      "inci_name": "Ceramide NP",
      "chinese_name": "神经酰胺NP",
      "aliases_en": ["Ceramide 3", "Ceramides"],
      "aliases_zh": ["神经酰胺3"],
      "category": "emollient",
      "functions": {
        "en": [
          "Repairs skin barrier",
          "Retains moisture",
          "Soothes irritation"
        ],
        "zh": [
          "修复皮肤屏障",
          "保持水分",
          "舒缓刺激"
        ]
      },
      "evidence_level": "strong",
      "skin_types": {
        "suited": ["all", "especially_dry", "eczema", "sensitive"]
      },
      "interactions": [],
      "irritation_potential": "very_low",
      "comedogenic_rating": 0,
      "pregnancy_safe": true,
      "vegan": true,
      "common_in": ["moisturizers", "barrier_repair"],
      "notes_en": "Already 50% of your skin barrier. Products replenish what's lost.",
      "notes_zh": "已经占你皮肤屏障的50%。产品补充流失的部分。"
    },
    {
      "id": "centella_asiatica",
      "inci_name": "Centella Asiatica Extract",
      "chinese_name": "积雪草提取物",
      "aliases_en": ["Cica", "Gotu Kola", "Tiger Grass"],
      "aliases_zh": ["积雪草", "老虎草"],
      "category": "active",
      "functions": {
        "en": [
          "Soothes and calms",
          "Supports healing",
          "Anti-inflammatory"
        ],
        "zh": [
          "舒缓和镇静",
          "支持愈合",
          "消炎"
        ]
      },
      "evidence_level": "moderate",
      "skin_types": {
        "suited": ["all", "especially_sensitive", "irritated"]
      },
      "interactions": [],
      "irritation_potential": "very_low",
      "comedogenic_rating": 0,
      "pregnancy_safe": true,
      "vegan": true,
      "common_in": ["soothing_products", "barrier_repair"],
      "notes_en": "K-beauty favorite. Look for TECA or specific compounds (madecassoside).",
      "notes_zh": "韩国护肤品最爱。选择含TECA或特定化合物（羟基积雪草苷）的产品。"
    },
    {
      "id": "glycolic_acid",
      "inci_name": "Glycolic Acid",
      "chinese_name": "乙醇酸",
      "aliases_en": ["AHA", "Alpha Hydroxy Acid"],
      "aliases_zh": ["果酸", "甘醇酸"],
      "category": "exfoliant",
      "functions": {
        "en": [
          "Chemical exfoliation",
          "Improves texture",
          "Brightens",
          "Stimulates collagen"
        ],
        "zh": [
          "化学去角质",
          "改善肤质",
          "亮肤",
          "刺激胶原蛋白"
        ]
      },
      "effective_concentration": {
        "daily_use": "5-10%",
        "peels": "20-70%"
      },
      "evidence_level": "strong",
      "skin_types": {
        "suited": ["normal", "oily", "combination"],
        "caution": ["sensitive", "dry", "rosacea"]
      },
      "interactions": [
        {
          "ingredient": "Retinoids",
          "type": "caution",
          "details_en": "Can cause significant irritation together. Alternate."
        }
      ],
      "irritation_potential": "medium_to_high",
      "comedogenic_rating": 0,
      "pregnancy_safe": true,
      "vegan": true,
      "common_in": ["toners", "serums", "peels"],
      "notes_en": "Smallest AHA = deepest penetration. MUST use sunscreen.",
      "notes_zh": "最小的AHA = 最深的渗透。必须使用防晒霜。"
    },
    {
      "id": "azelaic_acid",
      "inci_name": "Azelaic Acid",
      "chinese_name": "壬二酸",
      "aliases_en": ["AzA"],
      "aliases_zh": ["杜鹃花酸"],
      "category": "active",
      "functions": {
        "en": [
          "Treats acne",
          "Reduces hyperpigmentation",
          "Reduces rosacea",
          "Anti-inflammatory"
        ],
        "zh": [
          "治疗痤疮",
          "减少色素沉着",
          "减轻玫瑰痤疮",
          "消炎"
        ]
      },
      "effective_concentration": {
        "otc": "10%",
        "prescription": "15-20%"
      },
      "evidence_level": "strong",
      "skin_types": {
        "suited": ["all", "sensitive", "rosacea", "acne_prone"]
      },
      "interactions": [],
      "irritation_potential": "low",
      "comedogenic_rating": 0,
      "pregnancy_safe": true,
      "pregnancy_notes_en": "One of the safest actives during pregnancy.",
      "vegan": true,
      "common_in": ["serums", "treatments"],
      "notes_en": "Underrated multitasker. Works for acne, rosacea, AND hyperpigmentation.",
      "notes_zh": "被低估的多效成分。对痤疮、玫瑰痤疮和色素沉着都有效。"
    },
    {
      "id": "zinc_oxide",
      "inci_name": "Zinc Oxide",
      "chinese_name": "氧化锌",
      "aliases_en": [],
      "aliases_zh": [],
      "category": "sunscreen",
      "functions": {
        "en": [
          "Broad-spectrum UV protection",
          "Physical/mineral filter",
          "Anti-inflammatory"
        ],
        "zh": [
          "广谱紫外线防护",
          "物理/矿物过滤剂",
          "消炎"
        ]
      },
      "evidence_level": "strong",
      "skin_types": {
        "suited": ["all", "sensitive", "acne_prone"],
        "notes_en": "May leave white cast, especially on darker skin tones."
      },
      "interactions": [],
      "irritation_potential": "very_low",
      "comedogenic_rating": 0,
      "pregnancy_safe": true,
      "pregnancy_notes_en": "Safest sunscreen option during pregnancy (stays on skin surface).",
      "vegan": true,
      "common_in": ["sunscreens", "mineral_sunscreens"],
      "notes_en": "Broadest spectrum of any single sunscreen ingredient. Gentle for sensitive skin.",
      "notes_zh": "单一防晒成分中最广谱的。对敏感肌温和。"
    },
    {
      "id": "benzoyl_peroxide",
      "inci_name": "Benzoyl Peroxide",
      "chinese_name": "过氧化苯甲酰",
      "aliases_en": ["BPO"],
      "aliases_zh": [],
      "category": "active",
      "functions": {
        "en": [
          "Kills acne bacteria",
          "Reduces inflammation",
          "Unclogs pores"
        ],
        "zh": [
          "杀死痤疮细菌",
          "减轻炎症",
          "疏通毛孔"
        ]
      },
      "effective_concentration": {
        "typical": "2.5-10%",
        "notes_en": "2.5% often as effective as 10% with less irritation."
      },
      "evidence_level": "strong",
      "skin_types": {
        "suited": ["oily", "acne_prone"],
        "caution": ["dry", "sensitive"]
      },
      "interactions": [
        {
          "ingredient": "Retinoids",
          "type": "caution",
          "details_en": "Can oxidize retinol. Use at different times of day."
        }
      ],
      "irritation_potential": "high",
      "comedogenic_rating": 0,
      "pregnancy_safe": true,
      "vegan": true,
      "common_in": ["spot_treatments", "cleansers"],
      "notes_en": "Very effective but drying. Will bleach fabrics. Start with 2.5%.",
      "notes_zh": "非常有效但干燥。会漂白织物。从2.5%开始。"
    },
    {
      "id": "squalane",
      "inci_name": "Squalane",
      "chinese_name": "角鲨烷",
      "aliases_en": [],
      "aliases_zh": ["鲨烷"],
      "category": "emollient",
      "functions": {
        "en": [
          "Lightweight moisturizing",
          "Mimics natural sebum",
          "Non-comedogenic oil"
        ],
        "zh": [
          "轻薄保湿",
          "模拟天然皮脂",
          "不致粉刺的油"
        ]
      },
      "evidence_level": "moderate",
      "skin_types": {
        "suited": ["all", "including_oily"],
        "notes_en": "One of the few oils suitable for oily skin."
      },
      "interactions": [],
      "irritation_potential": "very_low",
      "comedogenic_rating": 0,
      "pregnancy_safe": true,
      "vegan": true,
      "vegan_notes_en": "Modern squalane is from olives/sugarcane, not sharks.",
      "common_in": ["facial_oils", "moisturizers"],
      "notes_en": "Found naturally in human sebum. Absorbs quickly without greasiness.",
      "notes_zh": "天然存在于人体皮脂中。吸收快，不油腻。"
    },
    {
      "id": "panthenol",
      "inci_name": "Panthenol",
      "chinese_name": "泛醇",
      "aliases_en": ["Pro-Vitamin B5"],
      "aliases_zh": ["维生素B5前体"],
      "category": "humectant",
      "functions": {
        "en": [
          "Moisturizes",
          "Supports healing",
          "Soothes irritation"
        ],
        "zh": [
          "保湿",
          "支持愈合",
          "舒缓刺激"
        ]
      },
      "evidence_level": "moderate",
      "skin_types": {
        "suited": ["all"]
      },
      "interactions": [],
      "irritation_potential": "very_low",
      "comedogenic_rating": 0,
      "pregnancy_safe": true,
      "vegan": true,
      "common_in": ["moisturizers", "wound_healing"],
      "notes_en": "Known for wound healing. Very well-tolerated.",
      "notes_zh": "以伤口愈合闻名。耐受性非常好。"
    },
    {
      "id": "alpha_arbutin",
      "inci_name": "Alpha-Arbutin",
      "chinese_name": "α-熊果苷",
      "aliases_en": ["Arbutin"],
      "aliases_zh": ["熊果苷"],
      "category": "active",
      "functions": {
        "en": [
          "Inhibits melanin",
          "Fades dark spots",
          "Evens skin tone"
        ],
        "zh": [
          "抑制黑色素",
          "淡化色斑",
          "均匀肤色"
        ]
      },
      "effective_concentration": {
        "typical": "1-2%"
      },
      "evidence_level": "moderate",
      "skin_types": {
        "suited": ["all"]
      },
      "interactions": [],
      "irritation_potential": "low",
      "comedogenic_rating": 0,
      "pregnancy_safe": true,
      "vegan": true,
      "common_in": ["serums", "brightening_products"],
      "notes_en": "Gentler, safer alternative to hydroquinone. Results take 8-12 weeks.",
      "notes_zh": "比对苯二酚更温和、更安全的替代品。8-12周见效。"
    }
  ]
}
```

**Note:** The above is a condensed example. The full file should contain 50-100 ingredients with complete bilingual data for each field.

---

### 6.3 glossary-data.json

**Purpose:** Power the searchable glossary page. Simpler format focused on quick lookups.

**File Location:** `/data/glossary-data.json`

**Complete File:**

```json
{
  "metadata": {
    "version": "1.0",
    "last_updated": "2025-02-01",
    "total_entries": 40
  },
  "categories": [
    {"id": "surfactant", "name_en": "Surfactants", "name_zh": "表面活性剂"},
    {"id": "humectant", "name_en": "Humectants", "name_zh": "保湿剂"},
    {"id": "emollient", "name_en": "Emollients", "name_zh": "润肤剂"},
    {"id": "occlusive", "name_en": "Occlusives", "name_zh": "封闭剂"},
    {"id": "active", "name_en": "Active Ingredients", "name_zh": "活性成分"},
    {"id": "preservative", "name_en": "Preservatives", "name_zh": "防腐剂"},
    {"id": "antioxidant", "name_en": "Antioxidants", "name_zh": "抗氧化剂"},
    {"id": "fragrance", "name_en": "Fragrance", "name_zh": "香料"},
    {"id": "sunscreen", "name_en": "Sunscreen Agents", "name_zh": "防晒剂"},
    {"id": "exfoliant", "name_en": "Exfoliants", "name_zh": "去角质剂"},
    {"id": "solvent", "name_en": "Solvents", "name_zh": "溶剂"}
  ],
  "entries": [
    {
      "inci_name": "Aqua",
      "chinese_name": "水",
      "aliases_en": ["Water", "Purified Water"],
      "aliases_zh": ["纯净水"],
      "category": "solvent",
      "function_en": "Base/solvent for most formulations",
      "function_zh": "大多数配方的基底/溶剂",
      "notes_en": "Almost always first ingredient in water-based products",
      "notes_zh": "在水基产品中几乎总是第一个成分"
    },
    {
      "inci_name": "Glycerin",
      "chinese_name": "甘油",
      "aliases_en": ["Glycerol", "Vegetable Glycerin"],
      "aliases_zh": ["丙三醇"],
      "category": "humectant",
      "function_en": "Attracts moisture; strengthens barrier",
      "function_zh": "吸引水分；增强屏障",
      "notes_en": "One of the most effective humectants",
      "notes_zh": "最有效的保湿剂之一"
    },
    {
      "inci_name": "Niacinamide",
      "chinese_name": "烟酰胺",
      "aliases_en": ["Vitamin B3", "Nicotinamide"],
      "aliases_zh": ["维生素B3"],
      "category": "active",
      "function_en": "Brightening, oil control, barrier repair",
      "function_zh": "美白、控油、修复屏障",
      "notes_en": "Well-tolerated, versatile active",
      "notes_zh": "耐受性好的多功能活性成分"
    },
    {
      "inci_name": "Sodium Hyaluronate",
      "chinese_name": "透明质酸钠",
      "aliases_en": ["Hyaluronic Acid", "HA"],
      "aliases_zh": ["玻尿酸"],
      "category": "humectant",
      "function_en": "Holds 1000x its weight in water",
      "function_zh": "可吸收自身重量1000倍的水分",
      "notes_en": "Salt form with better penetration",
      "notes_zh": "盐形式，渗透性更好"
    },
    {
      "inci_name": "Retinol",
      "chinese_name": "视黄醇",
      "aliases_en": ["Vitamin A"],
      "aliases_zh": ["A醇"],
      "category": "active",
      "function_en": "Anti-aging, cell turnover, reduces wrinkles",
      "function_zh": "抗衰老，促进细胞更新，减少皱纹",
      "notes_en": "Gold standard anti-aging; avoid in pregnancy",
      "notes_zh": "抗衰老黄金标准；孕期避免"
    },
    {
      "inci_name": "Salicylic Acid",
      "chinese_name": "水杨酸",
      "aliases_en": ["BHA"],
      "aliases_zh": ["β-羟基酸"],
      "category": "active",
      "function_en": "Exfoliant, unclogs pores, anti-inflammatory",
      "function_zh": "去角质、疏通毛孔、消炎",
      "notes_en": "Oil-soluble; penetrates into pores",
      "notes_zh": "脂溶性；能渗透毛孔"
    },
    {
      "inci_name": "Ascorbic Acid",
      "chinese_name": "抗坏血酸",
      "aliases_en": ["Vitamin C", "L-Ascorbic Acid"],
      "aliases_zh": ["维生素C", "左旋维C"],
      "category": "active",
      "function_en": "Antioxidant, brightening, collagen boost",
      "function_zh": "抗氧化、美白、促进胶原蛋白",
      "notes_en": "Unstable; needs proper packaging",
      "notes_zh": "不稳定；需要合适的包装"
    },
    {
      "inci_name": "Sodium Lauryl Sulfate",
      "chinese_name": "月桂基硫酸钠",
      "aliases_en": ["SLS"],
      "aliases_zh": ["十二烷基硫酸钠"],
      "category": "surfactant",
      "function_en": "Strong cleansing and foaming",
      "function_zh": "强效清洁和起泡",
      "notes_en": "Can irritate dry/sensitive skin",
      "notes_zh": "可能刺激干性/敏感皮肤"
    },
    {
      "inci_name": "Cocamidopropyl Betaine",
      "chinese_name": "椰油酰胺丙基甜菜碱",
      "aliases_en": ["Coco-Betaine"],
      "aliases_zh": [],
      "category": "surfactant",
      "function_en": "Gentle cleansing, foam boosting",
      "function_zh": "温和清洁、增强泡沫",
      "notes_en": "One of the gentlest surfactants",
      "notes_zh": "最温和的表面活性剂之一"
    },
    {
      "inci_name": "Phenoxyethanol",
      "chinese_name": "苯氧乙醇",
      "aliases_en": [],
      "aliases_zh": [],
      "category": "preservative",
      "function_en": "Prevents microbial growth",
      "function_zh": "防止微生物生长",
      "notes_en": "Common paraben alternative",
      "notes_zh": "常见的对羟基苯甲酸酯替代品"
    },
    {
      "inci_name": "Dimethicone",
      "chinese_name": "聚二甲基硅氧烷",
      "aliases_en": ["Silicone"],
      "aliases_zh": ["硅油"],
      "category": "emollient",
      "function_en": "Smooths skin, protective barrier",
      "function_zh": "平滑皮肤，保护屏障",
      "notes_en": "Non-comedogenic despite myths",
      "notes_zh": "尽管有误解但不会堵塞毛孔"
    },
    {
      "inci_name": "Fragrance",
      "chinese_name": "香精",
      "aliases_en": ["Parfum"],
      "aliases_zh": ["香料"],
      "category": "fragrance",
      "function_en": "Provides scent",
      "function_zh": "提供香味",
      "notes_en": "Common allergen; 3000+ possible compounds",
      "notes_zh": "常见过敏原；可能包含3000多种化合物"
    },
    {
      "inci_name": "Tocopherol",
      "chinese_name": "生育酚",
      "aliases_en": ["Vitamin E"],
      "aliases_zh": ["维生素E"],
      "category": "antioxidant",
      "function_en": "Antioxidant, moisturizing, stabilizer",
      "function_zh": "抗氧化、保湿、稳定剂",
      "notes_en": "Often stabilizes Vitamin C formulas",
      "notes_zh": "常用于稳定维生素C配方"
    },
    {
      "inci_name": "Zinc Oxide",
      "chinese_name": "氧化锌",
      "aliases_en": [],
      "aliases_zh": [],
      "category": "sunscreen",
      "function_en": "Broad-spectrum UV protection",
      "function_zh": "广谱紫外线防护",
      "notes_en": "Gentle mineral filter; may leave white cast",
      "notes_zh": "温和的矿物过滤剂；可能留白"
    },
    {
      "inci_name": "Titanium Dioxide",
      "chinese_name": "二氧化钛",
      "aliases_en": [],
      "aliases_zh": [],
      "category": "sunscreen",
      "function_en": "Physical UV filter, mainly UVB",
      "function_zh": "物理紫外线过滤剂，主要防UVB",
      "notes_en": "Often combined with zinc oxide",
      "notes_zh": "常与氧化锌组合使用"
    },
    {
      "inci_name": "Cetearyl Alcohol",
      "chinese_name": "鲸蜡硬脂醇",
      "aliases_en": [],
      "aliases_zh": [],
      "category": "emollient",
      "function_en": "Emollient, emulsifier, thickener",
      "function_zh": "润肤剂、乳化剂、增稠剂",
      "notes_en": "Fatty alcohol—not drying like simple alcohols",
      "notes_zh": "脂肪醇——不像简单醇类那样干燥"
    },
    {
      "inci_name": "Alcohol Denat",
      "chinese_name": "变性乙醇",
      "aliases_en": ["Denatured Alcohol", "SD Alcohol"],
      "aliases_zh": ["变性酒精"],
      "category": "solvent",
      "function_en": "Solvent, penetration enhancer, quick-drying",
      "function_zh": "溶剂，渗透促进剂，快干",
      "notes_en": "Can be drying in high amounts",
      "notes_zh": "高浓度可能导致干燥"
    },
    {
      "inci_name": "Centella Asiatica Extract",
      "chinese_name": "积雪草提取物",
      "aliases_en": ["Cica", "Tiger Grass"],
      "aliases_zh": ["积雪草"],
      "category": "active",
      "function_en": "Soothing, healing, anti-inflammatory",
      "function_zh": "舒缓、愈合、消炎",
      "notes_en": "K-beauty favorite for sensitive skin",
      "notes_zh": "韩国护肤品中敏感肌的最爱"
    },
    {
      "inci_name": "Ceramide NP",
      "chinese_name": "神经酰胺NP",
      "aliases_en": ["Ceramides"],
      "aliases_zh": ["神经酰胺"],
      "category": "emollient",
      "function_en": "Barrier repair, moisture retention",
      "function_zh": "修复屏障、保持水分",
      "notes_en": "Skin-identical; restores barrier",
      "notes_zh": "皮肤本身就有；修复屏障"
    },
    {
      "inci_name": "Glycolic Acid",
      "chinese_name": "乙醇酸",
      "aliases_en": ["AHA"],
      "aliases_zh": ["果酸"],
      "category": "exfoliant",
      "function_en": "Chemical exfoliation, brightening",
      "function_zh": "化学去角质，亮肤",
      "notes_en": "Strongest AHA; requires sunscreen",
      "notes_zh": "最强的AHA；需要防晒"
    },
    {
      "inci_name": "Lactic Acid",
      "chinese_name": "乳酸",
      "aliases_en": ["AHA"],
      "aliases_zh": ["果酸"],
      "category": "exfoliant",
      "function_en": "Gentle exfoliation, hydrating",
      "function_zh": "温和去角质，保湿",
      "notes_en": "Gentler than glycolic; has humectant properties",
      "notes_zh": "比乙醇酸更温和；有保湿特性"
    },
    {
      "inci_name": "Squalane",
      "chinese_name": "角鲨烷",
      "aliases_en": [],
      "aliases_zh": ["鲨烷"],
      "category": "emollient",
      "function_en": "Lightweight moisturizing, mimics sebum",
      "function_zh": "轻薄保湿，模拟皮脂",
      "notes_en": "Non-comedogenic; good for oily skin too",
      "notes_zh": "不致粉刺；也适合油性皮肤"
    },
    {
      "inci_name": "Panthenol",
      "chinese_name": "泛醇",
      "aliases_en": ["Pro-Vitamin B5"],
      "aliases_zh": ["维生素B5前体"],
      "category": "humectant",
      "function_en": "Moisturizing, healing, soothing",
      "function_zh": "保湿、愈合、舒缓",
      "notes_en": "Extremely well-tolerated",
      "notes_zh": "耐受性极好"
    },
    {
      "inci_name": "Azelaic Acid",
      "chinese_name": "壬二酸",
      "aliases_en": [],
      "aliases_zh": ["杜鹃花酸"],
      "category": "active",
      "function_en": "Acne, rosacea, hyperpigmentation",
      "function_zh": "痤疮、玫瑰痤疮、色素沉着",
      "notes_en": "Gentle multitasker; pregnancy-safe",
      "notes_zh": "温和的多效成分；孕期安全"
    },
    {
      "inci_name": "Benzoyl Peroxide",
      "chinese_name": "过氧化苯甲酰",
      "aliases_en": ["BPO"],
      "aliases_zh": [],
      "category": "active",
      "function_en": "Kills acne bacteria",
      "function_zh": "杀死痤疮细菌",
      "notes_en": "Very effective; bleaches fabrics",
      "notes_zh": "非常有效；会漂白织物"
    },
    {
      "inci_name": "Alpha-Arbutin",
      "chinese_name": "α-熊果苷",
      "aliases_en": ["Arbutin"],
      "aliases_zh": ["熊果苷"],
      "category": "active",
      "function_en": "Brightening, fades dark spots",
      "function_zh": "美白，淡化色斑",
      "notes_en": "Gentler alternative to hydroquinone",
      "notes_zh": "比对苯二酚更温和的替代品"
    },
    {
      "inci_name": "Butylene Glycol",
      "chinese_name": "丁二醇",
      "aliases_en": [],
      "aliases_zh": [],
      "category": "humectant",
      "function_en": "Humectant, solvent, penetration enhancer",
      "function_zh": "保湿剂、溶剂、渗透促进剂",
      "notes_en": "Very common; helps absorption",
      "notes_zh": "非常常见；帮助吸收"
    },
    {
      "inci_name": "Petrolatum",
      "chinese_name": "凡士林",
      "aliases_en": ["Petroleum Jelly", "Vaseline"],
      "aliases_zh": ["石油冻"],
      "category": "occlusive",
      "function_en": "Seals moisture, protects barrier",
      "function_zh": "锁住水分，保护屏障",
      "notes_en": "Most effective occlusive; non-comedogenic",
      "notes_zh": "最有效的封闭剂；不致粉刺"
    },
    {
      "inci_name": "Shea Butter",
      "chinese_name": "乳木果油",
      "aliases_en": [],
      "aliases_zh": [],
      "category": "emollient",
      "function_en": "Rich moisturizer, softens skin",
      "function_zh": "丰富的保湿剂，软化皮肤",
      "notes_en": "Great for dry skin; may be heavy for oily",
      "notes_zh": "适合干性皮肤；对油性可能太厚重"
    },
    {
      "inci_name": "Allantoin",
      "chinese_name": "尿囊素",
      "aliases_en": [],
      "aliases_zh": [],
      "category": "active",
      "function_en": "Soothing, healing, moisturizing",
      "function_zh": "舒缓、愈合、保湿",
      "notes_en": "Very gentle; good for sensitive skin",
      "notes_zh": "非常温和；适合敏感肌"
    }
  ]
}
```

---

## End of Part 2

**This file is saved as: `/home/claude/plan-part-2.md`**

**Part 2 covers:**
- Section 6.1: File Overview
- Section 6.2: ingredients-database.json (complete schema with 20+ example entries)
- Section 6.3: glossary-data.json (complete file with 30 entries)

**Next Part (Part 3) will cover:**
- Section 6.4: system-prompt.md (complete LLM instruction template)
- Section 6.5: Fun Facts JSON files (EN and ZH)
- Section 7: Bilingual i18n Implementation (complete UI strings)
- Section 8: Database Schema
- Section 9: API Design

---
