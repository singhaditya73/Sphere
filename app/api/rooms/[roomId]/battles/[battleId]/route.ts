import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaClient } from "@/lib/db";
import { loadRoomContext } from "@/lib/room-access";

export const dynamic = "force-dynamic";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("vote"), entryId: z.string().min(1).max(128) }),
  z.object({ action: z.literal("close") }),
  z.object({ action: z.literal("play-winner") }),
]);

/** Pick the winner: most votes, ties broken by earliest entry position. */
export function pickWinner<T extends { id: string; position: number; votes: number }>(
  entries: T[]
): T | null {
  if (entries.length === 0) return null;
  return [...entries].sort((a, b) => (b.votes - a.votes) || (a.position - b.position))[0];
}

/**
 * POST /api/rooms/[roomId]/battles/[battleId]
 *
 *  - `vote`        — one vote per user (re-voting changes the choice)
 *  - `close`       — host only; freezes the battle and reveals the winner
 *  - `play-winner` — host only; promotes the winner to now-playing
 */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ roomId: string; battleId: string }> }
) {
  try {
    const params = await props.params;
    const access = await loadRoomContext(params.roomId, { requireUser: true });
    if (!access.ok) {
      return NextResponse.json({ message: access.message, code: access.code }, { status: access.status });
    }
    const { ctx } = access;

    const battle = await prismaClient.battle.findFirst({
      where: { id: params.battleId, roomId: ctx.room.id },
      include: {
        entries: { include: { _count: { select: { votes: true } } } },
      },
    });
    if (!battle) {
      return NextResponse.json({ message: "Battle not found" }, { status: 404 });
    }

    const data = ActionSchema.parse(await req.json());

    if (data.action === "vote") {
      if (!ctx.canInteract) {
        return NextResponse.json({ message: "You cannot vote in this room." }, { status: 403 });
      }
      if (battle.isClosed) {
        return NextResponse.json({ message: "This battle has ended." }, { status: 409 });
      }
      if (!battle.entries.some((e) => e.id === data.entryId)) {
        return NextResponse.json({ message: "Unknown battle entry." }, { status: 400 });
      }
      await prismaClient.battleVote.upsert({
        where: { battleId_userId: { battleId: battle.id, userId: ctx.user!.id } },
        create: { battleId: battle.id, entryId: data.entryId, userId: ctx.user!.id },
        update: { entryId: data.entryId },
      });
      return NextResponse.json({ message: "Vote recorded", entryId: data.entryId });
    }

    // close + play-winner are host actions.
    if (!ctx.isHost) {
      return NextResponse.json({ message: "Only the host can do that." }, { status: 403 });
    }

    const winner = pickWinner(
      battle.entries.map((e) => ({ id: e.id, position: e.position, votes: e._count.votes, streamId: e.streamId }))
    );

    if (data.action === "close") {
      await prismaClient.battle.update({ where: { id: battle.id }, data: { isClosed: true } });
      return NextResponse.json({ message: "Battle closed", winnerStreamId: winner?.streamId ?? null });
    }

    // play-winner
    if (!winner) {
      return NextResponse.json({ message: "No winner to play." }, { status: 400 });
    }
    await prismaClient.battle.update({ where: { id: battle.id }, data: { isClosed: true } });
    if (ctx.room.currentStreamId) {
      await prismaClient.stream.update({
        where: { id: ctx.room.currentStreamId },
        data: { played: true, active: false },
      });
    }
    await prismaClient.room.update({
      where: { id: ctx.room.id },
      data: {
        currentStreamId: winner.streamId,
        isPlaying: true,
        playbackPosition: 0,
        playbackStartedAt: new Date(),
      },
    });
    await prismaClient.stream.update({
      where: { id: winner.streamId },
      data: { active: true },
    });

    return NextResponse.json({ message: "Winner is now playing", winnerStreamId: winner.streamId });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid battle action." }, { status: 400 });
    }
    console.error("Battle action error:", e);
    return NextResponse.json({ message: "Error updating battle" }, { status: 500 });
  }
}
