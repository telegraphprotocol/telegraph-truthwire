export const LLM_CONFIG = {
  baseUrl: process.env.LITELLM_BASE_URL || '',
  apiKey: process.env.LITELLM_API_KEY || '',
  model: process.env.LITELLM_MODEL || 'nova-2-lite',
};
