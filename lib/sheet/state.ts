/** The per-user state of one section, and the optimistic patches applied to it. */

export interface SheetState {
  done: ReadonlySet<string>;
  starred: ReadonlySet<string>;
  notes: Readonly<Record<string, string>>;
}

export type SheetPatch =
  | { type: "check"; on: readonly string[]; off: readonly string[] }
  | { type: "star"; id: string; starred: boolean }
  | { type: "note"; id: string; text: string };

export function applyPatch(state: SheetState, patch: SheetPatch): SheetState {
  switch (patch.type) {
    case "check": {
      const done = new Set(state.done);
      for (const id of patch.on) done.add(id);
      for (const id of patch.off) done.delete(id);
      return { ...state, done };
    }
    case "star": {
      const starred = new Set(state.starred);
      if (patch.starred) starred.add(patch.id);
      else starred.delete(patch.id);
      return { ...state, starred };
    }
    case "note": {
      const notes = { ...state.notes };
      const text = patch.text.trim();
      if (text) notes[patch.id] = text;
      else delete notes[patch.id];
      return { ...state, notes };
    }
  }
}

/** What ticking a group should do: finish it, or clear it if it is already complete. */
export function groupToggle(
  leafIds: readonly string[],
  done: ReadonlySet<string>,
): { on: string[]; off: string[] } {
  const missing = leafIds.filter((id) => !done.has(id));
  return missing.length > 0 ? { on: missing, off: [] } : { on: [], off: [...leafIds] };
}
