import { build, concept, link, section, topic } from "../dsl";

const LIBUV_DESIGN = link("libuv design overview", "https://docs.libuv.org/en/v1.x/design.html");
const NODE_LOOP = link(
  "The Node.js event loop",
  "https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick",
);
const NODE_DONT_BLOCK = link(
  "Don't block the event loop",
  "https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop",
);
const LOOP_DELAY = link(
  "perf_hooks.monitorEventLoopDelay",
  "https://nodejs.org/api/perf_hooks.html#perf_hooksmonitoreventloopdelayoptions",
);
const ASYNCIO_DEV = link("Developing with asyncio", "https://docs.python.org/3/library/asyncio-dev.html");
const GO_SCHEDULING = link(
  "Scheduling in Go, part 1",
  "https://www.ardanlabs.com/blog/2018/08/scheduling-in-go-part1.html",
);
const GO_GC_GUIDE = link("A Guide to the Go Garbage Collector", "https://go.dev/doc/gc-guide");
const V8_TRASH_TALK = link("Trash talk: the Orinoco garbage collector", "https://v8.dev/blog/trash-talk");
const FREE_THREADING = link(
  "Python free-threading HOWTO",
  "https://docs.python.org/3/howto/free-threading-python.html",
);
const PEP_779 = link("PEP 779", "https://peps.python.org/pep-0779/");
const PY_SPY = link("py-spy", "https://github.com/benfred/py-spy");
const FLAME_GRAPHS = link("Flame Graphs", "https://www.brendangregg.com/flamegraphs.html");
const GO_PPROF = link("Profiling Go programs", "https://go.dev/blog/pprof");
const TRACEMALLOC = link("tracemalloc", "https://docs.python.org/3/library/tracemalloc.html");

