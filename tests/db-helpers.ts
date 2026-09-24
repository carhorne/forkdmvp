import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";

export const A = "00000000-0000-4000-8000-000000000001";
export const B = "00000000-0000-4000-8000-000000000002";

// Fresh PostgreSQL with Supabase-like roles/auth, then every migration in order.
export async function migratedDb(extraUsers: string[] = []) {
  const fresh = new PGlite();
  await fresh.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated;`);
  for (const id of [A, B, ...extraUsers]) await fresh.query("insert into auth.users(id) values ($1)", [id]);
  for (const f of (await readdir("supabase/migrations")).filter((f) => f.endsWith(".sql")).sort()) await fresh.exec(await readFile(`supabase/migrations/${f}`, "utf8"));
  return fresh;
}
