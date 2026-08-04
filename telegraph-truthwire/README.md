# TruthWire

TruthWire is a use case built on the [Telegraph](https://telegraphprotocol.com) platform. It lets anyone paste an X (Twitter) post URL and instantly find out whether its images or text are AI-generated — with every inference call paid on-chain via the [x402](https://x402.org) protocol on Solana and a cryptographic transaction hash returned as proof.

---

## How it works

1. The user pastes an X post URL into the dashboard.
2. The backend fetches the post's content (text and media) via the vxTwitter API.
3. Each image is sent to the **Bitmind** subnet on Telegraph (subnet 34) for AI-image detection.
4. The post text is sent to the **ItsAI** subnet on Telegraph (subnet 32) for AI-text detection.
5. Each subnet call is paid automatically via x402 — a micro-fee is settled on Solana and the transaction hash is captured.
6. The frontend displays the verdict, confidence score, and clickable on-chain payment proof.

---

## Repository structure

```
telegraph-truthwire/
├── api/          # Node.js/Express backend (TypeScript)
└── frontend/     # React/Vite single-page application
```

### [`api/`](./api/README.md)

The backend service. Exposes two HTTP endpoints:

- `POST /api/x/verify` — fetches a post, runs Bitmind + ItsAI analysis, returns the full result with payment proof
- `POST /api/x/post-details` — fetches raw post metadata without running analysis

Built with **Express 5**, **TypeScript**, and **Zod** for validation. x402 payments are handled by `@x402/fetch` + `@x402/svm` using a server-side Solana keypair.

→ See [`api/README.md`](./api/README.md) for setup, environment variables, API reference, and integration docs.

### [`frontend/`](./frontend/README.md)

The React SPA. Provides a landing page and a dashboard where users submit post URLs and view results. Features a live terminal feed that animates each phase of the verification pipeline — routing, analysis, payment settlement, and proof verification.

Built with **React 19**, **Vite 8**, and the **Solana Wallet Adapter** (Phantom, Solflare).

→ See [`frontend/README.md`](./frontend/README.md) for setup, environment variables, and deployment docs.

---

## Quick start

You need two terminals — one for the API, one for the frontend.

**1. Start the API**

```bash
cd api
npm install
cp .env.example .env   # fill in SOLANA_PRIVATE_KEY and TELEGRAPH_BASE_URL
npm run dev            # runs on http://localhost:3000
```

**2. Start the frontend**

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_BASE_URL can stay blank for local dev
npm run dev            # runs on http://localhost:5173
```

The Vite dev server proxies all `/api/*` requests to `http://localhost:3000`, so no cross-origin configuration is needed locally.

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend runtime | Node.js 20+ (CommonJS) |
| Backend language | TypeScript |
| Backend framework | Express 5 |
| Frontend framework | React 19 |
| Frontend build tool | Vite 8 |
| AI inference | Telegraph subnets (Bitmind, ItsAI) |
| Payment protocol | x402 |
| Payment network | Solana (devnet / mainnet) |
| X post data | vxTwitter API |
