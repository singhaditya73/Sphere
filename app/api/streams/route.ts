import { prismaClient } from "@/lib/db";
import { isRoomCode } from "@/lib/room-code";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as youtubesearchapi from "youtube-search-api";

const rateLimitStore = new Map<string, { count: number; lastRequest: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; 
const MAX_REQUESTS = 5; 

function extractYoutubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.slice(1);
    }
    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/shorts/")) {
        return parsed.pathname.split("/")[2];
      }
      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.split("/")[2];
      }
      return parsed.searchParams.get("v");
    }
  } catch (e) {}
  
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function extractSpotifyId(url: string): { id: string; type: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("spotify.com")) {
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        return {
          type: parts[0],
          id: parts[1]
        };
      }
    }
  } catch (e) {}
  
  const match = url.match(/spotify\.com\/(track|playlist|album)\/([a-zA-Z0-9]+)/);
  if (match) {
    return {
      type: match[1],
      id: match[2]
    };
  }
  return null;
}

const CreateStreamSchema = z.object({
  creatorId: z.string(),
  url: z.string(),
  roomId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const user = await prismaClient.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
       return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const now = Date.now();

    const userData = rateLimitStore.get(ip) || { count: 0, lastRequest: 0 };
    if (now - userData.lastRequest < RATE_LIMIT_WINDOW) {
      if (userData.count >= MAX_REQUESTS) {
        return NextResponse.json(
          { message: "Rate limit exceeded. Please try again later." },
          { status: 429 }
        );
      }
      userData.count += 1;
    } else {
      userData.count = 1;
      userData.lastRequest = now;
    }
    rateLimitStore.set(ip, userData);

    const body = await req.json();
    console.log("Received Stream Request:", body);
    const data = CreateStreamSchema.parse(body);
    data.url = data.url.trim();
    
    // Force creatorId to be the authenticated user
    data.creatorId = user.id;

    const ytId = extractYoutubeId(data.url);
    const spotifyData = extractSpotifyId(data.url);

    if (!ytId && !spotifyData) {
      console.log("URL validation failed for:", data.url);
      return NextResponse.json({ message: "URL must be a valid YouTube or Spotify link" }, { status: 400 });
    }

    let title = "unknown";
    let extractedId = "";
    let smallImg = "";
    let bigImg = "";
    let streamType = "";

    // YouTube
    if (ytId) {
      streamType = "Youtube";
      extractedId = ytId;
      
      try {
        const res = await youtubesearchapi.GetVideoDetails(extractedId);
        if (res && typeof res === 'object') {
          title = res.title ?? "unknown title";
          const thumbnails = res.thumbnail?.thumbnails;
          if (thumbnails && Array.isArray(thumbnails) && thumbnails.length > 0) {
            thumbnails.sort((a: { width: number }, b: { width: number }) =>
              a.width < b.width ? -1 : 1
            );
            if (thumbnails.length > 1) {
              smallImg = thumbnails[thumbnails.length - 2].url;
            } else {
              smallImg = thumbnails[thumbnails.length - 1].url;
            }
            bigImg = thumbnails[thumbnails.length - 1].url ?? "";
          } else {
            smallImg = `https://img.youtube.com/vi/${extractedId}/hqdefault.jpg`;
            bigImg = `https://img.youtube.com/vi/${extractedId}/maxresdefault.jpg`;
          }
        } else {
          throw new Error("Invalid response from youtubesearchapi");
        }
      } catch (ytErr) {
        console.warn("youtube-search-api failed, trying oEmbed fallback:", ytErr);
        try {
          const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${extractedId}&format=json`;
          const oEmbedRes = await fetch(oEmbedUrl);
          if (oEmbedRes.ok) {
            const oEmbedData = await oEmbedRes.json();
            title = oEmbedData.title ?? "YouTube Video";
            smallImg = oEmbedData.thumbnail_url ?? `https://img.youtube.com/vi/${extractedId}/hqdefault.jpg`;
            bigImg = oEmbedData.thumbnail_url ?? `https://img.youtube.com/vi/${extractedId}/maxresdefault.jpg`;
          } else {
            title = "YouTube Video";
            smallImg = `https://img.youtube.com/vi/${extractedId}/hqdefault.jpg`;
            bigImg = `https://img.youtube.com/vi/${extractedId}/maxresdefault.jpg`;
          }
        } catch (oembedErr) {
          console.error("oEmbed fallback failed:", oembedErr);
          title = "YouTube Video";
          smallImg = `https://img.youtube.com/vi/${extractedId}/hqdefault.jpg`;
          bigImg = `https://img.youtube.com/vi/${extractedId}/maxresdefault.jpg`;
        }
      }
    }

    else if (spotifyData) {
      streamType = "Spotify";
      extractedId = spotifyData.id;

      try {
        const oEmbedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(data.url)}`;
        const spotifyRes = await fetch(oEmbedUrl);
        if (spotifyRes.ok) {
          const sData = await spotifyRes.json();
          title = sData.title ?? `${spotifyData.type.charAt(0).toUpperCase() + spotifyData.type.slice(1)} - Spotify`;
          smallImg = sData.thumbnail_url ?? "";
          bigImg = sData.thumbnail_url ?? "";
        } else {
          title = `${spotifyData.type.charAt(0).toUpperCase() + spotifyData.type.slice(1)} - Spotify`;
        }
      } catch (spotifyErr) {
        console.error("Spotify oEmbed failed:", spotifyErr);
        title = `${spotifyData.type.charAt(0).toUpperCase() + spotifyData.type.slice(1)} - Spotify`;
      }
    }

    // Resolve room code to actual database ID
    let resolvedRoomId = data.roomId;
    if (isRoomCode(data.roomId)) {
      const room = await prismaClient.room.findFirst({
        where: { code: data.roomId.toUpperCase(), isActive: true },
        select: { id: true },
      });
      if (!room) {
        return NextResponse.json({ message: "Room not found" }, { status: 404 });
      }
      resolvedRoomId = room.id;
    }

    const stream = await prismaClient.stream.create({
      data: {
        userId: data.creatorId,
        url: data.url,
        extractedId,
        type: streamType as "Youtube" | "Spotify",
        title,
        smallImg,
        bigImg,
        roomId: resolvedRoomId,
      },
    });

    return NextResponse.json(
      {
        message: "Stream added successfully",
        id: stream.id,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("Stream creation error:", e);
    return NextResponse.json(
      { message: "Error while adding a stream" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const creatorId = req.nextUrl.searchParams.get("creatorId");
  const roomId = req.nextUrl.searchParams.get("roomId");

  try {
    const whereClause: any = {};
    
    if (creatorId) {
      whereClause.userId = creatorId;
    }
    
    if (roomId) {
      whereClause.roomId = roomId;
    }

    const streams = await prismaClient.stream.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            upvotes: true,
          },
        },
        user: {
          select: {
            email: true,
            username: true,
          },
        },
      },
      orderBy: roomId ? [
        {
          upvotes: {
            _count: "desc" as const,
          },
        },
        {
          createdAt: "asc" as const,
        },
      ] : {
        createdAt: "desc" as const,
      },
    });
    
    return NextResponse.json({
      streams: streams.map(stream => ({
        id: stream.id,
        type: stream.type,
        url: stream.url,
        title: stream.title,
        smallImg: stream.smallImg,
        bigImg: stream.bigImg,
        upvotes: stream._count.upvotes,
        addedBy: stream.user.email,
        addedByUsername: stream.user.username,
        active: stream.active,
      })),
    });
  } catch (_e) {
    return NextResponse.json(
      { message: "Error while fetching streams" },
      { status: 500 }
    );
  }
}