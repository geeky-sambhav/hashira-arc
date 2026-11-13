import { describe, expect, test } from "bun:test";
import { INITIAL_EASE, MAX_INTERVAL_DAYS, MIN_EASE, schedule, type CardSchedule } from "./srs";

const TODAY = "2026-11-13";

describe("schedule", () => {
  test("a new card graded good comes back tomorrow, then in three days", () => {
    const first = schedule(null, 3, TODAY);
    expect(first).toEqual({ dueOn: "2026-11-14", intervalDays: 1, ease: INITIAL_EASE, reps: 1, lapses: 0 });
    const second = schedule(first, 3, first.dueOn);
    expect(second.intervalDays).toBe(3);
    expect(second.dueOn).toBe("2026-11-17");
    const third = schedule(second, 3, second.dueOn);
    expect(third.intervalDays).toBe(8); // round(3 * 2.5)
  });

  test("easy starts further out and raises ease", () => {
    const s = schedule(null, 4, TODAY);
    expect(s.intervalDays).toBe(4);
    expect(s.ease).toBe(2.65);
  });

  test("hard lowers ease and still moves forward", () => {
    const prev: CardSchedule = { dueOn: TODAY, intervalDays: 10, ease: 2.5, reps: 3, lapses: 0 };
    const s = schedule(prev, 2, TODAY);
    expect(s.intervalDays).toBe(12);
    expect(s.ease).toBe(2.35);
    expect(s.reps).toBe(4);
  });

  test("again keeps the card due today and counts a lapse only for learned cards", () => {
    const learned: CardSchedule = { dueOn: TODAY, intervalDays: 10, ease: 2.5, reps: 3, lapses: 0 };
    const lapsed = schedule(learned, 1, TODAY);
    expect(lapsed).toEqual({ dueOn: TODAY, intervalDays: 0, ease: 2.3, reps: 0, lapses: 1 });
    expect(schedule(null, 1, TODAY).lapses).toBe(0);
    expect(schedule(lapsed, 1, TODAY).lapses).toBe(1);
  });

  test("ease never drops below the floor", () => {
    let s: CardSchedule | null = null;
    for (let i = 0; i < 20; i++) s = schedule(s, 1, TODAY);
    expect(s?.ease).toBe(MIN_EASE);
  });

  test("interval is capped", () => {
    const prev: CardSchedule = { dueOn: TODAY, intervalDays: 3000, ease: 3, reps: 12, lapses: 0 };
    expect(schedule(prev, 4, TODAY).intervalDays).toBe(MAX_INTERVAL_DAYS);
  });

  test("intervals never shrink on a passing grade", () => {
    const prev: CardSchedule = { dueOn: TODAY, intervalDays: 2, ease: MIN_EASE, reps: 2, lapses: 4 };
    for (const grade of [2, 3, 4] as const) {
      expect(schedule(prev, grade, TODAY).intervalDays).toBeGreaterThan(prev.intervalDays);
    }
  });
});
