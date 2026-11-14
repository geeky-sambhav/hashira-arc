import { expect, test } from "bun:test";
import { concept, section, topic } from "@/content/dsl";
import { formLabel, HASHIRA, rankFor, RANKS } from "./rank";
import { applyPatch, groupToggle, type SheetState } from "./state";
import { defaultOpen, doneCounts, groupIds, leafIdsUnder, sectionDone, someLeaf } from "./tree";
import { createCheckQueue, type CheckResult } from "./write-queue";

const demo = section("demo", { title: "Demo", summary: "A demo." }, [
  topic("a", "A", [
    topic("a1", "A1", [concept("x", "X", "d"), concept("y", "Y", "d")]),
    concept("z", "Z", undefined, { parts: [concept("p", "P", "d"), concept("q", "Q", "d")] }),
  ]),
  topic("b", "B", [concept("w", "W", "d")]),
]);
const [a, b] = demo.children;

test("leafIdsUnder and groupIds walk the tree in order", () => {
  expect(leafIdsUnder(a)).toEqual(["demo.a.a1.x", "demo.a.a1.y", "demo.a.z.p", "demo.a.z.q"]);
  expect(groupIds(demo)).toEqual(["demo.a", "demo.a.a1", "demo.a.z", "demo.b"]);
});

test("doneCounts rolls ticks up to every group and the section", () => {
  const done = new Set(["demo.a.a1.x", "demo.a.z.p", "demo.a.z.q"]);
  const counts = doneCounts(demo, done);
  expect(counts.get("demo.a.a1")).toBe(1);
  expect(counts.get("demo.a.z")).toBe(2);
  expect(counts.get("demo.a")).toBe(3);
  expect(counts.get("demo.b")).toBe(0);
  expect(counts.get("demo")).toBe(3);
  expect(sectionDone(demo, done)).toBe(3);
  expect(sectionDone(demo, new Set(["not.in.the.sheet"]))).toBe(0);
});

test("defaultOpen opens the path to the first unticked row", () => {
  expect(defaultOpen(demo, new Set())).toEqual(["demo.a", "demo.a.a1"]);
  expect(defaultOpen(demo, new Set(["demo.a.a1.x", "demo.a.a1.y"]))).toEqual(["demo.a", "demo.a.z"]);
  expect(defaultOpen(demo, new Set(leafIdsUnder(a)))).toEqual(["demo.b"]);
  expect(defaultOpen(demo, new Set([...leafIdsUnder(a), ...leafIdsUnder(b)]))).toEqual(["demo.a"]);
});

test("someLeaf answers filter questions for a group", () => {
  const starred = new Set(["demo.a.z.q"]);
  expect(someLeaf(a, (id) => starred.has(id))).toBe(true);
  expect(someLeaf(b, (id) => starred.has(id))).toBe(false);
});

test("applyPatch ticks, stars and notes without mutating the input", () => {
  const start: SheetState = { done: new Set(["k"]), starred: new Set(), notes: {} };
  const ticked = applyPatch(start, { type: "check", on: ["m"], off: ["k"] });
  expect([...ticked.done]).toEqual(["m"]);
  expect([...start.done]).toEqual(["k"]);
  const starred = applyPatch(ticked, { type: "star", id: "m", starred: true });
  expect(starred.starred.has("m")).toBe(true);
  expect(applyPatch(starred, { type: "star", id: "m", starred: false }).starred.size).toBe(0);
  const noted = applyPatch(starred, { type: "note", id: "m", text: "  hello  " });
  expect(noted.notes).toEqual({ m: "hello" });
  expect(applyPatch(noted, { type: "note", id: "m", text: "   " }).notes).toEqual({});
});

test("groupToggle finishes a partly done group and clears a complete one", () => {
  const ids = ["x", "y", "z"];
  expect(groupToggle(ids, new Set())).toEqual({ on: ids, off: [] });
  expect(groupToggle(ids, new Set(["y"]))).toEqual({ on: ["x", "z"], off: [] });
  expect(groupToggle(ids, new Set(ids))).toEqual({ on: [], off: ids });
});

test("rankFor climbs a rank every tenth and reaches Hashira only at 100%", () => {
  expect(rankFor(0, 1000).rank).toBe(RANKS[0]);
  expect(rankFor(99, 1000).rank).toBe(RANKS[0]);
  expect(rankFor(99, 1000).toNext).toBe(1);
  expect(rankFor(100, 1000).rank).toBe(RANKS[1]);
  expect(rankFor(999, 1000).rank).toBe(RANKS[9]);
  expect(rankFor(999, 1000).next).toBe(HASHIRA);
  expect(rankFor(999, 1000).toNext).toBe(1);
  expect(rankFor(1000, 1000).rank).toBe(HASHIRA);
  expect(rankFor(1000, 1000).next).toBeNull();
  expect(rankFor(0, 0).rank).toBe(RANKS[0]);
  // Totals that do not divide by ten: the threshold is the first count in the next bucket.
  for (let done = 0; done < 1337; done++) {
    const { rank, toNext } = rankFor(done, 1337);
    expect(toNext).toBeGreaterThan(0);
    expect(rankFor(done + toNext, 1337).rank.level).toBe(rank.level + 1);
    expect(rankFor(done + toNext - 1, 1337).rank.level).toBe(rank.level);
  }
});

test("formLabel numbers the forms", () => {
  expect(formLabel(1)).toEqual({ kanji: "壱ノ型", english: "First Form" });
  expect(formLabel(10)).toEqual({ kanji: "拾ノ型", english: "Tenth Form" });
  expect(formLabel(13)).toEqual({ kanji: "拾参ノ型", english: "Thirteenth Form" });
  expect(formLabel(16)).toEqual({ kanji: "拾陸ノ型", english: "Sixteenth Form" });
});

test("the write queue sends the first change at once and merges the rest", async () => {
  const calls: { on: string[]; off: string[] }[] = [];
  const releases: ((r: CheckResult) => void)[] = [];
  const queue = createCheckQueue((on, off) => {
    calls.push({ on, off });
    return new Promise<CheckResult>((resolve) => releases.push(resolve));
  });

  const first = queue.enqueue(["a"], []);
  const second = queue.enqueue(["b"], []);
  const third = queue.enqueue(["c"], ["b"]); // b is unticked again before it was ever sent
  expect(calls).toEqual([{ on: ["a"], off: [] }]);

  releases[0]({ ok: true });
  expect(await first).toEqual({ ok: true });
  await Promise.resolve();
  expect(calls).toHaveLength(2);
  expect(calls[1]).toEqual({ on: ["c"], off: ["b"] });

  releases[1]({ ok: false, error: "nope" });
  expect(await second).toEqual({ ok: false, error: "nope" });
  expect(await third).toEqual({ ok: false, error: "nope" });

  // Idle again: the next change goes straight out.
  const fourth = queue.enqueue([], ["a"]);
  expect(calls).toHaveLength(3);
  releases[2]({ ok: true });
  expect(await fourth).toEqual({ ok: true });
  expect(await queue.enqueue([], [])).toEqual({ ok: true });
});

test("the write queue turns a thrown error into a failed result and keeps working", async () => {
  let fail = true;
  const queue = createCheckQueue(async () => {
    if (fail) throw new Error("network");
    return { ok: true };
  });
  expect((await queue.enqueue(["a"], [])).ok).toBe(false);
  fail = false;
  expect(await queue.enqueue(["a"], [])).toEqual({ ok: true });
});
