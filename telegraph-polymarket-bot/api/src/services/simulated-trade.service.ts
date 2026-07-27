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

  // Settles a specific open trade at exitPrice: marks it closed, computes
  // P&L, and returns the reserved stake + P&L to the portfolio balance
  // (openTrade already deducted the stake up front, so this is the net
  // settlement). Shared by the scheduled hold-period review and by an
  // early exit triggered by a contradicting signal in the same market.
  private static async settleTrade(trade: { id: string; stake: number; entryPrice: number }, exitPrice: number, reason: string) {
    const pnl = trade.stake * ((exitPrice - trade.entryPrice) / trade.entryPrice);

    await prisma.simulatedTrade.update({
      where: { id: trade.id },
      data: { status: 'closed', exitPrice, pnl, closedAt: new Date() },
    });

    const portfolio = await this.getPortfolio();
    await prisma.portfolioState.update({
      where: { singleton: PORTFOLIO_SINGLETON },
      data: { balance: portfolio.balance + trade.stake + pnl, totalPnl: portfolio.totalPnl + pnl },
    });

    console.log(`[simulated-trade] closed trade ${trade.id} (${reason}) pnl=$${pnl.toFixed(2)}`);
  }

  static async openTrade(signalId: string, market: MatchedMarket, action: string, likelihood: number | null) {
    const side = action === 'buy_yes' ? 'BUY' : 'SELL';
    const entryPrice = action === 'buy_yes' ? parseCentsToPrice(market.yesPrice) : parseCentsToPrice(market.noPrice);
    if (entryPrice === null || entryPrice <= 0) return;

    // A new decision for a market we're already positioned in must be
    // reconciled against what we actually hold before opening anything new —
    // we can't "sell" NO shares we don't own just because a signal said so.
    const existingPosition = await prisma.simulatedTrade.findFirst({
      where: { marketSlug: market.slug, status: 'open' },
    });

    if (existingPosition) {
      if (existingPosition.side === side) {
        console.log(`[simulated-trade] already holding an open ${side} position on "${market.title}" — skipping duplicate`);
        return;
      }

      // The new signal contradicts the position we actually own (e.g. we
      // hold YES shares but the new decision is buy_no) — the correct
      // action is to sell what we own at its current price, not open an
      // unrelated second position alongside it.
      const existingExitPrice = existingPosition.side === 'BUY' ? parseCentsToPrice(market.yesPrice) : parseCentsToPrice(market.noPrice);
      if (existingExitPrice === null) {
        console.log(`[simulated-trade] contradicting signal on "${market.title}" but couldn't price the existing ${existingPosition.side} position — leaving it open`);
        return;
      }
      await this.settleTrade(existingPosition, existingExitPrice, `contradicting signal — new decision is ${action}`);
    }

    const portfolio = await this.getPortfolio();

    // Stake scales with how confident the LLM actually is in the side it
    // chose (0.5 = just barely qualified, 1.0 = fully confident), between a
    // floor (enough to buy simMinShares) and a hard per-trade ceiling — not
    // a percentage of account balance, so position size doesn't balloon as
    // the balance grows.
    const sideConfidence = action === 'buy_yes' ? (likelihood ?? 0.5) : 1 - (likelihood ?? 0.5);
    const confidenceScale = Math.max(0, Math.min(1, (sideConfidence - 0.5) * 2));
    const minStake = SIGNAL_CONFIG.simMinShares * entryPrice;
    const maxStake = SIGNAL_CONFIG.simMaxStakeUsd;
    const stake = Math.max(minStake, Math.min(maxStake, minStake + (maxStake - minStake) * confidenceScale));
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
      await this.settleTrade(trade, exitPrice, 'hold period elapsed');
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
