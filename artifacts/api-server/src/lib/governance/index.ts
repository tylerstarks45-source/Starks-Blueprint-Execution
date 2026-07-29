// ─── Data Access Layer barrel (Business Intelligence Phase A) ─────────────
// The only sanctioned way for Business Intelligence engines/routes to write
// to a governed table. Each write wrapper stamps ownership metadata and
// writes a paired audit_trail_entries row inside the same transaction as the
// mutation itself. Phase B subsystems are expected to add their own
// `writes/*-writes.ts` files here rather than reinvent this layer.

export * from "./types";
export * from "./ownership";
export * from "./audit";
export * from "./writes/dna-writes";
export * from "./writes/events-writes";
export * from "./writes/memory-writes";
export * from "./writes/knowledge-writes";
export * from "./writes/recommendations-writes";
export * from "./writes/health-writes";
