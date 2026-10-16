import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { z } from "zod";
import { prismaClient } from "@/lib/db";
import { assertCanView, loadRoomContext } from "@/lib/room-access";
import {
  buildInviteUrl,
  checkInviteUsable,
  defaultInviteExpiry,
  generateInviteToken,
} from "@/lib/invite-token";
import { canonicalBaseUrl } from "@/lib/urls";

export const dynamic = "force-dynamic";

async function qrDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, { margin: 1, width: 320, errorCorrectionLevel: "M" });
  } catch {
    return "";
  }
}

const CreateInviteSchema = z.object({
  rotate: z.boolean().optional(),
  expiresInHours: z.number().int().min(1).max(24 * 90).optional(),
  maxUses: z.number().int().min(1).max(1000).optional(),
});

async function activeInvite(roomId: string) {
  return prismaClient.roomInvite.findFirst({
    where: { roomId, revokedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

async function invitePayload(base: string, invite: Awaited<ReturnType<typeof activeInvite>>) {
  if (!invite) return null;
  const usable = checkInviteUsable(invite).usable;
  const url = buildInviteUrl(base, invite.token);
  return {
    token: invite.token,
    url,
    qrDataUrl: await qrDataUrl(url),
    expiresAt: invite.expiresAt,
    revokedAt: invite.revokedAt,
    uses: invite.uses,
    maxUses: invite.maxUses,
    usable,
  };
}

/**
 * GET — sharing info for a room.
 *
 * Everyone who can view the room gets the room code and a plain room URL + QR.
 * The invitation token is only returned to the host (only the host may create
 * or rotate it), so private-room tokens are never leaked to other members.
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ roomId: string }> }
) {
  try {
    const params = await props.params;
    const access = await loadRoomContext(params.roomId, {});
    if (!access.ok) {
      return NextResponse.json({ message: access.message, code: access.code }, { status: access.status });
    }
    const viewError = await assertCanView(access.ctx);
    if (viewError) {
      return NextResponse.json({ message: viewError.message, code: viewError.code }, { status: viewError.status });
    }

    const { ctx } = access;
    const base = canonicalBaseUrl(req);
    const roomUrl = `${base}/room/${ctx.room.code}`;

    let invite = null;
    if (ctx.isHost) {
      invite = await invitePayload(base, await activeInvite(ctx.room.id));
    }

    return NextResponse.json({
      roomCode: ctx.room.code,
      roomUrl,
      qrDataUrl: await qrDataUrl(roomUrl),
      visibility: ctx.room.visibility,
      invite,
    });
  } catch (e) {
    console.error("Invite fetch error:", e);
    return NextResponse.json({ message: "Error fetching invite" }, { status: 500 });
  }
}

/** POST — create or rotate the room's invitation (host only). */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ roomId: string }> }
) {
  try {
    const params = await props.params;
    const access = await loadRoomContext(params.roomId, { requireUser: true, includeInactive: true });
    if (!access.ok) {
      return NextResponse.json({ message: access.message, code: access.code }, { status: access.status });
    }
    const { ctx } = access;
    if (!ctx.isHost) {
      return NextResponse.json({ message: "Only the host can manage invitations." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const data = CreateInviteSchema.parse(body);
    const base = canonicalBaseUrl(req);

    if (data.rotate) {
      await prismaClient.roomInvite.updateMany({
        where: { roomId: ctx.room.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    const existing = await activeInvite(ctx.room.id);
    if (existing && checkInviteUsable(existing).usable && !data.rotate) {
      return NextResponse.json({ invite: await invitePayload(base, existing) });
    }

    const expiresAt = data.expiresInHours
      ? new Date(Date.now() + data.expiresInHours * 60 * 60 * 1000)
      : defaultInviteExpiry();

    const created = await prismaClient.roomInvite.create({
      data: {
        token: generateInviteToken(),
        roomId: ctx.room.id,
        createdById: ctx.user!.id,
        expiresAt,
        maxUses: data.maxUses ?? null,
      },
    });

    return NextResponse.json({ invite: await invitePayload(base, created) });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid invitation options." }, { status: 400 });
    }
    console.error("Invite create error:", e);
    return NextResponse.json({ message: "Error creating invite" }, { status: 500 });
  }
}

/** DELETE — revoke all active invitations (host only). */
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ roomId: string }> }
) {
  try {
    const params = await props.params;
    const access = await loadRoomContext(params.roomId, { requireUser: true, includeInactive: true });
    if (!access.ok) {
      return NextResponse.json({ message: access.message, code: access.code }, { status: access.status });
    }
    if (!access.ctx.isHost) {
      return NextResponse.json({ message: "Only the host can revoke invitations." }, { status: 403 });
    }

    await prismaClient.roomInvite.updateMany({
      where: { roomId: access.ctx.room.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return NextResponse.json({ message: "Invitations revoked" });
  } catch (e) {
    console.error("Invite revoke error:", e);
    return NextResponse.json({ message: "Error revoking invite" }, { status: 500 });
  }
}
