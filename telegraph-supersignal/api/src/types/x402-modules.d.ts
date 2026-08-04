// Type stubs for ESM-only x402/Solana packages.
// These packages publish .d.mts types which require moduleResolution: node16+.
// Stubs let the CJS/CommonJS build type-check without changing tsconfig.

declare module '@x402/fetch' {
  export class x402Client {}
  export function wrapFetchWithPayment(
    fetch: typeof globalThis.fetch,
    client: InstanceType<typeof x402Client>
  ): typeof globalThis.fetch;
}

declare module '@x402/svm/exact/client' {
  import type { x402Client } from '@x402/fetch';
  export function registerExactSvmScheme(
    client: InstanceType<typeof x402Client>,
    options: { signer: unknown }
  ): void;
}

declare module '@solana/kit' {
  export function createKeyPairSignerFromBytes(bytes: Uint8Array): Promise<unknown>;
}

declare module '@scure/base' {
  export const base58: {
    decode(input: string): Uint8Array;
    encode(input: Uint8Array): string;
  };
}
