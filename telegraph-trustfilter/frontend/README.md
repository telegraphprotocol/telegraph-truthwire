# TrustFilter — Frontend

React/Vite single-page application for **TrustFilter**, a use case built on the [Telegraph](https://telegraphprotocol.com) platform. Submit a phone number, an SMS message, or both — a live terminal feed animates each phase of the analysis pipeline, then displays the scam verdict with confidence score, reasoning, and cryptographic on-chain payment proof.

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
| Build tool | Vite 8 |
| Routing | React Router 7 |
| Icons | Lucide React |
| Default dev port | 5173 (proxies `/api` to `http://localhost:3006`) |

No Solana wallet UI — payments are handled entirely server-side by the API.

---

## Pages & Features

### Landing Page (`/`)

Introduces TrustFilter and links to the Dashboard. Highlights the Telegraph-powered OpenAI LLM analysis and x402 payment proof.

### Dashboard (`/dashboard`)

The main analysis interface, split into two panels.

**Left panel — Submit input**

- **Phone number field** — accepts any phone number string (no formatting enforced; the LLM evaluates patterns)
- **SMS / Message text area** — paste the full message body
- At least one field must be filled before the button activates
- `Enter` (without Shift) submits the form while either field is focused
- Triggers `POST /api/analyze` against the backend

**Right panel — Live Logic Feed + Results**

#### Terminal Feed

Animates the verification lifecycle in real time across three phases:

| Phase | Log entries |
|---|---|
| **Initial Routing** | Request dispatched to Telegraph miner, session established |
| **Telegraph Analysis** | OpenAI LLM inference running, parsing model output |
| **Payment & Rail** | Micro-fee settlement on Solana, transaction ID |

Ends with a **Settlement Receipt** showing provider, timestamp, confidence, and cost.

#### Results

After the terminal feed completes, the full analysis result is shown:

- **Verdict badge** — colour-coded: red for `SCAM`, yellow for `SUSPICIOUS`, green for `LIKELY SAFE`
- **Confidence score** — percentage confidence from the model
- **Summary** — one-sentence verdict from the OpenAI LLM
- **Red Flags** — specific phrases or patterns the model identified (shown only when present)
- **Analysis Reasons** — 2–5 reasoning points explaining the verdict
- **Cryptographic Proof** — clickable Solana transaction hash linking to Solscan, proving the inference call was paid on-chain via x402

---

## Environment Variables

Copy `.env.example` to `.env` in the `frontend/` directory.

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | No | *(empty)* | Backend API base URL. **Leave blank for local development** — Vite proxies `/api` to `http://localhost:3006`. Set for deployed builds. Example: `https://trustfilter-api.onrender.com` |

---

## Getting Started

### Prerequisites

- Node.js 20+
- The [TrustFilter API](../api/README.md) running on `http://localhost:3006`

### Install

```bash
cd frontend
npm install
```

### Configure

```bash
cp .env.example .env
# VITE_API_BASE_URL can stay blank for local dev
```

### Run (development)

```bash
npm run dev
```

App served at `http://localhost:5173`. The Vite dev server proxies all `/api/*` requests to `http://localhost:3006`.

### Lint

```bash
npm run lint
```

---

## Project Structure

```
frontend/
├── index.html
├── vite.config.js             # Vite config — React plugin + /api proxy to :3006
├── eslint.config.js
└── src/
    ├── main.jsx               # App entry — mounts React + Router
    ├── App.jsx                # Route definitions (/ → LandingPage, /dashboard → DashboardPage)
    ├── index.css              # Global styles and CSS custom properties
    ├── useMousePosition.js    # Mouse-tracking hook + GlobalMouseTracker (landing glow effect)
    ├── useScrollObserver.js   # Intersection Observer hook for scroll animations
    ├── components/
    │   └── TerminalFeed.jsx   # Animated live log stream component
    └── pages/
        ├── LandingPage.jsx    # Marketing landing page
        └── DashboardPage.jsx  # Full analysis UI (form, terminal feed, results)
```

---

## Connecting to the API

In **local development**, the Vite dev server proxies `/api/*` to `http://localhost:3006`:

```js
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3006',
      changeOrigin: true
    }
  }
}
```

In **deployed builds**, set `VITE_API_BASE_URL` to the backend's public URL. Ensure the backend's `FRONTEND_ORIGIN` includes the deployed frontend's origin to allow CORS.

---

## Build & Deployment

```bash
npm run build    # outputs to dist/
npm run preview  # serves dist/ locally for testing
```

Deploy the `dist/` folder to any static host (Netlify, Vercel, Cloudflare Pages, etc.).

**Checklist before deploying:**
- [ ] Set `VITE_API_BASE_URL` to the backend's public URL
- [ ] Ensure the backend has `FRONTEND_ORIGIN` set to the deployed frontend URL
