import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaClient } from "@/lib/db";
import { assertCanView, loadRoomContext } from "@/lib/room-access";
import { getAiProvider } from "@/lib/ai";
import { getMusicProvider } from "@/lib/music";
import { normalizeSearchCategory } from "@/lib/media";
import { FixedWindowRateLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// AI calls cost money/time; keep them rare per user.
const suggestLimiter = new FixedWindowRateLimiter(6, 60 * 1000);
const MAX_SUGGESTIONS = 9;

const SuggestSchema = z.object({
  roomId: z.string().min(1).max(128),
  prompt: z.string().trim().min(3).max(300),
  category: z.enum(["music", "video", "all"]).optional(),
});

/**
 * POST /api/ai/suggest
 *
 * The model proposes search *queries*; Sphere then resolves them against the
 * real music provider. Nothing is added automatically — the client shows the
 * suggestions and the user approves each one via the normal /api/streams path.
 */
export async function POST(req: NextRequest) {
  try {
    const parsed = SuggestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ message: "Describe what you want in a few words." }, { status: 400 });
    }
    const { roomId, prompt } = parsed.data;
    const category = normalizeSearchCategory(parsed.data.category ?? "music");

    const access = await loadRoomContext(roomId, { requireUser: true });
    if (!access.ok) {
      return NextResponse.json({ message: access.message, code: access.code }, { status: access.status });
    }
    const { ctx } = access;
    const viewError = await assertCanView(ctx);
    if (viewError) {
      return NextResponse.json({ message: viewError.message, code: viewError.code }, { status: viewError.status });
    }
    if (!ctx.canInteract) {
      return NextResponse.json({ message: "You cannot request suggestions in this room." }, { status: 403 });
    }

    const provider = getAiProvider();
    if (!provider) {
      return NextResponse.json(
        {
          message:
            "The AI companion is not configured. Set GROQ_API_KEY (or AI_API_KEY) to enable it.",
          code: "AI_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    const rate = suggestLimiter.check(ctx.user!.id);
    if (!rate.allowed) {
      return NextResponse.json(
        { message: "You're asking a lot — try again in a moment.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
      );
    }

    // Lightweight room context helps the model propose fitting suggestions.
    const queued = await prismaClient.stream.findMany({
      where: { roomId: ctx.room.id, played: false },
      select: { title: true, artist: true },
      take: 5,
    });
    const context = [
      `Room "${ctx.room.name}"`,
      queued.length ? `Already queued: ${queued.map((q) => q.title).join("; ")}` : "Queue is empty",
    ].join(". ");

    let plan;
    try {
      plan = await provider.suggest({ prompt, context });
    } catch (error) {
      console.error("AI provider failed:", error);
      return NextResponse.json(
        { message: "The AI companion is temporarily unavailable.", code: "AI_UNAVAILABLE" },
        { status: 502 }
      );
    }

    // Resolve each proposed query against the real provider and de-duplicate.
    const music = getMusicProvider();
    const seen = new Set<string>();
    const suggestions: Array<Record<string, unknown>> = [];
    for (const query of plan.queries) {
      if (suggestions.length >= MAX_SUGGESTIONS) break;
      try {
        const results = await music.searchTracks(query, { limit: 3, category });
        for (const track of results) {
          if (suggestions.length >= MAX_SUGGESTIONS) break;
          const key = `${track.provider}:${track.id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          suggestions.push({ ...track, matchedQuery: query });
        }
      } catch (error) {
        console.warn(`AI suggestion search failed for "${query}":`, error);
      }
    }

    return NextResponse.json({
      intro: plan.intro,
      queries: plan.queries,
      category,
      suggestions,
    });
  } catch (e) {
    console.error("AI suggest error:", e);
    return NextResponse.json({ message: "Error generating suggestions" }, { status: 500 });
  }
}
