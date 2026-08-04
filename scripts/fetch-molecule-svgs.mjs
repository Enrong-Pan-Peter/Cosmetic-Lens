/**
 * Fetch skeletal-structure SVGs from PubChem for every ingredient that has a
 * compound reference, recolor them to the design tokens (ink bonds, petrol
 * heteroatoms), and write them to public/images/molecules/{id}.svg.
 *
 * Usage:  node scripts/fetch-molecule-svgs.mjs [--only id1,id2] [--force]
 *
 * After running, update MOLECULE_SVGS in
 * src/components/ingredients/IngredientDetail.astro with the printed list.
 * Polite to PubChem: one request every 350 ms, skips files that already exist.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT_DIR = path.join(ROOT, 'public/images/molecules');
const REFS = JSON.parse(readFileSync(path.join(ROOT, 'src/data/ingredient-references.json'), 'utf8'));

const args = process.argv.slice(2);
const force = args.includes('--force');
const onlyArg = args.find(a => a.startsWith('--only'));
const only = onlyArg ? args[args.indexOf(onlyArg) + (onlyArg === '--only' ? 1 : 0)].replace('--only=', '').split(',') : null;

// Ink bonds + petrol heteroatoms, matching the token values in global.css.
const INK = '#232D3A';
const PETROL = '#0B6F8E';

function recolor(svg) {
  return svg
    .replaceAll('#000000', INK)
    .replaceAll('#0000FF', PETROL) // N
    .replaceAll('#FF0000', PETROL) // O
    .replaceAll('#00CC00', PETROL) // Cl (rare)
    .replaceAll('#FF8000', PETROL); // P/S variants (rare)
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

mkdirSync(OUT_DIR, { recursive: true });
const done = [];
const failed = [];

for (const [id, refs] of Object.entries(REFS)) {
  if (only && !only.includes(id)) continue;
  const cid = (Array.isArray(refs) ? refs : [refs]).find(r => r && r.cid)?.cid;
  if (!cid) continue;

  const out = path.join(OUT_DIR, `${id}.svg`);
  if (existsSync(out) && !force) {
    done.push(id);
    continue;
  }

  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/record/SVG`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Cosmetic-Lens molecule fetch (educational)' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const svg = await res.text();
    if (!svg.includes('<svg')) throw new Error('not an SVG response');
    writeFileSync(out, recolor(svg));
    done.push(id);
    console.log(`ok    ${id} (CID ${cid})`);
  } catch (e) {
    failed.push(id);
    console.warn(`fail  ${id} (CID ${cid}): ${e.message}`);
  }
  await sleep(350);
}

console.log(`\n${done.length} SVGs in public/images/molecules, ${failed.length} failed.`);
console.log('\nPaste into IngredientDetail.astro:\n');
console.log(`const MOLECULE_SVGS = new Set(${JSON.stringify(done.sort())});`);
