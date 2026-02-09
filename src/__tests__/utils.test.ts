import { describe, it, expect } from "vitest";
import { filterSlotsByTime } from "../utils";
import type { TimeSlot } from "../types";

function makeSlot(utcTime: string, date: string = "2026-02-09"): TimeSlot {
  return {
    start_at: `${date}T${utcTime}:00Z`,
    end_at: `${date}T${utcTime.replace(/(\d+):/, (_, h) => `${parseInt(h) + 1}:`)}:00Z`,
  };
}

describe("filterSlotsByTime", () => {
  it("removes slots at or after 7pm in recipient timezone", () => {
    // In ET (UTC-5): 22:00 UTC = 5pm, 00:00+1 UTC = 7pm, 02:00+1 UTC = 9pm
    const slots = [
      makeSlot("22:00"),          // 5pm ET - keep
      makeSlot("23:00"),          // 6pm ET - keep
      makeSlot("00:00", "2026-02-10"), // 7pm ET - drop
      makeSlot("02:00", "2026-02-10"), // 9pm ET - drop
    ];

    const result = filterSlotsByTime(slots, "America/New_York");

    expect(result).toHaveLength(2);
    expect(result[0].start_at).toContain("22:00");
    expect(result[1].start_at).toContain("23:00");
  });

  it("keeps all slots when all are before cutoff", () => {
    const slots = [
      makeSlot("14:00"), // 9am ET
      makeSlot("17:00"), // 12pm ET
      makeSlot("20:00"), // 3pm ET
    ];

    const result = filterSlotsByTime(slots, "America/New_York");

    expect(result).toHaveLength(3);
  });

  it("removes all slots when all are after cutoff", () => {
    const slots = [
      makeSlot("00:00", "2026-02-10"), // 7pm ET
      makeSlot("02:00", "2026-02-10"), // 9pm ET
      makeSlot("03:00", "2026-02-10"), // 10pm ET
    ];

    const result = filterSlotsByTime(slots, "America/New_York");

    expect(result).toHaveLength(0);
  });

  it("respects different timezones", () => {
    // 18:00 UTC = 7pm CET (drop) but 1pm ET (keep)
    const slots = [makeSlot("18:00")];

    const cetResult = filterSlotsByTime(slots, "Europe/Paris");
    expect(cetResult).toHaveLength(0);

    const etResult = filterSlotsByTime(slots, "America/New_York");
    expect(etResult).toHaveLength(1);
  });

  it("accepts custom latestHour", () => {
    // 20:00 UTC = 3pm ET
    const slots = [makeSlot("20:00")];

    const result = filterSlotsByTime(slots, "America/New_York", 15);

    expect(result).toHaveLength(0);
  });

  it("returns empty array for empty input", () => {
    const result = filterSlotsByTime([], "UTC");
    expect(result).toHaveLength(0);
  });
});
