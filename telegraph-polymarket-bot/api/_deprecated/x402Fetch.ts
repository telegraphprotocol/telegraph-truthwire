type FetchFn = typeof fetch;

let _fetchWithPayment: FetchFn | null = null;

export function extractTxHash(headers: Headers): string | null {
  const settle = headers.get('x-payment-settle-response') ?? headers.get('payment-response');
  if (!settle) return null;
  const candidates: string[] = [settle];
  try { candidates.push(Buffer.from(settle, 'base64').toString('utf8')); } catch { /* not base64 */ }
  for (const candidate of candidates) {
    try {
      const json = JSON.parse(candidate) as Record<string, unknown>;
      const val = json['transaction'] ?? json['tx'] ?? json['signature'];
      if (typeof val === 'string') return val;
    } catch {
      if (/^[1-9A-HJ-NP-Za-km-z]{32,88}$/.test(candidate)) return candidate;
      if (/^0x[a-fA-F0-9]{64}$/.test(candidate)) return candidate;
    }
  }
  return null;
}

export async function getX402Fetch(): Promise<FetchFn> {
  if (_fetchWithPayment) return _fetchWithPayment;

  const solKey = process.env.SOLANA_PRIVATE_KEY?.trim();
  if (!solKey) {
    console.warn('[x402] SOLANA_PRIVATE_KEY not set — unauthenticated fetch active (Telegraph APIs will return 402)');
    _fetchWithPayment = fetch as FetchFn;
    return _fetchWithPayment;
  }

  try {
    const [x402Fetch, x402Svm, solanaKit, scureBase] = await Promise.all([
      import('@x402/fetch'),
      import('@x402/svm/exact/client'),
      import('@solana/kit'),
      import('@scure/base'),
    ]);

    const { x402Client, wrapFetchWithPayment } = x402Fetch;
    const { registerExactSvmScheme } = x402Svm;
    const { createKeyPairSignerFromBytes } = solanaKit;
    const { base58 } = scureBase;

    const client = new x402Client();
    const signer = await createKeyPairSignerFromBytes(base58.decode(solKey));
    registerExactSvmScheme(client, { signer });

    _fetchWithPayment = wrapFetchWithPayment(fetch, client) as FetchFn;
    console.log('[x402] Payment fetch initialised — Solana SVM scheme registered');
    return _fetchWithPayment;
  } catch (err) {
    console.error('[x402] Failed to initialise payment fetch:', (err as Error).message);
    console.warn('[x402] Falling back to plain fetch — API calls may fail if gated');
    _fetchWithPayment = fetch as FetchFn;
    return _fetchWithPayment;
  }
}
