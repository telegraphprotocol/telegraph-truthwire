import { MARKET_MONITOR_CONFIG } from '../config/market-monitor.config';
import { getX402Fetch, extractTxHash } from '../utils/x402Fetch';

export interface RelatedNewsItem {
  title: string;
  source: string;
  url: string | null;
  summary: string;
}

export interface NewsFetchMeta {
  retriesAttempted: number;
  rateLimitEncountered: boolean;
  groqTxHash: string | null;
}

export interface NewsFetchResult {
  items: RelatedNewsItem[];
  meta: NewsFetchMeta;
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const extractUrl = (text: string): string | null => {
  const match = text.match(/https?:\/\/\S+/i);
  return match ? match[0].replace(/[),.;]+$/, '') : null;
};

const extractSourceFromUrl = (url: string | null) => {
  if (!url) return 'telegraph-groqqle';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'telegraph-groqqle';
  }
};

const parseRetryAfterMs = (retryAfterHeader: string | number | undefined): number | null => {
  if (!retryAfterHeader) return null;
  if (typeof retryAfterHeader === 'number') return retryAfterHeader * 1000;
  const asNumber = Number(retryAfterHeader);
  if (Number.isFinite(asNumber)) return asNumber * 1000;
  const asDate = Date.parse(retryAfterHeader);
  if (Number.isNaN(asDate)) return null;
  return Math.max(asDate - Date.now(), 0);
};

const toRelatedNewsItemsFromStructuredResults = (results: any[]): RelatedNewsItem[] => {
  return results
    .filter((item) => item && typeof item === 'object')
    .slice(0, 3)
    .map((item, idx) => {
      const url = typeof item.url === 'string' ? item.url : null;
      const summary =
        typeof item.content === 'string' ? item.content.replace(/\s+/g, ' ').trim().slice(0, 320) : '';
      return {
        title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : `Related News ${idx + 1}`,
        source: extractSourceFromUrl(url),
        url,
        summary: summary || 'No summary available',
      };
    });
};

const toRelatedNewsItemsFromContent = (content: string): RelatedNewsItem[] => {
  const lines = content
    .split('\n')
    .map((line: string) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('|') && !line.startsWith('---'))
    .slice(0, 3);

  return lines.map((line: string, idx: number) => {
    const url = extractUrl(line);
    return {
      title: `Related News ${idx + 1}`,
      source: extractSourceFromUrl(url),
      url,
      summary: line,
    };
  });
};

const isRetryableError = (error: any): boolean => {
  const code = error?.code;
  return ['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT', 'TimeoutError'].includes(
    code ?? error?.name
  );
};

export class TelegraphNewsService {
  static async searchRelatedNews(query: string): Promise<RelatedNewsItem[]> {
    const result = await this.searchRelatedNewsWithMeta(query);
    return result.items;
  }

  static async searchRelatedNewsWithMeta(query: string): Promise<NewsFetchResult> {
    const url = `${MARKET_MONITOR_CONFIG.telegraphBaseUrl}${MARKET_MONITOR_CONFIG.newsPath}`;

    // Keep request shape aligned with example-telegraph integration/test-groqqle.ts.
    const body = {
      model: 'groq/compound-mini',
      messages: [
        {
          role: 'user',
          content: `Find recent news related to this prediction market: ${query}. Return concise findings.`,
        },
      ],
      max_tokens: 300,
    };

    let retriesAttempted = 0;
    let rateLimitEncountered = false;
    let groqTxHash: string | null = null;
    const maxAttempts = Math.max(1, MARKET_MONITOR_CONFIG.newsRetryMaxAttempts + 1);

    const fetchWithPayment = await getX402Fetch();

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await fetchWithPayment(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(20000),
        });

        groqTxHash = extractTxHash(response.headers);

        if (!response.ok) {
          const status = response.status;
          if (status === 402) {
            console.error(`Telegraph news lookup failed for "${query}": x402 payment failed — check SOLANA_PRIVATE_KEY and Solana USDC balance`);
            return { items: [], meta: { retriesAttempted, rateLimitEncountered, groqTxHash } };
          }
          if (status === 429) rateLimitEncountered = true;
          const retryable = status === 429 || status >= 500;
          if (!retryable || attempt === maxAttempts) {
            console.error(`Telegraph news lookup failed for "${query}": HTTP ${status}`);
            return { items: [], meta: { retriesAttempted, rateLimitEncountered, groqTxHash } };
          }
          retriesAttempted += 1;
          const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after') ?? undefined);
          await sleep(retryAfterMs ?? MARKET_MONITOR_CONFIG.newsRetryBaseDelayMs * retriesAttempted);
          continue;
        }

        const data = await response.json();
        const structuredResults =
          data?.choices?.[0]?.message?.executed_tools?.[0]?.search_results?.results;
        const byStructured = Array.isArray(structuredResults)
          ? toRelatedNewsItemsFromStructuredResults(structuredResults)
          : [];
        if (byStructured.length > 0) {
          return { items: byStructured, meta: { retriesAttempted, rateLimitEncountered, groqTxHash } };
        }

        const content = data?.choices?.[0]?.message?.content;
        if (!content || typeof content !== 'string') {
          return { items: [], meta: { retriesAttempted, rateLimitEncountered, groqTxHash } };
        }

        return {
          items: toRelatedNewsItemsFromContent(content),
          meta: { retriesAttempted, rateLimitEncountered, groqTxHash },
        };
      } catch (error: any) {
        const retryable = isRetryableError(error);
        if (!retryable || attempt === maxAttempts) {
          console.error(`Telegraph news lookup failed for "${query}":`, error.message);
          return { items: [], meta: { retriesAttempted, rateLimitEncountered, groqTxHash } };
        }
        retriesAttempted += 1;
        await sleep(MARKET_MONITOR_CONFIG.newsRetryBaseDelayMs * retriesAttempted);
      }
    }

    return { items: [], meta: { retriesAttempted, rateLimitEncountered, groqTxHash } };
  }
}

