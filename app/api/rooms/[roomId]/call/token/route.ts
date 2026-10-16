import { NextRequest, NextResponse } from "next/server";
import { loadRoomContext } from "@/lib/room-access";
import { canUseCall } from "@/lib/room-policy";
import { createCallToken, getLiveKitConfig, livekitRoomName } from "@/lib/call";

export const dynamic = "force-dynamic";

/**
 * POST /api/rooms/[roomId]/call/token
 *
 * Mint a short-lived, room-scoped LiveKit token. Requires an authenticated user
 * who is allowed into the room; the host receives call-admin rights. Secrets
 * stay on the server — the client only ever receives the JWT and the wss URL.
 */
export async function POST(
  _req: NextRequest,
  props: { params: Promise<{ roomId: string }> }
) {
  try {
    const config = getLiveKitConfig();
    if (!config) {
      return NextResponse.json(
        {
          message:
            "Video calling is not configured on this server. Set LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET.",
          code: "CALL_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    const params = await props.params;
    const access = await loadRoomContext(params.roomId, { requireUser: true });
    if (!access.ok) {
      return NextResponse.json({ message: access.message, code: access.code }, { status: access.status });
    }
    const { ctx } = access;

    if (ctx.isBanned) {
      return NextResponse.json({ message: "You have been removed from this room." }, { status: 403 });
    }
    if (!canUseCall(ctx.room)) {
      return NextResponse.json({ message: "Calling is disabled in this room." }, { status: 403 });
    }

    const identity = ctx.user!.id;
    const name = ctx.user!.username || ctx.user!.email?.split("@")[0] || "Guest";

    const token = await createCallToken({
      config,
      roomId: ctx.room.id,
      identity,
      name,
      isHost: ctx.isHost,
    });

    return NextResponse.json({
      token,
      url: config.url,
      roomName: livekitRoomName(ctx.room.id),
      identity,
      name,
      isHost: ctx.isHost,
    });
  } catch (e) {
    console.error("Call token error:", e);
    return NextResponse.json({ message: "Error creating call token" }, { status: 500 });
  }
}
