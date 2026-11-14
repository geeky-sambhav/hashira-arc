/**
 * Finds saved rows whose node ID no longer exists in the sheet (for example
 * after renaming or moving a row in content/), and ticks saved on a node that
 * is now a group rather than a row.
 * Run with: bun scripts/check-orphans.ts
 */
import postgres from "postgres";
import { leafIds, nodeById } from "../content/index";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set (Bun reads it from .env.local).");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: new URL(url).port !== "6543" });
const rows = await sql<{ node_id: string; done: boolean }[]>`select node_id, done from sheet_state`;
await sql.end();

let problems = 0;
for (const row of rows) {
  if (!nodeById.has(row.node_id)) {
    problems += 1;
    console.log(`"${row.node_id}" is not in the sheet`);
  } else if (row.done && !leafIds.has(row.node_id)) {
    problems += 1;
    console.log(`"${row.node_id}" is ticked but is now a group, so the tick is ignored`);
  }
}

console.log(
  problems === 0
    ? `No orphaned rows (${rows.length} saved).`
    : `${problems} orphaned rows. Restore the ID in content/ or update the rows in sheet_state.`,
);
process.exitCode = problems === 0 ? 0 : 1;
