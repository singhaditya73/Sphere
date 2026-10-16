import { prismaClient } from "@/lib/db";
import { generateRoomCode } from "@/lib/room-code";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/room-access";

export const dynamic = "force-dynamic";

const CreateRoomSchema = z.object({
  name: z.string().min(1).max(100),
  mode: z.enum(["dj", "listen_together"]).default("dj"),
  visibility: z.enum(["public", "unlisted", "private"]).default("unlisted"),
  description: z.string().max(280).optional(),
  category: z.string().max(40).optional(),
});

function displayName(email: string | null, username: string | null): string {
  return username || email?.split("@")[0] || "Host";
}

// Create a new room
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ message: "Please sign in to create a room" }, { status: 401 });
    }

    const body = await req.json();
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
        mode: data.mode,
        code,
        hostId: user.id,
        visibility: data.visibility,
        description: data.description?.trim() || null,
        category: data.category?.trim() || null,
      },
    });

    return NextResponse.json(
      {
        message: "Room created successfully",
        room: {
          id: room.id,
          code: room.code,
          name: room.name,
          mode: room.mode,
          visibility: room.visibility,
          hostId: room.hostId,
        },
      },
      { status: 200 }
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid room details." }, { status: 400 });
    }
    console.error("Create room error:", e);
    return NextResponse.json({ message: "Error creating room" }, { status: 500 });
  }
}

/**
 * List rooms.
 *
 *  - `scope=public` (default): the public directory — only rooms explicitly
 *    marked public. Private/unlisted rooms are never enumerated here.
 *  - `scope=mine`: rooms hosted by the signed-in user.
 *  - `scope=joined&ids=a,b,c`: resolve a set of room ids the caller already has
 *    (used by the dashboard's "Rooms Joined" list). Ids are validated/capped.
 *
 * Host emails are only exposed to the owner of the room; everyone else sees a
 * display name, so the directory cannot be scraped for addresses.
 */
export async function GET(req: NextRequest) {
  try {
    const scope = req.nextUrl.searchParams.get("scope") ?? "public";
    const user = await getSessionUser();

    let where: Record<string, unknown>;
    if (scope === "mine") {
      if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      where = { isActive: true, hostId: user.id };
    } else if (scope === "saved") {
      if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      const favorites = await prismaClient.roomFavorite.findMany({
        where: { userId: user.id },
        select: { roomId: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      const ids = favorites.map((f) => f.roomId);
      if (ids.length === 0) return NextResponse.json({ rooms: [] });
      // Saved rooms are shown even after they end, so the host can revisit them.
      where = { id: { in: ids } };
    } else if (scope === "joined") {
      const ids = (req.nextUrl.searchParams.get("ids") ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0 && id.length <= 128)
        .slice(0, 50);
      if (ids.length === 0) return NextResponse.json({ rooms: [] });
      where = { isActive: true, id: { in: ids } };
    } else {
      where = { isActive: true, visibility: "public" };
    }

    const rooms = await prismaClient.room.findMany({
      where,
      include: {
        host: { select: { id: true, email: true, username: true } },
        _count: { select: { streams: { where: { played: false } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      rooms: rooms.map((room) => {
        const isOwner = user?.id === room.hostId;
        return {
          id: room.id,
          code: room.code,
          name: room.name,
          mode: room.mode,
          visibility: room.visibility,
          description: room.description,
          category: room.category,
          streamCount: room._count.streams,
          createdAt: room.createdAt,
          isOwner,
          hostName: displayName(room.host.email, room.host.username),
          // Only the owner sees the raw host email.
          hostEmail: isOwner ? room.host.email : null,
        };
      }),
    });
  } catch (e) {
    console.error("List rooms error:", e);
    return NextResponse.json({ message: "Error fetching rooms" }, { status: 500 });
  }
}
