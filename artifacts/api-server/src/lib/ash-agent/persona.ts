// ASH's personality, and the per-user communication-style profile she adapts
// to. The profile is a cheap rolling summary of how the user writes, kept in
// the existing user_memory table (key ASH_STYLE_KEY), so no new storage.
import { db, userMemoryTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

export const ASH_PERSONALITY = `Personality: you are ASH, a sharp, warm, confident executive partner with a dry sense of humour. You are candid (you say when an idea is weak), optimistic about what the user can build, and you celebrate real wins. You speak as "I", never as "the AI".`;

export const ASH_STYLE_KEY = "ash_style_profile";

export interface StyleProfile {
  messages: number;
  avgWords: number;
  emojiRate: number;
  exclaimRate: number;
  casualRate: number;
  questionRate: number;
}

const EMOJI = /\p{Extended_Pictographic}/u;
const CASUAL = /\b(lol|lmao|gonna|wanna|gotta|yo|bro|ya|yeah|nah|kinda|tho|thx|pls|u|ur|imma|y'all|ok+|cuz)\b/i;
// Weight of each new message in the rolling averages once enough history exists.
const ALPHA = 0.1;

export function emptyProfile(): StyleProfile {
  return { messages: 0, avgWords: 0, emojiRate: 0, exclaimRate: 0, casualRate: 0, questionRate: 0 };
}

export function updateProfile(p: StyleProfile, message: string): StyleProfile {
  const n = p.messages + 1;
  const a = Math.max(ALPHA, 1 / n);
  const mix = (old: number, v: number) => Math.round((old * (1 - a) + v * a) * 1000) / 1000;
  const words = message.trim().split(/\s+/).filter(Boolean).length;
  return {
    messages: n,
    avgWords: mix(p.avgWords, words),
    emojiRate: mix(p.emojiRate, EMOJI.test(message) ? 1 : 0),
    exclaimRate: mix(p.exclaimRate, message.includes("!") ? 1 : 0),
    casualRate: mix(p.casualRate, CASUAL.test(message) ? 1 : 0),
    questionRate: mix(p.questionRate, message.includes("?") ? 1 : 0),
  };
}

/** 0-100: how well ASH knows the user's style; grows with conversation. */
export function familiarity(p: StyleProfile): number {
  return Math.min(100, Math.round((p.messages / 50) * 100));
}

export function personaNote(p: StyleProfile | null): string {
  if (!p || p.messages < 3) return `\n\n${ASH_PERSONALITY}`;
  const traits: string[] = [];
  traits.push(p.avgWords < 12 ? "writes short, punchy messages: keep replies tight" : p.avgWords > 60 ? "writes in detail: thorough replies are welcome" : "writes medium-length messages");
  if (p.casualRate > 0.3) traits.push("talks casually: match the relaxed, informal tone");
  else if (p.casualRate < 0.05) traits.push("writes formally: stay professional");
  if (p.emojiRate > 0.25) traits.push("uses emojis: an occasional emoji fits");
  if (p.exclaimRate > 0.3) traits.push("is high-energy: be enthusiastic");
  const level = familiarity(p);
  const strength = level >= 70 ? "Mirror their style closely" : level >= 30 ? "Lean toward their style" : "Adapt lightly to their style";
  return `\n\n${ASH_PERSONALITY}\nThis user ${traits.join("; ")}. ${strength}, while keeping your own personality.`;
}

export async function loadStyleProfile(userId: number): Promise<StyleProfile | null> {
  const [row] = await db
    .select({ value: userMemoryTable.memoryValue })
    .from(userMemoryTable)
    .where(and(eq(userMemoryTable.userId, userId), eq(userMemoryTable.memoryKey, ASH_STYLE_KEY)))
    .limit(1);
  if (!row) return null;
  try {
    return { ...emptyProfile(), ...(JSON.parse(row.value) as Partial<StyleProfile>) };
  } catch {
    return null;
  }
}

export async function recordUserMessage(userId: number, message: string, previous: StyleProfile | null): Promise<void> {
  const next = updateProfile(previous ?? emptyProfile(), message);
  const value = JSON.stringify(next);
  if (previous) {
    await db
      .update(userMemoryTable)
      .set({ memoryValue: value })
      .where(and(eq(userMemoryTable.userId, userId), eq(userMemoryTable.memoryKey, ASH_STYLE_KEY)));
  } else {
    await db.insert(userMemoryTable).values({ userId, memoryKey: ASH_STYLE_KEY, memoryValue: value, category: "ai_preference", tags: ["ash_style"] });
  }
}
