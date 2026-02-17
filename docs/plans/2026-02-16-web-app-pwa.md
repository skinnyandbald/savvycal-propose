# Web App PWA Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy Propose Times as a PWA on Vercel, sharing core logic with the Raycast extension via a pnpm monorepo.

**Architecture:** Three packages — `@propose/core` (pure TS logic extracted from current `src/`), `packages/raycast` (thin Raycast UI shell), `packages/web` (Next.js 15 App Router). Core is imported by both consumers. Web app uses Supabase Google OAuth with single-user email gate.

**Tech Stack:** pnpm workspaces, TypeScript, Next.js 15 (App Router), Tailwind CSS v4, Supabase Auth (`@supabase/ssr`), Vitest

---

## Phase 1: Monorepo Foundation

### Task 1: Initialize pnpm workspace

**Files:**
- Modify: `package.json`
- Create: `pnpm-workspace.yaml`

**Step 1: Create workspace config**

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
```

**Step 2: Strip root package.json to workspace root**

Replace `package.json` contents with:

```json
{
  "private": true,
  "scripts": {
    "test": "pnpm --filter @propose/core test",
    "test:run": "pnpm --filter @propose/core test:run",
    "dev:web": "pnpm --filter @propose/web dev",
    "build:web": "pnpm --filter @propose/web build"
  }
}
```

**Step 3: Verify**

Run: `pnpm install`
Expected: installs successfully, creates/updates `pnpm-lock.yaml`

**Step 4: Commit**

```bash
git add pnpm-workspace.yaml package.json pnpm-lock.yaml
git commit -m "chore: initialize pnpm workspace"
```

---

### Task 2: Create core package and move shared logic

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/vitest.config.ts`
- Create: `packages/core/src/index.ts`
- Move: `src/*` → `packages/core/src/`
- Delete: root `vitest.config.ts`, root `tsconfig.json`

**Step 1: Create core package.json**

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
    "date-fns": "^2.30.0",
    "date-fns-tz": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "^5.2.2",
    "vitest": "^4.0.16"
  }
}
```

**Step 2: Create core tsconfig.json**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "lib": ["ES2021"],
    "module": "ESNext",
    "target": "ES2021",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "outDir": "dist"
  },
  "include": ["src/**/*"]
}
```

**Step 3: Create vitest config**

```ts
// packages/core/vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
  },
});
```

**Step 4: Move source files**

```bash
mkdir -p packages/core/src/providers packages/core/src/__tests__
mv src/types.ts src/utils.ts src/slotSelection.ts packages/core/src/
mv src/providers/savvycal.ts src/providers/calcom.ts src/providers/index.ts packages/core/src/providers/
mv src/__tests__/* packages/core/src/__tests__/
```

**Step 5: Create barrel export**

```ts
// packages/core/src/index.ts
export type {
  ProviderType,
  TimeSlot,
  LinkInfo,
  FetchSlotsResult,
  ProviderConfig,
  CalendarProvider,
} from "./types";

export { getProvider, savvycalProvider, calcomProvider } from "./providers";
export { selectSmartSlots } from "./slotSelection";
export {
  filterSlotsByDuration,
  filterSlotsByTime,
  encodeAlternativeSlots,
} from "./utils";
```

**Step 6: Delete root config files**

```bash
rm -f vitest.config.ts tsconfig.json
```

**Step 7: Run tests to verify nothing broke**

Run: `cd packages/core && pnpm install && pnpm test:run`
Expected: all existing tests pass

**Step 8: Commit**

```bash
git add -A
git commit -m "refactor: extract core package into monorepo"
```

---

### Task 3: Create Raycast package

**Files:**
- Create: `packages/raycast/package.json`
- Create: `packages/raycast/tsconfig.json`
- Move: `src/propose-times.tsx` → `packages/raycast/src/`
- Move: `assets/` → `packages/raycast/assets/`
- Move: `raycast-env.d.ts` → `packages/raycast/`
- Modify: `packages/raycast/src/propose-times.tsx` (update imports)

**Step 1: Create Raycast package.json**

Take the current root `package.json` Raycast fields (name, title, description, icon, author, categories, license, commands, preferences) and merge with:

