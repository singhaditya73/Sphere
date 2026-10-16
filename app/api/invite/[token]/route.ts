import { NextRequest, NextResponse } from "next/server";
import { prismaClient } from "@/lib/db";
import { getSessionUser } from "@/lib/room-access";
import { checkInviteUsable, isValidInviteTokenFormat } from "@/lib/invite-token";

export const dynamic = "force-dynamic";

/**
 * GET /api/invite/[token]
 *
 * Validate an invitation. Anonymous callers get `requiresAuth: true` (they must
 * sign in first — Sphere has no guest accounts). Authenticated callers redeem
 * it: the use-count is incremented once and presence is recorded so a private
 * room stays accessible to them.
 */
export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await props.params;

    if (!isValidInviteTokenFormat(token)) {
      return NextResponse.json({ valid: false, reason: "not_found" }, { status: 404 });
    }

    const invite = await prismaClient.roomInvite.findUnique({
      where: { token },
      include: {
        room: {
          select: { id: true, name: true, code: true, visibility: true, isActive: true },
        },
      },
    });

    if (!invite) {
      return NextResponse.json({ valid: false, reason: "not_found" }, { status: 404 });
    }

    const usability = checkInviteUsable(invite);
    if (!usability.usable) {
      return NextResponse.json({ valid: false, reason: usability.reason }, { status: 410 });
    }

    if (!invite.room.isActive) {
      return NextResponse.json({ valid: false, reason: "room_inactive" }, { status: 410 });
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({
        valid: true,
        requiresAuth: true,
        roomId: invite.room.id,
        roomName: invite.room.name,
        code: invite.room.code,
        visibility: invite.room.visibility,
      });
    }

    // Redeem once: only count the first time this user uses the token.
    const alreadyPresent = await prismaClient.roomParticipant.findUnique({
      where: { roomId_userId: { roomId: invite.roomId, userId: user.id } },
      select: { id: true },
    });

    await prismaClient.roomParticipant.upsert({
      where: { roomId_userId: { roomId: invite.roomId, userId: user.id } },
      create: { roomId: invite.roomId, userId: user.id, role: "guest" },
      update: { lastSeenAt: new Date() },
    });

    if (!alreadyPresent) {
      await prismaClient.roomInvite.update({
        where: { id: invite.id },
        data: { uses: { increment: 1 } },
      });
    }

    return NextResponse.json({
      valid: true,
      requiresAuth: false,
      roomId: invite.room.id,
      roomName: invite.room.name,
      code: invite.room.code,
      visibility: invite.room.visibility,
    });
  } catch (e) {
    console.error("Invite validation error:", e);
    return NextResponse.json({ valid: false, reason: "error" }, { status: 500 });
  }
}
