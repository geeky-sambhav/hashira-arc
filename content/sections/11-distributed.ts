import { build, concept, link, paid, section, topic } from "../dsl";

const DDIA = paid(
  "Designing Data-Intensive Applications, 2nd edition",
  "https://www.oreilly.com/library/view/designing-data-intensive-applications/9781098119058/",
);
const KLEPPMANN = link(
  "Distributed Systems lecture series (Martin Kleppmann)",
  "https://www.youtube.com/playlist?list=PLeKd45zvjcDFUEv_ohr_HdUFe97RItdiB",
);
const MIT = link("MIT 6.5840 Distributed Systems", "https://pdos.csail.mit.edu/6.824/");
const RAFT_PAPER = link("Raft extended paper", "https://raft.github.io/raft.pdf");
const RAFT_VIZ = link("Raft visualization", "https://thesecretlivesofdata.com/raft/");
const STUDENTS_GUIDE = link("Students' Guide to Raft", "https://thesquareplanet.com/blog/students-guide-to-raft/");
const LOCKING = link(
  "How to do distributed locking",
  "https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html",
);
const STRIPE_IDEMPOTENCY = link(
  "Designing robust and predictable APIs with idempotency",
  "https://stripe.com/blog/idempotency",
);
const GOSSIP_GLOMERS = link("Gossip Glomers", "https://fly.io/dist-sys/");
const JEPSEN = link("Jepsen analyses", "https://jepsen.io/analyses");