```json
{
  "name": "propose-times",
  "title": "Propose Times",
  "description": "Generate meeting time proposals from your SavvyCal or Cal.com availability",
  "icon": "extension-icon.png",
  "author": "skinnyandbald",
  "categories": ["Productivity"],
  "license": "MIT",
  "commands": [
    {
      "name": "propose-times",
      "title": "Propose Times",
      "description": "Generate a message with your available meeting times",
      "mode": "view"
    }
  ],
  "preferences": [],
  "dependencies": {
    "@raycast/api": "^1.64.0",
    "@raycast/utils": "^1.10.0",
    "@propose/core": "workspace:*"
  },
  "devDependencies": {
    "@raycast/eslint-config": "^1.0.8",
    "@types/node": "20.10.0",
    "@types/react": "18.2.27",
    "eslint": "^8.51.0",
    "prettier": "^3.0.3",
    "typescript": "^5.2.2"
  },
  "scripts": {
    "build": "ray build -e dist",
    "dev": "ray develop",
    "fix-lint": "ray lint --fix",
    "lint": "ray lint"
  }
}
```

Copy the full `preferences` array from the current root `package.json`.

**Step 2: Move Raycast files**

```bash
mkdir -p packages/raycast/src
mv src/propose-times.tsx packages/raycast/src/
mv assets packages/raycast/
mv raycast-env.d.ts packages/raycast/
```

**Step 3: Create Raycast tsconfig.json**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "lib": ["ES2021"],
    "module": "commonjs",
    "target": "ES2021",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "dist",
    "jsx": "react-jsx"
  },
  "include": ["src/**/*", "raycast-env.d.ts"]
}
```

**Step 4: Update imports in propose-times.tsx**

Replace all relative imports like `"../types"`, `"../providers"`, `"../slotSelection"`, `"../utils"` with imports from `"@propose/core"`.

For example:
```tsx
// Before
import type { ProviderType, ProviderConfig, TimeSlot, LinkInfo } from "../types";
import { getProvider } from "../providers";
import { selectSmartSlots } from "../slotSelection";
import { filterSlotsByTime } from "../utils";

// After
import type { ProviderType, ProviderConfig, TimeSlot, LinkInfo } from "@propose/core";
import { getProvider, selectSmartSlots, filterSlotsByTime } from "@propose/core";
```

**Step 5: Install and verify**

```bash
pnpm install
cd packages/raycast && pnpm build
```

Expected: builds without errors

**Step 6: Clean up root**

Remove any remaining `src/` directory contents (should be empty now) and the old `src/` dir:

```bash
rm -rf src
```

**Step 7: Verify core tests still pass**

Run: `cd packages/core && pnpm test:run`
Expected: all tests pass

**Step 8: Commit**

```bash
git add -A
git commit -m "refactor: create raycast package, import from @propose/core"
```

---

## Phase 2: Web App Foundation

### Task 4: Initialize Next.js web app

**Files:**
- Create: `packages/web/package.json`
- Create: `packages/web/next.config.ts`
- Create: `packages/web/tsconfig.json`
- Create: `packages/web/postcss.config.mjs`
- Create: `packages/web/app/globals.css`
- Create: `packages/web/app/layout.tsx`
- Create: `packages/web/app/page.tsx`

**Step 1: Create web package.json**

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
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@propose/core": "workspace:*",
    "@supabase/ssr": "^0.5.0",
    "@supabase/supabase-js": "^2.45.0",
    "date-fns": "^2.30.0",
    "date-fns-tz": "^2.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "typescript": "^5.2.2",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0"
  }
}
```

**Step 2: Create next.config.ts**

```ts
// packages/web/next.config.ts
import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@propose/core"],
};

export default config;
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
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

**Step 4: Create postcss.config.mjs**

```js
// packages/web/postcss.config.mjs
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

**Step 5: Create globals.css**

```css
/* packages/web/app/globals.css */
@import "tailwindcss";
```

**Step 6: Create layout.tsx**

```tsx
// packages/web/app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Propose Times",
  description: "Propose meeting times from your availability",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#18181b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-dvh bg-zinc-950 text-zinc-100 antialiased">
        <main className="mx-auto max-w-md px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
```

**Step 7: Create placeholder page**

```tsx
// packages/web/app/page.tsx
export default function Home() {
  return <h1>Propose Times</h1>;
}
```

**Step 8: Install and verify**

```bash
pnpm install
cd packages/web && pnpm build
```

