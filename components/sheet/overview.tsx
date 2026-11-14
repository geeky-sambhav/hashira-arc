import Link from "next/link";
import { ArrowRightIcon, CheckIcon } from "lucide-react";
import { sections, totalLeaves } from "@/content";
import { ProgressBar } from "@/components/progress-bar";
import { Button } from "@/components/ui/button";
import { formLabel, rankFor } from "@/lib/sheet/rank";
import { sectionDone } from "@/lib/sheet/tree";
import { cn } from "@/lib/utils";
import { Pillars, RankSeal, SunWheel } from "./motifs";

/**
 * The whole sheet at a glance. `done` is null while your progress is still
 * loading: the structure and totals are static, so they paint at once.
 */
export function Overview({ done }: { done: ReadonlySet<string> | null }) {
  const loading = done === null;
  const rows = sections.map((section, i) => {
    const ticked = done ? sectionDone(section, done) : 0;
    return { section, n: i + 1, form: formLabel(i + 1), ticked, complete: !loading && ticked === section.leaves };
  });
  const ticked = rows.reduce((n, r) => n + r.ticked, 0);
  const { rank, next, toNext } = rankFor(ticked, totalLeaves);
  const raised = rows.filter((r) => r.complete).length;
  const current = rows.find((r) => !r.complete) ?? rows[0];
  const pct = totalLeaves > 0 ? Math.floor((ticked / totalLeaves) * 100) : 0;
  const started = ticked > 0;

  return (
    <div className="flex flex-col gap-10">
      <section
        aria-labelledby="sheet-title"
        className="relative overflow-hidden rounded-3xl border bg-card shadow-xs"
      >
        <div aria-hidden="true" className="ichimatsu h-3 w-full" />
        <div className="flex flex-col-reverse items-center gap-6 p-6 sm:flex-row sm:items-center sm:gap-10 sm:p-10">
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-primary">The senior engineer sheet</p>
              <h1
                id="sheet-title"
                className="font-heading text-3xl font-extrabold tracking-tight text-balance sm:text-[2.6rem] sm:leading-[1.1]"
              >
                {sections.length} forms. <span className="flame-text">One dance.</span>
              </h1>
              <p className="max-w-xl text-pretty text-muted-foreground">
                Every systems concept a top 1% engineer can explain, from first principles. Open a form, work down
                the rows, and tick each one when you could teach it.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <p className="tabular text-sm">
                  <span className={cn("text-lg font-semibold", loading && "animate-pulse text-muted-foreground")}>
                    {loading ? "–" : ticked.toLocaleString("en")}
                  </span>
                  <span className="text-muted-foreground"> / {totalLeaves.toLocaleString("en")} rows</span>
                </p>
                <p className="tabular text-sm text-muted-foreground">{loading ? "" : `${pct}%`}</p>
              </div>
              <ProgressBar value={totalLeaves > 0 ? ticked / totalLeaves : 0} label="Whole sheet" className="h-2" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <RankSeal rank={rank} />
                <div className="flex flex-col">
                  <p className="text-xs text-muted-foreground">Rank</p>
                  <p className="font-heading text-base leading-tight font-semibold">{rank.name}</p>
                </div>
                {next && !loading && (
                  <p className="tabular border-l pl-3 text-xs text-pretty text-muted-foreground">
                    {toNext.toLocaleString("en")} {toNext === 1 ? "row" : "rows"} to
                    <br />
                    <span className="font-medium text-foreground">{next.name}</span>
                  </p>
                )}
              </div>
              {current && (
                <Button asChild size="lg" className="h-10 px-4">
                  <Link href={`/sheet/${current.section.id}`} prefetch={true}>
                    {started ? "Continue" : "Begin"}: {current.form.english}
                    <ArrowRightIcon data-icon="inline-end" />
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <SunWheel rank={rank} className="size-40 sm:size-52" />
        </div>
      </section>

      <section aria-labelledby="pillars-title" className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3 px-1">
          <h2 id="pillars-title" className="font-heading text-xl font-extrabold tracking-tight">
            Pillars
          </h2>
          <p className="tabular text-sm text-muted-foreground">
            {loading ? "" : `${raised} of ${sections.length} raised`}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-xs sm:p-6">
          <Pillars
            pillars={rows.map((r) => ({
              id: r.section.id,
              title: r.section.title,
              numeral: r.form.kanji.replace("ノ型", ""),
              ratio: loading ? null : r.ticked / r.section.leaves,
            }))}
          />
          <p className="mt-4 text-center text-xs text-pretty text-muted-foreground">
            Hashira means pillar. Finish every row of a form and its pillar stands.
          </p>
        </div>
      </section>

      <section aria-labelledby="forms-title" className="flex flex-col gap-4">
        <h2 id="forms-title" className="px-1 font-heading text-xl font-extrabold tracking-tight">
          The forms
        </h2>
        <ol className="flex flex-col gap-2.5">
          {rows.map((r) => {
            const ratio = r.section.leaves > 0 ? r.ticked / r.section.leaves : 0;
            return (
              <li key={r.section.id}>
                <Link
                  href={`/sheet/${r.section.id}`}
                  prefetch={true}
                  className="group flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-xs outline-none transition-colors hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 sm:gap-5 sm:p-5"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-12 shrink-0 place-items-center rounded-xl font-heading text-xl leading-none font-extrabold sm:size-14 sm:text-2xl",
                      r.complete ? "bg-haori text-background" : "bg-primary/10 text-primary",
                    )}
                  >
                    {r.complete ? <CheckIcon className="size-6" strokeWidth={3} /> : r.form.kanji.replace("ノ型", "")}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-2">
                    <span className="flex flex-col gap-0.5">
                      <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        {r.form.english}
                        {r.section.capstone && (
                          <span className="rounded-full bg-sun/25 px-1.5 py-px text-[10px] font-semibold tracking-wide text-foreground uppercase">
                            Capstone
                          </span>
                        )}
                      </span>
                      <span className="font-heading text-lg leading-snug font-semibold text-balance">
                        {r.section.title}
                      </span>
                      <span className="line-clamp-2 text-sm text-pretty text-muted-foreground">
                        {r.section.summary}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <ProgressBar value={ratio} label={`${r.section.title} progress`} />
                      <span className="tabular shrink-0 text-xs text-muted-foreground">
                        <span className={cn(loading && "animate-pulse")}>{loading ? "–" : r.ticked}</span>/
                        {r.section.leaves}
                      </span>
                    </span>
                  </span>
                  <ArrowRightIcon
                    className="hidden size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground sm:block"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
