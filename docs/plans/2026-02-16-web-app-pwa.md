# Web App PWA Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a mobile-first PWA sharing core scheduling logic with the existing Raycast extension via a pnpm monorepo.

**Architecture:** Three packages — `@propose/core` (pure TS), `packages/raycast` (thin Raycast shell), `packages/web` (Next.js App Router on Vercel). Supabase Google OAuth gates access to a single email.

**Tech Stack:** pnpm workspaces, TypeScript, Next.js 15 (App Router), Tailwind CSS v4, Supabase Auth, Vitest

**Reference:** Design doc at `docs/plans/2026-02-16-web-app-design.md`

---

## Phase 1: Monorepo Foundation

### Task 1: Initialize pnpm workspace

**Files:**
- Create: `pnpm-workspace.yaml`
- Modify: `package.json` (convert to workspace root)

**Step 1: Create workspace config**

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
```

**Step 2: Update root package.json**

Strip Raycast-specific fields (`commands`, `preferences`, `categories`, `dependencies`, `devDependencies`, etc.) from root. Keep it minimal:

```json
{
  "name": "savvycal-propose",
  "private": true,
  "scripts": {
    "test": "pnpm --filter @propose/core test",
    "test:run": "pnpm --filter @propose/core test:run",
    "dev:web": "pnpm --filter @propose/web dev",
    "build:web": "pnpm --filter @propose/web build"
  }
}
```

**Step 3: Commit**

```bash
git add pnpm-workspace.yaml package.json
git commit -m "chore: initialize pnpm workspace"
```

---

### Task 2: Create core package and move shared logic

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/vitest.config.ts`
- Create: `packages/core/src/index.ts` (barrel export)
- Move: `src/types.ts` → `packages/core/src/types.ts`
- Move: `src/utils.ts` → `packages/core/src/utils.ts`
- Move: `src/slotSelection.ts` → `packages/core/src/slotSelection.ts`
- Move: `src/providers/` → `packages/core/src/providers/`
- Move: `src/__tests__/` → `packages/core/src/__tests__/`
- Delete: `vitest.config.ts` (root — replaced by core's)

**Step 1: Create packages/core/package.json**

```json
{
  "name": "@propose/core",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run"
  },
  "dependencies": {
    "date-fns": "^3.6.0",
    "date-fns-tz": "^3.2.0"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "vitest": "^2.1.8"
  }
}
```

**Step 2: Create packages/core/tsconfig.json**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2021",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

**Step 3: Create packages/core/vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
```

**Step 4: Move source files**

```bash
mkdir -p packages/core/src/providers packages/core/src/__tests__
git mv src/types.ts packages/core/src/types.ts
git mv src/utils.ts packages/core/src/utils.ts
git mv src/slotSelection.ts packages/core/src/slotSelection.ts
git mv src/providers/index.ts packages/core/src/providers/index.ts
git mv src/providers/savvycal.ts packages/core/src/providers/savvycal.ts
git mv src/providers/calcom.ts packages/core/src/providers/calcom.ts
git mv src/__tests__/slotSelection.test.ts packages/core/src/__tests__/slotSelection.test.ts
git mv src/__tests__/utils.test.ts packages/core/src/__tests__/utils.test.ts
```

**Step 5: Fix imports in moved files**

All internal imports in the moved files use relative paths like `"../types"` — these still resolve correctly because the relative structure is preserved. No import changes needed in core files.

**Step 6: Create barrel export**

```ts
// packages/core/src/index.ts
export type {
  TimeSlot,
  LinkInfo,
  FetchSlotsResult,
  ProviderConfig,
  ProviderType,
  CalendarProvider,
} from "./types";

export { selectSmartSlots, detectGaps, scoreSlotByProximity, getTimeBucket } from "./slotSelection";
export type { Gap, ScoredSlot, TimeBucket } from "./slotSelection";

export {
  minutesToMs,
  filterSlotsByDuration,
  filterSlotsByTime,
  encodeAlternativeSlots,
} from "./utils";

export { getProvider, savvycalProvider, calcomProvider } from "./providers";
```

**Step 7: Delete root vitest config**

```bash
rm vitest.config.ts
```

**Step 8: Install and run tests**

```bash
pnpm install
cd packages/core && pnpm test:run
```

Expected: All existing tests pass.

**Step 9: Commit**

```bash
git add -A
git commit -m "refactor: extract core package into monorepo"
```

---

### Task 3: Create Raycast package

**Files:**
- Create: `packages/raycast/package.json`
- Create: `packages/raycast/tsconfig.json`
- Move: `src/propose-times.tsx` → `packages/raycast/src/propose-times.tsx`
- Move: `raycast-env.d.ts` → `packages/raycast/raycast-env.d.ts`
- Move: `assets/` → `packages/raycast/assets/`

**Step 1: Create packages/raycast/package.json**

Take the current root `package.json` Raycast fields and adapt:

```json
{
  "name": "@propose/raycast",
  "version": "0.0.1",
  "private": true,
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "title": "Propose Times",
  "description": "Fetch availability and propose meeting times from SavvyCal or Cal.com",
  "icon": "command-icon.png",
  "author": "skinnyandbald",
  "categories": ["Productivity"],
  "license": "MIT",
  "commands": [
    {
      "name": "propose-times",
      "title": "Propose Times",
      "description": "Fetch available slots and propose meeting times",
      "mode": "view"
    }
  ],
  "preferences": [
    {
      "name": "provider",
      "title": "Calendar Provider",
      "description": "Which scheduling service to use",
      "type": "dropdown",
      "required": true,
      "default": "savvycal",
      "data": [
        { "title": "SavvyCal", "value": "savvycal" },
        { "title": "Cal.com", "value": "calcom" }
      ]
    },
    {
      "name": "savvycalToken",
      "title": "SavvyCal API Token",
      "description": "Your SavvyCal API token",
      "type": "password",
      "required": false
    },
    {
      "name": "savvycalUsername",
      "title": "SavvyCal Username",
      "description": "Your SavvyCal username",
      "type": "textfield",
      "required": false
    },
    {
      "name": "savvycalLinkSlugs",
      "title": "SavvyCal Link Slugs",
      "description": "Comma-separated scheduling link slugs",
      "type": "textfield",
      "required": false
    },
    {
      "name": "calcomUsername",
      "title": "Cal.com Username",
      "description": "Your Cal.com username",
      "type": "textfield",
      "required": false
    },
    {
      "name": "calcomEventSlug",
      "title": "Cal.com Event Slug",
      "description": "Your Cal.com event type slug",
      "type": "textfield",
      "required": false
    },
    {
      "name": "bookerUrl",
      "title": "Booker URL",
      "description": "URL of your booking companion app (optional)",
      "type": "textfield",
      "required": false
    }
  ],
  "dependencies": {
    "@propose/core": "workspace:*",
    "@raycast/api": "^1.93.2",
    "date-fns": "^3.6.0",
    "date-fns-tz": "^3.2.0"
  },
  "devDependencies": {
    "@raycast/eslint-config": "^1.0.14",
    "typescript": "^5.4.5"
  },
  "scripts": {
    "build": "ray build",
    "dev": "ray develop",
    "lint": "ray lint"
  }
}
```

**Step 2: Move files**

```bash
mkdir -p packages/raycast/src
git mv src/propose-times.tsx packages/raycast/src/propose-times.tsx
git mv raycast-env.d.ts packages/raycast/raycast-env.d.ts
git mv assets packages/raycast/assets
```

**Step 3: Update imports in propose-times.tsx**

Replace relative imports with core package imports. Change:

```ts
// OLD
import type { ProviderConfig, ProviderType, TimeSlot, LinkInfo } from "./types";
import { filterSlotsByDuration, filterSlotsByTime, encodeAlternativeSlots } from "./utils";
import { getProvider } from "./providers";
import { selectSmartSlots } from "./slotSelection";
```

to:

```ts
// NEW
import type { ProviderConfig, ProviderType, TimeSlot, LinkInfo } from "@propose/core";
import { filterSlotsByDuration, filterSlotsByTime, encodeAlternativeSlots, getProvider, selectSmartSlots } from "@propose/core";
```

**Step 4: Create packages/raycast/tsconfig.json**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2021",
    "module": "commonjs",
    "lib": ["ES2021"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "dist"
  },
  "include": ["src", "raycast-env.d.ts"]
}
```

**Step 5: Install and verify**

```bash
pnpm install
cd packages/core && pnpm test:run  # core tests still pass
```

Note: Raycast build verification requires `ray` CLI. Manual verification: `cd packages/raycast && pnpm build` if ray is installed.

**Step 6: Clean up root**

Remove now-empty `src/` directory and old root configs that moved:

```bash
rm -rf src/
rm -f tsconfig.json
```

**Step 7: Commit**

```bash
git add -A
git commit -m "refactor: create Raycast package, imports from core"
```

---

## Phase 2: Web App Foundation

### Task 4: Initialize Next.js web app

**Files:**
- Create: `packages/web/package.json`
- Create: `packages/web/tsconfig.json`
- Create: `packages/web/next.config.ts`
- Create: `packages/web/postcss.config.mjs`
- Create: `packages/web/app/globals.css`
- Create: `packages/web/app/layout.tsx`
- Create: `packages/web/app/page.tsx` (placeholder)
- Create: `packages/web/tailwind.config.ts`

**Step 1: Create packages/web/package.json**

```json
{
  "name": "@propose/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@propose/core": "workspace:*",
    "@supabase/supabase-js": "^2.49.1",
    "@supabase/ssr": "^0.5.2",
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "date-fns": "^3.6.0",
    "date-fns-tz": "^3.2.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.4.5",
    "@tailwindcss/postcss": "^4.0.0",
    "tailwindcss": "^4.0.0"
  }
}
```

**Step 2: Create packages/web/next.config.ts**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@propose/core"],
};

