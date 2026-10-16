import { prismaClient } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loadRoomContext } from "@/lib/room-access";
import { canChat } from "@/lib/room-policy";
import { FixedWindowRateLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const SendMessageSchema = z.object({
  text: z.string().trim().min(1).max(500),
});

// Chat is rate limited per user so a room cannot be flooded.
const chatLimiter = new FixedWindowRateLimiter(20, 60 * 1000);

// Get the most recent messages for a room (chronological order for the UI).
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ roomId: string }> }
) {
  try {
    const params = await props.params;
    const inviteToken = req.nextUrl.searchParams.get("invite");
    const access = await loadRoomContext(params.roomId, { inviteToken });
    if (!access.ok) {
      return NextResponse.json({ message: access.message, code: access.code }, { status: access.status });
    }
    if (access.ctx.isBanned) {
      return NextResponse.json({ message: "You have been removed from this room." }, { status: 403 });
    }

    const recent = await prismaClient.message.findMany({
      where: { roomId: access.ctx.room.id },
      include: { user: { select: { email: true, username: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      messages: recent
        .slice()
        .reverse()
        .map((m) => ({
          id: m.id,
          text: m.text,
          // Raw emails are never returned — only a display name.
          displayName: m.user?.username || m.user?.email?.split("@")[0] || "User",
          username: m.user?.username || null,
          createdAt: m.createdAt,
        })),
    });
  } catch (e) {
    console.error("Fetch messages error:", e);
    return NextResponse.json({ message: "Error fetching messages" }, { status: 500 });
  }
}

// Send a message
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ roomId: string }> }
) {
  try {
    const params = await props.params;
    const access = await loadRoomContext(params.roomId, { requireUser: true });
    if (!access.ok) {
      return NextResponse.json({ message: access.message, code: access.code }, { status: access.status });
    }
    const { ctx } = access;
    const user = ctx.user!;

    if (ctx.isBanned) {
      return NextResponse.json({ message: "You have been removed from this room." }, { status: 403 });
    }
    if (!canChat(ctx.room, ctx.isHost)) {
      return NextResponse.json(
        {
          message: ctx.room.isLocked
            ? "Chat is paused while this room is locked."
            : "Only the host can chat right now.",
        },
        { status: 403 }
      );
    }

    const rate = chatLimiter.check(user.id);
    if (!rate.allowed) {
      return NextResponse.json(
        { message: "You're sending messages too quickly. Please slow down." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
      );
    }

    const data = SendMessageSchema.parse(await req.json());

    const message = await prismaClient.message.create({
      data: { text: data.text, userId: user.id, roomId: ctx.room.id },
      include: { user: { select: { email: true, username: true } } },
    });

    return NextResponse.json({
      message: {
        id: message.id,
        text: message.text,
        // Raw emails are never returned — only a display name.
        displayName: message.user?.username || message.user?.email?.split("@")[0] || "User",
        username: message.user?.username || null,
        createdAt: message.createdAt,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ message: "Message must be 1–500 characters." }, { status: 400 });
    }
    console.error("Send message error:", e);
    return NextResponse.json({ message: "Error sending message" }, { status: 500 });
  }
}
