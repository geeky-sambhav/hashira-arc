import { cards, lab, link, note, output, read, url } from "../dsl";
import type { Phase } from "../types";

export const phase: Phase = {
  id: "runtimes",
  label: "Phase 2",
  title: "Language runtimes",
  summary:
    "Node, Python and Go each put a runtime between your code and the kernel you just studied. Learn what the event loop, the garbage collector and the GIL actually do, on the languages you already ship.",
  weeks: { start: 8, end: 9 },
  pillar: "runtimes",
  modules: [
    {
      id: "rt-event-loops",
      title: "Event loops and blocking",
      summary: "Week 8. One thread, many connections, and what happens when you block it.",
      items: [
        read("rt-libuv-design", "libuv design overview", {
          week: 8,
          hours: 2,
          source: "libuv documentation",
          chapters: "Design overview: the I/O loop phases, the thread pool, which operations use it",
          links: [link("libuv design overview", "https://docs.libuv.org/en/v1.x/design.html")],
        }),
        read("rt-node-loop", "Node.js: the event loop and not blocking it", {
          week: 8,
          hours: 2.5,
          source: "Node.js documentation",
          chapters: "The Node.js Event Loop; Don't Block the Event Loop",
          links: [
            link("The Node.js event loop", "https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick"),
            link("Don't block the event loop", "https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop"),
          ],
        }),
        lab("rt-block-node", "Block the Node event loop and measure it", {
          week: 8,
          hours: 5,
          brief:
            "Build an HTTP server with one fast route and one route that runs a large JSON.parse or synchronous pbkdf2. Hit the fast route at a steady rate while calling the slow one. Measure with perf_hooks.monitorEventLoopDelay and capture a CPU profile.",
          evidence: [
            output("delay", "Event-loop delay histogram and fast-route p99 before and during the slow call"),
            output("profile", "The CPU profile or flame graph showing the blocking frame"),
          ],
          links: [link("perf_hooks.monitorEventLoopDelay", "https://nodejs.org/api/perf_hooks.html#perf_hooksmonitoreventloopdelayoptions")],
        }),
        lab("rt-unblock-node", "Fix it three ways", {
          week: 8,
          hours: 4,
          brief:
            "Fix the blocked route by (1) moving the work to a worker_threads pool, (2) partitioning it with setImmediate, and (3) using the async crypto API that runs on the libuv thread pool. Then saturate the thread pool with 4 concurrent fs or dns.lookup calls and observe the queueing.",
          evidence: [
            output("compare", "Fast-route p99 for each of the three fixes"),
            note("pool", "What happened when the libuv thread pool was saturated, and what UV_THREADPOOL_SIZE changed"),
          ],
        }),
        read("rt-asyncio", "Python asyncio: developing with asyncio", {
          week: 8,
          hours: 2,
          source: "Python documentation",
          chapters: "Developing with asyncio: debug mode, blocking code, running in threads",
          links: [link("Developing with asyncio", "https://docs.python.org/3/library/asyncio-dev.html")],
        }),
        lab("rt-asyncio-blocking", "Find blocking calls inside asyncio", {
          week: 8,
          hours: 3.5,
          brief:
            "Write an asyncio service that calls time.sleep and a synchronous HTTP client inside coroutines. Run with PYTHONASYNCIODEBUG=1 and read the slow-callback warnings. Fix with asyncio.to_thread and a real async client, and show throughput before and after.",
          evidence: [
            output("warnings", "The slow-callback warnings from debug mode"),
            output("throughput", "Requests per second before and after the fix"),
          ],
        }),
        read("rt-go-scheduler", "Scheduling in Go", {
          week: 8,
          hours: 3,
          source: "Ardan Labs (William Kennedy)",
          chapters: "Parts 1-3: OS scheduler, Go scheduler (G, M, P), concurrency",
          links: [link("Scheduling in Go, part 1", "https://www.ardanlabs.com/blog/2018/08/scheduling-in-go-part1.html")],
        }),
      ],
    },
    {
      id: "rt-memory-gc",
      title: "Garbage collection, the GIL and leaks",
      summary: "Week 9. Where memory goes, who frees it, and how to prove a leak.",
      items: [
        read("rt-gc-guides", "How garbage collectors work in Go and V8", {
          week: 9,
          hours: 4,
          source: "Go and V8 documentation",
          chapters: "A Guide to the Go Garbage Collector (all); V8's Trash talk: the Orinoco garbage collector",
          links: [
            link("A Guide to the Go Garbage Collector", "https://go.dev/doc/gc-guide"),
            link("Trash talk: the Orinoco garbage collector", "https://v8.dev/blog/trash-talk"),
          ],
        }),
        read("rt-gil", "The Python GIL and free-threading", {
          week: 9,
          hours: 2,
          source: "Python documentation and PEPs",
          chapters: "Free-threading HOWTO; PEP 779 (supported status in 3.14)",
          links: [
            link("Python free-threading HOWTO", "https://docs.python.org/3/howto/free-threading-python.html"),
            link("PEP 779", "https://peps.python.org/pep-0779/"),
          ],
        }),
        lab("rt-gil-bench", "Measure the GIL", {
          week: 9,
          hours: 4,
          brief:
            "Run a CPU-bound function on 1, 2, 4 and 8 threads on standard CPython 3.14 and on the free-threaded 3.14t build. Repeat with an I/O-bound function. Profile one run with py-spy and find the GIL contention.",
          evidence: [
            output("table", "Wall time by thread count for both builds, CPU-bound and I/O-bound"),
            note("why", "Why threads helped I/O on both builds but CPU only on 3.14t"),
          ],
          links: [link("py-spy", "https://github.com/benfred/py-spy")],
        }),
        read("rt-flamegraphs", "Flame graphs", {
          week: 9,
          hours: 1.5,
          source: "Brendan Gregg",
          chapters: "CPU flame graphs: how to read one (width is time, not order)",
          links: [link("Flame Graphs", "https://www.brendangregg.com/flamegraphs.html")],
        }),
        lab("rt-go-pprof", "Profile a Go service with pprof", {
          week: 9,
          hours: 4,
          brief:
            "Add net/http/pprof to your Go HTTP server, put it under load, and capture CPU, heap and goroutine profiles. Find the top allocation site and remove it. Set GOGC to 50 and 400 and record the trade-off between GC CPU and heap size.",
          evidence: [
            output("top", "`go tool pprof -top` before and after your fix"),
            note("gogc", "Heap size and GC CPU percentage at GOGC 50, 100 and 400"),
          ],
          links: [link("Profiling Go programs", "https://go.dev/blog/pprof")],
        }),
        lab("rt-leak-hunt", "Hunt three leaks", {
          week: 9,
          hours: 6,
          brief:
            "Plant and then find a leak in each runtime: an ever-growing Map keyed by request ID in Node (heap snapshots, compare two), a module-level list in Python (tracemalloc snapshots), and a goroutine leak in Go from an unread channel (goroutine profile).",
          evidence: [
            output("node", "The heap snapshot comparison naming the retaining path"),
            output("python", "tracemalloc top differences"),
            output("go", "Goroutine profile showing the leaked goroutines' stack"),
          ],
          links: [link("tracemalloc", "https://docs.python.org/3/library/tracemalloc.html")],
        }),
        lab("rt-writeup", "Write-up: an event loop is just epoll in a while loop", {
          week: 9,
          hours: 2.5,
          brief:
            "Connect this phase to the last one: explain Node's event loop using your own epoll echo server from Phase 1, and show a measured example of what blocking it costs.",
          evidence: [url("post", "Link to the published write-up")],
        }),
      ],
    },
  ],
};

