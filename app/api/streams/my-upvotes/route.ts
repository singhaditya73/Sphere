import { prismaClient } from "@/lib/db";
import { isRoomCode } from "@/lib/room-code";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

// Get user's upvoted streams in a room
export async function GET(req: NextRequest) {
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

    const roomIdParam = req.nextUrl.searchParams.get("roomId");

    if (!roomIdParam) {
      return NextResponse.json(
        { message: "Room ID required" },
        { status: 400 }
      );
    }

    // Resolve room code to actual database ID
    let roomId = roomIdParam;
    if (isRoomCode(roomIdParam)) {
      const room = await prismaClient.room.findFirst({
        where: { code: roomIdParam.toUpperCase(), isActive: true },
        select: { id: true },
      });
      if (!room) {
        return NextResponse.json(
          { message: "Room not found" },
          { status: 404 }
        );
      }
      roomId = room.id;
    }

    const upvotes = await prismaClient.upvote.findMany({
      where: {
        userId: user.id,
        stream: {
          roomId: roomId,
        },
      },
      select: {
        streamId: true,
      },
    });

    return NextResponse.json({
      upvotedStreamIds: upvotes.map((u) => u.streamId),
    });
  } catch (e) {
    return NextResponse.json(
      { message: "Error fetching upvotes", error: String(e) },
      { status: 500 }
    );
  }
}
