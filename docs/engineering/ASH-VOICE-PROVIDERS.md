# ASH voice: provider comparison and recommendation

Status: recommendation only. The live default is unchanged (`deepgram/aura-2` through OpenRouter, `MEDIA_MODELS.speech` in `artifacts/api-server/src/lib/models.ts`). Switching needs the owner's choice after a listening test.

## Constraint that decides most of this

OpenRouter stays ASH's intelligence layer. For the simulator it also routes speech with the same server-side key and credit billing (`lib/openrouter-media.ts`). OpenRouter's `/api/v1/audio/speech` endpoint (OpenAI-compatible, mp3 or pcm out) now lists premium voices, so a better voice does **not** need a new vendor key. Checked against `GET https://openrouter.ai/api/v1/audio/speech/models`, which lists among others:

- `elevenlabs/eleven-v4-turbo`, `elevenlabs/eleven-v4`, `elevenlabs/eleven-flash-v2.5`, `elevenlabs/eleven-v3-conversational`
- `deepgram/aura-2` (current), `deepgram/flux-tts`
- `google/gemini-3.8-flash-tts`, `microsoft/mai-voice-2.1`, `fish-audio/s2.1-pro`, `x-ai/grok-voice-tts-1.0`

## Comparison (from provider docs; not yet measured by us)

| Option | Quality and expression | Realtime fit | Integration | Notes |
| --- | --- | --- | --- | --- |
| Deepgram Aura-2 via OpenRouter (current) | Clear, business-like; fewer emotional controls | Fast | Already live | Billed at $30 per million characters in our code. |
| ElevenLabs Eleven v4 Turbo via OpenRouter | Expressive, keeps v4 audio tags, 90+ languages (OpenRouter listing) | ElevenLabs states ~100 ms median model latency for v4 Turbo and Flash v2.5, before network | Change one model ID plus a voice map (voices are names like `sarah`, `jessica`, `brian`) | Best candidate for the "premium human" voice. |
| ElevenLabs Flash v2.5 via OpenRouter | Slightly lower quality than ElevenLabs' bigger models (their docs) | Same as above; 32 languages | Same | Fallback if v4 Turbo is too slow or costly. |
| ElevenLabs or Cartesia direct WebSocket | Same voices / Sonic 3.x | Token-by-token text in, audio out, word timestamps for lip-sync | New vendor key and contract, separate billing | Only worth it once the model streams tokens and we need tighter lip-sync. |
| OpenAI / Gemini speech-to-speech realtime agents | Natural, but the vendor's model does the thinking | Lowest latency | Would replace ASH's brain | **Rejected**: the directive forbids swapping ASH's intelligence for a voice vendor's agent. |

Speech-to-text today is `openai/whisper-large-v3` on a finished utterance. For true streaming turn-taking, Deepgram Flux has built-in end-of-turn detection (`eot_threshold`, `eager_eot_threshold`, `eot_timeout_ms`). That needs a Deepgram key on the server and is the next step for streaming input.

## Saying "Ash", not "A-S-H"

`toSpokenText` (`lib/ash-live/protocol.ts`) rewrites `ASH` to `Ash` and `STARKS` to `Starks` before any voice sees the text, and the spoken-mode prompt tells ASH her name is said like the word "ash". This is a provider-independent normalization; confirm pronunciation by listening before release. ElevenLabs direct also supports pronunciation dictionaries (alias rules) if more terms need fixing.

Sources: [OpenRouter speech endpoint](https://openrouter.ai/docs/api/api-reference/tts/create-speech), [ElevenLabs latency guidance](https://elevenlabs.io/docs/eleven-api/guides/how-to/best-practices/latency-optimization), [Cartesia WebSocket TTS](https://docs.cartesia.ai/api-reference/tts/websocket), and [Deepgram Flux endpointing](https://developers.deepgram.com/docs/flux/configuration).

Before launch, verify commercial voice rights, data retention and residency, and terms for custom voices. No listening, licensing or reliability tests have been run yet. Include accents, languages, breath and pauses, emotion, pitch and emphasis, and business terminology in the listening test.

## Recommendation

1. Run a blind listening test on 10 real ASH replies (greeting, plan summary, numbers and money, bad news, celebration) with Aura-2, Eleven v4 Turbo and Flash v2.5, measuring time to first audio from our server.
2. If Eleven v4 Turbo wins, switch `MEDIA_MODELS.speech`, map the ASH Live voice list to ElevenLabs voice names, and update `SPEECH_USD_PER_MILLION_CHARS` to its OpenRouter price. No new secret is needed.
3. Add streaming speech-to-text (Deepgram Flux) when hands-free mode needs faster turn-taking than the current ~1 second of silence.
