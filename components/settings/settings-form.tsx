"use client";

import { useState, useTransition } from "react";
import { LocateFixedIcon } from "lucide-react";
import { toast } from "sonner";
import { saveSettings } from "@/lib/actions/settings";
import { addDays, formatDay, isValidDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "h-9 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function Field({ id, label, hint, children }: { id: string; label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 py-5 sm:grid-cols-[1fr_minmax(0,18rem)] sm:items-start sm:gap-8">
      <div>
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p id={`${id}-hint`} className="mt-1 text-sm text-pretty text-muted-foreground">
          {hint}
        </p>
      </div>
      <div>{children}</div>
    </div>
  );
}

export function SettingsForm({
  initial,
  timeZones,
  totalWeeks,
}: {
  initial: { startDate: string; weeklyTargetHours: number; timeZone: string; newCardsPerDay: number };
  timeZones: string[];
  totalWeeks: number;
}) {
  const [startDate, setStartDate] = useState(initial.startDate);
  const [hours, setHours] = useState(String(initial.weeklyTargetHours));
  const [timeZone, setTimeZone] = useState(initial.timeZone);
  const [newCards, setNewCards] = useState(String(initial.newCardsPerDay));
  const [pending, startTransition] = useTransition();

  const zones = timeZones.includes(timeZone) ? timeZones : [timeZone, ...timeZones];
  const dirty =
    startDate !== initial.startDate ||
    Number(hours) !== initial.weeklyTargetHours ||
    timeZone !== initial.timeZone ||
    Number(newCards) !== initial.newCardsPerDay;
  const endDate = isValidDate(startDate) ? addDays(startDate, totalWeeks * 7 - 1) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveSettings({
        startDate,
        weeklyTargetHours: Number(hours),
        timeZone,
        newCardsPerDay: Number(newCards),
      });
      if (result.ok) toast.success("Settings saved");
      else toast.error(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col">
      <div className="divide-y rounded-3xl border bg-card px-5 shadow-xs sm:px-6">
        <Field id="start-date" label="Start date" hint="Day one of week 1. Changing it shifts every planned week; your progress stays.">
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            aria-describedby="start-date-hint"
            className="tabular"
          />
          {endDate && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Week {totalWeeks} ends on {formatDay(endDate)} {endDate.slice(0, 4)}.
            </p>
          )}
        </Field>

        <Field id="weekly-hours" label="Weekly target" hint="Hours of focused study per week. The plan is sized for about 25.">
          <div className="flex items-center gap-2">
            <Input
              id="weekly-hours"
              type="number"
              inputMode="decimal"
              min={0.5}
              max={100}
              step={0.5}
              required
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              aria-describedby="weekly-hours-hint"
              className="tabular w-24"
            />
            <span className="text-sm text-muted-foreground">hours</span>
          </div>
        </Field>

        <Field id="time-zone" label="Time zone" hint="Decides when 'today' starts for hours, streaks and reviews.">
          <div className="flex flex-col gap-2">
            <select
              id="time-zone"
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value)}
              aria-describedby="time-zone-hint"
              className={selectClass}
            >
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit"
              onClick={() => setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC")}
            >
              <LocateFixedIcon />
              Use this device&apos;s time zone
            </Button>
          </div>
        </Field>

        <Field id="new-cards" label="New cards per day" hint="How many unseen quiz cards to introduce daily. Reviews of cards you have seen are never capped.">
          <div className="flex items-center gap-2">
            <Input
              id="new-cards"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              required
              value={newCards}
              onChange={(e) => setNewCards(e.target.value)}
              aria-describedby="new-cards-hint"
              className="tabular w-24"
            />
            <span className="text-sm text-muted-foreground">cards</span>
          </div>
        </Field>
      </div>

      <div className="mt-5 flex items-center justify-end gap-3">
        {dirty && <span className="text-sm text-muted-foreground">Unsaved changes</span>}
        <Button type="submit" disabled={pending || !dirty}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
