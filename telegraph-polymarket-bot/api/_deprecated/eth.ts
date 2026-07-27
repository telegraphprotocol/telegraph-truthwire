import { ethers } from 'ethers';

export const verifySignature = (message: string, signature: string, expectedAddress: string): boolean => {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    const match = recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
    if (!match) {
      console.error(`[auth] signature mismatch — recovered: ${recoveredAddress} | expected: ${expectedAddress}`);
    }
    return match;
  } catch (error) {
    console.error('[auth] verifyMessage threw:', error);
    return false;
  }
};

export const createNewWallet = () => {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey
  };
};
