import { build, concept, link, section, topic } from "../dsl";

const SRE_URL = "https://sre.google/sre-book/table-of-contents/";
const WORKBOOK_URL = "https://sre.google/workbook/table-of-contents/";

const SRE_RISK = link("SRE book: ch. 3 Embracing Risk, ch. 4 Service Level Objectives", SRE_URL);
const SRE_MONITORING = link("SRE book: ch. 6 Monitoring Distributed Systems", SRE_URL);
const SRE_TROUBLESHOOTING = link("SRE book: ch. 12 Effective Troubleshooting", SRE_URL);
const SRE_INCIDENTS = link("SRE book: ch. 14 Managing Incidents, ch. 15 Postmortem Culture", SRE_URL);
const SRE_OVERLOAD = link("SRE book: ch. 21 Handling Overload, ch. 22 Addressing Cascading Failures", SRE_URL);
const WORKBOOK_SLO = link("SRE Workbook: ch. 2 Implementing SLOs", WORKBOOK_URL);
const WORKBOOK_ALERTING = link("SRE Workbook: ch. 5 Alerting on SLOs", WORKBOOK_URL);
const PROM_HISTOGRAMS = link("Prometheus: histograms and summaries", "https://prometheus.io/docs/practices/histograms/");
const WRK2 = link("wrk2", "https://github.com/giltene/wrk2");

