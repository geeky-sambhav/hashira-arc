import { build, concept, link, section, topic } from "../dsl";

const MISSING = link("The Missing Semester of Your CS Education", "https://missing.csail.mit.edu/");
const TLCL = link("The Linux Command Line (free PDF)", "https://linuxcommand.org/tlcl.php");
const LIMA_DOCS = link("Lima documentation", "https://lima-vm.io/docs/");
const LIMA_TEMPLATE = link(
  "Lima default template (nestedVirtualization)",
  "https://github.com/lima-vm/lima/blob/master/templates/default.yaml",
);
const CRISIS_TOOLS = link("Linux crisis tools", "https://www.brendangregg.com/blog/2024-03-24/linux-crisis-tools.html");
const USE_METHOD = link("USE method", "https://www.brendangregg.com/usemethod.html");
const SYSTEMD_SERVICE = link(
  "systemd.service manual",
  "https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html",
);
const TOUR = link("A Tour of Go", "https://go.dev/tour/");
const GO_WITH_TESTS = link("Learn Go with Tests", "https://quii.gitbook.io/learn-go-with-tests");
const EFFECTIVE_GO = link("Effective Go", "https://go.dev/doc/effective_go");

export default section(
  "base-camp",
  {
    title: "Base camp: Linux and Go",
    summary:
      "A real Linux machine under your fingers and the language the rest of the sheet is written in: what a Linux system is made of, the shell and the filesystem, running and diagnosing a machine, and enough Go to build small systems programs. Everything later assumes you can live in a shell and write small Go programs.",
  },
  [
    topic(
      "machine",
      "A Linux machine of your own",
      [
        topic("anatomy", "What a Linux system is made of", [
          concept(
            "kernel",
            "The kernel",
            "The kernel is the one program that runs with full access to the hardware. It shares the CPUs, memory, disks and network between all other programs and keeps them isolated from each other.",
          ),
          concept(
            "syscalls",
            "System calls: the only way in",
            "A normal program cannot touch hardware or another program's memory. It asks the kernel through system calls such as open, read, write, fork and execve, and `strace` prints the ones a program makes.",
          ),
          concept(
            "userland",
            "Userland",
            "Everything that is not the kernel: the C library, the shell, the core utilities, daemons and your own code. `ls` is an ordinary program in a file on disk, not part of the kernel.",
          ),
          concept(
            "distro",
            "Distributions",
            "A distribution packages the Linux kernel with a userland, an init system, a package manager and default settings. Ubuntu and Debian use apt and .deb packages, Fedora and RHEL use dnf and .rpm; the kernel underneath is the same project.",
          ),
          concept(
            "shell",
            "Terminal, shell and program are three things",
            "The terminal displays text and sends your keystrokes. The shell (bash, zsh) is a program that reads a line, works out which program to run and starts it. The program you ran then does the work and exits.",
          ),
          concept(
            "man",
            "Finding the manual",
            "The manual is split into sections: 1 for commands, 2 for system calls, 3 for library functions, 5 for file formats, 7 for overviews such as `man 7 signal` and 8 for admin commands, so `man 1 printf` and `man 3 printf` are different pages. `type name` tells you whether a command is a builtin, an alias or a file on disk.",
          ),
        ]),
        topic("vm", "The lab VM", [
          concept(
            "why-vm",
            "Why the lab is a Linux VM",
            "macOS has a different kernel: no /proc, no cgroups, no namespaces, no systemd. A VM gives you a real Linux kernel that you can break, delete and recreate in minutes without risking your laptop.",
          ),
          concept(
            "guest",
            "Hypervisor, host and guest",
            "A hypervisor runs a guest operating system with its own kernel on virtual hardware: virtual CPUs, a virtual disk and a virtual network card. The guest kernel behaves as if it owns a machine; the host decides how much CPU, memory and disk it really gets.",
          ),
          concept(
            "lima",
            "Lima: a VM described in a YAML file",
            "Lima reads a template that names the OS image, CPUs, memory, disk and mounts, boots the VM and sets up SSH so that `limactl shell <name>` drops you inside. `vmType: vz` uses Apple's Virtualization framework instead of QEMU, and is Lima's default on macOS 13.5 and later. On an Apple Silicon Mac the guest is an arm64 (aarch64) Linux.",
            { links: [LIMA_DOCS] },
          ),
          concept(
            "kvm",
            "/dev/kvm and nested virtualization",
            "On Linux, programs start hardware-accelerated VMs through the /dev/kvm device. Inside a VM it only exists if the outer hypervisor passes the CPU's virtualization support through to the guest, which is called nested virtualization. Virtualization and Firecracker and the migration capstone need it.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "lima-vm",
            "Create your lab VM with nested virtualization",
            "Install Lima on the Mac and start an Ubuntu VM with `nestedVirtualization: true` and `vmType: vz`; Lima supports this on an Apple M3 or later chip running macOS 15 or later. SSH in, update packages, and confirm the VM exposes /dev/kvm. This VM is your lab machine for most of the sheet.",
            {
              doneWhen: [
                "Output of `uname -a` and `ls -l /dev/kvm` inside the VM",
                "The Lima YAML you used and a note on what each setting does",
              ],
              links: [LIMA_DOCS, LIMA_TEMPLATE],
            },
          ),
        ]),
      ],
      { detail: "The parts of a Linux system, and a disposable VM to try every later row on." },
    ),

    topic(
      "shell",
      "The shell and the filesystem",
      [
        topic("fs", "The filesystem tree", [
          concept(
            "tree",
            "One tree, absolute and relative paths",
            "Everything lives under a single root `/`; there are no drive letters, and other disks appear as directories. A path starting with `/` is absolute; anything else is resolved from the process's current directory, with `.` meaning here, `..` the parent and `~` (expanded by the shell) your home.",
          ),
          concept(
            "hierarchy",
            "Where things live",
            "/etc holds configuration, /var holds data that changes (logs are in /var/log), /home holds users' files, /usr holds installed programs and libraries, /tmp is scratch space, /dev holds device files, /proc and /sys expose kernel state, and /run holds runtime state that is cleared at boot.",
          ),
          concept(
            "everything-file",
            "Everything is a file",
            "Devices, pipes, sockets and kernel state are opened, read and written with the same calls as regular files. The first character of `ls -l` gives the type: `-` regular file, `d` directory, `l` symlink, `c` and `b` devices, `p` pipe, `s` socket. /dev/null discards whatever is written to it.",
          ),
          concept(
            "inodes",
            "Inodes and directory entries",
            "A file is an inode: its metadata (owner, mode, size, timestamps) and the location of its data. The name is not in the inode; a directory is a table mapping names to inode numbers. `stat` and `ls -i` show them.",
          ),
          concept(
            "links",
            "Hard links and symbolic links",
            "A hard link is another name for the same inode, on the same filesystem, and cannot point to a directory; the data is freed only when the last name is removed and no process still has the file open. A symlink is a tiny file holding a path: it can point across filesystems and it dangles when its target is removed.",
          ),
          concept(
            "viewing",
            "Reading and editing files in a terminal",
            "`less file` pages through a file of any size without loading it all: `/text` searches, `G` jumps to the end and `q` quits. On a server there is no GUI editor, so learn one terminal editor (nano, or vim's basics: `i` to insert, Esc, `:wq` to save and quit).",
          ),
        ]),
        topic("perms", "Ownership and permissions", [
          concept(
            "ids",
            "Users and groups are numbers",
            "The kernel only knows numeric user IDs and group IDs; names are looked up in /etc/passwd and /etc/group. Every process runs as one UID with a set of GIDs, every file has one owning UID and one owning GID, and UID 0 (root) bypasses most permission checks. `id` shows yours.",
          ),
          concept(
            "triplets",
            "The nine permission bits",
            "`-rwxr-x---` reads as three triplets: the owner can read, write and execute; the group can read and execute; everyone else has no access.",
          ),
          concept(
            "check-order",
            "How the kernel picks a triplet",
            "Ignoring ACLs: if the process's effective UID owns the file, only the owner bits apply; otherwise, if one of its groups matches, only the group bits; otherwise the other bits. Exactly one triplet is used, so an owner without the read bit is denied even when everyone else may read. The check happens at open: a descriptor that is already open keeps working after a chmod.",
          ),
          concept(
            "dir-bits",
            "What the bits mean on a directory",
            "Read lets you list the names. Execute is permission to traverse it: to reach entries inside by name. Write (together with execute) lets you create, rename and delete entries, so deleting a file needs write permission on its directory, not on the file.",
          ),
          concept(
            "chmod",
            "chmod, chown and octal modes",
            "Each triplet is one digit: read is 4, write 2, execute 1, so 750 is rwxr-x--- and 644 is rw-r--r--. `chmod u+x file` changes bits symbolically; `chown user:group file` changes ownership. Changing the owner needs root; a file's owner may change its group only to a group they belong to.",
          ),
          concept(
            "umask",
            "umask: default permissions for new files",
            "A program asks for a mode when it creates a file (usually 666 for files and 777 for directories) and the kernel clears the bits that are set in the process's umask. With the common umask 022 that gives 644 and 755.",
          ),
          concept(
            "special",
            "setuid, setgid and the sticky bit",
            "A setuid executable runs with its owner's UID, which is how `sudo` and `passwd` gain root. A setgid directory makes new files inherit its group. The sticky bit on a world-writable directory such as /tmp lets users delete or rename only the files they own.",
          ),
        ]),
        topic("procs", "Processes from the shell", [
          concept(
            "process",
            "What a process is",
            "A running instance of a program with its own memory, a process ID, a parent, a user identity, a current directory, environment variables and open files. `ps aux` lists them all, and /proc/<pid>/ exposes one process's command line, environment, working directory and open file descriptors as files.",
          ),
          concept(
            "run-cmd",
            "How the shell runs a command",
            "The shell forks a copy of itself, the child replaces itself with the program through exec, and the parent waits and collects the exit status. Builtins such as `cd` run inside the shell itself, because a child process cannot change its parent's directory.",
          ),
          concept(
            "states",
            "Process states in ps and top",
            "R is running or ready to run, S is sleeping until an event, D is uninterruptible sleep (usually waiting on disk I/O), T is stopped, and Z is a zombie: it has exited but its parent has not yet collected its exit status.",
          ),
          concept(
            "signals",
            "Signals",
            "A signal is a small asynchronous notification delivered to a process by the kernel or by `kill`. SIGINT is Ctrl-C, SIGTERM is the polite request to exit and the default for `kill`, SIGHUP means the terminal went away. A process can install a handler for these or let the default action, usually termination, happen.",
          ),
          concept(
            "sigkill",
            "Why kill -9 is a last resort",
            "SIGKILL cannot be caught, so the process gets no chance to flush buffers, finish requests or release resources cleanly. Send SIGTERM first and escalate only if the process does not exit.",
          ),
          concept(
            "jobs",
            "Job control",
            "`cmd &` runs in the background, Ctrl-Z stops the foreground job, and `jobs`, `fg` and `bg` manage them. When the terminal closes, the shell sends SIGHUP to its jobs, so long-running work needs `nohup`, tmux or a service manager.",
          ),
        ]),
        topic("streams", "Streams, pipes and exit codes", [
          concept(
            "fds",
            "File descriptors 0, 1 and 2",
            "A file descriptor is a small integer naming one of a process's open files. By convention 0 is standard input, 1 is standard output and 2 is standard error, and a child inherits its parent's descriptors. Errors go to a separate stream so they still reach the terminal when the output is piped elsewhere.",
          ),
          concept(
            "redirect",
            "Redirection: >, >> and <",
            "`>` truncates the file then writes, `>>` appends, `<` reads standard input from a file. The shell opens the file and points the descriptor at it before the program starts, so the program does not know or care. `> /dev/null` discards output, and `tee file` writes to a file while still passing the data on.",
          ),
          concept(
            "dup",
            "2>&1 and why order matters",
            "`2>&1` points stderr (fd 2) at wherever stdout (fd 1) currently points. Redirections are applied left to right, so `cmd > out 2>&1` sends both to the file while `cmd 2>&1 > out` leaves stderr on the terminal.",
          ),
          concept(
            "pipe",
            "Pipes",
            "`a | b` connects the stdout of process a to the stdin of process b through a kernel buffer. Both run at the same time. The buffer is finite, so a fast writer blocks until the reader catches up; the reader sees end of file when every writer has closed, and a writer whose readers have all exited is killed by SIGPIPE (or gets an EPIPE error if it ignores that signal).",
          ),
          concept(
            "exit",
            "Exit codes and the $? variable",
            "An exit code is an integer from 0 to 255 that a process returns on exit; 0 means success. The shell stores the last one in `$?`. Bash reports 127 for command not found, 126 for not executable, and 128 plus the signal number for a process killed by a signal (137 for SIGKILL).",
          ),
          concept(
            "chain",
            "&&, || and the status of a pipeline",
            "`a && b` runs b only if a succeeded, `a || b` only if it failed, `a; b` always. A pipeline's status is that of its last command, so `false | true` counts as success unless `pipefail` is set.",
          ),
        ]),
        topic("expansion", "Quoting, expansion and globbing", [
          concept(
            "argv",
            "The program sees an argument list, not your line",
            "The shell rewrites the command line and hands the program an array of strings. Bash expands in this order: braces, then tilde, variables, command substitution and arithmetic, then word splitting, then file-name globbing. The program never sees `*` or `$HOME` unless you quoted them (or, for `*`, nothing matched).",
          ),
          concept(
            "variables",
            "Shell variables",
            "`name=value` (no spaces around `=`) sets a variable and `$name` or `${name}` reads it. `${name:-default}` substitutes a default when it is unset or empty. An unset variable expands to the empty string without any error unless `set -u` is on.",
          ),
          concept(
            "split",
            "Word splitting",
            "The result of an unquoted `$var` or `$(cmd)` is split on the characters in `IFS` (by default space, tab and newline), and each piece is then globbed. A file called `my file.txt` becomes two arguments. Putting the expansion in double quotes keeps it as one argument.",
          ),
          concept(
            "quotes",
            "Single quotes, double quotes and backslash",
            "Single quotes keep every character literal. Double quotes still expand `$var` and `$(cmd)` but prevent splitting and globbing. A backslash escapes the next character. The safe default is to write `\"$var\"` everywhere.",
          ),
          concept(
            "globs",
            "Globs",
            "`*` matches any run of characters, `?` one character and `[abc]` one of a set, against file names, and the shell does the matching before the program starts. `*` does not match a leading dot, and in bash a pattern that matches nothing is passed through unchanged. Globs are not regular expressions.",
          ),
          concept(
            "subst",
            "Command, arithmetic and brace expansion",
            "`$(cmd)` is replaced by the command's standard output with trailing newlines removed. `$((2 + 3))` does integer arithmetic. `{a,b}.txt` and `{1..5}` generate strings whether or not such files exist. In bash, `<(cmd)` gives a file name that reads from the command's output, so `diff <(a) <(b)` works.",
          ),
        ]),
        topic(
          "text",
          "The text tools",
          [
            concept(
              "grep",
              "grep",
              "Prints the lines that match a pattern. `-i` ignores case, `-v` inverts, `-n` adds line numbers, `-r` searches a directory tree, `-c` counts, `-o` prints only the matched part, `-E` enables extended regular expressions and `-F` matches a fixed string. It exits 0 when something matched and 1 when nothing did, so it works as a test in scripts.",
            ),
            concept(
              "regex",
              "Regular expressions",
              "`.` is any character, `[a-z]` a set, `^` and `$` the start and end of the line, and `*` zero or more of the previous item. Extended syntax (`grep -E`, awk) adds `+`, `?`, `|` and grouping with `()`. Matching is greedy. Quote the pattern so the shell does not expand it first.",
            ),
            concept(
              "sed",
              "sed",
              "A stream editor: it applies editing commands to each line as it passes through. `sed 's/old/new/g'` substitutes, `sed -n '5,10p'` prints a range of lines, `sed '/pattern/d'` deletes matching lines, and GNU `sed -i` edits a file in place.",
            ),
            concept(
              "awk",
              "awk",
              "awk splits each line into fields `$1`, `$2` up to `$NF` (on whitespace, or on the `-F` separator) and runs `pattern { action }` rules against it. Associative arrays and an `END` block make it a one-line aggregator: `awk '{n[$9]++} END {for (s in n) print n[s], s}'` counts lines per value of field 9.",
            ),
            concept(
              "sort-uniq",
              "sort, uniq and the top-N idiom",
              "`uniq` only collapses adjacent duplicate lines, so sort first. `sort | uniq -c | sort -rn | head` is the standard 'most frequent values' pipeline. `sort -n` compares numerically, `-r` reverses, `-k` picks a field and `-u` removes duplicates. Text ordering depends on the locale; `LC_ALL=C` gives plain byte order.",
            ),
            concept(
              "slicing",
              "cut, tr, head, tail and wc",
              "`cut -d, -f2` takes fields by delimiter, `tr` translates or deletes characters, `head -n` and `tail -n` take the ends of a stream, `tail -f` follows a growing file, and `wc -l` counts lines.",
            ),
            concept(
              "find",
              "find",
              "Walks a directory tree and tests every entry: `-name '*.log'`, `-type f`, `-mtime +7`, `-size +100M`. Matches are printed, passed to a command with `-exec cmd {} +`, or removed with `-delete`. Quote the name pattern, or the shell expands it before find sees it.",
            ),
            concept(
              "xargs",
              "xargs",
              "Reads items from standard input and runs a command with them as arguments, which is how you feed a list into a program that does not read stdin. It splits on whitespace by default, so file names with spaces break; `find -print0 | xargs -0` uses NUL separators instead. `-P` runs several commands in parallel.",
            ),
          ],
          {
            detail:
              "Small programs that each read lines, do one job and write lines, so that they combine through pipes.",
          },
        ),
        topic("scripts", "Shell scripts that fail safely", [
          concept(
            "shebang",
            "The shebang line and running a script",
            "The first line `#!/usr/bin/env bash` tells the kernel which interpreter to start, and the file needs the execute bit. `./script` runs it in a new process; `source script` runs it in the current shell, which is the only way it can change your variables or directory.",
          ),
          concept(
            "args",
            "Arguments: $1, $# and \"$@\"",
            "`$1`, `$2` and so on are the positional arguments, `$#` is their count and `$0` the script's name. `\"$@\"` expands to every argument as a separate, intact word and is the correct way to pass them on.",
          ),
          concept(
            "tests",
            "Conditions and loops run on exit codes",
            "`if cmd; then` branches on the command's exit status; `[[ -f path ]]`, `[[ -z $s ]]` and `[[ $a == $b ]]` are tests that return 0 or 1. `for f in *.log` loops over words, and `while IFS= read -r line; do ...; done < file` reads a file line by line without mangling it.",
          ),
          concept(
            "functions",
            "Functions",
            "`name() { ...; }` defines a function that takes positional arguments like a script. `local` keeps a variable inside it. `return` sets an exit status from 0 to 255; data comes back by printing to stdout and capturing it with `$(name)`.",
          ),
          concept(
            "heredoc",
            "Here documents",
            "`cmd <<EOF` feeds the following lines, up to a line containing only `EOF`, to the command's standard input; variables and `$(...)` inside are expanded unless the marker is quoted (`<<'EOF'`). Scripts use it to write config files or pass multi-line input without a temporary file.",
          ),
          concept("strict", "set -euo pipefail", undefined, {
            parts: [
              concept(
                "errexit",
                "set -e: stop at the first failure",
                "The script exits as soon as a command returns non-zero instead of carrying on with bad state. It does not trigger for a command tested by `if` or `while`, any command in an `&&` or `||` list except the last, a command negated with `!`, or anywhere but last in a pipeline. The exemption reaches inside: a function called as an `if` condition runs with `-e` off.",
              ),
              concept(
                "nounset",
                "set -u: unset variables are errors",
                "Expanding a variable that was never set aborts the script. Without it a typo expands to nothing, and `rm -rf \"$DIR/\"*` with DIR unset deletes from the root.",
              ),
              concept(
                "pipefail",
                "set -o pipefail: any failing stage fails the pipeline",
                "The pipeline's status becomes that of the last command in it that failed, so `curl ... | sort` no longer reports success when the download failed.",
              ),
            ],
          }),
          concept(
            "trap",
            "trap: cleanup on exit",
            "`trap 'rm -rf \"$tmp\"' EXIT` runs the command when the script exits, whether normally, through `exit` or through an error under `set -e`; nothing can run after SIGKILL. Pair it with `mktemp -d` so temporary files get unique names and are removed.",
          ),
          concept(
            "habits",
            "Defensive habits",
            "Quote every expansion, put `--` before file-name arguments so a name starting with `-` is not read as an option, and run `shellcheck` on every script; it catches most quoting and word-splitting bugs before they run.",
          ),
        ]),
        topic(
          "remote",
          "Remote machines: ssh and keys",
          [
            concept(
              "ssh",
              "What ssh gives you",
              "An encrypted, authenticated connection to the `sshd` daemon on another machine (TCP port 22 by default), over which you get a shell, run a single command (`ssh host cmd`) or copy files.",
            ),
            concept(
              "keys",
              "Key pairs instead of passwords",
              "`ssh-keygen` makes a private key that never leaves your machine and a public key that you append to `~/.ssh/authorized_keys` on the server. At login the client proves it holds the private key by signing a value from the session; no secret crosses the network. ssh refuses a private key file that other users can read.",
            ),
            concept(
              "host-keys",
              "Host keys and known_hosts",
              "The server proves its identity with its own host key. On first connection you are asked to accept it (trust on first use) and it is saved in `~/.ssh/known_hosts`; a later mismatch warning means the server was reinstalled or someone is intercepting the connection.",
            ),
            concept(
              "config",
              "~/.ssh/config and ssh-agent",
              "A `Host` block in the config file stores the host name, user, port and identity file under a short alias. `ssh-agent` holds unlocked private keys in memory so you type a passphrase once per session rather than once per connection.",
            ),
            concept(
              "forward",
              "Copying files and forwarding ports",
              "`scp` and `rsync -a` copy files over ssh; rsync only sends what changed. `ssh -L 8080:localhost:80 host` makes port 8080 on your machine reach port 80 as seen from the remote host, which is how you reach a service that only listens on the server's loopback.",
            ),
            concept(
              "tmux",
              "tmux: sessions that survive a disconnect",
              "A tmux session runs on the server, not inside your ssh connection. You can detach, lose the network or close the laptop, then `tmux attach` and find your shells and running commands as you left them.",
            ),
          ],
          { links: [MISSING] },
        ),
        topic("build", "Build it", [
          build(
            "shell-drills",
            "Shell drills: pipes, permissions, a log summarizer",
            "Without a GUI: create users and groups, set permissions so one user can read a file and another cannot, and write a bash script that reads an nginx-style access log and prints the top 10 IPs and status-code counts using only sort, uniq, awk and grep. Creating the accounts needs `sudo useradd` and `sudo groupadd`, which the next topic explains.",
            {
              doneWhen: [
                "The script and its output on a sample log",
                "`ls -l` and a denied read demonstrating the permission setup",
              ],
            },
          ),
        ]),
      ],
      {
        detail: "Files, permissions, processes, pipes and the text tools, well enough to stop copy-pasting commands.",
        links: [MISSING, TLCL],
      },
    ),

    topic(
      "admin",
      "Running a Linux machine",
      [
        topic("packages", "Installing software", [
          concept(
            "package",
            "What a package is",
            "An archive of files plus metadata: name, version, dependencies and scripts to run on install and removal. The package manager records which package owns every file, so it can upgrade and remove software cleanly. On Debian and Ubuntu `dpkg` installs one .deb file, while `apt` finds packages in repositories, resolves dependencies and calls dpkg.",
          ),
          concept(
            "repos",
            "Repositories, apt update and apt upgrade",
            "`apt update` only downloads the signed package indexes from the repositories configured under /etc/apt; it installs nothing. `apt install` and `apt upgrade` then fetch and install packages from those indexes. `apt search`, `apt show`, `dpkg -L pkg` (files in a package) and `dpkg -S /path` (owner of a file) answer what is installed and where.",
          ),
          concept(
            "shared-libs",
            "Shared libraries and why dependencies exist",
            "Most programs load shared libraries (.so files) such as libc when they start, and `ldd /bin/ls` lists them. A package depends on the packages that ship those libraries. A statically linked binary carries everything inside one file, which is why a Go program can often be copied to a server as a single file.",
          ),
          concept(
            "outside",
            "Software outside the package manager",
            "Binaries you install by hand go in /usr/local/bin or /opt so they do not collide with packaged files in /usr. A release tarball is unpacked with `tar -xzf`; `tar -czf` creates one and `tar -tf` lists it. Piping a downloaded script into a shell runs someone else's code with your privileges.",
          ),
        ]),
        topic("users", "Users, groups and sudo", [
          concept(
            "accounts",
            "/etc/passwd, /etc/shadow and /etc/group",
            "Each line of /etc/passwd is an account: name, UID, primary GID, home directory and login shell. Password hashes live in /etc/shadow, readable only by root, and /etc/group lists groups and their extra members. Services get their own accounts with no login shell, so a compromised service is not a compromised root.",
          ),
          concept(
            "manage",
            "Creating users and groups",
            "`useradd -m name` creates an account with a home directory, `groupadd` creates a group and `usermod -aG group user` adds a user to it; without `-a` the user's other supplementary groups are replaced. A new group membership applies only to sessions started after the change.",
          ),
          concept(
            "sudo",
            "sudo",
            "sudo runs one command as root (or as another user with `-u`) after checking the rules in /etc/sudoers, and logs it. It works because the sudo binary is setuid root. Edit the rules with `visudo`, which refuses to save a file with syntax errors. Staying an ordinary user and elevating per command limits the damage of a mistake.",
          ),
          concept(
            "sudo-redirect",
            "Why sudo echo x > /etc/file fails",
            "The redirection is performed by your own unprivileged shell before sudo starts, so opening the file is denied. Use `echo x | sudo tee /etc/file` so that the program opening the file is the one running as root.",
          ),
        ]),
        topic("env", "Environment variables and dotfiles", [
          concept(
            "environ",
            "The environment",
            "Every process holds a list of NAME=value strings. A child receives a copy when it is started and can never change its parent's. `env` prints yours, and /proc/<pid>/environ shows what another process was started with.",
          ),
          concept(
            "export",
            "Shell variables versus exported variables",
            "A plain `name=value` exists only inside the shell. `export name` puts it in the environment passed to every child process, and `NAME=value cmd` sets it for that one command only.",
          ),
          concept(
            "path",
            "PATH",
            "A colon-separated list of directories that the shell searches, in order, for a command name that contains no slash; the first match wins. The current directory is not on it, which is why you type `./script`. `type cmd` or `command -v cmd` shows what will run.",
          ),
          concept(
            "dotfiles",
            "Startup files",
            "A bash login shell reads /etc/profile and then the first of ~/.bash_profile, ~/.bash_login or ~/.profile; an interactive non-login shell reads ~/.bashrc; a non-interactive shell running a script reads none of them, only the file named by `BASH_ENV` if that is set. This is why a variable set in ~/.bashrc is missing in a cron job or a systemd service. Aliases, prompt and history settings live in these files.",
          ),
        ]),
        topic("systemd", "systemd: services, timers and logs", [
          concept(
            "pid1",
            "PID 1 and what a service manager is for",
            "The kernel starts one user process, PID 1, which starts everything else and adopts orphaned processes. A long-running service also needs to be started at boot in the right order, restarted when it dies, stopped cleanly and have its output captured. On most distributions systemd does all of this.",
          ),
          concept(
            "units",
            "Units and where unit files live",
            "A unit is one thing systemd manages, described by an INI-style file: `.service` for a process, `.timer` for a schedule, `.socket`, `.mount`, and `.target` for a named group of units. Packages install units under /usr/lib/systemd/system (/lib/systemd/system on older Debian and Ubuntu); your own go in /etc/systemd/system, which takes precedence. Change a packaged unit with `systemctl edit`, which writes a drop-in override instead of editing the package's file, and run `systemctl daemon-reload` after editing a unit file by hand.",
          ),
          concept("service", "Anatomy of a service unit", undefined, {
            links: [SYSTEMD_SERVICE],
            parts: [
              concept(
                "sections",
                "[Unit], [Service] and [Install]",
                "[Unit] holds the description and dependencies, [Service] says how to run the process, and [Install] says what `enable` hooks it into; `WantedBy=multi-user.target` means 'start in a normal boot'. `After=` only sets ordering, while `Wants=` and `Requires=` pull another unit in; you usually need both.",
              ),
              concept(
                "execstart",
                "ExecStart, User and Environment",
                "With the default `Type=simple`, `ExecStart=` is the command for the main process, which should stay in the foreground and log to stdout or stderr. It is not run by a shell, so pipes, redirections and globs do not work. `User=` drops privileges, and `Environment=` or `EnvironmentFile=` supply variables, because a service inherits nothing from your login shell.",
              ),
              concept(
                "restart",
                "Restart= policies",
                "`Restart=on-failure` restarts the service when it exits with a non-zero code, is killed by a signal such as SIGKILL or SIGSEGV, or times out, but not after a clean exit; termination by SIGTERM, SIGINT, SIGHUP or SIGPIPE counts as clean. `Restart=always` restarts whatever the exit was. Neither applies when you stop it with `systemctl stop`. `RestartSec=` sets the delay, and a service that keeps failing quickly hits the start limit and is left in the failed state.",
              ),
            ],
          }),
          concept(
            "systemctl",
            "systemctl: start, enable and status",
            "`start`, `stop` and `restart` act now; `enable` and `disable` decide whether the unit starts at boot and do not start or stop it (`enable --now` does both). `status` shows whether it is loaded and enabled, its active state, main PID, process tree and last log lines, plus the exit code or signal if it failed. `systemctl --failed` lists broken units.",
          ),
          concept(
            "stop",
            "What systemctl stop does",
            "systemd keeps each service's processes in their own control group, so it knows all of them however they were forked. On stop it sends SIGTERM, waits up to `TimeoutStopSec=` for them to exit, and then sends SIGKILL. A service that handles SIGTERM by finishing in-flight work and exiting shuts down cleanly; one that ignores it loses that work when the timeout expires.",
          ),
          concept(
            "journal",
            "journald and journalctl",
            "journald collects each service's stdout and stderr, syslog messages and kernel messages into one indexed journal. `journalctl -u <unit> -f` follows one service's logs; `-b` limits to the current boot, `--since \"1 hour ago\"` to a time range, `-p err` to errors and worse, and `-k` to kernel messages.",
          ),
          concept(
            "timers",
            "Timers and cron",
            "A `.timer` unit starts the service of the same name (by default) on a calendar schedule (`OnCalendar=`) or after a delay (`OnBootSec=`); with `OnCalendar=`, `Persistent=true` runs a job that was missed while the machine was off, and `systemctl list-timers` shows the next runs. cron is the older scheduler: each `crontab -e` line has five time fields (minute, hour, day of month, month, day of week) and a command.",
          ),
        ]),
        topic("storage", "Disks, filesystems and mounts", [
          concept(
            "block",
            "Block devices, partitions and filesystems",
            "A disk appears as a block device such as /dev/sda, /dev/nvme0n1 or /dev/vda in a VM, and a partition table divides it into partitions (/dev/sda1). A filesystem such as ext4 or XFS, created with `mkfs`, turns a partition's raw blocks into files and directories. `lsblk` shows the whole layout.",
          ),
          concept(
            "mount",
            "Mounting",
            "`mount /dev/sdb1 /mnt/data` attaches a filesystem to a directory; whatever was in that directory is hidden until it is unmounted. `findmnt` lists what is mounted where. `umount` fails with 'target is busy' while any process has a file open there or is using it as its working directory.",
          ),
          concept(
            "fstab",
            "/etc/fstab",
            "Lists the filesystems to mount at boot: device, mount point, type and options. Identify the device by `UUID=` (from `blkid`) because names like /dev/sdb can change between boots. A wrong entry can stop the machine from booting normally unless it is marked `nofail`.",
          ),
          concept(
            "df-du",
            "df versus du",
            "`df -h` asks each filesystem how full it is; `du -sh dir` adds up the files it can reach by walking the tree. They disagree when a deleted file is still held open by a process: the space is not freed until the process closes it or exits, which is the usual cause of a full disk that `du` cannot explain.",
          ),
          concept(
            "inodes-full",
            "Running out of inodes",
            "A filesystem such as ext4 has a fixed number of inodes set when it is created. Millions of tiny files can use them all, and creating a file then fails with 'No space left on device' although `df -h` shows free space. `df -i` shows inode usage.",
          ),
          concept(
            "pseudo",
            "Filesystems that are not on disk",
            "/proc and /sys are generated by the kernel on each read; tmpfs (used for /run and /dev/shm) keeps files in memory and loses them at reboot. Swap is disk space the kernel can move idle memory pages to; `swapon --show` and `free` display it.",
          ),
        ]),
        topic("net", "Basic network commands", [
          concept(
            "addr",
            "Addresses and routes: ip addr, ip route",
            "`ip addr` lists the network interfaces and their addresses (`lo` is loopback, 127.0.0.1); `ip route` shows the routing table, where the `default` line names the gateway used for everything that is not on a local network.",
          ),
          concept(
            "names",
            "Name lookup: /etc/hosts, resolv.conf, getent and dig",
            "/etc/hosts maps names to addresses locally and /etc/resolv.conf names the DNS resolver; on Ubuntu that is the local systemd-resolved stub at 127.0.0.53, and `resolvectl status` shows the real upstream servers. `getent hosts name` resolves the way applications do, including /etc/hosts, while `dig name` queries DNS directly, so the two can disagree.",
          ),
          concept(
            "reach",
            "Reachability: ping and nc",
            "`ping host` sends ICMP echo requests; replies prove the host is reachable, but silence does not prove it is down, because ICMP is often filtered. With the OpenBSD netcat that Ubuntu installs as `nc`, `nc -zv host port` tests whether one TCP port accepts connections without sending data, which is usually the real question.",
          ),
          concept(
            "listen",
            "Who is listening: ss -ltnp",
            "`ss -ltnp` lists listening (`-l`) TCP (`-t`) sockets with numeric ports (`-n`) and the owning process (`-p`, which needs root for other users' processes). To find what holds port 8080: `ss -ltnp | grep 8080` (or `lsof -i :8080`). A listener on 127.0.0.1 is reachable only from the same machine; one on 0.0.0.0 or `*` accepts connections on every interface.",
          ),
          concept(
            "curl",
            "curl",
            "`curl -v` prints the connection steps and the request and response headers, `-I` sends a HEAD request and shows only the headers, `-o` saves the body, `-L` follows redirects and `-s` silences the progress meter. An HTTP error status such as 404 still exits 0 unless you pass `-f`, which matters in scripts.",
          ),
        ]),
        topic(
          "crisis",
          "The first 60 seconds on a sick machine",
          [
            concept(
              "prepare",
              "Install the tools before you need them",
              "During an incident the machine may be too overloaded, too full or too cut off from the network to install anything. The crisis tools, such as sysstat (iostat, mpstat, pidstat, sar), tcpdump, perf and the BPF tools, must already be on every machine.",
            ),
            concept(
              "use",
              "The USE method",
              "For every resource (CPUs, memory, disks, network) check Utilization, Saturation and Errors. Utilization is how busy the resource is, saturation is work queued waiting for it, and errors are failed operations. It gives a complete, ordered checklist instead of guessing.",
              { links: [USE_METHOD] },
            ),
            concept("load", "uptime and the load average", undefined, {
              parts: [
                concept(
                  "trend",
                  "Three numbers: 1, 5 and 15 minutes",
                  "`uptime` prints the load averaged over roughly the last 1, 5 and 15 minutes. Comparing them shows the trend: a 1-minute figure far above the 15-minute one means the problem is new and growing; far below means it is already fading.",
                ),
                concept(
                  "meaning",
                  "What Linux counts as load",
                  "Linux load counts tasks that are running, waiting for a CPU, or in uninterruptible sleep (D state, usually disk I/O). A load of 8 on a 4-core machine with busy CPUs means about twice as much runnable work as the CPUs can serve; high load with idle CPUs points at D-state tasks, usually I/O, not at CPU. `nproc` gives the CPU count to compare with.",
                ),
              ],
            }),
            concept(
              "dmesg",
              "dmesg: what the kernel has been saying",
              "`dmesg -T | tail` shows the latest kernel messages with readable timestamps (Ubuntu may require sudo for it). This is where the OOM killer names the process it killed and where disk I/O errors, filesystem errors and segfault notices appear. An application that vanished without a log line of its own was often killed here.",
            ),
            concept("vmstat", "vmstat 1, column by column", undefined, {
              parts: [
                concept(
                  "procs",
                  "r and b: the run queue",
                  "Run `vmstat 1` and ignore the first line, whose rate and CPU columns are averages since boot. `r` is the number of tasks running or waiting for a CPU; consistently above the CPU count means CPU saturation. `b` is the number blocked waiting for I/O.",
                ),
                concept(
                  "memory",
                  "free, cache, si and so: memory pressure",
                  "`si` and `so` are memory swapped in from and out to disk per second; non-zero values mean the machine is short of memory. A low `free` together with a shrinking `cache` is the earlier warning. Low `free` alone is normal, because Linux fills spare memory with file cache.",
                ),
                concept(
                  "cpu",
                  "us, sy, id, wa and st: where CPU time goes",
                  "User code, kernel code, idle, idle while waiting for disk I/O, and time stolen by the hypervisor. High `sy` means heavy system-call or kernel work, high `wa` points at the disks, and non-zero `st` means the VM is not getting the CPU it asked for. `bi` and `bo` are blocks read from and written to disks; `in` and `cs` are interrupts and context switches per second.",
                ),
              ],
            }),
            concept(
              "mpstat",
              "mpstat -P ALL 1: one line per CPU",
              "Shows %usr, %sys, %iowait, %irq, %soft, %steal and %idle for each CPU. One CPU pinned at 100% while the rest are idle is a single-threaded bottleneck that the averaged figures hide.",
            ),
            concept(
              "pidstat",
              "pidstat 1: which process",
              "A rolling per-process view of %usr and %system CPU, one block per interval, so you can watch patterns over time and paste the output into notes, unlike top's redrawn screen. `-d` shows disk I/O per process, `-r` memory and page faults, `-w` context switches.",
            ),
            concept("iostat", "iostat -xz 1", undefined, {
              parts: [
                concept(
                  "columns",
                  "Workload, latency and queue columns",
                  "`-x` adds extended columns and `-z` hides idle devices. `r/s`, `w/s`, `rkB/s` and `wkB/s` describe the workload being applied. `r_await` and `w_await` are the average milliseconds a request took, including time spent queued, and `aqu-sz` (`avgqu-sz` in older versions) is the average queue length; rising await and queue mean the device is saturated.",
                ),
                concept(
                  "util",
                  "Why %util can mislead",
                  "%util is the share of time the device had at least one request in progress. A device that serves many requests in parallel (SSD, NVMe, RAID) can show 100% and still have capacity, so judge saturation by await and queue length.",
                ),
              ],
            }),
            concept(
              "free",
              "free -m: free versus available",
              "`buff/cache` is memory holding file data that the kernel can drop when programs need it, so a small `free` figure is healthy. `available` estimates how much memory new work can use without swapping; that is the number to watch.",
            ),
            concept(
              "sar",
              "sar: history and network counters",
              "With sysstat's collection enabled, `sar` replays CPU, memory, disk and network figures recorded at intervals through the day, which answers 'what was happening at 03:00'. Live, `sar -n DEV 1` shows per-interface receive and transmit rates, and `sar -n TCP,ETCP 1` shows new connections and retransmits per second.",
            ),
            concept(
              "top",
              "top: reading the screen",
              "The header repeats the load average, task counts, the CPU breakdown and memory. In the process list %CPU is a percentage of one CPU, so a multi-threaded process can show more than 100%. RES is memory actually resident in RAM; VIRT is all the address space the process has mapped and is often huge without being a problem. Short-lived processes can come and go between refreshes.",
            ),
            concept(
              "checklist",
              "The same commands in the same order",
              "Run uptime, dmesg, vmstat, mpstat, pidstat, iostat, free, sar and top in that order every time. By the end you know which resource (CPU, memory, disk or network) is in trouble and which process is responsible, and can pick the next, deeper tool.",
            ),
          ],
          { links: [CRISIS_TOOLS, USE_METHOD] },
        ),
        topic("build", "Build it", [
          build(
            "crisis-install",
            "Install the crisis tools",
            "Install every package in the table from Brendan Gregg's 'Linux crisis tools' post on your VM, and run each tool once so you know it works before you need it. A few (cpuid, msr-tools, turbostat) are for x86 CPUs; on an Arm VM, note which ones do not apply.",
            {
              doneWhen: ["Every applicable tool in the table runs on your VM, and a note on any that do not apply"],
              links: [CRISIS_TOOLS],
            },
          ),
          build(
            "crisis-tour",
            "Tour the crisis tools under load",
            "Generate CPU, memory and disk load with stress-ng, one at a time. For each, run uptime, vmstat 1, mpstat -P ALL 1, pidstat 1, iostat -xz 1, free -m and sar, and write down which tool showed the problem first and which column gave it away.",
            {
              doneWhen: [
                "vmstat and iostat output during the disk-load run",
                "A table: load type -> first tool to show it -> the column to look at",
              ],
              links: [USE_METHOD],
            },
          ),
        ]),
      ],
      {
        detail: "Packages, users, services, disks and the tools you reach for when a box is sick.",
        links: [TLCL, MISSING],
      },
    ),

    topic(
      "go",
      "Go, enough to build with",
      [
        topic("toolchain", "Toolchain and modules", [
          concept(
            "go-cmd",
            "The go command",
            "One tool does everything: `go run` compiles and runs, `go build` produces a binary, `go test` runs tests, `go vet` reports suspicious code, and `go fmt` (which runs `gofmt`) rewrites source into the one standard format so style is never a debate.",
          ),
          concept(
            "binary",
            "A compiled, self-contained binary",
            "`go build` produces a native executable that contains the Go runtime, the garbage collector and every dependency, so it runs on a machine with no Go installed. A program built with cgo links the C library dynamically (on Linux the net and os/user packages are built with cgo by default when a C compiler is present); `CGO_ENABLED=0` gives a fully static binary. Setting `GOOS` and `GOARCH` cross-compiles, for example a Linux binary built on a Mac.",
          ),
          concept(
            "packages",
            "Packages and exported names",
            "Every directory is one package and every file starts with a `package` clause. `package main` with `func main()` makes an executable. A name starting with a capital letter is exported; anything else is visible only inside its package.",
          ),
          concept(
            "modules",
            "Modules: go.mod and go.sum",
            "A module is a tree of packages versioned together. go.mod records the module path, the Go version and the minimum required version of each dependency; go.sum records their checksums so a changed download is detected. `go mod init` starts one, and `go mod tidy` adds missing requirements and removes unused ones.",
          ),
        ]),
        topic("types", "Values, types and interfaces", [
          concept(
            "zero",
            "Declarations and zero values",
            "`var x int` and `x := 1` declare variables, and every variable starts at its type's zero value: 0, \"\", false, or nil for pointers, slices, maps, channels, functions and interfaces. There is no uninitialised memory, and good types are designed so that their zero value is useful.",
          ),
          concept(
            "strings",
            "Strings, bytes and runes",
            "A string is an immutable sequence of bytes, normally UTF-8. `len(s)` counts bytes and `s[i]` is a byte, while `for _, r := range s` yields runes (Unicode code points). Converting between string and []byte copies the data.",
          ),
          concept(
            "funcs",
            "Functions, multiple results and closures",
            "A function can return several values, conventionally `(result, error)`. Functions are values that can be stored and passed, and a function literal is a closure: it captures the variables it refers to by reference, not a snapshot of their values, so it sees later changes to them.",
          ),
          concept(
            "pointers",
            "Pointers and pass by value",
            "Every assignment and function call copies the value. To let a function modify the caller's variable, or to avoid copying a large struct, pass a pointer (`&x`) and dereference it (`*p`). There is no pointer arithmetic, dereferencing a nil pointer panics, and returning the address of a local variable is safe because the compiler moves it to the heap.",
          ),
          concept(
            "structs",
            "Structs and embedding",
            "A struct groups named fields and is copied as a whole on assignment. Embedding a type without a field name promotes its fields and methods to the outer struct; this is composition, not inheritance, and there is no subclass relationship.",
          ),
          concept(
            "methods",
            "Methods and receivers",
            "A method is a function with a receiver. A value receiver works on a copy; a pointer receiver can modify the original and avoids the copy. If any method of a type needs a pointer receiver, give them all pointer receivers.",
          ),
          concept(
            "interfaces",
            "Interfaces are satisfied implicitly",
            "An interface is a set of method signatures, and any type that has those methods satisfies it with no declaration. This lets the consumer define a small interface (io.Reader has one method) for exactly what it needs. `v, ok := x.(T)` and a type switch recover the concrete type; `any` is the empty interface.",
          ),
          concept(
            "nil-iface",
            "The nil interface trap",
            "An interface value holds a (type, value) pair and equals nil only when both are unset. A nil `*MyErr` stored in an `error` is therefore not nil, so a function that returns a typed nil pointer as its error makes `err != nil` true. Return a literal `nil` instead.",
          ),
          concept(
            "generics",
            "Generics: type parameters and constraints",
            "Since Go 1.18 a function or type can take type parameters, as in `func Max[T cmp.Ordered](a, b T) T`. The constraint is an interface listing what T must support; `any` allows every type and `comparable` allows types usable with `==` and as map keys. Reach for them for containers and algorithms that work the same over many types, not in place of ordinary interfaces.",
          ),
          concept(
            "defer",
            "defer",
            "It schedules a call to run when the surrounding function returns, in last-in-first-out order. Typical use: closing files, unlocking mutexes. The arguments are evaluated at the `defer` statement, and deferred calls still run when the function panics.",
          ),
          concept(
            "panic",
            "panic and recover",
            "A panic unwinds the stack, running deferred calls, and crashes the program with a stack trace unless a deferred function calls `recover`. Panics are for bugs (index out of range, nil dereference), not for failures you expect such as a missing file; those are returned as errors.",
          ),
        ]),
        topic("collections", "Slices and maps", [
          concept(
            "slice-header",
            "A slice is a view onto an array",
            "An array has a fixed length that is part of its type and is copied on assignment. A slice is a small header: a pointer into a backing array, a length and a capacity. Assigning or passing a slice copies the header only, so both copies see the same elements.",
          ),
          concept(
            "append",
            "append and growth",
            "`append` writes into spare capacity when there is some; otherwise it allocates a larger array, copies the elements and returns a slice that points to the new one. Always assign the result (`s = append(s, x)`), and use `make([]T, 0, n)` when you know the size, to avoid repeated copying.",
          ),
          concept(
            "aliasing",
            "Aliasing between slices",
            "`b := a[:2]` shares a's array, so `append(b, x)` can overwrite `a[2]` when capacity allows, and after a growth the two silently stop sharing. A small slice of a huge array also keeps the whole array in memory. Use `copy` to make an independent slice when you need one.",
          ),
          concept(
            "nil",
            "nil slices, nil maps and nil pointers",
            "The zero value of a slice, a map and a pointer is nil. A nil slice has length 0 and appending to it works. Reading from a nil map returns zero values but writing to it panics, so create maps with `make` or a literal. Dereferencing a nil pointer panics.",
          ),
          concept(
            "maps",
            "Maps",
            "A map is a hash table. `m[k]` returns the zero value for a missing key, so use `v, ok := m[k]` to tell absent from zero, and `delete(m, k)` removes a key. A map value refers to shared storage: a function that receives a map modifies the caller's map.",
          ),
          concept(
            "map-gotchas",
            "Map iteration order and concurrent access",
            "Iteration order is deliberately randomised, so sort the keys when output must be stable. Maps are not safe for concurrent use: a write that overlaps any other access is a data race, and the runtime can abort the program with 'concurrent map writes'. Guard a shared map with a mutex.",
          ),
          concept(
            "range",
            "range copies each element",
            "In `for i, v := range s`, v is a copy; changing it does not change the slice, so assign through `s[i]`. Since Go 1.22 (for modules whose go.mod says `go 1.22` or later) each iteration has its own loop variable; before that, closures and goroutines started in a loop all captured the same one.",
          ),
        ]),
        topic("errors", "Errors", [
          concept(
            "values",
            "Errors are values",
            "`error` is an interface with one method, `Error() string`. Functions return an `error` value as the last result and callers check `if err != nil` immediately. There are no exceptions: every failure path is visible in the code that handles it.",
          ),
          concept(
            "creating",
            "Creating errors and sentinel errors",
            "`errors.New` and `fmt.Errorf` make an error from a message. A sentinel is a package-level error value such as `io.EOF` or `os.ErrNotExist` that callers compare against to recognise one specific condition.",
          ),
          concept(
            "wrap",
            "Wrapping with %w",
            "`fmt.Errorf(\"read config %s: %w\", path, err)` adds what you were doing and keeps the original error inside. Each layer adds its own context, so the final message reads as a trail from the top-level operation down to the root cause.",
          ),
          concept(
            "is-as",
            "errors.Is and errors.As",
            "`errors.Is(err, target)` walks the chain of wrapped errors looking for a specific value; `errors.As` finds the first error of a given type and hands it to you. Comparing with `==` stops working as soon as anyone wraps the error.",
          ),
          concept(
            "eof",
            "io.EOF is not a failure",
            "A reader returns io.EOF to say the input ended normally. A Read may return some bytes and an error in the same call, so process the `n` bytes first and look at the error second.",
          ),
          concept(
            "once",
            "Handle an error once, exit in main",
            "Either deal with an error (retry, fall back, log it) or return it with context; doing both produces duplicate log lines. Only `main` should turn an error into a message on stderr and a non-zero exit code, because `os.Exit` and `log.Fatal` end the process without running deferred calls.",
          ),
        ]),
        topic("concurrency", "Goroutines, channels and sync", [
          concept(
            "goroutine",
            "Goroutines",
            "A function running concurrently, started with `go f()` and scheduled by the Go runtime onto a small pool of OS threads. It starts with a few KB of stack that grows, so you can have hundreds of thousands. When a goroutine blocks on a channel or the network, the runtime parks it and runs another on the same thread.",
          ),
          concept(
            "parallel",
            "Concurrency versus parallelism",
            "Concurrency is structuring a program as tasks that can make progress independently; parallelism is tasks executing at the same instant on different cores. `GOMAXPROCS` limits how many OS threads run Go code simultaneously. It defaults to the number of CPUs the process may use; since Go 1.25 it is also capped on Linux by a cgroup CPU limit, such as a container's, when the main module's go.mod says go 1.25 or later.",
          ),
          concept(
            "waiting",
            "main does not wait: sync.WaitGroup",
            "The program exits when `main` returns, whatever other goroutines are doing. A WaitGroup counts outstanding work: `Add` before starting each goroutine, `defer wg.Done()` inside it, and `Wait` blocks until the count reaches zero.",
          ),
          concept(
            "race",
            "Data races",
            "A data race is two goroutines accessing the same variable at the same time, at least one of them writing, with no synchronisation. `counter++` is a read, an add and a write, so concurrent increments lose updates. Racing goroutines can see stale values, and a race on a multi-word value such as a slice, string or interface can tear it and corrupt memory, so a race is a bug, not mere imprecision.",
          ),
          concept(
            "detector",
            "The race detector",
            "`go test -race` and `go run -race` instrument memory accesses and report each race with the stacks of both goroutines. It only finds races on code paths that actually execute during that run and it slows the program down, so it belongs in tests and CI rather than in production.",
          ),
          concept(
            "mutex",
            "sync.Mutex and RWMutex",
            "A mutex lets one goroutine at a time into a critical section: `mu.Lock()` then `defer mu.Unlock()`. RWMutex admits many readers or one writer. Keep the mutex next to the data it guards and never copy a struct that contains one. Use a mutex to protect shared state and a channel to hand work or results between goroutines.",
          ),
          concept(
            "atomic",
            "sync/atomic and sync.Once",
            "The atomic types (`atomic.Int64`, `atomic.Bool`, added in Go 1.19) make a single counter or flag safe without a lock. `sync.Once` runs an initialisation function exactly once however many goroutines call it.",
          ),
          concept(
            "channels",
            "Unbuffered channels",
            "A channel is a typed conduit between goroutines. On an unbuffered channel the sender blocks until a receiver is ready (and a receiver until a sender is), so unbuffered channels synchronise the two goroutines at the moment of the hand-off.",
          ),
          concept(
            "buffered",
            "Buffered channels",
            "`make(chan T, n)` holds up to n values: a send blocks only when the buffer is full and a receive only when it is empty. The buffer is a bounded queue that absorbs bursts; it does not remove the need for someone to receive.",
          ),
          concept(
            "close",
            "Closing a channel",
            "`close(ch)` tells receivers no more values are coming: they drain what is buffered, then get the zero value with `ok` false, and `for v := range ch` ends. Only the sender closes. Sending on a closed channel or closing it twice panics.",
          ),
          concept(
            "select",
            "select",
            "`select` waits on several channel operations and runs one that is ready, choosing at random if several are. A `default` case makes it non-blocking, and a case on `time.After(d)` or `ctx.Done()` adds a timeout or cancellation. Operations on a nil channel block forever, which is used to switch a case off.",
          ),
          concept(
            "leaks",
            "Deadlocks and goroutine leaks",
            "If every goroutine is blocked the runtime aborts with 'all goroutines are asleep - deadlock!'. If only some are blocked forever, on a channel nobody will ever use again, nothing reports it: they stay in memory for the life of the process. Every goroutine you start needs a known way to finish.",
          ),
          concept(
            "pool",
            "Bounding concurrency: worker pools",
            "Starting one goroutine per item is unbounded: a million items means a million simultaneous file opens or connections. A fixed number of workers reading from one jobs channel, or a buffered channel used as a semaphore, caps the work in flight.",
          ),
        ]),
        topic("context", "Context: cancellation and deadlines", [
          concept(
            "problem",
            "What context.Context is for",
            "Carrying cancellation, deadlines and request-scoped values across API boundaries and goroutines so work can be stopped when the caller gives up. Without it, a request whose client has disconnected keeps consuming goroutines, connections and CPU.",
          ),
          concept(
            "tree",
            "Deriving contexts: WithCancel, WithTimeout, WithDeadline",
            "Start from `context.Background()` and derive children. Cancelling a context cancels every context derived from it, never its parent. Each derivation returns a cancel function; always call it (`defer cancel()`), so the context's resources are released as soon as the work is done rather than when the deadline passes or the parent ends.",
          ),
          concept(
            "done",
            "Done and Err",
            "`ctx.Done()` returns a channel that is closed on cancellation, so it works as a `select` case. `ctx.Err()` then says why: `context.Canceled` or `context.DeadlineExceeded`.",
          ),
          concept(
            "coop",
            "Cancellation is cooperative",
            "Cancelling stops nothing by itself. Code must select on `ctx.Done()` or pass the context into blocking calls that honour it, such as `http.NewRequestWithContext`, `exec.CommandContext` and database queries. A loop that never checks keeps running.",
          ),
          concept(
            "conventions",
            "Conventions",
            "Pass the context as the first parameter, named `ctx`, do not store it in a struct, and use `Value` only for request-scoped data such as a trace ID, never for optional parameters. In an HTTP handler, `r.Context()` is cancelled when the client disconnects.",
          ),
        ]),
        topic("testing", "Testing and benchmarks", [
          concept(
            "basics",
            "go test and the testing package",
            "Tests live in `_test.go` files as `func TestXxx(t *testing.T)` and `go test ./...` runs them all. `t.Errorf` records a failure and continues; `t.Fatalf` stops that test. `t.TempDir()` gives a directory that is removed afterwards, and `-run` selects tests by name.",
          ),
          concept(
            "table",
            "Table-driven tests",
            "List the cases as a slice of structs (name, input, expected output) and loop over them, running each with `t.Run(name, ...)` so that it is reported, and can be run, on its own. Adding an edge case becomes one line.",
          ),
          concept(
            "doubles",
            "Testing through interfaces",
            "A function that takes an io.Reader and an io.Writer can be tested with `strings.NewReader` and a `bytes.Buffer`, with no files or network. For HTTP, `httptest.NewRecorder` captures what a handler writes and `httptest.NewServer` starts a real server on a local port for testing clients.",
          ),
          concept(
            "bench",
            "Benchmarks",
            "`func BenchmarkXxx(b *testing.B)` repeats the measured code until the timing is stable: since Go 1.24 by looping `for b.Loop() { ... }`, and in older code by running it `b.N` times with the framework choosing N. `go test -bench=. -benchmem` reports nanoseconds, bytes allocated and allocations per operation.",
          ),
        ]),
        topic("stdlib", "The standard library you will lean on", [
          concept(
            "io",
            "io.Reader and io.Writer",
            "`Read(p []byte) (n int, err error)` fills at most len(p) bytes, may return fewer, and returns io.EOF at the end; `Write(p)` writes them out. Files, network connections, pipes, HTTP bodies and compressors all implement these two one-method interfaces, so code written against them works with all of them.",
          ),
          concept(
            "compose",
            "Composing streams",
            "`io.Copy(dst, src)` moves data through a fixed-size buffer, so a file of any size uses constant memory; `io.ReadAll` loads everything and is dangerous on unbounded input. Wrappers stack: `gzip.NewReader(f)`, `io.LimitReader`, `io.TeeReader`, `io.MultiWriter`.",
          ),
          concept("bufio", "Buffered I/O", undefined, {
            parts: [
              concept(
                "syscalls",
                "Every unbuffered Read is a system call",
                "A Read or Write on an *os.File goes straight to the kernel. Unbuffered reads make one read syscall per small chunk, and each syscall costs far more than copying the bytes. This is why a first Go `wc` that reads a few bytes at a time is much slower than the system one.",
              ),
              concept(
                "reader-writer",
                "bufio.Reader and bufio.Writer",
                "Wrapping the file in a `bufio.Reader` batches small reads into large ones: it fetches a block (4096 bytes by default) per syscall and serves your reads from memory. A `bufio.Writer` collects small writes the same way, and you must call `Flush` before exiting or the last block is lost.",
              ),
              concept(
                "scanner",
                "bufio.Scanner",
                "Reads input a line (or a word) at a time: loop on `sc.Scan()`, use `sc.Text()`, then check `sc.Err()`. A line longer than the token limit (64 KiB by default) stops the scan with an error; raise the limit with `sc.Buffer`.",
              ),
            ],
          }),
          concept(
            "files",
            "Files: the os package",
            "`os.Open` opens for reading, `os.Create` creates or truncates, and `os.OpenFile` takes explicit flags and permission bits. Each returns an *os.File wrapping a file descriptor; `defer f.Close()` releases it, and after writing you should check the error from Close. `os.Stdin`, `os.Stdout` and `os.Stderr` are the files for descriptors 0, 1 and 2.",
          ),
          concept(
            "proc",
            "Arguments, environment and exit codes",
            "`os.Args` is the argument list (the `flag` package parses options from it), `os.Getenv` reads the environment, and `os.Exit(n)` sets the exit code. A well-behaved tool writes results to stdout and diagnostics to stderr, and exits non-zero on failure, so that it composes in pipelines and scripts.",
          ),
          concept(
            "json",
            "JSON and struct tags",
            "`json.Marshal` and `json.Unmarshal` (or `json.NewDecoder(r).Decode`) convert between JSON and Go values. Only exported fields are encoded or decoded, unexported ones are silently skipped, and a tag such as `json:\"name,omitempty\"` sets the key and drops empty values. Unknown JSON keys are ignored and missing ones leave the field at its zero value.",
          ),
          concept(
            "signal",
            "Catching signals: os/signal",
            "By default SIGINT and SIGTERM end a Go program at once. `signal.NotifyContext(ctx, os.Interrupt, syscall.SIGTERM)` returns a context that is cancelled when one arrives, so the program can finish in-flight work and then exit. SIGKILL can never be caught.",
          ),
          concept(
            "exec",
            "Running other programs: os/exec",
            "`exec.Command(name, args...)` starts a program with an explicit argument list and no shell, so there is no globbing, no pipes and no quoting to get wrong. You attach any Reader or Writer as its stdin, stdout and stderr; `Run` waits for it, and a non-zero exit comes back as an *exec.ExitError carrying the code. `exec.CommandContext` kills the process when the context is cancelled.",
          ),
          concept(
            "handler",
            "An HTTP server: handlers and the mux",
            "A handler is anything with `ServeHTTP(http.ResponseWriter, *http.Request)`; `http.HandlerFunc` adapts a plain function, and a ServeMux routes paths to handlers. The server serves each connection in its own goroutine, so handlers execute concurrently and any state they share must be synchronised.",
          ),
          concept(
            "timeouts",
            "Server and client timeouts",
            "The zero-value http.Server and the default http.Client have no timeouts: a slow or silent peer can hold a connection and a goroutine forever. Set `ReadHeaderTimeout`, `ReadTimeout`, `WriteTimeout` and `IdleTimeout` on the server, and `Timeout` on the client or a deadline on the request's context.",
          ),
          concept(
            "shutdown",
            "Graceful shutdown",
            "`srv.Shutdown(ctx)` stops accepting new connections, closes idle ones and waits for in-flight requests to finish, up to the context's deadline. `ListenAndServe` returns `http.ErrServerClosed` as soon as Shutdown is called, so `main` must wait for Shutdown itself to return before exiting.",
          ),
          concept(
            "client",
            "The HTTP client",
            "Create one http.Client and reuse it: it keeps a pool of open connections. Always close `resp.Body`, and read it to the end if you want the connection reused. A 404 or 500 response is not an error; `err` reports only a failure to get a response at all, so check `resp.StatusCode` yourself.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "coreutils",
            "Rewrite cat, wc and grep in Go",
            "Implement three small tools that read files or stdin, handle errors and exit codes properly, and have table-driven tests. Compare your wc against the real one on a 1 GB file and explain the speed difference (hint: buffering).",
            {
              doneWhen: [
                "Link to the code in your labs repository",
                "Timing of your wc vs the system wc, before and after adding bufio",
              ],
              links: [EFFECTIVE_GO],
            },
          ),
          build(
            "service",
            "Run a Go HTTP service under systemd",
            "Write a tiny HTTP server that shuts down gracefully on SIGTERM. Run it as a systemd unit with Restart=on-failure, read its logs with journalctl, kill it with SIGKILL and watch systemd restart it, then stop it and confirm in-flight requests finish.",
            {
              doneWhen: [
                "The unit file and `systemctl status` output",
                "journalctl lines showing the kill and the automatic restart",
                "A slow request started before `systemctl stop` that still completes",
              ],
              links: [SYSTEMD_SERVICE],
            },
          ),
          build(
            "labs-repo",
            "Start your public labs repository",
            "Create a public GitHub repository for lab code and notes, one directory per section of the sheet. Write a short README for this section: what you built, what surprised you. Every later section ends with a write-up here or on a blog.",
            {
              doneWhen: ["Link to the repository"],
              links: [
                link(
                  "Julia Evans: blog about what you've struggled with",
                  "https://jvns.ca/blog/2021/05/24/blog-about-what-you-ve-struggled-with/",
                ),
              ],
            },
          ),
        ]),
      ],
      {
        detail: "The systems language for every later build: the parts of Go that the rest of the sheet relies on.",
        links: [TOUR, GO_WITH_TESTS, EFFECTIVE_GO],
      },
    ),
  ],
);
