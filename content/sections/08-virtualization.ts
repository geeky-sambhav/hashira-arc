import { build, concept, link, section, topic } from "../dsl";

const FC_DOCS = "https://github.com/firecracker-microvm/firecracker/blob/main/docs";

const KVM_LWN = link("Using the KVM API (LWN)", "https://lwn.net/Articles/658511/");
const KVM_API = link("KVM API documentation", "https://docs.kernel.org/virt/kvm/api.html");
const FC_PAPER = link("Firecracker (NSDI '20)", "https://www.usenix.org/conference/nsdi20/presentation/agache");
const FC_DESIGN = link("Firecracker design", `${FC_DOCS}/design.md`);
const FC_START = link("Firecracker: getting started", `${FC_DOCS}/getting-started.md`);
const FC_ROOTFS = link("Rootfs and kernel setup", `${FC_DOCS}/rootfs-and-kernel-setup.md`);
const FC_NETWORK = link("Network setup", `${FC_DOCS}/network-setup.md`);
const FC_JAILER = link("The Firecracker jailer", `${FC_DOCS}/jailer.md`);
const FC_API = link(
  "Firecracker API specification",
  "https://github.com/firecracker-microvm/firecracker/blob/main/src/firecracker/swagger/firecracker.yaml",
);
const FC_SNAPSHOT = link("Snapshot support", `${FC_DOCS}/snapshotting/snapshot-support.md`);
const FC_CLONES = link("Network connectivity for clones", `${FC_DOCS}/snapshotting/network-for-clones.md`);
const FC_UFFD = link(
  "Handling page faults on snapshot resume",
  `${FC_DOCS}/snapshotting/handling-page-faults-on-snapshot-resume.md`,
);
const SNAPSTART = link(
  "Lambda SnapStart and snapshot uniqueness",
  "https://brooker.co.za/blog/2022/11/29/snapstart.html",
);
const SEVEN_YEARS = link("Seven years of Firecracker", "https://brooker.co.za/blog/2025/09/18/firecracker.html");
const CODESANDBOX = link(
  "How we clone a running VM in 2 seconds",
  "https://codesandbox.io/blog/how-we-clone-a-running-vm-in-2-seconds",
);

