import { cards, lab, link, note, output, paid, project, read, url } from "../dsl";
import type { Phase } from "../types";

const DDIA = paid(
  "Designing Data-Intensive Applications, 2nd edition",
  "https://www.oreilly.com/library/view/designing-data-intensive-applications/9781098119058/",
);
const CMU = link("CMU 15-445 Database Systems", "https://15445.courses.cs.cmu.edu/");
const PG_INTERNALS = link("The Internals of PostgreSQL", "https://www.interdb.jp/pg/");

export const phase: Phase = {
  id: "data",
  label: "Phase 8",
  title: "Data systems",
  summary:
    "How a database finds a row, keeps concurrent transactions apart, survives a crash and copies itself to a replica. Then logs and queues, and a storage engine of your own.",
  weeks: { start: 30, end: 33 },
  pillar: "data",
  modules: [
    {
      id: "data-indexes",
      title: "Indexes and query plans",
      summary: "Week 30. Why a query is slow, read from the plan.",
      items: [
        read("data-use-the-index", "Use The Index, Luke", {
          week: 30,
          hours: 10,
          source: "Use The Index, Luke (Markus Winand)",
          chapters: "Anatomy of an index, the WHERE clause, performance and scalability, joins, clustering, sorting and grouping",
          links: [link("Use The Index, Luke", "https://use-the-index-luke.com/")],
        }),
        lab("data-explain", "Read query plans on ten million rows", {
          week: 30,
          hours: 7,
          brief:
            "Load 10M rows into Postgres. For five queries, run EXPLAIN (ANALYZE, BUFFERS) before and after adding an index and explain every node. Show a composite index that is used for (a, b) but not for b alone, an index-only scan, and a case where the planner correctly prefers a sequential scan.",
          evidence: [
            output("plans", "Before and after plans for each query with your annotations"),
            note("order", "The rule for column order in a composite index, in your own words"),
          ],
          links: [link("Using EXPLAIN", "https://www.postgresql.org/docs/current/using-explain.html")],
        }),
        read("data-pg-architecture", "Internals of PostgreSQL: architecture and query processing", {
          week: 30,
          hours: 5,
          source: "The Internals of PostgreSQL",
          chapters: "Ch. 1-3: database cluster and tables, process and memory architecture, query processing",
          links: [PG_INTERNALS],
        }),
      ],
    },
    {
      id: "data-transactions",
      title: "Storage engines and transactions",
      summary: "Weeks 31-32. Pages, B-trees, MVCC, isolation levels and the write-ahead log.",
      items: [
        read("data-cmu-storage", "CMU 15-445: storage and indexes", {
          week: 31,
          hours: 8,
          source: "CMU 15-445 lectures",
          chapters: "Database storage, buffer pools, hash tables, B+ trees, index concurrency. Lectures only; skip the C++ projects",
          links: [CMU],
        }),
        read("data-ddia-storage", "DDIA: storage, retrieval and transactions", {
          week: 31,
          hours: 12,
          source: "Designing Data-Intensive Applications, 2nd edition",
          chapters: "The chapters on storage and retrieval (B-trees vs LSM-trees, column storage) and on transactions",
          links: [DDIA],
        }),
        lab("data-isolation", "Reproduce isolation anomalies", {
          week: 31,
          hours: 6,
          brief:
            "In two psql sessions: a lost update at READ COMMITTED and its fix with SELECT FOR UPDATE; write skew at REPEATABLE READ (two doctors both go off call); the same at SERIALIZABLE failing with error 40001 and a retry loop that handles it. Then build a job queue with FOR UPDATE SKIP LOCKED and run four workers against it.",
          evidence: [
            output("anomalies", "The interleaved statements and results for each anomaly"),
            url("repo", "Link to the retry loop and the SKIP LOCKED queue"),
          ],
          links: [link("PostgreSQL transaction isolation", "https://www.postgresql.org/docs/current/transaction-iso.html")],
        }),
        read("data-pg-mvcc", "Internals of PostgreSQL: concurrency control and vacuum", {
          week: 32,
          hours: 5,
          source: "The Internals of PostgreSQL",
          chapters: "Ch. 5-6: concurrency control (MVCC, snapshots), vacuum processing",
          links: [PG_INTERNALS],
        }),
        read("data-cmu-recovery", "CMU 15-445: concurrency control and recovery", {
          week: 32,
          hours: 8,
          source: "CMU 15-445 lectures",
          chapters: "Concurrency control theory, two-phase locking, MVCC, logging, crash recovery (ARIES)",
          links: [CMU],
        }),
        lab("data-wal", "Crash Postgres and watch it recover", {
          week: 32,
          hours: 4,
          brief:
            "During a write-heavy load, kill -9 the Postgres server. Restart and read the recovery log lines. Inspect recent WAL with pg_waldump. Then set synchronous_commit=off, repeat with an instant VM reset, and count acknowledged transactions that were lost.",
          evidence: [
            output("recovery", "The server log through crash recovery, and a pg_waldump excerpt you can explain"),
            note("tradeoff", "What synchronous_commit=off bought in throughput and cost in durability"),
          ],
        }),
      ],
    },
    {
      id: "data-replication",
      title: "Replication, logs and queues",
      summary: "Weeks 32-33. One copy is none; and the log as the unifying idea.",
      items: [
        lab("data-replication-lag", "Replication lag and stale reads", {
          week: 32,
          hours: 6,
          brief:
            "Set up a Postgres streaming replica. Add 500 ms of delay between them with netem. Write a row on the primary and immediately read it from the replica to demonstrate a read-your-writes violation. Watch replay_lag in pg_stat_replication. Fix it at the application level two ways.",
          evidence: [
            output("anomaly", "A write followed by a stale read, with pg_stat_replication at that moment"),
            note("fixes", "The two fixes you implemented and their costs"),
          ],
        }),
        lab("data-design-queue", "Design doc: a job queue on Postgres", {
          week: 32,
          hours: 3,
          brief:
            "One page: requirements, schema, how workers claim jobs, retries with backoff, visibility timeout, poison messages, and at what scale you would move to a dedicated queue. Use your SKIP LOCKED lab as evidence.",
          evidence: [url("doc", "Link to the design doc")],
        }),
        read("data-the-log", "The log, and Kafka's design", {
          week: 33,
          hours: 5.5,
          source: "Jay Kreps; Apache Kafka documentation",
          chapters: "The Log essay (parts 1-2); Kafka documentation, Design section",
          links: [
            link(
              "The Log: what every software engineer should know",
              "https://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying",
            ),
            link("Kafka design", "https://kafka.apache.org/documentation/#design"),
          ],
        }),
        lab("data-streams", "At-least-once delivery, observed", {
          week: 33,
          hours: 6,
          brief:
            "With Redis Streams consumer groups: crash a consumer after processing but before acknowledging, find the entry in XPENDING, and watch it get redelivered. Count the duplicate side effects, then make the consumer idempotent with a processed-IDs table written in the same transaction as the effect.",
          evidence: [
            output("pending", "XPENDING output and the duplicate before the fix"),
            output("idempotent", "The same crash with no duplicate effect after the fix"),
          ],
          links: [link("Redis Streams", "https://redis.io/docs/latest/develop/data-types/streams/")],
        }),
        lab("data-row-column", "Row store versus column store", {
          week: 33,
          hours: 4,
          brief:
            "Run the same aggregate over 50M rows in Postgres and in DuckDB reading Parquet. Then fetch one full row by key in both. Explain the difference from how each lays data out on disk.",
          evidence: [output("timing", "Timings for the aggregate and the point lookup in both systems")],
          links: [link("DuckDB documentation", "https://duckdb.org/docs/")],
        }),
        project("data-lsm", "Build an LSM key-value store in Go", {
          week: 33,
          hours: 14,
          brief:
            "Implement put, get, delete and scan with a write-ahead log, an in-memory sorted memtable, immutable sorted files on disk, and compaction. It must survive kill -9 at any point without losing acknowledged writes.",
          deliverables: [
            "WAL with fsync and replay on startup",
            "Memtable flush to sorted files with a sparse index",
            "Compaction that drops overwritten keys and tombstones",
            "A crash test that kills the process randomly and verifies acknowledged writes",
          ],
          evidence: [url("repo", "Link to the store"), output("crash", "Crash test output")],
          links: [link("Build your own database (list)", "https://github.com/codecrafters-io/build-your-own-x#build-your-own-database")],
        }),
        lab("data-writeup", "Write-up: from the storage phase to a database", {
          week: 33,
          hours: 3,
          brief: "Connect fsync, the page cache and atomic rename from Phase 4 to the WAL and compaction in your LSM store.",
          evidence: [url("post", "Link to the published write-up")],
        }),
      ],
    },
  ],
};

