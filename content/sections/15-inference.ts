import { build, concept, link, section, topic } from "../dsl";

const GPU_GLOSSARY = link("GPU Glossary (Modal)", "https://modal.com/gpu-glossary");
const HANDBOOK = link("LLM Inference Handbook", "https://handbook.modular.com/");
const PAGED_ATTENTION = link(
  "Efficient memory management for LLM serving with PagedAttention (the vLLM paper)",
  "https://arxiv.org/abs/2309.06180",
);
const VLLM_DOCS = link("vLLM documentation", "https://docs.vllm.ai/");

export default section(
  "inference",
  {
    title: "Inference serving",
    summary:
      "What changes when the backend is a GPU running a language model: memory as the binding constraint, a token-by-token generation loop, batching and a KV cache managed like an operating system's memory, latency metrics made for streams, cost per token, and the gateway in front of it all.",
  },
  [
    topic(
      "gpus",
      "GPUs and the serving stack",
      [
        topic("why", "Why inference runs on GPUs", [
          concept(
            "forward-pass",
            "Inference is a forward pass through fixed weights",
            "A trained model is a set of very large arrays of numbers (weights). Serving it means pushing an input through them with matrix multiplications to get an output. Unlike training there is no backward pass and no weight update, so the weights are read-only and identical for every request.",
          ),
          concept(
            "cpu-vs-gpu",
            "What a GPU is good at",
            "A CPU has a few cores built to run branching code fast. A GPU has thousands of simpler cores that apply the same arithmetic to many numbers at once, and memory built for very high bandwidth. Large matrix multiplication is exactly that workload.",
          ),
          concept(
            "bandwidth",
            "Memory bandwidth as a speed limit",
            "For a typical dense model, producing one token means reading nearly every weight out of GPU memory (a mixture-of-experts model reads only the experts that token uses). With only one request in flight that read, more than the arithmetic, sets the speed. This is why memory bandwidth matters and why adding more requests to the same pass is cheap.",
          ),
        ]),
        topic("hardware", "Inside the device", [
          concept(
            "vram",
            "GPU memory (VRAM) is separate and fixed",
            "A discrete GPU has its own memory, separate from host RAM, with a size fixed by the card. Ordinary device allocations, the kind frameworks make, are not paged out to host memory: when one does not fit it fails with an out-of-memory error instead of getting slower. (Apple Silicon and some other designs instead share one memory between CPU and GPU.)",
          ),
          concept(
            "sm",
            "Streaming multiprocessors, cores and tensor cores",
            "A GPU is made of many streaming multiprocessors (SMs), each with its own cores, scheduler and registers. Tensor cores are units inside each SM specialised for matrix multiply-and-accumulate, especially at reduced precision, which is the operation inference spends most of its time in.",
          ),
          concept(
            "precision",
            "Number formats: FP32, FP16 and BF16",
            "Each weight is a floating-point number. A 32-bit float takes 4 bytes; the 16-bit formats (FP16 and BF16) take 2 and are the normal choice for serving because they halve memory and run fast on tensor cores, usually with no measurable quality loss. BF16 keeps FP32's exponent range with fewer mantissa bits, while FP16 is more precise but has a narrower range and can overflow on a model trained in BF16. Bytes per weight times the number of weights gives the model's size.",
          ),
          concept(
            "sharing",
            "Sharing one GPU between processes",
            "Several processes can use the same GPU, but by default they take turns on the whole device and there are no per-process memory limits: whoever allocates first gets the memory. NVIDIA MPS lets several processes' work run on the GPU at the same time, and some data-centre GPUs can be partitioned into isolated slices with their own memory (NVIDIA MIG). A production model server normally owns whole GPUs.",
          ),
        ]),
        topic("software", "The software between your code and the GPU", [
          concept(
            "kernel",
            "Kernels, threads and warps",
            "A kernel here is a function launched from the CPU and run by many GPU threads in parallel; it is unrelated to the operating system kernel. Threads are grouped into blocks, and NVIDIA hardware runs them in groups of 32 called warps that execute the same instruction together. A forward pass is a long series of kernel launches.",
          ),
          concept(
            "cuda",
            "CUDA and its libraries",
            "CUDA is NVIDIA's platform for general-purpose GPU programming: a programming model, compiler and runtime, plus tuned libraries such as cuBLAS (linear algebra) and cuDNN (neural network primitives). Frameworks like PyTorch and most inference engines are built on it. An engine is built against one CUDA version, and the host's driver must be new enough to support it; newer drivers keep running software built for older CUDA versions.",
          ),
          concept(
            "driver",
            "The driver: kernel module and user-space libraries",
            "The NVIDIA driver is a kernel module that controls the device plus user-space libraries that programs load to reach it. The two must be the exact same version. Upgrading the driver packages on a running host replaces the libraries while the old module stays loaded, so nvidia-smi and CUDA programs fail with 'Driver/library version mismatch' until the module is reloaded or the host reboots.",
          ),
          concept(
            "containers",
            "GPUs in containers",
            "The kernel module lives on the host and cannot be shipped in an image. A container runtime hook (the NVIDIA Container Toolkit) exposes the GPU device files and the host's matching driver libraries inside the container, while the image carries the CUDA runtime libraries and the engine. The image's CUDA version must therefore be one the host driver supports.",
          ),
          concept(
            "layers",
            "The serving stack, top to bottom",
            "Client, gateway, API server (usually an OpenAI-compatible HTTP API), inference engine (request scheduler, batching and KV-cache manager, as in vLLM or llama.cpp), framework and CUDA libraries, driver, GPU. You can say which layer queues requests, which owns GPU memory and which only relays bytes.",
          ),
        ]),
        topic("memory", "What occupies GPU memory", [
          concept(
            "weights",
            "Weights: a fixed cost per loaded model",
            "Parameter count times bytes per parameter: a 7-billion-parameter model in 16-bit floats needs about 14 GB before it serves anything. This is paid once per loaded model and does not change with load.",
          ),
          concept(
            "kv-cache",
            "The KV cache: a cost per in-flight request",
            "Every request being generated stores attention keys and values for each token it has processed (the mechanism is under Prefill and decode below). This grows with the request's length, is held until the request finishes, and is the main memory cost that scales with load.",
          ),
          concept(
            "activations",
            "Activations and runtime overhead",
            "The intermediate tensors of the step being computed scale with the batch and are reused between steps. On top of that each process pays for a CUDA context and for the framework's allocator, which keeps freed memory in its own pool instead of returning it to the device.",
          ),
          concept(
            "reserved",
            "Why an idle server shows full memory",
            "Engines such as vLLM measure memory at startup and allocate the KV cache up front to fill most of what is left after the weights, bounded by a memory-fraction setting. nvidia-smi shows what the process has allocated from the device, not how much of that cache holds requests, so memory use on a model server says nothing about load.",
          ),
          concept(
            "binding",
            "VRAM is the binding constraint",
            "Model weights take a fixed amount and every in-flight request needs KV cache; once memory is full no more requests can be batched. So GPU memory, not compute, is often the limit on concurrency: VRAM minus weights minus overhead is the budget shared by the tokens of all concurrent requests.",
          ),
        ]),
        topic("movement", "Moving data between CPU and GPU", [
          concept(
            "host-device",
            "Host memory and device memory",
            "Host RAM and GPU memory are separate, usually joined by the PCIe bus, and data must be copied between them. Per request only token IDs go in and small results come out, so the main expensive transfer in LLM serving is loading the weights from disk through host memory onto the GPU, plus moving KV cache if the engine offloads it to host memory.",
          ),
          concept(
            "cpu-side",
            "The CPU work around every GPU step",
            "Tokenization, HTTP handling, scheduling and turning tokens back into text run on the CPU between GPU steps. If the CPU is starved or one thread is saturated the GPU waits, so low GPU throughput can be a CPU problem.",
          ),
        ]),
        topic("formats", "Model files", [
          concept(
            "repo",
            "What a model is on disk",
            "A weights file or set of shards, a config describing the architecture, the tokenizer files and a chat template. Weights are tens of gigabytes and immutable, so treat them as a build artifact: pin the exact revision, cache them near the GPUs and never fetch them on the request path.",
          ),
          concept(
            "safetensors",
            "safetensors versus pickled checkpoints",
            "Older checkpoints are Python pickles, and unpickling can execute arbitrary code. safetensors stores only tensors: a small header describing names, types and shapes, then the raw bytes. Loading the weights therefore runs no code, and the file can be memory-mapped. A model repository can still ship custom Python code, which runs only if you opt in (trust_remote_code in Hugging Face tools and vLLM).",
          ),
          concept(
            "gguf",
            "GGUF",
            "The format used by llama.cpp: weights (usually quantized), tokenizer, chat template and other metadata in one file, so a single file (or a few shards for very large models) is enough to run a text model.",
          ),
        ]),
        topic("observe", "Seeing it on a real machine", [
          concept(
            "nvidia-smi",
            "Reading nvidia-smi",
            "You can read memory used and total per GPU, the utilisation percentage and the per-process memory list, sample it on an interval while sending requests, and explain why utilisation moves with load while memory stays flat.",
          ),
          concept(
            "failures",
            "How GPUs fail",
            "Typical faults are uncorrectable memory (ECC) errors, a device that falls off the bus, and thermal or power throttling that silently lowers clocks. The driver reports faults as Xid messages in the kernel log, and NVIDIA's DCGM exposes health checks and metrics for monitoring. A faulted GPU often needs a reset or a reboot, so its node should be drained first.",
          ),
        ]),
      ],
      {
        detail:
          "Why a model server needs a GPU, what fills the GPU's memory, and the layers of software between an HTTP request and the device.",
        links: [GPU_GLOSSARY, HANDBOOK],
      },
    ),

    topic(
      "llm",
      "How LLM inference runs",
      [
        topic("tokens", "Tokens", [
          concept(
            "token",
            "Tokens: the model's unit of text",
            "A model does not read characters. Text is split into tokens, sub-word pieces from a fixed vocabulary, and each becomes an integer ID. A token is often a short word or part of a word, so token counts differ from word and character counts and vary by language.",
          ),
          concept(
            "tokenizer",
            "The tokenizer belongs to the model",
            "Each model has its own vocabulary and splitting rules (byte-pair encoding is the common method). Tokenizing runs on the CPU and is deterministic. To count tokens for a model you must run that model's tokenizer; another model's count will be wrong.",
          ),
          concept(
            "chat-template",
            "Special tokens and the chat template",
            "A chat request is a list of messages, but the model sees one token sequence. A template shipped with the model joins the messages with special tokens that mark roles and the ends of turns. Using the wrong template gives fluent but degraded output with no error.",
          ),
          concept(
            "unit-of-work",
            "Tokens are the unit of work",
            "Compute, memory, latency and price all scale with tokens in and tokens out, not with requests or bytes. Two requests to the same endpoint can differ in cost by a factor of a thousand.",
          ),
        ]),
        topic("loop", "The generation loop", [
          concept(
            "next-token",
            "A forward pass predicts one next token",
            "The token IDs pass through a stack of transformer layers, and the output is a score (logit) for every token in the vocabulary as the next one. Each position can only use the positions before it, so appending a token never changes what was computed for the earlier ones.",
          ),
          concept(
            "attention",
            "Inside a layer: attention and the MLP",
            "In each layer every token's vector is turned into a query, a key and a value. Attention compares a token's query with the keys of itself and every earlier token and takes a weighted sum of their values; a feed-forward network (MLP) then transforms each token on its own. Attention work grows with the number of earlier tokens, so prompt processing costs more than linearly in prompt length.",
          ),
          concept(
            "autoregressive",
            "The autoregressive loop",
            "Pick a token from the scores, append it to the sequence, run the model again, repeat. Output is produced strictly one token after another and each step depends on the one before, so the steps of one request cannot run in parallel.",
          ),
          concept(
            "stop",
            "How generation ends",
            "The loop stops when the model emits its end-of-sequence token, when the request's maximum output tokens is reached, or when a stop string appears. The server cannot know in advance how long an answer will be, which shapes both scheduling and memory management.",
          ),
          concept(
            "context",
            "The context window",
            "A model handles at most a fixed number of tokens, prompt and output together. The limit comes from how the model was trained, and every token held also costs KV cache. A request that would exceed it must be rejected or truncated.",
          ),
          concept(
            "stateless",
            "The model is stateless between requests",
            "Nothing is remembered from one request to the next. A chat client resends the whole conversation every turn, so prompts grow with each turn and most of each prompt repeats the previous one.",
          ),
        ]),
        topic("phases", "Prefill and decode", [
          concept(
            "prefill",
            "Prefill: processing the prompt",
            "All prompt tokens go through the model together, in parallel, in one pass or a few large chunks. The cost grows with prompt length and, for all but very short prompts, is limited by compute rather than memory bandwidth. It ends by producing the first output token and a KV cache covering the whole prompt.",
          ),
          concept(
            "decode",
            "Decode: one token per pass",
            "Each further token needs its own pass over just the newest token, reusing the cache for everything earlier. A single pass is light on arithmetic but still reads all the weights, and there are as many passes as output tokens.",
          ),
          concept("kv-cache", "The KV cache", undefined, {
            parts: [
              concept(
                "stored",
                "What is stored",
                "In every layer, attention needs a key vector and a value vector for each earlier token in order to process the current one. Because earlier positions never change, those keys and values are computed once and kept for the rest of the request.",
              ),
              concept(
                "cheaper",
                "Why it makes decode cheaper",
                "Without the cache, each new token would mean re-running the entire sequence through every layer. With it, a decode step computes only the newest token and looks up the rest, so each new token does not recompute the whole sequence.",
              ),
              concept(
                "memory-cost",
                "What it costs in memory",
                "The cache holds keys and values for every token in every layer, so it grows linearly with sequence length and is larger for deeper and wider models. It belongs to one request, dominates GPU memory per request, and is freed when the request ends.",
              ),
              concept(
                "size",
                "Computing its size",
                "Bytes per token = 2 (key and value) x layers x KV heads x head dimension x bytes per number. Llama 3 8B (32 layers, 8 KV heads of dimension 128, 16-bit) needs 128 KiB per token, so one 8,192-token request holds 1 GiB. Grouped-query attention, where several query heads share one KV head, exists to shrink this.",
              ),
            ],
          }),
          concept(
            "output-dominates",
            "Why output length dominates latency",
            "Input tokens are processed together in one prefill pass; output tokens take one pass each. Total time is roughly time to first token plus output tokens times time per token, so a long answer is slow even for a short prompt, and an output token costs far more than an input token.",
          ),
        ]),
        topic("sampling", "Sampling parameters", [
          concept(
            "temperature",
            "Temperature, top-k and top-p",
            "The scores become probabilities and one token is drawn. Temperature rescales the scores first: low values make the most likely token dominate, and engines treat zero as always taking the top one (greedy decoding). Top-k and top-p restrict the draw to the k most likely tokens, or to the smallest set of top tokens whose probabilities add up to at least p.",
          ),
          concept(
            "max-tokens",
            "Maximum output tokens",
            "The cap on how many tokens one request may generate. It is the one parameter that bounds a request's latency, cost and memory in advance, so a server or gateway should enforce an upper limit rather than trust the client.",
          ),
          concept(
            "determinism",
            "Why identical requests can differ",
            "With sampling, output depends on a random draw. Even with a fixed seed or temperature zero, results can differ between runs, because floating-point results change slightly with batch composition, hardware and library versions. Do not build caches or tests that assume byte-identical output.",
          ),
        ]),
        topic("streaming", "Streaming responses", [
          concept(
            "why-stream",
            "Why responses are streamed",
            "Tokens exist one at a time, so the server can send each as it is produced. The user starts reading after the first token instead of after the last, which turns a long wait into a short pause followed by text.",
          ),
          concept(
            "sse",
            "The OpenAI-compatible API and server-sent events",
            "Most engines expose the same HTTP API shape: POST a model name, messages and parameters to a chat completions endpoint. With streaming on, the response is a server-sent event stream: lines starting with 'data:' that each carry a JSON chunk, ending with 'data: [DONE]'.",
          ),
          concept(
            "usage",
            "Token usage in the response",
            "The response reports prompt tokens and completion tokens. When streaming, usage arrives in a final chunk and often has to be requested explicitly (stream_options with include_usage in the OpenAI API). One streamed chunk is not guaranteed to be one token, so count tokens from usage, not from chunks.",
          ),
          concept(
            "cancel",
            "Cancelling a stream",
            "When the client goes away, the server should abort the generation and free its batch slot and KV cache. A server or proxy that does not notice the disconnect keeps generating tokens nobody reads.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "serve",
            "Serve a model",
            "Rent a single GPU by the hour and serve a small open model with vLLM behind its OpenAI-compatible API. Call it with streaming and non-streaming requests. Watch GPU memory and utilisation with nvidia-smi while it runs. If you want to rehearse for free first, run llama.cpp's server on your Mac.",
            {
              doneWhen: [
                "The serve command, a streamed response and nvidia-smi output under load",
                "A note of what the session cost and the instance you used",
              ],
              links: [VLLM_DOCS],
            },
          ),
        ]),
      ],
      {
        detail:
          "What happens between a prompt arriving and the last token leaving: tokens, the generation loop, prefill and decode, the KV cache and streaming.",
        links: [HANDBOOK],
      },
    ),

    topic(
      "batching",
      "Batching and scheduling",
      [
        topic("why", "Why batching raises throughput", [
          concept(
            "waste",
            "One request leaves the GPU mostly idle",
            "A decode step for a single request reads all the weights to do a small amount of arithmetic. The GPU's parallel capacity is barely used, so serving requests one after another wastes most of the hardware.",
          ),
          concept(
            "shared-pass",
            "A batch shares each forward pass",
            "Stacking many sequences into one pass reads the weights once and computes all of them together. Batching shares each forward pass across requests, so tokens per second go up, but each step takes longer and requests may queue. This is why throughput rises with concurrency while per-request latency also rises.",
          ),
          concept(
            "limits",
            "What limits batch size",
            "Memory limits it first: every sequence in the batch needs its KV cache. Then compute: once the GPU's arithmetic is saturated, each added sequence stretches the step in proportion, so throughput stops improving while latency keeps rising.",
          ),
        ]),
        topic("strategies", "Batching strategies", [
          concept(
            "static",
            "Static batching",
            "Wait until a fixed number of requests has arrived, run them as one batch until all are finished, then start the next. Early arrivals wait for the batch to fill, so it only suits offline jobs where latency does not matter.",
          ),
          concept(
            "dynamic",
            "Dynamic batching",
            "Launch a batch when it is full or when a short time window expires, whichever comes first. This bounds the wait and suits models where every request costs one pass, such as embeddings or classifiers. The batch still runs as a unit.",
          ),
          concept(
            "llm-problem",
            "Why request-level batching fits LLMs badly",
            "Requests in a batch generate different numbers of tokens. When a batch runs as a unit, finished sequences leave their slots idle until the longest one ends, and new arrivals wait for the whole batch even though a slot is free.",
          ),
          concept(
            "continuous",
            "Continuous batching",
            "The server adds new requests to the running batch at each generation step and removes finished ones, instead of waiting to form fixed batches. Scheduling happens per token step rather than per request, which raises throughput with little added latency.",
          ),
          concept(
            "prefill-decode",
            "Prefill competing with decode",
            "Admitting a request means running its prefill, a heavy pass, on the same GPU that is producing tokens for everyone else. A long prompt can therefore stall the streams of in-flight requests. Engines limit this by capping or chunking how much prefill runs in one step (chunked prefill), mixing pending decodes with a slice of prefill.",
          ),
          concept(
            "disaggregated",
            "Disaggregated prefill and decode",
            "Some deployments run prefill and decode on separate pools of GPUs: one pool processes prompts, then the KV cache is transferred over a fast network to a decode replica that generates the output. Each pool can be sized and tuned for its own phase, at the cost of moving the cache between machines.",
          ),
        ]),
        topic(
          "kv-memory",
          "Managing KV-cache memory",
          [
            concept(
              "problem",
              "The problem: reserving memory for an unknown length",
              "The engine does not know how long a request's output will be. KV cache stored in contiguous per-request buffers wastes memory to fragmentation and over-reservation: space reserved for the maximum length sits unused, and free space ends up in gaps too small for a new request.",
            ),
            concept(
              "paging",
              "PagedAttention: KV cache in fixed-size blocks",
              "This is operating system paging from the Memory section applied to the KV cache. The cache is split into fixed-size blocks, each holding a fixed number of tokens. A per-request block table maps a sequence's logical blocks to physical blocks anywhere in memory, and blocks are allocated on demand as the sequence grows. Waste is limited to each request's last, partly filled block, so more concurrent requests fit.",
            ),
            concept(
              "sharing",
              "Block sharing and copy-on-write",
              "Sequences that start with the same tokens can point at the same physical blocks, tracked with reference counts. When one of them needs to write into a shared block it gets its own copy first. This is the same mechanism as copy-on-write pages after fork.",
            ),
            concept(
              "capacity",
              "Capacity is counted in tokens",
              "The memory left after the weights divides into a fixed number of blocks, which is a fixed number of tokens across all in-flight requests. A few long-context requests use the same capacity as many short ones, so the concurrency a server supports depends on the lengths it serves.",
            ),
            concept(
              "preemption",
              "What happens when blocks run out",
              "If running requests grow until no free blocks remain, the engine preempts some of them: it frees their blocks and later rebuilds the cache, either by recomputing it from the tokens so far (the default in current vLLM) or by copying it back from host memory where it was swapped out. Preemption shows up as stalled streams and means the server is admitting more than its memory can hold.",
            ),
          ],
          { links: [PAGED_ATTENTION] },
        ),
        topic("prefix", "Prefix caching", [
          concept(
            "reuse",
            "Reusing the KV cache of a shared prefix",
            "Many requests begin with the same tokens: a system prompt, tool definitions, or the earlier turns of a conversation. The KV cache for a prefix depends only on those tokens, so the engine can keep it and skip prefill for that part, cutting time to first token and compute.",
          ),
          concept(
            "exact",
            "Only an exact token prefix matches",
            "The cache is valid up to the first token that differs, and engines that cache whole blocks reuse only the full blocks before it. Changing anything early in the prompt (a timestamp, a user name) invalidates everything after it, so put stable content first and variable content last.",
          ),
          concept(
            "one-replica",
            "The cache lives on one replica",
            "A cached prefix sits in one server's GPU memory. Spreading a conversation's turns across replicas at random loses the hit, so routing should send requests with the same prefix or session to the same replica when it has room.",
          ),
          concept(
            "eviction",
            "Cached blocks compete with live requests",
            "Kept prefixes occupy the same block pool as running requests and are evicted when memory is needed, so the hit rate falls as load rises. A benchmark that repeats identical prompts overstates real performance for the same reason.",
          ),
        ]),
        topic("queues", "Queues and fairness", [
          concept(
            "waiting",
            "Where requests wait",
            "When the engine has no memory or batch room, new requests wait in a queue before their prefill starts. That wait is added directly to time to first token, and it is the first thing to grow when a server passes its capacity.",
          ),
          concept(
            "bounded",
            "Bounded queues and load shedding",
            "An unbounded queue turns overload into unbounded latency: requests are served after their clients have given up, wasting GPU time. Bound the queue, reject the excess quickly with a clear error, and drop queued requests whose deadline has passed.",
          ),
          concept(
            "fairness",
            "Fairness and priority",
            "With one first-come first-served queue, a single tenant's burst or a few very long requests delay everyone. Fair scheduling keeps a queue per tenant and serves them by a share measured in tokens, not requests. Separate priorities let batch jobs fill spare capacity and yield when interactive traffic arrives.",
          ),
        ]),
        topic("tradeoff", "The throughput versus latency trade-off", [
          concept(
            "curve",
            "The shape of the curve",
            "As concurrency rises, total tokens per second climbs and then flattens, time per output token rises gradually, and time to first token stays low until requests begin to queue and then climbs steeply. The knee is where the server is full.",
          ),
          concept(
            "operating-point",
            "Choosing an operating point",
            "A replica's capacity is the highest load at which it still meets your latency targets, not its maximum throughput. Interactive services run below the knee with headroom; offline jobs run at maximum throughput and ignore latency.",
          ),
        ]),
      ],
      {
        detail:
          "How one GPU serves many requests at once, and how the engine manages the memory and the queue that this creates.",
        links: [HANDBOOK, VLLM_DOCS],
      },
    ),

    topic(
      "metrics",
      "Metrics and load testing",
      [
        topic("latency", "Latency of a streamed response", [
          concept(
            "why-split",
            "Why one latency number is not enough",
            "A streamed response has a start and a pace. Two requests with the same total time can feel completely different, and total time mostly reflects how long the answer was. Latency is therefore split into the wait for the first token and the speed after it.",
          ),
          concept(
            "ttft",
            "Time to first token (TTFT)",
            "The delay before the first output token arrives, dominated by queueing and prompt processing. It grows with prompt length and with load, and it is what the user experiences as responsiveness.",
          ),
          concept(
            "tpot",
            "Time per output token (TPOT) and inter-token latency",
            "The steady interval between tokens after the first. Tools differ in naming, but commonly inter-token latency is each individual gap and TPOT is a request's average gap, (end-to-end time minus TTFT) divided by (output tokens minus one); its inverse is that request's decode speed in tokens per second. It is set by model size, hardware and how many requests share the batch.",
          ),
          concept(
            "e2e",
            "End-to-end latency",
            "Time from sending the request to receiving the last token: roughly TTFT plus TPOT times the number of output tokens. Compare it only between requests with similar output lengths, or it measures the workload instead of the server.",
          ),
          concept(
            "queue-time",
            "Queue time",
            "The part of TTFT spent waiting before the engine starts work on the request. It can only be measured on the server, and separating it from prefill time tells you whether a slow first token means overload or long prompts.",
          ),
        ]),
        topic("throughput", "Throughput", [
          concept(
            "system",
            "System throughput in tokens per second",
            "Total output tokens generated per second across all requests on a server. Requests per second is a poor unit because requests vary so much, and input and output tokens are counted separately because they cost very different amounts.",
          ),
          concept(
            "vs-request",
            "System throughput versus per-request speed",
            "They move in opposite directions under load: a bigger batch produces more tokens per second in total while each request receives its tokens more slowly. A benchmark number means nothing without saying which of the two it is and at what concurrency.",
          ),
          concept(
            "goodput",
            "Goodput",
            "Throughput counted only over requests that met their latency targets. It is the number capacity planning should use, because tokens delivered too late are not useful capacity.",
          ),
        ]),
        topic("gpu-util", "GPU utilisation and its pitfalls", [
          concept(
            "meaning",
            "What the utilisation percentage measures",
            "nvidia-smi's GPU utilisation is the share of the sample period during which at least one kernel was running. A server handling a single request can show close to 100 percent while having room for many times more work, so it does not measure how full the GPU is.",
          ),
          concept(
            "saturation",
            "Signals that do show saturation",
            "Use the engine's own metrics: requests running, requests waiting, KV-cache usage, queue time and TTFT. A waiting queue that does not drain or a full KV cache means the server is at capacity; GPU utilisation and GPU memory use do not tell you that.",
          ),
        ]),
        topic("percentiles", "Percentiles", [
          concept(
            "tails",
            "Percentiles for every metric",
            "Latency distributions have long tails, so a mean hides the slow requests users notice. Report p50, p95 and p99 of TTFT, TPOT and end-to-end latency, computed from raw samples or histograms; percentiles from separate servers or time windows cannot be averaged.",
          ),
          concept(
            "stalls",
            "Stalls inside a stream",
            "An average TPOT hides a stream that paused for two seconds in the middle. Track the largest or the p99 inter-token gap per request to see stalls caused by another request's prefill, by preemption or by a hop that buffers.",
          ),
          concept(
            "targets",
            "Stating a latency target for an LLM service",
            "A usable target names the metric, the percentile and the workload: for example a p95 TTFT and a p95 TPOT for a stated range of prompt and output lengths. A target on total latency alone mostly measures how long the answers are.",
          ),
        ]),
        topic("loadtest", "Load testing an inference server", [
          concept(
            "workload",
            "The workload is the token-length distribution",
            "Results depend on the prompt lengths and output lengths you send more than on anything else. Use distributions taken from real traffic, vary the prompt text so prefix caching does not flatter the result, and fix the maximum output tokens so runs are comparable.",
          ),
          concept(
            "open-closed",
            "Closed-loop versus open-loop load",
            "A closed-loop test holds a fixed number of concurrent requests, so when the server slows down the test sends less and the queue can never exceed that number; it hides how latency runs away under real overload. An open-loop test sends at a set arrival rate regardless of responses, which is how independent users behave and the only way to see queueing and overload.",
          ),
          concept(
            "sweep",
            "Sweeping load to find the knee",
            "Run a series of steps from light load to past saturation and plot TTFT, TPOT and throughput against load. The point where TTFT turns upward while throughput flattens is the replica's capacity for that workload.",
          ),
          concept(
            "client-side",
            "Measuring a stream from the client",
            "Timestamp the request send and the arrival of every chunk: the first content chunk gives TTFT and the gaps give inter-token latency. Take token counts from the usage field. Read the stream without buffering, or you measure your own client.",
          ),
          concept(
            "hygiene",
            "Warm-up, steady state and the load generator",
            "Discard the first requests after startup, run each step long enough to reach a steady state, and check that the load generator is not the bottleneck: a client saturating one CPU core produces a false plateau.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "load-gen",
            "Measure TTFT, TPOT and throughput",
            "Write a load generator that sends streaming requests, at a fixed concurrency or at a constant arrival rate, and records time to first token, time per output token and total tokens per second. Sweep concurrency from 1 to 64 and plot the three curves, then repeat with constant arrival rates around the knee. Find where TTFT starts to climb and explain it with queueing and batching.",
            {
              doneWhen: [
                "TTFT, TPOT and tokens per second at each concurrency",
                "A repo with the load generator",
              ],
            },
          ),
          build(
            "writeup",
            "Write-up: the latency curve of an LLM server",
            "Publish your TTFT and throughput curves and what they imply for capacity planning.",
            { doneWhen: ["A published write-up with your own curves"] },
          ),
        ]),
      ],
      {
        detail: "How to measure a streaming, token-priced backend, and how to load test it honestly.",
        links: [HANDBOOK],
      },
    ),

    topic(
      "cost",
      "Optimisation and cost",
      [
        topic(
          "quantization",
          "Quantization",
          [
            concept(
              "what",
              "What quantization is",
              "Storing weights at lower precision (for example 8 or 4 bits), and in some schemes also computing activations or storing the KV cache at lower precision. It cuts memory and can speed up inference, at some cost in output quality.",
            ),
            concept(
              "gains",
              "What it buys",
              "Smaller weights fit a cheaper GPU, or leave more memory for KV cache and so for concurrency. Because decode speed is tied to how many bytes of weights are read per token, fewer bytes can also mean more tokens per second, but only if the engine and GPU have efficient kernels for that format.",
            ),
            concept(
              "loss",
              "What it costs",
              "Rounding weights to fewer bits changes the model's outputs. The loss is usually small at 8 bits and grows as precision drops to 4 bits and below, and it varies by model, method and task, so it has to be measured on your own evaluation set, not assumed.",
            ),
          ],
          { links: [VLLM_DOCS] },
        ),
        topic(
          "sizing",
          "Model size, quality and speed",
          [
            concept(
              "three-way",
              "The three-way trade",
              "A model with more parameters usually answers better, needs more memory and produces tokens more slowly on the same hardware. The cheapest reliable optimisation is the smallest model that passes your quality bar.",
            ),
            concept(
              "eval",
              "You need a quality measurement",
              "Every optimisation here (a smaller model, quantization, a shorter context) can change the answers. Without a fixed evaluation set scored before and after, you can report a saving but not what it cost.",
            ),
            concept(
              "fit",
              "Fitting a model to a GPU",
              "Weights plus enough KV cache for your target concurrency and context length must fit in VRAM. Engine arguments that cap the maximum context length or set the fraction of GPU memory to use trade the longest request you can serve against how many you can serve at once.",
            ),
            concept(
              "moe",
              "Mixture-of-experts models",
              "In a mixture-of-experts model each layer has many expert networks and a router sends each token through only a few of them. Memory is set by the total parameter count, since every expert must be loaded, while per-token compute and weight reads are set by the much smaller active count.",
            ),
            concept(
              "speculative",
              "Speculative decoding",
              "A cheap draft (a small model or extra prediction heads) proposes several tokens and the large model checks them all in one pass, keeping those it agrees with. Because a decode pass is limited by reading weights, checking several tokens costs about as much as producing one, so latency drops when guesses are often right; with exact verification the output distribution is unchanged. The gain shrinks at large batch sizes, where the GPU is already busy computing.",
            ),
          ],
          { links: [VLLM_DOCS] },
        ),
        topic("multi-gpu", "Multiple GPUs", [
          concept(
            "tensor-parallel",
            "Tensor parallelism",
            "Used mainly when a model does not fit in one GPU's memory, and also to cut per-token latency: each layer's weight matrices are split across GPUs, every GPU computes its share of every token, and the partial results are combined at each layer. It needs fast links between the GPUs (such as NVLink) and is normally used inside one machine, and the speed-up is less than linear because of that communication.",
          ),
          concept(
            "pipeline",
            "Pipeline parallelism",
            "The layers are divided into consecutive stages on different GPUs, and each token's activations pass from stage to stage. It sends far less data than tensor parallelism, so it is the usual way to split a model across machines, but each request still goes through every stage in turn, so it adds capacity rather than speed.",
          ),
          concept(
            "replicas",
            "Replicas versus one split model",
            "If the model fits on one GPU, N separate replicas behind a load balancer avoid all inter-GPU communication, and a failed GPU takes out one replica instead of the whole model. A tensor-parallel instance instead gives lower latency per token and, because the weights are stored once, more memory for KV cache when the weights fill most of a GPU. Which gives more total throughput depends on the model and workload, so measure both.",
          ),
        ]),
        topic("economics", "Cost per million tokens", [
          concept(
            "arithmetic",
            "The arithmetic",
            "GPU cost per hour divided by tokens generated per hour at your actual utilisation, times one million. For example a GPU at 2 dollars an hour that averages 1,000 output tokens per second makes 3.6 million tokens an hour, which is about 0.56 dollars per million.",
          ),
          concept(
            "utilisation",
            "Utilisation is the cost lever",
            "A rented GPU costs the same busy or idle, so idle capacity raises cost per token sharply: the same server at a quarter of its capacity costs four times as much per token. Raising the average load on each GPU matters more than most engine tuning.",
          ),
          concept(
            "latency-price",
            "Cost is bought with latency",
            "Running each GPU closer to its knee, with larger batches, lowers cost per token and raises TTFT and TPOT. Every cost figure should be quoted together with the latency it was measured at.",
          ),
          concept(
            "in-out",
            "Input and output tokens cost differently",
            "Input tokens are processed in parallel during prefill and output tokens take one pass each, so an output token uses far more GPU time. A workload's cost depends on its ratio of input to output tokens, which is why APIs price the two separately.",
          ),
          concept(
            "peaks",
            "Peaks, troughs and filling idle capacity",
            "Capacity is sized for peak load and sits idle off-peak. The remedies are autoscaling, running batch or offline jobs in the troughs, and pooling several workloads on the same GPUs.",
          ),
        ]),
        topic("cold-start", "Cold starts and model load time", [
          concept(
            "severe",
            "Why cold starts are severe",
            "Starting a replica means provisioning a GPU and loading many gigabytes of weights, which takes tens of seconds to minutes. A web service can absorb a spike by starting containers in seconds; a model server cannot.",
          ),
          concept(
            "stages",
            "Where the time goes",
            "Getting a GPU machine, pulling a large container image, fetching the weights, copying them into GPU memory, and engine start-up. You can time each stage and say which dominates on your platform.",
          ),
          concept(
            "shorten",
            "Shortening the load",
            "Keep weights on fast local storage or a pre-populated cache instead of downloading them at start, keep images already pulled on GPU nodes, and keep spare warm replicas for the capacity you cannot afford to wait for.",
          ),
          concept(
            "readiness",
            "Readiness means the model is loaded",
            "A started process is not a ready server. The readiness check must pass only after the weights are loaded and the engine can generate, or the load balancer sends requests to a replica that cannot answer them yet.",
          ),
        ]),
        topic("autoscaling", "Autoscaling GPUs", [
          concept(
            "signal",
            "What to scale on",
            "Queue depth or in-flight requests per replica (or TTFT). CPU and even GPU utilisation are poor proxies for saturation: a model server uses little CPU, and its GPU can read as busy long before it is full.",
          ),
          concept(
            "lead-time",
            "Scaling up is slow, so scale early",
            "New capacity arrives minutes after the decision. Scale on a leading signal with a threshold below capacity, keep warm headroom sized to the growth you expect during one cold start, and use schedules for predictable daily peaks.",
          ),
          concept(
            "scale-down",
            "Scaling down without cutting streams",
            "Requests last seconds to minutes. Stop routing to the replica, let in-flight streams finish, then stop it, and wait before scaling down again so capacity does not flap.",
          ),
          concept(
            "to-zero",
            "The scale-to-zero trade-off",
            "With zero replicas an unused model costs nothing, and the first request waits for a full cold start. That is acceptable for batch jobs and rarely used models and not for interactive traffic, where at least one warm replica is kept.",
          ),
          concept(
            "no-capacity",
            "When there are no GPUs to get",
            "GPU supply is limited, so a scale-up request can fail or wait. Plans include reserved capacity, several instance types or regions, falling back to a smaller model or an external API, and shedding load with clear errors.",
          ),
          concept(
            "k8s",
            "GPUs as a scheduler resource",
            "On Kubernetes (see Kubernetes and durable execution) a GPU is an extended resource such as nvidia.com/gpu advertised by a device plugin, set in the container's limits in whole numbers and never overcommitted; without extra sharing configuration a container gets whole physical GPUs. Adding pods therefore means adding GPU nodes, and the node autoscaler's lead time is part of the cold start.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "cost-table",
            "Cost per million tokens",
            "From your measurements, compute cost per million output tokens at low and at high utilisation. Repeat with a quantized variant of the model and with a larger maximum batch. State the latency you gave up for each saving.",
            { doneWhen: ["Your cost table and the arithmetic behind it"] },
          ),
          build(
            "autoscale-doc",
            "Design doc: autoscaling a GPU pool",
            "One page: which signal to scale on (queue depth, not CPU), model load time as cold start, keeping warm capacity, routing for cache reuse, and what happens when no GPUs are available.",
            { doneWhen: ["A design doc you can link to"] },
          ),
        ]),
      ],
      {
        detail: "The levers that change what a token costs, and what each one gives up.",
        links: [HANDBOOK],
      },
    ),

    topic(
      "gateway",
      "Inference gateways",
      [
        topic("why", "What a gateway is for", [
          concept(
            "role",
            "One API in front of many models and replicas",
            "A gateway is a layer 7 proxy that gives clients one stable endpoint and key while models, replicas and providers change behind it. It owns authentication, limits, routing, failure handling and usage records, so that model servers only generate.",
          ),
          concept(
            "different",
            "Why a generic API gateway is not enough",
            "Requests differ in cost by orders of magnitude, responses stream for seconds to minutes, capacity is measured in tokens and GPU memory, and the fields that matter (model, maximum tokens, usage) are inside the request and response bodies. Limits and balancing built around request counts miss all of this.",
          ),
        ]),
        topic("limits", "Authentication and limits", [
          concept(
            "auth",
            "Keys, tenants and upstream credentials",
            "The gateway maps each client key to a tenant and attaches that identity to every decision and metric. Credentials for model servers or external providers stay in the gateway and are never given to clients.",
          ),
          concept(
            "by-tokens",
            "Rate limiting by tokens",
            "Limit by tokens, not just requests, since requests vary enormously in cost; use per-tenant token budgets over a time window. A limit on request count alone lets one tenant with huge prompts take the capacity of hundreds of small callers.",
          ),
          concept(
            "reserve",
            "Charging for a cost you do not know yet",
            "Input tokens can be counted or estimated before forwarding, but output tokens are known only at the end. One workable design reserves the request's maximum output tokens up front and corrects the tenant's balance from the reported usage when the response finishes.",
          ),
          concept(
            "caps",
            "Budgets, caps and clear rejections",
            "A rate limit bounds tokens per minute, a budget bounds spend per day or month, and a cap bounds maximum output tokens and context per request. A request over a limit gets an immediate 429 with a Retry-After, not a slow failure.",
          ),
        ]),
        topic("routing", "Routing", [
          concept(
            "by-model",
            "Routing by model",
            "The model name in the request body selects a pool of replicas or an external provider. The gateway must parse the body to route, and can map a public alias to a specific deployed version.",
          ),
          concept(
            "balance",
            "Balancing across replicas",
            "Round robin assumes equal requests, and LLM requests are not equal. Sending each request to the replica with the fewest in flight, or the least queued work, tracks real load far better; the gateway knows this because it sees every stream start and end.",
          ),
          concept(
            "affinity",
            "Cache-aware routing",
            "Hashing a session or prompt prefix to a preferred replica, as with consistent hashing in Networking, keeps conversations on the server that already holds their KV cache. It must yield to load, or one hot prefix overloads a single replica while others sit idle.",
          ),
        ]),
        topic("resilience", "Timeouts, retries and overload", [
          concept(
            "timeouts",
            "Two timeouts for a stream",
            "A streaming inference client needs a time-to-first-token timeout and an overall or inter-token timeout, because a stream can start and then stall. A single total timeout is either too short for long answers or too long to detect a dead server.",
          ),
          concept(
            "retries",
            "Retries are only safe before the first token",
            "A request that failed before any output was sent can be retried on another replica. Once tokens have reached the client a retry would produce a different continuation, so a mid-stream failure must be reported, not hidden. Retries into a saturated pool add load when there is none to spare, so bound them with a budget and backoff.",
          ),
          concept(
            "fallbacks",
            "Fallbacks across replicas, models and providers",
            "On failure or overload the gateway can try another replica, then another deployment or provider of the same model, then a different model. A different model changes the answers, so falling back to one must be an explicit policy, not a silent default.",
          ),
          concept(
            "shed",
            "Bounded queue and load shedding at the gateway",
            "The gateway holds a limited number of waiting requests per pool and rejects the rest with an explicit overload error. At twice capacity the accepted requests keep a usable latency because the excess is refused instead of queued.",
          ),
          concept(
            "disconnect",
            "Propagating client disconnects",
            "When the client closes the connection the gateway must cancel the upstream request. Otherwise the model keeps generating tokens nobody reads, wasting GPU time that other requests are queued for.",
          ),
        ]),
        topic("streaming", "Passing streams through", [
          concept(
            "no-buffer",
            "Never buffer the response",
            "Each chunk must be written and flushed to the client as it arrives. Any hop that buffers (a proxy default, response compression, a framework's response writer) turns a stream into one late response: total time is unchanged and TTFT is destroyed.",
          ),
          concept(
            "mid-stream",
            "Errors after the status line",
            "Once the first chunk is sent the status code is already 200. A later failure can only be signalled inside the stream or by cutting the connection, so clients must treat a stream that ends without its terminator as failed.",
          ),
          concept(
            "idle",
            "Idle timeouts on long-lived responses",
            "Load balancers and proxies close connections that stay silent too long. A request waiting in a queue for its first token sends nothing, so idle timeouts along the path must be longer than the first-token timeout, or a middle hop cuts the request first. A server can also send periodic server-sent-event comment lines as keep-alives.",
          ),
        ]),
        topic("accounting", "Usage accounting and metrics", [
          concept(
            "usage",
            "Recording usage per tenant",
            "For every request, record tenant, model, input tokens, output tokens and outcome, taken from the usage the server reports. Cancelled and failed streams still consumed tokens and must be counted, from what was streamed when no usage arrives, or budgets drift away from real GPU use.",
          ),
          concept(
            "gw-metrics",
            "Gateway metrics",
            "TTFT, tokens in and out, in-flight requests, queue length and rejections, per tenant and per model. The gateway sees latency as the client does, including time spent in its own queue.",
          ),
          concept(
            "privacy",
            "Prompts are user data",
            "Request and response bodies contain whatever users typed. Log metadata (sizes, timings, token counts) by default, and treat any logging of content as a deliberate, access-controlled decision.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "gateway",
            "An inference gateway",
            "Put a Go gateway in front of the model server: proxy streaming responses without buffering, enforce per-tenant token budgets and request rate limits, apply timeouts for first token and for the whole response, bound the queue and shed load when it is full, and export TTFT and token metrics per tenant.",
            {
              doneWhen: [
                "A repo with the gateway",
                "Behaviour at twice capacity: latency of accepted requests and the rejections",
              ],
              parts: [
                build(
                  "stream-proxy",
                  "Streaming proxy that propagates client disconnects",
                  "Chunks reach the client as the model server emits them, with no buffering. When a client disconnects mid-stream the upstream request is cancelled and the model server stops generating.",
                ),
                build(
                  "budgets",
                  "Per-tenant token budget and rate limit",
                  "Each tenant has a token budget over a time window and a request rate limit. A tenant over either limit is rejected with a 429 while other tenants are unaffected.",
                ),
                build(
                  "shedding",
                  "Bounded queue with load shedding and clear errors",
                  "Waiting requests sit in a queue of fixed size, with timeouts for first token and for the whole response. When the queue is full, new requests are rejected at once with an error that says the service is overloaded.",
                ),
                build(
                  "metrics",
                  "Metrics for TTFT, tokens and rejections",
                  "The gateway exports TTFT, input and output tokens and rejection counts per tenant, and the numbers agree with what a client measures.",
                ),
              ],
            },
          ),
        ]),
      ],
      {
        detail:
          "The proxy in front of model servers: who may spend how many tokens, which replica serves them, and what happens when a stream fails.",
        links: [HANDBOOK],
      },
    ),
  ],
);
