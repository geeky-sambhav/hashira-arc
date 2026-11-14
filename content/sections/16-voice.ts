import { build, concept, link, section, topic } from "../dsl";

const WEBRTC_CURIOUS = link("WebRTC for the Curious", "https://webrtcforthecurious.com/");
const PRIMER = link("Voice AI and Voice Agents", "https://voiceaiandvoiceagents.com/");
const LIVEKIT = link("LiveKit documentation", "https://docs.livekit.io/");
const LIVEKIT_AGENTS = link("LiveKit Agents", "https://docs.livekit.io/agents/");
const PIPECAT = link("Pipecat", "https://docs.pipecat.ai/");

export default section(
  "voice",
  {
    title: "Realtime voice",
    summary:
      "The hardest latency budget in AI products: a spoken reply within about a second, over an unreliable network. Digital audio, the WebRTC stack under the API, codecs and turn detection, the speech-to-text, LLM and text-to-speech loop, and how to measure every millisecond of a turn. Ends with a voice agent capstone and a look back over the whole sheet.",
  },
  [
    topic(
      "audio",
      "Digital audio and conversation",
      [
        topic("deadline", "Why conversation sets a deadline", [
          concept(
            "loss-vs-delay",
            "Voice tolerates loss but not delay",
            "A missing 20 ms of speech can be hidden and the listener rarely notices; a reply that arrives half a second late is noticed every time. So real-time audio discards what is late instead of waiting for it, the opposite trade-off from TCP.",
          ),
          concept(
            "mouth-to-ear",
            "Mouth-to-ear delay",
            "The time from a sound leaving one person's mouth to reaching the other's ear: capture, encoding, network, jitter buffer, decoding and playback added together. ITU-T G.114 says that below about 150 ms one way most users get essentially transparent interactivity, and sets 400 ms as the limit for network planning; as delay grows, people start talking over each other.",
          ),
          concept(
            "v2v-target",
            "Voice-to-voice latency and the 800 ms target",
            "For an agent the number that matters is voice-to-voice: from the user finishing speaking to the user hearing the reply. A good target is around 800 ms or less. Human conversational gaps are a few hundred milliseconds, so longer pauses feel broken.",
          ),
        ]),
        topic("samples", "Sound as numbers", [
          concept(
            "sampling",
            "Sampling rate and the Nyquist limit",
            "A microphone turns air pressure into a voltage, and a converter measures that voltage R times a second. Sampling at rate R can only represent frequencies below R/2; higher ones must be filtered out first or they fold back as false tones (aliasing). 8 kHz (telephone) keeps speech intelligible, 16 kHz (wideband) is what many speech recognisers take, and 48 kHz covers the range of human hearing and is the usual rate in WebRTC.",
          ),
          concept(
            "pcm",
            "Bit depth and PCM",
            "Each sample is stored as a fixed-size number, usually a signed 16-bit integer; more bits mean finer steps and less quantisation noise, and a signal beyond the largest value is clipped. PCM is the uncompressed sequence of those samples, so its bitrate is rate times depth times channels: 16 kHz, 16-bit mono is 256 kbit/s and 48 kHz is 768 kbit/s. A raw buffer means nothing until you know its rate, depth and channel count.",
          ),
          concept(
            "frames",
            "Frames: audio in 20 ms chunks",
            "Real-time audio is processed and sent in short fixed-length chunks, most often 20 ms: 960 samples at 48 kHz, 320 at 16 kHz, 50 packets a second. A shorter frame lowers delay but spends more of the bitrate on packet headers; a longer one does the reverse. (Audio APIs also use 'frame' to mean one sample across all channels.)",
          ),
          concept(
            "resampling",
            "Resampling between rates",
            "Different stages want different rates (48 kHz from the browser, 16 kHz into many speech recognisers, 8 kHz on a phone line), so audio is resampled at the boundaries. Playing or feeding a buffer at the wrong rate changes its speed and pitch, which is the usual cause of chipmunk or slowed-down audio.",
          ),
          concept(
            "telephony",
            "Telephone audio: 8 kHz and G.711",
            "The phone network carries narrowband audio sampled at 8 kHz, commonly as G.711: 8 bits per sample with logarithmic companding (mu-law or A-law), 64 kbit/s. An agent reached by phone, through a SIP trunk and a gateway, runs the same pipeline on less audio detail, which makes transcription harder, and the phone network's own delay is added on top of yours.",
          ),
        ]),
        topic("device", "Capture, playback and echo", [
          concept(
            "buffers",
            "Capture and playback buffers",
            "The sound card delivers and consumes audio in small buffers at a steady cadence. If the application does not supply the next playback buffer in time the output has a gap (an underrun), and every buffer between the microphone and the network, or the network and the speaker, adds its length to the delay.",
          ),
          concept(
            "echo",
            "Acoustic echo",
            "The far end's voice comes out of the loudspeaker, is picked up by the microphone and is sent back, so the far end hears itself after a delay. For a voice agent the echo is its own speech arriving as 'user audio', which can make it transcribe or interrupt itself.",
          ),
          concept(
            "aec",
            "Echo cancellation",
            "The canceller knows the signal being played (the reference), adapts a filter that models the path from speaker through the room to the microphone, and subtracts the predicted echo from the captured signal. It runs on the device that plays and captures the audio, because only there is the reference aligned in time with what the microphone hears. Chrome, Firefox and Safari turn it on by default for getUserMedia audio (the echoCancellation constraint, next to noiseSuppression and autoGainControl), and headphones remove the problem at the source.",
          ),
        ]),
      ],
      {
        detail: "What digitised speech is, and why a conversation sets a harder deadline than a web request.",
        links: [PRIMER],
      },
    ),

    topic(
      "webrtc",
      "WebRTC transport",
      [
        topic("why", "What WebRTC is", [
          concept(
            "bundle",
            "A bundle of protocols behind one browser API",
            "WebRTC is not one protocol. It combines signaling with SDP, ICE for finding a path, DTLS and SRTP for encryption, RTP and RTCP for media and SCTP for data, and browsers expose it all as RTCPeerConnection. Libraries such as libwebrtc (the engine inside Chrome) and Pion (Go) implement the same protocols for servers and native apps.",
          ),
          concept(
            "vs-websocket",
            "Why not send client audio over a WebSocket",
            "WebRTC media normally runs over UDP, with congestion control, jitter buffering, loss concealment and echo cancellation built in. WebSockets ride on TCP, where one lost packet delays all audio behind it. A WebSocket is still reasonable between servers on a reliable network; the problem is the last mile to the user's device.",
          ),
          concept(
            "phases",
            "The four jobs: signal, connect, secure, communicate",
            "Peers first exchange session descriptions through signaling, then ICE finds a working network path, then a DTLS handshake over that path produces keys, and only then do encrypted media and data flow. When a call fails you can say which of the four steps it stopped at: a signaling bug, a blocked path, a fingerprint mismatch, or a track that is muted or was never attached.",
          ),
        ]),
        topic("signaling", "Signaling", [
          concept(
            "out-of-band",
            "Why signaling is out of band",
            "Two peers cannot open a connection until each knows the other's candidate addresses, codecs and security parameters, so that first exchange has to travel some other way. WebRTC leaves the channel to the application: usually a WebSocket or an HTTP request through a server both sides can already reach.",
          ),
          concept(
            "sdp",
            "SDP: the session description",
            "A text format of key=value lines. Each media section (an m= line) lists the codecs offered with their RTP payload type numbers and the direction (send, receive or both). The description also carries the ICE username fragment and password and the fingerprint of the DTLS certificate. You can find each of these in a real offer.",
          ),
          concept(
            "offer-answer",
            "Offer, answer and trickle ICE",
            "One side creates an offer listing everything it is willing to send and receive; the other replies with an answer that picks a compatible subset. Each side sets its own description as local and the peer's as remote (createOffer, setLocalDescription and setRemoteDescription in the browser). With trickle ICE, candidates are sent through signaling one by one as they are found, instead of delaying the offer until gathering ends.",
          ),
        ]),
        topic(
          "ice",
          "Connecting: ICE in depth",
          [
            concept(
              "nat-mapping",
              "NAT mapping behaviour decides what works",
              "Some NATs reuse one public port for a given internal socket whatever the destination; an address learned from STUN is then usable by the peer. Others (often called symmetric) allocate a different public port per destination, so the address STUN reported is wrong for the peer, direct connection often fails and a relay is needed.",
            ),
            concept("candidates", "Candidate types", undefined, {
              parts: [
                concept(
                  "host",
                  "Host candidates",
                  "An address taken directly from a local network interface. It works when both peers are on the same network, or when the address is public, as a media server's is. Browsers usually hide a private host address behind a random mDNS name ending in .local, so the page cannot read the user's local IP.",
                ),
                concept(
                  "srflx",
                  "Server-reflexive candidates",
                  "The public address and port from which a STUN server saw the client's request arrive, returned in the response. It is the outside of the NAT mapping for that local socket.",
                ),
                concept(
                  "relay",
                  "Relay candidates",
                  "An address allocated on a TURN server, which forwards whatever arrives there to the client and sends the client's packets on to the peer. TURN requires credentials because the relay carries all the media, and the client can reach it over UDP, TCP or TLS, which gets through firewalls that block UDP.",
                ),
                concept(
                  "prflx",
                  "Peer-reflexive candidates",
                  "A candidate nobody advertised: it is discovered when a connectivity check arrives from an address that is not in the candidate list, which happens when a NAT chose a new mapping for that path.",
                ),
              ],
            }),
            concept(
              "checks",
              "Candidate pairs, connectivity checks and nomination",
              "Each local candidate is paired with each remote candidate and the pairs are tried in priority order, direct before relayed. A check is a STUN binding request sent on the pair itself, authenticated with the username fragment and password from the SDP. Each outgoing check also opens the sender's own NAT mapping, which is what lets the peer's check in (hole punching). One peer, the controlling agent, nominates a pair that succeeded and media flows on it.",
            ),
            concept(
              "restart",
              "Keepalives, disconnection and ICE restart",
              "Checks continue through the call to keep NAT mappings alive and to confirm the peer still wants the traffic. When they stop being answered the connection state goes to disconnected and then failed. An ICE restart (a new offer with a fresh username fragment and password, restartIce() in the browser) gathers new candidates and finds a new path, after a switch from Wi-Fi to mobile for example, while keeping the existing DTLS session and media streams.",
            ),
          ],
          { detail: "Networking introduced STUN, TURN and ICE; this is how they work underneath." },
        ),
        topic("secure", "Securing: DTLS and SRTP", [
          concept(
            "how-encrypted",
            "How media is encrypted: DTLS for keys, SRTP for packets",
            "A DTLS handshake between the peers derives keys, and the media is encrypted with SRTP. Media does not travel inside DTLS records: the handshake agrees an SRTP profile, and both sides export key material from the DTLS session for SRTP to use. There is no unencrypted mode to fall back to.",
          ),
          concept(
            "dtls",
            "DTLS: TLS over datagrams",
            "TLS assumes a reliable ordered stream, which UDP is not. DTLS gives the handshake messages their own sequence numbers and retransmission timers so the handshake survives loss and reordering, and otherwise provides the same key agreement and authentication as the TLS handshake covered in Networking.",
          ),
          concept(
            "fingerprint",
            "Self-signed certificates and the SDP fingerprint",
            "Peers have no certificate authority to appeal to. Each generates a self-signed certificate and puts its hash in the SDP; after the handshake each side checks that the certificate it was shown matches the fingerprint it was told. The connection is therefore only as trustworthy as the signaling channel that carried the fingerprint.",
          ),
          concept(
            "srtp",
            "SRTP: what is encrypted and what is not",
            "SRTP encrypts the RTP payload, adds an authentication tag over the whole packet and rejects replayed packets. The RTP header stays readable, so anyone on the path can see sequence numbers, timestamps and SSRC, but it cannot be altered undetected. SRTCP protects RTCP in the same way.",
          ),
        ]),
        topic("rtp", "Media: RTP and RTCP", [
          concept(
            "role",
            "What RTP adds to a UDP datagram",
            "RTP carries the media packets with sequence numbers and timestamps: a 12-byte header in front of each encoded frame that lets a receiver put packets in order, detect loss and know when to play each one. RTP itself guarantees nothing about delivery.",
          ),
          concept("header", "The RTP header fields", undefined, {
            parts: [
              concept(
                "seq",
                "Sequence number",
                "A 16-bit counter that starts at a random value and increases by one per packet. A gap means loss, an out-of-order value means reordering, and the receiver must handle the counter wrapping around.",
              ),
              concept(
                "timestamp",
                "Timestamp",
                "The sampling instant of the first sample in the packet, counted in units of the media clock, not wall time. Opus, the audio codec WebRTC uses, always has a 48 kHz RTP clock, so a 20 ms packet advances it by 960. It tells the receiver when to play the packet regardless of when it arrived. Across a silence in which nothing was sent, the timestamp jumps ahead while the sequence number does not.",
              ),
              concept(
                "ssrc",
                "SSRC",
                "A random 32-bit identifier for one stream from one source. It lets several streams share a transport, and the receiver keeps its state (sequence tracking, jitter buffer, statistics) per SSRC.",
              ),
              concept(
                "pt",
                "Payload type",
                "A 7-bit number that says which codec the payload uses. For codecs like Opus the number is dynamic (96 to 127) and only means something through the SDP, which maps it to a codec name and clock rate.",
              ),
            ],
          }),
          concept(
            "rtcp",
            "RTCP: the feedback channel",
            "RTCP carries feedback: loss, jitter and round-trip reports that drive congestion control. Receivers send receiver reports (fraction lost, cumulative loss, highest sequence number received, interarrival jitter); senders send sender reports pairing a wall-clock time with an RTP timestamp. A receiver report echoes the last sender report's timestamp and how long it was held, which gives the sender round-trip time without synchronised clocks.",
          ),
          concept(
            "mux",
            "One port for everything: BUNDLE and demultiplexing",
            "Browsers put every audio, video and data stream of a connection on one ICE path and one DTLS session when the peer agrees (a=group:BUNDLE in the SDP), and send RTCP on the same port as RTP (a=rtcp-mux). The receiver tells STUN, DTLS and SRTP packets apart by the value of their first byte, then separates media streams by SSRC or by the MID header extension.",
          ),
        ]),
        topic("jitter", "The jitter buffer", [
          concept(
            "playout",
            "Playout delay, and late means lost",
            "The jitter buffer from Networking, in detail: it holds each packet until its timestamp plus a target delay, reordering by sequence number meanwhile, so the decoder is fed at an even pace. The whole target delay is added to mouth-to-ear latency, and a packet arriving after its playout time is thrown away, so for the listener late is the same as lost.",
          ),
          concept(
            "adaptive",
            "Adaptive buffers and time stretching",
            "The target delay grows when arrival times become more uneven and shrinks when the network calms: too small turns jitter into concealment, too large turns it into delay. To change the delay without a gap or a skip, the buffer plays audio slightly faster or slower while keeping the pitch (NetEq, the audio jitter buffer in libwebrtc, does this).",
          ),
        ]),
        topic("loss", "Packet loss", [
          concept(
            "plc",
            "Packet loss concealment",
            "When a frame is missing at playout time, the decoder invents a replacement by extending the audio before it. That is convincing for a short gap, around a frame or two, and then fades towards silence, so isolated losses go unnoticed while a burst of consecutive losses removes syllables and sounds robotic. The same loss percentage can therefore sound fine or terrible depending on the pattern.",
          ),
          concept(
            "fec",
            "Forward error correction",
            "The sender adds redundancy before any loss happens (Opus in-band FEC carries a low-bitrate copy of the previous frame; the RED format repeats earlier encoded frames whole), so the receiver can rebuild a missing packet from the next one without asking. It costs bitrate all the time, and it only helps if the packet carrying the redundancy is in the jitter buffer by the time the gap is played.",
          ),
          concept(
            "nack",
            "NACK and retransmission",
            "The receiver lists missing sequence numbers in an RTCP NACK and the sender resends them. It helps only when a round trip fits inside the jitter buffer's delay. Video depends on it (with a keyframe request as the fallback) because a lost packet corrupts the frames that follow; for low-latency audio, concealment and FEC do most of the work.",
          ),
        ]),
        topic("congestion", "Congestion control for media", [
          concept(
            "bitrate",
            "Congestion control without a window",
            "UDP has no congestion control, so a sender that exceeds what the path can carry fills router queues: delay rises first, then packets drop, for everyone on the link. A media sender cannot hold data back as TCP does, so it keeps an estimate of available bandwidth and sets the encoder's bitrate to fit it, lowering quality instead of falling behind real time.",
          ),
          concept(
            "signals",
            "Delay and loss as signals",
            "Google Congestion Control, the algorithm in libwebrtc and so in the major browsers, watches two things: packets arriving increasingly late relative to when they were sent (a queue is building, so back off before anything is lost) and the reported loss rate. The receiver feeds back per-packet arrival times in RTCP and the sender computes the estimate. Opus speech needs only tens of kilobits a second, so audio is usually the victim of congestion from other traffic, not its cause.",
          ),
        ]),
        topic("topology", "Topologies", [
          concept(
            "p2p",
            "Peer to peer and the mesh",
            "Two peers send media directly to each other. With N participants each one must upload N-1 copies of its media, so a full mesh stops working beyond a handful of people.",
          ),
          concept(
            "mcu",
            "MCU: mix on the server",
            "A multipoint control unit decodes every participant's media, mixes it into one stream per receiver and re-encodes it. Clients get one simple stream; the server pays heavily in CPU, and the extra decode and encode add delay.",
          ),
          concept(
            "sfu",
            "SFU: forward, do not mix",
            "A selective forwarding unit: a server that receives each participant's media and forwards it to others without decoding and mixing, choosing per receiver which streams (and, for video, which quality layer) to send; this is how LiveKit scales rooms. Each receiver decodes and mixes the audio it gets. It terminates ICE, DTLS and SRTP separately for each participant, so media is encrypted hop by hop and readable on the server; end-to-end encryption needs a further layer applied to the encoded frames.",
            { links: [LIVEKIT] },
          ),
          concept(
            "agent-peer",
            "The agent as a participant",
            "A voice agent is a server-side WebRTC endpoint: it joins a room through an SFU like any other participant (the LiveKit Agents model), or the agent process terminates the peer connection itself. The server has a public address, so ICE is the easy case with no hole punching, though clients whose network blocks UDP may still need a TURN relay. The user's audio crosses the internet once to a nearby server; everything after is data-centre networking.",
          ),
        ]),
        topic("data", "Data channels", [
          concept(
            "channel",
            "What a data channel is",
            "A bidirectional channel for arbitrary application messages between the same two peers, carried by SCTP inside the DTLS connection, over the path ICE already found. Agents use it for live transcripts, agent state and client events, so the interface stays in step with the audio without a second connection.",
          ),
          concept(
            "modes",
            "Ordered, unordered and partially reliable",
            "Each channel chooses its own delivery, with ordering and reliability set independently: ordered or unordered, and fully reliable like TCP or partially reliable with a cap on retransmissions (maxRetransmits) or on message lifetime (maxPacketLifeTime). State updates that go stale can then be dropped instead of blocking newer ones.",
          ),
        ]),
        topic("observe", "Seeing it", [
          concept(
            "internals",
            "chrome://webrtc-internals",
            "The page lists every peer connection in the browser with its SDP, ICE candidate pairs and state changes, and graphs of every statistic; your code gets the same numbers from RTCPeerConnection.getStats(). From the candidate types of the selected pair you can tell whether a call is direct or going through a TURN relay.",
          ),
          concept(
            "stats",
            "The audio stats that matter",
            "On the inbound-rtp stats for the audio: packetsLost and jitter (in seconds) describe the network, jitterBufferDelay divided by jitterBufferEmittedCount is the average time a sample spent in the buffer, and concealedSamples against totalSamplesReceived is how much audio was invented. On the selected candidate-pair stats, currentRoundTripTime, in seconds. The delay and sample counters are cumulative, so take differences between two reports.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "webrtc-lab",
            "WebRTC under a bad network",
            "Run a local LiveKit server (or a Pion example) and connect two browser tabs with audio; use headphones so the tabs do not feed back. On Linux, use `tc netem` on the interface between browser and server (loopback if they share a machine) to add 50 ms of jitter and 2-5% loss on the path. Read chrome://webrtc-internals: jitter buffer delay, packets lost, concealed samples, round-trip time. Note at which loss rate speech becomes hard to follow.",
            {
              doneWhen: [
                "webrtc-internals stats at 0%, 2% and 5% loss",
                "A note on what you heard at each level and which stats moved",
              ],
              links: [LIVEKIT],
            },
          ),
        ]),
      ],
      {
        detail:
          "The protocols under the API: how two endpoints find a path, encrypt it, and carry audio over it when the network misbehaves.",
        links: [WEBRTC_CURIOUS],
      },
    ),

    topic(
      "codecs",
      "Codecs and voice activity",
      [
        topic("codec", "Why audio is compressed", [
          concept(
            "trade",
            "What a codec trades",
            "A codec (coder and decoder) shrinks audio by discarding what the ear will not miss. Every codec picks a point among bitrate, quality, delay and CPU. Delay has a floor: an encoder cannot emit a frame until it has collected all of its samples plus any look-ahead, so with 20 ms frames the first sample is at least 20 ms old when the packet leaves. Conversation therefore rules out codecs that buffer a long stretch of audio to compress it better.",
          ),
        ]),
        topic("opus", "Opus", [
          concept(
            "default",
            "Why Opus is the default",
            "Opus is an open, royalty-free codec standardised by the IETF (RFC 6716), and every WebRTC endpoint must support it (G.711 is the other mandatory audio codec). One codec covers narrowband speech up to full-band music at low delay, so there is rarely a reason to negotiate anything else for browser audio.",
          ),
          concept(
            "modes",
            "SILK, CELT and audio bandwidth",
            "Opus contains two coders: SILK, a speech coder built on linear prediction, and CELT, a transform coder suited to music and very low delay, plus a hybrid of the two. The encoder switches among them, and among audio bandwidths from narrowband to full-band, from one frame to the next as the bitrate and the signal change.",
          ),
          concept(
            "bitrate",
            "Bitrate, frame size and complexity",
            "Opus runs from 6 to 510 kbit/s; speech is clear at a few tens of kilobits a second, a small fraction of raw PCM. Frames are 2.5 to 60 ms with 20 ms the usual choice, the bitrate can be constant or variable, and a complexity setting from 0 to 10 trades encoder CPU for quality at the same bitrate.",
          ),
          concept(
            "inband-fec",
            "In-band FEC",
            "With FEC on, an Opus packet can also carry a low-bitrate copy of the previous frame. If a packet is lost and the next one is already in the jitter buffer, the decoder rebuilds the lost frame from that copy at reduced quality. The receiver says in SDP that it can use it (useinbandfec=1). The copy is made by the SILK layer, so it exists only in the SILK and hybrid (speech) modes, and libopus adds it only when FEC is enabled and the encoder has been told to expect some packet loss.",
          ),
          concept(
            "dtx",
            "DTX: not sending silence",
            "With discontinuous transmission (the receiver asks for it with usedtx=1 in SDP) the encoder stops sending regular packets while the input is silent, sending only an occasional update, and the decoder fills the gap with comfort noise. It saves bandwidth; on the wire it is a jump in RTP timestamps with no gap in sequence numbers, which a receiver must not mistake for loss.",
          ),
        ]),
        topic("vad", "Voice activity detection", [
          concept(
            "decision",
            "What a VAD decides",
            "For each short frame of audio: speech or not speech. A voice agent uses that one signal three ways: to notice the user has started talking (a possible interruption), to notice they have stopped (a possible end of turn), and to avoid sending silence to the recogniser.",
          ),
          concept(
            "models",
            "Energy thresholds versus trained models",
            "The simplest detector compares frame energy with a threshold, and fails as soon as there is background noise, music or a keyboard. Current agents run a small neural model (Silero VAD is a common choice) that outputs a speech probability per frame and runs in real time on a CPU.",
          ),
          concept(
            "tuning",
            "Thresholds, minimum durations and padding",
            "A VAD is tuned with a probability threshold, a minimum speech duration before 'started' fires, a minimum silence duration before 'stopped' fires, and some audio kept from just before the start so the first syllable is not cut. Set loosely, coughs and background voices trigger it; set strictly, quiet speakers are clipped or missed.",
          ),
        ]),
        topic("eot", "End-of-turn detection", [
          concept(
            "problem",
            "Turn detection: silence is not the end of a turn",
            "Turn detection is deciding when the user has finished speaking, using voice activity detection and often a model, balancing fast responses against cutting the user off. A pause is not the end of a turn: people stop mid-sentence to think, and a VAD alone cannot tell that pause from a finished question.",
          ),
          concept(
            "timeout",
            "The silence timeout and what it costs",
            "The baseline rule: the turn ends after a fixed stretch of silence. The whole timeout is added to the latency of every turn, because the agent does nothing while it waits. Shorten it and the agent cuts people off; lengthen it and every reply is slower.",
          ),
          concept(
            "semantic",
            "Model-based end-of-turn detection",
            "A model looks at the words so far (and in some systems the intonation of the audio) and predicts whether the utterance is complete. 'I'd like to fly to' is not; 'I'd like to fly to Boston' is. The agent can then wait only briefly after a complete sentence and longer after an incomplete one, instead of using one timeout for both.",
          ),
        ]),
      ],
      {
        detail:
          "How speech is compressed for the wire, and how a machine decides whether someone is talking and whether they have finished.",
        links: [PRIMER],
      },
    ),

    topic(
      "pipeline",
      "The voice agent pipeline",
      [
        topic("shape", "The cascade", [
          concept(
            "loop",
            "Speech-to-text, LLM, text-to-speech",
            "The standard agent is a cascade: the user's audio is decoded to PCM, a recogniser turns it into text, an LLM writes a reply, a synthesiser turns the reply into audio, and that is encoded and sent back. Turn detection decides when the LLM step starts. Each stage is a separate model and often a separate network service.",
          ),
          concept(
            "streaming",
            "Streaming between every stage",
            "Latency adds up across stages. Streaming lets TTS start on the first sentence while the LLM is still generating, cutting time to first audio. The same holds upstream: audio streams into the recogniser while the user is still talking, so transcription is nearly done when the turn ends.",
          ),
        ]),
        topic("stt", "Speech-to-text", [
          concept(
            "partials",
            "Streaming recognition: partial and final transcripts",
            "Audio is sent continuously over a persistent connection and text comes back as the user speaks. Partial (interim) transcripts arrive quickly and may be revised as more audio is heard; a final transcript will not change. Use partials for display and early decisions and finals for what the LLM is given. The wait for the final transcript after speech ends is one stage of turn latency.",
          ),
          concept(
            "accuracy",
            "Word error rate and what recognition loses",
            "Word error rate is substitutions plus deletions plus insertions, divided by the number of words in the reference transcript. Names, numbers, accents, noise and narrowband phone audio raise it. The LLM sees only the text, so a wrong word becomes a wrong answer, and the speaker's tone of voice is gone before the model sees the turn.",
          ),
        ]),
        topic("llm", "The LLM step", [
          concept(
            "ttft",
            "Time to first token matters most",
            "The user hears nothing until the first words are generated, so time to first token sets the latency of this stage. Total generation time matters much less: speech plays at roughly 150 words a minute and models generate text faster than that, so once started the model stays ahead of the voice. Time to first token rises with prompt length, and the conversation so far is part of every turn's prompt, unless the unchanged prefix is served from a prompt cache.",
          ),
          concept(
            "chunking",
            "Sentence chunking between LLM and TTS",
            "Tokens are collected until a sentence or clause boundary, and each piece is sent to the synthesiser as soon as it is complete. A synthesiser needs a phrase to get the intonation right, so sending word by word sounds wrong, and waiting for the full reply throws away the benefit of streaming.",
          ),
          concept(
            "spoken",
            "Writing for the ear",
            "The reply will be heard, not read. The prompt asks for short sentences and no markdown, lists or URLs, and numbers, dates and abbreviations must reach the synthesiser in a form it pronounces correctly.",
          ),
          concept(
            "tools",
            "Tool calls inside a turn",
            "A function call means the model's first output is not speech: the tool has to run and the model has to be called again before the user hears an answer. Agents cover the gap by saying something first ('let me check'), and keep tools fast or run them in parallel.",
          ),
        ]),
        topic("tts", "Text-to-speech", [
          concept(
            "ttfb",
            "Streaming synthesis and time to first audio byte",
            "A streaming synthesiser returns audio in chunks as it is generated, so playback begins long before the sentence is finished. The number to measure is time to first audio byte: from sending the text to receiving the first chunk of audio.",
          ),
          concept(
            "pacing",
            "Faster than real time: buffered audio and what was heard",
            "Synthesis runs faster than playback, so at any moment there is audio that has been generated but not yet played, queued in the agent, the network and the client. Output has to be paced out in real time, an interruption has to empty that queue, and to know which words the user actually heard you need the playback position (some synthesisers return word timestamps for this).",
          ),
        ]),
        topic("turns", "Turn-taking and interruptions", [
          concept(
            "states",
            "The conversation state machine",
            "At any moment the agent is listening, thinking or speaking, and the user is speaking or silent. Every event (speech started, speech stopped, end of turn, first audio out, playback finished) is a transition, and many voice agent bugs are an event handled in the wrong state.",
          ),
          concept("barge-in", "Barge-in", undefined, {
            parts: [
              concept(
                "detect",
                "Detecting the interruption",
                "Barge-in is the user interrupting while the agent is speaking. The VAD fires on the incoming audio, but 'mm-hm', a cough, background noise and the agent's own echo fire it too, so agents require a minimum duration or some transcribed words before it counts, and may resume the reply when the 'interruption' turns out to be nothing.",
              ),
              concept(
                "flush",
                "Stopping playback and flushing audio",
                "The agent must stop playback immediately. That means discarding audio queued on the server and also audio already delivered to the client but not yet played; if either is left, the agent keeps talking for a noticeable moment after being interrupted.",
              ),
              concept(
                "cancel",
                "Cancelling LLM and TTS work",
                "The in-flight LLM stream and synthesis requests are cancelled, not left to finish. Otherwise they keep costing money and, worse, their late output can be spoken after the user's new turn.",
              ),
              concept(
                "truncate",
                "Recording what was actually heard",
                "The conversation history must hold only the part of the reply the user heard before interrupting. If the full generated text is stored, the model later assumes the user knows things they never heard.",
              ),
            ],
          }),
          concept(
            "speculative",
            "Starting the LLM before the turn is confirmed",
            "To hide the endpointing wait, an agent can begin generating from the transcript as soon as speech pauses, and discard the result if the user keeps talking. It trades wasted LLM calls for latency, and nothing generated this way may be spoken until the turn is confirmed.",
          ),
        ]),
        topic("budget", "Where the milliseconds go", [
          concept(
            "stages",
            "The stages of one turn",
            "End-of-turn detection (the VAD's silence window plus any further turn-detection wait), speech-to-text finalisation, LLM time to first token, text-to-speech time to first audio, and network transport plus the jitter buffer in each direction. Capture, encoding, decoding and the playback device add smaller fixed amounts at each end. Voice-to-voice latency is the sum, and a latency budget gives each stage a target so that the sum meets yours.",
          ),
          concept(
            "dominant",
            "What usually dominates",
            "LLM time to first token and end-of-turn detection, followed by TTS time to first audio; network transport is small if services are close to each other. So the first things to tune are the choice of model, the size of the prompt and the endpointing rule.",
          ),
          concept(
            "colocate",
            "Co-location and warm connections",
            "Each network hop between regions adds tens of milliseconds per stage and per direction; with STT, LLM and TTS in one region the pipeline overhead nearly vanishes. Keep the connection to each service open across turns as well, so no turn pays for a TCP and TLS handshake.",
          ),
        ]),
        topic("s2s", "Speech-to-speech models", [
          concept(
            "native",
            "One model, audio in and audio out",
            "A speech-to-speech model takes audio and produces audio directly, without a text stage in between (OpenAI's Realtime API is one example). Removing two hand-offs can cut latency, and the model hears tone, hesitation and emphasis that a transcript discards.",
          ),
          concept(
            "tradeoffs",
            "What you give up, and what stays the same",
            "There is no transcript between stages to log, check or filter, the voice and the reasoning cannot be swapped independently, and a transcript produced on the side may differ from what the model acted on. Transport, echo cancellation, turn detection, interruption handling and latency measurement are all still your problem.",
          ),
        ]),
        topic(
          "frameworks",
          "Frameworks",
          [
            concept(
              "pipecat",
              "Pipecat: a pipeline of frame processors",
              "Pipecat models the agent as a pipeline of processors that pass frames: audio, text and control frames. A transport is the pipeline's input and output, and each service (STT, LLM, TTS) is a processor. An interruption is itself a high-priority system frame: it overtakes queued work, and each processor stops its current task and drops its queued data and control frames, except those marked uninterruptible.",
              { links: [PIPECAT] },
            ),
            concept(
              "livekit-agents",
              "LiveKit Agents: the agent joins the room",
              "The agent is a participant in a LiveKit room, connected through the SFU like the user. A long-running agent server process (a worker in older docs) registers with the LiveKit server and, when dispatched to a room, starts a job subprocess that joins it; inside the job an agent session wires VAD, turn detection, STT, LLM and TTS together and handles interruptions.",
              { links: [LIVEKIT_AGENTS] },
            ),
            concept(
              "compare",
              "How each models the pipeline and interruptions",
              "After skimming both quick starts you can say, for each framework, where the pipeline is defined, how audio enters and leaves, what happens internally on an interruption, and which per-stage timings it reports.",
            ),
          ],
          {
            detail:
              "What an orchestration framework provides: the transport, VAD and turn detection, interchangeable STT, LLM and TTS services, interruption handling and metrics.",
            links: [LIVEKIT_AGENTS, PIPECAT],
          },
        ),
      ],
      {
        detail: "Speech-to-text, an LLM and text-to-speech in a loop, and where each millisecond of a turn goes.",
        links: [PRIMER],
      },
    ),

    topic(
      "operate",
      "Measuring and operating",
      [
        topic("measure", "Measuring latency", [
          concept(
            "at-the-ear",
            "Measure where the user is",
            "Voice-to-voice latency is defined at the user's ears. Timestamps taken on the server leave out the uplink, the downlink, both jitter buffers and the playback device, so the true number is larger. The ground truth is a recording made at the client: measure the gap in the waveform between the end of the user's speech and the start of the agent's.",
          ),
          concept(
            "timestamps",
            "The timestamps to take each turn",
            "End of speech detected by the VAD, end of turn decided, transcript final, first LLM token, first audio byte from TTS, and audio heard at the client. Differences between neighbours give the stage durations; the LLM can start only once both the turn decision and the final transcript exist. The user really stopped speaking earlier than the VAD's event, by its minimum-silence window, and that wait belongs in the total. 'Audio heard' is taken on the client, whose clock differs from the server's, so measure it there or correct for the offset.",
          ),
          concept(
            "percentiles",
            "Percentiles, per stage and per turn",
            "Report p50 and p95, not an average: a conversation has many turns, so a user meets the slow tail several times in one call, and those are the turns that feel broken. Percentiles do not add: the p95 of the whole turn is not the sum of the stages' p95s, so measure the total directly as well.",
          ),
        ]),
        topic("log", "What to record", [
          concept(
            "turn-record",
            "The per-turn record",
            "One structured record per turn: session and turn identifiers, the stage timestamps, the transcript, the reply text and how much of it was spoken, whether the turn was interrupted, token and character counts, the model or service used at each stage, and any error or timeout. Exported as a trace with one span per stage, a slow turn can be opened and read.",
          ),
          concept(
            "session-health",
            "Network and audio health per session",
            "Alongside the turns, keep the transport statistics for the call: packet loss, jitter, round-trip time, jitter buffer delay and concealed audio. A bad transcript or a slow turn can then be traced to the network, the device or the pipeline instead of guessed at.",
          ),
        ]),
        topic("failures", "Failure modes", [
          concept(
            "dropped",
            "Dropped audio",
            "Words go missing in either direction. Causes: packet loss beyond what concealment hides, a playback underrun because audio was not supplied in time, a VAD that clips the first syllable, or agent audio flushed by a false interruption. Concealed-sample counts, the per-turn records and a recording tell them apart.",
          ),
          concept(
            "talk-over",
            "Talk-over",
            "Agent and user speak at once. Either the agent started too early (the end-of-turn rule fired during a pause), or it failed to stop (barge-in detected late, or buffered audio not flushed), or it interrupted itself by hearing its own echo.",
          ),
          concept(
            "runaway",
            "Runaway latency",
            "Latency that grows through a call instead of staying flat. A stage running slower than real time builds a queue in front of it, and every later turn inherits the backlog; a prompt that grows every turn does the same to time to first token. The fixes are bounded queues that drop stale audio, a watch on queue depth, and a cap on context.",
          ),
          concept(
            "stalled-stage",
            "A slow or failed stage",
            "Each stage is usually a remote service that can stall or return an error. Without a timeout per stage the user hears silence and cannot tell whether the agent is still there. The agent needs a deadline, a retry or a fallback service, and something to say when it gives up.",
          ),
        ]),
        topic("scale", "Many calls at once", [
          concept(
            "sessions",
            "Long-lived sessions change how you scale",
            "Each call holds a stateful connection for minutes, so capacity is concurrent sessions, deploys must drain gracefully, and load balancing by request does not apply. A new call is placed on a worker with spare capacity and stays there until it ends.",
          ),
        ]),
        topic("recap", "Looking back across the sheet", [
          concept(
            "mechanisms",
            "Container, microVM, durable workflow: the mechanisms",
            "Container: a process with namespaces, cgroups and reduced privileges. MicroVM: a KVM guest with a minimal device model. Durable workflow: deterministic code replayed from a persisted event history. Being able to name the mechanism behind each word in one sentence is the test of the whole sheet.",
          ),
        ]),
        topic("build", "Build it", [
          build(
            "voice-agent",
            "Capstone: a voice agent with a latency budget",
            "Build a voice agent you can talk to: streaming speech-to-text, an LLM, and streaming text-to-speech over WebRTC, using Pipecat or LiveKit Agents. Instrument every stage and produce a per-turn breakdown: end of speech detected, end of turn decided, transcript final, first LLM token, first audio byte, audio heard at the client. Support barge-in: when the user interrupts, stop speaking, cancel generation and keep only what was heard.",
            {
              doneWhen: [
                "A link to the agent's repo",
                "The per-stage latency table for ten turns",
                "A log of one interrupted turn showing playback stopped, LLM and TTS cancelled and the truncated reply in history",
              ],
              links: [PIPECAT, LIVEKIT_AGENTS],
              parts: [
                build(
                  "agent",
                  "Working voice agent over WebRTC",
                  "You can hold a multi-turn spoken conversation with it from a browser: audio in and out over WebRTC, with streaming speech-to-text, an LLM and streaming text-to-speech in between.",
                ),
                build(
                  "breakdown",
                  "Per-stage latency breakdown for each turn, exported as metrics",
                  "Every turn records the six timestamps (end of speech detected, end of turn decided, transcript final, first LLM token, first audio byte, audio heard at the client), and the stage durations between them are exported as metrics you can graph.",
                ),
                build(
                  "interruption",
                  "Interruption handling that cancels LLM and TTS work",
                  "Speaking over the agent stops its audio promptly, the in-flight LLM and TTS requests are cancelled instead of being left to finish, and the conversation history keeps only what was actually spoken.",
                ),
                build(
                  "budget",
                  "A written latency budget: target and measured value per stage",
                  "A table with one row per stage giving the target you set and the value you measured, the targets adding up to your voice-to-voice target, with a sentence on each stage that misses.",
                ),
              ],
            },
          ),
          build(
            "latency-report",
            "Voice-to-voice latency under network stress",
            "Measure voice-to-voice p50 and p95 on a clean network and with 50 ms jitter and 2% loss. Identify your largest stage and make one change that reduces it (a faster model, streaming earlier, co-locating services). Report before and after.",
            { doneWhen: ["p50 and p95 before and after, on the clean and the degraded network"] },
          ),
          build(
            "retrospective",
            "Retrospective and portfolio",
            "Assemble a portfolio page linking your three capstones, the labs repository and your write-ups. For each capstone prepare a five-minute explanation: the problem, the design, one hard bug, the numbers. List what you would study next.",
            {
              doneWhen: ["A link to the portfolio page", "A note on what you would learn next and why"],
            },
          ),
        ]),
      ],
      {
        detail: "Proving how fast the agent is, turn by turn, and knowing the ways it breaks.",
        links: [PRIMER],
      },
    ),
  ],
);
