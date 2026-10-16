import { prismaClient } from "@/lib/db";
import { isRoomCode } from "@/lib/room-code";
import { findDuplicateStream } from "@/lib/queue";
import { getMusicProviderById } from "@/lib/music";
import type { MusicProviderId, Track } from "@/lib/music";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as youtubesearchapi from "youtube-search-api";

// Adding tracks is rate limited per signed-in user. Searched tracks and pasted
// links share this budget so neither can be used to spam a room.
const rateLimitStore = new Map<string, { count: number; lastRequest: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS = 20;

// Collapses concurrent identical requests (double click / retry storm) into a
// single database write so a room never gets two copies of the same track.
const inflightAdds = new Map<string, Promise<{ id: string; duplicate: boolean }>>();

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const ITUNES_ID_PATTERN = /^\d+$/;

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

const RoomRefSchema = z.object({
  roomId: z.string().min(1).max(128),
  // Legacy field kept for backwards compatibility; always overridden server-side.
  creatorId: z.string().max(128).optional(),
});

const AddByYoutubeTrackSchema = RoomRefSchema.extend({
  provider: z.literal("youtube"),
  trackId: z.string().regex(YOUTUBE_ID_PATTERN, "Invalid YouTube track id"),
});

const AddByItunesTrackSchema = RoomRefSchema.extend({
  provider: z.literal("itunes"),
  trackId: z.string().regex(ITUNES_ID_PATTERN, "Invalid iTunes track id"),
});

const AddByTrackSchema = z.discriminatedUnion("provider", [
  AddByYoutubeTrackSchema,
  AddByItunesTrackSchema,
]);

const AddByUrlSchema = RoomRefSchema.extend({
  url: z.string().trim().min(1).max(2048),
});

const CreateStreamSchema = z.union([AddByTrackSchema, AddByUrlSchema]);

interface StreamMetadata {
  title: string;
  artist: string | null;
  duration: number | null;
  smallImg: string;
  bigImg: string;
  streamType: "Youtube" | "Spotify" | "Itunes";
  extractedId: string;
  previewUrl: string | null;
}

/**
 * Resolve YouTube metadata for a video id, preferring the official provider
 * (which also yields duration/channel) and falling back to oEmbed when the
 * provider is unavailable.
 */
async function fetchYoutubeMetadata(
  extractedId: string
): Promise<Omit<StreamMetadata, "streamType" | "extractedId" | "previewUrl">> {
  try {
    const res = await youtubesearchapi.GetVideoDetails(extractedId);
    if (res && typeof res === "object") {
      const title: string = res.title ?? "unknown title";
      let smallImg = `https://img.youtube.com/vi/${extractedId}/hqdefault.jpg`;
      let bigImg = `https://img.youtube.com/vi/${extractedId}/maxresdefault.jpg`;
      const thumbnails = res.thumbnail?.thumbnails;
      if (thumbnails && Array.isArray(thumbnails) && thumbnails.length > 0) {
        thumbnails.sort((a: { width: number }, b: { width: number }) =>
          a.width < b.width ? -1 : 1
        );
        smallImg = thumbnails.length > 1
          ? thumbnails[thumbnails.length - 2].url
          : thumbnails[thumbnails.length - 1].url;
        bigImg = thumbnails[thumbnails.length - 1].url ?? bigImg;
      }
      return { title, artist: null, duration: null, smallImg, bigImg };
    }
    throw new Error("Invalid response from youtubesearchapi");
  } catch (ytErr) {
    console.warn("youtube-search-api failed, trying oEmbed fallback:", ytErr);
    const fallback = {
      title: "YouTube Video",
      artist: null as string | null,
      duration: null as number | null,
      smallImg: `https://img.youtube.com/vi/${extractedId}/hqdefault.jpg`,
      bigImg: `https://img.youtube.com/vi/${extractedId}/maxresdefault.jpg`,
    };
    try {
      const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${extractedId}&format=json`;
      const oEmbedRes = await fetch(oEmbedUrl);
      if (oEmbedRes.ok) {
        const oEmbedData = await oEmbedRes.json();
        return {
          title: oEmbedData.title ?? fallback.title,
          artist: typeof oEmbedData.author_name === "string" ? oEmbedData.author_name : null,
          duration: null,
          smallImg: oEmbedData.thumbnail_url ?? fallback.smallImg,
          bigImg: oEmbedData.thumbnail_url ?? fallback.bigImg,
        };
      }
    } catch (oembedErr) {
      console.error("oEmbed fallback failed:", oembedErr);
    }
    return fallback;
  }
}

/** Best-effort provider lookup; never throws so the add can still fall back. */
async function tryGetProviderTrack(providerId: MusicProviderId, trackId: string): Promise<Track | null> {
  try {
    return await getMusicProviderById(providerId).getTrackDetails(trackId);
  } catch (error) {
    console.warn(`Provider "${providerId}" track lookup failed:`, error);
    return null;
  }
}

function streamResponse(result: { id: string; duplicate: boolean }) {
  return NextResponse.json(
    {
      message: result.duplicate ? "Track is already in this room's queue" : "Stream added successfully",
      id: result.id,
      duplicate: result.duplicate,
    },
    { status: 200 }
  );
}

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

    const now = Date.now();
    const rateKey = user.id;
    const userData = rateLimitStore.get(rateKey) || { count: 0, lastRequest: 0 };
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
    rateLimitStore.set(rateKey, userData);

    const body = await req.json();
    const parseResult = CreateStreamSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { message: "Provide a valid room, and either a YouTube/Spotify URL or a provider track id." },
        { status: 400 }
      );
    }
    const data = parseResult.data;

    // Resolve room code to actual database ID before touching the provider.
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
    } else {
      const room = await prismaClient.room.findFirst({
        where: { id: data.roomId, isActive: true },
        select: { id: true },
      });
      if (!room) {
        return NextResponse.json({ message: "Room not found" }, { status: 404 });
      }
    }

    // Resolve the queue source. Searched tracks carry a provider id; everything
    // else arrives as a pasted URL.
    let resolvedUrl: string;
    let metadata: StreamMetadata;

    if ("trackId" in data) {
      if (data.provider === "itunes") {
        // Keyless iTunes tracks play through Apple's 30-second preview clip.
        const details = await tryGetProviderTrack("itunes", data.trackId);
        if (!details) {
          return NextResponse.json({ message: "Could not find that track." }, { status: 404 });
        }
        resolvedUrl = details.url;
        metadata = {
          title: details.title,
          artist: details.artist || null,
          duration: details.durationSeconds,
          smallImg: details.thumbnail,
          bigImg: details.artwork,
          streamType: "Itunes",
          extractedId: data.trackId,
          previewUrl: details.previewUrl ?? null,
        };
      } else {
        const trackId = data.trackId;
        // Reuse provider metadata when available; otherwise fall back to oEmbed.
        const details = await tryGetProviderTrack("youtube", trackId);
        const base = details
          ? {
              title: details.title,
              artist: details.artist || null,
              duration: details.durationSeconds,
              smallImg: details.thumbnail,
              bigImg: details.artwork,
            }
          : await fetchYoutubeMetadata(trackId);
        resolvedUrl = `https://www.youtube.com/watch?v=${trackId}`;
        metadata = { ...base, streamType: "Youtube", extractedId: trackId, previewUrl: null };
      }
    } else {
      resolvedUrl = data.url;
      const ytId = extractYoutubeId(resolvedUrl);
      const spotifyData = extractSpotifyId(resolvedUrl);

      if (ytId) {
        const base = await fetchYoutubeMetadata(ytId);
        metadata = { ...base, streamType: "Youtube", extractedId: ytId, previewUrl: null };
      } else if (spotifyData) {
        let title = `${spotifyData.type.charAt(0).toUpperCase() + spotifyData.type.slice(1)} - Spotify`;
        let smallImg = "";
        let bigImg = "";

        try {
          const oEmbedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(resolvedUrl)}`;
          const spotifyRes = await fetch(oEmbedUrl);
          if (spotifyRes.ok) {
            const sData = await spotifyRes.json();
            title = sData.title ?? title;
            smallImg = sData.thumbnail_url ?? "";
            bigImg = sData.thumbnail_url ?? "";
          }
        } catch (spotifyErr) {
          console.error("Spotify oEmbed failed:", spotifyErr);
        }

        metadata = {
          title,
          artist: null,
          duration: null,
          smallImg,
          bigImg,
          streamType: "Spotify",
          extractedId: spotifyData.id,
          previewUrl: null,
        };
      } else {
        return NextResponse.json({ message: "URL must be a valid YouTube or Spotify link" }, { status: 400 });
      }
    }

    const dedupeKey = `${user.id}:${resolvedRoomId}:${metadata.extractedId}`;

    const existingInflight = inflightAdds.get(dedupeKey);
    if (existingInflight) {
      return streamResponse(await existingInflight);
    }

    const persist = async (): Promise<{ id: string; duplicate: boolean }> => {
      // Existing semantic: duplicates are per unplayed queue, so a played track
      // can be queued again later.
      const queue = await prismaClient.stream.findMany({
        where: { roomId: resolvedRoomId, played: false },
        select: { id: true, extractedId: true, played: true },
      });
      const duplicate = findDuplicateStream(queue, metadata.extractedId);
      if (duplicate) {
        return { id: duplicate.id, duplicate: true };
      }

      const stream = await prismaClient.stream.create({
        data: {
          userId: user.id,
          url: resolvedUrl,
          extractedId: metadata.extractedId,
          type: metadata.streamType,
          title: metadata.title,
          artist: metadata.artist ?? undefined,
          duration: metadata.duration ?? undefined,
          smallImg: metadata.smallImg,
          bigImg: metadata.bigImg,
          previewUrl: metadata.previewUrl ?? undefined,
          roomId: resolvedRoomId,
        },
      });
      return { id: stream.id, duplicate: false };
    };

    const task = persist();
    inflightAdds.set(dedupeKey, task);
    try {
      return streamResponse(await task);
    } finally {
      inflightAdds.delete(dedupeKey);
    }
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
        extractedId: stream.extractedId,
        title: stream.title,
        artist: stream.artist,
        duration: stream.duration,
        smallImg: stream.smallImg,
        bigImg: stream.bigImg,
        previewUrl: stream.previewUrl,
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
