import { prismaClient } from "@/lib/db";
import { isRoomCode } from "@/lib/room-code";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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

// Delete room (only host can delete it)
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await prismaClient.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const params = await props.params;
    const roomId = params.roomId;

    const whereClause = isRoomCode(roomId)
      ? { code: roomId.toUpperCase() }
      : { id: roomId };

    const room = await prismaClient.room.findFirst({
      where: whereClause,
      select: { id: true, hostId: true },
    });

    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 });
    }

    // Only host can delete
    if (room.hostId !== user.id) {
      return NextResponse.json(
        { message: "Forbidden: Only the host can delete this room" },
        { status: 403 }
      );
    }

    // Perform cascade delete of the room
    await prismaClient.room.delete({
      where: { id: room.id },
    });

    return NextResponse.json({ message: "Room deleted successfully" });
  } catch (e) {
    return NextResponse.json(
      { message: "Error deleting room", error: String(e) },
      { status: 500 }
    );
  }
}
