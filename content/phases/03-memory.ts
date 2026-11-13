import { cards, lab, link, note, output, paid, read, url } from "../dsl";
import type { Phase } from "../types";

const OSTEP = link("Operating Systems: Three Easy Pieces", "https://pages.cs.wisc.edu/~remzi/OSTEP/");
const SYSPERF = paid("Systems Performance, 2nd edition (Gregg)", "https://www.brendangregg.com/systems-performance-2nd-edition-book.html");
const CGROUP = link("Control Group v2", "https://docs.kernel.org/admin-guide/cgroup-v2.html");

export const phase: Phase = {
  id: "memory",
  label: "Phase 3",
  title: "Memory",
  summary:
    "Virtual memory, the page cache, cgroup limits and the OOM killer. By the end you can explain why a container died at 60% memory and why a host can stall with idle CPUs.",
  weeks: { start: 10, end: 12 },
  pillar: "memory",
  modules: [
    {
      id: "mem-virtual",
      title: "Virtual memory",
      summary: "Week 10. Addresses are a fiction; pages and faults are real.",
      items: [
        read("mem-ostep-vm", "OSTEP: virtual memory", {
          week: 10,
          hours: 12,
          source: "OSTEP",
          chapters: "Ch. 13-16, 18-23: address spaces, paging, TLBs, multi-level tables, swapping, policies",
          links: [OSTEP],
        }),
        read("mem-tlpi-mmap", "TLPI: process memory layout and mmap", {
          week: 10,
          hours: 5,
          source: "The Linux Programming Interface",
          chapters: "Ch. 6.3-6.5 (memory layout), 49 (memory mappings)",
          links: [paid("The Linux Programming Interface (Kerrisk)", "https://man7.org/tlpi/")],
        }),
        lab("mem-faults", "Watch pages become real", {
          week: 10,
          hours: 5,
          brief:
            "Write a Go program that mmaps 1 GB of anonymous memory, then touches one page every few milliseconds. Watch VSZ stay flat while RSS climbs. Count minor faults with `perf stat -e page-faults` and /proc/<pid>/stat. Repeat with a file-backed mapping.",
          evidence: [
            output("rss", "VSZ and RSS over time while pages are touched"),
            output("faults", "Fault counts for the anonymous and the file-backed run"),
          ],
          links: [link("mmap(2)", "https://man7.org/linux/man-pages/man2/mmap.2.html")],
        }),
        lab("mem-smaps", "Read a real process's memory map", {
          week: 10,
          hours: 3,
          brief:
            "For a running Node server, read /proc/<pid>/smaps_rollup and smaps. Separate anonymous from file-backed memory, find the V8 heap, and explain RSS vs PSS vs shared. Compare with what `top` and `docker stats` report.",
          evidence: [note("breakdown", "A table of the largest mappings and what each one is")],
        }),
      ],
    },
    {
      id: "mem-page-cache",
      title: "Page cache, swap and limits",
      summary: "Week 11. Why free memory is wasted memory, and what a cgroup limit counts.",
      items: [
        read("mem-sysperf", "Systems Performance: memory", {
          week: 11,
          hours: 8,
          source: "Systems Performance, 2nd edition",
          chapters: "Ch. 7 Memory: concepts, architecture, methodology, tools",
          links: [SYSPERF],
        }),
        read("mem-linux-ate-my-ram", "Linux ate my RAM", {
          week: 11,
          hours: 0.5,
          source: "linuxatemyram.com",
          links: [link("Linux ate my RAM", "https://www.linuxatemyram.com/")],
        }),
        lab("mem-page-cache-lab", "The page cache in action", {
          week: 11,
          hours: 4,
          brief:
            "Record `free -m`. Read a 2 GB file twice and time both reads. Record `free -m` again and check the file with fincore. Drop caches and repeat. Then write a large file and watch Dirty and Writeback in /proc/meminfo drain.",
          evidence: [
            output("free", "`free -m` before, after reading, and after drop_caches, with the 'available' column explained"),
            output("timing", "First vs second read timing"),
          ],
        }),
        read("mem-swap", "In defence of swap", {
          week: 11,
          hours: 1.5,
          source: "Chris Down",
          links: [link("In defence of swap", "https://chrisdown.name/2018/01/02/in-defence-of-swap.html")],
        }),
        read("mem-cgroup-docs", "cgroup v2 memory controller and PSI", {
          week: 11,
          hours: 3,
          source: "Linux kernel documentation",
          chapters: "Control Group v2: Memory section (memory.max, memory.high, memory.events, memory.stat); PSI",
          links: [CGROUP, link("PSI: pressure stall information", "https://docs.kernel.org/accounting/psi.html")],
        }),
        lab("mem-cgroup-oom", "Trigger a cgroup OOM kill", {
          week: 11,
          hours: 4,
          brief:
            "Create a cgroup with memory.max=100M by hand (no Docker). Run a Python allocator inside it until it is killed. Then run a process that only reads a big file: show the page cache is charged to the cgroup but reclaimed instead of causing a kill.",
          evidence: [
            output("events", "memory.events before and after, showing oom_kill increment"),
            output("dmesg", "The kernel's OOM report from dmesg, annotated"),
          ],
        }),
      ],
    },
    {
      id: "mem-pressure",
      title: "Pressure, stalls and runtimes",
      summary: "Week 12. The slow death before the OOM kill.",
      items: [
        lab("mem-psi-stall", "Stall a service with idle CPUs", {
          week: 12,
          hours: 6,
          brief:
            "Run a service whose working set is about 400 MB in a cgroup with memory.high set to 300M. Load it at a steady rate. Record request latency, CPU utilisation, memory.pressure (some and full) and pgscan_direct from /proc/vmstat. Raise memory.high and watch it recover.",
          evidence: [
            output("pressure", "memory.pressure and pgscan_direct during the stall"),
            note("latency", "Latency and CPU with and without pressure, and why CPU looked fine"),
          ],
        }),
        read("mem-down-talk", "Linux memory management at scale", {
          week: 12,
          hours: 1.5,
          source: "Chris Down, SREcon19",
          links: [link("Linux memory management at scale", "https://www.usenix.org/conference/srecon19asia/presentation/down")],
        }),
        lab("mem-oom-score", "Who does the OOM killer pick?", {
          week: 12,
          hours: 4,
          brief:
            "On a small VM with swap off, run three memory hogs with different oom_score_adj values and exhaust memory. Predict the victim from /proc/<pid>/oom_score first. Then protect one process with oom_score_adj=-1000 and see what dies instead.",
          evidence: [output("victim", "oom_score values, your prediction, and the dmesg line naming the victim")],
        }),
        lab("mem-runtime-limits", "Make runtimes respect the container", {
          week: 12,
          hours: 5,
          brief:
            "In a 256 MB cgroup, run a Go service with and without GOMEMLIMIT, and a Node service with and without --max-old-space-size, each under an allocation-heavy load. Show which configurations get OOM-killed and which collect garbage in time.",
          evidence: [
            output("results", "For each of the four runs: peak RSS, GC activity, killed or survived"),
            note("rule", "The rule you would now set for heap limits relative to the container limit"),
          ],
        }),
        lab("mem-writeup", "Write-up: why my container was killed at 60% memory", {
          week: 12,
          hours: 3,
          brief:
            "Explain, with your own outputs, what a cgroup memory limit counts (anonymous, page cache, kernel memory), why dashboards disagree, and how to read memory.events and memory.pressure.",
          evidence: [url("post", "Link to the published write-up")],
        }),
        read("mem-postmortems", "Postmortems: memory", {
          week: 12,
          hours: 2,
          source: "Dan Luu's post-mortems collection",
          chapters: "Pick two involving memory exhaustion, swap or OOM kills; write three lines on each",
          links: [link("Collection of postmortems", "https://github.com/danluu/post-mortems")],
        }),
      ],
    },
  ],
};

