# ASH Live: realtime protocol for the simulator, Unreal and other ASH bodies

ASH Live is one secure WebSocket that any ASH "body" connects to: the web simulator at `/ash-live`, and future Unreal Engine, desktop, mobile, in-car or robot clients. Every body talks to the same ASH: the same tool-using agent, personality, memory, ASH Control rules and missions as the chat dock. A body never runs its own AI and never holds OpenRouter or voice-provider keys.

Code: `artifacts/api-server/src/lib/ash-live/` (`protocol.ts` is the contract, `server.ts` the session), shared prompt in `lib/ash-agent/context.ts`, simulator in `artifacts/web/src/pages/AshLivePage.jsx`, tests in `src/__tests__/ash-live.test.ts`.

## Transport decision

| Option | Verdict |
| --- | --- |
| WebSocket (`ws`, same port as the API) | **Used now.** Requires the deployment proxy to forward the WebSocket upgrade, from browsers and from Unreal (built-in `WebSockets` module), carries JSON events and audio chunks both ways, no extra infrastructure. |
| SSE + HTTP POST | Rejected: one-way, so interrupts and audio need a second channel. |
| WebRTC | Later, only if measured latency needs it. It offers audio-specific congestion and jitter handling, but adds signaling and may require TURN and a media gateway. Echo cancellation is a client concern. The event protocol below stays the same; only the audio path would move. |

## Connecting

1. Open `wss://<api-host>/api/ash-live`. Browsers must come from an allowed origin (`ALLOWED_ORIGINS` or Replit domains); native clients send no `Origin`.
2. Within 10 seconds send `{"type":"auth","token":"<JWT from POST /api/auth/login>"}`. The token is checked like every HTTP route: signature, active account, token version (on each turn and again during progress polling, so a revoked token cannot start a subsequent turn). Bad or missing auth closes with code `4401`.
3. The server replies `session.ready` with the protocol version and the fixed animation vocabulary, then `avatar.state` `idle` and a `tasks.snapshot`.
4. Optional `session.start` sets `surface` (`live`, `unreal`, `desktop`, `mobile`, `web`), `page`, `speak`, `voice`. It can be sent again at any time.

Limits: 500 connections per process, 5 sessions per user per process (close code `4429`), 20 turns a minute per connection, 12 MB per message, 30-second ping/pong heartbeat. Reconnect with backoff on any other close; the conversation history is per connection, long-term memory is shared.

## Client → server

| type | fields | meaning |
| --- | --- | --- |
| `auth` | `token` | First message, required. |
| `session.start` | `surface?`, `page?`, `speak?`, `voice?` | Session settings. |
| `user.text` | `text`, `turnId?` | A typed or locally transcribed turn. |
| `user.audio` | `audioBase64`, `mimeType?`, `turnId?` | One spoken utterance (webm, ogg, wav, mp3, m4a). The server transcribes it. |
| `user.speech_start` | – | The user started talking. ASH stops speaking at once (barge-in). |
| `user.interrupt` | – | Stop button. Same effect. |
| `ping` | – | App-level keepalive; answered with `pong`. |

One backend turn runs at a time per connection. If you send a turn while the prior turn is still winding down, the server returns `turn_busy`; wait and retry deliberately. Stop local playback immediately on any interruption, even after the server finished sending speech. Interrupting stops new tool calls, but does not undo a tool that already started or cancel a background mission.

## Server → client

