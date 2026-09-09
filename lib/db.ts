import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let cached: NeonQueryFunction<false, false> | null = null;

function getSql(): NeonQueryFunction<false, false> {
  if (!cached) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set. Add it to .env.local (see .env.local.example) or your host's env vars.",
      );
    }
    cached = neon(url);
  }
  return cached;
}

/**
 * Lazy proxy around the Neon client so the connection string is only required
 * when a query actually runs — not at module load / build time.
 * Supports both tagged-template use (`sql\`select ...\``) and `sql.query(text)`.
 */
export const sql = new Proxy(function () {} as unknown as NeonQueryFunction<false, false>, {
  apply(_target, _thisArg, args: unknown[]) {
    return (getSql() as unknown as (...a: unknown[]) => unknown)(...args);
  },
  get(_target, prop: string) {
    const real = getSql() as unknown as Record<string, unknown>;
    const value = real[prop];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(real) : value;
  },
});
