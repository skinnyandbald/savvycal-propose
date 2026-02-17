import timezoneData from "./timezones-data.json";

export interface TimezoneEntry {
  title: string;
  value: string;
  abbr: string;
  keywords: string[];
}

// Ordered east to west (UTC+12 → UTC-10). Edit timezones-data.json to add/remove timezones.
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
