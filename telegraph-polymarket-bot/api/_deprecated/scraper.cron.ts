import cron from 'node-cron';
import { MarketDecisionService } from '../services/market-decision.service';

/**
 * Initialize the Polymarket discovery cron job
 * Runs every 2 hours
 */
export const initScraperCron = () => {
  // 0 */2 * * * - every 2 hours at minute 0
  // For testing, user might want to see it run soon, but 2h is the requirement.
  cron.schedule('0 */2 * * *', async () => {
    console.log(`[${new Date().toISOString()}] 🤖 Running Telegraph decision pipeline...`);
    try {
      const result = await MarketDecisionService.runDecisionPipelineOnce('cron');
      const rateLimitedCount = result.decisions.filter((item) => item.diagnostics?.rateLimitEncountered).length;
      const totalRetries = result.decisions.reduce(
        (sum, item) => sum + (item.diagnostics?.retriesAttempted || 0),
        0
      );
      console.log(
        `[${result.completedAt}] ✅ Decision cycle complete | analyzed=${result.counts.marketsAnalyzed} skippedInactive=${result.counts.skippedInactive} buy=${result.counts.buy} wait=${result.counts.wait} retries=${totalRetries} rateLimited=${rateLimitedCount}`
      );
    } catch (error: any) {
      console.error('❌ Decision pipeline failed:', error.message);
    }
  });

  console.log('📅 Telegraph decision cron initialized (every 2 hours).');
};

/**
 * Trigger a manual run for immediate verification
 */
export const runManualScrape = async () => {
  console.log('🚀 Triggering manual Telegraph decision run...');
  const result = await MarketDecisionService.runDecisionPipelineOnce('manual');
  console.log(
    `Manual run complete | analyzed=${result.counts.marketsAnalyzed} buy=${result.counts.buy} wait=${result.counts.wait}`
  );
  return result;
};
