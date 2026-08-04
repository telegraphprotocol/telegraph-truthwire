const DEFAULT_TELEGRAPH_BASE_URL = 'http://54.252.48.30:7044';
const DEFAULT_MARKET_FETCH_LIMIT = 3;
const DEFAULT_MARKET_FETCH_CANDIDATE_LIMIT = 30;
const DEFAULT_KEYWORDS = ['Strait of Hormuz'];
const DEFAULT_NEWS_CALL_DELAY_MS = 1200;
const DEFAULT_NEWS_RETRY_MAX_ATTEMPTS = 2;
const DEFAULT_NEWS_RETRY_BASE_DELAY_MS = 1000;

const parseKeywords = (raw?: string) => {
  if (!raw) return DEFAULT_KEYWORDS;
  const parsed = raw
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : DEFAULT_KEYWORDS;
};

const parsePositiveInt = (raw: string | undefined, fallback: number) => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

export const MARKET_MONITOR_CONFIG = {
  telegraphBaseUrl: process.env.TELEGRAPH_BASE_URL || DEFAULT_TELEGRAPH_BASE_URL,
  marketFetchLimit: Math.min(parsePositiveInt(process.env.MARKET_FETCH_LIMIT, DEFAULT_MARKET_FETCH_LIMIT), 3),
  marketFetchCandidateLimit: Math.max(
    parsePositiveInt(process.env.MARKET_FETCH_CANDIDATE_LIMIT, DEFAULT_MARKET_FETCH_CANDIDATE_LIMIT),
    DEFAULT_MARKET_FETCH_LIMIT
  ),
  keywords: parseKeywords(process.env.MARKET_MONITOR_KEYWORDS),
  llmChatPath: '/subnet-dispatcher/v1/102/chat',
  newsPath: '/subnet-dispatcher/v1/101/search/mini',
  newsCallDelayMs: parsePositiveInt(process.env.TELEGRAPH_NEWS_CALL_DELAY_MS, DEFAULT_NEWS_CALL_DELAY_MS),
  newsRetryMaxAttempts: parsePositiveInt(process.env.TELEGRAPH_NEWS_RETRY_MAX_ATTEMPTS, DEFAULT_NEWS_RETRY_MAX_ATTEMPTS),
  newsRetryBaseDelayMs: parsePositiveInt(process.env.TELEGRAPH_NEWS_RETRY_BASE_DELAY_MS, DEFAULT_NEWS_RETRY_BASE_DELAY_MS),
};