export const quiz = [
  ...cards("mem-virtual", [
    ["What is the difference between VSZ and RSS?", "VSZ is all virtual address space the process has mapped. RSS is the part currently backed by physical pages. A process can map far more than it uses."],
    ["What is a page fault, and what separates a minor from a major one?", "An access to a page with no valid mapping. Minor: the kernel can fix it without disk I/O (zero page, page already in cache). Major: it must read from disk."],
    ["What does the TLB do?", "Caches virtual-to-physical page translations so the CPU does not walk the page table on every access. A TLB miss costs a multi-level table walk."],
    ["Why does malloc of 1 GB succeed instantly on a machine with little free memory?", "The kernel only reserves address space. Physical pages are allocated lazily on first touch (demand paging), and Linux overcommits by default."],
    ["What is copy-on-write and where is it used?", "Two mappings share the same physical pages read-only; a write faults and gets a private copy. Used by fork, private file mappings and VM snapshots."],
    ["What is PSS?", "Proportional set size: private pages plus each shared page divided by the number of processes sharing it. Summing PSS across processes does not double count."],
    ["Why do huge pages help some workloads?", "One TLB entry covers 2 MB instead of 4 KB, so large heaps cause far fewer TLB misses."],
  ]),
  ...cards("mem-page-cache", [
    ["In `free -m`, why is 'available' the number to watch rather than 'free'?", "'free' excludes page cache, which the kernel can reclaim on demand. 'available' estimates what applications can get without swapping."],
    ["What is the page cache?", "Memory holding file contents so repeated reads and buffered writes avoid the disk. It grows to fill unused RAM and is reclaimed under pressure."],
    ["What are dirty pages?", "Page-cache pages modified in memory but not yet written to disk. They are flushed by writeback or by an explicit fsync."],
    ["Does page cache count against a cgroup's memory.max?", "Yes. File pages read or written by the cgroup are charged to it, but they are reclaimable, so the kernel evicts them before resorting to an OOM kill."],
    ["What is the difference between memory.high and memory.max?", "memory.high is a throttle: above it the cgroup is forced into reclaim and slowed. memory.max is a hard limit: exceeding it after reclaim fails triggers the OOM killer."],
    ["Where do you confirm a container was OOM-killed?", "The cgroup's memory.events (oom_kill counter), the kernel log (dmesg), and the container's exit code 137."],
    ["What is the argument for keeping some swap?", "Swap gives the kernel a place for cold anonymous pages, making reclaim fairer between file and anonymous memory and pressure more gradual, rather than keeping only file pages reclaimable."],
  ]),
  ...cards("mem-pressure", [
    ["How can a service be very slow while CPU utilisation is low?", "Its threads are stalled in direct reclaim or waiting for pages to be read back in. They are blocked, not running, so CPU looks idle."],
    ["What do 'some' and 'full' mean in memory.pressure?", "'some': share of time at least one task was stalled on memory. 'full': share of time all non-idle tasks were stalled at once, meaning no useful work happened."],
    ["What is direct reclaim?", "A thread that needs memory when free pages are exhausted must itself scan and free pages before its allocation returns, adding latency to that thread."],
    ["What is thrashing?", "The working set no longer fits, so the system spends its time evicting and re-reading pages it needs again immediately. Throughput collapses."],
    ["How does the OOM killer choose a victim?", "By oom_score: roughly the process's share of memory use, adjusted by oom_score_adj (-1000 exempts a process, +1000 makes it the preferred victim)."],
    ["Why can a Go or Node process be OOM-killed while holding lots of garbage?", "The runtime sizes its heap from its own heuristics and does not know the cgroup limit unless told (GOMEMLIMIT, --max-old-space-size), so it may not collect in time."],
    ["What exit code does a process killed by the OOM killer show?", "137: 128 plus 9, because it died from SIGKILL."],
  ]),
];
