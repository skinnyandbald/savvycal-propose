# Timezone Picker Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the timezone picker in both the web app and Raycast extension to show every major US city and world city as its own searchable row, grouped US-first then World, ordered east to west.

**Architecture:** A dev-time generation script reads `@vvo/tzdb` plus a curated US city list, emits `timezones-data.json` (~270–320 entries), and commits it. Both `packages/web` (custom dropdown) and `packages/raycast` (Form.Dropdown) consume the shared JSON via `packages/core/src/timezones.ts`. Raycast requires composite item values because duplicate IANA zones break Raycast's selection model.

**Tech Stack:** TypeScript, `@vvo/tzdb` (devDep, generation only), `tsx` (script runner), Vitest (tests), React 19, Tailwind CSS 4, Raycast API.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `packages/core/package.json` | Modify | Add `@vvo/tzdb`, `tsx` devDeps; add `generate-timezones` script |
| `packages/core/scripts/us-cities.ts` | Create | Curated list of ~65 US cities with IANA timezone + state metadata |
| `packages/core/scripts/generate-timezones.ts` | Create | Reads tzdb + us-cities, validates, emits `timezones-data.json` |
| `packages/core/src/timezones.ts` | Modify | Add `badge: string` and `group: "US" \| "World"` to `TimezoneEntry` |
| `packages/core/src/timezones-data.json` | Regenerate | ~270–320 entries with `badge` and `group` fields |
| `packages/core/src/__tests__/timezones.test.ts` | Create | Tests: data shape, search, sort order, key uniqueness |
| `packages/web/components/TimezonePicker.tsx` | Modify | Group headers, badge pill, composite key, `selectedKey` state, trigger fix |
| `packages/raycast/src/propose-times.tsx` | Modify | `Form.Dropdown.Section`, composite values, `resolveTimezone()` |

---

### Task 1: Add dev dependencies and generation script

**Files:**
- Modify: `packages/core/package.json`

- [ ] **Step 1: Update `packages/core/package.json`**

Replace the entire file with:

```json
{
  "name": "@propose/core",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "generate-timezones": "tsx scripts/generate-timezones.ts"
  },
  "dependencies": {
    "date-fns": "^2.30.0",
    "date-fns-tz": "^2.0.0"
  },
  "devDependencies": {
    "@vvo/tzdb": "^6.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.2.2",
    "vitest": "^4.0.16"
  }
}
```

- [ ] **Step 2: Install the new dependencies**

Run from the repo root:
```bash
pnpm install
```

Expected: lock file updates, `@vvo/tzdb` and `tsx` appear in `packages/core/node_modules` (or the root hoisted modules).

- [ ] **Step 3: Verify `tsx` is accessible**

```bash
pnpm --filter @propose/core exec tsx --version
```

Expected: prints a version number like `4.x.x`. If it errors, run `pnpm install` again from the repo root.

- [ ] **Step 4: Commit**

```bash
git add packages/core/package.json pnpm-lock.yaml
git commit -m "chore(core): add @vvo/tzdb and tsx for timezone generation script"
```

---

### Task 2: Create the curated US cities list

**Files:**
- Create: `packages/core/scripts/us-cities.ts`

- [ ] **Step 1: Create the scripts directory and `us-cities.ts`**

Create `packages/core/scripts/us-cities.ts`:

