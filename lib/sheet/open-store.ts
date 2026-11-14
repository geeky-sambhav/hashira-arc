"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Which groups are expanded, remembered per section in localStorage.
 * Read through useSyncExternalStore so the server render and hydration use the
 * defaults and the stored state is applied right after, without a mismatch.
 */

const key = (sectionId: string) => `hashira:open:${sectionId}`;
const listeners = new Set<() => void>();

function read(sectionId: string): string | null {
  try {
    return window.localStorage.getItem(key(sectionId));
  } catch {
    return null;
  }
}

function write(sectionId: string, ids: readonly string[]) {
  try {
    window.localStorage.setItem(key(sectionId), JSON.stringify(ids));
  } catch {
    // Private mode or a full quota: the state simply lasts for this visit.
  }
  memory.set(sectionId, JSON.stringify(ids));
  listeners.forEach((notify) => notify());
}

/** Fallback when localStorage is unavailable, and the source after a write. */
const memory = new Map<string, string>();

function subscribe(notify: () => void) {
  listeners.add(notify);
  window.addEventListener("storage", notify);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", notify);
  };
}

function parse(raw: string | null): string[] | null {
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : null;
  } catch {
    return null;
  }
}

export interface OpenControls {
  toggle(id: string): void;
  openAll(ids: readonly string[]): void;
  closeAll(): void;
}

export function useOpenSet(sectionId: string, defaults: readonly string[]): [ReadonlySet<string>, OpenControls] {
  const raw = useSyncExternalStore(
    subscribe,
    () => memory.get(sectionId) ?? read(sectionId),
    () => null,
  );

  const open = useMemo(() => new Set(parse(raw) ?? defaults), [raw, defaults]);

  const toggle = useCallback(
    (id: string) => {
      const next = new Set(open);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      write(sectionId, [...next]);
    },
    [open, sectionId],
  );
  const openAll = useCallback((ids: readonly string[]) => write(sectionId, ids), [sectionId]);
  const closeAll = useCallback(() => write(sectionId, []), [sectionId]);

  return [open, useMemo(() => ({ toggle, openAll, closeAll }), [toggle, openAll, closeAll])];
}
