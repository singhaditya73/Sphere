import { prismaClient } from "@/lib/db";
import { NextResponse } from "next/server";

// Get top active rooms (sorted by stream count)
export async function GET() {
  try {
    const rooms = await prismaClient.room.findMany({
      take: 5,
      orderBy: {
        streams: {
          _count: 'desc'
        }
      },
      include: {
        host: {
          select: {
            email: true,
          },
        },
        _count: {
          select: { streams: true }
        }
      },
    });

    const formattedRooms = rooms.map(room => ({
      id: room.id,
      code: room.code,
      name: room.name,
      hostEmail: room.host.email,
      streamCount: room._count.streams,
      createdAt: room.createdAt.toISOString(),
    }));

    return NextResponse.json({ rooms: formattedRooms });
  } catch (error) {
    console.error("Error fetching top rooms:", error);
    return NextResponse.json(
      { message: "Failed to fetch top rooms" },
      { status: 500 }
    );
  }
}
