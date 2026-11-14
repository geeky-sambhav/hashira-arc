import { build, concept, link, section, topic } from "../dsl";

const HPBN = link("High Performance Browser Networking", "https://hpbn.co/");
const BEEJ = link("Beej's Guide to Network Programming", "https://beej.us/guide/bgnet/");
const WEBRTC_CURIOUS = link("WebRTC for the Curious", "https://webrtcforthecurious.com/");

export default section(
  "networking",
  {
    title: "Networking",
    summary:
      "How bytes get from one process to another: packets and addresses, TCP from the socket up, the stalls and timeouts behind real outages, TLS, DNS and HTTP, and the Linux virtual networking every container and microVM plugs into.",
  },
  [
    topic(
      "packets",
      "Packets and addressing",
      [
        topic("layers", "Why networks are layered", [
          concept(
            "problem",
            "The problem: two programs on different machines",
            "A network only moves small, unreliable chunks of bytes between neighbouring machines. Everything else (finding the machine, finding the program, ordering, retrying) is built on top, one layer per problem.",
          ),
          concept(
            "stack",
            "The four layers and what each one solves",
            "Link moves a frame to the next device, IP gets a packet to the right machine across many links, transport (TCP/UDP) gets data to the right program, and the application protocol gives the bytes meaning. They are still numbered from the older OSI model: link is layer 2, IP layer 3, transport layer 4, application layer 7.",
          ),
          concept(
            "encapsulation",
            "Encapsulation: headers wrapped around headers",
            "Each layer adds its own header in front of the payload from the layer above, so an HTTP request travels inside a TCP segment inside an IP packet inside an Ethernet frame. Each hop only reads the headers for its layer.",
          ),
          concept(
            "best-effort",
            "IP is best effort",
            "IP may drop, duplicate, delay or reorder packets and tells nobody. Reliability is not in the network; it is added by the endpoints.",
          ),
        ]),
        topic("link", "The link layer", [
          concept(
            "ethernet",
            "Ethernet frames and MAC addresses",
            "A frame carries a source and destination MAC address and is only meaningful on one local network. MAC addresses identify network interfaces, not machines on the internet.",
          ),
          concept(
            "arp",
            "ARP: from an IP address to a MAC address",
            "Before sending to an IP on the same network, the host broadcasts 'who has this IP' and caches the MAC in the reply. For anything off-network it resolves the gateway's MAC instead.",
          ),
          concept(
            "switch-vs-router",
            "Switch versus router",
            "A switch forwards frames by MAC address inside one network (layer 2). A router forwards packets by IP address between networks (layer 3) and rewrites the frame's MAC addresses at every hop.",
          ),
        ]),
        topic("ip", "IP addresses and routing", [
          concept(
            "cidr",
            "Addresses, prefixes and CIDR",
            "An IPv4 address is 32 bits, split into a network prefix and a host part; /24 means the first 24 bits name the network. You can tell from the prefix whether two addresses are on the same network.",
          ),
          concept(
            "special-ranges",
            "Private, loopback and link-local ranges",
            "10/8, 172.16/12 and 192.168/16 are private and not routable on the internet; 127/8 never leaves the host; 169.254/16 is link-local (valid only on one link, never routed). A private address therefore cannot be the source of a packet on the internet without being rewritten on the way out (NAT, below).",
          ),
          concept(
            "routing-table",
            "The routing table and longest-prefix match",
            "For each packet the kernel picks the most specific matching route, which names an outgoing interface and optionally a next-hop gateway. The default route (0.0.0.0/0) catches everything else.",
          ),
          concept(
            "ttl",
            "TTL and how traceroute works",
            "Every router decrements TTL and drops the packet at zero with an ICMP 'time exceeded' reply, so a routing loop cannot circulate a packet forever. Traceroute sends packets with TTL 1, 2, 3 and so on to make each hop reveal itself.",
          ),
          concept(
            "icmp",
            "ICMP: the network's error channel",
            "Echo request and reply (ping), destination unreachable, time exceeded and fragmentation needed are all ICMP. Blocking all ICMP breaks path MTU discovery.",
          ),
          concept(
            "mtu",
            "MTU, fragmentation and path MTU discovery",
            "A link carries at most MTU bytes per IP packet (1500 on Ethernet). A router that cannot fit a packet into the next link either fragments it (IPv4 only, and only if the sender allowed it) or drops it and returns an ICMP 'fragmentation needed' message, which the sender uses to send smaller packets. When a firewall eats that message, large transfers hang while small ones work.",
          ),
          concept(
            "dhcp",
            "DHCP: how a host gets its configuration",
            "A host joining a network broadcasts a DHCP request and is leased an address, prefix length, default gateway and DNS resolvers. This is where the default route and the resolver list on most machines come from.",
          ),
          concept(
            "ipv6",
            "IPv6: what stays the same and what changes",
            "Addresses are 128 bits written in hex groups, with the same prefix and longest-prefix-match rules. The differences that bite: neighbour discovery over ICMPv6 replaces ARP (so blocking all ICMPv6 breaks the link itself), routers never fragment and every link must carry at least 1280 bytes, every interface has a link-local fe80::/10 address, and NAT is usually unnecessary.",
          ),
          concept(
            "dual-stack",
            "Dual stack and Happy Eyeballs",
            "Most hosts have both an IPv4 and an IPv6 address, and a name can resolve to addresses of both families. Clients start the IPv6 attempt first, start IPv4 a fraction of a second later if it has not connected, and keep whichever wins, so a broken IPv6 path shows up as a small delay rather than a failure.",
          ),
        ]),
        topic("transport", "Ports, TCP, UDP and NAT", [
          concept(
            "ports",
            "Ports and the transport layer",
            "IP delivers to a machine; a 16-bit port number picks the program. A TCP connection is identified by the 4-tuple of source IP, source port, destination IP and destination port.",
          ),
          concept(
            "tcp-vs-udp",
            "What TCP promises and what UDP promises",
            "TCP gives an ordered, reliable byte stream with flow and congestion control. UDP gives independent datagrams with no delivery, ordering or pacing guarantees and no connection setup.",
          ),
          concept(
            "nat",
            "NAT: many private hosts behind one public address",
            "A NAT router rewrites the source address and port of outgoing packets to its own public address and remembers the mapping so it can reverse it on the replies. Inbound packets that match no mapping are dropped, so hosts behind NAT can start connections but cannot receive them. The Linux mechanics are in Linux virtual networking below.",
          ),
        ]),
        topic("observe", "Seeing it on a real machine", [
          concept(
            "ip-tools",
            "ip addr, ip route, ip neigh",
            "You can read a host's interfaces and addresses, predict which route a destination will take with `ip route get`, and inspect the neighbour (ARP) cache.",
          ),
          concept(
            "ping-mtr",
            "ping, traceroute and mtr",
            "You can tell 'host unreachable' from 'host up but port closed', and use mtr to find the hop where loss or latency starts. Routers rate-limit their own ICMP replies, so loss shown at a middle hop only matters if it continues to the final hop.",
          ),
          concept(
            "tcpdump",
            "Reading a tcpdump capture",
            "You can capture on a chosen interface with a filter, and read the addresses, ports, TCP flags, sequence and ACK numbers and window size on each line.",
            { links: [link("tcpdump manual", "https://www.tcpdump.org/manpages/tcpdump.1.html")] },
          ),
        ]),
      ],
      {
        detail: "What a packet is, how it finds the right machine, and how to watch it happen.",
        links: [BEEJ, HPBN],
      },
    ),

    topic(
      "tcp",
      "Sockets and TCP",
      [
        topic("sockets", "The socket API", [
          concept(
            "socket-fd",
            "A socket is a file descriptor",
            "socket() returns an fd that you read, write and close like a file. The kernel owns the connection state and buffers behind it.",
          ),
          concept(
            "server-calls",
            "Server side: bind, listen, accept",
            "bind claims a local address and port, listen turns the socket into a listener with a backlog, and accept returns a new socket per connection. The listening socket never carries data itself.",
          ),
          concept(
            "client-calls",
            "Client side: connect",
            "connect has the kernel pick an unused (ephemeral) source port and perform the handshake; it returns when the connection is established or fails.",
          ),
          concept(
            "byte-stream",
            "TCP is a byte stream, not messages",
            "One write can arrive as several reads and several writes as one read. A protocol on TCP must frame its own messages with a delimiter or a length prefix.",
          ),
          concept(
            "blocking-io",
            "Blocking reads, short writes and deadlines",
            "read blocks until some data, EOF or an error arrives, and may return fewer bytes than asked for; write blocks when the send buffer is full, and on a non-blocking socket may accept only part of the data. Without a deadline, a read from a silent peer blocks forever.",
          ),
        ]),
        topic("lifecycle", "Connection lifecycle", [
          concept("handshake", "The three-way handshake", undefined, {
            parts: [
              concept(
                "steps",
                "SYN, SYN-ACK, ACK",
                "The client sends SYN with its initial sequence number, the server replies SYN-ACK with its own, and the client ACKs. Each side has now acknowledged the other's sequence number, at the cost of one round trip before any data.",
              ),
              concept(
                "isn",
                "Why initial sequence numbers are unpredictable",
                "A random starting number stops an off-path attacker from forging segments into a connection, and stops stale segments from an older connection on the same 4-tuple from being accepted.",
              ),
              concept(
                "queues",
                "The SYN queue and the accept queue",
                "Half-open connections (SYN received, final ACK not yet) wait in the SYN queue; fully established ones wait in the accept queue until the application calls accept. On Linux the accept queue holds the listen backlog, capped by net.core.somaxconn.",
              ),
              concept(
                "syn-cookies",
                "SYN floods and SYN cookies",
                "An attacker can fill the SYN queue with SYNs from forged addresses that never complete. When the queue overflows, Linux by default stops storing state and encodes it in the sequence number of the SYN-ACK instead, rebuilding the connection only if a valid final ACK comes back.",
              ),
              concept(
                "backlog-full",
                "What a full accept queue looks like",
                "By default Linux silently drops new SYNs, and ignores the final ACK of a handshake it cannot queue (so the server resends its SYN-ACK). Clients see connects that are slow or time out, or a connect that succeeds and then stalls on its first request. It means the application is not calling accept fast enough; setting tcp_abort_on_overflow makes the kernel send an RST instead.",
              ),
            ],
          }),
          concept(
            "refused-vs-dropped",
            "Connection refused versus no answer",
            "An RST means the host is reachable but nothing listens on that port, so connect fails at once. Silence means the SYN was dropped, so the client retransmits with exponential backoff until its timeout.",
          ),
          concept("close", "Closing a connection", undefined, {
            parts: [
              concept(
                "fin",
                "The four-step close",
                "Each direction is closed separately: FIN, ACK, then FIN and ACK the other way (the middle two are often sent as one segment). A read returning EOF means the peer sent FIN.",
              ),
              concept(
                "half-close",
                "Half-close",
                "shutdown(SHUT_WR) sends FIN but keeps the read side open, so a client can say 'no more input' and still receive the reply.",
              ),
              concept(
                "time-wait",
                "TIME_WAIT and why it exists",
                "The side that closes first keeps the connection's 4-tuple for twice the maximum segment lifetime (a fixed 60 s on Linux) so late segments from the old connection die out and the final ACK can be resent if the peer's FIN arrives again. By default a new outgoing connection cannot use that 4-tuple meanwhile.",
              ),
              concept(
                "close-wait",
                "CLOSE_WAIT means an application bug",
                "The peer has closed but the local program never called close. A growing pile of CLOSE_WAIT sockets is a descriptor leak in your code, not a network problem.",
              ),
              concept(
                "rst",
                "When a connection is reset",
                "An RST aborts the connection immediately, with no guarantee that data already sent was delivered. A host sends one in reply to a segment for a connection it has no state for (closed port, or it rebooted), when a process closes a socket that still has unread received data (Linux), or when a socket is closed with a zero linger timeout; middleboxes also forge them. The peer sees 'connection reset by peer'.",
              ),
            ],
          }),
          concept(
            "reuse",
            "SO_REUSEADDR and SO_REUSEPORT",
            "SO_REUSEADDR lets a restarted server bind its port while connections from the previous run are still in TIME_WAIT; without it bind fails with 'address already in use'. On Linux, SO_REUSEPORT lets several sockets bind the same address and port, and the kernel spreads incoming connections across them, one accept queue per socket.",
          ),
        ]),
        topic("reliability", "Reliable delivery", [
          concept(
            "seq-ack",
            "Sequence numbers and cumulative ACKs",
            "Every byte has a sequence number; an ACK names the next byte the receiver expects, which acknowledges everything before it.",
          ),
          concept(
            "retransmit",
            "Retransmission: timeout and fast retransmit",
            "A segment is resent when its retransmission timer (derived from measured round-trip time, and at least 200 ms on Linux by default) expires, or sooner when duplicate ACKs (classically three) show that later data arrived without it. Timeouts back off exponentially.",
          ),
          concept(
            "sack",
            "Selective acknowledgements",
            "A cumulative ACK cannot say which segments beyond a gap have arrived. SACK blocks in the ACK list the ranges already received, so the sender resends only what is missing instead of everything after the hole. It is negotiated in the SYN and enabled by default on Linux.",
          ),
          concept(
            "hol",
            "Head-of-line blocking",
            "TCP delivers bytes in order, so one lost segment holds back everything behind it until the retransmission arrives, even if the later data is already in the receive buffer.",
          ),
        ]),
        topic("flow", "Flow control and congestion control", [
          concept(
            "buffers",
            "Send and receive buffers",
            "write copies into the kernel send buffer and returns; the peer's kernel holds data in a receive buffer until the application reads it. A successful write does not mean the peer received anything.",
          ),
          concept(
            "rwnd",
            "The receive window",
            "Flow control protects the receiver: each ACK advertises how much buffer space is left, and the sender may not send beyond it.",
          ),
          concept(
            "options",
            "Options agreed in the SYN: MSS, window scale, SACK",
            "In the handshake each side announces its maximum segment size (the MTU minus the IP and TCP headers: 1460 bytes on a 1500-byte IPv4 link), a window scale factor (the header's window field is 16 bits, so without scaling a window cannot exceed 64 KB), and whether it supports selective ACKs and timestamps. These can only be negotiated in the SYN and SYN-ACK.",
          ),
          concept(
            "zero-window",
            "A zero window and a stalled reader",
            "When the application stops reading, the advertised window shrinks to zero and the sender pauses, sending occasional window probes. This is how backpressure travels through TCP.",
          ),
          concept(
            "cwnd",
            "The congestion window",
            "Congestion control protects the network: the sender keeps its own limit (cwnd) and sends no more than the smaller of cwnd and the receive window.",
          ),
          concept(
            "slow-start",
            "Slow start and congestion avoidance",
            "cwnd starts small (10 segments on Linux) and doubles every round trip until loss or a threshold, then grows slowly and is cut back on loss. This is why a new connection is slow for its first few round trips and why connection reuse matters. By default Linux also shrinks cwnd again after a connection has sat idle.",
          ),
          concept(
            "loss-vs-delay",
            "Loss-based versus model-based control",
            "CUBIC, the usual Linux default, treats packet loss as the congestion signal, so it fills the buffers on the path until one overflows. BBR estimates the bottleneck bandwidth and round-trip time and paces to that instead. You can explain why random loss on a wireless link hurts a loss-based algorithm.",
          ),
        ]),
        topic("ports", "Ephemeral ports", [
          concept(
            "range",
            "Where source ports come from",
            "On Linux, outgoing connections take a source port from net.ipv4.ip_local_port_range (32768 to 60999 by default, about 28,000 ports). For a plain connect the limit applies per source IP, destination IP and destination port, because only the whole 4-tuple must be unique.",
          ),
          concept(
            "long-lived",
            "Why long-lived connections are the fix",
            "Reusing a pooled connection needs no new port and no new handshake, so it avoids both port exhaustion and slow start.",
            {
              links: [
                link(
                  "How to stop running out of ephemeral ports",
                  "https://blog.cloudflare.com/how-to-stop-running-out-of-ephemeral-ports-and-start-to-love-long-lived-connections/",
                ),
              ],
            },
          ),
        ]),
        topic("observe", "Seeing TCP state", [
          concept(
            "ss",
            "ss -tan and the state column",
            "You can list sockets with their state (LISTEN, SYN-SENT, ESTAB, FIN-WAIT-1, FIN-WAIT-2, CLOSE-WAIT, LAST-ACK, TIME-WAIT) and read Recv-Q and Send-Q: bytes not yet read by the application and bytes not yet acknowledged by the peer. On a listening socket they are instead the current accept queue length and its limit.",
            { links: [link("The quantum state of a TCP port", "https://blog.cloudflare.com/the-quantum-state-of-a-tcp-port/")] },
          ),
          concept(
            "ss-info",
            "Per-connection internals with ss -ti",
            "`ss -ti` adds the kernel's view of each connection: smoothed round-trip time, retransmission timeout, congestion window and slow-start threshold. You can use it to tell a connection limited by the network from one limited by the application.",
          ),
          concept(
            "counters",
            "Kernel TCP counters",
            "`nstat` prints the kernel's protocol counters. You can watch retransmitted segments climb under loss, and ListenOverflows and ListenDrops climb when an accept queue is full.",
          ),
          concept(
            "flags",
            "Reading TCP flags in a capture",
            "You can find the handshake, data, ACKs, FINs and RSTs in tcpdump output and say which side closed first.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "tcp-go",
            "A TCP server and client, watched in tcpdump",
            "Write a line-based TCP server and client in Go with read and write deadlines. Run them in two network namespaces or two VMs. Capture with tcpdump and label the handshake, data, ACKs and the four-step close. Show the window size changing when the reader stops reading.",
            {
              doneWhen: [
                "Annotated tcpdump of one full connection",
                "A capture showing the advertised window shrinking to zero with a stalled reader",
              ],
            },
          ),
          build(
            "tcp-states",
            "Produce every TCP state on purpose",
            "Using `ss -tan` and tcpdump, produce and record: a connection refused (RST), a SYN that is silently dropped, a full accept queue, a half-closed connection, CLOSE_WAIT from a server that never closes, and TIME_WAIT.",
            { doneWhen: ["`ss` output for each state next to the command that caused it"] },
          ),
        ]),
      ],
      {
        detail: "The connection state machine, seen from the socket API and in packets.",
        links: [BEEJ, HPBN],
      },
    ),

    topic(
      "stalls",
      "Stalls and timeouts",
      [
        topic("nagle", "The 40 ms mystery", [
          concept(
            "nagle-alg",
            "Nagle's algorithm",
            "To avoid floods of tiny packets, TCP holds a small segment back while earlier data is still unacknowledged, and sends it when the ACK arrives or a full segment accumulates.",
          ),
          concept(
            "delayed-ack",
            "Delayed ACKs",
            "A receiver may hold an ACK back for a short time, hoping to piggyback it on a reply or acknowledge two segments at once. On Linux the delay is typically about 40 ms and at most 200 ms; the TCP standard allows up to 500 ms.",
          ),
          concept(
            "interaction",
            "How the two combine into a stall",
            "With write-write-read, the second small write waits for an ACK of the first, while the receiver delays that ACK because it has no reply to send yet. Each request gains about 40 ms on Linux.",
            { links: [link("It's always TCP_NODELAY", "https://brooker.co.za/blog/2024/05/09/nagle.html")] },
          ),
          concept(
            "nodelay",
            "TCP_NODELAY and when to set it",
            "It disables Nagle so small writes go out immediately. Right for request-response and interactive protocols; combine it with writing each message in one call, or every small write becomes its own packet. Go's net package sets it on TCP connections by default; many other stacks do not.",
          ),
        ]),
        topic("timeouts", "Timeouts", [
          concept(
            "kinds",
            "Connect, read and total timeouts",
            "A connect timeout bounds the handshake, a read timeout bounds waiting for data on an open connection, and a total deadline bounds the whole request. A server that accepts but never replies only trips the read timeout.",
          ),
          concept(
            "defaults",
            "Why library defaults are dangerous",
            "Many clients have no read timeout at all, and the Linux kernel keeps retrying a dropped SYN for over two minutes by default (tcp_syn_retries is 6). You can state the timeout policy you would ship.",
          ),
          concept(
            "drop-vs-reject",
            "DROP versus REJECT",
            "REJECT answers with an error at once (an ICMP unreachable message or a TCP RST), so connect fails fast. DROP gives no signal, so the client waits out its full timeout. This is why firewalls that drop make failures slow instead of fast.",
          ),
          concept(
            "dead-peer",
            "A dead peer is silent",
            "If the other host loses power or a NAT forgets the flow, no FIN or RST arrives and an idle connection looks healthy forever. Only a read timeout, an application heartbeat or TCP keepalive detects it, and keepalive is off unless the program enables it; on Linux its first probe then goes out after 2 hours idle by default.",
          ),
          concept(
            "stuck-write",
            "Writing to a dead peer",
            "Writes keep succeeding into the send buffer while the kernel retransmits with growing backoff. With Linux defaults (tcp_retries2 is 15) it gives up and returns an error only after roughly 15 minutes or more. A per-socket TCP_USER_TIMEOUT or an application deadline bounds it.",
          ),
          concept(
            "netem",
            "Injecting delay and loss with tc netem",
            "You can add latency, jitter and packet loss to an interface to see how a client behaves on a bad network.",
            { links: [link("tc-netem", "https://man7.org/linux/man-pages/man8/tc-netem.8.html")] },
          ),
        ]),
        topic("exhaustion", "Running out of ports", [
          concept(
            "eaddrnotavail",
            "EADDRNOTAVAIL on connect",
            "It means no free ephemeral port for that destination, usually because many short-lived connections are sitting in TIME_WAIT.",
          ),
          concept(
            "pooling",
            "The fix is pooling, not sysctls",
            "A pool of reused connections removes the churn that fills TIME_WAIT. Tuning kernel settings to recycle TIME_WAIT sockets treats the symptom and weakens a safety mechanism.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "nagle-lab",
            "Reproduce the Nagle and delayed-ACK stall",
            "Write a client that sends a request as two small writes then reads the reply, against a server that replies only after the full request. Run across two namespaces or hosts, not loopback. Find the roughly 40 ms gaps in tcpdump, then set TCP_NODELAY and show them gone.",
            {
              doneWhen: [
                "tcpdump timestamps showing the stall",
                "Request latency distribution before and after TCP_NODELAY",
              ],
            },
          ),
          build(
            "timeouts-lab",
            "Timeouts under packet loss",
            "Use `tc netem` to add delay and loss, and nftables rules to DROP versus REJECT. Measure how long a default Node (undici) and Python (httpx) client takes to fail in each case: unreachable host, dropped SYN, server that accepts but never replies. Then set explicit connect and read timeouts.",
            {
              doneWhen: [
                "A table of time-to-failure for each case, with defaults and with explicit timeouts",
                "A note on which defaults were dangerous and the timeout policy you would ship",
              ],
            },
          ),
          build(
            "time-wait-lab",
            "Run out of ports",
            "Open and close connections to one destination in a tight loop, with the client closing first, until connect fails with EADDRNOTAVAIL. Run it across two namespaces or hosts, not loopback: recent Linux kernels let loopback connections reuse TIME_WAIT ports by default. Count sockets in TIME_WAIT with `ss`. Fix it with a connection pool rather than sysctls, and explain why TIME_WAIT exists.",
            { doneWhen: ["The error, the TIME_WAIT count, and the same load succeeding with a pool"] },
          ),
        ]),
      ],
      { detail: "The request that takes 40 ms too long, and the one that hangs forever." },
    ),

    topic(
      "tls",
      "TLS",
      [
        topic("goals", "What TLS is for", [
          concept(
            "guarantees",
            "Confidentiality, integrity, authentication",
            "TLS hides the bytes from observers, detects any modification in transit, and proves the server (and optionally the client) holds the private key for its certificate.",
          ),
          concept(
            "sym-vs-asym",
            "Symmetric versus asymmetric cryptography",
            "Symmetric ciphers are fast but need a shared secret; asymmetric keys let strangers agree on that secret and sign things, but are slow. TLS uses asymmetric crypto for the handshake and symmetric for the data.",
          ),
          concept(
            "key-exchange",
            "Ephemeral key exchange and forward secrecy",
            "Both sides generate throwaway Diffie-Hellman keys for each connection and derive the session keys from them, so stealing the server's long-term key later does not decrypt recorded traffic.",
          ),
          concept(
            "signatures",
            "Digital signatures",
            "Only the holder of a private key can produce a signature that anyone can verify with the public key. Certificates and the handshake's proof of key ownership both rest on this.",
          ),
          concept(
            "aead",
            "Records and authenticated encryption",
            "After the handshake, data is cut into records of at most 16 KB, each encrypted and integrity-protected in one step by an AEAD cipher such as AES-GCM or ChaCha20-Poly1305. A record that was modified, replayed or reordered fails to decrypt and the connection is torn down.",
          ),
        ]),
        topic("handshake", "The TLS 1.3 handshake", [
          concept(
            "flow",
            "Message flow and the one round trip",
            "ClientHello carries the client's key share; the server answers with its key share, certificate, a signature over the handshake and Finished. Everything after the server's hello is already encrypted, and the client can send application data after one round trip.",
          ),
          concept(
            "sni-alpn",
            "SNI and ALPN",
            "SNI tells the server which host name the client wants, so one IP can serve many certificates. It is sent unencrypted unless Encrypted Client Hello is in use, so an observer still learns the host name. ALPN negotiates the application protocol (such as h2) inside the handshake.",
          ),
          concept(
            "resumption",
            "Session resumption and 0-RTT",
            "A returning client can use a pre-shared key from a session ticket to skip the certificate and signature, which saves CPU and bytes but still takes one round trip. It may also send early data with its first flight (0-RTT). Early data can be replayed by an attacker and is not forward secret, so it is only safe for idempotent requests.",
          ),
          concept(
            "cost",
            "What TLS costs in round trips",
            "On top of TCP's one round trip, a new TLS 1.3 connection adds one more; a full TLS 1.2 handshake adds two. This is why connection reuse matters so much for HTTPS.",
          ),
          concept(
            "vs-tls12",
            "What TLS 1.3 changed from TLS 1.2",
            "TLS 1.3 dropped RSA key transport and static Diffie-Hellman, so every full handshake has forward secrecy; allows only AEAD ciphers; encrypts most of the handshake, including the certificate; and cut the full handshake from two round trips to one. TLS 1.2 is still widely deployed; anything older is deprecated.",
          ),
        ]),
        topic("certs", "Certificates and trust", [
          concept(
            "x509",
            "What a certificate contains",
            "A public key, the names it is valid for (subject alternative names), a validity period, and the issuer's signature binding them together.",
          ),
          concept(
            "chain",
            "The chain of trust",
            "The server sends its leaf certificate and intermediates; the client follows the signatures up to a root CA in its local trust store. A missing intermediate breaks some clients and not others.",
          ),
          concept(
            "verification",
            "What the client verifies",
            "That each signature in the chain is valid and leads to a trusted root, every issuer is itself marked as a CA, every certificate is within its validity period, and the requested host name matches a name in the leaf. Skipping any of these is how 'insecure skip verify' becomes a vulnerability.",
          ),
          concept(
            "revocation",
            "Revocation and short-lived certificates",
            "A certificate can be revoked before it expires through published revocation lists (CRLs) or an online status check (OCSP, which the server can staple into the handshake). Many clients skip the check or carry on when it fails, so short lifetimes with automated renewal are the control you can rely on.",
          ),
          concept(
            "mtls",
            "Mutual TLS",
            "The server also requests and verifies a client certificate, giving each service a cryptographic identity. You can explain why this is stronger than a shared network or API key.",
          ),
          concept(
            "failures",
            "The three errors you will meet",
            "Expired certificate, name mismatch and unknown authority. You can read each error message and say what to fix.",
          ),
        ]),
        topic("observe", "Seeing a handshake", [
          concept(
            "s-client",
            "openssl s_client",
            "You can connect to a server, print its certificate chain, negotiated version and cipher, and tell a full handshake from a resumed one.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "tls-lab",
            "TLS by hand, then mutual TLS",
            "Inspect a handshake with `openssl s_client -msg` and tcpdump: count round trips for a fresh TLS 1.3 handshake, then resume the session and show that no certificate is sent. Create your own CA, issue server and client certificates, and make two Go services authenticate each other with mTLS. Break it three ways (expired, wrong name, untrusted CA) and read each error.",
            {
              doneWhen: [
                "s_client output with the certificate chain and negotiated parameters explained",
                "A repo with the two mTLS services and the three failures reproduced",
              ],
            },
          ),
        ]),
      ],
      {
        detail: "How two strangers end up with an encrypted, authenticated channel.",
        links: [HPBN],
      },
    ),

    topic(
      "dns",
      "DNS",
      [
        topic("model", "How names are resolved", [
          concept(
            "hierarchy",
            "The name hierarchy and delegation",
            "Names are read right to left: root, top-level domain, then the domain. Each level only knows which name servers are responsible for the next level down.",
          ),
          concept(
            "resolver-roles",
            "Stub resolver, recursive resolver, authoritative server",
            "Your program asks a stub resolver (usually the one in libc), which asks a recursive resolver, which walks root, TLD and authoritative servers and caches the results. Authoritative servers hold the actual records for a zone.",
          ),
          concept(
            "records",
            "Record types",
            "A and AAAA map a name to IPv4 and IPv6 addresses, CNAME aliases one name to another, NS names a zone's servers, MX is for mail, TXT holds free text, SRV gives a host and port for a service, PTR maps an address back to a name, and SOA holds the zone's parameters. A name with a CNAME can hold no other records, which is why the top of a zone cannot be a CNAME.",
          ),
          concept(
            "resolv-conf",
            "Where a Linux host gets its resolver",
            "/etc/resolv.conf lists the resolvers, and /etc/nsswitch.conf decides whether /etc/hosts is consulted first. `dig` skips both /etc/hosts and nsswitch and queries a resolver directly, which is why it and your application can disagree.",
          ),
          concept(
            "search-ndots",
            "Search domains and ndots",
            "A name with fewer dots than the `ndots` option (default 1) is first tried with each search domain appended, and only then as written. Kubernetes sets ndots to 5, so a lookup of an external name is preceded by several failing queries unless the name ends with a dot.",
          ),
        ]),
        topic("caching", "Caching and TTLs", [
          concept(
            "ttl",
            "TTL and why changes do not propagate",
            "Nothing is pushed. Every resolver caches an answer for its TTL and expires it independently, so a change is seen by different clients at different times.",
            { links: [link("How updating DNS works", "https://jvns.ca/blog/how-updating-dns-works/")] },
          ),
          concept(
            "negative",
            "Negative caching",
            "'This name does not exist' is cached too, for a time taken from the zone's SOA record (the smaller of its TTL and its MINIMUM field). A lookup made just before a record is created can keep failing after it exists.",
          ),
          concept(
            "app-caching",
            "Caches you did not know about",
            "Runtimes, connection pools and long-lived connections can pin an old address long after the DNS TTL expired. A DNS change does not move traffic that is already connected.",
          ),
        ]),
        topic("wire", "On the wire", [
          concept(
            "transport",
            "UDP port 53, with TCP as fallback",
            "A query and its answer are normally one UDP datagram each. An answer too big for the datagram (over 512 bytes, or over the larger size the client advertised with EDNS) comes back with the truncated flag set, and the client retries over TCP.",
          ),
          concept(
            "packet",
            "The packet format",
            "A header with an ID and flags, then question, answer, authority and additional sections. Names are encoded as length-prefixed labels and may be compressed with pointers to earlier names.",
          ),
          concept(
            "referral",
            "Following a referral by hand",
            "You can use `dig +trace` to watch a lookup go from a root server to a TLD server to the authoritative server, and read the NS and glue records at each step.",
          ),
          concept(
            "integrity",
            "Plain DNS is unauthenticated and unencrypted",
            "A resolver accepts a UDP answer that matches the query's ID, port and question, so answers can be forged or observed on the path. DNSSEC signs records so a resolver can verify them; DNS over TLS and DNS over HTTPS encrypt the hop between the client and its resolver.",
          ),
        ]),
        topic("failure", "How DNS fails", [
          concept(
            "slow-failure",
            "Resolver timeouts and retries",
            "When a resolver does not answer, the stub waits and then retries or moves to the next one. glibc's defaults are 5 seconds per try and 2 tries, so one dead resolver at the top of resolv.conf adds seconds to every uncached lookup instead of an error.",
          ),
          concept(
            "amplifier",
            "Why DNS amplifies outages",
            "Almost every request depends on it, failures are usually slow (timeouts and retries rather than errors), and stale or negative answers stay cached after the fault is fixed.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "resolver",
            "Write a DNS resolver",
            "Follow 'Implement DNS in a weekend' but write it in Go: build and parse DNS packets over UDP, then resolve recursively from a root server. Compare your answers with `dig +trace`.",
            {
              doneWhen: [
                "A repo with the resolver",
                "Your resolver's steps next to `dig +trace` for the same name",
              ],
              links: [link("Implement DNS in a weekend", "https://implement-dns.wizardzines.com/")],
            },
          ),
        ]),
      ],
      { detail: "The lookup that happens before every request." },
    ),

    topic(
      "http",
      "HTTP/1.1, HTTP/2 and HTTP/3",
      [
        topic("semantics", "HTTP itself", [
          concept(
            "messages",
            "Requests, responses and headers",
            "A request is a method, a target and headers, optionally with a body; a response is a status code, headers and a body. The semantics are the same in every HTTP version; only the framing changes.",
          ),
          concept(
            "methods",
            "Safe and idempotent methods",
            "GET, HEAD and OPTIONS are safe (read-only by definition); PUT and DELETE, like every safe method, are idempotent (repeating them has the same intended effect as doing them once); POST and PATCH are neither. This decides what a client or proxy may retry automatically.",
          ),
          concept(
            "status",
            "Status code classes",
            "2xx success, 3xx redirect, 4xx the client's request is wrong, 5xx the server failed. You can explain why 429 and 503 should carry Retry-After and why a 4xx should not be retried unchanged.",
          ),
          concept(
            "caching",
            "Caching: Cache-Control, validators and Vary",
            "Cache-Control says who may store a response and for how long (max-age, private, no-store). Once it is stale, a cache revalidates with If-None-Match against the response's ETag, and a 304 reply saves resending the body. Vary names the request headers that are part of the cache key.",
          ),
        ]),
        topic("h1", "HTTP/1.1", [
          concept(
            "framing",
            "Message framing: Content-Length and chunked",
            "The receiver finds the end of a body by a declared length or by chunked transfer encoding. Getting this wrong between a proxy and a server is the root of request smuggling.",
          ),
          concept(
            "keep-alive",
            "Persistent connections",
            "A connection stays open for many requests, saving the TCP and TLS handshakes and slow start each time. This is the default in HTTP/1.1 and is often called HTTP keep-alive.",
          ),
          concept(
            "not-tcp-keepalive",
            "HTTP keep-alive is not TCP keepalive",
            "HTTP keep-alive means reusing one connection for many requests. TCP keepalive is a kernel probe sent on an idle connection to find out whether the peer is still there. They share a name and nothing else.",
          ),
          concept(
            "stale-pool",
            "Stale pooled connections",
            "Servers and load balancers close idle connections after their own timeout. A client that reuses a pooled connection at that moment gets EOF or a reset and cannot be sure whether the request was processed. Keep the client's idle timeout shorter than the server's, and retry automatically only when the request is idempotent.",
          ),
          concept(
            "one-at-a-time",
            "One request at a time per connection",
            "A response must finish before the next can start, so a slow response blocks everything queued behind it. Browsers work around it by opening about six connections per origin.",
          ),
          concept(
            "upgrade",
            "Upgrade and WebSocket",
            "A client can ask to switch an HTTP/1.1 connection to another protocol. After a 101 response the connection stops being HTTP and carries WebSocket messages in both directions for as long as it stays open, so every proxy on the path must support the upgrade and must not close the connection as idle.",
          ),
        ]),
        topic("h2", "HTTP/2", [
          concept(
            "streams",
            "Binary framing and multiplexed streams",
            "Requests and responses are split into frames tagged with a stream ID and interleaved on one connection, which removes HTTP-level head-of-line blocking.",
          ),
          concept(
            "hpack",
            "Header compression",
            "HPACK replaces repeated headers with indexes into a table both sides maintain, which matters because headers are sent on every request.",
          ),
          concept(
            "h2-flow",
            "Stream flow control and concurrency limits",
            "Every stream and the connection as a whole have their own flow-control windows for body data (65,535 bytes each until the receiver raises them), so a receiver can pause one stream without pausing the others. Each side also caps how many streams the other may have open at once.",
          ),
          concept(
            "tcp-hol",
            "What HTTP/2 does not fix",
            "All streams share one TCP connection, so one lost packet stalls every stream until it is retransmitted. On a lossy network one HTTP/2 connection can be slower than six HTTP/1.1 connections.",
          ),
        ]),
        topic("h3", "HTTP/3 and QUIC", [
          concept(
            "quic",
            "QUIC: a transport built on UDP",
            "QUIC implements reliability, congestion control and encryption on top of UDP, usually in user space, with each stream ordered independently. A lost packet only holds back the streams whose data it carried.",
            { links: [link("HTTP/3 explained", "https://http3-explained.haxx.se/")] },
          ),
          concept(
            "handshake",
            "One combined handshake",
            "Transport and TLS 1.3 setup happen together, so a new connection is ready after one round trip and a resumed one can send data immediately.",
          ),
          concept(
            "migration",
            "Connection IDs and migration",
            "A QUIC connection is identified by a connection ID rather than the 4-tuple, so it survives the client changing network (Wi-Fi to mobile).",
          ),
          concept(
            "discovery",
            "How a client learns a server speaks HTTP/3",
            "A client cannot know in advance that UDP reaches the server, so it normally starts over TCP and learns about HTTP/3 from an Alt-Svc response header (or an HTTPS record in DNS). If UDP is blocked on the path it stays on HTTP/2.",
          ),
        ]),
        topic("timing", "Where the time goes in one request", [
          concept(
            "phases",
            "DNS, connect, TLS, first byte, transfer",
            "You can split a slow request into these five phases and say which component is responsible for each.",
          ),
          concept(
            "curl-w",
            "Measuring the phases with curl -w",
            "time_namelookup, time_connect, time_appconnect, time_starttransfer and time_total are cumulative timestamps; subtracting neighbours gives the time spent in each phase.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "hol-lab",
            "Head-of-line blocking, measured",
            "Serve 50 small objects with an artificial delay on one of them. Fetch them over HTTP/1.1 with 6 connections and over HTTP/2 with one, with and without 2% packet loss. Explain when HTTP/2 wins and when a single lost packet stalls every stream.",
            { doneWhen: ["Total load time for the four combinations, with your explanation"] },
          ),
          build(
            "debug-kit",
            "A 'where did the two seconds go' toolkit",
            "For one slow HTTPS request, break the time into DNS, connect, TLS, time-to-first-byte and transfer using `curl -w`, then confirm each piece with dig, mtr, ss and tcpdump. Save the commands as a cheat sheet in your labs repo.",
            {
              doneWhen: ["The cheat sheet committed to your labs repo", "The curl timing breakdown for a real request"],
            },
          ),
        ]),
      ],
      {
        detail: "The protocol on top, and what each version fixed.",
        links: [HPBN],
      },
    ),

    topic(
      "virtual",
      "Linux virtual networking",
      [
        topic("devices", "Virtual devices", [
          concept(
            "netns",
            "Network namespaces",
            "A namespace is a separate copy of the whole network stack: interfaces, addresses, routing table, firewall rules and sockets. A new one starts with only a loopback device that is down.",
          ),
          concept(
            "veth",
            "veth pairs",
            "Two virtual interfaces joined like a cable: a packet entering one comes out the other. Typically one end sits in a container's namespace and the other on the host.",
          ),
          concept(
            "bridge",
            "Bridges",
            "A Linux bridge is a virtual switch: it learns MAC addresses and forwards frames between the interfaces attached to it, so many veth ends share one local network.",
          ),
          concept(
            "tap-tun",
            "TAP and TUN devices",
            "A TAP device is a virtual Ethernet interface backed by a file descriptor: a program reads and writes raw layer-2 frames. TUN is the same at layer 3 (IP packets, no Ethernet header). A VM's virtual network card is usually backed by a TAP fd held by the VM monitor.",
            { links: [link("Universal TUN/TAP device driver", "https://docs.kernel.org/networking/tuntap.html")] },
          ),
        ]),
        topic("forwarding", "Routing between them", [
          concept(
            "ip-forward",
            "Making a host a router",
            "net.ipv4.ip_forward=1 (off by default) lets the kernel forward packets between interfaces, and the firewall's forward chain must allow them. Without both, a namespace can reach the host but nothing beyond it.",
          ),
          concept(
            "gateway",
            "Addresses and the default gateway",
            "Each namespace needs an address on the bridge's subnet and a default route pointing at the bridge's address, or it has nowhere to send off-network packets.",
          ),
        ]),
        topic("netfilter", "Netfilter", [
          concept(
            "hooks",
            "The five hooks a packet passes",
            "prerouting, input, forward, output and postrouting. A packet for a local process takes prerouting then input; a forwarded packet takes prerouting, forward, postrouting; a packet sent by a local process takes output then postrouting.",
            {
              links: [
                link(
                  "A deep dive into iptables and netfilter architecture",
                  "https://www.digitalocean.com/community/tutorials/a-deep-dive-into-iptables-and-netfilter-architecture",
                ),
              ],
            },
          ),
          concept(
            "nftables",
            "Tables, chains and rules",
            "Rules live in chains attached to a hook with a priority, and chains are grouped into tables. iptables and nftables are two rule engines on the same netfilter hooks, and on many current distributions the iptables command is a compatibility layer over nftables. You can write a filter rule and a NAT rule in nft.",
          ),
          concept(
            "conntrack",
            "Connection tracking",
            "The kernel records every flow it sees so that replies can be matched to it. NAT and stateful firewall rules depend on this table, and when it fills up the kernel drops packets for new flows.",
          ),
        ]),
        topic("nat", "NAT", [
          concept(
            "snat",
            "Source NAT and masquerade",
            "Outgoing packets have their source rewritten to the host's address in postrouting, so replies come back to the host; conntrack reverses the rewrite for the replies. Masquerade is source NAT that uses whatever address the outgoing interface currently has.",
          ),
          concept(
            "dnat",
            "Destination NAT and publishing a port",
            "A prerouting rule rewrites the destination to an inner address and port before the routing decision, so the packet is then forwarded inward. This is the core of what `docker run -p` sets up.",
          ),
          concept(
            "same-ip",
            "Many guests with the same inner address",
            "Each guest lives in its own namespace and keeps an identical internal IP; uniqueness comes from a per-guest outer address and NAT. A restored snapshot or cloned image then needs no network reconfiguration.",
          ),
        ]),
        topic("observe", "Seeing it", [
          concept(
            "per-hop",
            "Capturing at every hop",
            "You can run tcpdump on the veth, the bridge and the uplink for one request and point to where the addresses are rewritten.",
          ),
          concept(
            "conntrack-l",
            "Reading conntrack entries",
            "You can list flows with `conntrack -L` and read the original and reply tuples that describe a NAT mapping.",
          ),
        ]),
        topic(
          "build",
          "Build it",
          [
            build(
              "netns-nat",
              "Build container networking by hand",
              "With only `ip` and `nft`: create two network namespaces, connect each to a host bridge with veth pairs, give them addresses, enable forwarding and masquerade so they reach the internet, and DNAT a host port to a server in one namespace. Capture on every hop for one outbound request.",
              {
                doneWhen: [
                  "The full command list as a script",
                  "tcpdump on veth, bridge and uplink showing the address rewrite",
                  "`conntrack -L` entries for the connection",
                ],
              },
            ),
            build(
              "tap",
              "Answer ping from a TAP device",
              "Create a TAP device and attach it to your bridge. Write a small Go program that opens /dev/net/tun, reads raw Ethernet frames and answers ARP and ICMP echo for one IP, so that `ping` to that address works. A Firecracker VM's network card is backed by exactly this kind of file descriptor.",
              { doneWhen: ["A repo with the program", "ping replies and the frames your program logged"] },
            ),
            build(
              "same-ip-lab",
              "Two namespaces, same inner IP",
              "Create two namespaces that both use 172.16.0.2 internally, each reachable from the host through its own veth and a distinct outer address via NAT. This is the standard trick for restoring VM snapshots without changing the guest's network config.",
              { doneWhen: ["Requests to both outer addresses landing in the right namespace"] },
            ),
            build(
              "postmortems",
              "Read two networking postmortems",
              "From Dan Luu's collection, pick two outages caused by DNS, timeouts, or retries amplifying a failure. For each, write down the trigger, why it spread, and what would have contained it.",
              {
                doneWhen: ["Half a page per postmortem in your notes"],
                links: [link("Collection of postmortems", "https://github.com/danluu/post-mortems")],
              },
            ),
          ],
        ),
      ],
      {
        detail: "Namespaces, veth pairs, bridges, TAP devices and NAT: the plumbing under containers and VMs.",
        links: [link("How container networking works", "https://labs.iximiuz.com/tutorials/container-networking-from-scratch")],
      },
    ),

    topic(
      "proxies",
      "Proxies and load balancing",
      [
        topic("why", "What a proxy is", [
          concept(
            "front-door",
            "A stable address in front of moving backends",
            "Clients connect to the proxy; backends can be added, removed or moved without clients noticing.",
          ),
          concept(
            "forward-reverse",
            "Forward proxy versus reverse proxy",
            "A reverse proxy sits in front of servers and clients think it is the server. A forward proxy sits in front of clients, who are configured to send their requests through it; for HTTPS the client asks it with CONNECT to open a raw tunnel to the destination.",
          ),
          concept(
            "two-connections",
            "A proxy terminates the connection",
            "There are two separate TCP connections, client to proxy and proxy to backend. This is why the proxy can replace the backend while the client connection stays open, and why the backend sees the proxy's address, not the client's, unless the proxy passes it on (an X-Forwarded-For header, or the PROXY protocol for raw TCP).",
          ),
          concept(
            "l4-vs-l7",
            "Layer 4 versus layer 7",
            "An L4 proxy relays the bytes of a connection without understanding them (some L4 load balancers only rewrite and forward packets and never terminate the connection). An L7 proxy parses HTTP and can route, retry and balance each request separately.",
          ),
          concept(
            "long-lived-lb",
            "Why L4 balancing fails for long-lived connections",
            "An L4 balancer picks a backend once per connection. With HTTP/2 (and gRPC, which runs on it) a client sends all its requests down one long-lived connection, so all of them land on one backend however uneven the load is. Balancing per request needs an L7 proxy or a client that balances itself.",
          ),
          concept(
            "tls-termination",
            "Where TLS terminates",
            "To read requests, an L7 proxy must terminate TLS: it holds the certificate and private key and opens its own connection to the backend, encrypted again or not. An L4 proxy can pass the encrypted bytes through untouched and still route on the SNI name in the ClientHello.",
          ),
        ]),
        topic(
          "balancing",
          "Load balancing",
          [
            concept(
              "algorithms",
              "Round robin, least requests, power of two choices",
              "Round robin ignores load; least-requests sends to the backend with the fewest in flight; picking the better of two random backends gets most of that benefit without global state.",
            ),
            concept(
              "hashing",
              "Consistent hashing",
              "Requests with the same key go to the same backend, and adding or removing one of N backends only moves about 1/N of the keys, where plain hash-modulo-N would move almost all of them. Used for caches and sticky sessions.",
            ),
            concept(
              "health",
              "Active and passive health checks",
              "Active checks probe each backend on a timer; passive checks (outlier detection) eject a backend based on real request failures. You can explain why a shallow health check lets a broken backend keep receiving traffic.",
            ),
            concept(
              "draining",
              "Connection draining",
              "To remove a backend safely, stop sending it new requests and let in-flight ones finish before closing. A server drains its own long-lived connections by telling clients to stop reusing them: 'Connection: close' in HTTP/1.1, a GOAWAY frame in HTTP/2.",
            ),
          ],
          {
            links: [
              link("Load balancing, visually explained", "https://samwho.dev/load-balancing/"),
              link(
                "Envoy: load balancing overview",
                "https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/overview",
              ),
            ],
          },
        ),
        topic("edge", "Reaching the nearest front door", [
          concept(
            "dns-lb",
            "DNS-based load balancing and its limits",
            "A name can return several addresses, or different addresses depending on where the query comes from. It is coarse: resolvers and clients cache answers, so traffic shifts slowly and a dead address keeps receiving requests until the TTL runs out and clients reconnect.",
          ),
          concept(
            "anycast",
            "Anycast",
            "The same IP prefix is announced from many locations and internet routing delivers each packet to the nearest one by its own measure. It gives fast failover without DNS, and a route change in the middle of a connection can move it to a site that has no state for it.",
          ),
          concept(
            "cdn",
            "CDNs and edge caching",
            "A CDN is a fleet of reverse proxies close to users. It terminates TCP and TLS nearby (short round trips), serves cacheable responses from its own cache according to the origin's Cache-Control headers, and forwards the rest to the origin over connections it keeps warm.",
          ),
        ]),
        topic("relay", "Relaying bytes correctly", [
          concept(
            "backpressure",
            "Backpressure in a relay",
            "When one side is slow, stop reading from the other so buffers stay bounded and TCP flow control pushes back on the sender. A relay that reads as fast as it can will run out of memory.",
          ),
          concept(
            "half-close-relay",
            "Propagating EOF in each direction",
            "When one side finishes sending, the relay must half-close the other side rather than tearing down both directions, or the response is cut off.",
          ),
          concept(
            "switching",
            "Switching the backend under a live client",
            "The proxy pauses reading from the client, connects to the new backend and resumes; the client only sees a gap. What cannot survive is state held inside the old backend connection.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "proxy",
            "A repointable streaming TCP proxy",
            "Build a Go proxy that accepts client connections on a stable address and relays to an upstream you can switch atomically with an HTTP call. When the upstream changes or drops, keep the client connection open, buffer or pause, reconnect to the new upstream and resume. Add health checks and metrics for the gap. The migration capstone uses this proxy.",
            {
              parts: [
                build(
                  "relay",
                  "TCP relay with backpressure in both directions",
                  "Bytes flow both ways, a slow reader on either side stalls the other side instead of growing memory, and EOF is passed on as a half-close.",
                ),
                build(
                  "switch",
                  "PUT /upstream that switches atomically",
                  "One HTTP call repoints the proxy. It is safe to repeat, and no connection is ever relayed half to the old upstream and half to the new one.",
                ),
                build(
                  "survive",
                  "Client connection survives an upstream restart",
                  "A client stream continues across an upstream switch or restart, and the length of the gap is measured, logged and exported as a metric.",
                ),
                build(
                  "tests",
                  "Tests for the failure cases",
                  "Automated tests cover upstream down, slow upstream, and a switch in the middle of a transfer.",
                ),
              ],
            },
          ),
        ]),
      ],
      { detail: "The stable front door, and what it takes to relay bytes without losing or hoarding them." },
    ),

    topic(
      "realtime",
      "Real-time transport",
      [
        topic("udp", "Why media uses UDP", [
          concept(
            "late-is-lost",
            "Late data is useless data",
            "Audio that arrives after its playback time cannot be used. TCP would stall everything behind a lost packet to deliver it anyway; UDP lets the application skip it and keep playing.",
          ),
          concept(
            "jitter",
            "Jitter and the jitter buffer",
            "Packets sent at even intervals arrive unevenly and sometimes out of order. A jitter buffer holds them for a short time and releases them by their sequence numbers and timestamps, trading a little latency for continuous playback.",
          ),
          concept(
            "loss-handling",
            "Living with loss",
            "Real-time systems hide a missing packet (concealment), add redundancy up front (forward error correction) or request a quick resend only when it can still arrive in time.",
          ),
        ]),
        topic(
          "traversal",
          "Getting through NAT",
          [
            concept(
              "nat-problem",
              "Why two peers behind NAT cannot just connect",
              "Neither side has a public address, neither knows what address its NAT will give it, and a NAT only lets in packets that match a flow started from inside.",
            ),
            concept(
              "stun",
              "STUN",
              "A peer asks a public server 'what address do you see me as' to learn its public address and port, which it can then share with the other peer. It does not help behind a NAT that assigns a different public port for every destination, because the port the STUN server saw is not the one the peer will see.",
            ),
            concept(
              "hole-punching",
              "UDP hole punching",
              "Both peers send to each other's public address and port at about the same time. Each outgoing packet creates the NAT mapping that lets the other side's packets in, so a direct path opens although neither side accepts unsolicited traffic.",
            ),
            concept(
              "turn",
              "TURN",
              "When no direct path works, both peers send media through a relay server with a public address. It works whenever both peers can reach the relay, and it costs the operator bandwidth and adds latency.",
            ),
            concept(
              "ice",
              "ICE",
              "Each peer gathers candidate addresses (local, STUN-discovered, relayed), sends them to the other peer through signaling (any channel both can already reach, such as your own server), and tests pairs until one works, preferring direct paths.",
            ),
          ],
          { links: [WEBRTC_CURIOUS] },
        ),
        topic("build", "Build it", [
          build(
            "udp-media",
            "Why real-time media uses UDP, measured",
            "Send 50 small 'audio frames' per second over TCP and over UDP between two namespaces with 2% loss and 30 ms jitter from netem. Record each frame's arrival delay and plot both: TCP delivers everything, late and in bursts; UDP delivers most on time and drops a few.",
            { doneWhen: ["Per-frame delay distribution for TCP and UDP under loss"] },
          ),
          build(
            "writeup",
            "Write-up: one request, every layer",
            "Trace a single HTTPS request from your laptop to a server in a network namespace behind your NAT and proxy: DNS, TCP, TLS, DNAT, bridge, veth. One page with your own captures.",
            { doneWhen: ["A published write-up with your own captures"] },
          ),
          build(
            "cs144",
            "Stretch: build TCP yourself (CS144 checkpoints 0-3)",
            "Stanford's lab sequence: a reliable byte stream, a reassembler, a TCP receiver and a TCP sender, in C++. Only take this on if you want depth in transport protocols; nothing else in the sheet depends on it.",
            {
              doneWhen: ["A note on which checkpoints you finished and what you learned"],
              links: [link("Stanford CS144", "https://cs144.github.io/")],
            },
          ),
        ]),
      ],
      { detail: "Why voice and video make different trade-offs from everything above." },
    ),
  ],
);
