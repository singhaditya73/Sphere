import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaClient } from "@/lib/db";
import { loadRoomContext } from "@/lib/room-access";
import { isAllowedReaction } from "@/lib/reactions";
import { FixedWindowRateLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Reactions are cheap to send but easy to spam; cap them per user.
const reactionLimiter = new FixedWindowRateLimiter(20, 10 * 1000);

const ReactionSchema = z.object({
  emoji: z.string().min(1).max(8),
  streamId: z.string().min(1).max(128).optional(),
});

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ roomId: string }> }
) {
  try {
    const params = await props.params;
    const access = await loadRoomContext(params.roomId, { requireUser: true });
    if (!access.ok) {
      return NextResponse.json({ message: access.message, code: access.code }, { status: access.status });
    }
    const { ctx } = access;
    if (!ctx.canInteract) {
      return NextResponse.json({ message: "You cannot react in this room." }, { status: 403 });
    }

    const rate = reactionLimiter.check(ctx.user!.id);
    if (!rate.allowed) {
      return NextResponse.json(
        { message: "Too many reactions — slow down a little." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
      );
    }

    const data = ReactionSchema.parse(await req.json());
    if (!isAllowedReaction(data.emoji)) {
      return NextResponse.json({ message: "Unsupported reaction." }, { status: 400 });
    }

    // Only attach to a stream that actually belongs to this room.
    let streamId: string | null = null;
    if (data.streamId) {
      const stream = await prismaClient.stream.findFirst({
        where: { id: data.streamId, roomId: ctx.room.id },
        select: { id: true },
      });
      streamId = stream?.id ?? null;
    }

    const reaction = await prismaClient.reaction.create({
      data: { roomId: ctx.room.id, userId: ctx.user!.id, emoji: data.emoji, streamId },
    });

    return NextResponse.json({
      reaction: {
        id: reaction.id,
        emoji: reaction.emoji,
        streamId: reaction.streamId,
        username: ctx.user!.username || ctx.user!.email?.split("@")[0] || "Guest",
        createdAt: reaction.createdAt,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid reaction." }, { status: 400 });
    }
    console.error("Reaction error:", e);
    return NextResponse.json({ message: "Error sending reaction" }, { status: 500 });
  }
}