Expected: builds successfully

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: initialize next.js web app package"
```

---

## Phase 3: Authentication

### Task 5: Set up Supabase auth

**Files:**
- Create: `packages/web/lib/supabase/server.ts`
- Create: `packages/web/lib/supabase/client.ts`
- Create: `packages/web/app/auth/callback/route.ts`
- Create: `packages/web/app/login/page.tsx`
- Create: `packages/web/components/LoginButton.tsx`

**Step 1: Install Supabase dependencies**

```bash
cd packages/web && pnpm add @supabase/ssr @supabase/supabase-js
```

**Step 2: Create server Supabase client**

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
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    },
  );
}
```

**Step 3: Create browser Supabase client**

```ts
// packages/web/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

**Step 4: Create OAuth callback route**

```ts
// packages/web/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/propose";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Verify email is allowed
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const allowedEmail = process.env.ALLOWED_EMAIL;

      if (user?.email === allowedEmail) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Not allowed — sign out and redirect to login with error
      await supabase.auth.signOut();
      return NextResponse.redirect(
        `${origin}/login?error=unauthorized`,
      );
    }
  }

  // Auth error — redirect to login
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
```

**Step 5: Create LoginButton component**

```tsx
// packages/web/components/LoginButton.tsx
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
      className="rounded-lg bg-white px-6 py-3 text-base font-medium text-zinc-900 shadow-sm active:bg-zinc-100"
    >
      Sign in with Google
    </button>
  );
}
```

**Step 6: Create login page**

```tsx
// packages/web/app/login/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginButton } from "@/components/LoginButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // If already authenticated, redirect to propose
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email === process.env.ALLOWED_EMAIL) {
    redirect("/propose");
  }

  const params = await searchParams;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-bold">Propose Times</h1>
      {params.error === "unauthorized" && (
        <p className="text-sm text-red-400">Access denied. Not an authorized account.</p>
      )}
      {params.error === "auth" && (
        <p className="text-sm text-red-400">Authentication failed. Please try again.</p>
      )}
      <LoginButton />
    </div>
  );
}
```

**Step 7: Update root page to redirect**

Replace `packages/web/app/page.tsx` with:

```tsx
// packages/web/app/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email === process.env.ALLOWED_EMAIL) {
    redirect("/propose");
  }

  redirect("/login");
}
```

**Step 8: Verify build**

```bash
cd packages/web && pnpm build
```

Expected: builds successfully (pages won't function without env vars, but should compile)

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: add supabase google oauth with email gate"
```

---

### Task 6: Add auth middleware

**Files:**
- Create: `packages/web/lib/supabase/middleware.ts`
- Create: `packages/web/middleware.ts`

**Step 1: Create middleware helper**

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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not authenticated and trying to access protected routes, redirect to login
  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
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
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files (manifest.json, icons, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json)$).*)",
  ],
};
```

**Step 3: Verify build**

```bash
cd packages/web && pnpm build
```

Expected: builds successfully

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add auth middleware for protected routes"
```

---

## Phase 4: Core Feature

### Task 7: Create slots API route

This is the core server-side logic. The API route calls SavvyCal, runs slot selection, and returns a formatted message.

**Files:**
- Create: `packages/web/app/api/slots/route.ts`

**Step 1: Create the API route**

