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
  "America/Chicago": { abbr: "CT", badge: "CT · Central" },
  "America/Denver": { abbr: "MT", badge: "MT · Mountain" },
  "America/Phoenix": { abbr: "MST", badge: "MST · Arizona" },
  "America/Los_Angeles": { abbr: "PT", badge: "PT · Pacific" },
  "America/Anchorage": { abbr: "AKT", badge: "AKT · Alaska" },
  "Pacific/Honolulu": { abbr: "HT", badge: "HT · Hawaii" },
};

const DST_KEYWORDS: Record<string, string[]> = {
  "America/New_York": ["EST", "EDT"],
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

// Dedup world entries: if two entries share the same title, append country name
const worldTitleCount = new Map<string, number>();
for (const e of worldEntries) {
  worldTitleCount.set(e.title, (worldTitleCount.get(e.title) ?? 0) + 1);
}
for (const e of worldEntries) {
  if (worldTitleCount.get(e.title)! > 1) {
    e.title = `${e.title}, ${e.keywords[0]}`; // keywords[0] is countryName
  }
}

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
