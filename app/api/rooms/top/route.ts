import { prismaClient } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Public directory of active rooms for the landing page.
 *
 * Privacy: only rooms explicitly marked `public` are listed, and host emails
 * are never exposed — a display name is used instead. Presence comes from the
 * real participant table rather than inferred from stream/chat authors.
 */
export async function GET() {
  try {
    const rooms = await prismaClient.room.findMany({
      where: { isActive: true, visibility: "public" },
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        host: { select: { email: true, username: true } },
        participants: {
          where: { lastSeenAt: { gte: new Date(Date.now() - 60_000) } },
          select: { userId: true, user: { select: { email: true, username: true } } },
        },
        streams: {
          include: {
            user: { select: { username: true } },
            _count: { select: { upvotes: true } },
          },
        },
        _count: { select: { streams: true } },
      },
    });

    const formattedRooms = await Promise.all(
      rooms.map(async (room) => {
        let currentStream = null;
        if (room.currentStreamId) {
          currentStream = await prismaClient.stream.findUnique({
            where: { id: room.currentStreamId },
            select: { title: true, smallImg: true, bigImg: true, extractedId: true },
          });
        }

        const totalVotes = room.streams.reduce((acc, str) => acc + str._count.upvotes, 0);
        const sortedQueue = [...room.streams.filter((str) => !str.played)].sort(
          (a, b) => b._count.upvotes - a._count.upvotes
        );

        const displayName = (email: string | null, username: string | null) =>
          username || email?.split("@")[0] || "Guest";

        const listenerNames = new Set<string>();
        listenerNames.add(displayName(room.host.email, room.host.username));
        room.participants.forEach((p) =>
          listenerNames.add(displayName(p.user.email, p.user.username))
        );

        return {
          id: room.id,
          code: room.code,
          name: room.name,
          hostName: displayName(room.host.email, room.host.username),
          streamCount: room._count.streams,
          currentStream: currentStream
            ? {
                title: currentStream.title,
                smallImg: currentStream.smallImg,
                bigImg: currentStream.bigImg,
                extractedId: currentStream.extractedId,
              }
            : null,
          totalVotes,
          topVotedTrack: sortedQueue[0]?.title || null,
          listeningCount: listenerNames.size,
          listenerInitials: Array.from(listenerNames).map((name) => name.charAt(0).toUpperCase()),
          queue: sortedQueue.slice(0, 3).map((str) => ({
            title: str.title,
            upvotes: str._count.upvotes,
            addedBy: str.user?.username || "Someone",
          })),
          createdAt: room.createdAt.toISOString(),
        };
      })
    );

    return NextResponse.json({ rooms: formattedRooms });
  } catch (error) {
    console.error("Error fetching top rooms:", error);
    return NextResponse.json({ message: "Failed to fetch top rooms" }, { status: 500 });
  }
}