export default nextConfig;
```

**Step 3: Create packages/web/tsconfig.json**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2021",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 4: Create Tailwind v4 setup**

```js
// packages/web/postcss.config.mjs
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

```css
/* packages/web/app/globals.css */
@import "tailwindcss";
```

**Step 5: Create root layout**

```tsx
// packages/web/app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Propose Times",
  description: "Propose meeting times from your calendar availability",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#18181b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100 min-h-dvh">
        {children}
      </body>
    </html>
  );
}
```

**Step 6: Create placeholder page**

```tsx
// packages/web/app/page.tsx
export default function Home() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <h1 className="text-2xl font-bold">Propose Times</h1>
    </main>
  );
}
```

**Step 7: Install and verify dev server starts**

```bash
pnpm install
cd packages/web && pnpm dev
```

Visit http://localhost:3000 — should show "Propose Times" heading.

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js web app package"
```

---

### Task 5: Set up Supabase auth

**Files:**
- Create: `packages/web/lib/supabase/server.ts`
- Create: `packages/web/lib/supabase/client.ts`
- Create: `packages/web/app/auth/callback/route.ts`
- Modify: `packages/web/app/page.tsx` (login page)

**Step 1: Create server-side Supabase client**

```ts
// packages/web/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component — ignore
          }
        },
      },
    }
  );
}
```

**Step 2: Create browser-side Supabase client**

```ts
// packages/web/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Step 3: Create OAuth callback route**

