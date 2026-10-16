import { prismaClient } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import {
  assertCanView,
  heartbeat,
  listParticipants,
  loadRoomContext,
} from "@/lib/room-access";
import {
  canAddMedia,
  canChat,
  canControlPlayback,
  canModerate,
  canUseCall,
} from "@/lib/room-policy";

export const dynamic = "force-dynamic";

const REACTION_WINDOW_MS = 20_000;
const REACTION_LIMIT = 24;

function serializeStream(stream: {
  id: string;
  type: string;
  url: string;
  extractedId: string;
  title: string;
  artist: string | null;
  duration: number | null;
  smallImg: string;
  bigImg: string;
  previewUrl: string | null;
  mediaType: string;
  category: string | null;
  createdAt: Date;
  _count: { upvotes: number };
  user: { email: string | null; username: string | null };
}) {
  return {
    id: stream.id,
    type: stream.type,
    url: stream.url,
    extractedId: stream.extractedId,
    title: stream.title,
    artist: stream.artist,
    duration: stream.duration,
    smallImg: stream.smallImg,
    bigImg: stream.bigImg,
    previewUrl: stream.previewUrl,
    mediaType: stream.mediaType,
    category: stream.category,
    upvotes: stream._count.upvotes,
    addedBy: stream.user.email,
    addedByUsername: stream.user.username,
    createdAt: stream.createdAt,
  };
}

// Get room details with queue, presence, reactions and active activities.
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
    const { ctx } = access;

    const viewError = await assertCanView(ctx, inviteToken);
    if (viewError) {
      return NextResponse.json({ message: viewError.message, code: viewError.code }, { status: viewError.status });
    }

    // Presence heartbeat (signed-in viewers only).
    await heartbeat(ctx.room.id, ctx.user, ctx.isHost);

    const room = await prismaClient.room.findUnique({
      where: { id: ctx.room.id },
      include: {
        host: { select: { id: true, email: true, username: true } },
        streams: {
          where: { played: false },
          include: {
            _count: { select: { upvotes: true } },
            user: { select: { email: true, username: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 });
    }

    const sortedStreams = room.streams.sort((a, b) => b._count.upvotes - a._count.upvotes);

    let currentStream = null;
    if (room.currentStreamId) {
      currentStream = await prismaClient.stream.findUnique({
        where: { id: room.currentStreamId },
        include: {
          _count: { select: { upvotes: true } },
          user: { select: { email: true, username: true } },
        },
      });
    }

    const now = Date.now();
    const [participants, reactions, poll, battle, favorite] = await Promise.all([
      listParticipants(room.id),
      prismaClient.reaction.findMany({
        where: { roomId: room.id, createdAt: { gte: new Date(now - REACTION_WINDOW_MS) } },
        orderBy: { createdAt: "desc" },
        take: REACTION_LIMIT,
        include: { user: { select: { email: true, username: true } } },
      }),
      prismaClient.poll.findFirst({
        where: {
          roomId: room.id,
          isClosed: false,
          OR: [{ closesAt: null }, { closesAt: { gt: new Date(now) } }],
        },
        orderBy: { createdAt: "desc" },
        include: {
          options: { orderBy: { position: "asc" }, include: { _count: { select: { votes: true } } } },
          votes: { select: { optionId: true, userId: true } },
        },
      }),
      prismaClient.battle.findFirst({
        where: { roomId: room.id, isClosed: false },
        orderBy: { createdAt: "desc" },
        include: {
          entries: {
            orderBy: { position: "asc" },
            include: {
              stream: { select: { id: true, title: true, smallImg: true, bigImg: true, artist: true } },
              _count: { select: { votes: true } },
            },
          },
          votes: { select: { entryId: true, userId: true } },
        },
      }),
      ctx.user
        ? prismaClient.roomFavorite.findUnique({
            where: { userId_roomId: { userId: ctx.user.id, roomId: room.id } },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    return NextResponse.json({
      room: {
        id: room.id,
        code: room.code,
        name: room.name,
        mode: room.mode,
        visibility: room.visibility,
        description: room.description,
        category: room.category,
        isLocked: room.isLocked,
        chatMode: room.chatMode,
        addMode: room.addMode,
        callsEnabled: room.callsEnabled,
        isActive: room.isActive,
        // The host's email is only ever revealed to the host themselves; everyone
        // else gets a display name. Server-side `viewer.isHost` is authoritative.
        host: {
          id: room.host.id,
          username: room.host.username,
          email: ctx.isHost ? room.host.email : null,
        },
        currentStream: currentStream ? serializeStream(currentStream) : null,
        isPlaying: room.isPlaying,
        playbackPosition: room.playbackPosition,
        playbackStartedAt: room.playbackStartedAt?.toISOString() ?? null,
        queue: sortedStreams.map(serializeStream),
        participants: participants.map((p) => ({
          userId: p.userId,
          username: p.username || p.email?.split("@")[0] || "Guest",
          role: p.role,
          isMuted: p.isMuted,
          joinedAt: p.joinedAt,
        })),
        reactions: reactions.map((r) => ({
          id: r.id,
          emoji: r.emoji,
          streamId: r.streamId,
          username: r.user.username || r.user.email?.split("@")[0] || "Guest",
          createdAt: r.createdAt,
        })),
        poll: poll
          ? {
              id: poll.id,
              question: poll.question,
              isClosed: poll.isClosed,
              closesAt: poll.closesAt,
              totalVotes: poll.votes.length,
              myOptionId: ctx.user ? poll.votes.find((v) => v.userId === ctx.user!.id)?.optionId ?? null : null,
              options: poll.options.map((o) => ({
                id: o.id,
                label: o.label,
                votes: o._count.votes,
              })),
            }
          : null,
        battle: battle
          ? {
              id: battle.id,
              totalVotes: battle.votes.length,
              myEntryId: ctx.user ? battle.votes.find((v) => v.userId === ctx.user!.id)?.entryId ?? null : null,
              entries: battle.entries.map((e) => ({
                id: e.id,
                streamId: e.streamId,
                title: e.stream.title,
                artist: e.stream.artist,
                thumbnail: e.stream.smallImg || e.stream.bigImg,
                votes: e._count.votes,
              })),
            }
          : null,
      },
      viewer: {
        isHost: ctx.isHost,
        isBanned: ctx.isBanned,
        isAuthenticated: !!ctx.user,
        isFavorited: favorite !== null,
        canAddMedia: canAddMedia(room, ctx.isHost),
        canChat: canChat(room, ctx.isHost),
        canControlPlayback: canControlPlayback(room, ctx.isHost),
        canModerate: canModerate(room, ctx.isHost),
        canUseCall: canUseCall(room),
      },
    });
  } catch (e) {
    console.error("Room fetch error:", e);
    return NextResponse.json({ message: "Error fetching room details" }, { status: 500 });
  }
}

// Delete room (only host can delete it)
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ roomId: string }> }
) {
  try {
    const params = await props.params;
    const access = await loadRoomContext(params.roomId, { requireUser: true, includeInactive: true });
    if (!access.ok) {
      return NextResponse.json({ message: access.message }, { status: access.status });
    }
    const { ctx } = access;

    if (!ctx.isHost) {
      return NextResponse.json(
        { message: "Forbidden: Only the host can delete this room" },
        { status: 403 }
      );
    }

    await prismaClient.room.delete({ where: { id: ctx.room.id } });
    return NextResponse.json({ message: "Room deleted successfully" });
  } catch (e) {
    console.error("Room delete error:", e);
    return NextResponse.json({ message: "Error deleting room" }, { status: 500 });
  }
}
