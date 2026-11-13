import { cards, lab, link, note, output, paid, read, url } from "../dsl";
import type { Phase } from "../types";

const OSTEP = link("Operating Systems: Three Easy Pieces", "https://pages.cs.wisc.edu/~remzi/OSTEP/");

export const phase: Phase = {
  id: "storage",
  label: "Phase 4",
  title: "Files and storage",
  summary:
    "Inodes, durability and what a disk can actually do per second. You will lose acknowledged writes on purpose, then learn exactly which calls would have saved them.",
  weeks: { start: 13, end: 14 },
  pillar: "storage",
  modules: [
    {
      id: "sto-filesystems",
      title: "File systems and durability",
      summary: "Week 13. What a file is on disk, and when a write is really written.",
      items: [
        read("sto-ostep", "OSTEP: persistence", {
          week: 13,
          hours: 12,
          source: "OSTEP",
          chapters: "Ch. 36-37 (devices, disks), 39-42 (files and directories, FS implementation, FFS, journaling)",
          links: [OSTEP],
        }),
        read("sto-tlpi", "TLPI: buffering, file systems and links", {
          week: 13,
          hours: 6,
          source: "The Linux Programming Interface",
          chapters: "Ch. 13 (file I/O buffering), 14 (file systems), 18 (directories and links)",
          links: [paid("The Linux Programming Interface (Kerrisk)", "https://man7.org/tlpi/")],
        }),
        lab("sto-inodes", "Inodes, links and running out of them", {
          week: 13,
          hours: 3,
          brief:
            "Use stat to inspect inodes. Create hard and symbolic links and delete the original of each. Then make a small ext4 image with very few inodes, fill it with empty files until writes fail, and show `df -h` still reports free space while `df -i` shows 100%.",
          evidence: [output("df", "`df -h` and `df -i` on the exhausted filesystem, plus the error message")],
        }),
        lab("sto-du-df", "When du and df disagree", {
          week: 13,
          hours: 2.5,
          brief:
            "Have a process hold a large log file open, delete the file, and show df still counts the space while du does not. Find it with `lsof +L1` and free the space without killing the process. Then create a sparse file and compare `ls -l` with `du`.",
          evidence: [output("lsof", "df, du and `lsof +L1` output, and how you reclaimed the space")],
        }),
        read("sto-files-are-hard", "Files are hard", {
          week: 13,
          hours: 2,
          source: "Dan Luu",
          links: [link("Files are hard", "https://danluu.com/file-consistency/")],
        }),
      ],
    },
    {
      id: "sto-performance",
      title: "Crash safety and disk performance",
      summary: "Week 14. fsync, atomic rename, IOPS and layered filesystems.",
      items: [
        lab("sto-fsync-loss", "Lose acknowledged writes", {
          week: 14,
          hours: 7,
          brief:
            "Write a program that appends numbered records and prints 'ack N' after each write returns. Run it in a throwaway VM and force an instant reset (echo b > /proc/sysrq-trigger). After reboot, count acknowledged records that are missing. Repeat with fsync after every record, then with fsync every 100 records, and measure the throughput cost of each.",
          evidence: [
            output("loss", "Last acked record vs last record on disk, for each of the three modes"),
            note("cost", "Records per second for each mode and what that says about group commit"),
          ],
          links: [link("fsync(2)", "https://man7.org/linux/man-pages/man2/fsync.2.html")],
        }),
        lab("sto-atomic-rename", "Atomic file replacement", {
          week: 14,
          hours: 3,
          brief:
            "Implement a safe config-file update in Go: write to a temp file in the same directory, fsync it, rename over the target, fsync the directory. Crash-test it with the reset trick and show the file is always the old or the new version, never empty or partial. Then remove one step at a time and find which omissions lose data.",
          evidence: [
            url("repo", "Link to the code"),
            note("steps", "Which step each failure mode needed, in your own words"),
          ],
        }),
        read("sto-sysperf", "Systems Performance: file systems and disks", {
          week: 14,
          hours: 8,
          source: "Systems Performance, 2nd edition",
          chapters: "Ch. 8 File Systems, ch. 9 Disks",
          links: [paid("Systems Performance, 2nd edition (Gregg)", "https://www.brendangregg.com/systems-performance-2nd-edition-book.html")],
        }),
        lab("sto-fio", "Measure a disk with fio", {
          week: 14,
          hours: 4,
          brief:
            "Run four fio jobs with direct I/O: 4k random read, 4k random write, 1M sequential read, 1M sequential write. Add a run with --fsync=1. Record IOPS, MB/s and p99 latency, and watch `iostat -xz 1` alongside. If you are on a cloud volume, compare with the provider's stated limits.",
          evidence: [output("fio", "A table of IOPS, throughput and p99 latency for the five runs")],
          links: [link("fio documentation", "https://fio.readthedocs.io/en/latest/fio_doc.html")],
        }),
        lab("sto-overlayfs", "overlayfs by hand", {
          week: 14,
          hours: 3,
          brief:
            "Mount an overlay with a lower, upper and work directory. Modify a lower file and watch the copy-up appear in upper. Delete a lower file and find the whiteout. Stack two lower layers. This is how container images and many VM root filesystems are layered.",
          evidence: [output("layers", "`ls -la` of upper after a modify and a delete, with the whiteout identified")],
          links: [link("Overlay filesystem", "https://docs.kernel.org/filesystems/overlayfs.html")],
        }),
        lab("sto-writeup", "Write-up: what 'saved' means", {
          week: 14,
          hours: 2.5,
          brief:
            "Explain the journey of a write from your program to the platter or flash: user buffer, page cache, journal, device cache. Use your own lost-write numbers.",
          evidence: [url("post", "Link to the published write-up")],
        }),
      ],
    },
  ],
};

