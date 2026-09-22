-- QRWho CMS + admin panel schema.
--
-- Everything the admin panel edits lives here, so the same SQL applies to Neon
-- (at build time, scripts/migrate.mjs) and to the embedded PGLite preview
-- (src/lib/db.ts). App tables use snake_case per the workspace conventions.

-- Key/value JSONB documents: 'brand', 'seo', 'content'.
create table if not exists cms_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- Binary media owned by the CMS (logos, og cards, template artwork). Stored in
-- the database so it survives across deploys exactly like the rows above —
-- never on the filesystem (Vercel serverless has no writable disk).
create table if not exists cms_media (
  id text primary key,
  kind text not null default 'image',
  filename text not null,
  content_type text not null,
  size_bytes integer not null,
  sha256 text not null,
  bytes bytea not null,
  alt text,
  created_at timestamptz not null default now(),
  created_by text
);
create index if not exists cms_media_kind_idx on cms_media (kind);
create index if not exists cms_media_created_idx on cms_media (created_at desc);

-- QR templates: either an OVERRIDE row for a built-in preset (id equals the
-- preset id in src/lib/qr/presets.ts) or a brand-new custom template
-- (id starts with 'cms-'). Visibility, featured flag, name, artwork and any
-- style properties all live here; hidden = true keeps the template out of the
-- public site entirely (the public API never sends hidden rows to the browser).
create table if not exists qr_templates (
  id text primary key,
  name text,
  category text,
  blurb text,
  art_url text,
  style jsonb,
  featured boolean,
  hidden boolean not null default false,
  sort integer not null default 0,
  is_custom boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text
);

-- The singleton admin claim. Its EXISTENCE is what closes first-run setup —
-- while this table is empty /admin offers the setup form, once a row exists
-- setup is permanently locked (per primary key 'primary'). Membership is the
-- only authorization signal the admin API trusts (never a client-sent flag).
create table if not exists cms_admin (
  id text primary key,
  user_id text not null unique references "user" ("id") on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

-- Per-account failed-login tracker for lockout. Survives process restarts on
-- Neon, so brute-force throttling is not wiped by a cold start.
create table if not exists admin_login_guard (
  key text primary key,
  fails integer not null default 0,
  first_fail_at timestamptz not null default now(),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

-- Append-only trail of every admin mutation (who / what / when / from where).
create table if not exists cms_audit_log (
  id bigserial primary key,
  ts timestamptz not null default now(),
  actor text,
  actor_name text,
  action text not null,
  target text,
  meta jsonb,
  ip text,
  user_agent text
);
create index if not exists cms_audit_log_ts_idx on cms_audit_log (ts desc);