export const quiz = [
  ...cards("data-indexes", [
    ["Why can a B-tree index on (a, b) not serve `WHERE b = 5` efficiently?", "Entries are sorted by a first, then b. Without a condition on a, matching b values are scattered across the whole index."],
    ["What is an index-only scan?", "The query is answered entirely from the index because it contains every needed column, avoiding visits to the table (in Postgres, subject to the visibility map)."],
    ["Why might the planner choose a sequential scan even though an index exists?", "When the query will return a large fraction of the table, reading it sequentially is cheaper than many random index and heap lookups."],
    ["What do EXPLAIN ANALYZE's 'rows' estimates versus actuals tell you?", "A large mismatch means stale or insufficient statistics, which leads the planner to bad join orders and scan choices."],
    ["What does BUFFERS add to EXPLAIN ANALYZE?", "How many pages each node read from shared buffers (hit) versus from disk (read), revealing I/O cost rather than just time."],
    ["What does every additional index cost?", "Every insert, update and delete must maintain it, and it takes disk and cache space."],
    ["Nested loop, hash join, merge join: when is each chosen?", "Nested loop for a small outer side with an indexed inner. Hash join for large unsorted equality joins. Merge join when both inputs are already sorted on the key."],
  ]),
  ...cards("data-transactions", [
    ["What is MVCC?", "Multi-version concurrency control: writers create new row versions instead of overwriting, and each transaction reads a consistent snapshot, so readers and writers do not block each other."],
    ["What is a lost update and how do you prevent it?", "Two transactions read a value, both compute from it and write back; one write is overwritten. Prevent with an atomic UPDATE, SELECT FOR UPDATE, or a version check."],
    ["What is write skew?", "Two transactions each read an overlapping set, each make a decision valid on its own, and write to different rows; together they break an invariant. Snapshot isolation does not prevent it."],
    ["What must an application do when using SERIALIZABLE in Postgres?", "Be ready to retry: transactions can fail with serialization_failure (SQLSTATE 40001) and must be re-run from the start."],
    ["What is the write-ahead log rule?", "A change must be written to the log and flushed before the modified data page may be written. After a crash, the log is replayed to restore committed changes."],
    ["Why does Postgres need VACUUM?", "MVCC leaves dead row versions behind. Vacuum reclaims them and prevents transaction ID wraparound."],
    ["B-tree versus LSM-tree?", "B-trees update pages in place: good read performance, random writes. LSM-trees append to sorted files and compact later: fast sequential writes, at the cost of compaction work and read amplification."],
    ["What does FOR UPDATE SKIP LOCKED enable?", "A queue where many workers each claim a different unlocked row without blocking on each other."],
  ]),
  ...cards("data-replication", [
    ["What is replication lag and what anomaly does it cause?", "The delay before a replica applies the primary's changes. A client can write to the primary then read from a replica and not see its own write."],
    ["Synchronous versus asynchronous replication?", "Synchronous: commit waits for a replica to confirm, so no data loss on failover but higher latency and reduced availability. Asynchronous: fast, but recent commits can be lost when the primary fails."],
    ["What does at-least-once delivery require of consumers?", "Idempotency: a message may be delivered again after a crash or timeout, so processing it twice must have the same effect as once."],
    ["How do you make a consumer idempotent?", "Record the message ID in the same transaction as its side effect and skip IDs already recorded, or make the operation naturally idempotent (set, not increment)."],
    ["What is a Kafka consumer group offset?", "The position in each partition up to which the group has processed. Committing it after processing gives at-least-once; before processing gives at-most-once."],
    ["Why are column stores fast for analytics?", "Values of one column are stored together, so an aggregate reads only the columns it needs, compresses well and vectorizes, instead of reading every full row."],
    ["What does compaction do in an LSM-tree?", "Merges sorted files, discarding overwritten values and tombstones, which bounds read cost and reclaims space."],
    ["What is a tombstone?", "A marker written to represent a delete in an append-only store, so older files' values for that key are ignored until compaction removes both."],
  ]),
];
