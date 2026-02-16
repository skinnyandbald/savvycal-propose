# Web App Design: Propose Times PWA

## Overview

A web-based version of Propose Times deployed on Vercel as a PWA, sharing core logic with the existing Raycast extension via a monorepo. Designed as a single-user mobile-first tool you can add to your phone's home screen.

## Architecture

### Monorepo Structure

```
savvycal-propose/
├── packages/
│   ├── core/                    # Shared logic (extracted from current src/)
│   │   ├── slotSelection.ts
│   │   ├── utils.ts
│   │   ├── types.ts
│   │   ├── providers/
│   │   │   ├── index.ts
│   │   │   ├── savvycal.ts
│   │   │   └── calcom.ts
│   │   └── __tests__/
│   │
│   ├── raycast/                 # Raycast extension (thin UI shell)
│   │   ├── src/
│   │   │   └── propose-times.tsx
│   │   ├── package.json
│   │   └── raycast-env.d.ts
│   │
│   └── web/                     # Next.js app
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx         # Login (redirects if authed)
│       │   ├── propose/
│       │   │   └── page.tsx     # Main form
│       │   └── api/
│       │       └── slots/
│       │           └── route.ts # Server-side slot fetching
│       ├── components/
│       ├── lib/
│       ├── public/
│       │   └── manifest.json
│       └── package.json
│
├── package.json                 # Root workspace config
└── vitest.config.ts
```

### Core Package

Pure TypeScript — zero UI dependencies. Both Raycast and web import from it.

Extracted from current `src/`:
- `slotSelection.ts` — smart slot selection algorithm
- `utils.ts` — duration filtering, time formatting
- `types.ts` — shared interfaces
- `providers/` — SavvyCal and Cal.com API clients

Core functions take config as arguments. They don't know or care whether they're called from Raycast preferences or Vercel env vars.

### Web App

**Framework:** Next.js (App Router) with Tailwind CSS on Vercel.

**Pages:**
- `/` — Login page. Supabase Google OAuth. Redirects to `/propose` if already authenticated.
- `/propose` — Main form page. Protected by auth middleware.

**API Routes:**
- `POST /api/slots` — Authenticated. Calls SavvyCal API using server-side env var token. Runs core slot selection logic. Returns formatted message.

### Auth

Supabase Google OAuth. Single-user gate: server-side check that `user.email === process.env.ALLOWED_EMAIL`. No user table, no profiles, no roles.

## Web App Flow

1. Open app → Google sign-in (one tap if session exists)
2. Form loads with saved defaults from `localStorage`
3. Pick duration (chip selector), date range (stepper), recipient timezone (searchable dropdown)
4. Tap "Propose Times"
5. Server fetches slots from SavvyCal → core selects best ones → message rendered in a card
6. Tap "Copy" (Clipboard API) or "Share" (Web Share API for native share sheet)

## PWA

- `manifest.json` with standalone display mode, app icon, theme color
- Service worker caches app shell for fast loads
- No offline slot fetching (requires network)

## Mobile Form Design

- Single column, large tap targets
- Duration: pill/chip selector showing options from SavvyCal link config
- Timezone: searchable dropdown, defaults to last-used value
- Date range: "next N days" stepper, defaults to saved preference
- One primary "Propose Times" button at bottom
- Output: message card with Copy and Share buttons

## Configuration

| Setting | Web (env var) | Raycast (preferences) |
|---------|---------------|----------------------|
| SavvyCal API token | `SAVVYCAL_TOKEN` | Raycast preference |
| SavvyCal username | `SAVVYCAL_USERNAME` | Raycast preference |
| SavvyCal link slugs | `SAVVYCAL_LINK_SLUGS` | Raycast preference |
| Booker URL | `BOOKER_URL` | Raycast preference |
| Allowed email | `ALLOWED_EMAIL` | N/A |

Supabase env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

User preferences stored in `localStorage`: default timezone, days ahead, max days to show, max slots per day.

## Explicitly Not Building

- No database (localStorage for preferences, env vars for secrets)
- No settings page (provider config in env vars, user defaults in localStorage)
- No multi-user support
- No Cal.com in v1 (provider abstraction exists for later)
- No offline slot fetching
- No changes to the existing booker companion app (web output links to it as-is)
