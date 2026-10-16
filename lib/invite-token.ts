/**
 * Invitation-token helpers.
 *
 * Tokens are opaque, URL-safe and never derived from the room id, so a leaked
 * token cannot be used to enumerate rooms. Validity (expiry / revocation /
 * use-count) is decided here so the API and tests agree.
 */

import { randomBytes } from "node:crypto";

const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
const TOKEN_LENGTH = 24;

/** Generate a cryptographically-random, URL-safe invitation token. */
export function generateInviteToken(): string {
  const bytes = randomBytes(TOKEN_LENGTH);
  let out = "";
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    out += TOKEN_ALPHABET[bytes[i] % TOKEN_ALPHABET.length];
  }
  return out;
}

export function isValidInviteTokenFormat(token: unknown): token is string {
  return typeof token === "string" && /^[A-Z0-9]{16,64}$/.test(token);
}

/** Build the shareable invitation URL for a token. */
export function buildInviteUrl(baseUrl: string, token: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  return `${base}/join/${token}`;
}

export interface InviteLike {
  expiresAt: Date | null;
  revokedAt: Date | null;
  uses: number;
  maxUses: number | null;
}

export type InviteUnusableReason = "revoked" | "expired" | "exhausted";

export interface InviteUsability {
  usable: boolean;
  reason?: InviteUnusableReason;
}

/** Decide whether an invitation can still be redeemed. */
export function checkInviteUsable(invite: InviteLike, now: Date = new Date()): InviteUsability {
  if (invite.revokedAt) return { usable: false, reason: "revoked" };
  if (invite.expiresAt && invite.expiresAt.getTime() <= now.getTime()) {
    return { usable: false, reason: "expired" };
  }
  if (invite.maxUses != null && invite.uses >= invite.maxUses) {
    return { usable: false, reason: "exhausted" };
  }
  return { usable: true };
}

/** Default lifetime for a freshly minted invitation (7 days). */
export const DEFAULT_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function defaultInviteExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + DEFAULT_INVITE_TTL_MS);
}
