/**
 * Funds the service wallet's Telegraph WebSocket escrow on Base Sepolia.
 *
 * Usage:
 *   npx ts-node scripts/fund-escrow.ts <usdcTokenAddress> <amountUsd>
 *
 * Example (1.5 USDC, using the canonical x402 USDC):
 *   npx ts-node scripts/fund-escrow.ts 0x036CbD53842c5426634e7929541eC2318f3dCF7e 1.5
 *
 * Requires SERVICE_WALLET_PRIVATE_KEY in api/.env and a funded wallet
 * (needs both the USDC token above and a little Base Sepolia ETH for gas).
 */
import 'dotenv/config';
import { ethers } from 'ethers';

const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
// Diamond and escrow-USDC addresses on Base Sepolia can change on testnet resets —
// discovered live via the Diamond's USDCTokenSet(address,address) event, not hardcoded docs.
const DIAMOND_ADDRESS = process.env.TELEGRAPH_DIAMOND_ADDRESS || '0xac683bFa8F1C892E23e8300d14c20678C6FC0CA3';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
];

const ESCROW_ABI = [
  'function depositUSDC(uint256 amount)',
  'function escrowBalance(address) view returns (uint256)',
];

async function main() {
  const [tokenAddress, amountArg] = process.argv.slice(2);
  if (!tokenAddress || !amountArg) {
    console.error('Usage: npx ts-node scripts/fund-escrow.ts <usdcTokenAddress> <amountUsd>');
    process.exit(1);
  }

  const pk = process.env.SERVICE_WALLET_PRIVATE_KEY;
  if (!pk) {
    console.error('SERVICE_WALLET_PRIVATE_KEY is not set in api/.env');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(pk, provider);
  console.log(`Wallet: ${wallet.address}`);

  const token = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
  const escrow = new ethers.Contract(DIAMOND_ADDRESS, ESCROW_ABI, wallet);

  const decimals: number = await token.decimals();
  const amount = ethers.parseUnits(amountArg, decimals);

  const tokenBalance = await token.balanceOf(wallet.address);
  console.log(`Token balance: ${ethers.formatUnits(tokenBalance, decimals)}`);
  if (tokenBalance < amount) {
    console.error('Insufficient token balance for this deposit amount.');
    process.exit(1);
  }

  const currentAllowance = await token.allowance(wallet.address, DIAMOND_ADDRESS);
  if (currentAllowance < amount) {
    console.log('Approving Diamond to spend USDC...');
    const approveTx = await token.approve(DIAMOND_ADDRESS, amount);
    await approveTx.wait();
    console.log(`Approved: ${approveTx.hash}`);
  } else {
    console.log('Sufficient allowance already set.');
  }

  console.log(`Depositing ${amountArg} USDC into escrow...`);
  const depositTx = await escrow.depositUSDC(amount);
  const receipt = await depositTx.wait();
  console.log(`Deposit tx: ${receipt?.hash} (status: ${receipt?.status === 1 ? 'success' : 'FAILED'})`);

  const escrowBalance = await escrow.escrowBalance(wallet.address);
  console.log(`Escrow balance now: ${ethers.formatUnits(escrowBalance, decimals)} USDC`);
}

main().catch((err) => {
  console.error('Funding failed:', err.reason || err.shortMessage || err.message);
  process.exit(1);
});
