import { cards, lab, link, note, output, read, url } from "../dsl";
import type { Phase } from "../types";

const SRE_BOOK = link("Site Reliability Engineering (2016 edition, free)", "https://sre.google/sre-book/table-of-contents/");
const WORKBOOK = link("The Site Reliability Workbook", "https://sre.google/workbook/table-of-contents/");

export const phase: Phase = {
  id: "reliability",
  label: "Phase 10",
  title: "Reliability and observability",
  summary:
    "Define what 'working' means for users, measure it honestly, alert on it, and diagnose a sick system from its symptoms. Latency percentiles get the scrutiny they deserve.",
  weeks: { start: 41, end: 43 },
  pillar: "reliability",
  modules: [
    {
      id: "rel-slos",
      title: "SLOs and measuring latency honestly",
      summary: "Week 41. Reliability as a number you can budget.",
      items: [
        read("rel-sre-book", "SRE book: risk, SLOs and monitoring", {
          week: 41,
          hours: 5,
          source: "Site Reliability Engineering",
          chapters: "Ch. 3 Embracing Risk, ch. 4 Service Level Objectives, ch. 6 Monitoring Distributed Systems",
          links: [SRE_BOOK],
        }),
        read("rel-workbook-slo", "SRE Workbook: implementing and alerting on SLOs", {
          week: 41,
          hours: 6,
          source: "The Site Reliability Workbook",
          chapters: "Ch. 2 Implementing SLOs, ch. 5 Alerting on SLOs (burn rates, multiwindow alerts)",
          links: [WORKBOOK],
        }),
        read("rel-gil-tene", "How NOT to measure latency", {
          week: 41,
          hours: 1,
          source: "Gil Tene (talk)",
          chapters: "Watch all of it; the coordinated omission section is the key part",
          links: [link("How NOT to Measure Latency", "https://www.youtube.com/watch?v=lJ8ydIuPFeU")],
        }),
        lab("rel-percentiles", "Coordinated omission and why percentiles cannot be averaged", {
          week: 41,
          hours: 6,
          brief:
            "Load-test a server that freezes for one second every ten seconds, first with a closed-loop tool (wrk) and then at a constant arrival rate (wrk2 or k6 constant-arrival-rate). Compare the reported p99. Separately, compute p99 on three shards with different traffic, average them, and compare with the p99 of the merged histogram.",
          evidence: [
            output("omission", "p99 from the closed-loop and the constant-rate run, side by side"),
            output("average", "Averaged shard p99s vs the true merged p99"),
          ],
          links: [link("wrk2", "https://github.com/giltene/wrk2")],
        }),
        read("rel-methods", "The USE and RED methods", {
          week: 41,
          hours: 1.5,
          source: "Brendan Gregg; Grafana Labs",
          links: [
            link("The USE method", "https://www.brendangregg.com/usemethod.html"),
            link("The RED method", "https://grafana.com/blog/2018/08/02/the-red-method-how-to-instrument-your-services/"),
          ],
        }),
        lab("rel-slo-doc", "Write SLOs for your migration service", {
          week: 41,
          hours: 3,
          brief:
            "For your Capstone 1 control API: choose two or three SLIs users would notice (availability of sandbox creation, migration success rate, stream gap), set targets, compute the monthly error budget in requests and in minutes, and write the policy for what happens when it is spent.",
          evidence: [url("doc", "Link to the SLO document")],
        }),
      ],
    },
    {
      id: "rel-observability",
      title: "Metrics, traces and alerts",
      summary: "Week 42. Instrument once, answer many questions.",
      items: [
        read("rel-otel", "OpenTelemetry concepts", {
          week: 42,
          hours: 3,
          source: "OpenTelemetry documentation",
          chapters: "Concepts: signals (traces, metrics, logs), context propagation, the Collector, sampling",
          links: [link("OpenTelemetry concepts", "https://opentelemetry.io/docs/concepts/")],
        }),
        read("rel-histograms", "Prometheus histograms and summaries", {
          week: 42,
          hours: 1.5,
          source: "Prometheus documentation",
          links: [link("Histograms and summaries", "https://prometheus.io/docs/practices/histograms/")],
        }),
        lab("rel-otel-stack", "Instrument two services end to end", {
          week: 42,
          hours: 10,
          brief:
            "Take two of your Go services (for example the proxy and the control API). Add OpenTelemetry traces with context propagated across the HTTP call, RED metrics with latency histograms, and structured logs carrying the trace ID. Run a Collector, Prometheus, Grafana and a trace backend with Docker Compose. Build one dashboard and follow one slow request from the graph to its trace to its log line.",
          evidence: [
            url("repo", "Link to the instrumented services and compose file"),
            output("trace", "A screenshot or export of one trace spanning both services"),
          ],
        }),
        lab("rel-burn-rate", "A burn-rate alert that fires for the right reasons", {
          week: 42,
          hours: 6,
          brief:
            "Implement the Workbook's multiwindow, multi-burn-rate alert for your availability SLO in Prometheus. Inject a total outage, a 5% error rate and a brief blip. Record which alerts fire and how fast, and confirm the blip does not page.",
          evidence: [output("alerts", "For each of the three faults: which alert fired and after how long")],
        }),
        lab("rel-design-observability", "Design doc: observability for a multi-tenant sandbox platform", {
          week: 42,
          hours: 3,
          brief:
            "One page: which signals, which labels are safe (tenant ID cardinality), per-tenant SLOs, sampling, what you would page on and what goes to a ticket.",
          evidence: [url("doc", "Link to the design doc")],
        }),
      ],
    },
    {
      id: "rel-incidents",
      title: "Diagnosis, incidents and capacity",
      summary: "Week 43. From 'it is slow' to a cause, under time pressure.",
      items: [
        read("rel-60-seconds", "Linux performance analysis in 60 seconds, and eBPF tools", {
          week: 43,
          hours: 3,
          source: "Netflix Tech Blog; Brendan Gregg",
          links: [
            link(
              "Linux performance analysis in 60,000 milliseconds",
              "https://netflixtechblog.com/linux-performance-analysis-in-60-000-milliseconds-accc10403c55",
            ),
            link("Linux eBPF tracing tools", "https://www.brendangregg.com/ebpf.html"),
          ],
        }),
        lab("rel-game-day", "eBPF game day", {
          week: 43,
          hours: 8,
          brief:
            "Write a script that injects one of five faults at random into a running service: CPU throttling, memory pressure, a slow disk, packet loss, or a lock held too long. Without looking at which, diagnose it using the 60-second checklist and bcc or bpftrace tools (runqlat, biolatency, tcpretrans, offcputime). Do all five.",
          evidence: [
            output("tools", "For each fault: the tool output that identified it"),
            note("time", "Time to diagnosis for each, and your first wrong guess"),
          ],
          links: [link("bcc tools", "https://github.com/iovisor/bcc")],
        }),
        read("rel-incident-chapters", "SRE book: troubleshooting, incidents and postmortems", {
          week: 43,
          hours: 4,
          source: "Site Reliability Engineering",
          chapters: "Ch. 12 Effective Troubleshooting, ch. 14 Managing Incidents, ch. 15 Postmortem Culture",
          links: [SRE_BOOK],
        }),
        lab("rel-postmortem", "Write a blameless postmortem", {
          week: 43,
          hours: 3,
          brief:
            "Write up your hardest game-day fault as a real postmortem: impact, timeline, detection, root cause, contributing factors, what went well, and action items with owners.",
          evidence: [url("doc", "Link to the postmortem")],
        }),
        lab("rel-capacity", "Find the knee and price a request", {
          week: 43,
          hours: 5,
          brief:
            "Raise constant-rate load on one service step by step until latency bends upward. Identify the saturated resource with USE. State the capacity of one instance at your SLO, and work out the cost per million requests on a cloud instance of that size.",
          evidence: [
            output("curve", "Throughput vs p99 latency at each load step"),
            note("cost", "Capacity per instance and cost per million requests, with your arithmetic"),
          ],
        }),
        lab("rel-writeup", "Write-up: measuring latency without lying", {
          week: 43,
          hours: 3,
          brief: "Publish your coordinated-omission and percentile-averaging results with the graphs.",
          evidence: [url("post", "Link to the published write-up")],
        }),
      ],
    },
  ],
};

