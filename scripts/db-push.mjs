#!/usr/bin/env node
/**
 * Apply the Prisma schema to the database during a Vercel build.
 *
 * Supabase (and other PgBouncer-based setups) expose two connection ports:
 *
 *   6543  transaction pooler  — fast, correct for the app at runtime
 *   5432  session pooler      — supports DDL, required by `prisma db push`
 *
 * `prisma db push` issues DDL, which the transaction pooler cannot run (it
 * hangs). So when DATABASE_URL points at the transaction pooler we swap the
 * port to the session pooler for the push only — the app keeps using the
 * pooled URL at runtime. An explicit DIRECT_URL always wins.
 *
 * A hard timeout guarantees a stuck connection fails the build instead of
 * hanging the deploy forever.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("db-push: DATABASE_URL is not set.");
  process.exit(1);
}

let pushUrl = process.env.DIRECT_URL?.trim() || "";
let via = "DIRECT_URL";

if (!pushUrl) {
  // Only rewrite the port after the credentials (`@host:6543`) so a stray
  // ":6543" inside a password can never be touched.
  pushUrl = url.replace(/(@[^/]*):6543/, "$1:5432");
  via = pushUrl === url ? "DATABASE_URL" : "DATABASE_URL (pooler port 6543 -> 5432)";
}

console.log(`db-push: applying schema via ${via}…`);

// Prefer the locally installed CLI so we never trigger a network install.
const bin = process.platform === "win32" ? "node_modules/.bin/prisma.cmd" : "node_modules/.bin/prisma";
const command = existsSync(bin) ? bin : "npx";
const args = existsSync(bin)
  ? ["db", "push", "--skip-generate"]
  : ["--no-install", "prisma", "db", "push", "--skip-generate"];

const res = spawnSync(command, args, {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: pushUrl },
  timeout: 120_000,
});

if (res.error) {
  console.error(`db-push: failed to run prisma — ${res.error.message}`);
  process.exit(1);
}
if (res.signal) {
  console.error(`db-push: prisma db push was killed (${res.signal}) — the database was unreachable.`);
  process.exit(1);
}
if (res.status !== 0) {
  console.error(`db-push: prisma db push exited with code ${res.status}.`);
  process.exit(res.status ?? 1);
}

console.log("db-push: schema is in sync.");
