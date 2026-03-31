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
