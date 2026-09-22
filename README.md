# QRWho

Turn any picture into a working QR code. Image treatments (Picture, Mosaic, Halftone, Backdrop), 150+ presets, live scan-check, PNG + SVG export. Runs 100% in the browser.

## Develop

```sh
npm install
npm run dev        # 0.0.0.0:8080
npm run typecheck
npm run build      # Vercel Build Output API → .vercel/output
```

## Host

Import the repo on Vercel. Root directory unset. No env vars. Production branch: `main`.

## Admin panel (CMS)

`/admin` — first visit opens a one-time setup: the owner picks the admin name,
sign-in email and password (strong-password policy enforced client + server).
From there the panel manages everything the public site renders:

- **Branding** — site name, tagline, logo, favicon, theme color, announcement bar, footer note.
- **Media** — image/logo/art uploads (PNG/JPEG/WebP/GIF, magic-byte validated, ≤ 4 MB), stored in the DB and served immutable from `/api/media/<id>`. In-use files refuse to delete.
- **Templates** — every QR preset: feature, hide from the public site, rename/recolor built-ins via overrides, or create fully custom templates (live QR preview). Hidden templates never reach visitors.
- **Content** — hero copy, CTAs, rotating words, privacy line; raw-JSON editing for power users.
- **SEO** — canonical base URL, index on/off, per-page title/description/keywords/OG overrides, custom `/robots.txt` and sitemap editor (both served dynamically).
- **Security** — change password (revokes other sessions), rename admin, revoke all sessions, reset the sign-in lockout, audit log, export/import of all CMS data.

Security notes: admin mutations are server functions guarded by a Better-Auth session + `cms_admin` membership, same-site/origin checks, per-IP throttle and per-account lockout; nothing is mocked and there is no public `/api/auth/*` surface. Set `ADMIN_SETUP_KEY` to require a shared secret during first-run setup (recommended before a public deploy). The Better-Auth schema (`migrations/auth/0001_auth.sql`) is materialized into `migrations/` when sign-in is enabled — never commit that copy (`.gitignore` enforces it); the CMS schema lives in `migrations/0002_cms.sql`.