export default section(
  "virtualization",
  {
    title: "Virtualization and Firecracker",
    summary:
      "What a virtual machine is, from CPU modes down to file descriptors and ioctls, then Firecracker by hand: boot, jail, snapshot, restore and lazy memory, and the theory of moving a running VM. Every piece of the migration capstone, one at a time.",
  },
  [
    topic(
      "hardware",
      "Hardware virtualization",
      [
        topic("vm", "What a virtual machine is", [
          concept(
            "problem",
            "The problem: untrusted code on shared hardware",
            "A cloud host runs code from many customers on one machine. Each needs what looks like a computer of their own, and none may read or disturb the others or the host, even when running hostile code as root.",
          ),
          concept(
            "machine-illusion",
            "A VM is a computer made of software",
            "A virtual machine presents virtual CPUs, 'physical' memory and devices that behave like real hardware, so an operating system kernel boots on it unmodified. The guest kernel believes it owns a machine; every resource it sees is granted and policed from outside.",
          ),
          concept(
            "terms",
            "Host, guest, hypervisor and VMM",
            "The host is the real machine and its OS; the guest is the OS inside the VM. The hypervisor is the privileged layer that runs guest code on the CPU, and the virtual machine monitor (VMM) is the program that builds and services one VM. The two words are often used interchangeably; on Linux, KVM is the hypervisor part and Firecracker or QEMU is the VMM.",
          ),
          concept(
            "vs-container",
            "Why a VM is a stronger boundary than a container",
            "A container is a group of host processes that share the host kernel, so every one of the kernel's hundreds of system calls is attack surface and one kernel bug breaks the isolation. A VM's programs talk to their own guest kernel; the host is reached only through the much narrower hardware-shaped interface of VM exits and a few virtual devices.",
          ),
          concept(
            "price",
            "What the stronger boundary costs",
            "Each VM carries its own kernel and its own page cache, takes longer to start than a process, and holds memory the host cannot see into or share easily. MicroVMs exist to shrink these costs while keeping the boundary.",
          ),
        ]),
        topic("cpu", "Virtualizing the CPU", [
          concept(
            "emulate-vs-run",
            "Emulation versus direct execution",
            "An emulator interprets or translates every guest instruction in software, which works across CPU architectures but is slow. Virtualization runs guest instructions directly on the real CPU at full speed and steps in only for the few operations that must not touch real machine state.",
          ),
          concept(
            "trap-emulate",
            "Privileged instructions and trap-and-emulate",
            "A CPU's kernel mode may change page tables, mask interrupts and talk to devices; user mode may not. A guest kernel expects kernel mode, but the real one would hand it the machine. So the guest kernel runs with reduced privilege: a privileged instruction traps to the hypervisor, which applies the effect to that VM's virtual state and resumes the guest.",
          ),
          concept(
            "x86-gap",
            "Why classic x86 could not be trapped cleanly",
            "Trap-and-emulate needs every sensitive instruction to trap when run without privilege (the Popek and Goldberg condition). Older x86 had instructions, POPF among them, that silently behaved differently in user mode instead of trapping. Early hypervisors worked around it by rewriting guest kernel code on the fly (VMware's binary translation) or by modifying the guest kernel (Xen's paravirtualization).",
          ),
          concept(
            "extensions",
            "VT-x and AMD-V: guest mode and host mode",
            "Intel VT-x and AMD-V add a second axis of privilege. The hypervisor runs in host mode (VMX root on Intel) and the guest in guest mode (non-root), where it has its own kernel and user rings and runs unmodified. Operations the hypervisor has chosen to intercept leave guest mode instead of executing.",
          ),
          concept(
            "entry-exit",
            "VM entry, VM exit and the control structure",
            "Each vCPU has a hardware-defined structure (VMCS on Intel, VMCB on AMD) holding the guest's saved state, the host state to return to, and bits choosing which guest actions are intercepted. VM entry loads the guest state and runs guest code natively; a VM exit saves it, restores the host state and records why it stopped. A vCPU's life is a loop of entry, run, exit, handle.",
          ),
          concept(
            "exit-causes",
            "What causes a VM exit",
            "Port I/O, access to guest-physical memory that has no mapping (which includes memory-mapped device registers), HLT when the guest is idle, a host interrupt arriving, and intercepted instructions such as CPUID, some control-register and model-specific-register accesses, and explicit hypercalls.",
          ),
          concept(
            "exit-cost",
            "Why exits are expensive",
            "An exit and re-entry saves and loads a large amount of CPU state and costs far more than a system call. If the exit must be handled by the user-space VMM, a return from the kernel and another ioctl are added on top. Fast virtual I/O is mostly the art of causing fewer exits.",
          ),
          concept(
            "arm",
            "The same idea on arm64",
            "Arm uses exception levels: applications run at EL0, a kernel at EL1 and a hypervisor at EL2. A guest kernel runs at EL1 and intercepted operations trap to EL2, which plays the role of a VM exit. There is no port I/O on Arm, so every device access is memory-mapped, and register setup differs from x86.",
          ),
        ]),
        topic("memory", "Virtualizing memory", [
          concept(
            "address-spaces",
            "Three kinds of address",
            "Guest virtual addresses are what guest programs use, guest physical addresses are what the guest kernel believes is RAM, and host physical addresses are real RAM. The guest's own page tables map the first to the second. The hypervisor must map the second to the third without the guest being able to see or change that mapping.",
          ),
          concept(
            "shadow",
            "Shadow page tables: the software way",
            "Before hardware support, the hypervisor kept a hidden page table for each guest address space that mapped guest virtual straight to host physical, and trapped every guest page-table edit to keep it in sync. It worked, but workloads that change mappings often exited constantly.",
          ),
          concept(
            "slat",
            "Second-level address translation (EPT and NPT)",
            "Intel EPT and AMD NPT let the CPU itself walk two sets of page tables: the guest's own (guest virtual to guest physical) and one owned by the hypervisor (guest physical to host physical). The guest edits its page tables freely with no exit. Arm calls the same thing stage-2 translation.",
          ),
          concept(
            "walk-cost",
            "The price of a two-dimensional page walk",
            "On a TLB miss, each step of the guest's page-table walk yields a guest physical address that itself needs a walk of the second-level tables. With four levels on both sides one miss can cost up to 24 memory references instead of 4, which is why huge pages and TLB reach matter more inside a VM.",
          ),
          concept(
            "second-level-fault",
            "Second-level faults",
            "When the guest touches a guest-physical address with no second-level mapping, or without permission, the CPU exits to the hypervisor (an EPT violation on Intel). This one mechanism allocates guest memory lazily, traps accesses to device registers, write-protects pages to record what the guest dirtied, and loads pages on demand.",
          ),
          concept(
            "overcommit",
            "Guest RAM is lazily allocated host memory",
            "Guest 'physical' memory is ordinary host virtual memory, so the host allocates a real page only when the guest first touches it, and a host can promise more guest RAM than it has. A guest never hands freed pages back on its own; a balloon device is the paravirtual way to ask for them.",
          ),
        ]),
        topic("kinds", "Kinds of hypervisor", [
          concept(
            "type-1-2",
            "Type 1, type 2 and where KVM fits",
            "A type 1 hypervisor runs directly on the hardware (Xen, VMware ESXi, Hyper-V); a type 2 runs as an application on a general-purpose OS (VirtualBox, VMware Workstation). KVM blurs the line: the Linux kernel itself runs in the CPU's host mode like a type 1, while each VM is an ordinary Linux process. What matters is which code is privileged and which code the guest can reach.",
          ),
          concept(
            "nested",
            "Nested virtualization",
            "A hypervisor running inside a VM. The CPU extensions are one level deep, so the outer hypervisor emulates them for the inner one: an exit from the innermost guest goes first to the outer hypervisor, which hands it to the inner hypervisor. It works, and exits cost noticeably more.",
          ),
        ]),
        topic("observe", "Seeing it on a real machine", [
          concept(
            "support",
            "Where a KVM-based VMM can run, and how to check",
            "Firecracker, like any KVM-based VMM, runs on Linux hosts with /dev/kvm: bare metal, or cloud VMs with nested virtualization enabled. On x86 the vmx (Intel) or svm (AMD) flag in /proc/cpuinfo shows the CPU offers the extensions. On any architecture you can check that /dev/kvm exists and that your user may open it for reading and writing, usually through the kvm group.",
          ),
        ]),
      ],
      {
        detail: "What the CPU and the hypervisor each do so that a guest kernel can run at full speed without owning the machine.",
      },
    ),

    topic(
      "kvm",
      "The KVM API",
      [
        topic("model", "What KVM is", [
          concept(
            "module",
            "KVM turns Linux into a hypervisor",
            "KVM is the Linux kernel subsystem (built in or loaded as modules) that drives the CPU's virtualization extensions and exposes them to user space. It reuses the rest of Linux for everything else: the scheduler runs vCPUs, the memory manager backs guest RAM, and ordinary drivers reach the real hardware.",
          ),
          concept(
            "split",
            "The split between KVM and the VMM",
            "KVM is the kernel part that uses the CPU's virtualization extensions to run guest code and maintains the second-level page tables. The VMM (Firecracker, QEMU) is the user-space process that owns guest memory, creates vCPUs, loads the kernel and emulates devices. Mechanism lives in the kernel and policy in user space, which is why very different VMMs share one KVM.",
          ),
          concept(
            "os-view",
            "A vCPU is a thread and guest RAM is a mapping",
            "At the OS level a vCPU is a host thread calling the KVM_RUN ioctl, and guest physical memory is a region of the VMM's virtual memory registered with KVM. A VM is therefore a process: the host schedules it, limits it with cgroups, shows it in ps and top, and ends it with kill.",
          ),
        ]),
        topic("fds", "The file descriptor hierarchy", [
          concept(
            "system-fd",
            "/dev/kvm and an API made of ioctls",
            "KVM has no system calls of its own: you open /dev/kvm and issue ioctls on file descriptors, with one kind of fd per kind of object. On the /dev/kvm fd you check KVM_GET_API_VERSION (it must return 12), ask about optional features with KVM_CHECK_EXTENSION instead of assuming them, and call KVM_CREATE_VM.",
          ),
          concept(
            "vm-fd",
            "The VM fd",
            "KVM_CREATE_VM returns an fd for one empty virtual machine with no memory and no CPUs. VM-wide ioctls go here: registering guest memory, creating vCPUs and creating the in-kernel interrupt controller. Closing the last reference destroys the VM.",
          ),
          concept(
            "vcpu-fd",
            "vCPU fds",
            "KVM_CREATE_VCPU on the VM fd returns one fd per virtual CPU. On it you get and set registers and call KVM_RUN. A vCPU is meant to be driven by one thread, which is why a VMM starts one thread per vCPU.",
          ),
          concept(
            "kvm-run-struct",
            "The shared kvm_run structure",
            "You mmap each vCPU fd (the size comes from KVM_GET_VCPU_MMAP_SIZE on the /dev/kvm fd) to get a struct kvm_run shared with the kernel. When KVM_RUN returns, KVM has written the exit reason and its details there; the VMM writes its answer into the same structure before running again.",
          ),
        ]),
        topic("guest-mem", "Guest memory", [
          concept(
            "slots",
            "Memory slots",
            "The VMM allocates memory with mmap (anonymous for a fresh boot, a private mapping of a snapshot file for a restore) and registers it with KVM_SET_USER_MEMORY_REGION, giving a slot number, the guest physical address, the size and its own virtual address. KVM fills the second-level page tables from it on demand. Because it is the VMM's own memory, the VMM reads and writes guest RAM through plain pointers, which is how it loads a kernel and services device queues.",
          ),
          concept(
            "holes",
            "Holes in the guest address space",
            "Guest physical addresses not covered by any slot have no RAM behind them. A guest access there exits to the VMM as memory-mapped I/O, which is how a VMM places device registers at addresses of its choosing.",
          ),
          concept(
            "dirty-log",
            "Dirty page logging",
            "A slot can be registered with the KVM_MEM_LOG_DIRTY_PAGES flag, asking KVM to record which guest pages are written; KVM_GET_DIRTY_LOG then returns a bitmap of the pages dirtied since the last call. KVM normally does this by write-protecting pages in the second-level tables, so the first write to each page costs a fault; Intel CPUs with page-modification logging record the writes in hardware instead. Either way logging slows a guest that writes a lot. Diff snapshots and pre-copy migration are built on it.",
          ),
        ]),
        topic("vcpu", "Setting up a vCPU", [
          concept(
            "regs-x86",
            "Initial register state on x86",
            "A new x86 vCPU starts in 16-bit real mode. The VMM sets the instruction pointer, flags and segment registers with KVM_SET_REGS and KVM_SET_SREGS. To jump straight into 64-bit code it must also build page tables and set the control registers that enable long mode, work that firmware and a boot loader normally do.",
          ),
          concept(
            "cpuid",
            "What the guest's CPUID reports",
            "On x86 a guest learns its CPU's features by executing CPUID, which KVM intercepts. The VMM asks which features KVM can virtualize on this host with KVM_GET_SUPPORTED_CPUID on the /dev/kvm fd, then gives each vCPU the table it should report with KVM_SET_CPUID2 before running it. The VMM, not the hardware, decides what CPU the guest believes it has.",
          ),
          concept(
            "regs-arm",
            "Initial state on arm64",
            "On arm64 the VMM calls KVM_ARM_VCPU_INIT with a target obtained from KVM_ARM_PREFERRED_TARGET, then sets the program counter and other registers one at a time with KVM_SET_ONE_REG.",
          ),
        ]),
        topic("irq-time", "Interrupts and time", [
          concept(
            "irqchip",
            "The in-kernel interrupt controller",
            "A guest expects an interrupt controller and timers, and emulating them in the VMM would cost a trip to user space for every interrupt and timer tick. On x86, KVM_CREATE_IRQCHIP on the VM fd creates in-kernel models of the PIC, the IOAPIC and a local APIC per vCPU, and KVM_CREATE_PIT2 adds the legacy timer. On arm64 the VMM creates a virtual GIC with KVM_CREATE_DEVICE. KVM then delivers interrupts and timer ticks to vCPUs without returning to the VMM.",
          ),
          concept(
            "guest-time",
            "How a guest keeps time",
            "A guest tells time by reading a counter: on x86 the TSC or kvm-clock (a paravirtual clock whose scaling parameters KVM publishes in memory shared with the guest), on arm64 the architected counter. It sets its wall clock once at boot and advances it from that counter. The counter's value is part of the vCPU state a snapshot saves, so a guest restored later carries on from the old time until something corrects it.",
          ),
        ]),
        topic("run-loop", "The run loop", [
          concept(
            "kvm-run",
            "KVM_RUN",
            "The ioctl enters the guest and blocks the calling thread while guest code runs. It returns when something happens that user space must handle, or with EINTR when a signal arrives. Sending a signal to a vCPU thread is how another thread kicks it out of the guest, for example to pause the VM.",
          ),
          concept(
            "exit-path",
            "A VM exit, end to end",
            "The guest did something the CPU cannot handle in guest mode (I/O, MMIO, halt), so control returns to KVM. KVM resolves most exits itself (faults on registered memory, timers, interrupt-controller work) and re-enters at once. Otherwise KVM_RUN returns to the VMM, which emulates the operation and re-enters the guest by calling KVM_RUN again.",
          ),
          concept("exit-reasons", "Handling exit reasons", undefined, {
            parts: [
              concept(
                "io",
                "KVM_EXIT_IO",
                "x86 port I/O. kvm_run gives the direction, port number, access size and an offset to the data inside the shared structure. A minimal VMM treats writes to one port as its console.",
              ),
              concept(
                "mmio",
                "KVM_EXIT_MMIO",
                "A read or write of a guest physical address with no RAM behind it. kvm_run gives the address, length, direction and data. For a read the VMM fills in the data, and the access completes when it next calls KVM_RUN.",
              ),
              concept(
                "hlt",
                "KVM_EXIT_HLT",
                "An x86 guest executed HLT. In a VMM with no in-kernel interrupt controller this returns to user space, and a one-shot guest uses it to say it is done. With an in-kernel interrupt controller KVM instead puts the vCPU thread to sleep until an interrupt arrives. Arm has no HLT exit; an arm64 guest powers off with a PSCI call, reported as KVM_EXIT_SYSTEM_EVENT.",
              ),
              concept(
                "errors",
                "Shutdown, failed entry and internal error",
                "KVM_EXIT_SHUTDOWN means the guest faulted so badly that it would reset (a triple fault on x86), KVM_EXIT_FAIL_ENTRY means the CPU rejected the guest state you set up, and KVM_EXIT_INTERNAL_ERROR means KVM could not continue. In a hand-written VMM the usual cause is wrong initial registers.",
              ),
            ],
          }),
          concept(
            "eventfds",
            "Interrupts in, notifications out: irqfd and ioeventfd",
            "With the interrupt controller emulated in the kernel, the VMM raises a guest interrupt by writing to an eventfd bound to an interrupt line (KVM_IRQFD). In the other direction it can ask KVM to signal an eventfd whenever the guest writes to a given I/O address (KVM_IOEVENTFD): the exit finishes inside the kernel and a device thread wakes up to do the work.",
          ),
        ]),
        topic("observe", "Seeing a VM from the host", [
          concept(
            "threads",
            "A VM as a process with threads",
            "You can find a running VMM with ps, list its threads with `ps -L` or `top -H` and pick out the vCPU threads by their CPU use, and see the guest RAM that has been touched as resident memory of that one process.",
          ),
          concept(
            "trace-exits",
            "Counting exits",
            "KVM has kernel tracepoints such as kvm:kvm_exit and kvm:kvm_entry. You can record them with perf to count exits by reason and connect them to what the guest was doing.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "kvm-hello",
            "KVM hello world",
            "Write the smallest possible VMM: open /dev/kvm, create a VM and one vCPU, map one page of guest memory containing a few instructions, and loop on KVM_RUN handling exits until the guest halts. The LWN article is x86; on an Apple Silicon Lima VM either adapt it to arm64 (KVM_ARM_VCPU_INIT, set PC, MMIO exits) or rent an x86 host with nested virtualization for an afternoon.",
            {
              doneWhen: ["A repo with your VMM", "The guest's output and the sequence of VM exits you handled"],
              links: [KVM_API, KVM_LWN],
            },
          ),
        ]),
      ],
      {
        detail: "A VM is a process that owns guest memory and loops on KVM_RUN.",
        links: [KVM_LWN, KVM_API],
      },
    ),

    topic(
      "devices",
      "Devices and virtio",
      [
        topic("models", "Three ways to give a guest a device", [
          concept(
            "driver-basics",
            "How a driver talks to a device",
            "A driver reads and writes device registers, which live at I/O ports (x86 only) or at memory-mapped addresses, hands the device buffers in RAM, and learns about completion from an interrupt. A virtual device has to imitate exactly these three things: registers, access to guest memory, and interrupts.",
          ),
          concept(
            "full-emulation",
            "Full emulation",
            "The VMM imitates a real hardware device register by register, so the guest's stock driver works unchanged. Real hardware interfaces were not designed for this: one packet can take many register accesses, each a VM exit, and the emulation code is large and intricate.",
          ),
          concept(
            "paravirt",
            "Paravirtualization",
            "The guest knows it is in a VM and uses a driver written for an interface that is cheap to virtualize: requests are batched in shared memory and the hypervisor is notified rarely. It needs special guest drivers, which mainline Linux includes.",
          ),
          concept(
            "passthrough",
            "Device passthrough",
            "A real device is handed to one guest, with an IOMMU confining the device's memory access to that guest's RAM. Performance is near native, but the VM is tied to hardware on one host and has state the VMM cannot see, which makes snapshots, migration and dense packing hard.",
          ),
        ]),
        topic("virtio", "Virtio", [
          concept(
            "standard",
            "What virtio is and what it buys",
            "A standard family of paravirtual devices (network, block, console, socket, entropy, balloon) with a simple interface of shared-memory queues designed for VMs. Compared with emulating real hardware it needs far less emulation code and far fewer exits per I/O, and the same guest drivers work on any hypervisor that implements it.",
          ),
          concept(
            "front-back",
            "Front end and back end",
            "The front end is the virtio driver in the guest kernel, which turns block or network requests into buffers on a queue. The back end is the device implementation on the host side, usually inside the VMM, which takes those buffers and does the real I/O against a file, a TAP device or a socket.",
          ),
          concept("virtqueue", "The virtqueue", undefined, {
            parts: [
              concept(
                "shared-memory",
                "Queues live in guest memory",
                "The guest driver allocates the queue structures and the data buffers in its own RAM and tells the device their guest physical addresses. Guest RAM is mapped into the VMM, so the back end reads and writes them directly; no data travels through exits.",
              ),
              concept(
                "descriptors",
                "The descriptor table",
                "An array of descriptors, each naming one buffer by guest physical address and length, with a flag saying whether the device may write to it and an optional link to the next descriptor. One request is a chain of descriptors, for example a header, a data buffer and a status byte.",
              ),
              concept(
                "rings",
                "The available ring and the used ring",
                "The driver publishes a request by writing the index of its first descriptor into the available ring. When the device has finished, it writes that index, and how many bytes it wrote into the buffers, into the used ring. Each ring has exactly one writer, so the two sides need no shared lock. This is the classic 'split' layout.",
              ),
              concept(
                "untrusted",
                "Every field is untrusted input",
                "Addresses, lengths and chain links are written by the guest. The back end must check that every buffer lies inside guest memory, that chains terminate, and that lengths are sane. A missed check here is a guest-to-host escape.",
              ),
            ],
          }),
          concept(
            "notify",
            "Notifications in both directions",
            "The driver 'kicks' the device by writing to a notify register, which causes a VM exit (often turned into an eventfd wakeup). The device signals completion with an interrupt. Either side can suppress notifications while it is already draining the queue, so under load many requests share one exit and one interrupt.",
          ),
          concept(
            "negotiation",
            "Feature negotiation, status and config space",
            "The device offers feature bits, the driver accepts the ones it understands, and the driver steps a status register through acknowledge, driver, features-ok and driver-ok before the device may touch the queues. A small device-specific config area holds things like a network card's MAC address or a disk's capacity.",
          ),
        ]),
        topic("transports", "Transports: MMIO and PCI", [
          concept(
            "mmio",
            "The MMIO transport",
            "A transport is how the guest finds a virtio device and reaches its registers and interrupt; the queues on top are the same. With MMIO each device is a small block of memory-mapped registers at a fixed address plus one interrupt line. It needs very little emulation code but cannot be probed for: the VMM must tell the guest where each device is, through the kernel command line, ACPI tables or a device tree. Firecracker uses MMIO unless it is started with PCI enabled.",
          ),
          concept(
            "pci",
            "The PCI transport",
            "The device appears on a virtual PCI bus, so the guest finds it by standard enumeration and gets hotplug and several interrupt vectors per device (MSI-X). The cost is emulating a PCI bus and its configuration space, which is more code exposed to the guest. General-purpose VMMs such as QEMU normally use it. Firecracker added it as an option in version 1.13 (the --enable-pci flag), and its docs recommend it for higher throughput and lower latency.",
          ),
        ]),
        topic("net", "virtio-net over a TAP device", [
          concept(
            "tap-side",
            "The host side is a TAP device",
            "A Firecracker guest's network card is virtio-net backed by a host TAP device: a virtual Ethernet interface whose other end is a file descriptor held by the VMM (see Networking). A frame the VMM writes to the fd appears to the host kernel as received on that interface, and a frame the host sends to the interface becomes readable on the fd.",
          ),
          concept(
            "tx",
            "Transmit path",
            "The guest driver places a frame on the transmit queue and kicks. The VMM reads the frame out of guest memory, writes it to the TAP fd and marks the buffer used. From there the host's bridge, routing and NAT rules treat it like a frame from any other interface.",
          ),
          concept(
            "rx",
            "Receive path",
            "The guest keeps the receive queue stocked with empty buffers. When the TAP fd becomes readable the VMM copies the frame into the next buffer, marks it used and raises an interrupt. If the guest has posted no buffers, frames have to wait or be dropped.",
          ),
          concept(
            "vhost",
            "vhost: moving the data path out of the VMM",
            "The back end's data path can run in the host kernel (vhost-net) or in a separate process (vhost-user), which then works on the guest's queues directly. It saves a hop through the VMM, at the price of more privileged or more widely spread code handling guest-controlled data.",
          ),
        ]),
        topic("block", "virtio-block", [
          concept(
            "request",
            "The block request",
            "A request is a descriptor chain: a header with the operation (such as read, write or flush) and a starting sector counted in 512-byte units, the data buffers, and one status byte that the device fills in.",
          ),
          concept(
            "backing-file",
            "A guest disk is a host file",
            "A Firecracker guest's disk is virtio-block backed by a host file or block device: the VMM turns each request into a read or write at the matching offset. So you can create a disk image with ordinary filesystem tools, copy it, and loop-mount it on the host while no VM is using it.",
          ),
          concept(
            "flush",
            "Caching and flush",
            "Guest writes land in the host page cache unless the VMM uses direct I/O, so they are not durable until the host syncs them. Whether a guest flush reaches the disk is a VMM setting. In Firecracker's default cache mode (Unsafe) the device does not offer the virtio flush feature, so the guest's flushes never reach the host; in Writeback mode it does, and each guest flush becomes an fsync of the backing file.",
          ),
        ]),
        topic("surface", "A minimal device model", [
          concept(
            "others",
            "Vsock, the serial console and the rest",
            "Besides net and block, Firecracker offers virtio-vsock (a host-guest socket channel that needs no network setup, exposed on the host as a Unix socket), a serial port for the guest console and, on x86, a minimal i8042 keyboard controller that exists so the guest can signal a reset. Optional devices include a memory balloon and an entropy source (virtio-rng), and newer releases add persistent memory (virtio-pmem) and memory hotplug (virtio-mem).",
          ),
          concept(
            "guest-input",
            "Device emulation parses hostile input",
            "Once hardware virtualizes the CPU and memory, the host code a malicious guest can actually reach is KVM's exit handling and the VMM's device emulation. Bugs in emulated devices, such as the VENOM flaw in QEMU's virtual floppy controller, are a classic route for guest-to-host escapes.",
          ),
          concept(
            "minimal",
            "Why Firecracker's device model is deliberately tiny",
            "Fewer emulated devices means less code reachable from a hostile guest and faster boot. A typical microVM has virtio net, block and vsock, a serial console, and little else.",
            { links: [FC_PAPER] },
          ),
        ]),
        topic("observe", "Seeing devices from inside the guest", [
          concept(
            "guest-view",
            "Virtio as the guest sees it",
            "In a Linux guest, /sys/bus/virtio/devices lists each virtio device, dmesg shows them being probed, the disk appears as /dev/vda and the NIC typically as eth0, and /proc/interrupts counts the interrupts each device has raised.",
          ),
        ]),
      ],
      {
        detail: "How a guest gets a disk and a network card without the host emulating a real PC.",
      },
    ),

    topic(
      "firecracker",
      "Firecracker",
      [
        topic(
          "design",
          "Design goals",
          [
            concept(
              "problem",
              "The problem: serverless at VM-grade isolation",
              "A function platform runs huge numbers of small, short-lived, mutually untrusted workloads. Containers were dense and fast but shared the host kernel; traditional VMs isolated well but were heavy and slow to start. Firecracker was built at AWS, for Lambda and Fargate, to get a VM's isolation at close to a container's overhead.",
            ),
            concept(
              "choices",
              "The design choices",
              "Keep KVM and Linux for everything they already do well (CPU virtualization, scheduling, memory, networking, block I/O), replace QEMU with a small VMM written in Rust, give each microVM its own process, and offer only the handful of devices a modern Linux server guest needs.",
            ),
            concept(
              "left-out",
              "What Firecracker leaves out",
              "The design has no BIOS or UEFI and no boot loader, almost no legacy PC hardware (a serial port and a reset controller), no PCI bus unless you ask for one, no USB, graphics or sound, and no built-in live migration. The guest is a Linux kernel booted directly. Each omission removes code a guest could attack and time from boot.",
            ),
            concept(
              "targets",
              "The numbers it aims for",
              "The published figures are at most 125 ms from the InstanceStart call to the guest's init process (measured with a minimal kernel and root filesystem), at most 5 MiB of VMM memory overhead for a small microVM, and creation rates of up to 150 microVMs per second per host (the design document states it as 5 per host core per second). These are what make thousands of VMs per host and one sandbox per request practical.",
            ),
          ],
          { links: [FC_PAPER, FC_DESIGN, SEVEN_YEARS] },
        ),
        topic(
          "process",
          "Process model",
          [
            concept(
              "one-process",
              "One VMM process per microVM",
              "Each Firecracker process holds exactly one microVM. The host manages VMs with process tools: a PID to signal, a cgroup to limit, a UID to confine, an exit status to collect. Killing the process is the definitive way to stop the VM.",
            ),
            concept(
              "threads",
              "API, VMM and vCPU threads",
              "The API thread serves the HTTP control interface and is never on the guest's fast path. The VMM thread runs the event loop that emulates devices and enforces rate limits. Each vCPU has its own thread looping on KVM_RUN.",
            ),
            concept(
              "layers",
              "Two barriers, not one",
              "Guest code is confined first by hardware virtualization and KVM. A guest that exploits a bug in the VMM becomes that Firecracker process, so the process is itself treated as untrusted: seccomp filters limit its system calls and the jailer limits what it can see and use on the host.",
            ),
            concept(
              "host-hardening",
              "What the host must still get right",
              "Neither barrier stops everything. Speculative-execution side channels (the Spectre family) leak across VMs through shared CPU cores and caches, and Firecracker does not filter guest network traffic. Its production guidance therefore covers the host too: keep CPU vulnerability mitigations and microcode current, disable SMT, disable kernel samepage merging, disable or encrypt swap, and filter guest egress on the host.",
            ),
          ],
          { links: [FC_DESIGN] },
        ),
        topic(
          "api",
          "The API",
          [
            concept(
              "socket",
              "REST over a Unix socket",
              "Firecracker is controlled by HTTP requests with JSON bodies sent over a Unix domain socket whose path you choose at start. There is no network listener: whoever can open the socket file controls the VM, so file permissions are the access control.",
            ),
            concept(
              "preboot",
              "Configuring and starting a VM",
              "Before boot you PUT /machine-config (vCPU count and memory size), /boot-source (kernel path and boot arguments), /drives/{id} (backing file, root or not, read-only or not) and /network-interfaces/{id} (host TAP name, guest MAC), then PUT /actions with InstanceStart. The same settings can be supplied as one JSON config file instead.",
            ),
            concept(
              "postboot",
              "What can change after boot",
              "Most configuration is fixed once the guest starts. A running VM accepts a smaller set of calls: pause and resume with PATCH /vm, snapshot creation, changing a drive's backing path, and updating a device's rate limiter. A client has to know which state each call is valid in and handle the error when it is not.",
            ),
            concept(
              "mmds",
              "The metadata service (MMDS)",
              "A small JSON store inside the VMM. The host writes it through the API and the guest reads it with HTTP requests to a link-local address that the VMM answers itself, with no host network service involved. It is a common way to hand a guest its identity and configuration.",
            ),
          ],
          { links: [FC_API, FC_START] },
        ),
        topic(
          "boot",
          "The boot path",
          [
            concept(
              "direct-boot",
              "Direct kernel boot",
              "Firecracker loads an uncompressed kernel image straight into guest memory, writes the boot information the kernel expects (memory map, command line, and a device tree on arm64), sets the vCPU registers and starts at the kernel's entry point. No firmware or boot loader runs, which removes boot time and emulated legacy hardware together.",
            ),
            concept(
              "boot-args",
              "Kernel boot arguments",
              "The command line tells the guest kernel where its console is (console=ttyS0 is the serial port) and what to do on panic and reboot: panic=1 reboots one second after a panic, and reboot=k makes a reboot reset the machine through the keyboard controller. Firecracker appends the root device argument itself for the drive marked as root (root=/dev/vda with ro or rw), and adds pci=off, which skips PCI probing, unless it was started with PCI enabled.",
            ),
            concept(
              "shutdown",
              "How a guest stops its VM",
              "Firecracker does not reboot guests; a guest's request to reset or power off ends the Firecracker process. On x86 there is no power-management device, so `reboot` with reboot=k resets through the emulated i8042 controller and Firecracker exits, while `poweroff` halts the guest but leaves the process running. On arm64 both commands work, because the guest makes a PSCI call that KVM reports to the VMM. From the host, the SendCtrlAltDel API action asks an x86 guest to shut down, and killing the process always works.",
            ),
            concept(
              "rootfs",
              "The root filesystem image",
              "The guest's disk is a host file containing a filesystem (commonly ext4) with an init system and your programs, attached as a virtio-block drive. You can build one from a container image or a distribution's root tarball. The guest kernel needs the virtio drivers it boots from built in, since there may be no initrd to load modules from.",
            ),
            concept(
              "guest-net",
              "Guest network configuration",
              "Attaching a TAP only provides the cable. The guest still needs an address and a default route, set by the kernel's ip= boot argument or by its init system, and the host needs forwarding and NAT rules for the TAP: the same plumbing as in Networking.",
            ),
            concept(
              "boot-time",
              "Where boot time goes",
              "With no firmware and few devices to probe, the time after InstanceStart is spent in guest kernel initialisation and then in the guest's own init and services. You can split it using the timestamps on the serial console and by polling for the service you care about.",
            ),
          ],
          { links: [FC_START, FC_ROOTFS, FC_NETWORK] },
        ),
        topic(
          "jailer",
          "The jailer",
          [
            concept(
              "why",
              "Why a separate jailer exists",
              "Building a sandbox needs root privileges that the VMM itself should never hold. The jailer is a small program that starts as root, sets up the confinement, drops privileges and execs Firecracker, so the long-running process that faces the guest is unprivileged from its first instruction.",
            ),
            concept("steps", "What the jailer does before exec", undefined, {
              parts: [
                concept(
                  "clean-slate",
                  "Shedding inherited state",
                  "The jailer closes every inherited file descriptor except standard input, output and error, clears the environment variables it was given, and sets resource limits (by default a cap on open file descriptors), so nothing from the parent leaks into the VMM.",
                ),
                concept(
                  "chroot",
                  "A private root directory",
                  "The jailer creates a directory unique to the VM's ID, copies the Firecracker binary into it, enters a new mount namespace and uses pivot_root so that the directory becomes the process's whole filesystem.",
                ),
                concept(
                  "visible-files",
                  "What must be visible inside the chroot",
                  "Only what the VMM needs. The jailer creates the device nodes for /dev/kvm and /dev/net/tun (and /dev/userfaultfd where the host has it) and gives them to the VM's UID. You must copy or hard-link in the kernel image, drive files and any snapshot files, with permissions that let that UID open them. Paths in API calls are then resolved inside the new root, and the API socket is created there too.",
                ),
                concept(
                  "cgroups",
                  "Cgroup placement",
                  "For the cgroup settings you pass (CPU, memory, cpuset and so on) the jailer creates a cgroup named after the VM's ID, moves itself into it and writes the values, so the VMM and its vCPU threads are bounded by the host kernel whatever the guest does. It uses the cgroup v1 layout unless you pass --cgroup-version 2.",
                ),
                concept(
                  "namespaces",
                  "Network and PID namespaces",
                  "On request the jailer joins an existing network namespace, so the VM's TAP and firewall rules are private to it, and can start Firecracker in a new PID namespace so it cannot see other host processes.",
                ),
                concept(
                  "drop-privs",
                  "Dropping to a dedicated UID and GID",
                  "As its last step the jailer switches to the unprivileged user and group you chose and execs Firecracker. Giving every VM its own UID means a compromised VMM has no access to another VM's files or processes.",
                ),
              ],
            }),
            concept(
              "seccomp",
              "Seccomp filters inside Firecracker",
              "The jailer does not install the system call filter; Firecracker applies its own seccomp filters once it is running, before any guest code executes. Each kind of thread (API, VMM, vCPU) gets its own allowlist of the system calls and arguments it needs. A call outside the list raises SIGSYS, which Firecracker handles by logging the call and exiting, so a compromised VMM that tries anything unusual dies.",
            ),
            concept(
              "inspect",
              "Inspecting a jailed process",
              "From the host you can read /proc/<pid>/status for the UID and GID, the Seccomp line (2 means a filter is active; the filters go on shortly before the guest starts, and each thread has its own under /proc/<pid>/task) and the effective and permitted capability sets (CapEff and CapPrm, both zero for an unprivileged process), list its namespaces under /proc/<pid>/ns, and find its cgroup in /proc/<pid>/cgroup.",
            ),
          ],
          { links: [FC_JAILER] },
        ),
        topic("limits", "Rate limiters", [
          concept(
            "token-bucket",
            "Token buckets on network and block devices",
            "Each virtio-net and virtio-block device can be given rate limiters made of token buckets: one counting bytes and one counting operations, each with a size, a refill time and an optional one-time burst. A network interface has separate limiters for receive and transmit.",
          ),
          concept(
            "effect",
            "What an exhausted limiter does",
            "When a bucket is empty the device stops taking requests from its queue until tokens refill, so the guest sees slower I/O, not errors. This is how one host disk and NIC are shared among many guests; CPU and memory are bounded separately, by cgroups.",
          ),
        ]),
        topic("compare", "Firecracker among its relatives", [
          concept(
            "qemu",
            "Compared with QEMU",
            "QEMU is a general-purpose VMM and emulator: many machine types and architectures, firmware, a large catalogue of emulated devices, device passthrough and live migration, in a large C code base. Firecracker supports one kind of guest with a handful of devices, in exchange for a much smaller attack surface, lower overhead and faster start.",
          ),
          concept(
            "rust-vmms",
            "Other minimal VMMs",
            "crosvm (from ChromeOS, and the code Firecracker started from) and Cloud Hypervisor are also Rust VMMs on KVM, and Firecracker and Cloud Hypervisor share building blocks through the rust-vmm project. Cloud Hypervisor aims at general cloud workloads and includes features Firecracker omits, such as live migration, CPU hotplug, firmware boot and Windows guests.",
          ),
          concept(
            "lightvm",
            "Unikernels and LightVM",
            "A unikernel links one application with only the OS code it needs into a tiny single-purpose guest. The LightVM work showed, on Xen with a redesigned control plane, that such guests boot in milliseconds and pack thousands to a host: VMs are not inherently heavy, their guests and toolstacks were. Firecracker reaches similar ground while still running ordinary Linux guests.",
            {
              links: [
                link(
                  "My VM is lighter (and safer) than your container",
                  "https://blog.acolyer.org/2017/11/02/my-vm-is-lighter-and-safer-than-your-container/",
                ),
              ],
            },
          ),
        ]),
        topic("build", "Build it", [
          build(
            "fc-boot",
            "Boot Firecracker with curl",
            "Download a pinned Firecracker release, a guest kernel and a rootfs for your architecture, and read the docs at the git tag matching that release, not main. Start the firecracker process and configure it only through its API socket with curl: machine-config, boot-source, drives, a network interface on a TAP you created, then InstanceStart. SSH into the guest and reach the internet through your NAT. Measure time from InstanceStart to a listening sshd.",
            {
              doneWhen: [
                "Your boot script, start to finish",
                "Guest console boot log and the measured boot time",
              ],
              links: [FC_START, FC_ROOTFS, FC_NETWORK],
            },
          ),
          build(
            "fc-jailer",
            "Run under the jailer",
            "Start the same VM through the jailer: its own chroot, a dedicated UID, cgroup v2 limits and a per-VM network namespace. Work out which files must be visible inside the chroot. Read /proc/<pid>/status of the firecracker process and list the seccomp mode, capabilities and namespaces.",
            {
              doneWhen: [
                "The jailer command line and the chroot's file tree",
                "Seccomp, capability and namespace details of the jailed process",
              ],
              links: [FC_JAILER],
            },
          ),
          build(
            "fc-sdk",
            "A TypeScript client for the Firecracker API",
            "Write a small typed TypeScript client that talks HTTP over the Unix socket: configure, start, pause, resume, snapshot. Map API errors to typed errors, add timeouts, and write a test that boots and stops a VM. The migration capstone reuses this client.",
            {
              doneWhen: ["A repo with the client", "The integration test passing"],
              links: [FC_API],
            },
          ),
        ]),
      ],
      {
        detail: "A VMM that does very little on purpose, and how to boot, drive and confine it by hand.",
        links: [FC_PAPER, FC_DESIGN, FC_START],
      },
    ),

    topic(
      "snapshots",
      "Snapshots",
      [
        topic("contents", "What a snapshot is", [
          concept(
            "why",
            "What snapshots are for",
            "A snapshot freezes a running VM into files so it can continue later or elsewhere: to stop paying for an idle VM, to skip boot and application warm-up by restoring a pre-initialised image, or to move a workload to another host.",
          ),
          concept(
            "state",
            "The state of a running VM",
            "Everything a VM is at one instant: the contents of guest RAM, each vCPU's registers, the interrupt controller and timers, and each emulated device's internal state such as its queue positions. Outside the VMM there are also the disk contents and the host's network plumbing.",
          ),
          concept(
            "files",
            "What a full snapshot contains",
            "A full Firecracker snapshot is two files: a memory file with guest RAM and a state file with vCPU and emulated device state.",
          ),
          concept(
            "not-included",
            "What a snapshot does not contain",
            "Disk contents, the host TAP device, live network connections on the host side, the data held in the metadata service (its configuration is saved, its contents are not), and metrics or logger configuration. Whatever orchestrates the VM must save or recreate each of these itself.",
          ),
          concept(
            "pause",
            "Pause, then snapshot",
            "A snapshot is taken of a paused VM (PATCH /vm to Paused, then the snapshot create call). While paused, every vCPU is out of KVM_RUN and device emulation stops, so memory and device state stop changing and the files describe one instant. The guest gets no warning and no chance to prepare, and pausing does not stop the outside world, which is where the pitfalls below come from.",
          ),
          concept(
            "disk",
            "Why the disk must be captured at the same pause",
            "A running guest keeps writing, including from its own page cache, so a disk copy taken meanwhile is internally inconsistent and does not match the memory snapshot. Copy or clone the disk image while the VM is paused, after the snapshot call (which flushes the backing files to the host disk), so memory, device state and disk all describe the same instant.",
          ),
          concept(
            "diff",
            "Full and diff snapshots",
            "A full snapshot writes all guest memory. A diff snapshot writes a sparse memory file holding the pages changed since the previous snapshot (or since the VM booted or was restored), so it is smaller and quicker to take. A diff taken on top of an earlier snapshot cannot be resumed on its own: its memory file must first be merged onto the base, in the order the snapshots were taken. Firecracker still labels diff snapshots a developer preview.",
          ),
          concept(
            "diff-tracking",
            "How a diff snapshot finds the changed pages",
            "With track_dirty_pages enabled (in the machine config before boot, or in the load call on restore) Firecracker uses KVM's dirty page log and writes exactly the pages written since the last snapshot, at the cost of slowing the guest's writes while logging is on. Without it, newer versions ask the host kernel which pages are resident (mincore), which over-approximates the set, costs nothing at run time and only works with host swap disabled.",
          ),
        ]),
        topic("restore", "Restoring", [
          concept(
            "load",
            "Loading into a fresh process",
            "Restore starts a new Firecracker process and, instead of configuring and booting it, calls the snapshot load API with the state file and a memory backend, before any other VM configuration. The VMM rebuilds vCPUs and devices from the state file and leaves the VM paused unless the call asks to resume it. The guest then continues from the instruction where it was paused: its kernel does not boot again, so its PID numbers and boot ID are unchanged.",
          ),
          concept(
            "host-resources",
            "Host resources the snapshot expects",
            "The state file refers to drives by path, to the network interface by host TAP name and to the vsock device by its socket path, so by default the same paths and a TAP of the same name must exist where the new process runs. Inside a chroot and a network namespace those names can be identical for every VM. Newer Firecracker versions also let the load call override the TAP name.",
          ),
          concept(
            "lazy-file",
            "File-backed memory loads lazily",
            "With the File memory backend the memory file is mapped privately into the new process instead of being read up front. Pages are faulted in from the file on first touch and guest writes go to private copies, so resume is quick and the file is never modified. The file must stay present and unchanged for as long as the VM runs.",
          ),
          concept(
            "compat",
            "Compatibility requirements for restoring elsewhere",
            "Firecracker only promises a restore on the configuration a snapshot was taken on: a binary that supports the same snapshot format version (the format can change with any release, so in practice the same Firecracker version), the same host kernel version, and a host whose CPU exposes the same features to the guest, meaning the same CPU model or a CPU template that makes different models look alike. Snapshots never move between Intel, AMD and Arm. A guest that has already detected a CPU feature keeps using it, so resuming on a CPU without that feature can crash it.",
          ),
          concept(
            "cpu-templates",
            "CPU templates",
            "The VMM chooses what each vCPU reports about itself: CPUID bits and model-specific registers on x86, ID registers on arm64. A CPU template uses this to hide features, so that guests on different host CPU models of one vendor all see the same set. It is configured before boot, before the guest probes its CPU, and it is what makes a fleet of mixed hardware snapshot-compatible. Hiding a feature bit does not disable the instructions behind it, so a template is not a security control.",
          ),
          concept(
            "sensitive",
            "Snapshot files are sensitive",
            "The memory file holds every secret the guest had in RAM, in the clear, and the VMM trusts the state file it is told to load. Protect both with encryption and access control, and never load a snapshot from a source you do not trust.",
          ),
        ]),
        topic(
          "pitfalls",
          "Pitfalls of resuming and cloning",
          [
            concept(
              "once",
              "Resume each snapshot at most once",
              "Two VMs resumed from one snapshot share random number generator state, unique IDs, TLS session state and the disk image. That breaks security assumptions and corrupts data. Cloning is safe only when each copy is deliberately given its uniqueness back and its own disk.",
            ),
            concept("entropy", "Random number state", undefined, {
              parts: [
                concept(
                  "duplicate-rng",
                  "Clones produce the same random numbers",
                  "A cryptographic random generator is deterministic given its internal state, and that state is in the snapshot. Two clones can generate identical keys, nonces and UUIDs until fresh entropy is mixed in, which can leak keys or make sessions collide.",
                ),
                concept(
                  "vmgenid",
                  "VMGenID",
                  "A random 16-byte generation ID exposed to the guest as a device. On restore the VMM changes it and notifies the guest before the vCPUs resume. A Linux guest kernel that supports it (5.18 onwards with ACPI, 6.10 onwards with a device tree) then reseeds its random number generator, so the kernel's randomness diverges between copies. Current Firecracker versions always provide the device. It fixes the kernel's generator and nothing else.",
                ),
                concept(
                  "userspace-rng",
                  "User-space generators need their own fix",
                  "Libraries and runtimes often keep their own generator state, or values derived from it, in process memory that a kernel reseed does not touch. They must reseed after resume or draw from the kernel every time, which needs a way for user space to learn that a restore happened (Firecracker's VMClock device exposes a generation counter for this on guest kernels new enough to support it). Making this safe across the software stack was a large part of the work behind Lambda SnapStart.",
                ),
              ],
            }),
            concept(
              "unique-ids",
              "Unique IDs that stop being unique",
              "Anything generated once and then kept in memory or on disk is duplicated by cloning: machine and instance IDs, host names, node IDs in a cluster, in-memory sequence numbers and request tokens. Each has to be regenerated or injected after resume.",
            ),
            concept(
              "clock",
              "The wall clock after restore",
              "The guest's wall clock continues from the moment of the snapshot, so it is behind by however long the snapshot sat on disk. The guest must resynchronize (NTP, or a paravirtual PTP clock read from the host), or on x86 guests using kvm-clock Firecracker can be asked in the load call to advance the clock, which the guest then sees as a sudden jump. Until then, expiry checks on tokens and certificates, timeouts and log timestamps are wrong.",
            ),
            concept(
              "net-identity",
              "Network identity of clones",
              "A restored VM keeps its MAC and IP address and expects its TAP by name. To run copies side by side, give each its own network namespace with an identically named TAP and the same guest address, and a unique outer address through NAT: the 'same inner IP' arrangement from Networking.",
              { links: [FC_CLONES] },
            ),
            concept(
              "dead-conns",
              "Connections that no longer exist",
              "The guest's sockets are restored exactly as they were, but their peers have timed out or closed in the meantime and nothing told the guest. Its next write meets a reset or silence, so software in the guest must detect dead connections and reconnect after a resume. Vsock connections are closed by the snapshot itself: Firecracker resets the vsock device, and only listening sockets survive.",
            ),
            concept(
              "moved-conns",
              "Why client connections do not follow the VM to another host",
              "The connection's packets were routed to the old host, and its state lived in that host's NAT table and the path to it. On the new host there is no matching flow, so a stable proxy in front must reconnect to the VM's new location.",
            ),
          ],
          { links: [SNAPSTART, SEVEN_YEARS] },
        ),
        topic("build", "Build it", [
          build(
            "fc-snapshot",
            "Snapshot, kill, restore somewhere else",
            "Run a counter server in the guest. Pause the VM, take a full snapshot, and kill the firecracker process. Start a new process in a different network namespace with the same TAP name and guest IP, load the snapshot and resume. Verify the counter continues, the PID and boot ID are unchanged, and observe what happened to the guest clock and to open TCP connections.",
            {
              doneWhen: [
                "Counter, PID and boot ID before and after restore",
                "A note on what you saw with the clock and with connections, and why",
              ],
              links: [FC_SNAPSHOT, FC_CLONES],
            },
          ),
          build(
            "writeup",
            "Write-up: what is inside a VM snapshot",
            "Explain what Firecracker saves (memory, vCPU and device state), what it leaves to you (disk, TAP, connections, clock, entropy), and why a snapshot must be resumed at most once.",
            { doneWhen: ["A published write-up"] },
          ),
        ]),
      ],
      {
        detail: "What a frozen VM consists of, and everything that goes wrong when it wakes up later, elsewhere or twice.",
        links: [FC_SNAPSHOT, FC_CLONES],
      },
    ),

    topic(
      "cow",
      "Copy-on-write root filesystems",
      [
        topic("idea", "Sharing a base image", [
          concept(
            "problem",
            "The cost of a full copy per VM",
            "A root filesystem image is hundreds of megabytes to gigabytes, and any one VM changes only a small part of it. Copying the whole image for every VM makes provisioning slow and multiplies disk use.",
          ),
          concept(
            "cow",
            "Copy-on-write",
            "Platforms avoid a full root filesystem per VM by sharing one read-only base and giving each VM a private writable layer; a block is copied only when a VM first writes to it. The usual ways are reflinks, device-mapper thin snapshots, overlayfs in the guest, or network block devices.",
          ),
          concept(
            "disk-usage",
            "Apparent size versus real disk usage",
            "A file's length and the blocks it really occupies differ when it has holes or shares extents with other files. `ls -l` shows length and `du` shows allocated blocks, but per-file tools count shared extents once for every file that uses them, so measure a set of clones by the change in `df` for the filesystem.",
          ),
        ]),
        topic("approaches", "Ways to do it", [
          concept(
            "reflink",
            "Reflink copies",
            "On filesystems that support it (btrfs, and XFS formatted with reflink enabled; ext4 does not), `cp --reflink=always` makes a new file that shares the original's data extents, taking almost no time or space, and fails instead of silently doing a full copy where sharing is impossible. The filesystem gives a file its own copy of the affected blocks when either file writes to them. Each VM gets an ordinary writable image and the VMM needs no changes.",
          ),
          concept(
            "guest-overlay",
            "A read-only base with an overlay in the guest",
            "Attach the shared base image as a read-only drive plus a small per-VM writable drive, and have the guest's init mount overlayfs with the base as the lower layer and the writable drive as the upper layer before switching root. The host caches the base once for all VMs, but the guest image must be built to boot this way.",
          ),
          concept(
            "dm-thin",
            "Device-mapper thin snapshots",
            "A thin pool hands out virtual block devices that share blocks and allocate on write, and a snapshot of a base volume is created instantly. Each VM gets its own snapshot as a block device. It works below the filesystem, so any guest filesystem can be used, at the cost of running the pool.",
          ),
          concept(
            "network-block",
            "Network block devices",
            "A drive can be backed by a block device whose reads are served over the network or by a user-space process, so blocks are fetched on demand from a remote base. The base no longer has to be on every host, and every uncached read now depends on the network.",
          ),
          concept(
            "with-snapshots",
            "Copy-on-write disks and snapshots",
            "A cheap disk clone is what makes VM snapshots practical: at the pause, clone the disk alongside the memory and state files so all three describe one instant, and give every restored copy its own clone so two VMs never write to the same image.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "cow-rootfs",
            "Copy-on-write root filesystems",
            "Start ten VMs from one base rootfs without copying it ten times. Try two approaches: reflink copies on XFS or btrfs, and a read-only base drive with a per-VM writable overlay inside the guest. Measure provisioning time and disk used, and confirm writes in one VM never appear in another.",
            {
              doneWhen: ["Time and disk usage for ten VMs with each approach versus full copies"],
            },
          ),
        ]),
      ],
      {
        detail: "Giving every VM its own writable disk without paying for a full copy.",
      },
    ),

    topic(
      "uffd",
      "userfaultfd and lazy loading",
      [
        topic("why", "Why load memory lazily", [
          concept(
            "problem",
            "The problem: all of RAM before the first instruction",
            "Reading a multi-gigabyte memory file into RAM before the guest runs makes resume time grow with VM size, even though a resumed guest usually touches only a fraction of its pages soon. Loading each page when it is first touched makes time-to-resume nearly independent of memory size.",
          ),
          concept(
            "beyond-mmap",
            "What a plain file mapping cannot do",
            "A private file mapping is already lazy, but the kernel decides everything: the data must be a local file laid out page for page. Handling the faults yourself lets pages come from anywhere (another host, object storage, a compressed or deduplicated store) and lets you see, record and prefetch what the guest uses.",
          ),
        ]),
        topic("mechanism", "How userfaultfd works", [
          concept(
            "what",
            "What userfaultfd is",
            "A Linux kernel mechanism that delivers page faults for a registered memory region to a user-space handler through a file descriptor, instead of the kernel resolving them itself. Firecracker can set up guest memory with it on restore, so a handler supplies each page on first touch instead of all RAM being loaded up front.",
          ),
          concept("fault-life", "The life of one fault", undefined, {
            parts: [
              concept(
                "register",
                "Create and register",
                "A process creates a userfaultfd, negotiates features with the UFFDIO_API ioctl, and registers an address range with UFFDIO_REGISTER in 'missing' mode: tell me when a page that is not yet present is touched.",
              ),
              concept(
                "event",
                "The fault event",
                "When any thread touches a missing page in the range, the kernel puts that thread to sleep and makes a message carrying the faulting address readable on the userfaultfd. The faulting thread is blocked, so the reader must be another thread or, more usefully, another process: a userfaultfd can be passed over a Unix socket like any other fd.",
              ),
              concept(
                "resolve",
                "Resolving with UFFDIO_COPY",
                "The handler obtains the page's contents and calls UFFDIO_COPY, which atomically installs a filled page at that address and wakes the sleeping thread. UFFDIO_ZEROPAGE does the same with a page of zeros. The faulting thread continues as if the page had always been there.",
              ),
            ],
          }),
          concept(
            "permissions",
            "Who may create one",
            "Any user can create a userfaultfd with the userfaultfd system call if it traps user-mode faults only (the UFFD_USER_MODE_ONLY flag). A guest's faults are taken inside the kernel by KVM, and trapping kernel-mode faults needs the CAP_SYS_PTRACE capability or the vm.unprivileged_userfaultfd sysctl set to 1 (it defaults to 0). Linux 6.1 added /dev/userfaultfd: a process that file permissions allow to open it can create a userfaultfd that traps kernel faults too. Firecracker uses the device when it exists, and the jailer puts it inside the chroot; on older hosts an unprivileged VMM needs the sysctl.",
          ),
          concept(
            "other-ops",
            "Beyond missing-page faults",
            "A userfaultfd can also report other events, if asked for when it is set up. The one that matters here is 'remove': when memory in the range is freed (for example with madvise because a balloon gave pages back), the handler is told, and it must answer later faults on those pages with zeros, not with the old contents from its source.",
          ),
        ]),
        topic("restore", "Lazy snapshot restore", [
          concept(
            "kvm-path",
            "A guest fault becomes a userfault",
            "When the guest touches a page that is not yet present, the second-level fault takes the vCPU into KVM, which tries to fault in the host page and hits the userfaultfd registration. The vCPU thread sleeps until the handler installs the page. The guest sees only a slow memory access.",
          ),
          concept(
            "fc-backend",
            "Firecracker's Uffd memory backend",
            "When a snapshot is loaded with the Uffd backend, the backend path names a Unix socket on which a handler process that you provide is already listening. Firecracker maps guest memory anonymously, registers it with a new userfaultfd, connects to the socket and sends the fd with a description of the memory regions (address, size, page size and offset in the memory file). From then on your handler decides how every page is filled. Under the jailer the socket must be inside the chroot.",
          ),
          concept(
            "trade-off",
            "The latency trade-off",
            "Lazy loading moves cost from before resume to the first touch of each page: each fault adds a wakeup of the handler, a copy, and a network round trip if the page is remote. Time-to-resume gets short and constant; the first requests afterwards get slower and more variable.",
          ),
          concept(
            "prefetch",
            "Prefetching the working set",
            "Platforms shrink the fault cost by recording which pages a workload touches after resume and loading those eagerly next time, by installing several neighbouring pages per fault, and by filling in the rest in the background.",
          ),
          concept(
            "handler-death",
            "When the handler dies",
            "A vCPU that faults on a page nobody will ever supply sleeps forever, so if the handler crashes or hangs, the guest freezes partway through whatever it was doing. A lazily restored VM depends on its handler and its page source until every page has been loaded.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "uffd-handler",
            "Restore with a userfaultfd page handler",
            "Build Firecracker's example UFFD handler and restore your snapshot with the Uffd memory backend so pages load on first touch. Log each fault. Compare time-to-resume and total pages loaded against a normal file-backed restore. Then kill the handler mid-run and observe the guest.",
            {
              doneWhen: [
                "Fault log summary: pages loaded on demand versus total guest pages",
                "A note on what happened to the guest when the handler died, and what that implies for post-copy migration",
              ],
              links: [FC_UFFD],
            },
          ),
        ]),
      ],
      {
        detail: "Resuming a VM before its memory has arrived, by answering its page faults from user space.",
        links: [FC_UFFD, CODESANDBOX],
      },
    ),

    topic(
      "migration",
      "Live migration theory",
      [
        topic("goal", "The goal", [
          concept(
            "why",
            "Why move a running VM",
            "Hosts need kernel and hardware maintenance, become overloaded, or show signs of failing. Live migration moves a VM to another host while it keeps running, so the workload sees a brief pause instead of a restart.",
          ),
          concept(
            "metrics",
            "Downtime, total time and degradation",
            "Three numbers describe a migration: downtime (how long the guest is fully stopped), total migration time (from start until the source is released), and how much the guest is slowed while it runs. Every technique trades one against the others.",
          ),
          concept(
            "stop-copy",
            "The baseline: stop and copy",
            "Pause the VM, snapshot it, transfer memory, state and disk, and restore on the destination. It is simple and safe, and its downtime grows with memory size and transfer speed. Firecracker has no live migration of its own, so snapshot and restore across hosts is this baseline; QEMU and Cloud Hypervisor have live migration built in.",
          ),
        ]),
        topic("precopy", "Pre-copy", [
          concept(
            "rounds",
            "Iterative copying",
            "Copy all guest memory to the destination while the VM keeps running on the source. Pages written meanwhile are stale on the destination, so send those again, and repeat; each round is smaller as long as the guest dirties memory more slowly than the network carries it. The source finds the changed pages with dirty page logging, fetched and reset every round, which itself slows a write-heavy guest.",
          ),
          concept(
            "final-pause",
            "The final pause",
            "When the remaining dirty set is small enough to send within the allowed downtime, the source pauses the VM, sends the last dirty pages together with vCPU and device state, and the destination resumes. Only this last step is downtime.",
          ),
          concept(
            "convergence",
            "Convergence",
            "Pre-copy finishes only if pages can be sent faster than the guest dirties them. A guest that keeps rewriting a large working set never converges. The options are to throttle its vCPUs, compress the stream or add bandwidth, accept a longer downtime, or switch to post-copy partway, which keeps the pages already sent.",
          ),
          concept(
            "safe-abort",
            "Failure before the switch is harmless",
            "Until the final pause the source holds the complete, authoritative VM. If the destination or the network fails, the migration is cancelled, the copied pages are thrown away and the guest never notices.",
          ),
        ]),
        topic("postcopy", "Post-copy", [
          concept(
            "mechanism",
            "Move first, fetch later",
            "Pause the source, send only vCPU and device state, and resume on the destination at once. Pages the guest touches that have not arrived yet are fetched from the source on demand, using userfaultfd on the destination, while the rest are pushed in the background.",
          ),
          concept(
            "properties",
            "What post-copy buys",
            "Each page is sent once, so total time is bounded however fast the guest writes, and downtime is short. The price is that the guest runs slowly until its working set has arrived, because each missing page costs a network round trip.",
          ),
          concept(
            "risk",
            "The failure risk specific to post-copy",
            "After the switch, state is split between two hosts: the newest CPU state and the pages already fetched are on the destination, and the remaining pages exist only on the source. If the source or the network fails before all pages are fetched, the VM is lost.",
          ),
        ]),
        topic("beyond", "What must move besides memory", [
          concept(
            "device-state",
            "vCPU and device state",
            "Registers, interrupt controller and timer state, and every device's queue positions and configuration are serialized on the source and loaded on the destination, which must offer the same device model and a compatible CPU feature set. I/O in flight has to be completed or replayed so that no request is lost or performed twice.",
          ),
          concept(
            "storage",
            "Storage",
            "Either both hosts reach the same disk over the network, so only ownership changes, or the disk contents are copied too, which is often the largest transfer. Either way the disk the destination opens must match the memory it resumes with.",
          ),
          concept(
            "network",
            "Network identity and connections",
            "The guest keeps its IP and MAC, so the network must start delivering that address to the new host: by announcing the move on a shared layer-2 network, or by updating a route, NAT rule or proxy. TCP state for connections that end in the guest is in guest memory and moves with it. State held in the old host's NAT table does not, which is why platforms put a stable proxy in front.",
          ),
        ]),
        topic("safety", "Exactly one running copy", [
          concept(
            "split-brain",
            "Split-brain",
            "If a failed or half-finished migration leaves the VM running on both hosts, two copies write to the same disk and answer on the same address, corrupting data in ways that cannot be merged. The invariant under every migration design is that at most one copy is ever running.",
          ),
          concept(
            "fencing",
            "Source fencing",
            "Guaranteeing the old copy can never run again once the new one is live: kill its process, remove its network path and files, and reject stale commands with an epoch or lease.",
          ),
          concept(
            "commit-point",
            "The commit point",
            "A migration needs one atomic decision, recorded in one place, that ownership has passed to the destination. A failure before it means resume the source and clean up the destination; a failure after it means the destination is the VM and the source must be fenced. A repeated request for the same migration must be safe.",
          ),
          concept(
            "cleanup",
            "No orphans",
            "Every failure path must release what it created: VMM processes, TAP devices, namespaces, and snapshot and disk files. Leaked processes and files waste capacity and are the raw material for a later split-brain.",
          ),
          concept(
            "production",
            "How production platforms assemble the pieces",
            "Real pause, resume and move paths are the parts of this section composed: pause and snapshot, a copy-on-write disk, lazy memory restore through userfaultfd, a stable network identity behind a proxy, and fencing. You can find each part in a production write-up or code base and say what it is for.",
            {
              links: [
                link(
                  "Building a computer that can pause and resume",
                  "https://www.digitalocean.com/blog/microvm-architecture",
                ),
                link("E2B infrastructure", "https://github.com/e2b-dev/infra"),
              ],
            },
          ),
        ]),
      ],
      {
        detail: "The state that has to move, the two ways to move memory, and how to never end up with two copies.",
        links: [
          link("QEMU migration framework", "https://www.qemu.org/docs/master/devel/migration/main.html"),
          link(
            "Cloud Hypervisor live migration",
            "https://github.com/cloud-hypervisor/cloud-hypervisor/blob/main/docs/live_migration.md",
          ),
        ],
      },
    ),
  ],
);