export default section(
  "distributed",
  {
    title: "Concurrency and distributed systems",
    summary:
      "Partial failure is the normal case. Why several machines are harder than one, the everyday tools (timeouts, retries, idempotency, backpressure), replication and consistency models, clocks and ordering, leases and fencing, consensus by building Raft yourself, and transactions that span nodes.",
  },
  [
    topic(
      "failure",
      "Why distributed systems are hard",
      [
        topic("partial", "Partial failure", [
          concept(
            "why-distribute",
            "Why a system is distributed at all",
            "One machine has a ceiling on load, loses everything when it dies, and is far away from most of its users. Spreading the work over several machines buys fault tolerance, capacity and lower latency. The price is every problem in this section.",
          ),
          concept(
            "partial-failure",
            "Partial failure",
            "A single process either works or crashes as a whole. In a distributed system some nodes and links fail while the rest keep running, and the failures are nondeterministic: the same request can succeed, fail or hang depending on timing. The code has to keep working while part of the system is broken.",
          ),
          concept(
            "messages-only",
            "Nodes know only what messages told them",
            "There is no shared memory and no global view. A node knows its own state and whatever messages it has received, and everything it believes about another node was true at some point in the past, not necessarily now.",
          ),
          concept(
            "timeout-ambiguity",
            "A timeout is ambiguous",
            "You cannot tell whether the request was lost, is still running, or completed and the reply was lost. The operation may or may not have happened.",
          ),
          concept(
            "slow-vs-dead",
            "A slow node looks the same as a dead one",
            "No reply within the timeout can mean a crash, a long pause, an overloaded node or a broken link, and the sender cannot tell which. Any failure detector built on timeouts will sometimes declare a live node dead, and the design must stay correct when it does.",
          ),
        ]),
        topic("network", "The unreliable network", [
          concept(
            "unbounded-delay",
            "No upper bound on message delay",
            "A packet network makes no promise about how long delivery takes: queues in switches, in the operating system and in the receiving process can each add delay without limit. So no timeout is long enough to prove a message is not still on its way.",
          ),
          concept(
            "faults",
            "Loss, delay, duplication and reordering",
            "A message can be dropped, arrive late, arrive more than once (usually because someone retried) or arrive after a message that was sent later. A protocol must give the right result under every combination of these.",
          ),
          concept(
            "tcp-limits",
            "What TCP does not solve",
            "TCP hides loss, duplication and reordering only inside one connection. When the connection breaks, the sender does not know which of its bytes the application on the other side processed, and after it reconnects and resends, the receiver can see the same request twice.",
          ),
          concept(
            "partition",
            "Network partitions",
            "A partition is a fault where some nodes cannot reach others although all of them are still running. Each side sees the other as dead and may carry on alone. Partitions can also be partial or one-way: A reaches B and B reaches C, but A cannot reach C.",
          ),
          concept(
            "two-generals",
            "The two generals problem",
            "Two parties that can only talk over a link that may lose messages can never become certain they have agreed: the last message sent is always unconfirmed, and one more acknowledgement only moves the doubt. This is why a client can never be sure a server acted on a request, and why protocols are made safe under retries instead of chasing certainty.",
          ),
        ]),
        topic("pauses", "Process pauses", [
          concept(
            "causes",
            "A process can stop at any line for any length of time",
            "A garbage collection pause, a suspended or live-migrated VM, swapping, a starved CPU or SIGSTOP can freeze a process for seconds or more. The process does not notice: when it resumes it continues from the same instruction with no sign that time has passed. So 'if my lease is still valid, then write' can pause between the check and the write.",
          ),
        ]),
        topic("models", "System models", [
          concept(
            "node-faults",
            "Crash-stop, crash-recovery and Byzantine faults",
            "Crash-stop: a node fails by halting for good. Crash-recovery: a node may crash and restart, keeping only what it wrote to stable storage. Byzantine: a node may do anything, including sending wrong or contradictory messages. Most data-centre systems are designed for crash-recovery and handle Byzantine behaviour only as far as checksums catch corrupted data.",
          ),
          concept(
            "timing",
            "Synchronous, partially synchronous and asynchronous",
            "Synchronous: message delay, processing time and clock drift all have known bounds. Asynchronous: no timing assumptions at all, so a timeout tells you nothing. Partially synchronous: the system behaves synchronously most of the time, but the bounds are sometimes exceeded for a while. Real systems are partially synchronous.",
          ),
          concept(
            "safety-liveness",
            "Safety and liveness",
            "A safety property says nothing bad ever happens (two nodes never decide different values); if it is broken you can point to the moment. A liveness property says something good eventually happens (every request eventually gets an answer). Good algorithms keep safety under every fault the model allows and promise liveness only once the system behaves well again.",
          ),
          concept(
            "flp",
            "The FLP impossibility result",
            "In a fully asynchronous system where even one node may crash, no deterministic algorithm can guarantee that consensus always terminates. Practical algorithms such as Raft and Paxos accept this: they never violate safety, and they make progress whenever messages are delivered in reasonable time (partial synchrony).",
          ),
          concept(
            "majority",
            "Majority quorums",
            "A node cannot trust its own view, because it may be the one that is partitioned or paused, so decisions need votes from a majority. Any two majorities share at least one node, so two conflicting decisions cannot both get one. A cluster of 2f + 1 nodes keeps working with f of them down: 3 tolerate 1, 5 tolerate 2, and 4 tolerate no more than 3 do.",
          ),
        ]),
        topic("observe", "Making faults on purpose", [
          concept(
            "inject",
            "Crash, pause and partition by hand",
            "On Linux you can send SIGKILL to model a crash, SIGSTOP and SIGCONT to model a long pause, and use netem delay and loss or a firewall DROP rule (both from Networking) to model a slow or partitioned link. The labs in this section rely on these.",
          ),
        ]),
      ],
      {
        detail:
          "What changes when a program spans machines: messages get lost, nodes pause, and nobody can see the whole system at once.",
        links: [DDIA, KLEPPMANN],
      },
    ),

    topic(
      "retries",
      "Timeouts, retries and idempotency",
      [
        topic("timeouts", "Timeouts and deadlines", [
          concept(
            "choosing",
            "Choosing a timeout",
            "Too short, and healthy but slow requests are abandoned and retried, which adds load. Too long, and callers hold connections, memory and threads while waiting on a dead dependency. A sound starting point is a high percentile of the dependency's measured latency (for example p99.9), which fixes the share of good requests you accept timing out falsely.",
          ),
          concept(
            "deadlines",
            "Deadlines that travel with the request",
            "A deadline is an absolute 'the caller stops caring at this time' passed down the call chain, so each hop uses the remaining budget instead of its own fixed timeout and stops work once the deadline has passed. Without it, lower layers keep working on requests the user abandoned long ago. In Go this is a context with a deadline.",
          ),
        ]),
        topic(
          "retry",
          "Retries",
          [
            concept(
              "retryable",
              "What is worth retrying",
              "Retry failures that are likely to be transient: a timeout, a connection error, a 503 or a 429. Do not retry a request the server rejected as invalid, because it will fail the same way. And retry only operations that are idempotent, because the first attempt may have succeeded.",
            ),
            concept(
              "amplification",
              "How retries turn a small failure into an outage",
              "Each layer retrying multiplies load on an already struggling service (a retry storm). With three attempts at each of five layers, one user request can become 243 requests at the bottom. Limit with retry budgets and by retrying at only one layer.",
            ),
            concept(
              "backoff",
              "Exponential backoff with a cap",
              "Wait longer after each failed attempt, typically doubling from a base delay up to a maximum, and give up after a fixed number of attempts. This lowers the pressure each client puts on a failing service, but on its own it does not stop clients from retrying in step with each other.",
            ),
            concept(
              "jitter",
              "Jitter",
              "Without it, clients that failed together retry together in synchronized waves. Random delays spread the load out. With full jitter each wait is a random value between zero and the current backoff ceiling: random(0, min(cap, base * 2^attempt)).",
            ),
            concept(
              "budget",
              "Retry budgets",
              "A budget caps retries as a share of normal traffic, for example a token bucket that gains a fraction of a token for each successful request and spends a whole one for each retry. When the dependency is down the bucket empties and the client sends little more than its normal load, so total load stays bounded however many requests fail.",
            ),
            concept(
              "breaker",
              "Circuit breakers",
              "A circuit breaker watches the failure rate of calls to one dependency. Closed: calls pass through. Open: after too many failures, calls fail at once without touching the dependency. Half-open: after a wait, a few trial calls decide whether to close again. It gives a failing service room to recover and gives callers a fast error instead of a slow timeout.",
            ),
            concept(
              "metastable",
              "Metastable failures",
              "A trigger (a brief spike, a deploy, a lost cache) pushes the system into a bad state that keeps itself going after the trigger is gone: timeouts cause retries, retries add load, load causes timeouts. The system does not recover by itself; someone has to break the loop by shedding load or cutting retries.",
            ),
            concept(
              "hedging",
              "Hedged requests",
              "To cut tail latency, send a second copy of a request to another replica when the first has not answered within, say, the 95th-percentile latency, use whichever reply arrives first and cancel the other. Waiting until the 95th percentile limits the extra load to about 5 percent. It is only safe for idempotent operations, and must be capped or it becomes a retry storm of its own.",
            ),
          ],
          {
            links: [
              link(
                "Timeouts, retries and backoff with jitter",
                "https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/",
              ),
              link(
                "Exponential backoff and jitter",
                "https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/",
              ),
            ],
          },
        ),
        topic("delivery", "Delivery guarantees", [
          concept(
            "at-most-least",
            "At-most-once and at-least-once",
            "Send once and never retry, and a message is delivered zero or one times: nothing is duplicated, some things are lost. Retry until acknowledged, and it is delivered one or more times: nothing is lost, some things are duplicated. A sender on an unreliable link has only these two choices.",
          ),
          concept(
            "effectively-once",
            "Exactly-once is really effectively-once",
            "The sender cannot tell a lost request from a lost acknowledgement, so exactly-once delivery is impossible. Systems that claim it use at-least-once delivery plus a receiver that recognises duplicates, so the effect is applied once however many times the message arrives. The duplicate check must sit where the effect is applied and use an ID that survives reconnects; TCP dropping duplicate packets does not help when the client resends on a new connection.",
          ),
        ]),
        topic(
          "idempotency",
          "Idempotency",
          [
            concept(
              "idempotent-op",
              "Idempotent operations",
              "An operation is idempotent if doing it several times leaves the same state as doing it once. 'Set balance to 50' and 'delete order 7' are idempotent; 'add 10 to balance' and 'create an order' are not. Where you can, make the operation naturally idempotent, for example a PUT to an ID the client chose.",
            ),
            concept(
              "key",
              "Idempotency keys",
              "A unique client-generated ID sent with a request. The server stores it with the result and returns that stored result for any repeat, so retries are safe. The client must reuse the same key for every retry of one logical operation and a fresh key for each new operation.",
            ),
            concept(
              "same-txn",
              "Where the idempotency record is written",
              "In the same transaction as the operation's effect. Otherwise a crash between the two leaves them inconsistent: either the effect exists with no record and a retry repeats it, or the record exists with no effect and a retry is wrongly answered as done.",
            ),
            concept(
              "concurrent",
              "Two requests with the same key at the same time",
              "A retry can arrive while the first attempt is still running. A unique constraint on the key makes exactly one insert win; the loser must wait for the winner's result or return an 'in progress' error, and must never run the operation a second time.",
            ),
            concept(
              "key-rules",
              "Scope, mismatch and expiry of keys",
              "Keys are scoped to one caller so two clients cannot collide. A repeat with the same key but different parameters is an error, not a replay, so the server stores a fingerprint of the request alongside the key. Records can be deleted after a retention period, which must be longer than any client keeps retrying.",
            ),
            concept(
              "downstream",
              "Side effects outside your database",
              "A call to another service or an email send cannot join your transaction. Either pass the downstream service an idempotency key derived from your own, or record the intent in your database in the same transaction and have a separate worker deliver it at least once (the outbox pattern).",
            ),
          ],
          { links: [STRIPE_IDEMPOTENCY] },
        ),
        topic("events", "Events that arrive twice, late or out of order", [
          concept(
            "dedup",
            "Deduplicating events at the consumer",
            "Webhooks and queue messages are delivered at least once. The consumer records each event's ID in the same transaction as the event's effect and skips any ID it has already recorded.",
          ),
          concept(
            "out-of-order",
            "Handling out-of-order events",
            "Retries and parallel delivery mean 'payment refunded' can arrive before 'payment succeeded'. Do not treat arrival order as event order: compare a version or sequence number carried in the event and ignore anything older than what you hold, or treat the event as a hint and fetch the current state from the source.",
          ),
          concept(
            "dead-letter",
            "Dead-letter queues",
            "A message that keeps failing (a poison message) is moved to a separate queue after a limited number of attempts, so it neither blocks the messages behind it nor retries forever. The dead-letter queue needs an alert and a way to replay messages once the bug is fixed, or it becomes a place where data is quietly lost.",
          ),
          concept(
            "reconciliation",
            "Reconciliation",
            "A periodic job compares your records with the source of truth (for example the payment provider's list of charges) and repairs any difference. It is the only defence against an event that was never delivered at all, and it catches bugs in every other mechanism.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "retry-storm",
            "Cause and cure a retry storm",
            "Simulate 1,000 clients calling a server that fails for ten seconds. Compare immediate retries, exponential backoff without jitter, and full jitter by plotting requests per second at the server. Add a retry budget (token bucket) and show total load stays bounded.",
            {
              doneWhen: [
                "Server load over time for each of the four strategies",
                "The retry policy you would now put in a client library",
              ],
            },
          ),
          build(
            "idempotency-lab",
            "Idempotency keys end to end",
            "Build a 'create payment' API. Kill the server after it commits but before it responds, while the client retries. Count duplicate payments. Add an Idempotency-Key header stored with the result in the same transaction, handle a concurrent duplicate request, and rerun the kill test.",
            {
              doneWhen: [
                "Duplicates created without idempotency keys",
                "The same test with zero duplicates, including the concurrent case",
              ],
              links: [STRIPE_IDEMPOTENCY],
            },
          ),
          build(
            "webhooks",
            "Design doc: a webhook processor that never double-charges",
            "One page: receive payment webhooks that may arrive twice, out of order or late; process each effect exactly once from the user's point of view. Cover idempotency, ordering, retries, a dead-letter path and reconciliation.",
            { doneWhen: ["A link to the design doc"] },
          ),
        ]),
      ],
      { detail: "The everyday skills: calling another machine without making its bad day worse or doing anything twice." },
    ),

    topic(
      "replication",
      "Replication models",
      [
        topic("why", "Why replicate", [
          concept(
            "goals",
            "Three reasons to keep copies",
            "Keeping the same data on several machines lets the system survive the loss of a machine, serve more reads than one machine can, and answer users from a copy near them. If the data never changed this would be trivial; all the difficulty is in handling changes.",
          ),
          concept(
            "log",
            "Replication is shipping an ordered log of changes",
            "The usual mechanism is a log: the node that accepts a write appends it to an ordered log, and other replicas apply the entries in the same order. A replica's position in that log says exactly how far behind it is.",
          ),
        ]),
        topic("single-leader", "Single-leader replication", [
          concept(
            "flow",
            "One leader takes writes, followers copy it",
            "All writes go to one node, the leader, which decides their order and streams them to the followers. Reads can go to the leader or to any follower. Because one node orders every write, there are no write conflicts.",
          ),
          concept(
            "sync-async",
            "Synchronous and asynchronous followers",
            "With a synchronous follower the leader waits for that follower's confirmation before acknowledging a write, so the write survives the leader's death, but a slow or dead follower stalls every write. With asynchronous followers the leader acknowledges at once: writes stay fast, and a leader crash can lose acknowledged writes. A common middle ground keeps one follower synchronous.",
          ),
          concept("failover", "Failover", undefined, {
            parts: [
              concept(
                "steps",
                "Detecting a dead leader and promoting a follower",
                "Failover has three steps: decide the leader is dead (by timeout), choose the follower with the most complete log as the new leader, and repoint clients and the other followers. The timeout is a trade-off: too short causes needless failovers when the leader is only slow, which adds load at the worst moment; too long extends the outage.",
              ),
              concept(
                "lost-writes",
                "Acknowledged writes lost in failover",
                "With asynchronous replication the new leader may be missing writes the old leader had already acknowledged. When the old leader comes back it has to discard them to rejoin, so clients were told 'saved' for data that no longer exists.",
              ),
              concept(
                "split-brain",
                "Split brain",
                "If the old leader was only slow or partitioned, it may keep accepting writes while the new leader does the same. The two copies diverge and there is no correct way to merge them. Preventing it takes a majority vote on who leads and a way to make the old leader's writes be refused (fencing).",
              ),
            ],
          }),
        ]),
        topic("lag", "Replication lag", [
          concept(
            "stale-followers",
            "Followers are behind the leader",
            "An asynchronous follower applies changes some time after the leader: usually a fraction of a second, but seconds or minutes under load or after a network problem. A read from a follower is a read of the past, and the system is only eventually consistent.",
          ),
          concept(
            "read-your-writes",
            "Read-your-writes",
            "A user saves a change and then reads from a follower that has not received it, so the change seems to have vanished. Fixes: read a user's own data from the leader, read from the leader for a short time after a write, or have the client remember the log position of its last write and read only from a replica that has reached it.",
          ),
          concept(
            "monotonic",
            "Monotonic reads",
            "Two reads that hit different followers can show newer data and then older data, so time appears to go backwards. The guarantee that this never happens is called monotonic reads. The usual fix is to send each user's reads to the same replica, or to track the position the user has already seen.",
          ),
        ]),
        topic("multi-leader", "Multi-leader replication", [
          concept(
            "why",
            "Why have more than one leader",
            "Several nodes each accept writes and replicate to one another. It is used when a single leader is not reachable or not close enough for everyone: one leader per data centre, devices that work offline and sync later, and collaborative editing.",
          ),
          concept(
            "conflicts",
            "Write conflicts",
            "Two leaders can accept different writes to the same record at the same time. Each write succeeds locally and the conflict is found only later during replication, when it is too late to return an error to either client. The cheapest fix is avoidance: route all writes for one record through the same leader.",
          ),
          concept(
            "lww",
            "Last write wins",
            "Give each write a timestamp and keep only the highest. Replicas converge, but the losing write is silently discarded although its client was told it succeeded, and with unsynchronised clocks the 'last' write is not necessarily the one that happened last.",
          ),
          concept(
            "crdt",
            "Merging instead of choosing: CRDTs",
            "A CRDT is a data type whose concurrent updates can always be merged deterministically, so replicas converge without coordination. Example: a grow-only counter keeps one count per node; each node increments only its own entry, a merge takes the larger value of each entry, and the counter's value is the sum of the entries.",
          ),
        ]),
        topic("leaderless", "Leaderless replication", [
          concept(
            "model",
            "Every replica accepts writes",
            "In a Dynamo-style store (Cassandra, Riak) there is no leader. A write is sent to all n replicas of a key in parallel and succeeds once w of them confirm; a read queries the replicas and waits for r answers. A node that was down misses writes and holds stale data until something repairs it.",
          ),
          concept(
            "quorum",
            "Quorum reads and writes: w + r > n",
            "Every read set overlaps every write set in at least one node, so a read sees at least one copy of the latest acknowledged write. With n = 3, w = 2 and r = 2, reads and writes both survive one node being down. The reader tells new from old by a version stored with each value.",
          ),
          concept(
            "repair",
            "Read repair and anti-entropy",
            "Read repair: when a read gets a newer value from one replica and an older one from another, the newer value is written back to the stale replica; only keys that are read get fixed this way. Anti-entropy: a background process compares replicas and copies whatever is missing, often using hash trees (Merkle trees) to find differences without sending all the data.",
          ),
          concept(
            "sloppy",
            "Sloppy quorums and hinted handoff",
            "When some of a key's home replicas are unreachable, a sloppy quorum accepts the write on other nodes, which hand it over when the home nodes return. Writes stay available, but the w nodes that took the write may not overlap the r nodes a read asks, so w + r > n no longer guarantees reading the latest value.",
          ),
          concept(
            "limits",
            "What a quorum does not guarantee",
            "w + r > n on its own does not make the store linearizable. Two concurrent writes can be applied in different orders on different replicas. A write that reached fewer than w nodes is reported as failed but is not rolled back, so later reads may or may not return it. A read that overlaps a write can return the new value to one client and the old value to a later one. Closing that gap needs synchronous read repair and costs latency.",
          ),
        ]),
        topic("sharding", "Sharding", [
          concept(
            "schemes",
            "Sharding by key range or by hash",
            "Replication copies the same data to several nodes; sharding (partitioning) splits the data so each node holds a different part, and each shard is then replicated. Key ranges keep neighbouring keys together, so range scans are cheap, but sequential keys such as timestamps send every write to one shard. Hashing the key spreads load evenly and gives up efficient range scans. Either way one very popular key still lands on one shard.",
          ),
          concept(
            "rebalance",
            "Rebalancing and request routing",
            "Assigning keys with hash mod N moves almost every key when N changes, so systems use a fixed set of many small shards, or consistent hashing, and move whole shards between nodes. Every client or router then needs the current shard-to-node map, and all nodes must agree on it, which is usually a job for a consensus service.",
          ),
        ]),
        topic("compare", "Comparing the models", [
          concept(
            "risks",
            "One risk of each model",
            "Leader-based: failover can lose or duplicate writes. Multi-leader: concurrent writes conflict. Leaderless: stale reads and conflict resolution fall on quorums and repair.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "postmortems",
            "Read two distributed-failure postmortems",
            "From Dan Luu's collection, pick two outages involving retries, failover or a split brain. For each, write down the trigger, why it spread, and what would have contained it.",
            {
              doneWhen: ["Half a page per postmortem in your notes"],
              links: [link("Collection of postmortems", "https://github.com/danluu/post-mortems")],
            },
          ),
        ]),
      ],
      {
        detail: "Three ways to keep copies of changing data on several machines, and what each one gets wrong.",
        links: [DDIA, KLEPPMANN],
      },
    ),

    topic(
      "consistency",
      "Consistency models",
      [
        topic("model", "What a consistency model is", [
          concept(
            "contract",
            "A contract about what concurrent clients may see",
            "A consistency model is a rule for which results a replicated system may return when several clients read and write at once. A stronger model allows fewer surprising results and is easier to program against, and it costs more coordination, which means more latency and less availability during faults.",
          ),
          concept(
            "history",
            "Operations take time and can overlap",
            "Each operation has a start (the request is sent) and an end (the response arrives). Two operations are concurrent when their intervals overlap; one precedes the other in real time only if it ended before the other started. Consistency models are defined over histories of such operations.",
          ),
        ]),
        topic("linearizable", "Linearizability", [
          concept(
            "definition",
            "Linearizability defined",
            "The system behaves as if there were one copy of the data and every operation took effect atomically at some point between its start and end. Operations that overlap may take effect in either order; an operation that ended before another started must take effect first.",
          ),
          concept(
            "recency",
            "The recency guarantee",
            "Once a write has completed, every later read by any client returns that value or a newer one. And once any read has returned the new value, no later read may return the old one, even from a different replica. A follower that serves the old value after the write was acknowledged breaks linearizability.",
          ),
          concept(
            "needs",
            "What needs linearizability",
            "Anything where two parties must not both succeed: acquiring a lock or electing a leader, enforcing a unique username, not selling the last seat twice, not spending a balance twice. Each is an atomic compare-and-set on one current value that everyone agrees on.",
          ),
          concept(
            "cost",
            "What it takes to provide it",
            "A node cannot answer from its own copy alone, because that copy might be stale; it has to confirm with a majority, so response time is tied to network delay between replicas and nodes cut off from a majority must refuse requests. Consensus-based replication can be linearizable. Asynchronous single-leader, multi-leader and Dynamo-style leaderless replication are not.",
          ),
        ]),
        topic("others", "Other models", [
          concept(
            "serializable",
            "Serializability is a different property",
            "Serializability is about transactions that touch several objects: the result must equal running the transactions one at a time in some order, and that order need not match real time. Linearizability is about real-time recency of single operations on one object. A system that gives both is called strictly serializable.",
          ),
          concept(
            "sequential",
            "Sequential consistency",
            "All operations appear to run in one total order that every node agrees on, and each client's own operations keep their order within it, but the order need not match real time. So a client always sees its own earlier writes, yet may read a value that another client has already overwritten by the wall clock.",
          ),
          concept(
            "causal",
            "Causal consistency",
            "If one operation could have influenced another (the second saw the first's effect), every node applies them in that order; operations that are concurrent may be applied in different orders on different nodes. It needs no agreement from a majority, so unlike linearizability it can stay available during a partition, provided each client keeps talking to a replica that already has everything the client has seen.",
          ),
          concept(
            "eventual",
            "Eventual consistency",
            "If writes stop, all replicas eventually hold the same value. It promises nothing about how long that takes or what a read returns meanwhile, so a read may be stale and two reads may disagree. Strong eventual consistency adds that any two replicas that have received the same set of updates are in the same state, which is what CRDTs provide.",
          ),
        ]),
        topic("cap", "CAP and PACELC", [
          concept(
            "cap",
            "The CAP theorem stated correctly",
            "When a network partition cuts replicas off from each other, a system must choose: stay linearizable by refusing requests on nodes that cannot reach a majority, or stay available by answering on every node and giving up linearizability. It is not 'pick two of three', because you cannot choose to have no partitions.",
          ),
          concept(
            "cap-limits",
            "What CAP does not say",
            "'Consistent' means linearizable only, 'available' means every running node must answer every request, and the only fault considered is a partition. It says nothing about latency, crashes or weaker consistency models, and many real systems are neither consistent nor available by these definitions. 'CP' and 'AP' are rough labels, not a design method.",
          ),
          concept(
            "pacelc",
            "PACELC",
            "If there is a Partition, choose Availability or Consistency; Else, with the network healthy, choose Latency or Consistency. The second half is the one felt every day: stronger consistency means waiting for more replicas on every request.",
          ),
        ]),
        topic("choosing", "Choosing per feature", [
          concept(
            "per-feature",
            "The consistency a feature actually needs",
            "Decide per operation, not per system. A unique username, a seat booking or a lock needs linearizability. A profile edit needs read-your-writes for its author and can be eventually consistent for everyone else. A like counter can be eventually consistent. A comment thread needs causal order so a reply never shows before its parent.",
          ),
          concept(
            "coordination",
            "When coordination is unavoidable",
            "If an invariant can be broken by two operations that are each valid alone (two users taking the same name, two withdrawals emptying one balance), some node must see both before either is confirmed, and that is coordination. If the operations commute, such as increments or adding to a set, replicas can accept them independently and merge later.",
          ),
        ]),
      ],
      {
        detail: "The precise promises a replicated system can make about what a read returns, and what each one costs.",
        links: [DDIA, KLEPPMANN],
      },
    ),

    topic(
      "time",
      "Time and ordering",
      [
        topic("physical", "Physical clocks", [
          concept(
            "two-clocks",
            "Time-of-day clocks and monotonic clocks",
            "A time-of-day (wall) clock reports the date and time, is adjusted by NTP, and can jump forwards or backwards. A monotonic clock only moves forward and means nothing outside its own machine. Measure timeouts and durations with the monotonic clock: Go's time.Since, Python's time.monotonic and Node's performance.now all do.",
          ),
          concept(
            "ntp",
            "Clock drift and NTP",
            "A computer's clock is a quartz oscillator that runs slightly fast or slow and changes rate with temperature, so two machines drift apart unless corrected. NTP estimates the offset to a time server from the send and receive timestamps of a request and its reply, assuming equal delay in both directions. Any asymmetry becomes clock error, so synchronised clocks still differ, typically by milliseconds over the internet and by far more when the network or a server misbehaves.",
          ),
          concept(
            "step-slew",
            "Slewing and stepping",
            "A small offset is corrected by running the clock slightly faster or slower (slewing). A large offset is corrected by jumping the clock (stepping), so the wall clock can move backwards or skip ahead. A VM resumed after a pause sees a jump too.",
          ),
          concept(
            "check-sync",
            "Checking a machine's clock",
            "On Linux, `timedatectl` shows whether the system clock is synchronised, and where chrony is the NTP client `chronyc tracking` shows the estimated offset from the reference. The offset is the client's own estimate, not a guarantee.",
          ),
        ]),
        topic("ordering", "Why timestamps cannot order events", [
          concept(
            "wall-clock",
            "Wall-clock timestamps across machines",
            "Clocks drift and jump, so a later event can carry an earlier timestamp. Use logical clocks or a single sequencer for ordering.",
          ),
          concept(
            "lww-loss",
            "How last-write-wins loses data",
            "Node A's clock runs a few milliseconds ahead of node B's. A client writes x = 1 through A, then one millisecond later another client writes x = 2 through B. B's write carries the smaller timestamp, so every replica keeps x = 1 and drops the later write. No error is raised anywhere.",
          ),
          concept(
            "no-now",
            "There is no 'now'",
            "Information takes time to travel, so no node can know the current state of another, only a past state. Two events on different machines with no message between them have no order the system can observe, and a design that depends on knowing which was really first depends on something it cannot find out.",
            { links: [link("There is No Now", "https://queue.acm.org/detail.cfm?id=2745385")] },
          ),
          concept(
            "happens-before",
            "The happens-before relation",
            "Event a happened before b if they are on the same node and a came first, or a is the sending of a message and b its receipt, or a chain of such steps leads from a to b. If neither happened before the other they are concurrent, which means neither could have known about the other, not that they occurred at the same instant.",
          ),
        ]),
        topic("logical", "Logical clocks", [
          concept("lamport", "Lamport clocks", undefined, {
            parts: [
              concept(
                "rule",
                "The Lamport clock algorithm",
                "Each node keeps a counter. It increments the counter for every local event and every send, and attaches the value to the message. On receiving a message it sets its counter to the larger of its own value and the message's, then adds one.",
              ),
              concept(
                "property",
                "What Lamport timestamps guarantee",
                "If a happened before b, then a's timestamp is smaller than b's. The reverse does not hold: a smaller timestamp does not mean the event came first, because concurrent events get unrelated values.",
              ),
              concept(
                "total-order",
                "A total order, and what it cannot do",
                "Breaking ties by node ID gives a total order of all events that is consistent with causality. It cannot tell you whether two events were concurrent, and a node cannot act on the order until it is sure no event with a smaller timestamp is still to arrive, which means hearing from every other node.",
              ),
            ],
          }),
          concept("vector", "Vector clocks", undefined, {
            parts: [
              concept(
                "rule",
                "The vector clock algorithm",
                "Each node keeps one counter per node in the system. It increments its own entry on every event, sends the whole vector with each message, and on receipt takes the element-wise maximum of the two vectors and then increments its own entry.",
              ),
              concept(
                "compare",
                "Comparing two vectors",
                "a happened before b exactly when every entry of a's vector is less than or equal to b's and at least one is smaller. If each vector is larger in some entry, the events are concurrent. Unlike Lamport timestamps, the comparison works in both directions.",
              ),
              concept(
                "use",
                "Version vectors in a data store",
                "A store attaches a vector to each value. A write whose vector dominates the stored one replaces it; a write that is concurrent with it is a conflict, and both versions are kept for the application to merge instead of one silently overwriting the other. The cost is a vector that grows with the number of writers.",
              ),
            ],
          }),
          concept(
            "hlc",
            "Hybrid logical clocks",
            "A hybrid logical clock timestamp combines the largest physical time the node has seen with a logical counter that breaks ties. It stays close to wall-clock time, never goes backwards, and like a Lamport clock is always larger after receiving a message than the timestamp on that message. CockroachDB orders transactions with HLC timestamps.",
          ),
          concept(
            "truetime",
            "TrueTime",
            "Google's TrueTime API returns an interval [earliest, latest] that is guaranteed to contain the true time, kept narrow with GPS receivers and atomic clocks. Spanner waits out the width of the interval before reporting a commit, so if one transaction commits before another starts, its timestamp is guaranteed to be smaller. Clock uncertainty becomes a short, explicit wait.",
          ),
        ]),
        topic("broadcast", "Ordering by broadcast", [
          concept(
            "kinds",
            "FIFO, causal and total order broadcast",
            "Broadcast protocols deliver a message to every node and differ in the order they promise. FIFO: messages from one sender are delivered in the order sent. Causal: a message is delivered only after the messages that happened before it. Total order: every node delivers all messages in the same order.",
          ),
          concept(
            "sequencer",
            "Total order broadcast and the sequencer",
            "If every replica applies the same writes in the same order, the replicas stay identical. The easy implementation is one node (a sequencer or leader) that numbers every message. The hard part is replacing that node when it fails without two nodes handing out numbers, and doing that safely is the consensus problem.",
          ),
        ]),
        topic("ids", "Unique IDs", [
          concept(
            "unique-ids",
            "Generating unique IDs without coordination",
            "Options: a large random number (a version 4 UUID has 122 random bits, so collisions are negligible); a node ID plus a local counter; or a timestamp plus node ID plus sequence number, which sorts roughly by time but has to guard against the clock moving backwards. None needs a round trip to another node.",
          ),
        ]),
      ],
      {
        detail: "Why clocks cannot be trusted to say what happened first, and what to use instead.",
        links: [KLEPPMANN, DDIA],
      },
    ),

    topic(
      "locks",
      "Leases, locks and fencing",
      [
        topic("why", "What a distributed lock is for", [
          concept(
            "purpose",
            "Locks for efficiency and locks for correctness",
            "A lock taken to avoid doing the same work twice (efficiency) can tolerate occasionally having two holders: the cost is some wasted work. A lock taken to stop two writers corrupting data (correctness) cannot tolerate it even once. Know which one you need, because only the second requires everything below.",
          ),
          concept(
            "holder-fails",
            "The holder can fail while holding the lock",
            "An in-process mutex disappears together with a crashed process. A lock held over the network can belong to a client that has crashed or been cut off, and the lock service cannot tell which. Without a time limit the lock would be stuck forever.",
          ),
        ]),
        topic("leases", "Leases", [
          concept(
            "lease",
            "What a lease is",
            "A lock with a time limit that the holder must renew. It bounds how long a crashed holder blocks others, but still needs fencing for correctness.",
          ),
          concept(
            "expiry-unsafe",
            "Why a lock with an expiry is not mutual exclusion",
            "The holder can pause (GC, SIGSTOP, network delay) past the expiry and continue believing it holds the lock while another process has acquired it.",
          ),
          concept(
            "scenario",
            "The GC-pause scenario step by step",
            "Client 1 takes the lease and starts work, then pauses for longer than the expiry. The lock service, hearing no renewal, grants the lease to client 2, which writes. Client 1 resumes with no idea that time passed, and writes too, overwriting client 2. Checking the expiry before writing does not help, because the pause can fall between the check and the write.",
          ),
          concept(
            "clocks",
            "Leases depend on clocks",
            "The holder and the lock service time the lease on different clocks. The holder should time it with a monotonic clock, starting from before it sent the request, and treat the lease as expired somewhat earlier than the service does. This narrows the window and assumes bounded clock drift; it does not remove the pause problem.",
          ),
        ]),
        topic("fencing", "Fencing tokens", [
          concept(
            "token",
            "How a fencing token works",
            "Each lock grant carries a larger number. The resource remembers the highest it has seen and rejects writes with a smaller one, so the stale holder is refused.",
          ),
          concept(
            "resource",
            "The resource must do the checking",
            "The check has to happen inside the storage system, atomically with the write, for example a conditional update that applies only when the token is at least the stored one. A lock service cannot enforce mutual exclusion on its own; the thing being protected has to take part.",
          ),
          concept(
            "source",
            "Where tokens come from",
            "The number must increase with every grant and never repeat, even across a failover of the lock service, so it has to come from a linearizable store. ZooKeeper's transaction ID or an etcd revision can serve as a token, and a Raft term plays the same role for leaders.",
          ),
          concept(
            "redis",
            "Why a Redis lock is not enough for correctness",
            "A lock on a Redis primary (SET with NX and an expiry) can be granted twice after failover to a replica, because Redis replication is asynchronous. Redlock takes the lock on a majority of independent Redis nodes. Kleppmann argues its safety rests on timing assumptions (bounded pauses, delays and clock drift) and that it issues no increasing fencing token, so it suits efficiency locks only. Its author, antirez, replied that it needs only clocks that advance at roughly the same rate, and that a random per-lock value used in a check-and-set can stand in for a token. The dispute is over whether those timing assumptions are acceptable for correctness.",
            { links: [LOCKING] },
          ),
        ]),
        topic("election", "Leader election", [
          concept(
            "as-lease",
            "Leader election is a lease on a role",
            "'Be the leader' is a lock that at most one node may hold, with the same hazard: a deposed leader that has not noticed keeps acting. The fix is the same too: every leadership period gets a larger number (an epoch or term), and followers and storage reject requests that carry an older one.",
          ),
          concept(
            "needs-consensus",
            "Election needs a consensus service underneath",
            "Nodes cannot elect a leader by each deciding from its own view, because nodes on each side of a partition would elect their own. The decision has to go through a majority, so in practice services take a lease in a store built on consensus (etcd, ZooKeeper, Consul) instead of writing their own election.",
          ),
          concept(
            "in-practice",
            "Leases and fencing in systems you use",
            "Kubernetes control-plane components and many controllers elect a leader by holding and renewing a Lease object through the API server, which stores it in etcd; client-go's leader election states that it does not provide fencing, so a deposed leader can briefly overlap with the new one. Kafka numbers each controller and partition leadership with an epoch, and requests carrying an older epoch are rejected. Raft's term is the same idea built into the protocol.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "fencing-lab",
            "A lock that fails, then a fencing token",
            "Take a Redis lock with a 5-second expiry, then SIGSTOP the holder for 10 seconds. A second process takes the lock and writes; resume the first and watch it overwrite. Add a monotonically increasing fencing token checked by the storage layer (a Postgres conditional update) and show the stale write is rejected.",
            {
              doneWhen: [
                "The stale write succeeding without fencing",
                "The stale write rejected with the fencing token",
              ],
              links: [LOCKING],
            },
          ),
        ]),
      ],
      {
        detail: "Why 'only one of us may do this' cannot be enforced by a timeout alone, and what does enforce it.",
        links: [LOCKING, DDIA],
      },
    ),

    topic(
      "raft",
      "Consensus with Raft",
      [
        topic("problem", "The problem", [
          concept(
            "consensus",
            "What consensus means",
            "Several nodes must decide on one value so that no two nodes decide differently (agreement), the value decided was proposed by some node (validity), and every node that has not failed eventually decides (termination). The first two are safety properties; termination is liveness.",
          ),
          concept(
            "vs-replication",
            "What consensus adds to replication",
            "A single agreed order of operations that survives failures and leader changes, which is what linearizable storage, leader election and locks need.",
          ),
          concept(
            "rsm",
            "The replicated state machine",
            "If every server starts in the same state and applies the same deterministic commands in the same order, every server ends in the same state. So keeping a service consistent reduces to getting all servers to agree on one log of commands. Raft does this with a strong leader: entries flow only from the leader to followers, which splits the work into leader election, log replication and safety.",
          ),
          concept(
            "assumptions",
            "What Raft assumes",
            "Servers may crash and restart with their disk intact, and messages may be lost, delayed, duplicated or reordered. No server lies (no Byzantine faults). Safety never depends on timing; only progress does. A cluster of 2f + 1 servers stays available with f of them down.",
          ),
        ]),
        topic("terms", "Terms and server states", [
          concept(
            "states",
            "Follower, candidate, leader",
            "Every server is in one of three states. A follower is passive and only answers requests. A follower that hears nothing for a while becomes a candidate and asks for votes. A candidate that wins becomes the leader and handles all client requests until it fails or sees a higher term.",
          ),
          concept(
            "terms",
            "Terms are Raft's logical clock",
            "Time is divided into numbered terms. Each term starts with an election and has at most one leader; a term whose election splits the vote has none. Every server stores the latest term it has seen.",
          ),
          concept(
            "term-rules",
            "The term rules on every message",
            "Every request and reply carries the sender's term. A server that sees a larger term adopts it, clears its vote (a vote belongs to one term) and, if it was a candidate or leader, becomes a follower at once. A server that receives a request with a smaller term rejects it. This is how a stale leader learns it has been replaced.",
          ),
          concept(
            "rpcs",
            "Two RPCs carry the basic protocol",
            "RequestVote is sent by candidates to gather votes. AppendEntries is sent by the leader to replicate log entries, and with no entries it serves as the heartbeat. A sender retries an RPC that gets no reply, and both RPCs are safe to receive more than once.",
          ),
        ]),
        topic("election", "Leader election", [
          concept(
            "timeout",
            "Heartbeats and the election timeout",
            "The leader sends heartbeats to every follower. A follower that receives no AppendEntries from the current leader and grants no vote within its election timeout assumes there is no leader and starts an election.",
          ),
          concept(
            "start",
            "Starting an election",
            "The follower increments its current term, becomes a candidate, votes for itself, resets its election timer and sends RequestVote to every other server in parallel. The request carries the candidate's term and ID and the index and term of its last log entry.",
          ),
          concept(
            "win",
            "What makes a candidate win",
            "Votes from a majority in its term. A server votes at most once per term and only for a candidate whose log is at least as up to date as its own.",
          ),
          concept(
            "outcomes",
            "The three ways an election ends",
            "The candidate gets a majority and becomes leader, sending heartbeats at once. Or it receives AppendEntries from a leader whose term is at least its own and returns to follower. Or nobody wins, its timer expires, and it starts a new election in a new term.",
          ),
          concept(
            "randomized",
            "Randomized election timeouts",
            "Each server picks a fresh random timeout from a fixed range every time it resets its timer. This makes it unlikely that several followers time out and split the vote at the same moment: usually one times out first, wins, and sends heartbeats before the others start.",
          ),
          concept(
            "restriction",
            "The election restriction",
            "A voter refuses a candidate whose log is less up to date than its own. 'More up to date' compares the last entries of the two logs: the higher term wins, and with equal terms the longer log wins. This keeps a server that is missing committed entries from becoming leader.",
          ),
          concept(
            "timing",
            "The timing requirement",
            "Raft keeps a steady leader when the time to send a round of RPCs is much less than the election timeout, which is much less than the typical time between server failures. If the election timeout is close to the time a heartbeat round takes, followers keep starting elections against a healthy leader.",
          ),
          concept(
            "timer-reset",
            "When to reset the election timer",
            "Only in three cases: on AppendEntries from the current leader (not one with a stale term), on starting an election, and on granting a vote. Resetting it on other messages, such as a vote request you refuse, can keep the servers with the most complete logs from ever starting an election.",
          ),
        ]),
        topic("log", "Log replication", [
          concept(
            "entries",
            "Log entries",
            "Each entry holds a client command, the term in which a leader created it, and its position (index) in the log. An index and term together identify an entry everywhere in the cluster.",
          ),
          concept(
            "flow",
            "The life of one client command",
            "The leader appends the command to its own log and sends it to the followers with AppendEntries. Once a majority have stored it, the entry is committed: the leader applies it to its state machine and answers the client. Followers learn the new commit index from later AppendEntries and apply the entry too.",
          ),
          concept("append", "AppendEntries", undefined, {
            parts: [
              concept(
                "args",
                "What the RPC carries",
                "The leader's term and ID, the new entries, the index and term of the entry immediately before them (prevLogIndex and prevLogTerm), and the leader's commit index.",
              ),
              concept(
                "check",
                "The consistency check",
                "A follower accepts the entries only if its own log has an entry at prevLogIndex whose term is prevLogTerm. Otherwise it rejects, which tells the leader that the follower's log differs somewhere earlier.",
              ),
              concept(
                "matching",
                "The Log Matching property",
                "If two logs contain an entry with the same index and term, the logs are identical in every entry up to that index. It holds because a leader creates at most one entry per index in its term, and the consistency check extends the guarantee one entry at a time.",
              ),
              concept(
                "repair",
                "Repairing a follower's log",
                "The leader keeps a nextIndex for each follower, starting just past its own last entry. After a rejection it lowers nextIndex and retries until the check passes. The follower then deletes any entry that conflicts with the leader's (same index, different term) together with everything after it, and appends what is missing. A leader never deletes or overwrites entries in its own log.",
              ),
              concept(
                "truncate",
                "Truncate only on a real conflict",
                "RPCs can arrive late and out of order. A follower that receives an old AppendEntries whose entries it already holds must not cut its log back to the end of that message, because it may already have told the leader it holds the entries after it. It deletes only from the first entry that actually conflicts.",
              ),
              concept(
                "next-match",
                "nextIndex and matchIndex",
                "nextIndex is the leader's optimistic guess of the next entry to send a follower. matchIndex is the highest entry the leader knows that follower has stored; it starts at zero and rises only on successful replies. Commit decisions use matchIndex, and both are reinitialised whenever a server becomes leader.",
              ),
              concept(
                "backtrack",
                "Fast log backtracking",
                "Stepping nextIndex back one entry per rejection is slow when a follower is far behind. If the rejection includes the term of the conflicting entry and the first index the follower stores for that term (or the follower's log length when its log is too short to have an entry at prevLogIndex), the leader can skip a whole term per round trip.",
              ),
            ],
          }),
          concept("commit", "Commitment", undefined, {
            parts: [
              concept(
                "rule",
                "When an entry is committed",
                "When the leader has replicated it on a majority and it is from the leader's current term (earlier-term entries are committed indirectly).",
              ),
              concept(
                "old-terms",
                "Why older-term entries are not committed by counting",
                "An entry from an earlier term can be on a majority and still be overwritten: a server that lacks it may hold an entry with a later term, which makes its log more up to date and lets it win an election. So a leader counts replicas only for entries of its own term; once one of those commits, Log Matching commits everything before it.",
              ),
              concept(
                "indexes",
                "commitIndex and lastApplied",
                "The leader advances commitIndex to the highest index N that is stored on a majority (its own log plus followers' matchIndex) and whose entry is from the current term. A follower sets its commitIndex to the smaller of the leader's commit index and the index of the last new entry it just accepted. Every server applies entries in order up to commitIndex and records its progress in lastApplied.",
              ),
              concept(
                "no-op",
                "The no-op entry at the start of a term",
                "A new leader holds every committed entry but does not know which of its entries are committed, and it cannot commit older-term entries by counting. Appending and committing an empty entry in its own term settles the commit index for everything before it.",
              ),
            ],
          }),
        ]),
        topic("safety", "Safety", [
          concept(
            "properties",
            "The five properties Raft guarantees",
            "Election Safety: at most one leader per term. Leader Append-Only: a leader never overwrites or deletes its own entries. Log Matching. Leader Completeness: an entry committed in one term is in the log of every leader of later terms. State Machine Safety: no two servers apply different commands at the same index.",
          ),
          concept(
            "completeness",
            "Why a new leader always has every committed entry",
            "A committed entry is stored on a majority. A later leader got votes from a majority. The two majorities share a server, which holds the entry and voted for the leader, and it would not have voted for a log less up to date than its own. So no election can produce a leader that is missing a committed entry.",
          ),
          concept(
            "stale-leader",
            "A deposed leader that does not know it",
            "A leader cut off from the majority may keep accepting commands and appending them, but it can never commit them, so no client is told they succeeded. When it sees a higher term it steps down, and its uncommitted entries are overwritten from the new leader's log.",
          ),
        ]),
        topic("persistence", "Persistence", [
          concept(
            "state",
            "What must be on disk before replying",
            "Its current term, who it voted for in that term, and its log. A server must have these on stable storage (written and flushed with fsync, see Files and storage) before it responds to an RPC, because the reply is a promise the rest of the cluster relies on. That flush usually dominates the cost of a Raft write, so real implementations batch many entries into one.",
          ),
          concept(
            "why-each",
            "Why each of the three is needed",
            "Without votedFor, a restarted server could vote for a second candidate in the same term and help elect two leaders. Without currentTerm, it could accept a deposed leader or vote again in a term it already voted in. Without the log, an entry that was counted towards a majority could vanish, so a committed entry could be lost.",
          ),
          concept(
            "volatile",
            "What can be rebuilt after a restart",
            "commitIndex, lastApplied and the leader's nextIndex and matchIndex need not be persisted; Figure 2 keeps them in memory only. A restarted server learns the commit index from the leader and rebuilds its state machine by replaying the log from the start, or from a snapshot.",
          ),
        ]),
        topic("compaction", "Log compaction and snapshots", [
          concept(
            "snapshot",
            "Snapshots",
            "The log grows with every command, so without compaction the disk fills and replay after a restart gets slower. A server writes its state machine's whole state to stable storage together with the index and term of the last entry it covers, then discards the log up to that index. The term is kept because the consistency check for the next entry needs it. Each server snapshots independently and only ever covers committed entries.",
          ),
          concept(
            "install",
            "InstallSnapshot",
            "When a follower is so far behind that the leader has already discarded the entries it needs, the leader sends its snapshot instead, in chunks. If the follower's log already holds the snapshot's last entry with the same term, it deletes only the entries the snapshot covers and keeps the rest; otherwise it discards its whole log. It then loads the snapshot into its state machine, and normal replication resumes after the snapshot's last index.",
          ),
        ]),
        topic("membership", "Membership changes", [
          concept(
            "problem",
            "Why switching configuration in one step is unsafe",
            "Servers cannot all switch to a new member list at the same instant. For a while some use the old list and some the new, and a majority of the old and a majority of the new might not overlap, so each could elect its own leader in the same term.",
          ),
          concept(
            "joint",
            "Joint consensus",
            "The method in the extended paper. The cluster first moves to a transitional configuration in which elections and commits need a majority of the old members and, separately, a majority of the new. Once that is committed it moves to the new configuration alone. Configurations are log entries, and a server uses the latest one in its log whether or not it is committed.",
          ),
          concept(
            "single-server",
            "Adding or removing one server at a time",
            "The simpler method from Ongaro's dissertation. If the member list changes by only one server, any majority of the old list overlaps any majority of the new, so no transitional configuration is needed. Larger changes are a sequence of single-server steps, each committed before the next begins. A leader must also commit an entry from its own term before it appends a configuration change: the dissertation lacked this rule, and Ongaro published the fix after a bug was found.",
          ),
          concept(
            "learners",
            "New servers catch up before they vote",
            "A new server starts with an empty log. If it counted towards the majority straight away, the cluster could be unable to commit until it caught up, so it first joins as a non-voting member that receives entries and becomes a voter once it is up to date.",
          ),
        ]),
        topic("clients", "Clients and linearizable reads", [
          concept(
            "routing",
            "Finding the leader",
            "Clients send commands to the leader. A follower that receives one rejects it and points to the leader it knows of; if the leader has crashed, the request times out and the client tries another server.",
          ),
          concept(
            "duplicates",
            "Commands executed twice",
            "A leader can crash after committing a command and before replying. The client retries with the new leader and the command would run again. The fix is the idempotency key again: each client numbers its commands, and the state machine remembers the latest number and reply for each client and returns the stored reply for a repeat.",
          ),
          concept(
            "stale-read",
            "Why a leader cannot answer reads from memory",
            "A leader that has been partitioned away may not yet know that a new leader exists and has committed newer writes. Answering a read from its own state would return stale data, which breaks linearizability.",
          ),
          concept(
            "read-index",
            "Linearizable reads without writing to the log",
            "The leader notes its current commit index, confirms it is still leader by getting heartbeat replies from a majority, waits until its state machine has applied up to that index, and then answers. It must first have committed an entry in its own term so that its commit index is current. The simpler alternative is to send reads through the log like writes.",
          ),
          concept(
            "lease-read",
            "Lease-based reads",
            "To avoid a heartbeat round per read, a leader can assume no other leader exists for a period shorter than the election timeout after its last successful heartbeat round. This is faster, and it makes read correctness depend on bounded clock drift, which nothing else in Raft does.",
          ),
        ]),
        topic("partition", "Raft under a partition", [
          concept(
            "sides",
            "The majority side and the minority side",
            "The side with a majority keeps its leader or elects a new one in a higher term and goes on committing. The other side cannot elect a leader or commit anything: its servers time out and start election after election, and a leader stranded there accepts commands that never commit, so its clients see timeouts. Ongaro's dissertation adds that a leader steps down after an election timeout without a successful heartbeat round to a majority, so its clients go looking for the real leader. Raft chooses to be unavailable there instead of inconsistent.",
          ),
          concept(
            "heal",
            "When the partition heals",
            "Servers that were cut off rejoin as followers and the leader overwrites their uncommitted entries. A returning server that raised its term while isolated forces the current leader to step down and causes one needless election; the Pre-Vote extension from Ongaro's dissertation avoids this by having a would-be candidate check that it could win before it increments its term.",
          ),
        ]),
        topic("debug", "Implementing and debugging Raft", [
          concept(
            "locking",
            "Concurrency inside one Raft server",
            "Each server is itself a concurrent program: RPC handlers, timers and the apply loop run in separate goroutines over shared state (see Language runtimes). Guard that state with one mutex, and never hold it while sending an RPC, waiting on a channel or sleeping: two servers that each hold their lock while waiting on an RPC to the other deadlock, because each handler needs the lock the other side holds, and one slow peer stalls the whole server.",
          ),
          concept(
            "stale-reply",
            "Replies that arrive after things changed",
            "A reply can arrive after the server's term or role has changed. Before acting on it, check that the server is still in the term and state it sent the request from, and drop the reply otherwise. Set matchIndex from what was sent (prevLogIndex plus the number of entries), not from the leader's current log length, which may have grown since.",
            { links: [STUDENTS_GUIDE] },
          ),
          concept(
            "method",
            "Figure 2 as a specification, and rare failures",
            "The paper's Figure 2 states the rules for every server state and RPC, and each one is required; most bugs come from skipping a condition or adding a shortcut it does not allow. Log every state change with the server ID and term so a failed run reads as one timeline, and run the tests hundreds of times with Go's race detector on: a failure that appears once is a real bug.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "election-lab",
            "Raft: leader election (6.5840 lab 3A)",
            "Implement Raft leader election and heartbeats in Go against MIT's test harness. Run the tests hundreds of times; a rare failure is a real bug.",
            {
              doneWhen: ["Test output from a long repeated run"],
              links: [MIT],
              parts: [
                build(
                  "runs",
                  "Lab 3A tests passing 200 consecutive runs",
                  "The 3A tests pass 200 times in a row without a single failure.",
                ),
                build(
                  "notes",
                  "Notes on each bug and what in Figure 2 you had missed",
                  "For every bug you hit, a short note on the symptom and the rule in Figure 2 that your code had skipped or got wrong.",
                ),
              ],
            },
          ),
          build(
            "log-lab",
            "Raft: log replication (6.5840 lab 3B)",
            "Add log replication: AppendEntries consistency check, commit index advancement, and the election restriction. Debug with structured logs keyed by term and server.",
            {
              doneWhen: ["Test output from a long repeated run", "Your hardest bug and how you found it"],
              links: [MIT, STUDENTS_GUIDE],
              parts: [
                build(
                  "replication",
                  "AppendEntries with the consistency check",
                  "Followers accept, reject and repair their logs according to the check, and a leader brings a lagging or divergent follower back in line with its own log.",
                ),
                build(
                  "commit",
                  "Commit index advancement",
                  "The leader commits only current-term entries stored on a majority, followers follow the leader's commit index, and every server applies committed entries in order.",
                ),
                build(
                  "restriction",
                  "The election restriction in RequestVote",
                  "A voter compares the last log term and index before granting its vote, so a server with a stale log cannot win.",
                ),
                build(
                  "runs",
                  "Lab 3B tests passing 200 consecutive runs",
                  "The 3B tests pass 200 times in a row without a single failure.",
                ),
              ],
            },
          ),
          build(
            "persistence-lab",
            "Raft: persistence (6.5840 lab 3C)",
            "Persist term, vote and log so a restarted server rejoins correctly, and implement fast log backtracking.",
            {
              doneWhen: ["Test output from a long repeated run"],
              links: [MIT],
              parts: [
                build(
                  "persist",
                  "Term, vote and log persisted",
                  "The three are saved before any reply that depends on them and restored at start-up, so a server that crashes and restarts rejoins without breaking safety.",
                ),
                build(
                  "backtrack",
                  "Fast log backtracking implemented",
                  "A rejected AppendEntries returns enough information for the leader to skip back a whole term at a time instead of one entry.",
                ),
                build(
                  "runs",
                  "Lab 3C tests passing 100 consecutive runs",
                  "The 3C tests pass 100 times in a row without a single failure.",
                ),
              ],
            },
          ),
          build(
            "snapshot-lab",
            "Stretch: Raft log compaction (6.5840 lab 3D)",
            "Add snapshots to your Raft: the service hands Raft a snapshot, Raft discards the log entries it covers, and the leader sends InstallSnapshot to a follower that needs entries the leader no longer has. Optional; it completes the algorithm as the paper describes it.",
            {
              doneWhen: ["Test output from a repeated run of the 3D tests"],
              links: [MIT],
            },
          ),
          build(
            "writeup",
            "Write-up: what building Raft taught me",
            "Publish a post on your Raft implementation: the bugs, the debugging method, and where you see leases and fencing in systems you use.",
            { doneWhen: ["A link to the published write-up"] },
          ),
        ]),
      ],
      {
        detail:
          "How a cluster agrees on one log of commands despite crashes and partitions. Play with the visualization, read the extended paper in full, watch the two Raft lectures from MIT 6.5840, and keep the paper's Figure 2 open while you code.",
        links: [RAFT_PAPER, RAFT_VIZ, MIT, STUDENTS_GUIDE, KLEPPMANN, DDIA],
      },
    ),

    topic(
      "commit",
      "Transactions across nodes",
      [
        topic("problem", "The atomic commit problem", [
          concept(
            "atomic-commit",
            "All nodes commit or all abort",
            "A transaction that writes to several shards or services must commit everywhere or nowhere, even if nodes crash midway. It differs from consensus: every participant must take part, and a single participant that cannot commit (a constraint fails, it crashed before preparing) forces everyone to abort.",
          ),
        ]),
        topic("two-pc", "Two-phase commit", [
          concept(
            "phases",
            "Prepare, then commit",
            "A coordinator asks every participant to prepare. A participant that can commit writes the transaction's changes and a prepared record durably, keeps its locks, and votes yes; that vote is a promise to commit if told to, even after a crash. If every vote is yes, the coordinator decides commit, otherwise abort, and sends the decision to all participants.",
          ),
          concept(
            "commit-point",
            "The commit point",
            "The decision is final once the coordinator has written it to its own disk. From then on it must keep resending the decision until every participant has acknowledged it, and a participant that voted yes can no longer abort on its own.",
          ),
          concept(
            "blocking",
            "Why two-phase commit blocks",
            "If the coordinator crashes after the participants voted yes, they are in doubt: they cannot commit or abort without its decision, so they hold their locks until it recovers or an operator decides by hand. One failed node can freeze every other node's progress on those rows.",
          ),
          concept(
            "fault-tolerant",
            "Replicating the coordinator with consensus",
            "If the coordinator's decision and each participant's prepared state are themselves replicated with consensus, a crashed coordinator is replaced instead of waited for, and commit no longer blocks on one machine. Spanner runs two-phase commit across Paxos-replicated groups in this way.",
          ),
        ]),
        topic("sagas", "Sagas", [
          concept(
            "saga",
            "Commit each step, undo by compensation",
            "When the steps live in services that cannot share a transaction, a saga runs them as a sequence of local transactions, each with a compensating action (refund the charge, release the seat) that is run in reverse order if a later step fails. There is no isolation: others can see the half-finished state, and some effects, such as a sent email, cannot be undone. Steps and compensations must be idempotent, because they are retried.",
          ),
        ]),
      ],
      {
        detail: "Making a change that spans several nodes take effect on all of them or none.",
        links: [DDIA, KLEPPMANN],
      },
    ),

    topic(
      "gossip",
      "Gossip and membership",
      [
        topic("membership", "Membership and failure detection", [
          concept(
            "problem",
            "Knowing who is in the cluster",
            "Every node needs a current list of members and which of them are alive. One approach keeps the list in a consensus service that everyone reads. The other has nodes detect failures and spread membership changes among themselves with no central point.",
          ),
          concept(
            "detector",
            "Failure detectors",
            "A failure detector sends heartbeats or pings and suspects a node that does not answer in time. Over a real network it can only suspect, never know. A shorter timeout finds failures sooner and wrongly suspects slow nodes more often. Adaptive detectors such as phi accrual (used by Cassandra) replace the fixed timeout with a suspicion level computed from the recent spacing of a node's heartbeats.",
          ),
          concept(
            "swim",
            "SWIM: failure detection that scales",
            "If every node heartbeats every other, the message count grows with the square of the cluster size. In SWIM each node pings one random member per period; if no reply comes it asks a few other members to ping the target for it, and only then marks it suspect and later dead. Membership changes ride along on the pings. HashiCorp's memberlist library is based on it, with extensions (Lifeguard) for nodes that are slow rather than dead; Serf is built on memberlist, and Consul on Serf.",
          ),
        ]),
        topic("protocols", "Gossip protocols", [
          concept(
            "purpose",
            "What gossip is good for",
            "Spreading information through a cluster by random peer exchange: scalable and tolerant of failures, with eventual rather than immediate delivery.",
          ),
          concept(
            "epidemic",
            "Epidemic spread",
            "Each round, every node that knows an update tells a few randomly chosen peers. The number of informed nodes grows exponentially at first, so with high probability an update reaches the whole cluster in a number of rounds proportional to the logarithm of its size, and no single lost message or dead node stops it.",
          ),
          concept(
            "styles",
            "Push, pull and anti-entropy",
            "A node can push news to a peer, pull by asking a peer what it has, or do both in one exchange. Rumour spreading forwards only recent updates and stops after a while, which is cheap but can miss nodes. Anti-entropy has pairs of nodes compare their state (usually by digests) and fix every difference, which guarantees convergence at a higher cost.",
          ),
          concept(
            "merge",
            "Convergence: gossiped state must merge",
            "The same update arrives many times, in any order, along many paths. So the receiver's merge must give the same result whatever the order and repetition: take the union of sets, keep the entry with the higher version number, or use a CRDT. Then all nodes converge once updates stop.",
          ),
          concept(
            "tuning",
            "The cost trade-off",
            "More peers per round or shorter rounds spread an update faster and send more redundant messages; fewer peers or batching sends less and takes longer. Gossip gives a probability of delivery within a time, not a hard bound.",
          ),
          concept(
            "limits",
            "What gossip cannot do",
            "Gossip makes every node eventually hold the same information. It cannot make nodes agree on a single decision at a given moment, such as who the leader is or who holds a lock, because while an update is spreading different nodes believe different things. That takes consensus.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "gossip-glomers",
            "Gossip Glomers",
            "Fly.io's six challenges, run against the Maelstrom simulator, in Go: echo, unique IDs, broadcast (with partitions and efficiency targets), a grow-only counter, a replicated log, and totally-available transactions.",
            {
              doneWhen: ["A link to your solutions", "Maelstrom results for the hardest challenge you completed"],
              links: [GOSSIP_GLOMERS],
              parts: [
                build(
                  "challenges",
                  "All six challenges passing Maelstrom's checker",
                  "Every challenge, including each of its sub-parts, passes when run under Maelstrom with the workload and fault settings the challenge specifies.",
                ),
                build(
                  "notes",
                  "Notes on the broadcast efficiency numbers you reached",
                  "The messages per operation and the median and maximum latency of your broadcast solution, with what you changed to reach them.",
                ),
              ],
            },
          ),
        ]),
      ],
      {
        detail: "How a large cluster learns who is alive and spreads news without a coordinator.",
        links: [KLEPPMANN],
      },
    ),

    topic(
      "overload",
      "Backpressure and overload",
      [
        topic("queues", "Queues under overload", [
          concept(
            "bursts",
            "What a queue can and cannot absorb",
            "A queue smooths a short burst: work arrives faster than it is served for a moment, and the queue drains afterwards. If the average arrival rate stays above the service rate, no queue size is enough; the queue only delays the moment the problem becomes visible.",
          ),
          concept(
            "utilization",
            "Latency rises steeply near full utilisation",
            "Waiting time does not grow in proportion to load. As utilisation approaches 100 percent, random variation in arrivals leaves the server no slack to catch up, and queueing delay climbs without limit. A service planned to run 95 percent busy has almost no room for a burst.",
          ),
          concept(
            "hides",
            "A queue hides overload",
            "While a queue is growing, nothing fails: producers succeed, no errors are logged and throughput looks normal. The only symptom is that every item waits longer. By the time errors appear, the queue holds minutes of stale work.",
          ),
          concept(
            "unbounded",
            "Why unbounded queues are dangerous",
            "Under overload they grow until memory runs out, and every item waits longer, so the system does work on requests whose callers have already given up.",
          ),
          concept(
            "goodput",
            "Throughput versus goodput",
            "Throughput counts requests completed; goodput counts requests completed while the caller was still waiting. An overloaded server working through a long queue in order can run at full throughput with goodput near zero, because every answer arrives after its caller timed out and retried.",
          ),
          concept(
            "bounded",
            "Bounded queues force a decision",
            "Every queue needs a maximum size. When it is full there are only two honest options: make the producer wait (backpressure) or refuse the item (load shedding). An unbounded queue is a refusal to choose.",
          ),
          concept(
            "stale-work",
            "Dropping work that is already too late",
            "Check a request's deadline when it is taken off the queue and discard it if the caller has given up. In strict first-in-first-out order an overloaded server always works on the oldest, least useful request, which is why some systems serve newest-first while overloaded.",
          ),
        ]),
        topic("backpressure", "Backpressure", [
          concept(
            "definition",
            "What backpressure is",
            "A slow consumer signalling upstream to slow down, by bounded queues or blocking, so work in progress stays limited instead of piling up.",
          ),
          concept(
            "pipeline",
            "Backpressure through a pipeline",
            "Put a bounded buffer between every pair of stages. When the slowest stage falls behind, its input buffer fills, the stage before it blocks on its send, and the stall moves back to the source. In Go a send on a full buffered channel blocks, so bounded channels give this behaviour directly. The whole pipeline then runs at the speed of its slowest stage.",
          ),
          concept(
            "network",
            "Backpressure across the network",
            "Between machines the same signal is carried by flow control: a receiver that stops reading fills its TCP receive buffer, the advertised window closes, and the sender's writes block (see Networking). A proxy or service that reads everything into memory regardless breaks the chain and becomes the unbounded queue.",
          ),
          concept(
            "edge",
            "Where backpressure has to stop",
            "Backpressure works between components you control. At the edge of the system the source is users and other people's clients, which cannot be blocked: they time out and retry. There the only option is to refuse requests explicitly.",
          ),
        ]),
        topic("shedding", "Load shedding and admission control", [
          concept(
            "load-shedding",
            "What load shedding is",
            "Rejecting excess requests early and cheaply so the requests that are accepted still finish within their deadline. It only helps if saying no costs far less than serving: reject before parsing the body or taking a database connection, or enough rejected traffic still overloads the server.",
          ),
          concept(
            "admission",
            "Admission control",
            "Decide at the entrance, before doing any expensive work, whether to take a request. Common limits are the number of requests in flight (a concurrency limit, which admits fewer requests per second on its own when the service slows down), a rate (a token bucket that refills at a fixed rate up to a burst size), and how long the request has already waited.",
          ),
          concept(
            "priority",
            "Shedding by priority",
            "Requests are not all worth the same. Drop background and batch work first, then retries, then low-value user requests, and keep the requests the business cannot lose. The priority has to be known at the entrance, so it must be carried in the request.",
          ),
          concept(
            "client-side",
            "Telling clients to back off",
            "A rejection should be an explicit, fast answer (HTTP 429 or 503, with Retry-After when the server knows) so well-behaved clients back off with jitter and stay within their retry budget. Shedding without client cooperation turns each rejection into an immediate retry.",
          ),
        ]),
        topic("observe", "Seeing overload", [
          concept(
            "signals",
            "The signals to watch",
            "Queue length and, better, time spent waiting in the queue; requests in flight; rejection rate; goodput next to throughput; p99 latency; and memory growth. Rising queue time with flat throughput means the system is past its capacity even though nothing has failed yet.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "backpressure-lab",
            "Backpressure and load shedding",
            "Build a three-stage Go pipeline where the last stage is slow. With unbounded queues, overload it and watch memory and latency grow without limit. Replace with bounded channels, then add load shedding at the entrance with a deadline check, and compare goodput and p99.",
            {
              doneWhen: ["Memory, p99 latency and successful requests per second for the three designs"],
            },
          ),
        ]),
      ],
      { detail: "What to do when more work arrives than the system can finish." },
    ),

    topic(
      "testing",
      "Testing distributed systems",
      [
        topic("why", "Why ordinary tests are not enough", [
          concept(
            "interleavings",
            "The bugs live in rare interleavings",
            "Distributed bugs need a particular ordering of messages, crashes and timeouts that a unit test or a happy-path integration test never produces. The number of possible orderings is enormous, and a failure seen once often cannot be reproduced because the timing was chance.",
          ),
        ]),
        topic("faults", "Fault injection", [
          concept(
            "kinds",
            "The faults worth injecting",
            "Kill a process without warning; pause and resume it; partition the network, including one-way and partial partitions; add delay and loss; skew or jump a node's clock; fill the disk or make writes fail. Each matches a fault from the start of this section, and each should be tried while the system is under load. Chaos engineering runs the same faults as planned experiments against staging or production, with a stated expectation and a limited blast radius.",
          ),
        ]),
        topic("jepsen", "Jepsen-style testing", [
          concept(
            "what",
            "What a Jepsen test does",
            "Runs concurrent operations against a real cluster while injecting faults (partitions, clock skew, crashes), records the history, and checks it against the consistency model the system claims.",
          ),
          concept(
            "nemesis",
            "The nemesis",
            "The nemesis is the part of the test that causes faults on a schedule while client processes keep issuing operations: it partitions the network, kills and restarts nodes, pauses processes and moves clocks.",
          ),
          concept(
            "history",
            "Recording a history",
            "Each client logs when it invoked an operation and how the operation completed: ok, definitely failed, or unknown. A timeout is unknown: the operation may or may not have taken effect, possibly later, and the checker must allow for both.",
          ),
          concept(
            "checker",
            "Checking the history",
            "A linearizability checker searches for some order of the operations that respects real time (an operation that ended before another started comes first) and that a single correct copy of the data could have produced. If no such order exists, the history is proof of a violation. The search is expensive, so tests keep the history for each key short.",
          ),
          concept(
            "limits",
            "A passing test is not a proof",
            "A test explores only the schedules and faults it happened to generate. It can show that a system is broken; it cannot show that it is correct. Read 'passes Jepsen' as 'these tests found no bug under these faults'.",
          ),
          concept(
            "maelstrom",
            "Maelstrom",
            "Maelstrom is a workbench built on Jepsen for learning. Your nodes are ordinary processes that exchange JSON messages over standard input and output; Maelstrom simulates the network between them, injects partitions and delays, and checks the results of standard workloads. Gossip Glomers runs on it.",
          ),
        ]),
        topic("simulation", "Deterministic simulation", [
          concept(
            "idea",
            "Run the whole cluster in one deterministic process",
            "All nodes run in a single thread against a simulated network, disk and clock, and every random choice (message order, delay, crash) comes from one seed. A failing seed replays the identical execution every time, and simulated time lets hours of faults run in seconds.",
          ),
          concept(
            "requirements",
            "What the code must give up",
            "Every source of nondeterminism has to go through an interface the simulator controls: time, random numbers, network and disk I/O, and thread scheduling. This is far easier to design in from the start than to add later. FoundationDB was built this way, and TigerBeetle is tested the same way.",
          ),
          concept(
            "invariants",
            "Checking invariants at every step",
            "Because the simulator sees all nodes at once, it can assert global properties after every event: at most one leader per term, no committed entry ever lost or changed. A violation is reported at the step where it happens, with the seed to replay it.",
          ),
          concept(
            "gap",
            "The gap between simulation and reality",
            "A simulation tests the code against your model of the network and disk, not against the real kernel, hardware or clocks. Faults the model leaves out are never tested, so simulation is paired with tests that inject faults into real clusters.",
          ),
        ]),
        topic("model-checking", "Model checking", [
          concept(
            "tla",
            "Model checking a design",
            "A model checker takes a specification of the algorithm (for example in TLA+) and explores every reachable state of a small configuration, reporting any state that breaks an invariant. It verifies the design, not the code, and can find a flaw before anything is built. Raft's authors wrote a TLA+ specification of it.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "jepsen-analyses",
            "Read two Jepsen analyses",
            "Pick two databases you have used. For each analysis, note what was claimed, what broke, and under which fault.",
            {
              doneWhen: ["Half a page per analysis in your notes"],
              links: [JEPSEN],
            },
          ),
        ]),
      ],
      {
        detail: "How to find the bugs that only appear under a particular order of failures.",
        links: [JEPSEN],
      },
    ),
  ],
);
