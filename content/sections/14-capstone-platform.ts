import { build, concept, section, topic } from "../dsl";

export default section(
  "capstone-platform",
  {
    title: "Capstone 2: An agent sandbox control plane",
    summary:
      "A small version of what Runable, Emergent and Vorflux run: a multi-tenant API that hands out isolated sandboxes, runs durable agent tasks in them, meters usage and meets an SLO. You design it, build it from the pieces made in earlier sections, then limit it, measure it and attack it.",
    capstone: true,
  },
  [
    topic(
      "design-build",
      "Design and build",
      [
        topic("concepts", "Explain before you build", [
          concept(
            "problem",
            "What an agent sandbox platform has to do",
            "A tenant calls an API to get an isolated machine, runs commands and long agent tasks in it, and gives it back. The platform runs code nobody has reviewed, for many tenants, on shared hosts. So it must keep tenants apart, survive its own crashes without losing or duplicating work, cap what each tenant can use, and record usage accurately enough to bill.",
          ),
          concept(
            "planes",
            "Control plane and data plane",
            "The control plane decides and records (API, database, scheduling); the data plane runs workloads (the hosts and their sandboxes). Running sandboxes should keep working if the control plane is briefly down: nobody can create, delete or list, but nothing on the data plane may need the API or the database just to keep a sandbox alive.",
          ),
          concept("tenancy", "Tenant scoping", undefined, {
            parts: [
              concept(
                "scope",
                "Everything is scoped by tenant",
                "Every query and every resource: authentication resolves to a tenant ID, and all reads and writes filter on it, so one tenant can never name another's sandbox. The tenant ID comes only from the credential, never from the request body or path.",
              ),
              concept(
                "keys",
                "API keys and what a wrong ID returns",
                "Store only a hash of each API key, so a leaked database does not yield working keys; because keys are long random strings, a fast hash such as SHA-256 is enough, unlike for passwords. A sound design returns the same 404 for another tenant's sandbox as for one that does not exist, so the API never confirms that an ID is real. Unguessable IDs help, but the tenant filter is the control.",
              ),
            ],
          }),
          concept("reconcile", "Desired state and reconciliation", undefined, {
            parts: [
              concept(
                "desired-actual",
                "Desired state versus actual state",
                "The database holds what should exist; the hosts hold what does exist. An API call only changes the desired state, in one transaction, and returns. A reconciler loop then compares the two and creates, repairs or removes sandboxes until they match.",
              ),
              concept(
                "level-triggered",
                "Why the loop reads state instead of reacting to events",
                "A level-triggered reconciler acts on the difference it observes now, not on a 'sandbox created' message it might miss. A lost event or a crash half way through is repaired by the next pass, provided every action is safe to repeat: 'make sure sandbox X exists', not 'create a sandbox'. Naming the host-side sandbox after its row ID is what makes a repeated create find the existing one instead of starting a second.",
              ),
              concept(
                "orphans",
                "Orphans in both directions",
                "A crash at the wrong moment leaves a sandbox running that no row describes; a host dying leaves a row whose sandbox is gone. The reconciler must list both sides: it removes sandboxes the database does not know and marks rows failed when their sandbox has vanished. Otherwise the platform leaks capacity and bills for machines that do not exist.",
              ),
              concept(
                "snapshot-race",
                "Comparing two lists that change while you read them",
                "A row still in creating has no sandbox yet, and a sandbox started just after the database was read looks like an orphan. So the comparison skips rows in creating (their deadline handles them) and spares sandboxes younger than a grace period, or reads the hosts before the database, otherwise the reconciler destroys sandboxes that are being born.",
              ),
              concept(
                "one-actor",
                "Several replicas, one actor per sandbox",
                "With more than one control plane replica, two reconcilers can act on the same sandbox at once. Either elect a single active reconciler with a lease, as Kubernetes controllers do, or have each pass lock the rows it works on. A lease alone does not stop a paused former leader from acting late, so actions must still be safe to repeat and every state change must check the state it expects.",
              ),
            ],
          }),
          concept("lifecycle", "Sandbox lifecycle as a state machine", undefined, {
            parts: [
              concept(
                "states",
                "States and allowed transitions",
                "A sandbox is always in exactly one named state, for example creating, ready, deleting, deleted or failed, and only the listed transitions are legal. You can draw yours and say, for every state, what the client sees, what is running on the host, and whether the tenant is being charged.",
              ),
              concept(
                "guarded",
                "Transitions as conditional updates",
                "Each transition is one UPDATE that names the state it expects (`... SET state = 'deleting' WHERE id = $1 AND state = 'ready'`) and checks that a row changed. When a client's delete races the idle reaper (a background job that deletes unused sandboxes), exactly one wins and the other sees zero rows, instead of both running the teardown.",
              ),
              concept(
                "deletion",
                "Deletion is a state, not a single step",
                "Delete first records the intent by moving the row to deleting, then releases the sandbox, its network and its disk, and only then marks the row deleted. A crash in the middle leaves a row that still says deleting, so the reconciler finishes the job. A Kubernetes finalizer is the same idea.",
              ),
              concept(
                "timeouts",
                "Idle reclaim and stuck states",
                "Every state that waits on something needs a deadline. A sandbox with no activity past the idle timeout is moved to deleting by a reaper; one stuck in creating past its deadline is marked failed and cleaned up. Running commands and agent tasks must count as activity, or the reaper kills a sandbox in the middle of a long task. Without these deadlines, abandoned sandboxes hold capacity forever.",
              ),
            ],
          }),
          concept("warm-pool", "The warm pool", undefined, {
            parts: [
              concept(
                "claim",
                "Claiming a pre-started sandbox atomically",
                "Starting a sandbox takes longer than a caller wants to wait, so the platform keeps some already started and a create claims one. The claim must be atomic so that two concurrent creates never receive the same sandbox: in Postgres, a conditional update, or `SELECT ... FOR UPDATE SKIP LOCKED` to pick an unclaimed row without queueing behind other claimers. A pooled sandbox holds no tenant's data or credentials; everything tenant-specific is applied when it is claimed.",
              ),
              concept(
                "refill",
                "Refill, sizing and never reusing a sandbox",
                "The pool is desired state too: a loop starts replacements until the target size is met, and the size trades the cost of idle sandboxes against cold starts when demand bursts past it. A sandbox that has run a tenant's code is destroyed, never returned to the pool, because whatever it left behind would be handed to the next tenant.",
              ),
            ],
          }),
          concept("idempotency", "Idempotent mutations", undefined, {
            parts: [
              concept(
                "why",
                "Why a retry creates a duplicate",
                "A client whose request times out cannot tell whether the request was lost or only the response. If it retries a plain create, it would create and be billed for two sandboxes.",
              ),
              concept(
                "mechanism",
                "How an idempotency key works",
                "The client generates one unique key per logical operation and sends it on every attempt. The server stores the key with the result in the same transaction as the operation's effect, under a unique constraint per tenant, and returns the stored result for any repeat. Because create only writes desired state, the key and the sandbox row commit together and the reconciler does the slow work afterwards.",
              ),
              concept(
                "edges",
                "The edge cases of idempotency keys",
                "A repeat that arrives while the first attempt is still running must wait or get a conflict, not start a second operation. The same key with a different request body is an error. Keys are scoped to a tenant and can expire once no sensible client would still be retrying.",
              ),
            ],
          }),
          concept("isolation", "Choosing and enforcing the isolation boundary", undefined, {
            parts: [
              concept(
                "backend",
                "gVisor pods versus microVMs",
                "Weigh the isolation needed for untrusted code against cost and start time. MicroVMs put a hardware virtualization boundary and a guest kernel around each sandbox, but need KVM on the host (bare metal or nested virtualization) and memory for every guest. gVisor runs a user-space kernel that intercepts the sandbox's system calls; its default platform, systrap, needs no KVM, so it runs on ordinary cloud VMs, but system-call-heavy work runs slower and not every Linux feature is implemented. Plain containers share the host kernel, so a single kernel vulnerability can be an escape.",
              ),
              concept(
                "limits",
                "Limits are part of the sandbox, not an option",
                "Every sandbox gets a CPU and memory cap enforced by cgroups and a network policy that denies by default and allows only the public internet, so the cloud metadata address, private ranges and the host are unreachable, over IPv6 as well as IPv4. Caps on process count and disk close the remaining ways to exhaust a host. The control plane sets all of these itself and never takes them on trust from the request.",
              ),
            ],
          }),
          concept(
            "placement",
            "Placing sandboxes on hosts",
            "Something must choose a host for each sandbox. With gVisor pods the Kubernetes scheduler does it from each pod's resource requests; with Firecracker workers the control plane must track each host's free capacity and pick one itself. Either way the caps on a host should not add up to more than it has, unless you overcommit on purpose, and spreading a tenant across hosts limits what one host failure takes down.",
          ),
          concept("durable", "Durable agent tasks", undefined, {
            parts: [
              concept(
                "replay",
                "Why a task runs as a durable workflow",
                "An agent task runs for minutes and makes many LLM and tool calls, so a worker restart in the middle is normal. A durable workflow engine records each completed step in a persisted history; after a restart the workflow is replayed against that history and completed steps return their recorded results instead of running again.",
              ),
              concept(
                "determinism",
                "Workflow code must be deterministic",
                "Replay only works if the workflow code makes the same decisions in the same order every time it runs. So the current time, random numbers and every call with an effect, such as an LLM request or a command in the sandbox, go through the engine as recorded steps, never directly in workflow code; changing workflow code while old runs are in flight needs the engine's versioning support.",
              ),
              concept(
                "at-least-once",
                "Steps run at least once",
                "A step that finished just before the worker died, with its completion not yet recorded, is run again. Every step with a side effect therefore needs a timeout, a retry policy and an idempotent effect, for example a stable ID per step that the receiver can use to detect the repeat.",
              ),
              concept(
                "sandbox-loss",
                "The workflow is durable, the sandbox is not",
                "The engine preserves the task's progress, not the files and processes inside the sandbox. If the sandbox or its host dies mid-task, replaying the history does not bring its contents back. The workflow must detect the loss and either fail the task cleanly or start again in a new sandbox, and your design says which.",
              ),
            ],
          }),
          concept("streaming", "Streaming command output", undefined, {
            parts: [
              concept(
                "backpressure",
                "Stream with backpressure, do not buffer",
                "Long output reaches the client as a stream (server-sent events or chunked HTTP) with backpressure, not buffered entirely in memory. The server reads from the command only as fast as the client accepts bytes, so a slow client slows the command instead of growing the server's memory; if a stalled command is worse than a lost client, use a bounded buffer and disconnect clients that fall too far behind. In Go the handler must flush after each chunk, or the output sits in the response buffer, and a proxy in front must not buffer it either.",
              ),
              concept(
                "end",
                "Ending the stream and losing the client",
                "Once the response has started the status code is already sent, so the exit code and any late error must travel as a final event inside the stream; a stream that just closes means the connection broke. When the client disconnects, the Go request context is cancelled and the server does what the design says: kill the command or let it finish.",
              ),
            ],
          }),
        ]),
        topic("build", "Build it", [
          build(
            "design-doc",
            "Design doc",
            "Write the design before building: tenants and API keys, the sandbox lifecycle, which isolation backend and why (the Sandbox operator from Kubernetes and durable execution, or the Firecracker workers from the migration capstone), how agent tasks run durably, the data model, the SLOs, and the threat model from Containers, isolation and security applied to this system.",
            {
              doneWhen: ["A link to the design doc"],
              parts: [
                build(
                  "architecture",
                  "Architecture diagram and API",
                  "One diagram shows the API, the database, the workflow engine, the hosts and the sandboxes, with the line between control plane and data plane drawn. The doc lists every endpoint with its request, response, errors and idempotency behaviour, plus the sandbox state machine and the data model.",
                ),
                build(
                  "isolation-choice",
                  "Isolation choice with trade-offs",
                  "The doc names the backend, gives the reasons in terms of isolation strength, start time, density and operating cost, and states what you gave up by not choosing the other one.",
                ),
                build(
                  "slos-threats",
                  "SLOs and the threat model",
                  "Each SLO is written as an indicator, a target and a window, at least for sandbox creation latency and API availability. The threat model names the attackers, the assets and the trust boundaries, and for each attack path the control that is meant to stop it.",
                ),
              ],
            },
          ),
          build(
            "control-plane",
            "Control plane",
            "Build the API in Go with Postgres: create, list and delete sandboxes per tenant; run a command and stream its output; submit an agent task that runs as a durable workflow against a sandbox. Sandboxes come from a warm pool and are reclaimed when idle. Every mutating endpoint takes an idempotency key.",
            {
              doneWhen: ["A link to the repository", "A scripted run: create, exec, task, delete"],
              parts: [
                build(
                  "api",
                  "Tenant-scoped REST API with idempotent mutations",
                  "Create, list and delete work per tenant, and a request with another tenant's key cannot see or touch the sandbox. A test repeats each mutating call with the same idempotency key, including after the server is killed between commit and response, and ends with exactly one sandbox.",
                ),
                build(
                  "limits",
                  "Sandboxes with enforced CPU, memory and network policy",
                  "From inside a sandbox, a CPU burner is held at its cap, a process that allocates past the memory limit is killed, and requests to the metadata address, a private range and the host fail while a request to the internet succeeds.",
                ),
                build(
                  "reconciler",
                  "Reconciler that repairs drift",
                  "Kill the control plane between committing a row and starting its sandbox, remove a sandbox directly on the host, and start one the database does not know. The next reconciler passes repair all three without manual action, and a sandbox being created during a pass is not destroyed.",
                ),
                build(
                  "pool",
                  "Warm pool and idle reclaim",
                  "Create returns a pre-started sandbox and the pool refills to its target. Concurrent creates never receive the same sandbox, and a sandbox left idle past the timeout is deleted without anyone calling delete.",
                ),
                build(
                  "task",
                  "Agent task as a workflow that survives a worker restart",
                  "A submitted task runs its steps against a sandbox as a durable workflow (the LLM may be stubbed). Killing the workflow worker in the middle of a step and restarting it lets the task finish, with no completed step's effect applied twice.",
                ),
                build(
                  "stream",
                  "Streaming command output to the client",
                  "Output from a long command appears at the client as it is produced and ends with the exit code. The API server's memory stays flat while a slow client reads from a command that prints a large amount.",
                ),
              ],
            },
          ),
        ]),
      ],
      { detail: "Compose the pieces you already have into one multi-tenant system, with the design written down first." },
    ),

    topic(
      "operate",
      "Operate it",
      [
        topic("concepts", "Explain before you operate", [
          concept("noisy", "Noisy neighbours and fairness", undefined, {
            parts: [
              concept(
                "problem",
                "The noisy neighbour problem",
                "One tenant's load degrades others on shared resources: host CPU, disk and network, the warm pool, the database and the API itself. Mitigate with per-tenant limits, resource isolation and fair scheduling. CPU and memory caps do not divide everything: CPU caches, memory bandwidth and the host's disk and network queues stay shared unless limited separately, so placement matters too.",
              ),
              concept(
                "fairness",
                "Fair scheduling between tenants",
                "One shared first-come queue lets a tenant with a thousand queued creates starve everyone else. Serving tenants in turn, for example round-robin across per-tenant queues, makes a tenant's wait depend on its own backlog and the number of active tenants, not on how much others have queued. A bound on each tenant's queue turns the excess into fast rejections instead of unbounded waiting.",
              ),
            ],
          }),
          concept("concurrency", "Concurrent-sandbox limits", undefined, {
            parts: [
              concept(
                "race",
                "Why check-then-create is a race",
                "If the handler counts a tenant's sandboxes and then inserts a new one as two separate statements, parallel requests all read the same count, all pass the check and together exceed the limit. Wrapping the two in a transaction does not fix it at Postgres's default isolation level (read committed), because each transaction's count excludes the others' uncommitted inserts. Repeatable read allows it too (a write skew); only serializable detects it, by aborting one transaction for the client to retry.",
              ),
              concept(
                "atomic",
                "Check and increment atomically",
                "Check and increment atomically in the database (a conditional update or row lock), not with a read followed by a separate write. For example `UPDATE tenants SET active = active + 1 WHERE id = $1 AND active < max_active`: zero rows changed means the tenant is at its limit. At read committed, a second update of the same row waits for the first transaction to finish, then re-checks its WHERE clause against the committed row, so the limit holds. The same works with `SELECT ... FOR UPDATE` on the tenant row before counting, since every creator then queues on that lock.",
              ),
              concept(
                "release",
                "Giving the slot back exactly once",
                "The count changes in the same transaction as the sandbox's state: up in the transaction that creates the sandbox, down in the one that moves it to a terminal state, which the guarded transition lets happen only once. A decrement done as a separate step is lost when the process crashes between the two, and the tenant slowly loses quota to sandboxes that no longer exist. A periodic recount from the sandbox rows catches any drift.",
              ),
            ],
          }),
          concept("rate-limit", "Request rate limits", undefined, {
            parts: [
              concept(
                "token-bucket",
                "The token bucket",
                "Each tenant has a bucket that refills at a fixed rate up to a maximum; a request takes one token and is rejected when the bucket is empty. The refill rate sets the sustained request rate and the bucket size sets the burst allowed. With several API replicas, a bucket held in each replica's memory lets a tenant reach up to the replica count times the limit unless the state is shared.",
              ),
              concept(
                "reject",
                "What a limited client receives",
                "HTTP 429 with a Retry-After header, cheaply and early, before any expensive work: as soon as the tenant is known and before touching the sandbox tables or the pool. The body says which limit was hit, so a client can tell a rate limit from a concurrency limit.",
              ),
            ],
          }),
          concept("metering", "Usage metering that survives crashes", undefined, {
            parts: [
              concept(
                "events",
                "Meter from persisted events, not counters in memory",
                "Persist start and stop events (or periodic heartbeats) with unique IDs and compute usage from them: sandbox-seconds are the sum of stop minus start. A running total kept in the control plane's memory is gone the moment the process dies. A unique constraint on the event ID makes a retried write a no-op (`INSERT ... ON CONFLICT DO NOTHING`), so nothing is counted twice. Write each event in the same transaction as the state change it records, so the two can never disagree.",
              ),
              concept(
                "open-intervals",
                "Closing intervals after a crash",
                "A crash leaves sandboxes with a start and no stop. On restart, usage is reconciled against what actually ran: a sandbox still alive keeps accruing, and one that is gone is closed at the last time it was known to be running, such as its last heartbeat. The heartbeat interval bounds the error, and you can say whether your design over-counts or under-counts within it.",
              ),
            ],
          }),
          concept("slo", "SLOs under load", undefined, {
            parts: [
              concept(
                "indicators",
                "Choosing indicators for this platform",
                "An SLI is the share of good events, an SLO is its target over a window, and the error budget is one minus the SLO. Here the events users feel are sandbox creation (ready within a threshold), API requests (not a 5xx) and tasks (not failed by the platform). A reasonable design excludes a 429 sent to a tenant over its own limit, since that is the system working; a rejection caused by the platform running out of capacity while the tenant is under its limit is a failure and must count.",
              ),
              concept(
                "burn-rate",
                "Burn-rate alerts",
                "Burn rate is how fast the error budget is being consumed relative to the rate that would spend it exactly over the SLO window; a burn rate of 1 uses it up precisely at the window's end. The alert requires a high burn rate over both a long window, which proves the problem is significant, and a short one, which proves it is still happening.",
              ),
              concept(
                "knee",
                "Constant arrival rate and the capacity knee",
                "Send creates at a fixed rate that does not slow down when responses do, so stalls are not hidden. As the rate approaches what the system can serve, requests queue and tail latency rises sharply rather than in proportion. Raise the rate in steps until latency or errors breach the SLO: the last passing step is the capacity, and resource metrics show what saturated.",
              ),
              concept(
                "node-failure",
                "What killing a node during the test proves",
                "That in-flight work is retried or fails cleanly, capacity is replaced, and the SLO still holds or the alert fires. The one unacceptable result is a silent breach: the SLO missed and no alert.",
              ),
            ],
          }),
          concept("threat-model", "The security review and threat model", undefined, {
            parts: [
              concept(
                "attacker",
                "The attacker, the assets and the boundaries",
                "Assume a tenant who runs any code they like as root inside their sandbox, or an agent steered by injected instructions. The assets are other tenants' sandboxes and data, the control plane's database and credentials, the cloud credentials behind the metadata address, the host, and any secret placed inside the sandbox (such as the agent's LLM API key), which the code in it can always read. A trust boundary is every place where that code's bytes or packets meet something it does not own.",
              ),
              concept(
                "paths",
                "The attack paths to try",
                "Through the API: another tenant's sandbox ID, or input that the control plane pastes into a shell command on the host. Through the network: another sandbox's address, the metadata address 169.254.169.254, the database and other private ranges, the host's own ports, and the Kubernetes API with a mounted service account token. Through resources: a fork bomb, or filling memory or disk. Out of the platform: using the sandbox's internet access to attack or spam others from your addresses. Through the boundary itself: a kernel, gVisor or hypervisor escape.",
              ),
              concept(
                "depth",
                "What would have to fail for each attack to work",
                "For each path you can name the control that stops it and what would have to break: a missing tenant filter, a network rule that allows too much, a limit not applied, or a bug in the kernel, gVisor or the hypervisor. A path stopped by only one control is where to add a second, for example a database that sandboxes cannot reach and that also demands credentials they never hold.",
              ),
            ],
          }),
        ]),
        topic("build", "Build it", [
          build(
            "quotas",
            "Quotas and metering",
            "Add per-tenant concurrent-sandbox limits and a request rate limit that returns a clear 429. Record sandbox-seconds per tenant so the totals are still correct after you kill the control plane mid-run. Expose a usage endpoint.",
            {
              doneWhen: ["Output of concurrent requests hitting the limit", "Usage totals before and after a crash"],
              parts: [
                build(
                  "limits",
                  "Limits enforced under concurrent requests",
                  "Fire many more parallel creates than the tenant's limit allows: exactly the limit succeed, the rest get a clear error, and the count returns to zero once the sandboxes are deleted. Requests over the rate limit get a 429 with Retry-After.",
                ),
                build(
                  "metering",
                  "Metering that reconciles after a crash",
                  "Kill the control plane while sandboxes are running and some are being deleted, then restart it. The usage endpoint's sandbox-seconds per tenant match what actually ran, within the error bound you stated, with nothing counted twice and nothing still accruing for a sandbox that is gone.",
                ),
              ],
            },
          ),
          build(
            "slo-load",
            "SLO dashboard and load test",
            "Instrument with OpenTelemetry. Build a dashboard for your SLOs with a burn-rate alert. Load-test sandbox creation at a constant arrival rate, find the capacity knee, and kill a worker node during the test to see whether the SLO holds. This applies the SLO, tracing and load-testing methods from Reliability and observability to your own system.",
            {
              doneWhen: ["Latency versus load and the failure-test result"],
              parts: [
                build(
                  "dashboard",
                  "Dashboard and alert",
                  "The dashboard shows each SLI against its target and the error budget left, built from the OpenTelemetry metrics the service exports, and one create can be followed as a trace from the API to the host. The burn-rate alert fires when you inject errors or latency and clears after you stop.",
                ),
                build(
                  "capacity",
                  "Capacity number at the SLO",
                  "A graph of creation latency percentiles against arrival rate, the highest rate at which the SLO still holds stated as one number, and the resource that saturated first.",
                ),
                build(
                  "node-failure",
                  "Result of the node-failure test",
                  "A worker node is killed during a steady load below capacity. The record shows what happened to in-flight creates and tasks, how long replacement capacity took, and whether the SLO held or the alert fired.",
                ),
              ],
            },
          ),
          build(
            "security",
            "Security review",
            "Attack your own platform as a malicious tenant: reach another tenant's sandbox, the metadata address, the control plane's database, the node. Fix what you find and record what the isolation boundary would have to fail for each attack to work.",
            {
              doneWhen: ["A note of the attacks tried, outcomes and fixes"],
              parts: [
                build(
                  "attacks",
                  "A list of attempted attacks with results",
                  "Each attempt is written down with the exact command or request, what you expected and what happened. The list covers at least another tenant's sandbox, the metadata address, the control plane's database, the node and, for pods, the Kubernetes API, and says for each what would have to fail for it to succeed.",
                ),
                build(
                  "fixes",
                  "Fixes for anything that worked",
                  "Every attack that succeeded has a fix in the repository and a rerun showing it now fails. If nothing worked, the note says which control stopped each attempt.",
                ),
              ],
            },
          ),
          build(
            "writeup",
            "README and write-up",
            "Document the architecture, decisions, measurements and limits. Publish a post. Together with the migration capstone this is what you show in an interview or a work trial.",
            {
              doneWhen: ["A link to the post"],
              parts: [
                build(
                  "readme",
                  "README with decisions and numbers",
                  "The README has the architecture diagram, each major decision with the alternative you rejected, the measured numbers (warm versus cold create time, capacity at the SLO, the failure-test result) and an honest list of what the system does not handle.",
                ),
                build(
                  "post",
                  "Published post",
                  "A public post that a reader who has not seen the repository can follow: what you built, the hardest problem and how you solved it, and the measurements.",
                ),
              ],
            },
          ),
        ]),
      ],
      { detail: "Limits, numbers and a security review: what it takes to run the platform for other people." },
    ),
  ],
);
