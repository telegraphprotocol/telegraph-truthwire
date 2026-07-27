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
  'You are a value-betting prediction-market trading assistant for Polymarket.',
  'Given a real-time signal and the matched market\'s current YES/NO prices, decide whether to buy YES, buy NO, or wait.',
  'The market\'s current YES price is its implied probability of a YES resolution (e.g. a 12 cent YES price implies the market thinks there is a 12% chance of YES).',
  'Set likelihood = your own estimated true probability (0.0-1.0) that the market resolves YES, based on the signal — independent of what the market currently implies.',
  'This is VALUE BETTING, not "pick whichever side is more likely": you are looking for a gap between your likelihood estimate and the market\'s implied probability, not for likelihood to be above or below 50%.',
  'Choose buy_yes if your likelihood is meaningfully HIGHER than the market\'s implied YES probability (the market is underpricing YES) — even if your likelihood is itself below 0.5, buying YES can still be positive-value if the market is pricing it even lower.',
  'Choose buy_no if (1 - your likelihood) is meaningfully HIGHER than the market\'s implied NO probability (the market is underpricing NO) — even if your likelihood is itself above 0.5.',
  'Choose wait if your likelihood is close to what the market already implies (no meaningful edge), or the signal is too weak/ambiguous to estimate a likelihood at all.',
  'Return ONLY valid JSON, no markdown: {"action":"buy_yes|buy_no|wait","likelihood":0.0-1.0,"reason":"one sentence max, state the edge (your estimate vs the market price) if you chose to trade"}',
].join(' ');

const fallback = (reason: string): TradeDecision => ({ action: 'wait', likelihood: 0, reason });

const normalizeAction = (action: unknown): TradeAction | null => {
  if (typeof action !== 'string') return null;
  const normalized = action.toLowerCase();
  if (normalized === 'buy_yes' || normalized === 'buy_no' || normalized === 'wait') return normalized;
  return null;
};

// Below this margin, the gap between our estimate and the market's implied
// probability isn't worth trading on — treat it as noise rather than edge.
const MIN_EDGE = 0.05;

const parseCentsToProbability = (raw: string | null | undefined): number | null => {
  if (!raw) return null;
  const numeric = Number(raw.replace('¢', ''));
  if (!Number.isFinite(numeric)) return null;
  return numeric / 100;
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

    // Guard against a claimed edge that isn't actually there — the LLM says
    // it found value, but its own likelihood doesn't actually diverge from
    // the market's implied probability by a meaningful margin. This is a
    // value-betting edge check (comparing likelihood to market price), not
    // an "is likelihood above/below 50%" check — a low-likelihood buy_yes is
    // legitimate when the market implies an even lower probability.
    const impliedYes = parseCentsToProbability(market.yesPrice);
    const impliedNo = parseCentsToProbability(market.noPrice);

    if (action === 'buy_yes' && impliedYes !== null && likelihood - impliedYes < MIN_EDGE) {
      const edge = (likelihood - impliedYes).toFixed(2);
      console.log(`[trade-decision] signal ${signal.id} market="${market.title}" — insufficient edge: buy_yes with likelihood=${likelihood} vs implied YES=${impliedYes} (edge=${edge}), forcing wait. Original reason: ${reason}`);
      action = 'wait';
      reason = `Overridden to wait: buy_yes edge (${edge}) was below the ${MIN_EDGE} minimum. Original reason: ${reason}`;
    } else if (action === 'buy_no' && impliedNo !== null && (1 - likelihood) - impliedNo < MIN_EDGE) {
      const edge = ((1 - likelihood) - impliedNo).toFixed(2);
      console.log(`[trade-decision] signal ${signal.id} market="${market.title}" — insufficient edge: buy_no with likelihood=${likelihood} vs implied NO=${impliedNo} (edge=${edge}), forcing wait. Original reason: ${reason}`);
      action = 'wait';
      reason = `Overridden to wait: buy_no edge (${edge}) was below the ${MIN_EDGE} minimum. Original reason: ${reason}`;
    } else {
      console.log(`[trade-decision] signal ${signal.id} market="${market.title}" — action=${action} likelihood=${likelihood} reason=${reason}`);
    }

    return { action, likelihood, reason };
  }
}
