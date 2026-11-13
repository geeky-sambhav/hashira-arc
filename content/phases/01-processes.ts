import { cards, lab, link, note, output, paid, read, url } from "../dsl";
import type { Phase } from "../types";

const TLPI = paid("The Linux Programming Interface (Kerrisk)", "https://man7.org/tlpi/");
const OSTEP = link("Operating Systems: Three Easy Pieces", "https://pages.cs.wisc.edu/~remzi/OSTEP/");

export const phase: Phase = {
  id: "processes",
  label: "Phase 1",
  title: "Processes and the operating system",
  summary:
    "What a process actually is: an address space, file descriptors, and a slot in the scheduler. This is the layer every container, sandbox and runtime is built from.",
  weeks: { start: 4, end: 7 },
  pillar: "os",
  modules: [
    {
      id: "os-syscalls-fds",
      title: "System calls and file descriptors",
      summary: "Week 4. The boundary between your program and the kernel.",
      items: [
        read("os-ostep-processes", "OSTEP: processes and the process API", {
          week: 4,
          hours: 5,
          source: "OSTEP",
          chapters: "Ch. 4-6: The Process, Process API, Limited Direct Execution",
          links: [OSTEP],
        }),
        read("os-tlpi-fileio", "TLPI: system calls and file I/O", {
          week: 4,
          hours: 9,
          source: "The Linux Programming Interface",
          chapters: "Ch. 3-5: system programming concepts, file I/O, file descriptors and open file descriptions",
          links: [TLPI],
        }),
        lab("os-proc-spelunking", "Process spelunking with strace and /proc", {
          week: 4,
          hours: 6,
          brief:
            "Run `strace -f` on `ls`, on a Node hello-world and on your Go HTTP server. For the running server, read /proc/<pid>/maps, /proc/<pid>/fd, /proc/<pid>/status and /proc/<pid>/limits. Open the same file twice and via dup() and show which share an offset.",
          evidence: [
            output("strace", "Annotated strace of one HTTP request to your Go server"),
            output("fds", "`ls -l /proc/<pid>/fd` with each descriptor explained"),
            note("dup", "What you observed about shared file offsets with dup vs a second open"),
          ],
          links: [link("strace man page", "https://man7.org/linux/man-pages/man1/strace.1.html"), link("proc(5)", "https://man7.org/linux/man-pages/man5/proc.5.html")],
        }),
      ],
    },
    {
      id: "os-process-lifecycle",
      title: "fork, exec, wait and signals",
      summary: "Weeks 5-6. How processes are born, replaced, reaped and interrupted.",
      items: [
        read("os-tlpi-processes", "TLPI: process creation, termination and exec", {
          week: 5,
          hours: 10,
          source: "The Linux Programming Interface",
          chapters: "Ch. 6 (processes), 24-27 (fork, exit, wait, exec)",
          links: [TLPI],
        }),
        read("os-tlpi-signals", "TLPI: signals", {
          week: 5,
          hours: 7,
          source: "The Linux Programming Interface",
          chapters: "Ch. 20-22: signal concepts, handlers, advanced features",
          links: [TLPI],
        }),
        read("os-tlpi-pipes", "TLPI: pipes and process groups", {
          week: 6,
          hours: 5,
          source: "The Linux Programming Interface",
          chapters: "Ch. 34 (process groups, sessions, job control), 44 (pipes and FIFOs)",
          links: [TLPI],
        }),
        lab("os-shell", "Write a shell in Go", {
          week: 6,
          hours: 14,
          brief:
            "Build a shell that runs commands with arguments, supports pipelines (a | b | c), redirection (<, >, >>), background jobs (&), and Ctrl-C that kills the foreground job but not the shell. Use syscall-level fork/exec semantics via os.StartProcess or os/exec with explicit file descriptors, and reap every child.",
          evidence: [
            url("repo", "Link to the shell's code"),
            output("pipeline", "A three-stage pipeline and a redirect working"),
            output("zombies", "`ps` output proving no zombie processes are left after background jobs exit"),
          ],
          links: [link("OSTEP projects: shell", "https://github.com/remzi-arpacidusseau/ostep-projects/tree/master/processes-shell")],
        }),
        lab("os-pid1", "The PID 1 signal trap", {
          week: 6,
          hours: 3,
          brief:
            "Run a Node script with no SIGTERM handler as PID 1 in a Docker container and time `docker stop`. Explain the 10-second wait. Fix it three ways: add a handler, run with --init (tini), and use an exec-form entrypoint. Also create a zombie under a PID 1 that never calls wait.",
          evidence: [
            output("timing", "`time docker stop` before and after each fix"),
            output("sigcgt", "`grep Sig /proc/1/status` inside the container, decoded"),
          ],
          links: [link("tini: why you need an init", "https://github.com/krallin/tini")],
        }),
      ],
    },
    {
      id: "os-scheduling",
      title: "Scheduling and CPU limits",
      summary: "Week 7. Why a service can be slow at 30% CPU.",
      items: [
        read("os-ostep-scheduling", "OSTEP: scheduling", {
          week: 7,
          hours: 6,
          source: "OSTEP",
          chapters: "Ch. 7-10: scheduling, MLFQ, proportional share, multiprocessor",
          links: [OSTEP],
        }),
        read("os-cgroup-cpu", "cgroup v2 CPU controller", {
          week: 7,
          hours: 2,
          source: "Linux kernel documentation",
          chapters: "Control Group v2: the CPU controller section (cpu.max, cpu.weight, cpu.stat)",
          links: [link("Control Group v2", "https://docs.kernel.org/admin-guide/cgroup-v2.html")],
        }),
        lab("os-cfs-throttle", "Reproduce CFS throttling", {
          week: 7,
          hours: 5,
          brief:
            "Put a 4-thread CPU-bound Go HTTP server in a cgroup with cpu.max = \"50000 100000\" (half a core). Load it with a constant request rate and record p50 and p99 latency alongside cpu.stat. Then raise the quota and compare.",
          evidence: [
            output("cpustat", "cpu.stat showing nr_throttled and throttled_usec climbing"),
            note("latency", "p50/p99 with and without the quota, and why p99 suffers while average CPU looks low"),
          ],
          links: [link("Systems Performance: CPUs chapter overview", "https://www.brendangregg.com/systems-performance-2nd-edition-book.html")],
        }),
        lab("os-epoll-echo", "An epoll echo server", {
          week: 7,
          hours: 6,
          brief:
            "Write a single-threaded TCP echo server in Go using raw epoll syscalls (golang.org/x/sys/unix): non-blocking sockets, one epoll loop, no goroutine per connection. Hold 10,000 idle connections open. This is the mechanism under Node's event loop and Go's netpoller.",
          evidence: [
            url("repo", "Link to the code"),
            output("conns", "Connection count and memory use with 10,000 clients attached"),
          ],
          links: [link("epoll(7)", "https://man7.org/linux/man-pages/man7/epoll.7.html")],
        }),
        lab("os-writeup", "Write-up: what a process is", {
          week: 7,
          hours: 3,
          brief:
            "Publish a short post explaining a process to your past self, using your own strace and /proc output as the illustrations. One page, no copied diagrams.",
          evidence: [url("post", "Link to the published write-up")],
        }),
        read("os-postmortems-start", "Start the weekly postmortem habit", {
          week: 7,
          hours: 2,
          source: "Dan Luu's post-mortems collection",
          chapters: "Read two this phase. For each: trigger, root cause, why detection was slow, what you would have checked first",
          links: [
            link("Collection of postmortems", "https://github.com/danluu/post-mortems"),
            link("Postmortem lessons", "https://danluu.com/postmortem-lessons/"),
          ],
        }),
      ],
    },
  ],
};

