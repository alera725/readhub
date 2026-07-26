// Rate limiter en memoria (ventana fija por clave). Protege endpoints costosos
// (p. ej. /api/chat, que gasta cuota de OpenAI/HF) de abuso por un mismo usuario.
//
// LIMITACIÓN CONOCIDA: el estado vive en la memoria del proceso. En un deploy
// serverless multi-instancia el límite es "blando" (cada instancia cuenta por
// separado). Para un límite estricto en producción, migrar a un store
// compartido (p. ej. Upstash Ratelimit) manteniendo esta misma firma.

interface Bucket {
  count: number;
  resetAt: number; // epoch ms en que se reinicia la ventana
}

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();

  // Barrido ocasional de claves expiradas para acotar el uso de memoria.
  if (now - lastSweep > windowMs) {
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
    lastSweep = now;
  }

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count++;
  const remaining = Math.max(0, limit - bucket.count);

  return {
    success: bucket.count <= limit,
    limit,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}
