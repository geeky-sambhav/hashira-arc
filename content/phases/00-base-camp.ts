import { cards, lab, link, note, output, read, url } from "../dsl";
import type { Phase } from "../types";

export const phase: Phase = {
  id: "base-camp",
  label: "Phase 0",
  title: "Base camp: Linux and Go",
  summary:
    "Get a real Linux machine under your fingers and learn the language the rest of the roadmap is written in. Everything later assumes you can live in a shell and write small Go programs.",
  weeks: { start: 1, end: 3 },
  modules: [
    {
      id: "base-linux-shell",
      title: "A Linux box and the shell",
      summary: "Week 1. A VM you can break, and enough shell to stop copy-pasting.",
      items: [
        lab("base-lima-vm", "Create your lab VM with nested virtualization", {
          week: 1,
          hours: 3,
          brief:
            "Install Lima on the Mac and start an Ubuntu VM with nestedVirtualization enabled (vmType vz). SSH in, update packages, and confirm the VM exposes /dev/kvm. This VM is your lab machine for most of the year.",
          evidence: [
            output("kvm", "Output of `uname -a` and `ls -l /dev/kvm` inside the VM"),
            note("config", "The Lima YAML you used and what each setting does"),
          ],
          links: [
            link("Lima documentation", "https://lima-vm.io/docs/"),
            link("Lima default template (nestedVirtualization)", "https://github.com/lima-vm/lima/blob/master/templates/default.yaml"),
          ],
        }),
        read("base-missing-semester-shell", "Missing Semester: the shell and shell tools", {
          week: 1,
          hours: 4,
          source: "MIT Missing Semester",
          chapters: "Lectures 1-2, with exercises",
          links: [link("The Missing Semester of Your CS Education", "https://missing.csail.mit.edu/")],
        }),
        read("base-tlcl-part1", "The Linux Command Line: learning the shell", {
          week: 1,
          hours: 10,
          source: "The Linux Command Line (Shotts)",
          chapters: "Part 1, ch. 1-10: navigation, files, redirection, permissions, processes",
          links: [link("The Linux Command Line (free PDF)", "https://linuxcommand.org/tlcl.php")],
        }),
        lab("base-shell-drills", "Shell drills: pipes, permissions, a log summarizer", {
          week: 1,
          hours: 5,
          brief:
            "Without a GUI: create users and groups, set permissions so one user can read a file and another cannot, and write a bash script that reads an nginx-style access log and prints the top 10 IPs and status-code counts using only sort, uniq, awk and grep.",
          evidence: [
            output("script", "The script and its output on a sample log"),
            output("perms", "`ls -l` and a denied read demonstrating the permission setup"),
          ],
        }),
      ],
    },
    {
      id: "base-linux-admin",
      title: "Running a Linux machine",
      summary: "Week 2. Packages, processes, services, and the tools you reach for when a box is sick.",
      items: [
        read("base-tlcl-part2", "The Linux Command Line: configuration and common tasks", {
          week: 2,
          hours: 8,
          source: "The Linux Command Line (Shotts)",
          chapters: "Ch. 11-20: environment, vi, package management, storage, networking, find, archiving, regex",
          links: [link("The Linux Command Line (free PDF)", "https://linuxcommand.org/tlcl.php")],
        }),
        read("base-missing-semester-env", "Missing Semester: command-line environment and debugging", {
          week: 2,
          hours: 3,
          source: "MIT Missing Semester",
          chapters: "Command-line environment (job control, tmux, SSH); Debugging and profiling",
          links: [link("The Missing Semester of Your CS Education", "https://missing.csail.mit.edu/")],
        }),
        read("base-crisis-tools", "Linux crisis tools", {
          week: 2,
          hours: 1.5,
          source: "Brendan Gregg's blog",
          chapters: "Install every package in the table on your VM",
          links: [link("Linux crisis tools", "https://www.brendangregg.com/blog/2024-03-24/linux-crisis-tools.html")],
        }),
        lab("base-crisis-tour", "Tour the crisis tools under load", {
          week: 2,
          hours: 3,
          brief:
            "Generate CPU, memory and disk load with stress-ng, one at a time. For each, run uptime, vmstat 1, mpstat -P ALL 1, pidstat 1, iostat -xz 1, free -m and sar, and write down which tool showed the problem first and which column gave it away.",
          evidence: [
            output("vmstat", "vmstat and iostat output during the disk-load run"),
            note("table", "A table: load type -> first tool to show it -> the column to look at"),
          ],
          links: [link("USE method", "https://www.brendangregg.com/usemethod.html")],
        }),
      ],
    },
    {
      id: "base-go",
      title: "Go, enough to build with",
      summary: "Weeks 2-3. The systems language for every later lab.",
      items: [
        read("base-tour-of-go", "A Tour of Go", {
          week: 2,
          hours: 8,
          source: "go.dev",
          chapters: "All sections, including concurrency; do every exercise",
          links: [link("A Tour of Go", "https://go.dev/tour/")],
        }),
        read("base-go-with-tests", "Learn Go with Tests", {
          week: 3,
          hours: 14,
          source: "Learn Go with Tests (Chris James)",
          chapters: "Go fundamentals through Concurrency, Select, Sync and Context",
          links: [link("Learn Go with Tests", "https://quii.gitbook.io/learn-go-with-tests")],
        }),
        lab("base-go-coreutils", "Rewrite cat, wc and grep in Go", {
          week: 3,
          hours: 8,
          brief:
            "Implement three small tools that read files or stdin, handle errors and exit codes properly, and have table-driven tests. Compare your wc against the real one on a 1 GB file and explain the speed difference (hint: buffering).",
          evidence: [
            url("repo", "Link to the code in your labs repository"),
            output("bench", "Timing of your wc vs the system wc, before and after adding bufio"),
          ],
          links: [link("Effective Go", "https://go.dev/doc/effective_go")],
        }),
        lab("base-go-systemd", "Run a Go HTTP service under systemd", {
          week: 3,
          hours: 5,
          brief:
            "Write a tiny HTTP server that shuts down gracefully on SIGTERM. Run it as a systemd unit with Restart=on-failure, read its logs with journalctl, kill it with SIGKILL and watch systemd restart it, then stop it and confirm in-flight requests finish.",
          evidence: [
            output("unit", "The unit file and `systemctl status` output"),
            output("restart", "journalctl lines showing the kill and the automatic restart"),
          ],
          links: [link("systemd.service manual", "https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html")],
        }),
        lab("base-labs-repo", "Start your public labs repository", {
          week: 3,
          hours: 2,
          brief:
            "Create a public GitHub repository for lab code and notes, one directory per phase. Write a short README for this phase: what you built, what surprised you. Every later phase ends with a write-up here or on a blog.",
          evidence: [url("repo", "Link to the repository")],
          links: [link("Julia Evans: blog about what you've struggled with", "https://jvns.ca/blog/2021/05/24/blog-about-what-you-ve-struggled-with/")],
        }),
      ],
    },
  ],
};

