import { cards, lab, link, note, output, project, read, url } from "../dsl";
import type { Phase } from "../types";

const HPBN = link("High Performance Browser Networking", "https://hpbn.co/");

export const phase: Phase = {
  id: "networking",
  label: "Phase 5",
  title: "Networking",
  summary:
    "TCP from the socket up, the timeouts and stalls that cause real outages, DNS and TLS, and the Linux virtual networking that every container and microVM plugs into. Ends with the proxy the migration capstone needs.",
  weeks: { start: 15, end: 19 },
  pillar: "networking",
  modules: [
    {
      id: "net-tcp",
      title: "Sockets and TCP",
      summary: "Week 15. The connection state machine, seen in packets.",
      items: [
        read("net-beej", "Beej's Guide to Network Programming", {
          week: 15,
          hours: 6,
          source: "Beej's Guide",
          chapters: "Ch. 1-7: sockets, addresses, system calls, client-server, slightly advanced techniques",
          links: [link("Beej's Guide to Network Programming", "https://beej.us/guide/bgnet/")],
        }),
        read("net-hpbn-tcp", "HPBN: latency and the building blocks of TCP", {
          week: 15,
          hours: 4,
          source: "High Performance Browser Networking",
          chapters: "Ch. 1-2: latency and bandwidth, three-way handshake, flow and congestion control, head-of-line blocking",
          links: [HPBN],
        }),
        lab("net-tcp-go", "A TCP server and client, watched in tcpdump", {
          week: 15,
          hours: 6,
          brief:
            "Write a line-based TCP server and client in Go with read and write deadlines. Run them in two network namespaces or two VMs. Capture with tcpdump and label the handshake, data, ACKs and the four-step close. Show the window size changing when the reader stops reading.",
          evidence: [
            output("capture", "Annotated tcpdump of one full connection"),
            output("window", "Capture showing the advertised window shrinking to zero with a stalled reader"),
          ],
          links: [link("tcpdump manual", "https://www.tcpdump.org/manpages/tcpdump.1.html")],
        }),
        lab("net-tcp-states", "Produce every TCP state on purpose", {
          week: 15,
          hours: 5,
          brief:
            "Using `ss -tan` and tcpdump, produce and screenshot: a connection refused (RST), a SYN that is silently dropped, a full accept queue, a half-closed connection (one side shut down writing), CLOSE_WAIT from a server that never closes, and TIME_WAIT.",
          evidence: [output("states", "`ss` output for each state with the command that caused it")],
          links: [link("The quantum state of a TCP port", "https://blog.cloudflare.com/the-quantum-state-of-a-tcp-port/")],
        }),
        read("net-ephemeral-ports", "Ephemeral ports and long-lived connections", {
          week: 15,
          hours: 1.5,
          source: "Cloudflare blog",
          links: [
            link(
              "How to stop running out of ephemeral ports",
              "https://blog.cloudflare.com/how-to-stop-running-out-of-ephemeral-ports-and-start-to-love-long-lived-connections/",
            ),
          ],
        }),
      ],
    },
    {
      id: "net-latency",
      title: "Stalls, timeouts and TLS",
      summary: "Week 16. The 40 ms mystery, the request that hangs forever, and the handshake.",
      items: [
        read("net-nagle", "Nagle's algorithm and delayed ACKs", {
          week: 16,
          hours: 1,
          source: "Marc Brooker",
          links: [link("It's always TCP_NODELAY", "https://brooker.co.za/blog/2024/05/09/nagle.html")],
        }),
        lab("net-nagle-lab", "Reproduce the Nagle + delayed-ACK stall", {
          week: 16,
          hours: 5,
          brief:
            "Write a client that sends a request as two small writes then reads the reply, against a server that replies only after the full request. Run across two namespaces or hosts (not loopback). Find the roughly 40 ms gaps in tcpdump, then set TCP_NODELAY and show them gone.",
          evidence: [
            output("gap", "tcpdump timestamps showing the stall"),
            output("fixed", "Request latency distribution before and after TCP_NODELAY"),
          ],
        }),
        lab("net-timeouts", "Timeouts under packet loss", {
          week: 16,
          hours: 5,
          brief:
            "Use `tc netem` to add delay and loss, and nftables rules to DROP vs REJECT. Measure how long a default Node (undici) and Python (httpx) client takes to fail in each case: unreachable host, dropped SYN, server that accepts but never replies. Then set explicit connect and read timeouts.",
          evidence: [
            output("table", "Time-to-failure for each case with default and with explicit timeouts"),
            note("defaults", "Which defaults were dangerous, and the timeout policy you would ship"),
          ],
          links: [link("tc-netem", "https://man7.org/linux/man-pages/man8/tc-netem.8.html")],
        }),
        lab("net-time-wait", "Run out of ports", {
          week: 16,
          hours: 3,
          brief:
            "Open and close connections to one destination in a tight loop until connect fails with EADDRNOTAVAIL. Count sockets in TIME_WAIT with `ss`. Fix it with connection reuse (keep-alive pool) rather than sysctls, and explain why TIME_WAIT exists.",
          evidence: [output("exhaust", "The error, the TIME_WAIT count, and the same load succeeding with a pool")],
        }),
        read("net-hpbn-tls", "HPBN: UDP and TLS", {
          week: 16,
          hours: 5,
          source: "High Performance Browser Networking",
          chapters: "Ch. 3 (UDP, NAT traversal), ch. 4 (TLS handshake, resumption, certificates)",
          links: [HPBN],
        }),
        lab("net-tls-lab", "TLS by hand, then mutual TLS", {
          week: 16,
          hours: 5,
          brief:
            "Inspect a handshake with `openssl s_client -msg` and tcpdump: count round trips for a fresh TLS 1.3 handshake and a resumed one. Create your own CA, issue server and client certificates, and make two Go services authenticate each other with mTLS. Break it three ways (expired, wrong name, untrusted CA) and read each error.",
          evidence: [
            output("handshake", "s_client output with the certificate chain and negotiated parameters explained"),
            url("repo", "Link to the mTLS services"),
          ],
        }),
      ],
    },
    {
      id: "net-dns-http",
      title: "DNS and HTTP",
      summary: "Week 17. The lookup before every request, and the protocols on top.",
      items: [
        lab("net-dns-resolver", "Write a DNS resolver", {
          week: 17,
          hours: 6,
          brief:
            "Follow 'Implement DNS in a weekend' but write it in Go: build and parse DNS packets over UDP, then resolve recursively from a root server. Compare your answers with `dig +trace`.",
          evidence: [
            url("repo", "Link to the resolver"),
            output("trace", "Your resolver's steps next to `dig +trace` for the same name"),
          ],
          links: [link("Implement DNS in a weekend", "https://implement-dns.wizardzines.com/")],
        }),
        read("net-dns-ops", "How DNS updates actually propagate", {
          week: 17,
          hours: 1.5,
          source: "Julia Evans",
          links: [link("How updating DNS works", "https://jvns.ca/blog/how-updating-dns-works/")],
        }),
        read("net-hpbn-http", "HPBN: HTTP/1.1 and HTTP/2, then HTTP/3", {
          week: 17,
          hours: 7,
          source: "High Performance Browser Networking; HTTP/3 explained",
          chapters: "HPBN ch. 9, 11, 12; HTTP/3 explained: why QUIC, how it differs",
          links: [HPBN, link("HTTP/3 explained", "https://http3-explained.haxx.se/")],
        }),
        lab("net-http2-lab", "Head-of-line blocking, measured", {
          week: 17,
          hours: 3,
          brief:
            "Serve 50 small objects with an artificial delay on one of them. Fetch them over HTTP/1.1 with 6 connections and over HTTP/2 with one, with and without 2% packet loss. Explain when HTTP/2 wins and when a single lost packet stalls every stream.",
          evidence: [output("times", "Total load time for the four combinations")],
        }),
        lab("net-debug-kit", "A 'where did the two seconds go' toolkit", {
          week: 17,
          hours: 4,
          brief:
            "For one slow HTTPS request, break the time into DNS, connect, TLS, time-to-first-byte and transfer using `curl -w`, then confirm each piece with dig, mtr, ss and tcpdump. Save the commands as a cheat sheet in your labs repo.",
          evidence: [url("sheet", "Link to the cheat sheet"), output("curl", "The curl timing breakdown for a real request")],
        }),
      ],
    },
    {
      id: "net-virtual",
      title: "Linux virtual networking",
      summary: "Week 18. Namespaces, veth pairs, bridges, TAP devices and NAT: the plumbing under containers and VMs.",
      items: [
        read("net-container-networking", "Container networking from scratch", {
          week: 18,
          hours: 3,
          source: "iximiuz Labs",
          links: [link("How container networking works", "https://labs.iximiuz.com/tutorials/container-networking-from-scratch")],
        }),
        lab("net-netns-nat", "Build container networking by hand", {
          week: 18,
          hours: 8,
          brief:
            "With only `ip` and `nft`: create two network namespaces, connect each to a host bridge with veth pairs, give them addresses, enable forwarding and masquerade so they reach the internet, and DNAT a host port to a server in one namespace. Capture on every hop for one outbound request.",
          evidence: [
            output("setup", "The full command list as a script"),
            output("hops", "tcpdump on veth, bridge and uplink showing the address rewrite"),
            output("conntrack", "`conntrack -L` entries for the connection"),
          ],
        }),
        read("net-netfilter", "Netfilter and iptables architecture", {
          week: 18,
          hours: 2.5,
          source: "DigitalOcean community",
          links: [
            link(
              "A deep dive into iptables and netfilter architecture",
              "https://www.digitalocean.com/community/tutorials/a-deep-dive-into-iptables-and-netfilter-architecture",
            ),
          ],
        }),
        lab("net-tap", "TAP devices", {
          week: 18,
          hours: 5,
          brief:
            "Create a TAP device and attach it to your bridge. Write a small Go program that opens /dev/net/tun, reads raw Ethernet frames and answers ARP and ICMP echo for one IP, so that `ping` to that address works. A Firecracker VM's network card is exactly this file descriptor.",
          evidence: [url("repo", "Link to the program"), output("ping", "ping replies and the frames your program logged")],
          links: [link("Universal TUN/TAP device driver", "https://docs.kernel.org/networking/tuntap.html")],
        }),
        lab("net-same-ip", "Two namespaces, same inner IP", {
          week: 18,
          hours: 3,
          brief:
            "Create two namespaces that both use 172.16.0.2 internally, each reachable from the host through its own veth and a distinct outer address via NAT. This is the standard trick for restoring VM snapshots without changing the guest's network config.",
          evidence: [output("reach", "Requests to both outer addresses landing in the right namespace")],
        }),
        read("net-postmortems", "Postmortems: networking", {
          week: 18,
          hours: 2,
          source: "Dan Luu's post-mortems collection",
          chapters: "Pick two caused by DNS, timeouts, or retries amplifying an outage",
          links: [link("Collection of postmortems", "https://github.com/danluu/post-mortems")],
        }),
      ],
    },
    {
      id: "net-proxies",
      title: "Proxies and real-time transport",
      summary: "Week 19. The stable front door, and why media prefers UDP.",
      items: [
        read("net-lb", "Modern load balancing and proxying", {
          week: 19,
          hours: 2.5,
          source: "Sam Rose; Envoy documentation",
          chapters: "The visual explainer first, then Envoy's overview of load balancing policies and health checking",
          links: [
            link("Load balancing, visually explained", "https://samwho.dev/load-balancing/"),
            link(
              "Envoy: load balancing overview",
              "https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/overview",
            ),
          ],
        }),
        project("net-proxy", "A repointable streaming TCP proxy", {
          week: 19,
          hours: 12,
          brief:
            "Build a Go proxy that accepts client connections on a stable address and relays to an upstream you can switch atomically with an HTTP call. When the upstream changes or drops, keep the client connection open, buffer or pause, reconnect to the new upstream and resume. Add health checks and metrics for the gap.",
          deliverables: [
            "TCP relay with backpressure in both directions",
            "PUT /upstream that switches atomically and is safe to repeat",
            "Client connection survives an upstream restart; the gap is measured and logged",
            "Tests for upstream down, slow upstream, and switch during a transfer",
          ],
          evidence: [
            url("repo", "Link to the proxy"),
            output("gap", "A client stream continuing across an upstream switch, with the measured gap"),
          ],
        }),
        read("net-webrtc-intro", "WebRTC for the Curious: the transport layers", {
          week: 19,
          hours: 3,
          source: "WebRTC for the Curious",
          chapters: "What, why and how; Signaling; Connecting (ICE, STUN, TURN)",
          links: [link("WebRTC for the Curious", "https://webrtcforthecurious.com/")],
        }),
        lab("net-udp-media", "Why real-time media uses UDP", {
          week: 19,
          hours: 4,
          brief:
            "Send 50 small 'audio frames' per second over TCP and over UDP between two namespaces with 2% loss and 30 ms jitter from netem. For each frame record arrival delay. Plot both: TCP delivers everything late in bursts, UDP delivers most on time and drops a few.",
          evidence: [output("delay", "Per-frame delay distribution for TCP and UDP under loss")],
        }),
        lab("net-writeup", "Write-up: one request, every layer", {
          week: 19,
          hours: 3,
          brief:
            "Trace a single HTTPS request from your laptop to a server in a network namespace behind your NAT and proxy: DNS, TCP, TLS, DNAT, bridge, veth. One page with your own captures.",
          evidence: [url("post", "Link to the published write-up")],
        }),
        lab("net-cs144", "Build TCP yourself (CS144 checkpoints 0-3)", {
          week: 19,
          hours: 30,
          optional: true,
          brief:
            "Stanford's lab sequence: a reliable byte stream, a reassembler, a TCP receiver and a TCP sender, in C++. Only take this on if you want depth in transport protocols; it is not needed for the rest of the roadmap.",
          evidence: [note("done", "Which checkpoints you finished and what you learned")],
          links: [link("Stanford CS144", "https://cs144.github.io/")],
        }),
      ],
    },
  ],
};

