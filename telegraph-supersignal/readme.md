# Polymarket Sniper Bot

Polymarket Sniper Bot is a use case built on the [Telegraph](https://telegraph.ai) platform. Connect your Web3 wallet, activate a subscription, and let the bot monitor Polymarket prediction markets, cross-reference them against real-time news via Telegraph's DeSearch subnet, and make AI-driven trade decisions every two hours — paying for each inference call on-chain via the [x402](https://x402.org) protocol on Polygon.

---

## How it works

1. Users connect their EVM wallet (MetaMask, Coinbase Wallet, etc.) and sign a message to authenticate.
2. A custodial EVM wallet is created server-side for each user to hold trading funds.
3. The user selects a subscription plan and sends the required USDC to the treasury address on Polygon. The backend verifies the on-chain transfer before activating the subscription.
4. Once the bot is toggled on, a cron job runs every two hours: it fetches relevant Polymarket markets by keyword, calls the **DeSearch** subnet (subnet 101) for fresh news context, then passes both to the **Groq LLM** subnet (subnet 102) for a trade decision (YES / NO / HOLD).
5. Decisions are stored in MongoDB and surfaced on the dashboard with reasoning and on-chain payment proof.

---

## Repository structure

```
telegraph-polymarket-bot/
├── api/           # Node.js/Express backend (TypeScript)
├── frontend/      # React/Vite dashboard (TypeScript)
└── landing-page/  # Next.js marketing page (TypeScript)
```

### [`api/`](./api/README.md)

The backend service. Manages authentication, custodial wallets, subscriptions, the decision pipeline, and MongoDB persistence.

- `POST /api/v1/auth/verify` — authenticate via EVM wallet signature, return JWT
- `POST /api/v1/wallet/create` — create a custodial EVM wallet for the authenticated user
- `POST /api/v1/subscription/activate` — verify on-chain USDC transfer and activate a plan
- `POST /api/v1/bot/toggle` — enable or disable the automated decision pipeline
- `GET /api/v1/pipeline/history` — retrieve past decisions from MongoDB

Built with **Express**, **TypeScript**, **Prisma + MongoDB**, **node-cron**, and **x402/EVM** for Polygon micro-payments.

→ See [`api/README.md`](./api/README.md) for full setup, environment variables, and API reference.

### [`frontend/`](./frontend/README.md)

The React/TypeScript dashboard. Wallet connection via RainbowKit and wagmi, subscription activation modal, bot toggle, and decision history view.

Built with **React 19**, **TypeScript**, **Vite**, **RainbowKit**, and **wagmi**.

→ See [`frontend/README.md`](./frontend/README.md) for setup and deployment docs.

### [`landing-page/`](./landing-page/README.md)

Standalone marketing page. Highlights the decision engine, feature set, and subscription plans. Deployable independently from the dashboard.

Built with **Next.js 15**, **TypeScript**, **Tailwind CSS**, and **Framer Motion**.

→ See [`landing-page/README.md`](./landing-page/README.md) for setup docs.

---

## Quick start

Two terminals — API (with MongoDB) and the frontend dashboard.

**1. Start MongoDB + API**

```bash
# Using Docker Compose (recommended — starts MongoDB replica set + API together)
docker compose up

# Or manually
cd api
npm install
cp .env.example .env   # fill in required values
npx prisma generate
npm run dev            # runs on http://localhost:3001
```

**2. Start the frontend**

```bash
cd frontend
npm install
cp .env.example .env   # fill in VITE_SUBSCRIPTION_* values
npm run dev            # runs on http://localhost:5173
```

**Landing page (optional)**

```bash
cd landing-page
npm install
npm run dev            # runs on http://localhost:3000
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend runtime | Node.js 20+ |
| Backend language | TypeScript |
| Backend framework | Express |
| Database | MongoDB with Prisma ORM |
| Job scheduler | node-cron (every 2 hours) |
| Frontend framework | React 19 |
| Frontend language | TypeScript |
| Frontend build tool | Vite |
| Wallet connection | RainbowKit + wagmi |
| Landing page | Next.js 15 |
| News retrieval | Telegraph DeSearch subnet (subnet 101) |
| Trade decisions | Telegraph Groq LLM subnet (subnet 102) |
| Payment protocol | x402 |
| Payment network | Polygon (EVM / USDC) |
| Containerisation | Docker + Docker Compose |

