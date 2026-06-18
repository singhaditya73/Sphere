import { prismaClient } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Get top active rooms with detailed listening activity from real DB data
export async function GET() {
  try {
    const rooms = await prismaClient.room.findMany({
      take: 6,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        host: {
          select: {
            email: true,
          },
        },
        streams: {
          include: {
            user: { select: { email: true } },
            _count: {
              select: { upvotes: true }
            }
          }
        },
        _count: {
          select: { streams: true }
        }
      },
    });

    const formattedRooms = await Promise.all(rooms.map(async (room) => {
      // Find currently playing stream
      let currentStream = null;
      if (room.currentStreamId) {
        currentStream = await prismaClient.stream.findUnique({
          where: { id: room.currentStreamId }
        });
      }

      // Calculate real total votes cast in the room
      const totalVotes = room.streams.reduce((acc, str) => acc + str._count.upvotes, 0);

      // Top voted queue track (played: false)
      const activeQueue = room.streams.filter(str => !str.played);
      const sortedQueue = [...activeQueue].sort((a, b) => b._count.upvotes - a._count.upvotes);
      const topVotedTrack = sortedQueue[0]?.title || null;

      // Calculate real listener count (unique contributors + chat participants + host)
      const uniqueParticipants = new Set<string>();
      if (room.host.email) uniqueParticipants.add(room.host.email);
      room.streams.forEach(s => {
        if (s.user?.email) uniqueParticipants.add(s.user.email);
      });

      // Fetch message senders to add to participant count
      const chatUsers = await prismaClient.message.findMany({
        where: { roomId: room.id },
        select: { user: { select: { email: true } } }
      });
      chatUsers.forEach(cu => {
        if (cu.user?.email) uniqueParticipants.add(cu.user.email);
      });

      const listeningCount = uniqueParticipants.size;

      // Return real list of participant initials for avatar display
      const listenerInitials = Array.from(uniqueParticipants).map(email => email.charAt(0).toUpperCase());

      return {
        id: room.id,
        code: room.code,
        name: room.name,
        hostEmail: room.host.email,
        streamCount: room._count.streams,
        currentStream: currentStream ? {
          title: currentStream.title,
          smallImg: currentStream.smallImg,
          bigImg: currentStream.bigImg,
          extractedId: currentStream.extractedId
        } : null,
        totalVotes: totalVotes,
        topVotedTrack,
        listeningCount,
        listenerInitials,
        queue: sortedQueue.slice(0, 3).map(str => ({
          title: str.title,
          upvotes: str._count.upvotes,
          addedBy: str.user?.email?.split('@')[0] || "Someone"
        })),
        createdAt: room.createdAt.toISOString(),
      };
    }));

    return NextResponse.json({ rooms: formattedRooms });
  } catch (error) {
    console.error("Error fetching top rooms:", error);
    return NextResponse.json(
      { message: "Failed to fetch top rooms" },
      { status: 500 }
    );
  }
}
