import { MARKET_MONITOR_CONFIG } from '../config/market-monitor.config';
import { PolymarketService } from './polymarket.service';
import { RelatedNewsItem, sleep, TelegraphNewsService } from './telegraph-news.service';
import { LlmDecision, TelegraphLlmService } from './telegraph-llm.service';
import prisma from '../utils/prisma';

interface MarketSummary {
  title: string;
  slug: string;
  liquidity: string;
  volume: string;
  yesPrice: string;
  noPrice: string;
  url: string;
  active: boolean;
}

interface DecisionItem {
  keyword: string;
  market: MarketSummary;
  relatedNews: RelatedNewsItem[];
  decision: LlmDecision;
  diagnostics?: {
    newsFetched: boolean;
    retriesAttempted: number;
    rateLimitEncountered: boolean;
    delayAppliedMs: number;
    warning?: string;
    groqTxHash: string | null;
    llmTxHash: string | null;
  };
}

export interface PipelineRunResult {
  startedAt: string;
  completedAt: string;
  keywords: string[];
  counts: {
    marketsAnalyzed: number;
    skippedInactive: number;
    buy: number;
    wait: number;
  };
  decisions: DecisionItem[];
  contextSummary: string;
}

const marketKey = (market: MarketSummary) => market.slug || market.title.toLowerCase();

export class MarketDecisionService {
  static async runDecisionPipelineOnce(trigger: 'cron' | 'manual' = 'manual'): Promise<PipelineRunResult> {
    const startedAt = new Date().toISOString();
    const runRecord = await prisma.decisionRun.create({
      data: {
        startedAt: new Date(startedAt),
        trigger,
        keywords: MARKET_MONITOR_CONFIG.keywords,
      },
    });

    const marketMap = new Map<string, { keyword: string; market: MarketSummary }>();
    let skippedInactive = 0;

    for (const keyword of MARKET_MONITOR_CONFIG.keywords) {
      const markets = await PolymarketService.searchTopMarkets(keyword, MARKET_MONITOR_CONFIG.marketFetchLimit);
      for (const event of markets) {
        const summary = PolymarketService.formatMarketSummary(event as any);
        if (!summary.active) {
          skippedInactive += 1;
          continue;
        }
        const key = marketKey(summary);
        if (!marketMap.has(key)) {
          marketMap.set(key, { keyword, market: summary });
        }
      }
    }

    const decisions: DecisionItem[] = [];
    let isFirstMarketNewsCall = true;
    for (const item of marketMap.values()) {
      const perMarketNewsDelayMs = 10_000;
      let delayAppliedMs = 0;
      if (!isFirstMarketNewsCall) {
        delayAppliedMs = perMarketNewsDelayMs;
        await sleep(delayAppliedMs);
      }
      isFirstMarketNewsCall = false;

      const newsQuery = `${item.keyword} ${item.market.title}`.trim();
      const newsResult = await TelegraphNewsService.searchRelatedNewsWithMeta(newsQuery);
      const relatedNews = newsResult.items;
      const decision = await TelegraphLlmService.decideMarketAction({
        keyword: item.keyword,
        market: item.market,
        relatedNews,
      });

      const decisionItem: DecisionItem = {
        keyword: item.keyword,
        market: item.market,
        relatedNews,
        decision,
        diagnostics: {
          newsFetched: relatedNews.length > 0,
          retriesAttempted: newsResult.meta.retriesAttempted,
          rateLimitEncountered: newsResult.meta.rateLimitEncountered,
          delayAppliedMs,
          warning: relatedNews.length === 0 ? 'No related news found for this market' : undefined,
          groqTxHash: newsResult.meta.groqTxHash,
          llmTxHash: decision.llmTxHash,
        },
      };

      decisions.push(decisionItem);

      await prisma.decision.create({
        data: {
          runId: runRecord.id,
          keyword: decisionItem.keyword,
          marketTitle: decisionItem.market.title,
          marketSlug: decisionItem.market.slug,
          marketUrl: decisionItem.market.url,
          marketActive: decisionItem.market.active,
          yesPrice: decisionItem.market.yesPrice,
          noPrice: decisionItem.market.noPrice,
          liquidity: decisionItem.market.liquidity,
          volume: decisionItem.market.volume,
          action: decisionItem.decision.action,
          token: decisionItem.decision.token,
          likelihood: decisionItem.decision.likelihood,
          reason: decisionItem.decision.reason,
          relatedNews: decisionItem.relatedNews as unknown as object,
          newsFetched: Boolean(decisionItem.diagnostics?.newsFetched),
          retriesAttempted: decisionItem.diagnostics?.retriesAttempted ?? 0,
          rateLimitEncountered: Boolean(decisionItem.diagnostics?.rateLimitEncountered),
          delayAppliedMs: decisionItem.diagnostics?.delayAppliedMs ?? 0,
          warning: decisionItem.diagnostics?.warning,
          groqTxHash: decisionItem.diagnostics?.groqTxHash ?? null,
          llmTxHash: decisionItem.diagnostics?.llmTxHash ?? null,
        },
      });
    }

    const counts = decisions.reduce(
      (acc, decisionItem) => {
        if (decisionItem.decision.action === 'buy') acc.buy += 1;
        else acc.wait += 1;
        return acc;
      },
      { marketsAnalyzed: decisions.length, skippedInactive, buy: 0, wait: 0 }
    );

    const contextSummary = [
      `Pipeline analyzed ${counts.marketsAnalyzed} market(s) across ${MARKET_MONITOR_CONFIG.keywords.length} keyword(s).`,
      `Decisions: buy=${counts.buy}, wait=${counts.wait}, skippedInactive=${counts.skippedInactive}.`,
      `News was fetched per market with a 10 second delay between requests.`,
    ].join(' ');

    const completedAt = new Date().toISOString();

    await prisma.decisionRun.update({
      where: { id: runRecord.id },
      data: {
        completedAt: new Date(completedAt),
        marketsAnalyzed: counts.marketsAnalyzed,
        skippedInactive: counts.skippedInactive,
        buyCount: counts.buy,
        waitCount: counts.wait,
        contextSummary,
      },
    });

    return {
      startedAt,
      completedAt,
      keywords: MARKET_MONITOR_CONFIG.keywords,
      counts,
      decisions,
      contextSummary,
    };
  }
}

