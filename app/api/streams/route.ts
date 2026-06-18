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

const YT_REGEX = /^(https?:\/\/)?(www\.|music\.|m\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})([&?].*)?$/;
const SPOTIFY_REGEX = /^(https?:\/\/)?(open\.)?spotify\.com\/(track|playlist|album)\/([a-zA-Z0-9]+)(\?.*)?$/;

const CreateStreamSchema = z.object({
  creatorId: z.string(),
  url: z.string(), // Removed strict refinement here to debug, or move it to runtime check with logging
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

    const isYt = YT_REGEX.test(data.url);
    const isSpotify = SPOTIFY_REGEX.test(data.url);

    if (!isYt && !isSpotify) {
      console.log("URL validation failed for:", data.url);
      return NextResponse.json({ message: "URL must be a valid YouTube or Spotify link" }, { status: 400 });
    }

    let title = "unknown";
    let extractedId = "";
    let smallImg = "";
    let bigImg = "";
    let streamType = "";

    // YouTube
    if (isYt) {
      streamType = "Youtube";
      const match = data.url.match(YT_REGEX);
      extractedId = match && match[4] ? match[4] : "";
      
      const res = await youtubesearchapi.GetVideoDetails(extractedId);
      title = res.title ?? "cant find";

      const thumbnails = res.thumbnail.thumbnails;
      thumbnails.sort((a: { width: number }, b: { width: number }) =>
        a.width < b.width ? -1 : 1
      );
      if (thumbnails.length > 1) {
        smallImg = thumbnails[thumbnails.length - 2].url;
      } else {
        smallImg = thumbnails[thumbnails.length - 1].url;
      }
      bigImg = thumbnails[thumbnails.length - 1].url ?? "";
    }

    else if (isSpotify) {
      streamType = "Spotify";
      const match = data.url.match(SPOTIFY_REGEX);
      extractedId = match && match[4] ? match[4] : "";

      title = "Spotify Track";
      smallImg = "";
      bigImg = "";
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