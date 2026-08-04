# ReviewRadar — Frontend

React/TypeScript/Vite dashboard for **ReviewRadar**, a use case built on the [Telegraph](https://telegraphprotocol.com) platform. Paste an Amazon product URL, watch a live terminal feed as reviews are fetched and analyzed, then see a product preview, an AI-vs-human signal summary, and per-review result cards each with ItsAI verdict and on-chain payment proof.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
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
| Icons | Lucide React |
| Default dev port | 5173 (proxies `/api` to `http://localhost:3005`) |

This is the analysis dashboard only. The marketing landing page lives in [`../landing-page/`](../landing-page/README.md) and is a separate deployable.

---

## Features

**URL input**

- Accepts any Amazon product URL
- `Enter` key submits the form
- Triggers `POST /api/analyze` with the product URL

**Terminal Feed**

Animates the pipeline in real time:

| Phase | Log entries |
|---|---|
| **Initial Routing** | Request dispatched to Telegraph, SerpAPI call initiated |
| **Telegraph Analysis** | ItsAI subnet called per review, payment settlements |
| **Proof Verification** | On-chain proof confirmed, verdict compiled |

Ends with a **Settlement Receipt** card.

**Results**

After the terminal feed completes:

- **Product preview card** — product thumbnail, title, average rating, total review count, and link to Amazon
- **Signal summary** — AI-vs-human percentage bar across all analyzed reviews with counts for definitive and inconclusive results
- **Per-review cards** — one card per review showing:
  - Review title, author, date, and star rating
  - Full review body text
  - ItsAI verdict pill: "Likely AI-generated", "Likely human-written", or "Inconclusive"
  - Raw ItsAI JSON response (collapsible)
  - Cryptographic proof — Solana transaction hash linking to Solana Explorer

**Warnings and partial results**

If fewer than 3 reviews were available, a warning banner is shown. If an ItsAI call fails mid-run, partial results already collected are still displayed.

---

## Environment Variables

The frontend reads one optional environment variable.

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | No | *(empty)* | Backend API base URL. Leave blank for local development — Vite proxies `/api` to `http://localhost:3005`. Set for deployed builds. |

Create a `.env` file in the `frontend/` directory if needed:

```
VITE_API_BASE_URL=https://reviewradar-api.onrender.com
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- The [ReviewRadar API](../api/README.md) running on `http://localhost:3005`

### Install

```bash
cd frontend
npm install
```

### Run (development)

```bash
npm run dev
```

App served at `http://localhost:5173`. Vite proxies `/api/*` to `http://localhost:3005`.

---

## Project Structure

```
frontend/
├── index.html
├── vite.config.ts              # Vite config — React plugin + /api proxy to :3005
├── src/
│   ├── main.tsx                # App entry
│   ├── App.tsx                 # Full dashboard UI — search, terminal, results
│   ├── api.ts                  # Type definitions + helper functions for the analyze response
│   ├── App.css                 # Dashboard styles
│   ├── index.css               # Global base styles
│   └── components/
│       └── TerminalFeed.tsx    # Animated live log stream component
```

**`api.ts`** exports:
- `analyzeEndpoint()` — resolves the correct API URL based on `VITE_API_BASE_URL`
- `AnalyzeSuccess`, `AnalyzeItem`, `AnalyzeErrorBody`, `AmazonProductPreview` — response types
- `aggregateItsAiPercentages()` — computes human/AI/inconclusive percentages across items
- `itsAiSummary()` — extracts `answer` and `status` from the raw ItsAI JSON
- `formatReviewSummary()` — normalises review fields for display
- `solanaExplorerTxUrl()` — builds the Solana Explorer link for a transaction hash

---

## Connecting to the API

In **local development**, Vite proxies `/api/*` to `http://localhost:3005`:

```ts
// vite.config.ts
server: {
  proxy: {
    '/api': { target: 'http://localhost:3005', changeOrigin: true }
  }
}
```

In **deployed builds**, set `VITE_API_BASE_URL` to the backend's public URL. Ensure the backend has `CORS_ORIGIN` or `FRONTEND_ORIGIN` set to the deployed frontend origin.

---

## Build & Deployment

```bash
npm run build    # outputs to dist/
npm run preview  # serves dist/ locally for testing
```

Deploy `dist/` to any static host independently of the landing page.

**Checklist before deploying:**
- [ ] Set `VITE_API_BASE_URL` to the backend's public URL
- [ ] Ensure the backend has `CORS_ORIGIN` set to the deployed frontend URL
