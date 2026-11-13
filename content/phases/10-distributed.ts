import { cards, lab, link, note, output, paid, project, read, url } from "../dsl";
import type { Phase } from "../types";

const DDIA = paid(
  "Designing Data-Intensive Applications, 2nd edition",
  "https://www.oreilly.com/library/view/designing-data-intensive-applications/9781098119058/",
);
const KLEPPMANN = link(
  "Distributed Systems lecture series (Martin Kleppmann)",
  "https://www.youtube.com/playlist?list=PLeKd45zvjcDFUEv_ohr_HdUFe97RItdiB",
);
const MIT = link("MIT 6.5840 Distributed Systems", "https://pdos.csail.mit.edu/6.824/");

export const phase: Phase = {
  id: "distributed",
  label: "Phase 9",
  title: "Concurrency and distributed systems",
  summary:
    "Partial failure is the normal case. Retries, idempotency, backpressure and clocks first, then consensus by building Raft yourself.",
  weeks: { start: 34, end: 39 },
  pillar: "distributed",
  modules: [
    {
      id: "dist-failure",
      title: "Partial failure, retries and idempotency",
      summary: "Weeks 34-35. The everyday distributed-systems skills.",
      items: [
        read("dist-ddia-replication", "DDIA: replication and sharding", {
          week: 34,
          hours: 12,
          source: "Designing Data-Intensive Applications, 2nd edition",
          chapters: "The chapters on replication and on sharding (partitioning)",
          links: [DDIA],
        }),
        read("dist-lectures-1", "Kleppmann lectures: models, time and broadcast", {
          week: 34,
          hours: 6,
          source: "University of Cambridge lecture series",
          chapters: "Lectures 1-4: introduction, models of distributed systems, time and clocks, broadcast protocols",
          links: [KLEPPMANN],
        }),
        read("dist-retries", "Timeouts, retries and backoff with jitter", {
          week: 34,
          hours: 2,
          source: "Amazon Builders' Library; AWS Architecture blog",
          links: [
            link("Timeouts, retries and backoff with jitter", "https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/"),
            link("Exponential backoff and jitter", "https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/"),
          ],
        }),
        lab("dist-retry-storm", "Cause and cure a retry storm", {
          week: 34,
          hours: 5,
          brief:
            "Simulate 1,000 clients calling a server that fails for ten seconds. Compare immediate retries, exponential backoff without jitter, and full jitter by plotting requests per second at the server. Add a retry budget (token bucket) and show total load stays bounded.",
          evidence: [
            output("load", "Server load over time for each of the four strategies"),
            note("policy", "The retry policy you would now put in a client library"),
          ],
        }),
        read("dist-ddia-trouble", "DDIA: the trouble with distributed systems, consistency and consensus", {
          week: 35,
          hours: 12,
          source: "Designing Data-Intensive Applications, 2nd edition",
          chapters: "The chapters on the trouble with distributed systems, and on consistency and consensus",
          links: [DDIA],
        }),
        read("dist-lectures-2", "Kleppmann lectures: replication, quorums and consensus", {
          week: 35,
          hours: 6,
          source: "University of Cambridge lecture series",
          chapters: "Lectures 5-8: replication, quorums, consensus and Raft, replica consistency",
          links: [KLEPPMANN],
        }),
        lab("dist-idempotency", "Idempotency keys end to end", {
          week: 35,
          hours: 6,
          brief:
            "Build a 'create payment' API. Kill the server after it commits but before it responds, while the client retries. Count duplicate payments. Add an Idempotency-Key header stored with the result in the same transaction, handle a concurrent duplicate request, and rerun the kill test.",
          evidence: [
            output("before", "Duplicates created without idempotency keys"),
            output("after", "The same test with zero duplicates, including the concurrent case"),
          ],
          links: [link("Designing robust and predictable APIs with idempotency", "https://stripe.com/blog/idempotency")],
        }),
      ],
    },
    {
      id: "dist-practice",
      title: "Distributed systems in practice",
      summary: "Weeks 36-37. Gossip Glomers, locks, leases and fencing.",
      items: [
        project("dist-gossip-glomers", "Gossip Glomers", {
          week: 36,
          hours: 22,
          brief:
            "Fly.io's six challenges, run against the Maelstrom simulator, in Go: echo, unique IDs, broadcast (with partitions and efficiency targets), a grow-only counter, a replicated log, and totally-available transactions.",
          deliverables: ["All six challenges passing Maelstrom's checker", "Notes on the broadcast efficiency numbers you reached"],
          evidence: [url("repo", "Link to your solutions"), output("checker", "Maelstrom results for the hardest challenge you completed")],
          links: [link("Gossip Glomers", "https://fly.io/dist-sys/")],
        }),
        read("dist-postmortems", "Postmortems: distributed failures", {
          week: 36,
          hours: 2,
          source: "Dan Luu's post-mortems collection",
          chapters: "Pick two involving retries, failover or a split brain",
          links: [link("Collection of postmortems", "https://github.com/danluu/post-mortems")],
        }),
        read("dist-raft-paper", "The Raft paper", {
          week: 37,
          hours: 5,
          source: "In Search of an Understandable Consensus Algorithm (extended version)",
          chapters: "Read fully; keep Figure 2 open while you code. Play with the visualization first",
          links: [link("Raft extended paper", "https://raft.github.io/raft.pdf"), link("Raft visualization", "https://thesecretlivesofdata.com/raft/")],
        }),
        lab("dist-fencing", "A lock that fails, then a fencing token", {
          week: 37,
          hours: 5,
          brief:
            "Take a Redis lock with a 5-second expiry, then SIGSTOP the holder for 10 seconds. A second process takes the lock and writes; resume the first and watch it overwrite. Add a monotonically increasing fencing token checked by the storage layer (a Postgres conditional update) and show the stale write is rejected.",
          evidence: [
            output("corruption", "The stale write succeeding without fencing"),
            output("rejected", "The stale write rejected with the fencing token"),
          ],
          links: [link("How to do distributed locking", "https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html")],
        }),
        project("dist-raft-election", "Raft: leader election (6.5840 lab 3A)", {
          week: 37,
          hours: 14,
          brief:
            "Implement Raft leader election and heartbeats in Go against MIT's test harness. Run the tests hundreds of times; a rare failure is a real bug.",
          deliverables: ["Lab 3A tests passing 200 consecutive runs", "Notes on each bug and what in Figure 2 you had missed"],
          evidence: [output("tests", "Test output from a long repeated run")],
          links: [MIT],
        }),
      ],
    },
    {
      id: "dist-consensus",
      title: "Consensus, clocks and backpressure",
      summary: "Weeks 38-39. Finish Raft, then the loose ends that bite in production.",
      items: [
        project("dist-raft-log", "Raft: log replication (6.5840 lab 3B)", {
          week: 38,
          hours: 18,
          brief:
            "Add log replication: AppendEntries consistency check, commit index advancement, and the election restriction. Debug with structured logs keyed by term and server.",
          deliverables: ["Lab 3B tests passing 200 consecutive runs"],
          evidence: [output("tests", "Test output from a long repeated run"), note("bugs", "Your hardest bug and how you found it")],
          links: [MIT, link("Students' Guide to Raft", "https://thesquareplanet.com/blog/students-guide-to-raft/")],
        }),
        read("dist-mit-lectures", "MIT 6.5840 lectures on Raft", {
          week: 38,
          hours: 3,
          source: "MIT 6.5840",
          chapters: "The two Raft lectures (fault tolerance: Raft 1 and 2)",
          links: [MIT],
        }),
        read("dist-jepsen", "Two Jepsen analyses", {
          week: 38,
          hours: 3,
          source: "Jepsen",
          chapters: "Pick two databases you have used. Note what was claimed, what broke, and under which fault",
          links: [link("Jepsen analyses", "https://jepsen.io/analyses")],
        }),
        project("dist-raft-persistence", "Raft: persistence (6.5840 lab 3C)", {
          week: 39,
          hours: 12,
          brief: "Persist term, vote and log so a restarted server rejoins correctly, and implement fast log backtracking.",
          deliverables: ["Lab 3C tests passing 100 consecutive runs"],
          evidence: [output("tests", "Test output from a long repeated run")],
          links: [MIT],
        }),
        read("dist-clocks", "There is no now", {
          week: 39,
          hours: 1.5,
          source: "ACM Queue (Justin Sheehy)",
          links: [link("There is No Now", "https://queue.acm.org/detail.cfm?id=2745385")],
        }),
        lab("dist-backpressure", "Backpressure and load shedding", {
          week: 39,
          hours: 5,
          brief:
            "Build a three-stage Go pipeline where the last stage is slow. With unbounded queues, overload it and watch memory and latency grow without limit. Replace with bounded channels, then add load shedding at the entrance with a deadline check, and compare goodput and p99.",
          evidence: [output("compare", "Memory, p99 latency and successful requests per second for the three designs")],
        }),
        lab("dist-design-webhooks", "Design doc: a webhook processor that never double-charges", {
          week: 39,
          hours: 3,
          brief:
            "One page: receive payment webhooks that may arrive twice, out of order or late; process each effect exactly once from the user's point of view. Cover idempotency, ordering, retries, a dead-letter path and reconciliation.",
          evidence: [url("doc", "Link to the design doc")],
        }),
        lab("dist-writeup", "Write-up: what building Raft taught me", {
          week: 39,
          hours: 3,
          brief: "Publish a post on your Raft implementation: the bugs, the debugging method, and where you see leases and fencing in systems you use.",
          evidence: [url("post", "Link to the published write-up")],
        }),
      ],
    },
  ],
};

