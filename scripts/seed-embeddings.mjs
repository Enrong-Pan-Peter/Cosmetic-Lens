/**
 * Seed script: reads ingredients, glossary, fun-facts, interactions, articles, curated dupes;
 * generates embeddings, stores in Supabase.
 *
 * Usage:
 *   node scripts/seed-embeddings.mjs
 *
 * Requires: OPENAI_API_KEY, PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env
 *
 * If you get "violates check constraint knowledge_embeddings_content_type_check",
 * run supabase/migrations/20250302_add_content_types.sql in Supabase SQL Editor first.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing required env vars: OPENAI_API_KEY, PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ------------------------------------------------------------------
// Embedding helper
// ------------------------------------------------------------------
async function embed(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8000) }),
  });
  if (!res.ok) throw new Error(`Embedding API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.data[0].embedding;
}

async function upsertRow(content, contentType, metadata, language) {
  const embedding = await embed(content);
  const { error } = await supabase.from('knowledge_embeddings').insert({
    content,
    content_type: contentType,
    metadata,
    language,
    embedding,
  });
  if (error) console.warn(`  ⚠ Insert failed: ${error.message}`);
}

// ------------------------------------------------------------------
// 1. Seed ingredients
// ------------------------------------------------------------------
async function seedIngredients() {
  console.log('\n=== Seeding ingredients ===');
  const raw = readFileSync(join(ROOT, 'src/data/ingredients-database.json'), 'utf-8');
  const db = JSON.parse(raw);

  for (const ing of db.ingredients) {
    const aliases = [...(ing.aliases_en || []), ...(ing.aliases_zh || [])].join(', ');
    const functionsEn = (ing.functions?.en || []).join('; ');
    const functionsZh = (ing.functions?.zh || []).join('; ');
    const concerns = (ing.concerns_addressed || []).join(', ');
    const suited = (ing.skin_types?.suited || []).join(', ');
    const caution = (ing.skin_types?.caution || []).join(', ');

    const interactions = (ing.interactions || [])
      .map((i) => `${i.ingredient}: ${i.details_en}`)
      .join(' | ');

    const chunk = [
      `Ingredient: ${ing.inci_name} / ${ing.chinese_name}`,
      aliases ? `Also known as: ${aliases}` : '',
      `Category: ${ing.category}`,
      `Functions: ${functionsEn}`,
      `功能: ${functionsZh}`,
      ing.effective_concentration
        ? `Effective concentration: ${ing.effective_concentration.optimal || ing.effective_concentration.minimum || ''}`
        : '',
      `Evidence level: ${ing.evidence_level}`,
      `Suited for: ${suited}`,
      caution ? `Caution for: ${caution}` : '',
      `Addresses: ${concerns}`,
      `Irritation potential: ${ing.irritation_potential}`,
      `Pregnancy safe: ${ing.pregnancy_safe ? 'yes' : 'no'}`,
      ing.pregnancy_notes_en ? `Pregnancy notes: ${ing.pregnancy_notes_en}` : '',
      interactions ? `Interactions: ${interactions}` : '',
      ing.notes_en ? `Notes: ${ing.notes_en}` : '',
      ing.notes_zh ? `备注: ${ing.notes_zh}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    console.log(`  → ${ing.inci_name} (${ing.chinese_name})`);
    await upsertRow(chunk, 'ingredient', { id: ing.id, inci_name: ing.inci_name, chinese_name: ing.chinese_name }, 'en');

    // Small delay to stay under rate limits
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(`  ✓ ${db.ingredients.length} ingredients indexed`);
}

// ------------------------------------------------------------------
// 2. Seed glossary
// ------------------------------------------------------------------
async function seedGlossary() {
  console.log('\n=== Seeding glossary ===');
  const raw = readFileSync(join(ROOT, 'src/data/glossary-data.json'), 'utf-8');
  const db = JSON.parse(raw);

  for (const entry of db.entries) {
    const aliases = [...(entry.aliases_en || []), ...(entry.aliases_zh || [])].join(', ');
    const chunk = [
      `Glossary: ${entry.inci_name} / ${entry.chinese_name}`,
      aliases ? `Aliases: ${aliases}` : '',
      `Category: ${entry.category}`,
      `Function: ${entry.function_en || ''}`,
      entry.function_zh ? `功能: ${entry.function_zh}` : '',
      entry.notes_en ? `Notes: ${entry.notes_en}` : '',
      entry.notes_zh ? `备注: ${entry.notes_zh}` : '',
    ]
      .filter(Boolean)
      .join('. ');

    console.log(`  → ${entry.inci_name} (${entry.chinese_name})`);
    await upsertRow(chunk, 'glossary', { inci_name: entry.inci_name, chinese_name: entry.chinese_name }, 'en');
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(`  ✓ ${db.entries.length} glossary entries indexed`);
}

// ------------------------------------------------------------------
// 3. Seed fun facts
// ------------------------------------------------------------------
async function seedFunFacts() {
  console.log('\n=== Seeding fun facts ===');

  for (const lang of ['en', 'zh']) {
    const path = join(ROOT, 'content', lang, 'fun-facts.json');
    let raw;
    try {
      raw = readFileSync(path, 'utf-8');
    } catch {
      console.log(`  No fun-facts.json for ${lang}, skipping`);
      continue;
    }

    const db = JSON.parse(raw);
    const facts = db.facts || [];

    for (const fact of facts) {
      const chunk = `Fun fact: ${fact.title}\n\n${fact.content}`;
      console.log(`  → [${lang}] ${fact.title}`);
      await upsertRow(chunk, 'faq', { id: fact.id, category: fact.category }, lang);
      await new Promise((r) => setTimeout(r, 250));
    }

    console.log(`  ✓ ${facts.length} fun facts indexed for ${lang}`);
  }
}

// ------------------------------------------------------------------
// 4. Seed ingredient interactions
// ------------------------------------------------------------------
async function seedInteractions() {
  console.log('\n=== Seeding interactions ===');
  const raw = readFileSync(join(ROOT, 'src/data/ingredient-interactions.json'), 'utf-8');
  const db = JSON.parse(raw);

  for (const pair of db.pairs) {
    const ingredientsStr = (pair.ingredients || []).join(' + ');
    const chunk = [
      `Interaction: ${ingredientsStr}`,
      pair.ingredients_zh?.length ? `成分: ${pair.ingredients_zh.join(' + ')}` : '',
      `Level: ${pair.level}`,
      pair.context ? `Context: ${pair.context}` : '',
      pair.warning_en || '',
      pair.warning_zh ? `中文: ${pair.warning_zh}` : '',
    ]
      .filter(Boolean)
      .join('. ');

    console.log(`  → ${ingredientsStr} (${pair.level})`);
    await upsertRow(chunk, 'interaction', { ingredients: pair.ingredients, level: pair.level, context: pair.context }, 'en');
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(`  ✓ ${db.pairs.length} interaction pairs indexed`);
}

// ------------------------------------------------------------------
// 5. Seed curated dupes (products)
// ------------------------------------------------------------------
async function seedCuratedDupes() {
  console.log('\n=== Seeding curated dupes ===');
  const raw = readFileSync(join(ROOT, 'src/data/curated-dupes.json'), 'utf-8');
  const db = JSON.parse(raw);

  for (const pair of db.pairs) {
    const orig = pair.original || {};
    const dupes = pair.dupes || [];
    const keyActives = (orig.key_actives || []).join(', ');
    const alternatives = dupes.map((d) => `${d.product_name} (${d.brand})`).join('; ');
    const notes = dupes.map((d) => d.notes_en || '').filter(Boolean).join(' ');

    const chunk = [
      `Product: ${orig.product_name} by ${orig.brand} (${orig.category})`,
      keyActives ? `Key actives: ${keyActives}` : '',
      alternatives ? `Budget alternatives: ${alternatives}` : '',
      notes,
    ]
      .filter(Boolean)
      .join('. ');

    console.log(`  → ${orig.product_name} (${orig.brand})`);
    await upsertRow(chunk, 'product', {
      pair_id: pair.id,
      original_name: orig.product_name,
      original_brand: orig.brand,
    }, 'en');
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(`  ✓ ${db.pairs.length} dupe pairs indexed`);
}

// ------------------------------------------------------------------
// 6. Seed education articles
// ------------------------------------------------------------------
async function seedArticles() {
  console.log('\n=== Seeding articles ===');

  for (const lang of ['en', 'zh']) {
    const dir = join(ROOT, 'content', lang, 'articles');
    let files;
    try {
      files = readdirSync(dir).filter((f) => f.endsWith('.md'));
    } catch {
      console.log(`  No articles directory for ${lang}, skipping`);
      continue;
    }

    for (const file of files) {
      const raw = readFileSync(join(dir, file), 'utf-8');

      // Strip frontmatter
      const body = raw.replace(/^---[\s\S]*?---\n*/, '').trim();
      // Extract title from frontmatter
      const titleMatch = raw.match(/title:\s*"(.+?)"/);
      const title = titleMatch?.[1] || file.replace('.md', '');
      const slug = file.replace('.md', '');

      // Chunk long articles into ~1500 char pieces
      const chunks = chunkText(body, 1500);

      for (let i = 0; i < chunks.length; i++) {
        const chunkContent = `Article: ${title}\n\n${chunks[i]}`;
        console.log(`  → [${lang}] ${title} (chunk ${i + 1}/${chunks.length})`);
        await upsertRow(chunkContent, 'article', { slug, title, lang, chunk: i }, lang);
        await new Promise((r) => setTimeout(r, 250));
      }
    }
  }

  console.log('  ✓ Articles indexed');
}

function chunkText(text, maxLen) {
  const paragraphs = text.split(/\n\n+/);
  const chunks = [];
  let current = '';

  for (const p of paragraphs) {
    if (current.length + p.length + 2 > maxLen && current.length > 0) {
      chunks.push(current.trim());
      current = '';
    }
    current += p + '\n\n';
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text];
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------
async function main() {
  console.log('Seeding knowledge embeddings...');

  // Clear existing rows to allow re-runs
  const { error } = await supabase.from('knowledge_embeddings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) console.warn('Could not clear old rows:', error.message);

  await seedIngredients();
  await seedGlossary();
  await seedFunFacts();
  await seedInteractions();
  await seedArticles();
  await seedCuratedDupes();

  console.log('\n✅ Done! Knowledge base seeded.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
