import { cards, lab, link, note, output, project, read, url } from "../dsl";
import type { Phase } from "../types";

export const phase: Phase = {
  id: "kubernetes",
  label: "Phase 11",
  title: "Kubernetes and durable execution",
  summary:
    "The two pieces of infrastructure these companies' job posts name most: Kubernetes, learned by assembling it and extending it, and durable workflows for agent loops that must survive crashes.",
  weeks: { start: 44, end: 46 },
  modules: [
    {
      id: "k8s-core",
      title: "Kubernetes from the parts",
      summary: "Week 44. It is the things you already built, plus a reconciliation loop.",
      items: [
        read("k8s-concepts", "Kubernetes concepts", {
          week: 44,
          hours: 6,
          source: "Kubernetes documentation",
          chapters: "Concepts: cluster architecture, Pods, workloads and controllers, Services and networking, resource management",
          links: [link("Kubernetes concepts", "https://kubernetes.io/docs/concepts/")],
        }),
        project("k8s-hard-way", "Kubernetes the Hard Way", {
          week: 44,
          hours: 14,
          brief:
            "Bring up a cluster by hand: certificates, etcd, API server, controller manager, scheduler, kubelet, container runtime and pod networking. For each component, note which earlier phase explains what it does.",
          deliverables: ["A working cluster passing the smoke tests", "A map from each component to the concept behind it"],
          evidence: [output("smoke", "Smoke test output"), note("map", "Component-to-concept map")],
          links: [link("Kubernetes the Hard Way", "https://github.com/kelseyhightower/kubernetes-the-hard-way")],
        }),
        lab("k8s-break-it", "Break the cluster", {
          week: 44,
          hours: 4,
          brief:
            "Stop the scheduler and create a pod. Stop a kubelet and watch the node go NotReady and pods get evicted. Exceed a container's memory limit and find OOMKilled, then find the same event in the node's cgroup files. Set a CPU limit and observe throttling in cpu.stat.",
          evidence: [output("events", "kubectl describe output and the matching cgroup evidence for the OOM kill and the throttling")],
        }),
      ],
    },
    {
      id: "k8s-operators",
      title: "Extending Kubernetes for sandboxes",
      summary: "Week 45. Controllers, custom resources and isolation policy.",
      items: [
        read("k8s-kubebuilder", "The Kubebuilder book", {
          week: 45,
          hours: 5,
          source: "Kubebuilder documentation",
          chapters: "Quick start and the CronJob tutorial: API types, the reconcile loop, status, finalizers",
          links: [link("The Kubebuilder book", "https://book.kubebuilder.io/")],
        }),
        read("k8s-agent-sandbox", "Running agents on Kubernetes", {
          week: 45,
          hours: 3,
          source: "Kubernetes blog; Kubernetes documentation",
          chapters: "The agent-sandbox announcement; Network Policies; Runtime Class",
          links: [
            link("Running agents on Kubernetes with Agent Sandbox", "https://kubernetes.io/blog/2026/03/20/running-agents-on-kubernetes-with-agent-sandbox/"),
            link("Network policies", "https://kubernetes.io/docs/concepts/services-networking/network-policies/"),
            link("Runtime class", "https://kubernetes.io/docs/concepts/containers/runtime-class/"),
          ],
        }),
        project("k8s-sandbox-operator", "A Sandbox operator with a warm pool", {
          week: 45,
          hours: 16,
          brief:
            "Define a Sandbox custom resource and write its controller in Go. Each Sandbox becomes a pod with resource limits, a default-deny NetworkPolicy that blocks the metadata address and cluster-internal ranges, and the gVisor RuntimeClass. Keep a pool of pre-started pods so claiming one takes under a second, and delete sandboxes after an idle timeout.",
          deliverables: [
            "Sandbox CRD with spec, status and a finalizer",
            "Warm pool that refills as sandboxes are claimed",
            "NetworkPolicy and RuntimeClass applied to every sandbox",
            "Measured time to a ready sandbox, cold vs from the pool",
          ],
          evidence: [url("repo", "Link to the operator"), output("timing", "Cold start vs warm claim times")],
        }),
      ],
    },
    {
      id: "k8s-durable",
      title: "Durable execution for agents",
      summary: "Week 46. An agent loop that survives its worker dying mid-step.",
      items: [
        read("k8s-temporal-101", "Temporal 101", {
          week: 46,
          hours: 6,
          source: "Temporal learning site",
          chapters: "Temporal 101 in Go: workflows, activities, workers, retries, event history",
          links: [link("Temporal 101 with Go", "https://learn.temporal.io/courses/temporal_101/go/")],
        }),
        read("k8s-temporal-case", "How Emergent runs agent loops on Temporal", {
          week: 46,
          hours: 1,
          source: "Temporal case study",
          links: [link("Emergent case study", "https://temporal.io/resources/case-studies/emergent")],
        }),
        project("k8s-agent-workflow", "An agent tool loop as a durable workflow", {
          week: 46,
          hours: 12,
          brief:
            "Model an agent run as a Temporal workflow: each LLM call and each tool execution is an activity with a timeout and retry policy. Kill the worker in the middle of a tool call and show the run resumes without repeating completed steps. Make side-effecting tools idempotent, add heartbeats to a long activity, and support cancelling a run.",
          deliverables: [
            "Workflow with LLM and tool activities (the LLM may be stubbed)",
            "Demonstrated recovery from a worker kill at three different points",
            "Idempotent side effects verified by a duplicate-count test",
            "Cancellation that stops the run and cleans up",
          ],
          evidence: [url("repo", "Link to the workflow"), output("history", "Event history across a worker kill")],
        }),
        lab("k8s-design-quotas", "Design doc: quotas and metering for a multi-tenant platform", {
          week: 46,
          hours: 3,
          brief:
            "One page: per-tenant concurrency and rate limits, metering sandbox-seconds and tokens for billing, what happens at the limit, and how to keep metering correct when workers crash.",
          evidence: [url("doc", "Link to the design doc")],
        }),
        lab("k8s-writeup", "Write-up: Kubernetes is a control loop", {
          week: 46,
          hours: 3,
          brief: "Publish a post explaining your operator's reconcile loop and why level-triggered reconciliation tolerates missed events.",
          evidence: [url("post", "Link to the published write-up")],
        }),
      ],
    },
  ],
};

