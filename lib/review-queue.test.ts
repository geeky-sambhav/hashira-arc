import { describe, expect, test } from "bun:test";
import { buildQueue } from "./review-queue";

const cards = [
  { id: "a-q1", moduleId: "a" },
  { id: "a-q2", moduleId: "a" },
  { id: "a-q3", moduleId: "a" },
  { id: "b-q1", moduleId: "b" },
];
const TODAY = "2026-11-13";

describe("buildQueue", () => {
  test("nothing is offered before any module is started", () => {
    const q = buildQueue({
      cards,
      dueOnByCard: new Map(),
      startedModuleIds: new Set(),
      today: TODAY,
      newCardsPerDay: 10,
      introducedToday: 0,
    });
    expect(q).toEqual({ due: [], fresh: [], waiting: 0 });
  });

  test("new cards come only from started modules, capped per day", () => {
    const q = buildQueue({
      cards,
      dueOnByCard: new Map(),
      startedModuleIds: new Set(["a"]),
      today: TODAY,
      newCardsPerDay: 2,
      introducedToday: 0,
    });
    expect(q.fresh.map((c) => c.id)).toEqual(["a-q1", "a-q2"]);
    expect(q.waiting).toBe(1);
  });

  test("cards introduced earlier today use up the allowance", () => {
    const q = buildQueue({
      cards,
      dueOnByCard: new Map([["a-q1", "2026-11-14"]]),
      startedModuleIds: new Set(["a"]),
      today: TODAY,
      newCardsPerDay: 2,
      introducedToday: 2,
    });
    expect(q.fresh).toEqual([]);
    expect(q.waiting).toBe(2);
  });

  test("due cards are oldest first and exclude future cards", () => {
    const q = buildQueue({
      cards,
      dueOnByCard: new Map([
        ["a-q1", "2026-11-13"],
        ["a-q2", "2026-11-01"],
        ["a-q3", "2026-11-20"],
      ]),
      startedModuleIds: new Set(["a", "b"]),
      today: TODAY,
      newCardsPerDay: 5,
      introducedToday: 0,
    });
    expect(q.due.map((c) => c.id)).toEqual(["a-q2", "a-q1"]);
    expect(q.fresh.map((c) => c.id)).toEqual(["b-q1"]);
  });
});