```ts
// packages/web/app/api/slots/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getProvider,
  selectSmartSlots,
  filterSlotsByTime,
} from "@propose/core";
import type { ProviderConfig, TimeSlot, LinkInfo } from "@propose/core";
import { format, addDays } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";

interface SlotsRequestBody {
  duration: number;
  timezone: string;
  daysAhead: number;
  maxDaysToShow: number;
  maxSlotsPerDay: number;
  linkSlug: string;
}

function groupSlotsByDay(
  slots: TimeSlot[],
  timezone: string,
): Record<string, TimeSlot[]> {
  const groups: Record<string, TimeSlot[]> = {};

  for (const slot of slots) {
    const zonedDate = utcToZonedTime(new Date(slot.start_at), timezone);
    const dayKey = format(zonedDate, "yyyy-MM-dd");
    if (!groups[dayKey]) groups[dayKey] = [];
    groups[dayKey].push(slot);
  }

  return groups;
}

function formatSlotTime(slot: TimeSlot, timezone: string): string {
  const zonedDate = utcToZonedTime(new Date(slot.start_at), timezone);
  return format(zonedDate, "h:mma").toLowerCase();
}

function getTimezoneAbbr(timezone: string): string {
  const ABBRS: Record<string, string> = {
    "America/New_York": "ET",
    "America/Chicago": "CT",
    "America/Denver": "MT",
    "America/Los_Angeles": "PT",
    "America/Phoenix": "AZ",
    "Pacific/Honolulu": "HT",
    "America/Anchorage": "AKT",
    "Europe/London": "GMT",
    "Europe/Paris": "CET",
    "Asia/Tokyo": "JST",
    "Australia/Sydney": "AEST",
  };
  return ABBRS[timezone] || timezone;
}

export async function POST(request: Request) {
  // Verify authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ALLOWED_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as SlotsRequestBody;
  const {
    duration,
    timezone,
    daysAhead,
    maxDaysToShow,
    maxSlotsPerDay,
    linkSlug,
  } = body;

  // Build provider config from env vars
  const config: ProviderConfig = {
    savvycalToken: process.env.SAVVYCAL_TOKEN,
    savvycalLink: linkSlug,
    savvycalUsername: process.env.SAVVYCAL_USERNAME,
  };

  const bookerUrl = process.env.BOOKER_URL;
  const provider = getProvider("savvycal");

  try {
    const startDate = new Date();
    const endDate = addDays(startDate, daysAhead);

    const { slots: rawSlots, linkInfo } = await provider.fetchSlots(
      config,
      startDate,
      endDate,
      duration,
    );

    // Filter out evening slots in recipient timezone
    const filteredSlots = filterSlotsByTime(rawSlots, timezone);

    // Group by day and select smart slots per day
    const dayGroups = groupSlotsByDay(filteredSlots, timezone);
    const sortedDays = Object.keys(dayGroups).sort();
    const daysToShow = sortedDays.slice(0, maxDaysToShow);

    // Build all selected slots for alternative encoding
    const allSelectedSlots: TimeSlot[] = [];
    const dayMessages: string[] = [];

    for (const dayKey of daysToShow) {
      const daySlots = dayGroups[dayKey];
      const selected = selectSmartSlots(daySlots, timezone, maxSlotsPerDay);
      allSelectedSlots.push(...selected);

      const dayDate = utcToZonedTime(new Date(dayKey + "T12:00:00Z"), timezone);
      const dayLabel = format(dayDate, "EEEE M/d");

      const slotLines = selected.map((slot) => {
        const time = formatSlotTime(slot, timezone);
        const url = provider.generateBookingUrl(
          config,
          linkInfo,
          slot,
          timezone,
          bookerUrl,
          duration,
          allSelectedSlots,
        );
        return `  • ${time} — ${url}`;
      });

      dayMessages.push(`${dayLabel}\n${slotLines.join("\n")}`);
    }

    const tzAbbr = getTimezoneAbbr(timezone);
    const message =
      dayMessages.length > 0
        ? `Here are some times that work (${tzAbbr}):\n\n${dayMessages.join("\n\n")}\n\nOr pick another time: ${provider.getFallbackUrl(config)}`
        : `I couldn't find available times in the next ${daysAhead} days. Pick a time here: ${provider.getFallbackUrl(config)}`;

    return NextResponse.json({ message, linkInfo });
  } catch (error) {
    console.error("Slots API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch available times" },
      { status: 500 },
    );
  }
}
```

**Step 2: Verify build**

```bash
cd packages/web && pnpm build
```

Expected: builds successfully

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add POST /api/slots route with auth and message generation"
```

---

### Task 8: Build propose form page

**Files:**
- Create: `packages/web/lib/config.ts`
- Create: `packages/web/app/propose/page.tsx`
- Create: `packages/web/components/DurationPicker.tsx`
- Create: `packages/web/components/DaysStepper.tsx`
- Create: `packages/web/components/TimezonePicker.tsx`
- Create: `packages/web/components/ResultCard.tsx`
- Create: `packages/web/components/ProposalForm.tsx`

**Step 1: Create config helper**

