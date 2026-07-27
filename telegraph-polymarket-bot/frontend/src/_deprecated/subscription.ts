export const SUBSCRIPTION_PLANS = {
  starter: { id: 'starter', label: 'Starter', priceUsd: 20, monthlyTradeLimit: 60 },
  pro: { id: 'pro', label: 'Pro Sniper', priceUsd: 50, monthlyTradeLimit: 150 },
  whale: { id: 'whale', label: 'Alpha Whale', priceUsd: 70, monthlyTradeLimit: 210 },
} as const;

export type SubscriptionPlanId = keyof typeof SUBSCRIPTION_PLANS;

const parseEnvNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const subscriptionChainId = parseEnvNumber(import.meta.env.VITE_SUBSCRIPTION_CHAIN_ID, 80002);
const subscriptionTokenAddress = import.meta.env.VITE_SUBSCRIPTION_TOKEN_ADDRESS as `0x${string}` | undefined;
const subscriptionTreasuryWallet = import.meta.env.VITE_SUBSCRIPTION_TREASURY_WALLET as `0x${string}` | undefined;
const subscriptionTokenDecimals = parseEnvNumber(import.meta.env.VITE_SUBSCRIPTION_TOKEN_DECIMALS, 6);

export const subscriptionConfig = {
  chainId: subscriptionChainId,
  tokenAddress: subscriptionTokenAddress,
  treasuryWallet: subscriptionTreasuryWallet,
  tokenDecimals: subscriptionTokenDecimals,
};

export const assertSubscriptionConfig = () => {
  if (!subscriptionConfig.tokenAddress) {
    throw new Error('VITE_SUBSCRIPTION_TOKEN_ADDRESS is not configured');
  }

  if (!subscriptionConfig.treasuryWallet) {
    throw new Error('VITE_SUBSCRIPTION_TREASURY_WALLET is not configured');
  }
};
