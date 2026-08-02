// ── Simple in-memory per-key rate limiter ─────────────────────────────────
// M-03 fix: provides a lightweight sliding-window rate check for expensive
// endpoints (AI orchestration, certification runs). No external package needed.
//
// Keys are typically `${userId}:${route}` or `${ip}:${route}`.
// After a successful request the timestamp is pushed into a per-key window.
// On the next request, stale timestamps outside [now-windowMs] are pruned
// before checking whether the remaining count exceeds maxRequests.
//
// IMPORTANT: This is an in-process, single-instance guard. If the API server
// is horizontally scaled, add a Redis-backed limiter. For the current single-
// instance deployment this is sufficient and adds zero network latency.

const windows = new Map<string, number[]>();

/**
 * Returns true (allowed) or false (rate-limited).
 * @param key        Unique key per caller+route (e.g. `${userId}:certification/run`)
 * @param maxRequests Maximum allowed requests in the window
 * @param windowMs   Sliding window size in milliseconds
 */
export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  const prior = (windows.get(key) ?? []).filter((t) => t > cutoff);
  if (prior.length >= maxRequests) return false;
  prior.push(now);
  windows.set(key, prior);
  return true;
}

/** Express middleware factory — applies per-userId rate limiting to a route. */
export function perUserRateLimit(
  maxRequests: number,
  windowMs: number,
  routeKey: string,
): (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void {
  return (req, res, next) => {
    // userId comes from JWT (set by requireAuthActive) or falls back to IP
    const uid =
      ((req as unknown) as Record<string, unknown>)["userId"] ??
      ((req as unknown) as Record<string, unknown>)["callerId"] ??
      req.ip ??
      "anon";
    const key = `${uid}:${routeKey}`;
    if (!checkRateLimit(key, maxRequests, windowMs)) {
      res.status(429).json({ error: "Too many requests — please wait before trying again." });
      return;
    }
    next();
  };
}