```typescript
export interface USCity {
  city: string;
  ianaTimezone: string;
  state: string;
  stateAbbr: string;
  extraKeywords?: string[];
}

export const US_CITIES: USCity[] = [
  // Eastern Time — America/New_York
  { city: "New York", ianaTimezone: "America/New_York", state: "New York", stateAbbr: "NY", extraKeywords: ["NYC", "New York City"] },
  { city: "Boston", ianaTimezone: "America/New_York", state: "Massachusetts", stateAbbr: "MA" },
  { city: "Philadelphia", ianaTimezone: "America/New_York", state: "Pennsylvania", stateAbbr: "PA" },
  { city: "Washington DC", ianaTimezone: "America/New_York", state: "District of Columbia", stateAbbr: "DC", extraKeywords: ["Washington", "Washington, DC", "District of Columbia"] },
  { city: "Atlanta", ianaTimezone: "America/New_York", state: "Georgia", stateAbbr: "GA" },
  { city: "Miami", ianaTimezone: "America/New_York", state: "Florida", stateAbbr: "FL" },
  { city: "Orlando", ianaTimezone: "America/New_York", state: "Florida", stateAbbr: "FL" },
  { city: "Tampa", ianaTimezone: "America/New_York", state: "Florida", stateAbbr: "FL" },
  { city: "Charlotte", ianaTimezone: "America/New_York", state: "North Carolina", stateAbbr: "NC" },
  { city: "Raleigh", ianaTimezone: "America/New_York", state: "North Carolina", stateAbbr: "NC" },
  { city: "Pittsburgh", ianaTimezone: "America/New_York", state: "Pennsylvania", stateAbbr: "PA" },
  { city: "Baltimore", ianaTimezone: "America/New_York", state: "Maryland", stateAbbr: "MD" },
  { city: "Cleveland", ianaTimezone: "America/New_York", state: "Ohio", stateAbbr: "OH" },
  { city: "Columbus", ianaTimezone: "America/New_York", state: "Ohio", stateAbbr: "OH" },
  { city: "Cincinnati", ianaTimezone: "America/New_York", state: "Ohio", stateAbbr: "OH" },
  { city: "Richmond", ianaTimezone: "America/New_York", state: "Virginia", stateAbbr: "VA" },
  { city: "Buffalo", ianaTimezone: "America/New_York", state: "New York", stateAbbr: "NY" },
  { city: "Jacksonville", ianaTimezone: "America/New_York", state: "Florida", stateAbbr: "FL" },
  // Eastern Time — America/Detroit
  { city: "Detroit", ianaTimezone: "America/Detroit", state: "Michigan", stateAbbr: "MI" },
  // Eastern Time — America/Indiana/Indianapolis
  { city: "Indianapolis", ianaTimezone: "America/Indiana/Indianapolis", state: "Indiana", stateAbbr: "IN" },
  // Eastern Time — America/Kentucky/Louisville
  { city: "Louisville", ianaTimezone: "America/Kentucky/Louisville", state: "Kentucky", stateAbbr: "KY" },
  // Central Time — America/Chicago
  { city: "Chicago", ianaTimezone: "America/Chicago", state: "Illinois", stateAbbr: "IL" },
  { city: "Dallas", ianaTimezone: "America/Chicago", state: "Texas", stateAbbr: "TX" },
  { city: "Houston", ianaTimezone: "America/Chicago", state: "Texas", stateAbbr: "TX" },
  { city: "Austin", ianaTimezone: "America/Chicago", state: "Texas", stateAbbr: "TX" },
  { city: "San Antonio", ianaTimezone: "America/Chicago", state: "Texas", stateAbbr: "TX" },
  { city: "Nashville", ianaTimezone: "America/Chicago", state: "Tennessee", stateAbbr: "TN" },
  { city: "Memphis", ianaTimezone: "America/Chicago", state: "Tennessee", stateAbbr: "TN" },
  { city: "Minneapolis", ianaTimezone: "America/Chicago", state: "Minnesota", stateAbbr: "MN" },
  { city: "Milwaukee", ianaTimezone: "America/Chicago", state: "Wisconsin", stateAbbr: "WI" },
  { city: "Kansas City", ianaTimezone: "America/Chicago", state: "Missouri", stateAbbr: "MO" },
  { city: "St. Louis", ianaTimezone: "America/Chicago", state: "Missouri", stateAbbr: "MO" },
  { city: "New Orleans", ianaTimezone: "America/Chicago", state: "Louisiana", stateAbbr: "LA" },
  { city: "Oklahoma City", ianaTimezone: "America/Chicago", state: "Oklahoma", stateAbbr: "OK" },
  { city: "Omaha", ianaTimezone: "America/Chicago", state: "Nebraska", stateAbbr: "NE" },
  { city: "Des Moines", ianaTimezone: "America/Chicago", state: "Iowa", stateAbbr: "IA" },
  { city: "Tulsa", ianaTimezone: "America/Chicago", state: "Oklahoma", stateAbbr: "OK" },
  { city: "Wichita", ianaTimezone: "America/Chicago", state: "Kansas", stateAbbr: "KS" },
  // Mountain Time — America/Denver
  { city: "Denver", ianaTimezone: "America/Denver", state: "Colorado", stateAbbr: "CO" },
  { city: "Salt Lake City", ianaTimezone: "America/Denver", state: "Utah", stateAbbr: "UT" },
  { city: "Albuquerque", ianaTimezone: "America/Denver", state: "New Mexico", stateAbbr: "NM" },
  { city: "Boise", ianaTimezone: "America/Denver", state: "Idaho", stateAbbr: "ID" },
  { city: "Colorado Springs", ianaTimezone: "America/Denver", state: "Colorado", stateAbbr: "CO" },
  { city: "Billings", ianaTimezone: "America/Denver", state: "Montana", stateAbbr: "MT" },
  // Arizona (no DST) — America/Phoenix
  { city: "Phoenix", ianaTimezone: "America/Phoenix", state: "Arizona", stateAbbr: "AZ" },
  { city: "Tucson", ianaTimezone: "America/Phoenix", state: "Arizona", stateAbbr: "AZ" },
  { city: "Scottsdale", ianaTimezone: "America/Phoenix", state: "Arizona", stateAbbr: "AZ" },
  // Pacific Time — America/Los_Angeles
  { city: "Los Angeles", ianaTimezone: "America/Los_Angeles", state: "California", stateAbbr: "CA", extraKeywords: ["LA", "Hollywood"] },
  { city: "San Francisco", ianaTimezone: "America/Los_Angeles", state: "California", stateAbbr: "CA", extraKeywords: ["SF", "Silicon Valley"] },
  { city: "Seattle", ianaTimezone: "America/Los_Angeles", state: "Washington", stateAbbr: "WA" },
  { city: "Portland", ianaTimezone: "America/Los_Angeles", state: "Oregon", stateAbbr: "OR", extraKeywords: ["Portland OR", "Portland Oregon"] },
  { city: "San Diego", ianaTimezone: "America/Los_Angeles", state: "California", stateAbbr: "CA" },
  { city: "San Jose", ianaTimezone: "America/Los_Angeles", state: "California", stateAbbr: "CA" },
  { city: "Sacramento", ianaTimezone: "America/Los_Angeles", state: "California", stateAbbr: "CA" },
  { city: "Las Vegas", ianaTimezone: "America/Los_Angeles", state: "Nevada", stateAbbr: "NV" },
  // Alaska — America/Anchorage
  { city: "Anchorage", ianaTimezone: "America/Anchorage", state: "Alaska", stateAbbr: "AK" },
  { city: "Fairbanks", ianaTimezone: "America/Anchorage", state: "Alaska", stateAbbr: "AK" },
  { city: "Juneau", ianaTimezone: "America/Anchorage", state: "Alaska", stateAbbr: "AK" },
  // Hawaii — Pacific/Honolulu
  { city: "Honolulu", ianaTimezone: "Pacific/Honolulu", state: "Hawaii", stateAbbr: "HI" },
  { city: "Kahului", ianaTimezone: "Pacific/Honolulu", state: "Hawaii", stateAbbr: "HI", extraKeywords: ["Maui"] },
];
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/scripts/us-cities.ts
git commit -m "feat(core): add curated US cities list for timezone generation"
```

