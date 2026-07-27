/**
 * fetch-pubmed-references.mjs (improvement-plan 14.5b)
 *
 * Adds a "Further reading" block to src/data/ingredient-references.json.
 *
 * PubChem (fetch-references.mjs) tells you WHAT a molecule is. It cannot tell
 * you that a *claim* about it ("niacinamide brightens", "adapalene clears acne")
 * is supported. That needs the peer-reviewed literature.
 *
 * The right source is NOT scraping The Lancet / JAMA / JAAD directly (paywalls,
 * no clean API, ToS). It is Europe PMC, which INDEXES those journals (PubMed /
 * MEDLINE + PMC + Agricola + preprints) behind one free JSON API and returns a
 * real, resolvable PMID + DOI for every hit.
 *
 * For each active ingredient this queries Europe PMC for peer-reviewed REVIEW
 * articles on its dermatologic use and keeps the best-cited few. Every entry is
 * a REAL article — never hand-written. It MERGES with the file and preserves the
 * PubChem compound entries.
 *
 * Honesty note: an automated search returns reviews that are ABOUT the
 * ingredient. That is legitimate "further reading" / provenance. It is NOT a
 * per-sentence proof that a specific efficacy claim is true — the UI labels it
 * that way. Promoting a paper to "this exact claim is proven by X" is a manual
 * review step.
 *
 * Run locally (Europe PMC is generous but we go sequentially + politely):
 *   node scripts/fetch-pubmed-references.mjs
 *   node scripts/fetch-pubmed-references.mjs --per=3
 *   node scripts/fetch-pubmed-references.mjs --only=niacinamide,retinol
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(HERE, '../src/data/ingredient-references.json');

const ENDPOINT = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search';

// Active ingredients that make an efficacy/safety claim worth citing, mapped to
// the search term that best matches the dermatology literature (often the drug/
// common name rather than the raw INCI string).
const ACTIVES = {
  niacinamide: 'niacinamide',
  retinol: 'retinol',
  tretinoin: 'tretinoin',
  retinal: 'retinaldehyde',
  retinyl_palmitate: 'retinyl palmitate',
  adapalene: 'adapalene',
  ascorbic_acid: 'ascorbic acid vitamin C',
  vitamin_c_ethyl: 'ethyl ascorbic acid',
  sodium_ascorbyl_phosphate: 'sodium ascorbyl phosphate',
  ascorbyl_glucoside: 'ascorbyl glucoside',
  salicylic_acid: 'salicylic acid',
  glycolic_acid: 'glycolic acid',
  lactic_acid: 'lactic acid',
  mandelic_acid: 'mandelic acid',
  polyhydroxy_acid: 'polyhydroxy acid gluconolactone',
  azelaic_acid: 'azelaic acid',
  benzoyl_peroxide: 'benzoyl peroxide',
  bakuchiol: 'bakuchiol',
  tranexamic_acid: 'tranexamic acid melasma',
  kojic_acid: 'kojic acid',
  alpha_arbutin: 'arbutin',
  hydroquinone: 'hydroquinone',
  zinc_oxide: 'zinc oxide sunscreen',
  titanium_dioxide: 'titanium dioxide sunscreen',
  avobenzone: 'avobenzone sunscreen',
  tea_tree_oil: 'tea tree oil',
  ceramides: 'ceramide skin barrier',
  hyaluronic_acid: 'hyaluronic acid',
  panthenol: 'panthenol dexpanthenol',
  allantoin: 'allantoin',
  centella_asiatica: 'centella asiatica',
  madecassoside: 'madecassoside',
  bisabolol: 'bisabolol',
  ferulic_acid: 'ferulic acid',
  resveratrol: 'resveratrol skin',
  tocopherol: 'tocopherol vitamin E skin',
  sulfur: 'sulfur acne',
  ectoin: 'ectoine',
  urea: 'urea skin',
  squalane: 'squalane',
};

const args = process.argv.slice(2);
const getArg = (k, d) => {
  const hit = args.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.split('=')[1] : d;
};
const PER = Math.max(1, Number(getArg('per', '2')) || 2);
const ONLY = (getArg('only', '') || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function searchReviews(term, attempt = 0) {
  const query = `"${term}" AND (skin OR dermatolog* OR cutaneous) AND PUB_TYPE:"review"`;
  const url =
    `${ENDPOINT}?query=${encodeURIComponent(query)}` +
    `&format=json&pageSize=25&resultType=lite`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (res.status === 429 || res.status === 503) {
      if (attempt < 3) {
        await sleep(2000 * (attempt + 1));
        return searchReviews(term, attempt + 1);
      }
      return [];
    }
    if (!res.ok) return [];
    const data = await res.json();
    return data?.resultList?.result ?? [];
  } catch {
    if (attempt < 3) {
      await sleep(2000 * (attempt + 1));
      return searchReviews(term, attempt + 1);
    }
    return [];
  }
}

// Generic words in a search term that shouldn't count as an on-topic title match.
const TERM_STOP = new Set(['skin', 'acne', 'sunscreen', 'melasma', 'cutaneous', 'barrier']);

/** The distinctive words of a search term (e.g. "azelaic acid" -> ["azelaic","acid"]). */
function coreTerms(term) {
  return term
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !TERM_STOP.has(w));
}

