import { prismaClient } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Get room details with queue
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ roomId: string }> }
) {
  try {
    const params = await props.params;
    const roomId = params.roomId;

    const room = await prismaClient.room.findUnique({
      where: {
        id: roomId,
        isActive: true,
      },
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
