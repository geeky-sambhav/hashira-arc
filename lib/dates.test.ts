import { describe, expect, test } from "bun:test";
import { addDays, diffDays, formatDay, isValidDate, isValidTimeZone, localDate, startOfWeek } from "./dates";

describe("dates", () => {
  test("validates calendar days", () => {
    expect(isValidDate("2026-11-13")).toBe(true);
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("2026-2-3")).toBe(false);
    expect(isValidDate("")).toBe(false);
  });

  test("adds and subtracts days across month, year and leap boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(diffDays("2026-11-13", "2026-11-20")).toBe(7);
    expect(diffDays("2026-11-20", "2026-11-13")).toBe(-7);
  });

  test("finds the Monday of a week", () => {
    expect(startOfWeek("2026-11-13")).toBe("2026-11-09"); // a Friday
    expect(startOfWeek("2026-11-09")).toBe("2026-11-09"); // a Monday
    expect(startOfWeek("2026-11-15")).toBe("2026-11-09"); // a Sunday
  });

  test("resolves the local day in a time zone", () => {
    const instant = new Date("2026-11-13T20:00:00Z");
    expect(localDate(instant, "UTC")).toBe("2026-11-13");
    expect(localDate(instant, "Asia/Kolkata")).toBe("2026-11-14");
    expect(localDate(instant, "America/Los_Angeles")).toBe("2026-11-13");
  });

  test("checks time zone names", () => {
    expect(isValidTimeZone("Asia/Kolkata")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
  });

  test("formats a day", () => {
    expect(formatDay("2026-11-03")).toBe("3 Nov");
  });
});
