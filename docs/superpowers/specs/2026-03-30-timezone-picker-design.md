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
  keywords: string[];  // ["NYC", "EST", "EDT", "NY"] | ["Serbia", "CEST"]
  group: "US" | "World";
}
```

**Badge format:**
- US entries: `"ET · Eastern"`, `"CT · Central"`, `"MT · Mountain"`, `"PT · Pacific"`, `"MST · Arizona"`, `"AKT · Alaska"`, `"HT · Hawaii"`
- World entries: `abbr + " · " + countryName` (e.g., `"CET · Serbia"`, `"JST · Japan"`)

**Ordering:** Descending UTC offset (east to west). US section first, then World. Within each section, entries sharing the same IANA zone are contiguous (all ET cities together, then all CT cities, etc.).

**React/Raycast keys:** `${group}-${title}` — necessary because multiple cities share the same IANA `value`.

**`searchTimezones()` is unchanged** — it already searches `title`, `abbr`, `value`, and `keywords`. The `badge` and `group` fields are not searched (abbr covers the abbreviation; city names are in `title` and `keywords`).

**`getTimezoneAbbr()` is unchanged** — still looks up by IANA `value`, returns `abbr`.

---

## Generation Script

The data is generated via a script in `packages/core`, committed to the repo. This is a dev-time script — the JSON is the source of truth at runtime.

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
  { city: "New York", ianaTimezone: "America/New_York", state: "New York", stateAbbr: "NY", extraKeywords: ["NYC"] },
  { city: "Boston", ianaTimezone: "America/New_York", state: "Massachusetts", stateAbbr: "MA" },
  { city: "Philadelphia", ianaTimezone: "America/New_York", state: "Pennsylvania", stateAbbr: "PA" },
  { city: "Washington DC", ianaTimezone: "America/New_York", state: "District of Columbia", stateAbbr: "DC" },
  { city: "Atlanta", ianaTimezone: "America/New_York", state: "Georgia", stateAbbr: "GA" },
  { city: "Miami", ianaTimezone: "America/New_York", state: "Florida", stateAbbr: "FL" },
  { city: "Orlando", ianaTimezone: "America/New_York", state: "Florida", stateAbbr: "FL" },
  { city: "Tampa", ianaTimezone: "America/New_York", state: "Florida", stateAbbr: "FL" },
  { city: "Charlotte", ianaTimezone: "America/New_York", state: "North Carolina", stateAbbr: "NC" },
  { city: "Raleigh", ianaTimezone: "America/New_York", state: "North Carolina", stateAbbr: "NC" },
  { city: "Pittsburgh", ianaTimezone: "America/New_York", state: "Pennsylvania", stateAbbr: "PA" },
  { city: "Baltimore", ianaTimezone: "America/New_York", state: "Maryland", stateAbbr: "MD" },
  { city: "Detroit", ianaTimezone: "America/New_York", state: "Michigan", stateAbbr: "MI" },
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
  { city: "Portland", ianaTimezone: "America/Los_Angeles", state: "Oregon", stateAbbr: "OR" },
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
  { city: "Maui", ianaTimezone: "Pacific/Honolulu", state: "Hawaii", stateAbbr: "HI" },
];
```

Each US city entry uses: `title = city`, `value = ianaTimezone`, `abbr` and `badge` from the US zone info table, `keywords = [state, stateAbbr, ...extraKeywords, ...zoneKeywords]`.

### `generate-timezones.ts`

1. Import all timezones from `@vvo/tzdb` via `getTimezones()` (returns all ~600 IANA timezone entries)
2. **US section:** For each city in `US_CITIES`, look up its IANA zone in tzdb to get `rawOffsetInMinutes`. Emit one `TimezoneEntry` per city with `group: "US"`. Sort by `rawOffsetInMinutes` descending (ET first, HT last). Within the same IANA zone, preserve the order from `us-cities.ts`.
3. **World section:** Filter `getTimezones()` results to entries where `countryCode !== "US"` and `mainCities.length > 0`. Skip synthetic zones (`Etc/GMT+X`, `UTC`, `Factory`) by checking that the IANA name does not start with `Etc/`. For each qualifying entry, emit one `TimezoneEntry` with `title = mainCities[0]`, `group: "World"`, `badge = abbr + " · " + countryName`. Sort by `rawOffsetInMinutes` descending.
4. Concatenate US entries + World entries → write to `src/timezones-data.json`.

