import { cards, lab, link, note, output, read, url } from "../dsl";
import type { Phase } from "../types";

const FC_DOCS = "https://github.com/firecracker-microvm/firecracker/blob/main/docs";

export const phase: Phase = {
  id: "virtualization",
  label: "Phase 7",
  title: "Virtualization and Firecracker",
  summary:
    "What a virtual machine is at the level of file descriptors and ioctls, then Firecracker by hand: boot, jail, snapshot, restore and lazy memory. Every piece of the migration capstone, one at a time.",
  weeks: { start: 23, end: 25 },
  pillar: "isolation",
  modules: [
    {
      id: "virt-kvm",
      title: "KVM and a first microVM",
      summary: "Week 23. A VM is a process that owns guest memory and loops on KVM_RUN.",
      items: [
        read("virt-kvm-api", "Using the KVM API", {
          week: 23,
          hours: 2,
          source: "LWN (Josh Triplett)",
          links: [link("Using the KVM API", "https://lwn.net/Articles/658511/")],
        }),
        lab("virt-kvm-hello", "KVM hello world", {
          week: 23,
          hours: 8,
          brief:
            "Write the smallest possible VMM: open /dev/kvm, create a VM and one vCPU, map one page of guest memory containing a few instructions, and loop on KVM_RUN handling exits until the guest halts. The LWN article is x86; on your Apple Silicon Lima VM either adapt it to arm64 (KVM_ARM_VCPU_INIT, set PC, MMIO exits) or rent an x86 host with nested virtualization for an afternoon.",
          evidence: [
            url("repo", "Link to your VMM"),
            output("run", "The guest's output and the sequence of VM exits you handled"),
          ],
          links: [link("KVM API documentation", "https://docs.kernel.org/virt/kvm/api.html")],
        }),
        read("virt-firecracker-paper", "Firecracker: lightweight virtualization for serverless", {
          week: 23,
          hours: 3,
          source: "NSDI 2020 paper",
          links: [link("Firecracker (NSDI '20)", "https://www.usenix.org/conference/nsdi20/presentation/agache")],
        }),
        read("virt-firecracker-design", "Firecracker design and getting started", {
          week: 23,
          hours: 2.5,
          source: "Firecracker documentation",
          chapters: "design.md and getting-started.md. Read docs at the git tag matching the binary you install, not main",
          links: [link("Firecracker design", `${FC_DOCS}/design.md`), link("Getting started", `${FC_DOCS}/getting-started.md`)],
        }),
        read("virt-lightvm", "My VM is lighter (and safer) than your container", {
          week: 23,
          hours: 1.5,
          source: "The Morning Paper summary of the SOSP '17 paper",
          links: [
            link(
              "My VM is lighter (and safer) than your container",
              "https://blog.acolyer.org/2017/11/02/my-vm-is-lighter-and-safer-than-your-container/",
            ),
          ],
        }),
        lab("virt-fc-boot", "Boot Firecracker with curl", {
          week: 23,
          hours: 7,
          brief:
            "Download a pinned Firecracker release, a guest kernel and a rootfs for your architecture. Start the firecracker process and configure it only through its API socket with curl: machine-config, boot-source, drives, a network interface on a TAP you created, then InstanceStart. SSH into the guest and reach the internet through your NAT. Measure time from InstanceStart to a listening sshd.",
          evidence: [
            output("script", "Your boot script, start to finish"),
            output("boot", "Guest console boot log and the measured boot time"),
          ],
          links: [link("Rootfs and kernel setup", `${FC_DOCS}/rootfs-and-kernel-setup.md`), link("Network setup", `${FC_DOCS}/network-setup.md`)],
        }),
      ],
    },
    {
      id: "virt-firecracker-ops",
      title: "Jailing, an SDK and snapshots",
      summary: "Week 24. Run it the production way and learn what a snapshot does and does not contain.",
      items: [
        lab("virt-fc-jailer", "Run under the jailer", {
          week: 24,
          hours: 5,
          brief:
            "Start the same VM through the jailer: its own chroot, a dedicated UID, cgroup v2 limits and a per-VM network namespace. Work out which files must be visible inside the chroot. Read /proc/<pid>/status of the firecracker process and list the seccomp mode, capabilities and namespaces.",
          evidence: [
            output("jail", "The jailer command line and the chroot's file tree"),
            output("status", "Seccomp, capability and namespace details of the jailed process"),
          ],
          links: [link("The Firecracker jailer", `${FC_DOCS}/jailer.md`)],
        }),
        lab("virt-fc-sdk", "A TypeScript client for the Firecracker API", {
          week: 24,
          hours: 7,
          brief:
            "Write a small typed TypeScript client that talks HTTP over the Unix socket: configure, start, pause, resume, snapshot. Map API errors to typed errors, add timeouts, and write a test that boots and stops a VM. You will reuse this in the capstone.",
          evidence: [url("repo", "Link to the client"), output("test", "The integration test passing")],
          links: [link("Firecracker API specification", "https://github.com/firecracker-microvm/firecracker/blob/main/src/firecracker/swagger/firecracker.yaml")],
        }),
        read("virt-snapshot-docs", "Firecracker snapshotting", {
          week: 24,
          hours: 2.5,
          source: "Firecracker documentation",
          chapters: "snapshot-support.md (what is saved, compatibility, security) and network-for-clones.md",
          links: [
            link("Snapshot support", `${FC_DOCS}/snapshotting/snapshot-support.md`),
            link("Network connectivity for clones", `${FC_DOCS}/snapshotting/network-for-clones.md`),
          ],
        }),
        lab("virt-fc-snapshot", "Snapshot, kill, restore somewhere else", {
          week: 24,
          hours: 8,
          brief:
            "Run a counter server in the guest. Pause the VM, take a full snapshot, and kill the firecracker process. Start a new process in a different network namespace with the same TAP name and guest IP, load the snapshot and resume. Verify the counter continues, the PID and boot ID are unchanged, and observe what happened to the guest clock and to open TCP connections.",
          evidence: [
            output("continuity", "Counter, PID and boot ID before and after restore"),
            note("observed", "What you saw with the clock and with connections, and why"),
          ],
        }),
        read("virt-snapshot-pitfalls", "Snapshots, uniqueness and seven years of Firecracker", {
          week: 24,
          hours: 2,
          source: "Marc Brooker",
          links: [
            link("Lambda SnapStart and snapshot uniqueness", "https://brooker.co.za/blog/2022/11/29/snapstart.html"),
            link("Seven years of Firecracker", "https://brooker.co.za/blog/2025/09/18/firecracker.html"),
          ],
        }),
      ],
    },
    {
      id: "virt-state",
      title: "Disks, lazy memory and migration theory",
      summary: "Week 25. The state that has to move, and the ways to move it.",
      items: [
        lab("virt-cow-rootfs", "Copy-on-write root filesystems", {
          week: 25,
          hours: 5,
          brief:
            "Start ten VMs from one base rootfs without copying it ten times. Try two approaches: reflink copies on XFS or btrfs, and a read-only base drive with a per-VM writable overlay inside the guest. Measure provisioning time and disk used, and confirm writes in one VM never appear in another.",
          evidence: [output("space", "Time and disk usage for ten VMs with each approach vs full copies")],
        }),
        read("virt-uffd-docs", "Page faults on snapshot resume", {
          week: 25,
          hours: 2.5,
          source: "Firecracker documentation; CodeSandbox engineering",
          chapters: "handling-page-faults-on-snapshot-resume.md; how CodeSandbox clones a running VM",
          links: [
            link("Handling page faults on snapshot resume", `${FC_DOCS}/snapshotting/handling-page-faults-on-snapshot-resume.md`),
            link("How we clone a running VM in 2 seconds", "https://codesandbox.io/blog/how-we-clone-a-running-vm-in-2-seconds"),
          ],
        }),
        lab("virt-uffd-handler", "Restore with a userfaultfd page handler", {
          week: 25,
          hours: 7,
          brief:
            "Build Firecracker's example UFFD handler and restore your snapshot with the Uffd memory backend so pages load on first touch. Log each fault. Compare time-to-resume and total pages loaded against a normal file-backed restore. Then kill the handler mid-run and observe the guest.",
          evidence: [
            output("faults", "Fault log summary: pages loaded on demand vs total guest pages"),
            note("failure", "What happened to the guest when the handler died, and what that implies for post-copy migration"),
          ],
        }),
        read("virt-migration-theory", "Live migration: pre-copy and post-copy", {
          week: 25,
          hours: 3,
          source: "QEMU and Cloud Hypervisor documentation",
          chapters: "QEMU migration framework overview and postcopy; Cloud Hypervisor live migration",
          links: [
            link("QEMU migration framework", "https://www.qemu.org/docs/master/devel/migration/main.html"),
            link("Cloud Hypervisor live migration", "https://github.com/cloud-hypervisor/cloud-hypervisor/blob/main/docs/live_migration.md"),
          ],
        }),
        read("virt-production-writeups", "How production platforms pause and move VMs", {
          week: 25,
          hours: 4.5,
          source: "DigitalOcean engineering; E2B infrastructure repository",
          chapters: "DigitalOcean's microVM architecture post; skim E2B's orchestrator for snapshot, UFFD and rootfs handling",
          links: [
            link("Building a computer that can pause and resume", "https://www.digitalocean.com/blog/microvm-architecture"),
            link("E2B infrastructure", "https://github.com/e2b-dev/infra"),
          ],
        }),
        lab("virt-writeup", "Write-up: what is inside a VM snapshot", {
          week: 25,
          hours: 3,
          brief:
            "Explain what Firecracker saves (memory, vCPU and device state), what it leaves to you (disk, TAP, connections, clock, entropy), and why a snapshot must be resumed at most once.",
          evidence: [url("post", "Link to the published write-up")],
        }),
      ],
    },
  ],
};

