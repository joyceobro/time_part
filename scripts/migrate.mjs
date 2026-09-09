// Apply db/schema.sql against DATABASE_URL. Idempotent.
// Usage: node scripts/migrate.mjs            (schema only)
//        LEGACY_USER=me@example.com node scripts/migrate.mjs   (also claim
//        pre-multiuser rows for that user id)
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

function splitStatements(text) {
  return text
    .split("\n")
    .filter((line) => !/^\s*--/.test(line))
    .join("\n")
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const schema = readFileSync(join(__dirname, "..", "db", "schema.sql"), "utf8");
const statements = splitStatements(schema);

console.log(`Applying ${statements.length} schema statements...`);
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

const legacy = process.env.LEGACY_USER;
if (legacy) {
  console.log(`\nClaiming pre-multiuser rows for "${legacy}"...`);
  try {
    const hasOldSettings = await sql`
      select 1 from information_schema.tables
      where table_name = 'settings' limit 1
    `;
    if (hasOldSettings.length) {
      await sql`
        insert into user_settings (user_id, total_pieces)
        select ${legacy}, total_pieces from settings where id = 1
        on conflict (user_id) do nothing
      `;
      console.log("  user_settings backfilled from legacy settings row");
    }
    const c = await sql`update categories set user_id = ${legacy} where user_id is null`;
    const s = await sql`update slots set user_id = ${legacy} where user_id is null`;
    console.log(`  categories claimed: ${c.length ?? "ok"}, slots claimed: ${s.length ?? "ok"}`);
  } catch (err) {
    console.error("  backfill FAILED:", err.message);
    process.exit(1);
  }
}

console.log("\nMigration complete.");