```ts
// packages/web/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check single-user gate
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email === process.env.ALLOWED_EMAIL) {
        return NextResponse.redirect(`${origin}/propose`);
      }
      // Wrong user — sign them out
      await supabase.auth.signOut();
    }
  }

  return NextResponse.redirect(`${origin}/?error=unauthorized`);
}
```

**Step 4: Update login page**

```tsx
// packages/web/app/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginButton } from "./login-button";

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Already logged in and authorized — redirect
  if (user?.email === process.env.ALLOWED_EMAIL) {
    redirect("/propose");
  }

  const params = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-2xl font-bold">Propose Times</h1>
      {params.error && (
        <p className="text-red-400 text-sm">Not authorized. Check your Google account.</p>
      )}
      <LoginButton />
    </main>
  );
}
```

**Step 5: Create login button (client component)**

```tsx
// packages/web/app/login-button.tsx
"use client";

import { createClient } from "@/lib/supabase/client";

export function LoginButton() {
  const handleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <button
      onClick={handleLogin}
      className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-zinc-900 active:bg-zinc-200"
    >
      Sign in with Google
    </button>
  );
}
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Supabase Google OAuth with single-user gate"
```

---

### Task 6: Add auth middleware

**Files:**
- Create: `packages/web/middleware.ts`
- Create: `packages/web/lib/supabase/middleware.ts`

