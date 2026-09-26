/**
 * Local email/password sign-in (this app's Better Auth DB — not the broker).
 *
 * ENABLED for the CMS admin panel (src/lib/cms). There is NO public sign-up:
 * this app never mounts a public `/api/auth/sign-up` caller — the admin panel
 * creates its single account through the first-run setup server function
 * (`adminSetup`), which is atomic-locked once `cms_admin` has a row and can be
 * further gated by an `ADMIN_SETUP_KEY` env var. Sign-in (`adminSignIn`) is
 * rate-limited and requires the account to be the claimed admin.
 *
 * Do NOT edit `server.ts` for this — that file is frozen pre-wired config.
 */
export const emailAndPasswordEnabled = true;
