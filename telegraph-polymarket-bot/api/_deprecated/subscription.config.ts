export const SUBSCRIPTION_DURATION_DAYS = 30;

export const SUBSCRIPTION_PLANS = {
  starter: {
    id: 'starter',
    label: 'Starter',
    priceUsd: 20,
    monthlyTradeLimit: 60
  },
  pro: {
    id: 'pro',
    label: 'Pro Sniper',
    priceUsd: 50,
    monthlyTradeLimit: 150
  },
  whale: {
    id: 'whale',
    label: 'Alpha Whale',
    priceUsd: 70,
    monthlyTradeLimit: 210
  }
} as const;

export type SubscriptionPlanId = keyof typeof SUBSCRIPTION_PLANS;

const DEFAULT_POLYGON_CHAIN_ID = 80002;
const DEFAULT_USDC_DECIMALS = 6;

export const getSubscriptionChainConfig = () => ({
  chainId: Number(process.env.SUBSCRIPTION_CHAIN_ID || DEFAULT_POLYGON_CHAIN_ID),
  rpcUrl: process.env.POLYGON_RPC_URL || '',
  usdcContractAddress: (process.env.POLYGON_USDC_CONTRACT_ADDRESS || '').toLowerCase(),
  treasuryWalletAddress: (process.env.SUBSCRIPTION_TREASURY_WALLET || '').toLowerCase(),
  usdcDecimals: Number(process.env.POLYGON_USDC_DECIMALS || DEFAULT_USDC_DECIMALS)
});

export const getSubscriptionPlan = (planId: string) => {
  if (planId in SUBSCRIPTION_PLANS) {
    return SUBSCRIPTION_PLANS[planId as SubscriptionPlanId];
  }

  throw new Error('Invalid subscription plan');
};

export const getRequiredChainConfig = () => {
  const chainConfig = getSubscriptionChainConfig();
  const { rpcUrl, usdcContractAddress, treasuryWalletAddress } = chainConfig;

  if (!rpcUrl) throw new Error('POLYGON_RPC_URL is not configured');
  if (!usdcContractAddress) throw new Error('POLYGON_USDC_CONTRACT_ADDRESS is not configured');
  if (!treasuryWalletAddress) throw new Error('SUBSCRIPTION_TREASURY_WALLET is not configured');

  return chainConfig;
};
