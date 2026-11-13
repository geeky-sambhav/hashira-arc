"use client";

import { useState, useTransition } from "react";
import {
  CheckIcon,
  ExternalLinkIcon,
  LinkIcon,
  NotebookPenIcon,
  PlusIcon,
  TerminalIcon,
  Trash2Icon,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { EvidenceKind, EvidenceSpec } from "@/content/types";
import { addEvidence, deleteEvidence } from "@/lib/actions/evidence";
import { EVIDENCE_BODY_MAX } from "@/lib/actions/types";
import { formatDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface EvidenceItem {
  id: string;
  checklistId: string | null;
  kind: EvidenceKind;
  body: string | null;
  url: string | null;
  createdAt: string;
}

const KIND: Record<EvidenceKind, { label: string; icon: LucideIcon; placeholder: string }> = {
  output: { label: "Terminal output", icon: TerminalIcon, placeholder: "Paste the command and its output…" },
  note: { label: "Note", icon: NotebookPenIcon, placeholder: "Write what you observed, in your own words…" },
  link: { label: "Link", icon: LinkIcon, placeholder: "https://github.com/you/systems-labs/…" },
};

function EvidenceForm({
  itemId,
  checklistId,
  kind,
  onDone,
}: {
  itemId: string;
  checklistId: string | null;
  kind: EvidenceKind;
  onDone: () => void;
}) {
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [pending, startTransition] = useTransition();
  const tooLong = body.length > EVIDENCE_BODY_MAX;
  const empty = kind === "link" ? !url.trim() : !body.trim();
  const fieldId = `evidence-${checklistId ?? "general"}-${kind}`;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (empty || tooLong) return;
    startTransition(async () => {
      const result = await addEvidence({ itemId, checklistId, kind, body, url });
      if (result.ok) {
        toast.success("Evidence saved");
        onDone();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl bg-muted/60 p-3">
      {kind === "link" ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={fieldId}>Link</Label>
            <Input
              id={fieldId}
              type="url"
              inputMode="url"
              autoFocus
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={KIND.link.placeholder}
              className="bg-background"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${fieldId}-desc`}>Description (optional)</Label>
            <Input
              id={`${fieldId}-desc`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What is at this link?"
              className="bg-background"
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={fieldId}>{KIND[kind].label}</Label>
          <Textarea
            id={fieldId}
            autoFocus
            rows={kind === "output" ? 8 : 4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={KIND[kind].placeholder}
            spellCheck={kind !== "output"}
            aria-invalid={tooLong}
            className={cn("max-h-96 bg-background", kind === "output" && "font-mono text-[13px] leading-relaxed")}
          />
          {body.length > EVIDENCE_BODY_MAX * 0.8 && (
            <p className={cn("tabular text-xs", tooLong ? "text-destructive" : "text-muted-foreground")}>
              {body.length.toLocaleString("en-US")} / {EVIDENCE_BODY_MAX.toLocaleString("en-US")} characters
              {tooLong && ". Trim it, or save it as a gist and add a link instead."}
            </p>
          )}
        </div>
      )}
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending || empty || tooLong}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

function Entry({ entry }: { entry: EvidenceItem }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const Icon = KIND[entry.kind].icon;

  function remove() {
    startTransition(async () => {
      const result = await deleteEvidence(entry.id);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <li className={cn("group/entry flex flex-col gap-1.5 transition-opacity", pending && "opacity-40")}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5" aria-hidden="true" />
        <span>{KIND[entry.kind].label}</span>
        <span aria-hidden="true">·</span>
        <time dateTime={entry.createdAt}>{formatDay(entry.createdAt.slice(0, 10))}</time>
        <span className="ml-auto flex items-center gap-1">
          {confirming ? (
            <>
              <Button variant="destructive" size="xs" onClick={remove} disabled={pending}>
                Delete
              </Button>
              <Button variant="ghost" size="xs" onClick={() => setConfirming(false)}>
                Keep
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Delete this evidence"
              onClick={() => setConfirming(true)}
              className="text-muted-foreground opacity-60 hover:opacity-100 focus-visible:opacity-100"
            >
              <Trash2Icon />
            </Button>
          )}
        </span>
      </div>
      {entry.kind === "link" && entry.url ? (
        <a
          href={entry.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit max-w-full items-center gap-1.5 rounded-md text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="truncate">{entry.body || entry.url}</span>
          <ExternalLinkIcon className="size-3.5 shrink-0" aria-hidden="true" />
        </a>
      ) : entry.kind === "output" ? (
        <pre className="max-h-72 overflow-auto rounded-lg border bg-muted/50 p-3 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap">
          {entry.body}
        </pre>
      ) : (
        <p className="text-sm leading-relaxed text-pretty whitespace-pre-wrap">{entry.body}</p>
      )}
    </li>
  );
}

/** The evidence checklist for one item, plus free-form notes. */
export function EvidenceBoard({
  itemId,
  specs,
  entries,
}: {
  itemId: string;
  specs: readonly EvidenceSpec[];
  entries: readonly EvidenceItem[];
}) {
  // Which form is open: a checklist ID, or "general:<kind>".
  const [open, setOpen] = useState<string | null>(null);
  const specIds = new Set(specs.map((s) => s.id));
  const general = entries.filter((e) => !e.checklistId || !specIds.has(e.checklistId));
  const captured = specs.filter((s) => entries.some((e) => e.checklistId === s.id)).length;

  return (
    <div className="flex flex-col gap-6">
      {specs.length > 0 && (
        <section aria-labelledby="evidence-title" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 id="evidence-title" className="font-heading text-lg font-semibold tracking-tight">
              Evidence to capture
            </h2>
            <span className="tabular text-sm text-muted-foreground">
              {captured} of {specs.length}
            </span>
          </div>
          <ul className="flex flex-col divide-y rounded-2xl border bg-card shadow-xs">
            {specs.map((spec) => {
              const mine = entries.filter((e) => e.checklistId === spec.id);
              const done = mine.length > 0;
              const Icon = KIND[spec.kind].icon;
              return (
                <li key={spec.id} className="flex flex-col gap-3 p-4">
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2",
                        done ? "border-success bg-success text-background" : "border-muted-foreground/35",
                      )}
                    >
                      {done && <CheckIcon className="size-3" strokeWidth={3.5} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-pretty">{spec.label}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Icon className="size-3" aria-hidden="true" />
                        {KIND[spec.kind].label}
                        <span className="sr-only">{done ? " (captured)" : " (not captured yet)"}</span>
                      </p>
                    </div>
                    {open !== spec.id && (
                      <Button variant={done ? "ghost" : "outline"} size="sm" onClick={() => setOpen(spec.id)}>
                        <PlusIcon />
                        {done ? "Add more" : "Add"}
                      </Button>
                    )}
                  </div>
                  {open === spec.id && (
                    <EvidenceForm itemId={itemId} checklistId={spec.id} kind={spec.kind} onDone={() => setOpen(null)} />
                  )}
                  {mine.length > 0 && (
                    <ul className="flex flex-col gap-4 pl-8">
                      {mine.map((e) => (
                        <Entry key={e.id} entry={e} />
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="notes-title" className="flex flex-col gap-3">
        <h2 id="notes-title" className="font-heading text-lg font-semibold tracking-tight">
          {specs.length > 0 ? "Other notes" : "Notes"}
        </h2>
        {general.length > 0 && (
          <ul className="flex flex-col gap-5 rounded-2xl border bg-card p-4 shadow-xs">
            {general.map((e) => (
              <Entry key={e.id} entry={e} />
            ))}
          </ul>
        )}
        {open?.startsWith("general:") ? (
          <EvidenceForm
            itemId={itemId}
            checklistId={null}
            kind={open.slice("general:".length) as EvidenceKind}
            onDone={() => setOpen(null)}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {(["note", "output", "link"] as const).map((kind) => {
              const Icon = KIND[kind].icon;
              return (
                <Button key={kind} variant="outline" size="sm" onClick={() => setOpen(`general:${kind}`)}>
                  <Icon />
                  Add {KIND[kind].label.toLowerCase()}
                </Button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
