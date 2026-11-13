import { describe, expect, test } from "bun:test";
import { formatHours, pace, planPosition, streak, weekDays } from "./schedule";

describe("planPosition", () => {
  test("handles unset, future, active and finished plans", () => {
    expect(planPosition(null, "2026-11-13", 52)).toEqual({ state: "unset" });
    expect(planPosition("2026-11-16", "2026-11-13", 52)).toEqual({ state: "before", daysUntilStart: 3 });
    expect(planPosition("2026-11-13", "2026-11-13", 52)).toEqual({ state: "active", week: 1, dayOfWeek: 1 });
    expect(planPosition("2026-11-13", "2026-11-19", 52)).toEqual({ state: "active", week: 1, dayOfWeek: 7 });
    expect(planPosition("2026-11-13", "2026-11-20", 52)).toEqual({ state: "active", week: 2, dayOfWeek: 1 });
    expect(planPosition("2026-11-13", "2027-11-12", 52)).toEqual({ state: "finished" });
  });
});

describe("pace", () => {
  const items = [
    { id: "a", week: 1, estHours: 10 },
    { id: "b", week: 1, estHours: 5 },
    { id: "c", week: 2, estHours: 8 },
    { id: "d", week: 2, estHours: 4, optional: true },
    { id: "e", week: 3, estHours: 6 },
  ];

  test("expects only fully elapsed weeks", () => {
    expect(pace(items, {}, 1)).toEqual({ expectedHours: 0, doneHours: 0, deltaHours: 0, totalHours: 29 });
    expect(pace(items, {}, 3).expectedHours).toBe(23);
  });

  test("done work from any week counts, optional work never does", () => {
    const p = pace(items, { a: "done", e: "done", d: "done" }, 2);
    expect(p.doneHours).toBe(16);
    expect(p.expectedHours).toBe(15);
    expect(p.deltaHours).toBe(1);
  });

  test("skipped items leave the plan", () => {
    const p = pace(items, { a: "skipped" }, 2);
    expect(p.expectedHours).toBe(5);
    expect(p.totalHours).toBe(19);
  });
});

describe("streak", () => {
  test("counts back from today, or from yesterday when today is empty", () => {
    expect(streak(["2026-11-13", "2026-11-12", "2026-11-11"], "2026-11-13")).toBe(3);
    expect(streak(["2026-11-12", "2026-11-11"], "2026-11-13")).toBe(2);
    expect(streak(["2026-11-11"], "2026-11-13")).toBe(0);
    expect(streak([], "2026-11-13")).toBe(0);
  });
});

describe("weekDays", () => {
  test("returns Monday to Sunday with zero for empty days", () => {
    const days = weekDays({ "2026-11-09": 60, "2026-11-13": 90 }, "2026-11-13");
    expect(days.map((d) => d.day)).toEqual([
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
      "2026-11-14",
      "2026-11-15",
    ]);
    expect(days.map((d) => d.minutes)).toEqual([60, 0, 0, 0, 90, 0, 0]);
  });
});

test("formatHours", () => {
  expect(formatHours(120)).toBe("2");
  expect(formatHours(90)).toBe("1.5");
});
