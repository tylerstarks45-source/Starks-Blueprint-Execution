// ASH Live protocol: the realtime contract shared by the web simulator, the
// Unreal Engine character and other ASH bodies. See docs/engineering/ASH-LIVE-PROTOCOL.md.
// Animation cues are fixed vocabularies chosen by server rules, never free-form
// model output, so a client can map each one to a safe, pre-built animation.
import { z } from "zod";

export const ASH_LIVE_PROTOCOL = 1;
export const ASH_LIVE_PATH = "/api/ash-live";
export const ASH_LIVE_SUBPROTOCOL = "ash-live.v1";

export const AVATAR_STATES = ["idle", "listening", "thinking", "speaking"] as const;
export const EMOTIONS = ["neutral", "warm", "happy", "focused", "concerned", "curious"] as const;
export const GESTURES = ["none", "nod", "wave", "explain", "think", "celebrate", "reassure"] as const;
export const LIVE_VOICES = ["alloy", "ash", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"] as const;
export const LIVE_SURFACES = ["live", "unreal", "desktop", "mobile", "web"] as const;
export const DEFAULT_VOICE = "nova";

export type Emotion = (typeof EMOTIONS)[number];
export type Gesture = (typeof GESTURES)[number];
export const MAX_LIVE_HISTORY = 20;

const turnId = z.string().regex(/^[\w-]{1,64}$/).optional();
// ~9 MB of audio once decoded; the socket's maxPayload caps the frame too.
const MAX_AUDIO_B64 = 12_000_000;

export const ClientMessage = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("session.start"),
    surface: z.enum(LIVE_SURFACES).optional(),
    page: z.string().max(200).regex(/^\/[\w\-/]*$/).optional(),
    speak: z.boolean().optional(),
    voice: z.enum(LIVE_VOICES).optional(),
    history: z.array(z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(8000),
    })).max(MAX_LIVE_HISTORY).optional(),
  }),
  z.object({ type: z.literal("session.clear") }),
  z.object({ type: z.literal("user.text"), text: z.string().trim().min(1).max(8000), turnId }),
  z.object({ type: z.literal("user.audio"), audioBase64: z.string().min(1).max(MAX_AUDIO_B64), mimeType: z.string().max(100).optional(), turnId }),
  z.object({ type: z.literal("user.speech_start") }),
  z.object({ type: z.literal("user.interrupt") }),
  z.object({ type: z.literal("ping") }),
]);
export type ClientMessage = z.infer<typeof ClientMessage>;

const MAX_SPOKEN_CHARS = 2000;

/** Plain text for TTS: drop markdown so the voice doesn't read symbols aloud, and say "ASH" as the name "Ash". */
export function toSpokenText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`#>|~]+/g, "")
    .replace(/^\s*[-+]\s+/gm, "")
    .replace(/\bASH\b/g, "Ash")
    .replace(/\bSTARKS\b/g, "Starks")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SPOKEN_CHARS);
}

/** Splits spoken text into chunks for sentence-by-sentence speech; the first chunk is short so audio starts sooner. */
export function cueForReply(text: string, steps: Array<{ ok: boolean; approvalId?: number }>): { emotion: Emotion; gesture: Gesture } {
  if (steps.some((s) => s.approvalId != null)) return { emotion: "focused", gesture: "explain" };
  if (steps.some((s) => !s.ok)) return { emotion: "concerned", gesture: "reassure" };
  const t = text.trim();
  if (/\b(congrat\w*|great news|well done|nice work|you did it)\b/i.test(t)) return { emotion: "happy", gesture: "celebrate" };
  if (/^(hi|hey|hello|good (morning|afternoon|evening))\b/i.test(t)) return { emotion: "warm", gesture: "wave" };
  if (/\?\s*$/.test(t)) return { emotion: "curious", gesture: "none" };
  if (t.split(/\s+/).length > 40) return { emotion: "neutral", gesture: "explain" };
  return { emotion: "warm", gesture: "nod" };
}
