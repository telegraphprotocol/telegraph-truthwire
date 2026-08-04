# ReviewRadar — API

Backend service for **ReviewRadar**, a use case built on the [Telegraph](https://telegraphprotocol.com) platform. It fetches Amazon product reviews via **SerpAPI** and runs each review through the **ItsAI** text-detection subnet on Telegraph, paying for each inference call on-chain via the [x402](https://x402.org) protocol on Solana.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [How x402 Payments Work](#how-x402-payments-work)
- [Telegraph Subnet](#telegraph-subnet)
- [Using the Telegraph ItsAI Subnet Directly](#using-the-telegraph-itsai-subnet-directly)

---

## Overview

| Concern | Detail |
|---|---|
| Runtime | Node.js 20+ (ESM) |
| Language | TypeScript |
| Framework | Express 5 |
| Review data | SerpAPI (`amazon_product` engine) |
| Payment | x402 / Solana SVM |
| Default port | 3005 |
| Reviews per request | Up to 3 |

---

## Architecture

```
Client
  │
  ▼
Express API (port 3005)
  │
  └─ POST /api/analyze
        │
        ├─ SerpAPI             (fetch product metadata + reviews by ASIN)
        │
        └─ For each review (up to 3):
              ItsAI Client     (Telegraph subnet 32 — AI-text detection)
                └─ x402 fetch (pays micro-fee on Solana, captures tx hash)
```

Reviews are processed sequentially. If any ItsAI call fails, the request returns a 502 with partial results included in the response body.

---

## API Reference

### `GET /api/health`

Liveness probe.

**Response `200`**
```json
{ "ok": true, "service": "review-checker-api" }
```

---

### `GET /api/analyze`

Returns `405 Method Not Allowed` with a hint to use POST. Exists to prevent a confusing empty 404 when a browser opens the endpoint directly.

---

### `POST /api/analyze`

Fetches an Amazon product's reviews and runs AI-text detection on each.

**Request body**
```json
{ "productUrl": "https://www.amazon.com/dp/B08N5WRWNW" }
```

The ASIN is parsed from the URL — any standard Amazon product URL format is supported (`/dp/`, `/gp/product/`, etc.).

**Response `200`**
```json
{
  "asin": "B08N5WRWNW",
  "product": {
    "title": "Product Name",
    "image": "https://...",
    "link": "https://www.amazon.com/dp/B08N5WRWNW",
    "rating": 4.3,
    "reviewCount": 12500
  },
  "warning": null,
  "items": [
    {
      "review": {
        "title": "Great product",
        "text": "I bought this last month...",
        "author": "JohnD",
        "date": "Reviewed in the United States on May 1, 2025",
        "rating": 5
      },
      "itsAi": { "answer": 0, "status": "success" },
      "txHash": "5KtY3...abc"
    }
  ]
}
```

**Response fields**

| Field | Description |
|---|---|
| `asin` | The parsed Amazon Standard Identification Number |
| `product` | Product metadata from SerpAPI — title, thumbnail image, link, average rating, and total review count. Fields may be `null` if SerpAPI didn't return them. |
| `warning` | Set if fewer than 3 reviews were available from SerpAPI |
| `items` | Array of analyzed reviews, one per review fetched (up to 3) |
| `items[].review` | Raw review object from SerpAPI |
| `items[].itsAi` | ItsAI response — `answer: 0` = likely human, `answer: 1` = likely AI. Raw JSON is preserved and returned as-is. |
| `items[].txHash` | Solana transaction hash for the x402 payment for this review's analysis. `null` if no payment was made. |

**Error responses**

| Status | Meaning |
|---|---|
| 400 | `productUrl` missing, empty, or ASIN could not be parsed |
| 500 | `SERP_API_KEY` not configured, or x402 client failed to initialise |
| 502 | SerpAPI returned an error, or ItsAI / x402 payment failed for a review |

On a 502 from an ItsAI failure, the response includes `partial` (results collected so far), `asin`, `product`, and `warning` to allow partial display.

---

## Environment Variables

Create a `.env` file in the `api/` directory.

| Variable | Required | Description |
|---|---|---|
| `SERP_API_KEY` | Yes | API key for [SerpAPI](https://serpapi.com). Used to fetch Amazon product and review data. |
| `SOLANA_PRIVATE_KEY` | Yes* | Base58-encoded Solana private key for signing x402 payments. Without this, ItsAI calls will be rejected with 402. |
| `TELEGRAPH_BASE_URL` / `RESOURCE_SERVER_URL` | No | Telegraph subnet-dispatcher host (must include port 7044). `RESOURCE_SERVER_URL` takes precedence if both are set. Defaults to `http://localhost:7044`. |
| `SOLANA_NETWORK` | No | `devnet` (default) or `mainnet` |
| `ITSAI_REQUEST_TIMEOUT_MS` | No | Timeout in milliseconds for ItsAI calls. Defaults to `60000`. |
| `PORT` | No | Port to listen on. Defaults to `3005`. |
| `CORS_ORIGIN` / `FRONTEND_ORIGIN` | No | Allowed CORS origin(s), comma-separated. `CORS_ORIGIN` takes precedence. If unset, no CORS headers are added. |

---

## Getting Started

### Prerequisites

- Node.js 20+
- A [SerpAPI](https://serpapi.com) account and API key
- A Solana wallet funded with devnet SOL and devnet USDC

### Install

```bash
cd api
npm install
```

### Configure

```bash
# Create .env with at minimum:
# SERP_API_KEY=<your key>
# SOLANA_PRIVATE_KEY=<your base58 key>
# TELEGRAPH_BASE_URL=<your telegraph host with port 7044>
```

### Run (development)

```bash
npm run dev
```

Server starts on `http://localhost:3005`. Hot-reloads via `tsx watch`.

### Build & run (production)

```bash
npm run build
npm start
```

---

## Project Structure

```
api/
├── src/
│   ├── index.ts           # Entry point — Express app, CORS, routes
│   ├── lib/
│   │   ├── amazon.ts      # ASIN extraction from Amazon URLs
│   │   ├── serpapi.ts     # SerpAPI client — fetches product + reviews
│   │   ├── itsai.ts       # ItsAI client — text AI detection via Telegraph subnet 32
│   │   └── x402.ts        # x402 payment-wrapped fetch + tx capture
│   └── routes/
│       └── analyze.ts     # POST /api/analyze — orchestrates SerpAPI + ItsAI
└── scripts/
    └── test-serpapi.ts    # Standalone script to test SerpAPI connectivity
```

---

## How x402 Payments Work

1. **`getFetchWithPayment()`** initialises a Solana keypair from `SOLANA_PRIVATE_KEY` and wraps the global `fetch` with x402 logic via `@x402/fetch` and `@x402/svm`.
2. For each review, a new **`PaymentCapture`** is created and wrapped around the payment fetch via `withTxCapture`, so each review's transaction hash is tracked independently.
3. The `txHash` for each review is included in `items[].txHash` in the response.

If `SOLANA_PRIVATE_KEY` is not set, `getFetchWithPayment` throws and the request fails with 500.

---

## Telegraph Subnet

| Subnet | ID | Path | Purpose |
|---|---|---|---|
| ItsAI | 32 | `POST /subnet-dispatcher/v1/32/detect` | Detects AI-generated text. Accepts `{ "text": "<content>" }`. Requires **minimum 200 characters** — the service pads short reviews automatically to meet this requirement. Returns `{ answer: 0\|1, status: "success" }`. |

The subnet is accessed via `TELEGRAPH_BASE_URL` (or `RESOURCE_SERVER_URL`). Always use port 7044 — port 80 returns 405 for POST requests.

---

## Using the Telegraph ItsAI Subnet Directly

You do not need ReviewRadar to call the ItsAI subnet. It accepts plain HTTP POST requests and follows the standard x402 payment flow.

### Prerequisites

- A Solana wallet funded with devnet SOL and devnet USDC
- The wallet's base58-encoded private key for server-side payment signing
- For Node.js: `npm install @x402/fetch @x402/svm @solana/kit @scure/base`

### Subnet endpoint

All paths are relative to `TELEGRAPH_BASE_URL` (or `RESOURCE_SERVER_URL`).

| Subnet | Path | Input | Output |
|---|---|---|---|
| **ItsAI** (text AI detection) | `POST /subnet-dispatcher/v1/32/detect` | `{ "text": "<content>" }` | `{ "answer": 0\|1, "status": "success" }` |

`answer: 0` = likely human-written, `answer: 1` = likely AI-generated.

> **Port 7044 is required.** Port 80 on the same host is an nginx UI that returns `405 Method Not Allowed` for POST requests.

### How to integrate

1. **Initialise the x402 payment client** using `@x402/fetch` and `@x402/svm`. Load your Solana keypair from `SOLANA_PRIVATE_KEY` (base58), register the SVM exact scheme, and wrap `fetch` with `wrapFetchWithPayment`. This single setup can be reused across all calls in your process.

2. **Call the subnet** with a regular POST request using the payment-wrapped fetch. The x402 client handles any `402` automatically — signs and submits the Solana transaction and retries. Your code sees only the final successful response.

3. **Enforce the 200-character minimum.** ItsAI rejects inputs shorter than 200 characters. ReviewRadar pads short reviews automatically with neutral filler. Apply the same strategy in your integration if your input text may be short.

4. **Create a separate `PaymentCapture` per call** if you need individual transaction hashes. Sharing one capture across multiple calls will overwrite the hash on each request.

5. **Capture the transaction hash** from the `payment-response` response header after settlement. The header is base64-encoded JSON — decode it and extract `transaction`, `tx`, or `signature` to obtain the Solana tx hash for audit logs or proof-of-payment display.

6. **Handle timeouts.** ItsAI inference can take several seconds, especially under load. ReviewRadar uses a 60 s default (`ITSAI_REQUEST_TIMEOUT_MS`). Use `AbortController` with a generous timeout and retry on `503`.

For Python or other languages, the x402 SDK is JavaScript-first. The simplest approach is to run the ReviewRadar Node.js API as a sidecar and call `/api/analyze` from your service.

### Common errors

| HTTP status | Likely cause | Fix |
|---|---|---|
| `402 Payment Required` | No payment provided | Wrap fetch with x402 client and a funded keypair |
| `405 Method Not Allowed` | Wrong port — hitting port 80 (nginx) | Ensure `TELEGRAPH_BASE_URL` includes port 7044 |
| `503` / timeout | Subnet node slow or unavailable | Increase timeout (60 s recommended); retry with backoff |
| ItsAI rejects the request | Text shorter than 200 characters | Pad short inputs to meet the minimum before calling |
| `answer` missing from response | Unexpected subnet response format | Log the raw response; treat as inconclusive |
