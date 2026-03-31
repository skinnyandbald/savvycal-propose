# Supabase → Better Auth + Neon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Supabase Auth (Google OAuth) with Better Auth + Drizzle + Neon Postgres, eliminating the $10/mo Supabase cost and the GitHub Actions keep-alive cron that triggered the April 8 deprecation.

**Architecture:** Better Auth handles Google OAuth, stores sessions in Neon Postgres via Drizzle ORM. Edge middleware checks session cookie presence only (`getSessionCookie()`). Full session + `ALLOWED_EMAIL` enforcement happens in server components and the API route.

**Tech Stack:** Next.js 15, TypeScript 5.2, Better Auth, Drizzle ORM, Neon Postgres (`@neondatabase/serverless`), pnpm monorepo (`packages/web`)

---

## Pre-Flight (Manual — You Do These)

These steps require browser or CLI access outside the codebase. Do them before running any code tasks.

### Step 1: Vercel env vars

Add to Vercel project (all environments unless noted):
- `BETTER_AUTH_SECRET` — run `openssl rand -base64 32` to generate
- `BETTER_AUTH_URL` — `https://<your-production-domain>` (production only)
- `NEXT_PUBLIC_BETTER_AUTH_URL` — same value as `BETTER_AUTH_URL` (production only)
- `GOOGLE_CLIENT_ID` — copy from existing Supabase env vars in Vercel
- `GOOGLE_CLIENT_SECRET` — copy from existing Supabase env vars in Vercel
- `DATABASE_URL` — already provisioned by Neon Marketplace; verify it's present

Then pull to `.env.local`:
```bash
cd packages/web
vercel env pull
```

Then manually add to `packages/web/.env.local` (do NOT rely on `vercel env pull` for localhost values):
```
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
```

### Step 2: Google Cloud Console

1. Go to Google Cloud Console → APIs & Services → Credentials → your OAuth 2.0 client
2. Under "Authorized redirect URIs", ADD (do NOT remove existing):
   - `https://<your-production-domain>/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google`
3. Save — keep the existing Supabase callback URI in place until after 1 week of stable production

---

## Task 1: Install packages

**Files:**
- Modify: `packages/web/package.json`

- [ ] **Step 1: Add Better Auth + Drizzle packages**

```bash
cd packages/web && pnpm add better-auth drizzle-orm @neondatabase/serverless
pnpm add -D drizzle-kit
```

- [ ] **Step 2: Verify installation**

```bash
cd packages/web && pnpm tsc --noEmit 2>&1 | head -20
```

Expected: TypeScript errors about missing `better-auth` types are OK at this stage (we haven't created the files yet). Any pre-existing errors are acceptable. The command should not hang.

- [ ] **Step 3: Commit**

```bash
cd packages/web && git add package.json pnpm-lock.yaml
git commit -m "chore: add better-auth, drizzle-orm, drizzle-kit, @neondatabase/serverless"
```

---

## Task 2: Create Better Auth server config

**Why first:** `@better-auth/cli generate` reads this file to produce the correct Drizzle schema. Must exist before schema generation.

**Files:**
- Create: `packages/web/lib/auth/index.ts`

- [ ] **Step 1: Create auth config**

Create `packages/web/lib/auth/index.ts`:

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  baseURL: process.env.BETTER_AUTH_URL!,
  secret: process.env.BETTER_AUTH_SECRET!,
});
```

Note: TypeScript will error here because `@/lib/db` and `@/lib/db/schema` don't exist yet. That's expected — we create them in Task 3.

- [ ] **Step 2: Commit**

```bash
git add packages/web/lib/auth/index.ts
git commit -m "feat: add Better Auth server config"
```

---

## Task 3: Create Neon + Drizzle database connection

**Files:**
- Create: `packages/web/lib/db/index.ts`
- Create: `packages/web/drizzle.config.ts`

Note: `packages/web/lib/db/schema.ts` will be generated in Task 4 — do NOT hand-write it.

- [ ] **Step 1: Create Neon HTTP driver + Drizzle instance**

Create `packages/web/lib/db/index.ts`:

```typescript
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql, schema });
```

- [ ] **Step 2: Create Drizzle config**

Create `packages/web/drizzle.config.ts`:

```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

- [ ] **Step 3: Verify TypeScript (partial)**

```bash
cd packages/web && pnpm tsc --noEmit 2>&1 | grep "lib/db"
```

Expected: Error about missing `./schema` — that's fine, schema comes next.

- [ ] **Step 4: Commit**