export const quiz = [
  ...cards("virt-kvm", [
    ["What are the roles of KVM and the VMM (Firecracker, QEMU)?", "KVM is the kernel module that uses the CPU's virtualization extensions to run guest code. The VMM is the user-space process that owns guest memory, creates vCPUs and emulates devices."],
    ["What is a VM exit?", "The guest did something the CPU cannot handle in guest mode (I/O, MMIO, halt). Control returns to KVM and often to the VMM, which emulates it and re-enters the guest with KVM_RUN."],
    ["At the OS level, what is a vCPU and what is guest memory?", "A vCPU is a host thread calling the KVM_RUN ioctl. Guest physical memory is a region of the VMM's virtual memory registered with KVM."],
    ["Why is Firecracker's device model deliberately tiny?", "Fewer emulated devices means less code reachable from a hostile guest and faster boot. It has virtio net, block and vsock, a serial console, and little else."],
    ["How does a Firecracker guest get a network card and a disk?", "virtio-net backed by a host TAP device and virtio-block backed by a host file."],
    ["Where can Firecracker run?", "Linux hosts with /dev/kvm: bare metal, or cloud VMs with nested virtualization enabled."],
    ["What does virtio buy over emulating real hardware?", "A simple paravirtual interface (shared-memory queues) designed for VMs: far less emulation code and far fewer exits per I/O."],
  ]),
  ...cards("virt-firecracker-ops", [
    ["What does the Firecracker jailer do before exec'ing Firecracker?", "Creates a chroot and cgroup, optionally joins a network and PID namespace, creates the device nodes, drops to an unprivileged UID and GID, then execs. Firecracker then applies its own seccomp filters."],
    ["What does a full Firecracker snapshot contain?", "A memory file with guest RAM and a state file with vCPU and emulated device state."],
    ["What does a Firecracker snapshot not contain?", "Disk contents, the host TAP device, live network connections on the host side, and metrics or logger configuration."],
    ["What are the compatibility requirements for restoring a snapshot on another host?", "Same Firecracker version, compatible host kernel, and the same CPU model or a CPU template that normalizes features. The drive paths and TAP name must exist as in the snapshot."],
    ["Why must each snapshot be resumed at most once?", "Two resumed copies share random number generator state, unique IDs, TLS session state and the disk image. That breaks security assumptions and corrupts data."],
    ["What happens to the guest's wall clock after restore?", "It continues from the moment of the snapshot, so it is behind. The guest must resynchronize, or the VMM advances the clock on load where supported."],
    ["What is VMGenID for?", "A generation ID the VMM changes on restore so the guest kernel can detect it was cloned and reseed its random number generator."],
    ["Why do client TCP connections into the VM not survive a move to another host?", "The connection's packets were routed to the old host and its state lived in that host's NAT and the path to it. On the new host there is no matching flow, so a stable proxy must reconnect."],
  ]),
  ...cards("virt-state", [
    ["What is userfaultfd and how does Firecracker use it on restore?", "A kernel mechanism that delivers page faults for a memory region to a user-space handler. Firecracker maps guest memory with it so a handler supplies each page on first touch instead of loading all RAM up front."],
    ["Pre-copy versus post-copy migration?", "Pre-copy: copy memory while the VM runs, re-copy dirtied pages in rounds, then a short final pause. Post-copy: move the VM immediately and fetch pages from the source on demand."],
    ["What is the failure risk specific to post-copy?", "After the switch, state is split between two hosts. If the source or the network fails before all pages are fetched, the VM is lost."],
    ["What is a diff snapshot?", "A snapshot containing only pages dirtied since the previous one. It must be merged onto its base before it can be resumed."],
    ["Why must the VM be paused before its disk image is copied?", "A running guest keeps writing, including from its own page cache, so a copy taken meanwhile is internally inconsistent and does not match the memory snapshot."],
    ["How do platforms avoid copying a full root filesystem per VM?", "Copy-on-write: a shared read-only base with a per-VM writable layer, via reflinks, device-mapper thin snapshots, overlayfs in the guest, or network block devices."],
    ["What is source fencing in a migration?", "Guaranteeing the old copy can never run again once the new one is live: kill its process, remove its network path and files, and reject stale commands with an epoch or lease."],
  ]),
];
