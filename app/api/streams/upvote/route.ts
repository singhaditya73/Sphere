import { prismaClient } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertCanVote, getSessionUser } from "@/lib/room-access";

export const dynamic = "force-dynamic";

const upvoteSchema = z.object({
  streamId: z.string().min(1).max(128),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  try {
    const data = upvoteSchema.parse(await req.json());

    const allowed = await assertCanVote(data.streamId, user);
    if (!allowed.ok) {
      return NextResponse.json({ message: allowed.message, code: allowed.code }, { status: allowed.status });
    }

    // Upsert avoids duplicate-constraint errors when the user double-taps.
    await prismaClient.upvote.upsert({
      where: { userId_streamId: { userId: user.id, streamId: data.streamId } },
      create: { userId: user.id, streamId: data.streamId },
      update: {},
    });

    return NextResponse.json({ message: "Upvoted successfully" }, { status: 200 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid stream id." }, { status: 400 });
    }
    console.error("Upvote error:", e);
    return NextResponse.json({ message: "Error while upvoting" }, { status: 500 });
  }
}
