# ScholarGuard — Frontend

React/Vite single-page application for **ScholarGuard**, a use case built on the [Telegraph](https://telegraphprotocol.com) platform. Drag-and-drop a PDF or DOCX assignment, watch a live terminal feed as the document is analyzed, then review per-text and per-image AI-detection results with collapsible on-chain payment proofs.

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
| Build tool | Vite |
| Routing | React Router 7 |
| Icons | Lucide React |
| Default dev port | 5173 (proxies `/api` to `http://localhost:3000`) |

No Solana wallet UI — payments are handled entirely server-side.

---

## Pages & Features

### Landing Page (`/`)

Introduces ScholarGuard and links to the Dashboard.

### Dashboard (`/dashboard`)

Single-panel layout centered on the document upload and analysis flow.

**Upload zone**

- Drag-and-drop area or click-to-browse for `.pdf` and `.docx` files
- Client-side validation: only PDF and DOCX accepted; max **10 MB**
- Shows file name and size once selected, with a "Change file" button
- Submits as `multipart/form-data` to `POST /api/assignment/verify`

**Terminal Feed**

Animates the analysis lifecycle once a request is in flight:

| Phase | Log entries |
|---|---|
| **Initial Routing** | Request dispatched to Telegraph, session established |
| **Telegraph Analysis** | ItsAI text analysis, BitMind image analysis, progress per modality |
| **Payment & Rail** | Solana micro-fee settlement, transaction IDs |
| **Proof Verification** | On-chain proof confirmation, final verdict |

Ends with a **Settlement Receipt** card.

**Results panel**

After the terminal feed completes:

- **Document info card** — filename, type (PDF/DOCX), character count, and image count
- **Overall verdict badge** — "AI Generated" or "Likely Human"
- **Text Analysis section** (ItsAI) — verdict label, AI probability, skip reason if text was too short, and individual payment proof link
- **Image Analysis section** (BitMind) — one row per extracted image with verdict, confidence percentage, and individual payment proof link. Only shown for DOCX files with embedded images.
- **Cryptographic Proofs** — collapsible panel listing all x402 settlement transaction hashes with links to Solana Explorer

---

## Environment Variables

Copy `.env.example` to `.env` in the `frontend/` directory.

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | No | *(empty)* | Backend API base URL. Leave blank for local development — Vite proxies `/api` to `http://localhost:3000`. Set for deployed builds. Example: `https://scholarguard-api.onrender.com` |

---

## Getting Started

### Prerequisites

- Node.js 20+
- The [ScholarGuard API](../api/README.md) running on `http://localhost:3000`

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

App served at `http://localhost:5173`. Vite proxies `/api/*` to `http://localhost:3000`.

### Lint

```bash
npm run lint
```

---

## Project Structure

```
frontend/
├── index.html
├── vite.config.js              # Vite config — React plugin + /api proxy to :3000
├── eslint.config.js
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx                # App entry — mounts React + Router
    ├── App.jsx                 # Route definitions (/ → LandingPage, /dashboard → DashboardPage)
    ├── index.css               # Global styles and CSS custom properties
    ├── useMousePosition.js     # Mouse-tracking hook + GlobalMouseTracker (landing glow effect)
    ├── useScrollObserver.js    # Intersection Observer hook for scroll animations
    ├── components/
    │   └── TerminalFeed.jsx    # Animated live log stream component
    └── pages/
        ├── LandingPage.jsx     # Marketing landing page
        └── DashboardPage.jsx   # Upload zone, terminal feed, and results panel
```

---

## Connecting to the API

In **local development**, Vite proxies `/api/*` to `http://localhost:3000`. In **deployed builds**, set `VITE_API_BASE_URL` to the backend's public URL and ensure the backend's `FRONTEND_ORIGIN` includes the deployed frontend origin for CORS.

---

## Build & Deployment

```bash
npm run build    # outputs to dist/
npm run preview  # serves dist/ locally for testing
```

Deploy `dist/` to any static host (Netlify, Vercel, Cloudflare Pages, etc.).

**Checklist before deploying:**
- [ ] Set `VITE_API_BASE_URL` to the backend's public URL
- [ ] Ensure the backend has `FRONTEND_ORIGIN` set to the deployed frontend URL
