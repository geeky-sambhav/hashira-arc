# Hashira Arc

A 52-week systems engineering roadmap, built as a personal tracker. It takes a fullstack engineer from the Linux shell
through processes, memory, storage, networking, containers, Firecracker microVMs, databases, distributed systems,
reliability, Kubernetes, inference serving and realtime voice, with three capstone projects along the way.

"Hashira" means pillar: the nine core subjects are shown as pillars that fill as you finish their work.

## What it does

- **Roadmap**: 18 phases, 47 modules and 228 items (readings with exact chapters, labs, projects), about 1,210 hours.
- **Progress**: mark each item to do, in progress, done or skipped.
- **Lab evidence**: every lab lists the proof to capture. Attach notes, pasted terminal output or links.
- **Review**: 313 quiz cards on a spaced-repetition schedule. Cards unlock when you start their module, a few per day.
- **Hours**: log study time against a weekly target; see your streak and whether you are ahead of or behind the plan.

There is no login. It is a single-user app: **do not deploy it publicly as it is**, because anyone with the URL could
change your data. To put it online, add authentication first (the Supabase auth helpers in `utils/supabase` and
`proxy.ts` are left in place for that) or put it behind your host's access protection.

## Setup

Requires [Bun](https://bun.sh) and a Supabase project.

```bash
bun install
cp .env.example .env.local   # then fill in the three values
```

Apply the database schema once. It creates six tables with row level security on and no public access:

```bash
supabase db push --db-url "<your DATABASE_URL>"
```

Then run it:

```bash
bun dev --port 3210
```

Open <http://localhost:3210> and press **Start week 1 today**.

If the app cannot reach the database, your network may not support IPv6, which Supabase's direct connection host
requires. Replace `DATABASE_URL` with the **session pooler** connection string from the Supabase dashboard
(Connect, then Session pooler).

## Commands

| Command | What it does |
|---|---|
| `bun dev` | Development server |
| `bun run build` | Production build. Needs no database: pages prerender their curriculum and stream your data in |
| `bun test` | Unit tests: curriculum validation, scheduler, review queue, pace and date math |
| `bun run typecheck` | Type generation and `tsc` |
| `bun lint` | ESLint |
| `bun scripts/check-links.ts` | Request every resource link and report dead ones |
| `bun scripts/check-orphans.ts` | Find database rows whose item or card ID no longer exists in the curriculum |

## How it is built

- **Curriculum is code, your state is data.** Everything under `content/` is typed TypeScript with stable IDs.
  The database holds only progress, evidence, time logs and card schedules.
- **Server-only database access** (`lib/db`) through `DATABASE_URL` with the `postgres` driver. The public Supabase key
  can read and write nothing.
- **One query per page.** `lib/db/snapshot.ts` fetches the whole of your state in a single round trip, because the
  database may be hundreds of milliseconds away.
- **Next.js 16 with Cache Components.** Curriculum markup is the static shell; your state streams in under `<Suspense>`.
  Mutations are Server Functions in `lib/actions` with optimistic UI.
- **Pure logic is tested.** `lib/srs.ts` (SM-2 style scheduler), `lib/review-queue.ts`, `lib/schedule.ts` and
  `lib/dates.ts` have no I/O.

```
app/          routes: dashboard, roadmap, item detail, review, hours, settings
components/   UI, grouped by page
content/      the curriculum: phases/, types, validator
lib/actions/  server functions (mutations)
lib/db/       server-only reads
lib/          pure scheduling and date logic, with tests
supabase/     the schema migration
scripts/      link and orphan checks
```

## Editing the curriculum

Edit the files in `content/phases/`. Then run `bun test`: the validator checks that IDs are unique, every week from 1 to
52 has work, weekly hours stay within budget, and links are well formed.

Two rules keep your saved progress attached to the right things:

- **Never rename an item, module or phase ID** once you have progress on it. If you must, add the old ID to
  `retiredIds` in `content/index.ts` so it is never reused, and run `bun scripts/check-orphans.ts`.
- **Add new quiz cards at the end of a module's list.** Card IDs come from the module ID and position.

## Agent skills

Claude Code skills live in `.claude/skills` and are tracked in `skills-lock.json`. Restore or update them with:

```bash
bunx skills experimental_install
bunx skills update
```
