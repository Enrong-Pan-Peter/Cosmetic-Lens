/**
 * Seed script: reads ingredients + articles, generates embeddings, stores in Supabase.
 *
 * Usage:
 *   node scripts/seed-embeddings.mjs
 *
 * Requires: OPENAI_API_KEY, PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env
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
// 2. Seed education articles
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
  await seedArticles();

  console.log('\n✅ Done! Knowledge base seeded.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
