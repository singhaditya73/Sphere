import { prismaClient } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertCanVote, getSessionUser } from "@/lib/room-access";

export const dynamic = "force-dynamic";

const downvoteSchema = z.object({
  streamId: z.string().min(1).max(128),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  try {
    const data = downvoteSchema.parse(await req.json());

    const allowed = await assertCanVote(data.streamId, user);
    if (!allowed.ok) {
      return NextResponse.json({ message: allowed.message, code: allowed.code }, { status: allowed.status });
    }

    // Removing a vote that is not there is a no-op, not an error.
    await prismaClient.upvote.deleteMany({
      where: { userId: user.id, streamId: data.streamId },
    });

    return NextResponse.json({ message: "Downvoted successfully" }, { status: 200 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid stream id." }, { status: 400 });
    }
    console.error("Downvote error:", e);
    return NextResponse.json({ message: "Error while downvoting" }, { status: 500 });
  }
}
