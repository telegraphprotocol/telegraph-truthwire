import axios from 'axios';
import { MARKET_MONITOR_CONFIG } from '../config/market-monitor.config';

export interface PolymarketEvent {
  id: string;
  title: string;
  ticker: string;
  slug: string;
  description: string;
  startDate: string;
  endDate: string;
  image: string;
  icon: string;
  active: boolean;
  closed: boolean;
  liquidity: number;
  volume: number;
  markets: any[];
}

const polymarketAxios = axios.create({
  baseURL: 'https://gamma-api.polymarket.com',
  timeout: 15000,
  headers: { 'User-Agent': 'Mozilla/5.0 (verified-sniper-bot)' },
  // Never throw on HTTP errors — handle status codes manually
  validateStatus: () => true,
});

export class PolymarketService {
  private static MIN_RELEVANCE_SCORE = 1;
  private static IRRELEVANT_TERMS = ['overwatch', 'bo3', 'gaming', 'esports', 'stage'];

  static async searchTopMarkets(keyword: string, limit = MARKET_MONITOR_CONFIG.marketFetchLimit): Promise<PolymarketEvent[]> {
    const safeLimit = Math.max(1, Math.min(limit, 3));

    try {
      // ── Step 1: public-search ────────────────────────────────────────────
      const queryVariants = this.buildQueryVariants(keyword);
      const publicSearchCandidates = await this.fetchPublicSearch(queryVariants, MARKET_MONITOR_CONFIG.marketFetchCandidateLimit);

      const activeCandidates = publicSearchCandidates.filter(e => e?.active && !e?.closed);
      const activeRelevant = this.scoreCandidates(keyword, activeCandidates)
        .filter(({ score }) => score >= this.MIN_RELEVANCE_SCORE)
        .sort((a, b) => b.score - a.score || (b.event.liquidity || 0) - (a.event.liquidity || 0))
        .map(({ event }) => event);

      if (activeRelevant.length >= safeLimit) {
        return activeRelevant.slice(0, safeLimit);
      }

      // ── Step 2: targeted events endpoint as fallback ─────────────────────
      const selectedKeys = new Set(activeRelevant.map(e => e.id || e.slug || e.title));
      const finalMarkets = [...activeRelevant];

      const eventsFallback = await this.fetchEventsByKeyword(keyword);
      for (const event of eventsFallback) {
        if (finalMarkets.length >= safeLimit) break;
        const key = event.id || event.slug || event.title;
        if (!key || selectedKeys.has(key)) continue;
        selectedKeys.add(key);
        finalMarkets.push(event);
      }

      return finalMarkets;

    } catch (error: any) {
      const status = error?.response?.status;
      const detail = status ? `HTTP ${status}` : error.message;
      console.error(`Polymarket search failed for keyword "${keyword}": ${detail}`);
      return [];
    }
  }

  // Unscored candidate pool for LLM-based matching — deliberately skips
  // scoreCandidates/MIN_RELEVANCE_SCORE filtering. Keyword/IDF scoring can't
  // tell "same topic, but a resolved/past instance" from "the live market",
  // so instead of pre-filtering we hand the LLM every active candidate and
  // let it judge relevance and liveness together.
  static async fetchCandidates(questionText: string, limit = 20): Promise<PolymarketEvent[]> {
    const queryVariants = this.buildQueryVariants(questionText);
    const candidates = await this.fetchPublicSearch(queryVariants, Math.max(limit, 20));
    return candidates.filter((e) => e?.active && !e?.closed).slice(0, limit);
  }

  private static async fetchPublicSearch(queryVariants: string[], candidateLimit: number): Promise<PolymarketEvent[]> {
    const allCandidates: PolymarketEvent[] = [];
    const seenIds = new Set<string>();

    for (const query of queryVariants) {
      try {
        const response = await polymarketAxios.get('/public-search', {
          params: { q: query, limit: candidateLimit },
        });

        if (response.status !== 200) {
          console.warn(`public-search returned HTTP ${response.status} for query "${query}"`);
          continue;
        }

        for (const event of response.data?.events || []) {
          const key = event?.id || event?.slug || event?.title;
          if (!key || seenIds.has(key)) continue;
          seenIds.add(key);
          allCandidates.push(event);
        }
      } catch (err: any) {
        console.warn(`public-search request failed for query "${query}": ${err.message}`);
      }
    }

    return allCandidates;
  }

  private static async fetchEventsByKeyword(keyword: string): Promise<PolymarketEvent[]> {
    try {
      // Use public-search with a larger limit rather than fetching all events
      const response = await polymarketAxios.get('/public-search', {
        params: { q: keyword, limit: 50 },
      });

      if (response.status !== 200) {
        console.warn(`events fallback returned HTTP ${response.status} for keyword "${keyword}"`);
        return [];
      }

      const events: PolymarketEvent[] = response.data?.events || [];
      const activeEvents = events.filter(e => e?.active && !e?.closed);

      return this.scoreCandidates(keyword, activeEvents)
        .filter(({ score }) => score >= this.MIN_RELEVANCE_SCORE)
        .sort((a, b) => b.score - a.score || (b.event.liquidity || 0) - (a.event.liquidity || 0))
        .map(({ event }) => event);
    } catch (err: any) {
      console.warn(`events fallback failed for keyword "${keyword}": ${err.message}`);
      return [];
    }
  }