/**
 * Pick the best `PER` reviews. On-topic wins first: a review with the ingredient
 * in its TITLE beats a more-cited one that merely mentions it (avoids surfacing a
 * heavily-cited paper that's only tangentially about the ingredient). Then break
 * ties by citation count, then recency.
 */
function pickBest(results, term) {
  const cores = coreTerms(term);
  return results
    .filter((r) => r.pmid && r.title && r.journalTitle)
    .map((r) => {
      const title = String(r.title).toLowerCase();
      const onTopic = cores.filter((c) => title.includes(c)).length;
      return { r, onTopic };
    })
    .sort((a, b) => {
      if (b.onTopic !== a.onTopic) return b.onTopic - a.onTopic;
      const c = (Number(b.r.citedByCount) || 0) - (Number(a.r.citedByCount) || 0);
      if (c !== 0) return c;
      return (Number(b.r.pubYear) || 0) - (Number(a.r.pubYear) || 0);
    })
    .slice(0, PER)
    .map(({ r }) => {
      const entry = {
        type: 'literature',
        title: String(r.title).replace(/\.\s*$/, ''),
        journal: r.journalTitle,
        year: r.pubYear,
        pmid: r.pmid,
        url: `https://europepmc.org/article/MED/${r.pmid}`,
      };
      if (r.doi) entry.doi = r.doi;
      return entry;
    });
}

async function main() {
  let out = {};
  try {
    out = JSON.parse(readFileSync(OUT_PATH, 'utf8'));
  } catch {
    /* first run — file will be created */
  }

  const ids = Object.keys(ACTIVES).filter((id) => ONLY.length === 0 || ONLY.includes(id));
  let added = 0;
  let empty = 0;

  for (const id of ids) {
    const results = await searchReviews(ACTIVES[id]);
    await sleep(300); // be polite to Europe PMC
    const literature = pickBest(results, ACTIVES[id]);

    if (literature.length === 0) {
      empty++;
      process.stdout.write('x');
      continue;
    }

    // Keep existing compound (PubChem) entries; replace literature ones.
    const prior = Array.isArray(out[id]) ? out[id] : [];
    const compound = prior.filter((r) => r?.type !== 'literature');
    out[id] = [...compound, ...literature];
    added += literature.length;
    process.stdout.write('.');
  }

  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log(
    `\nAdded ${added} literature refs across ${ids.length - empty}/${ids.length} ingredients` +
      ` (${PER}/ingredient max) · wrote ${OUT_PATH}`,
  );
}

main().catch((err) => {
  console.error('fetch-pubmed-references failed:', err);
  process.exit(1);
});
