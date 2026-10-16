import { prismaClient } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loadRoomContext } from "@/lib/room-access";
import { canControlPlayback } from "@/lib/room-policy";

export const dynamic = "force-dynamic";

const PlaybackActionSchema = z.object({
  action: z.enum(["play", "pause", "seek"]),
  position: z.number().min(0).optional(),
});

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
    const room = ctx.room;

    if (!canControlPlayback(room, ctx.isHost)) {
      return NextResponse.json({ message: "Only the host can control playback" }, { status: 403 });
    }

    // Shared playback sync only applies to Listen Together rooms.
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
        data: { isPlaying: true, playbackStartedAt: now },
      });
    } else if (action === "pause") {
      let currentPosition = room.playbackPosition;
      if (room.isPlaying && room.playbackStartedAt) {
        const elapsed = (now.getTime() - room.playbackStartedAt.getTime()) / 1000;
        currentPosition = room.playbackPosition + elapsed;
      }
      await prismaClient.room.update({
        where: { id: room.id },
        data: { isPlaying: false, playbackPosition: currentPosition, playbackStartedAt: null },
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
    if (e instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid playback action." }, { status: 400 });
    }
    console.error("Playback control error:", e);
    return NextResponse.json({ message: "Error updating playback" }, { status: 500 });
  }
}
