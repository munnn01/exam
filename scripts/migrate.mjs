import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
if (!connectionString) {
  throw new Error("Thiếu POSTGRES_URL_NON_POOLING hoặc POSTGRES_URL.");
}

const migrationsDirectory = path.join(process.cwd(), "supabase", "migrations");
const files = (await fs.readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql")).sort();
const sql = postgres(connectionString, { max: 1, ssl: "require", prepare: false });

try {
  await sql.unsafe("create table if not exists public.examguard_schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  const applied = await sql`select name from public.examguard_schema_migrations`;
  const appliedNames = new Set(applied.map((row) => row.name));

  for (const file of files) {
    if (appliedNames.has(file)) continue;
    const migration = await fs.readFile(path.join(migrationsDirectory, file), "utf8");
    await sql.begin(async (transaction) => {
      await transaction.unsafe(migration);
      await transaction`insert into public.examguard_schema_migrations (name) values (${file})`;
    });
    process.stdout.write(`Applied ${file}\n`);
  }
} finally {
  await sql.end();
}
