import { BookOpenIcon, FlaskConicalIcon, HammerIcon, TrophyIcon, type LucideIcon } from "lucide-react";
import type { Item } from "@/content/types";
import { cn } from "@/lib/utils";

export function kindMeta(item: Item): { label: string; icon: LucideIcon; tone: string } {
  if (item.kind === "reading") return { label: "Study", icon: BookOpenIcon, tone: "text-sky-600 dark:text-sky-400 bg-sky-500/10" };
  if (item.kind === "lab") return { label: "Lab", icon: FlaskConicalIcon, tone: "text-violet-600 dark:text-violet-400 bg-violet-500/10" };
  if (item.capstone) return { label: "Capstone", icon: TrophyIcon, tone: "text-ember bg-ember/10" };
  return { label: "Project", icon: HammerIcon, tone: "text-ember bg-ember/10" };
}

export function KindIcon({ item, className }: { item: Item; className?: string }) {
  const { icon: Icon, tone, label } = kindMeta(item);
  return (
    <span title={label} className={cn("grid size-8 shrink-0 place-items-center rounded-lg", tone, className)}>
      <Icon className="size-4" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function formatItemHours(hours: number): string {
  return `${Number.isInteger(hours) ? hours : hours.toFixed(hours * 2 === Math.round(hours * 2) ? 1 : 2)}h`;
}
