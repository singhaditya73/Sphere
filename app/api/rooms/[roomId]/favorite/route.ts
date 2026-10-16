import { NextRequest, NextResponse } from "next/server";
import { prismaClient } from "@/lib/db";
import { loadRoomContext } from "@/lib/room-access";

export const dynamic = "force-dynamic";

/** POST — toggle the current user's saved/favourite status for a room. */
export async function POST(
  _req: NextRequest,
  props: { params: Promise<{ roomId: string }> }
) {
  try {
    const params = await props.params;
    const access = await loadRoomContext(params.roomId, { requireUser: true, includeInactive: true });
    if (!access.ok) {
      return NextResponse.json({ message: access.message, code: access.code }, { status: access.status });
    }
    const { ctx } = access;
    const userId = ctx.user!.id;
    const roomId = ctx.room.id;

    const existing = await prismaClient.roomFavorite.findUnique({
      where: { userId_roomId: { userId, roomId } },
      select: { id: true },
    });

    if (existing) {
      await prismaClient.roomFavorite.delete({ where: { id: existing.id } });
      return NextResponse.json({ isFavorited: false });
    }

    await prismaClient.roomFavorite.create({ data: { userId, roomId } });
    return NextResponse.json({ isFavorited: true });
  } catch (e) {
    console.error("Favorite error:", e);
    return NextResponse.json({ message: "Error updating favourite" }, { status: 500 });
  }
}
