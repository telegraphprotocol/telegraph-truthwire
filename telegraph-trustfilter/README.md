# TrustFilter

TrustFilter is a use case built on the [Telegraph](https://telegraphprotocol.com) platform. It lets anyone submit a phone number, an SMS message, or both and instantly receive a scam risk verdict — powered by the **OpenAI LLM miner** (`gpt-4o-search-preview`) on Telegraph, with each inference call paid on-chain via the [x402](https://x402.org) protocol on Solana and a cryptographic transaction hash returned as proof.

---

## How it works

1. The user enters a phone number, a message body, or both into the dashboard.
2. The backend builds a structured scam-detection prompt and sends it to the **OpenAI LLM miner** on Telegraph (miner 102).
3. The miner call is paid automatically via x402 — a micro-fee is settled on Solana and the transaction hash is captured.
4. The model returns a strict JSON verdict: `scam`, `suspicious`, or `likely_safe`, along with a confidence score, a one-sentence summary, reasoning points, and specific red-flag phrases.
5. The frontend animates the pipeline in a live terminal feed and then displays the full result with a clickable on-chain payment proof link.

---

## Repository structure

```
telegraph-trustfilter/
├── api/          # Node.js/Express backend (TypeScript)
└── frontend/     # React/Vite single-page application
```

### [`api/`](./api/README.md)

The backend service. Exposes two HTTP endpoints:

- `POST /api/analyze` — analyzes a phone number and/or message for scam indicators, returns verdict + payment proof
- `GET /health` — liveness probe

Built with **Express 5**, **TypeScript**, and **Zod**. x402 payments are handled server-side via `@x402/fetch` + `@x402/svm`.

→ See [`api/README.md`](./api/README.md) for full setup, environment variables, API reference, and instructions for calling the Telegraph OpenAI miner directly.

### [`frontend/`](./frontend/README.md)

The React SPA. Provides a landing page and a dashboard where users submit phone numbers or messages and view results. No Solana wallet UI — all payments are handled by the API.

Built with **React 19** and **Vite 8**.

→ See [`frontend/README.md`](./frontend/README.md) for setup, environment variables, and deployment docs.

---

## Quick start

Two terminals — one for the API, one for the frontend.

**1. Start the API**

```bash
cd api
npm install
cp .env.example .env   # fill in SOLANA_PRIVATE_KEY and TELEGRAPH_BASE_URL
npm run dev            # runs on http://localhost:3006
```

**2. Start the frontend**

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_BASE_URL can stay blank for local dev
npm run dev            # runs on http://localhost:5173
```

The Vite dev server proxies all `/api/*` requests to `http://localhost:3006`.

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend runtime | Node.js 20+ (CommonJS) |
| Backend language | TypeScript |
| Backend framework | Express 5 |
| Frontend framework | React 19 |
| Frontend build tool | Vite 8 |
| AI inference | Telegraph OpenAI LLM miner (miner 102, `gpt-4o-search-preview`) |
| Payment protocol | x402 |
| Payment network | Solana (devnet / mainnet) |
