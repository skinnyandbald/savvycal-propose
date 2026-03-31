# Timezone Picker Redesign — Design Spec

## Goal

Expand the timezone picker (used in both the web app and Raycast extension) to include every major US city as its own searchable row, and every major world city/country. Entries are grouped US-first then World, ordered east to west within each group. The UI uses Option C: city name as the row title with a badge pill showing the abbreviation and zone/country name.

## Background

The current `timezones-data.json` has ~30 entries. US zones are represented as single entries (e.g., "New York" with Boston/Philadelphia/Miami as keywords). Users searching for "Philadelphia" or "Serbia" get no direct hit. The picker needs to surface every major city as its own first-class entry.

This change applies to both:
- `packages/web` — custom `TimezonePicker.tsx` dropdown
- `packages/raycast` — `Form.Dropdown` in `propose-times.tsx`

Both consume from `packages/core/src/timezones-data.json` via `packages/core/src/timezones.ts`.

---

## Data Shape

`TimezoneEntry` in `packages/core/src/timezones.ts` gains two fields:

```typescript
export interface TimezoneEntry {
  title: string;       // "New York" | "Belgrade"
  value: string;       // IANA timezone: "America/New_York" | "Europe/Belgrade"
  abbr: string;        // "ET" | "CET"
  badge: string;       // "ET · Eastern" | "CET · Serbia"
  keywords: string[];  // ["New York", "NY", "EST", "EDT", "ET · Eastern"] | ["Serbia", "RS", "CEST"]
  group: "US" | "World";
}
```

**Badge format:**
- US entries: `"ET · Eastern"`, `"CT · Central"`, `"MT · Mountain"`, `"PT · Pacific"`, `"MST · Arizona"`, `"AKT · Alaska"`, `"HT · Hawaii"`
- World entries: `abbr + " · " + countryName` (e.g., `"CET · Serbia"`, `"JST · Japan"`)

**Ordering:** Sort by `rawOffsetInMinutes` descending (east to west, stable year-round regardless of DST). US section first, then World. Within the US section, entries sharing the same IANA zone are contiguous (all ET cities together, then all CT, etc.).

**React keys:** `${group}-${value}-${title}` — composite key guarantees uniqueness even if two world timezones share the same `mainCities[0]`.

**Badge in keywords:** The badge string (e.g., `"ET · Eastern"`, `"CET · Serbia"`) is included in `keywords` so both web `searchTimezones()` and Raycast native search match it. Searching "Eastern" or "Serbia" returns results on both platforms.

**`searchTimezones()` is unchanged** — it searches `title`, `abbr`, `value`, and `keywords`. Badge search works because the badge text is already in `keywords`.

**`getTimezoneAbbr()` is unchanged** — still looks up by IANA `value`, returns `abbr`.

**Atomic update requirement:** `badge` and `group` are new required fields on a shared interface. `packages/web` and `packages/raycast` must be updated in the same PR. Before implementation, grep for any code that manually constructs `TimezoneEntry` objects (outside the JSON import) — there are currently none, but confirm this.

---

## Generation Script

The data is generated via a script in `packages/core`, committed to the repo. This is a dev-time script — `@vvo/tzdb` is a devDependency only and must never be imported from `src/` files.

### File Structure

```
packages/core/
  scripts/
    generate-timezones.ts    ← main generation script
    us-cities.ts             ← curated US city list
  src/
    timezones-data.json      ← generated output (committed)
    timezones.ts             ← interface + search (updated)
```

### `us-cities.ts`

A curated list of ~65 major US cities, each mapped to its IANA timezone and state:

