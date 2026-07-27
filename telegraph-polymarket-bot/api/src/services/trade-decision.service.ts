import { callLlmJson } from '../utils/llm-client';
import type { NormalizedSignal } from './telegraph-signal.service';

export type TradeAction = 'buy_yes' | 'buy_no' | 'wait';

export interface TradeDecision {
  action: TradeAction;
  likelihood: number;
  reason: string;
}

interface MatchedMarket {
  title: string;
  slug: string;
  yesPrice: string;
  noPrice: string;
  liquidity: string;
  volume: string;
}

const SYSTEM_PROMPT = [
  'You are a prediction-market trading assistant for Polymarket.',
  'Given a real-time signal and the matched market\'s current YES/NO prices, decide whether to buy YES, buy NO, or wait.',
  'Set likelihood = your estimated true probability (0.0-1.0) that the market resolves YES, based on the signal.',
  'Choose buy_yes ONLY if your likelihood is 0.5 or higher — you believe YES is more likely than not.',
  'Choose buy_no ONLY if your likelihood is 0.5 or lower — you believe NO is more likely than not.',
  'If your likelihood does not clearly support either side (e.g. it\'s close to 0.5), or the signal is too weak/ambiguous to estimate a likelihood at all, choose wait instead of forcing a trade.',
  'Return ONLY valid JSON, no markdown: {"action":"buy_yes|buy_no|wait","likelihood":0.0-1.0,"reason":"one sentence max"}',
].join(' ');

const fallback = (reason: string): TradeDecision => ({ action: 'wait', likelihood: 0, reason });

const normalizeAction = (action: unknown): TradeAction | null => {
  if (typeof action !== 'string') return null;
  const normalized = action.toLowerCase();
  if (normalized === 'buy_yes' || normalized === 'buy_no' || normalized === 'wait') return normalized;
  return null;
};

export class TradeDecisionService {
  static async decide(signal: NormalizedSignal, market: MatchedMarket): Promise<TradeDecision> {
    const userPrompt = [
      `Signal intent: ${signal.intent}`,
      `Signal question: "${signal.questionText}"`,
      '',
      `Matched market: "${market.title}"`,
      `YES price: ${market.yesPrice} | NO price: ${market.noPrice}`,
      `Liquidity: ${market.liquidity} | Volume: ${market.volume}`,
    ].join('\n');

    const parsed = await callLlmJson(SYSTEM_PROMPT, userPrompt);
    if (!parsed) {
      console.log(`[trade-decision] signal ${signal.id} market="${market.title}" — LLM call failed`);
      return fallback('LLM call failed');
    }

    let action = normalizeAction(parsed.action);
    if (!action) {
      console.log(`[trade-decision] signal ${signal.id} market="${market.title}" — invalid action from LLM: ${JSON.stringify(parsed.action)}`);
      return fallback('LLM returned an invalid action');
    }

    const likelihoodRaw = Number(parsed.likelihood);
    const likelihood = Number.isFinite(likelihoodRaw) ? Math.max(0, Math.min(1, likelihoodRaw)) : 0;
    let reason = typeof parsed.reason === 'string' && parsed.reason.trim() ? parsed.reason.trim() : 'No reason provided by LLM';

    // Judged purely on likelihood: a trade only executes when the LLM's own
    // probability estimate actually supports it. The prompt already asks for
    // this, but this is the actual enforcement — transparently stated as a
    // wait-due-to-low-likelihood, not silently rewritten as if it were the
    // LLM's own reasoning.
    if (action === 'buy_yes' && likelihood < 0.5) {
      console.log(`[trade-decision] signal ${signal.id} market="${market.title}" — waiting: buy_yes with likelihood=${likelihood} is below 50%`);
      reason = `LLM suggested BUY YES but waiting due to low likelihood (${Math.round(likelihood * 100)}%). LLM's reason: ${reason}`;
      action = 'wait';
    } else if (action === 'buy_no' && likelihood > 0.5) {
      console.log(`[trade-decision] signal ${signal.id} market="${market.title}" — waiting: buy_no with likelihood=${likelihood} is above 50%`);
      reason = `LLM suggested BUY NO but waiting due to low likelihood (${Math.round((1 - likelihood) * 100)}%). LLM's reason: ${reason}`;
      action = 'wait';
    } else {
      console.log(`[trade-decision] signal ${signal.id} market="${market.title}" — action=${action} likelihood=${likelihood} reason=${reason}`);
    }

    return { action, likelihood, reason };
  }
}
