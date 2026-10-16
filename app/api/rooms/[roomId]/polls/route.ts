import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaClient } from "@/lib/db";
import { loadRoomContext } from "@/lib/room-access";
import { canCreateActivity } from "@/lib/room-policy";

export const dynamic = "force-dynamic";

const CreatePollSchema = z.object({
  question: z.string().trim().min(3).max(140),
  options: z.array(z.string().trim().min(1).max(60)).min(2).max(6),
  closesInMinutes: z.number().int().min(1).max(24 * 60).optional(),
});

/** POST — create a poll (any participant allowed to interact, incl. the host). */
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
      return NextResponse.json({ message: "You cannot start a poll in this room." }, { status: 403 });
    }

    const data = CreatePollSchema.parse(await req.json());
    const unique = Array.from(new Set(data.options.map((o) => o.trim())));
    if (unique.length < 2) {
      return NextResponse.json({ message: "Provide at least two distinct options." }, { status: 400 });
    }

    const poll = await prismaClient.poll.create({
      data: {
        roomId: ctx.room.id,
        createdById: ctx.user!.id,
        question: data.question,
        closesAt: data.closesInMinutes
          ? new Date(Date.now() + data.closesInMinutes * 60 * 1000)
          : null,
        options: {
          create: unique.map((label, index) => ({ label, position: index })),
        },
      },
      include: { options: { orderBy: { position: "asc" } } },
    });

    return NextResponse.json({
      poll: {
        id: poll.id,
        question: poll.question,
        isClosed: poll.isClosed,
        closesAt: poll.closesAt,
        totalVotes: 0,
        myOptionId: null,
        options: poll.options.map((o) => ({ id: o.id, label: o.label, votes: 0 })),
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid poll. Use 2–6 short options." }, { status: 400 });
    }
    console.error("Poll create error:", e);
    return NextResponse.json({ message: "Error creating poll" }, { status: 500 });
  }
}
