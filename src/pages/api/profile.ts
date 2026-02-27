import type { APIRoute } from 'astro';
import { createServerClient } from '../../lib/supabase';

export const GET: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'unauthorized' }), { status: 401 });
    }

    const supabase = createServerClient();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'unauthorized' }), { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return new Response(JSON.stringify({ success: true, data: profile || null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Profile GET error:', error);
    return new Response(JSON.stringify({ success: false, error: 'internal_error' }), { status: 500 });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'unauthorized' }), { status: 401 });
    }

    const supabase = createServerClient();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'unauthorized' }), { status: 401 });
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
      preferred_language,
    } = body;

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
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data: profile }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Profile PUT error:', error);
    return new Response(JSON.stringify({ success: false, error: 'internal_error' }), { status: 500 });
  }
};
