import jwt from 'jsonwebtoken';
import { verifySignature } from '../utils/eth';
import prisma from '../utils/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const LOGIN_MESSAGE = "Welcome to polymarket sniper bot! Sign this message to Login";

export const generateLoginMessage = () => {
  return LOGIN_MESSAGE;
};

export const loginOrRegister = async (address: string, signature: string) => {
  const isValid = verifySignature(LOGIN_MESSAGE, signature, address);
  
  if (!isValid) {
    throw new Error('Invalid signature');
  }

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { address: address.toLowerCase() },
    include: { wallet: true }
  });

  if (!user) {
    user = await prisma.user.create({
      data: { address: address.toLowerCase() },
      include: { wallet: true }
    });
  }

  // Generate JWT
  const token = jwt.sign(
    { id: user.id, address: user.address },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return { 
    token, 
    user: {
      id: user.id,
      address: user.address,
      hasWallet: !!user.wallet,
      custodialAddress: user.wallet?.address
    } 
  };
};
