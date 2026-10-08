# Budget Dashboard

Local-first personal budgeting dashboard built with React, Vite, Dexie, Tailwind, and Recharts.

## Commands

```bash
npm install
npm run dev
npm run build
```

To enable Gemini locally:

```bash
cp .env.example .env
# add GEMINI_API_KEY from Google AI Studio
npm run dev
```

## Current Scope

- Empower CSV upload
- IndexedDB persistence
- Multi-file dedupe and upload ownership tracking
- Manual transaction categorization
- Monthly overview charts
- Multi-month comparison
- Budget planner with persistent targets
- CSV export for reclassified transactions

## AI Status

AI now runs through a **local-only Gemini helper** on `localhost:4317`.

- The browser never receives the API key
- Upload classification is enabled when the helper is running
- Budget recommendations are enabled when the helper is running
- Without `.env`, the app falls back to secure local-only behavior
