import { build, concept, link, paid, section, topic } from "../dsl";

const DDIA = paid(
  "Designing Data-Intensive Applications, 2nd edition",
  "https://www.oreilly.com/library/view/designing-data-intensive-applications/9781098119058/",
);
const CMU = link("CMU 15-445 Database Systems", "https://15445.courses.cs.cmu.edu/");
const PG_INTERNALS = link("The Internals of PostgreSQL", "https://www.interdb.jp/pg/");
const USE_THE_INDEX = link("Use The Index, Luke", "https://use-the-index-luke.com/");
const USING_EXPLAIN = link("Using EXPLAIN", "https://www.postgresql.org/docs/current/using-explain.html");
const PG_ISOLATION = link(
  "PostgreSQL transaction isolation",
  "https://www.postgresql.org/docs/current/transaction-iso.html",
);
const THE_LOG = link(
  "The Log: what every software engineer should know",
  "https://www.linkedin.com/blog/engineering/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying",
);
const KAFKA_DESIGN = link("Kafka design", "https://kafka.apache.org/documentation/#design");
const REDIS_STREAMS = link("Redis Streams", "https://redis.io/docs/latest/develop/data-types/streams/");

export default section(
  "data",
  {
    title: "Data systems",
    summary:
      "How a database finds a row, keeps concurrent transactions apart, survives a crash and copies itself to a replica. Then logs and queues, and a storage engine of your own.",
  },
  [
    topic(
      "engines",
      "Storage engines",
      [
        topic("why", "What a storage engine has to do", [
          concept(
            "problem",
            "The problem: more data than memory, and crashes",
            "A database must find and change a few records among far more data than fits in RAM, and must not lose or corrupt anything when the process or machine dies in the middle of a write. The storage engine is the layer that lays bytes out on disk so that both are possible.",
          ),
          concept(
            "disk-costs",
            "What storage devices make cheap and expensive",
            "Devices are read and written in blocks, and a page fetched from disk costs orders of magnitude more than one already in memory. Sequential I/O is much cheaper than random I/O on spinning disks and still cheaper on SSDs. Engine designs differ mainly in how they cut page reads and random writes.",
          ),
          concept(
            "append-log",
            "The simplest database: an append-only file",
            "Appending each record to the end of a file is the cheapest possible write, but a lookup then has to scan the whole file. Any structure that speeds up reads (an index, a sort order) has to be maintained on every write. That trade-off runs through the rest of this section.",
          ),
        ]),
        topic("pages", "Pages and heap files", [
          concept(
            "page",
            "Pages: the unit of storage and I/O",
            "The engine divides its files into fixed-size pages (8 kB by default in Postgres) and always reads and writes whole pages. Rows, index nodes and free-space bookkeeping all live inside pages, and a page number is how one part of the database refers to another.",
          ),
          concept(
            "heap-file",
            "Heap files",
            "A heap file is an unordered collection of pages: a new row goes into any page with enough free space. A Postgres table is a heap, so without an index the only way to find a row is to read every page.",
          ),
          concept(
            "slotted-page",
            "Slotted pages and tuples",
            "A page has a header, an array of slots growing from the front and row data (tuples) growing from the back; each slot holds the offset and length of one tuple. Rows can be variable length and can move within the page without changing their address, which is the page number plus the slot number (the ctid in Postgres). In a heap table, indexes store that address to point at a row.",
          ),
          concept(
            "toast",
            "Large values and TOAST",
            "A Postgres row cannot span pages, so when a row is wider than about 2 kB its large values are compressed and, if still too big, moved out of line in chunks into a separate TOAST table. A query that does not read those columns never touches the TOAST table; one that does pays extra page reads per row.",
          ),
        ]),
        topic("buffer-pool", "The buffer pool", [
          concept(
            "pool",
            "A cache of pages in memory",
            "The buffer pool is a fixed set of in-memory frames, each holding one disk page, plus a table mapping page numbers to frames. Every read and write of table or index data goes through it, so a query's cost is largely the number of pages it needs that are not already there.",
          ),
          concept(
            "eviction",
            "Pins, dirty pages and eviction",
            "A pinned page is in use and cannot be evicted; a dirty page has been changed in memory and must be written out before its frame is reused. When the pool is full a victim is chosen by an approximation of least-recently-used; Postgres uses a clock sweep over per-page usage counts.",
          ),
          concept(
            "write-back",
            "Changed pages are written back later",
            "A write changes the page in memory and marks it dirty; the page reaches disk some time afterwards, in the background or when its frame is needed. This is fast, and it means memory and disk disagree at any instant, which is the problem the write-ahead log solves.",
          ),
        ]),
        topic("btree", "B-trees", [
          concept(
            "fan-out",
            "Why a tree of pages, not a binary tree",
            "A binary search tree over a billion keys is about 30 levels deep, and each level could be a disk read. A B-tree makes every node one page holding hundreds of keys, so each step narrows the search hundreds of times and the tree is only a few levels deep.",
          ),
          concept(
            "structure",
            "B+ tree structure",
            "Inner nodes hold only separator keys and child page pointers. All entries are in the leaf pages, sorted by key, and each leaf links to its neighbour. Every leaf is at the same depth, so every lookup costs the same number of page reads.",
          ),
          concept(
            "search",
            "Point lookup",
            "Start at the root, binary-search the node for the child whose key range covers the target, and repeat down to a leaf. That is one page per level, and the root and inner pages are nearly always cached, so often only the leaf needs a disk read.",
          ),
          concept(
            "range",
            "Range scans along the leaves",
            "Find the first matching key, then follow the leaf links until the key leaves the range. Because the leaves are in key order, one B-tree serves equality, <, >, BETWEEN, prefix matches and ORDER BY, which a hash table cannot.",
          ),
          concept(
            "split",
            "Inserts and page splits",
            "A new key goes into the leaf that covers it. If that leaf is full it is split into two pages and a separator key is added to the parent, which may itself split. The tree only gets deeper when the root splits, which is how it stays balanced. A split changes several pages in place, so a crash in the middle would break the tree; this is one reason a B-tree needs a write-ahead log.",
          ),
          concept(
            "insert-order",
            "Sequential versus random key order",
            "Keys inserted in increasing order (a sequence, a timestamp) all land on the rightmost leaf, which stays in cache. Random keys such as UUIDv4 land on a different leaf each time, so every insert can touch an uncached page, and splits leave pages partly empty across the whole index.",
          ),
        ]),
        topic("lsm", "LSM trees", [
          concept(
            "idea",
            "The idea: never write in place",
            "A log-structured merge tree buffers writes in memory, writes them out in sorted batches as new files, and merges those files in the background. Every disk write is a sequential append, at the price of reads having to look in several places.",
          ),
          concept(
            "memtable",
            "The memtable",
            "All writes go into an in-memory sorted structure (a skip list or balanced tree). Reads check it first because it holds the newest data. An update is just another insert carrying a newer value for the key.",
          ),
          concept(
            "wal",
            "The log that protects the memtable",
            "Memory is lost in a crash, so each write is appended to a log file on disk before it is applied to the memtable. On startup the log is replayed to rebuild the memtable. Once a memtable has been flushed to a sorted file, its log is no longer needed and is deleted.",
          ),
          concept(
            "sstable",
            "SSTables",
            "When the memtable reaches a size limit it is frozen and written out as a sorted string table: an immutable file of key-value pairs in key order. Because the file is sorted, a sparse index holding one key per block is enough to find any key with a search of the index and one block read.",
          ),
          concept(
            "read-path",
            "The read path",
            "A get checks the memtable and then the files from newest to oldest, and returns the first version it finds. A key that does not exist is the worst case, because every file that might hold it has to be ruled out. A range scan has to merge the memtable with every file that overlaps the range.",
          ),
          concept(
            "bloom",
            "Bloom filters",
            "A Bloom filter is a small bit array per file that answers 'definitely not here' or 'maybe here' for a key, with no false negatives. Kept in memory, it lets a read skip most files without touching disk, which matters most for keys that do not exist.",
          ),
          concept(
            "tombstone",
            "Tombstones",
            "A tombstone is a marker written to represent a delete in an append-only store, so older files' values for that key are ignored until compaction removes both. A tombstone can only be dropped once no older file can still hold the key, so a delete uses space before it frees any.",
          ),
          concept("compaction", "Compaction", undefined, {
            parts: [
              concept(
                "merge",
                "What compaction does",
                "Merges sorted files, discarding overwritten values and any tombstones that are safe to drop, which bounds read cost and reclaims space. Its inputs are already sorted, so it reads and writes sequentially. If writes arrive faster than compaction can merge, files pile up and the engine throttles or stalls writes, so an overloaded LSM store shows sudden spikes in write latency.",
              ),
              concept(
                "strategies",
                "Size-tiered versus leveled compaction",
                "Size-tiered compaction merges several files of similar size into one larger file: less rewriting, but more files to check per read and more temporary space. Leveled compaction keeps the files within a level non-overlapping (except the first level of freshly flushed files), with each level a fixed multiple larger than the last: fewer files per read and less wasted space, but each key is rewritten more times.",
              ),
              concept(
                "amplification",
                "Read, write and space amplification",
                "Write amplification is bytes written to disk per byte the user wrote, since each key is rewritten by several compactions. Read amplification is how many places a read must check. Space amplification is disk used divided by live data. Tuning trades these against each other: lowering one generally raises another.",
              ),
            ],
          }),
        ]),
        topic("layouts", "Choosing a layout", [
          concept(
            "btree-vs-lsm",
            "B-tree versus LSM tree",
            "B-trees update pages in place: good, predictable reads, but random writes and a whole page written for a small change. LSM-trees append to sorted files and compact later: fast sequential writes, at the cost of compaction work and read amplification. MySQL InnoDB and SQLite store tables in B-trees and Postgres pairs a heap with B-tree indexes, all with pages updated in place; RocksDB, LevelDB and Cassandra use LSM trees.",
          ),
          concept(
            "oltp-olap",
            "Transactional versus analytical workloads",
            "Transaction processing (OLTP) reads and writes a few whole rows by key, many times a second. Analytics (OLAP) scans millions of rows but usually only a few columns, to aggregate them. A row store keeps all of a row's values together, so one row is one page read, but an aggregate over one column still reads every page of the table.",
          ),
          concept(
            "column-store",
            "Column stores",
            "Values of one column are stored together, so an aggregate reads only the columns it needs, compresses well and vectorizes, instead of reading every full row. Compression works because neighbouring values share a type and often repeat; vectorized execution handles a batch of values per operation instead of one row at a time.",
          ),
          concept(
            "column-cost",
            "What column stores are bad at",
            "Fetching or inserting one whole row touches a separate place for every column, and compressed columns are expensive to change in place, so column stores batch their writes. A point lookup or single-row update is slower than in a row store.",
          ),
          concept(
            "parquet",
            "Parquet and DuckDB",
            "Parquet is a columnar file format: rows are split into row groups, each column of a group is stored and compressed as its own chunk, and the file's metadata holds min and max statistics that let a reader skip chunks a filter cannot match. DuckDB is an in-process analytical engine with columnar, vectorized execution that queries such files directly.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "row-column",
            "Row store versus column store",
            "Run the same aggregate over 50M rows in Postgres and in DuckDB reading Parquet. Then fetch one full row by key in both. Explain the difference from how each lays data out on disk.",
            {
              doneWhen: ["Timings for the aggregate and the point lookup in both systems, with your explanation"],
              links: [link("DuckDB documentation", "https://duckdb.org/docs/")],
            },
          ),
          build(
            "lsm-store",
            "An LSM key-value store in Go",
            "Implement put, get, delete and scan with a write-ahead log, an in-memory sorted memtable, immutable sorted files on disk, and compaction. It must survive kill -9 at any point without losing acknowledged writes.",
            {
              doneWhen: ["A repo with the store", "Crash test output"],
              links: [
                link(
                  "Build your own database (list)",
                  "https://github.com/codecrafters-io/build-your-own-x#build-your-own-database",
                ),
              ],
              parts: [
                build(
                  "wal",
                  "WAL with fsync and replay on startup",
                  "Every put and delete is appended to the log and fsynced before it is acknowledged. On startup the log is replayed into the memtable, and an incomplete final record is detected and ignored.",
                ),
                build(
                  "flush",
                  "Memtable flush to sorted files with a sparse index",
                  "A full memtable is written out as an immutable sorted file with a sparse index, and get finds a key in a file with one index search and one block read. The log for a flushed memtable is deleted only after the file is durable.",
                ),
                build(
                  "compaction",
                  "Compaction that drops overwritten keys and tombstones",
                  "Merging files keeps only the newest version of each key and removes a tombstone once no older file can hold its key. Reads return correct results before, during and after a compaction, and old files are deleted only after the merged file is durable.",
                ),
                build(
                  "crash-test",
                  "A crash test that verifies acknowledged writes",
                  "A harness kills the process at random points under load, restarts it, and checks that every acknowledged write is present and every acknowledged delete is still deleted.",
                ),
              ],
            },
          ),
        ]),
      ],
      {
        detail: "How rows and keys are laid out on disk, and the two families of engine built on that.",
        links: [CMU, DDIA],
      },
    ),

    topic(
      "indexes",
      "Indexes",
      [
        topic("basics", "What an index is", [
          concept(
            "what",
            "An index is a sorted copy of some columns",
            "An index is a separate structure that maps the values of chosen columns to the locations of the rows holding them, kept in step with the table on every write. For the queries it matches, it turns 'read every page' into 'read a handful of pages'. Primary key and unique constraints are enforced by a unique index.",
          ),
          concept(
            "cost",
            "What every index costs",
            "Every insert, update and delete must maintain it, and it takes disk and cache space. An index that no query uses is pure cost; in Postgres, pg_stat_user_indexes shows how often each one has been scanned.",
          ),
          concept(
            "lookup",
            "The three steps of an index lookup",
            "Descend the tree to the first matching leaf entry, follow the leaf chain while entries still match, and fetch each matching row from the table. The descent is bounded by the tree's depth; the leaf walk and the row fetches grow with the number of matches, and each row fetch can be a random page read.",
          ),
          concept(
            "clustered",
            "Heap tables versus clustered indexes",
            "In Postgres the table is a heap and every index, including the primary key, points at row locations in it. In MySQL InnoDB the rows live in the leaves of the primary key B-tree and secondary indexes store the primary key, so a secondary lookup descends two trees, while a primary key range scan reads rows that sit together.",
          ),
          concept(
            "usable",
            "What a B-tree index can and cannot serve",
            "It serves equality, ranges, ORDER BY and min/max on the indexed column, because those map to one contiguous stretch of the sorted entries. It cannot serve a condition on a function of the column (lower(email) = ...), a comparison that forces a type conversion of the column, or LIKE with a leading wildcard, because those matches are not adjacent in the index. In Postgres even a prefix LIKE 'abc%' uses a B-tree only if the index is in the C collation or uses a pattern operator class such as text_pattern_ops.",
          ),
        ]),
        topic("composite", "Composite indexes", [
          concept(
            "leftmost",
            "Column order and the leftmost-prefix rule",
            "Entries are sorted by a first, then b. Without a condition on a, matching b values are scattered across the whole index. So an index on (a, b) serves conditions on a alone or on a and b together efficiently, but for b alone the whole index must be read. Postgres 18 (like MySQL and Oracle before it) can 'skip scan', doing one search per distinct value of a, which pays off only when a has few distinct values; do not design around it.",
          ),
          concept(
            "eq-range",
            "Equality columns first, then the range column",
            "With an index on (a, b), a = 1 AND b > 5 is one contiguous range of the index. With a > 1 AND b = 5, only the condition on a limits the range scanned and b is checked entry by entry. Put the columns compared with = first and at most one range column after them.",
          ),
          concept(
            "sorted",
            "Indexes that return rows already sorted",
            "An index on (a, b) returns the rows for a = 1 in b order, so ORDER BY b needs no sort step, and with LIMIT the scan stops after the first few entries. Without a matching index the database must fetch and sort every matching row before returning the first.",
          ),
        ]),
        topic("covering", "Covering indexes", [
          concept(
            "index-only",
            "Index-only scans",
            "The query is answered entirely from the index because it contains every needed column, avoiding visits to the table (in Postgres, subject to the visibility map). INCLUDE adds extra columns to the leaf entries for this purpose without making them part of the sort key.",
          ),
          concept(
            "visibility-map",
            "Why Postgres still checks the visibility map",
            "Index entries do not record which transactions can see a row, so an index-only scan may skip the table only for pages the visibility map marks as all-visible. VACUUM sets those bits; on a heavily updated table the 'Heap Fetches' count in EXPLAIN ANALYZE shows how many rows still needed a table visit.",
          ),
        ]),
        topic("selectivity", "Selectivity", [
          concept(
            "fraction",
            "Selectivity: the fraction of rows that match",
            "An index pays off when a condition matches a small fraction of the table. An index on a column with few distinct values (a boolean, a status) rarely helps on its own, because each value matches a large share of the rows.",
          ),
          concept(
            "seq-wins",
            "When the planner ignores an index",
            "When the query will return a large fraction of the table, reading it sequentially is cheaper than many random index and heap lookups. The planner estimates both costs from its statistics and picks the cheaper; the existence of an index does not force its use.",
          ),
        ]),
        topic("kinds", "Other kinds of index", [
          concept(
            "partial",
            "Partial indexes",
            "CREATE INDEX ... WHERE condition indexes only the rows that satisfy the condition, so it is smaller and cheaper to maintain. The planner uses it only for queries whose WHERE clause implies that condition. Typical use: the few rows with status 'pending' in a large table.",
          ),
          concept(
            "expression",
            "Expression indexes",
            "An index can be built on the result of an expression, such as lower(email), and is used when the query contains the same expression. The expression is computed on every write to keep the index current.",
          ),
          concept(
            "hash",
            "Hash indexes",
            "A hash index stores a hash of the value and supports only equality. It cannot serve ranges or ordering, which is why B-tree is the default.",
          ),
          concept(
            "gin",
            "GIN: inverted indexes",
            "A GIN index maps each element inside a value (an array element, a jsonb key, a word in a text search document) to the rows that contain it. It serves 'contains' queries and is more expensive to update than a B-tree.",
          ),
          concept(
            "gist",
            "GiST",
            "GiST is a balanced-tree framework for data without a single sort order, such as geometric shapes and ranges. It serves overlap, containment and nearest-neighbour searches, and exclusion constraints are usually built on it.",
          ),
          concept(
            "brin",
            "BRIN",
            "A BRIN index stores a summary, such as the minimum and maximum, for each range of adjacent table pages, so it is tiny. It only helps when a column's value follows the physical order of the table, as with timestamps in an append-only table.",
          ),
        ]),
        topic("operate", "Indexes on a live table", [
          concept(
            "concurrently",
            "CREATE INDEX CONCURRENTLY",
            "A plain CREATE INDEX in Postgres takes a SHARE lock, which allows reads but blocks writes to the table until it finishes. CREATE INDEX CONCURRENTLY does not block writes, at the cost of scanning the table twice, waiting for older transactions and not running inside a transaction block; if it fails it leaves behind an invalid index that must be dropped.",
          ),
          concept(
            "fk-index",
            "Foreign keys need their own index",
            "Postgres creates an index for a primary key or unique constraint, but not for the referencing columns of a foreign key. Without one, every delete or key update on the parent has to scan the child table to check for references, and joins from parent to child cannot use an index.",
          ),
        ]),
      ],
      {
        detail: "What an index buys on reads, what it costs on writes, and which queries it can serve.",
        links: [USE_THE_INDEX],
      },
    ),

    topic(
      "planning",
      "Query planning",
      [
        topic(
          "pipeline",
          "From SQL to a plan",
          [
            concept(
              "declarative",
              "SQL says what, the planner decides how",
              "A query names the result it wants, not the steps. The same query can be run by many different plans whose costs differ by orders of magnitude, and choosing among them is the planner's job.",
            ),
            concept(
              "stages",
              "Parse, analyse, rewrite, plan, execute",
              "In Postgres the parser turns text into a parse tree, the analyzer resolves table, column and type names, the rewriter expands views and rules, the planner chooses the cheapest plan it can find, and the executor runs it.",
            ),
            concept(
              "plan-tree",
              "A plan is a tree of nodes",
              "Scans sit at the leaves, with joins, sorts and aggregates above them. Each node pulls rows from its children on demand, so a LIMIT at the top can stop the whole tree early, unless a node below (such as a sort) has to consume all of its input first.",
            ),
            concept(
              "cost-model",
              "Cost-based planning",
              "For each candidate plan the planner estimates a cost in abstract units, built from the pages it expects to read (random pages priced higher than sequential ones) and the rows it expects to process. It picks the lowest total. The cost is a prediction from statistics, not a measurement.",
            ),
          ],
          { links: [PG_INTERNALS] },
        ),
        topic("stats", "Statistics and estimates", [
          concept(
            "analyze",
            "Table statistics and ANALYZE",
            "ANALYZE samples each table and records, per column, the fraction of nulls, the number of distinct values, the most common values with their frequencies, and a histogram of the rest. Autovacuum re-runs it after enough rows change; after a bulk load the statistics are stale until it does.",
          ),
          concept(
            "cardinality",
            "Cardinality estimates",
            "The planner turns each condition into a selectivity and multiplies by the row count to estimate how many rows each node will produce. Scan type, join algorithm and join order are all chosen from these numbers.",
          ),
          concept(
            "misestimate",
            "How estimates go wrong",
            "Statistics can be stale, and conditions on several columns are assumed independent, so correlated columns (city and postcode) are underestimated. Errors multiply through each join, so a plan with many joins can be off by orders of magnitude. In Postgres, CREATE STATISTICS can record the dependency between columns.",
          ),
        ]),
        topic("scans", "Scan types", [
          concept(
            "seq",
            "Sequential scan",
            "Reads every page of the table in order and tests every row. Its cost depends on the table's size, not on how many rows match, and its I/O is sequential. It is the right choice for a small table or a condition that matches much of a large one.",
          ),
          concept(
            "index-scan",
            "Index scan",
            "Walks the index for matching entries and fetches each row from the table as it goes, returning rows in index order. Cheapest when few rows match; each fetch can be a random page read, so it degrades as the number of matches grows.",
          ),
          concept(
            "bitmap",
            "Bitmap index scan and bitmap heap scan",
            "The index is scanned first to build a bitmap of matching row locations, then the table pages are visited in physical order, each once. It suits a medium number of matches and can combine several indexes with AND and OR. The output is not in index order, and a bitmap that outgrows its memory keeps only page numbers, so the rows on those pages are rechecked.",
          ),
        ]),
        topic("joins", "Joins and sorts", [
          concept(
            "nested-loop",
            "Nested loop join",
            "For each row of the outer input, find the matching rows of the inner input. Chosen for a small outer side with an indexed inner. With a large outer side the inner lookup is repeated that many times.",
          ),
          concept(
            "hash-join",
            "Hash join",
            "Build a hash table on the join key from the smaller input, then probe it with each row of the other. Chosen for large unsorted equality joins. It works only for equality conditions and needs memory for the table; when that exceeds its budget the join splits both inputs into batches on disk.",
          ),
          concept(
            "merge-join",
            "Merge join",
            "Walk two inputs that are sorted on the join key in step with each other. Chosen when both inputs are already sorted on the key, for example because they come from indexes; otherwise it has to pay for the sorts.",
          ),
          concept(
            "sort",
            "Sorts and work_mem",
            "A sort that fits in work_mem runs in memory; a larger one becomes an external merge sort using temporary files. EXPLAIN ANALYZE shows which under 'Sort Method'. With ORDER BY ... LIMIT n the executor keeps only the top n rows in a heap instead of sorting everything.",
          ),
        ]),
        topic(
          "explain",
          "Reading EXPLAIN",
          [
            concept(
              "plan",
              "EXPLAIN: the plan and its estimates",
              "EXPLAIN prints the plan tree without running the query. Each node shows an estimated startup cost and total cost, the estimated number of rows and their average width in bytes. Indented nodes feed the node above them.",
            ),
            concept(
              "analyze",
              "EXPLAIN ANALYZE: what really happened",
              "ANALYZE runs the query and adds, per node, the actual time to the first row and to the last row in milliseconds, the actual row count, and loops (how many times the node ran). Time and rows are averages per loop (rows shown with two decimals since Postgres 18), so multiply by loops, and a node's time includes its children, so subtract them to find where time is spent. It really executes writes, so wrap those in a transaction and roll back.",
            ),
            concept(
              "est-vs-actual",
              "Estimated versus actual rows",
              "A large mismatch means stale or insufficient statistics, which leads the planner to bad join orders and scan choices. Find the lowest node in the tree where the two diverge; everything above it was planned from a wrong number. The classic case: one row expected, so a nested loop is chosen, and its inner side then runs a hundred thousand times.",
            ),
            concept(
              "buffers",
              "The BUFFERS option",
              "How many pages each node found in shared buffers (hit) versus had to read in (read), plus pages it dirtied and wrote, revealing I/O cost rather than just time. A 'read' page may still have come from the operating system's cache rather than the disk. The counts explain why the same query is faster on its second run. Since Postgres 18, EXPLAIN ANALYZE includes them without asking.",
            ),
            concept(
              "signs",
              "Warning signs in a plan",
              "A sequential scan whose 'Rows Removed by Filter' dwarfs the rows it returns, a sort or hash that spills to disk, a nested loop with a large loop count, and an index-only scan with many heap fetches. You can name the likely fix for each.",
            ),
          ],
          { links: [USING_EXPLAIN] },
        ),
        topic("slow", "Other causes of slow queries", [
          concept(
            "n-plus-one",
            "N+1 queries",
            "The application runs one query for a list and then one more per item. Each query is fast, so nothing shows up as slow; the time goes to round trips. The fix is one join or one query with a list of keys.",
          ),
          concept(
            "stat-statements",
            "Finding the queries that matter",
            "The pg_stat_statements extension records calls, total time and rows for each normalised query. Sorting by total time finds the cheap query run a million times, which a slow-query log (log_min_duration_statement) never shows.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "explain-lab",
            "Read query plans on ten million rows",
            "Load 10M rows into Postgres. For five queries, run EXPLAIN (ANALYZE, BUFFERS) before and after adding an index and explain every node. Show a composite index that is used for (a, b) but not for b alone (give a many distinct values, so a skip scan cannot stand in), an index-only scan, and a case where the planner correctly prefers a sequential scan.",
            {
              doneWhen: [
                "Before and after plans for each query with your annotations",
                "The rule for column order in a composite index, in your own words",
              ],
              links: [USING_EXPLAIN],
            },
          ),
        ]),
      ],
      { detail: "How a declarative query becomes a sequence of page reads, and how to read the plan when it is slow." },
    ),

    topic(
      "transactions",
      "Transactions",
      [
        topic("acid", "ACID", [
          concept(
            "problem",
            "The problem: multi-step changes, crashes, other clients",
            "A transfer debits one row and credits another. A crash between the two statements loses money, and another client reading between them sees a total that never existed. A transaction groups statements so that the database, not the application, handles both cases.",
          ),
          concept(
            "lifecycle",
            "BEGIN, COMMIT, ROLLBACK and autocommit",
            "A transaction starts at BEGIN and ends at COMMIT, which makes all its changes permanent, or ROLLBACK, which discards them. A statement outside an explicit transaction runs in one of its own. In Postgres an error inside a transaction aborts it: every later statement fails until you roll back.",
          ),
          concept(
            "atomicity",
            "Atomicity",
            "All of a transaction's writes take effect or none do. If it aborts or the database crashes before commit, its partial changes are discarded. Atomicity is about abort, not about concurrency.",
          ),
          concept(
            "consistency",
            "Consistency",
            "A transaction moves the data from one state that satisfies the application's invariants to another. The database enforces the invariants you declare (constraints, foreign keys); the rest is the application's job, which makes this the one letter that is mostly not a property of the database.",
          ),
          concept(
            "isolation",
            "Isolation",
            "Concurrently running transactions should not interfere. The strict definition is serializability: the outcome equals that of running the transactions one at a time in some order. Most databases default to something weaker for speed, which is why the anomalies below matter.",
          ),
          concept(
            "durability",
            "Durability",
            "Once commit has been acknowledged, the transaction's changes survive a crash or power loss. In practice that means its log records were flushed to stable storage. On a single machine it does not survive losing the disk.",
          ),
        ]),
        topic("anomalies", "Concurrency anomalies", [
          concept(
            "dirty-read",
            "Dirty read",
            "A transaction reads data that another transaction has written but not committed. If the writer rolls back, the reader has acted on data that never existed.",
          ),
          concept(
            "non-repeatable",
            "Non-repeatable read",
            "A transaction reads the same row twice and gets different values, because another transaction committed a change in between. A report that reads several related rows can see a mix of before and after.",
          ),
          concept(
            "phantom",
            "Phantom read",
            "A transaction repeats a query with a search condition and gets a different set of rows, because another transaction inserted or deleted rows that match. Locking the rows read the first time does not prevent it, since the new row did not exist to be locked.",
          ),
          concept(
            "lost-update",
            "Lost update",
            "Two transactions read a value, both compute from it and write back; one write is overwritten. Prevent with an atomic UPDATE, SELECT FOR UPDATE, or a version check.",
          ),
          concept(
            "write-skew",
            "Write skew",
            "Two transactions each read an overlapping set, each make a decision valid on its own, and write to different rows; together they break an invariant. Snapshot isolation does not prevent it. Example: two on-call doctors each see that the other is on call, and both sign off.",
          ),
        ]),
        topic(
          "levels",
          "Isolation levels",
          [
            concept(
              "standard",
              "The four standard levels",
              "The SQL standard defines levels by the anomalies they forbid: read uncommitted allows dirty reads, non-repeatable reads and phantoms; read committed forbids dirty reads; repeatable read also forbids non-repeatable reads; serializable forbids all three and requires a result equal to some serial order. The anomaly definitions are loose: snapshot isolation prevents all three yet still allows write skew. These are minimums, and engines differ in what each name really does and in their default: read committed in Postgres, repeatable read in MySQL InnoDB.",
            ),
            concept("postgres", "What Postgres implements", undefined, {
              parts: [
                concept(
                  "read-committed",
                  "Read committed (the default)",
                  "Each statement sees a snapshot taken when that statement starts, so two statements in one transaction can see different data. Dirty reads never happen: asking for read uncommitted gives read committed. An UPDATE that meets a row another transaction is changing waits, then re-checks its WHERE clause against the new version. Lost updates from read-then-write application code are possible.",
                ),
                concept(
                  "repeatable-read",
                  "Repeatable read is snapshot isolation",
                  "The whole transaction reads from one snapshot taken at its first query, so it sees no dirty reads, non-repeatable reads or phantoms, which is more than the standard requires. If it tries to update a row that another transaction changed and committed after the snapshot, it fails with SQLSTATE 40001, which prevents lost updates. Write skew is still possible.",
                ),
                concept(
                  "serializable",
                  "Serializable is serializable snapshot isolation",
                  "Transactions run on snapshots as in repeatable read, with no extra blocking, while the database tracks which transaction read data that a concurrent one wrote. When the pattern of dependencies could produce a result that no serial order would, it aborts one of them. This stops write skew, and it can also abort transactions that would in fact have been safe.",
                ),
              ],
            }),
            concept(
              "retry",
              "Retrying serialization failures",
              "Be ready to retry: transactions can fail with serialization_failure (SQLSTATE 40001) and must be re-run from the start, including the reads and application logic that led to the writes. The same loop should handle deadlock_detected (40P01).",
            ),
          ],
          { links: [PG_ISOLATION] },
        ),
        topic(
          "mvcc",
          "MVCC",
          [
            concept(
              "idea",
              "Versions instead of read locks",
              "Multi-version concurrency control: writers create new row versions instead of overwriting, and each transaction reads a consistent snapshot, so readers and writers do not block each other.",
            ),
            concept(
              "xmin-xmax",
              "Transaction IDs, xmin and xmax",
              "Each writing transaction gets a transaction ID from a counter. Every row version stores xmin, the ID of the transaction that created it, and xmax, the ID of the one that deleted or replaced it (zero if none). Read-only transactions get no ID, and Postgres also uses xmax to record a row lock.",
            ),
            concept(
              "versions",
              "What UPDATE and DELETE write in Postgres",
              "DELETE only sets xmax on the row version. UPDATE sets xmax on the old version and inserts a complete new version with its own xmin. Nothing is removed at that moment, so old versions stay in the table until vacuum removes them. Commit or abort is recorded once per transaction ID in the commit log (pg_xact), so a rollback rewrites no rows: the aborted transaction's versions are never visible to anyone.",
            ),
            concept(
              "snapshot",
              "Snapshots and the visibility rule",
              "A snapshot records which transactions had committed and which were still running when it was taken. A row version is visible if its xmin belongs to a transaction that committed before the snapshot, and its xmax is empty or belongs to one that had not committed by then. A transaction also sees its own changes, and an xmax that only marks a row lock does not hide the row. Every query applies this test to each row version it touches.",
            ),
          ],
          { links: [PG_INTERNALS] },
        ),
        topic("locks", "Locks and deadlocks", [
          concept(
            "why",
            "Why MVCC still needs locks",
            "Snapshots stop readers and writers blocking each other, but two transactions writing the same row must still go one after the other. The second writer waits until the first commits or rolls back.",
          ),
          concept(
            "row-locks",
            "Row-level locks",
            "UPDATE and DELETE lock each row they change until the transaction ends. Postgres records the lock in the row itself, not in a table in memory, so locking many rows is not limited by memory. Row locks block other writers and lockers of the same row, never a plain SELECT. They come in four strengths, from FOR KEY SHARE (taken by foreign key checks) to FOR UPDATE; the weaker ones exist so that inserting a child row does not block an ordinary update of its parent.",
          ),
          concept(
            "table-locks",
            "Table-level lock modes",
            "Every statement also takes a lock on each table it uses, in one of several modes with a fixed conflict table. SELECT takes the weakest (ACCESS SHARE); INSERT, UPDATE and DELETE take ROW EXCLUSIVE; these do not conflict with each other. DROP, TRUNCATE and many forms of ALTER TABLE take ACCESS EXCLUSIVE, which conflicts with everything, including SELECT.",
          ),
          concept(
            "lock-queue",
            "The lock queue and schema changes",
            "A request for ACCESS EXCLUSIVE waits behind any transaction still using the table, and every later request, even a SELECT, queues behind it. One long transaction plus one quick ALTER TABLE can therefore block a whole table. Set lock_timeout on schema changes so that they give up instead.",
          ),
          concept(
            "two-phase-locking",
            "Two-phase locking",
            "The lock-based route to serializability: a transaction takes a shared lock to read and an exclusive lock to write, and once it has released any lock it takes no more; in practice everything is held until commit. To prevent phantoms it must also lock the ranges it searched (predicate or index-range locks), not just the rows it found. Readers and writers block each other and deadlocks are common, which is the cost MVCC avoids.",
          ),
          concept(
            "deadlock",
            "Deadlocks and their detection",
            "Two transactions each hold a lock the other is waiting for, so neither can continue. After a lock wait exceeds deadlock_timeout (1 second by default) Postgres searches for a cycle of waiters and aborts one transaction with SQLSTATE 40P01. Taking locks in a consistent order, such as by ascending ID, prevents the cycle.",
          ),
          concept(
            "observe",
            "Seeing who is blocking whom",
            "pg_stat_activity shows each session's state, current query and what it is waiting on; pg_locks shows held and awaited locks; pg_blocking_pids(pid) names the sessions blocking a given one. A session shown as 'idle in transaction' still holds every lock it took. A statement that is slow because it is waiting on a lock does no work, and its plan tells you nothing.",
          ),
        ]),
        topic("control", "Optimistic and pessimistic control", [
          concept(
            "atomic-update",
            "Read-modify-write in one statement",
            "UPDATE accounts SET balance = balance - 10 WHERE id = 1 reads and writes under the row lock, so concurrent runs cannot lose an update. It is the simplest fix when the new value can be computed in SQL.",
          ),
          concept(
            "for-update",
            "Pessimistic locking with SELECT FOR UPDATE",
            "SELECT ... FOR UPDATE locks the rows it returns until the transaction ends, so another transaction that wants to update, delete or lock them waits. Read the row this way, compute in the application, write, commit: nobody else can change the row in between.",
          ),
          concept(
            "optimistic",
            "Optimistic concurrency with a version check",
            "Read the row with its version number, hold no lock, and write with UPDATE ... WHERE id = ? AND version = ?, incrementing the version. Zero rows updated means someone else got there first, so re-read and retry. It wins when conflicts are rare or when the read and the write happen in different requests; locking wins when conflicts are common.",
          ),
          concept(
            "skip-locked",
            "NOWAIT and SKIP LOCKED",
            "By default a locking read waits for a locked row. NOWAIT makes it fail at once instead, and SKIP LOCKED makes it pass over locked rows as if they were not there. SKIP LOCKED enables a queue where many workers each claim a different unlocked row without blocking on each other.",
          ),
          concept(
            "skew-fix",
            "Preventing write skew",
            "Lock the rows the decision was based on with FOR UPDATE, so the second transaction waits; at read committed it then sees the first one's change, at repeatable read it fails with 40001 and retries. When the decision is based on the absence of rows there is nothing to lock: use a unique or exclusion constraint, or run at serializable and retry.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "isolation-lab",
            "Reproduce isolation anomalies",
            "In two psql sessions: a lost update at READ COMMITTED and its fix with SELECT FOR UPDATE; write skew at REPEATABLE READ (two doctors both go off call); the same at SERIALIZABLE failing with error 40001 and a retry loop that handles it. Then build a job queue with FOR UPDATE SKIP LOCKED and run four workers against it.",
            {
              doneWhen: [
                "The interleaved statements and results for each anomaly",
                "A repo with the retry loop and the SKIP LOCKED queue",
              ],
              links: [PG_ISOLATION],
            },
          ),
        ]),
      ],
      {
        detail: "What a transaction promises, the ways concurrent transactions can go wrong, and the machinery that keeps them apart.",
        links: [DDIA, CMU],
      },
    ),

    topic(
      "durability",
      "Durability and recovery",
      [
        topic("wal", "The write-ahead log", [
          concept(
            "problem",
            "The problem: one commit, many pages",
            "A transaction may change pages scattered across tables and indexes. Writing them all to disk at commit would be slow random I/O, and a crash partway through would leave some pages new and some old with no way to tell which.",
          ),
          concept(
            "rule",
            "The write-ahead log rule",
            "A change must be written to the log and flushed before the modified data page may be written. After a crash, the log is replayed to restore committed changes. A commit is acknowledged once its commit record is flushed, so one sequential log write makes many scattered page changes durable.",
          ),
          concept(
            "lsn",
            "Log sequence numbers",
            "Every WAL record has a position, its LSN, and each data page stores the LSN of the last record that changed it. The buffer manager will not write a page until the log is flushed past that LSN, and recovery uses the page's LSN to skip changes the page already contains, so replaying a record twice is harmless.",
          ),
          concept(
            "full-page",
            "Torn pages and full-page writes",
            "A crash can leave a page half old and half new, because a page is larger than what the device writes atomically. Postgres therefore logs the whole page image the first time a page changes after each checkpoint, and recovery starts from that image. This is why WAL volume jumps right after a checkpoint.",
          ),
        ]),
        topic("commit", "The cost of commit", [
          concept(
            "fsync",
            "fsync is the moment of durability",
            "write() only copies data into the operating system's page cache; fsync blocks until the device reports the data stored. Commit returns after the WAL is flushed this way (with fdatasync by default on Linux), so commit latency is fsync latency. A disk or hypervisor that acknowledges a flush it has not performed breaks durability for every database on it.",
          ),
          concept(
            "group-commit",
            "Group commit",
            "An fsync takes far longer than writing a log record, so one fsync per transaction would cap throughput. While one flush is in progress other committing transactions append their records, and the next single fsync makes all of them durable. Under concurrency, commits per second can far exceed fsyncs per second.",
          ),
          concept(
            "sync-commit",
            "synchronous_commit = off",
            "Commit returns before its WAL is flushed, and a background process flushes shortly after. A crash can lose acknowledged transactions from the last three times wal_writer_delay (200 ms by default, so up to about 600 ms), but the database stays consistent, because the log is still written in order. It can be set per transaction. This is unlike fsync = off, which stops Postgres forcing anything to disk and can leave the database unrecoverable after an operating system crash.",
          ),
        ]),
        topic("checkpoints", "Checkpoints", [
          concept(
            "what",
            "What a checkpoint does",
            "It notes the current WAL position as its redo point, writes every dirty page in the buffer pool to the data files, fsyncs them and logs a checkpoint record. Recovery can then start from the redo point, so older WAL is no longer needed for crash recovery and is recycled, unless archiving or a replication slot still needs it. Postgres checkpoints on a timer (checkpoint_timeout, 5 minutes by default) or when enough WAL has accumulated (max_wal_size, 1 GB by default). Frequent checkpoints shorten recovery but write more pages and more full-page images.",
          ),
        ]),
        topic("recovery", "Crash recovery", [
          concept(
            "redo",
            "Redo from the last checkpoint",
            "On startup after an unclean stop, Postgres reads the location of the last checkpoint from its control file (pg_control) and replays every WAL record from that checkpoint's redo point, in order, to the end of the log. Recovery time is set by how much WAL was written since that redo point.",
          ),
          concept(
            "no-undo",
            "Why Postgres has no undo pass",
            "After redo the data files also contain changes from transactions that never committed. Postgres leaves them: those transactions are not marked committed in the commit log, so their row versions are invisible to every snapshot, and vacuum removes them later.",
          ),
          concept("aries", "ARIES: recovery with redo and undo", undefined, {
            parts: [
              concept(
                "steal-no-force",
                "Steal and no-force",
                "No-force means commit does not have to write the transaction's data pages, so recovery must be able to redo committed changes. Steal means the buffer pool may write out a page holding uncommitted changes, so recovery must be able to undo them. ARIES is the standard design for a log that supports both in engines that update rows in place.",
              ),
              concept(
                "analysis",
                "Analysis pass",
                "Scan the log forward from the last checkpoint to work out which transactions were still active at the crash and which pages might have been dirty.",
              ),
              concept(
                "redo-pass",
                "Redo pass: repeating history",
                "Reapply every logged change, including those of transactions that will be rolled back, so that the pages are exactly as they were at the moment of the crash.",
              ),
              concept(
                "undo-pass",
                "Undo pass",
                "Roll back the changes of the transactions that had not committed, newest first. Each undo step is itself logged as a compensation record, so a crash during recovery neither repeats nor loses work.",
              ),
            ],
          }),
          concept(
            "pitr",
            "WAL archiving and point-in-time recovery",
            "A base backup plus the archived WAL written since can be replayed up to any chosen moment, using the same redo mechanism as crash recovery. This is what recovers from a bad DELETE, which a replica cannot, since the replica applies it too.",
          ),
        ]),
        topic("observe", "Seeing it on a real server", [
          concept(
            "waldump",
            "Reading WAL with pg_waldump",
            "pg_waldump prints each record in a WAL file: its LSN, its transaction ID, the resource manager that wrote it (heap, btree, transaction) and a description. You can find the row insert, the index insert and the commit record of one transaction.",
          ),
          concept(
            "log-lines",
            "Recovery in the server log",
            "After a crash the log reports that the database was not properly shut down and that automatic recovery is in progress, then the LSN where redo starts and where it is done, and finally that the system is ready to accept connections. You can read off how long recovery took.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "crash-lab",
            "Crash Postgres and watch it recover",
            "During a write-heavy load, kill -9 the Postgres server. Restart and read the recovery log lines. Inspect recent WAL with pg_waldump. Then set synchronous_commit=off, repeat with an instant VM reset, and count acknowledged transactions that were lost.",
            {
              doneWhen: [
                "The server log through crash recovery, and a pg_waldump excerpt you can explain",
                "A note on what synchronous_commit=off bought in throughput and cost in durability",
              ],
            },
          ),
          build(
            "writeup",
            "Write-up: from files and fsync to a database",
            "Connect fsync, the page cache and atomic rename from Files and storage to the WAL and compaction in your LSM store.",
            { doneWhen: ["A published write-up"] },
          ),
        ]),
      ],
      {
        detail: "How a commit becomes permanent, and how the database gets back to a correct state after a crash.",
        links: [CMU, PG_INTERNALS],
      },
    ),

    topic(
      "postgres",
      "Postgres internals",
      [
        topic("processes", "Processes and connections", [
          concept(
            "backend",
            "One process per connection",
            "The postmaster process listens for connections and forks a backend process for each client. That backend parses, plans and executes all of that connection's queries, and cooperates with the others through shared memory. Alongside run background processes you can identify in `ps`: the checkpointer, background writer, WAL writer, autovacuum launcher and a WAL sender per replica.",
          ),
          concept(
            "conn-cost",
            "Why connections are expensive",
            "Each connection is an operating system process with its own memory for caches and query work, created by a fork at connect time. max_connections (typically 100 by default) is a hard cap, and past a certain number of active backends they contend for CPU and locks, so throughput falls instead of rising.",
          ),
          concept(
            "pooling",
            "Connection pooling",
            "An application-side pool keeps a few connections open and lends them to requests, which removes connect cost and caps concurrency. With many application instances the pools add up, so a pooler such as PgBouncer sits in front and multiplexes thousands of client connections onto a small number of server connections.",
          ),
          concept(
            "pool-modes",
            "Session versus transaction pooling",
            "In session mode a client keeps one server connection until it disconnects. In transaction mode the server connection returns to the pool after every transaction, which multiplexes far better but breaks anything that relies on session state: SET, session-level advisory locks, LISTEN and temporary tables.",
          ),
        ]),
        topic("memory", "Memory", [
          concept(
            "shared-buffers",
            "Shared buffers and the OS page cache",
            "shared_buffers is Postgres's own buffer pool, in memory shared by all backends. Postgres reads and writes its files through the kernel's page cache, so a page can be cached twice, and a miss in shared buffers is often served from the OS cache without disk I/O. This is why shared_buffers is usually set to a fraction of RAM, not most of it: on a dedicated server with 1 GB or more, the documentation suggests starting at 25%.",
          ),
          concept(
            "work-mem",
            "work_mem is per operation",
            "Each sort or hash node in each running query, and in each of its parallel workers, gets its own memory budget of work_mem (4 MB by default; hash nodes get twice that through hash_mem_multiplier) before it spills to disk. One query can have several such nodes and there are many connections, so the total is a multiple of the setting, and raising it globally can run the server out of memory.",
          ),
        ]),
        topic("vacuum", "MVCC bloat and VACUUM", [
          concept(
            "dead-tuples",
            "Dead tuples and why VACUUM exists",
            "MVCC leaves dead row versions behind. Vacuum reclaims them and prevents transaction ID wraparound. A version is dead once no running transaction's snapshot could still see it; until vacuum removes it, it takes space in the table and in every index, and every scan has to step over it.",
          ),
          concept(
            "what",
            "What VACUUM does",
            "It finds dead row versions, removes the index entries pointing at them, frees their space inside the table's pages for reuse, and updates the free space map and visibility map. It runs alongside reads and writes. It does not shrink the file (beyond truncating empty pages at the end), so a bloated table stays large and refills. VACUUM FULL does return the space by rewriting the table, but it locks out every query while it runs.",
          ),
          concept(
            "autovacuum",
            "Autovacuum",
            "A launcher starts workers that vacuum a table once its dead rows exceed 50 plus 20% of the table by default (capped at 100 million since Postgres 18), or once enough rows have been inserted, and analyze it on a similar rule. On a very large table 20% is a lot of dead rows, so the fraction is often lowered per table. Its I/O is throttled, so on a busy table it can fall behind.",
          ),
          concept(
            "horizon",
            "What stops vacuum from cleaning up",
            "Vacuum can only remove versions older than the oldest snapshot still in use. One long-running transaction, a session left idle in transaction, a forgotten prepared transaction, or (see Replication below) a stale replication slot or standby feedback holds that horizon back, and dead rows then pile up in every table no matter how often vacuum runs.",
          ),
          concept(
            "hot",
            "HOT updates",
            "If an update changes no indexed column (columns covered only by BRIN indexes do not count, since Postgres 16) and the new version fits in the same page, Postgres adds no new index entries: the indexes keep pointing at the old slot, which chains to the new version. Dead versions in such chains can be pruned by ordinary queries without waiting for vacuum. Any other update inserts a new entry into every index on the table.",
          ),
          concept(
            "observe",
            "Watching vacuum and bloat",
            "pg_stat_user_tables shows live and dead row counts per table (n_live_tup, n_dead_tup) and when vacuum and autovacuum last ran. A dead count that keeps rising despite recent vacuums points to a held-back horizon; look for old transactions in pg_stat_activity.",
          ),
        ]),
        topic("wraparound", "Transaction ID wraparound", [
          concept(
            "xid-space",
            "32-bit transaction IDs",
            "Transaction IDs are 32 bits and compared on a circle: for any ID, about two billion others count as older and two billion as newer. A row version left unfrozen for two billion transactions would flip from the past to the future and become invisible.",
          ),
          concept(
            "freezing",
            "Freezing",
            "Vacuum marks sufficiently old row versions as frozen, meaning visible to every transaction regardless of ID. Once the old versions in a table are frozen, the IDs that created them can safely be reused.",
          ),
          concept(
            "forced",
            "Forced vacuum and the write stop",
            "When a table's oldest unfrozen ID is older than autovacuum_freeze_max_age (200 million transactions by default), autovacuum vacuums it even if autovacuum is disabled. If freezing still cannot keep up, Postgres eventually refuses to assign new transaction IDs, which stops writes, until a vacuum succeeds. age(datfrozenxid) in pg_database shows how close each database is.",
          ),
        ]),
      ],
      {
        detail: "The parts of Postgres that surprise people in production: processes, memory, vacuum and wraparound.",
        links: [PG_INTERNALS],
      },
    ),

    topic(
      "replication",
      "Replication",
      [
        topic("why", "Why and what to replicate", [
          concept(
            "reasons",
            "Why keep more than one copy",
            "A replica lets the service survive the loss of a machine, serves read queries, and can sit near distant users. It is not a backup: a mistaken DELETE or DROP TABLE is replicated like any other change.",
          ),
          concept(
            "leader",
            "Single-leader replication",
            "All writes go to one node, the primary. It sends its stream of changes to the replicas, which apply them in the same order and accept only reads. Postgres's built-in streaming replication works this way.",
          ),
          concept(
            "formats",
            "What gets shipped: statements, WAL or row changes",
            "Replaying SQL statements breaks on anything nondeterministic, such as now() or random(). Shipping the write-ahead log is exact but ties the replica to the same on-disk format. Shipping logical row changes (this row inserted, that one updated) is independent of the storage format.",
          ),
        ]),
        topic("physical", "Physical replication", [
          concept(
            "streaming",
            "Streaming replication",
            "A standby is created from a base backup of the primary, then receives WAL over a connection as the primary generates it, writes it to disk and replays it. It is crash recovery that never ends, so the standby is a byte-for-byte copy of the whole cluster and must run the same major version.",
          ),
          concept(
            "hot-standby",
            "Hot standby and query conflicts",
            "A standby can serve read-only queries while replaying. Replay sometimes has to remove row versions that a running standby query still needs; the standby then delays replay for a limited time and after that cancels the query. hot_standby_feedback avoids the cancellation by making the primary keep those rows, at the cost of bloat there.",
          ),
        ]),
        topic("logical", "Logical replication", [
          concept(
            "pub-sub",
            "Publications and subscriptions",
            "The publisher decodes its WAL into row-level inserts, updates and deletes for the tables in a publication and sends them transaction by transaction. The subscriber is a normal writable database that applies them, so it can run a different major version, hold only some tables and have its own indexes. Schema changes and sequence values are not replicated, so DDL must be applied on both sides and sequences advanced before a switchover, and updates and deletes need a replica identity (normally the primary key) to find the row.",
          ),
        ]),
        topic("sync", "Synchronous and asynchronous", [
          concept(
            "async-vs-sync",
            "Synchronous versus asynchronous replication",
            "Synchronous: commit waits for a replica to confirm, so no data loss on failover but higher latency and reduced availability. Asynchronous: fast, but recent commits can be lost when the primary fails. Postgres replication is asynchronous unless synchronous_standby_names is set; if the only synchronous standby is unreachable, commits wait, so practical setups accept confirmation from any one of several.",
          ),
          concept(
            "confirm-levels",
            "What the replica confirms",
            "With a synchronous standby, synchronous_commit chooses how far the commit waits: remote_write (the standby has handed the WAL to its operating system), on (the standby has flushed it to disk) or remote_apply (the standby has replayed it, so a read there sees the change).",
          ),
        ]),
        topic("lag", "Replication lag", [
          concept(
            "what",
            "Lag and stale reads",
            "The delay before a replica applies the primary's changes. A client can write to the primary then read from a replica and not see its own write. Lag grows under heavy write load, on a slow network, or when replay on the standby is held up by long queries.",
          ),
          concept(
            "measure",
            "Measuring lag",
            "On the primary, pg_stat_replication shows for each standby how far WAL has been sent, written, flushed and replayed (sent_lsn, write_lsn, flush_lsn, replay_lsn) and the matching delays (write_lag, flush_lag, replay_lag). You can express lag both in bytes of WAL and in time.",
          ),
          concept(
            "read-your-writes",
            "Read-your-writes",
            "A user who has just written must see that write on their next read. Options: send that user's reads to the primary for a short time after a write, or remember the LSN of their write and read from a replica only once it has replayed past it. Each costs something: load on the primary, or bookkeeping and waiting.",
          ),
          concept(
            "monotonic",
            "Monotonic reads",
            "Two successive reads served by different replicas can go backwards in time if the second replica is further behind. Routing each user consistently to the same replica prevents it.",
          ),
        ]),
        topic("failover", "Failover", [
          concept(
            "steps",
            "What a failover involves",
            "Decide the primary is dead, pick the replica that has received the most WAL, promote it to accept writes, and repoint clients and the other replicas. The decision rests on timeouts, and a timeout cannot tell a dead primary from a slow or unreachable one.",
          ),
          concept(
            "lost-writes",
            "Writes lost in failover",
            "With asynchronous replication the promoted replica lacks whatever the old primary committed but had not shipped. Those transactions were acknowledged to clients and are missing from the new primary. The old primary's history has diverged, so it must be rewound (pg_rewind) or rebuilt before it can rejoin as a replica.",
          ),
          concept(
            "split-brain",
            "Split brain",
            "If the old primary is cut off rather than dead, it may keep accepting writes while the promoted replica does too. The two histories diverge and cannot be merged automatically. It is the worst outcome of an automatic failover.",
          ),
          concept(
            "fencing",
            "Fencing",
            "Before promoting, make sure the old primary cannot accept writes: power it off, cut its network or storage, or make its right to be primary depend on a lease in a consensus store that it must keep renewing. Patroni holds a leader key with a TTL in etcd, Consul, ZooKeeper or Kubernetes and demotes Postgres when it cannot renew it; an optional watchdog resets the machine if Patroni hangs and fails to demote it in time.",
          ),
        ]),
        topic("slots", "Replication slots", [
          concept(
            "slot",
            "What a slot guarantees",
            "The primary recycles WAL once it no longer needs it, so a replica that disconnects for long enough finds the WAL it needs gone and has to be rebuilt. A replication slot makes the primary remember each consumer's position and keep all WAL from there on, even while the consumer is away.",
          ),
          concept(
            "slot-risk",
            "An abandoned slot fills the disk",
            "A slot whose consumer never returns retains WAL without limit until the primary's disk is full and it stops. Monitor pg_replication_slots for inactive slots and retained WAL, drop slots you no longer use, and cap retention with max_slot_wal_keep_size.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "lag-lab",
            "Replication lag and stale reads",
            "Set up a Postgres streaming replica. Add 500 ms of delay between them with netem. Write a row on the primary and immediately read it from the replica to demonstrate a read-your-writes violation. Watch replay_lag in pg_stat_replication. Fix it at the application level two ways.",
            {
              doneWhen: [
                "A write followed by a stale read, with pg_stat_replication at that moment",
                "A note on the two fixes you implemented and their costs",
              ],
            },
          ),
        ]),
      ],
      {
        detail: "One copy is none: how a database copies itself, what can be lost, and what goes wrong at failover.",
        links: [DDIA],
      },
    ),

    topic(
      "logs",
      "Logs, streams and queues",
      [
        topic(
          "log",
          "The log as a unifying idea",
          [
            concept(
              "what",
              "The log: an append-only, ordered sequence",
              "A log only ever grows at the end, and each record gets the next sequence number. That number gives every reader the same answer to 'what happened before what', which is the property the rest of this topic builds on.",
            ),
            concept(
              "deterministic",
              "Same log, same order, same state",
              "If two processes start from the same state and apply the same records in the same order, they end in the same state. Database replication (ship the WAL) and crash recovery (replay the WAL) both rest on this.",
            ),
            concept(
              "duality",
              "Tables and logs are two views of one thing",
              "A table is the result of applying every change in the log; the log is the history of changes to the table. You can rebuild the table from the log, or derive a log from the changes made to a table.",
            ),
            concept(
              "integration",
              "The log as the integration point",
              "With many data systems (database, cache, search index, warehouse), wiring each to each needs a pipeline per pair. If every source appends its changes to a central log and every consumer reads from it at its own pace, each system needs only one connection.",
            ),
          ],
          { links: [THE_LOG] },
        ),
        topic("delivery", "Queues, logs and delivery", [
          concept(
            "why-queue",
            "Why put a queue between two services",
            "The producer hands over work and returns without waiting for it to be done, so bursts are absorbed and a consumer outage delays work instead of failing requests. The cost is that the caller no longer learns the outcome, and the backlog must be bounded and monitored.",
          ),
          concept(
            "queue-model",
            "The queue model",
            "Each message is delivered to one of several competing consumers and removed once acknowledged. It suits jobs: work to be done once, by any worker. Messages cannot be replayed afterwards, and with several consumers and redelivery the processing order is not guaranteed.",
          ),
          concept(
            "log-model",
            "The log model",
            "Messages are appended to a retained log and reading does not remove them; each consumer tracks its own position. Several independent consumers can read the same data, a new one can start from the beginning, and a consumer can rewind to reprocess.",
          ),
          concept(
            "semantics",
            "At-most-once, at-least-once, exactly-once",
            "At-most-once may lose a message but never repeats it. At-least-once never loses one but may deliver it again. Exactly-once delivery cannot be guaranteed when either side can crash or time out; what systems achieve is an exactly-once effect, by combining at-least-once delivery with idempotent or transactional processing.",
          ),
          concept(
            "duplicates",
            "Why duplicates happen",
            "A consumer that crashes after doing the work but before acknowledging looks, to the broker, the same as one that crashed before doing it, so the message is delivered again. A producer that times out waiting for a send to be confirmed has the same problem and resends.",
          ),
          concept(
            "idempotent",
            "At-least-once requires idempotent consumers",
            "A message may be delivered again after a crash or timeout, so processing it twice must have the same effect as once. To get there, record the message ID in the same transaction as its side effect and skip IDs already recorded, or make the operation naturally idempotent (set, not increment). For an effect outside the database, such as a payment API call, pass an idempotency key so the other system can deduplicate.",
          ),
        ]),
        topic("pg-queue", "A queue in Postgres", [
          concept(
            "why-table",
            "Why a table can be the queue",
            "A job row inserted in the same transaction as the business change exists if and only if that change committed. A separate broker cannot give that guarantee without extra machinery.",
          ),
          concept(
            "claim",
            "Claiming a job with SKIP LOCKED",
            "Each worker selects one ready job with ORDER BY ... LIMIT 1 FOR UPDATE SKIP LOCKED. The row lock makes the claim exclusive and SKIP LOCKED sends each worker to a different row. Without it, every worker would wait on the same first row.",
          ),
          concept(
            "visibility",
            "Visibility timeout",
            "Either the worker holds the row lock for the whole job, so a crash releases it automatically but a transaction stays open throughout, or it marks the row as taken with a deadline and commits. In the second form a job whose deadline passes becomes claimable again, which recovers from crashed workers and also means a slow job can run twice.",
          ),
          concept(
            "retries",
            "Retries, backoff and poison messages",
            "A failed job is rescheduled with an attempt count and a later run time, using exponential backoff with jitter so that a failing dependency is not hammered. A job that fails every time (a poison message) is moved to a dead-letter table after a maximum number of attempts instead of being retried forever.",
          ),
          concept(
            "churn",
            "Queue tables and vacuum",
            "A queue table is all inserts, updates and deletes, so it produces dead rows quickly. If vacuum is held back, for instance by a long transaction, the claim query has to step over a growing pile of dead rows and index entries, and the queue slows down while looking nearly empty.",
          ),
          concept(
            "limits",
            "When to move to a dedicated queue",
            "A Postgres queue is bounded by one primary's write capacity and its vacuum, and has no built-in fan-out to independent consumers or replay. You can state the throughput, retention or fan-out requirement that would make you switch.",
          ),
        ]),
        topic("cdc", "Getting changes out of the database", [
          concept(
            "dual-write",
            "The dual-write problem",
            "Code that commits to the database and then publishes to a broker can crash between the two, leaving one updated and the other not. Reversing the order only changes which side is wrong. Two systems cannot be updated atomically without a shared transaction.",
          ),
          concept(
            "outbox",
            "The transactional outbox",
            "Write the event into an outbox table in the same transaction as the data change. A separate process reads the outbox and publishes each event to the broker, retrying until it succeeds. Delivery is at-least-once, so consumers must still be idempotent.",
          ),
          concept(
            "capture",
            "Change data capture",
            "CDC reads committed changes from the database's own log and publishes them as a stream; with Postgres that means logical decoding through a replication slot. It sees every change in commit order with no application code, and is used to keep caches, search indexes and warehouses in step. The slot must be monitored like any other.",
          ),
        ]),
        topic(
          "kafka",
          "Kafka-style logs",
          [
            concept(
              "partitions",
              "Topics and partitions",
              "A topic is split into partitions, and each partition is an append-only log stored on disk and replicated across brokers. Order is guaranteed within a partition, not across the topic. The producer picks the partition, normally by hashing the record's key, so all records with one key (one customer's events, say) stay in order.",
            ),
            concept(
              "offsets",
              "Offsets",
              "Each record in a partition has a sequential offset, and a consumer's position is just the next offset to read. In a classic consumer group the broker keeps no per-record delivery state, only that position, which keeps it cheap and lets a consumer rewind by choosing an older offset.",
            ),
            concept(
              "groups",
              "Consumer groups",
              "Each partition is assigned to exactly one consumer in a group, so the group shares the work and the partition count caps its parallelism. Different groups read the same topic independently. When a consumer joins or dies, partitions are reassigned (a rebalance).",
            ),
            concept(
              "share-groups",
              "Share groups: queue semantics on Kafka",
              "A share group (production-ready since Kafka 4.2) lets several consumers read the same partition. The broker hands each record to one consumer under a time-limited lock, tracks per-record acknowledgement and delivery counts, and redelivers records whose lock expires, so a group can have more consumers than partitions. The price is that records are no longer processed in partition order.",
            ),
            concept(
              "commit",
              "Committed offsets and delivery semantics",
              "The committed offset is the position in each partition up to which the group has processed, and it is where a restarted consumer resumes. Committing it after processing gives at-least-once; before processing gives at-most-once.",
            ),
            concept(
              "retention",
              "Retention and log compaction",
              "Records are kept for a configured time or size whether or not anyone has read them. A compacted topic instead keeps at least the latest record for each key, with a null value acting as a tombstone, so the topic can serve as a durable snapshot of current state.",
            ),
            concept(
              "acks",
              "Replicas and acknowledgements",
              "Each partition has a leader and followers; the replicas that are caught up form the in-sync replica set. With acks=all a write is confirmed only once every in-sync replica has it, and min.insync.replicas sets the smallest in-sync set for which such a write is accepted at all. With acks=1 a write confirmed by the leader alone can be lost if the leader fails. Since Kafka 3.0 the producer defaults to acks=all.",
            ),
            concept(
              "exactly-once",
              "Idempotent producers and transactions",
              "With idempotence (on by default since Kafka 3.0) the broker uses a producer ID and per-partition sequence numbers to drop duplicates caused by producer retries. Transactions let a producer write to several partitions and commit its consumer offsets atomically, and consumers with isolation.level=read_committed see only committed data. Together they give exactly-once for read-process-write inside Kafka, not for side effects outside it.",
            ),
            concept(
              "lag",
              "Consumer lag",
              "Lag is the distance between the newest offset in a partition and the group's committed offset. It is the main health signal for a consumer: steady lag is fine, growing lag means the consumers cannot keep up.",
            ),
          ],
          { links: [KAFKA_DESIGN] },
        ),
        topic(
          "redis-streams",
          "Redis Streams",
          [
            concept(
              "model",
              "Streams and consumer groups",
              "XADD appends an entry to a stream and returns its ID. XREADGROUP hands each new entry to one consumer in a group and records it in that group's pending entries list until the consumer confirms it with XACK. Unlike a classic Kafka consumer group, acknowledgement is per entry, not a single offset.",
            ),
            concept(
              "pending",
              "XPENDING and reclaiming entries",
              "XPENDING lists entries delivered but not acknowledged, with the consumer that holds each, how long it has been idle and how many times it was delivered. An unacknowledged entry stays assigned to its consumer: that consumer re-reads its own pending entries after a restart, or another consumer takes over entries idle longer than a minimum idle time with XCLAIM or XAUTOCLAIM.",
            ),
            concept(
              "safety",
              "How durable a Redis stream is",
              "A stream lives in memory and is persisted and replicated like any other Redis key, consumer group state included. Without AOF and a strict fsync policy a restart can lose acknowledged entries, and replication is asynchronous, so a failover can lose them too; WAIT makes that unlikely but not impossible.",
            ),
          ],
          { links: [REDIS_STREAMS] },
        ),
        topic("build", "Build it", [
          build(
            "queue-design",
            "Design doc: a job queue on Postgres",
            "One page: requirements, schema, how workers claim jobs, retries with backoff, visibility timeout, poison messages, and at what scale you would move to a dedicated queue. Use your SKIP LOCKED queue from Transactions as evidence.",
            { doneWhen: ["A one-page design doc"] },
          ),
          build(
            "streams-lab",
            "At-least-once delivery, observed",
            "With Redis Streams consumer groups: crash a consumer after processing but before acknowledging, find the entry in XPENDING, and watch it get redelivered when the consumer re-reads its pending entries or another consumer claims it. Count the duplicate side effects, then make the consumer idempotent with a processed-IDs table written in the same transaction as the effect.",
            {
              doneWhen: [
                "XPENDING output and the duplicate before the fix",
                "The same crash with no duplicate effect after the fix",
              ],
              links: [REDIS_STREAMS],
            },
          ),
        ]),
      ],
      { detail: "The log as the idea underneath replication, queues and streams, and what delivery guarantees really mean." },
    ),
  ],
);
