import prisma from '../utils/prisma';
import { SimulatedTradeService } from './simulated-trade.service';
import { MarketMatcherService } from './market-matcher.service';
import { TradeDecisionService } from './trade-decision.service';
import type { NormalizedSignal } from './telegraph-signal.service';

// Overlapping Telegraph subscriptions can each independently push the same
// underlying signal within moments of each other, tagged with different
// subscription_ids (and thus different fired_at values) so they don't
// collide on the telegraphId uniqueness check below. This short in-memory
// window catches near-simultaneous re-deliveries of the same intent+question
// as a safety net, on top of fixing subscription duplication at the source.
const RECENT_SIGNAL_WINDOW_MS = 2 * 60 * 1000;
const recentSignals = new Map<string, number>();

const isRecentDuplicate = (intent: string, questionText: string): boolean => {
  const key = `${intent}::${questionText}`;
  const now = Date.now();
  for (const [k, seenAt] of recentSignals) {
    if (now - seenAt > RECENT_SIGNAL_WINDOW_MS) recentSignals.delete(k);
  }
  const seenAt = recentSignals.get(key);
  recentSignals.set(key, now);
  return seenAt !== undefined && now - seenAt <= RECENT_SIGNAL_WINDOW_MS;
};

export class SignalPipelineService {
  static async handleSignal(signal: NormalizedSignal) {
    const questionText = signal.questionText || '';
    const intent = signal.intent || 'UNKNOWN';

    // Signals that arrive with no resolvable intent or question text carry
    // nothing the pipeline can act on (they can never match a market), so
    // they're dropped before ever touching the DB rather than stored as junk.
    if (intent === 'UNKNOWN' || !questionText.trim()) {
      console.log(`[signal-pipeline] dropping signal ${signal.id} — intent=${intent} questionText=${JSON.stringify(questionText)}`);
      return;
    }

    if (isRecentDuplicate(intent, questionText)) {
      console.log(`[signal-pipeline] dropping likely-duplicate signal ${signal.id} — intent=${intent} question=${JSON.stringify(questionText)}`);
      return;
    }

    const existing = await prisma.signal.findUnique({ where: { telegraphId: signal.id } });
    if (existing) return;

    const match = await MarketMatcherService.matchMarket(signal);
    const decision = match ? await TradeDecisionService.decide(signal, match) : null;

    const signalRow = await prisma.signal.create({
      data: {
        telegraphId: signal.id,
        intent,
        category: signal.category ?? null,
        questionText,
        routingSubnet: signal.routingSubnet ?? null,
        rawPayload: signal.raw as any,
        matchedMarketSlug: match?.slug ?? null,
        matchedMarketTitle: match?.title ?? null,
        matchedYesPrice: match?.yesPrice ?? null,
        matchedNoPrice: match?.noPrice ?? null,
        matchedMarketUrl: match?.url ?? null,
        decisionAction: decision?.action ?? null,
        likelihood: decision?.likelihood ?? null,
      },
    });

    console.log(`[signal-pipeline] signal ${signal.id} → intent=${intent} action=${decision?.action ?? 'none'} match=${match?.title ?? 'none'}`);

    if (match && match.active && decision && decision.action !== 'wait') {
      await SimulatedTradeService.openTrade(signalRow.id, match, decision.action, decision.likelihood);
    }

    await SimulatedTradeService.reviewOpenTrades();
  }
}
