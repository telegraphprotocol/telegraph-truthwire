# ScholarGuard

ScholarGuard is a use case built on the [Telegraph](https://telegraphprotocol.com) platform. It detects AI-generated content in academic documents — upload a PDF or DOCX assignment, and ScholarGuard extracts the text and embedded images, runs them through the **Bitmind** and **ItsAI** subnets on Telegraph, and returns a per-modality verdict with cryptographic on-chain payment proof for each inference call.

---

## How it works

1. The user uploads a PDF or DOCX file (up to 10 MB) via the dashboard.
2. The backend parses the document:
   - **PDF** — text is extracted page by page. Image extraction is skipped (requires a canvas shim in Node.js).
   - **DOCX** — text and all embedded images are extracted.
3. The document text (if ≥ 200 characters) is sent to the **ItsAI** subnet (subnet 32) for AI-text detection.
4. Each extracted image is sent to the **Bitmind** subnet (subnet 34) for AI-image detection.
5. Each subnet call is paid automatically via x402 — a micro-fee is settled on Solana and the transaction hash is captured per call.
6. The frontend displays the overall verdict, per-modality breakdowns, and all on-chain payment proofs.

---

## Repository structure

```
telegraph-scholarguard/
├── api/          # Node.js/Express backend (TypeScript)
└── frontend/     # React/Vite single-page application
```

### [`api/`](./api/README.md)

The backend service. Accepts a document upload and runs full AI-content analysis.

- `POST /api/assignment/verify` — multipart upload (PDF or DOCX), returns text + image detection results with payment proof per call
- `GET /health` — liveness probe

Built with **Express 5**, **TypeScript**, **multer** (file upload), **pdfjs-dist** (PDF text extraction), and **mammoth** (DOCX text + image extraction). x402 payments handled via `@x402/fetch` + `@x402/svm`.

→ See [`api/README.md`](./api/README.md) for full setup, environment variables, and API reference.

### [`frontend/`](./frontend/README.md)

The React SPA. Provides a drag-and-drop upload zone, a live terminal feed of the analysis pipeline, and a detailed results panel showing per-image and per-text verdicts with collapsible cryptographic proof links.

Built with **React 19** and **Vite**.

→ See [`frontend/README.md`](./frontend/README.md) for setup, environment variables, and deployment docs.

---

## Quick start

Two terminals — one for the API, one for the frontend.

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

The Vite dev server proxies all `/api/*` requests to `http://localhost:3000`.

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend runtime | Node.js 20+ (CommonJS) |
| Backend language | TypeScript |
| Backend framework | Express 5 |
| File upload | multer |
| PDF parsing | pdfjs-dist |
| DOCX parsing | mammoth |
| Frontend framework | React 19 |
| Frontend build tool | Vite |
| Image AI detection | Telegraph Bitmind subnet (subnet 34) |
| Text AI detection | Telegraph ItsAI subnet (subnet 32) |
| Payment protocol | x402 |
| Payment network | Solana (devnet / mainnet) |
