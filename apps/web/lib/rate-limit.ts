/**
 * Rate limiter. Two backends:
 *   - In-memory `Map` (single-process Node). Fine for local dev + small VPS.
 *   - Upstash Redis (`@upstash/ratelimit`) when UPSTASH_REDIS_REST_URL is set.
 *     The serverless-safe choice — survives lambda cold starts, shared across
 *     instances. Pulled in dynamically so the Node bundle doesn't take the
 *     hit when running with the Map backend.
 *
 * Switch is per-namespace so a one-line "limit this route" call stays small.
 */

type RateLimitOptions = {
  namespace: string;
  limit: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const memoryBuckets = new Map<string, Bucket>();

function clientKey(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = req.headers.get('x-real-ip')?.trim();
  return forwarded || realIp || 'anonymous';
}

function cleanup(now: number) {
  if (memoryBuckets.size < 1000) return;
  for (const [key, bucket] of memoryBuckets) {
    if (bucket.resetAt <= now) memoryBuckets.delete(key);
  }
}

const USE_UPSTASH =
  Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
  Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

// Lazy-import to keep the bundle thin when Upstash isn't configured.
type UpstashLimiter = {
  limit: (id: string) => Promise<{ success: boolean; reset: number; remaining: number; limit: number }>;
};
const upstashCache = new Map<string, UpstashLimiter>();
async function getUpstashLimiter(opts: RateLimitOptions): Promise<UpstashLimiter | null> {
  const cacheKey = `${opts.namespace}:${opts.limit}:${opts.windowMs}`;
  const cached = upstashCache.get(cacheKey);
  if (cached) return cached;
  try {
    const [{ Ratelimit }, { Redis }] = await Promise.all([
      import('@upstash/ratelimit'),
      import('@upstash/redis'),
    ]);
    const limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(opts.limit, `${Math.ceil(opts.windowMs / 1000)} s`),
      analytics: true,
      prefix: `bts:rl:${opts.namespace}`,
    }) as unknown as UpstashLimiter;
    upstashCache.set(cacheKey, limiter);
    return limiter;
  } catch {
    return null;
  }
}

export async function rateLimit(req: Request, options: RateLimitOptions): Promise<Response | null> {
  const key = clientKey(req);

  if (USE_UPSTASH) {
    const limiter = await getUpstashLimiter(options);
    if (limiter) {
      const r = await limiter.limit(key);
      if (r.success) return null;
      const retryAfter = Math.max(1, Math.ceil((r.reset - Date.now()) / 1000));
      return Response.json(
        { error: 'rate_limited', retry_after_seconds: retryAfter },
        { status: 429, headers: { 'Retry-After': String(retryAfter), 'Cache-Control': 'no-store' } },
      );
    }
    // Fallthrough to in-memory if Upstash import fails (e.g. wrong env vars).
  }

  // In-memory fallback.
  const now = Date.now();
  cleanup(now);

  const bucketKey = `${options.namespace}:${key}`;
  const current = memoryBuckets.get(bucketKey);
  const bucket = current && current.resetAt > now
    ? current
    : { count: 0, resetAt: now + options.windowMs };

  bucket.count += 1;
  memoryBuckets.set(bucketKey, bucket);

  if (bucket.count <= options.limit) return null;

  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  return Response.json(
    { error: 'rate_limited', retry_after_seconds: retryAfter },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'Cache-Control': 'no-store',
      },
    },
  );
}

/**
 * For server actions where we don't have a Request object — pass the
 * x-forwarded-for header value directly from `headers()` at call-site.
 */
export async function rateLimitByIp(
  ip: string,
  options: RateLimitOptions,
): Promise<{ ok: true } | { ok: false; retryAfterSeconds: number }> {
  const fakeReq = new Request('http://internal/', {
    headers: { 'x-forwarded-for': ip },
  });
  const r = await rateLimit(fakeReq, options);
  if (!r) return { ok: true };
  const body = await r.json();
  return { ok: false, retryAfterSeconds: body.retry_after_seconds ?? 60 };
}
