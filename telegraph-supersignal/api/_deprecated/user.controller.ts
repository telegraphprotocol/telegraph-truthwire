import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import * as walletService from '../services/wallet.service';
import prisma from '../utils/prisma';
import { getUsageStatus } from '../services/subscription.service';

export const getStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const [walletStatus, subscription, user] = await Promise.all([
      walletService.getUserWalletStatus(userId),
      getUsageStatus(userId),
      prisma.user.findUnique({ where: { id: userId }, select: { botEnabled: true } })
    ]);
    res.json({
      ...walletStatus,
      botEnabled: user?.botEnabled || false,
      subscription
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const setBotStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { enabled } = req.body as { enabled?: boolean };
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { botEnabled: enabled },
      select: { botEnabled: true }
    });

    return res.json({ botEnabled: user.botEnabled });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update bot status' });
  }
};