```typescript
export interface USCity {
  city: string;
  ianaTimezone: string;
  state: string;
  stateAbbr: string;
  extraKeywords?: string[];
}

export const US_CITIES: USCity[] = [
  // Eastern Time
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
  { city: "Detroit", ianaTimezone: "America/Detroit", state: "Michigan", stateAbbr: "MI" },
  { city: "Cleveland", ianaTimezone: "America/New_York", state: "Ohio", stateAbbr: "OH" },
  { city: "Columbus", ianaTimezone: "America/New_York", state: "Ohio", stateAbbr: "OH" },
  { city: "Cincinnati", ianaTimezone: "America/New_York", state: "Ohio", stateAbbr: "OH" },
  { city: "Indianapolis", ianaTimezone: "America/Indiana/Indianapolis", state: "Indiana", stateAbbr: "IN" },
  { city: "Louisville", ianaTimezone: "America/Kentucky/Louisville", state: "Kentucky", stateAbbr: "KY" },
  { city: "Richmond", ianaTimezone: "America/New_York", state: "Virginia", stateAbbr: "VA" },
  { city: "Buffalo", ianaTimezone: "America/New_York", state: "New York", stateAbbr: "NY" },
  { city: "Jacksonville", ianaTimezone: "America/New_York", state: "Florida", stateAbbr: "FL" },
  // Central Time
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
  // Mountain Time
  { city: "Denver", ianaTimezone: "America/Denver", state: "Colorado", stateAbbr: "CO" },
  { city: "Salt Lake City", ianaTimezone: "America/Denver", state: "Utah", stateAbbr: "UT" },
  { city: "Albuquerque", ianaTimezone: "America/Denver", state: "New Mexico", stateAbbr: "NM" },
  { city: "Boise", ianaTimezone: "America/Denver", state: "Idaho", stateAbbr: "ID" },
  { city: "Colorado Springs", ianaTimezone: "America/Denver", state: "Colorado", stateAbbr: "CO" },
  { city: "Billings", ianaTimezone: "America/Denver", state: "Montana", stateAbbr: "MT" },
  // Arizona (no DST)
  { city: "Phoenix", ianaTimezone: "America/Phoenix", state: "Arizona", stateAbbr: "AZ" },
  { city: "Tucson", ianaTimezone: "America/Phoenix", state: "Arizona", stateAbbr: "AZ" },
  { city: "Scottsdale", ianaTimezone: "America/Phoenix", state: "Arizona", stateAbbr: "AZ" },
  // Pacific Time
  { city: "Los Angeles", ianaTimezone: "America/Los_Angeles", state: "California", stateAbbr: "CA", extraKeywords: ["LA", "Hollywood"] },
  { city: "San Francisco", ianaTimezone: "America/Los_Angeles", state: "California", stateAbbr: "CA", extraKeywords: ["SF", "Silicon Valley"] },
  { city: "Seattle", ianaTimezone: "America/Los_Angeles", state: "Washington", stateAbbr: "WA" },
  { city: "Portland", ianaTimezone: "America/Los_Angeles", state: "Oregon", stateAbbr: "OR", extraKeywords: ["Portland OR", "Portland Oregon"] },
  { city: "San Diego", ianaTimezone: "America/Los_Angeles", state: "California", stateAbbr: "CA" },
  { city: "San Jose", ianaTimezone: "America/Los_Angeles", state: "California", stateAbbr: "CA" },
  { city: "Sacramento", ianaTimezone: "America/Los_Angeles", state: "California", stateAbbr: "CA" },
  { city: "Las Vegas", ianaTimezone: "America/Los_Angeles", state: "Nevada", stateAbbr: "NV" },
  // Alaska
  { city: "Anchorage", ianaTimezone: "America/Anchorage", state: "Alaska", stateAbbr: "AK" },
  { city: "Fairbanks", ianaTimezone: "America/Anchorage", state: "Alaska", stateAbbr: "AK" },
  { city: "Juneau", ianaTimezone: "America/Anchorage", state: "Alaska", stateAbbr: "AK" },
  // Hawaii
  { city: "Honolulu", ianaTimezone: "Pacific/Honolulu", state: "Hawaii", stateAbbr: "HI" },
  { city: "Kahului", ianaTimezone: "Pacific/Honolulu", state: "Hawaii", stateAbbr: "HI", extraKeywords: ["Maui"] },
];
```

Each US city entry uses: `title = city`, `value = ianaTimezone`, `abbr` and `badge` from the US zone info table, `keywords = [state, stateAbbr, badge, ...dstKeywords, ...extraKeywords]`.

### `generate-timezones.ts`

1. `import { getTimeZones } from "@vvo/tzdb"` — note capital Z. Returns ~400 IANA timezone entries with `mainCities` populated.
2. **US section:** For each city in `US_CITIES`, look up its IANA zone in the tzdb map by `name`. Emit one `TimezoneEntry` per city with `group: "US"`. Sort by `rawOffsetInMinutes` descending (`b.raw - a.raw`); within the same IANA zone preserve `us-cities.ts` order.
3. **World section:** Filter `getTimeZones()` to `countryCode !== "US"` and `mainCities.length > 0`. The IANA name check `!name.startsWith("Etc/")` is redundant but kept as a safety guard. Emit one `TimezoneEntry` per qualifying zone: `title = mainCities[0]`, `group: "World"`, `badge = abbr + " · " + countryName`, `keywords = [countryName, countryCode, badge, ...mainCities.slice(1)]`. Sort by `rawOffsetInMinutes` descending. This produces one row per IANA zone (not one per country) — multiple European countries with separate IANA zones each get their own entry. Expected total: ~65 US + ~200–250 World rows.
4. **Validation pass** (fail-fast before writing): assert no duplicate `title+group` combos, every `US_CITIES[i].ianaTimezone` exists in `US_ZONE_INFO`, no entry has empty `title`/`abbr`/`badge`.
5. Concatenate US + World → write to `src/timezones-data.json`.

**US zone info table:**
```typescript
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
```

### Running the script

```bash
pnpm --filter @propose/core generate-timezones
```

Package.json script definition: `"generate-timezones": "tsx scripts/generate-timezones.ts"`. Requires `tsx` as a devDependency in `packages/core`.

The output `timezones-data.json` is committed. Re-run to update if new cities are needed.

---

## `packages/core` Changes

