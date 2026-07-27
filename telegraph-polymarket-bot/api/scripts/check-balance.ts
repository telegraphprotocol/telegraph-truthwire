/**
 * Reads the service wallet's Telegraph WebSocket escrow balance on Base Sepolia.
 * Read-only — no gas, no signing, safe to run as often as you like.
 *
 * Usage:
 *   npx ts-node scripts/check-balance.ts [walletAddress]
 *
 * If walletAddress is omitted, it's derived from SERVICE_WALLET_PRIVATE_KEY in api/.env.
 *
 * Calls the Diamond's escrow facet directly:
 *   escrowBalance(address)    -> raw deposited balance
 *   effectiveBalance(address) -> balance the Engine actually checks before allowing a WS subscription
 */
import 'dotenv/config';
import { ethers } from 'ethers';

const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
// Same Diamond address used by fund-escrow.ts — update here (or via TELEGRAPH_DIAMOND_ADDRESS)
// if Telegraph redeploys the testnet contract again.
const DIAMOND_ADDRESS = process.env.TELEGRAPH_DIAMOND_ADDRESS || '0xac683bFa8F1C892E23e8300d14c20678C6FC0CA3';

const ESCROW_ABI = [
  'function escrowBalance(address) view returns (uint256)',
  'function effectiveBalance(address) view returns (uint256)',
];

async function main() {
  let walletAddress = process.argv[2];

  if (!walletAddress) {
    const pk = process.env.SERVICE_WALLET_PRIVATE_KEY;
    if (!pk) {
      console.error('No wallet address given and SERVICE_WALLET_PRIVATE_KEY is not set in api/.env');
      process.exit(1);
    }
    walletAddress = new ethers.Wallet(pk).address;
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const escrow = new ethers.Contract(DIAMOND_ADDRESS, ESCROW_ABI, provider);

  console.log(`Wallet:  ${walletAddress}`);
  console.log(`Diamond: ${DIAMOND_ADDRESS}`);

  const [escrowBalance, effectiveBalance] = await Promise.all([
    escrow.escrowBalance(walletAddress),
    escrow.effectiveBalance(walletAddress),
  ]);

  console.log(`escrowBalance:    ${ethers.formatUnits(escrowBalance, 6)} USDC`);
  console.log(`effectiveBalance: ${ethers.formatUnits(effectiveBalance, 6)} USDC (this is what the WS auth check uses)`);

  const MIN_REQUIRED = 1.0;
  if (Number(ethers.formatUnits(effectiveBalance, 6)) < MIN_REQUIRED) {
    console.warn(`\n⚠ Below the $${MIN_REQUIRED} minimum required for WS subscriptions.`);
  } else {
    console.log('\n✓ Above the $1.00 minimum required for WS subscriptions.');
  }
}

main().catch((err) => {
  console.error('Balance check failed:', err.reason || err.shortMessage || err.message);
  process.exit(1);
});
