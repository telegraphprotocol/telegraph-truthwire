# Polymarket Sniper Bot — Landing Page

Standalone marketing page for the **Polymarket Sniper Bot**, a use case built on the [Telegraph](https://telegraph.ai) platform. Presents the product's AI decision engine, feature highlights, subscription plans, and a call to action. Deployable independently from the dashboard.

---

## Table of Contents

- [Overview](#overview)
- [Sections](#sections)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Build & Deployment](#build--deployment)

---

## Overview

| Concern | Detail |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion + AOS |
| Icons | Lucide React + Radix UI Icons |
| 3D visuals | react-globe.gl (Three.js) |

---

## Sections

- **Hero** — animated headline and CTA linking to the dashboard
- **Decision Engine** — illustrates how DeSearch (news retrieval) and Groq LLM combine to drive trade decisions
- **How It Works** — step-by-step explainer: connect wallet → activate subscription → enable bot → review decisions
- **Features** — grid of key capabilities (real-time monitoring, AI decisions, on-chain proof, multi-keyword scanning, subscription plans, Polygon payments)
- **Wallets** — supported EVM wallet providers (MetaMask, Coinbase Wallet, WalletConnect, etc.)
- **Integrations & Partnerships** — Telegraph, Polymarket, Polygon logos and context
- **Call to Action** — link to the dashboard

---

## Getting Started

### Prerequisites

- Node.js 20+

### Install

```bash
cd landing-page
npm install
```

### Run (development)

```bash
npm run dev
```

App served at `http://localhost:3000`. Uses Turbopack for fast hot-module replacement.

### Build & run (production)

```bash
npm run build
npm start
```

---

## Project Structure

```
landing-page/
├── next.config.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout — fonts, providers, global CSS
│   │   ├── page.tsx            # Home page — assembles all sections
│   │   └── globals.css         # Global styles and CSS custom properties
│   ├── components/
│   │   ├── header.tsx          # Top navigation bar
│   │   ├── footer.tsx          # Footer with links
│   │   ├── hero-section.tsx    # Hero section
│   │   └── sections/
│   │       ├── decision-engine-section.tsx
│   │       ├── how-it-works-section.tsx
│   │       ├── wallets-section.tsx
│   │       ├── integrations-partnerships-section.tsx
│   │       └── call-to-action-section.tsx
│   ├── data/
│   │   ├── features.ts         # Feature card content
│   │   └── why-choose-us.ts    # "Why choose us" section content
│   └── providers/
│       └── index.tsx           # Client-side provider wrapper
└── public/
    └── images/                 # Static assets — logos, screenshots, icons
```

---

## Build & Deployment

```bash
npm run build    # production Next.js build
npm start        # serve the production build
```

Deploy to any Node.js host or to Vercel (recommended for Next.js — zero-config deployment).

**Checklist before deploying:**
- [ ] Update dashboard CTA links to point to the deployed dashboard URL