**`timezones.ts`** — update interface only:
```typescript
export interface TimezoneEntry {
  title: string;
  value: string;
  abbr: string;
  badge: string;       // new — display pill text, also included in keywords for search
  keywords: string[];
  group: "US" | "World"; // new
}
```

`TIMEZONES`, `getTimezoneAbbr()`, and `searchTimezones()` are unchanged.

---

## Web Picker (`TimezonePicker.tsx`)

### Entry display (Option C)

Each row: city title + badge pill on the left, current time on the right:
```tsx
<button ...>
  <span className="flex items-center gap-2">
    <span>{tz.title}</span>
    <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">{tz.badge}</span>
  </span>
  {mounted && <span className="text-zinc-500 text-xs">{formatTimeInZone(tz.value)}</span>}
</button>
```

### Trigger button display

Shows abbreviation + current time. When not yet mounted (SSR/hydration), shows abbreviation only — no trailing separator:
```tsx
{selected
  ? mounted
    ? `${selected.abbr} · ${formatTimeInZone(selected.value)}`
    : selected.abbr
  : "Select timezone"}
```

### Group headers

Entries are split into US and World sections. Section headers render only when that group has results (works correctly during search):
```tsx
const usFiltered = filtered.filter(tz => tz.group === "US");
const worldFiltered = filtered.filter(tz => tz.group === "World");
```

### React key

`key={`${tz.group}-${tz.value}-${tz.title}`}` — composite key prevents collisions even if two world timezones share the same `mainCities[0]`.

### Selection tracking

The web picker tracks selection by the exact item clicked, not by IANA zone, to avoid multi-highlight confusion:
```tsx
const [selectedKey, setSelectedKey] = useState<string | null>(null);

// On click:
setSelectedKey(`${tz.group}-${tz.value}-${tz.title}`);
onChange(tz.value); // still passes IANA zone to the parent

// Highlight condition:
const isSelected = selectedKey
  ? selectedKey === `${tz.group}-${tz.value}-${tz.title}`
  : tz.value === value; // fallback for externally-set value (e.g. default preference)
```

The fallback `tz.value === value` handles the case where the user's stored preference is an IANA zone with no selectedKey yet (e.g., first load). In that case the first matching entry in the list highlights, which is the correct zone representative.

---

## Raycast (`propose-times.tsx`)

Raycast `Form.Dropdown.Item` requires each item to have a **unique `value`**. Since multiple cities share the same IANA zone, use a composite value and resolve it back to IANA in `onChange`:

```tsx
const usTzs = TIMEZONES.filter(tz => tz.group === "US");
const worldTzs = TIMEZONES.filter(tz => tz.group === "World");

// Resolver: composite value → IANA zone
function resolveTimezone(itemValue: string): string {
  // Format: "group:title" → look up in TIMEZONES
  const entry = TIMEZONES.find(tz => `${tz.group}:${tz.title}` === itemValue);
  return entry?.value ?? itemValue; // fallback: treat as IANA zone (for stored preferences)
}

// In the dropdown onChange:
onChange={val => setTimezone(resolveTimezone(val))}

// Default value mapping (stored preference is an IANA zone → find representative item):
const defaultItemValue = TIMEZONES.find(tz => tz.value === timezone)
  ? `${TIMEZONES.find(tz => tz.value === timezone)!.group}:${TIMEZONES.find(tz => tz.value === timezone)!.title}`
  : timezone;

<Form.Dropdown
  id="timezone"
  title="Recipient's Timezone"
  value={defaultItemValue}
  onChange={val => setTimezone(resolveTimezone(val))}
>
  <Form.Dropdown.Section title="United States">
    {usTzs.map(tz => {
      const timeStr = getTimeStr(tz.value);
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
    {worldTzs.map(tz => {
      const timeStr = getTimeStr(tz.value);
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

---

## What Does Not Change

- `getTimezoneAbbr(timezone)` — still looks up by IANA `value`
- `searchTimezones(query)` — unchanged; badge search works via `keywords`
- `TIMEZONES` export — still the full ordered array
- API route (`/api/slots`) — uses `timezone` as IANA value, unaffected
- `filterSlotsByTime()` — uses IANA value directly, unaffected

---

## File Change Summary

| File | Change |
|------|--------|
| `packages/core/package.json` | Add `@vvo/tzdb` devDep, add `tsx` devDep, add `generate-timezones` script |
| `packages/core/scripts/us-cities.ts` | New — curated US city list (~65 entries) |
| `packages/core/scripts/generate-timezones.ts` | New — generation script with validation pass |
| `packages/core/src/timezones.ts` | Add `badge` and `group` to `TimezoneEntry` interface |
| `packages/core/src/timezones-data.json` | Regenerated — ~270–320 entries (65 US + ~200–250 World) |
| `packages/web/components/TimezonePicker.tsx` | Group headers, badge pill, trigger label fix, composite key, `selectedKey` state |
| `packages/raycast/src/propose-times.tsx` | `Form.Dropdown.Section` wrappers, composite item values, `resolveTimezone()`, badge in keywords |