export const quiz = [
  ...cards("rel-slos", [
    ["SLI, SLO, SLA: what is each?", "SLI: a measured indicator of service health (share of good requests). SLO: the target for that indicator over a window. SLA: a contract with consequences if a target is missed."],
    ["What is an error budget?", "One minus the SLO: the amount of failure you are allowed in the window. A 99.9% monthly SLO allows about 43 minutes of full outage."],
    ["Why not aim for 100% reliability?", "Each extra nine costs far more, users cannot tell beyond a point because their own network is less reliable, and it leaves no room to ship changes."],
    ["Why can you not average percentiles?", "A percentile is not a linear statistic. The average of several p99s says nothing about the p99 of the combined traffic; you must merge the underlying histograms."],
    ["What is coordinated omission?", "A load tester that waits for each response before sending the next stops sending during a stall, so it records one slow request instead of all the requests that would have been delayed, hiding the tail."],
    ["Why does tail latency matter more as systems fan out?", "A user request touching 100 backends hits at least one p99 response 63% of the time, so the backend tail becomes the typical user experience."],
    ["What do USE and RED each apply to?", "USE (utilization, saturation, errors) is for resources such as CPU and disk. RED (rate, errors, duration) is for request-driven services."],
    ["Why alert on symptoms rather than causes?", "Users feel symptoms (errors, latency). Cause-based alerts fire when users are fine and miss failures nobody predicted."],
  ]),
  ...cards("rel-observability", [
    ["What is a burn rate?", "How fast the error budget is being consumed relative to the rate that would spend it exactly over the SLO window. Burn rate 1 uses it up precisely at the window's end."],
    ["Why use two windows in a burn-rate alert?", "The long window proves the problem is significant; the short window proves it is still happening, so the alert stops soon after recovery."],
    ["What does a trace show that metrics cannot?", "The path of one request across services with the time spent in each span, so you can see where a specific slow request lost its time."],
    ["What is context propagation?", "Passing the trace ID and parent span ID along with each outgoing call (for example in the traceparent header) so spans from different services join into one trace."],
    ["Why is label cardinality a problem for metrics?", "Every distinct label combination is a separate time series. Labels like user ID or request ID create millions of series and exhaust the metrics store."],
    ["What is the trade-off between Prometheus histograms and summaries?", "Histograms have fixed buckets, can be aggregated across instances and give approximate quantiles. Summaries compute exact quantiles per instance that cannot be aggregated."],
    ["What should every log line of a request carry?", "The trace or request ID, so logs can be joined with traces and with each other."],
  ]),
  ...cards("rel-incidents", [
    ["What are the first commands in the 60-second Linux checklist?", "uptime, dmesg | tail, vmstat 1, mpstat -P ALL 1, pidstat 1, iostat -xz 1, free -m, sar -n DEV 1, sar -n TCP,ETCP 1, top."],
    ["What does runqlat measure?", "How long threads wait on the CPU run queue before running: scheduler latency, which reveals CPU saturation or throttling."],
    ["What makes a postmortem blameless?", "It examines how the system and process allowed the failure, assuming people acted reasonably with what they knew, so facts surface instead of being hidden."],
    ["What belongs in a postmortem?", "Impact, timeline, how it was detected, root cause and contributing factors, what went well and badly, and concrete action items with owners."],
    ["What are the key roles in incident response?", "An incident commander who coordinates and decides, operations doing the hands-on work, and communications keeping stakeholders informed."],
    ["How do you find a service's capacity?", "Increase load at a constant arrival rate in steps until latency or errors breach the SLO; the last passing step is the capacity, and USE shows which resource saturated."],
    ["What is off-CPU analysis for?", "Finding where threads spend time blocked (locks, I/O, sleeping) rather than running, which CPU profiles cannot show."],
  ]),
];