export default section(
  "runtimes",
  {
    title: "Language runtimes",
    summary:
      "Node, Python and Go each put a runtime between your code and the kernel. What the event loop, the scheduler, the garbage collector and the GIL actually do in the languages you already ship, and how to profile them when they misbehave.",
  },
  [
    topic(
      "model",
      "What a runtime is",
      [
        topic("why", "Why runtimes exist", [
          concept(
            "between",
            "What sits between your code and the kernel",
            "The kernel offers only raw primitives: threads, virtual memory and system calls on file descriptors. A language runtime is code that ships inside your process and turns those into what the language promises: functions that seem to run at the same time, memory you never free, and I/O calls that are easy to write. It is ordinary user-space code with no special privileges, so everything it does ends in the same system calls you could make yourself. A compiled Go binary has a runtime linked into it just as an interpreted Python program does.",
          ),
          concept(
            "three-jobs",
            "The three jobs: scheduling, memory, I/O",
            "A scheduler decides which piece of your code runs next and on which OS thread. A memory manager hands out memory and reclaims what is no longer used. An I/O layer waits on many file descriptors at once and wakes the right code when one is ready. Most production surprises in Node, Python and Go trace back to one of these three.",
          ),
          concept(
            "execution",
            "How each runtime executes your code",
            "Go is compiled ahead of time to machine code. CPython compiles source to bytecode and runs it in an interpreter loop, one bytecode instruction at a time. V8 starts by interpreting bytecode (Ignition) and compiles hot functions to optimised machine code (TurboFan and other tiers) based on the types it has seen, falling back ('deoptimising') when those assumptions break. This is why stack traces and profiles look different in each.",
          ),
        ]),
        topic("concurrency", "Concurrency and parallelism", [
          concept(
            "conc-vs-par",
            "Concurrency versus parallelism",
            "Concurrency is structuring a program as several tasks that are in progress over the same period and can interleave. Parallelism is executing more than one of them at the same instant, which needs more than one core. A single-threaded event loop is concurrent without being parallel.",
          ),
          concept(
            "io-vs-cpu",
            "I/O-bound and CPU-bound work",
            "An I/O-bound task spends most of its time waiting for a socket, a disk or another service and needs almost no CPU while it waits. A CPU-bound task computes the whole time. Concurrency alone speeds up I/O-bound work because the waits overlap; CPU-bound work only gets faster with parallelism.",
          ),
          concept(
            "thread-cost",
            "What an OS thread costs",
            "Each thread has its own stack (megabytes of reserved address space by default on Linux) and kernel bookkeeping, and switching between threads means entering the kernel, saving and restoring registers and losing warm CPU caches. A few thousand threads are fine; one thread per connection at hundreds of thousands of connections is not. That pressure is why event loops and green threads exist.",
          ),
          concept(
            "coop-vs-preempt",
            "Cooperative and preemptive scheduling",
            "A preemptive scheduler can interrupt a task at any point, as the kernel does to threads with a timer. A cooperative scheduler only switches when the running task yields, so one task that never yields stalls all the others. Event loops are cooperative; that single fact explains 'blocking the loop'.",
          ),
        ]),
        topic("models", "The three concurrency models", [
          concept(
            "os-threads",
            "Model 1: one OS thread per task",
            "Each request gets a thread and makes plain blocking calls; the kernel schedules the threads across cores. Code reads top to bottom and CPU work runs in parallel, but memory and context-switch cost grow with the number of threads, and shared data needs locks.",
          ),
          concept(
            "event-loop",
            "Model 2: a single-threaded event loop",
            "One thread sets every socket non-blocking, asks the kernel which ones are ready (epoll on Linux) and runs a callback for each. Tens of thousands of idle connections cost almost nothing, and two callbacks never run at the same instant. The price: any callback that computes or blocks for long delays every other connection, and one loop uses one core.",
          ),
          concept(
            "green-threads",
            "Model 3: M:N green threads",
            "The runtime multiplexes many cheap user-space threads onto a small number of OS threads. Code is written in blocking style; when a green thread would block, the runtime parks it and runs another on the same OS thread. You get cheap concurrency and parallelism together, at the cost of a complex scheduler inside the runtime and the return of shared-memory races.",
          ),
          concept(
            "colouring",
            "Async/await and function colouring",
            "In event-loop languages a function that waits must be marked async and can only be awaited from another async function, so code splits into two kinds that do not mix freely, and calling a blocking function from async code stalls the loop. Go avoids the split: any function may block, because the runtime does the yielding.",
          ),
          concept(
            "where",
            "Where Node, Python and Go sit",
            "Node runs JavaScript on one event-loop thread, with a small thread pool behind it for work the kernel cannot do without blocking. Python offers OS threads (limited by the GIL in the default build) and, separately, the asyncio event loop. Go schedules goroutines M:N across all cores. You can pick the model for a workload and name what each is bad at.",
          ),
        ]),
        topic("observe", "Seeing a runtime from outside", [
          concept(
            "threads",
            "Counting a process's threads",
            "On Linux `ps -L -p <pid>`, `top -H` or the Threads line in /proc/<pid>/status show the OS threads of a process. A 'single-threaded' Node process still has several: the main thread, V8 helper threads and, once something has used it, the libuv pool. A Go process has more threads than GOMAXPROCS when some are blocked in system calls.",
          ),
          concept(
            "strace",
            "Watching the runtime's system calls",
            "`strace -f -p <pid>` on an idle Node or asyncio server shows the main thread parked in an epoll wait call: that call is the event loop waiting. The same trace on a Go server shows epoll and futex calls from the scheduler's threads. Every interaction a runtime has with the kernel is visible this way; its user-space scheduling is not.",
          ),
        ]),
      ],
      { detail: "What a runtime adds on top of the kernel, and the three ways to run many things at once." },
    ),

    topic(
      "node",
      "Event loops: Node and libuv",
      [
        topic(
          "loop",
          "The loop",
          [
            concept(
              "single-thread",
              "One thread runs all your JavaScript",
              "Every callback, promise continuation and request handler in a Node process runs on the same thread, one at a time, and each runs to completion before the next starts. Nothing interrupts a running function, so two callbacks never touch a variable at the same instant, and nothing else runs until the current one returns.",
            ),
            concept(
              "epoll-loop",
              "The loop is epoll in a while loop",
              "libuv, the C library under Node, registers every socket with the kernel's event notification API (epoll on Linux, kqueue on macOS and the BSDs, IOCP on Windows), then repeats: wait for events, run the callbacks for whatever became ready. It is the same structure as a hand-written epoll server, with timers and a thread pool added.",
            ),
            concept("phases", "The phases of one iteration", undefined, {
              parts: [
                concept(
                  "order",
                  "The order of the phases",
                  "Pending callbacks, idle and prepare (internal), poll, check, close callbacks, timers. Since libuv 1.45 (Node 20) timers run after the poll phase in each iteration, plus once before the loop starts; older versions ran them first, which is the order many diagrams still show. Each phase has its own queue of callbacks and runs them until the queue is empty or a limit is reached, then the loop moves on.",
                ),
                concept(
                  "timers",
                  "Timers phase",
                  "Runs the callbacks of setTimeout and setInterval timers whose time has passed. The poll phase decides when that is: it never blocks past the nearest timer's due time.",
                ),
                concept(
                  "poll",
                  "Poll phase",
                  "Where the loop spends its idle time and where most of your code is called from. It runs the I/O callbacks that are ready (incoming data, new connections) and, when there are none, blocks in the kernel until a socket becomes ready or the nearest timer is due. It does not block if setImmediate callbacks are waiting.",
                ),
                concept(
                  "check",
                  "Check phase",
                  "Runs setImmediate callbacks, straight after the poll phase. It is the place to schedule work that should run after the I/O events of the current iteration.",
                ),
                concept(
                  "pending-close",
                  "Pending and close callbacks",
                  "The pending callbacks phase runs a few system-level callbacks deferred from the previous iteration, such as some TCP errors. The close callbacks phase, after the check phase, runs 'close' events, for example for a socket that was destroyed abruptly.",
                ),
              ],
            }),
            concept(
              "alive",
              "Why a Node process stays up or exits",
              "After each iteration the loop checks whether anything is still pending: open sockets and servers, active timers, thread-pool work in flight. If nothing is, the process exits. A forgotten setInterval or an open connection keeps it alive; calling unref() on a timer or socket tells the loop not to wait for it.",
            ),
          ],
          { links: [NODE_LOOP, LIBUV_DESIGN] },
        ),
        topic(
          "queues",
          "Timers, microtasks and ordering",
          [
            concept(
              "timer-delay",
              "A timer delay is a minimum, not a promise",
              "setTimeout(fn, 100) means 'not before 100 ms'. The callback runs when the loop next reaches the timers phase after the time has passed, so a busy loop makes every timer late. That lateness is what event-loop delay measures.",
            ),
            concept(
              "microtasks",
              "process.nextTick and promise microtasks",
              "These two queues are not loop phases. They are drained completely right after the current callback finishes, before the loop moves on: the nextTick queue first, then promise callbacks (and queueMicrotask), repeating until both are empty. So they always run before any timer, I/O or setImmediate callback that is waiting. One exception: an ES module's top-level code already runs inside the microtask queue, so there promise callbacks run before nextTick callbacks.",
            ),
            concept(
              "immediate",
              "nextTick, setImmediate and setTimeout(0) compared",
              "nextTick and promise microtasks run right after the current operation, before the loop continues. setImmediate runs in the check phase, after I/O polling. setTimeout(fn, 0) is treated as a 1 ms timer and runs in a later timers phase. Inside an I/O callback setImmediate always fires before a 0 ms timer; from the main module their order can vary. The names mislead: nextTick is the more immediate of the two.",
            ),
            concept(
              "await",
              "What await does to the loop",
              "An async function runs synchronously until its first await, then returns a promise. The rest of the function is queued as a microtask once the awaited promise settles. await never blocks the thread; it ends the current run of the function so that other callbacks can go.",
            ),
            concept(
              "starvation",
              "Starving the loop with microtasks",
              "The microtask queues are drained until empty, so a callback that keeps scheduling more nextTick or promise callbacks (including a long loop that only awaits already-resolved promises) never lets the loop reach the poll phase, and I/O stops. To give I/O a turn, yield with setImmediate, not with a microtask.",
            ),
          ],
          { links: [NODE_LOOP] },
        ),
        topic(
          "pool",
          "The libuv thread pool",
          [
            concept(
              "why-pool",
              "Why a thread pool exists at all",
              "Readiness notification only works for descriptors that can be 'not ready', such as sockets and pipes. On Linux a regular file cannot be registered with epoll, yet reading it can still block on the disk, and some library calls such as getaddrinfo have only a blocking form. libuv runs these on a small pool of worker threads and delivers the result back to the loop as a normal callback.",
            ),
            concept(
              "users",
              "What runs on the pool and what does not",
              "File system calls, dns.lookup (getaddrinfo), and CPU-heavy crypto and zlib. Network sockets use epoll directly and never touch the pool, and dns.resolve makes its own non-blocking network queries. Host names passed to http or net are resolved with dns.lookup by default, so a server that makes outbound requests depends on the pool even if it never reads a file.",
            ),
            concept(
              "size",
              "Pool size and queueing",
              "Four threads by default. Further pool work queues behind them, so slow file or DNS calls can delay unrelated ones: four slow dns.lookup calls hold up every file read in the process. The UV_THREADPOOL_SIZE environment variable, set before the process starts, changes the size; the pool is shared by the whole process.",
            ),
          ],
          { links: [LIBUV_DESIGN] },
        ),
        topic(
          "blocking",
          "Blocking the loop",
          [
            concept(
              "meaning",
              "What 'blocking the loop' means",
              "JavaScript runs on a single thread. Until the current function returns, the loop cannot run any other callback, so all other requests wait. A handler that computes for 200 ms adds up to 200 ms to every request that arrives meanwhile, and health checks and timers stall with them.",
            ),
            concept(
              "culprits",
              "The usual culprits",
              "Synchronous APIs (fs.readFileSync, crypto.pbkdf2Sync, child_process.execSync), JSON.parse or JSON.stringify on large payloads, regular expressions with catastrophic backtracking on hostile input, and loops over large arrays. The rule: the work done in one callback should be small and bounded whatever the size of the input.",
            ),
            concept(
              "loop-delay",
              "Detecting it: event-loop delay and utilisation",
              "perf_hooks.monitorEventLoopDelay samples how late a recurring timer fires and records the lateness in a histogram (in nanoseconds); export it and alert on its high percentiles. performance.eventLoopUtilization reports the share of time the loop spent running callbacks instead of idle in poll. High delay with one core pinned means JavaScript on the main thread is the bottleneck.",
              { links: [LOOP_DELAY] },
            ),
            concept(
              "partition",
              "Fix 1: partition the work",
              "Split a long computation into chunks and schedule each next chunk with setImmediate, so pending I/O callbacks run between chunks. Total CPU time is unchanged and still on the main thread, but no single callback holds the loop for long.",
            ),
            concept(
              "async-api",
              "Fix 2: use the asynchronous API",
              "Many blocking calls have an async twin that runs on the libuv pool: crypto.pbkdf2 instead of pbkdf2Sync, fs.promises.readFile instead of readFileSync. The work leaves the main thread, but it now competes for the pool's four threads.",
            ),
            concept(
              "workers",
              "Fix 3: worker threads",
              "A worker_threads Worker runs JavaScript on another OS thread with its own V8 instance, heap and event loop, so CPU-bound work runs in parallel with the main loop. Workers share no objects: messages are copied with the structured clone algorithm, an ArrayBuffer can be transferred without copying, and SharedArrayBuffer is the only shared memory. Each worker costs memory and start-up time, so keep a pool instead of starting one per request.",
            ),
            concept(
              "cluster",
              "Using every core: one process per core",
              "An event loop uses one core for JavaScript. To use the rest, run several Node processes behind a load balancer or with the cluster module, where the processes share one listening port. This multiplies throughput; it does not stop a blocking handler from stalling the other requests in its own process.",
            ),
          ],
          { links: [NODE_DONT_BLOCK] },
        ),
        topic("streams", "Streams and backpressure", [
          concept(
            "why-streams",
            "Why streams exist",
            "Reading a 2 GB file or request body into one buffer needs 2 GB of memory. A stream delivers it in chunks, so memory stays bounded if, and only if, the producer is slowed to the pace of the consumer. That slowing is backpressure.",
          ),
          concept(
            "drain",
            "highWaterMark, write() returning false, and 'drain'",
            "A writable stream buffers chunks it cannot flush yet. When the buffer passes highWaterMark, write() returns false: the signal to stop writing until the 'drain' event. write() still accepts the data, so ignoring the return value makes the buffer grow without limit, which shows up as rising memory when a client reads slowly.",
          ),
          concept(
            "pipeline",
            "pipe and pipeline do it for you",
            "readable.pipe(writable) pauses the source when the destination's write() returns false and resumes it on 'drain'. stream.pipeline does the same and also forwards errors and destroys every stream in the chain when one fails, which plain pipe does not.",
          ),
          concept(
            "to-kernel",
            "How backpressure reaches the other machine",
            "When Node stops reading from a paused socket, the kernel's receive buffer fills, the TCP receive window closes and the remote sender is made to wait. Stream backpressure in your process and TCP flow control in the kernel are two halves of one mechanism.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "block-loop",
            "Block the Node event loop and measure it",
            "Build an HTTP server with one fast route and one route that runs a large JSON.parse or synchronous pbkdf2. Hit the fast route at a steady rate while calling the slow one. Measure with perf_hooks.monitorEventLoopDelay and capture a CPU profile.",
            {
              doneWhen: [
                "Event-loop delay histogram and fast-route p99 before and during the slow call",
                "The CPU profile or flame graph showing the blocking frame",
              ],
              links: [LOOP_DELAY],
            },
          ),
          build(
            "unblock",
            "Fix it three ways",
            "Fix the blocked route by (1) moving the work to a worker_threads pool, (2) partitioning it with setImmediate, and (3) using the async crypto API that runs on the libuv thread pool. Then saturate the thread pool with more slow concurrent calls (async pbkdf2, fs or dns.lookup) than its 4 threads and observe the queueing.",
            {
              doneWhen: [
                "Fast-route p99 for each of the three fixes",
                "A note on what happened when the libuv thread pool was saturated, and what UV_THREADPOOL_SIZE changed",
              ],
            },
          ),
          build(
            "writeup",
            "Write-up: an event loop is just epoll in a while loop",
            "Connect this section to the one on processes: explain Node's event loop using your own epoll echo server from that section, and show a measured example of what blocking the loop costs.",
            { doneWhen: ["Link to the published write-up"] },
          ),
        ]),
      ],
      {
        detail: "One thread, many connections, and what happens when you block it.",
        links: [LIBUV_DESIGN, NODE_LOOP],
      },
    ),

    topic(
      "python",
      "Python: asyncio and the GIL",
      [
        topic("coroutines", "Coroutines, tasks and the event loop", [
          concept(
            "coroutine-obj",
            "A coroutine is a function that can pause",
            "Calling an `async def` function runs none of its body; it returns a coroutine object. The body runs only when the object is awaited or wrapped in a task, and it can suspend at an await and later resume with its local variables intact. Forgetting the await gives a 'coroutine was never awaited' warning and code that silently did nothing.",
          ),
          concept(
            "loop",
            "The asyncio event loop",
            "One thread runs a loop that keeps a queue of ready callbacks and a list of timers, and waits on sockets through the selectors module (epoll on Linux). Each iteration it waits for I/O or the next timer, then runs the callbacks that are ready. It is the same design as Node's loop; asyncio.run creates one, runs a coroutine to completion and closes it.",
          ),
          concept(
            "future-task",
            "Futures and tasks",
            "A Future is a placeholder for a result that does not exist yet. A Task is a Future that drives one coroutine: it runs the coroutine until it awaits something unfinished, registers itself to be woken when that completes, and returns control to the loop. asyncio.create_task schedules a coroutine to run concurrently with the code that created it.",
          ),
          concept(
            "yield-point",
            "await is the only place a task can be switched out",
            "The loop cannot interrupt a running task; control returns to it only when the task reaches an await that actually has to wait. Code between two awaits therefore runs without interference from other tasks, and code with no await in it (a long loop, a blocking call) holds the loop for its whole duration. An await on something that finishes without waiting gives no other task a turn; `await asyncio.sleep(0)` does.",
          ),
          concept(
            "sequential",
            "Awaiting in sequence versus running concurrently",
            "`await a()` followed by `await b()` starts b only after a has finished: async syntax alone adds no concurrency. To overlap them, start tasks with asyncio.create_task, asyncio.gather or a TaskGroup and then await the results.",
          ),
          concept(
            "lost-tasks",
            "Lost tasks and lost exceptions",
            "The loop keeps only a weak reference to a task, so a task you created and did not store can be garbage collected before it finishes. An exception in a task nobody awaits is reported only when the task object is destroyed ('Task exception was never retrieved'). Keep a reference to every task and await it.",
          ),
          concept(
            "cancel",
            "Cancellation and timeouts",
            "task.cancel() makes the task's current await raise CancelledError, so cleanup runs through try/finally and the task ends at a yield point, not at an arbitrary instruction. asyncio.timeout and asyncio.wait_for are built on this: when the time is up they cancel the inner work. Code that catches CancelledError and does not re-raise it breaks both.",
          ),
          concept(
            "taskgroup",
            "Structured concurrency with TaskGroup",
            "`async with asyncio.TaskGroup()` (Python 3.11 and later) waits for every task started inside the block. If one fails, the rest are cancelled and the errors are raised together as an ExceptionGroup, so no task outlives the block that created it. Plain asyncio.gather leaves the other tasks running when one fails.",
          ),
          concept(
            "bound",
            "Bounding concurrency and backpressure",
            "Starting one task per item with no limit moves an overload from the caller into your process or onto the service you call. An asyncio.Semaphore caps how many run at once, and a Queue with a maxsize makes producers wait when consumers fall behind. On streams, `await writer.drain()` plays the role of Node's 'drain' event.",
          ),
        ]),
        topic(
          "blocking",
          "Blocking calls in async code",
          [
            concept(
              "effect",
              "What a blocking call does inside a coroutine",
              "It blocks the whole event loop thread, so every other coroutine stalls. time.sleep, requests.get, a synchronous database driver or a long pure-Python computation inside an `async def` all do this. Use `await asyncio.sleep`, an async client, or asyncio.to_thread.",
            ),
            concept(
              "debug-mode",
              "Finding them with asyncio debug mode",
              "Enable it with PYTHONASYNCIODEBUG=1, `python -X dev` or asyncio.run(debug=True). The loop then logs any callback or task step that runs longer than loop.slow_callback_duration (100 ms by default) and names the code responsible. It also records where each coroutine was created, so a 'never awaited' warning points at the line that forgot the await.",
            ),
            concept(
              "to-thread",
              "asyncio.to_thread and run_in_executor",
              "`await asyncio.to_thread(fn, *args)` runs a blocking function on a worker thread and suspends the coroutine until it returns; it is a shortcut for loop.run_in_executor with the default thread pool. It suits blocking I/O, which releases the GIL while it waits. The pool has a bounded number of threads, so many slow calls queue behind each other, like libuv's pool.",
            ),
            concept(
              "cpu-bound",
              "CPU-bound work needs a process, not a thread",
              "On the default (GIL) build, a pure-Python computation moved to a thread still needs the GIL, so it still competes with the loop thread. Pass a concurrent.futures.ProcessPoolExecutor to loop.run_in_executor instead; the arguments and the result are pickled and sent between processes.",
            ),
          ],
          { links: [ASYNCIO_DEV] },
        ),
        topic("gil", "Threads and the GIL", [
          concept(
            "what",
            "What the GIL is and what it protects",
            "threading.Thread starts a real OS thread, scheduled by the kernel like any other. The global interpreter lock is a mutex in the interpreter, and only the thread holding it executes Python bytecode. It protects the interpreter's own state, above all the reference count in every object, which is updated constantly and not atomically. One big lock kept CPython and its C extensions simple, and single-threaded code fast.",
          ),
          concept(
            "io-vs-cpu",
            "What it means for I/O-bound and CPU-bound threads",
            "It lets only one thread execute Python bytecode at a time, so CPU-bound threads do not run in parallel. It is released around blocking I/O, so I/O-bound threads still overlap. C extensions can release it during long operations too, as NumPy does for many array operations, which is why some numeric code does scale across threads.",
          ),
          concept(
            "switch",
            "The switch interval and GIL contention",
            "A thread running Python code is asked to give up the GIL after a switch interval (5 ms by default, see sys.getswitchinterval) so that other threads get a turn. CPU-bound threads therefore take turns instead of running in parallel, and the total time on several threads is no better than on one, often slightly worse.",
          ),
          concept(
            "not-safe",
            "The GIL does not make your code thread-safe",
            "A thread can lose the GIL between bytecode instructions. `counter += 1` is a load, an add and a store, so two threads can both read the old value and one update is lost. Shared mutable state still needs a lock or a queue.",
          ),
          concept(
            "multiprocessing",
            "multiprocessing: parallelism with processes",
            "Each process has its own interpreter and its own GIL, so CPU-bound Python code runs in parallel across cores. The costs: arguments and results are pickled and copied between processes, each worker has its own memory, and a process starts more slowly than a thread. It pays off when the work per call is large compared with the data shipped.",
          ),
          concept(
            "free-threaded",
            "Free-threaded CPython",
            "A separate build of CPython without the GIL (PEP 703, experimental from 3.13), so threads run Python code in parallel. Since 3.14 it is officially supported but still optional (PEP 779): the binary carries a t suffix, such as python3.14t, and the default build still has the GIL. Single-threaded code runs somewhat slower on it, and importing a C extension that has not declared support turns the GIL back on with a warning. `sys._is_gil_enabled()` tells you which mode a process is in.",
            { links: [FREE_THREADING, PEP_779] },
          ),
        ]),
        topic("build", "Build it", [
          build(
            "asyncio-blocking",
            "Find blocking calls inside asyncio",
            "Write an asyncio service that calls time.sleep and a synchronous HTTP client inside coroutines. Run with PYTHONASYNCIODEBUG=1 and read the slow-callback warnings. Fix with asyncio.to_thread and a real async client, and show throughput before and after.",
            {
              doneWhen: [
                "The slow-callback warnings from debug mode",
                "Requests per second before and after the fix",
              ],
              links: [ASYNCIO_DEV],
            },
          ),
          build(
            "gil-bench",
            "Measure the GIL",
            "Run a CPU-bound function on 1, 2, 4 and 8 threads on standard CPython (3.14 or later) and on the free-threaded build of the same version (python3.14t, for example). Repeat with an I/O-bound function. Profile one run with py-spy and find the GIL contention.",
            {
              doneWhen: [
                "A table of wall time by thread count for both builds, CPU-bound and I/O-bound",
                "A note on why threads helped I/O on both builds but CPU-bound work only on the free-threaded build",
              ],
              links: [PY_SPY],
            },
          ),
        ]),
      ],
      { detail: "Coroutines on one thread, and the lock that stops threads running Python code in parallel." },
    ),

    topic(
      "go",
      "The Go scheduler",
      [
        topic("goroutines", "Goroutines", [
          concept(
            "vs-threads",
            "Goroutines versus OS threads",
            "A goroutine is a function running on a stack that the Go runtime manages, scheduled by the runtime in user space. Creating one costs a few kilobytes and switching between two does not enter the kernel, so a server can hold hundreds of thousands. An OS thread is the kernel's unit of execution; goroutines are multiplexed onto a small number of them.",
          ),
          concept(
            "stacks",
            "Growable stacks",
            "A goroutine starts with a small stack. Function entry checks whether there is room for the next frame; when there is not, the runtime allocates a larger stack, copies the old one into it and fixes up the pointers. This is why an idle goroutine is cheap and why deep recursion works without choosing a thread stack size.",
          ),
          concept(
            "states",
            "Runnable, running, waiting",
            "A goroutine is running on a thread, runnable (in a queue waiting for one) or waiting on something: a channel, a lock, a timer, the network. Time spent runnable but not running is scheduling latency, and it grows when there are more runnable goroutines than Ps to run them.",
          ),
        ]),
        topic("gmp", "G, M and P", [
          concept(
            "g-m-p",
            "The three structures",
            "G is a goroutine, M is an OS thread, P is a scheduling context holding a run queue. An M must hold a P to run Go code; GOMAXPROCS sets the number of Ps. So at most GOMAXPROCS goroutines execute Go code at the same instant, however many threads exist.",
          ),
          concept(
            "why-p",
            "Why P exists",
            "With a single global queue every thread would contend for one lock. Giving each P its own run queue (and its own allocation cache) lets a thread schedule and allocate without contention, and makes the scheduling state something that can be handed from a blocked thread to a free one.",
          ),
          concept(
            "run-queues",
            "Local run queues and the global queue",
            "A goroutine started by running code goes on the current P's local queue (into its 'runnext' slot, so it tends to run next), and that P can run it without taking a global lock. There is also one global queue, for overflow and for goroutines that have no P to return to; every P checks it now and then so that nothing in it starves.",
          ),
          concept(
            "stealing",
            "Work stealing",
            "A P whose local queue is empty looks in the global queue and the network poller, then picks another P and takes half of its queue. Work spreads across cores without a central dispatcher, and no P sits idle while another has a backlog.",
          ),
        ]),
        topic("blocking", "When a goroutine blocks", [
          concept(
            "park",
            "Waiting on a channel or lock parks only the goroutine",
            "When a goroutine has to wait on a channel, mutex or timer, the runtime marks it waiting and the same thread immediately picks another runnable goroutine. No OS thread is blocked on its behalf, which is why goroutines waiting on channels are cheap in a way that threads waiting on locks are not.",
          ),
          concept(
            "syscall",
            "Blocking system calls and P handoff",
            "A system call that blocks in the kernel blocks its thread, and the goroutine with it. If the call does not return quickly, the runtime detaches the P from that thread and hands it to another thread (starting one if needed) so the remaining goroutines keep running. When the call returns, the goroutine needs a P again: it takes a free one or goes onto a run queue. Calls into C through cgo are handled the same way.",
          ),
          concept(
            "netpoller",
            "The netpoller: blocking-style network code on epoll",
            "Network sockets are non-blocking underneath. When a read would block, the runtime parks the goroutine and registers the socket with the netpoller (epoll on Linux). The OS thread is freed to run other goroutines until the socket is ready, and then the goroutine is made runnable again. You write `conn.Read` as if it blocked; the runtime runs the event loop for you.",
          ),
          concept(
            "thread-growth",
            "Why a Go process can have many threads",
            "GOMAXPROCS limits threads running Go code, not threads in total. Every goroutine blocked in a system call the netpoller cannot cover, such as reading a regular file, or in a cgo call, holds a thread. A burst of slow disk or cgo calls can therefore create hundreds of threads; the program crashes if it needs more than 10,000, a default that debug.SetMaxThreads changes.",
          ),
        ]),
        topic("preemption", "Preemption", [
          concept(
            "async-preempt",
            "From cooperative to asynchronous preemption",
            "Go once switched goroutines only at function calls, so a tight loop with no calls could hold its P and even delay garbage collection. Since Go 1.14 the runtime preempts asynchronously on most platforms: a goroutine that has run for about 10 ms has a signal (SIGURG, on Unix systems) sent to its thread and is stopped at the next safe point. A CPU-bound goroutine can no longer starve the others.",
          ),
          concept(
            "sysmon",
            "sysmon, the background monitor",
            "One runtime thread runs without a P and wakes periodically. It requests preemption of goroutines that have run too long and takes Ps away from threads stuck in system calls. It is how the scheduler notices problems that the stuck code cannot report itself.",
          ),
        ]),
        topic("gomaxprocs", "GOMAXPROCS and CPU limits", [
          concept(
            "default",
            "What GOMAXPROCS controls",
            "GOMAXPROCS is the number of Ps, and so the number of threads executing Go code at once. Unless set by hand, it defaults to the number of logical CPUs the process may use (its CPU affinity mask included), and since Go 1.25 also takes a Linux cgroup CPU limit into account. It does not limit goroutines or the total number of threads.",
          ),
          concept(
            "quota",
            "A container CPU limit is a quota, not a core count",
            "On Linux a cgroup CPU limit of 2 means, with the usual 100 ms period, 200 ms of CPU time per period summed over all threads; it does not hide the host's other cores. A process running 64 threads flat out spends that quota in a few milliseconds and is then paused until the next period. This is CFS bandwidth throttling, and it shows up as tail latency. Kubernetes CPU limits become this quota; CPU requests do not.",
          ),
          concept(
            "container",
            "GOMAXPROCS in containers",
            "Before Go 1.25 the default ignored the cgroup limit, so a container limited to 2 CPUs on a 64-core host ran 64 Ps and was throttled, garbage collector workers included. The fixes were setting GOMAXPROCS by hand or a library such as uber-go/automaxprocs. Since Go 1.25, when the main module's go.mod says go 1.25 or later and GOMAXPROCS is not set by hand, the default on Linux is the cgroup CPU limit rounded up (if lower than the CPU count), and the runtime updates it periodically if the limit changes.",
          ),
        ]),
        topic("pitfalls", "Using goroutines well", [
          concept(
            "races",
            "Goroutines share memory, so data races are back",
            "Goroutines run in parallel on several threads and can be preempted anywhere, so two of them writing one variable without synchronisation is a data race with undefined results. Protect shared state with a mutex or pass ownership over a channel, and run tests with `go test -race`, which reports the races that actually occur during the run.",
          ),
          concept(
            "bounded",
            "Cheap is not free: bound your goroutines",
            "Starting a goroutine per incoming item with no limit turns a burst of work into unbounded memory and an overloaded downstream. Cap concurrency with a worker pool or a buffered channel used as a semaphore, and give every goroutine a way to stop, usually a context that gets cancelled.",
          ),
        ]),
        topic("observe", "Seeing the scheduler", [
          concept(
            "schedtrace",
            "GODEBUG=schedtrace",
            "Running a program with GODEBUG=schedtrace=1000 prints one line per second with the number of Ps, idle Ps, threads, and the length of the global and of each local run queue. Long run queues with no idle Ps mean the program wants more CPU than GOMAXPROCS gives it.",
          ),
          concept(
            "dump",
            "Goroutine dumps and the execution tracer",
            "The goroutine profile, or sending SIGQUIT (which also ends the process), prints every goroutine's stack and what it is waiting on. `go tool trace` shows on a timeline when each goroutine ran, was runnable or was blocked, and for how long. You can use them to tell 'waiting for CPU' from 'waiting for a lock or I/O'.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "sched-lab",
            "Watch the scheduler under a CPU limit",
            "Run a Go HTTP server with a CPU-bound handler in a container limited to 2 CPUs on a machine with more cores. Under the same load, compare GOMAXPROCS set by hand to the host's core count (Go 1.25 and later, with go 1.25 or later in go.mod, would otherwise choose 2 itself) with GOMAXPROCS=2: record p99 latency and the throttling counters (nr_throttled, throttled_usec) in the container cgroup's cpu.stat (cgroup v2). Run once with GODEBUG=schedtrace=1000 and read the run queue lengths.",
            {
              doneWhen: [
                "p99 latency and nr_throttled from cpu.stat for both settings",
                "One schedtrace line explained field by field",
              ],
            },
          ),
        ]),
      ],
      {
        detail: "How goroutines are multiplexed onto threads, and what happens when one of them blocks.",
        links: [GO_SCHEDULING],
      },
    ),

    topic(
      "gc",
      "Garbage collection and memory",
      [
        topic("basics", "Where values live", [
          concept(
            "stack-heap",
            "Stack and heap",
            "A function's local values live in its stack frame: allocating is moving a pointer, and everything is freed at no cost when the function returns. A value that must outlive the call that created it, or that is too large or of unknown size for the frame, usually goes on the heap, where something must later decide that it is no longer needed. That something is the programmer, a reference count or a garbage collector.",
          ),
          concept(
            "escape",
            "Escape analysis",
            "The Go compiler works out, for each variable, whether it can still be referenced after its function returns. If not, it stays on the stack and costs the garbage collector nothing; if it might, it 'escapes' to the heap. Returning a pointer to a local, storing a value in an interface and capturing a variable in a goroutine's closure are common causes. `go build -gcflags=-m` prints each decision.",
          ),
          concept(
            "reachability",
            "Reachability: what 'garbage' means",
            "A collector cannot know what you will use again, so it uses a safe approximation: an object is live if it can be reached by following pointers from the roots (global variables, every stack, CPU registers). Everything unreachable is garbage. The consequence that matters later: an object you will never use but can still reach is never freed.",
          ),
        ]),
        topic("algorithms", "How collectors work", [
          concept(
            "refcount",
            "Reference counting",
            "Each object stores how many references point to it; the count is adjusted whenever a reference is created or dropped, and the object is freed the moment it reaches zero. Memory is reclaimed promptly, but every pointer write costs a count update, and objects that refer to each other in a cycle never reach zero.",
          ),
          concept(
            "mark-sweep",
            "Tracing: mark and sweep",
            "Starting from the roots, the collector follows every pointer and marks each object it reaches; then it sweeps the heap and frees everything unmarked. Cycles are no problem, because an unreachable cycle is never marked. The cost of marking is proportional to the live objects, not to the garbage.",
          ),
          concept(
            "moving",
            "Fragmentation, compaction and copying",
            "Freeing objects in place leaves holes that may be too small to reuse. A compacting collector slides live objects together; a copying collector evacuates the live objects to an empty region and frees the old region whole, which makes allocation a pointer bump. Both must update every pointer to a moved object. A non-moving collector instead allocates from free lists grouped by object size to limit fragmentation.",
          ),
          concept(
            "stw",
            "Stop-the-world, parallel, incremental, concurrent",
            "The simplest collector stops every application thread while it works. A parallel collector uses several threads during that stop to shorten it. An incremental collector splits the work into small slices interleaved with the program. A concurrent collector does most of it on other threads while the program keeps running. Each step shortens pauses and adds bookkeeping; no design is best at once on memory use, CPU cost and pause time.",
          ),
          concept(
            "generational",
            "The generational hypothesis",
            "Most objects die young, so the heap is split by age: the young generation is collected often and cheaply, survivors are promoted to an old generation collected rarely. A young collection only pays for the few survivors, which is why short-lived per-request objects are cheap in a generational runtime.",
          ),
          concept(
            "barrier",
            "Write barriers",
            "A write barrier is a small piece of code the runtime executes on pointer stores. Generational collectors use it to record old-to-young pointers, so a young collection can find its roots without scanning the old generation. Concurrent collectors use it to learn about pointers the program changes while marking is under way. It is the price application code pays for cheap or concurrent collection.",
          ),
        ]),
        topic(
          "v8",
          "V8 (Node)",
          [
            concept(
              "layout",
              "Young and old generation",
              "New JavaScript objects are allocated in a small young generation; objects that survive are moved to the much larger old generation. The two are collected by different algorithms at very different frequencies.",
            ),
            concept(
              "scavenge",
              "The scavenger (minor GC)",
              "The young generation is split into two halves. A scavenge copies the live objects out of the full half into the empty one and discards the rest, so its cost depends on how much survives, not on how much was allocated. An object that survives a second scavenge is promoted to the old generation. Scavenges are frequent and short, and V8 runs them on several threads in parallel.",
            ),
            concept(
              "major",
              "Mark-compact (major GC)",
              "The old generation is collected by marking live objects from the roots, sweeping dead ones onto free lists and compacting some fragmented pages. V8 does much of the marking concurrently on helper threads and in small increments on the main thread, sweeps concurrently and compacts in parallel, so the main thread, which is also your event loop, pauses only briefly.",
            ),
            concept(
              "limits",
              "The heap limit and memory outside the heap",
              "V8 caps the old generation; --max-old-space-size (in megabytes) changes the cap. As the heap nears it, major collections run back to back, and when they cannot free enough the process aborts with 'JavaScript heap out of memory'. Buffer contents live outside the V8 heap, so compare heapUsed, external and rss from process.memoryUsage() to see where memory is going.",
            ),
          ],
          { links: [V8_TRASH_TALK] },
        ),
        topic(
          "go-gc",
          "Go",
          [
            concept(
              "design",
              "Go's collector in one sentence",
              "Concurrent tri-colour mark and sweep; not generational and not moving. It marks while the program runs, so pauses are short; it never relocates objects, so pointers stay valid; and it relies on escape analysis to keep many short-lived values off the heap altogether.",
            ),
            concept(
              "tricolour",
              "Tri-colour marking",
              "White objects have not been seen, grey ones have been seen but their pointers not yet followed, black ones are fully scanned. Marking starts by greying the roots, then repeatedly turns a grey object black while greying everything it points to. When no grey objects remain, every white object is unreachable and can be swept.",
            ),
            concept(
              "concurrent",
              "Marking while the program runs",
              "The program keeps changing pointers during marking, which could hide a live object from the collector. A write barrier, switched on only during the mark phase, greys the objects involved so that nothing reachable stays white. The world is stopped only briefly, to start marking and to finish it. A goroutine that allocates fast during marking is made to do some marking itself (a mark assist), so allocation cannot outrun the collector.",
            ),
            concept(
              "green-tea",
              "Green Tea: the marker since Go 1.26",
              "Go 1.26 made the Green Tea collector the default. It keeps the same concurrent mark-sweep design but changes the unit of marking work from single objects to whole pages of same-sized objects, which improves memory locality; the release notes expect 10-40% less GC overhead in GC-heavy programs. GOEXPERIMENT=nogreenteagc turned it off in 1.26.",
            ),
            concept(
              "gogc",
              "GOGC: the heap growth target",
              "GOGC=100, the default, sets the heap goal at the live heap found by the previous cycle plus 100% of it (since Go 1.18 the percentage also applies to goroutine stacks and globals), so the total heap is about twice the live heap. Lower values trade CPU for less memory, higher values the reverse; GOGC=off disables collection unless a memory limit applies. Doubling GOGC roughly doubles the heap overhead and halves the GC's CPU cost.",
            ),
            concept(
              "gomemlimit",
              "GOMEMLIMIT and containers",
              "It sets a soft limit on all memory the Go runtime manages (not only the heap); the GC runs more often as the limit approaches. Go does not read the cgroup memory limit itself, so without GOMEMLIMIT it can be OOM-killed with garbage still uncollected, because GOGC alone lets the heap double. The GC guide suggests leaving 5-10% headroom below the container's limit. It is soft: if live memory really exceeds it, the runtime caps GC at roughly half the CPU and goes over the limit rather than collecting forever.",
            ),
            concept(
              "cost-model",
              "What GC cost depends on",
              "Each cycle costs CPU in proportion to the live heap it must mark, and cycles happen at a rate set by how fast the program allocates relative to the headroom GOGC allows. So the two levers in your own code are allocating less (reuse buffers, avoid needless pointers and escapes, sync.Pool for hot temporary objects) and keeping less alive.",
            ),
          ],
          { links: [GO_GC_GUIDE] },
        ),
        topic("cpython", "CPython", [
          concept(
            "py-refcount",
            "Reference counting first",
            "Every object carries a reference count, and most memory is freed the instant the count reaches zero, with no collector involved. Destruction is prompt and predictable (a file object is closed when its last reference goes away, though relying on that is CPython-specific), and every assignment of a reference writes to the object it points at. Those constant, non-atomic count updates are what the GIL protects.",
          ),
          concept(
            "cycles",
            "The cycle collector",
            "Counts never reach zero for objects that refer to each other, so CPython also has a tracing collector (the gc module) that looks only at container objects, finds groups that are referenced only from within themselves and frees them. It is triggered by allocation counts and examines young objects more often than old ones. gc.collect() forces a run.",
          ),
        ]),
        topic("latency", "What collection costs a service", [
          concept(
            "pauses",
            "GC pauses and tail latency",
            "While the collector has the application stopped, every request in flight waits. Pauses are rare relative to requests, so the median barely moves; they appear at p99 and beyond. In Node a pause also stops the event loop, so it adds to event-loop delay like any other blocking work.",
          ),
          concept(
            "cpu-cost",
            "The cost that is not a pause",
            "A concurrent collector with tiny pauses still uses CPU the program wanted: Go's background marking occupies cores during a cycle, and mark assists slow down the goroutines that allocate most. Under a tight CPU limit this shows up as throttling and latency even when the reported pause times look excellent.",
          ),
          concept(
            "gc-logs",
            "Watching collections happen",
            "GODEBUG=gctrace=1 makes Go print one line per cycle to stderr with the heap size at the start and end of the cycle and the live heap, the heap goal, and the wall-clock and CPU time of each phase: stop-the-world sweep termination, concurrent mark and scan, stop-the-world mark termination. `node --trace-gc` prints each scavenge and mark-compact with its duration and heap sizes. In Python, gc.set_debug(gc.DEBUG_STATS) reports cycle-collector runs. You can read each and say how often the collector runs and how much it frees.",
          ),
        ]),
        topic("leaks", "Memory leaks in a collected language", [
          concept(
            "definition",
            "What a leak is when memory is managed for you",
            "The collector frees only what is unreachable. A leak in a garbage-collected language is memory that is still reachable but will never be used again: the program holds a reference it has forgotten about. The collector is working correctly; the bug is the reference.",
          ),
          concept(
            "causes",
            "The usual causes",
            "A map or cache that gains entries and never evicts them, a module-level list that is only appended to, event listeners registered and never removed, timers never cleared, closures that capture a large object, and a small slice of a huge array that keeps the whole array alive. Each is a long-lived object pointing at things that should have been short-lived.",
          ),
          concept(
            "goroutine-leak",
            "Goroutine leaks",
            "A goroutine blocked forever, usually on a channel nobody reads or writes, or missing context cancellation. It holds its stack and everything it references, and the runtime does not collect it. A goroutine count that only ever rises is the sign. Since Go 1.27 the goroutineleak profile uses the collector to report goroutines blocked on a channel or lock that no runnable goroutine can still reach.",
          ),
          concept(
            "signature",
            "Telling a leak from a large heap",
            "Heap use in a healthy service is a sawtooth: it rises between collections and drops back to the same floor. In a leak the floor, the live heap after each collection, keeps rising under steady load. Judge by the floor over hours, not by one high reading, and not by a heap that is large only because the collector has not needed to run.",
          ),
          concept(
            "rss-vs-heap",
            "Heap in use versus process memory",
            "A runtime asks the OS for memory in large blocks and does not hand all of it back as soon as objects die, so RSS can stay high after the live heap has fallen. RSS also counts memory outside the managed heap: thread stacks, native libraries, Node Buffers. Compare the runtime's own heap numbers with RSS before calling something a leak.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "gc-logs-lab",
            "Read the collector's own logs",
            "Write a small Go program that keeps a fixed live set and allocates short-lived garbage at a steady rate. Run it with GODEBUG=gctrace=1 at the default GOGC, then with a GOMEMLIMIT set between the live heap and the peak heap of the first run, and compare the heap goal and how often cycles run. (A limit below the live heap makes the GC run almost continuously.) Write the same workload in Node, run it with --trace-gc and count scavenges against mark-compacts.",
            {
              doneWhen: [
                "Two gctrace lines, one from each Go run, with every field explained",
                "Scavenge and mark-compact counts for the Node run, with the reason for the ratio",
              ],
            },
          ),
        ]),
      ],
      { detail: "Where memory goes, who frees it, and what the freeing costs." },
    ),

    topic(
      "profiling",
      "Profiling",
      [
        topic("method", "How profilers work", [
          concept(
            "measure-first",
            "Measure before you optimise",
            "Intuition about where a program spends its time is usually wrong, and speeding up code that accounts for 5% of the time gains at most 5%. A profile tells you which code is responsible for the time or the memory, so you change the part that matters and can show the difference afterwards.",
          ),
          concept(
            "sampling",
            "Sampling profilers",
            "A sampling profiler interrupts the program many times a second and records the call stack each time. Functions that appear in many samples are where the time goes. Overhead is low and steady, which makes it usable in production, but the result is statistical: short runs and rarely executed code are noisy or missing.",
          ),
          concept(
            "instrumenting",
            "Instrumenting profilers",
            "An instrumenting (deterministic) profiler records every function entry and exit, giving exact call counts and timings. The bookkeeping can slow the program several times over and inflates the apparent cost of small, frequently called functions, so it distorts what it measures. Python's cProfile works this way: use it for call counts on a script or test, not to time a loaded service.",
          ),
          concept(
            "self-vs-total",
            "Self time and cumulative time",
            "Self (flat) time is time spent in a function's own code; cumulative time includes everything it called. A request handler has a huge cumulative time and almost no self time. Sort by cumulative to find the expensive path, then by self to find the code that actually burns the CPU.",
          ),
          concept(
            "on-off-cpu",
            "On-CPU versus off-CPU time",
            "A CPU profile only counts time a thread was running on a core. Time spent waiting for a lock, a socket, the disk or a turn on a CPU is absent from it. A service that is slow while its CPU is mostly idle has an off-CPU problem and needs wall-clock sampling, a blocking profile or a trace instead of a CPU profile.",
          ),
        ]),
        topic(
          "flame",
          "Flame graphs",
          [
            concept(
              "construction",
              "How a flame graph is built",
              "Take all the stack samples, merge identical stacks, and draw each function as a box on top of its caller. Stacks that share a prefix share the boxes for that prefix. The whole profile becomes one picture in which every sampled code path is visible.",
            ),
            concept(
              "axes",
              "What the axes mean",
              "Width is the share of samples that included that function (time), not chronological order; frames are sorted alphabetically within a level so that identical ones merge. Height is stack depth. Left-to-right position carries no meaning, and by default neither does colour. A 'flame chart', such as the one in Chrome DevTools, is different: its x-axis is time.",
            ),
            concept(
              "reading",
              "Reading one",
              "The function that was on the CPU in a sample is the top box of its stack, so look for wide boxes with nothing above them: those plateaus are where CPU time is actually spent. Then read downwards to see who called it. A wide box covered by wide children is only on the path; the cost is further up.",
            ),
          ],
          { links: [FLAME_GRAPHS] },
        ),
        topic("heap", "Memory profiles", [
          concept(
            "alloc-profile",
            "Allocation profiles",
            "A heap profiler samples allocations and records the call stack that made each one. It can answer two different questions: which call sites allocate the most over time (pressure on the collector) and which call sites own the memory that is live right now (footprint and leaks). Know which of the two you are looking at.",
          ),
          concept(
            "snapshot",
            "Heap snapshots and retaining paths",
            "A snapshot is the whole object graph at one instant. An object's shallow size is its own memory; its retained size is everything that would be freed if it went away. The retaining path, the chain of references from a root to the object, tells you why it is still alive, which is the question a leak hunt has to answer.",
          ),
        ]),
        topic(
          "go-pprof",
          "Go: pprof",
          [
            concept(
              "endpoints",
              "runtime/pprof and net/http/pprof",
              "Importing net/http/pprof registers handlers under /debug/pprof/ on the default HTTP mux, including profile (CPU), heap, allocs, goroutine, block, mutex and trace. `go tool pprof <url>` fetches a profile and opens it. The endpoints reveal internals and cost CPU when used, so serve them on an internal port only.",
            ),
            concept(
              "cpu",
              "CPU profiles",
              "While a CPU profile is being collected, the runtime takes about 100 samples per second of CPU time the program uses, recording the stack that was running each time. In `go tool pprof`, `top` lists functions by flat and cumulative time, `list <function>` shows the cost line by line, and the `-http` flag opens a web UI that includes a flame graph.",
            ),
            concept(
              "heap-profile",
              "Heap profiles: in-use versus allocated",
              "The heap profile samples allocations (by default about one for every 512 KB allocated). inuse_space shows memory that was live at the last collection, by allocation site: use it for footprint and leaks. alloc_space shows everything allocated since the program started, freed or not: use it to find the call sites that create garbage and GC work.",
            ),
            concept(
              "goroutine-block",
              "Goroutine, block and mutex profiles",
              "The goroutine profile lists every goroutine's stack, grouping identical stacks, so thousands stuck on one line stand out. The block profile shows where goroutines waited on channels and locks, and the mutex profile shows which lock holders made others wait. Block and mutex profiling record nothing until enabled with runtime.SetBlockProfileRate and runtime.SetMutexProfileFraction.",
            ),
          ],
          { links: [GO_PPROF] },
        ),
        topic("node-tools", "Node: --prof and the inspector", [
          concept(
            "node-cpu",
            "CPU profiles",
            "`node --cpu-prof` writes a .cpuprofile file when the process exits, which Chrome DevTools opens. `node --prof` writes V8's tick log, which `node --prof-process` turns into a text summary. `node --inspect` opens a debugging port so that DevTools can attach to a running process and record a profile on demand; never expose that port to a network you do not trust.",
          ),
          concept(
            "node-heap",
            "Heap snapshots",
            "Take one from DevTools, with v8.writeHeapSnapshot(), or on a signal by starting node with --heapsnapshot-signal. To find a leak, take two heap snapshots some time apart, compare them, and look at which objects grew and the retaining path that keeps them alive. Writing a snapshot is synchronous, so it blocks the event loop, and Node's docs say it needs memory about twice the size of the heap, which can get the process OOM-killed on a production instance. --heapsnapshot-near-heap-limit=<count> writes up to that many automatically as the heap nears its limit.",
          ),
        ]),
        topic("py-tools", "Python: py-spy and tracemalloc", [
          concept(
            "py-spy",
            "py-spy",
            "A sampling profiler that runs as a separate process and reads the target's memory, so it attaches to a running Python program with no code change or restart (it may need elevated privileges): `py-spy top` for a live view, `py-spy record` for a flame graph, `py-spy dump` for every thread's current stack. Its --gil option counts only threads holding the GIL, which shows who is competing for it.",
            { links: [PY_SPY] },
          ),
          concept(
            "stdlib-sampler",
            "The built-in sampling profiler in Python 3.15",
            "Python 3.15 added profiling.sampling to the standard library: like py-spy, it attaches to a running process by PID without code changes, and it can sample wall time, CPU time or GIL-holding time and write a flame graph. cProfile remains for deterministic profiling.",
          ),
          concept(
            "tracemalloc",
            "tracemalloc",
            "Call tracemalloc.start(), take a snapshot, run the workload, take another and compare them with compare_to: the result lists the source lines whose live allocations grew the most. It tracks memory allocated through Python's allocators, not memory that C libraries obtain for themselves.",
            { links: [TRACEMALLOC] },
          ),
        ]),
        topic("leak-hunt", "A method for hunting a leak", [
          concept(
            "confirm",
            "Confirm it is a leak, then make it fast",
            "Plot the live heap after collection (or the runtime's heap-in-use metric) under steady load: a floor that keeps rising is a leak, a high but flat line is not. Then drive the suspect code path in a loop on a test instance, so the growth takes minutes instead of days and the leaked objects outnumber everything else.",
          ),
          concept(
            "diff",
            "Take two snapshots and diff them",
            "Capture the heap, apply more load, capture again and compare: the object types or allocation sites whose live count grew are the suspects. In Go compare two heap profiles with `go tool pprof -diff_base`; in Node use the snapshot comparison view in DevTools; in Python use tracemalloc's compare_to.",
          ),
          concept(
            "retainer",
            "Find what holds the reference",
            "Knowing what leaked is half the answer. Follow the retaining path (Node), the allocation stack plus the code that stores the result (Go, Python), or the stack the goroutines are parked on, until you reach the long-lived object that should have let go: the map, list, listener table or channel.",
          ),
          concept(
            "verify",
            "Fix, then prove it",
            "Apply the fix (evict, remove the listener, cancel the context, close the channel) and rerun the same load. The floor should now be flat; keep the before and after graphs.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "go-pprof",
            "Profile a Go service with pprof",
            "Add net/http/pprof to your Go HTTP server, put it under load, and capture CPU, heap and goroutine profiles. Find the top allocation site and remove it. Set GOGC to 50 and 400 and record the trade-off between GC CPU and heap size.",
            {
              doneWhen: [
                "`go tool pprof -top` before and after your fix",
                "A note with heap size and GC CPU percentage at GOGC 50, 100 and 400",
              ],
              links: [GO_PPROF],
            },
          ),
          build(
            "leak-hunt",
            "Hunt three leaks",
            "Plant and then find a leak in each runtime: an ever-growing Map keyed by request ID in Node (heap snapshots, compare two), a module-level list in Python (tracemalloc snapshots), and a goroutine leak in Go from an unread channel (goroutine profile).",
            {
              doneWhen: [
                "Node: the heap snapshot comparison naming the retaining path",
                "Python: the tracemalloc top differences",
                "Go: the goroutine profile showing the leaked goroutines' stack",
              ],
              links: [TRACEMALLOC],
            },
          ),
        ]),
      ],
      { detail: "Finding out where the time and the memory actually go." },
    ),
  ],
);
