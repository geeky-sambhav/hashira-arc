import { build, concept, link, section, topic } from "../dsl";

const FC_DOCS = "https://github.com/firecracker-microvm/firecracker/blob/main/docs";
const FC_SNAPSHOTS = link("Firecracker snapshot support", `${FC_DOCS}/snapshotting/snapshot-support.md`);

export default section(
  "capstone-migration",
  {
    title: "Capstone 1: Firecracker live migration",
    summary:
      "The take-home that started this. Move a running microVM between two workers while a client stays connected, with one copy alive at the end and a clean rollback if anything fails.",
    capstone: true,
  },
  [
    topic(
      "design",
      "Design and control plane",
      [
        topic("concepts", "Explain before you build", [
          concept("goal", "What live migration has to guarantee", undefined, {
            parts: [
              concept(
                "why",
                "Why move a running VM",
                "A host has to be emptied for maintenance, a kernel or Firecracker upgrade, or rebalancing, and the workloads on it should not notice. Migration moves the VM's whole state to another host instead of restarting it, so the processes and memory inside the guest carry on from where they were.",
              ),
              concept(
                "invariants",
                "The invariants every step must keep",
                "At every moment at most one copy of the VM is running. At the end exactly one copy exists and the system knows which worker owns it. The client's address and connection do not change. A migration that fails before ownership passes leaves the VM running on the source with nothing left on the destination. Every migration reaches succeeded or failed, with a reason, within a bounded time; anything still to tidy up afterwards is recorded and retried in the background.",
              ),
            ],
          }),
          concept("components", "The components and what each one owns", undefined, {
            parts: [
              concept(
                "roles",
                "Control API, workers, proxy and guest agent",
                "The control API takes requests, decides what happens and records it. Each worker runs VMs on one host and carries out the control API's commands. The proxy holds client connections on a stable address and forwards to the worker that currently runs the VM. An agent inside the guest (or SSH) runs commands and writes files, because Firecracker's API controls the VM and knows nothing about what is inside it.",
              ),
              concept(
                "source-of-truth",
                "One source of truth for ownership",
                "Exactly one durable record says which worker owns each sandbox, and it lives with the control API. Workers and the proxy act on what they are told and never decide ownership from their own local view, because a local view can be stale.",
              ),
              concept(
                "worker-resources",
                "What a worker holds for one sandbox",
                "A Firecracker process with its jail directory, cgroup and API socket, a TAP device, a network namespace with its veth pair and NAT rules, the disk image, and any snapshot files. You can list all of them from memory, because create, migrate and cleanup each have to account for every one.",
              ),
            ],
          }),
          concept("state-machine", "The migration as an explicit state machine", undefined, {
            parts: [
              concept(
                "states",
                "States, transitions and triggers",
                "A migration is always in exactly one named state (for example pending, preparing, paused, snapshotted, transferred, loaded, committed, resumed, cut over, cleaning up, done, rolling back and failed), and each transition has one trigger: a step succeeding, failing or timing out. Writing them down shows every place the system can be standing when something breaks.",
              ),
              concept(
                "persisted",
                "Why the state is persisted to disk",
                "After a crash the controller can read the last recorded state and decide to roll back or continue, instead of guessing from side effects. For that to work the controller records that a step is starting before it starts it, and records the result after.",
              ),
              concept(
                "unknown",
                "A timeout means unknown, not failed",
                "When a call to a worker times out, or the controller crashed in the middle of a step, the work may be done, still running, or never started. The next move must be correct in all three cases: retry a call that is safe to repeat, ask the worker for its current state, or make sure the other side can never act on the old state (fencing, below).",
              ),
            ],
          }),
          concept("idempotency", "Idempotency of every API call", undefined, {
            parts: [
              concept(
                "key",
                "Idempotent operations and idempotency keys",
                "An operation is idempotent when repeating it has the same effect as doing it once. Clients and SDKs retry after timeouts, so 'start migration' accepts a client-supplied idempotency key stored with the migration it created: a retry with the same key returns that migration, and the same key with different parameters is rejected. Deduplicating on sandbox and destination alone would also swallow a legitimate later migration to the same worker.",
              ),
              concept(
                "single-flight",
                "One migration per sandbox at a time",
                "A second identical request while one is running returns the in-progress migration rather than starting another, and two migrations of the same sandbox never run concurrently. The check and the creation of the migration record must be one atomic step, or two simultaneous requests both pass the check.",
              ),
              concept(
                "steps",
                "Idempotent steps inside the migration",
                "Every command the controller sends to a worker or the proxy is safe to repeat: preparing a TAP that already exists as asked succeeds, deleting files that are already gone succeeds, and repointing the proxy to the upstream it already has changes nothing. Firecracker's own calls are not all repeatable (a snapshot load works once per process, and a failed one ends the process), so the worker reads the VM's state first (GET / reports Not started, Running or Paused) and skips a step already done. This is what lets crash recovery re-run the step it was in.",
              ),
              concept(
                "other-calls",
                "Other calls during a migration",
                "A command, file write or port change for a sandbox whose VM is paused mid-migration cannot reach the guest. The design says what each call does then: wait for the migration to end, or fail at once with a retryable conflict error. A delete either waits or cancels the migration through its rollback path, never racing it.",
              ),
              concept(
                "operation",
                "A long operation as a resource",
                "Starting a migration returns at once with a migration ID while the work continues in the background. GET on that ID reports the current phase, bytes moved, and the final result with a reason on failure, so a client that lost its connection can still find out what happened.",
              ),
            ],
          }),
          concept("fencing", "Fencing: a stale source must never resume", undefined, {
            links: [
              link(
                "How to do distributed locking",
                "https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html",
              ),
            ],
            parts: [
              concept(
                "timeouts",
                "Why a timeout does not prove death",
                "'The source timed out, so it is dead' is not safe. A slow or paused process is indistinguishable from a dead one, and it can wake up later and act on stale beliefs unless the system actively fences it.",
              ),
              concept(
                "two-copies",
                "What two running copies would do",
                "Both copies continue from the same memory, so they share one identity, the same in-memory secrets and random number generator state, and the same guest address. They then diverge, and nothing can merge them afterwards. This is the failure the whole design exists to prevent.",
              ),
              concept(
                "token",
                "Fencing tokens",
                "A fencing token is a number that increases every time ownership changes. The protected resource rejects any request carrying an older number, so a paused or partitioned former owner cannot act. The check sits at the resource because the former owner cannot be trusted to know it is stale.",
              ),
              concept(
                "epoch",
                "The ownership epoch in this system",
                "Each sandbox has an epoch stored with its ownership record. A migration increases it, when ownership passes to the destination, with one conditional write that succeeds only if the epoch is still the one it read. Every command to a worker and every proxy repoint carries the epoch and the migration ID, and a receiver refuses anything older than the newest it has recorded, which also stops a delayed command from an earlier migration. No worker resumes a VM on its own, not even after a restart: only on a controller command, sent only when the recorded decision allows it.",
              ),
              concept(
                "kill-vs-token",
                "Killing the source versus fencing it",
                "Destroying the source Firecracker process is the strongest fence, but it needs the source worker to be reachable. Until then the epoch keeps a stale copy away from clients: the proxy refuses an old upstream, and the paused source gets no resume command. A partitioned worker has not seen the new epoch, so its own check cannot help, and a copy that did run could still reach the outside through its host's NAT, which no epoch check covers. So the source is killed, or its network path removed, as soon as it is reachable.",
              ),
            ],
          }),
          concept("direction", "Roll back or roll forward", undefined, {
            parts: [
              concept(
                "source-kept",
                "Why the source is kept until the end",
                "Taking a snapshot does not destroy the VM: the source stays paused with its memory, disk and network intact and can be resumed with one API call. Nothing on the source is deleted until the destination is running and the source is fenced, so rollback is 'delete the destination's copy and resume the source'. The snapshot files are deleted on rollback too: once the source has resumed, loading them would run the same state twice.",
              ),
              concept(
                "point-of-no-return",
                "The point of no return",
                "A migration stops being reversible once the destination VM has resumed, because the destination has then executed and holds state the source lacks. Before that, rollback is to resume the source. After it, the only safe direction is forward: fence the source.",
              ),
              concept(
                "commit",
                "Recording the decision before acting on it",
                "The ownership change (new owner, new epoch) is written durably, as one conditional write, after the destination has loaded the snapshot and before it is told to resume. A crash on either side of that write is then unambiguous: without the record, recovery rolls back; with it, recovery rolls forward. The conditional write also means a commit and a rollback decision for the same migration can never both be recorded.",
              ),
              concept(
                "failure-table",
                "The failure table",
                "For every step you list what can fail there, how it is detected, the recovery, and which worker owns the VM afterwards. If any row's final owner is 'unknown' or 'both', the design is not finished.",
              ),
            ],
          }),
        ]),
        topic("build", "Build it", [
          build(
            "design-doc",
            "Design doc: the migration state machine",
            "Before coding, write the design: components (two workers, control API, proxy), the migration as an explicit state machine, what state moves and how, idempotency of every API call, and a failure table listing each step, what can fail there, and whether you roll back or roll forward.",
            {
              doneWhen: ["Link to the design doc"],
              parts: [
                build(
                  "state-diagram",
                  "State diagram with every transition and its trigger",
                  "The diagram names every state, including failed and the rollback path, and every arrow is labelled with the event that causes it. No state lacks a way out.",
                ),
                build(
                  "failure-table",
                  "Failure table: step, failure, detection, recovery, final owner",
                  "One row per step and failure, each stating how the failure is detected, whether you roll back or roll forward, and which worker owns the VM afterwards. No row ends with an unknown owner.",
                ),
                build(
                  "fencing",
                  "Fencing design: how a stale source is prevented from resuming",
                  "The doc says where the epoch is stored, when it increases and which components check it. It walks through a source worker that was paused or partitioned and wakes after cut-over, and shows why it cannot resume its copy or receive client traffic.",
                ),
                build(
                  "api",
                  "API semantics: idempotency keys, repeated requests, progress",
                  "For each endpoint the doc states what a retry does, what a second migration request returns while one is running and after it has finished, and which phases and counters the progress endpoint reports.",
                ),
              ],
            },
          ),
          build(
            "control-plane",
            "Two workers, a control API and a TypeScript SDK",
            "Build the system without migration first. Each worker manages its own Firecracker processes, working directories, API sockets, TAP devices and network namespaces. An HTTP API creates sandboxes, runs commands and writes files in the guest (via an agent or SSH), exposes ports and reports state. A TypeScript SDK wraps it. Reuse the Firecracker API client and the jailer setup from Virtualization and Firecracker.",
            {
              doneWhen: ["Link to the repository", "SDK script creating a sandbox and starting the counter server"],
              links: [link("Firecracker getting started", `${FC_DOCS}/getting-started.md`)],
              parts: [
                build(
                  "setup",
                  "make setup and make local-up with no manual assembly",
                  "From a clean checkout, `make setup` prepares the kernel and rootfs and `make local-up` starts both workers and the control API. Nobody assembles a kernel, rootfs or TAP device by hand.",
                ),
                build(
                  "api",
                  "Sandbox API: create, commands, files, ports and get",
                  "POST /v1/sandboxes creates a VM on a worker, and further endpoints run a command in the guest, write a file, expose a guest port and return the sandbox's state. Retrying a create with the same idempotency key does not start a second VM.",
                ),
                build(
                  "sdk",
                  "TypeScript SDK matching the brief's shape",
                  "A typed client wraps every endpoint with the method names and shapes the take-home brief asks for, with timeouts and typed errors. A script that uses only the SDK creates a sandbox and starts the counter server.",
                ),
                build(
                  "two-workers",
                  "Two isolated workers on one machine",
                  "Each worker has its own data directory, sockets, network namespaces and address range, and only a network connection links them: neither reads the other's files by path. Stopping one worker leaves the other's sandboxes running.",
                ),
              ],
            },
          ),
        ]),
      ],
      {
        detail:
          "Decide the semantics before writing the migration: who owns a sandbox, what each API call promises, and what happens when a step fails.",
      },
    ),

    topic(
      "migrate",
      "The migration",
      [
        topic("concepts", "Explain before you build", [
          concept("sequence", "The steps in order", undefined, {
            parts: [
              concept(
                "steps",
                "The snapshot-based migration sequence",
                "While the VM still runs: check the destination is reachable, compatible and has space, and prepare its directories, namespace, TAP and NAT. Then pause the source, create a full snapshot, copy and verify the state file, memory file and disk, load the snapshot on the destination, record the ownership change, resume the destination, health-check it, repoint the proxy, and fence and clean up the source.",
              ),
              concept(
                "load-vs-resume",
                "Load and resume are separate steps",
                "Loading a snapshot into a new Firecracker process leaves the VM paused unless the load request sets resume_vm. Keeping the two apart gives a destination that is fully loaded but has not executed, which is the last state from which rollback is still clean, and the ownership commit goes exactly between them.",
              ),
            ],
          }),
          concept("state", "What state moves and what is rebuilt", undefined, {
            links: [FC_SNAPSHOTS],
            parts: [
              concept(
                "snapshot-files",
                "The snapshot: a state file and a memory file",
                "A full Firecracker snapshot, as in snapshots from Virtualization and Firecracker, is a state file with vCPU and emulated device state and a memory file with guest RAM. The VM must be paused to create it, and it can only be loaded into a fresh Firecracker process that has not yet been given a VM configuration or booted.",
              ),
              concept(
                "disk",
                "The disk is not in the snapshot",
                "Firecracker saves no disk contents, so the disk image is copied separately, during the same pause and after the snapshot call, which drains and fsyncs the drive's backing file. A running guest keeps writing, including from its own page cache, so a disk copied while it runs would not match the memory snapshot. On the destination the image must be at the path the snapshot recorded (relative to the jail when you use the jailer).",
              ),
              concept(
                "rebuilt",
                "What is rebuilt on the destination",
                "The Firecracker process, API socket, network namespace, TAP device and NAT rules are host-side objects that do not travel. The destination creates them fresh, with the TAP name the snapshot expects (or one given in the load call's network_overrides) and the same gateway address, so the guest's network configuration, which came across in memory, is still valid. The same-inner-IP arrangement from Networking is what makes this possible.",
              ),
              concept(
                "tap-mac",
                "Keeping the guest's neighbour cache valid",
                "The guest's ARP cache maps the gateway address to the old TAP's MAC address, and a new TAP gets a random one, so the host drops the guest's frames, addressed to the old MAC, until the guest's entry times out and is resolved again. Giving the new TAP the old MAC avoids that gap; Firecracker's clone guide instead flushes the neighbour table inside the guest, or waits out the cache timeout.",
              ),
              concept(
                "vsock",
                "Vsock connections do not survive a snapshot",
                "Firecracker resets the vsock device when it creates a snapshot, and the guest closes every open vsock connection when it next runs: on the destination, and on the source after a rollback too. Listening sockets survive, so a guest agent reached over vsock must be reconnected after every migration attempt.",
              ),
            ],
          }),
          concept(
            "checksums",
            "Checksums and staging for transferred files",
            "A truncated or corrupted memory file restores into a VM that crashes later in confusing ways. Verifying a checksum and length before restore turns that into a clean, retryable failure. Receive each file under a temporary name in a directory named after the migration, and rename it into place only once it has verified.",
          ),
          concept("cutover", "The proxy cut-over", undefined, {
            parts: [
              concept(
                "stable-address",
                "Why the client never sees the move",
                "The client's TCP connection ends at the proxy from Networking, not at the VM. The proxy's upstream connection went through the source host's address and NAT state, which do not move, so it cannot follow the VM. The proxy opens a new connection to the restored VM, the server in the guest continues the stream on it, and the client sees a gap and nothing else.",
              ),
              concept(
                "pause-silent",
                "A paused VM is silent, not disconnected",
                "Pausing sends no FIN or RST, so the proxy's connection to the source guest stays open and idle. If the migration rolls back and the source resumes before any timeout expires, that same connection carries on. This is why the proxy keeps its old upstream until it is told to switch.",
              ),
              concept(
                "order",
                "When to repoint",
                "Repoint only after the destination has resumed and passed its health check, and send the repoint with the new epoch so a delayed repoint from an older migration is refused. Repointing earlier sends clients to a VM that may never start. The repoint also closes the proxy's old upstream connections to the source, so a source copy that wrongly ran again could not reach the client.",
              ),
              concept(
                "seam",
                "What the stream looks like at the seam",
                "Bytes still in flight on the old upstream connection when the VM paused can be lost, the last event on it can arrive cut short, and the new connection starts wherever the server starts it. A byte-level proxy cannot hide this for an arbitrary protocol. Here every event carries the counter value, so the client can tell exactly which events were missed or repeated at the seam, and that the counter itself never reset.",
              ),
            ],
          }),
          concept("measure", "Proving it and measuring it", undefined, {
            parts: [
              concept(
                "proof",
                "Migrated, not restarted",
                "The guest's boot ID and the server's PID are unchanged and an in-memory counter continues without resetting. The boot ID is a random value the Linux kernel generates at each boot (/proc/sys/kernel/random/boot_id), so it catches a guest reboot; the PID and the counter catch a restart of the server process.",
              ),
              concept(
                "pause-time",
                "What makes up pause time",
                "Snapshot creation, transferring and verifying memory and disk, and restore. A full snapshot's memory file is a dump of every guest page, so pause time grows with guest memory and disk size; production systems keep a shared base image on every host so only a writable layer moves, and use diff snapshots or lazy loading for memory. Work done before the pause, such as preparing the destination's namespace and TAP, does not count towards it.",
              ),
              concept(
                "downtime",
                "The number the user feels",
                "Report the longest gap between events on the client's stream as the user-visible downtime. It includes pause time, the destination's health check and the proxy's reconnection, and is what a user actually experiences.",
              ),
              concept(
                "approaches",
                "Stop-and-copy, pre-copy and post-copy",
                "This capstone is stop-and-copy: pause, move everything, resume. Pre-copy sends memory while the VM runs and re-sends the pages it dirties, pausing only for the last few. Post-copy resumes on the destination at once and fetches pages on first touch, which shortens the pause but leaves the VM dependent on the source until every page has arrived.",
              ),
            ],
          }),
        ]),
        topic("build", "Build it", [
          build(
            "proxy",
            "Stable client address",
            "Put your repointable proxy from Networking in front of the guest port. The external client connection must stay open through a migration; the proxy opens a new internal connection to the restored VM and resumes the stream.",
            {
              doneWhen: ["One long-lived client stream surviving a backend switch"],
              parts: [
                build(
                  "integrated",
                  "Proxy integrated with the control API's port exposure",
                  "Exposing a guest port through the API returns an address on the proxy, and the control API sets and changes that port's upstream. Clients never learn a worker's address.",
                ),
                build(
                  "gap",
                  "Measured stream gap reported per migration",
                  "For every backend switch the longest gap between events on the client stream is measured and reported with that migration's result.",
                ),
              ],
            },
          ),
          build(
            "migration",
            "Migrate a running VM from worker A to worker B",
            "Implement POST /v1/sandboxes/:id/migrations: prepare the destination's namespace and TAP, pause, full snapshot, transfer state, memory and disk with checksums, load in a new Firecracker process, commit the new owner and epoch, resume, health-check, repoint the proxy, then fence and clean up the source. Report progress and bytes moved through GET .../migrations/:id and the SDK's watch().",
            {
              doneWhen: [
                "Output of the automated demo run",
                "Event stream showing boot_id, pid and counter across the migration",
              ],
              links: [FC_SNAPSHOTS],
              parts: [
                build(
                  "continuity",
                  "Counter, PID and boot ID continuous across the move",
                  "The client's event stream shows the same boot ID and server PID before and after the migration, and the counter carries on without resetting or going backwards.",
                ),
                build(
                  "one-copy",
                  "Exactly one live copy after cut-over; source fenced by epoch",
                  "After cut-over the source Firecracker process is gone and only the destination copy runs. A command carrying the old epoch, such as a resume sent to the source worker or a proxy repoint back to it, is refused, and the demo shows the refusal.",
                ),
                build(
                  "demo",
                  "Automated demo with time, pause, longest gap and bytes moved",
                  "One command creates a sandbox, starts the counter server, opens a client stream, migrates the VM and prints total migration time, VM pause time, the longest event gap and bytes moved. It needs no manual steps.",
                ),
                build(
                  "progress",
                  "Progress phases observable through the API",
                  "While a migration runs, GET on the migration and the SDK's watch() show each phase as it is entered and the bytes moved so far, then the terminal result with a reason on failure.",
                ),
              ],
            },
          ),
        ]),
      ],
      { detail: "Pause, snapshot, copy, restore, repoint, fence: one VM moved while its client stays connected." },
    ),

    topic(
      "harden",
      "Failure, real hosts and the write-up",
      [
        topic("concepts", "Explain before you build", [
          concept("inject", "Failure injection", undefined, {
            parts: [
              concept(
                "why",
                "Why failures are injected, not awaited",
                "Recovery code runs only when something breaks, so without injection it is the least tested code in the system. Forcing each failure on purpose, in an automated test, is the only way to know the rollback path works before a real failure depends on it.",
              ),
              concept(
                "how",
                "Ways to inject a failure",
                "A named failpoint in the controller or worker that makes one chosen step fail, hang or crash; killing a worker, the controller or a Firecracker process with SIGKILL; and cutting or degrading the network between workers with nftables or `tc netem` from Networking. Each test names the step and the kind of failure.",
              ),
              concept(
                "assert",
                "What every failure test asserts",
                "The migration reached a terminal state with a reason; exactly one copy of the VM is running and the ownership record names its worker; the client stream is still open and the counter never reset; and no process, namespace, TAP or file is left over. The same checks run after every case.",
              ),
            ],
          }),
          concept("cases", "The failure cases and the right outcome of each", undefined, {
            parts: [
              concept(
                "before-pause",
                "Destination unavailable",
                "If the destination is unreachable before the snapshot is taken, fail the migration early without pausing the VM; nothing needs rolling back. This is why reachability, capacity and compatibility are checked before the pause.",
              ),
              concept(
                "mid-transfer",
                "Transfer interrupted midway",
                "The VM is paused and the destination holds partial files. Record the decision to roll back and resume the source first, since every second is downtime; then delete the partial files and the snapshot files (the destination's reconciler removes them later if it is unreachable) and record the migration as failed. The checksum and length check make sure a truncated file is never loaded. A bounded number of transfer retries first is a valid choice, but the VM stays paused while they run.",
              ),
              concept(
                "restore-fails",
                "Restore fails on the destination",
                "When a snapshot load fails, Firecracker reports the error and the process exits. Record the rollback, resume the source VM and keep the proxy pointed at it, then remove the destination's leftover files and network objects and record the migration as failed with the reason.",
              ),
              concept(
                "health-check",
                "A health check that fails after resume",
                "The destination has executed and the ownership change is recorded, so this is past the point of no return. Going back is safe only if nothing the destination did escaped it: the proxy never pointed at it, its outbound traffic was blocked until the check passed, and its disk copy is thrown away. Otherwise both copies have acted on the same random values and identifiers. Going back is a second ownership change with its own new epoch, not an undo. Decide which way you go, write it in the failure table, and test it.",
              ),
              concept(
                "after-commit",
                "Failures after the point of no return",
                "If the proxy repoint, the fence or the source cleanup fails once the destination owns the VM, the migration does not roll back. The controller retries those steps with backoff, which is safe because each one is idempotent. If one still has not succeeded by the deadline, the migration ends with the destination as owner and the unfinished step recorded for a background reconciler, never by moving ownership back.",
              ),
              concept(
                "dest-lost",
                "Destination lost after it has served clients",
                "The paused source is now an older checkpoint, not a copy: resuming it rewinds the guest, loses everything the destination did, and can repeat outputs and random values clients have already seen. Either declare the VM lost, or restore from that checkpoint as a deliberate, reported recovery with a new epoch; never present it as a rollback.",
              ),
              concept(
                "source-lost",
                "Source worker unreachable mid-migration",
                "If contact is lost before the snapshot has been verified on the destination, the migration rolls back: the decision is recorded and the resume is sent once the worker answers again, so the VM stays paused until then. If it is lost after, rolling forward is safe, because the paused source resumes only on a controller command and the proxy refuses it; the source is killed when its worker returns.",
              ),
              concept(
                "controller-crash",
                "Controller crash mid-migration",
                "No worker resumes a VM on its own, so the source stays paused and downtime grows until the controller is back. On restart it reloads every unfinished migration, asks the workers what actually exists, and finishes each one: roll back if the ownership change was not recorded, roll forward if it was. If more than one controller instance can run, each migration needs a lease, with its own fencing token, so only one drives it.",
              ),
              concept(
                "round-trip",
                "A to B to A while the workload runs",
                "Migrating back catches whatever the first migration left behind: a stale TAP or namespace on A, old snapshot files picked up by mistake, an epoch that did not advance, or a proxy still holding an old upstream. Every migration uses fresh paths named after its own ID.",
              ),
            ],
          }),
          concept("cleanup", "Cleanup and orphans", undefined, {
            parts: [
              concept(
                "inventory",
                "What cleanup removes after a successful migration",
                "The source Firecracker process, its jail directory, cgroup, API socket, TAP device, namespace with its veth pair and NAT rules, snapshot files and disk image, and the destination's temporary transfer files. One caution: with the File memory backend Firecracker maps the memory file privately and loads pages from it on first touch, so the file the destination VM was restored from must stay in place, unchanged, for as long as that VM runs. A later snapshot of that VM must go to a new path, because snapshot creation truncates and overwrites existing files.",
              ),
              concept(
                "reconcile",
                "Reaping orphans after a crash",
                "A crash between creating a resource and recording it leaves an orphan that no record points to. On startup and periodically, each worker compares what exists (Firecracker processes, namespaces, TAPs, cgroups, directories) with what the control API says it should hold, and removes the rest, leaving alone anything that belongs to a migration that has not finished. It never resumes anything it finds. That only works if every resource is named after its sandbox or migration ID.",
              ),
            ],
          }),
          concept("hosts", "What changes on real hosts", undefined, {
            parts: [
              concept(
                "bandwidth",
                "Pause time is bounded by the link",
                "With stop-and-copy the VM is paused for at least the bytes moved divided by the link's throughput. A 1 Gbit/s link carries at most about 125 MB per second, so every gigabyte of memory and disk costs at least 8 seconds of pause before snapshot and restore time are added. On one machine this cost was hidden.",
              ),
              concept(
                "compat",
                "Compatibility between source and destination",
                "Firecracker supports restoring a snapshot only on a software and hardware configuration identical to the one it was taken on: in practice the same Firecracker version, the same host kernel version, and the same CPU model or a CPU template that hides the differences. The guest saw the source's CPU features when it booted and keeps using them, which is why the two rented hosts are the same instance type. It also means hosts are upgraded by moving VMs onto matching hosts first, not by migrating across versions.",
              ),
              concept(
                "secrets",
                "A memory file holds every secret in the guest",
                "The memory file contains the guest's keys, tokens and user data unencrypted. Between real hosts the transfer must be encrypted with both ends authenticated (mutual TLS from Networking), and snapshot files must not outlive the migration.",
              ),
              concept(
                "regions",
                "Hosts in different regions",
                "Transfer time dominates, so compress and send less (diff snapshots, lazy memory); the client address needs global routing or DNS; and CPU, kernel and Firecracker compatibility must be enforced across fleets.",
              ),
            ],
          }),
        ]),
        topic("build", "Build it", [
          build(
            "failures",
            "Failure and repetition tests",
            "Automate the cases the take-home brief says will be tested: destination unavailable, transfer interrupted midway, restore fails, a repeated migration request, and A to B to A while the workload is active. In every failure before the ownership change the source must resume, and no orphan processes, TAPs or files may remain.",
            {
              doneWhen: ["Test run output", "A note on the two most interesting bugs you found and their fixes"],
              parts: [
                build(
                  "make-test",
                  "make test runs all failure cases unattended",
                  "One command runs every case from a clean state, injects each failure itself, and exits non-zero if any case fails. Nobody watches or intervenes.",
                ),
                build(
                  "rollback",
                  "Rollback resumes the source VM with the client stream intact",
                  "In each failure before the ownership change the source VM is running again afterwards, the client's connection never closed, the PID and boot ID are unchanged, and the counter carried on without resetting.",
                ),
                build(
                  "cleanup",
                  "Cleanup verified: no leftover processes, namespaces or files",
                  "Before and after every case, success or failure, the tests list Firecracker processes, network namespaces (`ip netns list` for named ones), TAP and veth devices (`ip link`), the VMs' cgroups and the files under each worker's data directory, and fail on any difference.",
                ),
                build(
                  "crash-points",
                  "Stretch: controller killed at every step",
                  "A test kills the controller with SIGKILL at each step of the state machine in turn, restarts it, and checks the same assertions: the migration finishes or rolls back according to whether the ownership change was recorded, with one live copy and nothing left over.",
                ),
              ],
            },
          ),
          build(
            "two-hosts",
            "Run it across two real hosts",
            "Rent two identical x86 hosts with KVM for a day (same instance type, kernel and Firecracker version). Run the same demo across them with a real network in between. Record how pause time scales with VM memory size, and what you would change for hosts in different regions.",
            {
              doneWhen: [
                "The measurements table",
                "A note on what changes for cross-region: transfer, addressing, compatibility",
              ],
              parts: [
                build(
                  "host-setup",
                  "Reproducible host setup script",
                  "One script takes a freshly rented host to a working worker: packages, KVM access, Firecracker, kernel and rootfs, and network setup. Running it on both hosts gives identical versions.",
                ),
                build(
                  "scaling",
                  "Pause time and bytes moved for 512 MB, 1 GB and 2 GB guests",
                  "A table with VM pause time and bytes moved for each of the three guest memory sizes, measured across the real network, with a sentence on how pause time grows with memory.",
                ),
              ],
            },
          ),
          build(
            "writeup",
            "README, decisions and a public write-up",
            "Write the README a reviewer needs: setup, demo, tests, architecture, the important decisions and their alternatives, measured numbers, and known limits. Publish a post about it. This is the centrepiece of your portfolio.",
            {
              doneWhen: ["Link to the post", "Link to the final repository"],
              parts: [
                build(
                  "readme",
                  "README with architecture and decisions",
                  "A reviewer can set up, run the demo and run the tests from the README alone. It shows the architecture, each important decision with the alternative you rejected and why, and the known limits.",
                ),
                build(
                  "post",
                  "Published post with measurements",
                  "A public post explains the design and reports your own numbers: total time, pause time, longest stream gap and bytes moved, including the two-host results.",
                ),
              ],
            },
          ),
        ]),
      ],
      {
        detail:
          "Reliability is the grading criterion: every failure ends with one live VM, a connected client and nothing left behind.",
      },
    ),
  ],
);
