import { MARKET_MONITOR_CONFIG } from '../config/market-monitor.config';
import { RelatedNewsItem } from './telegraph-news.service';
import { getX402Fetch, extractTxHash } from '../utils/x402Fetch';

export interface LlmDecision {
  action: 'buy' | 'wait';
  token: 'YES' | 'NO' | null;
  likelihood: number;
  reason: string;
  llmTxHash: string | null;
}

const fallbackDecision = (reason: string): LlmDecision => ({
  action: 'wait',
  token: null,
  likelihood: 0,
  reason,
  llmTxHash: null,
});

const normalizeAction = (action: unknown): 'buy' | 'wait' | null => {
  if (typeof action !== 'string') return null;
  const normalized = action.toLowerCase();
  if (normalized === 'buy' || normalized === 'wait') return normalized;
  return null;
};

const normalizeToken = (token: unknown): 'YES' | 'NO' | null => {
  if (token === null || token === undefined) return null;
  if (typeof token !== 'string') return null;
  const normalized = token.toUpperCase();
  if (normalized === 'YES' || normalized === 'NO') return normalized;
  return null;
};

const cleanJsonPayload = (raw: string) => {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  return raw.trim();
};

export class TelegraphLlmService {
  static async decideMarketAction(params: {
    keyword: string;
    market: { title: string; slug: string; yesPrice: string; noPrice: string; liquidity: string; volume: string };
    relatedNews: RelatedNewsItem[];
  }): Promise<LlmDecision> {
    const url = `${MARKET_MONITOR_CONFIG.telegraphBaseUrl}${MARKET_MONITOR_CONFIG.llmChatPath}`;
    const newsContext =
      params.relatedNews.length > 0
        ? params.relatedNews.map((item, idx) => `${idx + 1}. ${item.summary}`).join('\n')
        : 'No related news found.';

    const yesPrice = parseFloat(params.market.yesPrice) || 0.5;
    const noPrice = parseFloat(params.market.noPrice) || 0.5;
    const cheaperToken = yesPrice <= noPrice ? 'YES' : 'NO';

    const systemPrompt = [
      'You are an aggressive prediction market trader on Polymarket. Your only goal is to find trades.',
      'Rules (follow strictly):',
      '1. Set likelihood = your estimated true probability that the event occurs (0.0–1.0).',
      '2. If likelihood >= 0.50, you MUST set action="buy". Choosing wait with likelihood >= 0.50 is forbidden.',
      '3. If likelihood < 0.40, set action="wait" and token=null.',
      '4. Between 0.40 and 0.49, use news sentiment to decide: lean toward buy if there is any supporting signal.',
      '5. When action="buy": set token="YES" if you believe the event will happen, token="NO" if you believe it will not.',
      '6. Do NOT conflate uncertainty about Trump\'s exact words with uncertainty about whether an event occurs — focus on the most probable outcome.',
    ].join(' ');

    const userPrompt = [
      `Keyword: ${params.keyword}`,
      `Market: "${params.market.title}"`,
      `YES price: ${params.market.yesPrice} | NO price: ${params.market.noPrice} (cheaper side: ${cheaperToken})`,
      `Liquidity: ${params.market.liquidity} | Volume: ${params.market.volume}`,
      '',
      'Recent news:',
      newsContext,
      '',
      'Step 1: Estimate likelihood (0.0–1.0) that the event resolves YES.',
      'Step 2: Apply the rules above to set action and token.',
      'Return ONLY valid JSON, no markdown:',
      '{"action":"buy|wait","token":"YES|NO|null","likelihood":0.0-1.0,"reason":"one sentence max"}',
    ].join('\n');

    try {
      const fetchWithPayment = await getX402Fetch();
      const response = await fetchWithPayment(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 250,
        }),
        signal: AbortSignal.timeout(25000),
      });

      const llmTxHash = extractTxHash(response.headers);

      if (!response.ok) {
        if (response.status === 402) {
          console.error(`Telegraph LLM payment failed for "${params.market.title}": check SOLANA_PRIVATE_KEY and Solana USDC balance`);
          return { ...fallbackDecision('x402 payment failed for LLM call'), llmTxHash };
        }
        return fallbackDecision(`LLM request failed: HTTP ${response.status}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content || typeof content !== 'string') {
        return { ...fallbackDecision('LLM returned empty content'), llmTxHash };
      }

      let parsed: any;
      try {
        parsed = JSON.parse(cleanJsonPayload(content));
      } catch {
        return { ...fallbackDecision('LLM output was not valid JSON'), llmTxHash };
      }

      let action = normalizeAction(parsed.action);
      if (!action) return { ...fallbackDecision('LLM action was invalid'), llmTxHash };

      const likelihoodRaw = Number(parsed.likelihood);
      const likelihood = Number.isFinite(likelihoodRaw) ? Math.max(0, Math.min(1, likelihoodRaw)) : 0;

      // Override: model said wait but confidence is high enough to trade
      if (action === 'wait' && likelihood >= 0.5) {
        action = 'buy';
      }

      let token = normalizeToken(parsed.token);
      // Ensure token is set when buying
      if (action === 'buy' && !token) {
        token = yesPrice <= noPrice ? 'YES' : 'NO';
      }
      const reason =
        typeof parsed.reason === 'string' && parsed.reason.trim().length > 0
          ? parsed.reason.trim()
          : 'No reason provided by LLM';

      return {
        action,
        token: action === 'buy' ? token : null,
        likelihood,
        reason,
        llmTxHash,
      };
    } catch (error: any) {
      console.error(`Telegraph LLM decision failed for "${params.market.title}":`, error.message);
      return fallbackDecision(`LLM request failed: ${error.message}`);
    }
  }
}

