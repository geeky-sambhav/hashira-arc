import { build, concept, link, paid, section, topic } from "../dsl";

const OSTEP_URL = "https://pages.cs.wisc.edu/~remzi/OSTEP/";
const TLPI_URL = "https://man7.org/tlpi/";

const STRACE_MAN = link("strace man page", "https://man7.org/linux/man-pages/man1/strace.1.html");
const PROC_MAN = link("proc(5)", "https://man7.org/linux/man-pages/man5/proc.5.html");
const EPOLL_MAN = link("epoll(7)", "https://man7.org/linux/man-pages/man7/epoll.7.html");
const CGROUP_V2 = link(
  "Control Group v2: the CPU controller (cpu.max, cpu.weight, cpu.stat)",
  "https://docs.kernel.org/admin-guide/cgroup-v2.html",
);
const SYSPERF = link(
  "Systems Performance: CPUs chapter overview",
  "https://www.brendangregg.com/systems-performance-2nd-edition-book.html",
);
const TLPI_PROCESSES = paid("TLPI Ch. 6 and 24-27: processes, fork, exit, wait, exec", TLPI_URL);

export default section(
  "processes",
  {
    title: "Processes and the operating system",
    summary:
      "What a process actually is: an address space, file descriptors, and a slot in the scheduler. How processes are created, signalled and reaped, how the kernel shares CPUs among them, and how one thread waits on ten thousand connections. This is the layer every container, sandbox and runtime is built from.",
  },
  [
    topic(
      "os",
      "What an operating system does",
      [
        topic("why", "Why an operating system exists", [
          concept(
            "problem",
            "The problem: many programs, one machine",
            "Many programs share one set of CPUs, memory and devices, and none of them can be trusted to share fairly or to stay out of another's memory. An operating system exists to divide the hardware among them and keep them apart.",
          ),
          concept(
            "kernel-job",
            "The kernel's job",
            "The kernel is the one program that runs with full hardware privilege. It shares out CPU time, memory and devices, keeps programs isolated from each other, and offers common abstractions (processes, files, sockets) so that no program drives hardware directly. The shell, libc, init and every daemon are ordinary programs running in user mode, even those that run as root.",
          ),
        ]),
        topic("protection", "User mode and kernel mode", [
          concept(
            "modes",
            "Two privilege levels in the CPU",
            "The CPU itself has a privileged mode for the kernel and an unprivileged mode for everything else. In user mode, instructions that touch devices, change page tables or disable interrupts cause a fault instead of running, so a program can only compute on its own memory and ask the kernel for the rest.",
          ),
          concept(
            "lde",
            "Limited direct execution",
            "A program's instructions run directly on the CPU at full speed; nothing interprets them. The kernel stays in charge only because the hardware limits what user mode may do and forces a jump into the kernel on every trap and interrupt.",
          ),
          concept(
            "trap",
            "Traps and the trap table",
            "A trap is caused by the instruction being executed: a deliberate system call instruction, or an exception such as a page fault or a divide by zero. The CPU switches to kernel mode and jumps to a handler whose address the kernel registered at boot. User code can choose which system call it wants by number, but never which kernel address to jump to.",
          ),
          concept(
            "interrupt",
            "Interrupts: hardware asks for attention",
            "An interrupt is asynchronous: a device such as a disk, network card or timer signals the CPU, which suspends whatever is running, runs the kernel's handler and then resumes. It has nothing to do with the instruction that happened to be executing.",
          ),
          concept(
            "timer",
            "The timer interrupt and preemption",
            "The kernel programs a hardware timer to interrupt the CPU, so it regains control even from a program that loops forever without making a system call. That is what lets it take the CPU away (preempt) instead of relying on programs to yield.",
          ),
          concept(
            "save-restore",
            "Saving and restoring user state",
            "On entry to the kernel the user program's registers, including the program counter and stack pointer, are saved on that thread's kernel stack, and restored on the way out. The program resumes as if nothing had happened.",
          ),
        ]),
        topic("process", "The process abstraction", [
          concept(
            "program-vs-process",
            "Program versus process",
            "A program is a file of code and data on disk. A process is one running instance of it: the kernel's record of an executing program together with the resources it holds. The same program can run as many processes at once.",
          ),
          concept("anatomy", "What a process consists of", undefined, {
            parts: [
              concept(
                "address-space",
                "A private address space",
                "Each process sees its own virtual memory holding its code, data, heap, stack and mapped files. The same address in two processes refers to different memory, so one process cannot read or corrupt another's.",
              ),
              concept(
                "cpu-state",
                "CPU state",
                "The registers, program counter and stack pointer say exactly where execution is. When the process is not on a CPU the kernel holds a saved copy, and restoring that copy is all it takes to continue.",
              ),
              concept(
                "resources",
                "Kernel resources and identity",
                "The kernel keeps, per process, a table of open files, a current directory, signal settings, resource limits, a PID, a parent PID and the user and group IDs it checks on every access. These live in kernel memory; the process only holds handles such as descriptor numbers.",
              ),
            ],
          }),
          concept(
            "time-sharing",
            "The illusion of a private CPU",
            "The kernel runs one process for a short time, saves its state and runs another, many times a second. Each process is written as if it had a CPU to itself; it only sees time pass while it was not running.",
          ),
        ]),
        topic("observe", "Seeing it on a real machine", [
          concept(
            "ps-tree",
            "ps and the process tree",
            "With `ps -ef` and `pstree` you can list every process with its PID, parent PID and command, and draw the tree: user processes descend from PID 1, and kernel threads (shown in square brackets) descend from kthreadd, PID 2.",
          ),
          concept(
            "time-cmd",
            "real, user and sys time",
            "`time` reports wall-clock time (real), CPU time spent in user mode (user) and CPU time the kernel spent on the process's behalf (sys). Real much larger than user plus sys means the process was waiting; user plus sys larger than real means several threads ran in parallel.",
          ),
        ]),
      ],
      {
        detail: "The kernel's job, the hardware boundary that protects it, and the process abstraction everything else hangs off.",
        links: [link("OSTEP Ch. 4-6: The Process, Process API, Limited Direct Execution", OSTEP_URL)],
      },
    ),

    topic(
      "syscalls",
      "System calls and file descriptors",
      [
        topic("syscall", "System calls", [
          concept(
            "what",
            "What a system call is",
            "A controlled entry into the kernel: the program sets up arguments and executes a trap instruction, the CPU switches to kernel mode, the kernel does the work and returns. On Linux the call is chosen by number, and the number and up to six arguments travel in registers.",
          ),
          concept(
            "wrappers",
            "libc wrappers and the manual sections",
            "Most programs call a libc function such as read(), which performs the trap and turns the kernel's error result into -1 plus errno. Section 2 of the manual documents system calls and section 3 library functions. Go on Linux makes system calls directly, without libc.",
          ),
          concept(
            "errno",
            "Errors: -1 and errno",
            "A failed call returns -1 and sets the per-thread errno to a code such as ENOENT, EACCES, EAGAIN or EINTR. errno is only meaningful immediately after a failure, because successful calls do not clear it. Go returns the same code as an error value.",
          ),
          concept(
            "blocking",
            "Blocking calls",
            "A call that cannot finish yet, such as a read from an empty pipe, puts the calling thread to sleep inside the kernel. The kernel runs something else and wakes the thread when the data arrives; a blocked thread uses no CPU.",
          ),
          concept(
            "cost",
            "Why a system call costs more than a function call",
            "It crosses the user/kernel boundary: mode switch, register save and restore, kernel entry checks, and cache and TLB effects. A function call is a jump within the same mode and address space.",
          ),
          concept(
            "vdso",
            "The vDSO: calls that never enter the kernel",
            "On Linux the kernel maps a small shared library, the vDSO, into every process. A few very frequent calls, such as clock_gettime and gettimeofday, are answered by its code in user mode from memory the kernel keeps up to date. They cost about as much as a function call and do not appear in strace.",
          ),
          concept(
            "batching",
            "Buffering: fewer, larger system calls",
            "Because each call has a fixed cost, libraries such as stdio and Go's bufio collect small writes in user memory and issue one write for many. The price is that buffered data is lost if the process dies before it is flushed.",
          ),
        ]),
        topic(
          "strace",
          "Tracing system calls",
          [
            concept(
              "reading",
              "Reading strace output",
              "Each line is one system call: its name, decoded arguments, return value and, on failure, the errno name. You can use -f to follow child processes and threads, -p to attach to a running process, -e to filter, -T for the time spent in each call and -c for a summary count.",
            ),
            concept(
              "startup",
              "What a program does before its own code",
              "In the strace of even `ls` you can point to the execve, then the dynamic loader opening and mapping shared libraries, and only then the program's own work.",
            ),
            concept(
              "overhead",
              "How strace works and what it costs",
              "strace uses ptrace: the kernel stops the traced process at every system call entry and exit and switches to strace. That can slow a syscall-heavy program many times over, so it is for a test machine or a brief, deliberate look at production.",
            ),
          ],
          { links: [STRACE_MAN] },
        ),
        topic("fds", "File descriptors", [
          concept(
            "everything-file",
            "Everything is a file",
            "Regular files, pipes, terminals, sockets, devices and kernel objects such as epoll instances and timers are all named by file descriptors, and most are used through the same read, write and close calls. The uniformity has limits: not every operation works on every type, for example lseek fails on a pipe.",
          ),
          concept(
            "fd",
            "What a file descriptor is",
            "A small integer index into the process's table of open files. Each entry points to a kernel 'open file description' holding the offset and status flags.",
          ),
          concept(
            "std-fds",
            "Standard input, output and error",
            "Every process normally starts with 0 stdin, 1 stdout and 2 stderr, inherited from its parent. The numbers are a convention; the kernel does not treat them specially. A new descriptor always gets the lowest unused number, which is why closing 0 and then opening a file makes that file standard input.",
          ),
          concept("levels", "The three levels behind a descriptor", undefined, {
            parts: [
              concept(
                "fd-table",
                "The per-process descriptor table",
                "Each process has its own table mapping descriptor numbers to open file descriptions, plus one flag per descriptor, close-on-exec. Descriptor 3 in two processes is unrelated unless one inherited it from the other.",
              ),
              concept(
                "ofd",
                "The open file description",
                "Each open() call creates one entry in a system-wide kernel table. It holds the file offset, the status flags (such as O_APPEND and O_NONBLOCK), the access mode and a reference to the inode. Several descriptors, in one process or in many, can point to the same description.",
              ),
              concept(
                "inode",
                "The inode",
                "The kernel's object for the file itself: its type, owner, permissions, size, timestamps and where its data lives. Many open file descriptions can refer to one inode, and a file name is only a directory entry pointing to it.",
              ),
              concept(
                "which-level",
                "Which property lives at which level",
                "Close-on-exec belongs to the descriptor; the offset and status flags belong to the open file description; contents, size and permissions belong to the inode. So setting O_NONBLOCK through one descriptor changes it for every descriptor that shares the description, including copies held by other processes.",
              ),
            ],
          }),
          concept(
            "dup",
            "dup and dup2",
            "dup returns a new descriptor pointing to the same open file description, so the two share one offset and one set of status flags. dup2(old, new) makes a chosen number refer to it, silently closing whatever `new` was first. This is the primitive behind redirection.",
          ),
          concept(
            "open-twice",
            "Opening the same file twice",
            "Two open() calls create two open file descriptions on the same inode, each with its own offset. Reading through one does not move the other, and writes through both can overwrite each other unless both opens used O_APPEND.",
          ),
          concept(
            "limits",
            "Descriptor limits and leaks",
            "Each process has a soft limit on open descriptors (RLIMIT_NOFILE, shown by `ulimit -n`, often 1024 on Linux) that it may raise up to the hard limit. At the limit, open, accept and socket fail with EMFILE, 'too many open files'; the system-wide limit gives ENFILE. A count in /proc/<pid>/fd that only grows is a descriptor leak.",
          ),
        ]),
        topic("fileio", "The file I/O calls", [
          concept(
            "open",
            "open: flags and mode",
            "open resolves a path, checks permissions once and returns a descriptor. The access mode is O_RDONLY, O_WRONLY or O_RDWR; O_CREAT creates the file with the given mode bits (reduced by the umask), O_EXCL makes creation fail if the file exists, and O_TRUNC empties it. Later permission changes do not affect descriptors that are already open.",
          ),
          concept(
            "read",
            "read, short reads and end of file",
            "read returns how many bytes it actually delivered, which can be fewer than requested; 0 means end of file and -1 an error. On pipes, sockets and terminals short reads are normal, so code that needs N bytes must loop.",
          ),
          concept(
            "write",
            "write and partial writes",
            "write returns how many bytes the kernel accepted, which can be fewer than requested, for example on a non-blocking descriptor or after a signal, so code must loop here too. Success means the kernel has the data in its own buffers, not that it has reached the disk or the peer.",
          ),
          concept(
            "offset",
            "The file offset, lseek and O_APPEND",
            "Each open file description has an offset that read and write advance; lseek moves it without doing I/O. pread and pwrite take an explicit offset and leave the shared one alone, which suits threads sharing a descriptor. With O_APPEND every write first moves to the end of the file atomically, so several processes can append to one log without overwriting each other.",
          ),
          concept(
            "close",
            "close and what it releases",
            "close frees the descriptor number. The open file description, and with it a pipe end or a socket, is released only when the last descriptor referring to it is closed, so a forgotten copy in another process keeps it open.",
          ),
          concept(
            "unlink-open",
            "Deleting a file that is still open",
            "unlink removes a name; the inode and its data survive until the last open file description is closed. This is why deleting a large log that a process still has open frees no disk space, and why /proc/<pid>/fd marks it '(deleted)'.",
          ),
        ]),
        topic(
          "proc",
          "/proc: a window into a process",
          [
            concept(
              "procfs",
              "What /proc is",
              "A virtual filesystem whose contents the kernel generates at the moment you read them; nothing is stored on disk. Each process has a directory /proc/<pid>, /proc/self is the reader's own, and ps and top are only programs that read these files.",
            ),
            concept(
              "proc-fd",
              "/proc/<pid>/fd and fdinfo",
              "/proc/<pid>/fd holds one symbolic link per open descriptor, pointing to a path or to a label such as socket:[...], pipe:[...] or anon_inode:[eventpoll]. /proc/<pid>/fdinfo/<n> shows that descriptor's offset and flags.",
            ),
            concept(
              "proc-maps",
              "/proc/<pid>/maps",
              "Every mapped region of the process's virtual address space: address range, permissions, and the backing file (or heap, stack, anonymous).",
            ),
            concept(
              "proc-status",
              "/proc/<pid>/status, limits and cmdline",
              "status gives the name, state, parent PID, user and group IDs, thread count, memory figures, signal masks and context-switch counts in readable form. limits lists the soft and hard resource limits actually in force for that process, which can differ from your shell's. cmdline holds the arguments it was started with, separated by NUL bytes.",
            ),
          ],
          { links: [PROC_MAN] },
        ),
        topic("build", "Build it", [
          build(
            "spelunking",
            "Process spelunking with strace and /proc",
            "Run `strace -f` on `ls`, on a Node hello-world and on a small Go HTTP server. For the running server, read /proc/<pid>/maps, /proc/<pid>/fd, /proc/<pid>/status and /proc/<pid>/limits. Then open the same file twice and once more via dup(), and show which descriptors share an offset.",
            {
              doneWhen: [
                "Annotated strace of one HTTP request to your Go server",
                "`ls -l /proc/<pid>/fd` with each descriptor explained",
                "A note on what you observed about shared file offsets with dup versus a second open",
              ],
              links: [STRACE_MAN, PROC_MAN],
            },
          ),
          build(
            "syscall-cost",
            "Measure what a system call costs",
            "Copy 1 MiB from /dev/zero to /dev/null with dd twice: once with bs=1 count=1048576 and once with bs=1M count=1. Time each run with `time`, then run each again under `strace -c` to confirm how many reads and writes it made (the traced runs are far slower, so do not time those). The two runs move the same data and differ by about two million system calls, so divide the difference in user plus sys time by that number.",
            {
              doneWhen: [
                "real, user and sys time and the syscall counts for both runs",
                "Your estimate of the cost of one system call on your machine",
              ],
            },
          ),
        ]),
      ],
      {
        detail: "The boundary between your program and the kernel, and the handles a process holds across it.",
        links: [
          paid(
            "TLPI Ch. 3-5: system programming concepts, file I/O, file descriptors and open file descriptions",
            TLPI_URL,
          ),
        ],
      },
    ),

    topic(
      "lifecycle",
      "Process lifecycle",
      [
        topic(
          "create",
          "Creating processes: fork and exec",
          [
            concept(
              "why-split",
              "Why creation is two steps",
              "Unix separates 'make a new process' (fork) from 'run a different program' (exec). In the gap between the two, the child, still running the parent's code, can rearrange its own descriptors, environment and process group before the new program starts. Redirection and pipelines are built in that gap.",
            ),
            concept(
              "fork",
              "fork",
              "fork creates a copy of the calling process: a new PID, a copy-on-write copy of the memory and a duplicate of the descriptor table. It returns twice: 0 in the child and the child's PID in the parent, and either may run first. On Linux, glibc's fork is implemented with the more general clone system call.",
            ),
            concept(
              "cow",
              "Copy-on-write",
              "fork does not copy memory. Parent and child share the same physical pages, marked read-only, and the kernel copies a page only when one of them writes to it. The cost of fork therefore follows the size of the page tables rather than the amount of data, and a fork followed at once by exec copies almost nothing.",
            ),
            concept(
              "inherited",
              "What a child inherits",
              "The child gets copies of the memory, open descriptors, current directory, environment, user and group IDs, signal dispositions and signal mask, and stays in the parent's process group and session. It does not get the parent's PID, its pending signals or its other threads.",
            ),
            concept(
              "fork-fds",
              "Descriptors across fork",
              "After fork the child has a copy of the parent's descriptor table, and each entry points to the same open file description as the parent's. They share the offset and flags, so if both write to an inherited descriptor their output lands one piece after the other. Opening the file separately would give independent offsets.",
            ),
            concept(
              "fork-threads",
              "fork in a multithreaded program",
              "Only the thread that called fork exists in the child, yet memory is copied with every lock in whatever state it was in, so a lock held by another thread stays locked forever. Between fork and exec only async-signal-safe functions are safe to call. This is why Go offers no bare fork, only fork-and-exec in one step.",
            ),
            concept(
              "exec",
              "exec",
              "exec replaces the current process image with a new program: the old code, data, heap and stack are discarded and execution starts at the new program's entry point, in the same process with the same PID. It returns only if it fails. The execve system call takes the path, the argument list and the environment; the other exec functions are libc wrappers around it.",
            ),
            concept(
              "argv-env",
              "Arguments and the environment",
              "execve copies the argument list and the environment, a list of NAME=value strings, onto the new program's stack. A child starts with a copy of its parent's environment and current directory and can never change the parent's, which is why `cd` and `export` have to be built into the shell and cannot be separate programs.",
            ),
            concept(
              "exec-keeps",
              "What survives exec",
              "The PID, parent, process group, current directory, resource limits, signal mask, ignored signals and every descriptor without close-on-exec carry over. Memory, other threads and signal handlers do not: caught signals go back to their default action because the handler code no longer exists.",
            ),
            concept(
              "cloexec",
              "Descriptors across exec and O_CLOEXEC",
              "By default descriptors stay open across exec. A descriptor with the close-on-exec flag is closed automatically on exec; without it, descriptors leak into child programs, which is a security and resource bug. Set the flag in the open call itself with O_CLOEXEC, because setting it afterwards leaves a window in which another thread can fork and exec. Go sets it on the files it opens.",
            ),
          ],
          { links: [TLPI_PROCESSES, link("OSTEP Ch. 5: Process API", OSTEP_URL)] },
        ),
        topic(
          "exit",
          "Termination, wait and reaping",
          [
            concept(
              "exit-status",
              "exit and the exit status",
              "A process ends by calling exit (or returning from main), or by being killed by a signal. The kernel closes its descriptors, frees its memory and keeps a small termination record: an exit status from 0 to 255, where 0 means success by convention, or the signal that killed it. The C library's exit() first runs atexit handlers and flushes stdio buffers; the bare _exit system call and death by signal skip that, which is how buffered output gets lost.",
            ),
            concept(
              "wait",
              "wait and waitpid",
              "A parent collects a child's termination record with wait or waitpid, which block until a child changes state unless WNOHANG is given. The status says whether the child exited (and with what code) or was killed by a signal (and which). A shell reports death by signal N as exit code 128+N, so 137 means SIGKILL and 143 SIGTERM.",
            ),
            concept(
              "zombie",
              "Zombie processes",
              "A zombie is a process that has exited but whose parent has not called wait yet; only its PID and exit status remain. It shows as Z or <defunct> in ps and cannot be killed because it is already dead. The parent must reap it, or exit so that init does. Zombies that are never reaped use up PIDs until none are left.",
            ),
            concept(
              "orphan",
              "Orphans and reparenting",
              "When a parent dies first, its children are reparented to PID 1, or to the nearest ancestor that registered as a subreaper, which then becomes responsible for reaping them. Orphans keep running; nothing kills them automatically.",
            ),
            concept(
              "sigchld",
              "SIGCHLD",
              "The kernel sends the parent SIGCHLD when a child terminates or stops; the default action is to ignore it. A parent that cannot sit blocked in wait handles SIGCHLD and reaps in a loop with waitpid(-1, WNOHANG), because several exits can arrive as a single signal. Explicitly setting SIGCHLD to SIG_IGN is treated differently from the default: terminated children are then discarded without becoming zombies.",
            ),
          ],
          { links: [TLPI_PROCESSES] },
        ),
        topic(
          "signals",
          "Signals",
          [
            concept(
              "what",
              "What a signal is",
              "A small asynchronous notification, identified by a number, delivered to a process. The kernel sends one for events such as an invalid memory access or a child exiting, the terminal sends them for Ctrl-C, and any process can send one with kill() to a process it has permission over. Passing kill the negative of a process group ID signals every process in that group.",
            ),
            concept(
              "dispositions",
              "Dispositions: default, ignore or handler",
              "Each signal has a per-process disposition: the default action (terminate, terminate with a core dump, ignore, stop or continue, depending on the signal), ignore, or run a handler function. The disposition is set with sigaction.",
            ),
            concept(
              "common",
              "The signals to know by name",
              "SIGTERM (15) is the polite request to exit and what `kill` sends by default; SIGINT (2) is Ctrl-C; SIGQUIT is Ctrl-\\ and dumps core; SIGHUP means the terminal went away and is reused by daemons as 'reload'; SIGSEGV is an invalid memory access; SIGCHLD reports a child; SIGPIPE a write to a closed pipe; SIGTSTP is Ctrl-Z; SIGCONT resumes; SIGUSR1 and SIGUSR2 are yours to define.",
            ),
            concept(
              "kill-stop",
              "SIGKILL and SIGSTOP",
              "SIGKILL (9) and SIGSTOP cannot be caught, blocked or ignored, so an administrator can always kill or freeze a process. A process gets no chance to clean up after SIGKILL, which is why you send SIGTERM first and SIGKILL only after a grace period.",
            ),
            concept("delivery", "How a signal is delivered", undefined, {
              parts: [
                concept(
                  "pending",
                  "Generated, pending, delivered",
                  "A signal is first generated and recorded as pending for its target. It is delivered, meaning its action is taken, when the target next returns from kernel mode to user mode. Pending standard signals are one bit each, so the same signal sent five times before delivery arrives once; never count signals.",
                ),
                concept(
                  "mask",
                  "The signal mask",
                  "Each thread has a set of blocked signals. A blocked signal stays pending until it is unblocked, which is different from ignoring it, where it is discarded. Dispositions are shared by the whole process, masks are per thread, and a signal sent to the process is delivered to any one thread that does not block it.",
                ),
              ],
            }),
            concept("handlers", "Signal handlers", undefined, {
              parts: [
                concept(
                  "handler",
                  "How a handler runs",
                  "A handler installed with sigaction runs on the interrupted thread, between any two instructions of whatever code was executing, and when it returns that code continues. The program did not choose the moment.",
                ),
                concept(
                  "async-safe",
                  "Async-signal-safety",
                  "Because a handler can interrupt the program in the middle of malloc or printf, calling those from the handler can deadlock or corrupt state. Only functions documented as async-signal-safe, such as write, _exit and waitpid, may be called. The standard pattern is to set a flag or write one byte to a pipe and do the real work in the main loop.",
                ),
                concept(
                  "eintr",
                  "EINTR and SA_RESTART",
                  "A blocking system call interrupted by a handler fails with EINTR, unless the handler was installed with SA_RESTART, in which case many calls (not all) are restarted automatically. Robust code retries on EINTR.",
                ),
              ],
            }),
            concept(
              "sigpipe",
              "SIGPIPE and EPIPE",
              "Writing to a pipe that has no readers left, or to a socket whose connection has been reset or shut down, sends the writer SIGPIPE, whose default action kills it; this is how `yes | head` ends. If SIGPIPE is ignored the write fails with EPIPE instead, which is what a network server wants: one disconnected client must not kill the process.",
            ),
            concept(
              "graceful",
              "Graceful shutdown",
              "By convention SIGTERM means: stop accepting new work, finish what is in flight, then exit. Supervisors such as systemd, Docker and Kubernetes send SIGTERM, wait a grace period and then send SIGKILL, so a service must handle SIGTERM and finish inside that period. Go delivers the signal on a channel registered with signal.Notify; Node emits it as an event on `process`.",
            ),
          ],
          { links: [paid("TLPI Ch. 20-22: signal concepts, handlers, advanced features", TLPI_URL)] },
        ),
        topic(
          "pipes",
          "Pipes and redirection",
          [
            concept(
              "pipe",
              "What a pipe is",
              "pipe() creates a buffer inside the kernel and returns two descriptors: bytes written to the write end come out of the read end in order. It is a one-way byte stream with no message boundaries, and it is normally shared by inheritance: a parent creates it and then forks.",
            ),
            concept(
              "capacity",
              "Pipe capacity, blocking and atomic writes",
              "A pipe holds a limited amount (64 KiB by default on Linux). A writer blocks when it is full and a reader blocks when it is empty, so a slow consumer automatically slows the producer. Writes of up to PIPE_BUF bytes (4096 on Linux) are atomic: they are never interleaved with another writer's data.",
            ),
            concept(
              "pipe-eof",
              "Why unused pipe ends must be closed",
              "A reader only sees EOF when every write end is closed, in every process. A leftover write end, typically an inherited copy nobody closed, keeps the reader blocked forever. Likewise a writer gets SIGPIPE only when every read end is closed.",
            ),
            concept(
              "redirect",
              "How a shell does redirection",
              "For `cmd > file` the shell forks; the child opens the file, uses dup2 to put it on descriptor 1, closes the extra descriptor and execs. The program writes to descriptor 1 and never knows. `<` does the same on 0, `>>` opens with O_APPEND, and `2>&1` is dup2(1, 2), which is why its position relative to `> file` matters.",
            ),
            concept(
              "pipeline",
              "How a shell builds a pipeline",
              "For `a | b`: create a pipe, fork twice. In a, dup2 the write end onto stdout; in b, dup2 the read end onto stdin; close unused ends in all three processes; exec each program; wait for both.",
            ),
            concept(
              "fifo-unix",
              "Named pipes and Unix domain sockets",
              "A FIFO gives a pipe a name in the filesystem so that unrelated processes can open it. A Unix domain socket is a local, two-way channel that can also pass open file descriptors from one process to another.",
            ),
          ],
          { links: [paid("TLPI Ch. 44: pipes and FIFOs", TLPI_URL)] },
        ),
        topic(
          "jobs",
          "Process groups, sessions and job control",
          [
            concept(
              "pgroup",
              "Process groups",
              "A process group is a set of processes that receive terminal signals together, identified by a PGID. A shell puts all the processes of one pipeline into one new group, so the whole job can be signalled at once.",
            ),
            concept(
              "session",
              "Sessions",
              "A session is a set of process groups, normally everything started from one login or terminal window. setsid starts a new session with the caller as its leader and no controlling terminal, which is how a daemon detaches.",
            ),
            concept(
              "ctty",
              "The controlling terminal",
              "A session can have one controlling terminal. The terminal driver turns keys into signals for the foreground process group: Ctrl-C sends SIGINT, Ctrl-\\ SIGQUIT and Ctrl-Z SIGTSTP. When the terminal closes, the session leader (the shell) gets SIGHUP and normally passes it on to its jobs, which is why they die unless started with nohup or moved to their own session.",
            ),
            concept(
              "pty",
              "Pseudo-terminals",
              "A pseudo-terminal is a pair of devices: programs see one side as an ordinary terminal, while a terminal emulator, sshd or `docker run -t` holds the other side and supplies the keystrokes. It is why Ctrl-C and job control work over SSH.",
            ),
            concept(
              "fg-bg",
              "Foreground and background jobs",
              "Exactly one process group is the terminal's foreground group, chosen by the shell with tcsetpgrp, and the terminal sends SIGINT only to it. The shell puts each job in its own group and is not in that group itself, which is why Ctrl-C kills the job and not the shell. A background job that tries to read the terminal is stopped with SIGTTIN.",
            ),
            concept(
              "job-control",
              "Job control: Ctrl-Z, bg and fg",
              "Ctrl-Z stops the foreground group with SIGTSTP; the shell, which was waiting for stops as well as exits, takes the terminal back. `bg` sends SIGCONT and leaves the job in the background; `fg` makes it the foreground group again and continues it.",
            ),
          ],
          { links: [paid("TLPI Ch. 34: process groups, sessions and job control", TLPI_URL)] },
        ),
        topic(
          "pid1",
          "PID 1 and init in containers",
          [
            concept(
              "init-duties",
              "What PID 1 is responsible for",
              "PID 1 is the first user process and the ancestor of all others. Orphans are reparented to it, so it must call wait to reap them, and it is expected to start services and pass on shutdown signals. In a container the first process of the PID namespace plays this role, and when it exits the kernel kills every other process in the namespace.",
            ),
            concept(
              "pid1-signals",
              "Signals to PID 1 need a handler",
              "The kernel drops any signal sent to the PID 1 of a PID namespace, by itself or by another process, unless PID 1 has installed a handler for that signal; the default action is not applied. This holds even when root sends it, and since SIGKILL cannot have a handler, nothing inside the namespace can kill its own PID 1. A program that relies on SIGTERM's default action to die therefore ignores SIGTERM when it runs as PID 1. The one exception is SIGKILL or SIGSTOP sent from an ancestor PID namespace, such as the host, which always takes effect.",
            ),
            concept(
              "docker-stop",
              "Why `docker stop` takes 10 seconds",
              "`docker stop` sends SIGTERM (or the image's STOPSIGNAL) to the container's PID 1, waits a grace period (10 seconds by default for Linux containers) and then sends SIGKILL from the host. Node's built-in SIGTERM handler only restores the terminal and re-raises the signal to get the default action, which the kernel drops for PID 1. So a Node app running as PID 1 without a SIGTERM listener of its own keeps running, every stop takes the full 10 seconds, and the app is killed mid-request.",
            ),
            concept(
              "shell-form",
              "Exec form versus a shell in front",
              "A shell-form command (`CMD node server.js`) is run through `/bin/sh -c`, and a wrapper script is run by a shell too; either can leave the shell as PID 1 with the app as its child. The shell has no SIGTERM handler, so as PID 1 it never receives the signal, and a shell does not forward signals to its children anyway, so the app never hears it. The exec form (`CMD [\"node\", \"server.js\"]`) runs the app directly, and a wrapper script should start the app with `exec` so the app replaces the shell.",
            ),
            concept(
              "tini",
              "What a minimal init does",
              "A tiny init such as tini (what `docker run --init` inserts) runs as PID 1, starts the app as its child, forwards signals to it, reaps every zombie including adopted orphans, and exits with the app's status. The app is no longer PID 1, so default signal actions apply to it again.",
            ),
          ],
          { links: [link("tini: why you need an init", "https://github.com/krallin/tini")] },
        ),
        topic("observe", "Seeing it on a real machine", [
          concept(
            "ps-cols",
            "PPID, PGID, SID, TTY and STAT in ps",
            "With `ps -eo pid,ppid,pgid,sid,tty,stat,comm` you can see which processes share a job and a session, which have a controlling terminal, and find zombies (Z) together with the parent that is failing to reap them.",
          ),
          concept(
            "strace-life",
            "fork, exec and wait in strace",
            "`strace -f` on a shell running a pipeline shows pipe or pipe2, clone (how fork usually appears), dup2 or dup3, close, execve and wait4 in the order the shell made them. You can match each line to a step of building the pipeline.",
          ),
          concept(
            "sig-masks",
            "Decoding SigBlk, SigIgn and SigCgt",
            "In /proc/<pid>/status these are hexadecimal bit masks of blocked, ignored and caught signals, where bit N-1 stands for signal N. A SigCgt of 0000000000004002 has bits 1 and 14 set: handlers for signal 2 (SIGINT) and signal 15 (SIGTERM).",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "shell",
            "Write a shell in Go",
            "Build a shell that runs commands with arguments, supports pipelines (a | b | c), redirection (<, >, >>), background jobs (&), and Ctrl-C that kills the foreground job but not the shell. Use syscall-level fork/exec semantics via os.StartProcess or os/exec with explicit file descriptors, put each job in its own process group, make the foreground job the terminal's foreground group while it runs (SysProcAttr has Setpgid and Foreground) and take the terminal back afterwards, and reap every child.",
            {
              doneWhen: [
                "A link to the shell's code",
                "A three-stage pipeline and a redirect working",
                "`ps` output proving no zombie processes are left after background jobs exit",
              ],
              links: [
                link(
                  "OSTEP projects: shell",
                  "https://github.com/remzi-arpacidusseau/ostep-projects/tree/master/processes-shell",
                ),
              ],
            },
          ),
          build(
            "pid1",
            "The PID 1 signal trap",
            "Run a long-lived Node script with no SIGTERM listener as PID 1 in a Docker container (exec-form CMD; confirm that /proc/1/cmdline is node) and time `docker stop`. Explain the 10-second wait. Fix it two ways: add a SIGTERM listener that exits, and run with --init (tini). Then keep the listener but start the script from a wrapper shell script without `exec` (confirm with ps that the shell is PID 1 and node its child), watch the 10-second wait come back, and fix it with `exec` or an exec-form entrypoint. Also create a zombie under a PID 1 that never calls wait.",
            {
              doneWhen: [
                "`time docker stop` before and after each fix",
                "`grep Sig /proc/1/status` inside the container, decoded (Node installs its own SIGINT and SIGTERM handlers at startup, so both show in SigCgt even before you add a listener)",
              ],
              links: [link("tini: why you need an init", "https://github.com/krallin/tini")],
            },
          ),
        ]),
      ],
      { detail: "How processes are born, replaced, reaped and interrupted, and how a shell wires them together." },
    ),

    topic(
      "scheduling",
      "Threads and scheduling",
      [
        topic(
          "threads",
          "Threads",
          [
            concept(
              "why",
              "Why threads exist",
              "A process with a single flow of control cannot use a second core and stops entirely when one call blocks. A thread is another flow of control inside the same process, with its own stack and registers but the same memory.",
            ),
            concept(
              "shared",
              "Threads versus processes: what is shared",
              "Threads of one process share the address space, the descriptor table, the current directory and signal dispositions; each has its own stack, registers, signal mask and errno. Sharing makes communication cheap and failure shared: a bad pointer write in one thread corrupts them all and a crash kills the whole process, where separate processes would contain it.",
            ),
            concept(
              "linux-tasks",
              "Threads on Linux are tasks",
              "The Linux scheduler deals in tasks, each described by a task_struct. A thread is a task created by clone with flags that share the address space, descriptor table and signal handlers with its creator; a process is a group of such tasks. All threads report the same PID, each has its own thread ID, and `ps -L`, `top -H` and /proc/<pid>/task list them.",
            ),
            concept(
              "kernel-threads",
              "Kernel threads",
              "Some tasks run only in kernel mode and have no user address space, for example kswapd, ksoftirqd and the kworker pool. ps shows them in square brackets, and they are scheduled like any other task.",
            ),
            concept(
              "user-threads",
              "User-level threads and event loops",
              "A runtime can schedule its own units of work on top of kernel threads. Go multiplexes many goroutines onto a few threads and switches between them in user space; Node runs JavaScript on one thread and hands blocking work such as file I/O to a small thread pool. The kernel only ever sees and schedules the threads.",
            ),
          ],
          { links: [link("OSTEP Ch. 26: Concurrency: An Introduction", OSTEP_URL)] },
        ),
        topic("states", "Process states and run queues", [
          concept(
            "states",
            "Running, runnable and blocked",
            "A task is running on a CPU, runnable (ready and waiting for a CPU), or blocked waiting for an event such as I/O, a lock or a timer. A blocking call moves it from running to blocked, a wakeup moves it to runnable, the scheduler moves it to running, and preemption moves it back to runnable.",
          ),
          concept(
            "linux-states",
            "Linux state letters",
            "In ps and top, R means running or runnable (Linux reports the two as one state), S is an interruptible sleep, D is an uninterruptible sleep (usually a wait for disk I/O that ordinary signals cannot interrupt), T is stopped, Z is a zombie and I is an idle kernel thread.",
          ),
          concept(
            "runqueue",
            "Run queues and wakeups",
            "Each CPU has its own queue of runnable tasks and picks from it; the kernel migrates tasks between CPUs to balance them. A blocked task waits on a queue attached to what it is waiting for, and when the event happens (often in an interrupt handler) it is moved to a run queue. The time between becoming runnable and actually running is scheduling latency.",
          ),
        ]),
        topic("switch", "Context switches", [
          concept(
            "what",
            "What a context switch is",
            "Saving one task's CPU state and loading another's, done by the kernel. If the next task belongs to a different process the address space is switched too. A system call or interrupt that returns to the same task is only a mode switch and is much cheaper.",
          ),
          concept(
            "cost",
            "What a context switch costs",
            "The direct cost is small, typically a few microseconds or less. The larger cost comes afterwards: the incoming task finds the CPU caches and the TLB holding someone else's data and runs slowly until they are warm again. Switching between threads of one process keeps the address space, so it is cheaper than switching between processes.",
          ),
          concept(
            "vol-invol",
            "Voluntary and involuntary switches",
            "A voluntary switch happens when a task blocks or yields; an involuntary one when the scheduler preempts a task that still wanted to run. Many voluntary switches point to I/O or lock contention, many involuntary ones to competition for CPU. Both counters are in /proc/<pid>/status.",
          ),
        ]),
        topic(
          "policy",
          "Scheduling policy",
          [
            concept(
              "goals",
              "What a scheduler trades off",
              "Turnaround time (finish jobs soon), response time (start running soon after becoming runnable) and fairness pull against each other. First-come-first-served lets one long job delay many short ones; shortest-job-first minimises turnaround but needs to know the future; round robin gives good response time at the cost of turnaround.",
            ),
            concept(
              "io-cpu",
              "CPU-bound and I/O-bound tasks",
              "A CPU-bound task uses every slice it is given; an I/O-bound task runs briefly and blocks again. Running the I/O-bound task promptly when it wakes costs little CPU and keeps it responsive, so practical schedulers favour tasks that give up the CPU early.",
            ),
            concept(
              "mlfq",
              "Multi-level feedback queue",
              "MLFQ learns which jobs are short by watching them. Jobs start at the highest priority, a job that uses up its allotment at a level is moved down, and a periodic boost moves everything back to the top so nothing starves. It approximates shortest-job-first without knowing job lengths in advance.",
            ),
            concept("fair", "The Linux fair scheduler", undefined, {
              parts: [
                concept(
                  "share",
                  "Proportional share",
                  "Instead of optimising turnaround, a proportional-share scheduler aims to give each runnable task a fraction of the CPU proportional to its weight. Linux's scheduler for ordinary tasks is of this kind: the Completely Fair Scheduler (CFS) and, from Linux 6.6, its successor EEVDF.",
                ),
                concept(
                  "vruntime",
                  "Virtual runtime",
                  "Each task accumulates virtual runtime while it runs, and CFS picks the runnable task with the smallest value, keeping tasks in a tree ordered by it. A task that has had less than its share is therefore always next. There is no fixed time slice: the more tasks are runnable, the shorter each one's turn.",
                ),
                concept(
                  "weights",
                  "Weights and nice",
                  "A task's nice value, from -20 (most favoured) to 19, maps to a weight, and each nice step changes the weight by a factor of about 1.25. Virtual runtime advances more slowly for a heavier task, so it receives proportionally more CPU. Nice only has an effect when tasks compete for the same CPU.",
                ),
                concept(
                  "wakeups",
                  "Tasks that wake up",
                  "A task that slept has accumulated little virtual runtime, so in CFS it is placed near the front when it wakes and may preempt the running task. Its credit is capped so that a long sleeper cannot then monopolise the CPU. This is how an I/O-bound task stays responsive next to CPU-bound ones.",
                ),
                concept(
                  "eevdf",
                  "EEVDF on newer kernels",
                  "From Linux 6.6 the fair scheduler uses EEVDF (earliest eligible virtual deadline first). It is still weighted fair sharing: each task gets a virtual deadline derived from its slice and weight, and the scheduler runs the eligible task, one that has not already had more than its share, with the earliest deadline. Nice values, weights and the cgroup interface are unchanged.",
                ),
              ],
            }),
            concept(
              "classes",
              "Scheduling classes and real-time policies",
              "Linux has several scheduling classes, consulted in priority order: deadline (SCHED_DEADLINE), then real-time (SCHED_FIFO and SCHED_RR, with static priorities 1 to 99), then the fair class (SCHED_OTHER and its variants SCHED_BATCH and SCHED_IDLE). A runnable real-time task always runs ahead of every ordinary task, so a runaway one can crowd out almost everything else on its CPU; by default the kernel holds back only 5% of CPU time for ordinary tasks. Almost every service runs in the fair class.",
            ),
            concept(
              "affinity",
              "CPU affinity and migration",
              "Moving a task to another CPU throws away its warm caches, so the scheduler prefers to keep a task where it last ran and migrates only to balance load. sched_setaffinity, `taskset` and the cpuset cgroup controller restrict a task to chosen CPUs when you want to pin it.",
            ),
          ],
          { links: [link("OSTEP Ch. 7-10: scheduling, MLFQ, proportional share, multiprocessor", OSTEP_URL)] },
        ),
        topic(
          "cgroup-cpu",
          "cgroup v2 CPU control",
          [
            concept(
              "cgroup",
              "What a cgroup is",
              "A control group is a set of processes that the kernel accounts and limits together. Groups form a tree exposed as a filesystem, normally under /sys/fs/cgroup; a process is moved by writing its PID to a group's cgroup.procs, and children start in their parent's group. Controllers such as cpu, memory, io and pids act on a group once they are enabled for it in its parent's cgroup.subtree_control. A container runtime puts each container in its own cgroup.",
            ),
            concept(
              "cpu-weight",
              "cpu.weight: a relative share",
              "cpu.weight (1 to 10000, default 100) is a relative share that only matters under contention. When sibling groups all want more CPU than there is, they receive it in proportion to their weights; when the machine has idle CPU, the weight limits nothing.",
            ),
            concept(
              "cpu-max",
              "cpu.max: a hard ceiling",
              "cpu.max holds a quota and a period in microseconds. \"50000 100000\" means the cgroup may use 50 ms of CPU time per 100 ms period, across all its threads combined: half a core. It is a hard ceiling, enforced even when the machine is idle. The default is \"max 100000\": no limit, with a 100 ms period.",
            ),
            concept(
              "throttling",
              "Throttling",
              "When a group has used its quota for the current period, all of its runnable threads are kept off the CPU until the next period begins. They are not slowed down; they are stopped. This is commonly called CFS throttling, after the scheduler's bandwidth control.",
            ),
            concept(
              "slow-at-30",
              "Why a service can be slow at 30% CPU",
              "Several threads can burn the whole quota in the first part of a period; then every thread is frozen until the next period, and requests arriving then wait up to the remaining period. Four busy threads use a 50 ms quota in 12.5 ms and stall for 87.5 ms. CPU use averaged over a minute can sit far below the limit while individual periods hit it, so p99 latency suffers while the dashboard looks calm.",
            ),
            concept(
              "pool-size",
              "Thread pools sized to the host, not the quota",
              "A runtime that starts one busy thread per host core inside a small quota makes throttling worse: 32 threads spend a 2-core quota in about 6 ms of each 100 ms period. Size worker pools to the CPU limit. Before Go 1.25 the default GOMAXPROCS was the number of logical CPUs available to the process and ignored the cgroup quota. From Go 1.25, on Linux, the default also follows the quota (quota divided by period, rounded up, and not below 2), unless GOMAXPROCS is set by hand or the main module's go.mod declares a Go version below 1.25.",
            ),
            concept(
              "cpu-stat",
              "cpu.stat",
              "The group's cpu.stat always reports usage_usec, user_usec and system_usec and, when the cpu controller is enabled for the group, also nr_periods, nr_throttled and throttled_usec. nr_throttled divided by nr_periods is the fraction of periods in which the group hit its limit, and a climbing throttled_usec is time your service spent frozen.",
            ),
            concept(
              "mapping",
              "How container settings map to these files",
              "Docker's `--cpus=0.5` writes a cpu.max of half a core. In Kubernetes a CPU limit becomes cpu.max and a CPU request becomes cpu.weight. On hosts still using cgroup v1 the same controls are called cpu.cfs_quota_us, cpu.cfs_period_us and cpu.shares.",
            ),
          ],
          { links: [CGROUP_V2] },
        ),
        topic(
          "observe",
          "Observing CPU and the scheduler",
          [
            concept(
              "load-avg",
              "Load average",
              "On Linux the load average is an exponentially damped average, over 1, 5 and 15 minutes, of the number of tasks that are running, runnable or in uninterruptible sleep. It therefore mixes CPU demand with stuck I/O; compare it with the number of CPUs, and look elsewhere to tell which of the two it is.",
            ),
            concept(
              "top",
              "top and its CPU breakdown",
              "Per process, %CPU is a percentage of one core, so a four-thread process can show 400%, and -H shows threads separately. The summary line splits CPU time into us (user), sy (kernel), ni (niced), id (idle), wa (idle while waiting for I/O), hi and si (interrupt handling) and st (stolen by the hypervisor).",
            ),
            concept(
              "pidstat",
              "vmstat and pidstat",
              "`vmstat 1` shows the run-queue length (r) and context switches per second (cs) for the whole machine. `pidstat -u 1` splits each process's CPU into user and system, and `pidstat -w 1` gives its voluntary and involuntary context switches per second.",
            ),
            concept(
              "psi",
              "Pressure stall information",
              "/proc/pressure/cpu, memory and io report the share of recent time (10, 60 and 300 second averages) in which tasks were stalled waiting for that resource; the 'some' line counts time when at least one task was stalled. Each cgroup has the same data in cpu.pressure, memory.pressure and io.pressure. Unlike load average it measures time lost, separately per resource.",
            ),
            concept(
              "saturation",
              "Utilisation versus saturation",
              "Utilisation says how busy a resource is; saturation says how much work is waiting for it, and latency comes from saturation. A CPU-limited cgroup can be saturated (throttled, with threads waiting) while its utilisation looks low. /proc/<pid>/schedstat holds three numbers for a task: its time on CPU and its time waiting on a run queue, both in nanoseconds, and the number of timeslices it has run. The second is a direct measure of how long the task waited for a CPU.",
            ),
          ],
          { links: [SYSPERF] },
        ),
        topic("build", "Build it", [
          build(
            "throttle",
            "Reproduce CFS throttling",
            "On a machine with at least four cores, put a 4-thread CPU-bound Go HTTP server in a cgroup with cpu.max = \"50000 100000\" (half a core): create the group by hand under /sys/fs/cgroup with the cpu controller enabled in its parent's cgroup.subtree_control, or let `docker run --cpus=0.5` create it. Set GOMAXPROCS=4 explicitly so that four threads run whatever the host size or quota. Load it with a constant request rate and record p50 and p99 latency alongside cpu.stat. Then raise the quota and compare.",
            {
              doneWhen: [
                "cpu.stat showing nr_throttled and throttled_usec climbing",
                "p50 and p99 with and without the quota, and a note on why p99 suffers while average CPU looks low",
              ],
              links: [SYSPERF, CGROUP_V2],
            },
          ),
        ]),
      ],
      { detail: "How the kernel shares CPUs among tasks, and why a service can be slow while its CPU graph looks idle." },
    ),

    topic(
      "io",
      "I/O multiplexing",
      [
        topic("why", "Many connections, few threads", [
          concept(
            "thread-per-conn",
            "Blocking I/O and a thread per connection",
            "The simplest server gives each connection a thread that blocks in read. It is easy to write, but every thread costs stack memory and scheduler work, and ten thousand mostly idle connections means ten thousand mostly sleeping threads.",
          ),
          concept(
            "c10k",
            "The C10k problem",
            "The name, from 1999, for serving ten thousand simultaneous connections on one machine. Thread-per-connection servers and the select and poll calls of the time did not scale to it, which led to epoll on Linux, kqueue on the BSDs and event-driven servers such as nginx.",
          ),
          concept(
            "nonblocking",
            "Non-blocking descriptors",
            "With O_NONBLOCK set, read, write and accept return at once with EAGAIN instead of sleeping when they cannot proceed. On its own that only allows busy polling; it becomes useful together with a call that waits on many descriptors at once and says which are ready.",
          ),
        ]),
        topic("model", "Readiness versus completion", [
          concept(
            "readiness",
            "The readiness model",
            "The kernel tells you when an operation would not block, and you then perform it yourself with a non-blocking call. select, poll, epoll and kqueue work this way. Readiness is only meaningful for things like pipes, sockets and terminals: a regular file always reports ready to select and poll and can still block on the disk, and epoll refuses to register one at all. That is why Node does file I/O on a thread pool.",
          ),
          concept(
            "completion",
            "The completion model",
            "You hand the kernel the whole operation, buffer included; it performs the I/O and tells you when it has finished and with what result. io_uring on Linux and I/O completion ports on Windows work this way, and it covers regular files as well as sockets.",
          ),
        ]),
        topic("select-poll", "select and poll", [
          concept(
            "calls",
            "What select and poll do",
            "select takes bit sets of descriptors and cannot handle descriptor numbers of FD_SETSIZE (1024) or above; poll takes an array of descriptors with the events wanted for each and has no such cap. Both block until something is ready and report which descriptors are.",
          ),
          concept(
            "linear",
            "Why both cost O(n) per call",
            "Every call passes the complete set of watched descriptors into the kernel, the kernel checks each one, and the program scans the results, even when one connection out of ten thousand is active. The cost follows the number of connections watched, not the number that are busy.",
          ),
        ]),
        topic(
          "epoll",
          "epoll",
          [
            concept(
              "instance",
              "The epoll instance",
              "epoll_create1 returns a descriptor for a kernel object that holds two lists: the interest list of descriptors you registered and the ready list of those with events pending. Because the object lives in the kernel between calls, the interest set is handed over once, not on every wait.",
            ),
            concept(
              "ctl",
              "epoll_ctl and the interest list",
              "epoll_ctl adds, modifies or removes one descriptor, with the events you care about (EPOLLIN for readable, EPOLLOUT for writable) and a value of your own that comes back with each event, typically used to find the connection's state.",
            ),
            concept(
              "wait",
              "epoll_wait and the ready list",
              "When a registered descriptor becomes ready the kernel puts it on the ready list; epoll_wait sleeps until the list is non-empty or a timeout passes, and returns only those entries. One thread can wait on thousands of descriptors and is told only which ones are ready, so idle connections cost memory but no threads.",
            ),
            concept(
              "events",
              "What the events mean",
              "EPOLLIN on a listening socket means a connection is waiting for accept; on a connection it means data or end of file. EPOLLRDHUP means the peer shut down its sending side. EPOLLERR and EPOLLHUP are always reported, whether you asked for them or not.",
            ),
            concept(
              "triggering",
              "Level-triggered versus edge-triggered",
              "Level-triggered, the default, reports a descriptor on every epoll_wait for as long as it is ready, so reading only part of the data is safe. Edge-triggered (EPOLLET) reports a descriptor only when something changes on it, such as new data arriving, and not again for data that is still unread. So the descriptor must be non-blocking and you must read or write until EAGAIN before waiting again; stop early and the rest sits there with no further notification until more arrives, and the connection can stall.",
            ),
            concept(
              "oneshot",
              "Several threads on one epoll instance",
              "When several threads call epoll_wait on the same instance, events for one descriptor can be handed to two threads, which then work on the same connection at once. EPOLLONESHOT disables a descriptor after it has reported one event, until the handler re-arms it with EPOLL_CTL_MOD, so only one thread handles a connection at a time.",
            ),
            concept(
              "epollout",
              "Asking for writability only when needed",
              "A socket is writable almost all the time, so a level-triggered EPOLLOUT left registered makes epoll_wait return continuously. The usual pattern is to write straight away and, only when a write is short or returns EAGAIN, keep the remainder, register EPOLLOUT, and remove it once the buffer is flushed.",
            ),
            concept(
              "ofd",
              "epoll tracks open file descriptions",
              "A registration is removed automatically only when every descriptor referring to the same open file description has been closed. If a dup or a forked child still holds a copy, events keep arriving for a descriptor number you have already closed. Remove a descriptor with EPOLL_CTL_DEL before closing it when copies may exist.",
            ),
          ],
          { links: [EPOLL_MAN] },
        ),
        topic("loops", "Event loops", [
          concept(
            "loop",
            "The shape of an event loop",
            "Loop forever: call epoll_wait with a timeout equal to the time until the next timer; for each ready descriptor run that connection's handler, doing non-blocking reads and writes; run the timers that are due. Each connection's progress is kept in a small state object, not on a thread's stack.",
          ),
          concept(
            "no-block",
            "Never block the loop",
            "One thread serves every connection, so a handler that computes for 200 ms or makes one blocking call delays all of them by that much. Long computation and blocking calls belong on other threads, which report back to the loop.",
          ),
          concept(
            "wakeups",
            "Waking the loop from outside",
            "A thread that finishes work, or a signal, must be able to interrupt epoll_wait. The loop registers an eventfd or the read end of a pipe, and writing to it wakes the loop. timerfd and signalfd turn timers and signals into readable descriptors in the same way.",
          ),
          concept(
            "node-go",
            "Node's event loop and Go's netpoller",
            "Node's libuv runs your callbacks from exactly such a loop, built on epoll on Linux. Go keeps blocking-style code: its network descriptors are non-blocking and registered with epoll, and when a goroutine's read would block, the runtime parks the goroutine and runs another on the thread. When epoll reports the descriptor ready, the goroutine is made runnable again.",
          ),
        ]),
        topic("observe", "Seeing it on a real machine", [
          concept(
            "see-loop",
            "An event loop seen from outside",
            "In the strace of a Node or Go server you can find epoll_wait (or epoll_pwait) returning, followed by reads and writes on the descriptors it named. /proc/<pid>/fd shows the epoll instance as anon_inode:[eventpoll], and its fdinfo entry lists the registered descriptors.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "epoll-echo",
            "An epoll echo server",
            "Write a single-threaded TCP echo server in Go using raw epoll syscalls (golang.org/x/sys/unix): non-blocking sockets, one epoll loop, no goroutine per connection. Raise the descriptor limit and hold 10,000 idle connections open. This is the mechanism under Node's event loop and Go's netpoller.",
            {
              doneWhen: [
                "A link to the code",
                "Connection count and memory use with 10,000 clients attached",
              ],
              links: [EPOLL_MAN],
            },
          ),
          build(
            "writeup",
            "Write-up: what a process is",
            "Publish a short post explaining a process to your past self, using your own strace and /proc output as the illustrations. One page, no copied diagrams.",
            { doneWhen: ["A link to the published write-up"] },
          ),
          build(
            "postmortems",
            "Start the postmortem habit",
            "Read two postmortems from Dan Luu's collection. For each, write down the trigger, the root cause, why detection was slow, and what you would have checked first. Keep the habit going through every later section.",
            {
              doneWhen: ["Notes on two postmortems covering trigger, root cause, slow detection and your first check"],
              links: [
                link("Collection of postmortems", "https://github.com/danluu/post-mortems"),
                link("Postmortem lessons", "https://danluu.com/postmortem-lessons/"),
              ],
            },
          ),
        ]),
      ],
      {
        detail: "How one thread serves ten thousand connections: non-blocking descriptors, epoll, and the event loops built on them.",
        links: [paid("TLPI Ch. 63: alternative I/O models", TLPI_URL)],
      },
    ),
  ],
);
