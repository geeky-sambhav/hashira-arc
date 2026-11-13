import { cards, lab, link, note, output, project, read, url } from "../dsl";
import type { Phase } from "../types";

export const phase: Phase = {
  id: "inference",
  label: "Phase 12",
  title: "Inference serving",
  summary:
    "What changes when the backend is a GPU running a language model: new latency metrics, batching, memory that behaves like an operating system's, and cost per token.",
  weeks: { start: 49, end: 50 },
  modules: [
    {
      id: "inf-fundamentals",
      title: "How LLM serving works",
      summary: "Week 49. Tokens, time to first token, and why batching is everything.",
      items: [
        read("inf-gpu-glossary", "GPU Glossary", {
          week: 49,
          hours: 3,
          source: "Modal",
          chapters: "Device hardware, device software and host software sections",
          links: [link("GPU Glossary", "https://modal.com/gpu-glossary")],
        }),
        read("inf-handbook", "LLM Inference Handbook", {
          week: 49,
          hours: 5,
          source: "LLM Inference Handbook (Modular, formerly hosted by BentoML)",
          chapters: "Fundamentals, inference metrics (TTFT, TPOT, throughput), batching, the KV cache, quantization",
          links: [link("LLM Inference Handbook", "https://handbook.modular.com/")],
        }),
        read("inf-vllm-paper", "PagedAttention: the vLLM paper", {
          week: 49,
          hours: 3,
          source: "SOSP 2023",
          chapters: "Read for the idea: paging for the KV cache, straight out of your memory phase",
          links: [link("Efficient memory management for LLM serving with PagedAttention", "https://arxiv.org/abs/2309.06180")],
        }),
        lab("inf-serve", "Serve a model", {
          week: 49,
          hours: 7,
          brief:
            "Rent a single GPU by the hour and serve a small open model with vLLM behind its OpenAI-compatible API. Call it with streaming and non-streaming requests. Watch GPU memory and utilisation with nvidia-smi while it runs. If you want to rehearse for free first, run llama.cpp's server on your Mac.",
          evidence: [
            output("serve", "The serve command, a streamed response and nvidia-smi under load"),
            note("cost", "What the session cost and the instance you used"),
          ],
          links: [link("vLLM documentation", "https://docs.vllm.ai/")],
        }),
        lab("inf-metrics", "Measure TTFT, TPOT and throughput", {
          week: 49,
          hours: 6,
          brief:
            "Write a load generator that sends streaming requests at a constant arrival rate and records time to first token, time per output token and total tokens per second. Sweep concurrency from 1 to 64 and plot the three curves. Find where TTFT starts to climb and explain it with queueing and batching.",
          evidence: [
            output("curves", "TTFT, TPOT and tokens per second at each concurrency"),
            url("repo", "Link to the load generator"),
          ],
        }),
      ],
    },
    {
      id: "inf-operations",
      title: "Operating inference",
      summary: "Week 50. A gateway, a budget and a cost model.",
      items: [
        read("inf-optimization", "vLLM: batching, quantization and engine arguments", {
          week: 50,
          hours: 3,
          source: "vLLM documentation",
          chapters: "Engine arguments, quantization, and performance tuning pages",
          links: [link("vLLM documentation", "https://docs.vllm.ai/")],
        }),
        lab("inf-cost", "Cost per million tokens", {
          week: 50,
          hours: 6,
          brief:
            "From your measurements, compute cost per million output tokens at low and at high utilisation. Repeat with a quantized variant of the model and with a longer max batch. State the latency you gave up for each saving.",
          evidence: [note("model", "Your cost table and the arithmetic behind it")],
        }),
        project("inf-gateway", "An inference gateway", {
          week: 50,
          hours: 12,
          brief:
            "Put a Go gateway in front of the model server: proxy streaming responses without buffering, enforce per-tenant token budgets and request rate limits, apply timeouts for first token and for the whole response, bound the queue and shed load when it is full, and export TTFT and token metrics per tenant.",
          deliverables: [
            "Streaming proxy that propagates client disconnects to the model server",
            "Per-tenant token budget and rate limit",
            "Bounded queue with load shedding and clear errors",
            "Metrics for TTFT, tokens and rejections",
          ],
          evidence: [url("repo", "Link to the gateway"), output("shed", "Behaviour at twice capacity: accepted latency and rejections")],
        }),
        lab("inf-design-autoscale", "Design doc: autoscaling a GPU pool", {
          week: 50,
          hours: 3,
          brief:
            "One page: which signal to scale on (queue depth, not CPU), model load time as cold start, keeping warm capacity, routing for cache reuse, and what happens when no GPUs are available.",
          evidence: [url("doc", "Link to the design doc")],
        }),
        lab("inf-writeup", "Write-up: the latency curve of an LLM server", {
          week: 50,
          hours: 2,
          brief: "Publish your TTFT and throughput curves and what they imply for capacity planning.",
          evidence: [url("post", "Link to the published write-up")],
        }),
      ],
    },
  ],
};

export const quiz = [
  ...cards("inf-fundamentals", [
    ["What are TTFT and TPOT?", "Time to first token: delay before the first output token arrives, dominated by queueing and prompt processing. Time per output token: the steady interval between tokens during generation."],
    ["What is the KV cache?", "Stored attention keys and values for tokens already processed, so each new token does not recompute the whole sequence. It grows with sequence length and dominates GPU memory per request."],
    ["What is continuous batching?", "The server adds new requests to the running batch at each generation step and removes finished ones, instead of waiting to form fixed batches. It raises throughput with little added latency."],
    ["What problem does PagedAttention solve?", "KV cache stored in contiguous per-request buffers wastes memory to fragmentation and over-reservation. Allocating it in fixed-size blocks on demand, like OS paging, fits more concurrent requests."],
    ["Why does throughput rise with concurrency while per-request latency also rises?", "Batching shares each forward pass across requests, so tokens per second go up, but each step takes longer and requests may queue."],
    ["What is quantization and its trade-off?", "Storing weights at lower precision (for example 8 or 4 bits). It cuts memory and can speed up inference, at some cost in output quality."],
    ["Why is GPU memory, not compute, often the limit on concurrency?", "Model weights take a fixed amount and every in-flight request needs KV cache; once memory is full no more requests can be batched."],
  ]),
  ...cards("inf-operations", [
    ["What signal should an inference autoscaler use?", "Queue depth or in-flight requests per replica (or TTFT). CPU and even GPU utilisation are poor proxies for saturation."],
    ["Why are cold starts severe for model servers?", "Starting a replica means provisioning a GPU and loading many gigabytes of weights, which takes tens of seconds to minutes."],
    ["Why must a streaming gateway propagate client disconnects?", "Otherwise the model keeps generating tokens nobody reads, wasting GPU time that other requests are queued for."],
    ["How do you rate-limit LLM usage fairly?", "By tokens, not just requests, since requests vary enormously in cost; use per-tenant token budgets over a time window."],
    ["What two timeouts does a streaming inference client need?", "A time-to-first-token timeout and an overall or inter-token timeout, because a stream can start and then stall."],
    ["How do you compute cost per million tokens?", "GPU cost per hour divided by tokens generated per hour at your actual utilisation, times one million. Idle capacity raises it sharply."],
  ]),
];
