import { prismaClient } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

// Play next song in queue
export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getServerSession();
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

    const roomId = params.roomId;

    const room = await prismaClient.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return NextResponse.json(
        { message: "Room not found" },
        { status: 404 }
      );
    }

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
        data: { currentStreamId: null },
      });

      return NextResponse.json({
        message: "Queue is empty",
        currentStream: null,
      });
    }

    // Set as currently playing
    await prismaClient.room.update({
      where: { id: roomId },
      data: { currentStreamId: nextStream.id },
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
