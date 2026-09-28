import "server-only";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 2_000;

function clientKey(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-nf-client-connection-ip")?.trim() || "unknown";
}

/**
 * Limite de borda de melhor esforço. Ele reduz rajadas numa instância, enquanto
 * as escritas autenticadas usam o limite transacional persistido no Supabase.
 */
export function allowRequest(headers: Headers, action: string, max: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size > MAX_BUCKETS) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }

  const key = `${action}:${clientKey(headers)}`;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 } as const;
  }
  if (current.count >= max) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)) } as const;
  }

  current.count += 1;
  return { ok: true, retryAfter: 0 } as const;
}