```bash
git add packages/web/lib/db/index.ts packages/web/drizzle.config.ts
git commit -m "feat: add Neon HTTP driver and Drizzle config"
```

---

## Task 4: Generate database schema

**Files:**
- Create: `packages/web/lib/db/schema.ts` (generated — do NOT hand-write)

- [ ] **Step 1: Generate schema from Better Auth config**

Run from `packages/web/` directory:

```bash
cd packages/web && npx @better-auth/cli generate --output lib/db/schema.ts
```

This reads `lib/auth/index.ts` and generates the exact Drizzle schema Better Auth expects. If prompted to confirm output path, confirm.

- [ ] **Step 2: Verify the file was created**

```bash
ls -la packages/web/lib/db/schema.ts
```

Expected: File exists with size > 0. It should contain `pgTable` definitions for `user`, `session`, `account`, `verification`.

> **Note:** Verify that all four `updatedAt` fields (`user`, `session`, `account`, `verification`) include `.defaultNow()`. The CLI-generated schema may omit `.defaultNow()` on `session.updatedAt` and `account.updatedAt`, causing INSERT failures on `.notNull()` columns when Better Auth does not supply the value. Add `.defaultNow()` manually to any `updatedAt` fields that are missing it.

- [ ] **Step 3: Verify TypeScript compiles (auth + db layer)**

```bash
cd packages/web && pnpm tsc --noEmit 2>&1 | grep -E "lib/(auth|db)"
```

Expected: No errors in `lib/auth/` or `lib/db/` at this point.

- [ ] **Step 4: Commit**

```bash
git add packages/web/lib/db/schema.ts
git commit -m "feat: generate Better Auth Drizzle schema"
```

---

## Task 5: Push schema to Neon

**Prerequisite:** `DATABASE_URL` must be in `.env.local` (from Task Pre-Flight Step 1).

- [ ] **Step 1: Push schema**

```bash
cd packages/web && npx drizzle-kit push
```

Expected output: Confirmation that tables were created (`user`, `session`, `account`, `verification`). If it says "No changes", the tables already exist — that's fine.

- [ ] **Step 2: Verify tables in Neon dashboard**

Open the Neon dashboard (https://console.neon.tech) → your project → Tables. Confirm these tables exist:
- `user`
- `session`
- `account`
- `verification`

If you prefer CLI verification:

```bash
cd packages/web && npx drizzle-kit studio
```

Then open `https://local.drizzle.studio` to browse tables.

No commit needed — this is a database operation, not a code change.

---

## Task 6: Create browser auth client

**Files:**
- Create: `packages/web/lib/auth/client.ts`

- [ ] **Step 1: Create auth client**

Create `packages/web/lib/auth/client.ts`:

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
});
```

`NEXT_PUBLIC_BETTER_AUTH_URL` is the publicly accessible base URL. For local dev, set to `http://localhost:3000` in `.env.local`. For production, set in Vercel dashboard.

- [ ] **Step 2: Commit**

```bash
git add packages/web/lib/auth/client.ts
git commit -m "feat: add Better Auth browser client"
```

---

## Task 7: Create Better Auth catch-all route

**Files:**
- Create: `packages/web/app/api/auth/[...all]/route.ts`

- [ ] **Step 1: Create catch-all route handler**

Create `packages/web/app/api/auth/[...all]/route.ts`:

```typescript
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
```

This handles all Better Auth endpoints: `/api/auth/signin/google`, `/api/auth/callback/google`, `/api/auth/signout`, etc.

- [ ] **Step 2: Verify TypeScript**

```bash
cd packages/web && pnpm tsc --noEmit 2>&1 | grep "api/auth"
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add "packages/web/app/api/auth/[...all]/route.ts"
git commit -m "feat: add Better Auth catch-all route handler"
```

---

## Task 8: Replace middleware

**Files:**
- Modify: `packages/web/middleware.ts`

- [ ] **Step 1: Replace Supabase middleware with Better Auth cookie check**

Replace the entire content of `packages/web/middleware.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/propose/:path*", "/api/slots/:path*"],
};
```

**Why `getSessionCookie()` not `auth.api.getSession()`:** Middleware runs on the Edge Runtime by default. `auth.api.getSession()` hits the database (Neon) which is incompatible with Edge Runtime. `getSessionCookie()` only inspects the request cookie — no DB call, no Node.js required.

