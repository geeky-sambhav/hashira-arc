import Link from "next/link";
import { ArrowRightIcon, BrainIcon, ClockIcon, FlameIcon, GaugeIcon, type LucideIcon } from "lucide-react";
import { allItems, curriculum, phaseForWeek, phases } from "@/content";
import { PILLARS } from "@/content/types";
import { ProgressBar } from "@/components/progress-bar";
import { ItemRow } from "@/components/roadmap/item-row";
import { phaseProgress } from "@/components/roadmap/live";
import { Button } from "@/components/ui/button";
import { addDays, formatDay, startOfWeek, weekdayShort } from "@/lib/dates";
import { getActiveDays } from "@/lib/db/cards";
import { getPlan } from "@/lib/db/plan";
import { getProgressMap } from "@/lib/db/progress";
import { getReviewData } from "@/lib/db/review";
import { getMinutesByDay } from "@/lib/db/time-log";
import { formatHours, pace, streak, weekDays } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { StartPlanButton } from "./start-plan";

/** Async server components for the dashboard. Each renders inside its own <Suspense>. */

const paceItems = allItems.map(({ item }) => item);

export async function PlanHero() {
  const { position, settings, today } = await getPlan();

  if (position.state === "unset") {
    return (
      <section className="relative overflow-hidden rounded-3xl border bg-linear-to-br from-primary/[0.12] via-card to-card p-6 shadow-xs sm:p-10">
        <p className="text-sm font-medium text-primary">Welcome</p>
        <h1 className="mt-2 max-w-xl font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          A year of systems engineering, one week at a time.
        </h1>
        <p className="mt-3 max-w-xl text-pretty text-muted-foreground">
          {curriculum.totalWeeks} weeks, {phases.length} phases, three capstones. Start the clock and the app will show
          you what to do each week, track your hours and bring back what you learned for review.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <StartPlanButton />
          <Button variant="ghost" size="lg" asChild>
            <Link href="/settings">Pick another start date</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (position.state === "before") {
    return (
      <section className="rounded-3xl border bg-card p-6 shadow-xs sm:p-8">
        <p className="text-sm font-medium text-primary">Getting ready</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
          Week 1 starts in {position.daysUntilStart} {position.daysUntilStart === 1 ? "day" : "days"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your plan begins on {formatDay(settings.startDate ?? today)}. You can look through the roadmap in the meantime.
        </p>
        <Button className="mt-5" asChild>
          <Link href="/roadmap">
            Browse the roadmap <ArrowRightIcon />
          </Link>
        </Button>
      </section>
    );
  }

  if (position.state === "finished") {
    return (
      <section className="rounded-3xl border bg-linear-to-br from-success/15 via-card to-card p-6 shadow-xs sm:p-8">
        <p className="text-sm font-medium text-success">Plan complete</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">All {curriculum.totalWeeks} weeks are behind you.</h1>
        <p className="mt-2 text-muted-foreground">Finish anything still open, and keep the review queue going.</p>
      </section>
    );
  }

  const phase = phaseForWeek(position.week);
  return (
    <section className="relative overflow-hidden rounded-3xl border bg-linear-to-br from-primary/[0.1] via-card to-card p-6 shadow-xs sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">
            {weekdayShort(today)}, {formatDay(today)}
          </p>
          <h1 className="mt-1 font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
            Week <span className="tabular">{position.week}</span>
            <span className="tabular text-2xl font-medium text-muted-foreground sm:text-3xl"> / {curriculum.totalWeeks}</span>
          </h1>
          {phase && (
            <Link
              href={`/roadmap/${phase.id}`}
              className="group mt-3 inline-flex max-w-full items-center gap-1.5 rounded-md text-base text-pretty outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="text-muted-foreground">{phase.label}:</span>
              <span className="font-medium underline-offset-4 group-hover:underline">{phase.title}</span>
              <ArrowRightIcon className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          )}
        </div>
        <ol className="flex items-center gap-1.5" aria-label={`Day ${position.dayOfWeek} of 7 in this plan week`}>
          {Array.from({ length: 7 }, (_, i) => (
            <li
              key={i}
              className={cn(
                "h-8 w-2 rounded-full",
                i + 1 < position.dayOfWeek && "bg-primary/45",
                i + 1 === position.dayOfWeek && "bg-primary",
                i + 1 > position.dayOfWeek && "bg-foreground/10",
              )}
            />
          ))}
        </ol>
      </div>
      <ProgressBar
        value={(position.week - 1 + position.dayOfWeek / 7) / curriculum.totalWeeks}
        label="Progress through the year"
        className="mt-6 h-1"
      />
    </section>
  );
}

function Tile({
  icon: Icon,
  label,
  children,
  href,
  cta,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs">
      <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </div>
      <div className="flex flex-1 flex-col gap-2">{children}</div>
      {href && cta && (
        <Link
          href={href}
          className="group inline-flex w-fit items-center gap-1 rounded-md text-sm font-medium text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {cta}
          <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

const Big = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <p className={cn("tabular font-heading text-3xl font-semibold tracking-tight", className)}>{children}</p>
);
const Small = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-pretty text-muted-foreground">{children}</p>
);

export async function HoursTile() {
  const { today, settings } = await getPlan();
  const byDay = await getMinutesByDay(startOfWeek(today));
  const days = weekDays(byDay, today);
  const total = days.reduce((sum, d) => sum + d.minutes, 0);
  const peak = Math.max(60, ...days.map((d) => d.minutes));

  return (
    <Tile icon={ClockIcon} label="This week" href="/log" cta="Log time">
      <Big>
        {formatHours(total)}
        <span className="text-base font-medium text-muted-foreground"> / {formatHours(settings.weeklyTargetMinutes)}h</span>
      </Big>
      <ProgressBar
        value={total / settings.weeklyTargetMinutes}
        label="Hours this week against target"
        tone={total >= settings.weeklyTargetMinutes ? "success" : "ember"}
      />
      <ol className="mt-1 flex h-10 items-end gap-1" aria-label="Hours per day this week">
        {days.map((d) => (
          <li key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${weekdayShort(d.day)}: ${formatHours(d.minutes)}h`}>
            <span
              className={cn(
                "w-full rounded-sm",
                d.minutes > 0 ? "bg-primary/70" : "bg-foreground/10",
                d.day === today && d.minutes > 0 && "bg-primary",
              )}
              style={{ height: `${Math.max(3, Math.round((d.minutes / peak) * 28))}px` }}
            />
            <span className={cn("text-[9px] leading-none text-muted-foreground", d.day === today && "font-semibold text-foreground")}>
              {weekdayShort(d.day).charAt(0)}
            </span>
            <span className="sr-only">
              {weekdayShort(d.day)}: {formatHours(d.minutes)} hours
            </span>
          </li>
        ))}
      </ol>
    </Tile>
  );
}

export async function StreakTile() {
  const { today } = await getPlan();
  const active = await getActiveDays(addDays(today, -400));
  const n = streak(active, today);
  const doneToday = active.includes(today);
  return (
    <Tile icon={FlameIcon} label="Streak">
      <Big className={cn(n > 0 && "text-primary")}>
        {n}
        <span className="text-base font-medium text-muted-foreground"> {n === 1 ? "day" : "days"}</span>
      </Big>
      <Small>
        {n === 0
          ? "Log time or do a review to start one."
          : doneToday
            ? "Today counts. Keep it going tomorrow."
            : "Study or review today to keep it alive."}
      </Small>
    </Tile>
  );
}

export async function PaceTile() {
  const [{ position, currentWeek }, progress] = await Promise.all([getPlan(), getProgressMap()]);
  const p = pace(paceItems, progress, currentWeek);
  const delta = Math.round(p.deltaHours);

  if (position.state === "unset" || position.state === "before") {
    return (
      <Tile icon={GaugeIcon} label="Pace">
        <Big>
          {Math.round(p.doneHours)}
          <span className="text-base font-medium text-muted-foreground">h done</span>
        </Big>
        <Small>Pace tracking begins once the plan starts.</Small>
      </Tile>
    );
  }

  return (
    <Tile icon={GaugeIcon} label="Pace" href="/roadmap" cta="See the roadmap">
      <Big className={cn(delta > 0 && "text-success", delta < -12 && "text-warning")}>
        {delta === 0 ? "On track" : `${Math.abs(delta)}h`}
        {delta !== 0 && <span className="text-base font-medium text-muted-foreground"> {delta > 0 ? "ahead" : "behind"}</span>}
      </Big>
      <Small>
        {Math.round(p.doneHours)}h done of the {Math.round(p.expectedHours)}h planned before this week.
      </Small>
    </Tile>
  );
}

export async function ReviewTile() {
  const { queue, startedModules, nextDueOn, totalSeen, totalCards } = await getReviewData();
  const n = queue.due.length + queue.fresh.length;
  return (
    <Tile icon={BrainIcon} label="Review" href={n > 0 ? "/review" : undefined} cta={n > 0 ? "Start review" : undefined}>
      <Big className={cn(n > 0 && "text-primary")}>
        {n}
        <span className="text-base font-medium text-muted-foreground"> {n === 1 ? "card" : "cards"}</span>
      </Big>
      <Small>
        {n > 0
          ? `${queue.due.length} due, ${queue.fresh.length} new.`
          : startedModules === 0
            ? "Cards unlock when you start a module."
            : nextDueOn
              ? `All caught up. Next card on ${formatDay(nextDueOn)}.`
              : `All caught up. ${totalSeen} of ${totalCards} cards seen.`}
      </Small>
    </Tile>
  );
}

export async function UpNext() {
  const [{ currentWeek }, progress] = await Promise.all([getPlan(), getProgressMap()]);
  const open = allItems.filter(({ item }) => {
    const s = progress[item.id];
    return !item.optional && s !== "done" && s !== "skipped";
  });
  const doing = open.filter(({ item }) => progress[item.id] === "doing");
  const todo = open.filter(({ item }) => progress[item.id] !== "doing");
  const list = [...doing, ...todo].slice(0, 6);
  const overdue = open.filter(({ item }) => item.week < currentWeek).length;

  if (list.length === 0) {
    return <p className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">Everything on the roadmap is done.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {overdue > 0 && (
        <p className="px-2 text-sm text-muted-foreground sm:px-3">
          <span className="tabular font-medium text-warning">{overdue}</span> {overdue === 1 ? "item is" : "items are"} from
          earlier weeks. Finish, or skip what you decide not to do.
        </p>
      )}
      <ul className="flex flex-col rounded-2xl border bg-card p-1.5 shadow-xs">
        {list.map(({ item, phase }) => (
          <ItemRow key={item.id} item={item} phaseId={phase.id} />
        ))}
      </ul>
    </div>
  );
}

export async function Pillars() {
  const progress = await getProgressMap();
  const rows = PILLARS.map((pillar) => {
    let total = 0;
    let done = 0;
    let firstPhaseId: string | undefined;
    for (const phase of phases) {
      if (phase.pillar !== pillar.id) continue;
      firstPhaseId ??= phase.id;
      const p = phaseProgress(phase, progress);
      total += p.total;
      done += p.done;
    }
    return { ...pillar, ratio: total > 0 ? done / total : 0, phaseId: firstPhaseId };
  });

  return (
    <ol className="grid grid-cols-9 items-end gap-1.5 sm:gap-3">
      {rows.map((p) => {
        const pct = Math.round(p.ratio * 100);
        return (
          <li key={p.id}>
            <Link
              href={p.phaseId ? `/roadmap/${p.phaseId}` : "/roadmap"}
              className="group flex flex-col items-center gap-2 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-label={`${p.label}: ${pct}% complete`}
            >
              <span className="tabular text-[11px] font-medium text-muted-foreground group-hover:text-foreground">{pct}%</span>
              {/* the pillar: capital, shaft, base */}
              <span className="flex w-full max-w-12 flex-col items-center">
                <span className="h-1.5 w-full rounded-t-sm bg-foreground/15" />
                <span
                  className="relative w-[78%] overflow-hidden bg-foreground/[0.07] transition-colors group-hover:bg-foreground/10"
                  style={{ height: "96px" }}
                >
                  <span
                    className={cn(
                      "absolute inset-x-0 bottom-0 transition-[height] duration-700 ease-out",
                      pct >= 100 ? "bg-success" : "bg-linear-to-t from-ember to-ember/60",
                    )}
                    style={{ height: `${pct}%` }}
                  />
                </span>
                <span className="h-1.5 w-full rounded-b-sm bg-foreground/15" />
              </span>
              <span className="hidden h-8 text-center text-[11px] leading-tight text-balance text-muted-foreground group-hover:text-foreground sm:block">
                {p.label}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
