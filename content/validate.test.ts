import { expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { build, concept, section, topic } from "./dsl";
import { leafIds, nodeById, sections, totalLeaves } from "./index";
import { ID_MAX_LENGTH, ID_PATTERN } from "./types";
import { validateSheet } from "./validate";

test("the sheet has no validation errors", () => {
  const { errors, stats } = validateSheet(sections);
  console.log(
    `sheet: ${stats.sections} sections, ${stats.groups} groups, ${stats.concepts} concept rows, ` +
      `${stats.builds} build rows, ${stats.links} links, depth ${stats.maxDepth}`,
  );
  expect(errors).toEqual([]);
});

test("the indexes agree with the tree", () => {
  const { stats } = validateSheet(sections);
  expect(leafIds.size).toBe(stats.leaves);
  expect(totalLeaves).toBe(stats.leaves);
  expect(nodeById.size).toBe(stats.leaves + stats.groups);
  for (const id of leafIds) expect(nodeById.get(id)?.node.children).toBeUndefined();
});

test("every section file is part of the sheet", () => {
  const files = readdirSync(join(import.meta.dir, "sections")).filter((f) => f.endsWith(".ts"));
  expect(sections.length).toBe(files.length);
});

test("the database CHECK constraint matches the ID rules", () => {
  const dir = join(import.meta.dir, "..", "supabase", "migrations");
  const file = readdirSync(dir).find((f) => f.endsWith("_sheet_state.sql"));
  const migration = readFileSync(join(dir, file ?? ""), "utf8");
  expect(migration).toContain(`node_id ~ '${ID_PATTERN.source}'`);
  expect(migration).toContain(`length(node_id) <= ${ID_MAX_LENGTH}`);
});

const sample = (children: Parameters<typeof section>[2]) =>
  validateSheet([section("demo", { title: "Demo", summary: "A demo." }, children)]).errors;

test("a well-formed section passes", () => {
  expect(
    sample([
      topic("basics", "Basics", [
        concept("one", "First idea", "What it means."),
        concept("two", "Second idea", undefined, {
          parts: [concept("a", "Part A", "Detail."), concept("b", "Part B", "Detail.")],
        }),
        build("lab", "Make it", "Build the thing.", { doneWhen: ["It runs"] }),
      ]),
    ]),
  ).toEqual([]);
});

test("IDs are resolved as dotted paths and leaves are counted", () => {
  const s = section("demo", { title: "Demo", summary: "A demo." }, [
    topic("basics", "Basics", [
      concept("one", "First", "x"),
      concept("two", "Second", undefined, { parts: [concept("a", "A", "x"), concept("b", "B", "x")] }),
    ]),
  ]);
  expect(s.leaves).toBe(3);
  expect(s.children[0].id).toBe("demo.basics");
  expect(s.children[0].children?.[1].children?.[1].id).toBe("demo.basics.two.b");
  expect(s.children[0].children?.[1].leaves).toBe(2);
});

test("the validator catches authoring mistakes", () => {
  expect(sample([topic("empty", "Empty", [])]).join()).toContain("needs rows under it");
  expect(sample([topic("t", "T", [concept("no-detail", "No detail")])]).join()).toContain("needs a detail");
  expect(sample([topic("t", "T", [concept("Bad_ID", "Bad", "x")])]).join()).toContain("kebab-case");
  expect(
    sample([topic("t", "T", [concept("a", "Same", "x"), concept("b", "Same", "x")])]).join(),
  ).toContain('both titled "Same"');
  expect(sample([topic("t", "T", [concept("a", "A", "x"), concept("a", "B", "x")])]).join()).toContain(
    "ID already used",
  );
  expect(
    sample([topic("t", "T", [concept("a", "A", undefined, { parts: [concept("only", "Only", "x")] })])]).join(),
  ).toContain("at least two parts");
  expect(
    sample([
      topic("t", "T", [concept("a", "A", "x", { links: [{ label: "Insecure", url: "http://example.com" }] })]),
    ]).join(),
  ).toContain("is not https");
  expect(sample([concept("loose", "Loose row", "x")]).join()).toContain("must be topics");
});