---

### Task 3: Create the generation script

**Files:**
- Create: `packages/core/scripts/generate-timezones.ts`

- [ ] **Step 1: Create `packages/core/scripts/generate-timezones.ts`**

```typescript
import { getTimeZones } from "@vvo/tzdb";
import { writeFileSync } from "fs";
import { join } from "path";
import { US_CITIES } from "./us-cities";

interface TimezoneEntry {
  title: string;
  value: string;
  abbr: string;
  badge: string;
  keywords: string[];
  group: "US" | "World";
}

const US_ZONE_INFO: Record<string, { abbr: string; badge: string }> = {
  "America/New_York": { abbr: "ET", badge: "ET · Eastern" },
  "America/Indiana/Indianapolis": { abbr: "ET", badge: "ET · Eastern" },
  "America/Kentucky/Louisville": { abbr: "ET", badge: "ET · Eastern" },
  "America/Detroit": { abbr: "ET", badge: "ET · Eastern" },
  "America/Chicago": { abbr: "CT", badge: "CT · Central" },
  "America/Denver": { abbr: "MT", badge: "MT · Mountain" },
  "America/Phoenix": { abbr: "MST", badge: "MST · Arizona" },
  "America/Los_Angeles": { abbr: "PT", badge: "PT · Pacific" },
  "America/Anchorage": { abbr: "AKT", badge: "AKT · Alaska" },
  "Pacific/Honolulu": { abbr: "HT", badge: "HT · Hawaii" },
};

const DST_KEYWORDS: Record<string, string[]> = {
  "America/New_York": ["EST", "EDT"],
  "America/Indiana/Indianapolis": ["EST", "EDT"],
  "America/Kentucky/Louisville": ["EST", "EDT"],
  "America/Detroit": ["EST", "EDT"],
  "America/Chicago": ["CST", "CDT"],
  "America/Denver": ["MST", "MDT"],
  "America/Phoenix": ["MST"],
  "America/Los_Angeles": ["PST", "PDT"],
  "America/Anchorage": ["AKST", "AKDT"],
  "Pacific/Honolulu": ["HST"],
};

const tzdb = getTimeZones();
const tzdbMap = new Map(tzdb.map((tz) => [tz.name, tz]));

// --- US section ---
const usEntries: TimezoneEntry[] = US_CITIES.map((city) => {
  const zoneInfo = US_ZONE_INFO[city.ianaTimezone];
  if (!zoneInfo) {
    throw new Error(`No US_ZONE_INFO entry for "${city.ianaTimezone}" (city: ${city.city})`);
  }
  if (!tzdbMap.has(city.ianaTimezone)) {
    throw new Error(`"${city.ianaTimezone}" not found in @vvo/tzdb (city: ${city.city})`);
  }
  const dstKws = DST_KEYWORDS[city.ianaTimezone] ?? [];
  return {
    title: city.city,
    value: city.ianaTimezone,
    abbr: zoneInfo.abbr,
    badge: zoneInfo.badge,
    keywords: [
      city.state,
      city.stateAbbr,
      zoneInfo.badge,
      ...dstKws,
      ...(city.extraKeywords ?? []),
    ],
    group: "US",
  };
});

// Sort descending by rawOffsetInMinutes (east to west).
// Stable sort: cities in the same IANA zone keep their us-cities.ts order.
usEntries.sort((a, b) => {
  const ra = tzdbMap.get(a.value)!.rawOffsetInMinutes;
  const rb = tzdbMap.get(b.value)!.rawOffsetInMinutes;
  return rb - ra;
});

// --- World section ---
const worldEntries: TimezoneEntry[] = tzdb
  .filter(
    (tz) =>
      tz.countryCode !== "US" &&
      tz.mainCities.length > 0 &&
      !tz.name.startsWith("Etc/"),
  )
  .map((tz) => ({
    title: tz.mainCities[0],
    value: tz.name,
    abbr: tz.abbreviation,
    badge: `${tz.abbreviation} · ${tz.countryName}`,
    keywords: [
      tz.countryName,
      tz.countryCode,
      `${tz.abbreviation} · ${tz.countryName}`,
      ...tz.mainCities.slice(1),
    ],
    group: "World" as const,
  }))
  .sort((a, b) => {
    const ra = tzdbMap.get(a.value)!.rawOffsetInMinutes;
    const rb = tzdbMap.get(b.value)!.rawOffsetInMinutes;
    return rb - ra;
  });

// --- Validation pass (fail fast) ---
const allEntries = [...usEntries, ...worldEntries];
const seenKeys = new Set<string>();

for (const entry of allEntries) {
  if (!entry.title || !entry.abbr || !entry.badge) {
    throw new Error(`Entry has empty required field: ${JSON.stringify(entry)}`);
  }
  const key = `${entry.group}-${entry.title}`;
  if (seenKeys.has(key)) {
    throw new Error(`Duplicate title+group key: "${key}"`);
  }
  seenKeys.add(key);
}

// --- Write output ---
const outPath = join(__dirname, "../src/timezones-data.json");
writeFileSync(outPath, JSON.stringify(allEntries, null, 2) + "\n");
console.log(
  `✓ Wrote ${allEntries.length} entries (${usEntries.length} US, ${worldEntries.length} World) to ${outPath}`,
);
```

