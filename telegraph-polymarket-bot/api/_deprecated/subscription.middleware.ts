import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { assertBotAccessAllowed, SubscriptionError } from '../services/subscription.service';

export const requireActiveSubscription = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await assertBotAccessAllowed(userId);
    next();
  } catch (error: any) {
    if (error instanceof SubscriptionError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to verify subscription status' });
  }
};
