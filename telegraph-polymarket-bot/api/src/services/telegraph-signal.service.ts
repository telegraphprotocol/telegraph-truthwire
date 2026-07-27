import crypto from 'crypto';
import WebSocket from 'ws';
import { ethers } from 'ethers';
import { SIGNAL_CONFIG } from '../config/signal.config';
import { SignalPipelineService } from './signal-pipeline.service';

// Normalized shape the pipeline works with, regardless of which wire format
// the message arrived in ("daemon" per the docs' example, or "result" which
// is what the live testnet Engine actually sends).
export interface NormalizedSignal {
  id: string;
  intent: string;
  category: string | null;
  questionText: string;
  routingSubnet: string | null;
  execution: {
    result?: unknown;
    cost_usd?: number;
    duration_ms?: number;
  };
  raw: unknown;
}

const hashId = (payload: unknown) => crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

// Docs-example shape: { id, type:"daemon", question:{text,category}, routing:{...}, execution:{...} }
const normalizeDaemonMessage = (msg: any): NormalizedSignal => ({
  id: msg.id || hashId(msg),
  intent: msg.routing?.intent || msg.question?.category || 'UNKNOWN',
  category: msg.question?.category ?? null,
  questionText: msg.question?.text || '',
  routingSubnet: msg.routing?.subnet_name ?? null,
  execution: msg.execution || {},
  raw: msg,
});

// Live testnet shape: { type:"result", data:{ subscription_id, intent, category, question, routing, execution, fired_at } }
const normalizeResultMessage = (msg: any): NormalizedSignal => {
  const data = msg.data || {};
  return {
    id: hashId({ subscription_id: data.subscription_id, question: data.question, fired_at: data.fired_at }),
    intent: data.intent || data.routing?.intent || 'UNKNOWN',
    category: data.category || null,
    questionText: data.question || '',
    routingSubnet: data.routing?.subnet_name ?? null,
    execution: data.execution || {},
    raw: msg,
  };
};

const RECONNECT_DELAY_MS = 5000;
const PING_INTERVAL_MS = 30000;
const AUTH_TIMEOUT_MS = 15000;

export class TelegraphSignalService {
  private ws: WebSocket | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private authTimer: NodeJS.Timeout | null = null;
  private wallet: ethers.Wallet | null = null;
  private pendingSubscriptionsResolve: ((subs: any[]) => void) | null = null;

  start() {
    if (!SIGNAL_CONFIG.serviceWalletPrivateKey) {
      console.error('[telegraph-signal] SERVICE_WALLET_PRIVATE_KEY is not set — cannot authenticate to Telegraph WS');
      return;
    }
    this.wallet = new ethers.Wallet(SIGNAL_CONFIG.serviceWalletPrivateKey);
    this.connect();
  }