**Step 1: Create Supabase middleware helper**

```ts
// packages/web/lib/supabase/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protected routes require auth + correct email
  if (request.nextUrl.pathname.startsWith("/propose") || request.nextUrl.pathname.startsWith("/api/")) {
    if (!user || user.email !== process.env.ALLOWED_EMAIL) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
```

**Step 2: Create Next.js middleware**

```ts
// packages/web/middleware.ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add auth middleware protecting /propose and /api routes"
```

---

### Task 7: Create slots API route

**Files:**
- Create: `packages/web/app/api/slots/route.ts`

This is the server-side route that calls the core logic. It uses env vars for provider config instead of Raycast preferences.

**Step 1: Write the failing test**

Create a lightweight integration test (optional — this is a thin server route, so manual testing via the form is acceptable). Skip TDD for this route and test via the form in Task 9.

**Step 2: Create the API route**

```ts
// packages/web/app/api/slots/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getProvider,
  selectSmartSlots,
  filterSlotsByDuration,
  filterSlotsByTime,
} from "@propose/core";
import type { ProviderConfig, ProviderType } from "@propose/core";

interface SlotsRequest {
  linkSlug: string;
  duration: number;
  daysAhead: number;
  timezone: string;
  maxSlotsPerDay?: number;
  cutoffHour?: number;
}

function getProviderConfig(): { config: ProviderConfig; type: ProviderType } {
  // For now, SavvyCal only (Cal.com support later)
  return {
    type: "savvycal",
    config: {
      savvycalToken: process.env.SAVVYCAL_TOKEN,
      savvycalLink: "", // Set per-request from linkSlug
      savvycalUsername: process.env.SAVVYCAL_USERNAME,
    },
  };
}

export async function POST(request: Request) {
  // Auth check (middleware handles this, but belt-and-suspenders)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ALLOWED_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as SlotsRequest;
  const { linkSlug, duration, daysAhead, timezone, maxSlotsPerDay = 2, cutoffHour = 19 } = body;

  const { config, type } = getProviderConfig();
  config.savvycalLink = linkSlug;

  const provider = getProvider(type);

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + daysAhead);

  try {
    const { slots: rawSlots, linkInfo } = await provider.fetchSlots(config, startDate, endDate, duration);

    let slots = filterSlotsByDuration(rawSlots, duration);
    slots = filterSlotsByTime(slots, timezone, cutoffHour);

    const selected = selectSmartSlots(slots, timezone, maxSlotsPerDay * daysAhead);

    // Generate booking URLs for each selected slot
    const bookerUrl = process.env.BOOKER_URL;
    const slotsWithUrls = selected.map((slot) => ({
      ...slot,
      bookingUrl: provider.generateBookingUrl(config, linkInfo, slot, timezone, bookerUrl, duration),
    }));

    return NextResponse.json({
      slots: slotsWithUrls,
      linkInfo,
      fallbackUrl: provider.getFallbackUrl(config),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch slots";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add POST /api/slots route"
```

---

## Phase 3: Web UI

### Task 8: Build the propose form page

**Files:**
- Create: `packages/web/app/propose/page.tsx`
- Create: `packages/web/components/propose-form.tsx`
- Create: `packages/web/components/result-card.tsx`
- Create: `packages/web/components/duration-picker.tsx`
- Create: `packages/web/components/timezone-picker.tsx`
- Create: `packages/web/components/days-stepper.tsx`
- Create: `packages/web/lib/config.ts` (link slugs from env)

**Step 1: Create config helper**