- [ ] **Step 2: Run the script (dry run — verify it works)**

```bash
pnpm --filter @propose/core generate-timezones
```

Expected output (numbers may vary slightly):
```
✓ Wrote 328 entries (65 US, 263 World) to .../packages/core/src/timezones-data.json
```

If you see an error about a missing IANA zone (e.g., `"America/Detroit" not found in @vvo/tzdb`), that zone isn't in tzdb — update `us-cities.ts` to use the canonical zone name (e.g., `America/New_York` for Detroit fallback) and re-run.

- [ ] **Step 3: Spot-check the output**

```bash
node -e "const d = require('./packages/core/src/timezones-data.json'); console.log(d.filter(x => x.group==='US').slice(0,3).map(x => x.title + ' / ' + x.value + ' / ' + x.badge))"
```

Expected: first 3 entries are ET cities (New York, Boston, etc.) with `badge: "ET · Eastern"`.

```bash
node -e "const d = require('./packages/core/src/timezones-data.json'); const s = d.find(x => x.title==='Belgrade'); console.log(s)"
```

Expected: Belgrade entry with `group: "World"` and `badge` containing "Serbia".

- [ ] **Step 4: Commit the generation script and new JSON**

```bash
git add packages/core/scripts/generate-timezones.ts packages/core/src/timezones-data.json
git commit -m "feat(core): add timezone generation script and regenerate timezones-data.json"
```

---

### Task 4: Update `TimezoneEntry` interface and write tests

