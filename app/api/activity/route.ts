import { prismaClient } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Privacy: the public activity feed only reflects rooms the host chose to
    // make public. Chat messages are room-private and are never surfaced here.
    const publicRoom = { room: { visibility: "public" as const, isActive: true } };

    // 1. Fetch recent streams (song added) from public rooms only.
    const recentStreams = await prismaClient.stream.findMany({
      where: publicRoom,
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, username: true } },
        room: { select: { name: true } },
      }
    });

    // 2. Fetch recent public rooms (room created).
    const recentRooms = await prismaClient.room.findMany({
      where: { visibility: "public", isActive: true },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        host: { select: { email: true, username: true } },
      }
    });

    const events: Array<{
      id: string;
      type: "song_added" | "room_created" | "chat_message";
      user: string;
      detail: string;
      roomName: string;
      time: string;
    }> = [];

    recentStreams.forEach((stream) => {
      if (stream.user?.email && stream.room?.name) {
        events.push({
          id: `stream-${stream.id}`,
          type: "song_added",
          user: stream.user.username || stream.user.email.split("@")[0],
          detail: stream.title,
          roomName: stream.room.name,
          time: stream.createdAt.toISOString(),
        });
      }
    });

    recentRooms.forEach((room) => {
      if (room.host?.email) {
        events.push({
          id: `room-${room.id}`,
          type: "room_created",
          user: room.host.username || room.host.email.split("@")[0],
          detail: room.name,
          roomName: room.name,
          time: room.createdAt.toISOString(),
        });
      }
    });

    // Sort combined events by timestamp desc
    events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return NextResponse.json({ events: events.slice(0, 4) });
  } catch (error) {
    console.error("Error fetching live activity:", error);
    return NextResponse.json(
      { message: "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
}
