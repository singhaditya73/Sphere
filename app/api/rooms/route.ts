import { prismaClient } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "../../auth/[...nextauth]/route";

const CreateRoomSchema = z.object({
  name: z.string().min(1).max(100),
});

// Create a new room
export async function POST(req: NextRequest) {
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

    const data = CreateRoomSchema.parse(await req.json());

    const room = await prismaClient.room.create({
      data: {
        name: data.name,
        hostId: user.id,
      },
    });

    return NextResponse.json({
      message: "Room created successfully",
      room: {
        id: room.id,
        name: room.name,
        hostId: room.hostId,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { message: "Error creating room", error: String(e) },
      { status: 500 }
    );
  }
}

// Get all active rooms
export async function GET() {
  try {
    const rooms = await prismaClient.room.findMany({
      where: {
        isActive: true,
      },
      include: {
        host: {
          select: {
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
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      rooms: rooms.map((room) => ({
        id: room.id,
        name: room.name,
        hostEmail: room.host.email,
        streamCount: room.streams.length,
        createdAt: room.createdAt,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { message: "Error fetching rooms", error: String(e) },
      { status: 500 }
    );
  }
}