**Files:**
- Modify: `packages/core/src/timezones.ts`
- Create: `packages/core/src/__tests__/timezones.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `packages/core/src/__tests__/timezones.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { TIMEZONES, searchTimezones, getTimezoneAbbr } from "../timezones";

describe("TimezoneEntry data shape", () => {
  it("every entry has required fields", () => {
    for (const tz of TIMEZONES) {
      expect(tz.title, `${tz.value} missing title`).toBeTruthy();
      expect(tz.value, `${tz.title} missing value`).toBeTruthy();
      expect(tz.abbr, `${tz.title} missing abbr`).toBeTruthy();
      expect(tz.badge, `${tz.title} missing badge`).toBeTruthy();
      expect(tz.keywords, `${tz.title} missing keywords`).toBeInstanceOf(Array);
      expect(["US", "World"], `${tz.title} invalid group`).toContain(tz.group);
    }
  });

  it("all composite keys are unique", () => {
    const keys = TIMEZONES.map((tz) => `${tz.group}-${tz.value}-${tz.title}`);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(TIMEZONES.length);
  });

  it("US section comes before World section", () => {
    const firstWorld = TIMEZONES.findIndex((tz) => tz.group === "World");
    const lastUS = TIMEZONES.map((tz) => tz.group).lastIndexOf("US");
    expect(firstWorld).toBeGreaterThan(lastUS);
  });

  it("US entries are ordered ET → CT → MT → AZ → PT → AK → HI", () => {
    const usEntries = TIMEZONES.filter((tz) => tz.group === "US");
    const nyIdx = usEntries.findIndex((tz) => tz.title === "New York");
    const chiIdx = usEntries.findIndex((tz) => tz.title === "Chicago");
    const denIdx = usEntries.findIndex((tz) => tz.title === "Denver");
    const phxIdx = usEntries.findIndex((tz) => tz.title === "Phoenix");
    const laIdx = usEntries.findIndex((tz) => tz.title === "Los Angeles");
    const ancIdx = usEntries.findIndex((tz) => tz.title === "Anchorage");
    const hnlIdx = usEntries.findIndex((tz) => tz.title === "Honolulu");
    expect(nyIdx).toBeLessThan(chiIdx);
    expect(chiIdx).toBeLessThan(denIdx);
    expect(denIdx).toBeLessThan(phxIdx);
    expect(phxIdx).toBeLessThan(laIdx);
    expect(laIdx).toBeLessThan(ancIdx);
    expect(ancIdx).toBeLessThan(hnlIdx);
  });
});

describe("searchTimezones", () => {
  it("finds Philadelphia by city name", () => {
    const results = searchTimezones("Philadelphia");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toBe("Philadelphia");
    expect(results[0].value).toBe("America/New_York");
  });

  it("finds Belgrade by city name", () => {
    const results = searchTimezones("Belgrade");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toBe("Belgrade");
    expect(results[0].group).toBe("World");
  });

  it("finds Eastern Time cities by badge text 'Eastern'", () => {
    const results = searchTimezones("Eastern");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.group === "US")).toBe(true);
    expect(results.every((r) => r.abbr === "ET")).toBe(true);
  });

  it("finds Serbia by country keyword", () => {
    const results = searchTimezones("Serbia");
    expect(results.length).toBeGreaterThan(0);
    const belgrade = results.find((r) => r.title === "Belgrade");
    expect(belgrade).toBeDefined();
  });

  it("returns all entries for empty query", () => {
    expect(searchTimezones("").length).toBe(TIMEZONES.length);
    expect(searchTimezones("  ").length).toBe(TIMEZONES.length);
  });
});

describe("getTimezoneAbbr", () => {
  it("returns ET for America/New_York", () => {
    expect(getTimezoneAbbr("America/New_York")).toBe("ET");
  });

  it("returns CT for America/Chicago", () => {
    expect(getTimezoneAbbr("America/Chicago")).toBe("CT");
  });

  it("returns the IANA name for unknown timezones", () => {
    expect(getTimezoneAbbr("Unknown/Zone")).toBe("Unknown/Zone");
  });
});
```

- [ ] **Step 2: Run the tests — they should fail because `TimezoneEntry` is missing `badge` and `group`**

```bash
pnpm --filter @propose/core test:run
```

Expected: TypeScript compile error or test failures because `tz.badge` and `tz.group` don't exist on the type yet.

- [ ] **Step 3: Update the `TimezoneEntry` interface in `packages/core/src/timezones.ts`**

Replace the full file content:

```typescript
import timezoneData from "./timezones-data.json";

export interface TimezoneEntry {
  title: string;
  value: string;
  abbr: string;
  badge: string;
  keywords: string[];
  group: "US" | "World";
}

