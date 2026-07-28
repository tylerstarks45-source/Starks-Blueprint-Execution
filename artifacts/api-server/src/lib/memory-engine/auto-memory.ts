import { complete } from "../openrouter";
import { MODELS } from "../models";
import { logger } from "../logger";
import type { ExtractedMemoryItem, MemoryLayer } from "./types";
import { upsertLongTermMemory } from "./long-term-memory";
import { addProjectMemory } from "./project-memory";
import { getBusinessMemoryForSystemInstance, mergeBusinessMemory, resolveBusinessIdForSystemInstance } from "./business-memory";
import { addKnowledgeEntry } from "./knowledge-memory";
import type { AshProject } from "@workspace/db";

// ─── Auto Memory (Phase 1.2) ────────────────────────────────────────────────
// "ASH should automatically determine what information is important...
// ignore temporary conversation... do not require the frontend to manually
// save memory." One extraction call per turn classifies whether anything in
// this exchange is worth remembering long-term, and if so which layer it
// belongs to. Called fire-and-forget from routes/executive-brain.ts AFTER
// the user-facing stream has already finished, so it never adds latency —
// and on any failure it just logs, since skipping a memory write is always
// safe (unlike skipping the user's actual response).

const IGNORE_THRESHOLD = 30; // importance below this is treated as noise, not stored

export async function captureAutoMemory(params: {
  userId: number;
  project: AshProject;
  userMessage: string;
  assistantReply: string;
}): Promise<void> {
  const { userId, project, userMessage, assistantReply } = params;

  let items: ExtractedMemoryItem[];
  try {
    items = await extractMemoryItems(userMessage, assistantReply);
  } catch (err) {
    logger.warn({ err, userId }, "Memory Engine: auto-memory extraction failed, skipping");
    return;
  }

  for (const item of items) {
    if (item.importanceScore < IGNORE_THRESHOLD) continue;
    try {
      await routeMemoryItem({ userId, project, item });
    } catch (err) {
      logger.warn({ err, userId, layer: item.layer }, "Memory Engine: failed to persist an auto-memory item");
    }
  }
}

async function extractMemoryItems(userMessage: string, assistantReply: string): Promise<ExtractedMemoryItem[]> {
  const result = await complete({
    systemPrompt:
      "You extract durable, worth-remembering facts from one turn of a chat with a business-building AI assistant. " +
      "Ignore small talk, greetings, and anything purely transient (e.g. \"ok\", \"thanks\", one-off status questions). " +
      "Only extract things that should influence FUTURE conversations: user preferences, AI interaction preferences, " +
      "concrete business facts (products, customers, competitors, strategy), decisions made, or a generalizable lesson. " +
      'Reply with ONLY a JSON array (empty array if nothing qualifies), no markdown, no prose: ' +
      '[{"layer": "long_term"|"project"|"business"|"knowledge", "category": string, "title": string, "content": string, "tags": string[], "importanceScore": number, "confidenceScore": number}]. ' +
      "importanceScore and confidenceScore are 0-100. Keep it to at most 3 items.",
    prompt: `User: ${userMessage.slice(0, 1500)}\n\nAssistant: ${assistantReply.slice(0, 1500)}`,
    model: MODELS.utility,
  });

  const match = result.content.match(/\[[\s\S]*\]/);
  if (!match) return [];
  const parsed = JSON.parse(match[0]);
  if (!Array.isArray(parsed)) return [];

  const validLayers: MemoryLayer[] = ["long_term", "project", "business", "knowledge"];
  return parsed
    .filter((raw: any) => validLayers.includes(raw.layer) && typeof raw.content === "string" && raw.content.trim())
    .slice(0, 3)
    .map((raw: any): ExtractedMemoryItem => ({
      layer: raw.layer,
      category: typeof raw.category === "string" ? raw.category : "general",
      title: typeof raw.title === "string" && raw.title.trim() ? raw.title.trim().slice(0, 120) : raw.content.slice(0, 60),
      content: raw.content.trim().slice(0, 1000),
      tags: Array.isArray(raw.tags) ? raw.tags.map(String).slice(0, 8) : [],
      importanceScore: clamp(raw.importanceScore, 50),
      confidenceScore: clamp(raw.confidenceScore, 80),
    }));
}

function clamp(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, n));
}

async function routeMemoryItem(params: { userId: number; project: AshProject; item: ExtractedMemoryItem }): Promise<void> {
  const { userId, project, item } = params;

  if (item.layer === "long_term") {
    await upsertLongTermMemory({
      userId,
      systemInstanceId: project.systemInstanceId,
      category: item.category,
      title: item.title,
      content: item.content,
      tags: item.tags,
      importanceScore: item.importanceScore,
      confidenceScore: item.confidenceScore,
    });
    return;
  }

  if (item.layer === "project") {
    await addProjectMemory({
      projectId: project.id,
      type: "business_note",
      title: item.title,
      content: item.content,
      tags: item.tags,
      importanceScore: item.importanceScore,
      confidenceScore: item.confidenceScore,
    });
    return;
  }

  if (item.layer === "business") {
    const businessMemory = await getBusinessMemoryForSystemInstance(project.systemInstanceId);
    if (businessMemory) {
      // Route into the closest structured field by category; fall back to
      // businessModel so nothing is silently dropped.
      const field = item.category.toLowerCase();
      const patch: Parameters<typeof mergeBusinessMemory>[1] = {};
      if (field.includes("product")) patch.products = [item.content];
      else if (field.includes("service")) patch.services = [item.content];
      else if (field.includes("customer")) patch.customers = [item.content];
      else if (field.includes("competitor")) patch.competitors = [item.content];
      else if (field.includes("revenue")) patch.revenueGoals = item.content;
      else if (field.includes("market")) patch.marketingStrategy = item.content;
      else if (field.includes("seo")) patch.seoStrategy = item.content;
      else if (field.includes("automat")) patch.automationStrategy = item.content;
      else patch.businessModel = item.content;
      await mergeBusinessMemory(businessMemory.businessId, patch);
    } else {
      // No linked business yet — still worth keeping as project memory so it's not lost.
      await addProjectMemory({
        projectId: project.id,
        type: "business_note",
        title: item.title,
        content: item.content,
        tags: item.tags,
        importanceScore: item.importanceScore,
        confidenceScore: item.confidenceScore,
      });
    }
    return;
  }

  // knowledge — Business Context Isolation: a lesson captured while
  // operating within a business defaults to that business's scope, not
  // global, so it doesn't leak into the user's other businesses. Only
  // genuinely business-agnostic conversations (no linked business) produce
  // global knowledge.
  const knowledgeBusinessId = await resolveBusinessIdForSystemInstance(project.systemInstanceId);
  await addKnowledgeEntry({
    userId,
    sourceProjectId: project.id,
    category: (["successful_pattern", "failed_pattern", "tool_recommendation", "framework", "playbook"].includes(item.category)
      ? item.category
      : "playbook") as any,
    title: item.title,
    content: item.content,
    tags: item.tags,
    importanceScore: item.importanceScore,
    confidenceScore: item.confidenceScore,
    scope: knowledgeBusinessId != null ? "business" : "global",
    businessId: knowledgeBusinessId,
  });
}
