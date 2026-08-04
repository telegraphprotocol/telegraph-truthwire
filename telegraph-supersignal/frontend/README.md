# Polymarket Sniper Bot — Frontend

React/TypeScript/Vite dashboard for the **Polymarket Sniper Bot**, a use case built on the [Telegraph](https://telegraph.ai) platform. Connect an EVM wallet, activate a subscription plan, toggle automated AI-driven trading, and review the bot's decision history — all in one interface.

---

## Table of Contents

- [Overview](#overview)
- [Pages & Features](#pages--features)
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
| Language | TypeScript |
| Build tool | Vite |
| Wallet connection | RainbowKit + wagmi |
| Icons | Lucide React |
| Default dev port | 5173 (proxies `/api` to `http://localhost:3001`) |

Payments are handled entirely server-side. The frontend only sends USDC to the treasury address for subscription activation — it never signs x402 subnet payments.

---

## Pages & Features

### Wallet Connection

- RainbowKit `ConnectButton` supports MetaMask, Coinbase Wallet, WalletConnect, and other injected EVM providers.
- Once connected, the wallet address is used to request a sign challenge (`GET /api/v1/auth/message`) and authenticate (`POST /api/v1/auth/verify`).
- The returned JWT is stored in the browser and attached to all subsequent protected API calls.

### Subscription Modal

- Displays the three available plans — **Starter**, **Pro**, and **Whale** — with monthly price, trade cap, and duration.
- On plan selection the user sends the required USDC to the treasury address on Polygon via their connected wallet.
- After the transfer, `POST /api/v1/subscription/activate` is called with the transaction hash. The backend verifies the on-chain transfer and activates the subscription.

### Dashboard

- **Bot toggle** — enable or disable the automated decision pipeline. Disabled if no active subscription or the monthly trade cap is exhausted.
- **Subscription status panel** — shows the current plan, expiry date, trades used, and trades remaining.
- **Decision history** — lists all `DecisionRun` records from `GET /api/v1/pipeline/history`. Each entry shows the Polymarket market question, LLM action (YES / NO / HOLD), likelihood score, and the reasoning returned by the Groq LLM subnet.

---

## Environment Variables

Copy `.env.example` to `.env` in the `frontend/` directory.

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | No | *(empty)* | Backend API base URL. Leave blank for local dev — Vite proxies `/api` to `http://localhost:3001`. Set for deployed builds. |
| `VITE_SUBSCRIPTION_CHAIN_ID` | Yes | — | Polygon chain ID for subscription payments (see `.env.example`) |
| `VITE_SUBSCRIPTION_TOKEN_ADDRESS` | Yes | — | USDC token contract address on Polygon (see `.env.example`) |
| `VITE_SUBSCRIPTION_TREASURY_WALLET` | Yes | — | EVM address that receives subscription USDC (see `.env.example`) |
| `VITE_SUBSCRIPTION_TOKEN_DECIMALS` | No | `6` | USDC token decimal places |

---

## Getting Started

### Prerequisites

- Node.js 20+
- The [Polymarket Sniper Bot API](../api/README.md) running on `http://localhost:3001`
- MetaMask or another EVM wallet with Polygon USDC for subscription activation

### Install

```bash
cd frontend
npm install
```

### Configure

```bash
cp .env.example .env
# Fill in VITE_SUBSCRIPTION_CHAIN_ID, VITE_SUBSCRIPTION_TOKEN_ADDRESS,
# and VITE_SUBSCRIPTION_TREASURY_WALLET
```

### Run (development)

```bash
npm run dev
```

App served at `http://localhost:5173`. Vite proxies `/api/*` to `http://localhost:3001`.

---

## Project Structure

```
frontend/
├── index.html
├── vite.config.ts              # Vite config — React plugin + /api proxy to :3001
├── src/
│   ├── main.tsx                # App entry — mounts React with RainbowKit + wagmi providers
│   ├── App.tsx                 # Main dashboard — wallet auth, subscription modal, bot toggle, history
│   └── index.css               # Global styles
```

---

## Connecting to the API

In **local development**, Vite proxies `/api/*` to `http://localhost:3001`. In **deployed builds**, set `VITE_API_BASE_URL` to the backend's public URL and ensure the backend's `FRONTEND_ORIGIN` is set to the deployed frontend origin for CORS.

---

## Build & Deployment

```bash
npm run build    # outputs to dist/
npm run preview  # serves dist/ locally for testing
```

Deploy `dist/` to any static host (Netlify, Vercel, Cloudflare Pages, etc.).

**Checklist before deploying:**
- [ ] Set `VITE_API_BASE_URL` to the backend's public URL
- [ ] Set `VITE_SUBSCRIPTION_CHAIN_ID`, `VITE_SUBSCRIPTION_TOKEN_ADDRESS`, and `VITE_SUBSCRIPTION_TREASURY_WALLET`
- [ ] Ensure the backend has `FRONTEND_ORIGIN` set to the deployed frontend URL