export const quiz = [
  ...cards("net-tcp", [
    ["Describe the TCP three-way handshake.", "Client sends SYN with its initial sequence number; server replies SYN-ACK with its own; client sends ACK. Each side has now acknowledged the other's sequence number."],
    ["What is the difference between receiving RST and getting no answer to a SYN?", "RST means the host is reachable but nothing is listening (connection refused, fails instantly). No answer means the packet was dropped, so the client retransmits with backoff until its connect timeout."],
    ["What are flow control and congestion control?", "Flow control protects the receiver: it advertises a window of buffer space. Congestion control protects the network: the sender limits itself with a congestion window that grows and shrinks with loss and delay."],
    ["What is TIME_WAIT and which side enters it?", "The side that closes first waits about 2 MSL (60 s on Linux) so late packets from the old connection die and the final ACK can be resent. The 4-tuple cannot be reused meanwhile."],
    ["What does a pile of sockets in CLOSE_WAIT indicate?", "The peer closed but the local application never called close: an application bug or leak, not a network problem."],
    ["What is the accept queue and what happens when it is full?", "The queue of fully established connections waiting for accept(), sized by the listen backlog. When full, Linux drops the final ACK or SYN, so clients see slow connects."],
    ["What is TCP head-of-line blocking?", "TCP delivers bytes in order, so one lost segment holds back everything after it until the retransmission arrives."],
    ["What identifies a TCP connection?", "The 4-tuple: source IP, source port, destination IP, destination port."],
  ]),
  ...cards("net-latency", [
    ["How do Nagle's algorithm and delayed ACKs combine into a 40 ms stall?", "Nagle holds a small segment until the previous one is ACKed. The receiver delays ACKs hoping to piggyback them on a reply. With write-write-read, the second small write waits for an ACK the receiver is delaying."],
    ["What does TCP_NODELAY do?", "Disables Nagle's algorithm so small writes are sent immediately. Appropriate for request-response and interactive protocols."],
    ["What is the difference between a connect timeout and a read timeout?", "Connect timeout bounds establishing the connection. Read timeout bounds waiting for data on an established connection. A server that accepts but never replies only trips the read timeout."],
    ["Why is DROP worse than REJECT for clients?", "REJECT returns an error immediately. DROP gives no signal, so the client retransmits SYNs for its full timeout, which by default can be over two minutes."],
    ["What causes EADDRNOTAVAIL on connect and what is the right fix?", "No free ephemeral port for that destination, usually from many short-lived connections sitting in TIME_WAIT. Fix with connection pooling and keep-alive."],
    ["How many round trips does TLS 1.3 add to a new connection, and on resumption?", "One round trip for a full handshake. Zero with 0-RTT resumption (with replay caveats), otherwise one."],
    ["What does a client verify about a server certificate?", "That a chain of signatures leads to a trusted CA, the certificate is within its validity period, and the requested host name matches a name in the certificate."],
    ["What is mutual TLS?", "Both sides present certificates. The server also verifies the client's, giving cryptographic service-to-service identity."],
  ]),
  ...cards("net-dns-http", [
    ["What is the difference between a recursive resolver and an authoritative server?", "The recursive resolver does the lookup on the client's behalf, walking root, TLD and authoritative servers and caching results. The authoritative server holds the actual records for a zone."],
    ["Why do DNS changes not 'propagate' instantly?", "Resolvers cache the old answer for its TTL. Nothing is pushed; each cache expires independently."],
    ["Why is DNS a classic outage amplifier?", "Almost every request depends on it, failures are often slow (timeouts and retries), and negative or stale answers get cached."],
    ["What problem does HTTP/2 multiplexing solve, and what does it not solve?", "It removes HTTP-level head-of-line blocking by interleaving streams on one connection. It still runs on TCP, so one lost packet stalls all streams."],
    ["How does HTTP/3 avoid transport head-of-line blocking?", "It runs on QUIC over UDP, where each stream is ordered independently, so loss on one stream does not block the others."],
    ["Which curl timings split a slow request?", "time_namelookup (DNS), time_connect (TCP), time_appconnect (TLS), time_starttransfer (first byte), time_total."],
    ["Why does keep-alive matter so much for HTTPS?", "It reuses the TCP and TLS connection, saving round trips for the handshakes on every request."],
  ]),
  ...cards("net-virtual", [
    ["What does a network namespace isolate?", "The whole network stack: interfaces, addresses, routing tables, firewall rules and sockets."],
    ["What is a veth pair?", "Two virtual interfaces connected like a cable: packets entering one come out the other. Typically one end sits in a container's namespace and the other on a host bridge."],
    ["What is a TAP device, and how does it differ from TUN?", "A virtual Ethernet interface backed by a file descriptor: a program reads and writes raw layer-2 frames. TUN is the same at layer 3 (IP packets)."],
    ["What is masquerading (SNAT) and where does the mapping live?", "Rewriting the source address of outgoing packets to the host's so replies return to it. The kernel's conntrack table remembers each flow to reverse the rewrite."],
    ["How do you expose a service in a namespace on a host port?", "A DNAT rule in the prerouting chain rewriting the destination to the inner address and port, with forwarding enabled."],
    ["Why give every VM or container the same internal IP?", "A restored snapshot or cloned image keeps its network config unchanged. Uniqueness comes from the per-instance namespace and outer NAT address."],
    ["What must be enabled for a Linux host to route between interfaces?", "net.ipv4.ip_forward=1, plus firewall rules that allow the forwarded traffic."],
  ]),
  ...cards("net-proxies", [
    ["What is the difference between an L4 and an L7 proxy?", "L4 relays bytes of a TCP or UDP connection without understanding them. L7 parses the application protocol (HTTP) and can route, retry and balance per request."],
    ["How can a proxy keep a client connection alive while its backend moves?", "The client's TCP connection terminates at the proxy. The proxy opens a new backend connection and resumes relaying; the client only sees a pause."],
    ["What is backpressure in a proxy?", "When the downstream is slow, stop reading from the upstream so buffers stay bounded and TCP flow control pushes back on the sender."],
    ["Why do real-time media protocols prefer UDP?", "Late audio is useless. UDP lets the application skip a lost packet and keep playing, where TCP would stall everything behind the retransmission."],
    ["What are STUN and TURN for?", "STUN lets a peer discover its public address behind NAT so peers can connect directly. TURN relays the media when a direct path is impossible."],
    ["What is a jitter buffer?", "A small receive-side delay that reorders and evens out packet arrival times, trading a little latency for smooth playback."],
  ]),
];
