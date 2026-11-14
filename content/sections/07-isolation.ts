import { build, concept, link, paid, section, topic } from "../dsl";

const CONTAINER_SECURITY = paid(
  "Container Security, 2nd edition (Liz Rice)",
  "https://www.oreilly.com/library/view/container-security-2nd/9798341627697/",
);
const CAPABILITIES_MAN = link("capabilities(7)", "https://man7.org/linux/man-pages/man7/capabilities.7.html");
const SECCOMP_MAN = link("seccomp(2)", "https://man7.org/linux/man-pages/man2/seccomp.2.html");
const OCI_IMAGE_SPEC = link("OCI image specification", "https://github.com/opencontainers/image-spec/blob/main/spec.md");
const FIRECRACKER_DESIGN = link(
  "Firecracker design: threat containment",
  "https://github.com/firecracker-microvm/firecracker/blob/main/docs/design.md",
);

export default section(
  "isolation",
  {
    title: "Containers, isolation and security",
    summary:
      "A container is a process with a restricted view and a budget. Build a container runtime from namespaces, a pivoted root and cgroups, run an image by hand, harden it, break out of misconfigured ones, then learn the stronger boundaries (gVisor, microVMs, isolates) and how to reason about running code you do not trust.",
  },
  [
    topic(
      "containers",
      "What a container is",
      [
        topic(
          "idea",
          "A container is a process",
          [
            concept(
              "problem",
              "The problem: many workloads on one kernel",
              "Programs on one machine can see each other's files, processes and network, compete for the same CPU and memory, and each want their own library versions. A container gives one program its own view of the system and its own resource budget without the cost of a separate machine.",
            ),
            concept(
              "definition",
              "A container in one sentence",
              "An ordinary Linux process (or process tree) started with its own namespaces, a different root filesystem, cgroup limits and reduced privileges, sharing the host kernel. The kernel has no 'container' object: a runtime assembles one from these separate features, and each can be used alone or left out.",
            ),
            concept(
              "see-vs-use",
              "Namespaces versus cgroups",
              "Namespaces limit what a process can see. Cgroups limit how much it can use. Neither does the other's job: a process in every namespace can still use all the host's memory, and a process in a tight cgroup can still see every other process.",
            ),
            concept(
              "shared-kernel",
              "The shared kernel and what it implies",
              "Every container on a host makes system calls to the same running kernel. `uname -r` inside shows the host's kernel version, an image contains no kernel, a container cannot load its own kernel modules, and a kernel crash or kernel exploit affects every container at once. Linux containers on macOS or Windows run inside a Linux virtual machine and share that VM's kernel.",
            ),
            concept(
              "vs-vm",
              "Container versus virtual machine",
              "A virtual machine boots its own guest kernel on virtual hardware. A container start is a clone and exec plus some setup, which is why it can take milliseconds and why many fit on one host, and also why its isolation is only as strong as the shared kernel.",
            ),
          ],
          {
            links: [
              link("What even is a container", "https://jvns.ca/blog/2016/10/10/what-even-is-a-container/"),
              link("Containers from scratch (code)", "https://github.com/lizrice/containers-from-scratch"),
            ],
          },
        ),
        topic(
          "namespaces",
          "Namespaces",
          [
            concept(
              "what",
              "What a namespace is",
              "A namespace wraps one global kernel resource so the processes inside it see their own separate instance. Every process is in exactly one namespace of each type, a child starts in its parent's namespaces, and a host with no containers still has one initial namespace of each type.",
            ),
            concept(
              "mount",
              "Mount namespace: the filesystem view",
              "Each mount namespace has its own list of mount points, created as a copy of its creator's. Mounting or unmounting inside changes only that list, which is what lets a container have a different root filesystem. Its flag is CLONE_NEWNS, with no type in the name, because it was the first namespace type.",
            ),
            concept(
              "uts-ipc",
              "UTS and IPC namespaces",
              "A UTS namespace isolates the hostname and NIS domain name, so a container can set its hostname without renaming the host. An IPC namespace isolates System V shared memory, semaphores and message queues and POSIX message queues, so two containers cannot attach to each other's System V shared memory by key.",
            ),
            concept("pid", "PID namespace: process IDs", undefined, {
              parts: [
                concept(
                  "numbering",
                  "Numbering and nesting",
                  "Process IDs start again at 1 in a new PID namespace. Namespaces nest: a process has one PID in its own namespace and another in each ancestor namespace, so the host can see and signal container processes while the container cannot see the host's.",
                ),
                concept(
                  "pid1",
                  "Why PID 1 is special",
                  "The first process in a PID namespace is its init. Orphaned processes in the namespace are re-parented to it, so it must reap them. A signal it has not installed a handler for is dropped, even SIGKILL sent from inside the namespace; only SIGKILL and SIGSTOP sent from an ancestor namespace are forced. When it exits, the kernel kills every other process in the namespace with SIGKILL. A program that never expected to be init can therefore leave zombies and ignore SIGTERM, which is what a small init such as tini (`docker run --init`) is for.",
                ),
                concept(
                  "children-only",
                  "A new PID namespace applies to children only",
                  "A process's PID cannot change, so unshare(CLONE_NEWPID) leaves the caller where it is and puts its next child in the new namespace as PID 1. This is why a runtime forks after creating the PID namespace.",
                ),
              ],
            }),
            concept(
              "net",
              "Network namespace: the network stack",
              "A separate set of network devices, addresses, routing tables, firewall rules, sockets and port numbers, so two containers can each listen on port 80. A new one has only a loopback device that is down, so the runtime must connect it, usually with a veth pair to a bridge as built by hand in Networking.",
            ),
            concept(
              "user",
              "User namespace: IDs and capabilities",
              "Maps the UIDs and GIDs seen inside to different ones outside and scopes capabilities (the separate privileges that root's power is divided into, such as CAP_SYS_ADMIN) to the namespace: a process can be UID 0 with a full capability set inside while being an unprivileged user to the host. The hardening topic covers both in depth.",
            ),
            concept(
              "cgroup",
              "Cgroup namespace: the cgroup root",
              "The cgroup a process is in when it creates the namespace becomes the root of the hierarchy as seen from inside, in /proc/self/cgroup and in cgroup mounts, so a container cannot see where it sits in the host's cgroup tree. It changes only the view: limits are still enforced by the cgroups themselves.",
            ),
            concept(
              "time",
              "Time namespace: clock offsets",
              "Gives the namespace its own offsets for CLOCK_MONOTONIC and CLOCK_BOOTTIME, mainly so a checkpointed process can be restored on another host without its uptime jumping. The wall clock (CLOCK_REALTIME) is not namespaced.",
            ),
            concept(
              "not-namespaced",
              "What is not namespaced",
              "The kernel itself, the wall clock, kernel modules, devices, and many settings under /proc/sys and /sys are global to the host. A container able to change one of these changes it for every container, which is why runtimes hide those paths or mount them read-only.",
            ),
          ],
          { links: [link("Namespaces in operation, part 1", "https://lwn.net/Articles/531114/")] },
        ),
        topic("ns-api", "Creating and joining namespaces", [
          concept(
            "clone-unshare",
            "clone and unshare",
            "clone creates a child process, and each CLONE_NEW* flag starts that child in a new namespace of that type instead of the parent's. unshare moves the calling process itself into new namespaces (except PID and time namespaces, which apply to the children it creates afterwards). The `unshare` command wraps the call: run as root, `unshare --uts --pid --fork --mount-proc sh` gives a shell that can change its hostname privately and sees itself as PID 1.",
          ),
          concept(
            "setns",
            "setns, nsenter and docker exec",
            "setns moves the caller into an existing namespace named by a file descriptor, normally opened from /proc/<pid>/ns/. `nsenter` and `docker exec` use it to start a new process inside a running container's namespaces. A namespace lives as long as a process is in it or something holds it open (an open descriptor or a bind mount of that file), which is how `ip netns add` keeps a namespace that has no processes.",
          ),
          concept(
            "privilege",
            "Who may create namespaces",
            "Creating any namespace except a user namespace needs the CAP_SYS_ADMIN capability, which root has by default. A user namespace can be created without privilege (where the distribution allows it), and its creator then holds capabilities inside it that allow creating the other types. A runtime that does not use user namespaces must be started as root.",
          ),
          concept(
            "reexec",
            "Why a Go runtime re-executes itself",
            "Setup such as sethostname, mounting /proc and pivot_root must run inside the new namespaces before the user's command starts. Go cannot run your code between fork and exec, and its runtime is already multi-threaded when main starts. So the program starts a copy of itself (/proc/self/exe) with the clone flags set in SysProcAttr, and that child does the setup and then execs the command.",
          ),
          concept(
            "observe",
            "lsns and /proc/<pid>/ns",
            "Each entry in /proc/<pid>/ns is a link whose target names the namespace type and an inode number; two processes share a namespace when the numbers match. `lsns` lists every namespace with the processes in it. From the host, a container's processes appear in `ps` like any others, with host PIDs.",
          ),
        ]),
        topic("rootfs", "The root filesystem", [
          concept(
            "what",
            "A root filesystem is a directory tree",
            "A container's root is a directory holding /bin, /lib, /etc and the rest of a userland, for example an unpacked Alpine minirootfs tarball. It contains the libraries the program links against and no kernel.",
          ),
          concept(
            "chroot",
            "chroot and why it is not enough",
            "chroot only changes path resolution: it sets the directory a process uses as / and leaves the mount table alone, so the old root still exists. It also leaves the working directory and open file descriptors alone, so a process with CAP_SYS_CHROOT can escape by calling chroot again on a subdirectory while its working directory stays outside the new root, then walking up with '..'.",
          ),
          concept(
            "pivot-root",
            "pivot_root",
            "pivot_root swaps the root mount of the mount namespace: the new root becomes / and the old root is moved to a directory beneath it, after which the old root can be unmounted entirely, leaving no path to the host's files. The new root must be a mount point, so runtimes first bind-mount the rootfs directory onto itself.",
          ),
          concept(
            "propagation",
            "Mount propagation: shared, private, slave",
            "Each mount has a propagation type that decides whether mounts and unmounts beneath it are copied to its peers in other mount namespaces: shared sends and receives, slave only receives, private does neither. systemd makes the host's mounts shared, so a runtime first remounts everything private or slave (recursively) in the new namespace, or its mounts leak onto the host. pivot_root also fails with EINVAL when the parent mount of the new root or of the current root is shared.",
          ),
          concept(
            "bind",
            "Bind mounts and volumes",
            "A bind mount makes an existing directory or file appear at a second path. A volume is a host directory bind-mounted into the container's mount namespace, which is why its data outlives the container and why a careless bind mount exposes the host.",
          ),
          concept(
            "special",
            "/proc, /sys and /dev inside a container",
            "A procfs mount shows the PID namespace of whoever mounted it, so the runtime mounts a fresh one or `ps` still lists host processes. It also mounts a sysfs and a tmpfs on /dev holding a few safe device nodes (null, zero, full, random, urandom, tty). Because parts of /proc and /sys act on the whole host, Docker's default configuration masks some (/proc/kcore, /proc/keys, /sys/firmware) by mounting /dev/null or an empty tmpfs over them, and makes others read-only (/proc/sys, /proc/sysrq-trigger).",
          ),
        ]),
        topic("cgroups", "cgroups v2", [
          concept(
            "hierarchy",
            "The hierarchy is a filesystem",
            "cgroup v2 is one tree, usually mounted at /sys/fs/cgroup. Each directory is a cgroup, mkdir creates one, every process is in exactly one, writing a PID to cgroup.procs moves it, and children are born into their parent's cgroup. The older v1 gave each controller its own tree with different file names (memory.limit_in_bytes, cpu.cfs_quota_us), which older tutorials still use.",
          ),
          concept(
            "controllers",
            "Controllers and subtree_control",
            "A controller (cpu, memory, io, pids and others) enforces one kind of resource. cgroup.controllers lists what a cgroup may use, and writing '+memory +pids' to its cgroup.subtree_control turns those on for its children. A non-root cgroup with controllers enabled for its children cannot hold processes itself, so processes live in leaves.",
          ),
          concept(
            "memory",
            "memory.max and the cgroup OOM killer",
            "memory.max is a hard limit on the cgroup's memory, counting page cache and kernel memory charged to it as well as anonymous memory. When usage hits the limit and nothing can be reclaimed, the OOM killer kills a process inside the cgroup; the oom_kill counter in memory.events records it, and a container whose main process was the victim exits with code 137 (128 + 9, SIGKILL). memory.high is the softer threshold: above it the cgroup is throttled and reclaimed from, not killed. Swap is limited separately by memory.swap.max.",
          ),
          concept(
            "cpu",
            "cpu.max and cpu.weight",
            "cpu.max holds a quota and a period in microseconds: '50000 100000' allows 50 ms of CPU time per 100 ms, half a CPU. A cgroup that spends its quota is paused until the next period, not killed, which shows up as latency spikes and as nr_throttled in cpu.stat. cpu.weight is a relative share that only matters when CPUs are contended.",
          ),
          concept(
            "pids",
            "pids.max",
            "pids.max caps the number of tasks (processes and threads) in the cgroup. At the limit, fork and clone fail with EAGAIN. It is the control that stops a fork bomb.",
          ),
          concept(
            "io",
            "io.max and io.weight",
            "io.max sets per-device limits on bytes and operations per second for reads and writes, keyed by the device's major:minor number. io.weight shares a device proportionally between cgroups.",
          ),
          concept(
            "observe",
            "Finding and reading a process's cgroup",
            "/proc/<pid>/cgroup names the cgroup a process is in. In that directory memory.current, memory.events, cpu.stat and pids.current show usage, OOM kills and throttling. /proc/meminfo and the CPU count inside a container still report the host's totals, not the cgroup's limits.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "runtime-ns",
            "Container runtime, part 1: namespaces and root",
            "Write `mycontainer run <rootfs> <cmd>` in Go. Re-exec yourself in new UTS, PID, mount, IPC and network namespaces, pivot_root into an Alpine minirootfs, mount /proc, and exec the command. Inside, `ps` must show your command as PID 1 and the host's files must be unreachable.",
            {
              doneWhen: [
                "A repo with the runtime",
                "`ps aux`, `hostname` and `ls /` from inside, and `lsns` from the host",
              ],
              links: [
                link(
                  "Build a container from scratch in Go",
                  "https://labs.iximiuz.com/tutorials/build-a-container-from-scratch-in-go-1b92e418",
                ),
              ],
            },
          ),
        ]),
      ],
      {
        detail: "Namespaces, a new root filesystem and cgroups: what a runtime assembles around an ordinary process.",
        links: [CONTAINER_SECURITY],
      },
    ),

    topic(
      "images",
      "Images and runtimes",
      [
        topic(
          "image",
          "The OCI image format",
          [
            concept(
              "why",
              "Why images exist",
              "A root filesystem has to be shipped to many machines, verified, cached and shared between containers. An image is a root filesystem split into reusable layers plus the metadata needed to run it, in a format every runtime and registry agrees on.",
            ),
            concept(
              "digests",
              "Content addressing, tags and pulls",
              "Every blob in an image is named by a cryptographic digest of its bytes (SHA-256 in practice), so a name identifies exact content: a blob can be verified after download and identical layers are stored and transferred once. A registry maps mutable tags to manifest digests; a pull fetches the manifest, then only the blobs missing locally. Pulling by digest always gives the same image; a tag can be moved.",
            ),
            concept(
              "layers",
              "Layers and whiteouts",
              "A layer is a tar archive of the files added or changed relative to the layers below it. A deletion is recorded as a whiteout entry (an empty file named .wh.<name>), because a tar archive has no other way to say 'remove this'. An opaque whiteout (a file named .wh..wh..opq in a directory) hides everything the lower layers had in that directory. Applying the layers in order rebuilds the root filesystem.",
            ),
            concept(
              "manifest",
              "The manifest",
              "A JSON document listing a config blob and an ordered list of layer tarballs, each as a descriptor with media type, digest and size. It is what a tag resolves to for one platform.",
            ),
            concept(
              "config",
              "The image config",
              "A JSON blob with the target OS and architecture, the default process settings (Env, Entrypoint, Cmd, WorkingDir, User), the build history, and rootfs.diff_ids: the digest of each layer's uncompressed tar. A layer's digest in the manifest is of the blob as stored, usually compressed, so the two values differ.",
            ),
            concept(
              "index",
              "The image index and multi-platform images",
              "An index lists several manifests, each marked with a platform (OS and architecture). One tag can then serve amd64 and arm64: the client picks the manifest that matches its machine.",
            ),
            concept(
              "layout",
              "The OCI layout on disk",
              "An image stored as files is a directory with an oci-layout marker, an index.json entry point and blobs/sha256/<digest> holding every manifest, config and layer. You can follow an image from index.json to its layers with only cat, jq and tar.",
            ),
            concept(
              "built",
              "How a build produces layers",
              "A build runs a Dockerfile's instructions in order, each on top of the previous result. Instructions that change files (RUN, COPY, ADD) each add a layer holding the difference; the others (ENV, CMD, ENTRYPOINT, USER and so on) only change the image config. A step whose instruction and inputs are unchanged is reused from the build cache, and a changed step rebuilds every step after it. A multi-stage build compiles in one stage and copies only the result into a small final image, so compilers and build tools never ship.",
            ),
            concept(
              "deleted-files",
              "Deleting in a later layer removes nothing",
              "A file removed by a later layer is only hidden by a whiteout; its bytes remain in the earlier layer and anyone with the image can extract them. A secret copied in during a build stays in the image even if a later step deletes it.",
            ),
            concept(
              "trust",
              "What you trust when you run an image",
              "An image runs whatever its layers contain, so its base image and every package in it are part of your attack surface, and a tag can be moved to different content after you tested it. The defences: pin images by digest, rebuild regularly to pick up fixes, scan for known vulnerabilities, verify a signature where the publisher provides one, and prefer a minimal base with few packages and no shell, so an attacker who gets code execution finds few tools.",
            ),
          ],
          { links: [OCI_IMAGE_SPEC] },
        ),
        topic("overlay", "From layers to a root filesystem", [
          concept(
            "overlayfs",
            "overlayfs: lower, upper, work, merged",
            "Copying a full root filesystem per container would waste time and disk, so the runtime unpacks the layers once and stacks them, typically with overlayfs. An overlay mount puts one or more read-only lower directories under one writable upper directory and presents the union at the merged mount point; a lookup tries upper first, then the lowers in order. The work directory is an empty directory on the same filesystem as upper that overlayfs uses as scratch space to make its changes atomic. Containers from one image share the lowers and each get their own upper and work.",
          ),
          concept(
            "copy-up",
            "Copy-up on first write",
            "Opening for writing a file that exists only in a lower layer first copies the whole file into the upper directory; the writes then go to the copy. The first write to a large file is slow, and the lower layers are never changed.",
          ),
          concept(
            "whiteout",
            "Deletion in overlayfs",
            "Removing a file that exists in a lower layer creates a whiteout in the upper directory (a character device with device number 0/0) that hides the lower file from the merged view. When unpacking an OCI layer, the runtime converts .wh. entries into this form.",
          ),
          concept(
            "ephemeral",
            "The writable layer is disposable",
            "A container's upper directory is created with the container and deleted when the container is removed (it survives a stop and restart). Data that must outlive the container goes on a volume, a separate mount that bypasses the overlay.",
          ),
        ]),
        topic("runtime-spec", "The OCI runtime spec", [
          concept(
            "bundle",
            "The bundle: a rootfs plus config.json",
            "A low-level runtime takes a directory holding a root filesystem and a config.json; images and registries do not exist at this level. config.json describes the process (args, env, cwd, user, capabilities, rlimits, noNewPrivileges), the root and whether it is read-only, the mounts, and a linux section with namespaces, ID mappings, cgroup resources, the seccomp filter, and masked and read-only paths.",
          ),
          concept(
            "lifecycle",
            "Lifecycle: create, start, kill, delete",
            "create sets up the namespaces, cgroup and root filesystem and leaves the container in the 'created' state without running the user's program; start runs it; kill sends a signal; delete removes what is left. The gap between create and start lets the caller finish setup such as networking.",
          ),
        ]),
        topic("stack", "The runtime stack", [
          concept(
            "runc",
            "runc: the low-level runtime",
            "runc reads a bundle and performs the kernel calls: it creates the namespaces and cgroup, mounts and pivots the root, drops capabilities, installs the seccomp system-call filter and execs the process. It is a command, not a daemon: once the container is started, runc exits.",
          ),
          concept(
            "containerd",
            "containerd: the high-level runtime",
            "A daemon that pulls and stores images, prepares each container's root filesystem (overlayfs by default), tracks container lifecycle, and calls an OCI runtime to do the actual start.",
          ),
          concept(
            "shim",
            "The shim",
            "containerd starts one small shim process per container (per pod under Kubernetes), which calls runc and then stays as the container's parent. It holds the container's stdio and collects its exit status, so containerd can be restarted or upgraded without killing running containers.",
          ),
          concept(
            "docker",
            "dockerd and the docker CLI",
            "The docker command is a client that sends API requests over a Unix socket (/var/run/docker.sock) to dockerd, which adds image building, networks and volumes and hands the running of containers to containerd.",
          ),
          concept(
            "cri",
            "Docker, Kubernetes, containerd and runc",
            "Docker and Kubernetes both talk to containerd, which manages images and container lifecycle and calls runc, the low-level OCI runtime that sets up namespaces and cgroups and execs the process. The kubelet reaches containerd (or an alternative such as CRI-O) through the Container Runtime Interface (CRI), a gRPC API, so Kubernetes does not need dockerd. Because the bundle format is standard, runc can be swapped for another OCI runtime without changing anything above it.",
          ),
          concept("docker-run", "What `docker run` does, step by step", undefined, {
            parts: [
              concept(
                "api",
                "CLI to daemon",
                "The CLI turns the command line into a create-container and a start-container API request and sends them to dockerd over the socket. If create answers that the image is missing, the CLI requests a pull and retries.",
              ),
              concept(
                "pull",
                "Resolve and pull the image",
                "When the image is not present locally, the tag is resolved to a manifest for this platform, missing layers are downloaded and verified by digest, and each is unpacked.",
              ),
              concept(
                "rootfs",
                "Prepare the root filesystem",
                "A new empty upper directory is made for this container, and an overlay mount combines it with the image's layers as lower directories.",
              ),
              concept(
                "config",
                "Generate the runtime config",
                "The image config (Env, Entrypoint, Cmd, User, WorkingDir), the command-line flags and Docker's defaults (capability list, seccomp profile, masked paths, cgroup limits) are merged into a config.json in a new bundle.",
              ),
              concept(
                "create",
                "Create the container through the shim",
                "dockerd asks containerd for a new task. containerd starts a shim, which runs `runc create`: runc makes the namespaces (including a new, empty network namespace), places the process in its cgroup, sets up the mounts and pivots the root, and leaves an init process waiting just short of executing the image's program.",
              ),
              concept(
                "network",
                "Connect the network",
                "dockerd then wires the new network namespace: a veth pair with one end inside and the other on the docker0 bridge, an address and default route, and NAT rules for outbound traffic and any published ports. This is the plumbing built by hand in Networking. Older Docker releases did it from a runtime hook during create; either way it is finished before the program runs.",
              ),
              concept(
                "start",
                "Start the program",
                "The task is started (`runc start`): the waiting process, by now holding only the allowed capabilities and with the seccomp filter installed, execs the image's entrypoint as PID 1. runc exits, the shim relays stdout and stderr to Docker's logging, and when PID 1 exits the shim reports the exit code.",
              ),
            ],
          }),
          concept(
            "observe",
            "Inspecting a running container from the host",
            "`docker inspect` gives the container's host PID. From it you can list its namespaces in /proc/<pid>/ns, read its capability sets and seccomp mode in /proc/<pid>/status, find its cgroup in /proc/<pid>/cgroup, and see its overlay mount with `findmnt`.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "oci-by-hand",
            "Unpack and run an OCI image by hand",
            "Pull an image with skopeo into an OCI layout. Read the manifest and config, extract the layers in order, stack them with overlayfs, generate a config.json with `runc spec`, and run it with runc directly. No Docker involved.",
            {
              doneWhen: ["The manifest, your overlay mount command, and the container running under runc"],
              links: [OCI_IMAGE_SPEC],
            },
          ),
        ]),
      ],
      {
        detail:
          "What an image is, how it becomes a root filesystem, and the chain of programs between `docker run` and a running process.",
        links: [CONTAINER_SECURITY],
      },
    ),

    topic(
      "hardening",
      "Hardening: least privilege",
      [
        topic("why", "Why isolation needs hardening", [
          concept(
            "root-is-root",
            "Root in a container is root on the host",
            "Without a user namespace, UID 0 inside a container is the same UID 0 the host kernel knows. Namespaces only change what it can see; whatever it can still reach, it reaches with root's permissions.",
          ),
          concept(
            "layers",
            "Least privilege and defence in depth",
            "Each control removes a different thing: capabilities remove root's special powers, seccomp removes system calls, a security module restricts which files and operations are allowed, a user namespace removes host-level identity, and cgroups bound resource use. They are stacked because any one of them can be misconfigured or have a bug.",
          ),
          concept(
            "non-root",
            "Running as a non-root user",
            "The cheapest control is not to run as UID 0 at all: set a non-root user in the image or at run time. A non-root process has no capabilities by default and is stopped by ordinary file permissions.",
          ),
        ]),
        topic(
          "caps",
          "Capabilities",
          [
            concept(
              "what",
              "What capabilities are",
              "Classic Unix has UID 0, which skips every permission check, and everyone else. Capabilities are root's power split into about 40 separate privileges (CAP_NET_ADMIN, CAP_SYS_ADMIN and so on) that can be granted or dropped individually. The kernel checks for the specific capability an operation needs, not for UID 0.",
            ),
            concept(
              "notable",
              "Capabilities worth knowing by name",
              "CAP_NET_BIND_SERVICE (bind ports below 1024), CAP_NET_RAW (raw and packet sockets, which ping traditionally used), CAP_NET_ADMIN (interfaces, routes, firewall), CAP_CHOWN (change any file's owner), CAP_DAC_OVERRIDE (bypass file read, write and execute permission checks), CAP_SETUID and CAP_SETGID (change identity), CAP_SYS_PTRACE (trace and modify other processes), CAP_SYS_MODULE (load kernel code) and CAP_SYS_ADMIN (mount and a long list of other operations, close to full root).",
            ),
            concept("sets", "Capability sets", undefined, {
              parts: [
                concept(
                  "eff-perm-bound",
                  "Effective, permitted and bounding sets",
                  "Each thread has an effective set, which the kernel checks, and a permitted set, the most it may make effective. The bounding set limits what the process can gain when it execs a program; a capability removed from it cannot come back for that process or its descendants.",
                ),
                concept(
                  "execve",
                  "What happens across execve and a UID change",
                  "By default, when a process running as UID 0 execs a program, it regains every capability in its bounding set, so clearing only the effective set does not survive an exec: a runtime must trim the bounding set. When a process changes all of its UIDs (real, effective and saved) from 0 to non-zero, its permitted, effective and ambient sets are cleared. A non-root process that execs an ordinary binary ends up with no permitted or effective capabilities unless the ambient set supplies them.",
                ),
                concept(
                  "ambient",
                  "Inheritable and ambient sets",
                  "The ambient set lets a non-root process pass chosen capabilities to the programs it execs without those binaries carrying file capabilities; the older inheritable set only takes effect together with file capabilities. A capability can be ambient only while it is also permitted and inheritable. A runtime can use the ambient set to give a non-root container process a capability such as CAP_NET_BIND_SERVICE. Docker avoids the need in the commonest case: in a container's own network namespace it sets the net.ipv4.ip_unprivileged_port_start sysctl to 0, so binding port 80 needs no capability.",
                ),
              ],
            }),
            concept(
              "file-caps",
              "File capabilities and setuid binaries",
              "A binary can carry capabilities in an extended attribute (security.capability), granted when it is executed: a narrower alternative to the setuid-root bit, which makes the program run as UID 0. Both are ways for an exec to raise privilege.",
            ),
            concept(
              "no-new-privs",
              "no_new_privs",
              "A per-process flag set with prctl(PR_SET_NO_NEW_PRIVS). Once set, execve can no longer grant privileges: setuid and setgid bits and file capabilities are ignored. It is inherited across fork and clone, kept across execve, cannot be cleared, and is what allows an unprivileged process to install a seccomp filter.",
            ),
            concept(
              "docker-default",
              "Docker's default set, and dropping the rest",
              "Docker keeps 14 capabilities (CHOWN, DAC_OVERRIDE, FOWNER, FSETID, KILL, SETGID, SETUID, SETPCAP, SETFCAP, NET_BIND_SERVICE, NET_RAW, SYS_CHROOT, MKNOD and AUDIT_WRITE) and drops the rest, so a default container's root cannot mount filesystems, reconfigure the network or load kernel modules. Most services need none of them: start from `--cap-drop=ALL` and add back only what fails.",
            ),
            concept(
              "observe",
              "Reading capability sets",
              "`capsh --print` shows the current sets from inside. From outside, CapInh, CapPrm, CapEff, CapBnd and CapAmb in /proc/<pid>/status are hex bitmasks that `capsh --decode=<mask>` turns into names.",
            ),
          ],
          { links: [CAPABILITIES_MAN] },
        ),
        topic(
          "seccomp",
          "seccomp-bpf",
          [
            concept(
              "what",
              "What seccomp-bpf does",
              "Capabilities gate privileged operations, but an unprivileged process can still make several hundred different system calls, each a path into kernel code that may hold a bug. seccomp attaches a filter to a process that inspects every system call's number and arguments and allows it, denies it or kills the process. It shrinks the kernel attack surface the process can reach.",
            ),
            concept(
              "data",
              "What a filter can and cannot see",
              "The filter is a classic BPF program given the system call number, the architecture, the instruction pointer and the six argument values as raw numbers. It cannot follow pointers, so it can match the flags of mount or the domain of socket but not the path passed to open, nor the flags of clone3, which sit inside a struct. Call numbers differ per architecture, so a filter must check the architecture field first or a blocked call can be reached under another number.",
            ),
            concept(
              "actions",
              "Filter actions",
              "A filter returns one action per call: allow, fail with a chosen errno, kill the thread or the process, raise SIGSYS, log, or hand the decision to a supervising process. Returning an errno such as EPERM lets a program handle the refusal; killing is safer for a call that should never happen.",
            ),
            concept(
              "install",
              "Installing a filter, and why it sticks",
              "Installing needs either CAP_SYS_ADMIN (in the caller's user namespace) or the no_new_privs flag, so an unprivileged process cannot use a filter to confuse a setuid program. A filter lasts for the life of the process and is inherited across fork and execve; more can be added, and when several apply the most restrictive result wins. A runtime installs it as one of the last steps before exec, because the setup itself needs calls the filter forbids.",
            ),
            concept(
              "allow-vs-deny",
              "Allow-lists versus deny-lists",
              "A deny-list blocks named calls and lets everything else through, including calls added to the kernel later and newer calls that do the same job (mount has equivalents such as fsopen and move_mount). An allow-list refuses anything not named, which is safer and has to be maintained as the program's needs change.",
            ),
            concept(
              "docker-profile",
              "Docker's default profile",
              "Docker applies an allow-list by default: it permits the calls ordinary programs use and fails the rest with EPERM. Some are never allowed by the profile (kexec_load, for example). Others are allowed only when the container has been given the matching capability: mount, unshare, setns and clone with namespace flags need CAP_SYS_ADMIN, the module-loading calls need CAP_SYS_MODULE, and open_by_handle_at needs CAP_DAC_READ_SEARCH. `--security-opt seccomp=unconfined` and `--privileged` turn the profile off.",
            ),
            concept(
              "observe",
              "Seeing seccomp on a live process",
              "The Seccomp line in /proc/<pid>/status is 0 for none, 2 for filter mode, and 1 for the older strict mode that allows only read, write, _exit and sigreturn. `strace -c` on a normal run lists the calls a program really makes, which is the starting point for an allow-list.",
            ),
          ],
          { links: [SECCOMP_MAN] },
        ),
        topic("lsm", "Linux security modules", [
          concept(
            "mac",
            "Mandatory access control",
            "File permissions are discretionary: the owner sets them and root bypasses them. A mandatory policy is loaded into the kernel by the administrator and enforced on every process, root included. Linux security modules implement it through hooks on operations such as opening a file, mounting or sending a signal. Where capabilities and seccomp decide which operations a process has at all, a security module decides which objects those operations may touch.",
          ),
          concept(
            "apparmor",
            "AppArmor",
            "Confines a program with a profile of rules about file paths, capabilities, mounts and network access. Docker applies a profile named docker-default to containers, which among other things denies mount and denies writes to sensitive parts of /proc and /sys. It is the default on Debian and Ubuntu.",
          ),
          concept(
            "selinux",
            "SELinux",
            "Labels every process and file and allows an access only where the policy permits that pair of labels. Container processes run with a confined type, and each container gets its own category labels, so one container cannot open another's files even when both run as the same UID. It is the default on Fedora and RHEL.",
          ),
        ]),
        topic("userns", "User namespaces and rootless containers", [
          concept(
            "mapping",
            "UID and GID mappings",
            "/proc/<pid>/uid_map and gid_map hold lines of 'first ID inside, first ID outside, count'. With '0 100000 65536', UID 0 inside maps to the unprivileged UID 100000 outside: a file the container's root creates is owned by an ordinary host user, and on files owned by the host's real root it gets only the permissions granted to 'other'.",
          ),
          concept(
            "scoped-caps",
            "Capabilities are scoped to the namespace",
            "The first process in a new user namespace gets a full capability set inside it, but only over resources owned by that namespace, and none in the parent. Every other namespace records the user namespace of the process that created it, and capability checks on it are made against that owner, which is why the user namespace is created first. Such a process can set its own hostname and configure its own interfaces; it cannot load kernel modules, set the system clock or mount a block device.",
          ),
          concept(
            "writing",
            "Who may write a mapping",
            "A map can be written once. An unprivileged process may map only its own UID and GID (and must write 'deny' to its setgroups file before the GID map). Mapping a range needs privilege in the parent namespace, which the privileged helper programs newuidmap and newgidmap provide, limited to the ranges assigned to the user in /etc/subuid and /etc/subgid.",
          ),
          concept(
            "unmapped",
            "Unmapped IDs",
            "A host UID with no mapping appears inside as the overflow ID 65534 ('nobody'), and the namespace's root has no power over that UID's files. A root filesystem unpacked by the real root therefore looks unowned from inside until its ownership is shifted or it is mounted with an ID mapping.",
          ),
          concept(
            "cost",
            "The cost: more kernel code reachable",
            "Inside a user namespace an unprivileged user can reach code that used to be root-only, such as mounting and firewall configuration, and several kernel privilege-escalation bugs have needed exactly that. Some distributions restrict unprivileged user namespaces for this reason. A user namespace reduces the damage of an escape while enlarging the surface for one.",
          ),
          concept(
            "rootless",
            "Rootless containers",
            "In rootless mode the runtime and its daemon run as an ordinary user and do everything inside a user namespace. Networking goes through a user-space stack (slirp4netns or pasta) because an unprivileged user cannot attach a veth pair to the host, and cgroup limits need a subtree delegated by systemd. A compromise of the runtime or an escape yields only that user's privileges. This differs from user-namespace remapping, where the daemon still runs as root and only the container's IDs are shifted.",
          ),
        ]),
        topic("limits", "Filesystem, device and resource controls", [
          concept(
            "readonly",
            "Read-only root filesystem and mount flags",
            "Mounting the container's root read-only, with a tmpfs for the few paths that need writes, stops an attacker replacing binaries, dropping tools or leaving anything behind. The nosuid, nodev and noexec mount options make the kernel ignore setuid bits, device nodes or execute permission on a filesystem, so a writable directory cannot be used to raise privilege or reach a device.",
          ),
          concept(
            "devices",
            "Device access",
            "A device node is a door to a kernel driver or a whole disk. Runtimes create only a few harmless nodes in /dev and attach a device filter to the cgroup, which the kernel consults on every mknod and open of a device. On cgroup v2 the filter is an eBPF program attached to the cgroup; v1 had a devices controller with allow and deny files. So even with CAP_MKNOD, a node for the host's disk cannot be created or opened.",
          ),
          concept(
            "dos",
            "Resource limits are a security control",
            "Availability is part of security: a tenant that exhausts memory, CPU, process slots or disk takes down its neighbours without escaping anything. A fork bomb keeps forking copies of itself until nothing else on the host can start; pids.max protects against it by capping the number of processes and threads in the cgroup. A sandbox needs memory.max, cpu.max and pids.max, plus a bound on disk, because writes to the overlay upper directory are otherwise limited only by the host filesystem.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "runtime-limits",
            "Container runtime, part 2: limits and least privilege",
            "Extend your runtime: place the container in a cgroup v2 with memory.max, cpu.max and pids.max; drop all capabilities except a short allow-list; install a seccomp filter that blocks mount, ptrace, reboot and kexec_load; map root to an unprivileged host UID with a user namespace. Prove each control with a failing attempt from inside.",
            {
              doneWhen: [
                "A fork bomb stopped by pids.max, a denied mount, and `capsh --print` from inside",
                "The UID inside the container next to the process owner on the host",
              ],
              links: [SECCOMP_MAN, CAPABILITIES_MAN],
            },
          ),
        ]),
      ],
      {
        detail: "Taking away everything a workload does not need: capabilities, system calls, identity and resources.",
        links: [
          CONTAINER_SECURITY,
          link("Linux containers in 500 lines of code", "https://blog.lizzie.io/linux-containers-in-500-loc.html"),
        ],
      },
    ),

    topic(
      "escapes",
      "Escapes and threat modelling",
      [
        topic("surface", "The attack surface", [
          concept(
            "kernel",
            "The shared kernel is the fundamental weakness",
            "All containers share one host kernel with a very large system-call surface. A single exploitable kernel bug reachable from inside can become a host compromise, whatever namespaces are in place.",
          ),
          concept(
            "what-escape",
            "What an escape is, and the other surfaces",
            "An escape is code in a container gaining the power to act on the host or on another container beyond what it was granted. Besides the kernel, a container can attack the runtime that sets it up (runc has had escape bugs, including one that let a container overwrite the host's runc binary), the daemon's API if it can reach it, and anything mounted in from the host. Most real escapes come from configuration that handed the container a piece of the host.",
          ),
          concept(
            "side-channels",
            "Side channels: leaking without escaping",
            "Tenants that share a CPU can leak data to each other through timing, without breaking any boundary. Speculative-execution flaws such as Spectre and Meltdown let code read memory it has no access to, in some variants across processes, containers and virtual machines. The defences are kernel and microcode mitigations and, for hostile tenants, not letting two tenants run on the two hardware threads of one core (disabling SMT, or core scheduling).",
          ),
        ]),
        topic("classes", "Escape classes", [
          concept(
            "privileged",
            "Privileged containers",
            "`docker run --privileged` grants all capabilities and access to all host devices, disables the seccomp profile and AppArmor or SELinux confinement, and lifts the masked and read-only paths in /proc and /sys. The container can find the host's disk under /dev, mount it and edit any host file, or load a kernel module. It is root on the host with a different view of the filesystem.",
          ),
          concept(
            "socket",
            "A mounted Docker socket",
            "Whoever can talk to the Docker API can start a new container that is privileged and mounts the host filesystem. Mounting /var/run/docker.sock into a container is therefore equivalent to giving it root on the host, with no bug involved.",
          ),
          concept("dangerous-caps", "Dangerous capabilities", undefined, {
            parts: [
              concept(
                "sys-admin",
                "CAP_SYS_ADMIN and the release_agent escape",
                "CAP_SYS_ADMIN permits mount among much else, and Docker's seccomp profile allows mount once the capability is added, which leaves only the security module in the way. The classic escape mounts a cgroup v1 hierarchy, turns on notify_on_release in a child cgroup and writes a path into release_agent: when that cgroup empties, the kernel runs the program as root in the host's namespaces. Since a 2022 kernel fix, release_agent can be set only by a process with CAP_SYS_ADMIN in the initial user namespace, so the trick fails from inside a user namespace.",
              ),
              concept(
                "sys-module",
                "CAP_SYS_MODULE",
                "Loading a kernel module puts code of the container's choosing straight into the host kernel, beneath every other control.",
              ),
              concept(
                "sys-ptrace",
                "CAP_SYS_PTRACE with the host PID namespace",
                "Sharing the host's PID namespace makes host processes visible, and CAP_SYS_PTRACE allows attaching to them and injecting code, unless the security module forbids it. Without the shared PID namespace the capability reaches only the container's own processes.",
              ),
              concept(
                "dac-read-search",
                "CAP_DAC_READ_SEARCH and open_by_handle_at",
                "open_by_handle_at opens a file from a handle (in effect a reference to an inode on a mounted filesystem) instead of a path, so it ignores the container's root directory. With CAP_DAC_READ_SEARCH and any descriptor on a host filesystem, such as a bind-mounted /etc/hostname, a container can guess handles and open host files. This was the 'Shocker' escape from early Docker, which did not yet drop the capability.",
              ),
            ],
          }),
          concept(
            "host-ns",
            "Shared host namespaces",
            "`--pid=host` lets the container see every host process and, with enough privilege, reach their files through /proc/<pid>/root. `--net=host` puts it in the host's network stack, where services bound to 127.0.0.1 are reachable. Each shared namespace removes one wall.",
          ),
          concept(
            "mounts",
            "Misconfigured mounts",
            "A writable bind mount of a sensitive host path is a direct write to the host: /etc (cron jobs, passwd), a user's .ssh directory, or the host's /proc and /sys, where a file such as core_pattern can name a program the kernel will run on the host. Mount the narrowest directory that works, read-only where possible.",
          ),
          concept(
            "kernel-bugs",
            "Kernel vulnerabilities",
            "A kernel bug reachable through an allowed system call gives control beneath every namespace and capability check. Dirty COW and Dirty Pipe, for example, let an unprivileged process write to files it could only read. No configuration fully prevents this class: seccomp narrows what is reachable, patching closes known bugs, and a stronger sandbox removes the shared kernel.",
          ),
          concept(
            "defaults",
            "Which default control stops which escape",
            "In a default Docker container the host disk cannot be opened (the device filter), mount fails (no CAP_SYS_ADMIN, and refused again by seccomp and AppArmor), the Docker socket is absent and modules cannot be loaded. For each escape above you can name the control that blocks it and the flag that removes that control.",
          ),
        ]),
        topic("threat-model", "Threat modelling", [
          concept(
            "why",
            "Why write a threat model",
            "Every control costs performance, compatibility or engineering time, and 'secure' means nothing without saying against whom. For a service you wrote, an attacker must first find a bug that gives code execution; for code written by a stranger or an LLM, code execution is the starting point. A threat model states what is protected, from which attacker, and which risks are accepted, so the choice of boundary can be argued instead of guessed.",
          ),
          concept("elements", "The elements of a threat model", undefined, {
            parts: [
              concept(
                "assets",
                "Assets",
                "The assets to protect: other tenants' code and data, credentials and secrets, the host and control plane, and the availability and reputation of the service.",
              ),
              concept(
                "attackers",
                "Attackers and their capabilities",
                "Who they are and where they start. For a code-execution service the attacker already runs arbitrary code inside the sandbox: a malicious tenant, or an honest tenant's agent that prompt injection has steered into running hostile code.",
              ),
              concept(
                "boundaries",
                "Trust boundaries",
                "The lines where data or control passes between parts that trust each other differently: sandbox to host kernel, sandbox to network, sandbox to control-plane API, tenant to tenant. Each is drawn on a diagram and examined in turn.",
              ),
              concept(
                "paths",
                "The ways each boundary could be crossed",
                "For each boundary, the concrete things that would have to go wrong: a kernel bug reachable through the allowed system calls, a misconfigured mount, a reachable metadata endpoint, a cache shared between tenants.",
              ),
              concept(
                "mitigations",
                "Mitigations and their costs",
                "For each path, the control that blocks or limits it, what it costs, and what risk remains. Writing down the residual risk and the assumptions (for example, how quickly the host kernel is patched) is part of the model.",
              ),
            ],
          }),
          concept(
            "blast-radius",
            "Blast radius",
            "Assume a boundary will fail and ask what the attacker gets. One sandbox per tenant, one narrowly scoped credential per sandbox and no shared writable state mean a break affects one tenant; a host shared by many tenants' sandboxes turns one host escape into a breach of all of them.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "three-escapes",
            "Escape a container three ways",
            "On a throwaway VM, break out of Docker containers that are misconfigured: one run with --privileged (mount the host disk), one with the Docker socket mounted (start a new privileged container), one with CAP_SYS_ADMIN (abuse mount; on a host with AppArmor also pass `--security-opt apparmor=unconfined`, because the docker-default profile denies mount). Then show the default configuration blocks each.",
            {
              doneWhen: [
                "Proof of host access for each misconfiguration",
                "A note on which default control stops each escape",
              ],
            },
          ),
        ]),
      ],
      {
        detail: "How containers are broken out of in practice, and how to state what you are defending and from whom.",
        links: [CONTAINER_SECURITY],
      },
    ),

    topic(
      "sandboxes",
      "Stronger sandboxes",
      [
        topic(
          "why",
          "Why namespaces are not enough",
          [
            concept(
              "untrusted",
              "Untrusted code against a shared kernel",
              "A hardened container still lets the workload call the host kernel directly, and kernel privilege-escalation bugs are found regularly. That is an acceptable risk for your own code and a poor one for code written by strangers, where one bug exposes every tenant on the host.",
            ),
            concept(
              "narrow-interface",
              "Every sandbox narrows the interface",
              "A stronger sandbox puts something between the workload and the host kernel so that the interface an attacker can reach is smaller: a user-space kernel that makes few host calls, a hypervisor exposing a few virtual devices, or a language runtime exposing only its own API. Comparing sandboxes means comparing those interfaces and the code behind them.",
            ),
          ],
          { links: [link("Sandboxing and workload isolation", "https://fly.io/blog/sandboxing-and-workload-isolation/")] },
        ),
        topic(
          "gvisor",
          "gVisor",
          [
            concept(
              "sentry",
              "The Sentry: a kernel in user space",
              "A user-space kernel written in Go (the Sentry, one per sandbox) intercepts the application's system calls and implements Linux semantics itself (processes, memory, files, signals, a network stack), making only a small set of host system calls. No application call is passed through to the host kernel, so a host kernel bug in a call the Sentry does not make is out of reach.",
            ),
            concept(
              "gofer",
              "The Gofer and the Sentry's own confinement",
              "The Sentry is itself sandboxed: it runs in its own namespaces, with an empty mount namespace, under a seccomp filter that allows only the host calls it needs. A separate Gofer process per sandbox owns the container's filesystem and hands the Sentry file descriptors for it. In the default 'directfs' mode the Sentry then operates on files beneath those descriptors itself; with directfs turned off, every file operation is a request to the Gofer, which is stricter and slower. An escape needs a bug in the Sentry and then a second way through that confinement to the host kernel.",
            ),
            concept(
              "platforms",
              "runsc and its platforms",
              "runsc is gVisor's OCI runtime, a drop-in replacement for runc selected per container (`docker run --runtime=runsc`). A platform is the mechanism that redirects the application's system calls to the Sentry and switches address spaces. systrap, the default, intercepts calls with a seccomp filter that makes the kernel raise SIGSYS; it needs no hardware virtualization and so runs inside ordinary cloud VMs. The KVM platform uses the CPU's virtualization extensions, with the Sentry acting as both guest kernel and virtual machine monitor, and performs best on bare metal.",
            ),
            concept(
              "guest-view",
              "What the workload sees as its kernel",
              "Inside gVisor, /proc/version and `dmesg` show what the Sentry reports, not the host kernel, because the Sentry is the only kernel the workload talks to. From the host, strace on the sandbox shows the small set of calls the Sentry itself makes.",
            ),
            concept(
              "cost",
              "What gVisor costs",
              "Slower system calls and I/O, because every call is intercepted and re-implemented in the Sentry (and, with directfs off, every file operation crosses to the Gofer), and some compatibility gaps, because not every call and /proc file is implemented. CPU-bound code is barely affected.",
            ),
          ],
          {
            links: [
              link("gVisor documentation", "https://gvisor.dev/docs/"),
              link("gVisor security model", "https://gvisor.dev/docs/architecture_guide/security/"),
            ],
          },
        ),
        topic(
          "microvm",
          "MicroVMs and Kata",
          [
            concept(
              "hw-boundary",
              "The hardware virtualization boundary",
              "The workload runs on its own guest kernel inside a virtual machine, with the CPU's virtualization support keeping the guest out of host memory. What faces the attacker is no longer the host's system-call table but the hypervisor and the virtual devices it emulates. Virtualization and Firecracker builds this from KVM up.",
            ),
            concept(
              "firecracker",
              "MicroVMs: a small device model",
              "A microVM monitor such as Firecracker offers the guest only a handful of simple virtual devices (network, block, a serial console and little else) in place of a full emulated PC. Less device code means less attack surface and a faster boot. The monitor process is itself confined: a jailer program sets up a chroot, namespaces and cgroups, drops privileges and execs Firecracker as an unprivileged process, and Firecracker installs seccomp filters on its own threads. A guest that breaks the monitor lands in another sandbox.",
              { links: [FIRECRACKER_DESIGN] },
            ),
            concept(
              "kata",
              "Kata Containers",
              "Kata is an OCI runtime that starts each container or pod inside its own lightweight VM with a guest kernel, while looking like an ordinary container to containerd and Kubernetes, where a RuntimeClass selects it per pod. It gives a VM boundary without changing how workloads are packaged or scheduled.",
            ),
            concept(
              "cost",
              "What a VM boundary costs",
              "Each sandbox carries a guest kernel's memory and boot time, guests do not share page cache the way containers on one host share image layers, and sharing files with the host needs a virtual device. It also needs /dev/kvm, which means bare metal or a cloud instance with nested virtualization.",
            ),
          ],
        ),
        topic("others", "Language-level sandboxes and what platforms chose", [
          concept(
            "isolates",
            "V8 isolates",
            "Many tenants run in one process, each in its own isolate with a separate heap. The trade-off: millisecond start and very high density, but only JavaScript and WebAssembly run, and the boundary is the JavaScript engine, a wider attack surface than a hypervisor. Platforms built on isolates therefore add further layers: Cloudflare Workers describes an OS-level sandbox (namespaces and seccomp) around the whole runtime process, patching the engine within about a day of a fix, keeping tenants of different trust levels in different processes, and Spectre mitigations such as freezing timers while code runs.",
            {
              links: [
                link(
                  "Cloudflare Workers security model",
                  "https://developers.cloudflare.com/workers/reference/security-model/",
                ),
              ],
            },
          ),
          concept(
            "wasm",
            "WebAssembly",
            "A WebAssembly module can only read and write its own linear memory and can only call the functions it was explicitly given, so it starts with no access to files, network or system calls. The boundary is the runtime (Wasmtime, for example) and its compiler: a bug there, or a too-powerful imported function, is the way out.",
            { links: [link("Wasmtime security", "https://docs.wasmtime.dev/security.html")] },
          ),
          concept(
            "pods-choice",
            "Choosing ordinary pods anyway",
            "Some agent platforms run each session in an ordinary Kubernetes pod instead of a microVM. They accept the shared-kernel boundary in exchange for Kubernetes' scheduler, ecosystem and cost, and lean on the surrounding controls: network policy, egress blocks, resource limits and admission rules. After reading Emergent's account you can state what they gained, what risk they accepted, and what else has to be hardened to make that choice defensible.",
            {
              links: [
                link(
                  "Emergent: real environments for AI agents",
                  "https://emergent.sh/blog/real-environments-for-ai-agents-and-why-we-bet-on-kubernetes",
                ),
              ],
            },
          ),
        ]),
        topic("compare", "Comparing the boundaries", [
          concept(
            "summary",
            "Container, gVisor, microVM side by side",
            "Container: shared host kernel, large system-call surface. gVisor: a user-space kernel in front of a narrow set of host system calls. MicroVM: hardware virtualization with a separate guest kernel and a small device model.",
          ),
          concept(
            "escape-chain",
            "What an escape requires for each",
            "From a container: one exploitable bug in the host kernel reachable through the allowed system calls, or one misconfiguration. From gVisor: a bug in the Sentry, then a way past the Sentry's own seccomp filter and namespaces. From a microVM: a bug in the hypervisor or its device emulation, then a way out of the confined monitor process. Counting the independent failures needed is how boundaries are compared.",
          ),
          concept(
            "tradeoffs",
            "Startup, density, performance and compatibility",
            "Of the three operating-system boundaries, containers start fastest, pack densest and run everything at native speed. gVisor keeps container-like startup and packaging but slows system calls and I/O and has compatibility gaps. MicroVMs run a real Linux kernel, so compatibility is high, at the price of per-guest memory and a boot. Isolates and WebAssembly start fastest of all and run only code built for them.",
          ),
          concept(
            "where",
            "Where each can run",
            "gVisor with its default systrap platform needs no hardware virtualization, so it runs inside ordinary cloud VMs. Firecracker needs /dev/kvm: bare metal or nested virtualization. This alone often decides the choice for a team that rents standard cloud instances.",
          ),
          concept(
            "layering",
            "Choosing and layering boundaries",
            "The boundary follows from the threat model: trusted code needs less than code from anonymous users. Boundaries also stack (a hardened container inside a microVM, gVisor on a cloud VM), and the strongest boundary still needs the controls around it: egress rules, resource limits and scoped credentials.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "gvisor-compare",
            "runc vs gVisor on the same workload",
            "Install runsc as a Docker runtime. Run a syscall-heavy benchmark (many small file operations), a CPU-bound one and a network one under runc and under runsc. Compare speed, and compare `dmesg` and /proc/version inside each. Use strace on the host to see which syscalls the gVisor sandbox itself makes.",
            {
              doneWhen: [
                "A timing table for the three workloads under both runtimes",
                "A note on what the guest sees as its kernel under gVisor, and why that matters",
              ],
            },
          ),
        ]),
      ],
      {
        detail: "Boundaries that do not rest on one shared kernel: user-space kernels, microVMs and language runtimes.",
        links: [CONTAINER_SECURITY],
      },
    ),

    topic(
      "egress",
      "Egress control and the rest of the sandbox",
      [
        topic("why", "Why outbound access is dangerous", [
          concept(
            "position",
            "The sandbox sits inside your network",
            "Kernel isolation says nothing about the network. Code in a sandbox sends packets from inside your infrastructure, behind the firewall that keeps outsiders out, so untrusted code with open egress can reach your internal services.",
          ),
          concept(
            "metadata",
            "The metadata endpoint",
            "169.254.169.254 is the cloud instance metadata service, a link-local address answered by the cloud provider. Untrusted code that reaches it can obtain the temporary credentials of the role attached to the host. Providers have hardened it: AWS IMDSv2 requires a session token fetched with a PUT request, and the reply to that PUT has an IP hop limit of 1 by default so it does not survive being routed onward. That stops most forged requests made through a vulnerable server, but the older version may still be enabled, the hop limit is often raised for containers, and code that can send arbitrary requests can make the PUT itself, so a sandbox must block the address.",
          ),
          concept(
            "internal",
            "Internal services and the host itself",
            "The private ranges (10/8, 172.16/12, 192.168/16) hold databases, admin panels, the orchestrator's API and other sandboxes, many of which assume that anything inside the network is trusted. The host's own addresses expose whatever listens on the host, including the bridge address the sandbox uses as its gateway.",
          ),
          concept(
            "exfiltration",
            "Exfiltration and abuse",
            "Any outbound channel can carry data out: secrets, source code, another tenant's data. DNS lookups are a channel too, since a query for a made-up name delivers that name to whoever runs the domain. Open egress also lets the sandbox send spam, scan other networks or join an attack from your addresses.",
          ),
        ]),
        topic("controls", "Controlling egress", [
          concept(
            "default-deny",
            "Default deny, enforced outside the sandbox",
            "Start from dropping everything and allow only what is needed. The rules live in the host's network namespace, on the path out of the sandbox's veth or TAP device, because code that is root inside its own network namespace can rewrite any rule placed there.",
          ),
          concept(
            "hooks",
            "Forward versus input",
            "Packets from the sandbox to the outside pass the host's forward hook; packets addressed to the host itself pass the input hook. A rule set that filters only forwarded traffic leaves every service on the host reachable.",
          ),
          concept(
            "block-ranges",
            "The ranges to block",
            "When the policy is 'public internet only', drop the metadata address and the rest of link-local (169.254/16), the private ranges, any other internal range your infrastructure uses and the host itself, and accept reply packets through connection tracking. Apply the same policy to IPv6 or disable IPv6 in the sandbox, since IPv4 rules do not match IPv6 packets.",
          ),
          concept(
            "dns",
            "DNS as part of the policy",
            "Point the sandbox at a resolver you control and block direct DNS to anywhere else, so lookups can be logged and filtered. Checks must apply to the address actually connected to, not to a name checked earlier: with DNS rebinding a name resolves to a public address when checked and to an internal one when used.",
          ),
          concept(
            "proxy",
            "Allowlist proxies",
            "IP rules cannot express 'only this hostname', because addresses change and many sites share them. An egress proxy can: the sandbox may connect only to the proxy, which reads the requested hostname (from an HTTP CONNECT request or the TLS server name), checks it against an allowlist, and makes the outbound connection itself.",
          ),
          concept(
            "per-sandbox",
            "Per-sandbox network policy",
            "Each sandbox gets its own network namespace and its own veth or TAP device, so rules can be keyed by interface: different tenants get different allowlists, and sandbox-to-sandbox traffic is dropped by default. In Kubernetes the same idea is expressed as a NetworkPolicy enforced by the network plugin.",
          ),
          concept(
            "verify",
            "Testing the rules from inside",
            "You can prove each rule with a request from inside the sandbox: connections to the metadata address, a private address and the host must fail, a public site must succeed, and a counter on each rule shows which one matched.",
          ),
        ]),
        topic("beyond", "Beyond the isolation boundary", [
          concept(
            "checklist",
            "What else an agent sandbox must control",
            "Beyond the isolation boundary: network egress, resource limits, secrets and credentials exposure, storage isolation between tenants, and what the agent's tools are permitted to do. A perfect boundary around a sandbox that holds a powerful credential protects very little.",
          ),
          concept(
            "secrets",
            "Secrets and credentials",
            "Anything placed in the sandbox (environment variables, mounted files, tokens in a cloned repository) is readable by the code running there. Give a sandbox only short-lived credentials scoped to its one task, or keep the credential outside in a proxy that adds it to outgoing requests so the code never sees it.",
          ),
          concept(
            "storage",
            "Storage isolation between tenants",
            "Each tenant's sandbox gets its own root filesystem and volumes, nothing writable is shared, and a sandbox is destroyed, not reused, when its tenant is done. Shared caches and reused disks are the usual ways one tenant's data reaches another.",
          ),
          concept(
            "tools",
            "What the agent's tools may do",
            "A tool call acts outside the sandbox with whatever authority the tool holds: sending email, pushing code, calling an API as the user. Isolation does not constrain that, so each tool needs its own limits on scope, plus confirmation for actions that cannot be undone.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "egress-rules",
            "Lock down a sandbox's network",
            "For a sandbox in its own network namespace, write nftables rules that allow outbound internet but block the cloud metadata address (169.254.169.254), all private ranges, and the host itself. Test each rule from inside. Untrusted code with open egress can reach your internal services.",
            { doneWhen: ["The ruleset, with a blocked and an allowed request from inside the sandbox"] },
          ),
          build(
            "threat-model",
            "Threat model: running agent-generated code",
            "Write a two-page threat model for a service that runs code written by an LLM agent on behalf of many tenants. Cover assets, attackers (malicious tenant, prompt-injected agent), trust boundaries, and for each of containers, gVisor and microVMs what an escape would require. Recommend a design and its costs.",
            {
              doneWhen: ["A link to the threat model document"],
              links: [FIRECRACKER_DESIGN],
            },
          ),
          build(
            "writeup",
            "Write-up: I built a container runtime",
            "Publish your runtime with a README that walks through each isolation mechanism and the attack it stops.",
            { doneWhen: ["A link to the published write-up"] },
          ),
        ]),
      ],
      {
        detail: "The network path out of a sandbox, and the other things a sandbox for untrusted code has to control.",
      },
    ),
  ],
);
