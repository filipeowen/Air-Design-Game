# Aircraft Producer

Aircraft Producer is a browser-based aircraft manufacturing management game. Phase 1 focuses on a complete monthly loop beginning in January 1970: design aircraft, research technologies, develop programs, manage staff and factories, win orders, produce deliveries, compete with deterministic AI manufacturers, and save or reload campaigns.

## Run Locally

```bash
npm install
npm run dev
```

## Checks

```bash
npm run typecheck
npm test
npm run build
```

## Supabase Saves

The game works with browser saves by default. To enable cloud save plumbing for Vercel, set:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

The current Phase 1 save repository keeps a local fallback so the game remains playable without a live account system.

## Headless Balancing

```bash
npm run headless -- --campaigns 100 --months 120
```

The report covers manufacturer survival, launched and cancelled programs, bankruptcies, delays, profitability, orders, and research adoption.
