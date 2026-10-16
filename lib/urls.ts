import type { NextRequest } from "next/server";

/**
 * Resolve the application's canonical base URL for building shareable links.
 *
 * Prefers the configured `NEXTAUTH_URL` (the real public origin in production),
 * then Vercel's injected URL, then the request origin as a last resort. This
 * keeps invitation links correct even behind a proxy.
 */
export function canonicalBaseUrl(req?: NextRequest): string {
  const configured = process.env.NEXTAUTH_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;

  if (req) return req.nextUrl.origin;
  return "http://localhost:3000";
}
