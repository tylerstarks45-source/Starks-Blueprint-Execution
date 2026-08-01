// ── Build 043: Unified Digital Operating Layer — REST Routes ──────────────
import { Router } from "express";
import { db } from "@workspace/db";
import {
  digitalWorkspaces,
  operatingRegistry,
  operatingSnapshots,
} from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuthActive, requireAdmin } from "../lib/auth";
import { initializeOperatingLayer } from "../lib/digital-operating-layer/dol-orchestrator";
import { discoverEnvironments, listEnvironmentProfiles } from "../lib/digital-operating-layer/dol-discovery-engine";
import { createSession, getActiveSessions } from "../lib/digital-operating-layer/dol-session-engine";
import { openChannel, listAllChannels } from "../lib/digital-operating-layer/dol-channel-engine";
import { listRecentReceipts } from "../lib/digital-operating-layer/dol-receipt-engine";
import { measureRuntimeDiagnostics } from "../lib/digital-operating-layer/dol-diagnostics-engine";
import type { ExecutionChannelType, OperatingDomain } from "../lib/digital-operating-layer/types";

export const digitalOperatingLayerRouter = Router();

// ── POST /operating/discover ───────────────────────────────────────────────
// Trigger environment discovery across all operating domains.
digitalOperatingLayerRouter.post("/discover", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const result = await discoverEnvironments();
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "discovery failed" });
  }
});

// ── POST /operating/session ────────────────────────────────────────────────
// Create a managed execution session.
digitalOperatingLayerRouter.post("/session", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const { sessionType, authorityRef, workspaceId, ttlMs } = req.body as {
      sessionType:  ExecutionChannelType;
      authorityRef: string;
      workspaceId?: number;
      ttlMs?:       number;
    };
    if (!sessionType || !authorityRef) {
      res.status(400).json({ error: "sessionType and authorityRef are required" });
      return;
    }
    const session = await createSession({ userId, sessionType, authorityRef, workspaceId, ttlMs });
    res.json({ success: true, session });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "session creation failed" });
  }
});

// ── POST /operating/channel ────────────────────────────────────────────────
// Open an execution channel for an active session.
digitalOperatingLayerRouter.post("/channel", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const { channelType, domain, sessionId } = req.body as {
      channelType: ExecutionChannelType;
      domain:      OperatingDomain;
      sessionId:   number;
    };
    if (!channelType || !domain || !sessionId) {
      res.status(400).json({ error: "channelType, domain, and sessionId are required" });
      return;
    }
    const channel = await openChannel({ channelType, domain, sessionId });
    res.json({ success: true, channel });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "channel open failed" });
  }
});

// ── POST /operating/diagnostics ────────────────────────────────────────────
// Measure and record runtime diagnostics for all channels.
digitalOperatingLayerRouter.post("/diagnostics", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const reports = await measureRuntimeDiagnostics();
    res.json({ success: true, reports, count: reports.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "diagnostics failed" });
  }
});

// ── GET /operating/workspaces ──────────────────────────────────────────────
digitalOperatingLayerRouter.get("/workspaces", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const rows = await db.select().from(digitalWorkspaces).orderBy(desc(digitalWorkspaces.createdAt)).limit(50);
    res.json({ success: true, workspaces: rows, count: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "fetch failed" });
  }
});

// ── GET /operating/environments ────────────────────────────────────────────
digitalOperatingLayerRouter.get("/environments", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const profiles = await listEnvironmentProfiles();
    res.json({ success: true, environments: profiles, count: profiles.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "fetch failed" });
  }
});

// ── GET /operating/channels ────────────────────────────────────────────────
digitalOperatingLayerRouter.get("/channels", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const channels = await listAllChannels(100);
    res.json({ success: true, channels, count: channels.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "fetch failed" });
  }
});

// ── GET /operating/receipts ────────────────────────────────────────────────
digitalOperatingLayerRouter.get("/receipts", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const limit   = parseInt(String(req.query["limit"] ?? "50"), 10);
    const receipts = await listRecentReceipts(isNaN(limit) ? 50 : limit);
    res.json({ success: true, receipts, count: receipts.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "fetch failed" });
  }
});

// ── GET /operating/registry ────────────────────────────────────────────────
digitalOperatingLayerRouter.get("/registry", async (req, res): Promise<void> => {
  const userId = await requireAuthActive(req, res);
  if (!userId) return;
  try {
    const registry = await db.select().from(operatingRegistry).orderBy(operatingRegistry.domain);
    res.json({ success: true, registry, count: registry.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "fetch failed" });
  }
});

// ── GET /operating/snapshots ───────────────────────────────────────────────
digitalOperatingLayerRouter.get("/snapshots", async (req, res): Promise<void> => {
  const caller = await requireAdmin(req, res);
  if (!caller) return;
  try {
    const snapshots = await db
      .select()
      .from(operatingSnapshots)
      .orderBy(desc(operatingSnapshots.createdAt))
      .limit(20);
    res.json({ success: true, snapshots, count: snapshots.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "fetch failed" });
  }
});
