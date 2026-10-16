import { prismaClient } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { loadRoomContext } from "@/lib/room-access";

export const dynamic = "force-dynamic";

// Advance to the next queue item. Host-only: skipping is a playback control.
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

    if (!ctx.isHost) {
      return NextResponse.json({ message: "Only the host can skip tracks." }, { status: 403 });
    }

    const roomId = ctx.room.id;

    // Mark current stream as played if exists
    if (ctx.room.currentStreamId) {
      await prismaClient.stream.update({
        where: { id: ctx.room.currentStreamId },
        data: { played: true, active: false },
      });
    }

    const nextStream = await prismaClient.stream.findFirst({
      where: { roomId, played: false },
      include: { _count: { select: { upvotes: true } } },
      orderBy: [{ upvotes: { _count: "desc" } }, { createdAt: "asc" }],
    });

    if (!nextStream) {
      await prismaClient.room.update({
        where: { id: roomId },
        data: {
          currentStreamId: null,
          isPlaying: false,
          playbackPosition: 0,
          playbackStartedAt: null,
        },
      });
      return NextResponse.json({ message: "Queue is empty", currentStream: null });
    }

    await prismaClient.room.update({
      where: { id: roomId },
      data: {
        currentStreamId: nextStream.id,
        isPlaying: true,
        playbackPosition: 0,
        playbackStartedAt: new Date(),
      },
    });

    await prismaClient.stream.update({
      where: { id: nextStream.id },
      data: { active: true },
    });

    return NextResponse.json({
      message: "Now playing next track",
      currentStream: {
        id: nextStream.id,
        title: nextStream.title,
        type: nextStream.type,
        url: nextStream.url,
        extractedId: nextStream.extractedId,
        smallImg: nextStream.smallImg,
        bigImg: nextStream.bigImg,
        upvotes: nextStream._count.upvotes,
      },
    });
  } catch (e) {
    console.error("Play next error:", e);
    return NextResponse.json({ message: "Error playing next track" }, { status: 500 });
  }
}
