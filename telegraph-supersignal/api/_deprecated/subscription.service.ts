import { ethers } from 'ethers';
import {
  getRequiredChainConfig,
  getSubscriptionPlan,
  SUBSCRIPTION_DURATION_DAYS,
  SUBSCRIPTION_PLANS,
  SubscriptionPlanId
} from '../config/subscription.config';
import prisma from '../utils/prisma';

const TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)');

export class SubscriptionError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'SubscriptionError';
    this.statusCode = statusCode;
  }
}

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const normalizeTxHash = (txHash: string) => txHash.toLowerCase();

const parseTransferAmount = (logs: ethers.Log[], userAddress: string, treasuryAddress: string): bigint | null => {
  const iface = new ethers.Interface(['event Transfer(address indexed from, address indexed to, uint256 value)']);
  const normalizedUser = userAddress.toLowerCase();
  const normalizedTreasury = treasuryAddress.toLowerCase();

  for (const log of logs) {
    if (!log.topics.length || log.topics[0] !== TRANSFER_TOPIC) continue;

    try {
      const parsed = iface.parseLog(log);
      if (!parsed) continue;

      const from = String(parsed.args.from).toLowerCase();
      const to = String(parsed.args.to).toLowerCase();

      if (from === normalizedUser && to === normalizedTreasury) {
        return BigInt(parsed.args.value.toString());
      }
    } catch {
      // Ignore logs that do not match the Transfer event ABI exactly.
    }
  }

  return null;
};

const expireSubscriptions = async (userId?: string) => {
  const now = new Date();
  await prisma.subscription.updateMany({
    where: {
      status: 'active',
      expiresAt: { lte: now },
      ...(userId ? { userId } : {})
    },
    data: {
      status: 'expired'
    }
  });
};

export const activateSubscription = async (
  userId: string,
  userAddress: string,
  planId: SubscriptionPlanId,
  txHash: string
) => {
  const normalizedTxHash = normalizeTxHash(txHash);
  const plan = (() => {
    try {
      return getSubscriptionPlan(planId);
    } catch {
      throw new SubscriptionError('Invalid subscription plan', 400);
    }
  })();
  const chainConfig = getRequiredChainConfig();

  if (!ethers.isHexString(normalizedTxHash, 32)) {
    throw new SubscriptionError('Invalid transaction hash format', 400);
  }

  const existingTx = await prisma.subscription.findUnique({
    where: { txHash: normalizedTxHash }
  });
  if (existingTx) {
    throw new SubscriptionError('This transaction hash has already been used', 409);
  }

  const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
  const [tx, receipt] = await Promise.all([
    provider.getTransaction(normalizedTxHash),
    provider.getTransactionReceipt(normalizedTxHash)
  ]);

  if (!tx || !receipt) {
    throw new SubscriptionError('Transaction was not found on configured subscription chain', 400);
  }

  if (receipt.status !== 1) {
    throw new SubscriptionError('Transaction failed on-chain', 400);
  }

  if (!tx.from || tx.from.toLowerCase() !== userAddress.toLowerCase()) {
    throw new SubscriptionError('Transaction sender does not match authenticated wallet', 403);
  }

  if (!tx.to || tx.to.toLowerCase() !== chainConfig.usdcContractAddress) {
    throw new SubscriptionError('Transaction is not a USDC transfer transaction', 400);
  }

  const usdcLogs = receipt.logs.filter((log) => log.address.toLowerCase() === chainConfig.usdcContractAddress);
  const transferAmount = parseTransferAmount(usdcLogs, userAddress, chainConfig.treasuryWalletAddress);
  if (transferAmount === null) {
    throw new SubscriptionError('No valid USDC transfer to treasury wallet found in transaction', 400);
  }

  const expectedAmount = ethers.parseUnits(plan.priceUsd.toString(), chainConfig.usdcDecimals);
  if (transferAmount !== expectedAmount) {
    throw new SubscriptionError('Transferred USDC amount does not match selected plan price', 400);
  }

  if (tx.chainId !== BigInt(chainConfig.chainId)) {
    throw new SubscriptionError('Transaction chain does not match configured subscription chain', 400);
  }

  const now = new Date();
  const expiresAt = addDays(now, SUBSCRIPTION_DURATION_DAYS);

  await expireSubscriptions(userId);
  await prisma.subscription.updateMany({
    where: { userId, status: 'active' },
    data: { status: 'cancelled' }
  });

  const subscription = await prisma.subscription.create({
    data: {
      userId,
      plan: plan.id,
      status: 'active',
      startedAt: now,
      expiresAt,
      tradeCount: 0,
      txHash: normalizedTxHash,
      amountUsd: plan.priceUsd,
      token: 'USDC',
      chainId: chainConfig.chainId,
      fromAddress: tx.from.toLowerCase(),
      toAddress: chainConfig.treasuryWalletAddress
    }
  });

  return {
    active: true,
    planId: subscription.plan,
    expiresAt: subscription.expiresAt,
    limit: plan.monthlyTradeLimit,
    used: subscription.tradeCount,
    remaining: plan.monthlyTradeLimit - subscription.tradeCount
  };
};

export const getActiveSubscription = async (userId: string) => {
  await expireSubscriptions(userId);

  const now = new Date();
  return prisma.subscription.findFirst({
    where: {
      userId,
      status: 'active',
      expiresAt: { gt: now }
    },
    orderBy: { createdAt: 'desc' }
  });
};

export const getUsageStatus = async (userId: string) => {
  const subscription = await getActiveSubscription(userId);
  if (!subscription) {
    return {
      active: false,
      planId: null,
      expiresAt: null,
      limit: 0,
      used: 0,
      remaining: 0
    };
  }

  const plan = SUBSCRIPTION_PLANS[subscription.plan];
  const remaining = Math.max(plan.monthlyTradeLimit - subscription.tradeCount, 0);

  return {
    active: true,
    planId: subscription.plan,
    expiresAt: subscription.expiresAt,
    limit: plan.monthlyTradeLimit,
    used: subscription.tradeCount,
    remaining
  };
};

export const assertBotAccessAllowed = async (userId: string) => {
  const usage = await getUsageStatus(userId);
  if (!usage.active) {
    throw new SubscriptionError('Active subscription required to use the bot', 403);
  }

  if (usage.remaining <= 0) {
    throw new SubscriptionError('Monthly trade limit reached for active subscription', 403);
  }

  return usage;
};

export const incrementTradeCount = async (userId: string, count = 1) => {
  const subscription = await getActiveSubscription(userId);
  if (!subscription) {
    throw new SubscriptionError('Active subscription not found', 404);
  }

  const plan = SUBSCRIPTION_PLANS[subscription.plan];
  const nextCount = subscription.tradeCount + count;
  if (nextCount > plan.monthlyTradeLimit) {
    throw new SubscriptionError('Trade increment would exceed monthly plan limit', 400);
  }

  return prisma.subscription.update({
    where: { id: subscription.id },
    data: { tradeCount: nextCount }
  });
};