**Why `/login` is NOT in the matcher:** An unauthorized user (valid cookie, wrong email) gets redirected to `/login?error=unauthorized`. If `/login` were in the matcher, the middleware would see their valid cookie and redirect them back to `/propose`, creating an infinite loop. `login/page.tsx` handles its own "already authenticated → redirect away" logic.

**Why `/` is NOT in the matcher:** Root `/` needs `ALLOWED_EMAIL` checking which requires a DB call. `page.tsx` handles all root logic.

- [ ] **Step 2: Verify TypeScript**

```bash
cd packages/web && pnpm tsc --noEmit 2>&1 | grep middleware
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add packages/web/middleware.ts
git commit -m "feat: replace Supabase middleware with Better Auth cookie check"
```

---

## Task 9: Replace LoginButton component

**Files:**
- Modify: `packages/web/components/LoginButton.tsx`

- [ ] **Step 1: Replace Supabase OAuth with Better Auth social sign-in**

Replace the entire content of `packages/web/components/LoginButton.tsx`:

```typescript
"use client";

import { authClient } from "@/lib/auth/client";

export function LoginButton() {
  const handleLogin = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/propose",
      errorCallbackURL: "/login?error=auth",
    });
  };

  return (
    <button
      type="button"
      onClick={handleLogin}
      className="rounded-lg bg-white px-6 py-3 text-base font-medium text-zinc-900 shadow-sm active:bg-zinc-100"
    >
      Sign in with Google
    </button>
  );
}
```

**What changed:** `supabase.auth.signInWithOAuth` → `authClient.signIn.social`. The `callbackURL` now points to `/propose` (Better Auth redirects there on success). `errorCallbackURL` handles OAuth failures.

- [ ] **Step 2: Commit**

```bash
git add packages/web/components/LoginButton.tsx
git commit -m "feat: replace LoginButton with Better Auth social sign-in"
```

---

## Task 10: Replace SignOutButton component

**Files:**
- Modify: `packages/web/components/SignOutButton.tsx`

- [ ] **Step 1: Replace Supabase sign-out with Better Auth**

Replace the entire content of `packages/web/components/SignOutButton.tsx`:

```typescript
"use client";

import { authClient } from "@/lib/auth/client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
        },
      },
    });
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

**What changed:** `supabase.auth.signOut()` → `authClient.signOut()`. The `onSuccess` callback handles navigation after the cookie is cleared. Without `onSuccess`, the component would navigate before the cookie is destroyed and the session check would still pass.

- [ ] **Step 2: Commit**

```bash
git add packages/web/components/SignOutButton.tsx
git commit -m "feat: replace SignOutButton with Better Auth sign-out"
```

---

## Task 11: Replace login page

**Files:**
- Modify: `packages/web/app/login/page.tsx`

- [ ] **Step 1: Replace Supabase session check**

Replace the entire content of `packages/web/app/login/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { LoginButton } from "@/components/LoginButton";
import { SignOutButton } from "@/components/SignOutButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const allowedEmail = process.env.ALLOWED_EMAIL?.toLowerCase();

  // Redirect authorized users away from login
  if (session?.user.email?.toLowerCase() === allowedEmail) {
    redirect("/propose");
  }

  const params = await searchParams;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-bold">Propose Times</h1>
      {params.error === "unauthorized" && (
        <>
          <p className="text-sm text-red-400">Access denied. Not an authorized account.</p>
          <SignOutButton />
        </>
      )}
      {params.error === "auth" && (
        <p className="text-sm text-red-400">Authentication failed. Please try again.</p>
      )}
      <LoginButton />
    </div>
  );
}
```

**What changed:**
- `supabase.auth.getUser()` → `auth.api.getSession({ headers: await headers() })` — headers are required for Better Auth to read the session cookie in App Router server components
- Only redirects to `/propose` if email matches `ALLOWED_EMAIL` (not just any authenticated user)
- Renders `<SignOutButton />` when `?error=unauthorized` — this is required so unauthorized users (valid cookie, wrong email) can clear their session and try a different Google account

- [ ] **Step 2: Verify TypeScript**

```bash
cd packages/web && pnpm tsc --noEmit 2>&1 | grep "login/page"
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add packages/web/app/login/page.tsx
git commit -m "feat: replace login page with Better Auth session check"
```

---

## Task 12: Replace root page

**Files:**
- Modify: `packages/web/app/page.tsx`

- [ ] **Step 1: Replace Supabase session check**

Replace the entire content of `packages/web/app/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  const allowedEmail = process.env.ALLOWED_EMAIL?.toLowerCase();

  if (!session) {
    redirect("/login");
  }

  if (session.user.email?.toLowerCase() !== allowedEmail) {
    redirect("/login?error=unauthorized");
  }

  redirect("/propose");
}
```

**What changed:** `supabase.auth.getUser()` → `auth.api.getSession({ headers: await headers() })`. Now distinguishes between unauthenticated (`/login`) and authenticated-but-wrong-email (`/login?error=unauthorized`).

- [ ] **Step 2: Verify TypeScript**

```bash
cd packages/web && pnpm tsc --noEmit 2>&1 | grep "app/page"
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add packages/web/app/page.tsx
git commit -m "feat: replace root page with Better Auth session check"
```

---

## Task 13: Replace propose page

**Files:**
- Modify: `packages/web/app/propose/page.tsx`

- [ ] **Step 1: Replace Supabase session check**

Replace only the auth section at the top of `packages/web/app/propose/page.tsx`. The rest of the file (parseSlugs, ProposalForm render) stays identical:

```typescript
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProposalForm } from "@/components/ProposalForm";
import { SignOutButton } from "@/components/SignOutButton";

