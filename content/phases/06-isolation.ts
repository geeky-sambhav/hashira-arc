import { cards, lab, link, note, output, paid, read, url } from "../dsl";
import type { Phase } from "../types";

const CONTAINER_SECURITY = paid(
  "Container Security, 2nd edition (Liz Rice)",
  "https://www.oreilly.com/library/view/container-security-2nd/9798341627697/",
);

export const phase: Phase = {
  id: "isolation",
  label: "Phase 6",
  title: "Containers, isolation and security",
  summary:
    "Build a container runtime, then break out of one. Learn the whole isolation spectrum, from namespaces to user-space kernels, and how to reason about running code you do not trust.",
  weeks: { start: 20, end: 22 },
  pillar: "isolation",
  modules: [
    {
      id: "iso-containers",
      title: "A container is a process",
      summary: "Week 20. Namespaces and a new root, assembled by hand.",
      items: [
        read("iso-what-is-container", "What even is a container", {
          week: 20,
          hours: 2.5,
          source: "Julia Evans; Liz Rice",
          chapters: "The post, then watch 'Containers from Scratch' and read along in the repo",
          links: [
            link("What even is a container", "https://jvns.ca/blog/2016/10/10/what-even-is-a-container/"),
            link("Containers from scratch (code)", "https://github.com/lizrice/containers-from-scratch"),
          ],
        }),
        read("iso-namespaces", "Namespaces in operation", {
          week: 20,
          hours: 4,
          source: "LWN (Michael Kerrisk)",
          chapters: "Parts 1-5: overview, the API, PID namespaces, user namespaces",
          links: [link("Namespaces in operation, part 1", "https://lwn.net/Articles/531114/")],
        }),
        read("iso-security-book-1", "Container Security: how containers isolate", {
          week: 20,
          hours: 8,
          source: "Container Security, 2nd edition",
          chapters: "Threats, system calls and capabilities, cgroups, container isolation, virtual machines, images",
          links: [CONTAINER_SECURITY],
        }),
        lab("iso-runtime-ns", "Container runtime, part 1: namespaces and root", {
          week: 20,
          hours: 9,
          brief:
            "Write `mycontainer run <rootfs> <cmd>` in Go. Re-exec yourself in new UTS, PID, mount, IPC and network namespaces, pivot_root into an Alpine minirootfs, mount /proc, and exec the command. Inside, `ps` must show your command as PID 1 and the host's files must be unreachable.",
          evidence: [
            url("repo", "Link to the runtime"),
            output("inside", "`ps aux`, `hostname` and `ls /` from inside, and `lsns` from the host"),
          ],
          links: [link("Build a container from scratch in Go", "https://labs.iximiuz.com/tutorials/build-a-container-from-scratch-in-go-1b92e418")],
        }),
        read("iso-fly-sandboxing", "Sandboxing and workload isolation", {
          week: 20,
          hours: 1.5,
          source: "Fly.io blog",
          links: [link("Sandboxing and workload isolation", "https://fly.io/blog/sandboxing-and-workload-isolation/")],
        }),
      ],
    },
    {
      id: "iso-hardening",
      title: "Limits, privileges and escapes",
      summary: "Week 21. Capabilities, seccomp, and what goes wrong without them.",
      items: [
        read("iso-security-book-2", "Container Security: breaking and strengthening isolation", {
          week: 21,
          hours: 6,
          source: "Container Security, 2nd edition",
          chapters: "Breaking container isolation, software vulnerabilities, strengthening isolation (seccomp, AppArmor, gVisor, Kata, Firecracker), network security",
          links: [CONTAINER_SECURITY],
        }),
        lab("iso-runtime-limits", "Container runtime, part 2: limits and least privilege", {
          week: 21,
          hours: 7,
          brief:
            "Extend your runtime: place the container in a cgroup v2 with memory.max, cpu.max and pids.max; drop all capabilities except a short allow-list; install a seccomp filter that blocks mount, ptrace, reboot and kexec; map root to an unprivileged host UID with a user namespace. Prove each control with a failing attempt from inside.",
          evidence: [
            output("denied", "A fork bomb stopped by pids.max, a denied mount, and `capsh --print` inside"),
            output("uid", "The UID inside the container vs the process owner on the host"),
          ],
          links: [link("seccomp(2)", "https://man7.org/linux/man-pages/man2/seccomp.2.html"), link("capabilities(7)", "https://man7.org/linux/man-pages/man7/capabilities.7.html")],
        }),
        read("iso-500-loc", "Linux containers in 500 lines of code", {
          week: 21,
          hours: 3,
          source: "Lizzie Dixon",
          chapters: "Read for the reasoning behind each dropped capability and blocked syscall",
          links: [link("Linux containers in 500 lines of code", "https://blog.lizzie.io/linux-containers-in-500-loc.html")],
        }),
        lab("iso-escapes", "Escape a container three ways", {
          week: 21,
          hours: 5,
          brief:
            "On a throwaway VM, break out of Docker containers that are misconfigured: one run with --privileged (mount the host disk), one with the Docker socket mounted (start a new privileged container), one with CAP_SYS_ADMIN (abuse mount). Then show the default configuration blocks each.",
          evidence: [
            output("escapes", "Proof of host access for each misconfiguration"),
            note("blocked", "Which default control stops each escape"),
          ],
        }),
        lab("iso-oci-image", "Unpack and run an OCI image by hand", {
          week: 21,
          hours: 4,
          brief:
            "Pull an image with skopeo into an OCI layout. Read the manifest and config, extract the layers in order, stack them with overlayfs, generate a config.json with `runc spec`, and run it with runc directly. No Docker involved.",
          evidence: [output("run", "The manifest, your overlay mount command, and the container running under runc")],
          links: [link("OCI image specification", "https://github.com/opencontainers/image-spec/blob/main/spec.md")],
        }),
      ],
    },
    {
      id: "iso-sandboxes",
      title: "Sandboxes for untrusted code",
      summary: "Week 22. gVisor, isolates, and choosing a boundary for agent workloads.",
      items: [
        read("iso-gvisor", "gVisor architecture and security model", {
          week: 22,
          hours: 3,
          source: "gVisor documentation",
          chapters: "Introduction; Architecture guide: platforms, security model",
          links: [link("gVisor documentation", "https://gvisor.dev/docs/"), link("gVisor security model", "https://gvisor.dev/docs/architecture_guide/security/")],
        }),
        lab("iso-gvisor-compare", "runc vs gVisor on the same workload", {
          week: 22,
          hours: 5,
          brief:
            "Install runsc as a Docker runtime. Run a syscall-heavy benchmark (many small file operations), a CPU-bound one and a network one under runc and under runsc. Compare speed, and compare `dmesg` and /proc/version inside each. Use strace on the host to see which syscalls the gVisor sandbox itself makes.",
          evidence: [
            output("bench", "Timing table for the three workloads under both runtimes"),
            note("kernel", "What the guest sees as its kernel under gVisor, and why that matters"),
          ],
        }),
        read("iso-other-boundaries", "Isolates, WebAssembly and what agent platforms chose", {
          week: 22,
          hours: 3,
          source: "Cloudflare, Wasmtime and Emergent documentation",
          chapters: "Workers security model; Wasmtime security; Emergent on choosing Kubernetes pods over microVMs",
          links: [
            link("Cloudflare Workers security model", "https://developers.cloudflare.com/workers/reference/security-model/"),
            link("Wasmtime security", "https://docs.wasmtime.dev/security.html"),
            link("Emergent: real environments for AI agents", "https://emergent.sh/blog/real-environments-for-ai-agents-and-why-we-bet-on-kubernetes"),
          ],
        }),
        lab("iso-egress", "Lock down a sandbox's network", {
          week: 22,
          hours: 4,
          brief:
            "For a sandbox in its own network namespace, write nftables rules that allow outbound internet but block the cloud metadata address (169.254.169.254), all private ranges, and the host itself. Test each rule from inside. Untrusted code with open egress can reach your internal services.",
          evidence: [output("rules", "The ruleset and a blocked and an allowed request from inside the sandbox")],
        }),
        lab("iso-threat-model", "Threat model: running agent-generated code", {
          week: 22,
          hours: 5,
          brief:
            "Write a two-page threat model for a service that runs code written by an LLM agent on behalf of many tenants. Cover assets, attackers (malicious tenant, prompt-injected agent), trust boundaries, and for each of containers, gVisor and microVMs what an escape would require. Recommend a design and its costs.",
          evidence: [url("doc", "Link to the threat model document")],
          links: [link("Firecracker design: threat containment", "https://github.com/firecracker-microvm/firecracker/blob/main/docs/design.md")],
        }),
        lab("iso-writeup", "Write-up: I built a container runtime", {
          week: 22,
          hours: 3,
          brief: "Publish your runtime with a README that walks through each isolation mechanism and the attack it stops.",
          evidence: [url("post", "Link to the published write-up")],
        }),
      ],
    },
  ],
};

