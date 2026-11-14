import { build, concept, link, paid, section, topic } from "../dsl";

const OSTEP_URL = "https://pages.cs.wisc.edu/~remzi/OSTEP/";
const TLPI_URL = "https://man7.org/tlpi/";
const SYSPERF_URL = "https://www.brendangregg.com/systems-performance-2nd-edition-book.html";

const OSTEP_DEVICES = link("OSTEP ch. 36-37: I/O devices and hard disk drives", OSTEP_URL);
const OSTEP_FS = link(
  "OSTEP ch. 39-42: files and directories, file system implementation, FFS, journaling",
  OSTEP_URL,
);
const TLPI_FS = paid("The Linux Programming Interface (Kerrisk), ch. 14 file systems, ch. 18 directories and links", TLPI_URL);
const TLPI_BUFFERING = paid("The Linux Programming Interface (Kerrisk), ch. 13 file I/O buffering", TLPI_URL);
const SYSPERF = paid("Systems Performance, 2nd edition (Gregg), ch. 8 File Systems and ch. 9 Disks", SYSPERF_URL);
const FILES_ARE_HARD = link("Files are hard", "https://danluu.com/file-consistency/");
const FSYNC_MAN = link("fsync(2)", "https://man7.org/linux/man-pages/man2/fsync.2.html");
const FIO_DOCS = link("fio documentation", "https://fio.readthedocs.io/en/latest/fio_doc.html");
const OVERLAY_DOCS = link("Overlay filesystem", "https://docs.kernel.org/filesystems/overlayfs.html");

