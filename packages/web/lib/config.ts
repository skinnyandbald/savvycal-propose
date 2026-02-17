export { TIMEZONES, searchTimezones } from "@propose/core";

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
