import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getMusicProvider, MAX_QUERY_LENGTH, MIN_QUERY_LENGTH, normalizeQuery } from "@/lib/music";
import { isMusicError } from "@/lib/music/errors";
import { FixedWindowRateLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Protect the provider (and the YouTube quota) from bursts per signed-in user.
const searchLimiter = new FixedWindowRateLimiter(30, 60 * 1000);

const SearchQuerySchema = z.object({
  q: z.string().min(MIN_QUERY_LENGTH).max(MAX_QUERY_LENGTH),
  limit: z.coerce.number().int().min(1).max(25).optional(),
});

function jsonError(message: string, code: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ message, code, results: [], ...extra }, { status });
}

/**
 * GET /api/search?q=blinding%20lights
 *
 * Native song discovery backed by the configured music provider. Only returns
 * the fields the UI needs; provider secrets never leave the server.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return jsonError("Unauthorized", "UNAUTHORIZED", 401);
  }

  const parsed = SearchQuerySchema.safeParse({
    q: req.nextUrl.searchParams.get("q") ?? "",
    limit: req.nextUrl.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return jsonError(
      `Search query must be between ${MIN_QUERY_LENGTH} and ${MAX_QUERY_LENGTH} characters.`,
      "INVALID_QUERY",
      400
    );
  }

  const query = normalizeQuery(parsed.data.q);

  const rate = searchLimiter.check(session.user.email);
  if (!rate.allowed) {
    return NextResponse.json(
      { message: "Too many searches. Please slow down and try again shortly.", code: "RATE_LIMITED", results: [] },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  try {
    const provider = getMusicProvider();
    const results = await provider.searchTracks(query, { limit: parsed.data.limit });
    return NextResponse.json({ provider: provider.id, query, results });
  } catch (error) {
    if (isMusicError(error)) {
      const status = error.status >= 400 && error.status < 600 ? error.status : 502;
      return jsonError(error.message, error.code, status, { retryable: error.retryable });
    }
    console.error("Music search failed:", error);
    return jsonError("Song search is temporarily unavailable.", "PROVIDER_UNAVAILABLE", 502, {
      retryable: true,
    });
  }
}
