import { prismaClient } from "@/lib/db";
import { isRoomCode } from "@/lib/room-code";
import { NextRequest, NextResponse } from "next/server";

// Get room details with queue
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ roomId: string }> }
) {
  try {
    const params = await props.params;
    const roomId = params.roomId;

    // Support lookup by code (BEAT-XXXX) or by UUID
    const whereClause = isRoomCode(roomId) 
      ? { code: roomId.toUpperCase(), isActive: true }
      : { id: roomId, isActive: true };

    const room = await prismaClient.room.findFirst({
      where: whereClause,
      include: {
        host: {
          select: {
            id: true,
            email: true,
          },
        },
        streams: {
          where: {
            played: false,
          },
          include: {
            _count: {
              select: {
                upvotes: true,
              },
            },
            user: {
              select: {
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json(
        { message: "Room not found" },
        { status: 404 }
      );
    }

    // Sort streams by upvote count
    const sortedStreams = room.streams.sort(
      (a, b) => b._count.upvotes - a._count.upvotes
    );

    // Get currently playing stream
    let currentStream = null;
    if (room.currentStreamId) {
      currentStream = await prismaClient.stream.findUnique({
        where: { id: room.currentStreamId },
        include: {
          _count: {
            select: {
              upvotes: true,
            },
          },
          user: {
            select: {
              email: true,
            },
          },
        },
      });
    }

    return NextResponse.json({
      room: {
        id: room.id,
        code: room.code,
        name: room.name,
        host: room.host,
        currentStream,
        queue: sortedStreams.map((stream) => ({
          id: stream.id,
          type: stream.type,
          url: stream.url,
          title: stream.title,
          smallImg: stream.smallImg,
          bigImg: stream.bigImg,
          upvotes: stream._count.upvotes,
          addedBy: stream.user.email,
          createdAt: stream.createdAt,
        })),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { message: "Error fetching room details", error: String(e) },
      { status: 500 }
    );
  }
}
