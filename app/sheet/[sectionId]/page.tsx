import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { leafIds, sectionById, sections } from "@/content";
import type { Section } from "@/content/types";
import { Skeleton } from "@/components/progress-bar";
import { SheetOutline } from "@/components/sheet/sheet-outline";
import { SheetTree } from "@/components/sheet/sheet-tree";
import { getSheetSnapshot } from "@/lib/db/sheet";
import { formLabel } from "@/lib/sheet/rank";

export function generateStaticParams() {
  return sections.map((s) => ({ sectionId: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/sheet/[sectionId]">): Promise<Metadata> {
  const { sectionId } = await params;
  return { title: sectionById.get(sectionId)?.title ?? "Sheet" };
}

export default function SectionPage({ params }: PageProps<"/sheet/[sectionId]">) {
  return (
    <Suspense fallback={<SectionSkeleton />}>
      {params.then(({ sectionId }) => (
        <SectionView sectionId={sectionId} />
      ))}
    </Suspense>
  );
}

function SectionView({ sectionId }: { sectionId: string }) {
  const section = sectionById.get(sectionId);
  if (!section) notFound();

  const index = sections.indexOf(section);
  const form = formLabel(index + 1);
  const prev = sections[index - 1];
  const next = sections[index + 1];

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
          All forms
        </Link>
        <div className="flex flex-col gap-2">
          <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium text-primary">
            <span aria-hidden="true" className="font-heading text-base font-extrabold">
              {form.kanji}
            </span>
            {form.english}
            {section.capstone && (
              <span className="rounded-full bg-sun/25 px-2 py-px text-[11px] font-semibold tracking-wide text-foreground uppercase">
                Capstone
              </span>
            )}
          </p>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
            {section.title}
          </h1>
          <p className="max-w-2xl text-pretty text-muted-foreground">{section.summary}</p>
        </div>
      </header>

      {/* The topics are static; your ticks stream in and make them interactive. */}
      <Suspense fallback={<SheetOutline section={section} />}>
        <LiveSheet section={section} />
      </Suspense>

      <nav aria-label="Forms" className="grid gap-3 border-t pt-6 sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/sheet/${prev.id}`}
            className="group flex flex-col gap-0.5 rounded-xl border p-4 outline-none hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ArrowLeftIcon className="size-3 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
              Previous form
            </span>
            <span className="font-medium">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/sheet/${next.id}`}
            className="group flex flex-col items-end gap-0.5 rounded-xl border p-4 text-right outline-none hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Next form
              <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
            <span className="font-medium">{next.title}</span>
          </Link>
        )}
      </nav>
    </article>
  );
}

async function LiveSheet({ section }: { section: Section }) {
  const snapshot = await getSheetSnapshot(section.id);
  // Rows whose ID is no longer in the sheet are ignored rather than counted.
  const known = (id: string) => leafIds.has(id);
  const notes = Object.fromEntries(Object.entries(snapshot.notes).filter(([id]) => known(id)));
  return (
    <SheetTree
      section={section}
      done={snapshot.done.filter(known)}
      starred={snapshot.starred.filter(known)}
      notes={notes}
    />
  );
}

function SectionSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-24 w-full rounded-2xl" />
      ))}
    </div>
  );
}
