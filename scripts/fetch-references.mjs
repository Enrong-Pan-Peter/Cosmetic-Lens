/**
 * fetch-references.mjs (improvement-plan 14.5)
 *
 * Regenerates src/data/ingredient-references.json by resolving each single-
 * compound ingredient to its authoritative PubChem compound page via PubChem
 * PUG REST (name -> CID). Sources are REAL + verifiable — never hand-written.
 *
 * Run locally (PubChem rate-limits bursts, ~5 req/s; this goes sequentially
 * with a delay):
 *   node scripts/fetch-references.mjs
 *
 * Skips mixtures / extracts / ferments / peptide blends (no single CID). It
 * MERGES with the existing file, so already-verified entries survive a run
 * where PubChem throttles a request.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(HERE, '../src/data/ingredients-database.json');
const OUT_PATH = join(HERE, '../src/data/ingredient-references.json');

// Not single, well-defined compounds → no meaningful single PubChem page.
const SKIP = new Set([
  'fragrance', 'centella_asiatica', 'ceramides', 'snail_mucin', 'propolis_extract',
  'mugwort_extract', 'galactomyces_ferment', 'saccharomyces_ferment', 'cica_complex',
  'colloidal_oatmeal', 'hemp_seed_oil', 'niacinamide_zinc', 'copper_peptide',
  'palmitoyl_pentapeptide_4', 'palmitoyl_tripeptide_1', 'acetyl_hexapeptide_8',
  'polysorbate_80', 'cetearyl_glucoside', 'cocamidopropyl_betaine',
  'sodium_cocoyl_isethionate', 'aqua',
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function resolveCid(name, attempt = 0) {
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}/cids/JSON`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (res.status === 503 || res.status === 429) {
      if (attempt < 3) {
        await sleep(2000 * (attempt + 1));
        return resolveCid(name, attempt + 1);
      }
      return null;
    }
    if (!res.ok) return null;
    const data = await res.json();
    const cid = data?.IdentifierList?.CID?.[0];
    return typeof cid === 'number' ? cid : null;
  } catch {
    if (attempt < 3) {
      await sleep(2000 * (attempt + 1));
      return resolveCid(name, attempt + 1);
    }
    return null;
  }
}

async function main() {
  const db = JSON.parse(readFileSync(DB_PATH, 'utf8'));
  let existing = {};
  try {
    existing = JSON.parse(readFileSync(OUT_PATH, 'utf8'));
  } catch {
    /* first run */
  }

  const out = { ...existing };
  let resolved = 0;
  let kept = 0;

  for (const ing of db.ingredients) {
    if (SKIP.has(ing.id)) continue;
    const cid = await resolveCid(ing.inci_name);
    await sleep(250); // be polite to PubChem
    if (cid) {
      // Preserve any "Further reading" literature entries added by
      // fetch-pubmed-references.mjs so a PubChem re-run doesn't wipe them.
      const prior = Array.isArray(out[ing.id]) ? out[ing.id] : [];
      const literature = prior.filter((r) => r?.type === 'literature');
      out[ing.id] = [
        { type: 'compound', label: 'PubChem', url: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`, cid },
        ...literature,
      ];
      resolved++;
      process.stdout.write('.');
    } else if (out[ing.id]) {
      kept++;
      process.stdout.write('=');
    } else {
      process.stdout.write('x');
    }
  }

  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log(`\nResolved ${resolved} · kept ${kept} existing · wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error('fetch-references failed:', err);
  process.exit(1);
});
