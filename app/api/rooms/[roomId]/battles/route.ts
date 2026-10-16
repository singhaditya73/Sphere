import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaClient } from "@/lib/db";
import { loadRoomContext } from "@/lib/room-access";
import { canCreateActivity } from "@/lib/room-policy";

export const dynamic = "force-dynamic";

const CreateBattleSchema = z.object({
  streamIds: z.array(z.string().min(1).max(128)).min(2).max(4),
});

/**
 * POST — start a song/video battle between 2–4 items already in the queue.
 * Battle votes are a separate table from upvotes, so they never affect ranking.
 */
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
    if (!canCreateActivity(ctx.isHost, ctx.canInteract)) {
      return NextResponse.json({ message: "You cannot start a battle in this room." }, { status: 403 });
    }

    const data = CreateBattleSchema.parse(await req.json());
    const uniqueIds = Array.from(new Set(data.streamIds));

    const streams = await prismaClient.stream.findMany({
      where: { id: { in: uniqueIds }, roomId: ctx.room.id, played: false },
      select: { id: true },
    });
    if (streams.length !== uniqueIds.length) {
      return NextResponse.json(
        { message: "Every battle entry must be an item in this room's queue." },
        { status: 400 }
      );
    }

    // Close any previous open battle so only one is active at a time.
    await prismaClient.battle.updateMany({
      where: { roomId: ctx.room.id, isClosed: false },
      data: { isClosed: true },
    });

    const battle = await prismaClient.battle.create({
      data: {
        roomId: ctx.room.id,
        createdById: ctx.user!.id,
        entries: {
          create: uniqueIds.map((streamId, index) => ({ streamId, position: index })),
        },
      },
      include: {
        entries: {
          orderBy: { position: "asc" },
          include: { stream: { select: { id: true, title: true, smallImg: true, bigImg: true, artist: true } } },
        },
      },
    });

    return NextResponse.json({
      battle: {
        id: battle.id,
        totalVotes: 0,
        myEntryId: null,
        entries: battle.entries.map((e) => ({
          id: e.id,
          streamId: e.streamId,
          title: e.stream.title,
          artist: e.stream.artist,
          thumbnail: e.stream.smallImg || e.stream.bigImg,
          votes: 0,
        })),
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ message: "Pick between 2 and 4 queue items." }, { status: 400 });
    }
    console.error("Battle create error:", e);
    return NextResponse.json({ message: "Error creating battle" }, { status: 500 });
  }
}
