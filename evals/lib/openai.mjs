/** Direct OpenAI calls for the eval harness (embeddings + LLM judge). */
import { CONFIG } from './env.mjs';

async function openaiFetch(path, body) {
  if (!CONFIG.openaiApiKey) throw new Error('OPENAI_API_KEY missing in .env');
  const res = await fetch(`https://api.openai.com/v1${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CONFIG.openaiApiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`OpenAI ${path} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return res.json();
}

export async function embed(text) {
  const json = await openaiFetch('/embeddings', {
    model: CONFIG.embeddingModel,
    input: text.slice(0, 8000),
  });
  return json.data[0].embedding;
}

/**
 * LLM-as-judge call. Non-streaming, temperature 0, JSON mode.
 * Returns { parsed, usage } — usage has exact token counts.
 */
export async function judge({ system, user, model = CONFIG.judgeModel }) {
  const json = await openaiFetch('/chat/completions', {
    model,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  const content = json.choices?.[0]?.message?.content ?? '{}';
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = { _parse_error: true, raw: content.slice(0, 500) };
  }
  return { parsed, usage: json.usage ?? null, model: json.model };
}
