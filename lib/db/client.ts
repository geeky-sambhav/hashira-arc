import "server-only";
import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;
const store = globalThis as unknown as { __hashiraSql?: Sql };

/**
 * Lazily created connection pool, kept on `globalThis` so dev hot reloads reuse
 * it instead of leaking connections. Nothing connects until the first query.
 */
export function db(): Sql {
  if (store.__hashiraSql) return store.__hashiraSql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  store.__hashiraSql = postgres(url, {
    max: process.env.VERCEL ? 1 : 3,
    // Opening a connection costs several round trips, so keep idle ones around.
    idle_timeout: process.env.VERCEL ? 20 : 300,
    connect_timeout: 10,
    // Supabase's transaction pooler (port 6543) does not support prepared statements.
    prepare: new URL(url).port !== "6543",
    connection: { application_name: "hashira-arc" },
    onnotice: () => {},
  });
  return store.__hashiraSql;
}