```ts
// packages/web/lib/config.ts
export function getLinkSlugs(): string[] {
  const raw = process.env.SAVVYCAL_LINK_SLUGS || "";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}
```

**Step 2: Create the propose page (server component)**

```tsx
// packages/web/app/propose/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getLinkSlugs } from "@/lib/config";
import { ProposalForm } from "@/components/propose-form";

export default async function ProposePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ALLOWED_EMAIL) {
    redirect("/");
  }

  const linkSlugs = getLinkSlugs();

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-xl font-bold">Propose Times</h1>
      <ProposalForm linkSlugs={linkSlugs} />
    </main>
  );
}
```

**Step 3: Create DurationPicker component**

```tsx
// packages/web/components/duration-picker.tsx
"use client";

const DURATIONS = [15, 30, 45, 60];

interface DurationPickerProps {
  value: number;
  onChange: (d: number) => void;
}

export function DurationPicker({ value, onChange }: DurationPickerProps) {
  return (
    <div className="flex gap-2">
      {DURATIONS.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            value === d
              ? "bg-white text-zinc-900"
              : "bg-zinc-800 text-zinc-300 active:bg-zinc-700"
          }`}
        >
          {d}m
        </button>
      ))}
    </div>
  );
}
```

**Step 4: Create DaysStepper component**

```tsx
// packages/web/components/days-stepper.tsx
"use client";

interface DaysStepperProps {
  value: number;
  onChange: (n: number) => void;
}

export function DaysStepper({ value, onChange }: DaysStepperProps) {
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-lg active:bg-zinc-700"
      >
        −
      </button>
      <span className="min-w-[5rem] text-center text-sm">
        Next <strong>{value}</strong> {value === 1 ? "day" : "days"}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(14, value + 1))}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-lg active:bg-zinc-700"
      >
        +
      </button>
    </div>
  );
}
```

**Step 5: Create TimezonePicker component**

```tsx
// packages/web/components/timezone-picker.tsx
"use client";

import { useState, useMemo } from "react";

