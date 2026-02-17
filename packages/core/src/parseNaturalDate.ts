import { addDays } from "date-fns";

const DAY_NAMES = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
];

const DAY_ALIASES: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, tues: 2, wed: 3,
  thu: 4, thur: 4, thurs: 4, fri: 5, sat: 6,
};

function getDayIndex(name: string): number | null {
  const full = DAY_NAMES.indexOf(name);
  if (full !== -1) return full;
  return DAY_ALIASES[name] ?? null;
}

/**
 * Parses natural language date expressions into a Date.
 *
 * Semantics:
 *   "thursday" / "this thursday" → closest upcoming Thursday (today counts)
 *   "next thursday"              → the Thursday AFTER the upcoming one
 *   "today" / "tomorrow"        → literal
 *   "in N days" / "in N weeks"  → relative
 */
export function parseNaturalDate(input: string, today: Date = new Date()): Date | null {
  // Strip time component so today is always midnight local
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const s = input.trim().toLowerCase();

  if (s === "today") return base;
  if (s === "tomorrow") return addDays(base, 1);

  const inMatch = s.match(/^in\s+(\d+)\s+(days?|weeks?)$/);
  if (inMatch) {
    const n = parseInt(inMatch[1]);
    return addDays(base, inMatch[2].startsWith("week") ? n * 7 : n);
  }

  const nextMatch = s.match(/^next\s+(\w+)$/);
  const thisMatch = s.match(/^(?:this\s+)?(\w+)$/);
  const match = nextMatch ?? thisMatch;
  if (!match) return null;

  const isNext = !!nextMatch;
  const dayIndex = getDayIndex(match[1]);
  if (dayIndex === null) return null;

  const todayIndex = base.getDay();
  let daysUntil = dayIndex - todayIndex;

  // "this thursday": if that day is today (0) keep it; if passed (<0) wrap to next week
  if (daysUntil < 0) daysUntil += 7;

  // "next thursday": skip the upcoming occurrence entirely
  if (isNext) daysUntil = daysUntil === 0 ? 7 : daysUntil + 7;

  return addDays(base, daysUntil);
}