export const quiz = [
  ...cards("dist-failure", [
    ["Why is a timeout ambiguous in a distributed system?", "You cannot tell whether the request was lost, is still running, or completed and the reply was lost. The operation may or may not have happened."],
    ["Why add jitter to exponential backoff?", "Without it, clients that failed together retry together in synchronized waves. Random delays spread the load out."],
    ["How do retries turn a small failure into an outage?", "Each layer retrying multiplies load on an already struggling service (a retry storm). Limit with retry budgets and by retrying at only one layer."],
    ["What is an idempotency key?", "A unique client-generated ID sent with a request. The server stores it with the result and returns that stored result for any repeat, so retries are safe."],
    ["Where must the idempotency record be written?", "In the same transaction as the operation's effect. Otherwise a crash between the two leaves them inconsistent."],
    ["What does a quorum of w + r > n guarantee?", "Every read set overlaps every write set in at least one node, so a read sees at least one copy of the latest acknowledged write."],
    ["Leader-based, multi-leader and leaderless replication: one risk of each?", "Leader-based: failover can lose or duplicate writes. Multi-leader: concurrent writes conflict. Leaderless: stale reads and conflict resolution fall on quorums and repair."],
    ["Why can you not order events across machines by wall-clock timestamps?", "Clocks drift and jump, so a later event can carry an earlier timestamp. Use logical clocks or a single sequencer for ordering."],
  ]),
  ...cards("dist-practice", [
    ["Why does a lock with an expiry not guarantee mutual exclusion?", "The holder can pause (GC, SIGSTOP, network delay) past the expiry and continue believing it holds the lock while another process has acquired it."],
    ["How does a fencing token fix that?", "Each lock grant carries a larger number. The resource remembers the highest it has seen and rejects writes with a smaller one, so the stale holder is refused."],
    ["What is a lease?", "A lock with a time limit that the holder must renew. It bounds how long a crashed holder blocks others, but still needs fencing for correctness."],
    ["What is a gossip protocol good for?", "Spreading information through a cluster by random peer exchange: scalable and tolerant of failures, with eventual rather than immediate delivery."],
    ["What is a CRDT, in one sentence?", "A data type whose concurrent updates can always be merged deterministically, so replicas converge without coordination (for example a grow-only counter)."],
    ["In Raft, what makes a candidate win an election?", "Votes from a majority in its term. A server votes at most once per term and only for a candidate whose log is at least as up to date as its own."],
    ["Why are randomized election timeouts used in Raft?", "To make it unlikely that several followers time out and split the vote at the same moment."],
  ]),
  ...cards("dist-consensus", [
    ["When is a Raft log entry committed?", "When the leader has replicated it on a majority and it is from the leader's current term (earlier-term entries are committed indirectly)."],
    ["What must a Raft server persist before responding to RPCs?", "Its current term, who it voted for in that term, and its log."],
    ["What does consensus give you that replication alone does not?", "A single agreed order of operations that survives failures and leader changes, which is what linearizable storage, leader election and locks need."],
    ["What is linearizability?", "The system behaves as if there were one copy of the data and every operation took effect atomically at some point between its start and end."],
    ["What does a Jepsen test do?", "Runs concurrent operations against a real cluster while injecting faults (partitions, clock skew, crashes), records the history, and checks it against the consistency model the system claims."],
    ["What is backpressure?", "A slow consumer signalling upstream to slow down, by bounded queues or blocking, so work in progress stays limited instead of piling up."],
    ["Why are unbounded queues dangerous?", "Under overload they grow until memory runs out, and every item waits longer, so the system does work on requests whose callers have already given up."],
    ["What is load shedding?", "Rejecting excess requests early and cheaply so the requests that are accepted still finish within their deadline."],
  ]),
];
