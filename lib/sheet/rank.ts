/**
 * Progress through the whole sheet, expressed as the ten corps ranks
 * (the ten heavenly stems, lowest first) and Hashira, "pillar", at 100%.
 */

export interface Rank {
  /** 0-9 for the ten ranks, 10 for Hashira. */
  level: number;
  name: string;
  kanji: string;
}

export const RANKS: readonly Rank[] = [
  { level: 0, name: "Mizunoto", kanji: "癸" },
  { level: 1, name: "Mizunoe", kanji: "壬" },
  { level: 2, name: "Kanoto", kanji: "辛" },
  { level: 3, name: "Kanoe", kanji: "庚" },
  { level: 4, name: "Tsuchinoto", kanji: "己" },
  { level: 5, name: "Tsuchinoe", kanji: "戊" },
  { level: 6, name: "Hinoto", kanji: "丁" },
  { level: 7, name: "Hinoe", kanji: "丙" },
  { level: 8, name: "Kinoto", kanji: "乙" },
  { level: 9, name: "Kinoe", kanji: "甲" },
];

export const HASHIRA: Rank = { level: 10, name: "Hashira", kanji: "柱" };

export interface RankProgress {
  rank: Rank;
  next: Rank | null;
  /** Rows still to tick before the next rank. 0 at Hashira. */
  toNext: number;
}

export function rankFor(done: number, total: number): RankProgress {
  if (total <= 0) return { rank: RANKS[0], next: RANKS[1], toNext: 0 };
  const clamped = Math.min(Math.max(done, 0), total);
  if (clamped === total) return { rank: HASHIRA, next: null, toNext: 0 };
  const level = Math.min(9, Math.floor((clamped * 10) / total));
  const next = level === 9 ? HASHIRA : RANKS[level + 1];
  // The next rank starts at the first count whose tenth-of-total bucket is level + 1.
  const threshold = level === 9 ? total : Math.ceil(((level + 1) * total) / 10);
  return { rank: RANKS[level], next, toNext: threshold - clamped };
}

/** Formal numerals used to number the forms: 壱ノ型, 弐ノ型, ... */
const DAIJI = ["壱", "弐", "参", "肆", "伍", "陸", "漆", "捌", "玖", "拾"];
const ORDINALS = [
  "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth",
  "Ninth", "Tenth", "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth", "Sixteenth",
  "Seventeenth", "Eighteenth", "Nineteenth", "Twentieth",
];

/** Label for the nth section (1-based): { kanji: "参ノ型", english: "Third Form" }. */
export function formLabel(n: number): { kanji: string; english: string } {
  const numeral = n <= 10 ? DAIJI[n - 1] : n < 20 ? `拾${DAIJI[n - 11]}` : `${n}`;
  return { kanji: `${numeral ?? n}ノ型`, english: `${ORDINALS[n - 1] ?? `${n}th`} Form` };
}
