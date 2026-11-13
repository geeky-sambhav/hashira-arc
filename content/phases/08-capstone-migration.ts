import { cards, link, note, output, project, read, url } from "../dsl";
import type { Phase } from "../types";

const FC_DOCS = "https://github.com/firecracker-microvm/firecracker/blob/main/docs";

export const phase: Phase = {
  id: "capstone-migration",
  label: "Capstone 1",
  title: "Firecracker live migration",
  summary:
    "The take-home that started this. Move a running microVM between two workers while a client stays connected, with one copy alive at the end and a clean rollback if anything fails.",
  weeks: { start: 26, end: 28 },
  capstone: true,
  modules: [
    {
      id: "cap1-design",
      title: "Design and control plane",
      summary: "Week 26. Decide the semantics before writing the migration.",
      items: [
        read("cap1-fencing", "Fencing tokens and why timeouts are not enough", {
          week: 26,
          hours: 1.5,
          source: "Martin Kleppmann",
          links: [link("How to do distributed locking", "https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html")],
        }),
        project("cap1-design-doc", "Design doc: the migration state machine", {
          week: 26,
          hours: 6,
          brief:
            "Before coding, write the design: components (two workers, control API, proxy), the migration as an explicit state machine, what state moves and how, idempotency of every API call, and a failure table listing each step, what can fail there, and whether you roll back or roll forward.",
          deliverables: [
            "State diagram with every transition and its trigger",
            "Failure table: step, failure, detection, recovery, final owner of the VM",
            "Fencing design: how a stale source is prevented from resuming",
            "API semantics: idempotency keys, repeated migration requests, progress reporting",
          ],
          evidence: [url("doc", "Link to the design doc")],
        }),
        project("cap1-control-plane", "Two workers, a control API and a TypeScript SDK", {
          week: 26,
          hours: 16,
          brief:
            "Build the system without migration first. Each worker manages its own Firecracker processes, working directories, API sockets, TAP devices and network namespaces. An HTTP API creates sandboxes, runs commands and writes files in the guest (via an agent or SSH), exposes ports and reports state. A TypeScript SDK wraps it.",
          deliverables: [
            "make setup / make local-up: no manual kernel, rootfs or TAP assembly",
            "POST /v1/sandboxes, commands, files, ports, GET sandbox",
            "TypeScript SDK matching the brief's shape",
            "Two isolated workers on one machine",
          ],
          evidence: [url("repo", "Link to the repository"), output("demo", "SDK script creating a sandbox and starting the counter server")],
          links: [link("Firecracker getting started", `${FC_DOCS}/getting-started.md`)],
        }),
      ],
    },
    {
      id: "cap1-migrate",
      title: "The migration",
      summary: "Week 27. Pause, snapshot, copy, restore, repoint, fence.",
      items: [
        project("cap1-proxy", "Stable client address", {
          week: 27,
          hours: 6,
          brief:
            "Put your repointable proxy from Phase 5 in front of the guest port. The external client connection must stay open through a migration; the proxy opens a new internal connection to the restored VM and resumes the stream.",
          deliverables: ["Proxy integrated with the control API's port exposure", "Measured stream gap reported per migration"],
          evidence: [output("stream", "One long-lived client stream surviving a backend switch")],
        }),
        project("cap1-migration", "Migrate a running VM from worker A to worker B", {
          week: 27,
          hours: 18,
          capstone: true,
          brief:
            "Implement POST /v1/sandboxes/:id/migrations: pause, full snapshot, transfer state, memory and disk with checksums, prepare the destination's namespace and TAP, restore in a new Firecracker process, health-check, repoint the proxy, then fence and clean up the source. Report progress and bytes moved through GET .../migrations/:id and the SDK's watch().",
          deliverables: [
            "Counter, PID and boot ID continuous across the move",
            "Exactly one live copy after cutover; source fenced with an epoch check",
            "Automated demo reporting total time, VM pause time, longest event gap and bytes moved",
            "Progress phases observable through the API",
          ],
          evidence: [
            output("demo", "Output of the automated demo run"),
            output("continuity", "Event stream showing boot_id, pid and counter across the migration"),
          ],
          links: [link("Firecracker snapshot support", `${FC_DOCS}/snapshotting/snapshot-support.md`)],
        }),
      ],
    },
    {
      id: "cap1-harden",
      title: "Failure, real hosts and the write-up",
      summary: "Week 28. Reliability is the grading criterion.",
      items: [
        project("cap1-failures", "Failure and repetition tests", {
          week: 28,
          hours: 12,
          brief:
            "Automate the cases the brief says will be tested: destination unavailable, transfer interrupted midway, restore fails, a repeated migration request, and A to B to A while the workload is active. In every failure the source must resume and no orphan processes, TAPs or files may remain.",
          deliverables: [
            "make test runs all failure cases unattended",
            "Rollback resumes the source VM with the client stream intact",
            "Cleanup verified: no leftover processes, namespaces or snapshot files",
          ],
          evidence: [output("tests", "Test run output"), note("bugs", "The two most interesting bugs you found and their fixes")],
        }),
        project("cap1-two-hosts", "Run it across two real hosts", {
          week: 28,
          hours: 8,
          brief:
            "Rent two identical x86 hosts with KVM for a day (same instance type, kernel and Firecracker version). Run the same demo across them with a real network in between. Record how pause time scales with VM memory size, and what you would change for hosts in different regions.",
          deliverables: ["Reproducible host setup script", "Pause time and bytes moved for 512 MB, 1 GB and 2 GB guests"],
          evidence: [output("numbers", "The measurements table"), note("regions", "What changes for cross-region: transfer, addressing, compatibility")],
        }),
        project("cap1-writeup", "README, decisions and a public write-up", {
          week: 28,
          hours: 7,
          brief:
            "Write the README a reviewer needs: setup, demo, tests, architecture, the important decisions and their alternatives, measured numbers, and known limits. Publish a post about it. This is the centrepiece of your portfolio.",
          deliverables: ["README with architecture and decisions", "Published post with measurements"],
          evidence: [url("post", "Link to the post"), url("repo", "Link to the final repository")],
        }),
      ],
    },
  ],
};

