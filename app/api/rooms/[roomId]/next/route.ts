import { prismaClient } from "@/lib/db";
import { isRoomCode } from "@/lib/room-code";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

// Play next song in queue
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = await prismaClient.user.findFirst({
      where: {
        email: session?.user?.email ?? "",
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Unauthenticated" },
        { status: 403 }
      );
    }

    const params = await props.params;
    const roomIdParam = params.roomId;

    // Resolve room code to actual database ID
    const whereClause = isRoomCode(roomIdParam)
      ? { code: roomIdParam.toUpperCase(), isActive: true }
      : { id: roomIdParam, isActive: true };

    const room = await prismaClient.room.findFirst({
      where: whereClause,
    });

    if (!room) {
      return NextResponse.json(
        { message: "Room not found" },
        { status: 404 }
      );
    }

    const roomId = room.id;

    // Mark current stream as played if exists
    if (room.currentStreamId) {
      await prismaClient.stream.update({
        where: { id: room.currentStreamId },
        data: { played: true, active: false },
      });
    }

    // Get next stream with most upvotes
    const nextStream = await prismaClient.stream.findFirst({
      where: {
        roomId,
        played: false,
      },
      include: {
        _count: {
          select: {
            upvotes: true,
          },
        },
      },
      orderBy: [
        {
          upvotes: {
            _count: "desc",
          },
        },
        {
          createdAt: "asc",
        },
      ],
    });

    if (!nextStream) {
      // No more songs in queue
      await prismaClient.room.update({
        where: { id: roomId },
        data: {
          currentStreamId: null,
          isPlaying: false,
          playbackPosition: 0,
          playbackStartedAt: null,
        },
      });

      return NextResponse.json({
        message: "Queue is empty",
        currentStream: null,
      });
    }

    // Set as currently playing
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
    return NextResponse.json(
      { message: "Error playing next track", error: String(e) },
      { status: 500 }
    );
  }
}
