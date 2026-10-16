import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaClient } from "@/lib/db";
import { loadRoomContext } from "@/lib/room-access";
import { removeParticipantFromCall, setParticipantMuted } from "@/lib/call";

export const dynamic = "force-dynamic";

const ModerationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("kick"), userId: z.string().min(1).max(128) }),
  z.object({ action: z.literal("ban"), userId: z.string().min(1).max(128), reason: z.string().max(200).optional() }),
  z.object({ action: z.literal("unban"), userId: z.string().min(1).max(128) }),
  z.object({ action: z.literal("mute"), userId: z.string().min(1).max(128), muted: z.boolean() }),
  z.object({ action: z.literal("lock"), locked: z.boolean() }),
  z.object({ action: z.literal("set-chat"), chatMode: z.enum(["all", "hosts", "muted"]) }),
  z.object({ action: z.literal("set-add"), addMode: z.enum(["all", "hosts"]) }),
  z.object({ action: z.literal("end") }),
]);

/**
 * POST /api/rooms/[roomId]/moderation — host-only room controls.
 *
 * Every branch is enforced server-side against the room's host; the client only
 * hides controls it cannot use. Call-level effects (disconnect / mute) are
 * applied best-effort through LiveKit when configured.
 */
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
      return NextResponse.json({ message: "Only the host can moderate this room." }, { status: 403 });
    }
    const roomId = ctx.room.id;

    const data = ModerationSchema.parse(await req.json());

    switch (data.action) {
      case "kick": {
        if (data.userId === ctx.room.hostId) {
          return NextResponse.json({ message: "The host cannot be removed." }, { status: 400 });
        }
        await prismaClient.roomParticipant.deleteMany({ where: { roomId, userId: data.userId } });
        await removeParticipantFromCall(roomId, data.userId);
        return NextResponse.json({ message: "Participant removed" });
      }
      case "ban": {
        if (data.userId === ctx.room.hostId) {
          return NextResponse.json({ message: "The host cannot be banned." }, { status: 400 });
        }
        await prismaClient.roomBan.upsert({
          where: { roomId_userId: { roomId, userId: data.userId } },
          create: { roomId, userId: data.userId, createdById: ctx.user!.id, reason: data.reason ?? null },
          update: { reason: data.reason ?? null },
        });
        await prismaClient.roomParticipant.deleteMany({ where: { roomId, userId: data.userId } });
        await removeParticipantFromCall(roomId, data.userId);
        return NextResponse.json({ message: "Participant banned" });
      }
      case "unban": {
        await prismaClient.roomBan.deleteMany({ where: { roomId, userId: data.userId } });
        return NextResponse.json({ message: "Participant unbanned" });
      }
      case "mute": {
        await prismaClient.roomParticipant.updateMany({
          where: { roomId, userId: data.userId },
          data: { isMuted: data.muted },
        });
        await setParticipantMuted(roomId, data.userId, data.muted);
        return NextResponse.json({ message: data.muted ? "Participant muted" : "Participant unmuted" });
      }
      case "lock": {
        await prismaClient.room.update({ where: { id: roomId }, data: { isLocked: data.locked } });
        return NextResponse.json({ message: data.locked ? "Room locked" : "Room unlocked" });
      }
      case "set-chat": {
        await prismaClient.room.update({ where: { id: roomId }, data: { chatMode: data.chatMode } });
        return NextResponse.json({ message: "Chat mode updated" });
      }
      case "set-add": {
        await prismaClient.room.update({ where: { id: roomId }, data: { addMode: data.addMode } });
        return NextResponse.json({ message: "Add mode updated" });
      }
      case "end": {
        await prismaClient.room.update({
          where: { id: roomId },
          data: { isActive: false, endedAt: new Date(), isPlaying: false, currentStreamId: null },
        });
        return NextResponse.json({ message: "Room ended" });
      }
    }
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid moderation action." }, { status: 400 });
    }
    console.error("Moderation error:", e);
    return NextResponse.json({ message: "Error applying moderation action" }, { status: 500 });
  }
}
