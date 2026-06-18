import { prismaClient } from "@/lib/db";
import { generateRoomCode } from "@/lib/room-code";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

const CreateRoomSchema = z.object({
  name: z.string().min(1).max(100),
});

// Create a new room
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    console.log("=== CREATE ROOM DEBUG ===");
    console.log("Session:", JSON.stringify(session, null, 2));

    if (!session?.user?.email) {
      console.log("No session or email found");
      return NextResponse.json(
        { message: "Please sign in to create a room" },
        { status: 401 }
      );
    }

    // Find or create user
    let user = await prismaClient.user.findUnique({
      where: { email: session.user.email },
    });

    console.log("User from DB:", user);

    if (!user) {
      // Create user if doesn't exist (shouldn't happen with proper signIn callback)
      console.log("Creating user...");
      user = await prismaClient.user.create({
        data: {
          email: session.user.email,
          provider: "Google",
        },
      });
      console.log("User created:", user);
    }

    const body = await req.json();
    console.log("Request body:", body);

    const data = CreateRoomSchema.parse(body);

    // Generate unique room code with retry
    let code = generateRoomCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prismaClient.room.findUnique({ where: { code } });
      if (!existing) break;
      code = generateRoomCode();
      attempts++;
    }

    const room = await prismaClient.room.create({
      data: {
        name: data.name,
        code: code,
        hostId: user.id,
      },
    });

    console.log("Room created successfully:", room);
    console.log("=== END DEBUG ===");

    return NextResponse.json({
      message: "Room created successfully",
      room: {
        id: room.id,
        code: room.code,
        name: room.name,
        hostId: room.hostId,
      },
    }, { status: 200 });
  } catch (e) {
    console.error("=== CREATE ROOM ERROR ===");
    console.error("Error:", e);
    console.error("Error string:", String(e));
    console.error("=== END ERROR ===");
    
    return NextResponse.json(
      { 
        message: "Error creating room", 
        error: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined
      },
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
