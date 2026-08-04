# Telegraph Use Cases

This repository contains a collection of use cases built on the [Telegraph](https://telegraphprotocol.com) platform — a decentralised AI inference network that exposes specialised machine-learning subnets as HTTP APIs. Each subnet performs a specific task (text analysis, image detection, news retrieval, LLM inference) and is accessible to any application via standard HTTP POST requests.

---

## About Telegraph

Telegraph routes inference requests to a network of independently operated nodes. Each call is metered and paid on-chain via the [x402](https://x402.org) protocol — a payment standard embedded in the HTTP layer. When an application makes a request to a subnet, the server automatically handles the `402 Payment Required` challenge, settles a micro-fee on-chain, and retries — making AI inference as simple as calling any REST API.

Use cases in this repository pay via **Solana** (USDC on devnet) or **Polygon** (USDC on EVM), depending on the project.

---

## Subnets used

| Subnet | ID | Purpose |
|---|---|---|
| ItsAI | 32 | Detects AI-generated text. Returns `answer: 0` (human) or `answer: 1` (AI). |
| Bitmind | 34 | Detects AI-generated images. Returns `isAI` boolean and `confidence` score. |
| DeSearch | 101 | Real-time news search. Returns article titles, snippets, and sources. |
| Groq LLM | 102 | OpenAI-compatible chat endpoint backed by Groq. General-purpose LLM inference. |

---

## Use cases

### [TruthWire](./telegraph-truthwire/README.md)

Paste an X (Twitter) post URL — TruthWire fetches the post via the vxTwitter API and runs AI-content detection on both the post text (ItsAI, subnet 32) and any attached images (Bitmind, subnet 34). Results are displayed with per-modality verdicts and cryptographic on-chain payment proof.

**Subnets:** ItsAI (32), Bitmind (34) — **Payment:** Solana USDC

---

### [TrustFilter](./telegraph-trustfilter/README.md)

Submit a URL or message — TrustFilter sends it to the Groq LLM subnet (subnet 102) on Telegraph for scam and phishing analysis. The model returns one of three verdicts: `scam`, `suspicious`, or `likely_safe`, with a plain-English explanation of its reasoning.

**Subnets:** Groq LLM (102) — **Payment:** Solana USDC

---

### [ScholarGuard](./telegraph-scholarguard/README.md)

Upload a PDF or DOCX academic document — ScholarGuard parses the file, sends the extracted text to ItsAI (subnet 32) for AI-writing detection, and sends any embedded images to Bitmind (subnet 34) for AI-image detection. Each inference call is paid separately and every transaction hash is included in the response.

**Subnets:** ItsAI (32), Bitmind (34) — **Payment:** Solana USDC

---

### [ReviewRadar](./telegraph-reviewradar/README.md)

Paste an Amazon product URL — ReviewRadar fetches up to three recent reviews via SerpAPI, runs each review through ItsAI (subnet 32) for AI-text detection, and displays an AI-vs-human signal summary with per-review verdicts and Solana transaction proofs.

**Subnets:** ItsAI (32) — **Payment:** Solana USDC

---

### [Polymarket Sniper Bot](./telegraph-polymarket-bot/readme.md)

Connect an EVM wallet, activate a subscription, and enable automated prediction market trading. Every two hours the bot fetches active Polymarket markets by keyword, retrieves relevant news via DeSearch (subnet 101), and passes the context to the Groq LLM (subnet 102) for a trade decision (YES / NO / HOLD). All inference calls are paid on-chain via Polygon USDC.

**Subnets:** DeSearch (101), Groq LLM (102) — **Payment:** Polygon USDC (EVM)

---

### [AdGuard](./telegraph-adguard/README.md)

Paste an article or news page URL — AdGuard extracts the text and images, scores every image for deepfakes via Bitmind (subnet 34) and classifies the article text as AI-generated or human via ItsAI (subnet 32), then combines both signals into a weighted threat score. If the score exceeds the configured threshold, selected Google Ads campaigns are paused automatically through the Google Ads API to protect brand integrity.

**Subnets:** Bitmind (34), ItsAI (32) — **Payment:** Solana USDC
