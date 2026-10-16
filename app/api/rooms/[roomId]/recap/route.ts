import { NextRequest, NextResponse } from "next/server";
import { prismaClient } from "@/lib/db";
import { assertCanView, loadRoomContext } from "@/lib/room-access";

export const dynamic = "force-dynamic";

/**
 * GET /api/rooms/[roomId]/recap
 *
 * A privacy-conscious session recap built only from data Sphere actually
 * measures. It reports item counts and wall-clock duration — never claimed
 * watch/listen time — and never exposes private message content (only counts).
 */
export async function GET(
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
    const viewError = await assertCanView(ctx);
    if (viewError) {
      return NextResponse.json({ message: viewError.message, code: viewError.code }, { status: viewError.status });
    }

    const room = ctx.room;
    const [streams, messageGroups] = await Promise.all([
      prismaClient.stream.findMany({
        where: { roomId: room.id },
        include: {
          _count: { select: { upvotes: true } },
          user: { select: { id: true, email: true, username: true } },
        },
      }),
      prismaClient.message.groupBy({
        by: ["userId"],
        where: { roomId: room.id },
        _count: { _all: true },
      }),
    ]);

    const played = streams.filter((s) => s.played);
    const endedAt = room.endedAt ?? new Date();
    const durationSeconds = Math.max(0, Math.round((endedAt.getTime() - room.createdAt.getTime()) / 1000));

    const nameFor = (user: { email: string | null; username: string | null }) =>
      user.username || user.email?.split("@")[0] || "Guest";

    const topVoted = [...streams]
      .sort((a, b) => b._count.upvotes - a._count.upvotes || a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, 5)
      .map((s) => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        mediaType: s.mediaType,
        upvotes: s._count.upvotes,
        played: s.played,
      }));

    // Popular artists among items that actually played.
    const artistCounts = new Map<string, number>();
    for (const s of played) {
      if (!s.artist) continue;
      artistCounts.set(s.artist, (artistCounts.get(s.artist) ?? 0) + 1);
    }
    const popularArtists = [...artistCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([artist, count]) => ({ artist, count }));

    // Contributors: items added + messages sent (counts only, never content).
    const contributorMap = new Map<string, { name: string; added: number; messages: number }>();
    for (const s of streams) {
      const key = s.user.id;
      const entry = contributorMap.get(key) ?? { name: nameFor(s.user), added: 0, messages: 0 };
      entry.added += 1;
      contributorMap.set(key, entry);
    }
    for (const group of messageGroups) {
      const existing = contributorMap.get(group.userId) ?? { name: "Guest", added: 0, messages: 0 };
      existing.messages += group._count._all;
      contributorMap.set(group.userId, existing);
    }
    const topContributors = [...contributorMap.values()]
      .sort((a, b) => b.added + b.messages - (a.added + a.messages))
      .slice(0, 5);

    return NextResponse.json({
      recap: {
        room: { id: room.id, name: room.name, code: room.code },
        startedAt: room.createdAt,
        endedAt: room.endedAt,
        durationSeconds,
        isEnded: room.endedAt !== null,
        totals: {
          itemsQueued: streams.length,
          itemsPlayed: played.length,
          participants: new Set(streams.map((s) => s.user.id)).size,
          messages: messageGroups.reduce((sum, g) => sum + g._count._all, 0),
        },
        topVoted,
        popularArtists,
        topContributors,
      },
    });
  } catch (e) {
    console.error("Recap error:", e);
    return NextResponse.json({ message: "Error building recap" }, { status: 500 });
  }
}
