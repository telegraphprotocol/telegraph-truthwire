# TruthWire — API

Backend service for **TruthWire**, a use case built on the [Telegraph](https://telegraphprotocol.com) platform. It fetches X (Twitter) posts and runs them through two AI-detection subnets — **Bitmind** (image analysis) and **ItsAI** (text analysis) — paying for each inference call on-chain via the [x402](https://x402.org) protocol on Solana.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [How x402 Payments Work](#how-x402-payments-work)
- [Telegraph Subnets](#telegraph-subnets)
- [Using Telegraph APIs Directly](#using-telegraph-apis-directly)
- [Running Tests](#running-tests)

---

## Overview

| Concern | Detail |
|---|---|
| Runtime | Node.js (CommonJS) |
| Language | TypeScript |
| Framework | Express 5 |
| Validation | Zod |
| Payment | x402 / Solana SVM |
| Test runner | Vitest |

---

## Architecture

```
Client
  │
  ▼
Express API (port 3000)
  │
  ├─ POST /api/x/post-details   ──► VxTwitter API  (fetch post metadata)
  │
  └─ POST /api/x/verify
        │
        ├─ VxTwitter API           (fetch post text + media URLs)
        │
        ├─ BitMind Client          (Telegraph subnet 34 — image AI detection)
        │     └─ x402 fetch        (pays micro-fee on Solana, captures tx hash)
        │
        └─ ItsAI Client            (Telegraph subnet 32 — text AI detection)
              └─ x402 fetch        (pays micro-fee on Solana, captures tx hash)
```

Each subnet call is wrapped in an **x402-enabled fetch**. If the subnet returns a `402 Payment Required`, the client automatically signs and submits a Solana transaction, retries the request, and records the settlement transaction hash for the response.

---

## API Reference

### `GET /health`

Liveness probe.

**Response `200`**
```json
{ "ok": true }
```

---

### `POST /api/x/post-details`

Fetches raw post metadata from X without running AI analysis.

**Request body**
```json
{ "url": "https://x.com/username/status/1234567890" }
```

**Response `200`**
```json
{
  "post": {
    "id": "1234567890",
    "authorHandle": "username",
    "text": "Post text content",
    "media": [
      { "type": "image", "url": "https://...", "previewUrl": "https://..." }
    ],
    "sourceUrl": "https://x.com/username/status/1234567890"
  },
  "meta": {
    "fetchedAt": "2026-05-11T10:00:00.000Z",
    "provider": "vx-twitter"
  }
}
```

**Error responses**

| Status | Code | Meaning |
|---|---|---|
| 400 | `INVALID_INPUT` | URL is missing or not a valid X/Twitter post URL |
| 502 | `UPSTREAM_FAILURE` | VxTwitter API returned an error |

---

### `POST /api/x/verify`

Main endpoint. Fetches the post, runs image and text AI detection, and returns the full verification result with on-chain payment proof.

**Request body**
```json
{ "url": "https://x.com/username/status/1234567890" }
```

**Response `200`**
```json
{
  "post": {
    "id": "1234567890",
    "authorHandle": "username",
    "text": "Post text content",
    "media": [{ "type": "image", "url": "https://..." }],
    "sourceUrl": "https://x.com/username/status/1234567890"
  },
  "meta": {
    "fetchedAt": "2026-05-11T10:00:00.000Z",
    "provider": "vx-twitter"
  },
  "verification": {
    "images": [
      {
        "mediaUrl": "https://...",
        "status": "analyzed",
        "result": { "isAI": true, "confidence": 0.97 }
      }
    ],
    "skipped": [
      {
        "mediaUrl": "https://...",
        "type": "video",
        "reason": "Video analysis not implemented in v1"
      }
    ],
    "text": {
      "status": "analyzed",
      "characterCount": 240,
      "result": { "answer": 1, "status": "success" }
    },
    "summary": {
      "totalMedia": 1,
      "analyzedCount": 1,
      "skippedCount": 0,
      "failedCount": 0,
      "anyAiMedia": true,
      "maxConfidence": 0.97,
      "textOnly": false,
      "textAnswer": 1,
      "anyAiText": true,
      "anyAi": true
    }
  },
  "payment": {
    "bitmind": {
      "txHash": "5Kv3...",
      "network": "solana-devnet",
      "explorerUrl": "https://explorer.solana.com/tx/5Kv3...?cluster=devnet"
    },
    "itsai": {
      "txHash": "9xPq...",
      "network": "solana-devnet",
      "explorerUrl": "https://explorer.solana.com/tx/9xPq...?cluster=devnet"
    }
  }
}
```

**Verification field notes**

| Field | Description |
|---|---|
| `verification.images` | One entry per image in the post. `status` is `analyzed` or `failed`. |
| `verification.skipped` | Media that was not sent for analysis (videos and GIFs are not supported in v1). |
| `verification.text.status` | `analyzed` — ran ItsAI; `skipped` — text shorter than 200 characters; `empty` — no text; `failed` — ItsAI error. |
| `summary.anyAi` | `true` if **any** modality (image or text) signals AI-generated content. `null` if nothing was analyzable. |
| `payment` | Present only when at least one x402 settlement occurred. Each sub-field is present only for its respective subnet. |

**Error responses**

| Status | Code | Meaning |
|---|---|---|
| 400 | `INVALID_INPUT` | URL is missing or not a valid X/Twitter post URL |
| 502 | `UPSTREAM_FAILURE` | One or more upstream services failed |
| 503 | `BITMIND_TIMEOUT` / `ITSAI_TIMEOUT` | Subnet request timed out |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values.

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | Port the HTTP server binds to |
| `TELEGRAPH_BASE_URL` | No | see `.env.example` | Telegraph subnet-dispatcher host. **Must use port 7044** — port 80 is nginx and returns 405 for POST requests. |
| `BITMIND_SUBNET_PREFIX` | No | `/subnet-dispatcher/v1/34` | URL prefix for the Bitmind subnet (subnet 34) |
| `ITSAI_SUBNET_PREFIX` | No | `/subnet-dispatcher/v1/32` | URL prefix for the ItsAI subnet (subnet 32) |
| `TELEGRAPH_REQUEST_TIMEOUT_MS` | No | `30000` | Default timeout (ms) for all Telegraph subnet calls |
| `BITMIND_REQUEST_TIMEOUT_MS` | No | *(falls back to TELEGRAPH_REQUEST_TIMEOUT_MS)* | Per-request timeout for Bitmind calls |
| `ITSAI_REQUEST_TIMEOUT_MS` | No | *(falls back to TELEGRAPH_REQUEST_TIMEOUT_MS)* | Per-request timeout for ItsAI calls |
| `VX_API_BASE` | No | `https://api.vxtwitter.com` | vxTwitter API base URL used to resolve X post metadata |
| `SOLANA_PRIVATE_KEY` | Yes* | — | Base58-encoded Solana private key for signing x402 payments. Without this, requests will proceed unpaid and will likely be rejected by the subnets. |
| `USDC_ADDRESS` | No | see `.env.example` | Devnet USDC SPL mint address |
| `SOLANA_NETWORK` | No | `devnet` | Set to `mainnet` for production. Affects the Solana Explorer URL in payment proofs. |
| `FRONTEND_ORIGIN` | No | *(allow all)* | Comma-separated list of allowed CORS origins. Leave blank during local development. Example: `https://myapp.netlify.app` |

> **Note on `DNS_RESULT_ORDER`:** By default the server forces `ipv4first` to avoid IPv6 fetch failures when calling Telegraph. Set `DNS_RESULT_ORDER=verbatim` to restore system default ordering.

---

## Getting Started

### Prerequisites

- Node.js 20+
- A Solana wallet with devnet SOL and devnet USDC (for x402 payments)

### Install

```bash
cd api
npm install
```

### Configure

```bash
cp .env.example .env
# Edit .env — at minimum, set SOLANA_PRIVATE_KEY
```

### Run (development)

```bash
npm run dev
```

The server starts on `http://localhost:3000`. Hot-reloads via `tsx`.

### Build & run (production)

```bash
npm run build   # compiles TypeScript to dist/
npm start       # runs dist/server.js
```

---

## Project Structure

```
api/
├── src/
│   ├── server.ts              # Entry point — binds HTTP server
│   ├── app.ts                 # Express app factory, wires routes and services
│   ├── config.ts              # Reads and validates environment variables
│   ├── types.ts               # Shared TypeScript interfaces (XPostDetails, PostMedia, FetchMeta)
│   ├── errors.ts              # UpstreamError class
│   ├── loadLocalEnv.ts        # Loads .env in development
│   ├── x402Fetch.ts           # x402 payment-wrapped fetch factory + tx capture
│   ├── clients/
│   │   ├── bitmindClient.ts   # HTTP client for Bitmind (Telegraph subnet 34)
│   │   └── itsAiClient.ts     # HTTP client for ItsAI (Telegraph subnet 32)
│   ├── providers/
│   │   ├── xPostProvider.ts   # Interface for X post data providers
│   │   └── vxTwitterPostProvider.ts  # Implementation using vxTwitter API
│   ├── routes/
│   │   ├── postDetailsRoute.ts  # POST /api/x/post-details
│   │   └── verifyRoute.ts       # POST /api/x/verify
│   ├── services/
│   │   ├── xPostService.ts       # Wraps provider, normalises post data
│   │   └── verificationService.ts # Orchestrates Bitmind + ItsAI + payment capture
│   └── validation/
│       └── xPostUrl.ts          # Zod schema for X/Twitter post URLs
└── tests/
    ├── post-details.test.ts
    └── verify.validation.test.ts
```

---

## How x402 Payments Work

The x402 protocol enables HTTP-native micropayments: a server returns `402 Payment Required` when the caller has not yet paid, the client pays on-chain, and then retries the request with proof of payment.

In this service:

1. **`createPaymentFetch()`** (in `x402Fetch.ts`) initialises a Solana keypair from `SOLANA_PRIVATE_KEY` and wraps the global `fetch` with x402 payment logic using `@x402/fetch` and `@x402/svm`.
2. For each verification, a new **`PaymentCapture`** object (just `{ txHash: undefined }`) is created per subnet (Bitmind, ItsAI).
3. **`withTxCapture()`** wraps the payment fetch further to intercept the `payment-response` / `x-payment-settle-response` header returned after a successful settlement and extracts the Solana transaction hash.
4. The captured `txHash` values are returned in the `payment` field of the `/verify` response, with Solana Explorer links, serving as **cryptographic proof** that the inference was paid for.

If `SOLANA_PRIVATE_KEY` is not set, the service falls back to plain `fetch` and logs a warning. Subnet calls may be rejected with 402.

---

## Telegraph Subnets

| Subnet | ID | Endpoint | Purpose |
|---|---|---|---|
| Bitmind | 34 | `POST /subnet-dispatcher/v1/34/detect-image` | Detects AI-generated images. Accepts `{ "image": "<url>" }`. Returns `{ isAI, confidence }`. |
| ItsAI | 32 | `POST /subnet-dispatcher/v1/32/detect` | Detects AI-generated text. Accepts `{ "text": "<content>" }`. Requires **minimum 200 characters**. Returns `{ answer, status }` where `answer: 0` = human, `answer: 1` = AI. |

Both subnets are accessed through the Telegraph subnet-dispatcher at `TELEGRAPH_BASE_URL`. **Always use port 7044** — port 80 on the same host runs an nginx UI that returns `405 Method Not Allowed` for POST requests to the dispatcher path.

---

## Using Telegraph APIs Directly

You do not need TruthWire to call the Telegraph subnets. The subnet-dispatcher is a plain HTTP API — any language or tool that can make HTTP POST requests and handle the x402 payment handshake can use it.

### Prerequisites

- A **Solana wallet** funded with devnet SOL (for gas) and devnet USDC (for subnet fees). Airdrop SOL at [faucet.solana.com](https://faucet.solana.com); request devnet USDC from Circle's faucet.
- The wallet's **base58-encoded private key** (keep this secret — it signs payment transactions server-side).
- For Node.js: `npm install @x402/fetch @x402/svm @solana/kit @scure/base`

---

### Subnet endpoints

All paths are relative to `TELEGRAPH_BASE_URL` (set in your `.env`).

| Subnet | Path | Input | Output |
|---|---|---|---|
| **Bitmind** (image AI detection) | `POST /subnet-dispatcher/v1/34/detect-image` | `{ "image": "<public image URL>" }` | `{ "isAI": bool, "confidence": float }` |
| **ItsAI** (text AI detection) | `POST /subnet-dispatcher/v1/32/detect` | `{ "text": "<content>" }` | `{ "answer": 0\|1, "status": "success" }` |

> **Port 7044 is required.** The Telegraph host must be configured with port 7044 in `TELEGRAPH_BASE_URL` — port 80 on the same host is an nginx UI that returns `405 Method Not Allowed` for POST requests to `/subnet-dispatcher/...`.

---

### How to integrate

1. **Initialise the x402 payment client** using `@x402/fetch` and `@x402/svm`. Load your Solana keypair from `SOLANA_PRIVATE_KEY` (base58), register the SVM exact scheme, and wrap the global `fetch` with `wrapFetchWithPayment`. This single setup can be reused across all subnet calls in your process.

2. **Call the subnet** with a regular POST request using the payment-wrapped fetch. If the subnet requires payment (`402`), the x402 client automatically signs and submits the Solana transaction and retries — your code sees only the final successful response.

3. **Capture the transaction hash** (optional). After settlement, the subnet returns a `payment-response` header containing a base64-encoded JSON payload. Decode it and extract `transaction`, `tx`, or `signature` to get the Solana tx hash for audit logs or proof-of-payment display. Build the explorer link as `https://explorer.solana.com/tx/<txHash>?cluster=devnet`.

4. **Enforce ItsAI's minimum** before calling the text subnet. ItsAI rejects inputs shorter than **200 characters** — validate on your side to avoid a wasted request.

5. **Handle timeouts**. Subnet inference can take several seconds. Use `AbortController` with a timeout (30 s is a reasonable default) and retry with exponential backoff on `503`.

For Python or other languages, the x402 SDK is JavaScript-first. The recommended approach is to run the TruthWire Node.js API as a sidecar and call `/api/x/verify` from your service, letting Node.js own the payment logic. Alternatively, implement the x402 handshake manually against the [x402 spec](https://x402.org).

---

### Common errors

| HTTP status | Likely cause | Fix |
|---|---|---|
| `402 Payment Required` | No payment provided | Wrap fetch with x402 client and a funded keypair |
| `405 Method Not Allowed` | Wrong port — hitting port 80 (nginx) | Ensure `TELEGRAPH_BASE_URL` includes port 7044 |
| `503` / timeout | Subnet node slow or unavailable | Increase timeout; retry with backoff |
| Bitmind missing `isAI`/`confidence` | Partial subnet response | Log and skip; treat as inconclusive |
| ItsAI rejects the request | Text shorter than 200 characters | Enforce the minimum before calling the subnet |

---

## Running Tests

```bash
npm test
```

Tests use Vitest and cover URL validation and route-level request/response contracts.
