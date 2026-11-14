/**
 * Validates one section file on its own and prints its size.
 * Run with: bun scripts/validate-section.ts content/sections/06-networking.ts
 */
import { resolve } from "node:path";
import { validateSheet } from "../content/validate";
import type { Section } from "../content/types";

const file = process.argv[2];
if (!file) {
  console.error("Usage: bun scripts/validate-section.ts <path to a section file>");
  process.exit(1);
}

const mod = (await import(resolve(file))) as { default?: Section };
if (!mod.default) {
  console.error(`${file} has no default export. Use: export default section(...)`);
  process.exit(1);
}

const { errors, stats } = validateSheet([mod.default]);
console.log(
  `${mod.default.id}: ${mod.default.children.length} topics, ${stats.groups} groups, ` +
    `${stats.concepts} concept rows, ${stats.builds} build rows, ${stats.links} links, depth ${stats.maxDepth}`,
);
if (errors.length) {
  console.log(`\n${errors.length} problems:`);
  for (const e of errors) console.log(`  ${e}`);
  process.exitCode = 1;
} else {
  console.log("No problems.");
}
