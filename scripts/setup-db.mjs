import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";
if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL in .env first.");
const sql = neon(process.env.DATABASE_URL);
const schema = await readFile(
  new URL("../server/schema.sql", import.meta.url),
  "utf8",
);
await sql.transaction(
  schema
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => sql.query(s)),
);
console.log(
  "Database tables and indexes are ready. Sign into /admin to open appointment slots.",
);
