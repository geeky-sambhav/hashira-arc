/**
 * Requests every resource link in the curriculum and reports the ones that fail.
 * Run with: bun scripts/check-links.ts
 *
 * Some sites refuse automated requests (403/429); those are listed separately
 * as "blocked" because they usually work in a browser.
 */
import { allItems } from "../content/index";

const UA = "Mozilla/5.0 (compatible; curriculum-link-check/1.0)";
const CONCURRENCY = 8;
const TIMEOUT_MS = 20_000;

const urls = new Map<string, string[]>();
for (const { item } of allItems) {
  for (const l of item.links ?? []) {
    urls.set(l.url, [...(urls.get(l.url) ?? []), item.id]);
  }
}

type Result = { url: string; status: number | string };

async function check(url: string): Promise<Result> {
  for (const method of ["HEAD", "GET"] as const) {
    try {
      const res = await fetch(url, {
        method,
        redirect: "follow",
        headers: { "user-agent": UA, accept: "text/html,*/*" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.ok) return { url, status: res.status };
      if (method === "GET") return { url, status: res.status };
    } catch (error) {
      if (method === "GET") return { url, status: (error as Error).name || "error" };
    }
  }
  return { url, status: "error" };
}

const queue = [...urls.keys()];
const results: Result[] = [];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let url = queue.pop(); url; url = queue.pop()) results.push(await check(url));
  }),
);

const ok = results.filter((r) => typeof r.status === "number" && r.status < 400);
const blocked = results.filter((r) => r.status === 403 || r.status === 429 || r.status === 999);
const broken = results.filter((r) => !ok.includes(r) && !blocked.includes(r));

const show = (r: Result) => console.log(`  ${r.status}  ${r.url}\n        used by: ${urls.get(r.url)?.join(", ")}`);
console.log(`${results.length} unique links: ${ok.length} ok, ${blocked.length} blocked to scripts, ${broken.length} broken`);
if (blocked.length) {
  console.log("\nBlocked to scripts (check by hand):");
  blocked.forEach(show);
}
if (broken.length) {
  console.log("\nBroken:");
  broken.forEach(show);
  process.exitCode = 1;
}
