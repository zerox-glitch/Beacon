#!/usr/bin/env node
/**
 * Materialize the Better-Auth schema for the globbed migrations directory.
 *
 * `migrations/auth/0001_auth.sql` is the tracked SOURCE; the copy in
 * `migrations/` is what the two appliers (scripts/migrate.mjs at deploy, the
 * PGLite import.meta.glob in src/lib/db.ts in preview) actually run. The copy
 * is deliberately NOT committed (see scripts/migration-plan.test.mjs), so the
 * build must create it before `vite build`/`db:migrate` read the directory.
 * Byte-identical by construction; idempotent; safe under concurrent runs.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "migrations", "auth", "0001_auth.sql");
const copy = join(root, "migrations", "0001_auth.sql");

if (!existsSync(source)) {
  console.log("[sync-auth] no migrations/auth/0001_auth.sql — nothing to materialize.");
  process.exit(0);
}
const same = existsSync(copy) && readFileSync(copy).equals(readFileSync(source));
if (!same) {
  mkdirSync(dirname(copy), { recursive: true });
  copyFileSync(source, copy); // copies byte-for-byte; writers here are atomic-enough for build-time
  console.log("[sync-auth] materialized migrations/0001_auth.sql from migrations/auth/.");
} else {
  console.log("[sync-auth] migrations/0001_auth.sql already in sync.");
}
