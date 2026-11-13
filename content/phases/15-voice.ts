import { cards, lab, link, note, output, project, read, url } from "../dsl";
import type { Phase } from "../types";

export const phase: Phase = {
  id: "voice",
  label: "Phase 13",
  title: "Realtime voice",
  summary:
    "The hardest latency budget in AI products: a spoken reply within about a second, over an unreliable network. Ends with your third capstone and a look back over the year.",
  weeks: { start: 51, end: 52 },
  modules: [
    {
      id: "voice-transport",
      title: "Realtime media transport",
      summary: "Week 51. WebRTC under the API, and the voice pipeline's latency budget.",
      items: [
        read("voice-webrtc", "WebRTC for the Curious", {
          week: 51,
          hours: 8,
          source: "WebRTC for the Curious",
          chapters: "Securing (DTLS, SRTP), media communication (RTP, RTCP, jitter buffers, congestion control), data communication, debugging",
          links: [link("WebRTC for the Curious", "https://webrtcforthecurious.com/")],
        }),
        read("voice-primer", "Voice AI and voice agents: an illustrated primer", {
          week: 51,
          hours: 4,
          source: "Voice AI & Voice Agents primer",
          chapters: "Latency, the STT-LLM-TTS loop, turn detection and interruptions, network transport, telephony",
          links: [link("Voice AI and Voice Agents", "https://voiceaiandvoiceagents.com/")],
        }),
        lab("voice-webrtc-lab", "WebRTC under a bad network", {
          week: 51,
          hours: 7,
          brief:
            "Run a local LiveKit server (or a Pion example) and connect two browser tabs with audio. Use tc netem to add 50 ms of jitter and 2-5% loss on the path. Read chrome://webrtc-internals: jitter buffer delay, packets lost, concealed samples, round-trip time. Note at which loss rate speech becomes hard to follow.",
          evidence: [
            output("stats", "webrtc-internals stats at 0%, 2% and 5% loss"),
            note("observed", "What you heard at each level and which stats moved"),
          ],
          links: [link("LiveKit documentation", "https://docs.livekit.io/")],
        }),
        read("voice-frameworks", "Voice agent frameworks", {
          week: 51,
          hours: 2,
          source: "LiveKit Agents and Pipecat documentation",
          chapters: "Skim both quick starts; note how each models the pipeline and interruptions",
          links: [link("LiveKit Agents", "https://docs.livekit.io/agents/"), link("Pipecat", "https://docs.pipecat.ai/")],
        }),
      ],
    },
    {
      id: "voice-capstone",
      title: "Capstone 3 and the year in review",
      summary: "Week 52. A voice agent with a measured latency budget.",
      items: [
        project("voice-agent", "A voice agent with a latency budget", {
          week: 52,
          hours: 18,
          capstone: true,
          brief:
            "Build a voice agent you can talk to: streaming speech-to-text, an LLM, and streaming text-to-speech over WebRTC, using Pipecat or LiveKit Agents. Instrument every stage and produce a per-turn breakdown: end of speech detected, transcript final, first LLM token, first audio byte, audio heard. Support barge-in: when the user interrupts, stop speaking and cancel generation.",
          deliverables: [
            "Working voice agent over WebRTC",
            "Per-stage latency breakdown for each turn, exported as metrics",
            "Interruption handling that cancels LLM and TTS work",
            "A written latency budget: target and measured value per stage",
          ],
          evidence: [url("repo", "Link to the agent"), output("budget", "The per-stage latency table for ten turns")],
        }),
        lab("voice-latency-report", "Voice-to-voice latency under network stress", {
          week: 52,
          hours: 5,
          brief:
            "Measure voice-to-voice p50 and p95 on a clean network and with 50 ms jitter and 2% loss. Identify your largest stage and make one change that reduces it (a faster model, streaming earlier, co-locating services). Report before and after.",
          evidence: [output("report", "p50 and p95 before and after, clean and degraded network")],
        }),
        lab("voice-year-review", "Year in review and portfolio", {
          week: 52,
          hours: 4,
          brief:
            "Assemble a portfolio page linking your three capstones, the labs repository and your write-ups. For each capstone prepare a five-minute explanation: the problem, the design, one hard bug, the numbers. List what you would study next.",
          evidence: [url("portfolio", "Link to the portfolio page"), note("next", "What you would learn next and why")],
        }),
      ],
    },
  ],
};

export const quiz = [
  ...cards("voice-transport", [
    ["What is a good voice-to-voice latency target, and why?", "Around 800 ms or less from the user finishing to hearing a reply. Human conversational gaps are a few hundred milliseconds, so longer pauses feel broken."],
    ["Which stages make up a voice agent's turn latency?", "End-of-speech detection, speech-to-text finalization, LLM time to first token, text-to-speech time to first audio, and network transport plus the jitter buffer in each direction."],
    ["Why is WebRTC preferred over WebSockets for client audio?", "It runs over UDP with congestion control, jitter buffering, loss concealment and echo cancellation built in. WebSockets ride on TCP, where one lost packet delays all audio behind it."],
    ["What do RTP and RTCP do?", "RTP carries the media packets with sequence numbers and timestamps. RTCP carries feedback: loss, jitter and round-trip reports that drive congestion control."],
    ["How is WebRTC media encrypted?", "A DTLS handshake between the peers derives keys, and the media is encrypted with SRTP."],
    ["What is an SFU?", "A selective forwarding unit: a server that receives each participant's media and forwards it to others without decoding and mixing, which is how LiveKit scales rooms."],
    ["What is barge-in and what must the system do?", "The user interrupts while the agent is speaking. The agent must stop playback immediately and cancel in-flight LLM and TTS work, and record what was actually heard."],
    ["What is turn detection?", "Deciding when the user has finished speaking, using voice activity detection and often a model, balancing fast responses against cutting the user off."],
  ]),
  ...cards("voice-capstone", [
    ["Why stream between STT, LLM and TTS instead of waiting for each to finish?", "Latency adds up across stages. Streaming lets TTS start on the first sentence while the LLM is still generating, cutting time to first audio."],
    ["What usually dominates voice agent latency?", "LLM time to first token and end-of-turn detection, followed by TTS time to first audio; network transport is small if services are close to each other."],
    ["Why co-locate STT, LLM and TTS services?", "Each network hop between regions adds tens of milliseconds per stage and per direction; in one region the pipeline overhead nearly vanishes."],
    ["Why are long-lived connections a scaling challenge for voice platforms?", "Each call holds a stateful connection for minutes, so capacity is concurrent sessions, deploys must drain gracefully, and load balancing by request does not apply."],
    ["Looking back: name the mechanism behind 'container', 'microVM', and 'durable workflow'.", "Container: a process with namespaces, cgroups and reduced privileges. MicroVM: a KVM guest with a minimal device model. Durable workflow: deterministic code replayed from a persisted event history."],
  ]),
];
