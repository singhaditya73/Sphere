import { prismaClient } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

// Get user's upvoted streams in a room
export async function GET(req: NextRequest) {
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

    const roomId = req.nextUrl.searchParams.get("roomId");

    if (!roomId) {
      return NextResponse.json(
        { message: "Room ID required" },
        { status: 400 }
      );
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
