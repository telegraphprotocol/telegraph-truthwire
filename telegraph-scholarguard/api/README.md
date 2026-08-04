# ScholarGuard — API

Backend service for **ScholarGuard**, a use case built on the [Telegraph](https://telegraphprotocol.com) platform. Accepts uploaded academic documents (PDF or DOCX), parses them for text and images, and runs AI-content detection via the **Bitmind** (image) and **ItsAI** (text) subnets on Telegraph — paying for each inference call on-chain via the [x402](https://x402.org) protocol on Solana.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Document Parsing](#document-parsing)
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
| Runtime | Node.js (CommonJS) |
| Language | TypeScript |
| Framework | Express 5 |
| File upload | multer (memory storage) |
| PDF parsing | pdfjs-dist (text only) |
| DOCX parsing | mammoth (text + images) |
| Payment | x402 / Solana SVM |
| Default port | 3000 |

---

## Architecture

```
Client (multipart/form-data)
  │
  ▼
Express API (port 3000)
  │
  └─ POST /api/assignment/verify
        │
        ├─ Document Parser
        │   ├─ PDF  → text extraction via pdfjs-dist
        │   └─ DOCX → text + embedded images via mammoth
        │
        ├─ ItsAI Client     (Telegraph subnet 32 — text AI detection)
        │     └─ x402 fetch (pays micro-fee on Solana, captures tx hash)
        │
        └─ BitMind Client   (Telegraph subnet 34 — per image, AI detection)
              └─ x402 fetch (pays micro-fee per image, captures tx hash)
```

A separate x402 payment capture is created for each image so every transaction hash is individually tracked.

---

## API Reference

### `GET /health`

Liveness probe.

**Response `200`**
```json
{ "ok": true }
```

---

### `POST /api/assignment/verify`

Accepts a document upload, parses it, and runs full AI-content analysis.

**Request** — `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | Yes | The document to analyze. Accepted: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX). Max size: **10 MB**. |

**Response `200`**
```json
{
  "document": {
    "filename": "essay.docx",
    "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "characterCount": 4200,
    "imageCount": 2
  },
  "verification": {
    "text": {
      "status": "analyzed",
      "characterCount": 4200,
      "result": { "answer": 1, "status": "success" }
    },
    "images": [
      {
        "status": "analyzed",
        "imageIndex": 0,
        "result": { "isAI": true, "confidence": 0.94 }
      },
      {
        "status": "analyzed",
        "imageIndex": 1,
        "result": { "isAI": false, "confidence": 0.12 }
      }
    ],
    "summary": {
      "anyAiText": true,
      "anyAiImage": true,
      "anyAi": true,
      "textConfidence": 0.94,
      "analyzedImages": 2
    }
  },
  "payment": {
    "itsai": {
      "txHash": "5KtY3...",
      "network": "devnet",
      "explorerUrl": "https://explorer.solana.com/tx/5KtY3...?cluster=devnet"
    },
    "bitmind": [
      { "txHash": "8xPq1...", "network": "devnet", "explorerUrl": "https://explorer.solana.com/tx/8xPq1...?cluster=devnet" },
      { "txHash": null, "network": "devnet", "explorerUrl": null }
    ]
  },
  "parserNotes": [
    "DOCX: extracted 2 embedded image(s) for BitMind analysis."
  ]
}
```

**Response fields**

| Field | Description |
|---|---|
| `document` | Metadata about the uploaded file — filename, MIME type, character count, and image count |
| `verification.text.status` | `analyzed` — ItsAI ran; `skipped` — text too short (< 200 chars) or empty; `error` — ItsAI call failed |
| `verification.text.result.answer` | `0` = likely human-written, `1` = likely AI-generated |
| `verification.images` | One entry per extracted image. `status` is `analyzed` or `error`. |
| `verification.summary.anyAi` | `true` if either text or any image signals AI-generated content |
| `payment.itsai` | Present only when ItsAI was called. `txHash` is `null` if no x402 payment was made. |
| `payment.bitmind` | Array with one entry per image. `txHash` is `null` if payment was not required or key is unset. |
| `parserNotes` | Human-readable notes about what was extracted (e.g. skipped image extraction for PDFs) |

**Error responses**

| Status | Code | Meaning |
|---|---|---|
| 400 | `NO_FILE` | No file field in the request |
| 413 | — | File exceeds the 10 MB limit (returned by multer) |
| 422 | `PARSE_ERROR` | Document could not be parsed (corrupt file, unsupported encoding) |
| 415 | — | Unsupported MIME type (not PDF or DOCX) |
| 502 | `UPSTREAM_FAILURE` | A Telegraph subnet call failed |

---

## Document Parsing

### PDF

Text is extracted page-by-page using `pdfjs-dist`. Image extraction from PDFs is **not supported** in v1 — it requires a canvas shim in Node.js. The `parserNotes` field in the response will note this. Only the text content is sent to ItsAI.

### DOCX

Both text and embedded images are extracted using `mammoth`:
- **Text** — extracted as plain text and sent to ItsAI (if ≥ 200 characters)
- **Images** — extracted as base64 data URLs and sent to Bitmind one by one

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values.

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | Port the HTTP server binds to |
| `TELEGRAPH_BASE_URL` | No | see `.env.example` | Telegraph subnet-dispatcher host. Must use port 7044 — port 80 is nginx and returns 405. |
| `BITMIND_SUBNET_PREFIX` | No | `/subnet-dispatcher/v1/34` | Path prefix for the Bitmind subnet |
| `ITSAI_SUBNET_PREFIX` | No | `/subnet-dispatcher/v1/32` | Path prefix for the ItsAI subnet |
| `TELEGRAPH_REQUEST_TIMEOUT_MS` | No | `30000` | Request timeout in milliseconds for all subnet calls |
| `SOLANA_PRIVATE_KEY` | Yes* | — | Base58-encoded Solana private key for signing x402 payments |
| `USDC_ADDRESS` | No | see `.env.example` | Devnet USDC SPL mint address |
| `SOLANA_NETWORK` | No | `devnet` | Set to `mainnet` for production |
| `FRONTEND_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origin(s), comma-separated |

---

## Getting Started

### Prerequisites

- Node.js 20+
- A Solana wallet funded with devnet SOL and devnet USDC

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

Server starts on `http://localhost:3000`. Hot-reloads via `tsx`.

### Build & run (production)

```bash
npm run build
npm start
```

---

## Project Structure

```
api/
└── src/
    ├── server.ts                      # Entry point — binds HTTP server
    ├── app.ts                         # Express app factory, wires routes and services
    ├── config.ts                      # Environment variable config
    ├── types.ts                       # Shared interfaces (VerifyResponse, ImageDetectionResult, etc.)
    ├── errors.ts                      # Error classes
    ├── loadLocalEnv.ts                # Loads .env in development
    ├── x402Fetch.ts                   # x402 payment-wrapped fetch + tx capture
    ├── clients/
    │   ├── bitmindClient.ts           # HTTP client for Bitmind (Telegraph subnet 34)
    │   └── itsAiClient.ts             # HTTP client for ItsAI (Telegraph subnet 32)
    ├── routes/
    │   └── verifyRoute.ts             # POST /api/assignment/verify — multer upload + dispatch
    └── services/
        ├── documentParserService.ts   # PDF (text) and DOCX (text + images) extraction
        └── verificationService.ts     # Orchestrates ItsAI + Bitmind + per-call payment capture
```

---

## How x402 Payments Work

1. **`createPaymentFetch()`** initialises a Solana keypair from `SOLANA_PRIVATE_KEY` and wraps `fetch` with x402 logic via `@x402/fetch` and `@x402/svm`.
2. A **separate `PaymentCapture`** is created for each subnet call — one for ItsAI and one per image for Bitmind — so each transaction hash is tracked independently.
3. The captured `txHash` values are included in the response `payment` field, each with a Solana Explorer link.

If `SOLANA_PRIVATE_KEY` is not set, the service falls back to plain `fetch`. Subnet calls may be rejected with 402.

---

## Telegraph Subnets

| Subnet | ID | Path | Purpose |
|---|---|---|---|
| ItsAI | 32 | `POST /subnet-dispatcher/v1/32/detect` | Detects AI-generated text. Accepts `{ "text": "<content>" }`. Requires **minimum 200 characters**. Returns `{ answer: 0\|1, status: "success" }`. |
| Bitmind | 34 | `POST /subnet-dispatcher/v1/34/detect-image` | Detects AI-generated images. Accepts `{ "image": "<base64 data URL or public URL>" }`. Returns `{ isAI: bool, confidence: float }`. |

Both subnets are accessed via `TELEGRAPH_BASE_URL`. Always use port 7044 — port 80 returns 405 for POST requests.

---

## Using Telegraph APIs Directly

You do not need ScholarGuard to call these subnets. Both accept plain HTTP POST requests and follow the same x402 payment flow.

### Prerequisites

- A Solana wallet funded with devnet SOL and devnet USDC
- The wallet's base58-encoded private key for server-side payment signing
- For Node.js: `npm install @x402/fetch @x402/svm @solana/kit @scure/base`

### Subnet endpoints

All paths are relative to `TELEGRAPH_BASE_URL` (set in your `.env`).

| Subnet | Path | Input | Output |
|---|---|---|---|
| **ItsAI** (text AI detection) | `POST /subnet-dispatcher/v1/32/detect` | `{ "text": "<content>" }` | `{ "answer": 0\|1, "status": "success" }` |
| **Bitmind** (image AI detection) | `POST /subnet-dispatcher/v1/34/detect-image` | `{ "image": "<URL or base64 data URL>" }` | `{ "isAI": bool, "confidence": float }` |

> **Port 7044 is required.** The Telegraph host must be configured with port 7044 in `TELEGRAPH_BASE_URL` — port 80 returns `405 Method Not Allowed`.

### How to integrate

1. **Initialise the x402 payment client** using `@x402/fetch` and `@x402/svm`. Load your Solana keypair from `SOLANA_PRIVATE_KEY` (base58), register the SVM exact scheme, and wrap `fetch` with `wrapFetchWithPayment`. Reuse this across all calls in your process.

2. **Call the subnet** with a regular POST request using the payment-wrapped fetch. The x402 client handles any `402` automatically — signs the Solana transaction and retries.

3. **Pass images as base64 data URLs or public URLs.** Bitmind accepts both. For documents processed server-side (like DOCX files), encode the extracted image buffer as a data URL: `data:<mimeType>;base64,<base64string>`. For public web images, a plain URL is sufficient.

4. **Enforce the ItsAI minimum** on your side. ItsAI rejects inputs shorter than **200 characters**. Validate before calling to avoid wasted requests. For very short texts, either skip the call or pad with contextually neutral filler.

5. **Create a separate `PaymentCapture` per call** if you want individual transaction hashes. Sharing one capture across multiple calls will overwrite the hash each time.

6. **Capture the transaction hash** from the `payment-response` response header. The header is base64-encoded JSON — decode it and extract `transaction`, `tx`, or `signature` for use as proof of payment.

7. **Handle timeouts.** Both subnets can take several seconds. Use `AbortController` with a 30 s timeout and retry on `503`.

For Python or other languages, the x402 SDK is JavaScript-first. The simplest path is to run the ScholarGuard Node.js API as a sidecar and call `/api/assignment/verify` from your service.

### Common errors

| HTTP status | Likely cause | Fix |
|---|---|---|
| `402 Payment Required` | No payment provided | Wrap fetch with x402 client and a funded keypair |
| `405 Method Not Allowed` | Wrong port — hitting port 80 (nginx) | Ensure `TELEGRAPH_BASE_URL` includes port 7044 |
| `503` / timeout | Subnet node slow or unavailable | Increase timeout; retry with backoff |
| ItsAI rejects the request | Text shorter than 200 characters | Enforce the minimum before calling the subnet |
| Bitmind missing `isAI`/`confidence` | Partial or malformed subnet response | Log and skip; treat as inconclusive |
