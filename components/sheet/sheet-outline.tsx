import type { Section } from "@/content/types";
import { Skeleton } from "@/components/progress-bar";

/**
 * What shows while your ticks load: the section's topics, already in place,
 * so the page does not jump when the interactive checklist arrives.
 */
export function SheetOutline({ section }: { section: Section }) {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <div className="flex flex-col gap-2.5 border-b py-3">
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-7 w-52" />
      </div>
      <ol className="flex flex-col gap-3">
        {section.children.map((topic, i) => (
          <li key={topic.id} className="flex flex-col gap-2 rounded-2xl border bg-card p-4 shadow-xs sm:p-5">
            <div className="flex flex-col gap-0.5 pl-[30px] sm:pl-[34px]">
              <p className="font-heading text-lg leading-snug font-semibold text-balance">
                <span className="tabular mr-2 text-primary">{i + 1}</span>
                {topic.title}
              </p>
              {topic.detail && <p className="text-sm text-pretty text-muted-foreground">{topic.detail}</p>}
            </div>
            <Skeleton className="ml-[30px] h-1.5 rounded-full sm:ml-[34px]" />
          </li>
        ))}
      </ol>
    </div>
  );
}
