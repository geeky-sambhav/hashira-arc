import Link from "next/link";
import type { Rank } from "@/lib/sheet/rank";
import { cn } from "@/lib/utils";

/** One flame petal, pointing up from the sun's disc. Rotated ten times around the centre. */
const PETAL = "M97 6 C 117 24 121 42 110 59 L 90 59 C 80 44 95 32 97 6 Z";

/**
 * The sun: a disc ringed by ten flames. One flame lights for each rank earned,
 * and the whole wheel burns at Hashira.
 */
export function SunWheel({ rank, className }: { rank: Rank; className?: string }) {
  const lit = Math.min(rank.level, 10);
  return (
    <div aria-hidden="true" className={cn("relative grid shrink-0 place-items-center", className)}>
      <svg viewBox="0 0 200 200" className="size-full overflow-visible">
        <defs>
          <linearGradient id="sun-petal" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" style={{ stopColor: "var(--ember)" }} />
            <stop offset="1" style={{ stopColor: "var(--sun)" }} />
          </linearGradient>
          <radialGradient id="sun-disc" cx="50%" cy="42%" r="62%">
            <stop offset="0" style={{ stopColor: "var(--sun)" }} />
            <stop offset="1" style={{ stopColor: "var(--ember)" }} />
          </radialGradient>
        </defs>
        <g className="motion-safe:animate-sun-turn" style={{ transformOrigin: "100px 100px" }}>
          {Array.from({ length: 10 }, (_, i) => (
            <path
              key={i}
              d={PETAL}
              transform={`rotate(${i * 36} 100 100)`}
              fill={i < lit ? "url(#sun-petal)" : "currentColor"}
              className={i < lit ? undefined : "text-foreground/10"}
            />
          ))}
        </g>
        <circle cx="100" cy="100" r="44" fill="url(#sun-disc)" />
        <circle cx="100" cy="100" r="44" fill="none" stroke="var(--background)" strokeWidth="3" opacity="0.5" />
      </svg>
      <span className="absolute font-heading text-[2.6rem] leading-none font-extrabold text-[oklch(0.2_0.05_40)]">
        {rank.kanji}
      </span>
    </div>
  );
}

/** A seal: the rank's character in a stamped square. */
export function RankSeal({ rank, className }: { rank: Rank; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-md border-2 border-primary font-heading text-lg leading-none font-extrabold text-primary",
        className,
      )}
    >
      {rank.kanji}
    </span>
  );
}

export interface PillarData {
  id: string;
  title: string;
  /** Formal numeral for the form, e.g. "参". */
  numeral: string;
  /** 0-1, or null while progress is loading. */
  ratio: number | null;
}

/** Hashira means pillar: one per form, filling with flame and standing green when the form is complete. */
export function Pillars({ pillars }: { pillars: readonly PillarData[] }) {
  return (
    <ol
      className="grid items-end gap-1 sm:gap-2"
      style={{ gridTemplateColumns: `repeat(${pillars.length}, minmax(0, 1fr))` }}
    >
      {pillars.map((p) => {
        const pct = Math.round((p.ratio ?? 0) * 100);
        const complete = pct >= 100;
        return (
          <li key={p.id}>
            <Link
              href={`/sheet/${p.id}`}
              aria-label={`${p.title}: ${p.ratio === null ? "loading" : `${pct}% complete`}`}
              title={p.title}
              className="group flex flex-col items-center gap-1.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {/* the pillar: capital, shaft, base */}
              <span className="flex w-full max-w-9 flex-col items-center">
                <span
                  className={cn("h-1.5 w-full rounded-t-sm", complete ? "ichimatsu" : "bg-foreground/15")}
                />
                <span className="relative h-20 w-[72%] overflow-hidden bg-foreground/[0.07] transition-colors group-hover:bg-foreground/[0.12] sm:h-24">
                  <span
                    className={cn(
                      "absolute inset-x-0 bottom-0 transition-[height] duration-700 ease-out",
                      complete ? "bg-haori" : "bg-linear-to-t from-ember to-sun",
                    )}
                    style={{ height: `${pct}%` }}
                  />
                </span>
                <span className="h-1.5 w-full rounded-b-sm bg-foreground/15" />
              </span>
              <span className="font-heading text-[11px] leading-none font-semibold text-muted-foreground group-hover:text-foreground sm:text-xs">
                {p.numeral}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