  private connect() {
    const url = `${SIGNAL_CONFIG.telegraphWsUrl}?wallet_address=${this.wallet!.address}`;
    console.log(`[telegraph-signal] connecting to ${SIGNAL_CONFIG.telegraphWsUrl}`);
    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      console.log('[telegraph-signal] socket open — starting wallet auth');
      this.send({ action: 'auth_wallet' });
      this.authTimer = setTimeout(() => {
        console.error('[telegraph-signal] wallet auth handshake timed out — reconnecting');
        this.ws?.close();
      }, AUTH_TIMEOUT_MS);
    });

    this.ws.on('message', (data) => this.handleMessage(data));

    this.ws.on('close', (code, reason) => {
      console.warn(
        `[telegraph-signal] socket closed — code=${code} reason="${reason?.toString() || ''}" — reconnecting in ${RECONNECT_DELAY_MS}ms`
      );
      this.cleanupTimers();
      setTimeout(() => this.connect(), RECONNECT_DELAY_MS);
    });

    this.ws.on('error', (err) => {
      console.error('[telegraph-signal] socket error:', err.message);
    });
  }

  private async handleMessage(raw: WebSocket.RawData) {
    const text = raw.toString();
    console.log(`[telegraph-signal] <<< RAW MESSAGE: ${text}`);

    let msg: any;
    try {
      msg = JSON.parse(text);
    } catch {
      console.warn('[telegraph-signal] received non-JSON message, ignoring');
      return;
    }

    switch (msg.type) {
      case 'wallet_challenge': {
        const signature = await this.wallet!.signMessage(msg.data.message);
        this.send({ action: 'wallet_verify', signature });
        break;
      }
      case 'wallet_verified': {
        if (this.authTimer) clearTimeout(this.authTimer);
        console.log('[telegraph-signal] wallet verified');
        break;
      }
      case 'connected': {
        console.log('[telegraph-signal] connected — reconciling subscriptions');
        void this.reconcileSubscriptions();
        this.startPing();
        break;
      }
      case 'subscribed': {
        console.log('[telegraph-signal] subscribe ack:', JSON.stringify(msg.data ?? msg));
        break;
      }
      // Some deployments send a dedicated "subscriptions" type; the live
      // testnet instead replies to list_subscriptions with the generic
      // "result" envelope, distinguished only by having a `subscriptions`
      // array in its data (see the "result" case below, which checks for
      // this shape before treating a "result" message as a pushed signal).
      case 'subscriptions': {
        console.log('[telegraph-signal] active subscriptions:', JSON.stringify(msg.data ?? msg));
        this.resolveSubscriptionsList(msg.data?.subscriptions ?? []);
        break;
      }
      // "daemon" matches the docs' example payload shape; "result" is what the
      // live testnet Engine actually sends for a pushed signal — but the same
      // "result" envelope is also reused for the list_subscriptions reply, so
      // that shape has to be checked for first.
      case 'daemon':
      case 'result': {
        if (msg.type === 'result' && Array.isArray(msg.data?.subscriptions)) {
          console.log('[telegraph-signal] active subscriptions:', JSON.stringify(msg.data));
          this.resolveSubscriptionsList(msg.data.subscriptions);
          break;
        }

        const normalized = msg.type === 'result' ? normalizeResultMessage(msg) : normalizeDaemonMessage(msg);
        console.log(
          `[telegraph-signal] SIGNAL id=${normalized.id} intent=${normalized.intent} question="${normalized.questionText}"`
        );
        void SignalPipelineService.handleSignal(normalized).catch((err) =>
          console.error('[telegraph-signal] pipeline error:', err)
        );
        break;
      }
      case 'pong': {
        console.log('[telegraph-signal] pong received');
        break;
      }
      case 'error': {
        console.error('[telegraph-signal] server error:', msg.data ?? msg);
        break;
      }
      default:
        console.log(`[telegraph-signal] unhandled message type: ${msg.type}`);
        break;
    }
  }

  // Telegraph subscriptions are tied to the wallet, not the socket, and
  // survive a disconnect. Blindly re-subscribing on every reconnect (as
  // this used to do) piles up a new, overlapping subscription each time —
  // so the same real-world signal gets delivered once per subscription,
  // each tagged with a different subscription_id. Unsubscribing from
  // everything before creating one fresh subscription makes reconnects
  // idempotent instead of additive.
  private async reconcileSubscriptions() {
    this.send({ action: 'list_subscriptions' });
    const existing = await this.waitForSubscriptions();

    const staleIds = existing.map((sub: any) => sub?.id).filter(Boolean);
    if (staleIds.length > 0) {
      console.log('[telegraph-signal] clearing', staleIds.length, 'stale subscription(s):', staleIds);
      for (const id of staleIds) {
        this.send({ action: 'unsubscribe', subscription_id: id });
      }
    }

    console.log('[telegraph-signal] subscribing to intents:', SIGNAL_CONFIG.intents);
    this.send({ action: 'subscribe', intents: SIGNAL_CONFIG.intents });
  }

  private resolveSubscriptionsList(subs: any[]) {
    if (this.pendingSubscriptionsResolve) {
      const resolve = this.pendingSubscriptionsResolve;
      this.pendingSubscriptionsResolve = null;
      resolve(subs);
    }
  }

  private waitForSubscriptions(timeoutMs = 5000): Promise<any[]> {
    return new Promise((resolve) => {
      this.pendingSubscriptionsResolve = resolve;
      setTimeout(() => {
        if (this.pendingSubscriptionsResolve === resolve) {
          this.pendingSubscriptionsResolve = null;
          resolve([]);
        }
      }, timeoutMs);
    });
  }

  private startPing() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => this.send({ action: 'ping' }), PING_INTERVAL_MS);
  }

  private cleanupTimers() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.authTimer) clearTimeout(this.authTimer);
    this.pingTimer = null;
    this.authTimer = null;
  }

  private send(payload: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const text = JSON.stringify(payload);
      console.log(`[telegraph-signal] >>> SEND: ${text}`);
      this.ws.send(text);
    }
  }
}

export const telegraphSignalService = new TelegraphSignalService();
