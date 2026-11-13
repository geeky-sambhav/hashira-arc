import type { Metadata } from "next";
import { Suspense } from "react";
import { itemById, phaseById, phaseForWeek, phases } from "@/content";
import { LogEntry } from "@/components/log/log-entry";
import { TimeLogForm, type PhaseOption } from "@/components/log/time-log-form";
import { ProgressBar, Skeleton } from "@/components/progress-bar";
import { addDays, formatDay, startOfWeek, weekdayShort } from "@/lib/dates";
import { getPlan } from "@/lib/db/plan";
import { getMinutesByDay, getRecentTimeLogs } from "@/lib/db/time-log";
import { formatHours, weekDays } from "@/lib/schedule";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Hours" };

const phaseOptions: PhaseOption[] = phases.map((p) => ({
  id: p.id,
  label: p.label,
  title: p.title,
  items: p.modules.flatMap((m) => m.items.map((i) => ({ id: i.id, title: i.title }))),
}));

const HISTORY_WEEKS = 8;

async function Form() {
  const { today, currentWeek } = await getPlan();
  const current = phaseForWeek(Math.min(currentWeek, 52)) ?? phases[0];
  return <TimeLogForm today={today} phases={phaseOptions} defaultPhaseId={current.id} />;
}

async function ThisWeek() {
  const { today, settings } = await getPlan();
  const monday = startOfWeek(today);
  const byDay = await getMinutesByDay();
  const days = weekDays(byDay, today);
  const total = days.reduce((s, d) => s + d.minutes, 0);
  const target = settings.weeklyTargetMinutes;
  const dayPeak = Math.max(target / 5, ...days.map((d) => d.minutes));

  const weeks = Array.from({ length: HISTORY_WEEKS }, (_, i) => {
    const start = addDays(monday, -7 * (HISTORY_WEEKS - 1 - i));
    let minutes = 0;
    for (let d = 0; d < 7; d++) minutes += byDay[addDays(start, d)] ?? 0;
    return { start, minutes };
  });
  const weekPeak = Math.max(target, ...weeks.map((w) => w.minutes));
  const remaining = Math.max(0, target - total);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <p className="tabular font-heading text-4xl font-semibold tracking-tight">
            {formatHours(total)}
            <span className="text-lg font-medium text-muted-foreground"> / {formatHours(target)}h</span>
          </p>
          <p className="text-sm text-muted-foreground">
            {remaining > 0 ? `${formatHours(remaining)}h to go` : "Target reached"}
          </p>
        </div>
        <ProgressBar value={total / target} label="This week against target" tone={remaining === 0 ? "success" : "ember"} className="h-2" />
      </div>

      <div>
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">By day</h3>
        <ol className="mt-3 flex h-32 items-end gap-2">
          {days.map((d) => (
            <li key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <span className="tabular text-[11px] text-muted-foreground">{d.minutes > 0 ? formatHours(d.minutes) : ""}</span>
              <span
                className={cn(
                  "w-full rounded-md",
                  d.minutes > 0 ? (d.day === today ? "bg-primary" : "bg-primary/55") : "bg-foreground/[0.08]",
                )}
                style={{ height: `${Math.max(4, Math.round((d.minutes / dayPeak) * 84))}px` }}
              />
              <span className={cn("text-xs text-muted-foreground", d.day === today && "font-semibold text-foreground")}>
                {weekdayShort(d.day)}
              </span>
              <span className="sr-only">: {formatHours(d.minutes)} hours</span>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Last {HISTORY_WEEKS} weeks</h3>
        <ol className="relative mt-3 flex h-28 items-end gap-2">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 border-t border-dashed border-foreground/25"
            style={{ bottom: `${22 + Math.round((target / weekPeak) * 72)}px` }}
          />
          {weeks.map((w, i) => (
            <li key={w.start} className="relative flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <span
                className={cn(
                  "w-full rounded-md",
                  w.minutes >= target ? "bg-success/80" : w.minutes > 0 ? "bg-primary/55" : "bg-foreground/[0.08]",
                  i === HISTORY_WEEKS - 1 && w.minutes > 0 && w.minutes < target && "bg-primary",
                )}
                style={{ height: `${Math.max(4, Math.round((w.minutes / weekPeak) * 72))}px` }}
              />
              <span className="tabular text-[10px] whitespace-nowrap text-muted-foreground">{formatDay(w.start)}</span>
              <span className="sr-only">: {formatHours(w.minutes)} hours</span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-muted-foreground">The dashed line is your weekly target.</p>
      </div>
    </div>
  );
}

async function Recent() {
  const logs = await getRecentTimeLogs(40);
  if (logs.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Nothing logged yet. Log your first session above.
      </p>
    );
  }
  return (
    <ul className="flex flex-col divide-y rounded-2xl border bg-card shadow-xs">
      {logs.map((log) => {
        const entry = log.itemId ? itemById.get(log.itemId) : undefined;
        const phase = phaseById.get(log.phaseId);
        return (
          <LogEntry
            key={log.id}
            id={log.id}
            dayLabel={formatDay(log.loggedOn)}
            minutes={log.minutes}
            title={entry?.item.title ?? phase?.title ?? log.phaseId}
            href={entry ? `/roadmap/${entry.phase.id}/${entry.item.id}` : phase ? `/roadmap/${phase.id}` : "/roadmap"}
            note={log.note}
          />
        );
      })}
    </ul>
  );
}

export default function LogPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Hours</h1>
        <p className="max-w-2xl text-pretty text-muted-foreground">
          Log focused study time. Honest numbers are more useful than big ones.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="log-form-title" className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow-xs sm:p-6">
          <h2 id="log-form-title" className="font-heading text-lg font-semibold tracking-tight">
            Log a session
          </h2>
          <Suspense fallback={<Skeleton className="h-80 w-full" />}>
            <Form />
          </Suspense>
        </section>
        <section aria-labelledby="week-title" className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow-xs sm:p-6">
          <h2 id="week-title" className="font-heading text-lg font-semibold tracking-tight">
            This week
          </h2>
          <Suspense fallback={<Skeleton className="h-80 w-full" />}>
            <ThisWeek />
          </Suspense>
        </section>
      </div>

      <section aria-labelledby="recent-title" className="flex flex-col gap-3">
        <h2 id="recent-title" className="px-1 font-heading text-lg font-semibold tracking-tight">
          Recent sessions
        </h2>
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-2xl" />}>
          <Recent />
        </Suspense>
      </section>
    </div>
  );
}
