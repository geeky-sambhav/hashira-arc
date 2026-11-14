# Peak Engineer

The senior engineer sheet: a nested checklist of everything a top 1% systems engineer can explain, from first
principles. It works like a DSA sheet, but for systems. Sixteen subjects ("forms") are broken into topics, topics into
subtopics, and hard rows into smaller rows, so that when every box in a form is ticked you understand that subject.

It runs from the Linux shell through processes, runtimes, memory, storage, networking, containers, Firecracker microVMs,
databases, distributed systems, reliability, Kubernetes, inference serving and realtime voice, with two capstone builds
along the way.

"Hashira" means pillar. Each form is a pillar that fills as you tick its rows and stands when the form is complete.
Your overall progress climbs the ten corps ranks, Mizunoto to Kinoe, and reaches Hashira at 100%.

## What it does

- **The sheet**: every form, with its progress, on one page. Open a form to work through it.
- **Rows**: each row is one thing to understand (a concept) or one thing to make (a build, marked with a hammer).
  Open a row to see what "done" means, where to learn it, and the proof to produce for a build.
- **Checkboxes**: tick a row when you could teach it. Ticking a topic or subtopic ticks everything beneath it, with
  an Undo. Every level shows how many of its rows are done.
- **Stars and notes**: star a row to come back to it, and keep a private note on any row.
- **Filters**: show everything, only what is left to do, or only starred rows. Expand or collapse all groups; the app
  remembers which groups you left open.

There is no login. It is a single-user app: **do not deploy it publicly as it is**, because anyone with the URL could
change your data. To put it online, add authentication first (the Supabase auth helpers in `utils/supabase` and
`proxy.ts` are left in place for that) or put it behind your host's access protection.

## Setup

Requires [Bun](https://bun.sh) and a Supabase project.

```bash
bun install
cp .env.example .env.local   # then fill in the three values
```

Apply the database schema once:

```bash
supabase db push --db-url "<your DATABASE_URL>"
```

This runs every file in `supabase/migrations` that has not been applied yet. On a fresh database that leaves a single
table, `sheet_state`, with row level security on and no public access. If you used the earlier 52-week tracker, note
that `…_drop_tracker_tables.sql` **deletes its tables and all their data**.

Then run it:

```bash
bun dev --port 3210
```

Open <http://localhost:3210>.

If the app cannot reach the database, your network may not support IPv6, which Supabase's direct connection host
requires. Replace `DATABASE_URL` with the **session pooler** connection string from the Supabase dashboard
(Connect, then Session pooler).

## Commands

| Command | What it does |
|---|---|
| `bun dev` | Development server |
| `bun run build` | Production build. Needs no database: pages prerender the sheet and stream your ticks in |
| `bun test` | Unit tests: sheet validation, progress roll-up, ranks, the write queue |
| `bun run typecheck` | Type generation and `tsc` |
| `bun lint` | ESLint |
| `bun scripts/validate-section.ts <file>` | Validate one section file and print its size |
| `bun scripts/check-links.ts` | Request every resource link and report dead ones |
| `bun scripts/check-orphans.ts` | Find saved rows whose ID no longer exists in the sheet |

## How it is built

- **The sheet is code, your state is data.** Everything under `content/` is typed TypeScript with stable IDs.
  The database holds one row per checklist row you have ticked, starred or written a note on.
- **Only leaves are stored.** A row with nothing beneath it has a checkbox. Every topic's and form's progress is
  computed from the rows under it, so the numbers can never disagree.
- **Server-only database access** (`lib/db`) through `DATABASE_URL` with the `postgres` driver. The public Supabase key
  can read and write nothing.
- **One query per page.** `lib/db/sheet.ts` fetches your state in a single round trip, because the database may be
  hundreds of milliseconds away.
- **Next.js 16 with Cache Components.** The sheet's structure is the static shell; your ticks stream in under
  `<Suspense>`. Mutations are Server Functions in `lib/actions` with optimistic UI, and quick bursts of ticks are
  merged into one request (`lib/sheet/write-queue.ts`).
- **Pure logic is tested.** Everything in `lib/sheet` except the localStorage hook has no I/O.

```
app/              routes: the sheet (/) and one form (/sheet/[sectionId])
components/sheet/ the overview, the checklist tree, rows, and the sun, rank and pillar motifs
content/          the sheet: sections/, the DSL, types, validator
lib/actions/      server functions (mutations)
lib/db/           server-only reads
lib/sheet/        pure tree, state, rank and queue logic, with tests
supabase/         the schema migrations
scripts/          section, link and orphan checks
```

## Editing the sheet

Each form is one file in `content/sections/`, written with four helpers from `content/dsl.ts`:

```ts
export default section("networking", { title: "Networking", summary: "…" }, [
  topic("tcp", "Sockets and TCP", [
    topic("lifecycle", "Connection lifecycle", [
      concept("handshake", "The three-way handshake", undefined, {
        parts: [
          concept("steps", "SYN, SYN-ACK, ACK", "What you can explain once this is ticked."),
          concept("isn", "Why initial sequence numbers are unpredictable", "…"),
        ],
      }),
    ]),
    topic("build", "Build it", [
      build("tcp-go", "A TCP server and client", "The brief.", { doneWhen: ["An annotated capture"] }),
    ]),
  ]),
]);
```

- `topic()` groups rows. `concept()` is something to understand, `build()` something to make. Give a hard row `parts`
  to split it into smaller rows.
- Every row you can tick needs a `detail` saying what done means.
- A row's ID is the path of local IDs from its section down: `networking.tcp.lifecycle.handshake.steps`.

Add a new section to the list in `content/index.ts`, then run `bun test`. The validator checks IDs, nesting depth,
that every tickable row has a detail, and that links are well formed.

**Never rename or move a row once you have ticked it.** Its ID is its path, and your saved tick is keyed by that ID.
If you must, run `bun scripts/check-orphans.ts` afterwards to find the ticks that were left behind.

## The theme

The look follows the Hinokami Kagura: flame from ember to sun for progress, haori green for what is finished, and the
green-and-black ichimatsu check as thin bands. It is drawn entirely in CSS and SVG in `app/globals.css` and
`components/sheet/motifs.tsx`; the app ships no artwork.

## Agent skills

Claude Code skills live in `.claude/skills` and are tracked in `skills-lock.json`. Restore or update them with:

```bash
bunx skills experimental_install
bunx skills update
```
