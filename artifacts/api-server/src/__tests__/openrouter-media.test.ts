/**
 * Media calls (STT, TTS, images) go through OpenRouter with the same credit
 * gate, deduction and usage logging as chat completions.
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { db, usersTable, openrouterUsageTable, creditTransactionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { transcribeAudio, synthesizeSpeech, generateImage, audioFormatFor } from "../lib/openrouter-media";
import { OutOfCreditsError } from "../lib/credits";
import { MEDIA_MODELS } from "../lib/models";

let userId: number;
let brokeId: number;
const fetchSpy = vi.spyOn(globalThis, "fetch");

beforeAll(async () => {
  process.env["OPENROUTER_API_KEY"] = "test-key";
  const stamp = Date.now();
  const [u, b] = await db
    .insert(usersTable)
    .values([
      { email: `media_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter", creditsBalance: 100 },
      { email: `media_broke_${stamp}@test.internal`, role: "USER", membershipStatus: "active", membershipTier: "starter", creditsBalance: 0, walletBalance: 0 },
    ])
    .returning({ id: usersTable.id });
  userId = u.id;
  brokeId = b.id;
});
afterEach(() => fetchSpy.mockReset());
afterAll(async () => {
  for (const id of [userId, brokeId]) {
    await db.delete(creditTransactionsTable).where(eq(creditTransactionsTable.userId, id));
    await db.delete(openrouterUsageTable).where(eq(openrouterUsageTable.userId, id));
    await db.delete(usersTable).where(eq(usersTable.id, id));
  }
});

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
const balance = async (id: number) => (await db.select({ c: usersTable.creditsBalance }).from(usersTable).where(eq(usersTable.id, id)))[0]!.c;

describe("openrouter media", () => {
  it("transcribes via /audio/transcriptions and bills the reported cost", async () => {
    fetchSpy.mockResolvedValueOnce(json({ text: "hello world", usage: { cost: 0.1 } }));
    const before = await balance(userId);
    const text = await transcribeAudio({ audio: Buffer.from("abc"), format: "webm", userId });
    expect(text).toBe("hello world");
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://openrouter.ai/api/v1/audio/transcriptions");
    expect(JSON.parse(String(init!.body))).toEqual({ model: MEDIA_MODELS.transcription, input_audio: { data: Buffer.from("abc").toString("base64"), format: "webm" } });
    expect(before - (await balance(userId))).toBe(5); // $0.10 x 50 credits/$
    const logged = await db.select().from(openrouterUsageTable).where(and(eq(openrouterUsageTable.userId, userId), eq(openrouterUsageTable.model, MEDIA_MODELS.transcription)));
    expect(logged.length).toBe(1);
  });

  it("synthesizes speech via /audio/speech as mp3", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    const audio = await synthesizeSpeech({ text: "hi", voice: "alloy", userId });
    expect([...audio]).toEqual([1, 2, 3]);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://openrouter.ai/api/v1/audio/speech");
    expect(JSON.parse(String(init!.body))).toMatchObject({ model: MEDIA_MODELS.speech, input: "hi", voice: "alloy", response_format: "mp3" });
  });

  it("bills speech by input length", async () => {
    fetchSpy.mockImplementation(async () => new Response(new Uint8Array([1]), { status: 200 }));
    let before = await balance(userId);
    await synthesizeSpeech({ text: "x".repeat(4000), voice: "alloy", userId });
    const long = before - (await balance(userId));
    before = await balance(userId);
    await synthesizeSpeech({ text: "ok", voice: "alloy", userId });
    const short = before - (await balance(userId));
    expect(long).toBe(3); // 4000 chars = $0.06 = 3 credits at 50/$
    expect(long).toBeGreaterThan(short);
  });

  it("generates images via /images and returns base64", async () => {
    fetchSpy.mockResolvedValueOnce(json({ data: [{ b64_json: "aGk=" }], usage: { cost: 0.04 } }));
    const image = await generateImage({ prompt: "a fox", aspectRatio: "16:9", userId });
    expect(image.b64).toBe("aGk=");
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://openrouter.ai/api/v1/images");
    expect(JSON.parse(String(init!.body))).toEqual({ model: MEDIA_MODELS.image, prompt: "a fox", n: 1, aspect_ratio: "16:9" });
  });

  it("blocks callers with no credits before calling the provider", async () => {
    await expect(transcribeAudio({ audio: Buffer.from("x"), format: "wav", userId: brokeId })).rejects.toBeInstanceOf(OutOfCreditsError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not bill a failed call and hides the provider error body", async () => {
    fetchSpy.mockResolvedValueOnce(new Response("secret upstream detail", { status: 500 }));
    const before = await balance(userId);
    await expect(synthesizeSpeech({ text: "x", voice: "alloy", userId })).rejects.toThrow("OpenRouter media request failed (500)");
    expect(await balance(userId)).toBe(before);
  });

  it("maps browser recording MIME types to input_audio formats", () => {
    expect(audioFormatFor("audio/webm;codecs=opus")).toBe("webm");
    expect(audioFormatFor("audio/mp4")).toBe("m4a");
    expect(audioFormatFor("audio/mpeg")).toBe("mp3");
    const octet = "application/octet-stream";
    expect(audioFormatFor(octet, Buffer.from("RIFF\0\0\0\0WAVEfmt "))).toBe("wav");
    expect(audioFormatFor(octet, Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01]))).toBe("webm");
    expect(audioFormatFor(octet, Buffer.from("\0\0\0\x20ftypM4A "))).toBe("m4a");
    expect(audioFormatFor(octet, Buffer.from("ID3\x04"))).toBe("mp3");
    expect(audioFormatFor(octet, Buffer.from([0xff, 0xf1, 0x50]))).toBe("aac");
    expect(audioFormatFor(octet, Buffer.from("????"))).toBe("m4a");
  });
});
