import { prismaClient } from "@/lib/db";
import { isRoomCode } from "@/lib/room-code";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const PlaybackActionSchema = z.object({
  action: z.enum(["play", "pause", "seek"]),
  position: z.number().min(0).optional(),
});

export async function POST(
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
    const roomIdParam = params.roomId;

    const whereClause = isRoomCode(roomIdParam)
      ? { code: roomIdParam.toUpperCase(), isActive: true }
      : { id: roomIdParam, isActive: true };

    const room = await prismaClient.room.findFirst({
      where: whereClause,
    });

    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 });
    }

    // Only host can control playback
    if (room.hostId !== user.id) {
      return NextResponse.json(
        { message: "Only the host can control playback" },
        { status: 403 }
      );
    }

    // Only applicable for listen_together mode
    if (room.mode !== "listen_together") {
      return NextResponse.json(
        { message: "Playback sync is only available in Listen Together mode" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { action, position } = PlaybackActionSchema.parse(body);

    const now = new Date();

    if (action === "play") {
      await prismaClient.room.update({
        where: { id: room.id },
        data: {
          isPlaying: true,
          playbackStartedAt: now,
        },
      });
    } else if (action === "pause") {
      // Compute current position based on elapsed time
      let currentPosition = room.playbackPosition;
      if (room.isPlaying && room.playbackStartedAt) {
        const elapsed = (now.getTime() - room.playbackStartedAt.getTime()) / 1000;
        currentPosition = room.playbackPosition + elapsed;
      }

      await prismaClient.room.update({
        where: { id: room.id },
        data: {
          isPlaying: false,
          playbackPosition: currentPosition,
          playbackStartedAt: null,
        },
      });
    } else if (action === "seek") {
      const seekPosition = position ?? 0;

      await prismaClient.room.update({
        where: { id: room.id },
        data: {
          playbackPosition: seekPosition,
          playbackStartedAt: room.isPlaying ? now : null,
        },
      });
    }

    return NextResponse.json({ message: "Playback updated" });
  } catch (e) {
    console.error("Playback control error:", e);
    return NextResponse.json(
      { message: "Error updating playback", error: String(e) },
      { status: 500 }
    );
  }
}
