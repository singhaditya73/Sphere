import { prismaClient } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import youtubesearchapi from "youtube-search-api";

const rateLimitStore = new Map<string, { count: number; lastRequest: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; 
const MAX_REQUESTS = 5; 

const YT_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}(&.*)?$/;
const SPOTIFY_REGEX = /^(https?:\/\/)?(open\.)?spotify\.com\/(track|playlist|album)\/[\w-]+(\?.*)?$/;

const CreateStreamSchema = z.object({
  creatorId: z.string(),
  url: z.string().refine(
    (url) => YT_REGEX.test(url) || SPOTIFY_REGEX.test(url),
    { message: "URL must be a valid YouTube or Spotify link" }
  ),
  roomId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    
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

    const data = CreateStreamSchema.parse(await req.json());
    const isYt = YT_REGEX.test(data.url);
    const isSpotify = SPOTIFY_REGEX.test(data.url);

    if (!isYt && !isSpotify) {
      return NextResponse.json({ message: "Invalid URL format" }, { status: 400 });
    }

    let title = "unknown";
    let extractedId = "";
    let smallImg = "";
    let bigImg = "";
    let streamType = "";

    // YouTube
    if (isYt) {
      streamType = "Youtube";
      extractedId = data.url.split("?v=")[1] || "";
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
        const urlParts = data.url.split("/");
      extractedId = urlParts[urlParts.length - 1].split("?")[0] || "";

      title = "Spotify Track";
      smallImg = "";
      bigImg = "";
    }

    const stream = await prismaClient.stream.create({
      data: {
        userId: data.creatorId,
        url: data.url,
        extractedId,
        type: streamType,
        title,
        smallImg,
        bigImg,
        roomId: data.roomId,
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
    const whereClause: { userId?: string; roomId?: string; played?: boolean } = {};
    
    if (creatorId) {
      whereClause.userId = creatorId;
    }
    
    if (roomId) {
      whereClause.roomId = roomId;
      whereClause.played = false;
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
            _count: "desc",
          },
        },
        {
          createdAt: "asc",
        },
      ] : {
        createdAt: "desc",
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
        played: stream.played,
        createdAt: stream.createdAt,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { message: "Error while fetching streams" },
      { status: 500 }
    );
  }
}