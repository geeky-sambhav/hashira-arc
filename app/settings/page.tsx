import type { Metadata } from "next";
import { Suspense } from "react";
import { curriculum } from "@/content";
import { Skeleton } from "@/components/progress-bar";
import { SettingsForm } from "@/components/settings/settings-form";
import { getSettings } from "@/lib/db/settings";

export const metadata: Metadata = { title: "Settings" };

const timeZones = ["UTC", ...Intl.supportedValuesOf("timeZone").filter((z) => z !== "UTC")];

async function Form() {
  const s = await getSettings();
  const initial = {
    startDate: s.startDate ?? "",
    weeklyTargetHours: s.weeklyTargetMinutes / 60,
    timeZone: s.timeZone,
    newCardsPerDay: s.newCardsPerDay,
  };
  // Keyed by the saved values so the form resets to them after a save.
  return <SettingsForm key={JSON.stringify(initial)} initial={initial} timeZones={timeZones} totalWeeks={curriculum.totalWeeks} />;
}

export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Settings</h1>
        <p className="text-pretty text-muted-foreground">How the plan is scheduled for you.</p>
      </header>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-3xl" />}>
        <Form />
      </Suspense>
    </div>
  );
}