// Ordered east to west (descending rawOffsetInMinutes). US section first, then World.
// Generated by: pnpm --filter @propose/core generate-timezones
export const TIMEZONES: TimezoneEntry[] = timezoneData as TimezoneEntry[];

export function getTimezoneAbbr(timezone: string): string {
  const entry = TIMEZONES.find((tz) => tz.value === timezone);
  return entry?.abbr ?? timezone;
}

export function searchTimezones(query: string): TimezoneEntry[] {
  if (!query.trim()) return TIMEZONES;

  const q = query.toLowerCase();
  return TIMEZONES.filter(
    (tz) =>
      tz.title.toLowerCase().includes(q) ||
      tz.abbr.toLowerCase().includes(q) ||
      tz.value.toLowerCase().includes(q) ||
      tz.keywords.some((kw) => kw.toLowerCase().includes(q)),
  );
}
```

- [ ] **Step 4: Run the tests — they should now pass**

```bash
pnpm --filter @propose/core test:run
```

Expected: all tests PASS. If `searchTimezones("Eastern")` fails, it means the badge text isn't in `keywords` — verify the generation script includes `zoneInfo.badge` in the US keywords array.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/timezones.ts packages/core/src/__tests__/timezones.test.ts
git commit -m "feat(core): update TimezoneEntry interface with badge and group fields"
```

---

### Task 5: Update the web `TimezonePicker` component

**Files:**
- Modify: `packages/web/components/TimezonePicker.tsx`

The current component (`packages/web/components/TimezonePicker.tsx`) is a flat list with 100 lines. It imports from `@/lib/config` (which re-exports from `@propose/core`). We replace it entirely with a grouped, badged version.

- [ ] **Step 1: Replace `packages/web/components/TimezonePicker.tsx`**

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { TIMEZONES, searchTimezones } from "@/lib/config";
import type { TimezoneEntry } from "@/lib/config";

interface TimezonePickerProps {
  value: string;
  onChange: (tz: string) => void;
}

