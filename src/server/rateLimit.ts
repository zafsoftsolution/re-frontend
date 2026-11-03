// Simple in-memory sliding-window rate limiter. Process-local only —
// suitable for mock backend purposes.

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
) {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= limit) {
    buckets.set(key, bucket);
    return { ok: false as const, retryAfterMs: windowMs - (now - bucket.timestamps[0]) };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return { ok: true as const, remaining: limit - bucket.timestamps.length };
}

export function clientKey(req: Request, prefix: string) {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() ?? "local";
  return `${prefix}:${ip}`;
}
