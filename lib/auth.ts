export const SESSION_COOKIE = "sess";

/**
 * Deterministic session token derived from the app password + secret.
 * The same value is set as a cookie on login and recomputed in middleware
 * to verify. Uses Web Crypto so it runs in both the Edge runtime and Node.
 */
export async function sessionToken(): Promise<string> {
  const pw = process.env.APP_PASSWORD ?? "changeme";
  const secret = process.env.AUTH_SECRET ?? "dev-secret";
  const data = new TextEncoder().encode(`${pw}::${secret}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function checkPassword(input: string): Promise<boolean> {
  const pw = process.env.APP_PASSWORD ?? "changeme";
  // Constant-time-ish compare.
  if (input.length !== pw.length) return false;
  let diff = 0;
  for (let i = 0; i < input.length; i++) diff |= input.charCodeAt(i) ^ pw.charCodeAt(i);
  return diff === 0;
}
