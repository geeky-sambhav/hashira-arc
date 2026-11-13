import "server-only";
import { cache } from "react";
import { curriculum } from "@/content";
import { planPosition, type PlanPosition } from "@/lib/schedule";
import { getSettings, getToday, type Settings } from "./settings";

export interface Plan {
  settings: Settings;
  today: string;
  position: PlanPosition;
  /** The plan week to use for pace math: 1 before the start, totalWeeks + 1 once finished. */
  currentWeek: number;
}

export const getPlan = cache(async (): Promise<Plan> => {
  const [settings, today] = await Promise.all([getSettings(), getToday()]);
  const position = planPosition(settings.startDate, today, curriculum.totalWeeks);
  const currentWeek =
    position.state === "active" ? position.week : position.state === "finished" ? curriculum.totalWeeks + 1 : 1;
  return { settings, today, position, currentWeek };
});
