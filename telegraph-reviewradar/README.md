# ReviewRadar

ReviewRadar is a use case built on the [Telegraph](https://telegraphprotocol.com) platform. Paste an Amazon product URL — ReviewRadar fetches recent reviews via **SerpAPI**, runs each one through the **ItsAI** text-detection subnet on Telegraph, and displays an AI-vs-human breakdown with cryptographic on-chain payment proof per review.

---

## How it works

1. The user pastes an Amazon product URL into the dashboard.
2. The backend extracts the ASIN from the URL and calls **SerpAPI** to fetch product metadata and up to 3 recent reviews.
3. Each review's title and body are combined and sent to the **ItsAI** subnet (subnet 32) on Telegraph for AI-text detection.
4. Each subnet call is paid automatically via x402 — a micro-fee is settled on Solana and the transaction hash is captured.
5. The frontend renders a product preview, an AI-vs-human signal summary across the sample, and a per-review card with the ItsAI verdict and a clickable Solana transaction link.

---

## Repository structure

```
telegraph-reviewradar/
├── api/           # Node.js/Express backend (TypeScript, ESM)
├── frontend/      # React/Vite dashboard (TypeScript)
└── landing-page/  # Standalone React/Vite marketing page (TypeScript)
```

### [`api/`](./api/README.md)

The backend service. Fetches Amazon reviews via SerpAPI and runs ItsAI detection on each.

- `POST /api/analyze` — accepts `{ productUrl }`, returns product info + per-review AI detection results with payment proofs
- `GET /api/health` — liveness probe

Built with **Express 5**, **TypeScript** (ESM), **dotenv**, and **x402** for Solana micro-payments.

→ See [`api/README.md`](./api/README.md) for full setup, environment variables, and API reference.

### [`frontend/`](./frontend/README.md)

The React/TypeScript dashboard. Single-page app with a URL input, live terminal feed, product preview panel, signal summary chart, and per-review result cards each showing the ItsAI verdict and on-chain proof.

Built with **React 19**, **TypeScript**, and **Vite**.

→ See [`frontend/README.md`](./frontend/README.md) for setup and deployment docs.

### `landing-page/`

Standalone marketing page for ReviewRadar. Includes glassmorphism UI with mouse-reactive background, feature highlights, supported platforms (Amazon, eBay, Google Play, App Store), FAQ, and a CTA. Deployable independently from the dashboard.

Built with **React 19**, **TypeScript**, and **Vite**.

---

## Quick start

Two terminals — one for the API, one for the frontend.

**1. Start the API**

```bash
cd api
npm install
cp .env.example .env   # fill in SERP_API_KEY, SOLANA_PRIVATE_KEY, TELEGRAPH_BASE_URL
npm run dev            # runs on http://localhost:3005
```

**2. Start the frontend**

```bash
cd frontend
npm install
npm run dev            # runs on http://localhost:5173
```

The Vite dev server proxies all `/api/*` requests to `http://localhost:3005`.

**Landing page (optional)**

```bash
cd landing-page
npm install
npm run dev
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend runtime | Node.js 20+ (ESM) |
| Backend language | TypeScript |
| Backend framework | Express 5 |
| Review data | SerpAPI (`amazon_product` engine) |
| Frontend framework | React 19 |
| Frontend language | TypeScript |
| Frontend build tool | Vite |
| Text AI detection | Telegraph ItsAI subnet (subnet 32) |
| Payment protocol | x402 |
| Payment network | Solana (devnet / mainnet) |
