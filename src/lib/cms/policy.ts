/**
 * Admin password policy — pure, dependency-free, unit-tested (src/lib/cms/cms.test.ts).
 *
 * Enforced SERVER-SIDE (setup + password change) and mirrored in the admin UI
 * only for instant feedback. The server is authoritative: a client bypass
 * cannot weaken this.
 */

export interface PasswordAssessment {
  ok: boolean;
  /** 0..4 for the strength meter. */
  score: number;
  /** Estimated bits of entropy (charset^length), clamped to sane bounds. */
  bits: number;
  /** Human-readable reasons the password is not acceptable (empty when ok). */
  issues: string[];
}

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 200;
/** A passphrase this long passes even without mixed classes. */
export const PASSPHRASE_LENGTH = 24;
/** Minimum estimated entropy in bits. */
export const MIN_BITS = 60;

const COMMON_PASSWORDS: ReadonlySet<string> = new Set([
  "password",
  "password1",
  "password123",
  "passw0rd",
  "qwerty",
  "qwerty123",
  "qwertyuiop",
  "abc123456",
  "iloveyou",
  "letmein",
  "welcome",
  "welcome1",
  "admin",
  "admin123",
  "administrator",
  "login",
  "passw0rd!",
  "monkey",
  "dragon",
  "sunshine",
  "princess",
  "football",
  "baseball",
  "trustno1",
  "whatever",
  "shadow",
  "michael",
  "jennifer",
  "superman",
  "batman",
  "12345678",
  "123456789",
  "1234567890",
  "11111111",
  "00000000",
  "changeme",
  "letmein123",
  "qrwho",
  "qrwho123",
  "password1234",
  "passpass",
  "1q2w3e4r5t",
  "1qaz2wsx",
  "zaq12wsx",
  "google",
  "facebook",
  "hello123",
  "secret123",
  "solo",
  "qwerty12345",
  "1234qwer",
]);

function charsetSize(pw: string): number {
  let size = 0;
  if (/[a-z]/.test(pw)) size += 26;
  if (/[A-Z]/.test(pw)) size += 26;
  if (/[0-9]/.test(pw)) size += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) size += 33;
  return Math.max(size, 1);
}

function hasLongRun(pw: string, run = 5): boolean {
  for (let i = 0; i + run <= pw.length; i += 1) {
    const c = pw[i];
    if (c && pw.slice(i, i + run) === c.repeat(run)) return true;
  }
  return false;
}

function isSequential(pw: string): boolean {
  const lower = pw.toLowerCase();
  const seqs = ["abcdefghijklmnopqrstuvwxyz", "0123456789", "qwertyuiop", "asdfghjkl", "zxcvbnm"];
  for (const seq of seqs) {
    for (let i = 0; i + 5 <= seq.length; i += 1) {
      const win = seq.slice(i, i + 5);
      if (lower.includes(win) || lower.includes([...win].reverse().join(""))) return true;
    }
  }
  return false;
}

/**
 * Score a candidate admin password. `personal` are strings the password must
 * not contain (admin name / email local part), lowercased.
 */
export function assessPassword(
  candidate: string,
  personal: readonly string[] = [],
): PasswordAssessment {
  const issues: string[] = [];
  const pw = candidate ?? "";
  if (pw.length < MIN_PASSWORD_LENGTH) {
    issues.push(`Use at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  if (pw.length > MAX_PASSWORD_LENGTH) {
    issues.push(`Use at most ${MAX_PASSWORD_LENGTH} characters`);
  }
  const bits = Math.min(256, Math.round(pw.length * Math.log2(charsetSize(pw))));
  const lower = pw.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) issues.push("That password is too common — pick another");
  if (hasLongRun(pw)) issues.push("Avoid 5+ repeated characters in a row");
  if (isSequential(pw)) issues.push("Avoid keyboard rows or alphabetical/numeric runs");
  for (const termRaw of personal) {
    const term = (termRaw ?? "").trim().toLowerCase();
    if (term.length >= 3 && lower.includes(term)) {
      issues.push("Do not include your name or email in the password");
      break;
    }
  }
  const passphrase = pw.length >= PASSPHRASE_LENGTH && !COMMON_PASSWORDS.has(lower);
  const ok = issues.length === 0 && (passphrase || bits >= MIN_BITS);
  if (!ok && issues.length === 0) {
    issues.push(`Too weak — needs ~${MIN_BITS} bits of entropy (mix upper, lower, digits, symbols) or a ${PASSPHRASE_LENGTH}+ character passphrase`);
  }
  let score = 0;
  if (pw.length >= 8) score = 1;
  if (pw.length >= MIN_PASSWORD_LENGTH && bits >= 45) score = 2;
  if (pw.length >= MIN_PASSWORD_LENGTH && bits >= MIN_BITS) score = 3;
  if (ok && (bits >= 90 || pw.length >= PASSPHRASE_LENGTH + 4)) score = 4;
  return { ok, score, bits, issues };
}

/** Throw a stable Error message the admin UI can show verbatim. */
export function assertStrongPassword(
  candidate: string,
  personal: readonly string[] = [],
): void {
  const a = assessPassword(candidate, personal);
  if (!a.ok) throw new Error(a.issues[0] ?? "Password rejected");
}

/* ------------------------------------------------------------------ */
/* Login-attempt throttling (pure plan — the guard table stores state) */
/* ------------------------------------------------------------------ */

export const LOCKOUT = {
  /** Failed attempts inside WINDOW_MS before the account locks. */
  maxFails: 5,
  windowMs: 10 * 60 * 1000,
  lockMs: 15 * 60 * 1000,
} as const;

export interface GuardRow {
  fails: number;
  firstFailAt: number; // epoch ms
  lockedUntil: number | null; // epoch ms
}

export type GuardDecision =
  | { verdict: "allow" }
  | { verdict: "lockout"; retryAfterSec: number };

/** Is the account currently locked? Pure — evaluated on every sign-in. */
export function guardCheck(row: GuardRow | null, now: number): GuardDecision {
  if (row?.lockedUntil && row.lockedUntil > now) {
    return { verdict: "lockout", retryAfterSec: Math.ceil((row.lockedUntil - now) / 1000) };
  }
  return { verdict: "allow" };
}

/** State transition after a failed attempt. */
export function guardOnFail(row: GuardRow | null, now: number): GuardRow {
  const insideWindow = row !== null && now - row.firstFailAt <= LOCKOUT.windowMs;
  const fails = (insideWindow ? row!.fails : 0) + 1;
  const firstFailAt = insideWindow ? row!.firstFailAt : now;
  const lockedUntil = fails >= LOCKOUT.maxFails ? now + LOCKOUT.lockMs : null;
  return { fails, firstFailAt, lockedUntil };
}

/** Successful sign-in resets the tracker. */
export function guardOnSuccess(): null {
  return null;
}
