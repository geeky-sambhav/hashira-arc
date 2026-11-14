"use client";

import { useId, useState, useTransition } from "react";
import { ChevronRightIcon, HammerIcon, NotebookPenIcon, StarIcon } from "lucide-react";
import type { SheetNode } from "@/content/types";
import { ProgressBar } from "@/components/progress-bar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { isLeaf } from "@/lib/sheet/tree";
import { cn } from "@/lib/utils";
import { ResourceLinks } from "./resource-links";
import { useSheet } from "./sheet-tree";

const NOTE_MAX = 2000;

/** Tri-state for a group's checkbox. */
function groupChecked(done: number, total: number): boolean | "indeterminate" {
  if (done === 0) return false;
  return done === total ? true : "indeterminate";
}

/** A top-level topic: a card that opens to show its subtopics. */
export function TopicCard({ node, index }: { node: SheetNode; index: number }) {
  const sheet = useSheet();
  const bodyId = useId();
  const done = sheet.counts.get(node.id) ?? 0;
  const open = sheet.isOpen(node.id);
  const complete = done === node.leaves;

  return (
    <li className={cn("overflow-hidden rounded-2xl border bg-card shadow-xs", complete && "border-haori/40")}>
      <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
        <Checkbox
          checked={groupChecked(done, node.leaves)}
          onCheckedChange={() => sheet.toggleGroup(node)}
          aria-label={`${complete ? "Clear" : "Tick"} every row in "${node.title}"`}
          className={cn("mt-1", sheet.justTicked === node.id && "animate-ignite")}
        />
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => sheet.toggleOpen(node.id)}
          className="group flex min-w-0 flex-1 flex-col gap-2 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="flex items-start gap-2">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-heading text-lg leading-snug font-semibold text-balance">
                <span className="tabular mr-2 text-primary">{index}</span>
                {node.title}
              </span>
              {node.detail && <span className="text-sm text-pretty text-muted-foreground">{node.detail}</span>}
            </span>
            <ChevronRightIcon
              aria-hidden="true"
              className={cn(
                "mt-1 size-4 shrink-0 text-muted-foreground group-hover:text-foreground",
                open && "rotate-90",
              )}
            />
          </span>
          <span className="flex items-center gap-3">
            <ProgressBar value={done / node.leaves} label={`${node.title} progress`} />
            <span className="tabular shrink-0 text-xs text-muted-foreground">
              {done}/{node.leaves}
            </span>
          </span>
        </button>
      </div>

      {open && (
        <div id={bodyId} className="border-t bg-background/40 px-2 py-2 sm:px-3">
          {node.links && (
            <div className="flex flex-col gap-1.5 px-2 pt-1.5 pb-2.5">
              <p className="text-xs font-medium text-muted-foreground">Learn from</p>
              <ResourceLinks links={node.links} />
            </div>
          )}
          <ul className="flex flex-col">
            {node.children?.map((child) => (
              <NodeRow key={child.id} node={child} />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

function NodeRow({ node }: { node: SheetNode }) {
  const sheet = useSheet();
  if (!sheet.isVisible(node)) return null;
  return isLeaf(node) ? <LeafRow node={node} /> : <GroupRow node={node} />;
}

/** A subtopic, or a hard row split into parts. Opens to show the rows beneath it. */
function GroupRow({ node }: { node: SheetNode }) {
  const sheet = useSheet();
  const bodyId = useId();
  const done = sheet.counts.get(node.id) ?? 0;
  const open = sheet.isOpen(node.id);
  const complete = done === node.leaves;
  const isTopic = node.kind === "topic";

  return (
    <li>
      <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-foreground/[0.04]">
        <Checkbox
          checked={groupChecked(done, node.leaves)}
          onCheckedChange={() => sheet.toggleGroup(node)}
          aria-label={`${complete ? "Clear" : "Tick"} every row in "${node.title}"`}
          className={cn(sheet.justTicked === node.id && "animate-ignite")}
        />
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => sheet.toggleOpen(node.id)}
          className="group flex min-w-0 flex-1 items-center gap-2 rounded-md py-0.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ChevronRightIcon
            aria-hidden="true"
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground",
              open && "rotate-90",
            )}
          />
          {node.kind === "build" && <HammerIcon className="size-3.5 shrink-0 text-primary" aria-hidden="true" />}
          <span
            className={cn(
              "min-w-0 flex-1 text-pretty",
              isTopic ? "text-[15px] font-semibold" : "text-sm font-medium",
              complete && "text-muted-foreground",
            )}
          >
            {node.title}
          </span>
          <span
            className={cn(
              "tabular shrink-0 rounded-full px-2 py-0.5 text-xs",
              complete ? "bg-haori/15 font-medium text-haori" : "bg-foreground/[0.06] text-muted-foreground",
            )}
          >
            {done}/{node.leaves}
          </span>
        </button>
      </div>

      {open && (
        <div id={bodyId} className="mb-1 ml-[17px] border-l border-foreground/10 pl-2 sm:ml-[18px] sm:pl-3">
          {(node.detail || node.links) && (
            <div className="flex flex-col gap-2 px-2 pt-1 pb-2">
              {node.detail && <p className="text-sm text-pretty text-muted-foreground">{node.detail}</p>}
              {node.links && <ResourceLinks links={node.links} />}
            </div>
          )}
          <ul className="flex flex-col">
            {node.children?.map((child) => (
              <NodeRow key={child.id} node={child} />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

/** One thing to learn or build: the row you tick. */
function LeafRow({ node }: { node: SheetNode }) {
  const sheet = useSheet();
  const panelId = useId();
  const done = sheet.state.done.has(node.id);
  const starred = sheet.state.starred.has(node.id);
  const note = sheet.state.notes[node.id];
  const open = sheet.detailId === node.id;

  return (
    <li>
      <div
        className={cn(
          "flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-foreground/[0.04]",
          open && "bg-foreground/[0.04]",
        )}
      >
        <Checkbox
          checked={done}
          onCheckedChange={() => sheet.toggleLeaf(node)}
          aria-label={`${done ? "Untick" : "Tick"} "${node.title}"`}
          className={cn("mt-0.5", sheet.justTicked === node.id && done && "animate-ignite")}
        />
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => sheet.setDetailId(open ? null : node.id)}
          className="group flex min-w-0 flex-1 items-start gap-2 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {node.kind === "build" && (
            <HammerIcon className="mt-[3px] size-3.5 shrink-0 text-primary" aria-hidden="true" />
          )}
          <span className={cn("min-w-0 flex-1 text-sm text-pretty", done && "text-muted-foreground")}>
            {node.title}
            {node.kind === "build" && <span className="sr-only"> (build)</span>}
          </span>
          {note && (
            <NotebookPenIcon className="mt-[3px] size-3.5 shrink-0 text-muted-foreground" aria-label="Has a note" />
          )}
          <ChevronRightIcon
            aria-hidden="true"
            className={cn(
              "mt-[3px] size-3.5 shrink-0 text-muted-foreground/50 group-hover:text-foreground",
              open && "rotate-90 text-foreground",
            )}
          />
        </button>
        <button
          type="button"
          aria-pressed={starred}
          aria-label={starred ? `Remove star from "${node.title}"` : `Star "${node.title}" to revisit`}
          onClick={() => sheet.toggleStar(node)}
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded-md outline-none hover:bg-foreground/[0.07] focus-visible:ring-3 focus-visible:ring-ring/50",
            starred ? "text-sun" : "text-muted-foreground/40 hover:text-muted-foreground",
          )}
        >
          <StarIcon className="size-3.5" fill={starred ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      </div>

      {open && (
        <div
          id={panelId}
          className="mt-0.5 mb-2 ml-[17px] flex flex-col gap-3 border-l-2 border-primary/50 py-1 pr-2 pl-4 sm:ml-[18px]"
        >
          {node.detail && <p className="text-sm text-pretty text-foreground/85">{node.detail}</p>}
          {node.doneWhen && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-muted-foreground">Done when you have</p>
              <ul className="flex list-disc flex-col gap-0.5 pl-5 text-sm text-pretty text-foreground/85 marker:text-primary">
                {node.doneWhen.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}
          {node.links && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-muted-foreground">Learn from</p>
              <ResourceLinks links={node.links} />
            </div>
          )}
          <NoteEditor key={note ?? ""} node={node} saved={note ?? ""} />
        </div>
      )}
    </li>
  );
}

/** A private note on a row: how you would explain it, or what tripped you up. */
function NoteEditor({ node, saved }: { node: SheetNode; saved: string }) {
  const sheet = useSheet();
  const fieldId = useId();
  const [text, setText] = useState(saved);
  const [pending, start] = useTransition();
  const changed = text.trim() !== saved;

  const save = () => {
    if (!changed || pending) return;
    start(async () => {
      await sheet.writeNote(node, text);
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-xs font-medium text-muted-foreground">
        Your note
      </label>
      <Textarea
        id={fieldId}
        value={text}
        maxLength={NOTE_MAX}
        placeholder="Explain it in your own words, or note what to revisit."
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        className="min-h-14 bg-background"
      />
      <div className="flex items-center justify-between gap-2">
        <p className="tabular text-xs text-muted-foreground" aria-live="polite">
          {pending ? "Saving…" : changed ? "Not saved yet" : saved ? "Saved" : ""}
        </p>
        <Button size="sm" variant="outline" disabled={!changed || pending} onClick={save}>
          Save note
        </Button>
      </div>
    </div>
  );
}