export const quiz = [
  ...cards("k8s-core", [
    ["What does each Kubernetes control-plane component do?", "API server: the only gateway to state. etcd: the consistent store. Scheduler: assigns pods to nodes. Controller manager: loops that drive actual state toward desired state."],
    ["What does the kubelet do?", "Runs on each node, watches for pods assigned to it, and asks the container runtime to start and stop containers; reports status and runs probes."],
    ["What is a Pod?", "One or more containers sharing a network namespace and volumes, scheduled together as a unit."],
    ["Requests versus limits?", "Requests are what the scheduler reserves and guarantee a minimum. Limits are enforced caps: CPU is throttled at the limit, memory over the limit gets the container OOM-killed."],
    ["How does a Kubernetes memory limit become enforcement?", "The runtime writes it to the container cgroup's memory.max; the kernel's OOM killer does the rest."],
    ["What does a Service give you?", "A stable virtual IP and DNS name that load-balances to the current set of ready pods matching a selector."],
    ["Liveness versus readiness probe?", "Failing liveness restarts the container. Failing readiness only removes the pod from Service endpoints until it recovers."],
  ]),
  ...cards("k8s-operators", [
    ["What is the controller pattern?", "A loop that observes desired state and actual state and takes actions to make them match, repeatedly, rather than executing a one-time script."],
    ["Why is level-triggered reconciliation robust?", "The controller acts on the current full state, not on individual events, so a missed or duplicated event is corrected on the next pass."],
    ["What are a CRD and an operator?", "A CustomResourceDefinition adds a new resource type to the API. An operator is a controller that manages those resources with domain knowledge."],
    ["What is a finalizer?", "A marker that blocks deletion of an object until its controller has cleaned up external resources and removed the marker."],
    ["What does a default-deny NetworkPolicy do, and what enforces it?", "Blocks all traffic to or from selected pods except what other policies allow. It is enforced by the CNI plugin; without a supporting plugin it does nothing."],
    ["What is a RuntimeClass used for?", "Selecting a different container runtime per pod, such as gVisor or Kata Containers, for stronger isolation."],
    ["Why keep a warm pool of sandboxes?", "Image pull, runtime start and init take seconds. Handing out an already-running pod makes creation feel instant, at the cost of idle capacity."],
  ]),
  ...cards("k8s-durable", [
    ["What is durable execution?", "The engine records every step's result in an event history. After a crash, the workflow function is replayed with recorded results, so it resumes where it stopped."],
    ["Why must Temporal workflow code be deterministic?", "It is re-executed during replay and must make the same decisions given the same history. Randomness, clocks and I/O belong in activities."],
    ["Workflow versus activity?", "A workflow orchestrates and must be deterministic. An activity does the real work with side effects, and can be retried with timeouts."],
    ["Why must activities be idempotent?", "An activity can run more than once: it may complete but its result be lost before being recorded, and then it is retried."],
    ["What is an activity heartbeat for?", "A long activity reports progress so the server can detect a dead worker quickly and retry, and so the activity learns it was cancelled."],
    ["Why move an agent loop out of the sandbox into a workflow engine?", "The sandbox can be killed (OOM, eviction, migration). With the loop outside, the run's state survives and it can reattach to a new sandbox."],
    ["How do you meter usage correctly when workers crash?", "Record usage events idempotently with unique IDs tied to the work unit, and reconcile against the source of truth rather than incrementing counters in memory."],
  ]),
];
