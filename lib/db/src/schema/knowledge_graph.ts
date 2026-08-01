// ── Build 041: Unified Cognitive Knowledge Graph Engine — Schema ──────────
import { pgTable, serial, integer, text, real, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

// ── knowledge_graph_nodes ─────────────────────────────────────────────────
// Canonical node representing any cognitive object known to ASH.
// Nodes reference authoritative records via externalRefType + externalRefId.
export const knowledgeGraphNodes = pgTable("knowledge_graph_nodes", {
  id:             serial("id").primaryKey(),
  nodeType:       text("node_type").notNull(),             // KnowledgeGraphNodeType
  domain:         text("domain").notNull(),                // KnowledgeGraphDomain
  externalRefType:text("external_ref_type"),               // e.g. "business", "goal"
  externalRefId:  text("external_ref_id"),                 // id in authoritative table
  identityHash:   text("identity_hash").notNull(),         // deterministic SHA
  label:          text("label").notNull(),
  description:    text("description"),
  metadata:       jsonb("metadata").notNull().default({}),
  sourceEngine:   text("source_engine"),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
});

// ── knowledge_graph_edges ─────────────────────────────────────────────────
// Directed semantic edge between two graph nodes.
export const knowledgeGraphEdges = pgTable("knowledge_graph_edges", {
  id:               serial("id").primaryKey(),
  fromNodeId:       integer("from_node_id").notNull(),
  toNodeId:         integer("to_node_id").notNull(),
  relationshipType: text("relationship_type").notNull(),
  semanticLabel:    text("semantic_label").notNull(),
  weight:           real("weight").notNull().default(1.0),
  metadata:         jsonb("metadata").notNull().default({}),
  sourceEngine:     text("source_engine"),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
});

// ── graph_evidence ────────────────────────────────────────────────────────
// Evidence record linking a graph node or edge to supporting data.
export const graphEvidence = pgTable("graph_evidence", {
  id:              serial("id").primaryKey(),
  nodeId:          integer("node_id"),
  edgeId:          integer("edge_id"),
  sourceEngine:    text("source_engine").notNull(),
  evidenceType:    text("evidence_type").notNull(),
  confidenceValue: real("confidence_value").notNull().default(0.5),
  data:            jsonb("data").notNull().default({}),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
});

// ── graph_confidence ──────────────────────────────────────────────────────
// Confidence score attached to a graph node, updated as evidence accumulates.
export const graphConfidence = pgTable("graph_confidence", {
  id:              serial("id").primaryKey(),
  nodeId:          integer("node_id").notNull(),
  confidenceScore: real("confidence_score").notNull().default(0.5),
  confidenceBasis: text("confidence_basis").notNull(),
  evidenceCount:   integer("evidence_count").notNull().default(0),
  computedAt:      timestamp("computed_at").notNull().defaultNow(),
});

// ── graph_paths ───────────────────────────────────────────────────────────
// A named path through the graph — reasoning, decision, execution, etc.
export const graphPaths = pgTable("graph_paths", {
  id:           serial("id").primaryKey(),
  pathType:     text("path_type").notNull(),       // GraphPathType
  sourceNodeId: integer("source_node_id"),
  targetNodeId: integer("target_node_id"),
  nodeIds:      jsonb("node_ids").notNull().default([]),
  edgeIds:      jsonb("edge_ids").notNull().default([]),
  depth:        integer("depth").notNull().default(0),
  metadata:     jsonb("metadata").notNull().default({}),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

// ── graph_temporal_history ────────────────────────────────────────────────
// Append-only change log for graph nodes. Immutable once written.
export const graphTemporalHistory = pgTable("graph_temporal_history", {
  id:           serial("id").primaryKey(),
  nodeId:       integer("node_id").notNull(),
  changeType:   text("change_type").notNull(),   // created/merged/updated/linked
  beforeState:  jsonb("before_state"),
  afterState:   jsonb("after_state").notNull().default({}),
  changedAt:    timestamp("changed_at").notNull().defaultNow(),
});

// ── graph_registry ────────────────────────────────────────────────────────
// Mutable registry of domains contributing to the unified graph.
export const graphRegistry = pgTable("graph_registry", {
  id:          serial("id").primaryKey(),
  domain:      text("domain").notNull().unique(),
  engineId:    text("engine_id").notNull(),
  nodeCount:   integer("node_count").notNull().default(0),
  edgeCount:   integer("edge_count").notNull().default(0),
  lastSynced:  timestamp("last_synced"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

// ── graph_snapshots ───────────────────────────────────────────────────────
// Point-in-time snapshot of the full unified knowledge graph.
export const graphSnapshots = pgTable("graph_snapshots", {
  id:             serial("id").primaryKey(),
  userId:         integer("user_id"),
  nodeCount:      integer("node_count").notNull().default(0),
  edgeCount:      integer("edge_count").notNull().default(0),
  domainCount:    integer("domain_count").notNull().default(0),
  evidenceItems:  integer("evidence_items").notNull().default(0),
  confidenceAvg:  real("confidence_avg").notNull().default(0),
  lawApplied:     boolean("law_applied").notNull().default(true),
  snapshotData:   jsonb("snapshot_data").notNull().default({}),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
});

// ── graph_identity_map ────────────────────────────────────────────────────
// Maps canonical graph identity hashes to their node rows.
export const graphIdentityMap = pgTable("graph_identity_map", {
  id:           serial("id").primaryKey(),
  canonicalId:  text("canonical_id").notNull().unique(),
  sourceType:   text("source_type").notNull(),
  sourceId:     text("source_id").notNull(),
  identityHash: text("identity_hash").notNull().unique(),
  nodeId:       integer("node_id"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});
