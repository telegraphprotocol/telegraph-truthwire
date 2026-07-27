import prisma from '../utils/prisma';
import { SIGNAL_CONFIG } from '../config/signal.config';
import { PolymarketService } from './polymarket.service';

const PORTFOLIO_SINGLETON = 'global';

const parseCentsToPrice = (raw: string | null | undefined): number | null => {
  if (!raw) return null;
  const numeric = Number(raw.replace('¢', ''));
  if (!Number.isFinite(numeric)) return null;
  return numeric / 100;
};

interface MatchedMarket {
  title: string;
  slug: string;
  yesPrice: string;
  noPrice: string;
  active: boolean;
}

interface TradeLike {
  marketTitle: string;
  side: string;
}

// Shared "what's this market trading at right now" lookup, used both to
// settle a trade on close and to show live unrealized P&L on an open one.
const getCurrentPrice = async (trade: TradeLike): Promise<number | null> => {
  const markets = await PolymarketService.searchTopMarkets(trade.marketTitle, 1);
  const summary = markets[0] ? PolymarketService.formatMarketSummary(markets[0] as any) : null;
  if (summary && !summary.active) return null;
  return trade.side === 'BUY' ? parseCentsToPrice(summary?.yesPrice) : parseCentsToPrice(summary?.noPrice);
};

export class SimulatedTradeService {
  static async getPortfolio() {
    const existing = await prisma.portfolioState.findUnique({ where: { singleton: PORTFOLIO_SINGLETON } });
    if (existing) return existing;
    return prisma.portfolioState.create({
      data: {
        singleton: PORTFOLIO_SINGLETON,
        balance: SIGNAL_CONFIG.simStartingBalanceUsd,
        totalPnl: 0,
      },
    });
  }

  static async openTrade(signalId: string, market: MatchedMarket, action: string, likelihood: number | null) {
    const side = action === 'buy_yes' ? 'BUY' : 'SELL';
    const entryPrice = action === 'buy_yes' ? parseCentsToPrice(market.yesPrice) : parseCentsToPrice(market.noPrice);
    if (entryPrice === null || entryPrice <= 0) return;

    const portfolio = await this.getPortfolio();
    const confidenceMultiplier = likelihood !== null ? Math.max(0.2, Math.min(1, likelihood)) : 0.5;
    const stake = Math.min(portfolio.balance * SIGNAL_CONFIG.simStakePct * confidenceMultiplier * 2, SIGNAL_CONFIG.simMaxStakeUsd);
    if (stake <= 0 || stake > portfolio.balance) return;

    const shares = stake / entryPrice;

    await prisma.simulatedTrade.create({
      data: {
        signalId,
        marketSlug: market.slug,
        marketTitle: market.title,
        side,
        entryPrice,
        stake,
        shares,
        status: 'open',
      },
    });

    // Reserve the stake immediately so the balance visibly reflects capital
    // committed to an open position, not just realized P&L on close.
    await prisma.portfolioState.update({
      where: { singleton: PORTFOLIO_SINGLETON },
      data: { balance: portfolio.balance - stake },
    });

    console.log(`[simulated-trade] opened ${side} on "${market.title}" @ ${entryPrice} — ${shares.toFixed(2)} shares, stake=$${stake.toFixed(2)}`);
  }

  static async reviewOpenTrades() {
    const holdMs = SIGNAL_CONFIG.simHoldHours * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - holdMs);

    const openTrades = await prisma.simulatedTrade.findMany({
      where: { status: 'open', openedAt: { lte: cutoff } },
    });

    for (const trade of openTrades) {
      const exitPrice = await getCurrentPrice(trade);
      if (exitPrice === null) continue;

      const pnl = trade.stake * ((exitPrice - trade.entryPrice) / trade.entryPrice);

      await prisma.simulatedTrade.update({
        where: { id: trade.id },
        data: { status: 'closed', exitPrice, pnl, closedAt: new Date() },
      });

      // Return the reserved stake plus/minus the realized P&L — openTrade
      // already deducted the stake up front, so this is the net settlement.
      const portfolio = await this.getPortfolio();
      await prisma.portfolioState.update({
        where: { singleton: PORTFOLIO_SINGLETON },
        data: { balance: portfolio.balance + trade.stake + pnl, totalPnl: portfolio.totalPnl + pnl },
      });

      console.log(`[simulated-trade] closed trade ${trade.id} pnl=$${pnl.toFixed(2)}`);
    }
  }

  // Attaches live unrealized P&L to open trades for display, without
  // touching the DB — reviewOpenTrades is what actually settles a trade once
  // its hold period elapses. Closed trades pass through with their already-
  // realized currentPrice/pnl.
  static async withLiveQuotes<T extends { status: string; marketTitle: string; side: string; entryPrice: number; stake: number; exitPrice: number | null; pnl: number | null }>(
    trades: T[]
  ): Promise<(T & { currentPrice: number | null; unrealizedPnl: number | null })[]> {
    return Promise.all(
      trades.map(async (trade) => {
        if (trade.status !== 'open') {
          return { ...trade, currentPrice: trade.exitPrice, unrealizedPnl: trade.pnl };
        }
        try {
          const currentPrice = await getCurrentPrice(trade);
          if (currentPrice === null) return { ...trade, currentPrice: null, unrealizedPnl: null };
          const unrealizedPnl = trade.stake * ((currentPrice - trade.entryPrice) / trade.entryPrice);
          return { ...trade, currentPrice, unrealizedPnl };
        } catch {
          return { ...trade, currentPrice: null, unrealizedPnl: null };
        }
      })
    );
  }
}
