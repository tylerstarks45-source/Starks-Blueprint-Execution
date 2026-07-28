// ─── Platform Registry — shared types ───────────────────────────────────────
// A PlatformDefinition describes one external platform ASH might be asked to
// act on, whether or not it currently can. This is the single vocabulary
// every engine (Validation Engine today, others later) uses to answer
// "does ASH support X" — no engine should keep its own platform list.
export interface PlatformDefinition {
  /** Canonical slug, e.g. "etsy" or "twitter". Matches the connector id for supported platforms. */
  id: string;
  /** Human-readable name, e.g. "Etsy". */
  displayName: string;
  /** Lowercase strings matched against free text (task descriptions, user messages) to detect a mention. */
  aliases: string[];
  /** Whether ASH can currently act on this platform (has a working connector). */
  supported: boolean;
  /** Connector id that implements this platform, when supported. */
  connectorId?: string;
  /** Coarse grouping (ecommerce/social/email/crm/etc.) for future engines that filter by domain. */
  category?: string;
  /** Free-form context, e.g. why it's unsupported or a roadmap note. */
  notes?: string;
}
