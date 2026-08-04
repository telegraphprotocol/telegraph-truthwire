import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import {
  activateSubscription,
  getUsageStatus,
  SubscriptionError
} from '../services/subscription.service';
import { SubscriptionPlanId } from '../config/subscription.config';

export const activate = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userAddress = req.user?.address;
    if (!userId || !userAddress) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { planId, txHash } = req.body as { planId?: SubscriptionPlanId; txHash?: string };
    if (!planId || !txHash) {
      return res.status(400).json({ error: 'planId and txHash are required' });
    }

    const subscription = await activateSubscription(userId, userAddress, planId, txHash);
    return res.json(subscription);
  } catch (error: any) {
    if (error instanceof SubscriptionError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    return res.status(500).json({ error: error.message || 'Failed to activate subscription' });
  }
};

export const status = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const usage = await getUsageStatus(userId);
    return res.json(usage);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch subscription status' });
  }
};