```ts
// packages/web/lib/config.ts
export const TIMEZONES = [
  { title: "Eastern", value: "America/New_York", abbr: "ET" },
  { title: "Central", value: "America/Chicago", abbr: "CT" },
  { title: "Mountain", value: "America/Denver", abbr: "MT" },
  { title: "Pacific", value: "America/Los_Angeles", abbr: "PT" },
  { title: "Arizona", value: "America/Phoenix", abbr: "AZ" },
  { title: "Hawaii", value: "Pacific/Honolulu", abbr: "HT" },
  { title: "Alaska", value: "America/Anchorage", abbr: "AKT" },
  { title: "London", value: "Europe/London", abbr: "GMT" },
  { title: "Paris", value: "Europe/Paris", abbr: "CET" },
  { title: "Tokyo", value: "Asia/Tokyo", abbr: "JST" },
  { title: "Sydney", value: "Australia/Sydney", abbr: "AEST" },
] as const;

export interface UserPreferences {
  timezone: string;
  daysAhead: number;
  maxDaysToShow: number;
  maxSlotsPerDay: number;
  duration: number;
  linkSlug: string;
}

const STORAGE_KEY = "propose-preferences";

const DEFAULTS: UserPreferences = {
  timezone: "America/New_York",
  daysAhead: 5,
  maxDaysToShow: 3,
  maxSlotsPerDay: 4,
  duration: 30,
  linkSlug: "",
};

export function loadPreferences(): UserPreferences {
  if (typeof window === "undefined") return DEFAULTS;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(stored) };
  } catch {
    return DEFAULTS;
  }
}

export function savePreferences(prefs: Partial<UserPreferences>) {
  if (typeof window === "undefined") return;

  const current = loadPreferences();
  const updated = { ...current, ...prefs };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
```

**Step 2: Create DurationPicker component**

```tsx
// packages/web/components/DurationPicker.tsx
"use client";

interface DurationPickerProps {
  durations: number[];
  value: number;
  onChange: (duration: number) => void;
}

export function DurationPicker({ durations, value, onChange }: DurationPickerProps) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-zinc-400">Duration</legend>
      <div className="flex gap-2">
        {durations.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onChange(d)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              d === value
                ? "bg-white text-zinc-900"
                : "bg-zinc-800 text-zinc-300 active:bg-zinc-700"
            }`}
          >
            {d}m
          </button>
        ))}
      </div>
    </fieldset>
  );
}
```

**Step 3: Create DaysStepper component**

```tsx
// packages/web/components/DaysStepper.tsx
"use client";

interface DaysStepperProps {
  value: number;
  onChange: (days: number) => void;
}

export function DaysStepper({ value, onChange }: DaysStepperProps) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-zinc-400">
        Look ahead
      </legend>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, value - 1))}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-lg font-medium text-zinc-300 active:bg-zinc-700"
        >
          −
        </button>
        <span className="min-w-[4rem] text-center text-lg font-medium">
          {value} {value === 1 ? "day" : "days"}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(14, value + 1))}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-lg font-medium text-zinc-300 active:bg-zinc-700"
        >
          +
        </button>
      </div>
    </fieldset>
  );
}
```

**Step 4: Create TimezonePicker component**

```tsx
// packages/web/components/TimezonePicker.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { TIMEZONES } from "@/lib/config";

interface TimezonePickerProps {
  value: string;
  onChange: (tz: string) => void;
}

export function TimezonePicker({ value, onChange }: TimezonePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = TIMEZONES.filter(
    (tz) =>
      tz.title.toLowerCase().includes(search.toLowerCase()) ||
      tz.abbr.toLowerCase().includes(search.toLowerCase()),
  );

  const selected = TIMEZONES.find((tz) => tz.value === value);

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-zinc-400">
        Recipient timezone
      </legend>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full rounded-lg bg-zinc-800 px-4 py-3 text-left text-base text-zinc-100"
        >
          {selected ? `${selected.title} (${selected.abbr})` : "Select timezone"}
        </button>

        {open && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg">
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border-b border-zinc-700 bg-transparent px-4 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
              autoFocus
            />
            <ul className="max-h-60 overflow-y-auto py-1">
              {filtered.map((tz) => (
                <li key={tz.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(tz.value);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`w-full px-4 py-2 text-left text-sm active:bg-zinc-700 ${
                      tz.value === value
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-300"
                    }`}
                  >
                    {tz.title} ({tz.abbr})
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </fieldset>
  );
}
```

**Step 5: Create ResultCard component**

```tsx
// packages/web/components/ResultCard.tsx
"use client";

import { useState } from "react";

interface ResultCardProps {
  message: string;
}

export function ResultCard({ message }: ResultCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // Copy as both plain text and HTML (for rich links)
      const htmlMessage = message.replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1">$1</a>',
      );

      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([message], { type: "text/plain" }),
          "text/html": new Blob([htmlMessage], { type: "text/html" }),
        }),
      ]);

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback to plain text
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ text: message });
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <pre className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
        {message}
      </pre>
      <div className="flex gap-3">
        <button
          onClick={handleCopy}
          className="flex-1 rounded-lg bg-white px-4 py-3 text-sm font-medium text-zinc-900 active:bg-zinc-100"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button
            onClick={handleShare}
            className="flex-1 rounded-lg bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-300 active:bg-zinc-700"
          >
            Share
          </button>
        )}
      </div>
    </div>
  );
}
```

**Step 6: Create ProposalForm component**

```tsx
// packages/web/components/ProposalForm.tsx
"use client";