interface TimezonePickerProps {
  value: string;
  onChange: (tz: string) => void;
}

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export function TimezonePicker({ value, onChange }: TimezonePickerProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const allTimezones = useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return COMMON_TIMEZONES;
    }
  }, []);

  const filtered = useMemo(() => {
    if (!search) return COMMON_TIMEZONES;
    const q = search.toLowerCase();
    return allTimezones.filter((tz) => tz.toLowerCase().includes(q));
  }, [search, allTimezones]);

  const displayValue = value.replace(/_/g, " ").split("/").pop() || value;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full rounded-lg bg-zinc-800 px-4 py-3 text-left text-sm active:bg-zinc-700"
      >
        {displayValue}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg">
          <input
            autoFocus
            type="text"
            placeholder="Search timezones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border-b border-zinc-700 bg-transparent px-4 py-2 text-sm outline-none"
          />
          {filtered.slice(0, 20).map((tz) => (
            <button
              key={tz}
              type="button"
              onClick={() => { onChange(tz); setOpen(false); setSearch(""); }}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 ${tz === value ? "bg-zinc-800 font-medium" : ""}`}
            >
              {tz.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 6: Create ResultCard component**

```tsx
// packages/web/components/result-card.tsx
"use client";

import { format } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";

interface SlotWithUrl {
  start_at: string;
  end_at: string;
  bookingUrl: string;
}

interface ResultCardProps {
  slots: SlotWithUrl[];
  timezone: string;
  fallbackUrl: string;
}

function formatSlotLine(slot: SlotWithUrl, timezone: string): string {
  const zonedDate = utcToZonedTime(new Date(slot.start_at), timezone);
  const day = format(zonedDate, "EEEE, MMM d");
  const time = format(zonedDate, "h:mma").toLowerCase();
  return `${day} at ${time}`;
}

export function ResultCard({ slots, timezone, fallbackUrl }: ResultCardProps) {
  const textMessage = slots
    .map((s) => `• ${formatSlotLine(s, timezone)}`)
    .join("\n");

  const htmlMessage = slots
    .map((s) => `<li><a href="${s.bookingUrl}">${formatSlotLine(s, timezone)}</a></li>`)
    .join("");

  const fullText = `Here are some times that work for me:\n\n${textMessage}\n\nOr pick another time: ${fallbackUrl}`;
  const fullHtml = `<p>Here are some times that work for me:</p><ul>${htmlMessage}</ul><p>Or <a href="${fallbackUrl}">pick another time</a></p>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([fullHtml], { type: "text/html" }),
          "text/plain": new Blob([fullText], { type: "text/plain" }),
        }),
      ]);
    } catch {
      await navigator.clipboard.writeText(fullText);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ text: fullText });
    } else {
      await handleCopy();
    }
  };

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4">
      <p className="mb-3 text-sm text-zinc-400">Here are some times that work for me:</p>
      <ul className="mb-4 space-y-1">
        {slots.map((s) => (
          <li key={s.start_at} className="text-sm">
            • {formatSlotLine(s, timezone)}
          </li>
        ))}
      </ul>
      <div className="flex gap-3">
        <button
          onClick={handleCopy}
          className="flex-1 rounded-full bg-white px-4 py-3 text-sm font-semibold text-zinc-900 active:bg-zinc-200"
        >
          Copy
        </button>
        {"share" in navigator && (
          <button
            onClick={handleShare}
            className="flex-1 rounded-full bg-zinc-800 px-4 py-3 text-sm font-semibold active:bg-zinc-700"
          >
            Share
          </button>
        )}
      </div>
    </div>
  );
}
```

**Step 7: Create ProposalForm (main orchestrator component)**

```tsx
// packages/web/components/propose-form.tsx
"use client";

import { useState, useEffect } from "react";
import { DurationPicker } from "./duration-picker";
import { DaysStepper } from "./days-stepper";
import { TimezonePicker } from "./timezone-picker";
import { ResultCard } from "./result-card";

interface ProposalFormProps {
  linkSlugs: string[];
}

interface SlotWithUrl {
  start_at: string;
  end_at: string;
  bookingUrl: string;
}

interface SlotsResponse {
  slots: SlotWithUrl[];
  linkInfo: { id: string; slug: string; durations: number[]; defaultDuration: number };
  fallbackUrl: string;
  error?: string;
}

function loadDefault<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const stored = localStorage.getItem(key);
  if (stored === null) return fallback;
  try { return JSON.parse(stored) as T; } catch { return fallback; }
}

function saveDefault(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function ProposalForm({ linkSlugs }: ProposalFormProps) {
  const [duration, setDuration] = useState(30);
  const [daysAhead, setDaysAhead] = useState(5);
  const [timezone, setTimezone] = useState("America/New_York");
  const [linkSlug, setLinkSlug] = useState(linkSlugs[0] || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SlotsResponse | null>(null);

  // Load saved defaults on mount
  useEffect(() => {
    setDuration(loadDefault("propose:duration", 30));
    setDaysAhead(loadDefault("propose:daysAhead", 5));
    setTimezone(loadDefault("propose:timezone", Intl.DateTimeFormat().resolvedOptions().timeZone));
    setLinkSlug(loadDefault("propose:linkSlug", linkSlugs[0] || ""));
  }, [linkSlugs]);

  // Save defaults when changed
  useEffect(() => { saveDefault("propose:duration", duration); }, [duration]);
  useEffect(() => { saveDefault("propose:daysAhead", daysAhead); }, [daysAhead]);
  useEffect(() => { saveDefault("propose:timezone", timezone); }, [timezone]);
  useEffect(() => { saveDefault("propose:linkSlug", linkSlug); }, [linkSlug]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkSlug, duration, daysAhead, timezone }),
      });

      const data = (await res.json()) as SlotsResponse;
      if (!res.ok) {
        setError(data.error || "Failed to fetch slots");
      } else if (data.slots.length === 0) {
        setError("No available slots found in that time range.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Link selector (if multiple slugs) */}
      {linkSlugs.length > 1 && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-zinc-400">Link</legend>
          <div className="flex flex-wrap gap-2">
            {linkSlugs.map((slug) => (
              <button
                key={slug}
                type="button"
                onClick={() => setLinkSlug(slug)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  linkSlug === slug
                    ? "bg-white text-zinc-900"
                    : "bg-zinc-800 text-zinc-300 active:bg-zinc-700"
                }`}
              >
                {slug}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {/* Duration */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-zinc-400">Duration</legend>
        <DurationPicker value={duration} onChange={setDuration} />
      </fieldset>

      {/* Days ahead */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-zinc-400">Date Range</legend>
        <DaysStepper value={daysAhead} onChange={setDaysAhead} />
      </fieldset>

      {/* Timezone */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-zinc-400">Recipient Timezone</legend>
        <TimezonePicker value={timezone} onChange={setTimezone} />
      </fieldset>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-zinc-900 active:bg-zinc-200 disabled:opacity-50"
      >
        {loading ? "Finding times..." : "Propose Times"}
      </button>

      {/* Error */}
      {error && (
        <p className="rounded-lg bg-red-900/30 px-4 py-3 text-sm text-red-300">{error}</p>
      )}

      {/* Result */}
      {result && (
        <ResultCard
          slots={result.slots}
          timezone={timezone}
          fallbackUrl={result.fallbackUrl}
        />
      )}
    </div>
  );
}
```

**Step 8: Verify dev server works**

```bash
cd packages/web && pnpm dev
```

Test the form manually. Without Supabase configured, you'll see the login page.

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: build propose form page with duration, timezone, and results"
```

---

## Phase 4: PWA

### Task 9: Add PWA manifest and icons

**Files:**
- Create: `packages/web/public/manifest.json`
- Create: `packages/web/public/icons/icon-192.png` (placeholder)
- Create: `packages/web/public/icons/icon-512.png` (placeholder)

**Step 1: Create manifest**

```json
{
  "name": "Propose Times",
  "short_name": "Propose",
  "start_url": "/propose",
  "display": "standalone",
  "background_color": "#18181b",
  "theme_color": "#18181b",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Step 2: Create placeholder icons**

Generate simple placeholder PNGs (solid color squares). Replace with real icons later.

**Step 3: Verify**

Open Chrome DevTools → Application → Manifest. Confirm manifest loads.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add PWA manifest for home screen install"
```

---

### Task 10: Add sign-out button

**Files:**
- Modify: `packages/web/app/propose/page.tsx`

**Step 1: Add sign-out to propose page**

Add a small sign-out link in the header:

```tsx
// Add to packages/web/app/propose/page.tsx, in the JSX
<header className="mb-6 flex items-center justify-between">
  <h1 className="text-xl font-bold">Propose Times</h1>
  <form action="/auth/signout" method="post">
    <button type="submit" className="text-sm text-zinc-500 active:text-zinc-300">
      Sign out
    </button>
  </form>
</header>
```

**Step 2: Create signout route**

```ts
// packages/web/app/auth/signout/route.ts
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add sign-out button"
```

---

## Phase 5: Environment & Deployment

### Task 11: Create environment config and Vercel setup

**Files:**
- Create: `packages/web/.env.local.example`
- Modify: root `.gitignore`

**Step 1: Create env example**

```bash
# packages/web/.env.local.example
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ALLOWED_EMAIL=you@example.com
SAVVYCAL_TOKEN=your-savvycal-api-token
SAVVYCAL_USERNAME=your-username
SAVVYCAL_LINK_SLUGS=link-slug-1,link-slug-2
BOOKER_URL=https://your-booker.vercel.app
```

**Step 2: Update .gitignore**

Ensure `.env.local` is ignored (Next.js default). Add:

```
# packages/web
packages/web/.next/
packages/web/node_modules/
```

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: add env example and gitignore for web app"
```

---

## Verification Checklist

After completing all tasks:

1. `cd packages/core && pnpm test:run` — all core tests pass
2. `cd packages/web && pnpm build` — Next.js builds without errors
3. `cd packages/web && pnpm dev` — dev server starts, login page renders
4. Auth flow works with Supabase configured
5. Propose form fetches slots and shows results
6. Copy/Share buttons work on mobile
7. PWA manifest loads in DevTools
8. App installable to home screen on mobile
