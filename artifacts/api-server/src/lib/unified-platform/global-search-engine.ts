// ── Build 046: Global Search Engine ──────────────────────────────────────────
// Indexes every registered application — provides unified discovery.
import { db }                from "@workspace/db";
import {
  platformApplications,
  platformCommands,
  platformProjects,
  platformWorkspaces,
} from "@workspace/db/schema";
import { eq, and }           from "drizzle-orm";

// ── Search result types ───────────────────────────────────────────────────────

export type SearchResultKind = "application" | "command" | "project" | "workspace";

export interface SearchResult {
  kind:        SearchResultKind;
  id:          string | number;
  title:       string;
  description: string;
  appId?:      string;
  score:       number;   // 0.0–1.0 relevance score
}

// ── Search across all registered objects ─────────────────────────────────────

export async function globalSearch(params: {
  query:  string;
  userId: number;
  kinds?: SearchResultKind[];
  limit?: number;
}): Promise<SearchResult[]> {
  const { query, userId, limit = 20 } = params;
  const kinds = params.kinds ?? ["application", "command", "project", "workspace"];
  const q     = query.toLowerCase();
  const results: SearchResult[] = [];

  // Applications
  if (kinds.includes("application")) {
    const apps = await db
      .select()
      .from(platformApplications)
      .where(eq(platformApplications.status, "active"));
    for (const app of apps) {
      const score = scoreText(q, [app.appName, app.description, app.appDomain]);
      if (score > 0) {
        results.push({
          kind:        "application",
          id:          app.appId,
          title:       app.appName,
          description: app.description,
          appId:       app.appId,
          score,
        });
      }
    }
  }

  // Commands
  if (kinds.includes("command")) {
    const cmds = await db
      .select()
      .from(platformCommands)
      .where(eq(platformCommands.active, true));
    for (const cmd of cmds) {
      const score = scoreText(q, [cmd.commandName, cmd.description, cmd.appId]);
      if (score > 0) {
        results.push({
          kind:        "command",
          id:          cmd.commandId,
          title:       cmd.commandName,
          description: cmd.description,
          appId:       cmd.appId,
          score,
        });
      }
    }
  }

  // Projects
  if (kinds.includes("project")) {
    const projects = await db
      .select()
      .from(platformProjects)
      .where(and(eq(platformProjects.userId, userId), eq(platformProjects.status, "active")));
    for (const proj of projects) {
      const score = scoreText(q, [proj.projectName, proj.projectType, proj.appId ?? ""]);
      if (score > 0) {
        results.push({
          kind:        "project",
          id:          proj.id,
          title:       proj.projectName,
          description: `${proj.projectType} project`,
          appId:       proj.appId ?? undefined,
          score,
        });
      }
    }
  }

  // Workspaces
  if (kinds.includes("workspace")) {
    const workspaces = await db
      .select()
      .from(platformWorkspaces)
      .where(and(eq(platformWorkspaces.userId, userId), eq(platformWorkspaces.status, "active")));
    for (const ws of workspaces) {
      const score = scoreText(q, [ws.workspaceName, ws.workspaceType]);
      if (score > 0) {
        results.push({
          kind:        "workspace",
          id:          ws.id,
          title:       ws.workspaceName,
          description: `${ws.workspaceType} workspace`,
          score,
        });
      }
    }
  }

  // Sort by score descending, cap at limit
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

// ── Scoring helper ────────────────────────────────────────────────────────────
// Simple keyword match scoring — exact phrase > any token match > partial.

function scoreText(query: string, fields: string[]): number {
  const text = fields.filter(Boolean).join(" ").toLowerCase();
  if (!text) return 0;
  if (text.includes(query)) return 1.0;                // exact phrase
  const tokens = query.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;
  const matched = tokens.filter((t) => text.includes(t)).length;
  if (matched === 0) return 0;
  return (matched / tokens.length) * 0.7;              // partial match
}
