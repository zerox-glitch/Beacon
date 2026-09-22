-- Photo-mode compatibility + the admin-picked studio default.
-- image_compatible NULL = auto (derived from the template's image mode).
alter table qr_templates add column if not exists image_compatible boolean;
alter table qr_templates add column if not exists is_default boolean not null default false;
create index if not exists qr_templates_is_default_idx on qr_templates (id) where is_default;