**US zone info table** (used to resolve `abbr` and `badge` for US IANA timezones):
```typescript
const US_ZONE_INFO: Record<string, { abbr: string; badge: string }> = {
  "America/New_York": { abbr: "ET", badge: "ET · Eastern" },
  "America/Indiana/Indianapolis": { abbr: "ET", badge: "ET · Eastern" },
  "America/Kentucky/Louisville": { abbr: "ET", badge: "ET · Eastern" },
  "America/Chicago": { abbr: "CT", badge: "CT · Central" },
  "America/Denver": { abbr: "MT", badge: "MT · Mountain" },
  "America/Phoenix": { abbr: "MST", badge: "MST · Arizona" },
  "America/Los_Angeles": { abbr: "PT", badge: "PT · Pacific" },
  "America/Anchorage": { abbr: "AKT", badge: "AKT · Alaska" },
  "Pacific/Honolulu": { abbr: "HT", badge: "HT · Hawaii" },
};
```

**Keywords for US cities:**
`keywords = [state, stateAbbr, abbr, "EST"/"CST"/etc., ...extraKeywords]`
Each city includes DST-aware abbreviation variants as keywords (e.g., ET entries include both "EST" and "EDT").

**World keywords:** `keywords = [countryName, countryCode, abbreviation, ...mainCities.slice(1)]`

### Running the script

```bash
pnpm --filter @propose/core generate-timezones
```

The output `timezones-data.json` is committed. Re-run to update if new cities are needed.

---

## `packages/core` Changes

**`timezones.ts`** — update interface only:
```typescript
export interface TimezoneEntry {
  title: string;
  value: string;
  abbr: string;
  badge: string;       // new
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

Shows abbreviation + current time (no city name — avoids ambiguity when multiple cities share an IANA zone):
```tsx
{selected ? `${selected.abbr} · ${mounted ? formatTimeInZone(selected.value) : ""}` : "Select timezone"}
```

### Group headers

When the dropdown is open, entries are split into US and World sections:
```tsx
const usFiltered = filtered.filter(tz => tz.group === "US");
const worldFiltered = filtered.filter(tz => tz.group === "World");
```

Section headers (`<li>`) are shown only when entries exist in that group. This works correctly during search — if the query matches only US cities, only the US header + entries render.

### React key

`key={`${tz.group}-${tz.title}`}` — unique because `title` is unique within a group.

### Highlight

`tz.value === value` still correctly identifies the selected IANA zone. Multiple city entries sharing the same IANA zone will all highlight — this is desirable (shows the user which cities are in their selected timezone).

---

## Raycast (`propose-times.tsx`)

Replace the flat `TIMEZONES.map(...)` with two `Form.Dropdown.Section` blocks:

```tsx
const usTzs = TIMEZONES.filter(tz => tz.group === "US");
const worldTzs = TIMEZONES.filter(tz => tz.group === "World");

<Form.Dropdown.Section title="United States">
  {usTzs.map(tz => (
    <Form.Dropdown.Item
      key={`${tz.group}-${tz.title}`}
      value={tz.value}
      title={`${tz.title}  ·  ${getTimeStr(tz.value)}`}
      keywords={[tz.title, tz.abbr, tz.badge, ...tz.keywords]}
    />
  ))}
</Form.Dropdown.Section>
<Form.Dropdown.Section title="World">
  {worldTzs.map(tz => (
    <Form.Dropdown.Item
      key={`${tz.group}-${tz.title}`}
      value={tz.value}
      title={`${tz.title}  ·  ${getTimeStr(tz.value)}`}
      keywords={[tz.title, tz.abbr, tz.badge, ...tz.keywords]}
    />
  ))}
</Form.Dropdown.Section>
```

`tz.badge` is added to `keywords` so Raycast's native search matches "ET · Eastern" and "Serbia" etc.

The `getTimeStr` helper (inline in the map, same pattern as current code) formats the current time in `tz.value`.

---

## What Does Not Change

- `getTimezoneAbbr(timezone)` — still looks up by IANA `value`
- `searchTimezones(query)` — unchanged, still searches title/abbr/value/keywords
- `TIMEZONES` export — still the full ordered array
- API route (`/api/slots`) — uses `timezone` as IANA value, unaffected
- `filterSlotsByTime()` — uses IANA value directly, unaffected

---

## File Change Summary

| File | Change |
|------|--------|
| `packages/core/package.json` | Add `@vvo/tzdb` devDep, add `generate-timezones` script |
| `packages/core/scripts/us-cities.ts` | New — curated US city list |
| `packages/core/scripts/generate-timezones.ts` | New — generation script |
| `packages/core/src/timezones.ts` | Add `badge` and `group` to `TimezoneEntry` interface |
| `packages/core/src/timezones-data.json` | Regenerated — ~120+ entries |
| `packages/web/components/TimezonePicker.tsx` | Group headers, badge pill, trigger label update, key fix |
| `packages/raycast/src/propose-times.tsx` | Add `Form.Dropdown.Section` wrappers, key fix, badge in keywords |
