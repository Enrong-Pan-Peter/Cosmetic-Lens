import type { APIRoute } from 'astro';
import { searchProduct, extractIngredients } from '../../lib/openbeautyfacts';

export const GET: APIRoute = async ({ url }) => {
  try {
    const query = url.searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({
        success: false,
        error: 'invalid_query',
        message: 'Please provide a search query (at least 2 characters)'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const product = await searchProduct(query.trim());

    if (!product) {
      return new Response(JSON.stringify({
        success: false,
        error: 'product_not_found',
        message: 'No product found matching your search'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const ingredients = extractIngredients(product, 'en');

    return new Response(JSON.stringify({
      success: true,
      data: {
        name: product.product_name,
        brand: product.brands,
        ingredients: ingredients,
        image: product.image_url,
        categories: product.categories
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Search product error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'internal_error',
      message: 'Failed to search products'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
