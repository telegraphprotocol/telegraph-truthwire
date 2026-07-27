import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import * as walletService from '../services/wallet.service';

export const createWallet = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const wallet = await walletService.createCustodialWallet(userId);
    res.json(wallet);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
