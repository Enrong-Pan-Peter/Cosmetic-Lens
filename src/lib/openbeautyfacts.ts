interface ProductSearchResult {
  product_name: string;
  brands?: string;
  ingredients_text?: string;
  ingredients_text_en?: string;
  ingredients_text_zh?: string;
  image_url?: string;
  categories?: string;
}

interface SearchResponse {
  count: number;
  products: ProductSearchResult[];
}

const BASE_URL = 'https://world.openbeautyfacts.org';
const USER_AGENT = 'CosmeticLens/1.0 (https://cosmeticlens.com)';
const REQUEST_TIMEOUT_MS = 5000;

function fetchWithTimeout(url: string, options: RequestInit & { timeout?: number } = {}): Promise<Response> {
  const { timeout = REQUEST_TIMEOUT_MS, ...fetchOptions } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...fetchOptions, signal: controller.signal }).finally(() => clearTimeout(id));
}

export async function searchProduct(query: string): Promise<ProductSearchResult | null> {
  try {
    const url = new URL(`${BASE_URL}/cgi/search.pl`);
    url.searchParams.set('search_terms', query);
    url.searchParams.set('json', '1');
    url.searchParams.set('page_size', '5');
    url.searchParams.set('fields', 'product_name,brands,ingredients_text,ingredients_text_en,image_url,categories');

    const response = await fetchWithTimeout(url.toString(), {
      headers: { 'User-Agent': USER_AGENT },
      timeout: REQUEST_TIMEOUT_MS,
    });

    if (!response.ok) {
      console.error('Open Beauty Facts error:', response.status);
      return null;
    }

    const data: SearchResponse = await response.json();

    if (!data.products || data.products.length === 0) {
      return null;
    }

    const productWithIngredients = data.products.find(p =>
      p.ingredients_text || p.ingredients_text_en
    );

    return productWithIngredients || data.products[0];

  } catch (error) {
    console.error('Open Beauty Facts search error:', error);
    return null;
  }
}

export async function getProductByBarcode(barcode: string): Promise<ProductSearchResult | null> {
  try {
    const url = `${BASE_URL}/api/v0/product/${barcode}.json`;

    const response = await fetchWithTimeout(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: REQUEST_TIMEOUT_MS,
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.status !== 1 || !data.product) {
      return null;
    }

    return data.product;

  } catch (error) {
    console.error('Open Beauty Facts barcode lookup error:', error);
    return null;
  }
}

export function extractIngredients(product: ProductSearchResult, preferredLang: 'en' | 'zh' = 'en'): string | null {
  if (preferredLang === 'en' && product.ingredients_text_en) {
    return product.ingredients_text_en;
  }

  if (product.ingredients_text) {
    return product.ingredients_text;
  }

  return null;
}
