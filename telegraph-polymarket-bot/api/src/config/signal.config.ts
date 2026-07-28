const DEFAULT_TELEGRAPH_WS_URL = 'ws://13.237.89.59:7044/engine/ws';
const DEFAULT_INTENTS = [
  'LANGUAGE_GENERATION', 'CHAT_COMPLETION', 'TEXT_GENERATION', 'HIGH_PERFORMANCE_INFERENCE', 'EMBEDDINGS', 'CONTENT_MODERATION',
  'WEATHER_CHECK', 'STORM_ALERT', 'WEATHER_FORECAST', 'WEATHER_RISK_ASSESSMENT',
  'MULTIMODAL_INFERENCE', 'IMAGE_GENERATION', 'TEXT_TO_IMAGE',
  'TASK_COMPLETION', 'AGENT_TASK',
  'WEB_SEARCH', 'TWITTER_SEARCH', 'NEWS_SEARCH', 'RESEARCH_SYNTHESIS', 'FACT_CHECK',
  'TEXT_AUTHENTICITY_CHECK', 'AI_TEXT_DETECTION', 'CONTENT_VERIFICATION',
  'DEEPFAKE_DETECTION', 'MEDIA_AUTHENTICITY_CHECK', 'IMAGE_VERIFICATION', 'VIDEO_VERIFICATION',
];
const DEFAULT_SIM_STARTING_BALANCE_USD = 1000;
const DEFAULT_SIM_MAX_STAKE_USD = 10;
const DEFAULT_SIM_MIN_SHARES = 10;

const parseList = (raw?: string, fallback: string[] = []) => {
  if (!raw) return fallback;
  const parsed = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
};

const parseFloatEnv = (raw: string | undefined, fallback: number) => {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const SIGNAL_CONFIG = {
  telegraphWsUrl: process.env.TELEGRAPH_WS_URL || DEFAULT_TELEGRAPH_WS_URL,
  serviceWalletPrivateKey: process.env.SERVICE_WALLET_PRIVATE_KEY || '',
  intents: parseList(process.env.SIGNAL_INTENTS, DEFAULT_INTENTS),
  simStartingBalanceUsd: parseFloatEnv(process.env.SIM_STARTING_BALANCE_USD, DEFAULT_SIM_STARTING_BALANCE_USD),
  simMaxStakeUsd: parseFloatEnv(process.env.SIM_MAX_STAKE_USD, DEFAULT_SIM_MAX_STAKE_USD),
  simMinShares: parseFloatEnv(process.env.SIM_MIN_SHARES, DEFAULT_SIM_MIN_SHARES),
};