export default section(
  "storage",
  {
    title: "Files and storage",
    summary:
      "What a file is on disk, when a write is really written, and what a device can actually do per second: block devices and the layers above them, inodes and journaling, fsync and atomic rename, IOPS and latency, and the layered filesystems under every container. You will lose acknowledged writes on purpose, then learn exactly which calls would have saved them.",
  },
  [
    topic(
      "devices",
      "Block devices and the storage stack",
      [
        topic("why", "What storage is", [
          concept(
            "persistence",
            "Storage that survives power loss",
            "RAM forgets everything when power goes; a storage device keeps it. The price is speed: a memory access takes around 100 nanoseconds, an NVMe SSD read around 100 microseconds and a hard disk seek several milliseconds. Every layer above the device is a trade between being safe and being fast.",
          ),
          concept(
            "block-device",
            "What a block device is",
            "A device that looks like one long array of fixed-size blocks, each read or written whole by its number, in any order. The unit is the sector, 512 or 4096 bytes, addressed by logical block address (LBA), and every I/O is a whole number of sectors. The device knows nothing about files.",
          ),
        ]),
        topic("media", "Hard disks, SSDs and NVMe", [
          concept(
            "hdd",
            "Hard disks: seek and rotation",
            "A head must move to the right track (seek) and wait for the platter to rotate under it, so one random I/O costs several milliseconds and a disk manages on the order of a hundred random operations per second. Sequential access avoids both waits and is far faster.",
          ),
          concept(
            "flash",
            "Flash: pages, erase blocks and the translation layer",
            "Flash is read and programmed a page at a time, but a page can only be programmed after its whole erase block (many pages) has been erased, so data cannot be overwritten in place. SSD firmware keeps a map from logical block addresses to physical pages: a write goes to a fresh page, the map is updated, and the old page becomes garbage.",
          ),
          concept(
            "gc-wear",
            "Garbage collection, write amplification and wear",
            "To reclaim garbage the SSD copies the still-valid pages out of an erase block and erases it, so one host write can cause several flash writes. Under sustained writes this background work appears as latency spikes and lower throughput than a short test suggests. Each block survives a limited number of erases, so the firmware spreads them evenly (wear levelling).",
          ),
          concept(
            "trim",
            "TRIM and discard",
            "Deleting a file only changes filesystem metadata, so the device still believes those blocks hold data and keeps copying them during garbage collection. TRIM tells it which blocks are no longer in use. On Linux this is done by running `fstrim` periodically or by the `discard` mount option.",
          ),
          concept(
            "sata-nvme",
            "SATA versus NVMe",
            "SATA was designed for disks and gives the host a single queue of at most 32 commands. NVMe attaches flash over PCIe with many deep queues, usually one per CPU core, so many requests can be in flight without contention. NVMe names the interface, not the storage medium.",
          ),
          concept(
            "cloud-volumes",
            "Network block devices and cloud volumes",
            "A cloud volume is a block device whose blocks live on other machines, so every I/O includes a network round trip and the provider caps its IOPS and throughput. When the cap is reached, requests queue and latency rises even though no physical disk is busy.",
          ),
          concept(
            "storage-kinds",
            "Block, file and object storage",
            "A block volume is attached to one machine, which puts its own filesystem on it. A file service such as NFS exports a filesystem that many machines mount at once, and its caching and locking behave differently from a local one. An object store such as S3 holds whole objects under keys behind an HTTP API: an object is normally written and replaced whole, not updated in place, and calls such as rename and fsync do not exist. The rest of this section is about block devices and the local filesystems on them.",
          ),
        ]),
        topic("stack", "The layers from write() down to the device", [
          concept(
            "vfs",
            "The VFS: one interface over every filesystem",
            "System calls such as open, read, write and stat enter the virtual filesystem layer, which calls the operations of whichever filesystem owns the path. This is why the same calls work on ext4, XFS, tmpfs, /proc and NFS. The VFS also caches name lookups (the dentry cache), so repeated path lookups do not touch the disk.",
          ),
          concept(
            "fs-layer",
            "The filesystem: from file offset to block number",
            "The filesystem turns 'bytes 0 to 4095 of this file' into 'block N of this device'. It allocates blocks when a file grows and records the mapping in its own on-disk structures.",
          ),
          concept(
            "page-cache",
            "The page cache",
            "The kernel keeps file contents in otherwise unused RAM, indexed by file and offset. Reads are served from it when possible; writes change the cached page and mark it dirty, to be written to the device later. It is the reason a second read is fast and the reason a completed write is not yet on disk.",
          ),
          concept(
            "block-layer",
            "The block layer and the driver",
            "Filesystem I/O arrives at the block layer as requests naming a device, a starting sector and a length. The block layer queues them, may merge adjacent ones and reorder them with an I/O scheduler, and passes them to the driver, which speaks the device's protocol (NVMe or SCSI/ATA commands). Below the driver the device runs its own firmware, so 'the write completed' only means the device said so.",
          ),
          concept(
            "stacked",
            "Stacked block devices: LVM, RAID and encryption",
            "A block device can be built from other block devices. On Linux, device mapper and md provide logical volumes (LVM), software RAID and encryption (dm-crypt). Each presents an ordinary block device upward and adds a layer to the path of every I/O.",
          ),
          concept(
            "raid-levels",
            "RAID levels",
            "RAID 0 stripes data across disks for speed and capacity with no redundancy, so losing one disk loses everything. RAID 1 mirrors every block on two or more disks. RAID 5 and RAID 6 add parity and survive the loss of one or two disks, at the cost of slower small writes and long rebuilds. RAID 10 stripes across mirrored pairs. RAID covers a failed disk, not a deleted file, corrupted data or a lost machine, so it is not a backup.",
          ),
        ]),
        topic("naming", "Partitions and device naming", [
          concept(
            "dev-nodes",
            "Device files in /dev",
            "A block device appears as a special file identified by a major and minor number. Reading or writing it accesses the raw blocks underneath any filesystem, which is how mkfs and dd work and why writing to the wrong one destroys data.",
          ),
          concept(
            "partitions",
            "Partitions and partition tables",
            "A partition table at the start of the disk (GPT, or the older MBR) divides it into contiguous ranges of sectors, each exposed as its own block device. MBR cannot describe a disk larger than 2 TiB with 512-byte sectors, which is one reason GPT replaced it.",
          ),
          concept(
            "names",
            "sd, nvme and vd names, and why to mount by UUID",
            "SCSI, SATA and USB disks are /dev/sda, /dev/sdb and so on, with partitions sda1, sda2. NVMe devices are /dev/nvme0n1 (controller 0, namespace 1) with partitions nvme0n1p1; virtio disks in VMs are /dev/vda. These names follow discovery order and can change between boots, so /etc/fstab should name a filesystem by its UUID, shown by `blkid`.",
          ),
          concept(
            "loop",
            "Loop devices",
            "A loop device makes a regular file behave as a block device, so you can create a filesystem inside an image file and mount it. It is the safe way to experiment with mkfs and with unusual filesystem sizes.",
          ),
          concept(
            "lsblk",
            "lsblk, blkid and /sys/block",
            "You can list devices, partitions and mount points as a tree with `lsblk`, find filesystem types and UUIDs with `blkid`, and read a device's properties under /sys/block/<dev>/queue, such as `rotational`, the logical and physical block sizes and the active I/O scheduler.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "map-stack",
            "Map your own storage stack",
            "On a Linux machine or VM, trace one mounted directory down to hardware: mount point, filesystem type, any LVM or encryption layer, partition, disk, and whether the disk is rotational, SATA, NVMe or virtual. Then create a small image file, attach it as a loop device, make an ext4 filesystem on it and mount it.",
            {
              doneWhen: [
                "`lsblk` and `findmnt` output annotated with each layer",
                "The loop-backed filesystem mounted with a file written to it",
              ],
            },
          ),
        ]),
      ],
      {
        detail: "What a disk offers, how the hardware behaves, and every layer a write passes on its way down.",
        links: [OSTEP_DEVICES],
      },
    ),

    topic(
      "filesystems",
      "Filesystems",
      [
        topic("why", "What a filesystem must solve", [
          concept(
            "problem",
            "From numbered blocks to named files",
            "A device offers numbered blocks. A filesystem builds on them named files of any length that can grow and shrink, a directory tree, ownership and permissions, a record of which blocks are free, and a structure that is still consistent after a crash.",
          ),
          concept(
            "layout",
            "On-disk layout",
            "A simple filesystem divides the device into a superblock describing the whole filesystem, bitmaps recording which inodes and data blocks are free, a table of inodes, and data blocks, commonly 4 KiB each. ext4 repeats this arrangement in block groups across the disk. Space is allocated in whole blocks, so many tiny files use far more space than the sum of their lengths.",
          ),
        ]),
        topic("inodes", "Inodes, data blocks and directories", [
          concept(
            "inode",
            "What an inode holds, and what it does not",
            "An inode is the on-disk record for one file: metadata (type, size, owner, permissions, timestamps, link count) and pointers to data blocks. It does not hold the file name; names live in directory entries. Each inode has a number unique within its filesystem, shown by `ls -i`.",
          ),
          concept(
            "block-map",
            "From inode to data: block pointers and extents",
            "Older designs store a list of block numbers in the inode, with indirect blocks holding more pointers for large files. ext4 and XFS store extents instead: each says 'N blocks starting at block B', so a large contiguous file needs only a few entries.",
          ),
          concept(
            "directory",
            "A directory is a map from names to inode numbers",
            "A directory is itself a file whose data is a list of entries, each a name and an inode number. It always contains '.' (itself) and '..' (its parent). Large directories keep a hashed or tree index so a lookup need not scan every entry.",
          ),
          concept(
            "path-walk",
            "Path resolution and directory permissions",
            "Opening /a/b/c starts at the root inode and looks up each component in turn, needing search (execute) permission on every directory along the way. Creating, renaming and deleting change a directory's entries, not the file, so they need write permission on the directory: you can delete a file you cannot read, and cannot delete your own file from a directory you cannot write. The sticky bit on a shared directory such as /tmp narrows this: only a file's owner, the directory's owner or root may delete or rename it.",
          ),
          concept(
            "stat",
            "File metadata and reading stat",
            "`stat` prints what the inode holds: size in bytes, blocks allocated (counted in 512-byte units), inode number, link count, mode, owner and the timestamps. mtime changes when the data changes, ctime when the inode changes (permissions, owner, link count or data), atime when the file is read. ctime is not a creation time; some filesystems record a separate birth time.",
          ),
          concept(
            "xattrs",
            "Extended attributes",
            "Named values attached to an inode alongside its ordinary metadata, in namespaces such as user., trusted. and security. On Linux, POSIX ACLs, SELinux labels and file capabilities are stored this way, and overlayfs uses them for its own bookkeeping. `getfattr -d -m - <file>` prints them. Not every filesystem supports them, and copy and archive tools often drop them unless asked to keep them.",
          ),
          concept(
            "sparse",
            "Sparse files",
            "A file with holes: ranges that were never written occupy no blocks and read back as zeros. `ls -l` shows the apparent size and `du` shows the blocks actually allocated, so the two can differ enormously.",
          ),
        ]),
        topic("links", "Links, unlink and rename", [
          concept(
            "hard-link",
            "Hard links",
            "A hard link is another directory entry for the same inode. All the names are equal, the inode's link count says how many there are, and the file lives until the last is removed. Hard links cannot cross filesystems, because an inode number only has meaning inside one, and cannot point at directories.",
          ),
          concept(
            "symlink",
            "Symbolic links",
            "A symlink is a separate small file containing a path, resolved each time it is used. It can cross filesystems and point at directories, and it breaks (dangles) if the target is removed or renamed.",
          ),
          concept(
            "unlink",
            "What unlink really does",
            "unlink removes one directory entry and decrements the inode's link count. The inode and its blocks are freed only when the link count is zero and no process still has the file open. An open descriptor refers to the inode, not the name, which is why log rotation needs the writer to reopen its file.",
          ),
          concept(
            "deleted-open",
            "Deleted but still open files",
            "A file removed while a process holds it open has no name but keeps its blocks until the last descriptor closes. `lsof +L1` lists open files with a link count of zero. You can free the space without killing the process by truncating the file through /proc/<pid>/fd/<n>, or by making the process reopen its log.",
          ),
          concept(
            "rename",
            "What rename does",
            "rename changes directory entries and never moves data. Within one filesystem it is atomic: if the new name already exists it is replaced in one step, and any observer sees either the old file or the new one. Across filesystems (on Linux, across mount points) it fails with EXDEV and `mv` falls back to copy then delete, which is not atomic.",
          ),
        ]),
        topic("journaling", "Crash consistency and journaling", [
          concept(
            "multi-block",
            "One operation, several blocks",
            "Appending to a file changes a data block, the inode (size and block pointer) and the free-block bitmap. They reach the device as separate writes, so a crash can land between them and leave a block marked used that no file owns, or an inode pointing at a block that holds garbage.",
          ),
          concept(
            "fsck",
            "The old answer: fsck",
            "A checker scans all metadata after an unclean shutdown and repairs contradictions. It takes time proportional to the size of the filesystem, and it can only make the structure consistent; it cannot know what the data should have been.",
          ),
          concept("journal", "How a journal works", undefined, {
            parts: [
              concept(
                "log-first",
                "Write the intent to a log first",
                "Before changing metadata in place, the filesystem writes the new versions of the affected blocks to a reserved area, the journal, as one transaction ending in a commit record. A transaction counts only once its commit record is on disk.",
              ),
              concept(
                "checkpoint",
                "Checkpointing",
                "After the commit, the blocks are written to their real locations at leisure and the journal space is then reused. Journaled blocks are therefore written twice.",
              ),
              concept(
                "replay",
                "Recovery by replay",
                "After a crash the filesystem reads the journal, re-applies every committed transaction and ignores any without a commit record. Each multi-block update is all or nothing, and recovery time depends on the size of the journal, not of the disk.",
              ),
            ],
          }),
          concept(
            "modes",
            "Metadata journaling versus data journaling",
            "Journaling file data too gives the strongest guarantee but writes all data twice, so most filesystems journal only metadata. ext4's default 'ordered' mode journals metadata but writes a file's new data blocks before committing the metadata that points to them, so a crash does not expose stale blocks. 'writeback' mode drops that ordering and 'journal' mode journals data as well.",
          ),
          concept(
            "guarantee",
            "What a journal does and does not promise",
            "Usually only metadata is journaled (ext4 ordered mode). That guarantees a consistent filesystem structure after a crash, not that your recent file data survived. Making data durable is the application's job, through fsync.",
          ),
          concept(
            "delalloc",
            "Delayed allocation",
            "ext4 and XFS do not choose disk blocks when write() is called. They wait until writeback, when they know how much was written and can allocate one contiguous extent. The price is that recently written data without an fsync has no blocks on disk at all for some seconds.",
          ),
        ]),
        topic("ext4-xfs", "ext4 and XFS", [
          concept(
            "ext4",
            "ext4",
            "The default on Debian and Ubuntu. It uses block groups, extents and a journal, and its inode table is created with a fixed number of inodes when the filesystem is made.",
          ),
          concept(
            "xfs",
            "XFS",
            "The default on Red Hat Enterprise Linux. It splits the disk into allocation groups that can be worked on in parallel, tracks free space and inodes with B+ trees, allocates inodes on demand and journals metadata only. It was designed for large files and many concurrent writers.",
          ),
        ]),
        topic("mounting", "Mounting and mount options", [
          concept(
            "mount",
            "Mounting and the single tree",
            "Mounting attaches the root of a filesystem to an existing directory, the mount point; whatever that directory contained is hidden until it is unmounted. All mounted filesystems form one tree. `findmnt` or /proc/self/mounts lists them with their devices, types and options, and /etc/fstab says what to mount at boot.",
          ),
          concept(
            "options",
            "Mount options: relatime, noatime, ro, nosuid, nodev, noexec",
            "Recording access time turns every read into a metadata write, so Linux defaults to relatime, which updates atime only when it is not later than mtime or ctime or is more than a day old; noatime turns the updates off. ro refuses all writes, nosuid ignores set-user-ID and set-group-ID bits and file capabilities, nodev ignores device files and noexec refuses to execute binaries, which limits what a filesystem holding untrusted content can do.",
          ),
          concept(
            "ro-remount",
            "Errors and read-only remounts",
            "When ext4 detects corrupted metadata it can, depending on its `errors=` setting, remount the filesystem read-only. Applications then fail with EROFS, and the cause is in the kernel log, not in the application.",
          ),
          concept(
            "pseudo",
            "Filesystems with no disk behind them",
            "tmpfs keeps files in memory, and /proc and /sys are views of kernel state generated on read. They use the same VFS interface, but nothing in them survives a reboot, so a tmpfs /tmp or /dev/shm is no place for data you need.",
          ),
        ]),
        topic("limits", "Running out", [
          concept(
            "du-vs-df",
            "Why du and df disagree",
            "`df` asks the filesystem how many blocks are in use; `du` walks the directory tree and adds up the files it can reach. df shows space du cannot find when a deleted file is still held open by a process, or when files are hidden underneath a mount point. On ext4, df's 'available' figure also leaves out the blocks reserved for root, 5% by default.",
          ),
          concept(
            "inode-exhaustion",
            "Inode exhaustion",
            "A disk can be 'full' while `df -h` shows free space: the filesystem has run out of inodes (check `df -i`), typically from huge numbers of tiny files. Creating a file then fails with 'No space left on device', the same ENOSPC error as running out of blocks. ext4 fixes its inode count when the filesystem is created (mkfs.ext4 -N or -i); XFS allocates inodes on demand and rarely hits this.",
          ),
        ]),
        topic("observe", "Seeing it on a real machine", [
          concept(
            "ls-stat",
            "ls -li, stat, df and du",
            "You can read a file's inode number and link count with `ls -li` and `stat`, confirm that two names are hard links to the same inode, report block and inode use per filesystem with `df -h` and `df -i`, find which directory holds the space with `du -sh`, and compare `du` with `du --apparent-size` to spot sparse files.",
          ),
          concept(
            "ext4-tools",
            "Inspecting ext4: tune2fs -l and filefrag",
            "`tune2fs -l` prints the superblock: block size, inode count, free counts, reserved blocks and enabled features. `filefrag -v` lists the extents of a file, showing how fragmented it is.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "inodes",
            "Inodes, links and running out of them",
            "Use stat to inspect inodes. Create hard and symbolic links and delete the original of each. Then make a small ext4 image with very few inodes, fill it with empty files until writes fail, and show `df -h` still reports free space while `df -i` shows 100%.",
            { doneWhen: ["`df -h` and `df -i` on the exhausted filesystem, plus the error message"] },
          ),
          build(
            "du-df",
            "When du and df disagree",
            "Have a process hold a large log file open, delete the file, and show df still counts the space while du does not. Find it with `lsof +L1` and free the space without killing the process. Then create a sparse file and compare `ls -l` with `du`.",
            { doneWhen: ["df, du and `lsof +L1` output, and how you reclaimed the space"] },
          ),
        ]),
      ],
      {
        detail: "What a file is on disk: inodes, directories, links, and how the structure survives a crash.",
        links: [OSTEP_FS, TLPI_FS],
      },
    ),

    topic(
      "durability",
      "Durability",
      [
        topic("meaning", "What durable means", [
          concept(
            "ack",
            "Durability and the acknowledgement",
            "A write is durable when it will still be there after power is lost. The contract that matters is the acknowledgement: once you tell a user or a client 'saved', the data must survive a crash. This topic is about when you are allowed to say that.",
          ),
          concept(
            "crash-kinds",
            "Process crash versus system crash",
            "If only your process dies, everything it handed to the kernel with write() is still in the page cache and will reach the disk. If the kernel panics or power is lost, the page cache is gone. `kill -9` therefore tests almost nothing about durability.",
          ),
        ]),
        topic(
          "path",
          "Where a write can sit unflushed",
          [
            concept(
              "user-buffer",
              "The library buffer in your process",
              "Buffered writers such as C stdio, Go's bufio.Writer or Python file objects hold data in user memory until the buffer fills or is flushed. That data has not reached the kernel and is lost if the process crashes. Flushing moves it to the kernel, not to the disk.",
            ),
            concept(
              "after-write",
              "The page cache after write() returns",
              "When write() returns successfully the data is in the kernel page cache as dirty pages. It reaches the disk later through writeback, unless you call fsync or opened the file with O_SYNC. The return value says the kernel accepted the bytes, nothing more.",
            ),
            concept(
              "writeback",
              "Writeback and the dirty limits",
              "On Linux, kernel flusher threads write dirty pages in the background. By default they wake every 5 seconds and write pages that have been dirty for more than about 30 seconds, and they start sooner when dirty memory passes a background threshold (vm.dirty_background_ratio, 10% of available memory by default). So a write without fsync can be lost tens of seconds after it 'succeeded'. As dirty memory nears a higher limit (vm.dirty_ratio, 20% by default), writers are made to wait inside write(), which shows up as sudden latency.",
            ),
            concept(
              "journal-commit",
              "Metadata waiting for a journal commit",
              "Changes such as a new file's directory entry or a new size wait in memory for the next journal commit, which ext4 does every 5 seconds by default. Until then, a file you just created may not exist after a crash.",
            ),
            concept(
              "device-cache",
              "The device's volatile write cache",
              "Drives acknowledge writes while the data is still in their own RAM, and power loss empties that cache unless the drive has power-loss protection. The kernel sends an explicit cache flush command as part of fsync and journal commits. Some drives, RAID controllers and virtual disks configured for speed acknowledge a flush without making the data stable, and software above cannot detect that except by cutting power and checking.",
            ),
          ],
          { links: [TLPI_BUFFERING] },
        ),
        topic("syscalls", "Forcing data to disk", [
          concept("fsync", "fsync", undefined, {
            links: [FSYNC_MAN],
            parts: [
              concept(
                "guarantee",
                "What fsync guarantees",
                "On Linux, fsync returns once the file's data and metadata have been sent to the device and the device has been asked to flush its cache; it blocks until the device reports completion. After it returns successfully, that file's contents survive a crash, provided the device honours the flush. On macOS, fsync does not ask the drive to flush its cache; that takes fcntl with F_FULLFSYNC.",
              ),
              concept(
                "dir-entry",
                "What fsync does not cover: the directory entry",
                "fsync on a file does not make its directory entry durable; that needs an fsync on the directory. After creating or renaming a file, open the containing directory and fsync that descriptor, or the data can be safely on disk with no name pointing at it.",
              ),
            ],
          }),
          concept(
            "fdatasync",
            "fdatasync",
            "Like fsync, but it may skip metadata that is not needed to read the data back, such as the modification time. A change in file size is still flushed. It saves work when a file is overwritten in place and only its timestamps change.",
          ),
          concept(
            "close-sync",
            "close does not flush, and sync is blunt",
            "close() releases the descriptor and writes nothing to disk, so a program that writes, closes and exits successfully has made nothing durable. sync() writes out all dirty data on the whole system and syncfs() on one filesystem; a program that needs one file durable should fsync that file.",
          ),
          concept(
            "o-sync",
            "O_SYNC and O_DSYNC",
            "A file opened with O_SYNC behaves as if every write were followed by fsync, and with O_DSYNC as if followed by fdatasync. write() then returns only when the data is on stable storage.",
          ),
          concept(
            "o-direct",
            "O_DIRECT",
            "Bypasses the page cache: reads and writes go straight between your buffer and the device, and on Linux the buffer address, file offset and length must generally be multiples of the device's logical block size. Used by databases that manage their own cache. It is not a durability flag: the data may still be in the device's write cache and file metadata may be unwritten, so it is combined with O_DSYNC or fsync.",
          ),
          concept(
            "msync",
            "Memory-mapped files and msync",
            "Stores into a shared file mapping dirty the page cache just as write() does, and are written back on the same schedule. msync with MS_SYNC is the equivalent of fsync for the mapped range.",
          ),
          concept(
            "group-commit",
            "Why fsync is slow, and group commit",
            "Each fsync waits for a device flush, so one fsync per record limits a single writer to one record per flush time. Databases use group commit: batch many transactions' log records into one fsync and acknowledge them all when it returns. Only records covered by a completed fsync may be acknowledged; acknowledge earlier and a crash loses acknowledged writes.",
          ),
        ]),
        topic(
          "crash-states",
          "What a crash can and cannot leave behind",
          [
            concept(
              "torn",
              "Torn writes",
              "A write() that spans several blocks is not atomic on disk: a crash can let some of the blocks land and not others, so an in-place overwrite can leave a mix of old and new data. Storage engines guard against such torn pages by writing a second copy first: PostgreSQL logs a full image of a page the first time it changes after a checkpoint, and InnoDB writes pages to a doublewrite buffer before their real location. A checksum on each log record detects a torn record at the end of a log.",
            ),
            concept(
              "ordering",
              "Write ordering is not preserved",
              "Without fsync, the order in which writes reach the disk is not the order of your write() calls. Data written later to one file can survive while data written earlier to another is lost. The way to order two writes on disk is to fsync the first before issuing the second.",
            ),
            concept(
              "unsynced",
              "States of a file that was never fsynced",
              "After a crash, a recently created or appended file may be absent, present with length zero, or present with only part of its data. In ext4's writeback mode its tail can even contain stale blocks from deleted files.",
            ),
            concept(
              "cannot",
              "What a crash cannot do",
              "On a journaling filesystem with a device that honours flushes, a crash does not leave the filesystem structure inconsistent, does not undo anything covered by an fsync that returned success, and does not leave a rename half done: the name points at the old inode or the new one.",
            ),
            concept(
              "apps-get-it-wrong",
              "Why applications get this wrong",
              "The file API gives no direct way to say 'make this update atomic and durable', the guarantees differ between filesystems and mount options, and the failures only appear on power loss. A 2014 study of widely used databases, version control systems and distributed storage systems found crash-consistency bugs in most of the applications tested, including LevelDB, Git, HDFS and ZooKeeper, so crash behaviour has to be tested, not assumed.",
            ),
          ],
          { links: [FILES_ARE_HARD] },
        ),
        topic("atomic-rename", "The atomic-rename pattern", [
          concept(
            "in-place",
            "Why overwriting in place is unsafe",
            "Opening a file with truncation and writing the new contents passes through a state where the file is empty, then partial. A crash, or just a concurrent reader, can see those states, and the old contents are already gone.",
          ),
          concept("steps", "The four steps of a safe replacement", undefined, {
            parts: [
              concept(
                "temp",
                "Write a temp file in the same directory",
                "The new contents go to a new file beside the target, so the target is untouched while you write. It must be on the same filesystem because rename is only atomic, or possible at all, within one.",
              ),
              concept(
                "fsync-file",
                "fsync the temp file",
                "This makes the new contents durable before any name points at them. Skip it and the rename can reach the disk before the data, leaving the target empty or partial after a crash.",
              ),
              concept(
                "rename-over",
                "Rename it over the target",
                "rename within one filesystem replaces the directory entry atomically: readers see either the old file or the new one, never a partial file. Processes that already have the old file open keep reading the old inode.",
              ),
              concept(
                "fsync-dir",
                "fsync the directory",
                "The rename is a directory change that sits in memory until the journal commits. Skip this step and a crash can bring back the old version after you reported success: the file is consistent, but an acknowledged update is lost.",
              ),
            ],
          }),
          concept(
            "heuristic",
            "Why skipping the fsync sometimes appears to work",
            "With delayed allocation, renaming a new file over an old one without fsync left zero-length files after crashes. ext4 therefore detects the replace-by-rename and truncate-then-rewrite patterns and arranges for the new data to be written before the rename is committed (its auto_da_alloc option, on by default). Other filesystems behave differently and none of this is a guarantee, so correct code still calls fsync.",
          ),
          concept(
            "limits",
            "Limits of the pattern",
            "It replaces whole files, so every update costs a full rewrite. It creates a new inode, so the old file's ownership, permissions and hard links are not carried over unless you copy them. A crash can leave a stray temp file to clean up.",
          ),
          concept(
            "append-log",
            "The append-only log",
            "The other basic safe pattern: append a record describing the change, fsync, and only then acknowledge. Each record carries a length and a checksum, so on restart the reader stops at the first short or corrupt record and treats everything before it as the durable prefix. Database write-ahead logs are this pattern.",
          ),
        ]),
        topic("errors", "I/O errors and silent corruption", [
          concept(
            "late-errors",
            "Write errors arrive late",
            "write() only copies into the page cache, so an I/O error during later writeback cannot be returned by it. The error is reported by a later fsync on that file. A program that never calls fsync, or ignores its result, never learns that its data was not written.",
          ),
          concept(
            "fsyncgate",
            "Retrying a failed fsync is not safe",
            "On Linux, when writeback of a page fails the error is reported to fsync once and the page is no longer marked dirty, so a second fsync can return success although the data never reached the disk. Before Linux 4.13 the error could even go unreported altogether. This became known as 'fsyncgate' in 2018, when PostgreSQL developers found their retry logic assumed the opposite. The safe response is to treat everything since the last successful fsync as possibly lost and recover from a durable log; PostgreSQL now deliberately crashes (PANIC) on an fsync failure and recovers from its write-ahead log.",
          ),
          concept(
            "checksums",
            "Silent corruption and checksums",
            "A device can occasionally return wrong data with no error at all: a bit that flipped at rest, or a write that landed in the wrong place or never landed. ext4 and XFS checksum at most their own metadata, so corrupted file contents are passed to the application as if they were good. btrfs and ZFS checksum data as well and can repair it from a redundant copy. This is why databases checksum their own pages and log records.",
          ),
        ]),
        topic("observe", "Seeing it on a real machine", [
          concept(
            "meminfo",
            "Dirty and Writeback in /proc/meminfo",
            "You can watch the Dirty figure rise as a program writes and fall as writeback runs or after `sync`. It shows how much accepted data currently exists only in memory.",
          ),
          concept(
            "strace-sync",
            "Checking whether a program syncs",
            "You can run a program under `strace -f -e trace=fsync,fdatasync,rename,renameat,renameat2` and see whether it syncs the file and the directory, and in what order relative to the rename.",
          ),
          concept(
            "power-loss",
            "Simulating power loss",
            "A real test needs the kernel to lose its memory: hard-reset a virtual machine, or run `echo b > /proc/sysrq-trigger`, which reboots at once without syncing or unmounting. This exercises the page cache and the journal, not a physical drive's cache; for that you must cut real power.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "fsync-loss",
            "Lose acknowledged writes",
            "Write a program that appends numbered records and prints 'ack N' after each write returns. Run it in a throwaway VM, capturing its output outside the VM (over SSH or the serial console) so the acks survive, and force an instant reset (echo b > /proc/sysrq-trigger as root). After reboot, count acknowledged records that are missing. Repeat with fsync after every record, then with fsync every 100 records, and measure the throughput cost of each.",
            {
              doneWhen: [
                "Last acked record vs last record on disk, for each of the three modes",
                "Records per second for each mode and what that says about group commit",
              ],
              links: [FSYNC_MAN],
            },
          ),
          build(
            "atomic-rename",
            "Atomic file replacement",
            "Implement a safe config-file update in Go: write to a temp file in the same directory, fsync it, rename over the target, fsync the directory. Crash-test it with the reset trick and show the file is always the old or the new version, never empty or partial. Then remove one step at a time and find which omissions lose data.",
            {
              doneWhen: [
                "Link to the code",
                "Which step each failure mode needed, in your own words",
              ],
            },
          ),
          build(
            "writeup",
            "Write-up: what 'saved' means",
            "Explain the journey of a write from your program to the platter or flash: user buffer, page cache, journal, device cache. Use your own lost-write numbers.",
            { doneWhen: ["Link to the published write-up"] },
          ),
        ]),
      ],
      {
        detail: "When a write is really written, which calls make it so, and how to replace a file without ever losing it.",
        links: [FILES_ARE_HARD, TLPI_BUFFERING],
      },
    ),

    topic(
      "performance",
      "Block I/O performance",
      [
        topic("metrics", "IOPS, throughput and latency", [
          concept(
            "iops-throughput",
            "IOPS versus throughput",
            "IOPS counts operations per second and matters for small random I/O. Throughput is bytes per second and matters for large sequential I/O. A device can be limited by either. Throughput is IOPS times I/O size: 10,000 IOPS of 4 KiB is about 40 MB/s and 200 IOPS of 1 MiB is about 200 MB/s, so a figure quoted without its block size says little.",
          ),
          concept(
            "latency",
            "Latency and how it bounds IOPS",
            "Latency is the time one I/O takes from submission to completion, including time spent queued. With one request outstanding at a time, IOPS is 1 divided by latency: 0.1 ms per I/O gives at most 10,000 IOPS. With N in flight it is about N divided by latency, so headline IOPS measured at high queue depth do not apply to a single synchronous writer.",
          ),
          concept(
            "seq-random",
            "Sequential versus random, and readahead",
            "On a hard disk, random I/O pays a seek each time and moves hundreds of times fewer bytes per second than sequential I/O. On an SSD there is no seek, but sequential I/O still wins by using large requests. The kernel helps sequential readers with readahead: when it sees a file read in order through the page cache, it fetches further ahead in larger requests before the program asks.",
          ),
          concept(
            "sync-writes",
            "Synchronous writes are a separate figure",
            "A write followed by a flush is limited by how fast the device can make data stable, not by its ordinary write speed. Drives with power-loss protection can complete a flush quickly; many consumer SSDs cannot, and deliver far fewer fsyncs per second than their headline IOPS suggests.",
          ),
          concept(
            "tails",
            "Averages hide the tail",
            "Storage latency is skewed: most I/Os are fast and a few are much slower because of garbage collection, queueing or throttling. Report percentiles such as p99, because a request that touches many blocks is likely to meet one of the slow ones.",
          ),
        ]),
        topic("queues", "Queue depth and I/O schedulers", [
          concept(
            "depth",
            "Queue depth, wait time and service time",
            "The number of requests outstanding at the device at once. SSDs, NVMe drives and arrays work on many requests in parallel, so throughput rises with depth until the device saturates. Beyond that, extra requests only wait: the latency an application sees is queueing time plus the device's service time, and it climbs even though the device is no slower.",
          ),
          concept(
            "concurrency",
            "Where queue depth comes from",
            "A blocking read or write issues one I/O and waits, so one thread gives a queue depth of one. Depth comes from many threads, or from asynchronous interfaces such as Linux AIO and io_uring that submit many requests and collect completions later.",
          ),
          concept(
            "schedulers",
            "I/O schedulers",
            "The block layer can reorder queued requests. On Linux the choices are `none` (pass requests straight through, usual for NVMe), `mq-deadline` (sort by position but bound how long any request waits), `bfq` (share the device fairly between processes) and `kyber` (limit queue depth to meet latency targets on fast devices). Reordering mattered most for avoiding seeks on hard disks; the active one is shown in /sys/block/<dev>/queue/scheduler.",
          ),
        ]),
        topic("cache", "The page cache and benchmarks", [
          concept(
            "cached-io",
            "Buffered tests measure memory",
            "A second read of a file is served from the page cache and never touches the device, and a buffered write test that ends before writeback has only timed copying into RAM. A `dd` write test can report speeds no disk could reach unless you add `oflag=direct` or `conv=fsync`.",
          ),
          concept(
            "drop-caches",
            "Direct I/O and dropping the cache",
            "To measure the device, use direct I/O, or empty the cache first with `sync; echo 3 > /proc/sys/vm/drop_caches`. Buffered I/O measures what an ordinary application sees, cache included. Both are valid measurements, but you must know which one you took.",
          ),
        ]),
        topic("iostat", "Observing block I/O: iostat and beyond", [
          concept(
            "rates",
            "Where the numbers come from, and the rate columns",
            "The kernel keeps per-device counters in /proc/diskstats, and `iostat -x 1` prints their change over each interval; the first report covers the time since boot (-z hides idle devices). r/s and w/s are operations per second, rkB/s and wkB/s are kilobytes per second, and rareq-sz and wareq-sz are the average request sizes in kilobytes.",
          ),
          concept(
            "await",
            "await and aqu-sz",
            "r_await and w_await are the average milliseconds from a request being queued in the block layer to its completion, so they include queueing as well as device time, and being averages they hide the tail. aqu-sz is the average number of requests queued or in service.",
          ),
          concept(
            "util",
            "%util and why it misleads",
            "%util is the share of the interval in which at least one request was outstanding. For a device that does one thing at a time, 100% means saturated. For SSDs, NVMe drives and arrays that serve requests in parallel, 100% only means the device was never idle; it may have plenty of capacity left.",
          ),
          concept(
            "iowait",
            "iowait is not a disk metric",
            "The CPU's %iowait is time a CPU was idle while some task waited on I/O. It falls when other work keeps the CPU busy and it does not say which device is slow, so read the per-device figures, or the I/O pressure numbers in /proc/pressure/io.",
          ),
          concept(
            "per-process",
            "Finding the process responsible",
            "`pidstat -d` and `iotop` show bytes read and written per process. They count a buffered write when the page is dirtied, not when it reaches the device, so the device activity in iostat can come seconds after the process that caused it.",
          ),
          concept(
            "latency-dist",
            "Latency distributions: biolatency and biosnoop",
            "iostat gives only averages per interval. The BPF tools `biolatency`, which prints a histogram of block I/O latency, and `biosnoop`, which prints one line per I/O with its process, size and latency, show the shape of the distribution and the individual slow requests. Both come with the bcc tools and need root.",
          ),
        ]),
        topic(
          "fio",
          "Measuring with fio",
          [
            concept(
              "what",
              "What fio does",
              "fio generates a described I/O workload against a file or device and reports IOPS, throughput and latency percentiles. Each run is a job, defined by options on the command line or in a job file.",
            ),
            concept("params", "What the job parameters mean", undefined, {
              parts: [
                concept(
                  "rw-bs",
                  "rw and bs: pattern and block size",
                  "rw=read and rw=write are sequential, randread and randwrite pick random offsets, and randrw mixes reads and writes (rwmixread sets the read percentage). bs is the size of each I/O: 4k random tests IOPS, 1M sequential tests throughput.",
                ),
                concept(
                  "target",
                  "filename, size and direct: the target",
                  "filename and size give the file or device to use and how much of it to cover. A write job pointed at a raw device destroys what is on it; a file on a mounted filesystem also measures that filesystem. direct=1 opens the target with O_DIRECT so the result reflects the device; without it, reads may come from RAM and writes may only reach RAM.",
                ),
                concept(
                  "engine-depth",
                  "ioengine and iodepth",
                  "The engine is how fio issues I/O: psync uses blocking pread and pwrite, while libaio and io_uring submit asynchronously. iodepth is how many I/Os an asynchronous engine keeps in flight per job. It has no effect with a synchronous engine, and libaio only queues properly with direct=1.",
                ),
                concept(
                  "numjobs-time",
                  "numjobs, runtime and time_based",
                  "numjobs runs that many copies of the job, which is how to get concurrency from a synchronous engine; group_reporting sums them into one result. runtime with time_based runs for a fixed duration instead of stopping when `size` bytes are done.",
                ),
                concept(
                  "fsync-opt",
                  "fsync: sync every N writes",
                  "fsync=N calls fsync after every N writes (fdatasync=N does the same with fdatasync). With fsync=1 the job models a commit log: the result is bounded by flush latency, and fio prints the sync latency in its own section of the output. Check that section is present, because fio's documentation says the sync may be skipped when the job uses direct I/O.",
                ),
              ],
            }),
            concept(
              "output",
              "Reading fio output",
              "You can find IOPS and bandwidth for each job and read the latency sections: slat is the time to submit an I/O, clat the time from submission to completion, lat the total, and the clat percentiles give p50, p99 and beyond. IOPS times block size should match the bandwidth.",
            ),
            concept(
              "pitfalls",
              "What makes a benchmark result wrong",
              "Testing through the page cache; a run too short to exhaust an SSD's fast cache or a cloud volume's burst allowance; a fresh SSD that has never been filled; and a block size, queue depth or sync pattern unlike the real workload. A commit log is small sequential writes with a sync after each, a B-tree database is small random reads and writes, a backup is large sequential I/O.",
            ),
          ],
          { links: [FIO_DOCS] },
        ),
        topic("build", "Build it", [
          build(
            "fio-lab",
            "Measure a disk with fio",
            "Against a test file on the filesystem you want to measure (never a raw device that holds data), run four fio jobs with direct I/O: 4k random read, 4k random write, 1M sequential read, 1M sequential write. Add a commit-log run of small sequential writes with --fsync=1 and confirm fio prints a sync latency section. Record IOPS, MB/s and p99 latency, and watch `iostat -xz 1` alongside. If you are on a cloud volume, compare with the provider's stated limits.",
            {
              doneWhen: ["A table of IOPS, throughput and p99 latency for the five runs"],
              links: [FIO_DOCS],
            },
          ),
        ]),
      ],
      {
        detail: "What a device can do per second, how to measure it honestly, and how to read the numbers.",
        links: [SYSPERF],
      },
    ),

    topic(
      "layered",
      "Layered and copy-on-write filesystems",
      [
        topic("why", "Why layer filesystems", [
          concept(
            "problem",
            "The problem: many near-identical root filesystems",
            "A hundred containers from the same image need the same thousands of files, each with a few private changes. Copying the whole tree for every container wastes disk and start-up time, and sharing one writable tree would let them interfere with each other.",
          ),
          concept(
            "cow",
            "Copy-on-write and union mounts",
            "Copy-on-write shares one read-only copy among everyone and makes a private copy only when someone writes: readers pay nothing and the first write pays for the copy. A union mount applies this to directories, presenting several trees stacked into one merged view in which upper trees take precedence over lower ones.",
          ),
          concept(
            "file-vs-block",
            "File-level versus block-level copy-on-write",
            "overlayfs copies whole files and works on top of ordinary filesystems. Block-level schemes (btrfs and ZFS snapshots, device-mapper thin provisioning, qcow2 images) copy only the blocks that change, but tie you to one filesystem or image format.",
          ),
        ]),
        topic(
          "overlayfs",
          "overlayfs",
          [
            concept("dirs", "The four directories", undefined, {
              parts: [
                concept(
                  "lowerdir",
                  "lowerdir",
                  "One or more read-only directories, given in the mount option separated by colons with the topmost first. overlayfs never modifies them.",
                ),
                concept(
                  "upperdir",
                  "upperdir",
                  "The single writable directory. Every new file, changed file and deletion made through the mount is recorded here. Its filesystem must support extended attributes and report file types in directory listings, which rules out NFS.",
                ),
                concept(
                  "workdir",
                  "workdir",
                  "A directory on the same filesystem as upperdir, reserved for overlayfs's own use. The kernel prepares files there and then moves them into upperdir with a rename, so each change appears atomically.",
                ),
                concept(
                  "merged",
                  "The merged mount point",
                  "Where the combined view appears: `mount -t overlay overlay -o lowerdir=L1:L2,upperdir=U,workdir=W MERGED`. With only lower directories and no upperdir, the overlay is read-only.",
                ),
              ],
            }),
            concept(
              "lookup",
              "How a name is looked up",
              "For each name overlayfs checks upper first, then each lower in order. A file found in a higher layer hides any file of the same name below it. Directories of the same name are merged, so listing one shows the union of their entries.",
            ),
            concept(
              "reads",
              "Reading an unmodified file costs nothing extra",
              "Opening a lower file that has not been changed gives you the lower filesystem's own file. Its data is read and cached as if there were no overlay, and every overlay that shares that lower layer shares the same page cache pages.",
            ),
            concept(
              "copy-up",
              "Copy-up",
              "When a file from a lower layer is first opened for writing, or has its metadata changed, the whole file is copied to the upper layer and the modification applies there. The lower layer never changes. From then on it is an ordinary file in upper and writes cost nothing extra.",
            ),
            concept(
              "whiteout",
              "Whiteouts and opaque directories",
              "A deletion cannot touch the lower layer, so overlayfs records a whiteout: a special character device (0/0) in the upper layer, with the deleted name, that hides the lower entry. If a lower directory is removed and recreated, the new upper directory is marked opaque with an extended attribute so the old lower contents are not merged into it.",
            ),
            concept(
              "quirks",
              "Where overlayfs differs from a normal filesystem",
              "A lower file opened read-only and mapped with MAP_SHARED does not see changes made after the file is copied up. Copying up a file that has several hard links breaks the link unless the index feature is on. Unless the redirect_dir feature is on, renaming a directory that comes from a lower layer fails with EXDEV and `mv` falls back to copying. Changing a lower or upper directory directly while the overlay is mounted gives undefined behaviour.",
            ),
          ],
          { links: [OVERLAY_DOCS] },
        ),
        topic("images", "Why container images are layered", [
          concept(
            "image",
            "An image is a stack of read-only layers",
            "Each layer is an archive of the files added, changed or deleted by one build step, identified by the hash of its content. Unpacked, the layers become the lower directories of an overlay, and each container adds its own empty upperdir on top.",
          ),
          concept(
            "sharing",
            "What layering buys",
            "Layers shared between images are stored once, downloaded once and cached in memory once. A rebuild reuses every layer whose inputs did not change, and starting a container creates an empty directory instead of copying a root filesystem.",
          ),
          concept(
            "no-shrink",
            "Deleting in a later layer frees nothing",
            "A file added in one layer and removed in the next is still stored and shipped in the first; the whiteout only hides it. To keep an image small, create and delete temporary files within the same build step.",
          ),
          concept(
            "writable-layer",
            "The container's writable layer is disposable",
            "Everything a container writes goes to its upperdir, which is deleted with the container. Data that must outlive the container, or that is written heavily, belongs on a volume: a host directory mounted into the container that bypasses overlayfs.",
          ),
        ]),
        topic("traps", "Performance traps", [
          concept(
            "big-copy-up",
            "Copy-up of large files and whole trees",
            "The first write to a file from the image copies all of it, even to change one byte, so modifying a multi-gigabyte database file shipped in the image stalls for the copy and stores the file twice. A recursive chown or chmod does the same to every file it touches, unless overlayfs's metadata-only copy-up feature is enabled. Keep large, frequently written files on a volume.",
          ),
          concept(
            "many-layers",
            "Many layers",
            "A lookup that misses in upper falls through the lower layers in order, so deep stacks make uncached lookups slower, and every layer adds download and unpack work. There is also a hard limit on the number of lower layers.",
          ),
        ]),
        topic("block-cow", "Block-level copy-on-write", [
          concept(
            "cow-fs",
            "Copy-on-write filesystems",
            "btrfs and ZFS do not overwrite live blocks. A change writes new blocks, then new copies of the metadata blocks that point at them, up to the root, which is switched in one atomic update, so the structure is always consistent without a journal. The cost is fragmentation: a file that is randomly overwritten, such as a database file or VM disk image, ends up scattered across the device.",
          ),
          concept(
            "snapshots",
            "Snapshots and reflinks",
            "A snapshot is a second root pointing at the same blocks, so it is created instantly and uses space only as the live filesystem diverges from it. A reflink copy (`cp --reflink`) does the same for one file, on btrfs and XFS. Neither is a backup: the shared blocks live on the same device.",
          ),
          concept(
            "qcow2",
            "Layered VM disk images",
            "The same idea underneath a virtual machine: a qcow2 image can name a read-only backing file and store only the clusters the guest has changed. Many VMs can boot from one base image, each with a small private overlay.",
          ),
        ]),
        topic("observe", "Seeing it on a real machine", [
          concept(
            "find-overlay",
            "Finding an overlay's directories and reading upper",
            "`findmnt -t overlay` or /proc/mounts shows each overlay with its lowerdir, upperdir and workdir options, so you can find the directories behind a running container's root filesystem. Listing that upperdir with `ls -la` shows exactly what changed: new and copied-up files as regular files, and whiteouts as character devices with device numbers 0, 0. `du` on it gives the space the writable layer uses.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "overlay-lab",
            "overlayfs by hand",
            "Mount an overlay with a lower, upper and work directory. Modify a lower file and watch the copy-up appear in upper. Delete a lower file and find the whiteout. Stack two lower layers. This is how container images and some VM root filesystems are layered.",
            {
              doneWhen: ["`ls -la` of upper after a modify and a delete, with the whiteout identified"],
              links: [OVERLAY_DOCS],
            },
          ),
        ]),
      ],
      {
        detail: "How many containers share one set of files: union mounts, copy-up, whiteouts and what they cost.",
      },
    ),
  ],
);
