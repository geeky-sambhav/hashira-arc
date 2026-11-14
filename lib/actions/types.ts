export type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string };

export const NOTE_MAX = 2000;

/** Turn a thrown database or network error into a message safe to show. */
export function failure(error: unknown): { ok: false; error: string } {
  console.error(error);
  const code = (error as { code?: string } | null)?.code;
  if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "CONNECT_TIMEOUT" || code === "ETIMEDOUT") {
    return { ok: false, error: "Could not reach the database. Check your connection and try again." };
  }
  return { ok: false, error: "Something went wrong saving that. Nothing was changed." };
}