function parseSlugs(raw: string): string[] {
  return [...new Set(
    raw.split(",").map((s) => s.trim()).filter(Boolean),
  )];
}

export default async function ProposePage() {
  // Verify auth
  const session = await auth.api.getSession({ headers: await headers() });

  const allowedEmail = process.env.ALLOWED_EMAIL?.toLowerCase();
  if (!session || session.user.email?.toLowerCase() !== allowedEmail) {
    redirect("/login?error=unauthorized");
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Propose Times</h1>
        <SignOutButton />
      </div>
      <ProposalForm linkSlugs={linkSlugs} />
    </div>
  );
}
```

**What changed:** `supabase.auth.getUser()` → `auth.api.getSession({ headers: await headers() })`. Redirect on auth failure now goes to `/login?error=unauthorized` instead of bare `/login`, so the login page can show the right error message and sign-out button.

- [ ] **Step 2: Verify TypeScript**

```bash
cd packages/web && pnpm tsc --noEmit 2>&1 | grep "propose/page"
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add packages/web/app/propose/page.tsx
git commit -m "feat: replace propose page with Better Auth session check"
```

---

## Task 14: Replace API route auth

**Files:**
- Modify: `packages/web/app/api/slots/route.ts`

- [ ] **Step 1: Replace Supabase auth in the POST handler**

Replace only the auth block at the top of the `POST` function (lines 52-63). Everything else in the file stays identical:

```typescript
export async function POST(request: Request) {
  // Verify authentication
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.email?.toLowerCase() !== process.env.ALLOWED_EMAIL?.toLowerCase()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: SlotsRequestBody;
  // ... rest of function unchanged
```

Also update the import at the top of the file — replace:
```typescript
import { createClient } from "@/lib/supabase/server";
```
with:
```typescript
import { auth } from "@/lib/auth";
```

The full updated file header (imports only — the rest is unchanged):

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getProvider,
  selectSmartSlots,
  filterSlotsByTime,
  getTimezoneAbbr,
} from "@propose/core";
import type { ProviderConfig, TimeSlot } from "@propose/core";
import { format, differenceInCalendarDays } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";
```

**What changed:** `supabase.auth.getUser()` → `auth.api.getSession({ headers: request.headers })`. Route handlers use `request.headers` directly (not `await headers()` from `next/headers` — that's for server components). Now returns 403 for wrong email instead of 401, distinguishing the two failure modes.

- [ ] **Step 2: Verify TypeScript**

```bash
cd packages/web && pnpm tsc --noEmit 2>&1 | grep "slots/route"
```

Expected: No errors.

- [ ] **Step 3: Full TypeScript check**

```bash
cd packages/web && pnpm tsc --noEmit
```

Expected: Zero errors. If there are errors in Supabase files (`lib/supabase/*`), that's fine — we delete those next.

- [ ] **Step 4: Commit**

```bash
git add packages/web/app/api/slots/route.ts
git commit -m "feat: replace slots API auth with Better Auth session check"
```

---

## Task 15: Delete Supabase files

**Files:**
- Delete: `packages/web/lib/supabase/client.ts`
- Delete: `packages/web/lib/supabase/server.ts`
- Delete: `packages/web/lib/supabase/middleware.ts`
- Delete: `packages/web/app/auth/callback/route.ts`

- [ ] **Step 1: Delete Supabase lib files**

```bash
rm packages/web/lib/supabase/client.ts
rm packages/web/lib/supabase/server.ts
rm packages/web/lib/supabase/middleware.ts
rmdir packages/web/lib/supabase 2>/dev/null || true
```

- [ ] **Step 2: Delete Supabase OAuth callback route**

```bash
rm packages/web/app/auth/callback/route.ts
rmdir packages/web/app/auth/callback 2>/dev/null || true
rmdir packages/web/app/auth 2>/dev/null || true
```

- [ ] **Step 3: Verify TypeScript with no Supabase imports**

```bash
cd packages/web && pnpm tsc --noEmit
```

Expected: Zero errors. Any remaining errors indicate a file that still imports from `@/lib/supabase/*` — fix those before committing.

- [ ] **Step 4: Commit**

```bash
git add -A packages/web/lib/supabase packages/web/app/auth
git commit -m "chore: delete Supabase auth files"
```

---

## Task 16: Remove Supabase packages

**Files:**
- Modify: `packages/web/package.json`

- [ ] **Step 1: Remove Supabase packages**

```bash
cd packages/web && pnpm remove @supabase/ssr @supabase/supabase-js
```

- [ ] **Step 2: Verify clean install**

```bash
cd packages/web && pnpm tsc --noEmit
```

Expected: Zero errors. Zero Supabase references anywhere.

- [ ] **Step 3: Confirm no remaining Supabase references**

```bash
grep -r "supabase" packages/web/app packages/web/lib packages/web/components packages/web/middleware.ts 2>/dev/null
```

Expected: No output. If any files appear, fix the remaining imports.

- [ ] **Step 4: Commit**

```bash
git add packages/web/package.json pnpm-lock.yaml
git commit -m "chore: remove Supabase packages"
```

---

## Task 17: Delete keep-alive workflow

**Files:**
- Delete: `.github/workflows/keep-supabase-alive.yml`

- [ ] **Step 1: Delete the workflow**

```bash
rm .github/workflows/keep-supabase-alive.yml
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/keep-supabase-alive.yml
git commit -m "chore: delete Supabase keep-alive workflow"
```

---

## Task 18: Deploy and verify

- [ ] **Step 1: Push to production**

```bash
git push origin master
```

Wait for Vercel deployment to complete (check Vercel dashboard or `vercel logs`).

- [ ] **Step 2: Run production auth checklist**

Test each in order — stop at first failure and investigate before continuing:

1. Navigate to `https://<your-domain>/` unauthenticated → should redirect to `/login`
2. Navigate to `https://<your-domain>/propose` unauthenticated → should redirect to `/login`
3. Click "Sign in with Google" → should redirect to Google OAuth consent screen
4. Sign in with **allowed email** → should redirect to `/propose` and show the form
5. Refresh `/propose` → should still show the form (session cookie persists)
6. Click "Sign out" → should redirect to `/login`
7. Sign in with a **different Google account** (not `ALLOWED_EMAIL`) → should land on `/login?error=unauthorized` with "Access denied" message and sign-out button
8. From the unauthorized error screen, click "Sign out" → should clear session and show `/login`
9. Navigate directly to `/propose` with no session → should redirect to `/login` (not `/login?error=unauthorized`)
10. Test OAuth denied: on Google consent screen, click "Cancel" → should land on `/login?error=auth` with "Authentication failed" message

- [ ] **Step 3: Test API endpoint**

```bash
# No session → 401
curl -s -o /dev/null -w "%{http_code}" -X POST https://<your-domain>/api/slots
# Expected: 401

# With a session cookie from a signed-in browser session, test 403 (if possible with a different account)
```

---

## Post-Migration Cleanup (after 1 week of stable production)

Do NOT do these immediately. Wait 1 week to confirm Better Auth is stable.

- [ ] Remove Supabase callback URI from Google Cloud Console (the old `https://<supabase-project>.supabase.co/auth/v1/callback`)
- [ ] Remove `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Vercel project settings
- [ ] Remove `SUPABASE_URL` and `SUPABASE_ANON_KEY` from GitHub Actions secrets
- [ ] Optionally delete the Supabase project (free tier, no harm in leaving it paused)

---

## Rollback Plan

If Better Auth breaks production sign-in:

1. Supabase env vars are still in Vercel (not removed until 1 week stable) ✓
2. Supabase callback URI still in Google Console ✓
3. **Instant rollback:** Vercel dashboard → Deployments → previous deployment → "Promote to Production"
4. If needed, unpause the Supabase project from the Supabase dashboard

Do NOT delete Supabase project, env vars, or Google callback URI until post-migration cleanup (1 week stable).
