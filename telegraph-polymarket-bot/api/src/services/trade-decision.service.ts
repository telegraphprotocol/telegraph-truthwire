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
  'Given a real-time signal and the matched market\'s current prices, decide whether to buy YES, buy NO, or wait.',
  'Set likelihood = your estimated true probability (0.0-1.0) that the market resolves YES, based on the signal.',
  'Choose buy_yes if you believe YES is likely and it is not already priced in (i.e. YES price is not already close to 1.0).',
  'Choose buy_no if you believe NO is likely and it is not already priced in.',
  'Choose wait if the signal is too weak/ambiguous to trade on, or the relevant side is already fully priced in.',
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
    if (!parsed) return fallback('LLM call failed');

    const action = normalizeAction(parsed.action);
    if (!action) return fallback('LLM returned an invalid action');

    const likelihoodRaw = Number(parsed.likelihood);
    const likelihood = Number.isFinite(likelihoodRaw) ? Math.max(0, Math.min(1, likelihoodRaw)) : 0;
    const reason = typeof parsed.reason === 'string' && parsed.reason.trim() ? parsed.reason.trim() : 'No reason provided by LLM';

    return { action, likelihood, reason };
  }
}