export default section(
  "reliability",
  {
    title: "Reliability and observability",
    summary:
      "Define what 'working' means for users, measure it honestly, alert on it, and diagnose a sick system from its symptoms: SLOs and error budgets, latency percentiles, metrics, logs and traces, burn-rate alerts, incident response and capacity planning.",
  },
  [
    topic(
      "slos",
      "SLIs, SLOs and error budgets",
      [
        topic("why", "Reliability as a number", [
          concept(
            "feature",
            "Reliability is a feature with a cost",
            "Reliability competes with everything else for engineering time and money: redundancy, slower rollouts and extra testing all cost something. The useful question is how reliable the service needs to be for its users, not how reliable it could be made.",
          ),
          concept(
            "nines",
            "Nines and what they allow",
            "Each extra nine cuts the allowed failure by ten. Over 30 days (43,200 minutes), 99% allows 7.2 hours of full outage, 99.9% allows 43.2 minutes, 99.99% allows 4.3 minutes and 99.999% allows 26 seconds.",
          ),
          concept(
            "mttr",
            "Failure frequency versus recovery time",
            "Time-based availability is uptime / (uptime + downtime), or mean time between failures / (mean time between failures + mean time to recover). Halving the time to detect and recover buys as much availability as halving how often failures happen, which is why detection, mitigation and rollback matter as much as prevention.",
          ),
          concept(
            "not-100",
            "Why 100% is the wrong target",
            "Each extra nine costs far more than the last, users cannot tell the difference beyond a point because their own network and device are less reliable than that, and a 100% target leaves no room to ship changes, since every change carries risk.",
          ),
          concept(
            "dependencies",
            "Availability of a chain of dependencies",
            "If a request needs every one of several components and they fail independently, the availabilities multiply: three hard dependencies at 99.9% each cap the service near 99.7%. Redundant copies help only as far as their failures are independent; a shared deploy, config push or zone makes them fail together.",
          ),
        ]),
        topic("sli", "Choosing SLIs", [
          concept(
            "definition",
            "SLI: a measured indicator of service health",
            "An SLI is a number computed from real measurements that tracks whether users are being served well, most usefully the share of good events out of all valid events. A ratio from 0 to 100% makes every SLI read the same way and makes the error budget easy to compute.",
          ),
          concept(
            "user-view",
            "Choosing SLIs from the user's point of view",
            "A good SLI goes down when users are unhappy and stays up when they are not. CPU usage or a count of healthy processes fails this test: users can be suffering while those look fine, and those can look bad while users notice nothing. Start from the journeys users care about most and keep to a few SLIs for each; more dilute attention.",
          ),
          concept("kinds", "Common SLI kinds", undefined, {
            parts: [
              concept(
                "availability",
                "Availability",
                "The share of valid requests that got a successful response. You must define success (for example any status other than 5xx) and what counts as valid, such as leaving out requests the client got wrong.",
              ),
              concept(
                "latency",
                "Latency",
                "The share of requests answered faster than a threshold, such as 'under 300 ms'. Stating it as a share of good requests, rather than as a percentile value, lets it be summed across instances and turned into an error budget.",
              ),
              concept(
                "quality",
                "Quality",
                "The share of valid requests served without deliberate degradation, for a service that sheds work under load by returning partial or fallback answers. Such a response is a success for availability, so only a quality SLI shows how often users got the reduced version.",
              ),
              concept(
                "correctness",
                "Correctness",
                "The share of responses or output records that were right, not only delivered. A 200 carrying wrong data is a failure here; it usually has to be measured with probes whose answer is known or by auditing a sample.",
              ),
              concept(
                "freshness",
                "Freshness",
                "For pipelines, caches and replicas: the share of reads served from data updated more recently than a threshold. A system can be up and fast and still be serving hours-old data.",
              ),
              concept(
                "durability",
                "Durability",
                "For storage: the share of data written that can still be read back. Loss usually shows up long after the write, so it is measured by reading back samples or checking replicas, not from request success.",
              ),
            ],
          }),
          concept(
            "where",
            "Where to measure an SLI",
            "Server metrics are easy but miss requests that never arrived. Load balancer metrics also see backends that are down or timing out. Synthetic probes cover the whole path but only for the requests you script. Client telemetry is closest to the user's experience and the noisiest. Measure as close to the user as you can afford.",
          ),
          concept(
            "request-vs-window",
            "Request-based versus window-based SLIs",
            "A request-based SLI is good requests over total requests, so busy periods weigh more and a failure at peak costs more than one at night. A window-based SLI is the share of time windows (say, minutes) that met a criterion, so every minute weighs the same and a bad minute counts once however bad it was.",
          ),
        ]),
        topic("slo", "Writing an SLO", [
          concept(
            "definition",
            "SLO: a target for an SLI over a window",
            "An SLO states the SLI, the target and the period: '99.9% of valid create requests succeed, measured at the load balancer, over a rolling 30 days'. Without all three it cannot be checked.",
          ),
          concept(
            "window",
            "Rolling and calendar windows",
            "A rolling window (the last 30 days) never resets and matches what users remember. A calendar window (this month) is easier to report but restores the full budget on the first day whatever happened the day before.",
          ),
          concept(
            "target",
            "Picking the target",
            "Start from what the service has actually achieved and what users tolerate, not from an aspiration. A target the system has never met produces a permanently spent budget that nobody respects; tighten it later with evidence.",
          ),
          concept(
            "too-reliable",
            "Running far above the SLO is also a problem",
            "Users build on the behaviour they observe, not on the target you published. If a service runs well above its SLO for a long time, its dependents come to assume that level and break at the first outage the SLO allowed. Some teams take planned outages to prevent this.",
          ),
          concept(
            "sla",
            "SLA versus SLO",
            "An SLA is a contract with consequences, such as refunds, if a target is missed. The SLO is the internal objective, set stricter than the SLA so that you are warned before you owe anyone anything.",
          ),
        ]),
        topic("budget", "The error budget", [
          concept(
            "definition",
            "The error budget is one minus the SLO",
            "One minus the SLO: the amount of failure you are allowed in the window. A 99.9% SLO over 30 days allows about 43 minutes of full outage, or equally 0.1% of requests failing all month.",
          ),
          concept(
            "arithmetic",
            "Computing a budget in requests and in minutes",
            "In requests: (1 - SLO) x requests in the window, so 99.9% of 10 million requests a month lets 10,000 fail. In minutes of full outage: (1 - SLO) x window length. A partial outage spends it in proportion: 10% of requests failing uses budget at a tenth of the full-outage speed.",
          ),
          concept(
            "decisions",
            "What the budget is used to decide",
            "While budget remains, the team ships features and takes risks; when it is nearly spent, effort moves to reliability. It replaces the argument between 'ship faster' and 'be careful' with a number both sides agreed in advance.",
          ),
          concept(
            "policy",
            "The error budget policy",
            "A written agreement, made before the budget is spent, on what happens when it is: typically a freeze on releases other than reliability fixes until the service is back within its SLO, and who may grant exceptions. Without it the SLO has no consequence.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "slo-doc",
            "Write SLOs for your migration service",
            "For the control API from the migration capstone: choose two or three SLIs users would notice (availability of sandbox creation, migration success rate, stream gap), set targets, compute the monthly error budget in requests and in minutes, and write the policy for what happens when it is spent.",
            { doneWhen: ["A link to the SLO document"] },
          ),
        ]),
      ],
      {
        detail: "Turning 'reliable enough' into a target you can measure, budget and argue from.",
        links: [SRE_RISK, WORKBOOK_SLO],
      },
    ),

    topic(
      "latency",
      "Measuring latency",
      [
        topic("distribution", "Latency is a distribution", [
          concept(
            "mean",
            "Why averages lie",
            "Response times are not bell-shaped: most cluster near a fast value and a long tail stretches far beyond it. 99 requests at 10 ms and one at 2 s average about 30 ms, a figure that describes none of them and hides the request the user complained about.",
          ),
          concept(
            "percentiles",
            "Percentiles",
            "The p99 is the value that 99% of requests were faster than; p50 is the median. Report several (p50, p90, p99, p99.9) and the maximum, because the gaps between them are the information. A high percentile needs enough samples: a p99.9 from 500 requests is decided by one of them.",
          ),
          concept(
            "tail",
            "Why the tail matters",
            "At 1,000 requests per second, 1% slow is ten slow requests every second. One user action usually makes many requests and the heaviest users make the most, so a 'rare' slow request is something most users meet.",
          ),
          concept(
            "errors-apart",
            "Measuring failed requests separately",
            "A request that fails fast pulls the latency numbers down and one that times out pushes them up. Track latency for successes and failures separately, and treat a slow error as worse than a fast one.",
          ),
          concept(
            "vantage",
            "Where the clock starts and stops",
            "Time measured inside a handler leaves out waiting in the accept queue, the proxy, the network and the client's own queue. Server-side latency is a lower bound on what the user felt; measure at the load balancer or the client for the user's number.",
          ),
        ]),
        topic("aggregation", "Aggregating latency", [
          concept(
            "no-averaging",
            "Why percentiles cannot be averaged",
            "A percentile is not a linear statistic. The average of several p99s says nothing about the p99 of the combined traffic: a shard with 10 requests and one with 10,000 get equal weight, and the slow requests may all sit on one shard. You must merge the underlying histograms. The same holds across time: the mean of sixty per-minute p99s is not the hourly p99.",
          ),
          concept("histogram", "Histograms", undefined, {
            links: [PROM_HISTOGRAMS],
            parts: [
              concept(
                "buckets",
                "Counting into buckets",
                "A histogram counts observations into buckets by value range instead of storing each one. Memory is fixed however many requests arrive, and two histograms with the same boundaries merge exactly by adding their counts, across instances or across time.",
              ),
              concept(
                "estimate",
                "Estimating a percentile and its error",
                "Find the bucket where the cumulative count crosses the wanted rank and interpolate inside it. The true value can be anywhere in that bucket, so the error is bounded by its width: with boundaries at 100 ms and 500 ms, a reported p99 of 300 ms means only 'between 100 and 500'.",
              ),
              concept(
                "boundaries",
                "Choosing bucket boundaries",
                "Put a boundary exactly at the SLO threshold, because the share of requests under a boundary is exact with no interpolation. Elsewhere, boundaries usually grow geometrically so the relative error is similar from milliseconds to seconds. HdrHistogram and exponential-bucket histogram formats generate such buckets automatically.",
              ),
              concept(
                "overflow",
                "Values beyond the last bucket",
                "Everything slower than the highest finite boundary lands in one overflow bucket, so a percentile that falls there can only be reported as the last boundary. A tail that looks capped at a round number is usually a bucket limit, not the truth.",
              ),
            ],
          }),
        ]),
        topic("fanout", "Tail latency at scale", [
          concept(
            "amplification",
            "Tail amplification across fan-out",
            "A user request that touches 100 backends waits for the slowest. It hits at least one p99 response 1 - 0.99^100 = 63% of the time, so the backend tail becomes the typical user experience.",
          ),
          concept(
            "hedging",
            "Hedged requests",
            "From the paper 'The Tail at Scale': if a replica has not answered within about its p95 latency, send the same request to a second replica and use whichever answers first. It shortens the tail for a few percent of extra load, and is only safe for requests that can be repeated without harm.",
          ),
        ]),
        topic(
          "omission",
          "Coordinated omission",
          [
            concept(
              "what-is",
              "What coordinated omission is",
              "A closed-loop load tester waits for each response before sending the next on that connection. During a stall it stops sending, so it records one slow request per connection instead of all the requests that would have been delayed, hiding the tail.",
            ),
            concept(
              "arithmetic",
              "The size of the error, worked through",
              "A server freezes for 1 s every 10 s and otherwise answers in 1 ms. One closed-loop connection records about 9,000 fast requests and a single 1 s request per cycle, so p99 and p99.9 read 1 ms. Users arriving at a steady 100 requests per second send 100 requests during each freeze, waiting from up to 1 s down to almost nothing: 10% of all requests are delayed and the true p99 is about 900 ms.",
            ),
            concept(
              "fix",
              "The fix: a schedule and intended start times",
              "Send requests on a fixed schedule whatever the responses do, and measure each from the time it was meant to be sent, not the time it actually was. wrk2 does both. k6's arrival-rate executors (such as constant-arrival-rate) start iterations on the schedule while a free virtual user is available; when none is, they skip the iteration and count it in `dropped_iterations`, so a run with dropped iterations did not apply the load it claims.",
              { links: [WRK2] },
            ),
            concept(
              "in-production",
              "The same bias in production metrics",
              "A stalled server completes few requests during the stall, so its own latency histogram under-counts the bad period, and clients that gave up are not recorded by the server at all. Measurements at the client or load balancer show what the server's view misses.",
            ),
          ],
          { links: [link("How NOT to Measure Latency (Gil Tene, talk)", "https://www.youtube.com/watch?v=lJ8ydIuPFeU")] },
        ),
        topic("load-models", "Open and closed load models", [
          concept(
            "closed",
            "The closed model",
            "A fixed number of users each wait for a response (plus think time) before sending again. The arrival rate falls as the system slows, so the test throttles itself and never pushes the system past what it can serve.",
          ),
          concept(
            "open",
            "The open model",
            "Requests arrive at a rate that does not depend on how fast the system answers, as with independent users on the internet. If arrivals exceed capacity, the queue and latency grow without limit. A public API is close to open, so testing it with a closed tool hides how latency explodes once load passes capacity.",
          ),
          concept(
            "hygiene",
            "Trusting a load test",
            "Check that the load generator is not the bottleneck (its own CPU and network), run it on a separate machine, discard a warm-up period, run long enough to collect the tail, and confirm the achieved rate equals the requested rate before reading any percentile.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "percentiles",
            "Coordinated omission and why percentiles cannot be averaged",
            "Load-test a server that freezes for one second every ten seconds, first with a closed-loop tool (wrk) and then at a constant arrival rate (wrk2 or k6 constant-arrival-rate). Compare the reported p99. Separately, compute p99 on three shards with different traffic, average them, and compare with the p99 of the merged histogram.",
            {
              doneWhen: [
                "p99 from the closed-loop and the constant-rate run, side by side",
                "Averaged shard p99s versus the true merged p99",
              ],
              links: [WRK2],
            },
          ),
          build(
            "writeup",
            "Write-up: measuring latency without lying",
            "Publish your coordinated-omission and percentile-averaging results with the graphs.",
            { doneWhen: ["A link to the published write-up"] },
          ),
        ]),
      ],
      { detail: "Why the usual latency numbers flatter the system, and how to get ones that do not." },
    ),

    topic(
      "methods",
      "Methods for finding the problem",
      [
        topic("why", "Why use a method", [
          concept(
            "anti-methods",
            "Guessing versus a method",
            "Without a method, people look only at the tools they already know (the streetlight anti-method) or change things at random until the problem goes away. A method is a complete list of questions asked in a fixed order, so you finish quickly and know what you have ruled out.",
          ),
        ]),
        topic(
          "use",
          "The USE method",
          [
            concept(
              "definition",
              "Utilization, saturation and errors for every resource",
              "USE is for resources. List them (CPUs, memory, disks, network interfaces, and software resources such as thread pools, connection pools, file descriptors and locks) and for each one check utilization, saturation and errors. Working through the whole list stops you skipping the resource you did not think of.",
            ),
            concept(
              "util-vs-sat",
              "Utilization versus saturation",
              "Utilization is the share of time, or of capacity, in use. Saturation is demand beyond that, visible as a queue. Saturation is what hurts latency, and it can occur at modest average utilization because a one-minute average hides short bursts at 100%.",
            ),
            concept(
              "psi",
              "Pressure stall information",
              "On Linux 4.20 and later, /proc/pressure/cpu, memory and io report the share of time, averaged over 10, 60 and 300 seconds, in which some tasks (the `some` line) or all non-idle tasks (the `full` line) were stalled waiting for that resource. It measures saturation directly, and cgroup v2 exposes the same figures per cgroup in cpu.pressure, memory.pressure and io.pressure.",
            ),
            concept(
              "throttling",
              "CPU throttling under a cgroup quota",
              "A cgroup with a CPU quota (cgroup v2 `cpu.max`, quota per period, 100 ms by default) is not scheduled for the rest of the period once it has used its allowance, even when the host has idle CPUs. It shows as latency spikes with low host utilization; the direct evidence is `nr_throttled` (periods in which it was throttled) and, on cgroup v2, `throttled_usec` rising in the cgroup's cpu.stat.",
            ),
          ],
          { links: [link("The USE method", "https://www.brendangregg.com/usemethod.html")] },
        ),
        topic(
          "red",
          "RED and the golden signals",
          [
            concept(
              "red-method",
              "RED: rate, errors, duration",
              "RED is for request-driven services. For each one record the request rate, the rate of failed requests and the distribution of request durations. The same three graphs for every service mean anyone on call can read any service's dashboard.",
            ),
            concept(
              "golden",
              "The four golden signals",
              "Latency, traffic, errors and saturation, from the SRE book. They are RED plus saturation: how full the service is, measured on its most constrained resource.",
            ),
            concept(
              "together",
              "Using RED and USE together",
              "Request metrics say that callers are hurting; resource metrics say which component is the limit. Start with RED on the service the user calls, follow the errors or latency down the call graph to the service where they begin, then apply USE to that service's resources.",
            ),
          ],
          {
            links: [
              link("The RED method", "https://grafana.com/blog/2018/08/02/the-red-method-how-to-instrument-your-services/"),
              SRE_MONITORING,
            ],
          },
        ),
        topic(
          "sixty",
          "The first 60 seconds on a Linux host",
          [
            concept(
              "purpose",
              "The ten-command checklist",
              "uptime, dmesg | tail, vmstat 1, mpstat -P ALL 1, pidstat 1, iostat -xz 1, free -m, sar -n DEV 1, sar -n TCP,ETCP 1, top. Run in order they cover utilization, saturation and errors for CPU, memory, disk and network in about a minute, and tell you which resource to investigate further.",
            ),
            concept(
              "uptime",
              "uptime and the load average",
              "Load averages over 1, 5 and 15 minutes; comparing them shows whether load is rising or already falling. On Linux the figure counts tasks running, waiting for a CPU, or in uninterruptible sleep (usually disk I/O), so it mixes CPU demand with I/O waiting. Compare it with the CPU count and treat it as a hint of where to look.",
            ),
            concept(
              "dmesg",
              "dmesg | tail",
              "Recent kernel messages: OOM kills, hardware and filesystem errors, and network stack warnings such as suspected SYN flooding. An error here can end the investigation at once.",
            ),
            concept(
              "vmstat",
              "vmstat 1",
              "`r` is threads running or waiting for a CPU, `free` is free memory, `si` and `so` are swap-in and swap-out, and the CPU columns split time into user, system, idle, I/O wait and steal. `r` above the CPU count means CPU saturation; non-zero swapping means memory saturation. The first line shows averages since boot for some columns, so read from the second.",
            ),
            concept(
              "mpstat-pidstat",
              "mpstat -P ALL 1 and pidstat 1",
              "mpstat breaks CPU time down per CPU: one CPU at 100% while the others idle points at a single-threaded bottleneck. pidstat shows CPU use per process as a rolling list, so you can see which process is responsible and how it changes over time.",
            ),
            concept(
              "iostat",
              "iostat -xz 1",
              "Per-device read and write rates, the average time requests took including queueing (the await columns), the average queue length and `%util`. On devices that serve requests in parallel, such as SSDs and arrays, `%util` near 100% does not by itself mean the device is at its limit; judge by latency and queue length.",
            ),
            concept(
              "free",
              "free -m",
              "Free and available memory, and how much is buffers and page cache. Low 'free' with a large cache is normal on Linux because the cache is reclaimable; low 'available' is the warning.",
            ),
            concept(
              "sar",
              "sar -n DEV 1 and sar -n TCP,ETCP 1",
              "The first shows receive and transmit throughput per interface, to compare with the link's limit. The second shows locally initiated connections per second (`active/s`, via connect()), remotely initiated ones (`passive/s`, via accept()) and `retrans/s`; retransmits point to an unreliable network or a server overloaded and dropping packets.",
            ),
            concept(
              "top",
              "top",
              "A final overview that repeats much of the above on one screen and catches anything the earlier commands missed. Its weakness is that the screen keeps refreshing, so patterns over time are easier to see in the rolling tools.",
            ),
          ],
          {
            links: [
              link(
                "Linux performance analysis in 60,000 milliseconds",
                "https://netflixtechblog.com/linux-performance-analysis-in-60-000-milliseconds-accc10403c55",
              ),
            ],
          },
        ),
        topic(
          "tools",
          "Going deeper with eBPF tools",
          [
            concept(
              "ebpf",
              "What eBPF tools add",
              "eBPF lets small verified programs run inside the Linux kernel, attached to events such as scheduler switches, block I/O and TCP functions, and summarise what they see there. The bcc and bpftrace tools built on it show latency distributions and per-event detail that counter-based tools such as vmstat average away.",
            ),
            concept(
              "on-off-cpu",
              "On-CPU versus off-CPU time",
              "A thread's wall-clock time is spent either running on a CPU or off it: waiting in the run queue, blocked on a lock or on I/O, or asleep. A CPU profile explains only the on-CPU part, so a request that is slow while the CPU is idle needs off-CPU analysis.",
            ),
            concept(
              "runqlat",
              "runqlat",
              "A histogram of how long threads waited between becoming runnable and actually running on a CPU (run queue or scheduler latency). Long waits mean CPU saturation; a cgroup's quota throttling also lands here, because throttled threads stay runnable but are not scheduled until the next period.",
            ),
            concept(
              "biolatency",
              "biolatency",
              "A histogram of block device I/O latency. It shows whether the disk is uniformly slow or has occasional outliers, which an average await figure cannot.",
            ),
            concept(
              "tcpretrans",
              "tcpretrans",
              "Prints each TCP retransmission as it happens, with the addresses, ports and connection state, so packet loss can be tied to a particular peer or path.",
            ),
            concept(
              "offcputime",
              "offcputime",
              "Finds where threads spend time blocked (locks, I/O, sleeping) rather than running, which CPU profiles cannot show. It sums off-CPU time by stack trace, so the stack with the most blocked time names the lock or call being waited on.",
            ),
            concept(
              "signatures",
              "Matching a fault to its signature",
              "CPU throttling: a long runqlat tail for the throttled workload while host CPUs sit idle, confirmed by `nr_throttled` rising in its cpu.stat. Memory pressure: falling available memory, swap activity, memory pressure in PSI, then OOM kills in dmesg. A slow disk: high await and a long biolatency tail with low CPU use. Packet loss: `retrans/s` rising and tcpretrans naming the connections. A lock held too long: idle CPU, disk and network while offcputime shows many threads blocked in the same stack.",
            ),
          ],
          { links: [link("Linux eBPF tracing tools", "https://www.brendangregg.com/ebpf.html")] },
        ),
        topic(
          "troubleshoot",
          "Working from symptom to cause",
          [
            concept(
              "loop",
              "The troubleshooting loop",
              "Start from the reported symptom, look at the telemetry, form a hypothesis about the cause, and test it by observing more or by changing something and seeing whether the symptom responds. Write down each hypothesis and what ruled it out; a theory that was eliminated is progress, and it guards against holding on to the first idea.",
            ),
            concept(
              "what-changed",
              "Ask what changed",
              "A working system tends to keep working until something changes: a deploy, a config or flag change, a traffic shift, a dependency's release, an expired certificate. Lining up the start of the symptom against the change log is usually the fastest lead.",
            ),
            concept(
              "bisect",
              "Divide the request path",
              "Follow the request through its components and check the midpoint: is the data there already wrong or late? Halving the path each time finds the faulty component in a few steps, which checking components in arbitrary order does not.",
            ),
          ],
          { links: [SRE_TROUBLESHOOTING] },
        ),
        topic("build", "Build it", [
          build(
            "game-day",
            "eBPF game day",
            "Write a script that injects one of five faults at random into a running service: CPU throttling, memory pressure, a slow disk, packet loss, or a lock held too long. Without looking at which, diagnose it using the 60-second checklist and bcc or bpftrace tools (runqlat, biolatency, tcpretrans, offcputime). Do all five.",
            {
              doneWhen: [
                "For each fault: the tool output that identified it",
                "Time to diagnosis for each, and your first wrong guess",
              ],
              links: [link("bcc tools", "https://github.com/iovisor/bcc")],
            },
          ),
        ]),
      ],
      { detail: "Checklists that get from 'it is slow' to the resource or service responsible." },
    ),

    topic(
      "observability",
      "Observability",
      [
        topic("signals", "Metrics, logs and traces", [
          concept(
            "why",
            "Monitoring versus observability",
            "Monitoring checks for failures you predicted, with dashboards and alerts built in advance. Observability is being able to answer a question you did not predict from the telemetry the system already emits, without shipping new code. It depends on recording enough context (which route, which version, which tenant) with each event.",
          ),
          concept(
            "metrics",
            "Metrics: cheap numbers over time",
            "A metric is a number sampled at intervals and aggregated over all requests. Its cost depends on the number of series, not on traffic, so it is the signal you keep for everything and alert on. It says that something is wrong and by how much, not which request.",
          ),
          concept(
            "logs",
            "Logs: detailed events",
            "A log line is a timestamped record of one event with as much detail as you chose to write. Logs explain what happened in a specific case; their volume and cost grow with traffic, and finding the relevant lines needs something to search by.",
          ),
          concept(
            "traces",
            "Traces: one request across services",
            "A trace shows the path of one request across services with the time spent in each span, so you can see where a specific slow request lost its time. Metrics cannot show this because they aggregate requests together.",
          ),
          concept(
            "workflow",
            "Moving between the signals",
            "A metric shows the symptom and when it began, a trace from that period shows which service and operation is slow or failing, and the logs for that trace ID show why. Shared identifiers (trace ID, service name, version) and exemplars, which attach a sample trace ID to a metric, make each jump direct.",
          ),
        ]),
        topic("metric-model", "Metric types and labels", [
          concept(
            "series",
            "The time series data model",
            "A series is a metric name plus a set of label key-value pairs, such as http_requests_total{method='GET', status='500'}, holding timestamped samples. Each distinct combination of label values is its own series.",
          ),
          concept(
            "counter",
            "Counters",
            "A counter only increases, and restarts from zero when the process restarts: total requests, total errors, total bytes. Its absolute value means nothing; you look at its rate of increase. Events between samples are not lost because each sample carries the running total; only increments made after the last scrape and before a restart are lost.",
          ),
          concept(
            "gauge",
            "Gauges",
            "A gauge is a current value that goes up and down: queue depth, in-flight requests, memory in use. Each sample is a snapshot, so whatever happened between two samples is invisible, which is why a count of events should be a counter and not a gauge.",
          ),
          concept(
            "histogram",
            "Histograms as a metric type",
            "A classic Prometheus histogram is exposed as cumulative counters: one `_bucket` series per upper bound in the `le` label, ending with `+Inf`, plus `_sum` and `_count`. Because they are counters with the same boundaries on every instance, they can be summed across instances before a quantile is estimated. Newer native histograms keep exponential buckets in a single series with no boundaries to choose, and the Prometheus docs now prefer them where available.",
            { links: [PROM_HISTOGRAMS] },
          ),
          concept(
            "summary",
            "Histograms versus summaries",
            "Histograms have fixed buckets, can be aggregated across instances and give approximate quantiles calculated at query time. Summaries calculate quantiles inside each instance, and those per-instance quantiles cannot be aggregated. For anything served by more than one instance, use a histogram.",
          ),
          concept(
            "cardinality",
            "Labels and the cost of cardinality",
            "Every distinct label combination is a separate time series, and the count multiplies across labels: 10 routes x 5 methods x 10 status codes x 100 instances is 50,000 series for one counter, and a histogram multiplies that by its number of buckets. Labels like user ID or request ID create millions of series and exhaust the metrics store.",
          ),
          concept(
            "safe-labels",
            "Choosing labels",
            "A label is safe when its set of values is small and bounded: method, status code, route template (not the raw path), region, version. Unbounded identifiers (user, request, session, full URL, and tenant once there are many) belong in logs and traces, which are built for high-cardinality data.",
          ),
        ]),
        topic("prometheus", "Prometheus and PromQL basics", [
          concept(
            "pull",
            "The pull model",
            "Prometheus fetches each target's /metrics page over HTTP at a fixed interval and stores the samples; targets are found through service discovery. A failed scrape is itself a signal: the target's `up` series becomes 0. Nothing shorter than the scrape interval can be resolved, and short-lived jobs that cannot be scraped push to the Pushgateway instead.",
          ),
          concept(
            "rate",
            "Selectors, range vectors and rate()",
            "A selector such as http_requests_total{status=~'5..'} picks series by label matchers; adding [5m] returns each series' samples from the last five minutes (a range vector). rate() of that is the per-second average increase of the counter over the window, with counter resets compensated. The window must hold at least two samples, so make it several scrape intervals long.",
          ),
          concept(
            "aggregate",
            "Aggregating: rate first, then sum",
            "sum by (route) (rate(http_requests_total[5m])) gives requests per second per route across all instances. Take the rate of each series before summing: summing raw counters first hides an individual instance's reset and produces a false spike. An error ratio is one such sum divided by another.",
          ),
          concept(
            "quantile",
            "histogram_quantile()",
            "histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket[5m]))) estimates the p99 across all instances: rate the buckets, sum them while keeping `le`, then interpolate. The result is only as precise as the bucket it falls in.",
          ),
        ]),
        topic("logging", "Structured logging", [
          concept(
            "structured",
            "Key-value logs instead of free text",
            "Emit each log line as key-value data (commonly JSON) with consistent field names, so a machine can filter and aggregate on fields without regular expressions. The message says what happened; everything variable goes in fields.",
          ),
          concept(
            "ids",
            "A trace or request ID on every line",
            "Every log line written while handling a request carries the trace or request ID, so logs can be joined with traces and with each other. Without it, the lines of concurrent requests are interleaved and cannot be separated.",
          ),
          concept(
            "levels",
            "Levels, volume and what not to log",
            "Log cost grows with traffic, so levels (debug, info, warn, error) and sampling of repetitive lines keep it in check. An error-level line should mean something needs attention. Secrets, tokens and personal data must not be logged, because logs are widely readable and kept for a long time.",
          ),
          concept(
            "wide-events",
            "One wide event per request",
            "As well as scattered lines, emit a single structured event when each request ends, holding everything known about it: route, status, duration, tenant, version, key timings. This 'canonical log line' answers most questions with one query and no joins.",
          ),
        ]),
        topic("tracing", "Distributed tracing", [
          concept(
            "trace-span",
            "Traces and spans",
            "A span is one timed operation: a name, a start time, a duration, a span ID, its parent's span ID, and attributes, events and a status describing it. A trace is all the spans sharing one trace ID, forming a tree from the root span (the incoming request) down through every call it caused.",
          ),
          concept("propagation", "Context propagation", undefined, {
            parts: [
              concept(
                "header",
                "Between services",
                "Passing the trace ID and parent span ID along with each outgoing call so spans from different services join into one trace. The W3C `traceparent` header carries a version, the 16-byte trace ID, the 8-byte parent span ID and flags that include the sampled bit.",
              ),
              concept(
                "in-process",
                "Inside a process",
                "The current span must also travel through your own code to wherever the next outgoing call is made; in Go it rides in context.Context. Dropping the context, for example by starting a goroutine or queueing work without passing it on, starts a new trace with no link to the original.",
              ),
            ],
          }),
          concept("sampling", "Sampling", undefined, {
            parts: [
              concept(
                "why",
                "Why traces are sampled",
                "Recording every span of every request costs CPU, network and storage in proportion to traffic, and most traces of healthy requests look alike. Sampling keeps a fraction. Metrics should still be computed from every request, not from the sampled traces.",
              ),
              concept(
                "head",
                "Head sampling",
                "The keep-or-drop decision is made when the trace starts and travels with the context (the sampled flag), so when downstream services follow their parent's decision every service keeps or drops the same traces. It is cheap, but it is made before anything is known about the request, so a 1% sample also keeps only 1% of the rare errors and slow requests.",
              ),
              concept(
                "tail",
                "Tail sampling",
                "The decision is made after the trace has finished, so every error and slow trace can be kept along with a small sample of the rest. All spans must be buffered until then, and all spans of one trace must reach the same collector instance, which makes it costlier to run.",
              ),
            ],
          }),
          concept(
            "reading",
            "Reading a trace",
            "In the waterfall view, find the span whose own time, not its children's, accounts for the delay. Common shapes: many identical calls in sequence (a query in a loop), calls made one after another that could run in parallel, a long gap with no child spans (uninstrumented work or queueing), and retries visible as repeated spans.",
          ),
        ]),
        topic(
          "otel",
          "OpenTelemetry",
          [
            concept(
              "what",
              "What OpenTelemetry is",
              "A vendor-neutral standard and toolkit for producing telemetry: a specification, an API and SDK per language, a wire protocol (OTLP), the Collector, and naming conventions. Code instrumented once can send traces, metrics and logs to any backend that accepts OTLP.",
            ),
            concept(
              "api-sdk",
              "API versus SDK",
              "Libraries and application code call the API to create spans and record measurements; on its own the API does nothing. The application installs the SDK at startup, and the SDK decides sampling, batching and where to export. The split lets a library be instrumented without forcing a backend on its users.",
            ),
            concept(
              "instrument",
              "Instrumentation libraries, resources and conventions",
              "Ready-made wrappers for HTTP servers and clients, gRPC and database drivers create spans and propagate context for you; manual spans cover your own logic. A resource (service name, version, instance) labels everything a process emits, and semantic conventions fix attribute names such as http.route so that tools agree on their meaning.",
            ),
            concept(
              "collector",
              "The Collector and OTLP",
              "The Collector is a separate process that receives telemetry, processes it and exports it: pipelines of receivers, processors (batching, filtering, sampling, redaction) and exporters. Services send OTLP, over gRPC (port 4317 by default) or HTTP (port 4318), and need no knowledge of the backend. It runs beside each service, as a central gateway, or both.",
            ),
          ],
          { links: [link("OpenTelemetry concepts", "https://opentelemetry.io/docs/concepts/")] },
        ),
        topic("dashboards", "Dashboards", [
          concept(
            "questions",
            "Dashboards that answer questions",
            "Each panel should answer a question someone asks during an incident: are users affected, since when, which route or dependency, which resource. A panel nobody can state the question for is noise. Show request rate, error ratio and latency percentiles or a heatmap, not an average latency alone.",
          ),
          concept(
            "layout",
            "Laying out a service dashboard",
            "Top row: the user-facing SLIs (RED). Below: the same three for each dependency the service calls. Below that: USE for its resources. Keep the layout and units the same for every service, and mark deploys on the time axis so a change in a graph can be matched to a change in the system.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "otel-stack",
            "Instrument two services end to end",
            "Take two of your Go services (for example the proxy from Networking and the control API). Add OpenTelemetry traces with context propagated across the HTTP call, RED metrics with latency histograms, and structured logs carrying the trace ID. Run a Collector, Prometheus, Grafana and a trace backend with Docker Compose. Build one dashboard and follow one slow request from the graph to its trace to its log line.",
            {
              doneWhen: [
                "A link to the instrumented services and compose file",
                "A screenshot or export of one trace spanning both services",
              ],
            },
          ),
          build(
            "design-doc",
            "Design doc: observability for a multi-tenant sandbox platform",
            "One page: which signals, which labels are safe (tenant ID cardinality), per-tenant SLOs, sampling, what you would page on and what goes to a ticket.",
            { doneWhen: ["A link to the design doc"] },
          ),
        ]),
      ],
      { detail: "Instrument once, then answer questions nobody thought of in advance." },
    ),

    topic(
      "alerting",
      "Alerting",
      [
        topic(
          "what",
          "What deserves an alert",
          [
            concept(
              "purpose",
              "An alert is a request for a human to act",
              "A page interrupts someone, so it must be urgent, real and something a person can act on now. It should say what is wrong in user terms and link to the dashboard and a runbook with the first steps. If the right response is to ignore it, the alert should not exist.",
            ),
            concept(
              "symptoms",
              "Alert on symptoms, not causes",
              "Users feel symptoms (errors, latency). Cause-based alerts, such as high CPU or a restarted process, fire when users are fine and miss failures nobody predicted. A symptom alert on the SLI catches every cause; the causes belong on the dashboard you open after the page.",
            ),
            concept(
              "box",
              "Black-box and white-box monitoring",
              "Black-box monitoring tests externally visible behaviour as a user would, so it fires only on problems already hurting users and suits paging. White-box monitoring reads metrics, logs and traces from inside the system, so it can also show imminent problems and failures that retries are hiding from users. You need both.",
            ),
            concept(
              "page-ticket",
              "Pages, tickets and everything else",
              "A page is for a problem that needs action within minutes. A ticket is for something that needs action within days, such as a slow budget burn or a disk that will fill next week. Anything that needs no action is not an alert; it is a graph or a log.",
            ),
            concept(
              "attributes",
              "Four ways to judge an alert",
              "Precision is the share of alerts that were real problems; recall is the share of real problems that alerted; detection time is how long a problem runs before the alert; reset time is how long the alert keeps firing after recovery. Improving one usually costs another.",
            ),
            concept(
              "threshold",
              "Why a plain error-rate threshold fails",
              "'Error rate at or above 0.1% over the last 10 minutes' on a 99.9% SLO can page after spending about 0.02% of the monthly budget. Requiring the condition to hold for longer (a `for` clause on a Prometheus alerting rule) does not fix it: the timer resets on every brief recovery, and a total outage waits out the same delay as a mild one. A threshold has no notion of how much budget is at stake.",
            ),
          ],
          { links: [SRE_MONITORING] },
        ),
        topic(
          "burn",
          "Burn-rate alerts",
          [
            concept(
              "burn-rate",
              "Burn rate",
              "How fast the error budget is being consumed relative to the rate that would spend it exactly over the SLO window. Burn rate 1 uses it up precisely at the window's end. It equals the observed error ratio divided by the budget: 1% errors against a 99.9% SLO is burn rate 10, and at burn rate B the budget lasts window / B.",
            ),
            concept(
              "arithmetic",
              "From budget spent to an alert threshold",
              "Decide how much budget an episode may consume before someone is told, and over what time. Burn rate = share of budget x SLO window / alert window: 2% of a 30-day budget in 1 hour is 0.02 x 720 = 14.4. The alert threshold is burn rate x budget: 14.4 x 0.1% = 1.44% errors over the last hour.",
            ),
            concept(
              "multi-burn",
              "Several burn rates",
              "One threshold cannot catch both fast and slow burns. The Workbook's set for a 99.9% SLO over 30 days: page at burn rate 14.4 over 1 hour (2% of budget) and at 6 over 6 hours (5%), and open a ticket at burn rate 1 over 3 days (10%).",
            ),
            concept(
              "multi-window",
              "Two windows per alert",
              "The long window proves the problem is significant; the short window proves it is still happening, so the alert stops soon after recovery. The short window is 1/12 of the long one (5 minutes with 1 hour, 30 minutes with 6 hours, 6 hours with 3 days) and both must exceed the same burn rate.",
            ),
            concept(
              "expression",
              "Writing it as a Prometheus rule",
              "The alert is two error ratios joined with `and`: the ratio over 1h above 14.4 x 0.001, and the ratio over 5m above the same value. Each ratio is sum(rate(errors[window])) / sum(rate(requests[window])). Recording rules store such expressions as new series on a schedule, which keeps the alert cheap to evaluate.",
            ),
            concept(
              "detection",
              "Predicting when an alert fires",
              "With steady traffic and no errors beforehand, a window's error ratio reaches the threshold after window x threshold / actual error rate. For the 1-hour, 1.44% alert: a total outage fires in about 52 seconds and a 5% error rate in about 17 minutes, plus the rule evaluation interval. A total outage shorter than about 50 seconds never pages.",
            ),
            concept(
              "low-traffic",
              "Low-traffic services",
              "With few requests the error ratio is noisy: one failure in ten requests is a 10% error rate and, against 99.9%, a burn rate of 100. The options are to add synthetic traffic, to combine small related services into one monitored aggregate, to make one failure matter less (client retries with backoff, fallbacks), or to lower the SLO or lengthen the alert window.",
            ),
          ],
          { links: [WORKBOOK_ALERTING] },
        ),
        topic("practice", "Keeping alerts useful", [
          concept(
            "fatigue",
            "Alert fatigue",
            "When most pages need no action, people acknowledge by habit and respond slowly to the one that matters. Every non-actionable page lowers the value of the rest. The fix is to review recent pages regularly and delete, demote or automate them, not to ask people to be more vigilant.",
          ),
          concept(
            "routing",
            "Grouping, inhibition and silences",
            "One failure can trigger hundreds of alerts. Grouping merges related alerts into one notification, inhibition suppresses alerts that are consequences of another firing alert, and silences mute known issues during maintenance. Prometheus Alertmanager provides all three, plus routing to the right team.",
          ),
          concept(
            "dead-man",
            "Monitoring the monitoring",
            "If the metrics pipeline or the alerting system is down, silence looks like health. An always-firing alert sent to an outside service that pages when it stops arriving detects this, and a metric that disappears should alert just as a bad one does. Monitoring must not depend on the system it watches.",
          ),
          concept(
            "on-call",
            "On-call rotations and escalation",
            "A rotation makes one named person responsible at any time, with a secondary to escalate to when a page is not acknowledged within a set time, and a handoff that passes on open issues. The load has to be sustainable: someone paged all night decides worse the next day.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "burn-rate",
            "A burn-rate alert that fires for the right reasons",
            "Implement the Workbook's multiwindow, multi-burn-rate alert for your availability SLO in Prometheus. Inject a total outage, a 5% error rate and a brief blip. Predict from the burn-rate arithmetic which alert each should trigger, then record which alerts fire and how fast, and confirm the blip does not page.",
            { doneWhen: ["For each of the three faults: which alert fired and after how long"] },
          ),
        ]),
      ],
      { detail: "Waking someone only when users are hurting, and fast enough to matter." },
    ),

    topic(
      "incidents",
      "Incidents",
      [
        topic("response", "Running an incident", [
          concept(
            "declare",
            "What an incident is and when to declare one",
            "An incident is a problem that needs a coordinated response rather than one person fixing it. Declare early, on criteria agreed in advance: a second team is needed, customers can see it, or it is unsolved after an hour of focused work. Standing down a false alarm is cheap; getting organised hours into an outage is not.",
          ),
          concept(
            "severity",
            "Severity levels",
            "A short scale defined in advance by user impact, which decides who is paged, how often updates go out and whether a postmortem is required. Debating the scale during an incident wastes the time it was meant to save.",
          ),
          concept(
            "unmanaged",
            "How an unmanaged incident goes wrong",
            "Everyone dives into the technical problem and nobody keeps the overall picture; nobody tells stakeholders what is happening; and well-meaning people make uncoordinated changes that collide or hide the cause. The roles exist to prevent these three.",
          ),
          concept("roles", "Roles", undefined, {
            parts: [
              concept(
                "ic",
                "Incident commander",
                "Holds the overall state of the incident, assigns work and makes the decisions, staying out of hands-on fixing so the overall view is not lost. Any role not delegated stays with the commander. Handing the role over is explicit and acknowledged: 'you are now the incident commander'.",
              ),
              concept(
                "ops",
                "Operations",
                "The people doing the hands-on work, led by one person, and the only ones changing the system during the incident. They report what they see and do to the commander.",
              ),
              concept(
                "comms",
                "Communications",
                "Keeps stakeholders and users informed with updates at a stated interval, even when there is nothing new, and keeps the incident record accurate. This stops responders being interrupted for status.",
              ),
              concept(
                "planning",
                "Planning",
                "Supports operations with the longer view: filing bugs, tracking temporary changes that must be undone afterwards, and arranging handoffs and relief when an incident runs long.",
              ),
            ],
          }),
          concept(
            "shared-state",
            "One channel and one living document",
            "All coordination happens in one place, and a shared document records the current status, who holds each role, what has been tried and what is in progress. Anyone joining reads it instead of asking, and it becomes the raw material for the postmortem.",
          ),
          concept(
            "mitigate",
            "Mitigate before diagnosing",
            "The first goal is to stop users being hurt, not to understand why. Roll back, move traffic away or turn the feature off as soon as one of them is plausible, then find the cause with the pressure off. Capture cheap evidence first (logs, a dump, one bad instance kept out of rotation) only if it does not delay the mitigation.",
          ),
          concept(
            "mitigations",
            "Generic mitigations",
            "Actions that help without knowing the cause: roll back the latest release or config change, fail over or drain traffic from a bad zone or instance, add capacity, switch off a feature flag, shed or rate-limit load. They work in the middle of an incident only if they were built and practised beforehand.",
          ),
          concept(
            "timeline",
            "Keeping a timeline",
            "Record events with timestamps in one time zone as they happen: when it started, when and how it was detected, each action and its effect, when users recovered. The gaps give time to detect and time to mitigate, the two durations worth shortening.",
          ),
        ]),
        topic("postmortem", "Blameless postmortems", [
          concept(
            "when",
            "When to write one",
            "Define the triggers in advance: user-visible impact beyond a threshold, any data loss, an on-call intervention such as a rollback or traffic shift, a slow resolution, or a monitoring failure where a human found the problem before an alert did.",
          ),
          concept(
            "blameless",
            "What makes a postmortem blameless",
            "It examines how the system and process allowed the failure, assuming people acted reasonably with what they knew, so facts surface instead of being hidden. 'They should have noticed' judges a decision by an outcome nobody had at the time; ask instead why the action made sense then. Blame teaches people to stop reporting.",
          ),
          concept(
            "contents",
            "What belongs in a postmortem",
            "Impact, timeline, how it was detected, root cause and contributing factors, what went well and badly (including where you were lucky), and concrete action items with owners.",
          ),
          concept(
            "factors",
            "Trigger, root cause and contributing factors",
            "The trigger is the event that started the outage, such as a deploy or a traffic spike. The causes are the conditions that let it do damage: a missing test, no rate limit, an alert that did not fire. Serious outages need several at once, so stopping at one root cause, or at 'human error', leaves the others in place.",
          ),
          concept(
            "actions",
            "Action items that get done",
            "Each action is specific, has one owner and a tracked ticket, and is prioritised against other work. Aim for a mix that prevents recurrence, detects it sooner and limits its impact. Review the document with people outside the incident and publish it widely, because the same weakness usually exists elsewhere.",
          ),
        ]),
        topic("practice", "Practising failure", [
          concept(
            "game-days",
            "Game days",
            "A scheduled exercise in which a failure is injected or simulated and the team responds as if it were real. It tests the alerts, dashboards, runbooks and roles while the stakes are low, and shows which mitigations do not work before they are needed.",
          ),
          concept(
            "chaos",
            "Fault injection as an experiment",
            "State a hypothesis about steady state ('error rate stays under 0.1% if one instance dies'), inject the fault with a limited blast radius and a way to stop, and compare the result with the prediction. Typical faults: a killed process, added latency, packet loss, a full disk, an unavailable dependency.",
          ),
          concept(
            "drills",
            "Role-play and drills",
            "Walking through a past incident as a tabletop exercise (the SRE book's 'Wheel of Misfortune') trains new on-call engineers without touching production. Rarely used procedures such as failover and restoring from backup only work if they are run on a schedule.",
          ),
        ]),
        topic("changes", "Making changes safely", [
          concept(
            "change-risk",
            "Most outages follow a change",
            "The SRE book reports that roughly 70% of outages are due to changes in a live system: deploys, config pushes, flag flips, schema changes. So the cheapest reliability work is making every change roll out gradually, detected quickly when it goes wrong, and reversible.",
          ),
          concept(
            "canary",
            "Progressive rollouts and canaries",
            "Release to a small slice first (a few instances, one zone or a percentage of users), compare its SLIs against the unchanged fleet over the same period, and widen in steps only while they match. A canary that serves too little traffic or runs too briefly cannot show a rare failure.",
          ),
          concept(
            "rollback",
            "Rollback as the default response",
            "A change that might be the cause is rolled back first and investigated afterwards. That only works if rollback is fast, practised and safe, which rules out changes that cannot be undone, such as a schema migration the old version cannot read; those are split into backward-compatible steps.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "postmortem",
            "Write a blameless postmortem",
            "Write up your hardest game-day fault as a real postmortem: impact, timeline, detection, root cause, contributing factors, what went well, and action items with owners.",
            { doneWhen: ["A link to the postmortem"] },
          ),
        ]),
      ],
      {
        detail: "Coordinating people under pressure, and learning from the outage afterwards.",
        links: [SRE_INCIDENTS],
      },
    ),

    topic(
      "capacity",
      "Capacity planning",
      [
        topic("queueing", "Queueing intuition", [
          concept(
            "question",
            "The capacity question",
            "Capacity is the highest load one instance can serve while still meeting the SLO, not the load at which it falls over. Capacity planning is finding that number, working out how many instances peak demand needs, and adding headroom.",
          ),
          concept(
            "latency-vs-util",
            "Why latency rises long before 100% utilization",
            "Utilization is arrival rate x service time: 50 requests per second at 10 ms each keeps one server busy half the time. Requests arrive in bursts, so a queue forms sometimes even then. In the simplest model (M/M/1: random arrivals, random exponentially distributed service times, one server) mean response time is service time / (1 - utilization): 2x at 50%, 5x at 80%, 10x at 90%, 20x at 95%.",
          ),
          concept(
            "variability",
            "Variability and pooling",
            "The more arrivals and service times vary, the longer the queue at the same utilization, so one occasional slow request delays many fast ones. Several servers sharing one queue can run at higher utilization for the same wait than servers with a queue each, because no server sits idle while work waits elsewhere.",
          ),
          concept(
            "littles-law",
            "Little's law",
            "Average requests in the system = arrival rate x average time each spends there. At 1,000 requests per second and 50 ms each, about 50 are in flight at once. It converts between latency, throughput and concurrency when sizing thread pools, connection pools and concurrency limits.",
          ),
          concept(
            "knee",
            "The knee of the curve",
            "Plotted against load, latency stays nearly flat and then bends sharply upward where a resource saturates, while throughput follows the offered load up to that point and then flattens. Operating points belong well to the left of the knee, because near it a small rise in load causes a large rise in latency.",
          ),
          concept(
            "overload",
            "Past capacity",
            "With arrivals above capacity the queue grows without bound, requests wait longer than their callers' timeouts, and the server spends its time on work nobody is waiting for, so useful throughput falls below capacity. Bounded queues, deadlines and load shedding keep it serving what it can.",
            { links: [SRE_OVERLOAD] },
          ),
        ]),
        topic("testing", "Load testing for capacity", [
          concept(
            "step-test",
            "Stepping load to find capacity",
            "Increase load at a constant arrival rate in steps until latency or errors breach the SLO; the last passing step is the capacity, and USE shows which resource saturated. Hold each step long enough to reach a steady state and collect the tail.",
          ),
          concept(
            "realism",
            "Making the test representative",
            "Capacity depends on the request mix, payload sizes, data volume, cache warmth and the hardware. A test of one cheap endpoint against an empty database measures a different system. Replay or model the production mix on production-sized data.",
          ),
          concept(
            "bottleneck",
            "The bottleneck moves",
            "Capacity is set by the first resource to saturate: CPU, memory, a connection pool, a lock, a downstream dependency. Removing that limit raises capacity only as far as the next one, so re-run the test after each fix and name the new limiting resource.",
          ),
        ]),
        topic("planning", "Headroom, autoscaling and forecasting", [
          concept(
            "peak",
            "Plan for the peak",
            "Traffic has daily and weekly cycles and occasional spikes, so the average says little. Capacity is sized for the highest expected peak, and the peak-to-average ratio shows how much of the fleet sits idle off-peak.",
          ),
          concept(
            "headroom",
            "Headroom",
            "Spare capacity kept above peak demand to absorb bursts, the loss of an instance or a zone, deploys that take instances out of service, and growth during the time it takes to add more. Across three zones, losing one moves its load to the other two, so each must run below two thirds of its capacity beforehand.",
          ),
          concept(
            "autoscale-signal",
            "Choosing an autoscaling signal",
            "A good signal rises in proportion to load and falls when instances are added: CPU utilization for CPU-bound services, in-flight requests per instance for I/O-bound ones, queue length or lag for workers. A scaler can then aim for current instances x current value / target value. Latency is a poor signal: flat until the knee, then a jump that says nothing about how many instances to add.",
          ),
          concept(
            "autoscale-limits",
            "What autoscaling cannot do",
            "New instances take time to start and warm up, so a reactive scaler is always behind a sudden spike and headroom is still needed. Scale up quickly and down slowly to avoid oscillation, set minimum and maximum bounds, and remember that scaling a stateless tier can overload the database or dependency behind it.",
          ),
          concept(
            "forecast",
            "Forecasting demand",
            "Extrapolate organic growth from the trend in past peaks, add planned events (launches, campaigns, migrations) on top, and convert to resources with the measured capacity per instance. The forecast must reach further ahead than the lead time for obtaining capacity, and is checked against actuals and corrected regularly.",
          ),
          concept(
            "cost",
            "Pricing a request",
            "Cost per million requests = hourly instance price / (requests per second at the operating point x 3,600) x 1,000,000. An instance at $0.10 per hour serving 500 requests per second costs about $0.056 per million; run it at 60% of that for headroom and the figure is about $0.093.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "knee",
            "Find the knee and price a request",
            "Raise constant-rate load on one service step by step until latency bends upward. Identify the saturated resource with USE. State the capacity of one instance at your SLO, and work out the cost per million requests on a cloud instance of that size.",
            {
              doneWhen: [
                "Throughput versus p99 latency at each load step",
                "Capacity per instance and cost per million requests, with your arithmetic",
              ],
            },
          ),
        ]),
      ],
      { detail: "How much load one instance can take at the SLO, and how many instances that means." },
    ),
  ],
);