export const quiz = [
  ...cards("rt-event-loops", [
    ["Which Node operations run on the libuv thread pool rather than the event loop's epoll?", "File system calls, dns.lookup (getaddrinfo), and CPU-heavy crypto and zlib. Network sockets use epoll directly and never touch the pool."],
    ["What is the default libuv thread pool size and what happens when it is full?", "Four threads. Further pool work queues behind them, so slow file or DNS calls can delay unrelated ones."],
    ["Why does one slow synchronous function hurt every request in Node?", "JavaScript runs on a single thread. Until the function returns, the loop cannot run any other callback, so all other requests wait."],
    ["What is the difference between process.nextTick, a promise callback and setImmediate?", "nextTick and promise microtasks run right after the current operation, before the loop continues. setImmediate runs in the check phase, after I/O polling."],
    ["How do you detect a blocked event loop in production?", "Measure event-loop delay (perf_hooks.monitorEventLoopDelay) and alert on its high percentiles."],
    ["What goes wrong if you call time.sleep or requests.get inside an async def?", "It blocks the whole event loop thread, so every other coroutine stalls. Use await asyncio.sleep, an async client, or asyncio.to_thread."],
    ["In Go's scheduler, what are G, M and P?", "G is a goroutine, M is an OS thread, P is a scheduling context holding a run queue. An M must hold a P to run Go code; GOMAXPROCS sets the number of Ps."],
    ["How does Go make blocking-style network code scale?", "The runtime parks the goroutine and registers the socket with the netpoller (epoll). The OS thread is freed to run other goroutines until the socket is ready."],
  ]),
  ...cards("rt-memory-gc", [
    ["What does the GIL prevent, and what does it not prevent?", "It lets only one thread execute Python bytecode at a time, so CPU-bound threads do not run in parallel. It is released around blocking I/O, so I/O-bound threads still overlap."],
    ["What is the status of free-threaded Python in 3.14?", "Officially supported but optional: a separate build (python3.14t). The default build still has the GIL."],
    ["What does GOGC=100 mean?", "The next collection starts when the heap has grown 100% over the live heap left after the previous one. Lower values trade CPU for less memory."],
    ["What does GOMEMLIMIT do and why does it matter in containers?", "It sets a soft total memory limit; the GC works harder as the limit approaches. Without it Go does not know the cgroup limit and can be OOM-killed with garbage still uncollected."],
    ["What is generational garbage collection?", "Most objects die young, so the heap is split by age: the young generation is collected often and cheaply, survivors are promoted to an old generation collected rarely."],
    ["How do you find a memory leak in Node?", "Take two heap snapshots some time apart, compare them, and look at which objects grew and the retaining path that keeps them alive."],
    ["What is a goroutine leak?", "A goroutine blocked forever, usually on a channel nobody reads or writes, or missing context cancellation. It holds its stack and everything it references."],
    ["In a flame graph, what do the x-axis width and the y-axis mean?", "Width is the share of samples that included that function (time), not chronological order. Height is stack depth."],
  ]),
];
