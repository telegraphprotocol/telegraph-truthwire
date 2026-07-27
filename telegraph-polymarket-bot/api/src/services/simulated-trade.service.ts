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
    if (stake <= 0) return;

    await prisma.simulatedTrade.create({
      data: {
        signalId,
        marketSlug: market.slug,
        marketTitle: market.title,
        side,
        entryPrice,
        stake,
        status: 'open',
      },
    });

    console.log(`[simulated-trade] opened ${side} on "${market.title}" @ ${entryPrice} stake=$${stake.toFixed(2)}`);
  }

  static async reviewOpenTrades() {
    const holdMs = SIGNAL_CONFIG.simHoldHours * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - holdMs);

    const openTrades = await prisma.simulatedTrade.findMany({
      where: { status: 'open', openedAt: { lte: cutoff } },
    });

    for (const trade of openTrades) {
      const markets = await PolymarketService.searchTopMarkets(trade.marketTitle, 1);
      const summary = markets[0] ? PolymarketService.formatMarketSummary(markets[0] as any) : null;
      if (summary && !summary.active) continue;
      const exitPrice =
        trade.side === 'BUY' ? parseCentsToPrice(summary?.yesPrice) : parseCentsToPrice(summary?.noPrice);
      if (exitPrice === null) continue;

      const pnl = trade.stake * ((exitPrice - trade.entryPrice) / trade.entryPrice);

      await prisma.simulatedTrade.update({
        where: { id: trade.id },
        data: { status: 'closed', exitPrice, pnl, closedAt: new Date() },
      });

      const portfolio = await this.getPortfolio();
      await prisma.portfolioState.update({
        where: { singleton: PORTFOLIO_SINGLETON },
        data: { balance: portfolio.balance + pnl, totalPnl: portfolio.totalPnl + pnl },
      });

      console.log(`[simulated-trade] closed trade ${trade.id} pnl=$${pnl.toFixed(2)}`);
    }
  }
}
