# TruthWire — Frontend

React/Vite single-page application for **TruthWire**, a use case built on the [Telegraph](https://telegraphprotocol.com) platform. Paste an X (Twitter) post URL, watch a live terminal feed as the analysis runs, and see whether the content is authentic or AI-generated — with cryptographic on-chain payment proof.

---

## Table of Contents

- [Overview](#overview)
- [Pages & Features](#pages--features)
- [Solana Wallet Integration](#solana-wallet-integration)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Connecting to the API](#connecting-to-the-api)
- [Build & Deployment](#build--deployment)

---

## Overview

| Concern | Detail |
|---|---|
| Framework | React 19 |
| Build tool | Vite 8 |
| Routing | React Router 7 |
| Wallet | Solana Wallet Adapter (Phantom, Solflare) |
| Icons | Lucide React |

---

## Pages & Features

### Landing Page (`/`)

The entry point for the app. Introduces TruthWire and links to the Dashboard. Highlights the three core properties: Telegraph-powered inference, x402 payment, and fast risk signals.

### Dashboard (`/dashboard`)

The main verification interface. Split into two panels:

**Left panel — Submit a post URL**

- Input field accepting any `https://x.com/...` or `https://twitter.com/...` post URL
- Client-side URL validation before the request is made
- Triggers `POST /api/x/verify` against the backend API

**Right panel — Live Logic Feed + Results**

Once a request is in flight or complete, the right panel shows:

#### Terminal Feed (`TerminalFeed` component)

A real-time log stream that animates the verification lifecycle in three phases:

| Phase | Log entries |
|---|---|
| **Initial Routing** | Request broadcast to Telegraph, wallet session check, handshake established |
| **Telegraph Analysis** | Per-modality progress for Bitmind (image) and ItsAI (text), tensor compilation |
| **Payment & Rail** | Micro-fee deduction, Solana network selection, settlement transaction ID |
| **Proof Verification** | Cryptographic proof validation, final consensus verdict |

After the final phase a **Settlement Receipt** card appears showing the provider, timestamp, confidence score, and cost.

#### Post Preview

The raw X post is rendered — author handle, post text, and media. Images are displayed inline. Videos are shown with an "Analysis Unsupported" overlay (video detection is not implemented in v1).

#### Analysis Result

- **Confidence score** — percentage from Bitmind's image analysis (if images were present)
- **Verdict banner** — "Verified: Content Appears Authentic" or "Warning: High Probability of AI Generated Content"
- **Text sub-caption** — ItsAI verdict ("Likely human-written" / "Likely AI-generated") shown beneath the image score

#### Cryptographic Proof Panel

When x402 payments were made, each settlement is shown as a clickable transaction hash linking to Solana Explorer. This serves as verifiable on-chain proof that the inference calls were paid for.

#### Provider Status

Shows the active/skipped status of each Telegraph subnet:

- **Bitmind** — active when images were found; shows image count or "Video analysis not supported" warning
- **ItsAI** — active when text met the 200-character minimum; shows skip reason when the text was too short

---

## Solana Wallet Integration

The dashboard header renders a **Connect Wallet** button and a **Wallet Balances** display showing the connected wallet's SOL and USDC balances.

Supported wallets:
- [Phantom](https://phantom.app)
- [Solflare](https://solflare.com)

The app defaults to **Solana Devnet**. The RPC endpoint can be overridden via `VITE_SOLANA_RPC_URL`.

> Note: The wallet connection is for display purposes in v1. The backend holds the server-side signing key (`SOLANA_PRIVATE_KEY`) and pays for inference calls directly. The connected wallet balance is shown as context for the user.

---

## Environment Variables

Copy `.env.example` to `.env` in the `frontend/` directory. Vite only exposes variables prefixed with `VITE_`.

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | No | *(empty)* | Backend API base URL. **Leave blank during local development** — Vite's dev server proxies `/api` to `http://localhost:3000` automatically. Set this for deployed builds. Example: `https://truthwire-api.onrender.com` |
| `VITE_SOLANA_RPC_URL` | No | `https://api.devnet.solana.com` | Solana RPC endpoint. Use a private RPC (Helius, QuickNode, etc.) for production deployments to avoid public rate limits. |
| `VITE_DEVNET_USDC_MINT` | No | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` | SPL mint address for devnet USDC, used to display the wallet's USDC balance. |

---

## Getting Started

### Prerequisites

- Node.js 20+
- The [TruthWire API](../api/README.md) running on `http://localhost:3000`

### Install

```bash
cd frontend
npm install
```

### Configure

```bash
cp .env.example .env
# VITE_API_BASE_URL can stay blank for local dev (Vite proxy handles it)
```

### Run (development)

```bash
npm run dev
```

The app is served at `http://localhost:5173`. The Vite dev server proxies all `/api/*` requests to `http://localhost:3000`, so the backend must be running for verification to work.

### Lint

```bash
npm run lint
```

---

## Project Structure

```
frontend/
├── index.html
├── vite.config.js             # Vite config — React plugin + /api proxy to :3000
├── eslint.config.js
├── public/
│   ├── favicon.svg
│   └── icons.svg
└── src/
    ├── main.jsx               # App entry — mounts React, sets up SolanaProviders + Router
    ├── App.jsx                # Route definitions (/ → LandingPage, /dashboard → DashboardShell)
    ├── index.css              # Global styles and CSS custom properties
    ├── useMousePosition.js    # Mouse-tracking hook + GlobalMouseTracker component (landing glow effect)
    ├── useScrollObserver.js   # Intersection Observer hook for scroll-triggered animations
    ├── assets/                # Static images
    ├── components/
    │   └── TerminalFeed.jsx   # Animated live log stream component
    ├── pages/
    │   ├── LandingPage.jsx    # Marketing landing page
    │   ├── DashboardShell.jsx # Shell wrapper for the dashboard route
    │   └── DashboardPage.jsx  # Full verification UI (form, terminal feed, results)
    └── solana/
        ├── devnet.js          # Solana devnet connection and config constants
        ├── SolanaProviders.jsx # Wallet adapter context providers (ConnectionProvider, WalletProvider)
        └── WalletBalances.jsx  # Displays SOL and USDC balances for connected wallet
```

---

## Connecting to the API

In **local development**, no `VITE_API_BASE_URL` is needed. The Vite dev server is configured to proxy all requests starting with `/api` to `http://localhost:3000`:

```js
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true
    }
  }
}
```

In **deployed builds**, set `VITE_API_BASE_URL` to the backend's public URL. The app will then call `${VITE_API_BASE_URL}/api/x/verify` directly. Make sure the backend's `FRONTEND_ORIGIN` environment variable includes the deployed frontend's origin to allow CORS.

### Verify endpoint usage

```
POST /api/x/verify
Content-Type: application/json

{ "url": "https://x.com/username/status/1234567890" }
```

See the [API README](../api/README.md) for the full response schema.

---

## Build & Deployment

```bash
npm run build    # outputs to dist/
npm run preview  # serves the dist/ build locally for testing
```

The `dist/` folder is a standard static build. Deploy it to any static host (Netlify, Vercel, Cloudflare Pages, etc.).

**Checklist before deploying:**
- [ ] Set `VITE_API_BASE_URL` to the backend's public URL
- [ ] Set `VITE_SOLANA_RPC_URL` to a private RPC endpoint (public devnet RPC is rate-limited)
- [ ] Ensure the backend has `FRONTEND_ORIGIN` set to the deployed frontend URL