function formatTimeInZone(tz: string): string {
  try {
    return new Date().toLocaleTimeString("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function TimezonePicker({ value, onChange }: TimezonePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [now, setNow] = useState<number | null>(null);
  // Track the exact clicked entry so only one row highlights
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
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

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const filtered = searchTimezones(search);
  const usFiltered = filtered.filter((tz) => tz.group === "US");
  const worldFiltered = filtered.filter((tz) => tz.group === "World");

  // Find selected entry for trigger label: prefer selectedKey match, else first IANA match
  const selected: TimezoneEntry | undefined =
    selectedKey
      ? TIMEZONES.find(
          (tz) => `${tz.group}-${tz.value}-${tz.title}` === selectedKey,
        )
      : TIMEZONES.find((tz) => tz.value === value);

  const mounted = now !== null;

  function handleSelect(tz: TimezoneEntry) {
    setSelectedKey(`${tz.group}-${tz.value}-${tz.title}`);
    onChange(tz.value);
    setOpen(false);
    setSearch("");
  }

  function isHighlighted(tz: TimezoneEntry): boolean {
    if (selectedKey) {
      return `${tz.group}-${tz.value}-${tz.title}` === selectedKey;
    }
    // Fallback: highlight first entry with matching IANA zone (externally set value)
    return tz.value === value;
  }

  function renderEntry(tz: TimezoneEntry) {
    const highlighted = isHighlighted(tz);
    return (
      <li key={`${tz.group}-${tz.value}-${tz.title}`}>
        <button
          type="button"
          onClick={() => handleSelect(tz)}
          className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm active:bg-zinc-700 ${
            highlighted ? "bg-zinc-800 text-white" : "text-zinc-300"
          }`}
        >
          <span className="flex items-center gap-2">
            <span>{tz.title}</span>
            <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">
              {tz.badge}
            </span>
          </span>
          {mounted && (
            <span className="text-zinc-500 text-xs tabular-nums">
              {formatTimeInZone(tz.value)}
            </span>
          )}
        </button>
      </li>
    );
  }

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
          {selected
            ? mounted
              ? `${selected.abbr} · ${formatTimeInZone(selected.value)}`
              : selected.abbr
            : "Select timezone"}
        </button>

        {open && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg">
            <input
              type="text"
              placeholder="Search city, state, or timezone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border-b border-zinc-700 bg-transparent px-4 py-2 text-base text-zinc-100 outline-none placeholder:text-zinc-500"
              autoFocus
            />
            <ul className="max-h-72 overflow-y-auto py-1">
              {usFiltered.length > 0 && (
                <>
                  <li className="px-4 py-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                    United States
                  </li>
                  {usFiltered.map(renderEntry)}
                </>
              )}
              {worldFiltered.length > 0 && (
                <>
                  <li className="px-4 py-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                    World
                  </li>
                  {worldFiltered.map(renderEntry)}
                </>
              )}
              {filtered.length === 0 && (
                <li className="px-4 py-2 text-sm text-zinc-500">
                  No timezones found
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </fieldset>
  );
}
```

- [ ] **Step 2: Check that `@/lib/config` exports `TimezoneEntry`**

Run:
```bash
grep -n "TimezoneEntry" packages/web/lib/config.ts 2>/dev/null || grep -rn "TimezoneEntry" packages/web/lib/ 2>/dev/null
```

If `TimezoneEntry` is not re-exported from `@/lib/config`, find the config file and add:
```typescript
export type { TimezoneEntry } from "@propose/core";
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm --filter @propose/web exec tsc --noEmit
```

Expected: no errors. If you see `Property 'badge' does not exist`, the JSON regeneration step wasn't committed — re-run the generate script.

- [ ] **Step 4: Manually test in the browser**

```bash
pnpm --filter @propose/web dev
```

Open `http://localhost:3000/propose`. Click the timezone picker. Verify:
- "United States" section header appears with ~65 city rows, each showing a badge pill
- "World" section header appears below with world entries
- Trigger button shows `ET · 3:45 PM` style (not city name)
- Typing "Philadelphia" shows a direct Philadelphia row
- Typing "Serbia" shows Belgrade under World
- Typing "Eastern" shows all ET cities

- [ ] **Step 5: Commit**

```bash
git add packages/web/components/TimezonePicker.tsx
git commit -m "feat(web): redesign TimezonePicker with grouped sections and badge pills"
```

---

### Task 6: Update the Raycast `Form.Dropdown`

**Files:**
- Modify: `packages/raycast/src/propose-times.tsx`

The current Raycast code (lines ~513–537) has a flat `TIMEZONES.map(...)` with `key={tz.value}` and `value={tz.value}`. We replace it with two `Form.Dropdown.Section` blocks using composite values and a resolver function.

- [ ] **Step 1: Find the existing timezone dropdown block**

The block to replace is in `packages/raycast/src/propose-times.tsx` around line 513. It looks like:

```tsx
<Form.Dropdown
  id="timezone"
  title="Recipient's Timezone"
  value={timezone}
  onChange={setTimezone}
>
  {TIMEZONES.map((tz) => {
    let timeStr = "";
    try {
      timeStr = new Date().toLocaleTimeString("en-US", {
        timeZone: tz.value,
        hour: "numeric",
        minute: "2-digit",
      });
    } catch { /* skip for UTC etc. */ }
    return (
      <Form.Dropdown.Item
        key={tz.value}
        value={tz.value}
        title={`${tz.title} (${tz.abbr})${timeStr ? ` · ${timeStr}` : ""}`}
        keywords={[tz.title, tz.abbr, ...tz.keywords]}
      />
    );
  })}
</Form.Dropdown>
```

- [ ] **Step 2: Add the `resolveTimezone` helper and grouped variables**

Add these two helper declarations immediately before the `return (` statement in the main component function (search for the line `return (` followed by `<Form`):

```tsx
const usTzs = TIMEZONES.filter((tz) => tz.group === "US");
const worldTzs = TIMEZONES.filter((tz) => tz.group === "World");

// Raycast requires unique values per item. We use "group:title" as the item value
// and resolve back to the IANA zone on selection.
function resolveTimezone(itemValue: string): string {
  const entry = TIMEZONES.find(
    (tz) => `${tz.group}:${tz.title}` === itemValue,
  );
  return entry?.value ?? itemValue;
}

// Map the stored IANA zone back to the composite item value for the controlled dropdown.
// If multiple cities share the zone, the first one in TIMEZONES is used.
const timezoneItemValue =
  TIMEZONES.find((tz) => tz.value === timezone) !== undefined
    ? `${TIMEZONES.find((tz) => tz.value === timezone)!.group}:${TIMEZONES.find((tz) => tz.value === timezone)!.title}`
    : timezone;
```

- [ ] **Step 3: Replace the timezone `Form.Dropdown` block**

Replace the entire `<Form.Dropdown id="timezone" ...>` block identified in Step 1 with:

```tsx
<Form.Dropdown
  id="timezone"
  title="Recipient's Timezone"
  value={timezoneItemValue}
  onChange={(val) => setTimezone(resolveTimezone(val))}
>
  <Form.Dropdown.Section title="United States">
    {usTzs.map((tz) => {
      let timeStr = "";
      try {
        timeStr = new Date().toLocaleTimeString("en-US", {
          timeZone: tz.value,
          hour: "numeric",
          minute: "2-digit",
        });
      } catch { /* skip */ }
      return (
        <Form.Dropdown.Item
          key={`${tz.group}-${tz.value}-${tz.title}`}
          value={`${tz.group}:${tz.title}`}
          title={`${tz.title}  ·  ${timeStr}`}
          keywords={[tz.title, tz.abbr, tz.badge, ...tz.keywords]}
        />
      );
    })}
  </Form.Dropdown.Section>
  <Form.Dropdown.Section title="World">
    {worldTzs.map((tz) => {
      let timeStr = "";
      try {
        timeStr = new Date().toLocaleTimeString("en-US", {
          timeZone: tz.value,
          hour: "numeric",
          minute: "2-digit",
        });
      } catch { /* skip */ }
      return (
        <Form.Dropdown.Item
          key={`${tz.group}-${tz.value}-${tz.title}`}
          value={`${tz.group}:${tz.title}`}
          title={`${tz.title}  ·  ${timeStr}`}
          keywords={[tz.title, tz.abbr, tz.badge, ...tz.keywords]}
        />
      );
    })}
  </Form.Dropdown.Section>
</Form.Dropdown>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
pnpm --filter @propose/raycast exec tsc --noEmit 2>/dev/null || npx tsc --noEmit -p packages/raycast/tsconfig.json
```

Expected: no errors.

- [ ] **Step 5: Manually test in Raycast**

Open the Raycast extension (development mode). Open the "Propose Times" command. In the timezone dropdown:
- Scroll — verify "United States" and "World" section headers appear
- Type "Philadelphia" — verify a direct Philadelphia row appears and is selectable
- Select "Philadelphia" — verify the form submits with `America/New_York` as the timezone (check any console output or the generated message timezone)
- Type "Serbia" — verify Belgrade appears under World
- Select a world city — verify the correct IANA zone is used

- [ ] **Step 6: Commit**

```bash
git add packages/raycast/src/propose-times.tsx
git commit -m "feat(raycast): grouped timezone sections with per-city rows and composite values"
```

---

### Task 7: Export `TimezoneEntry` type from web config (if needed)

**Files:**
- Possibly modify: `packages/web/lib/config.ts`

This task is conditional — only needed if Task 5 Step 2 showed `TimezoneEntry` wasn't exported.

- [ ] **Step 1: Check `packages/web/lib/config.ts`**

```bash
cat packages/web/lib/config.ts
```

- [ ] **Step 2: If `TimezoneEntry` is not exported, add the export**

Find the existing `@propose/core` import line in `packages/web/lib/config.ts` and add `TimezoneEntry`:

```typescript
// Before:
export { TIMEZONES, searchTimezones, getTimezoneAbbr } from "@propose/core";

// After:
export type { TimezoneEntry } from "@propose/core";
export { TIMEZONES, searchTimezones, getTimezoneAbbr } from "@propose/core";
```

- [ ] **Step 3: Re-run TypeScript check**

```bash
pnpm --filter @propose/web exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit if changed**

```bash
git add packages/web/lib/config.ts
git commit -m "chore(web): export TimezoneEntry type from config"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| `getTimeZones` (capital Z) | Task 3 Step 1 |
| Curated US cities (~65) | Task 2 |
| `badge` + `group` fields | Tasks 3, 4 |
| Badge in keywords for search | Task 3 (keywords array) |
| East-to-west sort by `rawOffsetInMinutes` | Task 3 |
| US section first, World second | Task 3 |
| Validation pass (fail-fast) | Task 3 |
| `tsx` as devDependency | Task 1 |
| `America/Detroit` for Detroit | Task 2 |
| Composite React keys | Tasks 5, 6 |
| `selectedKey` in web picker | Task 5 |
| Raycast composite value + resolver | Task 6 |
| Trigger button fix (no trailing ` · `) | Task 5 |
| `Form.Dropdown.Section` in Raycast | Task 6 |
| Tests: shape, search, sort, key uniqueness | Task 4 |
| Atomic update requirement | Tasks 4–6 (same PR) |

**Placeholder scan:** No TBDs found.

**Type consistency:** `TimezoneEntry` with `badge: string` and `group: "US" | "World"` is defined in Task 4 and used consistently in Tasks 5 and 6. The `resolveTimezone` function uses `TIMEZONES.find(tz => \`${tz.group}:${tz.title}\` === itemValue)` which matches the `value={\`${tz.group}:${tz.title}\`}` format used in the item — consistent.
