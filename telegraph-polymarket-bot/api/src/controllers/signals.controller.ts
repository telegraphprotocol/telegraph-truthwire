import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { PolymarketService } from '../services/polymarket.service';
import { MARKET_MONITOR_CONFIG } from '../config/market-monitor.config';
import { SimulatedTradeService } from '../services/simulated-trade.service';
import { SignalPipelineService } from '../services/signal-pipeline.service';
import { normalizeIncomingSignal } from '../services/telegraph-signal.service';

// Human-readable label so a decision is obvious in an API response even when
// it's WAIT or there was no market match at all — decisionAction is null in
// both of those cases, which reads ambiguously as raw JSON otherwise.
const decisionLabel = (signalRow: { matchedMarketTitle: string | null; decisionAction: string | null } | null): string => {
  if (!signalRow?.matchedMarketTitle) return 'NO MARKET MATCH';
  if (signalRow.decisionAction === 'buy_yes') return 'BUY YES';
  if (signalRow.decisionAction === 'buy_no') return 'BUY NO';
  return 'WAIT';
};

export const searchMarkets = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Keyword "q" is required' });
    }
    const markets = await PolymarketService.searchTopMarkets(q, MARKET_MONITOR_CONFIG.marketFetchLimit);
    const summary = markets.map((m) => PolymarketService.formatMarketSummary(m as any));
    res.json({ query: q, count: summary.length, markets: summary });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getSignals = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.SignalWhereInput = { intent: { not: 'UNKNOWN' } };

    const [rows, total] = await Promise.all([
      prisma.signal.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.signal.count({ where }),
    ]);

    const items = rows.map((row) => ({ ...row, decisionLabel: decisionLabel(row) }));

    res.json({ items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load signals' });
  }
};

export const getTrades = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const statusQuery = typeof req.query.status === 'string' ? req.query.status : undefined;
    const where: Prisma.SimulatedTradeWhereInput =
      statusQuery === 'open' || statusQuery === 'closed' ? { status: statusQuery } : {};

    const [items, total] = await Promise.all([
      prisma.simulatedTrade.findMany({ where, skip, take: limit, orderBy: { openedAt: 'desc' } }),
      prisma.simulatedTrade.count({ where }),
    ]);

    res.json({ items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load trades' });
  }
};

// Test-only endpoint: feeds a signal through the exact same normalization
// and pipeline (MarketMatcherService -> TradeDecisionService -> simulated
// trade) that the live Telegraph WS handler uses, without needing a real
// socket push. Accepts either a raw WS envelope (the real "daemon"/"result"
// wire shapes — pass a `type` field to use this path) or a shorthand
// { intent, questionText, category? } body for quick manual testing.
export const simulateSignal = async (req: Request, res: Response) => {
  try {
    const body = req.body || {};

    const normalized = body.type
      ? normalizeIncomingSignal(body)
      : {
          id: `test-${Date.now()}`,
          intent: body.intent || 'TEST_SIGNAL',
          category: body.category ?? null,
          questionText: body.questionText || '',
          routingSubnet: body.routingSubnet ?? null,
          execution: body.execution || {},
          raw: body,
        };

    if (!normalized) {
      return res.status(400).json({ error: 'Payload looked like a list_subscriptions reply, not a signal' });
    }
    if (!normalized.questionText.trim()) {
      return res.status(400).json({ error: 'questionText is required (either top-level or under question.text/data.question)' });
    }

    await SignalPipelineService.handleSignal(normalized);

    const signalRow = await prisma.signal.findUnique({ where: { telegraphId: normalized.id } });
    res.json({ normalized, decision: decisionLabel(signalRow), signal: signalRow });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to simulate signal' });
  }
};

export const getPortfolio = async (_req: Request, res: Response) => {
  try {
    const portfolio = await SimulatedTradeService.getPortfolio();
    const openCount = await prisma.simulatedTrade.count({ where: { status: 'open' } });
    res.json({
      balance: portfolio.balance,
      totalPnl: portfolio.totalPnl,
      openPositions: openCount,
      updatedAt: portfolio.updatedAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load portfolio' });
  }
};