  static formatMarketSummary(event: PolymarketEvent) {
    const markets = Array.isArray(event.markets) ? event.markets : [];
    const parseOutcomePrices = (market: any): [string, string] | null => {
      if (!market?.outcomePrices) return null;
      try {
        const prices = typeof market.outcomePrices === 'string' ? JSON.parse(market.outcomePrices) : market.outcomePrices;
        if (!Array.isArray(prices) || prices.length < 2) return null;
        return [String(prices[0]), String(prices[1])];
      } catch {
        return null;
      }
    };
    const marketLiquidity = (market: any) => {
      const numeric = Number(market?.liquidityNum ?? market?.liquidity ?? 0);
      return Number.isFinite(numeric) ? numeric : 0;
    };
    const rankMarket = (market: any) => {
      const activeOpen = market?.active === true && market?.closed !== true ? 1 : 0;
      const acceptingOrders = market?.acceptingOrders === true ? 1 : 0;
      const hasPrices = parseOutcomePrices(market) ? 1 : 0;
      return [activeOpen, acceptingOrders, hasPrices, marketLiquidity(market)] as const;
    };
    const sortedMarkets = [...markets].sort((a, b) => {
      const left = rankMarket(a);
      const right = rankMarket(b);
      for (let i = 0; i < left.length; i += 1) {
        if (right[i] !== left[i]) return right[i] - left[i];
      }
      return 0;
    });
    const mainMarket = sortedMarkets[0] || null;
    const mainMarketOpen = mainMarket ? mainMarket.active === true && mainMarket.closed !== true : false;
    const [yesRaw, noRaw] = mainMarket ? parseOutcomePrices(mainMarket) || ['0', '0'] : ['0', '0'];
    const formatCents = (raw: string) => {
      const value = Number(raw);
      if (!Number.isFinite(value)) return 'N/A';
      const cents = value * 100;
      const formatted = cents.toFixed(cents < 1 ? 2 : 1).replace(/\.0$/, '').replace(/(\.\d*[1-9])0$/, '$1');
      return `${formatted}¢`;
    };

    return {
      title: event.title,
      slug: event.slug,
      liquidity: `$${(event.liquidity || 0).toLocaleString()}`,
      volume: `$${(event.volume || 0).toLocaleString()}`,
      yesPrice: formatCents(yesRaw),
      noPrice: formatCents(noRaw),
      url: `https://polymarket.com/event/${event.slug}`,
      // Require both the event and the actual traded sub-market to be open —
      // an event can stay "active" while its top-ranked sub-market has closed.
      active: Boolean(event.active) && !event.closed && mainMarketOpen,
    };
  }

  // Polymarket's public-search performs poorly on full natural-language
  // questions (generic filler words and punctuation pull in unrelated,
  // often-closed events) but performs well on the stripped-down content
  // words. We try both and merge candidates, and score matches on the
  // stripped-down terms only.
  private static readonly STOPWORDS = new Set([
    'will', 'the', 'a', 'an', 'is', 'are', 'be', 'to', 'of', 'in', 'on', 'by',
    'or', 'and', 'that', 'this', 'it', 'do', 'does', 'did', 'has', 'have',
  ]);

  private static buildQueryVariants(keyword: string): string[] {
    const base = keyword.trim();
    const variants = [base];
    const lower = base.toLowerCase();

    if (lower.includes('fuel') || lower.includes('oil') || lower.includes('gas')) {
      variants.push(`${base} oil`, `${base} energy`, 'oil price');
    }

    const stripped = this.significantTerms(base).join(' ');
    if (stripped && stripped.toLowerCase() !== base.toLowerCase()) {
      variants.push(stripped);
    }

    return [...new Set(variants)];
  }

  private static significantTerms(keyword: string): string[] {
    return keyword
      .toLowerCase()
      .replace(/[?.,!]/g, '')
      .split(/\s+/)
      .filter((term) => term && !this.STOPWORDS.has(term));
  }

  // IDF-weighted, title-only scoring over the candidate pool. Polymarket
  // reuses near-identical boilerplate description text across whole
  // families of related markets (e.g. every market in an "AI export
  // control" series), so a rare query term can leak into a sibling
  // market's description and inflate its score for the wrong event —
  // the title is the only reliably distinguishing text, so descriptions
  // are ignored entirely for scoring. Within titles, a term that appears
  // in most candidates (e.g. "open" across a batch of AI-policy markets)
  // carries little distinguishing power, while a term only a couple of
  // candidates share (e.g. "chinese") is what actually tells them apart —
  // so rarer terms are weighted higher via IDF.
  private static scoreCandidates(
    keyword: string,
    events: PolymarketEvent[]
  ): { event: PolymarketEvent; score: number }[] {
    const terms = this.significantTerms(keyword);
    const total = events.length;
    const titles = events.map((e) => `${e?.title || ''}`.toLowerCase());

    const docFrequency = new Map<string, number>();
    for (const term of terms) {
      const count = titles.filter((title) => title.includes(term)).length;
      docFrequency.set(term, count);
    }
    const idf = (term: string) => Math.log((total + 1) / ((docFrequency.get(term) || 0) + 1)) + 1;

    return events.map((event, i) => {
      const title = titles[i];
      let score = 0;
      let titleHits = 0;

      for (const term of terms) {
        if (title.includes(term)) {
          score += idf(term);
          titleHits += 1;
        }
      }

      // Reward titles that cover a larger share of the query's terms, so a
      // fuller match outranks a partial match padded by one rare word.
      if (terms.length > 0) score *= 1 + titleHits / terms.length;

      for (const blocked of this.IRRELEVANT_TERMS) {
        if (title.includes(blocked)) score -= 5;
      }

      return { event, score };
    });
  }
}