export const quiz = [
  ...cards("cap1-design", [
    ["What is a fencing token?", "A number that increases every time ownership changes. The protected resource rejects any request carrying an older number, so a paused or partitioned former owner cannot act."],
    ["Why is 'the source timed out, so it is dead' not safe?", "A slow or paused process is indistinguishable from a dead one. It can wake up later and act on stale beliefs unless the system actively fences it."],
    ["What makes an API operation idempotent, and how do you add it to 'start migration'?", "Repeating it has the same effect as doing it once. Accept a client-supplied idempotency key (or key on sandbox plus destination) and return the existing migration instead of starting another."],
    ["Why model the migration as an explicit state machine persisted to disk?", "After a crash the controller can read the last recorded state and decide to roll back or continue, instead of guessing from side effects."],
    ["At which point does a migration stop being reversible?", "Once the destination VM has resumed. Before that, rollback is to resume the source. After it, the only safe direction is forward: fence the source."],
  ]),
  ...cards("cap1-migrate", [
    ["List the steps of a snapshot-based migration in order.", "Pause the source, create a full snapshot, copy state, memory and disk, set up the destination network, load the snapshot and resume, health-check, repoint the proxy, fence and clean up the source."],
    ["What contributes to VM pause time in this design?", "Snapshot creation, transferring memory and disk, and restore. It grows with guest memory size, which is why production systems add diff snapshots or lazy loading."],
    ["Why checksum the transferred files?", "A truncated or corrupted memory file restores into a VM that crashes later in confusing ways. Verifying before restore turns that into a clean, retryable failure."],
    ["How do you prove the VM migrated rather than restarted?", "The guest's boot ID and the server's PID are unchanged and an in-memory counter continues without resetting."],
    ["Which number should you report as the user-visible downtime?", "The longest gap between events on the client's stream. It includes pause time plus proxy reconnection, and is what a user actually experiences."],
  ]),
  ...cards("cap1-harden", [
    ["If the destination is unreachable before the snapshot is taken, what should happen?", "Fail the migration early without pausing the VM; nothing needs rolling back."],
    ["If restore fails on the destination, what are the recovery steps?", "Destroy any partial destination process and files, resume the source VM, keep the proxy pointed at the source, and record the migration as failed with the reason."],
    ["What should a second identical migration request do while one is running?", "Return the in-progress migration rather than starting another, and never run two migrations of the same sandbox concurrently."],
    ["What must cleanup remove after a successful migration?", "The source Firecracker process, its TAP device and namespace, API socket, snapshot and memory files and disk image, and the destination's temporary transfer files."],
    ["What changes when the two hosts are in different regions?", "Transfer time dominates, so compress and send less (diff snapshots, lazy memory); the client address needs global routing or DNS; and CPU, kernel and Firecracker compatibility must be enforced across fleets."],
  ]),
];
