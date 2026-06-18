import { prismaClient } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Fetch recent streams (song added)
    const recentStreams = await prismaClient.stream.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true } },
        room: { select: { name: true } },
      }
    });

    // 2. Fetch recent rooms (room created)
    const recentRooms = await prismaClient.room.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        host: { select: { email: true } },
      }
    });

    // 3. Fetch recent messages (user chat activity)
    const recentMessages = await prismaClient.message.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true } },
        room: { select: { name: true } },
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
          user: stream.user.email.split("@")[0],
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
          user: room.host.email.split("@")[0],
          detail: room.name,
          roomName: room.name,
          time: room.createdAt.toISOString(),
        });
      }
    });

    recentMessages.forEach((msg) => {
      if (msg.user?.email && msg.room?.name) {
        events.push({
          id: `msg-${msg.id}`,
          type: "chat_message",
          user: msg.user.email.split("@")[0],
          detail: msg.text,
          roomName: msg.room.name,
          time: msg.createdAt.toISOString(),
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
