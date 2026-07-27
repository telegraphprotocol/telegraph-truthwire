import OpenAI from 'openai';
import { LLM_CONFIG } from '../config/llm.config';

let client: OpenAI | null = null;

export function getLlmClient(): OpenAI | null {
  if (client) return client;
  if (!LLM_CONFIG.baseUrl || !LLM_CONFIG.apiKey) return null;
  client = new OpenAI({ baseURL: LLM_CONFIG.baseUrl, apiKey: LLM_CONFIG.apiKey, timeout: 30_000, maxRetries: 0 });
  return client;
}

const cleanJsonPayload = (raw: string) => {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  return raw.trim();
};

export async function callLlmJson(systemPrompt: string, userPrompt: string): Promise<any | null> {
  const openai = getLlmClient();
  if (!openai) {
    console.error('[llm] LITELLM_BASE_URL/LITELLM_API_KEY not set — skipping LLM call');
    return null;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: LLM_CONFIG.model,
      max_completion_tokens: 500,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? '';
    if (!raw) {
      console.error('[llm] empty completion content');
      return null;
    }

    try {
      return JSON.parse(cleanJsonPayload(raw));
    } catch {
      console.error('[llm] response was not valid JSON:', raw);
      return null;
    }
  } catch (err: any) {
    console.error('[llm] call failed:', err.message);
    return null;
  }
}
