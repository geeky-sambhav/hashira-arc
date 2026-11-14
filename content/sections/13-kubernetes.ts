import { build, concept, link, section, topic } from "../dsl";

const K8S_CONCEPTS = link("Kubernetes concepts", "https://kubernetes.io/docs/concepts/");
const KTHW = link("Kubernetes the Hard Way", "https://github.com/kelseyhightower/kubernetes-the-hard-way");
const KUBEBUILDER = link("The Kubebuilder book", "https://book.kubebuilder.io/");
const AGENT_SANDBOX = link(
  "Running agents on Kubernetes with Agent Sandbox",
  "https://kubernetes.io/blog/2026/03/20/running-agents-on-kubernetes-with-agent-sandbox/",
);
const NETWORK_POLICIES = link(
  "Network policies",
  "https://kubernetes.io/docs/concepts/services-networking/network-policies/",
);
const RUNTIME_CLASS = link("Runtime class", "https://kubernetes.io/docs/concepts/containers/runtime-class/");
const TEMPORAL_101 = link("Temporal 101 with Go", "https://learn.temporal.io/courses/temporal_101/go/");
const EMERGENT = link("Emergent case study", "https://temporal.io/resources/case-studies/emergent");

export default section(
  "kubernetes",
  {
    title: "Kubernetes and durable execution",
    summary:
      "Kubernetes as a store of desired state plus the loops that enforce it: the control plane, nodes and pods, cluster networking and storage, and writing your own operator. Then durable execution: workflows that survive the death of the process running them.",
  },
  [
    topic(
      "model",
      "The model: desired state and control loops",
      [
        topic("why", "Why an orchestrator exists", [
          concept(
            "problem",
            "The problem: many containers on many machines",
            "A container runtime starts one container on one host. Across a fleet, something must also decide which machine runs each container, replace it when it or its machine dies, give clients a stable address for a moving set of copies, and roll out new versions without downtime.",
          ),
          concept(
            "declarative",
            "Imperative commands versus declared state",
            "An imperative command ('start three copies') is true once and wrong as soon as a machine dies. A declaration ('three copies should exist') is a standing goal: the system stores it and keeps working to make reality match, with nobody re-running a script.",
          ),
          concept(
            "known-parts",
            "Built from parts you already know",
            "Kubernetes adds no kernel feature. Containers are namespaces and cgroups, pod networking is veth pairs, routes and NAT, and the state store is a Raft-replicated key-value database. What it adds is an API for desired state and the loops that enforce it.",
          ),
        ]),
        topic("objects", "Everything is an API object", [
          concept(
            "resources",
            "Resources, kinds and API versions",
            "Every thing in the cluster (a Pod, a Service, a Node) is a typed record served over HTTP, identified by an API group, a version and a kind such as apps/v1 Deployment. kubectl is an HTTP client for that API and has no special powers.",
          ),
          concept(
            "identity",
            "Names, namespaces and UIDs",
            "A name is unique per kind within a namespace (or across the cluster for cluster-scoped kinds such as Node) and can be reused after deletion; the UID is unique for all time, so a recreated object with the same name is a different object. Namespaces scope names and policy. They are not the Linux namespaces that isolate a container, and by themselves they do not stop pods in different namespaces from talking to each other.",
          ),
          concept(
            "spec-status",
            "Spec and status",
            "Spec is the desired state, written by whoever owns the object. Status is the observed state, written by the controller responsible for it. Reading both tells you what was asked for and how far the system has got.",
          ),
          concept(
            "labels",
            "Labels, selectors and annotations",
            "Labels are key-value pairs on an object; a selector is a query over them. Objects are linked by query rather than by a list of names: a Service or ReplicaSet covers 'all pods with app=web', so membership changes as pods come and go. Annotations hold extra data for tools and cannot be selected on.",
          ),
          concept(
            "apply",
            "Apply and field ownership",
            "`kubectl apply` merges your manifest into the stored object instead of replacing it, so fields set by others survive. With server-side apply the API server records which manager owns each field in metadata.managedFields and rejects a change to a field another manager owns as a conflict unless forced, so a person and a controller do not silently undo each other's edits.",
          ),
        ]),
        topic("loop", "The reconcile loop", [
          concept(
            "controller",
            "The controller pattern",
            "A controller is a loop that observes desired state and actual state and takes actions to make them match, repeatedly, rather than executing a one-time script.",
          ),
          concept(
            "observe-diff-act",
            "Observe, diff, act",
            "Each pass reads the desired state, reads the actual state, computes the difference and takes a step to shrink it. No pass assumes the previous one succeeded, so a crash halfway through is repaired by running again.",
          ),
          concept(
            "edge-vs-level",
            "Edge-triggered versus level-triggered",
            "An edge-triggered system reacts to change events ('a pod died, start one') and stays wrong forever if it misses an event. A level-triggered system reacts to the current state ('two exist, three are wanted'), whatever sequence of events led there.",
          ),
          concept(
            "level-robust",
            "Why level-triggered reconciliation is robust",
            "The controller acts on the current full state, not on individual events, so a missed or duplicated event is corrected on the next pass. Events only serve as a hint about when to look.",
          ),
          concept(
            "async",
            "The API is asynchronous",
            "A write such as `kubectl apply` returns as soon as the object is stored; the work happens afterwards in other processes. Success means the desired state was recorded, not reached. You find out whether it worked by reading status and events.",
          ),
        ]),
        topic("observe", "Seeing it", [
          concept(
            "kubectl-read",
            "Reading objects, events and the HTTP underneath",
            "You can print a full stored object with `kubectl get -o yaml` and find its spec, status and resourceVersion, read the events recorded about it with `kubectl describe` (events are kept only for about an hour by default), stream changes with `--watch`, and raise verbosity with `-v=8` to see the HTTP requests behind a command.",
          ),
        ]),
      ],
      {
        detail: "Desired state stored in an API, and loops that make it true.",
        links: [K8S_CONCEPTS],
      },
    ),

    topic(
      "control-plane",
      "The control plane",
      [
        topic("overview", "The shape of the control plane", [
          concept(
            "components",
            "The four core components and their jobs",
            "API server: the only gateway to state. etcd: the consistent store. Scheduler: assigns pods to nodes. Controller manager: loops that drive actual state toward desired state (on a cloud, a separate cloud controller manager runs the cloud-specific loops). If all of them stop, pods already running keep running, but nothing is scheduled, scaled or repaired until they return.",
          ),
        ]),
        topic("apiserver", "The API server", [
          concept(
            "hub",
            "The only door to cluster state",
            "Every component (kubectl, the scheduler, controllers, kubelets) reads and writes state through the API server, and only the API server talks to etcd. It keeps no durable state of its own, so several copies can run behind a load balancer.",
          ),
          concept("write-path", "What happens to a write request", undefined, {
            parts: [
              concept(
                "authn",
                "Authentication: who is calling",
                "The request must carry a client certificate (the common name is the user, the organizations are the groups) or a bearer token such as a service account token or an OIDC token. Kubernetes stores no user accounts for humans; identity comes entirely from the credential.",
              ),
              concept(
                "authz",
                "Authorization: RBAC",
                "Roles list allowed verbs (such as get, list, watch, create, update, patch and delete) on resource types; bindings grant a role to users, groups or service accounts, in one namespace or cluster-wide. Everything is denied unless a rule allows it, and there are no deny rules.",
              ),
              concept(
                "admission",
                "Admission, then storage",
                "After authorization, mutating admission plugins and webhooks may change the object (fill defaults, inject a sidecar), the result is checked against the schema, and validating admission may reject it. Only then is the object written to etcd and the response sent. Admission runs on writes, not reads, and at this point nothing has been started: the stored object is the trigger for everything else.",
              ),
            ],
          }),
          concept(
            "service-accounts",
            "Service accounts: identity for pods",
            "Each pod runs as a service account. By default the kubelet mounts a time-limited token bound to that pod into it as a file and refreshes it before it expires; the process presents it to the API server, and the RBAC rules bound to that service account decide what it may do.",
          ),
          concept(
            "pki",
            "Cluster certificates and kubeconfig",
            "Connections between components use mutual TLS under a cluster certificate authority: the API server has a serving certificate, and each kubelet, the scheduler, the controller manager and each admin has a client certificate whose subject is its identity. A kubeconfig file bundles a server address, the CA to trust and a client credential. This is why building a cluster by hand starts with generating certificates.",
          ),
        ]),
        topic("etcd", "etcd", [
          concept(
            "contents",
            "What etcd stores",
            "Every API object, serialized under a key such as /registry/pods/<namespace>/<name>. It is the whole recorded state of the cluster: lose it without a backup and the cluster forgets everything it was asked to run, even though containers already running on nodes keep running.",
          ),
          concept(
            "raft",
            "Why etcd uses Raft",
            "The store must survive a machine failure without losing an acknowledged write or giving two different answers. etcd replicates a log to an odd number of members with Raft (from Concurrency and distributed systems) and acknowledges a write once a majority has it: three members survive one failure, five survive two. Without a majority it refuses writes rather than diverge.",
          ),
          concept(
            "resource-version",
            "Revisions and resourceVersion",
            "etcd numbers every write with a store-wide revision and keeps older versions of each key for a while. The API exposes this as metadata.resourceVersion, a value that changes on every write to an object. Clients mainly hand it back to the server as a token. Since Kubernetes 1.35 it is guaranteed to be an increasing integer, so two versions of the same resource can be compared for order (client-go has a helper), but it is still not a number to do arithmetic on.",
          ),
          concept(
            "optimistic",
            "Optimistic concurrency",
            "An update that carries the resourceVersion it was based on is rejected with 409 Conflict if the object has changed since. The client re-reads and retries. There are no locks, and two writers that each send the version they read cannot silently overwrite each other; a write that omits it can.",
          ),
          concept(
            "watch",
            "Watches",
            "A client opens a long-lived request starting from a resourceVersion and receives a stream of ADDED, MODIFIED and DELETED events for a resource type. This is how every component learns about changes without polling.",
          ),
          concept(
            "list-watch",
            "List, then watch, and list again when it breaks",
            "A client lists to get the full state and a resourceVersion, then watches from that version. Connections drop, and a version that is too old has been compacted away (410 Gone), so the client must be ready to list again. A watch keeps a local cache nearly fresh; it is not a reliable event log and the cache is always slightly behind. That is why controllers are level-triggered.",
          ),
        ]),
        topic("scheduler", "The scheduler", [
          concept(
            "job",
            "What the scheduler does and does not do",
            "It watches for pods with an empty spec.nodeName, chooses a node for each and records the choice by binding the pod to that node. It starts nothing: the kubelet on that node does the rest. With the scheduler stopped, new pods stay Pending and running pods are unaffected.",
          ),
          concept(
            "filter-score",
            "Filtering and scoring",
            "Filtering removes every node that cannot run the pod: not enough unreserved CPU or memory, an untolerated taint, labels that do not match, a volume that cannot attach there. Scoring ranks the survivors (spreading, preferences, image already present) and the best wins. If filtering leaves nothing, the pod stays Pending with a FailedScheduling event that says why.",
          ),
          concept(
            "requests",
            "The scheduler counts requests, not usage",
            "A node fits a pod if the requests of the pods already bound to it plus the new pod's requests are within the node's allocatable resources (capacity minus what is reserved for the system, the kubelet and the eviction threshold). Actual usage and limits are ignored, so a node can be 'full' while idle, and overcommitted when limits exceed requests.",
          ),
          concept(
            "taints",
            "Taints and tolerations",
            "A taint on a node repels every pod that does not tolerate it: NoSchedule blocks new pods, PreferNoSchedule discourages them, NoExecute also evicts pods already running. A toleration permits a pod onto a tainted node but does not attract it there.",
          ),
          concept(
            "affinity",
            "Node selectors, affinity and spreading",
            "nodeSelector and required node affinity restrict a pod to nodes with certain labels; preferred affinity only influences scoring. Pod affinity and anti-affinity place a pod relative to other pods (same node, different zone), and topology spread constraints keep replicas evenly distributed across zones or nodes.",
          ),
          concept(
            "preemption",
            "Priority and preemption",
            "Pods carry a priority from a PriorityClass. When no node fits a pending pod, the scheduler may evict lower-priority pods from a node to make room for it.",
          ),
        ]),
        topic("controllers", "The controller manager and built-in controllers", [
          concept(
            "kcm",
            "One binary, many loops",
            "The controller manager runs the built-in controllers (Deployment, ReplicaSet, Job, node lifecycle, EndpointSlice, garbage collector and more) as independent loops in one process. Each drives actual state toward desired state using only the API server; they never call each other.",
          ),
          concept(
            "replicaset",
            "ReplicaSet: keep N pods that match a selector",
            "It counts the pods matching its selector and creates pods from its template or deletes extras until the count equals spec.replicas. A replacement is a new pod with a new name and IP, not the old one revived.",
          ),
          concept(
            "deployment",
            "Deployment: one ReplicaSet per version",
            "A Deployment owns a ReplicaSet for each version of its pod template. Changing the template creates a new ReplicaSet; old ones are kept scaled to zero (up to revisionHistoryLimit, ten by default), so a rollback is scaling one back up.",
          ),
          concept(
            "rollout",
            "Rolling updates",
            "The Deployment controller scales the new ReplicaSet up and the old one down in steps, bounded by maxSurge (extra pods allowed) and maxUnavailable (missing pods allowed), and waits for new pods to become Ready (passing their readiness checks, covered under Probes) before continuing. A new version that never becomes Ready stalls the rollout instead of replacing healthy pods.",
          ),
          concept(
            "workloads",
            "DaemonSet, Job and CronJob",
            "A DaemonSet runs one pod on every matching node (node agents such as a log shipper or a network agent). A Job runs pods until a set number complete successfully, retrying failures. A CronJob creates Jobs on a schedule.",
          ),
          concept(
            "autoscaling",
            "Autoscaling pods and nodes",
            "A HorizontalPodAutoscaler is another controller: it reads a metric such as CPU usage as a percentage of requests (from the metrics API, usually served by metrics-server) and sets a workload's replicas to ceil(current replicas x current value / target value). Adding nodes is a separate add-on, a cluster autoscaler, which reacts to pods left Pending for lack of room, not to node usage, and removes nodes whose pods fit elsewhere.",
          ),
          concept(
            "ha",
            "Running the control plane highly available",
            "API servers are all active at once. The scheduler and the controller manager must each have only one active copy, so their replicas compete for a Lease object in the API and the losers stand by until the holder stops renewing it.",
          ),
        ]),
        topic("observe", "Seeing it", [
          concept(
            "etcdctl",
            "Reading etcd directly",
            "You can list the keys under /registry with etcdctl and fetch one object's raw value, and explain why nothing but the API server should write there: a direct write skips authentication, validation and admission.",
          ),
          concept(
            "can-i",
            "kubectl auth can-i",
            "You can ask whether an identity may perform a verb on a resource, check on behalf of a service account with --as, and trace a 403 Forbidden back to the missing role or binding.",
          ),
        ]),
      ],
      {
        detail: "The API server, etcd, the scheduler and the controllers: where state lives and who acts on it.",
        links: [K8S_CONCEPTS],
      },
    ),

    topic(
      "nodes",
      "Nodes and pods",
      [
        topic("kubelet", "The kubelet and the container runtime", [
          concept(
            "kubelet",
            "What the kubelet does",
            "It runs on each node, watches for pods assigned to it, and asks the container runtime to start and stop containers; it reports status and runs probes. It is itself a reconcile loop over 'pods I should run' versus 'containers the runtime reports', so crashed containers are restarted even while the node cannot reach the control plane.",
          ),
          concept(
            "cri",
            "The Container Runtime Interface",
            "The kubelet does not create containers itself. It calls a runtime over CRI, a gRPC API with calls to create a pod sandbox, create and start containers in it, and pull images. Any runtime that implements CRI can sit under the kubelet.",
          ),
          concept(
            "containerd",
            "containerd, runc and the shim",
            "containerd implements CRI: it pulls and unpacks images and, for each container, runs an OCI runtime such as runc, which sets up the namespaces and cgroups (from Containers, isolation and security) and starts the process. A small shim process stays as the container's parent so containerd can restart without killing containers.",
          ),
          concept(
            "runtime-class",
            "RuntimeClass",
            "A RuntimeClass selects a different container runtime per pod, such as gVisor or Kata Containers, for stronger isolation. The pod names it in runtimeClassName and the RuntimeClass object names a handler configured in the node's runtime.",
            { links: [RUNTIME_CLASS] },
          ),
        ]),
        topic("pod", "What a pod is", [
          concept(
            "definition",
            "A pod is the unit of scheduling",
            "One or more containers sharing a network namespace and volumes, scheduled together as a unit. The unit is not a single container because a main process often needs helpers (a proxy, a log shipper) that share its localhost and files but ship as separate images.",
          ),
          concept(
            "pause",
            "The sandbox and the pause container",
            "The runtime first creates the pod sandbox: a tiny 'pause' process that holds the pod's network namespace. Each container then joins it. Because the pause process owns the namespace, an application container can crash and restart without the pod losing its IP address.",
          ),
          concept(
            "shared",
            "What containers in a pod share",
            "They share one IP address, one port space and localhost, the IPC namespace and hostname, and any volume both mount. They do not share a root filesystem (each has its own image), each has its own resource limits, and by default each has its own PID namespace.",
          ),
          concept(
            "mortal",
            "Pods are mortal and never move",
            "A pod is bound to one node for its whole life. It is never migrated or repaired; when it is gone, a controller creates a new pod with a new name, UID and IP. Anything that must outlive a pod, an address or data, needs a separate object: a Service or a volume.",
          ),
          concept(
            "init",
            "Init containers and sidecars",
            "Init containers run one at a time, each to completion, before the application containers start; the pod does not proceed until each succeeds. An init container with restartPolicy Always is a sidecar: it starts before the application containers and keeps running beside them.",
          ),
        ]),
        topic("lifecycle", "Pod lifecycle", [
          concept(
            "phases",
            "Pod phases and conditions",
            "Pending: accepted but not yet running, which covers both unscheduled and still pulling images. Running: bound to a node with at least one container running or restarting. Succeeded and Failed: all containers have terminated for good. The phase is coarse; conditions (PodScheduled, Initialized, ContainersReady, Ready) say how far the pod has got, and only Ready pods are used as Service backends.",
          ),
          concept(
            "states",
            "Container states and reasons",
            "Each container is Waiting, Running or Terminated, with a reason and, when terminated, an exit code. The STATUS column of `kubectl get pods` usually shows these reasons, not the phase: ErrImagePull and ImagePullBackOff (wrong image name or missing registry credentials), CrashLoopBackOff, OOMKilled, Completed.",
          ),
          concept(
            "restart-policy",
            "Restart policy",
            "Always, OnFailure or Never, set per pod. Always restarts a container whenever it exits, OnFailure only when it exits non-zero. The kubelet restarts it in place on the same node; the pod is not rescheduled. Deployments require Always; Jobs use OnFailure or Never.",
          ),
          concept(
            "crashloop",
            "CrashLoopBackOff",
            "It is not a failure of its own but the kubelet waiting before the next restart of a container that keeps exiting. The wait starts at ten seconds and doubles after each crash up to a cap of five minutes by default, and resets once the container has run for ten minutes without trouble. The cause is in the exit code shown by `kubectl describe` and in the previous container's output from `kubectl logs --previous`.",
          ),
        ]),
        topic("probes", "Probes", [
          concept(
            "why",
            "Why probes exist",
            "The kubelet can see that a process exists, not that it works. A process can be deadlocked, or alive but not yet ready to serve. Probes are checks the kubelet runs against each container on a timer: an HTTP GET, a TCP connect, a gRPC health call or a command run inside the container.",
          ),
          concept(
            "liveness",
            "Liveness: restart when it fails",
            "Failing liveness restarts the container: after the configured number of consecutive failures the kubelet kills it and the restart policy applies. Use it only for states a restart fixes, such as a deadlock.",
          ),
          concept(
            "readiness",
            "Readiness: stop traffic when it fails",
            "Failing readiness only takes the pod out of the backends of every Service that selects it (its EndpointSlices, in Cluster networking) until it recovers. The pod's Ready condition goes false and nothing is restarted. Readiness keeps being checked for the container's whole life.",
          ),
          concept(
            "startup",
            "Startup probes",
            "While a startup probe has not yet succeeded, liveness and readiness probes do not run. It gives a slow-starting application time to boot without weakening the liveness check. If it fails its configured number of times, the kubelet kills the container and the restart policy applies, as for liveness.",
          ),
          concept(
            "pitfalls",
            "How probes cause outages",
            "A liveness probe that checks a shared dependency turns one database blip into every pod restarting at once; a readiness probe that does the same removes every backend at once. Liveness should test only this process, and a probe timeout that is too short under load does the same damage as a real failure.",
          ),
        ]),
        topic("resources", "Requests, limits and QoS", [
          concept(
            "req-vs-limit",
            "Requests versus limits",
            "Requests are what the scheduler reserves on a node for the container; the CPU request also sets its share of CPU under contention. Limits are caps enforced by the kernel: CPU is throttled at the limit, and memory use that reaches the limit and cannot be reclaimed gets the container OOM-killed.",
          ),
          concept(
            "cpu",
            "How CPU requests and limits reach the kernel",
            "CPU is counted in cores (500m is half a core) and is compressible: a container given less merely runs slower. On Linux the request becomes the container cgroup's CPU weight, which only matters under contention. The limit becomes a quota (cpu.max on cgroup v2): so much run time per period, 100 ms by default. A container that uses up its quota is paused until the next period, counted in nr_throttled and throttled_usec in cpu.stat, which can add latency even on an idle node.",
          ),
          concept(
            "memory",
            "How a memory limit becomes an OOM kill",
            "Memory cannot be throttled, only taken back by killing. The runtime writes the limit to the container cgroup's memory.max (cgroup v2); the kernel's OOM killer does the rest when the cgroup reaches it and nothing can be reclaimed. On cgroup v2 the kubelet by default also sets memory.oom.group on the container's cgroup, so the kernel kills every process in the container together rather than one. Kubernetes only reports the result: the container is Terminated with reason OOMKilled, typically exit code 137, and the kubelet restarts it.",
          ),
          concept(
            "qos",
            "QoS classes",
            "Guaranteed: every container has CPU and memory requests equal to its limits. BestEffort: no container sets any CPU or memory request or limit. Burstable: everything in between. The class is derived, not chosen. The kubelet turns it into each container's oom_score_adj (Guaranteed -997, BestEffort 1000, Burstable in between according to its memory request), which decides whom the kernel kills first when the whole node runs out of memory.",
          ),
          concept(
            "eviction",
            "Node-pressure eviction",
            "When the node itself runs low on memory, disk or process IDs, the kubelet kills whole pods to protect the node. It ranks them by whether usage exceeds requests, then by priority, then by usage relative to requests; it does not use the QoS class, though the result usually resembles it. An evicted pod ends in phase Failed with reason Evicted. If memory runs out faster than the kubelet reacts, the kernel's node-wide OOM killer acts instead, steered by oom_score_adj so BestEffort containers die first and Guaranteed last.",
          ),
          concept(
            "quota",
            "ResourceQuota and LimitRange",
            "A ResourceQuota caps the total requests, limits and object counts in a namespace; a LimitRange sets default and maximum requests and limits per container. Together they stop one tenant's namespace from consuming the cluster.",
          ),
        ]),
        topic("termination", "Graceful termination", [
          concept("shutdown", "What happens when a pod is deleted", undefined, {
            parts: [
              concept(
                "race",
                "Marked for deletion, then two things at once",
                "The API server sets a deletion timestamp and the pod shows as Terminating. The kubelet begins stopping the containers while, independently, the pod is marked terminating (and so not ready) in its Services' endpoints and every node's forwarding rules are updated to stop sending it new connections. Nothing orders the two, so new connections can still arrive for a moment after shutdown has begun.",
              ),
              concept(
                "signals",
                "preStop, SIGTERM, then SIGKILL",
                "The kubelet runs the container's preStop hook if it has one, then has the runtime send the stop signal (SIGTERM unless the image sets another) to the container's main process. When the grace period (terminationGracePeriodSeconds, 30 seconds by default, counted from the start and including preStop) expires, whatever is left gets SIGKILL.",
              ),
              concept(
                "app",
                "What the application must do",
                "On SIGTERM: keep serving briefly (or delay with a short preStop sleep) so endpoint removal can catch up, stop accepting new work, finish in-flight requests and exit. A main process that never receives or handles SIGTERM, such as an application started behind a shell that does not forward signals, always waits out the full grace period and is then killed.",
              ),
            ],
          }),
          concept(
            "drain",
            "Drain, eviction and PodDisruptionBudgets",
            "`kubectl drain` marks a node unschedulable and removes its pods through the Eviction API, which refuses an eviction that would take an application below its PodDisruptionBudget (a minimum available or maximum unavailable count). This is how node maintenance avoids taking down every replica at once.",
          ),
        ]),
        topic("node-failure", "When a node fails", [
          concept(
            "detect",
            "From missed heartbeats to replaced pods",
            "A kubelet registers its Node object, reports capacity and conditions, and renews a Lease every few seconds as a heartbeat. When renewals stop, the node lifecycle controller marks the node's Ready condition Unknown (shown as NotReady) and taints it. Pods tolerate that taint for a limited time, five minutes (300 seconds) by default unless the pod sets its own toleration, after which they are deleted and their controllers create replacements on other nodes.",
          ),
          concept(
            "partition",
            "Dead or only unreachable",
            "The control plane cannot tell a dead node from a partitioned one whose containers are still running. Deleted pods on an unreachable node stay Terminating because no kubelet confirms they stopped. A Deployment starts replacements anyway; a controller that must never run two copies of the same pod (a StatefulSet, in Storage and configuration) waits.",
          ),
        ]),
        topic("observe", "Seeing it on a node", [
          concept(
            "crictl",
            "crictl on the node",
            "You can list pod sandboxes and containers as the runtime sees them with `crictl pods` and `crictl ps -a`, and match a pod to its pause sandbox and its container processes on the host.",
          ),
          concept(
            "cgroupfs",
            "A pod's cgroup files",
            "You can find a pod's cgroup, and its containers' cgroups inside it, under the kubepods hierarchy in /sys/fs/cgroup and read memory.max, memory.events, cpu.max and cpu.stat to confirm a limit, an OOM kill or throttling from the kernel's side. On cgroup v2 the counts in memory.events are hierarchical by default: a pod's file includes events in its containers.",
          ),
          concept(
            "trace",
            "From kubectl apply to a running container",
            "You can narrate every hop: the API server authenticates, authorizes, admits and stores the Deployment; the Deployment controller creates a ReplicaSet; the ReplicaSet controller creates Pod objects with no node; the scheduler binds each to a node; that node's kubelet has the runtime create the sandbox, pull images and start containers, then reports status; once readiness passes the pod is Ready. Each step is a separate loop reacting to a stored object.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "break-it",
            "Break the cluster",
            "On a cluster whose control plane and nodes you can log in to, stop the scheduler and create a pod. Stop a kubelet and watch the node go NotReady and, after the toleration period, its pods marked for deletion (stuck Terminating while the kubelet is away) and replaced elsewhere. Exceed a container's memory limit and find OOMKilled, then find the same event in the node's cgroup files (the restarted container has a new cgroup, so read the oom_kill count in the pod-level memory.events). Set a CPU limit and observe throttling in cpu.stat.",
            {
              doneWhen: [
                "kubectl describe output and the matching cgroup evidence for the OOM kill and the throttling",
              ],
            },
          ),
        ]),
      ],
      {
        detail:
          "What runs on a machine: the kubelet, the runtime and the pod, and every way a pod starts, is checked, is limited and dies.",
        links: [K8S_CONCEPTS],
      },
    ),

    topic(
      "networking",
      "Cluster networking",
      [
        topic("pod-network", "The pod network model", [
          concept(
            "problem",
            "The problem with ports published per host",
            "On a single host, containers sit behind a private bridge and are reached through published host ports and NAT. Across many hosts that forces applications to coordinate port numbers and to know which host a peer is on.",
          ),
          concept(
            "rules",
            "The rules: an IP per pod, no NAT between pods",
            "Every pod gets its own IP address, any pod can reach any other pod at that address without NAT, and a pod sees itself with the same address others use for it. Applications can then use ordinary ports and treat pods like hosts on one flat network.",
          ),
          concept(
            "paths",
            "How packets cross nodes: routes or an overlay",
            "On one node, a pod's veth pair connects it to the host as in Networking. Between nodes there are two families of answer: teach the underlying network a route for each node's pod address range (static routes, cloud route tables, BGP), or wrap pod packets inside node-to-node packets (an overlay such as VXLAN), which works on any network but costs MTU and some CPU.",
          ),
          concept(
            "cni",
            "CNI",
            "Kubernetes states the rules and leaves the wiring to a plugin that implements the Container Network Interface (CNI). When the runtime creates a pod sandbox it runs the configured plugin with the sandbox's network namespace; the plugin creates the interface, assigns an IP and sets up routes, and undoes it on teardown. Until a plugin is installed, nodes report NotReady and ordinary pods cannot start.",
          ),
        ]),
        topic("services", "Services", [
          concept(
            "service",
            "What a Service gives you",
            "Pod IPs change every time a pod is replaced. A Service gives a stable virtual IP and DNS name that load-balances to the current set of ready pods matching a selector.",
          ),
          concept(
            "endpointslices",
            "EndpointSlices",
            "A controller watches Services and pods and writes the addresses, ports and readiness of the matching pods into EndpointSlice objects. They are the link between a selector and real backends. For a Service that does not answer, check in order that the selector matches the pod labels, that the pods are Ready, and that `kubectl get endpointslices` lists their addresses.",
          ),
          concept(
            "virtual-ip",
            "The ClusterIP is virtual",
            "No process listens on a ClusterIP. It exists as packet-rewriting rules on every node: a connection to the ClusterIP and port has its destination rewritten to one backend pod's IP and port, and connection tracking reverses the rewrite on replies.",
          ),
          concept(
            "kube-proxy",
            "kube-proxy and eBPF data planes",
            "kube-proxy runs on every node, watches Services and EndpointSlices and programs the kernel to do the rewriting; despite the name it does not carry the traffic. In iptables mode, still the default, each Service becomes a chain of DNAT rules that picks a backend at random. The nftables mode does the same job with set and map lookups that update and scale better, and is the recommended replacement; the IPVS mode is deprecated since Kubernetes 1.35. Some CNI plugins, such as Cilium, replace kube-proxy with eBPF programs in the kernel's network path that look the Service up in a hash map.",
          ),
          concept(
            "per-connection",
            "Balancing is per connection",
            "The backend is chosen when a connection is opened and stays fixed for its life. A long-lived HTTP/2 or gRPC connection therefore sends every request to one pod, and new pods receive nothing from existing connections. Balancing per request needs a layer-7 proxy or a client that balances itself.",
          ),
          concept(
            "types",
            "ClusterIP, NodePort and LoadBalancer",
            "Each type adds to the one before. ClusterIP: a virtual IP reachable only inside the cluster. NodePort: also opens the same port, from a reserved range (30000-32767 by default), on every node and by default forwards it to the Service's backends wherever they run (externalTrafficPolicy Local keeps it to backends on that node). LoadBalancer: also asks the cloud provider to create an external load balancer pointing at the nodes; outside a cloud something else must fulfil that request or the external address stays pending.",
          ),
          concept(
            "headless",
            "Headless Services",
            "With clusterIP set to None there is no virtual IP and no rewriting; DNS returns the pod IPs themselves. Used when the client needs to address individual pods, as with database replicas.",
          ),
        ]),
        topic("dns", "Cluster DNS", [
          concept(
            "coredns",
            "CoreDNS and Service names",
            "CoreDNS runs as ordinary pods behind a Service, watches Services and EndpointSlices and answers from them. A Service is reachable as <service>.<namespace>.svc.cluster.local, which resolves to its ClusterIP, or to the pod IPs for a headless Service.",
          ),
          concept(
            "resolv-conf",
            "A pod's resolv.conf, search domains and ndots",
            "With the default DNS policy, the kubelet writes each pod's /etc/resolv.conf with the cluster DNS Service as nameserver, search domains for the pod's namespace and the cluster, and ndots:5. A short name such as 'db' therefore resolves within the pod's own namespace, and an external name with fewer than five dots is first tried against every search domain, costing several failed lookups.",
          ),
        ]),
        topic("ingress", "Getting traffic in", [
          concept(
            "ingress",
            "Ingress and ingress controllers",
            "An Ingress object declares HTTP routing: host names and paths mapped to Services, plus TLS certificates. By itself it does nothing. An ingress controller, a reverse proxy running in the cluster, watches Ingress objects and configures itself to match: the controller pattern applied to a layer-7 proxy.",
          ),
          concept(
            "gateway",
            "The Gateway API",
            "The successor to Ingress splits the job by role: a GatewayClass names the implementation, a Gateway declares listeners (ports, protocols, TLS) and belongs to whoever runs the platform, and Routes such as HTTPRoute attach to a Gateway and belong to application teams.",
          ),
        ]),
        topic(
          "netpol",
          "NetworkPolicy",
          [
            concept(
              "model",
              "Open by default, allow-lists by policy",
              "With no policy, every pod can reach every other pod in every namespace. A NetworkPolicy selects pods by label and lists the peers (pods, namespaces or IP blocks) and ports allowed for ingress, egress or both. Policies only add allowances; as soon as any policy selects a pod for a direction, everything not allowed in that direction is dropped. A connection between two pods needs both the sender's egress and the receiver's ingress to allow it.",
            ),
            concept(
              "default-deny",
              "Default deny, and what enforces it",
              "A policy that selects every pod in a namespace and allows nothing blocks all traffic to or from those pods except what other policies allow. It is enforced by the CNI plugin; without a supporting plugin it does nothing. The API server stores the object either way, so always test with a connection that should fail.",
            ),
            concept(
              "egress",
              "Egress rules for untrusted workloads",
              "Default-deny egress also blocks DNS, so lookups to cluster DNS on port 53 must be allowed explicitly. To let a pod reach the internet but not the cloud metadata address (169.254.169.254) or cluster-internal ranges, allow an IP block and carve those ranges out of it with `except`.",
            ),
          ],
          { links: [NETWORK_POLICIES] },
        ),
        topic("observe", "Seeing it", [
          concept(
            "rules",
            "Reading a node's Service rules",
            "On a node running kube-proxy in iptables mode you can dump the NAT table with `iptables-save`, follow one Service from the KUBE-SERVICES chain to its per-endpoint DNAT rules, and find the matching flow in `conntrack -L`.",
          ),
          concept(
            "trace",
            "One request to a Service, hop by hop",
            "You can narrate it: the pod resolves the name through CoreDNS to a ClusterIP and connects; the packet leaves through the pod's veth; the node rewrites the destination to a backend pod IP; the packet is delivered on this node or routed to another; and the reply has the rewrite reversed on the way back.",
          ),
        ]),
      ],
      {
        detail: "How a pod gets an address, how a moving set of pods gets a stable one, and how traffic is restricted.",
        links: [K8S_CONCEPTS],
      },
    ),

    topic(
      "storage",
      "Storage and configuration",
      [
        topic("volumes", "Volumes", [
          concept(
            "problem",
            "Why containers need volumes",
            "A container's writable layer is discarded when the container is restarted, and containers in a pod cannot see each other's filesystems. A volume is a directory declared on the pod and mounted into one or more of its containers; it survives container restarts.",
          ),
          concept(
            "ephemeral",
            "emptyDir and hostPath",
            "An emptyDir starts empty on the node (or in memory) when the pod is assigned there and is deleted with the pod: scratch space, and a way for containers in a pod to share files. A hostPath mounts a directory of the node itself, which ties the pod to that node's contents and exposes the host, so it suits node agents only.",
          ),
        ]),
        topic("persistent", "Persistent storage", [
          concept(
            "pv-pvc",
            "PersistentVolume and PersistentVolumeClaim",
            "A PersistentVolume is a piece of real storage known to the cluster. A PersistentVolumeClaim is a namespaced request for storage of a given size, access mode and class. The split lets an application ask for '10 GiB, read-write' without knowing what provides it. A claim binds to exactly one volume and a pod mounts the claim by name.",
          ),
          concept(
            "access-modes",
            "Access modes",
            "ReadWriteOnce: mounted read-write by one node at a time. ReadOnlyMany and ReadWriteMany: by many nodes. ReadWriteOncePod: by a single pod. Network block devices such as cloud disks are normally ReadWriteOnce; sharing across nodes needs a network filesystem.",
          ),
          concept(
            "storage-class",
            "StorageClass and dynamic provisioning",
            "A StorageClass names a provisioner and its parameters, such as disk type. A claim that names a class causes a matching volume, and the real disk behind it, to be created on demand instead of an administrator creating volumes in advance. With binding mode WaitForFirstConsumer the disk is not created until a pod using the claim is scheduled, so it lands in the zone where the pod will run.",
          ),
          concept(
            "reclaim",
            "Reclaim policy",
            "When a claim is deleted, a volume with policy Delete is removed along with its underlying disk (the default for dynamically provisioned volumes), while Retain keeps the data for manual recovery. Deleting a claim can therefore delete data.",
          ),
          concept(
            "csi",
            "CSI: provision, attach, mount",
            "The Container Storage Interface is the gRPC contract a storage system implements so Kubernetes needs no built-in knowledge of it. A driver's controller part creates the disk and attaches it to the node where the pod was scheduled; its node part formats it if needed and mounts it for the pod. A ReadWriteOnce disk still attached to a dead node cannot attach elsewhere until it is detached, which the cluster does only after a timeout or an administrator's action, so pods with volumes can be slow to move after a node failure.",
          ),
        ]),
        topic("statefulsets", "StatefulSets", [
          concept(
            "why",
            "Why a Deployment does not fit a database",
            "A Deployment's pods are interchangeable: random names, started and stopped in any order, and all sharing the same claim if the template names one. A replicated database needs each member to keep its own name and its own disk across restarts.",
          ),
          concept(
            "identity",
            "Stable identity and ordering",
            "A StatefulSet names its pods with ordinals (db-0, db-1, db-2) and recreates a lost pod under the same name; paired with a headless Service, each pod gets a stable DNS name of its own. By default pods are created in order, each waiting for the previous one to be Ready, removed in reverse, and updated one at a time from the highest ordinal down.",
          ),
          concept(
            "claims",
            "One volume per pod",
            "volumeClaimTemplates create a separate claim for each ordinal, and a replacement pod with the same ordinal gets the same claim and so the same data. By default the claims are kept when the StatefulSet is scaled down or deleted.",
          ),
          concept(
            "at-most-one",
            "At most one pod per identity",
            "The controller will not create a replacement for db-1 until the old db-1 pod object is completely gone, so two processes never write the same disk. When a node is unreachable the pod is therefore not replaced automatically: safety is chosen over availability.",
          ),
          concept(
            "limits",
            "What a StatefulSet does not do",
            "It gives identity and storage only. It does not replicate data, elect a primary, take backups or handle failover; the application or an operator must.",
          ),
        ]),
        topic("config", "ConfigMaps and Secrets", [
          concept(
            "configmap",
            "ConfigMaps",
            "A ConfigMap stores configuration as key-value pairs in the API, separate from the image. A pod consumes it as environment variables or as files in a volume.",
          ),
          concept(
            "updates",
            "What happens when configuration changes",
            "Environment variables are fixed when the container starts. Files from a mounted ConfigMap or Secret are refreshed by the kubelet after a delay, but the application must re-read them, and files mounted with subPath are never refreshed. Changing a ConfigMap does not restart or roll out the pods that use it.",
          ),
          concept(
            "secrets",
            "Secrets",
            "A Secret has the same shape as a ConfigMap for sensitive values. The values are base64-encoded, which is an encoding and not encryption, and they sit in etcd unencrypted unless encryption at rest is configured on the API server. Anyone who can read Secrets in a namespace, or create pods there, can obtain them. On a node, the kubelet mounts a Secret volume from memory (tmpfs) so it is not written to the node's disk.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "hard-way",
            "Kubernetes the Hard Way",
            "Bring up a cluster by hand: certificates, etcd, API server, controller manager, scheduler, kubelet, container runtime and pod networking. It comes here because it uses every topic so far: the guide routes pod traffic with one static route per node, and its smoke tests check that a Secret is stored encrypted in etcd and reach a Deployment's pod through a NodePort Service. For each component, note which earlier section explains what it does.",
            {
              doneWhen: ["Smoke test output", "Component-to-concept map"],
              links: [KTHW],
              parts: [
                build(
                  "cluster",
                  "A working cluster passing the smoke tests",
                  "Every smoke test in the guide passes on the cluster you assembled yourself, with no installer and no managed service.",
                ),
                build(
                  "map",
                  "A map from each component to the concept behind it",
                  "For every component you installed, one line saying what it does and which earlier section explains the mechanism under it: for example etcd and Raft, the kubelet and cgroups, the certificates and mutual TLS, pod routes and the routing table.",
                ),
              ],
            },
          ),
        ]),
      ],
      {
        detail: "Data and configuration that must outlive a container, a pod or a node.",
        links: [K8S_CONCEPTS],
      },
    ),

    topic(
      "operators",
      "Operators",
      [
        topic("extend", "Extending the API", [
          concept(
            "crd",
            "CustomResourceDefinitions",
            "A CustomResourceDefinition adds a new resource type to the API. Once it is created, the API server serves the new kind like a built-in one: stored in etcd, with watch, RBAC and kubectl support, and no code written. By itself a custom resource is only stored data; nothing acts on it.",
          ),
          concept(
            "operator",
            "What an operator is",
            "An operator is a controller that manages those resources with domain knowledge. The knowledge of how to run something (how to fail over, when to recycle) moves out of a runbook and into a reconcile loop, which usually works by creating and adjusting built-in objects such as pods and Services.",
          ),
          concept(
            "schema",
            "Schemas and validation",
            "A CRD carries an OpenAPI schema for each version. The API server rejects objects that do not match it and drops unknown fields, so the controller does not have to handle malformed input. Rules a schema cannot express go in validation expressions or an admission webhook.",
          ),
          concept(
            "status-subresource",
            "The status subresource",
            "With it enabled, spec and status are written through separate endpoints: a write to the main resource cannot change status and a write to /status cannot change spec. Users and the controller get separate permissions and stop overwriting each other, and metadata.generation no longer increases for metadata or status changes, so in practice it counts spec changes.",
          ),
        ]),
        topic("machinery", "How a controller is built", [
          concept(
            "informer",
            "Informers and the local cache",
            "An informer lists one resource type, then watches it, keeps an in-memory copy up to date and calls handlers on add, update and delete. Controllers in one process share informers, so each type is watched once however many controllers use it.",
          ),
          concept(
            "stale-cache",
            "Reading from a cache that lags",
            "A controller reads from the informer cache, not from the API server, which is fast but slightly stale: an object it created a moment ago may not be visible yet. Controllers defend against acting twice with deterministic child names (a second create fails with AlreadyExists) and with optimistic concurrency on updates.",
          ),
          concept(
            "workqueue",
            "The work queue holds keys, not events",
            "Event handlers do no work; they put the object's namespace and name on a queue. The queue collapses repeated keys into one entry, never hands the same key to two workers at once, and re-adds failed keys with backoff. What changed, and how many times, is deliberately thrown away: ten events and one event lead to the same single pass over the latest state. This is level-triggering as code.",
          ),
          concept(
            "reconcile",
            "The reconcile function",
            "Given one key: fetch the object (if it is gone there is nothing to do), read the state of everything it owns, take the next step toward the spec, write status, and return. It handles one object and never blocks waiting for the world to change.",
          ),
          concept(
            "idempotent",
            "Idempotent reconciles",
            "Reconcile runs again for the same state after every restart (each existing object arrives as an add), on periodic resyncs and whenever a child changes. Every step must therefore check before it acts and give the same result when repeated; code that assumes it runs exactly once per change creates duplicates.",
          ),
          concept(
            "requeue",
            "Errors, requeue and requeue-after",
            "Returning an error retries the key with backoff. Returning 'requeue after a duration' is how time-based behaviour is built (an idle timeout, polling an external system) without in-memory timers that a restart would lose. Returning success means: do nothing until the next event.",
          ),
          concept(
            "owned",
            "Watching what you own",
            "A controller also watches the child objects it creates and maps each child event back to the parent's key. If someone deletes a child pod, the parent is reconciled and the pod is recreated.",
          ),
        ]),
        topic("ownership", "Ownership, deletion and status", [
          concept(
            "owner-refs",
            "Owner references and garbage collection",
            "A child object names its parent in metadata.ownerReferences. When the parent is deleted, the garbage collector controller deletes the children, by default in the background after the parent is gone. An owner must be in the same namespace as its dependents or be cluster-scoped.",
          ),
          concept(
            "finalizer",
            "Finalizers",
            "A finalizer is a marker that blocks deletion of an object until its controller has cleaned up external resources and removed the marker. Deleting such an object only sets its deletion timestamp; the API server removes it once the list in metadata.finalizers is empty.",
          ),
          concept(
            "finalizer-use",
            "When a finalizer is needed, and how it goes wrong",
            "Owner references clean up only objects inside the cluster. Anything outside it (a cloud disk, a DNS record, a row in another system) needs a finalizer so cleanup runs before the record of what to clean is gone. If the controller is not running, the object stays Terminating forever, and so does a namespace that contains it.",
          ),
          concept(
            "conditions",
            "Status conditions and observedGeneration",
            "Status carries a list of conditions, each with a type (such as Ready), a status of True, False or Unknown, a reason, a message and the time it last changed, so tools can wait on a condition without understanding the resource. The controller also copies the metadata.generation it acted on into status.observedGeneration; status describes the current spec only when the two match.",
          ),
        ]),
        topic("tooling", "kubebuilder and controller-runtime", [
          concept(
            "controller-runtime",
            "controller-runtime",
            "The Go library most operators are built on. A manager owns the shared cache and clients and runs the controllers; you write Reconcile(ctx, request) returning a result and an error, and declare which type the controller is for and which types it owns. Its default client reads from the cache and writes to the API server.",
          ),
          concept(
            "kubebuilder",
            "kubebuilder",
            "It scaffolds an operator project on controller-runtime and generates the CRD YAML, the RBAC rules for the controller's service account and the deep-copy code from your Go types and their marker comments.",
          ),
          concept(
            "leader-election",
            "Leader election for controllers",
            "Two replicas reconciling the same objects would duplicate work and fight. Replicas therefore compete for a Lease object; only the holder runs its controllers and it must keep renewing. A paused former leader can still act briefly after losing the lease, which is tolerable only because reconciles are idempotent and writes use optimistic concurrency.",
          ),
          concept(
            "envtest",
            "Testing against a real API server",
            "envtest starts a real API server and etcd locally with no kubelet and no built-in controllers. A test can create a custom resource and assert on the objects the reconciler creates, but no pod ever runs and nothing is garbage-collected.",
          ),
        ]),
        topic(
          "sandbox",
          "Sandboxes for untrusted code",
          [
            concept(
              "isolation",
              "Why a plain pod is not a sandbox, and what closes each gap",
              "A default pod shares the node's kernel, can connect to any pod and to the cloud metadata service, and has a service account token mounted. For code written by an agent or a user, each is a way out. A sandboxed runtime chosen by RuntimeClass (gVisor or Kata Containers) guards the kernel, a default-deny NetworkPolicy with narrow egress closes the network, resource limits contain runaway code, and turning off token mounting (automountServiceAccountToken: false) removes the path to the API.",
            ),
            concept(
              "security-context",
              "Security context and Pod Security Admission",
              "A pod's securityContext sets how its processes start: a non-root user, dropped Linux capabilities, no privilege escalation, a read-only root filesystem and a seccomp profile. Unless the kubelet's seccompDefault setting is on, a pod that names no profile runs Unconfined, so set RuntimeDefault. Pod Security Admission, built into the API server, rejects pods that break the baseline or restricted profile in namespaces labelled to enforce it.",
            ),
            concept(
              "warm-pool",
              "Warm pools",
              "Image pull, runtime start and init take seconds. Handing out an already-running pod makes creation feel instant, at the cost of idle capacity.",
            ),
            concept(
              "claim",
              "Claiming from a pool without double-assignment",
              "Two concurrent requests must not receive the same pod. The claim is an update to the pod (for example relabelling it out of the pool's selector) that carries its resourceVersion: one writer wins, the other gets a conflict and tries another pod, and the pool controller sees the count drop and refills.",
            ),
          ],
          {
            detail:
              "What it takes to run code you do not trust in a pod, and to hand one out quickly. The linked post describes Agent Sandbox, a Kubernetes project aimed at this workload.",
            links: [AGENT_SANDBOX],
          },
        ),
        topic("build", "Build it", [
          build(
            "sandbox-operator",
            "A Sandbox operator with a warm pool",
            "Define a Sandbox custom resource and write its controller in Go. Each Sandbox becomes a pod with resource limits, a default-deny NetworkPolicy that blocks the metadata address and cluster-internal ranges, and the gVisor RuntimeClass. Keep a pool of pre-started pods so claiming one takes under a second, and delete sandboxes after an idle timeout.",
            {
              doneWhen: ["Link to the operator", "Cold start vs warm claim times"],
              parts: [
                build(
                  "crd",
                  "Sandbox CRD with spec, status and a finalizer",
                  "The Sandbox type has a validated spec and a status with conditions that the controller keeps current. A finalizer makes sure that deleting a Sandbox removes its pod and policy before the object disappears.",
                ),
                build(
                  "pool",
                  "Warm pool that refills as sandboxes are claimed",
                  "A set number of pre-started pods is kept ready. A claim hands a pod to exactly one Sandbox even under concurrent claims, and the controller starts a replacement to bring the pool back to size.",
                ),
                build(
                  "policy",
                  "NetworkPolicy and RuntimeClass applied to every sandbox",
                  "Every sandbox pod runs under the gVisor RuntimeClass with resource limits and is covered by the default-deny NetworkPolicy. A test from inside a sandbox shows the metadata address and cluster-internal ranges are unreachable.",
                ),
                build(
                  "timing",
                  "Measured time to a ready sandbox, cold vs from the pool",
                  "You have measurements of the time from request to a ready sandbox both when a pod is created from nothing and when one is claimed from the pool, and the pool path takes under a second.",
                ),
              ],
            },
          ),
          build(
            "writeup",
            "Write-up: Kubernetes is a control loop",
            "Publish a post explaining your operator's reconcile loop and why level-triggered reconciliation tolerates missed events.",
            { doneWhen: ["Link to the published write-up"] },
          ),
        ]),
      ],
      {
        detail: "Your own resource types and the controllers that make them real.",
        links: [KUBEBUILDER],
      },
    ),

    topic(
      "durable",
      "Durable execution",
      [
        topic("problem", "The problem", [
          concept(
            "long-running",
            "Multi-step work that outlives a process",
            "An order fulfilment or an agent run is many steps over minutes or days: call a model, run a tool, wait for a person, repeat. The process running it will be deployed over, crash or lose its machine mid-step, and everything it held in memory (which step, what the earlier results were) goes with it.",
          ),
          concept(
            "state-table",
            "The hand-built answer: a queue and a state table",
            "Persist a row per run, put a message on a queue per step, and have workers update the row and enqueue the next step. It works, but you write the state machine, retries, timeouts, timers and deduplication yourself, and the logic of one run ends up scattered across handlers.",
          ),
          concept(
            "definition",
            "What durable execution is",
            "You write the run as one ordinary function. The engine records every step's result in an event history. After a crash, the workflow function is replayed with recorded results, so it resumes where it stopped.",
          ),
        ]),
        topic("model", "Workflows, activities and workers", [
          concept(
            "wf-vs-activity",
            "Workflow versus activity",
            "A workflow orchestrates and must be deterministic. An activity does the real work with side effects, and can be retried with timeouts.",
          ),
          concept(
            "workers",
            "The server never runs your code",
            "The Temporal service stores state and hands out tasks. Workers are your processes: they long-poll a task queue, run workflow and activity code, and report results. Killing a worker loses nothing durable; another worker polling the same queue picks the work up.",
          ),
          concept(
            "history",
            "The event history",
            "Each workflow execution has an append-only log of events: started, activity scheduled, activity completed with its result, timer started, timer fired, signal received, completed. Workflow code does not perform actions itself; it issues commands (schedule this activity, start this timer) that the server records as events and carries out. The history, not any worker's memory, is the state of the run.",
          ),
          concept(
            "workflow-id",
            "Workflow IDs",
            "You choose the Workflow ID, and only one execution with a given ID can be open at a time in a namespace. Using a business identifier (an order number, a run ID) makes starting a workflow idempotent: by default a duplicate start while the first run is open is rejected instead of creating a second run. Whether the ID may be reused after that run closes is set by an ID reuse policy.",
          ),
        ]),
        topic("replay", "Event history and deterministic replay", [
          concept(
            "replay",
            "Replay",
            "To resume a run it does not have in memory, a worker executes the workflow function from the top and feeds it the history. Every call whose result is already recorded returns that result at once without doing the work again. When the code reaches a point the history does not cover, execution is live again.",
          ),
          concept(
            "determinism",
            "Why workflow code must be deterministic",
            "It is re-executed during replay and must make the same decisions given the same history. Randomness, clocks and I/O belong in activities.",
          ),
          concept(
            "off-limits",
            "What is off limits in workflow code",
            "In the Go SDK: no time.Now, no random numbers, no native goroutines, channels or select, no logic that depends on map iteration order, no network or file I/O. The SDK provides replay-safe versions (workflow.Now, workflow.Sleep, workflow.Go, workflow channels and selectors), and everything else goes in an activity.",
          ),
          concept(
            "versioning",
            "Non-determinism errors and versioning",
            "Running executions carry histories written by old code. If new code asks for something different at the same point, such as another activity, replay fails with a non-determinism error and the run is stuck until compatible code is deployed. So a change to the sequence of commands is guarded: workflow.GetVersion records a marker so old runs take the old branch, or new code gets its own workers while old runs finish on the old ones. Activity implementations can change freely, because activity code is never replayed.",
          ),
          concept(
            "timers",
            "Durable timers",
            "workflow.Sleep records a timer on the server and no worker needs to stay alive for it. When the timer fires, the server schedules a task and any worker continues the run. A workflow can wait thirty days without holding a process, a thread or a connection.",
          ),
          concept(
            "continue-as-new",
            "History growth and Continue-As-New",
            "A history has a size limit and a long one is slow to replay. A workflow that loops indefinitely, such as a long agent session, periodically ends the current run and starts a fresh one under the same Workflow ID with its state passed as input.",
          ),
        ]),
        topic("activities", "Activities: retries, timeouts, idempotency", [
          concept(
            "at-least-once",
            "Activities run at least once",
            "An activity can run more than once: it may complete but its result be lost before being recorded, and then it is retried. The server cannot tell 'the worker died before the side effect' from 'the worker died after it'. Durable execution makes the workflow's logic advance exactly once; it does not make side effects happen exactly once.",
          ),
          concept(
            "idempotent",
            "Making activities idempotent",
            "Give each side effect a key that is the same on every retry, for example the workflow run ID plus the activity ID, and have the downstream system deduplicate on it; or check whether the effect already happened before doing it. Keep one side effect per activity, because an activity that does two and fails between them repeats the first on retry.",
          ),
          concept("timeouts", "Activity timeouts", undefined, {
            parts: [
              concept(
                "start-to-close",
                "Start-To-Close",
                "The longest a single attempt may take. The server does not otherwise know that a worker died mid-activity, so this timeout is what turns a dead worker into a retry. Set it on every activity.",
              ),
              concept(
                "schedule",
                "Schedule-To-Close and Schedule-To-Start",
                "Schedule-To-Close bounds the whole activity including all retries. Schedule-To-Start bounds how long a task may wait in the queue before any worker picks it up, which mostly detects that no workers are running.",
              ),
              concept(
                "heartbeat",
                "Heartbeats",
                "A long activity reports progress so the server can detect a dead worker quickly and retry, and so the activity learns it was cancelled. With a heartbeat timeout set, a missed heartbeat fails the attempt long before Start-To-Close would, and the heartbeat can carry progress that the next attempt reads to resume instead of starting over.",
              ),
            ],
          }),
          concept(
            "retry-policy",
            "Retry policies",
            "Activities are retried by default with exponential backoff until they succeed or a timeout ends them. You bound that with a maximum number of attempts and mark error types that must not be retried, such as invalid input. Workflows are not retried by default.",
          ),
        ]),
        topic("interact", "Signals, queries, updates and cancellation", [
          concept(
            "signals",
            "Signals",
            "A signal is a message sent to a running workflow from outside: a human approval, a new user message. It is recorded in the history, so it survives crashes and replays, and the sender gets no answer. In the Go SDK the workflow receives it on a signal channel it can wait on alongside timers and activities.",
          ),
          concept(
            "queries",
            "Queries",
            "A query reads a running workflow's current state synchronously, for example 'which step are you on'. It is not recorded in the history and its handler must not change state.",
          ),
          concept(
            "updates",
            "Workflow updates",
            "An update is a request that changes a running workflow and waits for its answer, such as 'add this message and return the new step number'. Like a signal it is recorded in the history; unlike a signal the caller gets a result or an error, and an optional validator can reject it before anything is recorded.",
          ),
          concept(
            "cancel",
            "Cancellation",
            "A cancel request is recorded in the history, and in the Go SDK it cancels the workflow's context. A running activity only learns of it when it next heartbeats, so an activity that never heartbeats cannot be interrupted. Cleanup activities must run on a context made with workflow.NewDisconnectedContext, because an activity scheduled on the cancelled context is cancelled at once.",
          ),
        ]),
        topic("when", "When to use it", [
          concept(
            "vs-queue",
            "Durable execution versus a queue and a state table",
            "Reach for a workflow engine when a run has many steps, branches, waits on people or timers, retries over hours, or must be inspectable step by step. A single independent job (resize this image) is simpler on a plain queue with an idempotent worker. The price of the engine: determinism rules, versioning discipline, a stateful service to run, and a persistence round trip on every step, so it does not belong in an inner loop.",
          ),
          concept(
            "read-history",
            "Reading an event history",
            "In the Temporal Web UI or with `temporal workflow show` you can read a run's history, find where a worker died (a workflow task that timed out, or a retried activity) and confirm that completed activities were not executed again. Retries do not add events: an activity's started event is written only when it finally completes or fails and carries the attempt count, and a still-retrying activity appears as pending with its current attempt in `temporal workflow describe`.",
          ),
        ]),
        topic("agents", "Agent loops as workflows", [
          concept(
            "loop-outside",
            "Keeping the loop outside the sandbox",
            "The sandbox can be killed (OOM, eviction, migration). With the loop outside, in a workflow engine, the run's state survives and it can reattach to a new sandbox.",
            { links: [EMERGENT] },
          ),
          concept(
            "llm-activity",
            "Model calls and tool calls are activities",
            "A model call is non-deterministic, slow and billed; a tool call has side effects. Both are activities, so each result is recorded once and replay neither calls the model again nor lets the run take a different path.",
          ),
          concept(
            "metering",
            "Metering that survives crashes",
            "Record usage events idempotently with unique IDs tied to the work unit, and reconcile against the source of truth rather than incrementing counters in memory. A retried step then writes the same event twice and is billed once.",
          ),
          concept(
            "quotas",
            "Per-tenant limits",
            "A concurrency limit caps how many runs or sandboxes a tenant has at once; a rate limit caps how fast it may start work or spend tokens. Both are checked before work starts, and the design must say what happens at the limit: reject with a retry hint, queue, or degrade.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "agent-workflow",
            "An agent tool loop as a durable workflow",
            "Model an agent run as a Temporal workflow: each LLM call and each tool execution is an activity with a timeout and retry policy. Kill the worker in the middle of a tool call and show the run resumes without repeating completed steps. Make side-effecting tools idempotent, add heartbeats to a long activity, and support cancelling a run.",
            {
              doneWhen: ["Link to the workflow", "Event history across a worker kill"],
              parts: [
                build(
                  "workflow",
                  "Workflow with LLM and tool activities",
                  "The agent loop is a workflow function, and every model call and every tool execution is an activity with its own timeout and retry policy. The LLM may be stubbed.",
                ),
                build(
                  "recovery",
                  "Recovery from a worker kill at three different points",
                  "Killing the worker at three different points in a run, including the middle of a tool call, each ends with the run completing on a restarted worker, and the event history shows no completed step executed again.",
                ),
                build(
                  "dedupe",
                  "Idempotent side effects verified by a duplicate-count test",
                  "A test forces a side-effecting tool activity to run again after its effect has already happened, and asserts the effect is counted exactly once downstream.",
                ),
                build(
                  "cancel",
                  "Cancellation that stops the run and cleans up",
                  "Cancelling a run interrupts a long activity through its heartbeat, stops the loop, and runs the cleanup steps to completion.",
                ),
              ],
            },
          ),
          build(
            "design-quotas",
            "Design doc: quotas and metering for a multi-tenant platform",
            "One page: per-tenant concurrency and rate limits, metering sandbox-seconds and tokens for billing, what happens at the limit, and how to keep metering correct when workers crash.",
            { doneWhen: ["Link to the design doc"] },
          ),
        ]),
      ],
      {
        detail: "Long-running, multi-step work written as ordinary code that survives crashes.",
        links: [TEMPORAL_101],
      },
    ),
  ],
);