| type | fields | meaning |
| --- | --- | --- |
| `session.ready` / `session.updated` | `settings`; `protocol`, `sessionId`, `vocabulary` on ready only | Connected / settings changed. |
| `avatar.state` | `state`: `idle` \| `listening` \| `thinking` \| `speaking` | Drive idle, listening, thinking and talking loops. |
| `avatar.cue` | `turnId`, `emotion`, `gesture` | Facial expression and one gesture for the reply. |
| `transcript.user` | `turnId`, `text` | What ASH heard. |
| `ash.text` | `turnId`, `text` (markdown), `spokenText`, `actions`, `steps` | Her full reply, the workspace actions to apply (e.g. `navigate`) and the tools she ran (`ok`, `approvalId` when it is waiting for the owner). |
| `ash.speech` | `turnId`, `seq`, `last`, `text`, `mimeType`, `audioBase64` | Speech, one sentence group per message, in order. Play them back to back. Use `text` for captions and lip-sync timing. |
| `ash.speech.error` | `turnId`, `code`, `message` | Voice failed; show the text instead. |
| `ash.turn.end` | `turnId`, `interrupted` | The turn is over. When `interrupted` is true, drop any queued audio for that turn. |
| `tasks.snapshot` / `task.progress` | `missionId`, `goal`, `status`, `stepsDone`, `stepsTotal`, `currentStep`, `waitingFor` | Background missions. `tasks.snapshot` wraps rows in `tasks`; `task.progress` is one row. Progress polls every five seconds. |
| `error` | `code`, `message`, `turnId?` | `bad_message`, `turn_busy`, `rate_limited`, `no_speech`, `out_of_credits`, `daily_ai_limit`, `unavailable`. |

## Animation rules (Unreal and other bodies)

Emotions are `neutral, warm, happy, focused, concerned, curious`; gestures are `none, nod, wave, explain, think, celebrate, reassure`. The server picks them from fixed rules (`cueForReply` in `protocol.ts`): for example a tool waiting for approval gives `focused`/`explain`, a failed tool `concerned`/`reassure`. The model never writes animation commands, so a body only ever receives one of these names. Map each to a pre-built animation or blend shape set and ignore names you don't know (new ones may be added under the same protocol version).

Lip-sync: drive visemes locally from the audio you play (for example Unreal's audio envelope or a viseme plugin). Speech arrives as mp3; decode it with a runtime audio importer.

## Unreal adapter checklist

1. Log in with `POST /api/auth/login`, keep the JWT in memory only.
2. Connect with the `WebSockets` module, send `auth`, then `session.start` with `surface: "unreal"`.
3. Capture the mic with echo cancellation on, run voice activity detection, stop local playback immediately, send `user.speech_start` the moment speech begins, and send `user.audio` when the utterance ends.
4. Queue `ash.speech` audio by `seq`, stop and clear it on `ash.turn.end` with `interrupted: true`.
5. Drive the character from `avatar.state` and `avatar.cue`; show `tasks.snapshot` and `task.progress` on the command-center screens. `GET /api/command-center/context` gives the business and portfolio data for the room.
6. Never run anything else from the messages. All business actions happen on the server under ASH Control.

### Minimal Unreal client flow (pseudocode)

~~~text
Socket.OnConnected → SendJson({ type: "auth", token: SessionJwt })
Socket.OnMessage(event):
    session.ready  → SendJson({ type: "session.start", surface: "unreal" })
    ash.speech     → If event.turnId == ActiveTurn, enqueue decoded MP3 by seq
    avatar.cue     → Play only an animation from the local allowlist
    ash.turn.end   → If interrupted, discard remaining audio for event.turnId
Mic.OnSpeechStart  → StopLocalAudio(); SendJson({ type: "user.speech_start" })
Mic.OnUtteranceEnd → ActiveTurn = NewGuid(); SendJson({ type: "user.audio",
    turnId: ActiveTurn, mimeType: "audio/wav", audioBase64: EncodeBase64(WavBytes) })
~~~

The server's `speaking` state marks synthesis/delivery, not the end of audible playback.
Drive the speaking loop and lip-sync from the local audio player and leave it idle when the queue drains.

## Robots and vehicles

ASH Live only carries conversation, expression and progress. It has no motor, steering or driving messages, and none should be added here. A future robot or vehicle client must keep movement in its own certified safety controller; ASH may at most suggest a high-level goal that that controller accepts or refuses.

## Not built yet

- Streaming speech-to-text while the user is still talking (today an utterance is sent when it ends). Plan: Deepgram Flux or similar behind the server, keeping the same `transcript.user` event and adding partial transcripts.
- Token-by-token model streaming. The agent finishes its tool loop first, then speech starts sentence by sentence.
- Wake word.
- Premium voice: see `ASH-VOICE-PROVIDERS.md`.
