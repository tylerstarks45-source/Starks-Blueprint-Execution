import type { ResourceObservation, ResourceType, InfraHealthStatus, PressureLevel } from "./types";

// ── Thresholds ───────────────────────────────────────────────
const PRESSURE_THRESHOLDS = {
  none: 50,
  low: 65,
  medium: 80,
  high: 90,
  critical: 100,
} as const;

export function classifyPressure(utilizationPercent: number): PressureLevel {
  if (utilizationPercent < PRESSURE_THRESHOLDS.none) return "none";
  if (utilizationPercent < PRESSURE_THRESHOLDS.low) return "low";
  if (utilizationPercent < PRESSURE_THRESHOLDS.medium) return "medium";
  if (utilizationPercent < PRESSURE_THRESHOLDS.high) return "high";
  return "critical";
}

export function classifyHealth(utilizationPercent: number, errorRate: number): InfraHealthStatus {
  if (errorRate > 0.25) return "critical";
  if (errorRate > 0.10) return "degraded";
  if (utilizationPercent >= 90) return "critical";
  if (utilizationPercent >= 80) return "degraded";
  if (utilizationPercent >= 65) return "warning";
  return "healthy";
}

// Discovery produces a set of resource keys observable by the engine.
// Real values (CPU %, RAM %, disk %) are injected via EP_PII_RESOURCE_DISCOVERED.
// Heuristic defaults represent a healthy, low-utilization baseline.
export function discoverResources(): ResourceObservation[] {
  const now = new Date();

  const resources: Array<{ key: string; type: ResourceType; name: string; utilization: number; unit: string; total?: number; used?: number; available?: number }> = [
    { key: "cpu:primary",            type: "cpu",                 name: "Primary CPU",              utilization: 25,  unit: "%" },
    { key: "ram:system",             type: "ram",                 name: "System RAM",               utilization: 40,  unit: "GB",   total: 16,   used: 6.4,  available: 9.6  },
    { key: "gpu:primary",            type: "gpu",                 name: "GPU (if present)",         utilization: 0,   unit: "%" },
    { key: "gpu_memory:primary",     type: "gpu_memory",          name: "GPU Memory (if present)",  utilization: 0,   unit: "GB" },
    { key: "storage:disk0",          type: "storage",             name: "Primary Disk",             utilization: 30,  unit: "GB",   total: 100,  used: 30,   available: 70   },
    { key: "database:postgres",      type: "database",            name: "PostgreSQL",               utilization: 20,  unit: "connections" },
    { key: "vector_db:pgvector",     type: "vector_db",           name: "pgvector",                 utilization: 15,  unit: "%" },
    { key: "network:egress",         type: "network",             name: "Network Egress",           utilization: 10,  unit: "Mbps" },
    { key: "execution_queue:main",   type: "execution_queue",     name: "Execution Queue",          utilization: 5,   unit: "jobs" },
    { key: "adapter_pool:general",   type: "adapter_pool",        name: "Adapter Pool",             utilization: 12,  unit: "%" },
    { key: "model_provider:primary", type: "model_provider",      name: "Model Provider (OpenRouter)", utilization: 20, unit: "%" },
    { key: "api_quota:openrouter",   type: "api_quota",           name: "OpenRouter API Quota",     utilization: 25,  unit: "%" },
    { key: "cache:memory",           type: "cache",               name: "Memory Cache",             utilization: 35,  unit: "%" },
    { key: "browser_pool:chromium",  type: "browser_pool",        name: "Chromium Browser Pool",    utilization: 0,   unit: "instances" },
    { key: "worker_pool:runtime",    type: "worker_pool",         name: "Runtime Worker Pool",      utilization: 15,  unit: "workers" },
    { key: "execution_throughput:main", type: "execution_throughput", name: "Execution Throughput", utilization: 20, unit: "req/min" },
  ];

  return resources.map(r => ({
    resourceKey: r.key,
    resourceType: r.type,
    resourceName: r.name,
    health: classifyHealth(r.utilization, 0),
    utilizationPercent: r.utilization,
    totalCapacity: r.total,
    usedCapacity: r.used,
    availableCapacity: r.available,
    capacityUnit: r.unit,
    pressureLevel: classifyPressure(r.utilization),
    errorRate: 0,
    diagnostics: { observedAt: now.toISOString(), source: "heuristic" },
  }));
}