import { useState, useEffect } from "react";
import { DurationPicker } from "./DurationPicker";
import { DaysStepper } from "./DaysStepper";
import { TimezonePicker } from "./TimezonePicker";
import { ResultCard } from "./ResultCard";
import { loadPreferences, savePreferences } from "@/lib/config";
import type { LinkInfo } from "@propose/core";

interface ProposalFormProps {
  linkSlugs: string[];
}

export function ProposalForm({ linkSlugs }: ProposalFormProps) {
  const [duration, setDuration] = useState(30);
  const [timezone, setTimezone] = useState("America/New_York");
  const [daysAhead, setDaysAhead] = useState(5);
  const [linkSlug, setLinkSlug] = useState(linkSlugs[0] || "");
  const [durations, setDurations] = useState<number[]>([30]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved preferences on mount
  useEffect(() => {
    const prefs = loadPreferences();
    setTimezone(prefs.timezone);
    setDaysAhead(prefs.daysAhead);
    setDuration(prefs.duration);
    if (prefs.linkSlug && linkSlugs.includes(prefs.linkSlug)) {
      setLinkSlug(prefs.linkSlug);
    }
  }, [linkSlugs]);

  // Fetch link info to get available durations
  useEffect(() => {
    if (!linkSlug) return;

    async function fetchLinkInfo() {
      try {
        const res = await fetch("/api/slots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            duration,
            timezone,
            daysAhead: 1,
            maxDaysToShow: 1,
            maxSlotsPerDay: 1,
            linkSlug,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.linkInfo?.durations) {
            setDurations(data.linkInfo.durations);
          }
        }
      } catch {
        // Non-critical — durations stay at default
      }
    }

    fetchLinkInfo();
  }, [linkSlug]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    // Save preferences
    savePreferences({ timezone, daysAhead, duration, linkSlug });

    try {
      const res = await fetch("/api/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration,
          timezone,
          daysAhead,
          maxDaysToShow: 3,
          maxSlotsPerDay: 4,
          linkSlug,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch times");
      }

      const data = await res.json();
      setMessage(data.message);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {linkSlugs.length > 1 && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-zinc-400">Link</legend>
          <div className="flex gap-2">
            {linkSlugs.map((slug) => (
              <button
                key={slug}
                type="button"
                onClick={() => setLinkSlug(slug)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  slug === linkSlug
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

      <DurationPicker durations={durations} value={duration} onChange={setDuration} />
      <DaysStepper value={daysAhead} onChange={setDaysAhead} />
      <TimezonePicker value={timezone} onChange={setTimezone} />

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="rounded-lg bg-white px-6 py-3 text-base font-medium text-zinc-900 shadow-sm active:bg-zinc-100 disabled:opacity-50"
      >
        {loading ? "Finding times…" : "Propose Times"}
      </button>

      {error && <p className="text-center text-sm text-red-400">{error}</p>}
      {message && <ResultCard message={message} />}
    </div>
  );
}
```

**Step 7: Create propose page**

```tsx
// packages/web/app/propose/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProposalForm } from "@/components/ProposalForm";

function parseSlugs(raw: string): string[] {
  return [...new Set(
    raw.split(",").map((s) => s.trim()).filter(Boolean),
  )];
}

export default async function ProposePage() {
  // Verify auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ALLOWED_EMAIL) {
    redirect("/login");
  }

  // Read link slugs from env
  const linkSlugs = parseSlugs(process.env.SAVVYCAL_LINK_SLUGS || "");

  if (linkSlugs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 pt-12">
        <h1 className="text-xl font-bold">Propose Times</h1>
        <p className="text-sm text-zinc-400">
          No scheduling links configured. Set SAVVYCAL_LINK_SLUGS env var.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Propose Times</h1>
      <ProposalForm linkSlugs={linkSlugs} />
    </div>
  );
}
```

**Step 8: Verify build**

```bash
cd packages/web && pnpm build
```

Expected: builds successfully

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: add propose form page with components"
```

---

## Phase 5: PWA & Polish

### Task 9: Add PWA manifest and icons

**Files:**
- Create: `packages/web/public/manifest.json`
- Create: `packages/web/public/icon-192.png` (placeholder)
- Create: `packages/web/public/icon-512.png` (placeholder)

**Step 1: Create manifest.json**

```json
{
  "name": "Propose Times",
  "short_name": "Propose",
  "start_url": "/propose",
  "display": "standalone",
  "background_color": "#09090b",
  "theme_color": "#18181b",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Step 2: Create placeholder icons**

Generate simple placeholder icons (solid color squares). These can be replaced with real icons later.

```bash
cd packages/web/public
# Create a 1x1 white PNG and upscale — or use any simple icon generator
# For now, just ensure the files exist so the manifest doesn't 404
convert -size 192x192 xc:#18181b icon-192.png 2>/dev/null || touch icon-192.png
convert -size 512x512 xc:#18181b icon-512.png 2>/dev/null || touch icon-512.png
```

**Step 3: Verify manifest is referenced in layout**

Confirm `packages/web/app/layout.tsx` already has `manifest: "/manifest.json"` in the metadata export (it was added in Task 4).

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add PWA manifest and placeholder icons"
```

---

### Task 10: Add sign-out button

**Files:**
- Create: `packages/web/components/SignOutButton.tsx`
- Modify: `packages/web/app/propose/page.tsx`

**Step 1: Create SignOutButton component**

```tsx
// packages/web/components/SignOutButton.tsx
"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <button
      onClick={handleSignOut}
      className="text-sm text-zinc-500 active:text-zinc-300"
    >
      Sign out
    </button>
  );
}
```

**Step 2: Add SignOutButton to propose page**

In `packages/web/app/propose/page.tsx`, add the import and render the button in the header area:

```tsx
// Add import at top:
import { SignOutButton } from "@/components/SignOutButton";

// Update the return JSX to include the button:
return (
  <div className="flex flex-col gap-6">
    <div className="flex items-center justify-between">
      <h1 className="text-xl font-bold">Propose Times</h1>
      <SignOutButton />
    </div>
    <ProposalForm linkSlugs={linkSlugs} />
  </div>
);
```

**Step 3: Verify build**

```bash
cd packages/web && pnpm build
```

Expected: builds successfully

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add sign-out button to propose page"
```

---

### Task 11: Environment config and Vercel deployment

**Files:**
- Create: `packages/web/.env.local.example`
- Create: `packages/web/.gitignore`

**Step 1: Create env example file**

```bash
# packages/web/.env.local.example
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ALLOWED_EMAIL=you@example.com
SAVVYCAL_TOKEN=your-savvycal-api-token
SAVVYCAL_USERNAME=your-savvycal-username
SAVVYCAL_LINK_SLUGS=chat,call
BOOKER_URL=https://your-booker.vercel.app
```

**Step 2: Create web package .gitignore**

```
# packages/web/.gitignore
.next/
.env.local
node_modules/
```

**Step 3: Verify the full build from root**

```bash
cd /path/to/savvycal-propose
pnpm test:run
pnpm build:web
```

Expected: core tests pass, web app builds successfully

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: add env example and web gitignore"
```

**Step 5: Deploy to Vercel**

1. Push to GitHub
2. Import project in Vercel, set root directory to `packages/web`
3. Set all env vars from `.env.local.example`
4. Set build command: `cd ../.. && pnpm build:web` (or configure in `vercel.json`)
5. Deploy

---

## Verification Checklist

After all tasks are complete, verify end-to-end:

- [ ] `pnpm install` from root succeeds
- [ ] `pnpm test:run` passes all core tests
- [ ] `pnpm build:web` builds without errors
- [ ] `cd packages/raycast && pnpm build` succeeds
- [ ] Web app redirects unauthenticated users to `/login`
- [ ] Google OAuth flow completes and redirects to `/propose`
- [ ] Non-allowed emails are rejected with error message
- [ ] Duration picker shows durations from SavvyCal link config
- [ ] Propose Times button fetches slots and displays message
- [ ] Copy button copies message with rich links
- [ ] Share button opens native share sheet (mobile)
- [ ] PWA is installable from mobile browser ("Add to Home Screen")
- [ ] Sign out returns to login page