export const quiz = [
  ...cards("base-linux-shell", [
    ["What do the three permission triplets in `-rwxr-x---` mean?", "Owner can read, write, execute; group can read and execute; everyone else has no access."],
    ["What is the difference between `>` and `>>`, and what does `2>&1` do?", "`>` truncates then writes, `>>` appends. `2>&1` points stderr (fd 2) at wherever stdout (fd 1) currently points."],
    ["What does a pipe `a | b` connect?", "The stdout of process a to the stdin of process b, through a kernel buffer. Both run at the same time."],
    ["What does the execute bit mean on a directory?", "Permission to traverse it: to access entries inside by name. Read lets you list names; execute lets you actually reach them."],
    ["How do you find which process is listening on port 8080?", "`ss -ltnp | grep 8080` (or `lsof -i :8080`)."],
    ["What is an exit code and where do you read the last one?", "An integer a process returns on exit; 0 means success. The shell stores the last one in `$?`."],
  ]),
  ...cards("base-linux-admin", [
    ["In `uptime`, what does a load average of 8 on a 4-core machine tell you on Linux?", "On average 8 tasks were running or waiting to run (or in uninterruptible I/O wait), about twice what the CPUs can serve. Linux load includes tasks blocked on disk I/O."],
    ["What is the USE method?", "For every resource check Utilization, Saturation and Errors. It gives a complete, ordered checklist instead of guessing."],
    ["Which vmstat columns reveal memory pressure?", "`si`/`so` (swap in/out) being non-zero, and a low `free` together with shrinking `cache`. `r` shows the run queue, `wa` shows I/O wait."],
    ["What does `Restart=on-failure` do in a systemd unit?", "systemd restarts the service when it exits with a non-zero code, is killed by a signal, or times out, but not on a clean exit."],
    ["How do you follow the logs of a systemd service?", "`journalctl -u <unit> -f`."],
    ["Why is `kill -9` a last resort?", "SIGKILL cannot be caught, so the process gets no chance to flush buffers, finish requests or release resources cleanly."],
  ]),
  ...cards("base-go", [
    ["What is a goroutine, and how does it differ from an OS thread?", "A function running concurrently, scheduled by the Go runtime onto a small pool of OS threads. It starts with a few KB of stack that grows, so you can have hundreds of thousands."],
    ["What happens when you send on an unbuffered channel with no receiver ready?", "The sender blocks until a receiver is ready. Unbuffered channels synchronize the two goroutines."],
    ["How does Go report errors, and what is the idiom?", "Functions return an `error` value as the last result; callers check `if err != nil` immediately and wrap with `fmt.Errorf(\"...: %w\", err)`."],
    ["What does `defer` do and when does it run?", "It schedules a call to run when the surrounding function returns, in last-in-first-out order. Typical use: closing files, unlocking mutexes."],
    ["What is `context.Context` for?", "Carrying cancellation, deadlines and request-scoped values across API boundaries and goroutines so work can be stopped when the caller gives up."],
    ["Why was your first Go `wc` much slower than the system one?", "Unbuffered reads make one read syscall per small chunk. Wrapping the file in `bufio.Reader` batches them into large reads."],
    ["What is the zero value of a slice, map and pointer, and which is safe to write to?", "All are nil. Appending to a nil slice works; writing to a nil map panics; dereferencing a nil pointer panics."],
  ]),
];
