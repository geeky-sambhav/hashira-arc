/**
 * Finds database rows whose item, phase or card ID no longer exists in the
 * curriculum (for example after renaming an ID in content/).
 * Run with: bun scripts/check-orphans.ts
 */
import postgres from "postgres";
import { cardById, itemById, phaseById } from "../content/index";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set (Bun reads it from .env.local).");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: new URL(url).port !== "6543" });

const checks: { table: string; column: string; known: ReadonlyMap<string, unknown> }[] = [
  { table: "item_progress", column: "item_id", known: itemById },
  { table: "lab_evidence", column: "item_id", known: itemById },
  { table: "time_log", column: "item_id", known: itemById },
  { table: "time_log", column: "phase_id", known: phaseById },
  { table: "card_state", column: "card_id", known: cardById },
  { table: "review_log", column: "card_id", known: cardById },
];

let orphans = 0;
for (const { table, column, known } of checks) {
  const rows = await sql<{ id: string | null; n: number }[]>`
    select ${sql(column)} as id, count(*)::int as n from ${sql(table)} group by 1`;
  for (const row of rows) {
    if (row.id === null || known.has(row.id)) continue;
    orphans += row.n;
    console.log(`${table}.${column}: "${row.id}" is not in the curriculum (${row.n} rows)`);
  }
}

await sql.end();
console.log(orphans === 0 ? "No orphaned rows." : `${orphans} orphaned rows. Restore the ID in content/ or migrate the rows.`);
process.exitCode = orphans === 0 ? 0 : 1;