export const quiz = [
  ...cards("os-syscalls-fds", [
    ["What is a system call?", "A controlled entry into the kernel: the program sets up arguments and executes a trap instruction, the CPU switches to kernel mode, the kernel does the work and returns."],
    ["What is a file descriptor?", "A small integer index into the process's table of open files. Each entry points to a kernel 'open file description' holding the offset and status flags."],
    ["After fork(), parent and child both write to the same inherited fd. Do they share a file offset?", "Yes. They share the same open file description, so the offset and flags are shared. Opening the file separately would give independent offsets."],
    ["Which three file descriptors does every process normally start with?", "0 stdin, 1 stdout, 2 stderr."],
    ["What does O_CLOEXEC do and why does it matter?", "Closes the descriptor automatically on exec. Without it, descriptors leak into child programs, which is a security and resource bug."],
    ["What does /proc/<pid>/maps show?", "Every mapped region of the process's virtual address space: address range, permissions, and the backing file (or heap, stack, anonymous)."],
    ["Why is a system call much slower than a function call?", "It crosses the user/kernel boundary: mode switch, register save and restore, kernel entry checks, and cache and TLB effects."],
  ]),
  ...cards("os-process-lifecycle", [
    ["What do fork() and exec() each do?", "fork creates a copy of the calling process (copy-on-write memory, duplicated fds). exec replaces the current process image with a new program, keeping the PID and open fds."],
    ["What is a zombie process and how do you get rid of it?", "A process that has exited but whose parent has not called wait() yet; only its exit status remains. The parent must reap it, or exit so init reaps it."],
    ["What happens to a child when its parent dies first?", "It is reparented to PID 1 (or the nearest subreaper), which is responsible for reaping it."],
    ["Which signals cannot be caught, blocked or ignored?", "SIGKILL and SIGSTOP."],
    ["Why does `docker stop` take 10 seconds for a Node app with no signal handler running as PID 1?", "The kernel does not apply default signal actions to PID 1, so SIGTERM is ignored. Docker waits the grace period, then sends SIGKILL."],
    ["How does a shell implement `a | b`?", "Create a pipe, fork twice. In a, dup2 the write end onto stdout; in b, dup2 the read end onto stdin; close unused ends in all three processes; exec each program; wait for both."],
    ["Why must unused pipe ends be closed?", "A reader only sees EOF when every write end is closed. A leftover write end keeps the reader blocked forever."],
    ["What is a process group and why does Ctrl-C not kill the shell?", "A set of processes that receive terminal signals together. The terminal sends SIGINT to the foreground process group; the shell puts each job in its own group and is not in it."],
  ]),
  ...cards("os-scheduling", [
    ["What does `cpu.max = \"50000 100000\"` mean?", "The cgroup may use 50 ms of CPU time per 100 ms period, across all its threads combined: half a core."],
    ["Why can a throttled service show high p99 latency with low average CPU?", "Several threads can burn the whole quota in the first part of a period; then every thread is frozen until the next period. Requests arriving then wait up to the remaining period."],
    ["Where do you see CPU throttling?", "In the cgroup's cpu.stat: nr_throttled and throttled_usec."],
    ["What is the difference between cpu.weight and cpu.max?", "cpu.weight is a relative share that only matters under contention. cpu.max is a hard ceiling enforced even when the machine is idle."],
    ["What does epoll give you that a blocking read per connection does not?", "One thread can wait on thousands of descriptors and is told only which ones are ready, so idle connections cost memory but no threads."],
    ["What is the difference between level-triggered and edge-triggered epoll?", "Level-triggered reports a descriptor as long as it is ready. Edge-triggered reports only on the transition to ready, so you must drain it until EAGAIN."],
    ["What is a context switch and what does it cost?", "Saving one task's CPU state and loading another's. Direct cost is microseconds; the larger cost is cold caches and TLB afterwards."],
  ]),
];
