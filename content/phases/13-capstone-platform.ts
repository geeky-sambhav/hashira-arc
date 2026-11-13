import { cards, note, output, project, url } from "../dsl";
import type { Phase } from "../types";

export const phase: Phase = {
  id: "capstone-platform",
  label: "Capstone 2",
  title: "An agent sandbox control plane",
  summary:
    "A small version of what Runable, Emergent and Vorflux run: a multi-tenant API that hands out isolated sandboxes, runs durable agent tasks in them, meters usage and meets an SLO.",
  weeks: { start: 47, end: 48 },
  capstone: true,
  modules: [
    {
      id: "cap2-build",
      title: "Design and build",
      summary: "Week 47. Compose the pieces you already have.",
      items: [
        project("cap2-design-doc", "Design doc", {
          week: 47,
          hours: 5,
          brief:
            "Write the design before building: tenants and API keys, the sandbox lifecycle, which isolation backend and why (your Kubernetes operator or your Firecracker workers), how agent tasks run durably, the data model, the SLOs, and the threat model from Phase 6 applied to this system.",
          deliverables: ["Architecture diagram and API", "Isolation choice with trade-offs", "SLOs and the threat model"],
          evidence: [url("doc", "Link to the design doc")],
        }),
        project("cap2-control-plane", "Control plane", {
          week: 47,
          hours: 18,
          capstone: true,
          brief:
            "Build the API in Go with Postgres: create, list and delete sandboxes per tenant; run a command and stream its output; submit an agent task that runs as a durable workflow against a sandbox. Sandboxes come from a warm pool and are reclaimed when idle. Every mutating endpoint takes an idempotency key.",
          deliverables: [
            "Tenant-scoped REST API with idempotent mutations",
            "Sandboxes with enforced CPU, memory and network policy",
            "Agent task as a workflow that survives a worker restart",
            "Streaming command output to the client",
          ],
          evidence: [url("repo", "Link to the repository"), output("demo", "A scripted run: create, exec, task, delete")],
        }),
      ],
    },
    {
      id: "cap2-operate",
      title: "Operate it",
      summary: "Week 48. Limits, numbers and a security review.",
      items: [
        project("cap2-quotas", "Quotas and metering", {
          week: 48,
          hours: 8,
          brief:
            "Add per-tenant concurrent-sandbox limits and a request rate limit that returns a clear 429. Record sandbox-seconds per tenant so the totals are still correct after you kill the control plane mid-run. Expose a usage endpoint.",
          deliverables: ["Limits enforced under concurrent requests", "Metering that reconciles after a crash"],
          evidence: [output("limits", "Concurrent requests hitting the limit"), output("usage", "Usage totals before and after a crash")],
        }),
        project("cap2-slo-load", "SLO dashboard and load test", {
          week: 48,
          hours: 10,
          brief:
            "Instrument with OpenTelemetry. Build a dashboard for your SLOs with a burn-rate alert. Load-test sandbox creation at a constant arrival rate, find the capacity knee, and kill a worker node during the test to see whether the SLO holds.",
          deliverables: ["Dashboard and alert", "Capacity number at the SLO", "Result of the node-failure test"],
          evidence: [output("load", "Latency vs load and the failure-test result")],
        }),
        project("cap2-security", "Security review", {
          week: 48,
          hours: 4,
          brief:
            "Attack your own platform as a malicious tenant: reach another tenant's sandbox, the metadata address, the control plane's database, the node. Fix what you find and record what the isolation boundary would have to fail for each attack to work.",
          deliverables: ["A list of attempted attacks with results", "Fixes for anything that worked"],
          evidence: [note("review", "Attacks tried, outcomes and fixes")],
        }),
        project("cap2-writeup", "README and write-up", {
          week: 48,
          hours: 5,
          brief:
            "Document the architecture, decisions, measurements and limits. Publish a post. Together with Capstone 1 this is what you show in an interview or a work trial.",
          deliverables: ["README with decisions and numbers", "Published post"],
          evidence: [url("post", "Link to the post")],
        }),
      ],
    },
  ],
};

export const quiz = [
  ...cards("cap2-build", [
    ["What must be scoped by tenant in a multi-tenant control plane?", "Every query and every resource: authentication resolves to a tenant ID, and all reads and writes filter on it, so one tenant can never name another's sandbox."],
    ["Why does sandbox creation need an idempotency key?", "A client that times out and retries would otherwise create and be billed for two sandboxes."],
    ["How do you choose between pods with gVisor and microVMs for agent sandboxes?", "Weigh the isolation needed for untrusted code against cost and start time: microVMs give a hardware boundary and snapshots but need KVM and more overhead; gVisor pods are denser and run anywhere."],
    ["Why separate the control plane from the data plane?", "The control plane decides and records (API, database, scheduling); the data plane runs workloads. Running sandboxes should keep working if the control plane is briefly down."],
    ["How should long command output reach the client?", "As a stream (server-sent events or chunked HTTP) with backpressure, not buffered entirely in memory."],
  ]),
  ...cards("cap2-operate", [
    ["How do you enforce a concurrency limit correctly under parallel requests?", "Check and increment atomically in the database (a conditional update or row lock), not with a read followed by a separate write."],
    ["What should a rate-limited client receive?", "HTTP 429 with a Retry-After header, cheaply and early, before any expensive work."],
    ["How do you keep usage metering correct across crashes?", "Persist start and stop events (or periodic heartbeats) with unique IDs and compute usage from them, reconciling against what actually ran."],
    ["What is the noisy neighbour problem?", "One tenant's load degrades others on shared resources. Mitigate with per-tenant limits, resource isolation and fair scheduling."],
    ["What should you test by killing a node during a load test?", "That in-flight work is retried or fails cleanly, capacity is replaced, and the SLO still holds or the alert fires."],
  ]),
];
