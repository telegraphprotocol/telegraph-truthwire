# Polymarket Sniper Bot — API

Backend service for **Polymarket Sniper Bot**, a use case built on the [Telegraph](https://telegraph.ai) platform. Manages user authentication via EVM wallet signatures, custodial wallet creation, on-chain subscription verification on Polygon, and a two-hourly decision pipeline that uses Telegraph's **DeSearch** (subnet 101) and **Groq LLM** (subnet 102) subnets — paying for each inference call on-chain via the [x402](https://x402.org) protocol on Polygon.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Authentication Flow](#authentication-flow)
- [Subscription System](#subscription-system)
- [Decision Pipeline](#decision-pipeline)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [How x402 Payments Work](#how-x402-payments-work)
- [Telegraph Subnets](#telegraph-subnets)
- [Using Telegraph APIs Directly](#using-telegraph-apis-directly)

---

## Overview

| Concern | Detail |
|---|---|
| Runtime | Node.js 20+ |
| Language | TypeScript |
| Framework | Express |
| Database | MongoDB with Prisma ORM |
| Job scheduler | node-cron (every 2 hours) |
| Payment | x402 / Polygon EVM |
| Default port | 3001 |

---

## Architecture

```
Client
  │
  ▼
Express API (port 3001)
  │
  ├─ Auth routes        (JWT via EVM wallet signature)
  ├─ Wallet routes      (custodial EVM wallet management)
  ├─ Subscription routes (on-chain USDC verification on Polygon)
  ├─ Bot routes         (toggle automated pipeline)
  │
  └─ node-cron (every 2 hours)
        │
        ├─ Polymarket API    (fetch active markets by keyword)
        │
        └─ For each market:
              DeSearch Client   (Telegraph subnet 101 — news search)
                └─ x402 fetch   (pays micro-fee on Polygon, captures tx hash)
              Groq LLM Client   (Telegraph subnet 102 — trade decision)
                └─ x402 fetch   (pays micro-fee on Polygon, captures tx hash)
```

All pipeline results are persisted to MongoDB via Prisma. A 10-second delay is applied between markets to respect subnet rate limits.

---

## Authentication Flow

Authentication uses EVM wallet signatures — no password or email required.

1. **`GET /api/v1/auth/message`** — returns a challenge string tied to the requesting wallet address.
2. The client signs the challenge with their EVM wallet (e.g. MetaMask).
3. **`POST /api/v1/auth/verify`** — verifies the signature, creates a User record if new, and returns a signed JWT.
4. All protected routes require `Authorization: Bearer <token>`.

---

## Subscription System

Subscriptions are verified on-chain against actual USDC transfers on Polygon — no off-chain trust required.

| Plan | Price | Monthly trade cap |
|---|---|---|
| `starter` | $20 USDC | 60 trades |
| `pro` | $50 USDC | 150 trades |
| `whale` | $70 USDC | 210 trades |

All plans run for **30 days**. To activate:

1. The user transfers the plan amount in USDC to the treasury wallet address on Polygon.
2. **`POST /api/v1/subscription/activate`** — the backend queries the Polygon RPC, locates the USDC transfer matching the user's wallet and expected amount, and marks the subscription active. No manual confirmation required.

The bot respects the monthly trade cap at the enforcement layer — `POST /api/v1/bot/toggle` returns an error if the cap is exhausted.

---

## Decision Pipeline

The cron job fires every two hours (`0 */2 * * *`). For each active bot user:

1. **Fetch Polymarket markets** — query Polymarket's API for open markets matching configured keywords. The number of markets per run is capped by `MARKET_FETCH_LIMIT`.
2. **DeSearch** (subnet 101) — query Telegraph for recent news relevant to the market. Rate-limit and 5xx errors are retried with exponential backoff.
3. **Groq LLM** (subnet 102) — send the market question and news context to the Groq chat endpoint on Telegraph. The LLM returns a structured decision: `action` (YES / NO / HOLD), `token`, `likelihood`, and `reason`.
4. **Persist** — the decision is written to MongoDB via Prisma as a `Decision` record nested under a `DecisionRun`.
5. **Repeat** — a 10-second pause separates each market to avoid overwhelming the subnets.

---

## API Reference

### `GET /api/v1/health`

Liveness probe.

**Response `200`**
```json
{ "ok": true }
```

---

### `GET /api/v1/auth/message`

Returns a sign challenge for the given wallet address.

**Query params**

| Param | Required | Description |
|---|---|---|
| `address` | Yes | EVM wallet address (0x…) |

**Response `200`**
```json
{ "message": "Sign this message to authenticate: <nonce>" }
```

---

### `POST /api/v1/auth/verify`

Verify a signed challenge and issue a JWT.

**Request body**
```json
{ "address": "0x...", "signature": "0x..." }
```

**Response `200`**
```json
{ "token": "<JWT>", "user": { "id": "...", "address": "0x..." } }
```

---

### `GET /api/v1/polymarket/search`

Search active Polymarket markets by keyword. Public endpoint.

**Query params**

| Param | Required | Description |
|---|---|---|
| `q` | Yes | Search keyword |

---

### `POST /api/v1/pipeline/test-run`

Trigger a single pipeline run manually without cron. Public endpoint for testing.

---

### `GET /api/v1/auth/status` *(protected)*

Returns the current user's authentication status.

---

### `GET /api/v1/user/status` *(protected)*

Returns user details including subscription status and remaining trade count.

---

### `POST /api/v1/wallet/create` *(protected)*

Creates an encrypted custodial EVM wallet for the authenticated user. The private key is encrypted with `MASTER_ENCRYPTION_KEY` before storage.

---

### `POST /api/v1/subscription/activate` *(protected)*

Verifies an on-chain USDC transfer and activates the specified plan.

**Request body**
```json
{ "plan": "starter" | "pro" | "whale", "txHash": "0x..." }
```

---

### `GET /api/v1/subscription/status` *(protected)*

Returns active subscription details: plan, expiry date, trades used, and trades remaining.

---

### `GET /api/v1/pipeline/history` *(protected)*

Returns all `DecisionRun` records for the authenticated user, including per-market decisions with reasoning and transaction hashes.

---

### `POST /api/v1/bot/toggle` *(protected)*

Enable or disable the automated trading pipeline.

**Request body**
```json
{ "enabled": true }
```

Returns `403` if no active subscription or monthly trade cap is exhausted.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values.

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3001` | Port the HTTP server binds to |
| `DATABASE_URL` | Yes | — | MongoDB connection string (Prisma format) |
| `JWT_SECRET` | Yes | — | Secret for signing and verifying JWTs |
| `MASTER_ENCRYPTION_KEY` | Yes | — | Key used to encrypt custodial wallet private keys at rest in MongoDB |
| `SUBSCRIPTION_CHAIN_ID` | Yes | — | Polygon chain ID for subscription verification (see `.env.example`) |
| `POLYGON_RPC_URL` | Yes | — | Polygon JSON-RPC endpoint |
| `POLYGON_USDC_CONTRACT_ADDRESS` | Yes | — | USDC token contract address on Polygon (see `.env.example`) |
| `SUBSCRIPTION_TREASURY_WALLET` | Yes | — | EVM address that receives subscription USDC payments (see `.env.example`) |
| `ADMIN_EVM_PRIVATE_KEY` | Yes | — | Hex-encoded EVM private key for signing x402 payments to Telegraph subnets |
| `TELEGRAPH_BASE_URL` | Yes | — | Telegraph subnet-dispatcher host with port 7044 (see `.env.example`) |
| `MARKET_MONITOR_KEYWORDS` | No | — | Comma-separated keywords for Polymarket market scanning |
| `MARKET_FETCH_LIMIT` | No | — | Max number of Polymarket markets to process per pipeline run |
| `FRONTEND_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origin(s), comma-separated |

---

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB v6.0+ with a replica set (required by Prisma for transactions — Docker Compose handles this automatically)
- An EVM wallet with Polygon MATIC (gas) and USDC (for x402 micro-payments)

### Install

```bash
cd api
npm install
```

### Configure

```bash
cp .env.example .env
# Edit .env — at minimum: DATABASE_URL, JWT_SECRET, MASTER_ENCRYPTION_KEY,
# POLYGON_RPC_URL, ADMIN_EVM_PRIVATE_KEY, TELEGRAPH_BASE_URL
```

### Database setup

```bash
npx prisma generate
npx prisma db push
```

### Run (development)

```bash
npm run dev
```

Server starts on `http://localhost:3001`. Hot-reloads via `ts-node`.

### Build & run (production)

```bash
npm run build
npm start
```

### Docker Compose (recommended)

```bash
docker compose up
```

Starts MongoDB 6.0 with a replica set initialisation container and the API together. The replica set is required by Prisma for multi-document transactions.

---

## Project Structure

```
api/
├── prisma/
│   └── schema.prisma              # MongoDB models: User, Wallet, Subscription, DecisionRun, Decision
├── src/
│   ├── index.ts                   # Entry point — Express app, CORS, routes, cron init
│   ├── config/
│   │   ├── market-monitor.config.ts   # Subnet paths, pipeline constants
│   │   └── subscription.config.ts     # Plan definitions: price, trade cap, duration
│   ├── cron/
│   │   └── scraper.cron.ts        # node-cron task — fires every 2 hours
│   ├── middleware/
│   │   └── auth.middleware.ts     # JWT verification, attaches user to request
│   ├── routes/
│   │   └── api.routes.ts          # All route registrations (public + protected)
│   ├── services/
│   │   ├── market-decision.service.ts   # Full decision pipeline orchestrator
│   │   ├── telegraph-llm.service.ts     # Groq LLM client (subnet 102)
│   │   └── telegraph-news.service.ts    # DeSearch client (subnet 101)
│   └── utils/
│       └── x402Fetch.ts           # EVM x402 payment-wrapped fetch singleton
└── Dockerfile
```

---

## How x402 Payments Work

This project uses the **EVM variant** of x402 — payments are settled on **Polygon** using USDC, not Solana.

1. **`getPaymentFetch()`** reads `ADMIN_EVM_PRIVATE_KEY` (hex format), constructs an EVM account via `viem`'s `privateKeyToAccount`, registers the exact EVM scheme via `@x402/evm`, and wraps `fetch` with `wrapFetchWithPayment` from `@x402/fetch`. The result is a singleton reused across all pipeline calls.
2. For each subnet call, a fresh **`PaymentCapture`** is created so that each transaction hash is tracked independently — one for the DeSearch call, one for the LLM call, per market.
3. Captured transaction hashes are stored alongside each `Decision` record in MongoDB and returned via `GET /api/v1/pipeline/history`.

If `ADMIN_EVM_PRIVATE_KEY` is not set, subnet calls will receive `402 Payment Required` and fail.

---

## Telegraph Subnets

| Subnet | ID | Path | Purpose |
|---|---|---|---|
| DeSearch | 101 | `POST /subnet-dispatcher/v1/101/search/mini` | Real-time news search. Accepts `{ "query": "<keyword>" }`. Returns a list of news articles with titles, snippets, and sources. Rate-limited — retry with backoff on 429. |
| Groq LLM | 102 | `POST /subnet-dispatcher/v1/102/chat` | OpenAI-compatible chat endpoint backed by Groq. Accepts `{ "model": "...", "messages": [...] }`. Returns a structured trade decision: `{ action, token, likelihood, reason }`. |

Both subnets are accessed via `TELEGRAPH_BASE_URL`. Always use port 7044 — port 80 returns 405 for POST requests.

---

## Using Telegraph APIs Directly

You do not need the Polymarket Sniper Bot to call these subnets. Both accept plain HTTP POST requests and follow the standard x402 payment flow — using the **EVM** variant on Polygon.

### Prerequisites

- An EVM wallet with Polygon MATIC (for gas) and USDC (for x402 micro-payments)
- The wallet's hex-encoded private key for server-side payment signing
- For Node.js: `npm install @x402/fetch @x402/evm viem`

### Subnet endpoints

All paths are relative to `TELEGRAPH_BASE_URL` (set in your `.env`).

| Subnet | Path | Input | Output |
|---|---|---|---|
| **DeSearch** (news search) | `POST /subnet-dispatcher/v1/101/search/mini` | `{ "query": "<keyword>" }` | Array of news articles with title, snippet, source |
| **Groq LLM** (chat) | `POST /subnet-dispatcher/v1/102/chat` | OpenAI chat format: `{ "model": "...", "messages": [...] }` | Model response text |

> **Port 7044 is required.** Port 80 on the same host is an nginx UI that returns `405 Method Not Allowed` for POST requests.

### How to integrate

1. **Initialise the EVM x402 client.** Read your private key from `ADMIN_EVM_PRIVATE_KEY` (hex format, prefixed with `0x`). Use `viem`'s `privateKeyToAccount` to construct the account. Register the exact EVM scheme with `registerExactEvmScheme` from `@x402/evm`, then wrap `fetch` with `wrapFetchWithPayment` from `@x402/fetch`. Build this wrapped fetch once at process startup and reuse it for all calls — do not re-initialise per request.

2. **Call DeSearch for news context.** Send a POST to the DeSearch path with a `query` field matching your topic. The x402 client intercepts any `402` response automatically — it constructs and submits the Polygon USDC micro-payment, then retries. Your calling code sees only the final successful response. Apply exponential backoff on `429` and `5xx` responses, as the news subnet can be temporarily rate-limited.

3. **Call the Groq LLM for a decision.** Use the standard OpenAI chat messages format. Include the market question and the relevant news snippets in the system or user message, and instruct the model to return a structured response (action, reasoning, confidence). Parse the response content before persisting or acting on it.

4. **Create a separate `PaymentCapture` per call.** The DeSearch call and the LLM call each require their own capture instance so that the two Polygon transaction hashes are recorded independently. Sharing a single capture across multiple calls will overwrite the hash on each new request.

5. **Capture the transaction hash** from the `payment-response` response header after settlement. The header value is base64-encoded JSON — decode it and extract `transaction`, `tx`, or `signature` to obtain the Polygon transaction hash for audit logs or proof-of-payment display.

6. **Handle rate limits and timeouts.** The DeSearch subnet returns `429` under high load — retry with exponential backoff and a cap of three attempts. A 10-second inter-market delay is recommended when processing multiple markets sequentially. The Groq LLM subnet can take a few seconds under load; use `AbortController` with at least a 30 s timeout.

### Common errors

| HTTP status | Likely cause | Fix |
|---|---|---|
| `402 Payment Required` | No EVM payment provided | Wrap fetch with the x402 EVM client and a funded keypair |
| `405 Method Not Allowed` | Wrong port — hitting port 80 (nginx) | Ensure `TELEGRAPH_BASE_URL` includes port 7044 |
| `429 Too Many Requests` | DeSearch rate limit hit | Retry with exponential backoff; space out concurrent calls |
| `503` / timeout | Subnet node slow or unavailable | Increase timeout; retry with backoff |
| LLM response malformed | Unexpected output format | Log the raw response and treat the run as HOLD / inconclusive |
