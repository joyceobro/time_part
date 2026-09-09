// Run the SQL schema against DATABASE_URL. Idempotent.
// Usage: node scripts/migrate.mjs   (or: npm run db:migrate)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { neon } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local / .env manually (no dependency).
for (const file of [".env.local", ".env"]) {
  try {
    const txt = readFileSync(join(__dirname, "..", file), "utf8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* file optional */
  }
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Put it in .env.local first.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const rawSchema = readFileSync(join(__dirname, "..", "db", "schema.sql"), "utf8");

// Drop full-line comments, then split on statement-terminating semicolons.
const schema = rawSchema
  .split("\n")
  .filter((line) => !/^\s*--/.test(line))
  .join("\n");

const statements = schema
  .split(/;\s*(?:\n|$)/)
  .map((s) => s.trim())
  .filter(Boolean);

console.log(`Applying ${statements.length} statements...`);
for (const stmt of statements) {
  try {
    await sql.query(stmt);
    console.log("  ok:", stmt.split("\n")[0].slice(0, 70));
  } catch (err) {
    console.error("  FAILED:", stmt.split("\n")[0]);
    console.error(err.message);
    process.exit(1);
  }
}
console.log("Migration complete.");
