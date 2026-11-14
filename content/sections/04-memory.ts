import { build, concept, link, paid, section, topic } from "../dsl";

const OSTEP = link(
  "Operating Systems: Three Easy Pieces (ch. 13-16 and 18-23)",
  "https://pages.cs.wisc.edu/~remzi/OSTEP/",
);
const TLPI = paid(
  "The Linux Programming Interface (Kerrisk), ch. 6.3-6.5 and 49",
  "https://man7.org/tlpi/",
);
const SYSPERF = paid(
  "Systems Performance, 2nd edition (Gregg), ch. 7 Memory",
  "https://www.brendangregg.com/systems-performance-2nd-edition-book.html",
);
const MMAP = link("mmap(2)", "https://man7.org/linux/man-pages/man2/mmap.2.html");
const CGROUP = link("Control Group v2", "https://docs.kernel.org/admin-guide/cgroup-v2.html");
const PSI = link("PSI: pressure stall information", "https://docs.kernel.org/accounting/psi.html");
const DOWN_TALK = link(
  "Linux memory management at scale",
  "https://www.usenix.org/conference/srecon19asia/presentation/down",
);

export default section(
  "memory",
  {
    title: "Memory",
    summary:
      "Virtual memory, the page cache, reclaim and swap, cgroup limits, the OOM killer and memory pressure. By the end you can explain why a container died at 60% memory and why a host can stall with idle CPUs.",
  },
  [
    topic(
      "virtual",
      "Virtual memory",
      [
        topic("why", "Why virtual memory exists", [
          concept(
            "problem",
            "The problem: many programs sharing one physical memory",
            "If programs used physical addresses directly, any program could read or corrupt another's memory, each would have to be built for whichever addresses happened to be free, and the total in use could never exceed RAM. Virtual memory solves all three with one level of indirection.",
          ),
          concept(
            "address-space",
            "A private address space for every process",
            "Each process sees its own complete range of addresses, and the same address in two processes refers to different physical memory. A process can only reach memory the kernel has mapped for it, so a stray pointer can crash its own process but cannot touch another one.",
          ),
          concept(
            "more-than-ram",
            "Using more memory than there is RAM",
            "Because every access goes through a mapping, a page needs no physical memory until it is first used, and the kernel can move a page's contents to disk and bring them back later without the program seeing anything but a delay.",
          ),
          concept(
            "sharing",
            "Sharing one physical copy between processes",
            "The same physical memory can be mapped into many address spaces. One copy of a shared library's code or of a file's contents serves every process that uses it.",
          ),
        ]),
        topic("paging", "Pages, frames and translation", [
          concept(
            "virt-vs-phys",
            "Virtual versus physical addresses",
            "Every address a program uses (every pointer you print) is virtual. The CPU translates it to a physical address on each access, using tables the kernel sets up. User code never sees a physical address.",
          ),
          concept(
            "pages-frames",
            "Pages and frames",
            "Virtual memory is cut into fixed-size pages and physical memory into frames of the same size: 4 KiB on x86-64 (some arm64 systems use 16 KiB or 64 KiB), shown by `getconf PAGESIZE`. Translation maps whole pages to whole frames; with 4 KiB pages the low 12 bits of an address are the offset inside the page and pass through unchanged.",
          ),
          concept(
            "pte",
            "Page table entries",
            "A page table maps a virtual page number to a frame number plus flag bits: present, writable, user-accessible, no-execute, accessed and dirty. The flags are how the hardware enforces read-only code and keeps user code out of kernel memory.",
          ),
          concept(
            "multi-level",
            "Why page tables are multi-level",
            "A flat table for a 48-bit address space with 4 KiB pages would need 2^36 entries, which is 512 GiB per process at 8 bytes each. x86-64 instead uses a tree of four levels, each indexed by 9 bits of the address (newer CPUs can add a fifth level for 57-bit addresses). Tables for unused regions do not exist, so a small process needs only a handful of table pages.",
          ),
          concept(
            "mmu",
            "The MMU and the page-table walk",
            "The MMU is the part of the CPU that translates addresses. On x86-64 the CR3 register points at the current process's top-level table and the hardware walks the levels itself. Switching to another process loads that process's table root, which is how the address space changes.",
          ),
          concept(
            "bad-access",
            "What the CPU does on an invalid access",
            "If the entry is missing or the access breaks its flags (a write to a read-only page, user code touching a kernel page), the CPU raises a page fault exception and hands control to the kernel, which either repairs the mapping or signals the process.",
          ),
          concept(
            "kernel-space",
            "The kernel's part of the address space",
            "The upper part of every address space is reserved for the kernel and cannot be accessed from user mode. User programs get the lower part: 128 TiB on x86-64 with four-level tables.",
          ),
        ]),
        topic("tlb", "The TLB and huge pages", [
          concept(
            "tlb",
            "The TLB",
            "Without a cache, every memory access would cost up to four extra memory reads for the table walk. The TLB caches virtual-to-physical page translations so the CPU does not walk the page table on every access. A TLB miss costs a multi-level table walk.",
          ),
          concept(
            "reach",
            "TLB reach",
            "Even the largest TLB level of a current x86-64 core holds only a few thousand entries, so with 4 KiB pages it covers on the order of 10 MiB of memory at once. A program that jumps randomly around a large heap misses constantly, and the cost shows up as nothing more specific than slow code.",
          ),
          concept(
            "flush",
            "TLB flushes and shootdowns",
            "Cached translations belong to one address space, so switching to another process must flush them or tag them with an address-space ID (PCID on x86-64). When a mapping is removed or its protection changes, the kernel must also invalidate it on every other CPU running that process, using inter-processor interrupts (a TLB shootdown).",
          ),
          concept(
            "huge-pages",
            "Huge pages",
            "x86-64 also supports 2 MiB and 1 GiB pages. One TLB entry covers 2 MiB instead of 4 KiB, so large heaps cause far fewer TLB misses, and each miss needs a shorter walk.",
          ),
          concept(
            "thp",
            "Explicit huge pages versus transparent huge pages",
            "On Linux, explicit huge pages are reserved in advance and requested with MAP_HUGETLB or hugetlbfs. Transparent huge pages (THP) let the kernel back ordinary anonymous memory with 2 MiB pages by itself, controlled by /sys/kernel/mm/transparent_hugepage/enabled (always, madvise, never). THP can inflate RSS when a huge page is only sparsely used and can add latency while the kernel compacts memory to find free 2 MiB runs, which is why some databases ask for it to be turned off.",
          ),
        ]),
        topic(
          "layout",
          "The layout of a process address space",
          [
            concept("regions", "The regions of a process", undefined, {
              parts: [
                concept(
                  "text",
                  "Text: the program's code",
                  "Machine code is mapped from the executable file, read-only and executable. Every process running the same binary shares the same physical pages.",
                ),
                concept(
                  "data-bss",
                  "Data and BSS: global variables",
                  "Initialised globals are mapped from the file privately, so a write gives the process its own copy of that page. Zero-initialised globals (BSS) take no space in the file and are backed by zero-filled memory.",
                ),
                concept(
                  "heap",
                  "The heap",
                  "The region after BSS that grows upward as the program break is moved. It is the traditional source of malloc memory.",
                ),
                concept(
                  "mmap-region",
                  "The mmap region",
                  "The large area between heap and stack where the kernel places mappings: shared libraries, mapped files, big malloc allocations and thread stacks.",
                ),
                concept(
                  "stack",
                  "The stack",
                  "The main thread's stack sits near the top of user space and grows downward automatically, one fault at a time, up to RLIMIT_STACK (commonly 8 MiB, shown by `ulimit -s`). Other threads get fixed-size stacks in the mmap region with a guard page below. Running past the limit or into a guard page is a stack overflow and ends in SIGSEGV.",
                ),
              ],
            }),
            concept(
              "vma",
              "Virtual memory areas (VMAs)",
              "The kernel records an address space as a set of VMAs: contiguous ranges that share one set of permissions and one backing (a file and offset, or nothing). Each line of /proc/<pid>/maps is one VMA. An address inside no VMA is invalid; an address inside a VMA may still have no physical page behind it yet.",
            ),
            concept(
              "aslr",
              "Address space layout randomisation",
              "Linux places the stack, the mmap region, the heap and position-independent executables at random offsets on every run, so an attacker cannot rely on known addresses. It is why the same pointer has a different value from one run to the next.",
            ),
          ],
          { links: [TLPI] },
        ),
        topic("faults", "Demand paging and page faults", [
          concept(
            "demand-paging",
            "Demand paging",
            "mmap and brk only create or extend a VMA: no physical frame is allocated and no page-table entry is filled in. A frame is allocated the first time each page is touched, so memory that is reserved but never touched costs no RAM.",
          ),
          concept(
            "handling",
            "How the kernel handles a page fault",
            "The CPU traps with the faulting address. The kernel looks up the VMA: if there is none, or the access is not permitted, it sends SIGSEGV. Otherwise it finds or allocates a frame, fills it (zeros, file contents or swapped-out data), installs the page-table entry and restarts the instruction. The program only notices the time it took.",
          ),
          concept(
            "minor-major",
            "Minor versus major faults",
            "A page fault is an access to a page with no valid mapping. Minor: the kernel can fix it without disk I/O (a zero-filled page, a file page already held in the page cache, the kernel's in-memory copy of file data, or a copy-on-write copy). Major: it must read from disk, either from a file or from swap, which is orders of magnitude slower.",
          ),
          concept(
            "zero-fill",
            "Zero-filled memory and the shared zero page",
            "Fresh anonymous memory always reads as zeros, so one process can never see another's old data. On Linux a first read maps a shared read-only zero page; the first write allocates a private zeroed frame.",
          ),
          concept(
            "segv-bus",
            "SIGSEGV versus SIGBUS",
            "SIGSEGV means the address is in no mapping or the mapping forbids the access. SIGBUS from a mapping usually means the mapping exists but nothing can back the page, typically an access beyond the end of a mapped file after the file was truncated.",
          ),
          concept(
            "prefault",
            "Prefaulting and locking pages",
            "MAP_POPULATE makes mmap fault the pages in up front, and mlock keeps pages in RAM so they cannot be swapped out or reclaimed. Latency-sensitive programs use them to pay the fault cost at start-up instead of during a request.",
          ),
        ]),
        topic(
          "mmap",
          "mmap",
          [
            concept(
              "call",
              "What mmap does",
              "mmap adds a mapping of a given length to the address space, with a protection (PROT_READ, PROT_WRITE, PROT_EXEC) and flags, and returns its start address. munmap removes it. Mappings are made of whole pages.",
            ),
            concept(
              "anonymous",
              "Anonymous mappings",
              "MAP_ANONYMOUS memory is backed by no file and starts as zeros. Heaps and stacks are anonymous memory. Under memory pressure its only way out of RAM is swap: disk space set aside for evicted anonymous pages.",
            ),
            concept(
              "file-backed",
              "File-backed mappings",
              "Mapping a file makes its page-cache pages appear in the address space. Reading the memory reads the file with no read() call and no copy into a user buffer; the cost moves from system calls to page faults.",
            ),
            concept(
              "private-shared",
              "MAP_PRIVATE versus MAP_SHARED",
              "With MAP_SHARED, writes change the shared page-cache pages: other processes mapping the file see them and the kernel later writes them back to the file (msync forces this). With MAP_PRIVATE, the first write to a page gives the process its own copy and the file is never changed.",
            ),
            concept(
              "combos",
              "The four kinds of mapping and what uses each",
              "Private file: program code and libraries. Shared file: memory-mapped file I/O and databases that map their data files. Private anonymous: malloc, heaps and stacks. Shared anonymous: memory shared between a parent and its forked children; on Linux it is implemented as shared memory (shmem), the same mechanism as tmpfs.",
            ),
            concept(
              "madvise",
              "mprotect and madvise",
              "mprotect changes the protection of a range (guard pages, JIT code). madvise tells the kernel how memory will be used: MADV_DONTNEED drops the pages of a private anonymous range at once, and MADV_FREE lets the kernel take them later if it needs memory, so those pages stay in RSS until then. This is how allocators and runtimes give memory back without unmapping it.",
            ),
          ],
          { links: [MMAP, TLPI] },
        ),
        topic("alloc", "brk, malloc and the heap", [
          concept(
            "brk",
            "brk: moving the end of the heap",
            "The program break is the end of the heap. brk and sbrk move it up or down, which only resizes the heap's VMA; the pages still arrive on first touch.",
          ),
          concept(
            "malloc",
            "malloc is a library, not a system call",
            "The allocator asks the kernel for large regions with brk or mmap and carves them into blocks, keeping freed blocks on free lists for reuse. Most malloc and free calls never enter the kernel.",
          ),
          concept(
            "large",
            "Large allocations get their own mapping",
            "glibc serves requests at or above a threshold with a separate mmap, which is unmapped and returned to the kernel on free. The threshold starts at 128 KiB and, by default, rises (up to 32 MiB on 64-bit systems) to the size of any larger mmapped block that is freed.",
          ),
          concept(
            "rss-after-free",
            "Why RSS does not drop after free",
            "Freed blocks return to the allocator's free lists, not to the kernel. Memory can only be handed back in whole pages (glibc shrinks the brk heap only from its free top end), and one live object can pin an otherwise empty page (fragmentation). RSS sitting at its high-water mark is therefore not proof of a leak; RSS that keeps climbing under a steady load is the signal.",
          ),
          concept(
            "allocators",
            "Other allocators and runtime heaps",
            "jemalloc and tcmalloc use size classes and per-thread or per-CPU caches to cut lock contention and fragmentation. glibc uses several arenas when there are many threads, which can raise RSS. Go and V8 do not use malloc for their managed heaps: they mmap memory directly and manage it with their own allocator and garbage collector.",
          ),
        ]),
        topic("cow", "Copy-on-write and fork", [
          concept(
            "cow",
            "Copy-on-write",
            "Two mappings share the same physical pages read-only; a write faults and gets a private copy. Used by fork, private file mappings and VM snapshots.",
          ),
          concept(
            "fork",
            "How fork uses copy-on-write",
            "fork copies the parent's page tables, not its pages, and marks private writable pages read-only in both processes. The first write by either one faults; the kernel copies that single page for the writer and makes it writable. fork's cost grows with the amount of mapped memory (the size of the page tables), but no page contents are copied until someone writes.",
          ),
          concept(
            "fork-exec",
            "fork followed by exec",
            "exec throws the copied address space away and builds a new one from the executable, so almost no pages are ever copied. This is what makes the fork-then-exec way of starting programs affordable.",
          ),
          concept(
            "snapshot",
            "Copy-on-write as a snapshot",
            "After fork the child sees memory frozen as it was at that instant while the parent keeps changing its own view. Redis uses this to write a snapshot to disk from a child process. Extra memory is needed for every page the parent modifies while the child lives, up to a full second copy in the worst case.",
          ),
        ]),
        topic("overcommit", "Overcommit", [
          concept(
            "lazy-alloc",
            "Why a 1 GB malloc returns instantly",
            "The kernel only reserves address space. Physical pages are allocated lazily on first touch (demand paging), and Linux overcommits by default, so the call succeeds even on a machine with little free memory.",
          ),
          concept(
            "meaning",
            "What overcommit means",
            "Linux lets the total memory it has promised exceed RAM plus swap, betting that programs do not touch everything they ask for (sparse allocations, forked copies that are never written). The consequence is that malloc almost never returns NULL: running out of memory shows up later, at page-fault time, as an OOM kill rather than as a failed allocation.",
          ),
          concept(
            "modes",
            "The vm.overcommit_memory modes",
            "0 (the default) is a heuristic that refuses only obviously excessive requests. 1 always allows. 2 is strict: total commitments are capped at swap plus vm.overcommit_ratio percent of RAM, and allocations beyond that fail with ENOMEM. CommitLimit and Committed_AS in /proc/meminfo show the cap and the current total.",
          ),
        ]),
        topic("measure", "Measuring a process's memory", [
          concept(
            "vsz",
            "VSZ: virtual size",
            "VSZ is all virtual address space the process has mapped, touched or not. A process can map far more than it uses, so VSZ says almost nothing about the RAM it consumes.",
          ),
          concept(
            "rss",
            "RSS: resident set size",
            "RSS is the part currently backed by physical pages: anonymous memory plus the file-backed and shared-memory pages the process has mapped (RssAnon, RssFile and RssShmem in /proc/<pid>/status). Shared pages are counted in full in every process, so adding up RSS across processes counts them several times.",
          ),
          concept(
            "pss",
            "PSS: proportional set size",
            "Private pages plus each shared page divided by the number of processes sharing it. Summing PSS across processes does not double count.",
          ),
          concept(
            "uss",
            "USS: unique set size",
            "USS is only the pages private to the process (Private_Clean plus Private_Dirty in smaps). It is the memory that would be freed if the process exited.",
          ),
          concept(
            "maps",
            "Reading /proc/<pid>/maps",
            "Each line is one mapping: address range, permissions (r, w, x, then p for private or s for shared), file offset, device, inode and path. You can pick out the program's text and data, the libraries, [heap], [stack] and the anonymous mappings that have no name.",
          ),
          concept(
            "smaps",
            "Reading smaps and smaps_rollup",
            "smaps repeats each mapping with its Size, Rss, Pss, Shared_Clean, Shared_Dirty, Private_Clean, Private_Dirty, Anonymous and Swap; smaps_rollup gives the totals for the whole process. You can split a process's memory into anonymous and file-backed, and say which part is private dirty memory that could only be evicted to swap.",
          ),
          concept(
            "tools",
            "ps, top and pmap",
            "`ps -o vsz,rss` and top's VIRT and RES columns show VSZ and RSS; top's SHR is the file-backed and shared-memory part of RSS. `pmap -x <pid>` prints the per-mapping view.",
          ),
          concept(
            "fault-counts",
            "Counting page faults",
            "Fields 10 and 12 of /proc/<pid>/stat are the minor and major fault counts, `ps -o min_flt,maj_flt` prints them, and `perf stat -e page-faults,minor-faults,major-faults` counts them for a command.",
          ),
          concept(
            "page-tables",
            "The memory used by page tables",
            "Page tables are kernel memory on top of RSS: VmPTE in /proc/<pid>/status per process and PageTables in /proc/meminfo in total. Many processes each mapping the same large shared region with 4 KiB pages can spend gigabytes on page tables alone, because every process needs its own tables.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "faults",
            "Watch pages become real",
            "Write a Go program that mmaps 1 GB of anonymous memory, then touches one page every few milliseconds. Watch VSZ stay flat while RSS climbs (in 2 MiB jumps if transparent huge pages are set to always). Count minor faults with `perf stat -e page-faults` and /proc/<pid>/stat. Repeat with a file-backed mapping.",
            {
              doneWhen: [
                "VSZ and RSS over time while pages are touched",
                "Fault counts for the anonymous and the file-backed run",
              ],
              links: [MMAP],
            },
          ),
          build(
            "smaps",
            "Read a real process's memory map",
            "For a running Node server, read /proc/<pid>/smaps_rollup and smaps. Separate anonymous from file-backed memory, find the V8 heap, and explain RSS vs PSS vs shared. Compare with what `top` and `docker stats` report.",
            { doneWhen: ["A table of the largest mappings and what each one is"] },
          ),
        ]),
      ],
      {
        detail:
          "Why addresses are a fiction, how the CPU and the kernel keep that fiction up one page at a time, and how to measure what a process really uses.",
        links: [OSTEP, TLPI],
      },
    ),

    topic(
      "cache",
      "Page cache and swap",
      [
        topic("page-cache", "The page cache", [
          concept(
            "what",
            "What the page cache is and why it exists",
            "Storage is far slower than RAM, and unused RAM does nothing. The page cache is memory holding file contents so repeated reads and buffered writes avoid the disk. It grows to fill unused RAM and is reclaimed under pressure.",
          ),
          concept(
            "shared",
            "One cache shared by read, write and mmap",
            "Cached pages are indexed by file and offset, not by process. Every process that reads a file, and every mapping of it, uses the same physical pages.",
          ),
          concept(
            "read",
            "A buffered read and readahead",
            "read() copies from the page cache into the caller's buffer; on a miss the kernel first reads the data from disk into the cache while the caller waits. When it detects sequential access the kernel reads ahead of the application, so sequential reads rarely wait and random reads often do.",
          ),
          concept(
            "write",
            "A buffered write",
            "write() copies the data into the page cache, marks those pages dirty and returns. Nothing has reached the disk yet, so a crash or power loss can lose data that write() already reported as written.",
          ),
          concept(
            "dirty",
            "Dirty pages",
            "Page-cache pages modified in memory but not yet written to disk. They are flushed by writeback or by an explicit fsync, which returns only once the file's data has been written to the storage device. Dirty and Writeback in /proc/meminfo show how much is waiting and how much is being written right now.",
          ),
          concept(
            "writeback",
            "Writeback and write throttling",
            "Kernel flusher threads write dirty pages out once they are old enough (vm.dirty_expire_centisecs, 30 seconds by default) or once dirty memory passes a background threshold (vm.dirty_background_ratio). Past a higher threshold (vm.dirty_ratio) the processes calling write() are made to wait, so a writer that is faster than the disk is eventually slowed to disk speed.",
          ),
          concept(
            "direct",
            "Buffered versus direct I/O",
            "Opening a file with O_DIRECT bypasses the page cache: data moves straight between the program's buffer and the device, and buffers, offsets and lengths must be aligned. Databases that keep their own buffer pool use it to avoid holding every page twice. O_DIRECT by itself does not make writes durable.",
          ),
          concept(
            "shmem",
            "tmpfs and shared memory live in the page cache",
            "Files on a tmpfs (including /dev/shm) and shared anonymous memory are counted as cache (Shmem in /proc/meminfo, 'shared' in `free`), but they have no disk file behind them. They cannot be dropped, only swapped, so not all of 'buff/cache' is reclaimable.",
          ),
          concept(
            "inspect",
            "fincore and drop_caches",
            "`fincore <file>` shows how much of a file is in the page cache. Writing 1 to /proc/sys/vm/drop_caches drops clean page cache, 2 drops reclaimable kernel objects such as dentries and inodes, 3 drops both. Dirty pages are not dropped, so run sync first. It is a tool for experiments, not for tuning.",
          ),
        ]),
        topic("free", "Free versus available memory", [
          concept(
            "columns",
            "Reading `free`",
            "total is usable RAM; free is memory used for nothing at all; buff/cache is the page cache, buffers and reclaimable kernel slab; shared is mostly tmpfs and shared memory; available is the kernel's estimate of what new work can get without swapping; used is total minus available in current procps (older versions printed total minus free minus buff/cache).",
          ),
          concept(
            "available",
            "Why 'available' is the number to watch",
            "'free' excludes page cache, which the kernel can reclaim on demand. 'available' (MemAvailable in /proc/meminfo) estimates what applications can get without swapping. A healthy long-running host shows little free memory because cache has filled it; that is not a shortage.",
            { links: [link("Linux ate my RAM", "https://www.linuxatemyram.com/")] },
          ),
          concept(
            "meminfo",
            "Reading /proc/meminfo",
            "You can find MemTotal, MemFree and MemAvailable; Buffers (cached block-device data such as filesystem metadata) and Cached (file data, including Shmem); AnonPages; Active and Inactive for anon and file; Dirty and Writeback; SwapTotal and SwapFree; and Slab with its SReclaimable and SUnreclaim parts.",
          ),
          concept(
            "kernel-mem",
            "Memory the kernel uses for itself",
            "Slab caches (kernel objects such as dentries and inodes), page tables, kernel stacks and network buffers are RAM that belongs to no process's RSS. When RSS plus cache does not add up to the memory in use, the rest is here; `slabtop` shows the slab part.",
          ),
        ]),
        topic(
          "reclaim",
          "Reclaim",
          [
            concept(
              "candidates",
              "What can be reclaimed, and at what cost",
              "Clean file pages can be dropped at once and re-read later. Dirty file pages must be written back first. Anonymous pages can only be freed by writing them to swap, so with no swap they cannot be reclaimed at all. Locked pages and most kernel memory cannot be reclaimed.",
            ),
            concept(
              "lru",
              "The LRU lists",
              "The kernel keeps pages on active and inactive lists, separately for anonymous and file pages. A page that is referenced again is promoted to active; reclaim takes pages from the tail of the inactive lists and refills them by demoting active pages. It approximates 'least recently used' from the accessed bit in the page table instead of tracking every access. Kernels since 6.1 can use the multi-generational LRU (MGLRU) instead, which sorts pages into several generations by age.",
            ),
            concept(
              "buddy",
              "The page allocator: zones, orders and fragmentation",
              "Linux manages free physical memory per NUMA node and per zone (such as DMA32 and Normal) and hands it out in power-of-two blocks: an order-n allocation is 2^n contiguous pages, so order 0 is a single page. As free memory fragments into small blocks, a high-order request can stall or fail while plenty of single pages are free. /proc/buddyinfo shows the free blocks of each order.",
            ),
            concept(
              "numa",
              "NUMA nodes",
              "On a multi-socket machine each socket has its own memory (a NUMA node), and memory on another node is slower to reach. Linux prefers the node of the CPU a thread is running on and falls back to other nodes when that one is short. A process bound to one node (numactl --membind, cpusets) can hit reclaim or an OOM kill while other nodes have free memory; `numactl --hardware` and `numastat` show per-node figures.",
            ),
            concept(
              "kswapd",
              "Watermarks and kswapd",
              "Each memory zone has min, low and high watermarks of free pages, derived from vm.min_free_kbytes. When free memory falls below low, the kswapd kernel thread wakes and reclaims in the background until free memory is back above high. Applications do not wait for kswapd.",
            ),
            concept(
              "direct",
              "Direct reclaim",
              "When allocations outrun kswapd and free memory falls to the min watermark, a thread that asks for memory must itself scan and free pages before its allocation returns. The latency lands on whichever thread happened to allocate, including one that is not using much memory.",
            ),
            concept(
              "compaction",
              "Compaction",
              "Compaction moves movable pages together so that free pages form larger contiguous blocks. It runs in the background (kcompactd) and also directly in a task that needs a high-order block such as a 2 MiB huge page, which is another source of allocation latency.",
            ),
            concept(
              "working-set",
              "The working set",
              "The working set is the set of pages a workload must touch over a short interval to make progress. Memory is healthy while the working sets of everything running fit in RAM. RSS is not the working set: it can contain cold pages nobody has touched for hours.",
            ),
            concept(
              "refault",
              "Refaults",
              "A refault is a fault on a page that was recently evicted. A rising refault rate (the workingset_refault counters in /proc/vmstat) means reclaim is evicting pages that are still needed, which is the measurable start of thrashing.",
            ),
            concept(
              "no-swap",
              "Reclaim on a host with no swap",
              "With no swap all reclaim pressure falls on file pages, including the executable code of running programs. Under memory shortage the host can spend its time re-reading its own code from disk long before the OOM killer acts.",
            ),
          ],
          { links: [DOWN_TALK] },
        ),
        topic(
          "swap",
          "Swap and thrashing",
          [
            concept(
              "what",
              "What swap is",
              "Swap is disk space (a partition or a file) where the kernel can write anonymous pages so their frames can be reused. Touching a swapped-out page is a major fault that reads it back in.",
            ),
            concept(
              "case-for",
              "The case for keeping some swap",
              "Swap gives the kernel a place for cold anonymous pages, making reclaim fairer between file and anonymous memory and pressure more gradual, rather than keeping only file pages reclaimable. It is a reclaim mechanism for cold anonymous memory, not spare RAM for emergencies.",
            ),
            concept(
              "swappiness",
              "vm.swappiness",
              "swappiness tells reclaim how costly swapping anonymous pages is relative to dropping file pages: the default is 60, 100 treats the two as equal, and lower values favour reclaiming file pages. Current kernels accept 0 to 200 (older ones stopped at 100); values above 100 favour swapping and suit swap that is faster than the filesystem, such as zram. It is not a percentage of memory use at which swapping begins, and 0 does not turn swap off.",
            ),
            concept(
              "compressed",
              "Compressed swap: zram and zswap",
              "zram is a compressed block device held in RAM, commonly used as the swap device itself. zswap is a compressed in-RAM cache in front of a disk swap device that writes its coldest pages through to the disk. Both spend CPU to avoid disk I/O, so a host can evict cold anonymous memory without fast swap storage.",
            ),
            concept(
              "used-vs-active",
              "Swap in use versus swapping activity",
              "Swap space in use only means cold pages were parked there at some point. The harmful signal is sustained swap-in and swap-out (si and so in vmstat), which means pages are being evicted and then needed again.",
            ),
            concept(
              "thrashing",
              "Thrashing",
              "The working set no longer fits, so the system spends its time evicting and re-reading pages it needs again immediately. Throughput collapses.",
            ),
          ],
          { links: [link("In defence of swap", "https://chrisdown.name/2018/01/02/in-defence-of-swap.html")] },
        ),
        topic("observe", "Observing memory on a host", [
          concept(
            "vmstat",
            "vmstat 1",
            "You can read free, buff and cache, the swap-in and swap-out rates (si, so), block I/O (bi, bo) and the b column of blocked tasks, and you know the first line is an average since boot. Sustained non-zero si and so means the host is swapping.",
          ),
          concept(
            "proc-vmstat",
            "The /proc/vmstat counters",
            "pgfault and pgmajfault count faults, pgscan_kswapd and pgscan_direct count pages scanned by background and direct reclaim, the pgsteal counters count pages actually reclaimed, pswpin and pswpout count swap traffic, and oom_kill counts kills. They are totals since boot, so you compare two samples.",
          ),
          concept(
            "sar-b",
            "sar -B",
            "sar -B reports paging rates per second over time: fault/s and majflt/s, pgscank/s (scanned by kswapd), pgscand/s (scanned by direct reclaim) and pgsteal/s (reclaimed). A non-zero pgscand/s means applications are paying for reclaim themselves.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "page-cache",
            "The page cache in action",
            "Record `free -m`. Read a 2 GB file twice and time both reads. Record `free -m` again and check the file with fincore. Drop caches and repeat. Then write a large file and watch Dirty and Writeback in /proc/meminfo drain.",
            {
              doneWhen: [
                "`free -m` before, after reading, and after drop_caches, with the 'available' column explained",
                "First vs second read timing",
              ],
            },
          ),
        ]),
      ],
      {
        detail: "Why free memory is wasted memory, how the kernel takes memory back, and what it looks like when it cannot.",
        links: [SYSPERF],
      },
    ),

    topic(
      "limits",
      "Limits and pressure",
      [
        topic(
          "cgroup",
          "The cgroup v2 memory controller",
          [
            concept(
              "why",
              "Why per-group limits exist",
              "Without them one workload can consume a host's memory and push every other workload into reclaim or an OOM kill. A cgroup lets the kernel account and limit memory for a group of processes. A container's memory limit is a cgroup memory limit and nothing more.",
            ),
            concept(
              "files",
              "A cgroup is a directory of files",
              "Under /sys/fs/cgroup, mkdir creates a cgroup, writing a PID to its cgroup.procs moves a process in, and the parent's cgroup.subtree_control decides which controllers the children get. /proc/<pid>/cgroup shows which cgroup a process is in. A limit applies to the whole subtree below the cgroup it is set on.",
            ),
            concept("charged", "What is charged to a cgroup", undefined, {
              parts: [
                concept(
                  "anon",
                  "Anonymous memory",
                  "Heap, stack and other anonymous pages of every process in the cgroup are charged to it. Swap used by the cgroup is accounted and limited separately (memory.swap.current, memory.swap.max).",
                ),
                concept(
                  "file",
                  "Page cache",
                  "Page cache counts against memory.max: file pages read or written by the cgroup are charged to it. But they are reclaimable, so the kernel evicts them before resorting to an OOM kill.",
                ),
                concept(
                  "shmem",
                  "tmpfs and shared memory",
                  "Files written to a tmpfs (/dev/shm, a memory-backed volume) are charged as memory and cannot be reclaimed without swap. Filling a tmpfs inside a container can get it OOM-killed.",
                ),
                concept(
                  "kernel",
                  "Kernel memory",
                  "Kernel memory used on the cgroup's behalf is charged too: kernel stacks, page tables, slab objects such as dentries and inodes, and socket buffers.",
                ),
                concept(
                  "first-touch",
                  "Who pays for a shared page",
                  "A page is charged to the cgroup that first brought it into memory and stays charged there until it is freed. A file read by two containers is billed to whichever touched it first, and moving a process to another cgroup does not move the memory it already charged.",
                ),
              ],
            }),
            concept(
              "current",
              "memory.current",
              "The total currently charged to the cgroup and its descendants, including page cache and kernel memory. This is the number the limits are compared against; it is not the sum of the processes' RSS.",
            ),
            concept(
              "max",
              "memory.max: the hard limit",
              "When usage reaches memory.max the allocating task must first reclaim memory from the cgroup before its allocation can proceed. If reclaim cannot keep usage under the limit, the OOM killer is invoked inside the cgroup.",
            ),
            concept(
              "high",
              "memory.high: the throttle",
              "memory.high is a throttle: above it the cgroup's tasks are forced into reclaim and slowed, and it never invokes the OOM killer, so under extreme load usage can go past it. memory.max is a hard limit: exceeding it after reclaim fails triggers the OOM killer. A workload held at memory.high degrades gradually instead of dying.",
            ),
            concept(
              "protect",
              "memory.min and memory.low: protection",
              "These work in the other direction: memory.min is an amount the kernel will not reclaim from the cgroup, and memory.low is protected on a best-effort basis while other cgroups still have unprotected memory to give.",
            ),
            concept(
              "stat",
              "memory.stat",
              "The breakdown of what is charged: anon, file, shmem, kernel_stack, pagetables, sock and slab, the active and inactive list sizes, and counters such as pgfault, pgmajfault, pgscan and pgsteal (pages scanned and reclaimed in this cgroup, split into kswapd and direct on newer kernels) and the workingset_refault pair. You can tell whether a cgroup near its limit is mostly reclaimable cache or mostly anonymous memory, and whether it is being reclaimed.",
            ),
            concept(
              "events",
              "memory.events",
              "Counters of limit events: 'high' counts the times the cgroup was throttled for exceeding memory.high, 'max' the times usage was about to go over memory.max, 'oom' the times the limit was reached and an allocation was about to fail, and 'oom_kill' the processes in the cgroup killed by the OOM killer. The counts include descendant cgroups; memory.events.local counts this cgroup alone.",
            ),
            concept(
              "containers",
              "How container limits map to these files",
              "`docker run --memory` and a Kubernetes container memory limit both become memory.max on the container's cgroup. On a cgroup v1 host the equivalent files are memory.limit_in_bytes and memory.usage_in_bytes; `stat -fc %T /sys/fs/cgroup` printing cgroup2fs tells you the host uses v2.",
            ),
          ],
          { links: [CGROUP] },
        ),
        topic("oom", "The OOM killer", [
          concept(
            "why",
            "Why the kernel kills processes",
            "With overcommit the kernel has promised more memory than it can deliver, and the shortage appears at a page fault, where there is no error code to return. When reclaim cannot free enough, the only way left to free memory is to kill a process.",
          ),
          concept(
            "scope",
            "Global OOM versus cgroup OOM",
            "A global OOM means the whole host is out of memory and swap, and any process may be chosen. A cgroup OOM means one cgroup hit memory.max and reclaim failed: only processes in that cgroup are candidates, and the host may have gigabytes free.",
          ),
          concept(
            "score",
            "How a victim is chosen",
            "By oom_score: roughly the process's share of the memory it is allowed to use (resident memory, swap and page tables), adjusted by oom_score_adj. The highest score dies; the host's init process and kernel threads are never chosen. /proc/<pid>/oom_score shows the current value.",
          ),
          concept(
            "adj",
            "oom_score_adj",
            "A per-process value from -1000 to +1000 in /proc/<pid>/oom_score_adj, inherited by children. -1000 exempts a process, +1000 makes it the preferred victim. Kubernetes sets it from a pod's QoS class so that BestEffort pods are killed before Guaranteed ones.",
          ),
          concept(
            "sigkill",
            "The kill is SIGKILL, and exit code 137",
            "The victim gets SIGKILL, which cannot be caught: no handler runs, nothing is flushed and no shutdown hook fires. Shells and container runtimes report a process killed this way as exit code 137: 128 plus 9, the number of SIGKILL.",
          ),
          concept(
            "one-process",
            "One process dies, not the container",
            "By default the kernel kills a single process. If the victim is a worker and not the container's main process, the container keeps running with a missing child and no exit code 137. Setting memory.oom.group to 1 makes the kernel kill every process in the cgroup together (except any with oom_score_adj -1000). On cgroup v2 nodes the Kubernetes kubelet sets it on every container by default, so there the whole container dies.",
          ),
          concept(
            "confirm",
            "Confirming an OOM kill",
            "Check the cgroup's memory.events (oom_kill counter), the kernel log (dmesg), and the container's exit code 137. Docker records it as OOMKilled in `docker inspect`, and Kubernetes shows the reason OOMKilled on the container's last state.",
          ),
          concept("report", "Reading the OOM report in dmesg", undefined, {
            parts: [
              concept(
                "trigger",
                "The 'invoked oom-killer' line",
                "The first line names the task whose allocation could not be satisfied, with the allocation flags and order. That task is the trigger, not necessarily the victim.",
              ),
              concept(
                "scope-line",
                "Global or cgroup, and the limit that was hit",
                "For a cgroup OOM the report shows the cgroup's usage and limit, and the kill line reads 'Memory cgroup out of memory: Killed process ...'. For a global OOM the kill line reads 'Out of memory: Killed process ...' and the report prints the host's memory state (Mem-Info) instead. The 'oom-kill:constraint=' line states it directly: CONSTRAINT_MEMCG for a cgroup limit, CONSTRAINT_NONE for the whole host.",
              ),
              concept(
                "task-table",
                "The task table",
                "One row per candidate process with pid, uid, tgid, total_vm, rss (recent kernels add rss_anon, rss_file and rss_shmem), pgtables_bytes, swapents, oom_score_adj and name. total_vm, the rss columns and swapents are counted in pages, not bytes, so multiply by the page size.",
              ),
              concept(
                "killed",
                "The 'Killed process' line",
                "It gives the victim's pid and name with total-vm, anon-rss, file-rss and shmem-rss in kB. A large anon-rss points at heap growth; a large shmem-rss points at tmpfs or shared memory.",
              ),
            ],
          }),
        ]),
        topic(
          "psi",
          "Pressure stall information (PSI)",
          [
            concept(
              "why",
              "Why usage numbers cannot show pressure",
              "A host at 95% memory use may be perfectly healthy (most of it is cache) or barely functioning. What matters is whether tasks are losing time waiting for memory, and PSI measures exactly that lost time.",
            ),
            concept(
              "slow-idle",
              "A slow service with idle CPUs",
              "Its threads are stalled, not running your code: waiting for pages to be read back in from disk, waiting on writeback during direct reclaim, or put to sleep by the memory.high throttle. Blocked threads use no CPU, so utilisation looks low while latency climbs. CPU graphs cannot show this; memory pressure does.",
            ),
            concept(
              "stall",
              "What counts as a memory stall",
              "Time a task spends in direct reclaim, waiting for a recently evicted page to be read back in, compacting memory, or throttled for exceeding memory.high.",
            ),
            concept(
              "some-full",
              "'some' and 'full'",
              "'some': share of time at least one task was stalled on memory. 'full': share of time all non-idle tasks were stalled at once, meaning no useful work happened.",
            ),
            concept(
              "windows",
              "avg10, avg60, avg300 and total",
              "Each line gives the percentage of wall-clock time stalled over the last 10, 60 and 300 seconds, plus total, the cumulative stall time in microseconds. Compare two readings of total for an exact figure over any interval.",
            ),
            concept(
              "files",
              "Where to read pressure",
              "/proc/pressure/memory covers the whole host (cpu and io sit beside it), and each cgroup v2 directory has memory.pressure, cpu.pressure and io.pressure in the same format. You can tell which container is stalling, not only that the host is. If the files are missing, PSI is compiled out or switched off at boot (the psi=1 kernel parameter turns it on).",
            ),
            concept(
              "triggers",
              "PSI triggers and user-space OOM killers",
              "A program can write a threshold (for example 150 ms of stall in any 1 s window) to a pressure file and poll it to be notified. systemd-oomd uses pressure to kill a whole cgroup while the host is still responsive; the kernel OOM killer acts only after reclaim has failed completely, which can be minutes into thrashing.",
            ),
            concept(
              "triage",
              "Reading the signals in order",
              "For a slow or killed workload you can check memory.events for oom_kill and high, memory.pressure for stalls, memory.stat for whether the memory is anon, file or shmem and for the cgroup's own pgscan, pgsteal and pgmajfault, and pgscan_direct and pgmajfault in /proc/vmstat for host-wide direct reclaim and major faults. On many kernels the /proc/vmstat scan counters leave out reclaim caused by a cgroup's own limit, so a throttled container is judged from its memory.stat.",
            ),
          ],
          { links: [PSI, DOWN_TALK] },
        ),
        topic("below-limit", "Why a container is killed below its heap limit", [
          concept(
            "non-heap",
            "The heap is only part of a process",
            "A runtime also uses memory outside its managed heap: its own code and JIT output, garbage-collector metadata, thread stacks, buffers allocated natively, mapped files and allocator fragmentation. RSS is always larger than the heap figure the runtime reports.",
          ),
          concept(
            "cgroup-extra",
            "The cgroup counts more than one process",
            "memory.current also includes page cache from file I/O, tmpfs files, kernel memory such as socket buffers and page tables, and every other process in the container, including child processes and anything started with exec.",
          ),
          concept(
            "dashboards",
            "Why dashboards disagree",
            "top shows per-process RSS. `docker stats` shows cgroup usage minus inactive file cache. The Kubernetes working-set metric is also usage minus inactive file pages. memory.current is all of it. None of these is the heap number in your application metrics, so 'killed at 60%' usually means 60% on the wrong gauge.",
          ),
          concept(
            "spikes",
            "Spikes between samples",
            "A metric scraped every few tens of seconds misses an allocation burst that lasts one second. The kernel enforces the limit at every allocation, so the graph can show a flat line well below the limit right up to the kill. memory.events records what the graph missed, and so does memory.peak, the cgroup's high-water mark (Linux 5.19 and later).",
          ),
          concept(
            "runtime-blind",
            "A process full of garbage can still be killed",
            "A garbage-collected runtime sizes its heap from its own heuristics, which may not take the cgroup limit into account unless it is told (GOMEMLIMIT, --max-old-space-size), so it may not collect in time. A Go or Node process can be OOM-killed while much of its heap is garbage waiting for a collection.",
          ),
          concept(
            "eviction",
            "Kubernetes eviction is not an OOM kill",
            "When a node's own available memory (capacity minus working set) falls below the kubelet's eviction threshold, 100Mi by default, the kubelet terminates whole pods to protect the node, starting with those using more than they requested, even if no container reached its limit. The pod shows the reason Evicted, not OOMKilled, and no kernel OOM report exists.",
          ),
        ]),
        topic("runtimes", "Making runtimes respect the limit", [
          concept(
            "headroom",
            "Why a garbage-collected heap overshoots its live data",
            "Garbage is only freed when a collection runs, so between collections the heap holds live data plus everything discarded since the last cycle. The collector decides when to run from a heap-growth target, not from how close the container is to its limit.",
          ),
          concept(
            "gogc",
            "Go: GOGC",
            "With the default GOGC=100 the next collection starts when the heap has grown by about 100% over the live heap left by the previous one, so peak heap is roughly twice the live data, whatever the container limit is.",
          ),
          concept(
            "gomemlimit",
            "Go: GOMEMLIMIT",
            "GOMEMLIMIT (Go 1.19 and later) sets a soft limit on the total memory the Go runtime manages; as usage approaches it the collector runs more often regardless of GOGC. It is soft: if live data exceeds it the program keeps running, the collector's CPU use is capped at roughly 50%, and memory grows past the limit. It does not cover memory outside the Go runtime (C allocations through cgo, memory the program maps itself, kernel memory), so it is set somewhat below the container limit. There is no limit by default: the runtime does not derive one from the cgroup.",
          ),
          concept(
            "node-heap",
            "Node: --max-old-space-size",
            "The flag sets the maximum size of V8's old generation in MiB. Near the cap V8 collects more aggressively, and if it cannot free enough the process aborts with 'JavaScript heap out of memory' and a stack trace, which is far easier to diagnose than a SIGKILL. If the cap is set too high for the container, garbage can pile up until the kernel kills the process first.",
          ),
          concept(
            "node-external",
            "Node memory outside the old space",
            "Buffers and ArrayBuffers are allocated outside the V8 heap, and the young generation, thread stacks and native addons are not covered by the old-space cap either. `process.memoryUsage()` reports rss, heapTotal, heapUsed, external and arrayBuffers so you can see the gap.",
          ),
          concept(
            "jvm",
            "JVM: container support and MaxRAMPercentage",
            "Modern JVMs read the cgroup limit (container support, on by default since JDK 10; cgroup v2 is understood from JDK 15) and by default cap the heap at a quarter of it (for all but very small limits); -Xmx or -XX:MaxRAMPercentage changes that. The heap is not the JVM's only memory: metaspace, the JIT code cache, thread stacks and direct buffers come on top, so a heap as large as the container limit ends in an OOM kill.",
          ),
          concept(
            "rule",
            "Sizing the heap limit against the container limit",
            "Measure the non-heap part under real load (memory.current and RSS minus the heap the runtime reports), then set the runtime's heap limit to the container limit minus that part minus a safety margin. The aim is for the runtime to collect, or fail with its own clear error, before the kernel has to kill it.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "cgroup-oom",
            "Trigger a cgroup OOM kill",
            "Create a cgroup with memory.max=100M by hand (no Docker), and set memory.swap.max to 0 so the allocator cannot escape into swap. Run a Python allocator inside it until it is killed. Then run a process that only reads a big file: show the page cache is charged to the cgroup but reclaimed instead of causing a kill.",
            {
              doneWhen: [
                "memory.events before and after, showing oom_kill increment",
                "The kernel's OOM report from dmesg, annotated",
              ],
            },
          ),
          build(
            "psi-stall",
            "Stall a service with idle CPUs",
            "Run a service whose working set is about 400 MB in a cgroup with memory.high set to 300M. Load it at a steady rate. Record request latency, CPU utilisation, memory.pressure (some and full), the 'high' counter in memory.events and pgscan and pgsteal from the cgroup's memory.stat. Raise memory.high and watch it recover.",
            {
              doneWhen: [
                "memory.pressure and the cgroup's pgscan and pgsteal during the stall",
                "Latency and CPU with and without pressure, and a note on why CPU looked fine",
              ],
            },
          ),
          build(
            "oom-score",
            "Predict the OOM killer's victim",
            "On a small VM with swap off, run three memory hogs with different oom_score_adj values and exhaust memory. Predict the victim from /proc/<pid>/oom_score first. Then protect one process with oom_score_adj=-1000 and see what dies instead.",
            { doneWhen: ["oom_score values, your prediction, and the dmesg line naming the victim"] },
          ),
          build(
            "runtime-limits",
            "Make runtimes respect the container",
            "In a 256 MB cgroup, run a Go service with and without GOMEMLIMIT, and a Node service with and without --max-old-space-size, each under an allocation-heavy load. Show which configurations get OOM-killed and which collect garbage in time.",
            {
              doneWhen: [
                "For each of the four runs: peak RSS, GC activity, killed or survived",
                "The rule you would now set for heap limits relative to the container limit",
              ],
            },
          ),
          build(
            "writeup",
            "Write-up: why my container was killed at 60% memory",
            "Explain, with your own outputs, what a cgroup memory limit counts (anonymous, page cache, kernel memory), why dashboards disagree, and how to read memory.events and memory.pressure.",
            { doneWhen: ["A link to the published write-up"] },
          ),
          build(
            "postmortems",
            "Read two memory postmortems",
            "From Dan Luu's collection, pick two outages involving memory exhaustion, swap or OOM kills. For each, write down what ran out, how it showed up, and what would have caught it earlier.",
            {
              doneWhen: ["Three lines per postmortem in your notes"],
              links: [link("Collection of postmortems", "https://github.com/danluu/post-mortems")],
            },
          ),
        ]),
      ],
      {
        detail:
          "What a container memory limit really counts, the slow death before an OOM kill, and how to make a runtime live inside its limit.",
        links: [CGROUP, SYSPERF],
      },
    ),
  ],
);
