import type { TimeSlot } from "./types";

export function minutesToMs(minutes: number): number {
  return minutes * 60 * 1000;
}

/**
 * Keep only slots whose span (end_at - start_at) is at least `durationMinutes`.
 */
export function filterSlotsByDuration(
  slots: TimeSlot[],
  durationMinutes: number,
): TimeSlot[] {
  if (!durationMinutes || durationMinutes <= 0) {
    return slots;
  }

  const minMs = minutesToMs(durationMinutes);
  return slots.filter((s) => {
    const span = new Date(s.end_at).getTime() - new Date(s.start_at).getTime();
    return span >= minMs;
  });
}

/**
 * Encodes alternative time slots as unix timestamps in URL params.
 * Used by booking URLs to populate the time selection dropdown.
 */
export function encodeAlternativeSlots(
  params: URLSearchParams,
  alternativeSlots?: TimeSlot[],
): void {
  if (alternativeSlots && alternativeSlots.length > 0) {
    const altTimestamps = alternativeSlots
      .map((s) => Math.floor(new Date(s.start_at).getTime() / 1000))
      .join(",");
    params.set("alt_slots", altTimestamps);
  }
}
