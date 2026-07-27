import { PolymarketService, PolymarketEvent } from './polymarket.service';
import { callLlmJson } from '../utils/llm-client';
import type { NormalizedSignal } from './telegraph-signal.service';

const SYSTEM_PROMPT = [
  'You are a market-matching assistant for a Polymarket trading bot.',
  'You are given a real-time signal (a news/prediction event) and a numbered list of candidate Polymarket markets.',
  'Your job: pick the ONE candidate that is both about the same real-world event AND is the currently open, tradable instance of that market.',
  'Being about the same topic is NOT enough — many Polymarket markets recur (e.g. monthly Fed meetings, repeated ceasefire deadlines) and old instances of the same topic may still appear "active" in search results even though the tracked deadline/date has already passed relative to the signal.',
  'If no candidate is truly the live, correctly-timed match for the signal, say so — do not force a weak match.',
  'Return ONLY valid JSON, no markdown: {"matchIndex": number|null, "reason": "one sentence max"}',
].join(' ');

const truncate = (text: string, max = 300) => (text.length > max ? `${text.slice(0, max)}…` : text);

const buildCandidateList = (candidates: PolymarketEvent[]): string =>
  candidates
    .map((c, i) => {
      const desc = truncate((c.description || '').replace(/\s+/g, ' ').trim());
      return `${i}. "${c.title}"\n   description: ${desc || '(none)'}\n   endDate: ${c.endDate || 'unknown'}`;
    })
    .join('\n\n');

export class MarketMatcherService {
  static async matchMarket(signal: NormalizedSignal) {
    const candidates = await PolymarketService.fetchCandidates(signal.questionText);
    if (candidates.length === 0) {
      console.log(`[market-matcher] no candidates found for signal ${signal.id} — questionText=${JSON.stringify(signal.questionText)}`);
      return null;
    }

    const userPrompt = [
      `Signal intent: ${signal.intent}`,
      `Signal question: "${signal.questionText}"`,
      '',
      'Candidate markets:',
      buildCandidateList(candidates),
    ].join('\n');

    const parsed = await callLlmJson(SYSTEM_PROMPT, userPrompt);
    const matchIndex = parsed?.matchIndex;

    if (typeof matchIndex !== 'number' || !Number.isInteger(matchIndex) || matchIndex < 0 || matchIndex >= candidates.length) {
      console.log(`[market-matcher] no related market found for signal ${signal.id} — reason=${parsed?.reason ?? 'no match / LLM call failed'}`);
      return null;
    }

    console.log(`[market-matcher] signal ${signal.id} matched "${candidates[matchIndex].title}" — reason=${parsed?.reason ?? 'n/a'}`);
    return PolymarketService.formatMarketSummary(candidates[matchIndex]);
  }
}
