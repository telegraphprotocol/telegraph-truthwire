import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { PolymarketService } from '../services/polymarket.service';
import { MARKET_MONITOR_CONFIG } from '../config/market-monitor.config';
import { SimulatedTradeService } from '../services/simulated-trade.service';

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

    const [items, total] = await Promise.all([
      prisma.signal.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.signal.count({ where }),
    ]);

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
