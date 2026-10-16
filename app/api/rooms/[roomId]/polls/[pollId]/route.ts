import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaClient } from "@/lib/db";
import { loadRoomContext } from "@/lib/room-access";

export const dynamic = "force-dynamic";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("vote"), optionId: z.string().min(1).max(128) }),
  z.object({ action: z.literal("close") }),
]);

/**
 * POST /api/rooms/[roomId]/polls/[pollId]
 *
 *  - `vote`  — one vote per user (re-voting changes the choice, never adds a second)
 *  - `close` — host only; freezes the poll
 */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ roomId: string; pollId: string }> }
) {
  try {
    const params = await props.params;
    const access = await loadRoomContext(params.roomId, { requireUser: true });
    if (!access.ok) {
      return NextResponse.json({ message: access.message, code: access.code }, { status: access.status });
    }
    const { ctx } = access;

    const poll = await prismaClient.poll.findFirst({
      where: { id: params.pollId, roomId: ctx.room.id },
      include: { options: { select: { id: true } } },
    });
    if (!poll) {
      return NextResponse.json({ message: "Poll not found" }, { status: 404 });
    }

    const data = ActionSchema.parse(await req.json());

    if (data.action === "close") {
      if (!ctx.isHost) {
        return NextResponse.json({ message: "Only the host can close a poll." }, { status: 403 });
      }
      await prismaClient.poll.update({ where: { id: poll.id }, data: { isClosed: true } });
      return NextResponse.json({ message: "Poll closed" });
    }

    // vote
    if (!ctx.canInteract) {
      return NextResponse.json({ message: "You cannot vote in this room." }, { status: 403 });
    }
    if (poll.isClosed || (poll.closesAt && poll.closesAt.getTime() <= Date.now())) {
      return NextResponse.json({ message: "This poll has ended." }, { status: 409 });
    }
    if (!poll.options.some((o) => o.id === data.optionId)) {
      return NextResponse.json({ message: "Unknown poll option." }, { status: 400 });
    }

    await prismaClient.pollVote.upsert({
      where: { pollId_userId: { pollId: poll.id, userId: ctx.user!.id } },
      create: { pollId: poll.id, optionId: data.optionId, userId: ctx.user!.id },
      update: { optionId: data.optionId },
    });

    return NextResponse.json({ message: "Vote recorded", optionId: data.optionId });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid poll action." }, { status: 400 });
    }
    console.error("Poll action error:", e);
    return NextResponse.json({ message: "Error updating poll" }, { status: 500 });
  }
}