export const quiz = [
  ...cards("sto-filesystems", [
    ["What does an inode hold, and what does it not hold?", "Metadata (size, owner, permissions, timestamps, link count) and pointers to data blocks. It does not hold the file name; names live in directory entries."],
    ["What is a hard link versus a symbolic link?", "A hard link is another directory entry for the same inode. A symlink is a separate small file containing a path, which breaks if the target is removed."],
    ["How can a disk be 'full' while df -h shows free space?", "The filesystem has run out of inodes (check df -i), typically from huge numbers of tiny files."],
    ["Why can df show space in use that du cannot find?", "A deleted file is still held open by a process. Its blocks stay allocated until the last descriptor closes. Find it with lsof +L1."],
    ["What does a journaling filesystem journal by default, and what does that guarantee?", "Usually only metadata (ext4 ordered mode). It guarantees a consistent filesystem structure after a crash, not that your recent file data survived."],
    ["When write() returns successfully, where is the data?", "In the kernel page cache. It reaches the disk later through writeback, unless you call fsync or opened with O_SYNC or O_DIRECT."],
    ["What is a sparse file?", "A file with holes: ranges never written that occupy no blocks. ls shows the apparent size, du shows the blocks actually allocated."],
  ]),
  ...cards("sto-performance", [
    ["What exactly does fsync guarantee?", "That the file's data and metadata have been sent to the device and the device was asked to flush its cache. It does not make the directory entry durable; that needs an fsync on the directory."],
    ["What is the safe sequence to replace a file atomically?", "Write a temp file in the same directory, fsync it, rename it over the target, then fsync the directory."],
    ["Why is rename used for atomic updates?", "rename within one filesystem replaces the directory entry atomically: readers see either the old file or the new one, never a partial file."],
    ["What is the difference between IOPS and throughput?", "IOPS counts operations per second and matters for small random I/O. Throughput is bytes per second and matters for large sequential I/O. A device can be limited by either."],
    ["Why is fsync after every record slow, and how do databases cope?", "Each fsync waits for a device flush. Databases use group commit: batch many transactions' log records into one fsync."],
    ["What happens in overlayfs when you modify a file from a lower layer?", "Copy-up: the whole file is copied to the upper layer first and the modification applies there. The lower layer never changes."],
    ["How does overlayfs record a deletion of a lower-layer file?", "With a whiteout: a special character device (0/0) in the upper layer that hides the lower entry."],
    ["What does O_DIRECT do?", "Bypasses the page cache; reads and writes go straight to the device and must be block-aligned. Used by databases that manage their own cache."],
  ]),
];