export const quiz = [
  ...cards("iso-containers", [
    ["In one sentence, what is a container?", "An ordinary Linux process (tree) started with its own namespaces, a different root filesystem, cgroup limits and reduced privileges, sharing the host kernel."],
    ["Name the Linux namespace types and what each isolates.", "Mount (filesystem view), PID (process IDs), network (network stack), UTS (hostname), IPC (System V IPC and message queues), user (UID and GID mappings), cgroup (cgroup root), and time."],
    ["Namespaces versus cgroups: which does what?", "Namespaces limit what a process can see. Cgroups limit how much it can use."],
    ["Why use pivot_root instead of chroot for containers?", "chroot only changes path resolution and a privileged process can escape it. pivot_root swaps the root mount of the mount namespace, after which the old root can be unmounted entirely."],
    ["Why is the first process in a PID namespace special?", "It is PID 1 there: it must reap orphaned children, signals without handlers are ignored for it, and when it exits the kernel kills every other process in the namespace."],
    ["What does a user namespace change about 'root' in a container?", "UID 0 inside maps to an unprivileged UID outside. The process has full capabilities only over resources owned by its namespace."],
    ["What is the fundamental weakness of containers as a security boundary?", "All containers share one host kernel with a very large system-call surface. A single exploitable kernel bug reachable from inside can become a host compromise."],
  ]),
  ...cards("iso-hardening", [
    ["What are Linux capabilities?", "Root's power split into about 40 separate privileges (CAP_NET_ADMIN, CAP_SYS_ADMIN and so on) that can be granted or dropped individually."],
    ["What does seccomp-bpf do?", "Attaches a filter to a process that inspects every system call number and arguments and allows, denies or kills. It shrinks the kernel attack surface the process can reach."],
    ["Why is `docker run --privileged` dangerous?", "It grants all capabilities, access to all devices, and disables seccomp and AppArmor confinement, so the container can mount the host disk or load kernel modules."],
    ["Why is mounting the Docker socket into a container equivalent to root on the host?", "Whoever can talk to the Docker API can start a new container that is privileged and mounts the host filesystem."],
    ["What does pids.max protect against?", "Fork bombs: it caps the number of processes and threads in the cgroup."],
    ["What is in an OCI image?", "A manifest listing a config blob and an ordered list of layer tarballs. The runtime unpacks the layers and stacks them, typically with overlayfs."],
    ["What is the relationship between Docker, containerd and runc?", "Docker and Kubernetes talk to containerd, which manages images and container lifecycle and calls runc, the low-level OCI runtime that actually sets up namespaces and cgroups and execs the process."],
  ]),
  ...cards("iso-sandboxes", [
    ["How does gVisor isolate a workload?", "A user-space kernel written in Go (the Sentry) intercepts the application's system calls and implements Linux semantics itself, making only a small set of host syscalls. File access goes through a separate Gofer process."],
    ["What do you pay for gVisor's isolation?", "Slower system calls and I/O, and some compatibility gaps. CPU-bound code is barely affected."],
    ["Compare the boundaries: container, gVisor, microVM.", "Container: shared host kernel, large syscall surface. gVisor: user-space kernel in front of a narrow host syscall set. MicroVM: hardware virtualization with a separate guest kernel and a small device model."],
    ["Why can gVisor run where Firecracker cannot?", "gVisor needs no hardware virtualization, so it runs inside ordinary cloud VMs. Firecracker needs /dev/kvm: bare metal or nested virtualization."],
    ["Why must a sandbox block 169.254.169.254?", "It is the cloud instance metadata service. Untrusted code that reaches it can obtain the host's cloud credentials."],
    ["What is the trade-off of V8 isolates as a sandbox?", "Millisecond start and very high density, but only JavaScript and WebAssembly run, and the boundary is the JS engine, where bugs are more common than in hypervisors."],
    ["What are the elements of a threat model?", "The assets to protect, the attackers and their capabilities, the trust boundaries, the ways each boundary could be crossed, and the mitigations with their costs."],
    ["Beyond the isolation boundary, what else must an agent sandbox control?", "Network egress, resource limits, secrets and credentials exposure, storage isolation between tenants, and what the agent's tools are permitted to do."],
  ]),
];
