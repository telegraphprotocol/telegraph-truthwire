import prisma from '../utils/prisma';
import { createNewWallet } from '../utils/eth';
import { encrypt } from '../utils/encryption';

export const getUserWalletStatus = async (userId: string) => {
  const wallet = await prisma.wallet.findUnique({
    where: { userId }
  });
  
  return {
    hasWallet: !!wallet,
    address: wallet?.address || null
  };
};

export const createCustodialWallet = async (userId: string) => {
  // Check if wallet already exists
  const existingWallet = await prisma.wallet.findUnique({
    where: { userId }
  });

  if (existingWallet) {
    throw new Error('User already has a custodial wallet');
  }

  // Generate new wallet
  const { address, privateKey } = createNewWallet();

  // Encrypt private key
  const { encrypted, iv, tag } = encrypt(privateKey);

  // Store in DB (Staring tag with IV for simpler storage if needed, but we have separate fields)
  // We'll store tag as part of encrypted string or separate
  const wallet = await prisma.wallet.create({
    data: {
      userId,
      address,
      encryptedPrivateKey: `${encrypted}:${tag}`,
      iv
    }
  });

  return {
    id: wallet.id,
    address: wallet.address
  };
};
