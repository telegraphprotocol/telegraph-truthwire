import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getMessage = (req: Request, res: Response) => {
  const message = authService.generateLoginMessage();
  res.json({ message });
};

export const verify = async (req: Request, res: Response) => {
  const { address, signature } = req.body;
  if (!address || !signature) {
    return res.status(400).json({ error: 'Address and signature are required' });
  }

  try {
    const { token, user } = await authService.loginOrRegister(address, signature);
    return res.json({ token, user });
  } catch (error: any) {
    const isInvalidSig = error.message === 'Invalid signature';
    const status = isInvalidSig ? 401 : 500;
    console.error('[auth/verify]', error.message);
    return res.status(status).json({ error: error.message });
  }
};

import prisma from '../utils/prisma';

export const getStatus = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      include: { wallet: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      authenticated: true, 
      user: {
        id: user.id,
        address: user.address,
        hasWallet: !!user.wallet,
        custodialAddress: user.wallet?.address
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
