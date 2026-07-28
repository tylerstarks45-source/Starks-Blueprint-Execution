import { listConnectors } from "../connectors/registry";
import { UNSUPPORTED_PLATFORMS } from "./unsupported-platforms";
import type { PlatformDefinition } from "./types";

export type { PlatformDefinition };

// ─── Platform Registry ──────────────────────────────────────────────────────
// Centralizes "which platforms does ASH know about, and can it act on them"
// so no engine hardcodes its own platform list. Two sources feed it:
//   - Supported platforms are derived LIVE from the connector registry (the
//     same source of truth Connections Hub and credential-rule already use)
//     — a new connector automatically becomes a known supported platform.
//   - Unsupported platforms come from unsupported-platforms.ts, a pure
//     config file — add a platform there and every rule/engine that reads
//     the registry picks it up with zero code changes.
// Reusable by all future engines: import findPlatformMentions/
// isPlatformSupported from here instead of writing a new keyword list.

function connectorAliases(id: string, displayName: string): string[] {
  const set = new Set<string>([id.toLowerCase(), displayName.toLowerCase(), id.replace(/_/g, " ")]);
  return [...set].filter((t) => t.length > 2);
}

export function getSupportedPlatforms(): PlatformDefinition[] {
  return listConnectors().map((c) => ({
    id: c.id,
    displayName: c.displayName,
    aliases: connectorAliases(c.id, c.displayName),
    supported: true,
    connectorId: c.id,
  }));
}

export function getUnsupportedPlatforms(): PlatformDefinition[] {
  return UNSUPPORTED_PLATFORMS;
}

/** The full known-platform universe: supported (live from connectors) + unsupported (config). */
export function getPlatformRegistry(): PlatformDefinition[] {
  return [...getSupportedPlatforms(), ...getUnsupportedPlatforms()];
}

export function isPlatformSupported(id: string): boolean {
  return getSupportedPlatforms().some((p) => p.id === id);
}

export function isKnownUnsupportedPlatform(id: string): boolean {
  return UNSUPPORTED_PLATFORMS.some((p) => p.id === id);
}

/** Finds every known platform (supported or not) mentioned by alias in free text. */
export function findPlatformMentions(text: string): PlatformDefinition[] {
  const lower = text.toLowerCase();
  return getPlatformRegistry().filter((p) => p.aliases.some((alias) => lower.includes(alias)));
}
